// Claim Generator - מנוע יצירת כתב תביעה עם AI
// Builds prompts, calls Claude via Supabase Edge Functions, and processes results

import { supabase, isSupabaseReachable } from '../supabase';
import type { TortClaim, TortClaimType } from '../tortClaimTypes';
import { CLAIM_TYPE_LABELS, DAMAGE_TYPE_LABELS, DEFENDANT_TYPE_LABELS } from '../tortClaimTypes';
import { calculateTotalDamages, calculateStatuteOfLimitations } from './questionnaire-engine';

// ============================================================================
// AI Proxy — local dev proxy for when Supabase Edge Functions are unavailable
// ============================================================================

const AI_PROXY_URL = import.meta.env.VITE_AI_PROXY_URL || 'http://localhost:3001';

let _proxyAvailable: boolean | null = null;

/** Check if the local AI proxy is running */
async function isProxyAvailable(): Promise<boolean> {
  // Don't cache failures — only cache success for 30s
  if (_proxyAvailable === true) return true;
  try {
    console.log('[nizkin] Checking proxy health at', AI_PROXY_URL);
    const res = await fetch(`${AI_PROXY_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    _proxyAvailable = res.ok;
    console.log('[nizkin] Proxy health:', _proxyAvailable);
  } catch (e) {
    console.warn('[nizkin] Proxy health check failed:', e);
    _proxyAvailable = false;
  }
  if (_proxyAvailable) {
    // Re-check every 30s
    setTimeout(() => { _proxyAvailable = null; }, 30_000);
  }
  return _proxyAvailable ?? false;
}

// ============================================================================
// 1. BASE_SYSTEM_PROMPT - הפרומפט הבסיסי
// ============================================================================

export const BASE_SYSTEM_PROMPT = `
אתה עוזר משפטי מומחה בדיני נזיקין ישראלי.
תפקידך לנסח כתבי תביעה מקצועיים בדיני הנזיקין.

כללי ניסוח חובה:
- עמוד בתקנות סדר הדין האזרחי, התשע"ט-2018
- חלק את המסמך ל-3 חלקים: כותרת/פרטים → תמצית טענות → פירוט עובדות
- השתמש בשפה משפטית מדויקת, ענינית ולא מבזה
- הסתמך על פקודת הנזיקין [נוסח חדש]
- ציין את הסעיפים המשפטיים הרלוונטיים
- פרט כל ראש נזק בנפרד עם הסכום המשוער
- אל תמציא עובדות — השתמש רק במידע שסופק
- סגנון: פורמלי, תכליתי, מפורט
`.trim();

// ============================================================================
// 2. CLAIM_TYPE_PROMPTS - פרומפטים ייעודיים לכל סוג תביעה
// ============================================================================

export const CLAIM_TYPE_PROMPTS: Record<string, string> = {
  general_negligence: `
תנסח תביעת רשלנות מכוח סעיפים 35-36 לפקודת הנזיקין.
הדגש:
1. קיומה של חובת זהירות (מושגית וקונקרטית)
2. הפרת חובת הזהירות ע"י הנתבע
3. הקשר הסיבתי (עובדתי ומשפטי)
4. הנזק שנגרם בפועל
5. אם רלוונטי — גם עוולת הפרת חובה חקוקה (סעיף 63)
הזכר אשם תורם (סעיף 68) רק אם נמסר מידע רלוונטי.
`.trim(),

  road_accident: `
תנסח תביעה מכוח חוק פיצויים לנפגעי תאונות דרכים, התשל"ה-1975.
הדגש:
1. קיומה של "תאונת דרכים" כהגדרתה בחוק
2. זיהוי הרכב הפוגע ובעליו
3. חבות חברת הביטוח
4. ראשי הנזק: נכות, אובדן השתכרות, הוצאות רפואיות, כאב וסבל
5. אם מוגש לקרנית — הסבר את הנסיבות
שים לב: בתביעת פלת"ד אין צורך להוכיח אשם.
`.trim(),

  medical_malpractice: `
תנסח תביעת רשלנות רפואית.
הדגש:
1. חובת הזהירות של הרופא/המוסד הרפואי
2. הסטנדרט הרפואי הנדרש לפי הפסיקה
3. הפרת הסטנדרט — מה היה צריך להיעשות ולא נעשה
4. הקשר הסיבתי בין הרשלנות לנזק
5. הזכר חוק זכויות החולה אם רלוונטי
6. ציין שלכתב התביעה מצורף כתב ויתור על סודיות רפואית (אם נמסר)
`.trim(),

  professional_malpractice: `
תנסח תביעת רשלנות מקצועית (עו"ד / רו"ח / מהנדס וכו').
הדגש:
1. הסטנדרט המקצועי הנדרש בתחום
2. כיצד חרג הנתבע מהסטנדרט
3. הנזק הישיר שנגרם ללקוח
4. שקול גם תביעה חוזית במקביל
`.trim(),

  defamation: `
תנסח תביעת לשון הרע מכוח חוק איסור לשון הרע, התשכ"ה-1965.
הדגש:
1. ציטוט/תיאור הפרסום המזיק
2. זיהוי הנפגע בפרסום
3. אופי הפרסום: פומבי / כתוב / בכתב / בשידור
4. הנזק לשמו הטוב של התובע
5. בדוק: האם חלות הגנות מן החוק?
`.trim(),

  assault: `
תנסח תביעת נזיקין בגין תקיפה מכוח סעיף 23 לפקודת הנזיקין.
הדגש:
1. תיאור מעשה התקיפה
2. הנזק הגופני והנפשי שנגרם
3. נסיבות מחמירות אם קיימות
4. שקול גם תביעה בגין כליאת שווא (סעיף 26) אם רלוונטי
`.trim(),

  work_accident: `
תנסח תביעת נזיקין בגין תאונת עבודה.
הדגש:
1. חובת הזהירות של המעביד (סעיפים 35-36 לפקודת הנזיקין)
2. הפרת תקנות הבטיחות בעבודה
3. הפרת חובה חקוקה — פקודת הבטיחות בעבודה [נוסח חדש]
4. אחריות שילוחית של המעביד (סעיף 13)
5. ציין ניכוי גמלאות ביטוח לאומי (סעיף 82 לחוק הביטוח הלאומי)
`.trim(),

  product_liability: `
תנסח תביעה מכוח חוק האחריות למוצרים פגומים, תש"ם-1980.
הדגש:
1. זיהוי המוצר הפגום והיצרן/יבואן
2. הפגם במוצר (תכנון, ייצור, אזהרה)
3. הנזק שנגרם משימוש רגיל במוצר
4. אחריות מוחלטת — אין צורך בהוכחת רשלנות
`.trim(),

  property_damage: `
תנסח תביעת נזק רכוש מכוח פקודת הנזיקין.
הדגש:
1. תיאור הנזק לרכוש
2. שווי הרכוש שניזוק / עלות תיקון
3. נזקים תוצאתיים (אובדן שימוש, הכנסה)
4. חובת הזהירות של הנתבע כלפי רכוש התובע
`.trim(),

  other: `
תנסח תביעת נזיקין כללית בהתאם לנסיבות המקרה.
הדגש:
1. זיהוי העוולה הרלוונטית מתוך פקודת הנזיקין
2. יסודות העוולה: חובה, הפרה, קשר סיבתי, נזק
3. ראשי הנזק הרלוונטיים
4. סעיפי חוק ספציפיים
`.trim(),
};

// ============================================================================
// 3. buildClaimPrompt - בניית הפרומפט המורכב
// ============================================================================

export interface ClaimPromptInput {
  claimData: TortClaim | Omit<TortClaim, 'id'>;
  attachmentTexts?: AttachmentAnalysis[];
}

export interface AttachmentAnalysis {
  filename: string;
  type: 'medical_opinion' | 'police_report' | 'receipt' | 'other';
  summary: string;
  extractedData?: {
    disabilityPercentage?: number;
    diagnosis?: string;
    treatmentRecommendations?: string;
    functionalLimitations?: string;
  };
}

export interface ClaimPrompt {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Builds a complete prompt for claim draft generation.
 * Combines: base system prompt + claim-type-specific prompt + structured claim data.
 */
export function buildClaimPrompt({ claimData, attachmentTexts }: ClaimPromptInput): ClaimPrompt {
  const d = claimData;
  const total = calculateTotalDamages(d.damage_heads);
  const statute = calculateStatuteOfLimitations(d.claim_type, d.incident_date);
  const typePrompt = CLAIM_TYPE_PROMPTS[d.claim_type] || CLAIM_TYPE_PROMPTS.other;

  // Court and page limits
  const courtLabel = d.court_type === 'district' ? 'בית המשפט המחוזי' : 'בית משפט השלום';
  const maxPages = d.court_type === 'district' ? 30 : 20;

  // System prompt = base + claim-type specific
  const systemPrompt = `${BASE_SYSTEM_PROMPT}

--- הנחיות ייחודיות לסוג התביעה ---
${typePrompt}

--- מבנה המסמך הנדרש ---
חלק ראשון: כותרת בית המשפט, פרטי הצדדים
חלק שני: תמצית טענות התביעה (עד עמוד אחד)
חלק שלישי: פירוט העובדות, יסודות העוולה, ראשי הנזק, הטיעונים המשפטיים, הסעד המבוקש

מגבלת עמודים: עד ${maxPages} עמודים (${courtLabel})

--- פורמט פלט ---
החזר JSON עם המבנה:
{
  "part1_header": "כותרת בית המשפט ופרטי הצדדים (כטקסט מעוצב)",
  "part2_summary": "תמצית טענות התביעה",
  "part3_details": "פירוט מלא: עובדות, יסודות עוולה, נזקים, טיעונים, סעד",
  "full_draft": "כתב התביעה המלא כמסמך אחד",
  "causes_of_action": ["עילה 1", "עילה 2"],
  "relevant_laws": ["חוק 1", "חוק 2"],
  "metadata": {
    "estimated_pages": 10,
    "court_fee_estimate": "סכום אגרה משוער"
  }
}
אל תכלול טקסט מחוץ ל-JSON.`;

  // Build user prompt with all structured data
  const defendantsStr = d.defendants.map((def, i) =>
    `נתבע ${i + 1}: ${def.name} (${DEFENDANT_TYPE_LABELS[def.type]})${def.role ? ` — ${def.role}` : ''}${def.idNumber ? `, ת.ז./ח.פ. ${def.idNumber}` : ''}, מען: ${def.address}${def.city ? ', ' + def.city : ''}${def.insurerName ? `, מבטח: ${def.insurerName}` : ''}${def.attorney ? `, ב"כ: ${def.attorney}` : ''}`
  ).join('\n');

  const damageHeadsStr = d.damage_heads
    .filter(h => h.amount_estimated > 0)
    .map(h => `- ${DAMAGE_TYPE_LABELS[h.type]}: ${h.amount_estimated.toLocaleString('he-IL')} ₪${h.description ? ` (${h.description})` : ''}${h.evidence_reference ? ` [אסמכתא: ${h.evidence_reference}]` : ''}`)
    .join('\n');

  const tortElementsStr = [
    d.tort_elements.duty_of_care ? `חובת זהירות: ${d.tort_elements.duty_of_care}` : '',
    d.tort_elements.breach_description ? `הפרת החובה: ${d.tort_elements.breach_description}` : '',
    d.tort_elements.causation ? `קשר סיבתי: ${d.tort_elements.causation}` : '',
    d.tort_elements.damages_description ? `תיאור הנזק: ${d.tort_elements.damages_description}` : '',
    d.tort_elements.contributing_negligence ? `אשם תורם: ${d.tort_elements.contributing_negligence}` : '',
  ].filter(Boolean).join('\n');

  let specialFields = '';

  // Road accident
  if (d.claim_type === 'road_accident') {
    const parts: string[] = [];
    if (d.vehicle_details?.license_plate) parts.push(`מספר רישוי: ${d.vehicle_details.license_plate}`);
    if (d.vehicle_details?.make) parts.push(`רכב: ${d.vehicle_details.make} ${d.vehicle_details.model} ${d.vehicle_details.year}`);
    if (d.insurance_policy_number) parts.push(`פוליסת ביטוח: ${d.insurance_policy_number}`);
    if (d.police_report_number) parts.push(`דו"ח משטרה: ${d.police_report_number}`);
    if (d.is_karnitah) parts.push('התביעה מוגשת לקרנית (נפגע ללא ביטוח)');
    if (parts.length > 0) specialFields = `\n--- פרטי תאונת דרכים ---\n${parts.join('\n')}`;
  }

  // Medical malpractice
  if (d.claim_type === 'medical_malpractice') {
    const parts: string[] = [];
    if (d.medical_facility) parts.push(`מוסד רפואי: ${d.medical_facility}`);
    if (d.treating_physician) parts.push(`רופא מטפל: ${d.treating_physician}`);
    if (d.treatment_dates?.start) parts.push(`תקופת טיפול: ${d.treatment_dates.start} עד ${d.treatment_dates.end || 'נמשך'}`);
    if (d.medical_expert_opinion) parts.push('קיימת חוות דעת מומחה רפואי');
    if (d.waiver_of_medical_confidentiality) parts.push('נחתם כתב ויתור על סודיות רפואית');
    if (parts.length > 0) specialFields = `\n--- פרטי רשלנות רפואית ---\n${parts.join('\n')}`;
  }

  // Attachment summaries
  let attachmentSection = '';
  if (attachmentTexts && attachmentTexts.length > 0) {
    attachmentSection = '\n--- מסמכים מצורפים ---\n' +
      attachmentTexts.map(a =>
        `[${a.filename}] (${a.type}): ${a.summary}${
          a.extractedData?.disabilityPercentage ? `\nנכות: ${a.extractedData.disabilityPercentage}%` : ''
        }${
          a.extractedData?.diagnosis ? `\nאבחנה: ${a.extractedData.diagnosis}` : ''
        }${
          a.extractedData?.functionalLimitations ? `\nהגבלות: ${a.extractedData.functionalLimitations}` : ''
        }`
      ).join('\n\n');
  }

  const userPrompt = `נסח כתב תביעה מלא עם הנתונים הבאים:

--- סיווג ---
סוג תביעה: ${CLAIM_TYPE_LABELS[d.claim_type]}
בית משפט: ${d.court_name} (${courtLabel})
תאריך אירוע: ${d.incident_date ? new Date(d.incident_date).toLocaleDateString('he-IL') : 'לא צוין'}
${statute ? `מועד התיישנות: ${new Date(statute.deadline).toLocaleDateString('he-IL')} (${statute.label})` : ''}

--- התובע ---
שם: ${d.plaintiff_name}
ת.ז.: ${d.plaintiff_id}
כתובת: ${d.plaintiff_address}${d.plaintiff_city ? ', ' + d.plaintiff_city : ''}
טלפון: ${d.plaintiff_contact.phone || 'לא צוין'}
${d.plaintiff_attorney ? `ב"כ התובע: ${d.plaintiff_attorney}` : ''}

--- הנתבעים ---
${defendantsStr || 'לא צוינו נתבעים'}
${d.defendant_insurer ? `מבטח עיקרי: ${d.defendant_insurer}` : ''}

--- תיאור האירוע ---
מיקום: ${d.incident_location || 'לא צוין'}
${d.incident_description}
${specialFields}

${tortElementsStr ? `--- יסודות העוולה (כפי שנמסרו) ---\n${tortElementsStr}` : ''}

--- ראשי נזק ---
${damageHeadsStr || 'לא פורטו ראשי נזק'}
סה"כ סכום תביעה: ${total.toLocaleString('he-IL')} ₪

${d.legal_arguments ? `--- טיעונים שנמסרו ---\n${d.legal_arguments}` : ''}

${d.causes_of_action.length > 0 ? `--- עילות שנבחרו ---\n${d.causes_of_action.join('\n')}` : ''}

${d.relevant_laws.length > 0 ? `--- חקיקה שנבחרה ---\n${d.relevant_laws.join('\n')}` : ''}

${d.requested_remedies ? `--- סעד מבוקש ---\n${d.requested_remedies}` : ''}
${attachmentSection}

הנחיות:
1. נסח כתב תביעה מלא ומקצועי לפי המבנה שהוגדר
2. השתמש רק במידע שסופק — אל תמציא עובדות
3. מספר את הסעיפים ברצף
4. פרט כל ראש נזק בסעיף נפרד עם הסכום
5. סיים בסעד המבוקש ובחתימה`.trim();

  return { systemPrompt, userPrompt };
}

// ============================================================================
// 4. generateClaimDraft - קריאה ל-Claude ליצירת טיוטת כתב תביעה
// ============================================================================

export interface ClaimDraftResult {
  success: boolean;
  draft?: string;
  sections?: {
    part1_header: string;
    part2_summary: string;
    part3_details: string;
  };
  causes_of_action?: string[];
  relevant_laws?: string[];
  metadata?: {
    estimated_pages?: number;
    court_fee_estimate?: string;
  };
  model?: string;
  error?: string;
}

/**
 * Generates a full claim draft by calling AI.
 * Priority: 1) Supabase Edge Function (if reachable), 2) Local AI proxy, 3) Mock.
 */
export async function generateClaimDraft(
  claimData: TortClaim | Omit<TortClaim, 'id'>,
  attachmentTexts?: AttachmentAnalysis[]
): Promise<ClaimDraftResult> {
  console.log('[nizkin] generateClaimDraft called');
  const { systemPrompt, userPrompt } = buildClaimPrompt({ claimData, attachmentTexts });

  // Try Supabase Edge Function first — only if Supabase is actually reachable
  const sbReachable = await isSupabaseReachable();
  console.log('[nizkin] Supabase reachable:', sbReachable);

  if (sbReachable && supabase) {
    try {
      console.log('[nizkin] Trying Supabase Edge Function...');
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const response = await supabase.functions.invoke('generate-claim-draft', {
          body: { systemPrompt, userPrompt },
        });
        if (!response.error && response.data?.success) {
          console.log('[nizkin] Draft generated via Supabase');
          const result = response.data;
          return {
            success: true,
            draft: result.data?.full_draft || '',
            sections: {
              part1_header: result.data?.part1_header || '',
              part2_summary: result.data?.part2_summary || '',
              part3_details: result.data?.part3_details || '',
            },
            causes_of_action: result.data?.causes_of_action || [],
            relevant_laws: result.data?.relevant_laws || [],
            metadata: result.data?.metadata,
            model: result.model,
          };
        }
      } else {
        console.log('[nizkin] No Supabase session, skipping Edge Function');
      }
    } catch (e) {
      console.warn('[nizkin] Supabase Edge Function failed:', e);
    }
  }

  // Try local AI proxy (with 3 minute timeout for Gemini thinking model)
  console.log('[nizkin] Checking AI proxy availability...');
  const proxyOk = await isProxyAvailable();
  console.log('[nizkin] Proxy available:', proxyOk);

  if (proxyOk) {
    try {
      console.log('[nizkin] Generating draft via AI proxy (this may take 1-2 minutes)...');
      const res = await fetch(`${AI_PROXY_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          max_tokens: 8192,
        }),
        signal: AbortSignal.timeout(180_000),
      });
      const result = await res.json();
      if (result.success && result.text) {
        console.log('[nizkin] Draft generated successfully via proxy, length:', result.text.length);
        return parseAIDraftResponse(result.text, result.model, claimData);
      }
      console.warn('[nizkin] Proxy returned error:', result.error);
    } catch (e) {
      console.warn('[nizkin] AI proxy call failed:', e);
    }
  }

  // Mock mode fallback
  console.log('[nizkin] Using mock draft (no AI available)');
  await new Promise(r => setTimeout(r, 1500));
  return getMockDraft(claimData);
}

/** Parse Claude's JSON response into our ClaimDraftResult */
function parseAIDraftResponse(
  text: string,
  model: string,
  claimData: TortClaim | Omit<TortClaim, 'id'>
): ClaimDraftResult {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        draft: parsed.full_draft || text,
        sections: {
          part1_header: parsed.part1_header || '',
          part2_summary: parsed.part2_summary || '',
          part3_details: parsed.part3_details || '',
        },
        causes_of_action: parsed.causes_of_action || [],
        relevant_laws: parsed.relevant_laws || [],
        metadata: parsed.metadata,
        model,
      };
    }
  } catch { /* not JSON, use as plain text */ }

  // If not valid JSON, use the whole text as the draft
  return {
    success: true,
    draft: text,
    sections: { part1_header: '', part2_summary: '', part3_details: text },
    causes_of_action: claimData.causes_of_action || [],
    relevant_laws: claimData.relevant_laws || [],
    model,
  };
}

// ============================================================================
// 5. analyzeAttachment - ניתוח מסמך מצורף (חוות דעת רפואית / PDF)
// ============================================================================

export interface AttachmentAnalysisResult {
  success: boolean;
  analysis?: AttachmentAnalysis;
  error?: string;
}

/**
 * Analyzes an attachment (PDF/image) by calling Claude.
 * Priority: 1) Supabase Edge Function, 2) Local AI proxy, 3) Mock.
 */
export async function analyzeAttachment(
  file: File,
  attachmentType: AttachmentAnalysis['type'] = 'medical_opinion'
): Promise<AttachmentAnalysisResult> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const mediaType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png');

  const systemPrompt = `אתה מומחה בניתוח מסמכים רפואיים ומשפטיים.
חלץ מהמסמך הבא את המידע הבא (אם קיים):
- אחוזי נכות (disabilityPercentage)
- אבחנה (diagnosis)
- המלצות טיפול (treatmentRecommendations)
- הגבלות תפקודיות (functionalLimitations)
- סיכום כללי (summary)

החזר JSON בלבד:
{
  "summary": "סיכום קצר של המסמך",
  "disabilityPercentage": null,
  "diagnosis": "",
  "treatmentRecommendations": "",
  "functionalLimitations": ""
}`;

  // Try Supabase Edge Function — only if reachable
  const sbReachable = await isSupabaseReachable();
  if (sbReachable && supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('[nizkin] Analyzing attachment via Supabase Edge Function...');
        const response = await supabase.functions.invoke('analyze-attachment', {
          body: { file_base64: base64, media_type: mediaType, system_prompt: systemPrompt, attachment_type: attachmentType },
        });
        if (!response.error && response.data?.success) {
          const extracted = response.data.data || {};
          return buildAnalysisResult(file.name, attachmentType, extracted);
        }
      }
    } catch (e) {
      console.warn('[nizkin] Supabase attachment analysis failed:', e);
    }
  }

  // Try local AI proxy (with 2 minute timeout)
  console.log('[nizkin] Checking proxy for attachment analysis...');
  if (await isProxyAvailable()) {
    try {
      console.log('[nizkin] Analyzing attachment via AI proxy...');
      const res = await fetch(`${AI_PROXY_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_base64: base64, media_type: mediaType, system_prompt: systemPrompt, attachment_type: attachmentType }),
        signal: AbortSignal.timeout(120_000),
      });
      const result = await res.json();
      if (result.success) {
        console.log('[nizkin] Attachment analyzed successfully via proxy');
        return buildAnalysisResult(file.name, attachmentType, result.data || {});
      }
      console.warn('[nizkin] Proxy analysis returned error:', result.error);
    } catch (e) {
      console.warn('[nizkin] AI proxy analysis failed:', e);
    }
  }

  // Mock mode fallback
  await new Promise(r => setTimeout(r, 1500));
  return {
    success: true,
    analysis: {
      filename: file.name,
      type: attachmentType,
      summary: 'חוות דעת רפואית: נקבעה נכות צמיתה. המומחה ממליץ על המשך מעקב רפואי.',
      extractedData: {
        disabilityPercentage: 15,
        diagnosis: 'פגיעה אורתופדית בעמוד השדרה הצווארי',
        treatmentRecommendations: 'פיזיותרפיה, מעקב נוירולוגי',
        functionalLimitations: 'הגבלה בטווחי תנועה, קושי בישיבה ממושכת',
      },
    },
  };
}

function buildAnalysisResult(
  filename: string,
  type: AttachmentAnalysis['type'],
  extracted: any
): AttachmentAnalysisResult {
  return {
    success: true,
    analysis: {
      filename,
      type,
      summary: extracted.summary || 'לא ניתן לחלץ סיכום',
      extractedData: {
        disabilityPercentage: extracted.disabilityPercentage ?? undefined,
        diagnosis: extracted.diagnosis || undefined,
        treatmentRecommendations: extracted.treatmentRecommendations || undefined,
        functionalLimitations: extracted.functionalLimitations || undefined,
      },
    },
  };
}

// ============================================================================
// 6. AI Guide Agent — conversational assistant for the wizard
// ============================================================================

export interface GuideMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Sends a message to the AI guide agent and returns the response.
 * The guide helps users fill out the tort claim form step by step.
 */
export async function sendGuideMessage(
  messages: GuideMessage[],
  claimData?: Partial<TortClaim>,
  currentStep?: string,
): Promise<{ success: boolean; text: string; error?: string }> {
  // Try local AI proxy (with 60s timeout)
  if (await isProxyAvailable()) {
    try {
      const res = await fetch(`${AI_PROXY_URL}/api/guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, claimData, currentStep }),
        signal: AbortSignal.timeout(60_000),
      });
      const result = await res.json();
      if (result.success) return { success: true, text: result.text };
      return { success: false, text: '', error: result.error };
    } catch (e: any) {
      console.warn('[nizkin] AI guide proxy failed:', e.message);
      // Fall through to mock
    }
  }

  // Mock guide response
  return {
    success: true,
    text: getMockGuideResponse(messages, currentStep),
  };
}

function getMockGuideResponse(messages: GuideMessage[], currentStep?: string): string {
  const lastMsg = messages[messages.length - 1]?.content || '';

  const stepHints: Record<string, string> = {
    classification: `**סיווג התביעה**

כדי להתחיל, בחר את סוג התביעה המתאים:
- **רשלנות כללית** — החלקה, נפילה, נזק מרכוש
- **תאונת דרכים** — תביעה לפי חוק הפלת"ד
- **רשלנות רפואית** — טעות בטיפול, אבחון שגוי

ציין גם את **תאריך האירוע** ואת **בית המשפט** המתאים.`,

    plaintiff: `**פרטי התובע**

מלא את שם התובע ומספר ת.ז. אם התובע קטין (מתחת ל-18 בתאריך האירוע), המערכת תחשב התיישנות מגיל 18.`,

    defendants: `**הנתבעים**

הוסף לפחות נתבע אחד. לכל נתבע ציין:
- שם מלא / שם חברה
- ח.פ./ת.ז.
- כתובת
- תפקיד (בעלים, מפעיל, מעביד...)`,

    incident: `**פרטי האירוע**

תאר את האירוע בפירוט:
- מה קרה?
- היכן?
- מי היה מעורב?
- מה הנזק שנגרם?

ככל שהתיאור מפורט יותר, כתב התביעה יהיה טוב יותר.`,

    damages: `**ראשי נזק**

הוסף ראשי נזק רלוונטיים:
- **כאב וסבל** — פיצוי לא ממוני
- **הוצאות רפואיות** — עבר ועתיד
- **אובדן השתכרות** — הפסד שכר
- **עזרת צד ג'** — עזרה בבית

הזן סכומים משוערים. אם לא בטוח, אני יכול לעזור עם הערכות.`,
  };

  if (currentStep && stepHints[currentStep]) {
    return stepHints[currentStep];
  }

  if (lastMsg.includes('עזר') || lastMsg.includes('מה')) {
    return 'אני כאן לעזור! ספר לי על האירוע ואציע לך את סוג התביעה המתאים, ראשי הנזק הרלוונטיים, ואעזור בניסוח הטיעונים המשפטיים.';
  }

  return `קיבלתי. כדי לתת לך הנחיה מדויקת, אני צריך לדעת באיזה שלב אתה בטופס. הפרוקסי AI לא פעיל כרגע — הפעל אותו עם:

\`GEMINI_API_KEY=AIza... bun run scripts/ai-proxy.ts\``;
}


// ============================================================================
// 7. AI Interview — proactive question-asking to fill missing fields
// ============================================================================

export interface InterviewFieldSuggestion {
  field: string;          // e.g. 'plaintiff_name', 'tort_elements.duty_of_care'
  value: string;          // suggested value
  label: string;          // human-readable field name in Hebrew
}

export interface InterviewResponse {
  success: boolean;
  message: string;        // AI's conversational message (question + context)
  suggestions: InterviewFieldSuggestion[];  // field updates to apply
  error?: string;
}

const INTERVIEW_SYSTEM_PROMPT = `אתה עוזר משפטי מומחה בנזיקין ישראלי. תפקידך לראיין את המשתמש כדי למלא כתב תביעה.

# כללים:
1. קרא את נתוני התביעה הנוכחיים ובדוק מה חסר
2. שאל שאלה אחת ממוקדת בכל פעם — על השדה החסר הכי חשוב
3. אם המשתמש ענה על שאלה קודמת — חלץ מהתשובה את הנתונים הרלוונטיים
4. דבר בעברית פשוטה וברורה
5. הצע ניסוחים משפטיים מקצועיים
6. אל תמציא עובדות — עבוד רק עם מה שנמסר

# סדר עדיפויות למילוי:
1. סוג התביעה + תאריך אירוע (הכי דחוף — משפיע על התיישנות)
2. פרטי התובע (שם, ת.ז., כתובת)
3. נתבעים (שם, סוג, כתובת, תפקיד)
4. תיאור האירוע (מה קרה, איפה, מי מעורב)
5. יסודות העוולה (חובת זהירות, הפרה, קשר סיבתי, נזק)
6. ראשי נזק וסכומים
7. טיעונים משפטיים ועילות תביעה

# פורמט תשובה (JSON בלבד):
{
  "message": "ההודעה שלך למשתמש (שאלה, הסבר, אישור)",
  "suggestions": [
    { "field": "שם_שדה", "value": "ערך", "label": "תיאור השדה בעברית" }
  ]
}

# שדות אפשריים:
- claim_type: סוג תביעה (general_negligence|road_accident|medical_malpractice|work_accident|product_liability|defamation|assault|professional_malpractice|property_damage|other)
- incident_date: תאריך (YYYY-MM-DD)
- court_type: סוג בית משפט (magistrate|district)
- court_name: שם בית המשפט
- plaintiff_name: שם התובע
- plaintiff_id: ת.ז.
- plaintiff_address: כתובת
- plaintiff_city: עיר
- plaintiff_phone: טלפון
- plaintiff_attorney: עו"ד מייצג
- incident_location: מיקום האירוע
- incident_description: תיאור האירוע
- tort_elements.duty_of_care: חובת זהירות
- tort_elements.breach_description: הפרת החובה
- tort_elements.causation: קשר סיבתי
- tort_elements.damages_description: תיאור הנזק
- legal_arguments: טיעונים משפטיים
- requested_remedies: סעד מבוקש
- defendant: {name, type, address, city, role, idNumber} (להוספת נתבע)

אל תכלול טקסט מחוץ ל-JSON.`.trim();

/**
 * Builds a prompt with current claim state for the interview AI.
 */
function buildInterviewContext(claimData: Partial<TortClaim>): string {
  const d = claimData;
  const filled: string[] = [];
  const missing: string[] = [];

  // Check what's filled and what's missing
  if (d.claim_type && d.claim_type !== 'general_negligence') filled.push(`סוג תביעה: ${CLAIM_TYPE_LABELS[d.claim_type] || d.claim_type}`);
  else missing.push('סוג תביעה');

  if (d.incident_date) filled.push(`תאריך: ${d.incident_date}`);
  else missing.push('תאריך אירוע');

  if (d.court_name) filled.push(`בית משפט: ${d.court_name}`);
  else missing.push('בית משפט');

  if (d.plaintiff_name) filled.push(`תובע: ${d.plaintiff_name}`);
  else missing.push('שם התובע');

  if (d.plaintiff_id) filled.push(`ת.ז.: ${d.plaintiff_id}`);
  else missing.push('ת.ז. תובע');

  if (d.defendants && d.defendants.length > 0) {
    filled.push(`נתבעים: ${d.defendants.map(def => def.name).join(', ')}`);
  } else {
    missing.push('נתבעים');
  }

  if (d.incident_description && d.incident_description.length > 10) {
    filled.push(`תיאור אירוע: ${d.incident_description.substring(0, 100)}...`);
  } else {
    missing.push('תיאור האירוע');
  }

  if (d.tort_elements?.duty_of_care) filled.push('חובת זהירות: מולא');
  else missing.push('חובת זהירות');

  if (d.tort_elements?.breach_description) filled.push('הפרת חובה: מולא');
  else missing.push('הפרת חובה');

  if (d.tort_elements?.causation) filled.push('קשר סיבתי: מולא');
  else missing.push('קשר סיבתי');

  if (d.damage_heads && d.damage_heads.length > 0 && d.damage_heads.some(h => h.amount_estimated > 0)) {
    const total = d.damage_heads.reduce((s, h) => s + (h.amount_estimated || 0), 0);
    filled.push(`ראשי נזק: ${d.damage_heads.length} פריטים, סה"כ ${total.toLocaleString('he-IL')} ₪`);
  } else {
    missing.push('ראשי נזק');
  }

  if (d.legal_arguments && d.legal_arguments.length > 10) filled.push('טיעונים משפטיים: מולא');
  else missing.push('טיעונים משפטיים');

  return `--- מצב נוכחי ---
מולא: ${filled.length > 0 ? filled.join(' | ') : 'ריק'}
חסר: ${missing.length > 0 ? missing.join(', ') : 'הכל מלא!'}`;
}

/**
 * Send an interview message — AI asks questions and suggests field values.
 */
export async function sendInterviewMessage(
  messages: GuideMessage[],
  claimData: Partial<TortClaim>,
): Promise<InterviewResponse> {
  const context = buildInterviewContext(claimData);
  const fullSystem = `${INTERVIEW_SYSTEM_PROMPT}\n\n${context}`;

  // Try local AI proxy
  if (await isProxyAvailable()) {
    try {
      const res = await fetch(`${AI_PROXY_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: fullSystem,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          max_tokens: 1500,
        }),
        signal: AbortSignal.timeout(60_000),
      });
      const result = await res.json();
      if (result.success && result.text) {
        return parseInterviewResponse(result.text);
      }
      return { success: false, message: '', suggestions: [], error: result.error };
    } catch (e: any) {
      console.warn('[nizkin] Interview AI call failed:', e.message);
    }
  }

  // Mock fallback — return a contextual question based on what's missing
  return getMockInterviewResponse(claimData, messages);
}

function parseInterviewResponse(text: string): InterviewResponse {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        message: parsed.message || text,
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      };
    }
  } catch { /* not JSON */ }

  // If not JSON, treat the whole text as a message with no suggestions
  return { success: true, message: text, suggestions: [] };
}

function getMockInterviewResponse(
  claimData: Partial<TortClaim>,
  messages: GuideMessage[]
): InterviewResponse {
  const d = claimData;
  const isFirst = messages.length <= 1;

  if (isFirst) {
    // First message - analyze and ask the most important missing field
    if (!d.claim_type || d.claim_type === 'general_negligence') {
      return {
        success: true,
        message: 'שלום! אני אעזור לך למלא את כתב התביעה.\n\nבוא נתחיל — **מה סוג האירוע?**\nלמשל: תאונת דרכים, רשלנות רפואית, תאונת עבודה, החלקה/נפילה, תקיפה, וכד\'.',
        suggestions: [],
      };
    }
    if (!d.incident_date) {
      return {
        success: true,
        message: `הבנתי, ${CLAIM_TYPE_LABELS[d.claim_type]}.\n\n**מתי אירע האירוע?** (תאריך מדויק אם יש, או חודש ושנה)`,
        suggestions: [],
      };
    }
    if (!d.plaintiff_name) {
      return {
        success: true,
        message: '**מי התובע?** מה שמו המלא ומספר תעודת הזהות?',
        suggestions: [],
      };
    }
    if (!d.defendants || d.defendants.length === 0) {
      return {
        success: true,
        message: '**מי הנתבע/ים?** ציין את שמם המלא, סוג (אדם פרטי/חברה/גוף ציבורי), ותפקידם באירוע.',
        suggestions: [],
      };
    }
    if (!d.incident_description || d.incident_description.length < 20) {
      return {
        success: true,
        message: '**תאר את האירוע** — מה קרה? היכן? מתי? מי היה מעורב? מה הנזק?\nככל שתפרט יותר, כתב התביעה יהיה מדויק יותר.',
        suggestions: [],
      };
    }
  }

  // Default — ask about tort elements
  return {
    success: true,
    message: 'קיבלתי. עכשיו בוא נעבור ליסודות העוולה:\n\n**מהי חובת הזהירות** שהייתה מוטלת על הנתבע? כלומר, מה הוא היה צריך לעשות כדי למנוע את הנזק?',
    suggestions: [],
  };
}

// ============================================================================
// Mock data for offline/development mode
// ============================================================================

function getMockDraft(claimData: TortClaim | Omit<TortClaim, 'id'>): ClaimDraftResult {
  const d = claimData;
  const total = calculateTotalDamages(d.damage_heads);
  const formatAmount = (n: number) => n.toLocaleString('he-IL') + ' ₪';
  const dateStr = d.incident_date ? new Date(d.incident_date).toLocaleDateString('he-IL') : '____';

  const defendantNames = d.defendants.map(def => def.name).join(' ו-') || '____';

  const part1 = `בפני
${d.court_name}

כתב תביעה

התובע: ${d.plaintiff_name}, ת.ז. ${d.plaintiff_id}
מען: ${d.plaintiff_address}${d.plaintiff_city ? ', ' + d.plaintiff_city : ''}
${d.plaintiff_attorney ? `ע"י ב"כ עו"ד ${d.plaintiff_attorney}` : ''}

- נגד -

${d.defendants.map((def, i) => `נתבע ${i + 1}: ${def.name}${def.idNumber ? `, ת.ז./ח.פ. ${def.idNumber}` : ''}\nמען: ${def.address}${def.city ? ', ' + def.city : ''}`).join('\n\n')}`;

  const part2 = `תמצית טענות התביעה

1. עניינה של תביעה זו בנזקי גוף שנגרמו לתובע ביום ${dateStr} עקב ${CLAIM_TYPE_LABELS[d.claim_type]} שאירעה ב${d.incident_location || '____'}.

2. התובע טוען כי הנתבע/ים ${defendantNames} התרשל/ו בחובת הזהירות המוטלת עליהם וגרמו לתובע נזקי גוף ונזקים כספיים בסך כולל של ${formatAmount(total)}.

3. התובע עותר לחיוב הנתבע/ים בפיצוי מלא בגין נזקיו כמפורט להלן.`;

  const part3Lines: string[] = [
    'פירוט העובדות והטיעונים',
    '',
    'א. עובדות התביעה',
    '',
    `1. התובע, ${d.plaintiff_name}, ת.ז. ${d.plaintiff_id}, הינו תושב ${d.plaintiff_city || '____'}.`,
    '',
    `2. ביום ${dateStr}${d.incident_location ? `, ב${d.incident_location}` : ''}, אירע האירוע נשוא תביעה זו:`,
    '',
    ...d.incident_description.split('\n').filter(l => l.trim()).map((l, i) => `${i + 3}. ${l}`),
  ];

  if (d.tort_elements.duty_of_care) {
    part3Lines.push('', 'ב. יסודות העוולה', '');
    part3Lines.push(`חובת הזהירות: ${d.tort_elements.duty_of_care}`);
    if (d.tort_elements.breach_description) part3Lines.push(`הפרת החובה: ${d.tort_elements.breach_description}`);
    if (d.tort_elements.causation) part3Lines.push(`קשר סיבתי: ${d.tort_elements.causation}`);
  }

  part3Lines.push('', 'ג. ראשי הנזק', '');
  d.damage_heads.filter(h => h.amount_estimated > 0).forEach(h => {
    part3Lines.push(`${DAMAGE_TYPE_LABELS[h.type]}: ${formatAmount(h.amount_estimated)}${h.description ? ` — ${h.description}` : ''}`);
  });
  part3Lines.push(``, `סה"כ סכום התביעה: ${formatAmount(total)}`);

  part3Lines.push('', 'ד. הסעד המבוקש', '');
  part3Lines.push(d.requested_remedies || `לאור כל האמור לעיל, מתבקש בית המשפט הנכבד לחייב את הנתבע/ים לשלם לתובע סך של ${formatAmount(total)} בצירוף הפרשי הצמדה וריבית כחוק מיום הגשת התביעה ועד לתשלום המלא בפועל, וכן הוצאות משפט ושכר טרחת עו"ד.`);

  const part3 = part3Lines.join('\n');

  return {
    success: true,
    draft: `${part1}\n\n${part2}\n\n${part3}\n\nבכבוד רב,\n\n____________________\nב"כ התובע\nתאריך: ${new Date().toLocaleDateString('he-IL')}`,
    sections: { part1_header: part1, part2_summary: part2, part3_details: part3 },
    causes_of_action: d.causes_of_action.length > 0 ? d.causes_of_action : [
      'עוולת הרשלנות (סעיפים 35-36 לפקודת הנזיקין)',
      'הפרת חובה חקוקה (סעיף 63 לפקודת הנזיקין)',
    ],
    relevant_laws: d.relevant_laws.length > 0 ? d.relevant_laws : [
      'פקודת הנזיקין [נוסח חדש]',
    ],
    metadata: { estimated_pages: 8, court_fee_estimate: '1,521 ₪' },
    model: 'mock',
  };
}
