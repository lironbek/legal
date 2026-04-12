#!/usr/bin/env bun
/**
 * AI Proxy Server — Local development proxy for Google Gemini API.
 *
 * Runs on port 3001 and forwards requests from the browser to Gemini,
 * avoiding CORS restrictions.
 *
 * Usage:
 *   GEMINI_API_KEY=AIza... bun run scripts/ai-proxy.ts
 *
 * Endpoints:
 *   POST /api/chat       — General chat (generateContent)
 *   POST /api/analyze    — Analyze attachment (vision)
 *   POST /api/guide      — AI guide agent
 *   GET  /api/health     — Health check
 */

const PORT = Number(process.env.AI_PROXY_PORT || 3001);
const API_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!API_KEY) {
  console.error('❌  GEMINI_API_KEY is required. Run with:');
  console.error('   GEMINI_API_KEY=AIza... bun run scripts/ai-proxy.ts');
  process.exit(1);
}

const ALLOWED_ORIGINS = (process.env.AI_PROXY_ALLOWED_ORIGINS || 'http://localhost:8081,http://localhost:5173,http://localhost:3000').split(',');

function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

/**
 * Call Gemini generateContent API.
 * Supports system instruction, multi-turn messages, and inline images.
 */
async function callGemini(body: {
  system?: string;
  contents: Array<{ role: string; parts: any[] }>;
  model?: string;
  maxOutputTokens?: number;
}): Promise<any> {
  const model = body.model || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

  const requestBody: any = {
    contents: body.contents,
    generationConfig: {
      maxOutputTokens: body.maxOutputTokens || 4096,
      temperature: 0.7,
    },
  };

  // System instruction (Gemini format)
  if (body.system) {
    requestBody.systemInstruction = {
      parts: [{ text: body.system }],
    };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API ${res.status}: ${err}`);
  }

  return res.json();
}

/** Extract text from Gemini response */
function extractText(response: any): string {
  return response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/** Convert chat messages [{role, content}] to Gemini contents format */
function toGeminiContents(messages: Array<{ role: string; content: any }>): Array<{ role: string; parts: any[] }> {
  return messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: typeof msg.content === 'string'
      ? [{ text: msg.content }]
      : Array.isArray(msg.content) ? msg.content : [{ text: String(msg.content) }],
  }));
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const cors = getCorsHeaders(req);

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(req.url);

    // Health
    if (url.pathname === '/api/health') {
      return Response.json({ ok: true, model: DEFAULT_MODEL, provider: 'gemini' }, { headers: cors });
    }

    // Chat endpoint — general prompt
    if (url.pathname === '/api/chat' && req.method === 'POST') {
      try {
        const body = await req.json();

        // Build contents from messages or single prompt
        let contents: Array<{ role: string; parts: any[] }>;
        if (body.messages) {
          contents = toGeminiContents(body.messages);
        } else {
          contents = [{ role: 'user', parts: [{ text: body.prompt || '' }] }];
        }

        const result = await callGemini({
          system: body.system || '',
          contents,
          model: body.model,
          maxOutputTokens: body.max_tokens || 8192,
        });

        const text = extractText(result);
        return Response.json(
          { success: true, text, model: DEFAULT_MODEL, usage: result.usageMetadata },
          { headers: cors }
        );
      } catch (e: any) {
        return Response.json(
          { success: false, error: e.message },
          { status: 500, headers: cors }
        );
      }
    }

    // Analyze endpoint — attachment with vision
    if (url.pathname === '/api/analyze' && req.method === 'POST') {
      try {
        const body = await req.json();
        const { file_base64, media_type, system_prompt, attachment_type } = body;

        const parts: any[] = [];
        if (file_base64 && media_type) {
          parts.push({
            inlineData: { mimeType: media_type, data: file_base64 },
          });
        }
        parts.push({ text: `סוג מסמך: ${attachment_type || 'other'}\nנתח את המסמך והחזר JSON בלבד.` });

        const result = await callGemini({
          system: system_prompt || 'אתה מנתח מסמכים משפטיים ורפואיים. החזר JSON בלבד.',
          contents: [{ role: 'user', parts }],
          maxOutputTokens: 2048,
        });

        const text = extractText(result);
        // Try to parse JSON from the response
        let parsed: any;
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch {
          parsed = { summary: text };
        }

        return Response.json(
          { success: true, data: parsed, model: DEFAULT_MODEL },
          { headers: cors }
        );
      } catch (e: any) {
        return Response.json(
          { success: false, error: e.message },
          { status: 500, headers: cors }
        );
      }
    }

    // Guide agent endpoint — conversational assistant
    if (url.pathname === '/api/guide' && req.method === 'POST') {
      try {
        const body = await req.json();
        const { messages, claimData, currentStep } = body;

        const systemPrompt = `אתה עוזר משפטי מנחה למילוי כתב תביעה בנזיקין במערכת Legal Nexus.
תפקידך:
1. לנחות את המשתמש שלב אחר שלב במילוי הטופס
2. להסביר מה כל שדה אומר ולמה הוא חשוב
3. להציע ניסוחים משפטיים מתאימים
4. להזהיר מבעיות פוטנציאליות (התיישנות, שדות חסרים)
5. לעזור בניסוח יסודות העוולה וראשי הנזק

כללים:
- דבר בעברית, בשפה ברורה ופשוטה
- אם המשתמש מתאר מצב — הצע ניסוח משפטי מתאים
- הצע סכומים ריאליים לראשי נזק בהתאם לפסיקה הישראלית
- אל תמציא עובדות — עבוד רק עם מה שהמשתמש מספר
- תשובות קצרות וענייניות, עם bullet points
- אם חסר מידע קריטי — שאל עליו
- שים לב לסוג התביעה וההנחיות הספציפיות שלה

${currentStep ? `השלב הנוכחי בטופס: ${currentStep}` : ''}
${claimData ? `נתוני התביעה עד כה: ${JSON.stringify(claimData, null, 2)}` : ''}`;

        const contents = toGeminiContents(messages || []);

        const result = await callGemini({
          system: systemPrompt,
          contents,
          maxOutputTokens: 1500,
        });

        const text = extractText(result);
        return Response.json(
          { success: true, text, model: DEFAULT_MODEL },
          { headers: cors }
        );
      } catch (e: any) {
        return Response.json(
          { success: false, error: e.message },
          { status: 500, headers: cors }
        );
      }
    }

    return new Response('Not found', { status: 404, headers: cors });
  },
});

console.log(`🤖 AI Proxy (Gemini) running at http://localhost:${PORT}`);
console.log(`   Model: ${DEFAULT_MODEL}`);
console.log(`   POST /api/chat     — Generate claim draft`);
console.log(`   POST /api/analyze  — Analyze attachment (vision)`);
console.log(`   POST /api/guide    — AI guide agent`);
console.log(`   GET  /api/health   — Health check`);
