import { PDFDocument } from 'pdf-lib';

/**
 * Merges multiple PDF blobs into a single PDF document.
 * Uses pdf-lib's copyPages to combine all pages sequentially.
 */
export async function mergePdfs(pdfBlobs: Blob[]): Promise<Blob> {
  const mergedDoc = await PDFDocument.create();

  for (const blob of pdfBlobs) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const pages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      for (const page of pages) {
        mergedDoc.addPage(page);
      }
    } catch (err) {
      console.warn('Failed to merge a PDF blob, skipping:', err);
    }
  }

  const mergedBytes = await mergedDoc.save();
  return new Blob([mergedBytes], { type: 'application/pdf' });
}
