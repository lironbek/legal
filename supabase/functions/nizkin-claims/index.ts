// Edge Function: nizkin-claims
// Full CRUD API for tort claims:
// POST   /              → Create new claim
// GET    /              → List claims (with filters)
// GET    /?id=xxx       → Get specific claim
// PATCH  /              → Update claim (partial)
// DELETE /?id=xxx       → Delete claim
// POST   /?action=approve&id=xxx → Approve claim
// GET    /?action=statute&id=xxx → Check statute of limitations

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
    // ── Auth ──
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
    const action = url.searchParams.get("action");

    // ── Special actions ──
    if (action === "approve" && id && req.method === "POST") {
      return await handleApprove(supabase, id, user.id, json);
    }

    if (action === "statute" && id && req.method === "GET") {
      return await handleStatuteCheck(supabase, id, json);
    }

    // ── CRUD routing ──
    switch (req.method) {
      case "POST":
        return await handleCreate(supabase, req, user.id, json);
      case "GET":
        return id
          ? await handleGetById(supabase, id, json)
          : await handleList(supabase, url, json);
      case "PATCH":
        return await handleUpdate(supabase, req, json);
      case "DELETE":
        return id
          ? await handleDelete(supabase, id, json)
          : json({ error: "id is required" }, 400);
      default:
        return json({ error: "Method not allowed" }, 405);
    }
  } catch (error) {
    console.error("nizkin-claims error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============ Handlers ============

type JsonFn = (data: unknown, status?: number) => Response;

async function handleCreate(supabase: any, req: Request, userId: string, json: JsonFn) {
  const body = await req.json();
  const { company_id, ...fields } = body;

  if (!company_id) return json({ error: "company_id is required" }, 400);

  const { data, error } = await supabase
    .from("tort_claims")
    .insert({
      ...fields,
      company_id,
      created_by: userId,
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    console.error("Create error:", error);
    return json({ error: error.message }, 400);
  }

  return json({ success: true, data, id: data.id, created_at: data.created_at });
}

async function handleList(supabase: any, url: URL, json: JsonFn) {
  const status = url.searchParams.get("status");
  const claimType = url.searchParams.get("claim_type");
  const search = url.searchParams.get("search");
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("tort_claims")
    .select("*", { count: "exact" });

  if (status) query = query.eq("status", status);
  if (claimType) query = query.eq("claim_type", claimType);
  if (search) {
    query = query.or(
      `plaintiff_name.ilike.%${search}%,court_name.ilike.%${search}%,incident_description.ilike.%${search}%`
    );
  }

  query = query.order("updated_at", { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) return json({ error: error.message }, 400);

  return json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}

async function handleGetById(supabase: any, id: string, json: JsonFn) {
  const { data, error } = await supabase
    .from("tort_claims")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return json({ error: error.message }, error.code === "PGRST116" ? 404 : 400);

  return json({ success: true, data });
}

async function handleUpdate(supabase: any, req: Request, json: JsonFn) {
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return json({ error: "id is required" }, 400);

  // Remove read-only fields
  delete updates.created_at;
  delete updates.created_by;

  const { data, error } = await supabase
    .from("tort_claims")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return json({ error: error.message }, 400);

  return json({ success: true, data });
}

async function handleDelete(supabase: any, id: string, json: JsonFn) {
  const { error } = await supabase
    .from("tort_claims")
    .delete()
    .eq("id", id);

  if (error) return json({ error: error.message }, 400);

  return json({ success: true, deleted: id });
}

async function handleApprove(supabase: any, id: string, userId: string, json: JsonFn) {
  // Get claim to validate required fields
  const { data: claim, error: fetchError } = await supabase
    .from("tort_claims")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !claim) return json({ error: "Claim not found" }, 404);

  // Validate required fields
  const missing: string[] = [];
  if (!claim.plaintiff_name) missing.push("plaintiff_name");
  if (!claim.incident_date) missing.push("incident_date");
  if (!claim.court_name) missing.push("court_name");
  if (!claim.defendants || claim.defendants.length === 0) missing.push("defendants");
  if (!claim.incident_description) missing.push("incident_description");

  if (missing.length > 0) {
    return json({
      error: "Missing required fields for approval",
      missing_fields: missing,
    }, 400);
  }

  const { data, error } = await supabase
    .from("tort_claims")
    .update({ status: "approved" })
    .eq("id", id)
    .select()
    .single();

  if (error) return json({ error: error.message }, 400);

  return json({ success: true, data });
}

async function handleStatuteCheck(supabase: any, id: string, json: JsonFn) {
  const { data: claim, error } = await supabase
    .from("tort_claims")
    .select("claim_type, incident_date")
    .eq("id", id)
    .single();

  if (error || !claim) return json({ error: "Claim not found" }, 404);

  if (!claim.incident_date) {
    return json({ success: true, data: { days_remaining: null, is_critical: false, warning_message: "תאריך אירוע לא הוזן" } });
  }

  // Statute rules by claim type (years)
  const rules: Record<string, number> = {
    general_negligence: 7, road_accident: 7, medical_malpractice: 7,
    professional_malpractice: 7, property_damage: 7, defamation: 1,
    assault: 7, work_accident: 7, product_liability: 3, other: 7,
  };

  const years = rules[claim.claim_type] || 7;
  const incident = new Date(claim.incident_date);
  const deadline = new Date(incident);
  deadline.setFullYear(deadline.getFullYear() + years);

  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let warningMessage = "";
  let isCritical = false;

  if (daysRemaining < 0) {
    isCritical = true;
    warningMessage = `תקופת ההתיישנות חלפה לפני ${Math.abs(daysRemaining)} ימים`;
  } else if (daysRemaining < 60) {
    isCritical = true;
    warningMessage = `דחוף! נותרו ${daysRemaining} ימים בלבד להגשת התביעה`;
  } else if (daysRemaining < 90) {
    warningMessage = `תשומת לב: נותרו ${daysRemaining} ימים להגשת התביעה`;
  }

  return json({
    success: true,
    data: {
      days_remaining: daysRemaining,
      is_critical: isCritical,
      warning_message: warningMessage,
      deadline: deadline.toISOString().split("T")[0],
      years_allowed: years,
    },
  });
}
