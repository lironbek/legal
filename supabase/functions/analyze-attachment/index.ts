// Edge Function: analyze-attachment
// Analyzes a PDF/image attachment (medical opinion, police report, etc.) via Claude Vision

import Anthropic from "npm:@anthropic-ai/sdk@0.30.1";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { file_base64, media_type, system_prompt, attachment_type } = body;

    if (!file_base64) {
      return new Response(
        JSON.stringify({ error: "file_base64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = new Anthropic({ apiKey });

    const defaultSystemPrompt = `אתה מומחה בניתוח מסמכים רפואיים ומשפטיים.
חלץ מהמסמך המצורף את המידע הבא (אם קיים):
- אחוזי נכות
- אבחנה
- המלצות טיפול
- הגבלות תפקודיות
- סיכום כללי

החזר JSON בלבד:
{
  "summary": "סיכום קצר של המסמך",
  "disabilityPercentage": null,
  "diagnosis": "",
  "treatmentRecommendations": "",
  "functionalLimitations": ""
}
אל תכלול טקסט מחוץ ל-JSON.`;

    const isPdf = (media_type || "").includes("pdf");
    const documentContent = isPdf
      ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: file_base64 } }
      : { type: "image" as const, source: { type: "base64" as const, media_type: media_type || "image/png", data: file_base64 } };

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      temperature: 0.1,
      system: system_prompt || defaultSystemPrompt,
      messages: [
        {
          role: "user",
          content: [
            documentContent,
            { type: "text", text: `נתח את המסמך המצורף (סוג: ${attachment_type || 'לא צוין'}). החזר JSON בלבד כפי שהוגדר בהנחיות המערכת.` },
          ],
        },
      ],
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "";

    let extractedData;
    try {
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText.trim();
      extractedData = JSON.parse(jsonStr);
    } catch {
      extractedData = {
        summary: responseText,
        disabilityPercentage: null,
        diagnosis: "",
        treatmentRecommendations: "",
        functionalLimitations: "",
        parse_error: true,
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        model: response.model,
        usage: response.usage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error analyzing attachment:", error);
    return new Response(
      JSON.stringify({ error: "Failed to analyze attachment", success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
