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

function normalizePhone(raw: string): string {
  let phone = raw.replace(/[\s\-\(\)\.+]/g, "");
  if (phone.startsWith("0")) {
    phone = "972" + phone.substring(1);
  }
  return phone;
}

async function sendWhatsAppMessage(chatId: string, message: string): Promise<void> {
  const instanceId = getEnvOrThrow("GREEN_API_INSTANCE_ID");
  const token = getEnvOrThrow("GREEN_API_TOKEN");
  const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
  });

  if (!res.ok) {
    console.error("Failed to send WhatsApp message:", await res.text());
    throw new Error("Failed to send WhatsApp message");
  }
}

import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Missing authorization header" }), {
        status: 401,
        headers: corsHeaders,
      });
    }
    const supabaseUrl = getEnvOrThrow("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || getEnvOrThrow("SUPABASE_SERVICE_ROLE_KEY");
    const { createClient: createUserClient } = await import("npm:@supabase/supabase-js@2");
    const userClient = createUserClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { signing_request_id } = await req.json();
    if (!signing_request_id) {
      return new Response(JSON.stringify({ success: false, error: "Missing signing_request_id" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabase = getSupabase();

    // Fetch the signing request
    const { data: request, error: fetchError } = await supabase
      .from("signing_requests")
      .select("*")
      .eq("id", signing_request_id)
      .single();

    if (fetchError || !request) {
      return new Response(JSON.stringify({ success: false, error: "Signing request not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Generate signing URL
    const appUrl = Deno.env.get("APP_URL") || "https://legal-nexus-israel.vercel.app";
    const signingUrl = `${appUrl}/sign/${request.access_token}`;

    // Format phone for WhatsApp chatId
    const normalizedPhone = normalizePhone(request.recipient_phone);
    const chatId = `${normalizedPhone}@c.us`;

    // Calculate expiry date
    const expiresAt = request.expires_at
      ? new Date(request.expires_at)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const expiryFormatted = expiresAt.toLocaleDateString("he-IL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Build message
    const recipientName = request.recipient_name || "";
    const greeting = recipientName ? `שלום ${recipientName},` : "שלום,";

    // Fetch company name
    let companyName = "";
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", request.company_id)
      .single();
    if (company?.name) companyName = company.name;

    const fromLine = companyName ? ` מ-${companyName}` : "";

    const message = [
      `✍️ ${greeting}`,
      "",
      `קיבלת מסמך לחתימה דיגיטלית${fromLine}.`,
      `📄 ${request.file_name}`,
      "",
      `👉 לחתימה: ${signingUrl}`,
      "",
      `⏰ הקישור בתוקף עד ${expiryFormatted}.`,
    ].join("\n");

    // Send via WhatsApp
    await sendWhatsAppMessage(chatId, message);

    // Update status to sent
    await supabase
      .from("signing_requests")
      .update({
        status: "sent",
        recipient_phone: normalizedPhone,
        whatsapp_sent_at: new Date().toISOString(),
      })
      .eq("id", signing_request_id);

    // Audit log
    await supabase.from("signing_audit_log").insert({
      signing_request_id,
      event: "sent",
      metadata: { chat_id: chatId, phone: normalizedPhone },
    });

    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: corsHeaders },
    );
  }
});
