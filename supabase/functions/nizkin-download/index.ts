// Edge Function: nizkin-download
// GET /?id=xxx&format=docx|pdf → Generate and return document
// If docx_url or pdf_url already exists, redirect to it
// Otherwise generate on the fly (simplified server-side)

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

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const format = url.searchParams.get("format") || "docx";

    if (!id) return json({ error: "id is required" }, 400);
    if (!["docx", "pdf"].includes(format)) return json({ error: "format must be docx or pdf" }, 400);

    // Fetch claim
    const { data: claim, error: fetchError } = await supabase
      .from("tort_claims")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !claim) return json({ error: "Claim not found" }, 404);

    // Check for existing URL
    const existingUrl = format === "docx" ? claim.docx_url : claim.pdf_url;
    if (existingUrl) {
      return json({
        success: true,
        url: existingUrl,
        cached: true,
      });
    }

    // Log download
    console.log(`nizkin-download: claim=${id}, format=${format}, user=${user.id}`);

    // For server-side document generation we return the claim data
    // and let the client generate the document (since docx/pdf-lib are client-side libraries).
    // In production, you could use a dedicated document generation service.
    return json({
      success: true,
      data: claim,
      format,
      message: "Generate document client-side with the returned claim data",
      cached: false,
    });

  } catch (error) {
    console.error("nizkin-download error:", error);
    return json({ error: "Failed to process download request", success: false }, 500);
  }
});
