// Edge Function: nizkin-generate
// POST / → Generate claim draft via Claude AI
// POST /?action=regenerate → Regenerate with additional instructions
// Reads claim from DB, builds prompt, calls Claude, saves draft back

import Anthropic from "npm:@anthropic-ai/sdk@0.30.1";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const body = await req.json();
    const { id, additional_instructions } = body;

    if (!id) return json({ error: "Claim id is required" }, 400);

    // Fetch claim
    const { data: claim, error: fetchError } = await supabase
      .from("tort_claims")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !claim) return json({ error: "Claim not found" }, 404);

    // Build prompt
    const systemPrompt = buildSystemPrompt(claim, additional_instructions);
    const userPrompt = buildUserPrompt(claim);

    // Log start
    const startTime = Date.now();
    console.log(`nizkin-generate: claim=${id}, type=${claim.claim_type}, prompt_len=${systemPrompt.length + userPrompt.length}`);

    // Call Claude
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-opus-4-5-20250918",
      max_tokens: 8000,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const latency = Date.now() - startTime;
    const responseText = response.content[0].type === "text" ? response.content[0].text : "";
    console.log(`nizkin-generate: claim=${id}, response_len=${responseText.length}, latency=${latency}ms`);

    // Parse JSON from response
    let extractedData;
    try {
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText.trim();
      extractedData = JSON.parse(jsonStr);
    } catch {
      extractedData = {
        full_draft: responseText,
        part1_header: "",
        part2_summary: "",
        part3_details: responseText,
        causes_of_action: [],
        relevant_laws: [],
        parse_error: true,
      };
    }

    const draft = extractedData.full_draft || responseText;
    const wordCount = draft.split(/\s+/).filter(Boolean).length;

    // Save draft to DB
    const updateData: Record<string, unknown> = { generated_draft: draft };
    if (extractedData.causes_of_action?.length) {
      const merged = [...new Set([...(claim.causes_of_action || []), ...extractedData.causes_of_action])];
      updateData.causes_of_action = merged;
    }
    if (extractedData.relevant_laws?.length) {
      const merged = [...new Set([...(claim.relevant_laws || []), ...extractedData.relevant_laws])];
      updateData.relevant_laws = merged;
    }

    await supabase.from("tort_claims").update(updateData).eq("id", id);

    return json({
      success: true,
      draft,
      word_count: wordCount,
      sections: {
        part1_header: extractedData.part1_header || "",
        part2_summary: extractedData.part2_summary || "",
        part3_details: extractedData.part3_details || "",
      },
      causes_of_action: extractedData.causes_of_action || [],
      relevant_laws: extractedData.relevant_laws || [],
      metadata: extractedData.metadata || {},
      model: response.model,
      usage: response.usage,
      latency_ms: latency,
    });

  } catch (error) {
    console.error("nizkin-generate error:", error);
    return json({ error: "Failed to generate draft", success: false }, 500);
  }
});

// ============ Prompt builders ============

const CLAIM_TYPE_PROMPTS: Record<string, string> = {
  general_negligence: `תנסח תביעת רשלנות מכוח סעיפים 35-36 לפקודת הנזיקין. הדגש חובת זהירות, הפרה, קשר סיבתי, נזק.`,
  road_accident: `תנסח תביעה מכוח חוק פיצויים לנפגעי תאונות דרכים, התשל"ה-1975. בפלת"ד אין צורך להוכיח אשם.`,
  medical_malpractice: `תנסח תביעת רשלנות רפואית. הדגש סטנדרט רפואי, הפרתו, קשר סיבתי. הזכר חוק זכויות החולה.`,
  professional_malpractice: `תנסח תביעת רשלנות מקצועית. הדגש סטנדרט מקצועי והפרתו.`,
  defamation: `תנסח תביעת לשון הרע מכוח חוק איסור לשון הרע, התשכ"ה-1965.`,
  assault: `תנסח תביעת נזיקין בגין תקיפה מכוח סעיף 23 לפקודת הנזיקין.`,
  work_accident: `תנסח תביעת תאונת עבודה. הדגש הפרת תקנות בטיחות ואחריות שילוחית.`,
  product_liability: `תנסח תביעה מכוח חוק האחריות למוצרים פגומים, תש"ם-1980. אחריות מוחלטת.`,
  property_damage: `תנסח תביעת נזק רכוש מכוח פקודת הנזיקין.`,
  other: `תנסח תביעת נזיקין כללית בהתאם לנסיבות.`,
};

function buildSystemPrompt(claim: any, additionalInstructions?: string): string {
  const typePrompt = CLAIM_TYPE_PROMPTS[claim.claim_type] || CLAIM_TYPE_PROMPTS.other;
  const courtLabel = claim.court_type === "district" ? "בית המשפט המחוזי" : "בית משפט השלום";
  const maxPages = claim.court_type === "district" ? 30 : 20;

  return `אתה עוזר משפטי מומחה בדיני נזיקין ישראלי.
תפקידך לנסח כתבי תביעה מקצועיים בדיני הנזיקין.

כללי ניסוח חובה:
- עמוד בתקנות סדר הדין האזרחי, התשע"ט-2018
- חלק את המסמך ל-3 חלקים: כותרת/פרטים → תמצית טענות → פירוט עובדות
- השתמש בשפה משפטית מדויקת
- ציין סעיפי חוק רלוונטיים
- פרט כל ראש נזק בנפרד
- אל תמציא עובדות — השתמש רק במידע שסופק

--- הנחיות ייחודיות ---
${typePrompt}

מגבלת עמודים: עד ${maxPages} עמודים (${courtLabel})

${additionalInstructions ? `--- הנחיות נוספות ---\n${additionalInstructions}\n` : ""}
--- פורמט פלט ---
החזר JSON:
{
  "part1_header": "כותרת בית המשפט ופרטי הצדדים",
  "part2_summary": "תמצית טענות התביעה",
  "part3_details": "פירוט מלא",
  "full_draft": "כתב התביעה המלא",
  "causes_of_action": ["עילה 1"],
  "relevant_laws": ["חוק 1"],
  "metadata": { "estimated_pages": 10 }
}
אל תכלול טקסט מחוץ ל-JSON.`;
}

function buildUserPrompt(claim: any): string {
  const total = (claim.damage_heads || [])
    .reduce((sum: number, h: any) => sum + (h.amount_estimated || 0), 0);
  const fmt = (n: number) => n.toLocaleString("he-IL") + " ₪";

  const defendants = (claim.defendants || [])
    .map((d: any, i: number) => `נתבע ${i + 1}: ${d.name} (${d.type})${d.role ? " — " + d.role : ""}`)
    .join("\n");

  const damages = (claim.damage_heads || [])
    .filter((h: any) => h.amount_estimated > 0)
    .map((h: any) => `- ${h.type}: ${fmt(h.amount_estimated)}${h.description ? " (" + h.description + ")" : ""}`)
    .join("\n");

  const tortElements = claim.tort_elements || {};
  const elemStr = [
    tortElements.duty_of_care ? `חובת זהירות: ${tortElements.duty_of_care}` : "",
    tortElements.breach_description ? `הפרת החובה: ${tortElements.breach_description}` : "",
    tortElements.causation ? `קשר סיבתי: ${tortElements.causation}` : "",
    tortElements.damages_description ? `הנזק: ${tortElements.damages_description}` : "",
  ].filter(Boolean).join("\n");

  return `נסח כתב תביעה מלא:

--- סיווג ---
סוג: ${claim.claim_type}
בית משפט: ${claim.court_name || "____"}
תאריך אירוע: ${claim.incident_date || "____"}

--- התובע ---
שם: ${claim.plaintiff_name || "____"}
ת.ז.: ${claim.plaintiff_id || "____"}
כתובת: ${claim.plaintiff_address || "____"}${claim.plaintiff_city ? ", " + claim.plaintiff_city : ""}
${claim.plaintiff_attorney ? `ב"כ: ${claim.plaintiff_attorney}` : ""}

--- הנתבעים ---
${defendants || "לא צוינו"}

--- תיאור האירוע ---
מיקום: ${claim.incident_location || "____"}
${claim.incident_description || "____"}

${elemStr ? `--- יסודות העוולה ---\n${elemStr}` : ""}

--- ראשי נזק ---
${damages || "לא פורטו"}
סה"כ: ${fmt(total)}

${claim.legal_arguments ? `--- טיעונים ---\n${claim.legal_arguments}` : ""}
${(claim.causes_of_action || []).length > 0 ? `--- עילות ---\n${claim.causes_of_action.join("\n")}` : ""}
${claim.requested_remedies ? `--- סעד ---\n${claim.requested_remedies}` : ""}`.trim();
}
