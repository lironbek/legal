import { supabase } from '@/lib/supabase';

export interface SigningField {
  id: string;
  type: 'first_name' | 'last_name' | 'phone' | 'email' | 'signature' | 'date' | 'text' | 'id_number';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  required: boolean;
}

export interface SigningRequest {
  id: string;
  company_id: string;
  created_by: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  fields: SigningField[];
  recipient_name: string | null;
  recipient_phone: string;
  recipient_email: string | null;
  access_token: string;
  status: 'draft' | 'sent' | 'opened' | 'signed' | 'expired' | 'cancelled';
  signed_file_url: string | null;
  signed_at: string | null;
  signed_field_values: Record<string, string> | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

function generateShortToken(length = 32): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const maxValid = 256 - (256 % chars.length); // rejection sampling threshold
  const result: string[] = [];
  while (result.length < length) {
    const array = new Uint8Array(length - result.length + 16); // extra to account for rejections
    crypto.getRandomValues(array);
    for (const b of array) {
      if (b < maxValid && result.length < length) {
        result.push(chars[b % chars.length]);
      }
    }
  }
  return result.join('');
}

export async function createSigningRequest(params: {
  companyId: string;
  userId: string;
  file: File;
  fields: SigningField[];
  recipientName?: string;
  recipientPhone: string;
  recipientEmail?: string;
  expiryDays?: number;
}): Promise<SigningRequest> {
  if (!supabase) throw new Error('Supabase not connected');

  const { companyId, userId, file, fields, recipientName, recipientPhone, recipientEmail, expiryDays = 30 } = params;

  // Upload file to Supabase Storage
  const fileExt = file.name.split('.').pop();
  const storagePath = `${companyId}/signing/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file);

  if (uploadError) {
    throw new Error(`שגיאה בהעלאת הקובץ: ${uploadError.message}`);
  }

  // Create signing request record
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  const { data, error } = await supabase
    .from('signing_requests')
    .insert({
      company_id: companyId,
      created_by: userId,
      file_name: file.name,
      file_url: storagePath,
      file_type: file.type,
      fields: fields as unknown as Record<string, unknown>,
      recipient_name: recipientName || null,
      recipient_phone: recipientPhone,
      recipient_email: recipientEmail || null,
      access_token: generateShortToken(),
      expires_at: expiresAt.toISOString(),
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`שגיאה ביצירת בקשת חתימה: ${error.message}`);
  }

  return data as unknown as SigningRequest;
}

export async function updateSigningRequest(
  requestId: string,
  updates: {
    fields?: SigningField[];
    recipientName?: string;
    recipientPhone?: string;
    recipientEmail?: string;
    expiryDays?: number;
  }
): Promise<void> {
  if (!supabase) throw new Error('Supabase not connected');

  const updateData: Record<string, unknown> = {};
  if (updates.fields !== undefined) updateData.fields = updates.fields;
  if (updates.recipientName !== undefined) updateData.recipient_name = updates.recipientName;
  if (updates.recipientPhone !== undefined) updateData.recipient_phone = updates.recipientPhone;
  if (updates.recipientEmail !== undefined) updateData.recipient_email = updates.recipientEmail;
  if (updates.expiryDays !== undefined) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + updates.expiryDays);
    updateData.expires_at = expiresAt.toISOString();
  }

  const { error } = await supabase
    .from('signing_requests')
    .update(updateData)
    .eq('id', requestId);

  if (error) {
    throw new Error(`שגיאה בעדכון בקשת חתימה: ${error.message}`);
  }
}

export async function sendSigningRequest(requestId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not connected');

  const { data, error } = await supabase.functions.invoke('send-signing-request', {
    body: { signing_request_id: requestId },
  });

  if (error) {
    throw new Error(`שגיאה בשליחת בקשת חתימה: ${error.message}`);
  }

  if (!data?.success) {
    throw new Error(data?.error || 'שגיאה בשליחה');
  }
}

export async function cancelSigningRequest(requestId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not connected');

  const { error } = await supabase
    .from('signing_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId);

  if (error) {
    throw new Error(`שגיאה בביטול בקשת חתימה: ${error.message}`);
  }
}

export async function resendSigningRequest(requestId: string): Promise<void> {
  await sendSigningRequest(requestId);
}

export async function getSignedDocumentUrl(requestId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase not connected');

  const { data: request, error } = await supabase
    .from('signing_requests')
    .select('signed_file_url')
    .eq('id', requestId)
    .single();

  if (error || !request?.signed_file_url) {
    throw new Error('לא נמצא מסמך חתום');
  }

  const { data: urlData, error: urlError } = await supabase.storage
    .from('documents')
    .createSignedUrl(request.signed_file_url, 3600);

  if (urlError || !urlData?.signedUrl) {
    throw new Error('שגיאה ביצירת קישור להורדה');
  }

  return urlData.signedUrl;
}

export async function deleteSigningRequest(requestId: string, userId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not connected');

  const { data: request, error: fetchError } = await supabase
    .from('signing_requests')
    .select('id, created_by, file_url, signed_file_url')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    throw new Error('בקשת החתימה לא נמצאה');
  }

  if (request.created_by !== userId) {
    throw new Error('אין לך הרשאה למחוק בקשה זו');
  }

  const filesToDelete = [request.file_url, request.signed_file_url].filter(Boolean) as string[];
  if (filesToDelete.length > 0) {
    await supabase.storage.from('documents').remove(filesToDelete);
  }

  await supabase.from('signing_audit_log').delete().eq('signing_request_id', requestId);

  const { error } = await supabase
    .from('signing_requests')
    .delete()
    .eq('id', requestId);

  if (error) {
    throw new Error(`שגיאה במחיקת בקשת חתימה: ${error.message}`);
  }
}

export async function getDocumentSignedUrl(fileUrl: string): Promise<string> {
  if (!supabase) throw new Error('Supabase not connected');

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(fileUrl, 3600);

  if (error || !data?.signedUrl) {
    throw new Error('שגיאה בטעינת הקובץ');
  }

  return data.signedUrl;
}
