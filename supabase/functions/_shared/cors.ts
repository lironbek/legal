// Allowed origin from environment, or restrict to the deployed app URL.
// Set ALLOWED_ORIGIN in Supabase Edge Function secrets (e.g. "https://your-app.vercel.app")
const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") || "https://legal-nexus-israel.vercel.app";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// For public endpoints (signing pages accessed by external recipients)
// we need a wider CORS policy since signers open these from WhatsApp links
export const publicCorsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
