import Anthropic from "npm:@anthropic-ai/sdk@0.30.1";
import { createClient } from "npm:@supabase/supabase-js@2";
import { SYSTEM_PROMPT, USER_PROMPT } from "../_shared/legal-prompts.ts";

// ── Types ────────────────────────────────────────────────────────────────────

interface GreenApiWebhook {
  typeWebhook: string;
  instanceData: { idInstance: number; wid: string; typeInstance: string };
  timestamp: number;
  idMessage: string;
  senderData: {
    chatId: string;
    sender: string;
    chatName: string;
    senderName: string;
    senderContactName?: string;
  };
  messageData: {
    typeMessage: string;
    textMessageData?: { textMessage: string };
    fileMessageData?: {
      downloadUrl: string;
      caption: string;
      mimeType: string;
      jpegThumbnail?: string;
      fileName?: string;
    };
  };
}

interface ExtractedData {
  document_type: string;
  document_date: string | null;
  case_number: string | null;
  court_name: string | null;
  parties: Array<{ name: string; role: string; id_number?: string | null }>;
  title: string | null;
  summary: string | null;
  key_dates: Array<{ label: string; date: string }>;
  amounts: Array<{ label: string; amount: number; currency: string }>;
  references: string[];
  signatures: Array<{ name: string; role: string; signed: boolean }>;
  notes: string | null;
  raw_text_excerpt: string | null;
  confidence: string;
  [key: string]: unknown;
}

interface UserCompany {
  company_id: string;
  company_name: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  let phone = raw.replace(/@c\.us$/, "").replace(/@s\.whatsapp\.net$/, "");
  phone = phone.replace(/[\s\-\(\)\.+]/g, "");
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
  }
}

async function downloadMedia(downloadUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error(`Failed to download media: ${res.status}`);
  return res.arrayBuffer();
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function getFileExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif",
    "image/webp": "webp", "image/bmp": "bmp", "application/pdf": "pdf",
  };
  return map[mimeType] || "bin";
}

const DOC_TYPE_LABELS: Record<string, string> = {
  contract: "חוזה/הסכם",
  pleading: "כתב טענות",
  court_decision: "פסק דין",
  testimony: "תצהיר/עדות",
  invoice: "חשבונית",
  correspondence: "מכתב",
  power_of_attorney: "ייפוי כוח",
  id_document: "מסמך זיהוי",
  other: "מסמך אחר",
};

function buildSummaryMessage(data: ExtractedData): string {
  const docType = DOC_TYPE_LABELS[data.document_type] || data.document_type;
  const lines = [`Legal Nexus ✅ המסמך עובד בהצלחה`, "", `סוג: ${docType}`];
  if (data.title) lines.push(`כותרת: ${data.title}`);
  if (data.document_date) lines.push(`תאריך: ${data.document_date}`);
  if (data.case_number) lines.push(`מס' תיק: ${data.case_number}`);
  if (data.parties?.length > 0) {
    lines.push(`צדדים: ${data.parties.map(p => p.name).join(", ")}`);
  }
  if (data.summary) lines.push(`תקציר: ${data.summary}`);
  lines.push("", "סטטוס: ממתין לאישור במערכת");
  return lines.join("\n");
}

// ── Phone-based user lookup ─────────────────────────────────────────────────

async function lookupUserByPhone(phone: string): Promise<{ userId: string; companies: UserCompany[] } | null> {
  const supabase = getSupabase();
  const normalized = normalizePhone(phone);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, phone")
    .eq("whatsapp_authorized", true);

  if (!profiles || profiles.length === 0) return null;

  const matchedProfile = profiles.find((p: any) => {
    if (!p.phone) return false;
    return normalizePhone(p.phone) === normalized;
  });

  if (!matchedProfile) return null;

  const { data: memberships } = await supabase
    .from("user_company_assignments")
    .select("company_id, companies!inner(name)")
    .eq("user_id", matchedProfile.id);

  if (!memberships || memberships.length === 0) return null;

  const companies: UserCompany[] = memberships.map((m: any) => ({
    company_id: m.company_id,
    company_name: m.companies.name,
  }));

  return { userId: matchedProfile.id, companies };
}

// ── Document processing ─────────────────────────────────────────────────────

async function processDocument(
  base64: string, mediaType: string, fileName: string,
  companyId: string, userId: string | null,
  chatId: string, senderName: string, messageId: string,
): Promise<void> {
  const supabase = getSupabase();
  const anthropicKey = getEnvOrThrow("ANTHROPIC_API_KEY");

  // Deduplication
  const { data: existing } = await supabase
    .from("scanned_documents")
    .select("id")
    .eq("whatsapp_message_id", messageId)
    .maybeSingle();

  if (existing) {
    console.log(`Duplicate message ${messageId}, skipping`);
    return;
  }

  // Upload to Storage
  const ext = getFileExtension(mediaType);
  const storagePath = `${companyId}/whatsapp/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
  const fileBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, fileBytes, { contentType: mediaType });

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  // Call Claude Vision
  const client = new Anthropic({ apiKey: anthropicKey });
  const isPdf = mediaType === "application/pdf";
  const documentContent = isPdf
    ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 } }
    : { type: "image" as const, source: { type: "base64" as const, media_type: mediaType, data: base64 } };

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: [documentContent, { type: "text", text: USER_PROMPT }] }],
  });

  const responseText = response.content[0].type === "text" ? response.content[0].text : "";

  let extractedData: ExtractedData;
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : responseText.trim();
    extractedData = JSON.parse(jsonStr);
  } catch {
    extractedData = { raw_response: responseText, parse_error: true } as unknown as ExtractedData;
  }

  await supabase.from("scanned_documents").insert({
    company_id: companyId,
    uploaded_by: userId,
    file_name: fileName,
    file_url: storagePath,
    file_type: mediaType,
    file_size: fileBytes.byteLength,
    document_type: extractedData.document_type,
    document_date: extractedData.document_date,
    title: extractedData.title,
    case_number: extractedData.case_number,
    court_name: extractedData.court_name,
    parties: extractedData.parties || [],
    summary: extractedData.summary,
    key_dates: extractedData.key_dates || [],
    amounts: extractedData.amounts || [],
    references_list: extractedData.references || [],
    signatures: extractedData.signatures || [],
    notes: extractedData.notes,
    raw_text_excerpt: extractedData.raw_text_excerpt,
    confidence: extractedData.confidence,
    raw_extracted_data: extractedData,
    claude_response: { content: responseText, model: response.model, usage: response.usage },
    processed_at: new Date().toISOString(),
    status: "needs_verification",
    source: "whatsapp",
    whatsapp_chat_id: chatId,
    whatsapp_message_id: messageId,
    whatsapp_sender_name: senderName,
  });

  await sendWhatsAppMessage(chatId, buildSummaryMessage(extractedData));
}

// ── Multi-company selection helpers ─────────────────────────────────────────

async function savePendingSelection(
  chatId: string, phone: string, userId: string, companies: UserCompany[],
  base64: string, mediaType: string, fileName: string, messageId: string,
): Promise<void> {
  const supabase = getSupabase();

  const ext = getFileExtension(mediaType);
  const tempPath = `_temp/whatsapp/${chatId}/${Date.now()}.${ext}`;
  const fileBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  await supabase.storage.from("documents").upload(tempPath, fileBytes, { contentType: mediaType });

  await supabase.from("whatsapp_pending_org_selection").delete().eq("chat_id", chatId);

  await supabase.from("whatsapp_pending_org_selection").insert({
    chat_id: chatId,
    phone_number: phone,
    user_id: userId,
    organizations: companies.map((c) => ({ id: c.company_id, name: c.company_name })),
    message_id: messageId,
    file_storage_path: tempPath,
    media_type: mediaType,
    file_name: fileName,
  });
}

async function handleCompanySelectionReply(
  chatId: string, text: string, senderName: string,
): Promise<boolean> {
  const supabase = getSupabase();

  const { data: pending } = await supabase
    .from("whatsapp_pending_org_selection")
    .select("*")
    .eq("chat_id", chatId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pending) return false;

  const choice = parseInt(text.trim(), 10);
  const orgs = pending.organizations as Array<{ id: string; name: string }>;

  if (isNaN(choice) || choice < 1 || choice > orgs.length) {
    await sendWhatsAppMessage(chatId, `בחירה לא תקינה. השב עם מספר בין 1 ל-${orgs.length}.`);
    return true;
  }

  const selected = orgs[choice - 1];
  await sendWhatsAppMessage(chatId, `Legal Nexus ⏳ מעבד את המסמך עבור "${selected.name}"...`);

  const { data: fileData, error: dlError } = await supabase.storage
    .from("documents")
    .download(pending.file_storage_path);

  if (dlError || !fileData) {
    await sendWhatsAppMessage(chatId, "Legal Nexus ❌ הקובץ פג תוקף. שלח שוב את המסמך.");
    await supabase.from("whatsapp_pending_org_selection").delete().eq("id", pending.id);
    return true;
  }

  const buffer = await fileData.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);

  await processDocument(base64, pending.media_type, pending.file_name, selected.id, pending.user_id, chatId, senderName, pending.message_id);

  await supabase.from("whatsapp_pending_org_selection").delete().eq("id", pending.id);
  await supabase.storage.from("documents").remove([pending.file_storage_path]);

  return true;
}

// ── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    const expectedSecret = Deno.env.get("WEBHOOK_SECRET");
    if (!expectedSecret) {
      console.error("WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), { status: 500 });
    }
    if (secret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const body: GreenApiWebhook = await req.json();

    const expectedInstance = Deno.env.get("GREEN_API_INSTANCE_ID");
    if (expectedInstance && String(body.instanceData?.idInstance) !== expectedInstance) {
      return new Response(JSON.stringify({ ok: true, skipped: "instance_mismatch" }));
    }

    if (body.typeWebhook !== "incomingMessageReceived") {
      return new Response(JSON.stringify({ ok: true, skipped: body.typeWebhook }));
    }

    const { messageData, senderData, idMessage } = body;
    const chatId = senderData.chatId;
    const senderPhone = senderData.sender;
    const senderName = senderData.senderName || senderData.chatName || "";
    const typeMessage = messageData.typeMessage;

    console.log(`Received ${typeMessage} from ${chatId} (${senderName})`);

    const userInfo = await lookupUserByPhone(senderPhone);

    if (!userInfo) {
      await sendWhatsAppMessage(
        chatId,
        "Legal Nexus - מספר הטלפון שלך לא מורשה לשליחת מסמכים.\n\nפנה למנהל המערכת להפעלת הרשאת וואטסאפ בפרופיל שלך.",
      );
      return new Response(JSON.stringify({ ok: true, skipped: "unauthorized_phone" }));
    }

    const { userId, companies } = userInfo;

    // Text message: check for company selection reply
    if (typeMessage === "textMessage") {
      const text = messageData.textMessageData?.textMessage || "";
      const handled = await handleCompanySelectionReply(chatId, text, senderName);
      if (handled) return new Response(JSON.stringify({ ok: true }));

      await sendWhatsAppMessage(
        chatId,
        "Legal Nexus - שלום! 👋\n\nשלח תמונה או PDF של מסמך משפטי ואעבד אותו אוטומטית.\n\nסוגי קבצים נתמכים: JPG, PNG, PDF",
      );
      return new Response(JSON.stringify({ ok: true }));
    }

    // Image / Document messages
    const isImage = typeMessage === "imageMessage" && messageData.fileMessageData;
    const isDocument = typeMessage === "documentMessage" && messageData.fileMessageData;

    if (!isImage && !isDocument) {
      await sendWhatsAppMessage(chatId, "Legal Nexus - סוג קובץ לא נתמך.\n\nשלח תמונה (JPG, PNG) או מסמך PDF.");
      return new Response(JSON.stringify({ ok: true, skipped: "unsupported_type" }));
    }

    const fileData = messageData.fileMessageData!;
    const { downloadUrl, mimeType } = fileData;
    const fileName = fileData.fileName || fileData.caption || `whatsapp-${Date.now()}.${getFileExtension(mimeType)}`;

    const supportedTypes = ["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"];
    if (!supportedTypes.includes(mimeType)) {
      await sendWhatsAppMessage(chatId, "Legal Nexus - סוג קובץ לא נתמך.\n\nשלח תמונה (JPG, PNG) או PDF.");
      return new Response(JSON.stringify({ ok: true, skipped: "unsupported_mime" }));
    }

    const buffer = await downloadMedia(downloadUrl);
    const base64 = arrayBufferToBase64(buffer);

    // Single company: process directly
    if (companies.length === 1) {
      await sendWhatsAppMessage(chatId, "Legal Nexus ⏳ מעבד את המסמך...");
      await processDocument(base64, mimeType, fileName, companies[0].company_id, userId, chatId, senderName, idMessage);
      return new Response(JSON.stringify({ ok: true }));
    }

    // Multiple companies: ask user to choose
    await savePendingSelection(chatId, senderPhone, userId, companies, base64, mimeType, fileName, idMessage);

    const companyList = companies.map((c, i) => `${i + 1}. ${c.company_name}`).join("\n");
    await sendWhatsAppMessage(
      chatId,
      `Legal Nexus - לאיזה משרד שייך המסמך?\n\n${companyList}\n\nהשב עם המספר המתאים.`,
    );

    return new Response(JSON.stringify({ ok: true, pending_company_selection: true }));

  } catch (error) {
    console.error("Webhook error:", error);

    try {
      const cloned = req.clone();
      const errorBody = await cloned.json().catch(() => null);
      if (errorBody?.senderData?.chatId) {
        await sendWhatsAppMessage(
          errorBody.senderData.chatId,
          "Legal Nexus ❌ שגיאה בעיבוד המסמך.\n\nאנא נסה שוב או העלה דרך המערכת.",
        );
      }
    } catch {
      // Ignore
    }

    return new Response(JSON.stringify({ ok: false, error: String(error) }));
  }
});
