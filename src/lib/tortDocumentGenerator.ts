import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  convertMillimetersToTwip,
} from 'docx';
import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';
import DOMPurify from 'dompurify';
import type { TortClaim } from './tortClaimTypes';
import { CLAIM_TYPE_LABELS, DEFENDANT_TYPE_LABELS, DAMAGE_TYPE_LABELS } from './tortClaimTypes';
import { calculateTotalDamages } from './nizkin/questionnaire-engine';
import { mergePdfs } from './pdfMergeUtils';

// ============ DOCX Generation ============

export async function generateTortClaimDocx(claim: TortClaim): Promise<Blob> {
  const totalDamages = calculateTotalDamages(claim.damage_heads);
  const amount = totalDamages || claim.total_claim_amount;
  const formatCurrency = (n: number) => new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n) + ' ₪';

  const bidi = { bidirectional: true };
  const rtlRun = (text: string, opts: Record<string, any> = {}) =>
    new TextRun({ text, rightToLeft: true, font: 'David', size: 24, ...opts });

  const sections: Paragraph[] = [];

  // ---- Court Header ----
  sections.push(
    new Paragraph({ alignment: AlignmentType.CENTER, ...bidi, children: [rtlRun('בפני', { bold: true, size: 28 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, ...bidi, children: [rtlRun(claim.court_name, { bold: true, size: 28 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, ...bidi, spacing: { after: 400 }, children: [
      rtlRun('כתב תביעה', { bold: true, size: 36 }),
    ] }),
  );

  // ---- Parties ----
  sections.push(
    new Paragraph({ ...bidi, children: [rtlRun('התובע:', { bold: true })] }),
    new Paragraph({ ...bidi, children: [rtlRun(`${claim.plaintiff_name}, ת.ז. ${claim.plaintiff_id}`)] }),
    new Paragraph({ ...bidi, spacing: { after: 100 }, children: [
      rtlRun(`מען: ${claim.plaintiff_address}${claim.plaintiff_city ? ', ' + claim.plaintiff_city : ''}`),
    ] }),
  );
  if (claim.plaintiff_contact.phone) {
    sections.push(new Paragraph({ ...bidi, spacing: { after: 100 }, children: [rtlRun(`טלפון: ${claim.plaintiff_contact.phone}`)] }));
  }
  if (claim.plaintiff_attorney) {
    sections.push(new Paragraph({ ...bidi, spacing: { after: 100 }, children: [rtlRun(`ע"י ב"כ: ${claim.plaintiff_attorney}`)] }));
  }
  sections.push(
    new Paragraph({ alignment: AlignmentType.CENTER, ...bidi, spacing: { before: 200, after: 200 }, children: [rtlRun('- נגד -', { bold: true })] }),
  );

  claim.defendants.forEach((d, i) => {
    sections.push(
      new Paragraph({ ...bidi, children: [rtlRun(`נתבע ${i + 1}: ${d.name}`, { bold: true })] }),
    );
    if (d.idNumber) sections.push(new Paragraph({ ...bidi, children: [rtlRun(`ת.ז./ח.פ.: ${d.idNumber}`)] }));
    if (d.role) sections.push(new Paragraph({ ...bidi, children: [rtlRun(`(${d.role})`)] }));
    sections.push(
      new Paragraph({ ...bidi, spacing: { after: 100 }, children: [
        rtlRun(`מען: ${d.address}${d.city ? ', ' + d.city : ''}`),
      ] }),
    );
    if (d.insurerName) {
      sections.push(new Paragraph({ ...bidi, children: [rtlRun(`חברת ביטוח: ${d.insurerName}${d.policyNumber ? ', פוליסה: ' + d.policyNumber : ''}`)] }));
    }
    if (d.attorney) {
      sections.push(new Paragraph({ ...bidi, children: [rtlRun(`ע"י ב"כ: ${d.attorney}`)] }));
    }
  });

  // ---- Section: Facts ----
  sections.push(
    new Paragraph({ ...bidi, spacing: { before: 400 }, children: [rtlRun('א. עובדות התביעה', { bold: true, size: 28 })] }),
    new Paragraph({ ...bidi, children: [rtlRun(`סוג התביעה: ${CLAIM_TYPE_LABELS[claim.claim_type]}`)] }),
    new Paragraph({ ...bidi, children: [
      rtlRun(`ביום ${claim.incident_date ? new Date(claim.incident_date).toLocaleDateString('he-IL') : '____'}`),
      rtlRun(claim.incident_location ? ` במקום: ${claim.incident_location}` : ''),
    ] }),
  );

  const descLines = claim.incident_description.split('\n').filter(l => l.trim());
  descLines.forEach((line, i) => {
    sections.push(new Paragraph({ ...bidi, spacing: { after: i === descLines.length - 1 ? 200 : 80 }, children: [rtlRun(`${i + 1}. ${line}`)] }));
  });

  // ---- Road accident specific ----
  if (claim.claim_type === 'road_accident' && claim.vehicle_details) {
    sections.push(new Paragraph({ ...bidi, spacing: { before: 200 }, children: [rtlRun('פרטי הרכב:', { bold: true })] }));
    const v = claim.vehicle_details;
    if (v.license_plate) sections.push(new Paragraph({ ...bidi, children: [rtlRun(`מספר רישוי: ${v.license_plate}`)] }));
    if (v.make) sections.push(new Paragraph({ ...bidi, children: [rtlRun(`רכב: ${v.make} ${v.model} ${v.year}`)] }));
    if (claim.police_report_number) sections.push(new Paragraph({ ...bidi, children: [rtlRun(`דו"ח משטרה: ${claim.police_report_number}`)] }));
    if (claim.is_karnitah) sections.push(new Paragraph({ ...bidi, children: [rtlRun('התביעה מוגשת כנגד קרנית.')] }));
  }

  // ---- Medical malpractice specific ----
  if (claim.claim_type === 'medical_malpractice' && (claim.medical_facility || claim.treating_physician)) {
    sections.push(new Paragraph({ ...bidi, spacing: { before: 200 }, children: [rtlRun('פרטי הרשלנות הרפואית:', { bold: true })] }));
    if (claim.medical_facility) sections.push(new Paragraph({ ...bidi, children: [rtlRun(`מוסד רפואי: ${claim.medical_facility}`)] }));
    if (claim.treating_physician) sections.push(new Paragraph({ ...bidi, children: [rtlRun(`רופא מטפל: ${claim.treating_physician}`)] }));
  }

  // ---- Section: Tort Elements ----
  if (claim.tort_elements.duty_of_care || claim.tort_elements.breach_description) {
    sections.push(
      new Paragraph({ ...bidi, spacing: { before: 300 }, children: [rtlRun('ב. יסודות העוולה', { bold: true, size: 28 })] }),
    );
    if (claim.tort_elements.duty_of_care) {
      sections.push(new Paragraph({ ...bidi, children: [rtlRun('חובת זהירות:', { bold: true })] }));
      sections.push(new Paragraph({ ...bidi, spacing: { after: 100 }, children: [rtlRun(claim.tort_elements.duty_of_care)] }));
    }
    if (claim.tort_elements.breach_description) {
      sections.push(new Paragraph({ ...bidi, children: [rtlRun('הפרת החובה:', { bold: true })] }));
      sections.push(new Paragraph({ ...bidi, spacing: { after: 100 }, children: [rtlRun(claim.tort_elements.breach_description)] }));
    }
    if (claim.tort_elements.causation) {
      sections.push(new Paragraph({ ...bidi, children: [rtlRun('קשר סיבתי:', { bold: true })] }));
      sections.push(new Paragraph({ ...bidi, spacing: { after: 100 }, children: [rtlRun(claim.tort_elements.causation)] }));
    }
    if (claim.tort_elements.damages_description) {
      sections.push(new Paragraph({ ...bidi, children: [rtlRun('הנזק:', { bold: true })] }));
      sections.push(new Paragraph({ ...bidi, spacing: { after: 100 }, children: [rtlRun(claim.tort_elements.damages_description)] }));
    }
    if (claim.tort_elements.contributing_negligence) {
      sections.push(new Paragraph({ ...bidi, children: [rtlRun('אשם תורם:', { bold: true })] }));
      sections.push(new Paragraph({ ...bidi, spacing: { after: 100 }, children: [rtlRun(claim.tort_elements.contributing_negligence)] }));
    }
  }

  // ---- Section: Damages ----
  sections.push(
    new Paragraph({ ...bidi, spacing: { before: 300 }, children: [rtlRun('ג. פירוט הנזקים', { bold: true, size: 28 })] }),
  );

  claim.damage_heads.filter(h => h.amount_estimated > 0).forEach(head => {
    sections.push(new Paragraph({ ...bidi, children: [
      rtlRun(`• ${DAMAGE_TYPE_LABELS[head.type]}: ${formatCurrency(head.amount_estimated)}`),
    ] }));
    if (head.description) {
      sections.push(new Paragraph({ ...bidi, spacing: { after: 60 }, children: [rtlRun(`  ${head.description}`, { size: 22 })] }));
    }
  });

  sections.push(
    new Paragraph({ ...bidi, spacing: { before: 100 }, children: [
      rtlRun(`סה"כ סכום התביעה: ${formatCurrency(amount)}`, { bold: true, size: 26 }),
    ] }),
  );

  // ---- Section: Legal Arguments ----
  if (claim.legal_arguments || claim.causes_of_action.length > 0) {
    sections.push(
      new Paragraph({ ...bidi, spacing: { before: 300 }, children: [rtlRun('ד. הטיעונים המשפטיים', { bold: true, size: 28 })] }),
    );

    if (claim.causes_of_action.length > 0) {
      sections.push(new Paragraph({ ...bidi, children: [rtlRun('עילות התביעה:', { bold: true })] }));
      claim.causes_of_action.forEach(c => {
        sections.push(new Paragraph({ ...bidi, children: [rtlRun(`• ${c}`)] }));
      });
    }

    if (claim.relevant_laws.length > 0) {
      sections.push(new Paragraph({ ...bidi, spacing: { before: 100 }, children: [rtlRun('חקיקה רלוונטית:', { bold: true })] }));
      claim.relevant_laws.forEach(l => {
        sections.push(new Paragraph({ ...bidi, children: [rtlRun(`• ${l}`)] }));
      });
    }

    if (claim.legal_arguments) {
      const argLines = claim.legal_arguments.split('\n').filter(l => l.trim());
      argLines.forEach(line => {
        sections.push(new Paragraph({ ...bidi, spacing: { after: 80 }, children: [rtlRun(line)] }));
      });
    }
  }

  // ---- Section: Requested Remedies ----
  sections.push(
    new Paragraph({ ...bidi, spacing: { before: 300 }, children: [rtlRun('ה. הסעד המבוקש', { bold: true, size: 28 })] }),
    new Paragraph({ ...bidi, children: [
      rtlRun(claim.requested_remedies || `לאור כל האמור לעיל, מתבקש בית המשפט הנכבד לחייב את הנתבע/ים לשלם לתובע סך של ${formatCurrency(amount)} בצירוף הפרשי הצמדה וריבית כחוק מיום הגשת התביעה ועד התשלום המלא בפועל, וכן הוצאות משפט ושכר טרחת עו"ד.`),
    ] }),
  );

  // ---- Signature ----
  sections.push(
    new Paragraph({ ...bidi, spacing: { before: 600 }, children: [rtlRun('בכבוד רב,')] }),
    new Paragraph({ ...bidi, spacing: { before: 200 }, children: [rtlRun('____________________')] }),
    new Paragraph({ ...bidi, children: [rtlRun('ב"כ התובע')] }),
    new Paragraph({ ...bidi, spacing: { before: 100 }, children: [
      rtlRun(`תאריך: ${new Date().toLocaleDateString('he-IL')}`, { size: 20 }),
    ] }),
  );

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertMillimetersToTwip(25),
            bottom: convertMillimetersToTwip(25),
            left: convertMillimetersToTwip(25),
            right: convertMillimetersToTwip(25),
          },
        },
      },
      children: sections,
    }],
  });

  return Packer.toBlob(doc);
}

// ============ PDF Generation ============

export async function generateTortClaimPdf(claim: TortClaim): Promise<Blob> {
  const totalDamages = calculateTotalDamages(claim.damage_heads);
  const amount = totalDamages || claim.total_claim_amount;
  const formatCurrency = (n: number) => new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(n) + ' ₪';

  const html = buildClaimHtml(claim, amount, formatCurrency);

  const container = document.createElement('div');
  container.innerHTML = DOMPurify.sanitize(html);
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '794px';
  container.style.fontFamily = 'David, Arial, sans-serif';
  container.style.direction = 'rtl';
  container.style.padding = '40px';
  container.style.backgroundColor = 'white';
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

function buildClaimHtml(claim: TortClaim, amount: number, formatCurrency: (n: number) => string): string {
  const defendants = claim.defendants.map((d, i) =>
    `<p><strong>נתבע ${i + 1}:</strong> ${d.name}${d.idNumber ? ` (ת.ז./ח.פ. ${d.idNumber})` : ''}${d.role ? ` - ${d.role}` : ''}<br/>מען: ${d.address}${d.city ? ', ' + d.city : ''}</p>`
  ).join('');

  const damageRows = claim.damage_heads
    .filter(h => h.amount_estimated > 0)
    .map(h => `<tr><td>${DAMAGE_TYPE_LABELS[h.type]}</td><td>${formatCurrency(h.amount_estimated)}</td></tr>`)
    .join('');

  const tortElements = (claim.tort_elements.duty_of_care || claim.tort_elements.breach_description) ? `
    <h3>ב. יסודות העוולה</h3>
    ${claim.tort_elements.duty_of_care ? `<p><strong>חובת זהירות:</strong> ${claim.tort_elements.duty_of_care}</p>` : ''}
    ${claim.tort_elements.breach_description ? `<p><strong>הפרת החובה:</strong> ${claim.tort_elements.breach_description}</p>` : ''}
    ${claim.tort_elements.causation ? `<p><strong>קשר סיבתי:</strong> ${claim.tort_elements.causation}</p>` : ''}
    ${claim.tort_elements.damages_description ? `<p><strong>הנזק:</strong> ${claim.tort_elements.damages_description}</p>` : ''}
  ` : '';

  return `
    <div style="text-align:center; margin-bottom:20px;">
      <div style="font-size:16px; font-weight:bold;">בפני</div>
      <div style="font-size:18px; font-weight:bold;">${claim.court_name}</div>
      <div style="font-size:24px; font-weight:bold; margin-top:15px;">כתב תביעה</div>
    </div>

    <div style="margin-bottom:15px;">
      <p><strong>התובע:</strong> ${claim.plaintiff_name}, ת.ז. ${claim.plaintiff_id}</p>
      <p>מען: ${claim.plaintiff_address}${claim.plaintiff_city ? ', ' + claim.plaintiff_city : ''}</p>
      ${claim.plaintiff_contact.phone ? `<p>טלפון: ${claim.plaintiff_contact.phone}</p>` : ''}
      ${claim.plaintiff_attorney ? `<p>ע"י ב"כ: ${claim.plaintiff_attorney}</p>` : ''}
    </div>

    <div style="text-align:center; margin:15px 0; font-weight:bold;">- נגד -</div>

    <div style="margin-bottom:20px;">${defendants}</div>

    <h3>א. עובדות התביעה</h3>
    <p>סוג התביעה: ${CLAIM_TYPE_LABELS[claim.claim_type]}</p>
    <p>ביום ${claim.incident_date ? new Date(claim.incident_date).toLocaleDateString('he-IL') : '____'}${claim.incident_location ? ` במקום: ${claim.incident_location}` : ''}</p>
    ${claim.incident_description.split('\n').filter(l => l.trim()).map((l, i) => `<p>${i + 1}. ${l}</p>`).join('')}

    ${tortElements}

    <h3>ג. פירוט הנזקים</h3>
    <table style="width:100%; border-collapse:collapse; margin:10px 0;">
      ${damageRows}
      <tr style="font-weight:bold; border-top:2px solid #000;">
        <td>סה"כ</td><td>${formatCurrency(amount)}</td>
      </tr>
    </table>

    ${claim.legal_arguments ? `
      <h3>ד. הטיעונים המשפטיים</h3>
      ${claim.causes_of_action.length > 0 ? `<p><strong>עילות:</strong> ${claim.causes_of_action.join('; ')}</p>` : ''}
      ${claim.legal_arguments.split('\n').map(l => `<p>${l}</p>`).join('')}
    ` : ''}

    <h3>ה. הסעד המבוקש</h3>
    <p>${claim.requested_remedies || `מתבקש בית המשפט הנכבד לחייב את הנתבע/ים לשלם לתובע סך של ${formatCurrency(amount)} בצירוף הפרשי הצמדה וריבית כחוק.`}</p>

    <div style="margin-top:40px;">
      <p>בכבוד רב,</p>
      <p style="margin-top:30px;">____________________</p>
      <p>ב"כ התובע</p>
      <p style="font-size:12px;">תאריך: ${new Date().toLocaleDateString('he-IL')}</p>
    </div>
  `;
}

// ============ Merged PDF (claim + attachments) ============

/**
 * Generates a merged PDF with the tort claim document followed by attachment PDFs.
 * Non-PDF attachments are skipped (only PDF attachments can be merged).
 */
export async function generateMergedTortClaimPdf(
  claim: TortClaim,
  attachmentBlobs: Blob[]
): Promise<Blob> {
  // Generate the main claim PDF
  const claimPdf = await generateTortClaimPdf(claim);

  // If no attachments, just return the claim PDF
  if (attachmentBlobs.length === 0) {
    return claimPdf;
  }

  // Merge: claim PDF first, then all attachment PDFs
  return mergePdfs([claimPdf, ...attachmentBlobs]);
}

// ============ Download Helper ============

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
