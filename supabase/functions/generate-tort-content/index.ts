import Anthropic from "npm:@anthropic-ai/sdk@0.30.1";
import { createClient } from "npm:@supabase/supabase-js@2";
import { TORT_SYSTEM_PROMPT, TORT_USER_PROMPT } from "../_shared/tort-prompts.ts";
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
    const { claimType, claimTypeLabel, eventDescription, injuries, plaintiffName, defendants, disabilityPercentage, eventLocation, eventDate } = body;

    if (!eventDescription) {
      return new Response(
        JSON.stringify({ error: "eventDescription is required" }),
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

    const userPrompt = TORT_USER_PROMPT({
      claimType: claimType || 'other',
      claimTypeLabel: claimTypeLabel || 'אחר',
      eventDescription,
      injuries: injuries || '',
      plaintiffName: plaintiffName || '',
      defendants: defendants || [],
      disabilityPercentage,
      eventLocation,
      eventDate,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: TORT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "";

    let extractedData;
    try {
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText.trim();
      extractedData = JSON.parse(jsonStr);
    } catch {
      extractedData = { legalArguments: responseText, causesOfAction: [], relevantLaws: [], parse_error: true };
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
    console.error("Error generating tort content:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate content", success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
