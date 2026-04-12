// Enhanced Document Generator for Nizkin tort claims
// Generates formal legal DOCX + PDF per תקנות סדר הדין האזרחי, התשע"ט-2018
// Formatting: David 12pt, 1.5 line spacing, 2.5cm margins, RTL, page headers

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  AlignmentType,
  TabStopPosition,
  TabStopType,
  convertMillimetersToTwip,
  PageNumber,
  NumberFormat,
  LineRuleType,
} from 'docx';
import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';
import DOMPurify from 'dompurify';
import type { TortClaim } from '../tortClaimTypes';
import { CLAIM_TYPE_LABELS, DAMAGE_TYPE_LABELS, DEFENDANT_TYPE_LABELS } from '../tortClaimTypes';
import { calculateTotalDamages, calculateStatuteOfLimitations } from './questionnaire-engine';

// ============ Constants ============

const FONT = 'David';
const FONT_SIZE = 24; // 12pt in half-points
const HEADING_SIZE = 28; // 14pt
const TITLE_SIZE = 36; // 18pt
const LINE_SPACING = 360; // 1.5 line spacing (240 * 1.5)
const MARGIN_MM = 25; // 2.5cm

const bidi = { bidirectional: true };

// Page limits per court type
const PAGE_LIMITS = {
  magistrate: { header: 2, body: 9, total: 11 },
  district: { header: 5, body: 25, total: 30 },
};

// ============ Helper functions ============

const rtl = (text: string, opts: Record<string, any> = {}) =>
  new TextRun({ text, rightToLeft: true, font: FONT, size: FONT_SIZE, ...opts });

const bold = (text: string, opts: Record<string, any> = {}) =>
  rtl(text, { bold: true, ...opts });

const heading = (text: string) =>
  new Paragraph({
    ...bidi,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 300, after: 150, line: LINE_SPACING, lineRule: LineRuleType.AUTO },
    children: [bold(text, { size: HEADING_SIZE, underline: {} })],
  });

const para = (text: string, opts: { after?: number; indent?: number; bold?: boolean } = {}) =>
  new Paragraph({
    ...bidi,
    alignment: AlignmentType.RIGHT,
    spacing: { after: opts.after ?? 80, line: LINE_SPACING, lineRule: LineRuleType.AUTO },
    indent: opts.indent ? { firstLine: convertMillimetersToTwip(opts.indent) } : undefined,
    children: [opts.bold ? bold(text) : rtl(text)],
  });

const centerPara = (text: string, opts: Record<string, any> = {}) =>
  new Paragraph({
    ...bidi,
    alignment: AlignmentType.CENTER,
    spacing: { after: 80, line: LINE_SPACING, lineRule: LineRuleType.AUTO },
    children: [rtl(text, opts)],
  });

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n) + ' ₪';

const formatDate = (d: string | undefined) =>
  d ? new Date(d).toLocaleDateString('he-IL') : '____';

const emptyLine = () =>
  new Paragraph({ spacing: { after: 80 }, children: [] });

// ============ DOCX Generation ============

export async function generateFormalDocx(claim: TortClaim): Promise<Blob> {
  const total = calculateTotalDamages(claim.damage_heads) || claim.total_claim_amount;
  const statute = calculateStatuteOfLimitations(claim.claim_type, claim.incident_date);
  const limits = PAGE_LIMITS[claim.court_type];
  let sectionCounter = 0;

  const nextSection = () => {
    sectionCounter++;
    return sectionCounter;
  };

  // Build document sections
  const content: Paragraph[] = [];

  // ======== PART 1: COURT HEADER + PARTIES ========

  // Court header
  content.push(
    centerPara('בבית המשפט', { bold: true, size: HEADING_SIZE }),
    centerPara(claim.court_name || '____', { bold: true, size: TITLE_SIZE }),
    emptyLine(),
  );

  // Case number placeholder
  content.push(
    centerPara('ת.א. ____/__', { bold: true, size: HEADING_SIZE }),
    emptyLine(),
  );

  // Document title
  content.push(
    centerPara('כתב תביעה', { bold: true, size: TITLE_SIZE }),
    emptyLine(),
  );

  // Claim amount
  content.push(
    centerPara(`סכום התביעה: ${formatCurrency(total)}`, { bold: true }),
    emptyLine(),
  );

  // PLAINTIFF
  content.push(
    para('התובע:', { bold: true }),
    para(`${claim.plaintiff_name}, ת.ז. ${claim.plaintiff_id}`),
    para(`מען: ${claim.plaintiff_address}${claim.plaintiff_city ? ', ' + claim.plaintiff_city : ''}`),
  );
  if (claim.plaintiff_contact.phone) {
    content.push(para(`טלפון: ${claim.plaintiff_contact.phone}`));
  }
  if (claim.plaintiff_attorney) {
    content.push(para(`ע"י ב"כ עו"ד ${claim.plaintiff_attorney}`));
  }

  content.push(
    emptyLine(),
    centerPara('- נגד -', { bold: true }),
    emptyLine(),
  );

  // DEFENDANTS
  claim.defendants.forEach((d, i) => {
    content.push(
      para(`נתבע ${i + 1}: ${d.name}`, { bold: true }),
    );
    if (d.idNumber) content.push(para(`ת.ז./ח.פ.: ${d.idNumber}`));
    content.push(para(`(${DEFENDANT_TYPE_LABELS[d.type]}${d.role ? ' — ' + d.role : ''})`));
    content.push(para(`מען: ${d.address}${d.city ? ', ' + d.city : ''}`));
    if (d.insurerName) content.push(para(`מבוטח ע"י: ${d.insurerName}${d.policyNumber ? ', פוליסה מס\' ' + d.policyNumber : ''}`));
    if (d.attorney) content.push(para(`ע"י ב"כ: ${d.attorney}`));
    if (i < claim.defendants.length - 1) content.push(emptyLine());
  });

  content.push(emptyLine());

  // ======== PART 2: SUMMARY OF CLAIMS (1 page) ========

  content.push(heading('תמצית טענות התביעה'));

  const n = nextSection();
  content.push(para(
    `${n}. עניינה של תביעה זו בנזקים שנגרמו לתובע ביום ${formatDate(claim.incident_date)} ` +
    `עקב ${CLAIM_TYPE_LABELS[claim.claim_type]} ` +
    `${claim.incident_location ? 'ב' + claim.incident_location + ' ' : ''}` +
    `בגינם עותר התובע לחייב את הנתבע/ים בפיצויים בסך ${formatCurrency(total)}.`
  ));

  const n2 = nextSection();
  const defNames = claim.defendants.map(d => d.name).join(' ו-') || '____';
  content.push(para(
    `${n2}. התובע יטען כי הנתבע/ים ${defNames} חבים כלפיו בנזיקין, וכי בשל מעשיהם ו/או מחדליהם נגרמו לתובע נזקי גוף ונזקים כספיים כמפורט להלן.`
  ));

  if (claim.causes_of_action.length > 0) {
    const n3 = nextSection();
    content.push(para(
      `${n3}. התביעה מוגשת מכוח עילות אלה: ${claim.causes_of_action.join('; ')}.`
    ));
  }

  content.push(emptyLine());

  // ======== PART 3: DETAILED FACTS + ARGUMENTS ========

  // A. Facts
  content.push(heading('א. עובדות התביעה'));

  content.push(para(
    `${nextSection()}. סוג התביעה: ${CLAIM_TYPE_LABELS[claim.claim_type]}.`
  ));

  content.push(para(
    `${nextSection()}. ביום ${formatDate(claim.incident_date)}` +
    `${claim.incident_location ? ', ב' + claim.incident_location : ''}, אירע האירוע נשוא תביעה זו.`
  ));

  // Incident description - numbered paragraphs
  const descLines = claim.incident_description.split('\n').filter(l => l.trim());
  descLines.forEach(line => {
    content.push(para(`${nextSection()}. ${line}`));
  });

  // Road accident specific
  if (claim.claim_type === 'road_accident') {
    content.push(emptyLine());
    if (claim.vehicle_details?.license_plate) {
      content.push(para(`${nextSection()}. פרטי הרכב הפוגע: מספר רישוי ${claim.vehicle_details.license_plate}` +
        `${claim.vehicle_details.make ? ', ' + claim.vehicle_details.make + ' ' + claim.vehicle_details.model + ' ' + claim.vehicle_details.year : ''}.`));
    }
    if (claim.insurance_policy_number) {
      content.push(para(`${nextSection()}. פוליסת ביטוח מס': ${claim.insurance_policy_number}.`));
    }
    if (claim.police_report_number) {
      content.push(para(`${nextSection()}. דו"ח משטרה מס': ${claim.police_report_number}.`));
    }
    if (claim.is_karnitah) {
      content.push(para(`${nextSection()}. התביעה מוגשת כנגד קרנית, קרן לפיצוי נפגעי תאונות דרכים, בהתאם לסעיף 12 לחוק הפיצויים לנפגעי תאונות דרכים.`));
    }
  }

  // Medical malpractice specific
  if (claim.claim_type === 'medical_malpractice') {
    content.push(emptyLine());
    if (claim.medical_facility) {
      content.push(para(`${nextSection()}. המוסד הרפואי: ${claim.medical_facility}.`));
    }
    if (claim.treating_physician) {
      content.push(para(`${nextSection()}. הרופא המטפל: ${claim.treating_physician}.`));
    }
    if (claim.treatment_dates?.start) {
      content.push(para(`${nextSection()}. תקופת הטיפול: מיום ${formatDate(claim.treatment_dates.start)} עד ${claim.treatment_dates.end ? formatDate(claim.treatment_dates.end) : 'היום'}.`));
    }
    if (claim.medical_expert_opinion) {
      content.push(para(`${nextSection()}. לכתב תביעה זה מצורפת חוות דעת מומחה רפואי.`));
    }
    if (claim.waiver_of_medical_confidentiality) {
      content.push(para(`${nextSection()}. מצורף כתב ויתור על סודיות רפואית כנדרש.`));
    }
  }

  // B. Tort Elements
  if (claim.tort_elements.duty_of_care || claim.tort_elements.breach_description) {
    content.push(emptyLine(), heading('ב. יסודות העוולה'));

    if (claim.tort_elements.duty_of_care) {
      content.push(
        para(`${nextSection()}. חובת הזהירות:`, { bold: true }),
        para(claim.tort_elements.duty_of_care),
      );
    }
    if (claim.tort_elements.breach_description) {
      content.push(
        para(`${nextSection()}. הפרת חובת הזהירות:`, { bold: true }),
        para(claim.tort_elements.breach_description),
      );
    }
    if (claim.tort_elements.causation) {
      content.push(
        para(`${nextSection()}. הקשר הסיבתי:`, { bold: true }),
        para(claim.tort_elements.causation),
      );
    }
    if (claim.tort_elements.damages_description) {
      content.push(
        para(`${nextSection()}. הנזק:`, { bold: true }),
        para(claim.tort_elements.damages_description),
      );
    }
    if (claim.tort_elements.contributing_negligence) {
      content.push(
        para(`${nextSection()}. אשם תורם:`, { bold: true }),
        para(claim.tort_elements.contributing_negligence),
      );
    }
  }

  // C. Damages
  content.push(emptyLine(), heading('ג. פירוט הנזקים'));

  claim.damage_heads.filter(h => h.amount_estimated > 0).forEach(head => {
    content.push(
      para(`${nextSection()}. ${DAMAGE_TYPE_LABELS[head.type]}: ${formatCurrency(head.amount_estimated)}`, { bold: true }),
    );
    if (head.description) {
      content.push(para(head.description, { indent: 10 }));
    }
    if (head.evidence_reference) {
      content.push(para(`(אסמכתא: ${head.evidence_reference})`, { indent: 10 }));
    }
  });

  content.push(emptyLine());
  content.push(
    new Paragraph({
      ...bidi,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 100, after: 200, line: LINE_SPACING, lineRule: LineRuleType.AUTO },
      children: [bold(`סה"כ סכום התביעה: ${formatCurrency(total)}`, { size: HEADING_SIZE })],
    })
  );

  // D. Legal Arguments
  if (claim.legal_arguments || claim.causes_of_action.length > 0 || claim.relevant_laws.length > 0) {
    content.push(heading('ד. הטיעונים המשפטיים'));

    if (claim.causes_of_action.length > 0) {
      content.push(para(`${nextSection()}. עילות התביעה:`, { bold: true }));
      claim.causes_of_action.forEach(c => {
        content.push(para(`• ${c}`, { indent: 5 }));
      });
    }

    if (claim.relevant_laws.length > 0) {
      content.push(para(`${nextSection()}. חקיקה רלוונטית:`, { bold: true }));
      claim.relevant_laws.forEach(l => {
        content.push(para(`• ${l}`, { indent: 5 }));
      });
    }

    if (claim.legal_arguments) {
      content.push(para(`${nextSection()}. טיעוני התובע:`, { bold: true }));
      claim.legal_arguments.split('\n').filter(l => l.trim()).forEach(line => {
        content.push(para(line));
      });
    }
  }

  // E. Requested Remedies
  content.push(emptyLine(), heading('ה. הסעד המבוקש'));

  const remedies = claim.requested_remedies ||
    `לאור כל האמור לעיל, מתבקש בית המשפט הנכבד לחייב את הנתבע/ים, ביחד ולחוד, לשלם לתובע סך של ${formatCurrency(total)} בצירוף הפרשי הצמדה וריבית כחוק מיום הגשת התביעה ועד לתשלום המלא בפועל, וכן הוצאות משפט ושכר טרחת עורך דין.`;

  content.push(para(`${nextSection()}. ${remedies}`));

  // Signature
  content.push(
    emptyLine(),
    emptyLine(),
    para('בכבוד רב,'),
    emptyLine(),
    para('____________________'),
    para(claim.plaintiff_attorney ? `עו"ד ${claim.plaintiff_attorney}` : 'ב"כ התובע'),
    para(`תאריך: ${new Date().toLocaleDateString('he-IL')}`),
  );

  // Appendix list
  if (claim.attachments.length > 0) {
    content.push(emptyLine(), heading('רשימת נספחים'));
    claim.attachments.forEach((a, i) => {
      content.push(para(`נספח ${String.fromCharCode(1488 + i)}: ${a.filename}${a.description ? ' — ' + a.description : ''}`));
    });
  }

  // Page header text
  const headerText = `ת.א. ____/__ | ${claim.plaintiff_name} נ' ${defNames}`;

  // Build document
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertMillimetersToTwip(MARGIN_MM),
            bottom: convertMillimetersToTwip(MARGIN_MM),
            left: convertMillimetersToTwip(MARGIN_MM),
            right: convertMillimetersToTwip(MARGIN_MM),
          },
        },
        titlePage: true,
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              ...bidi,
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: headerText,
                  rightToLeft: true,
                  font: FONT,
                  size: 18, // 9pt
                  color: '888888',
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18 }),
                new TextRun({ text: ' מתוך ', font: FONT, size: 18, rightToLeft: true }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 18 }),
              ],
            }),
          ],
        }),
      },
      children: content,
    }],
  });

  return Packer.toBlob(doc);
}

// ============ PDF Generation ============

export async function generateFormalPdf(claim: TortClaim): Promise<Blob> {
  const total = calculateTotalDamages(claim.damage_heads) || claim.total_claim_amount;
  const html = buildFormalHtml(claim, total);

  const container = document.createElement('div');
  container.innerHTML = DOMPurify.sanitize(html);
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '794px'; // A4 width at 96 DPI
  container.style.fontFamily = 'David, "David Libre", Arial, sans-serif';
  container.style.direction = 'rtl';
  container.style.padding = '70px';
  container.style.backgroundColor = 'white';
  container.style.lineHeight = '1.5';
  container.style.fontSize = '12pt';
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdfDoc = await PDFDocument.create();
    const imgBytes = await fetch(imgData).then(r => r.arrayBuffer());
    const pngImage = await pdfDoc.embedPng(imgBytes);

    const imgWidth = pngImage.width;
    const imgHeight = pngImage.height;
    const a4Width = 595.28;
    const a4Height = 841.89;
    const scale = a4Width / imgWidth;
    const scaledHeight = imgHeight * scale;

    const totalPages = Math.ceil(scaledHeight / a4Height);
    for (let i = 0; i < totalPages; i++) {
      const page = pdfDoc.addPage([a4Width, a4Height]);
      const yOffset = -(i * a4Height);
      page.drawImage(pngImage, {
        x: 0,
        y: yOffset + a4Height - scaledHeight,
        width: a4Width,
        height: scaledHeight,
      });
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  } finally {
    document.body.removeChild(container);
  }
}

// ============ HTML builder for PDF ============

function buildFormalHtml(claim: TortClaim, total: number): string {
  const fc = (n: number) => formatCurrency(n);
  const fd = (d: string | undefined) => formatDate(d);
  const defNames = claim.defendants.map(d => d.name).join(' ו-') || '____';
  let sec = 0;
  const ns = () => ++sec;

  const defendants = claim.defendants.map((d, i) =>
    `<div style="margin-bottom:8px;">
      <strong>נתבע ${i + 1}: ${d.name}</strong>
      ${d.idNumber ? `<br/>ת.ז./ח.פ.: ${d.idNumber}` : ''}
      <br/>(${DEFENDANT_TYPE_LABELS[d.type]}${d.role ? ' — ' + d.role : ''})
      <br/>מען: ${d.address}${d.city ? ', ' + d.city : ''}
      ${d.insurerName ? `<br/>מבוטח ע"י: ${d.insurerName}` : ''}
      ${d.attorney ? `<br/>ע"י ב"כ: ${d.attorney}` : ''}
    </div>`
  ).join('');

  const damageRows = claim.damage_heads
    .filter(h => h.amount_estimated > 0)
    .map(h => `
      <tr>
        <td style="padding:4px 8px;border-bottom:1px solid #ddd;">${ns()}. ${DAMAGE_TYPE_LABELS[h.type]}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #ddd;text-align:left;">${fc(h.amount_estimated)}</td>
      </tr>
      ${h.description ? `<tr><td colspan="2" style="padding:2px 24px;font-size:11pt;color:#555;">${h.description}</td></tr>` : ''}
    `).join('');

  const tortElements = (claim.tort_elements.duty_of_care || claim.tort_elements.breach_description) ? `
    <h3 style="font-size:14pt;text-decoration:underline;margin-top:20px;">ב. יסודות העוולה</h3>
    ${claim.tort_elements.duty_of_care ? `<p><strong>${ns()}. חובת הזהירות:</strong></p><p>${claim.tort_elements.duty_of_care}</p>` : ''}
    ${claim.tort_elements.breach_description ? `<p><strong>${ns()}. הפרת החובה:</strong></p><p>${claim.tort_elements.breach_description}</p>` : ''}
    ${claim.tort_elements.causation ? `<p><strong>${ns()}. קשר סיבתי:</strong></p><p>${claim.tort_elements.causation}</p>` : ''}
    ${claim.tort_elements.damages_description ? `<p><strong>${ns()}. הנזק:</strong></p><p>${claim.tort_elements.damages_description}</p>` : ''}
    ${claim.tort_elements.contributing_negligence ? `<p><strong>${ns()}. אשם תורם:</strong></p><p>${claim.tort_elements.contributing_negligence}</p>` : ''}
  ` : '';

  const legalArgs = (claim.legal_arguments || claim.causes_of_action.length > 0) ? `
    <h3 style="font-size:14pt;text-decoration:underline;margin-top:20px;">ד. הטיעונים המשפטיים</h3>
    ${claim.causes_of_action.length > 0 ? `<p><strong>${ns()}. עילות:</strong> ${claim.causes_of_action.join('; ')}</p>` : ''}
    ${claim.relevant_laws.length > 0 ? `<p><strong>${ns()}. חקיקה:</strong> ${claim.relevant_laws.join('; ')}</p>` : ''}
    ${claim.legal_arguments ? claim.legal_arguments.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('') : ''}
  ` : '';

  const appendices = claim.attachments.length > 0 ? `
    <h3 style="font-size:14pt;text-decoration:underline;margin-top:30px;">רשימת נספחים</h3>
    ${claim.attachments.map((a, i) => `<p>נספח ${String.fromCharCode(1488 + i)}: ${a.filename}${a.description ? ' — ' + a.description : ''}</p>`).join('')}
  ` : '';

  return `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:14pt;font-weight:bold;">בבית המשפט</div>
      <div style="font-size:18pt;font-weight:bold;">${claim.court_name || '____'}</div>
      <div style="font-size:14pt;font-weight:bold;margin-top:12px;">ת.א. ____/__</div>
      <div style="font-size:18pt;font-weight:bold;margin-top:16px;">כתב תביעה</div>
      <div style="font-size:12pt;font-weight:bold;margin-top:8px;">סכום התביעה: ${fc(total)}</div>
    </div>

    <div style="margin-bottom:12px;">
      <p><strong>התובע:</strong> ${claim.plaintiff_name}, ת.ז. ${claim.plaintiff_id}</p>
      <p>מען: ${claim.plaintiff_address}${claim.plaintiff_city ? ', ' + claim.plaintiff_city : ''}</p>
      ${claim.plaintiff_contact.phone ? `<p>טלפון: ${claim.plaintiff_contact.phone}</p>` : ''}
      ${claim.plaintiff_attorney ? `<p>ע"י ב"כ עו"ד ${claim.plaintiff_attorney}</p>` : ''}
    </div>

    <div style="text-align:center;margin:16px 0;font-weight:bold;font-size:14pt;">- נגד -</div>

    <div style="margin-bottom:20px;">${defendants}</div>

    <h3 style="font-size:14pt;text-decoration:underline;margin-top:24px;">תמצית טענות התביעה</h3>
    <p>${ns()}. עניינה של תביעה זו בנזקים שנגרמו לתובע ביום ${fd(claim.incident_date)} עקב ${CLAIM_TYPE_LABELS[claim.claim_type]} ${claim.incident_location ? 'ב' + claim.incident_location + ' ' : ''}בגינם עותר התובע לחייב את הנתבע/ים בפיצויים בסך ${fc(total)}.</p>
    <p>${ns()}. התובע יטען כי הנתבע/ים ${defNames} חבים כלפיו בנזיקין.</p>

    <h3 style="font-size:14pt;text-decoration:underline;margin-top:24px;">א. עובדות התביעה</h3>
    <p>${ns()}. סוג התביעה: ${CLAIM_TYPE_LABELS[claim.claim_type]}.</p>
    <p>${ns()}. ביום ${fd(claim.incident_date)}${claim.incident_location ? ', ב' + claim.incident_location : ''}, אירע האירוע נשוא תביעה זו.</p>
    ${claim.incident_description.split('\n').filter(l => l.trim()).map(l => `<p>${ns()}. ${l}</p>`).join('')}

    ${tortElements}

    <h3 style="font-size:14pt;text-decoration:underline;margin-top:20px;">ג. פירוט הנזקים</h3>
    <table style="width:100%;border-collapse:collapse;margin:12px 0;">
      ${damageRows}
      <tr style="font-weight:bold;border-top:2px solid #000;">
        <td style="padding:6px 8px;">סה"כ סכום התביעה</td>
        <td style="padding:6px 8px;text-align:left;">${fc(total)}</td>
      </tr>
    </table>

    ${legalArgs}

    <h3 style="font-size:14pt;text-decoration:underline;margin-top:20px;">ה. הסעד המבוקש</h3>
    <p>${claim.requested_remedies || `לאור כל האמור לעיל, מתבקש בית המשפט הנכבד לחייב את הנתבע/ים, ביחד ולחוד, לשלם לתובע סך של ${fc(total)} בצירוף הפרשי הצמדה וריבית כחוק מיום הגשת התביעה ועד לתשלום המלא בפועל, וכן הוצאות משפט ושכר טרחת עו"ד.`}</p>

    <div style="margin-top:48px;">
      <p>בכבוד רב,</p>
      <p style="margin-top:32px;">____________________</p>
      <p>${claim.plaintiff_attorney ? `עו"ד ${claim.plaintiff_attorney}` : 'ב"כ התובע'}</p>
      <p style="font-size:11pt;margin-top:8px;">תאריך: ${new Date().toLocaleDateString('he-IL')}</p>
    </div>

    ${appendices}
  `;
}

// ============ Download helper ============

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
