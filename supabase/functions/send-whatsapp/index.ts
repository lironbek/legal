import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { phone, message, fileUrl, fileName } = await req.json();

    if (!phone || (!message && !fileUrl)) {
      return new Response(
        JSON.stringify({ error: "phone and either message or fileUrl are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const instanceId = Deno.env.get("GREEN_API_INSTANCE_ID");
    const token = Deno.env.get("GREEN_API_TOKEN");

    if (!instanceId || !token) {
      return new Response(
        JSON.stringify({ error: "Green API credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize Israeli phone number
    let chatId = phone.replace(/[\s\-\(\)]/g, "");
    if (chatId.startsWith("0")) {
      chatId = "972" + chatId.slice(1);
    }
    if (!chatId.includes("@")) {
      chatId = chatId + "@c.us";
    }

    const baseUrl = `https://api.green-api.com/waInstance${instanceId}`;
    let result;

    if (fileUrl) {
      // Send file with optional caption
      let signedUrl = fileUrl;

      // If it's a Supabase Storage path, create a signed URL
      if (fileUrl.startsWith("documents/") || fileUrl.startsWith("/documents/")) {
        const storagePath = fileUrl.replace(/^\//, "");
        const { data: signedData, error: signError } = await supabase.storage
          .from("documents")
          .createSignedUrl(storagePath.replace("documents/", ""), 3600);

        if (signError || !signedData?.signedUrl) {
          return new Response(
            JSON.stringify({ error: "Failed to create signed URL for file" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        signedUrl = signedData.signedUrl;
      }

      const response = await fetch(`${baseUrl}/sendFileByUrl/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          urlFile: signedUrl,
          fileName: fileName || "document",
          caption: message || "",
        }),
      });
      result = await response.json();
    } else {
      // Send text message
      const response = await fetch(`${baseUrl}/sendMessage/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          message,
        }),
      });
      result = await response.json();
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send WhatsApp message", success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
