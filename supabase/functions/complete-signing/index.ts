import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

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

async function sendWhatsAppMessage(chatId: string, message: string): Promise<void> {
  const instanceId = Deno.env.get("GREEN_API_INSTANCE_ID");
  const token = Deno.env.get("GREEN_API_TOKEN");
  if (!instanceId || !token) return;

  const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
  }).catch(() => {});
}

interface SigningField {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  required: boolean;
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
    const { token, field_values } = await req.json();
    if (!token || !field_values) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing token or field_values" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const supabase = getSupabase();

    // Fetch signing request
    const { data: request, error: fetchError } = await supabase
      .from("signing_requests")
      .select("*")
      .eq("access_token", token)
      .single();

    if (fetchError || !request) {
      return new Response(
        JSON.stringify({ success: false, error: "not_found" }),
        { status: 404, headers: corsHeaders },
      );
    }

    // Validate status
    if (request.status === "signed") {
      return new Response(
        JSON.stringify({ success: false, error: "already_signed" }),
        { headers: corsHeaders },
      );
    }

    if (request.status === "cancelled" || request.status === "expired") {
      return new Response(
        JSON.stringify({ success: false, error: request.status }),
        { headers: corsHeaders },
      );
    }

    // Check expiry
    if (request.expires_at && new Date(request.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: "expired" }),
        { headers: corsHeaders },
      );
    }

    const fields = (request.fields || []) as SigningField[];

    // Download original document from storage
    console.log("Downloading file:", request.file_url);
    const { data: fileData, error: dlError } = await supabase.storage
      .from("documents")
      .download(request.file_url);

    if (dlError || !fileData) {
      console.error("Download error:", dlError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to download document" }),
        { status: 500, headers: corsHeaders },
      );
    }

    console.log("File downloaded, size:", fileData.size);
    const fileBytes = new Uint8Array(await fileData.arrayBuffer());
    const isPdf = request.file_type?.includes("pdf") || request.file_url?.includes(".pdf");

    // Create or load PDF document
    let pdfDoc: InstanceType<typeof PDFDocument>;

    if (isPdf) {
      console.log("Loading as PDF...");
      pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
    } else {
      console.log("Creating PDF from image, type:", request.file_type);
      pdfDoc = await PDFDocument.create();
      let embeddedImage;

      if (request.file_type?.includes("png")) {
        embeddedImage = await pdfDoc.embedPng(fileBytes);
      } else {
        embeddedImage = await pdfDoc.embedJpg(fileBytes);
      }

      const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: embeddedImage.width,
        height: embeddedImage.height,
      });
    }

    // Embed font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    console.log("PDF loaded, pages:", pages.length, "fields:", fields.length);

    // Draw each field value onto the PDF
    for (const field of fields) {
      const value = field_values[field.id];
      if (!value) continue;

      const pageIndex = Math.min((field.page || 1) - 1, pages.length - 1);
      const page = pages[pageIndex];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      const fieldX = field.x * pageWidth;
      const fieldY = pageHeight - (field.y * pageHeight) - (field.height * pageHeight);
      const fieldWidth = field.width * pageWidth;
      const fieldHeight = field.height * pageHeight;

      if (field.type === "signature") {
        try {
          const base64Data = value.split(",")[1];
          if (base64Data) {
            const sigBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
            const sigImage = await pdfDoc.embedPng(sigBytes);

            const scale = Math.min(
              fieldWidth / sigImage.width,
              fieldHeight / sigImage.height,
            );
            const drawWidth = sigImage.width * scale;
            const drawHeight = sigImage.height * scale;

            page.drawImage(sigImage, {
              x: fieldX,
              y: fieldY + (fieldHeight - drawHeight) / 2,
              width: drawWidth,
              height: drawHeight,
            });
            console.log("Signature embedded on page", pageIndex + 1);
          }
        } catch (err) {
          console.error("Failed to embed signature:", err);
        }
      } else {
        try {
          const fontSize = Math.min(12, fieldHeight * 0.7);
          page.drawText(value, {
            x: fieldX + 2,
            y: fieldY + fieldHeight / 2 - fontSize / 3,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
            maxWidth: fieldWidth - 4,
          });
        } catch (textErr) {
          console.warn(`Cannot draw text for field "${field.label}": ${textErr}. Value stored in metadata.`);
          try {
            const fontSize = Math.min(10, fieldHeight * 0.6);
            const asciiValue = value.replace(/[^\x20-\x7E]/g, "?");
            page.drawText(asciiValue || "✓", {
              x: fieldX + 2,
              y: fieldY + fieldHeight / 2 - fontSize / 3,
              size: fontSize,
              font,
              color: rgb(0.3, 0.3, 0.3),
              maxWidth: fieldWidth - 4,
            });
          } catch {
            console.warn(`Skipped drawing field "${field.label}"`);
          }
        }
      }
    }

    // Save the modified PDF
    console.log("Saving signed PDF...");
    const signedPdfBytes = await pdfDoc.save();
    console.log("Signed PDF size:", signedPdfBytes.length);

    // Upload signed PDF
    const signedPath = request.file_url.replace(
      /\/signing\//,
      "/signing/signed/",
    ).replace(/\.[^.]+$/, `-signed-${Date.now()}.pdf`);

    console.log("Uploading to:", signedPath);
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(signedPath, signedPdfBytes, { contentType: "application/pdf" });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to save signed document" }),
        { status: 500, headers: corsHeaders },
      );
    }
    console.log("Upload complete");

    // Update signing request
    const signerIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "";
    const signerUserAgent = req.headers.get("user-agent") || "";

    await supabase
      .from("signing_requests")
      .update({
        status: "signed",
        signed_file_url: signedPath,
        signed_at: new Date().toISOString(),
        signer_ip: signerIp,
        signer_user_agent: signerUserAgent,
        signed_field_values: field_values,
      })
      .eq("id", request.id);

    // Audit log
    await supabase.from("signing_audit_log").insert({
      signing_request_id: request.id,
      event: "signed",
      metadata: {
        ip: signerIp,
        user_agent: signerUserAgent,
        fields_filled: Object.keys(field_values).length,
      },
    });

    // Send WhatsApp confirmation
    const signerPhone = request.recipient_phone;
    if (signerPhone) {
      const chatId = `${signerPhone}@c.us`;
      await sendWhatsAppMessage(
        chatId,
        `Legal Nexus ✅ תודה! המסמך "${request.file_name}" נחתם בהצלחה.\n\nהחתימה נשמרה במערכת.`,
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
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
