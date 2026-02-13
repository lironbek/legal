import { createClient } from "npm:@supabase/supabase-js@2";

function getEnvOrThrow(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function getSupabase() {
  return createClient(
    getEnvOrThrow("SUPABASE_URL"),
    getEnvOrThrow("SUPABASE_SERVICE_ROLE_KEY"),
  );
}

import { publicCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = { ...publicCorsHeaders, "Content-Type": "application/json" };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { token } = await req.json();
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing token" }),
        { status: 400, headers: corsHeaders },
      );
    }

    console.log("Looking up signing request with token:", token.substring(0, 8) + "...");

    const supabase = getSupabase();

    // Fetch by access token
    const { data: request, error: fetchError } = await supabase
      .from("signing_requests")
      .select("*")
      .eq("access_token", token)
      .single();

    if (fetchError || !request) {
      console.log("Signing request not found. Error:", fetchError?.message, "Code:", fetchError?.code);
      const { count } = await supabase
        .from("signing_requests")
        .select("*", { count: "exact", head: true });
      console.log("Total signing requests in table:", count);

      return new Response(
        JSON.stringify({ success: false, error: "not_found" }),
        { status: 404, headers: corsHeaders },
      );
    }

    console.log("Found signing request:", request.id, "status:", request.status);

    // Check if expired
    if (request.expires_at && new Date(request.expires_at) < new Date()) {
      await supabase
        .from("signing_requests")
        .update({ status: "expired" })
        .eq("id", request.id);

      return new Response(
        JSON.stringify({ success: false, error: "expired" }),
        { headers: corsHeaders },
      );
    }

    // Check if already signed
    if (request.status === "signed") {
      return new Response(
        JSON.stringify({ success: false, error: "already_signed" }),
        { headers: corsHeaders },
      );
    }

    // Check if cancelled
    if (request.status === "cancelled") {
      return new Response(
        JSON.stringify({ success: false, error: "cancelled" }),
        { headers: corsHeaders },
      );
    }

    // Generate signed URL for the document
    const { data: urlData, error: urlError } = await supabase.storage
      .from("documents")
      .createSignedUrl(request.file_url, 3600);

    if (urlError || !urlData?.signedUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to generate document URL" }),
        { status: 500, headers: corsHeaders },
      );
    }

    // Update status to opened (if currently sent)
    if (request.status === "sent") {
      await supabase
        .from("signing_requests")
        .update({ status: "opened" })
        .eq("id", request.id);

      await supabase.from("signing_audit_log").insert({
        signing_request_id: request.id,
        event: "opened",
        metadata: {
          ip: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
          user_agent: req.headers.get("user-agent"),
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        signing_request: {
          id: request.id,
          file_name: request.file_name,
          file_url: request.file_url,
          file_type: request.file_type,
          fields: request.fields,
          recipient_name: request.recipient_name,
          status: request.status,
        },
        document_url: urlData.signedUrl,
      }),
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: corsHeaders },
    );
  }
});
