// Edge Function: generate-claim-draft
// Receives system + user prompts and generates a full claim draft via Claude Opus

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
    const { systemPrompt, userPrompt } = body;

    if (!systemPrompt || !userPrompt) {
      return new Response(
        JSON.stringify({ error: "systemPrompt and userPrompt are required" }),
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

    const response = await client.messages.create({
      model: "claude-opus-4-5-20250918",
      max_tokens: 8000,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON from response
    let extractedData;
    try {
      // Try to extract JSON from code block or raw
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText.trim();
      extractedData = JSON.parse(jsonStr);
    } catch {
      // If JSON parsing fails, use the raw text as the full draft
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
    console.error("Error generating claim draft:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate claim draft", success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
