// The text of every page of a PDF, as pdf.js reads it (the order the text is drawn in, with line
// ends), for "Search in many PDFs" (plan 2.8). Loaded only when the tool is used.
import { initPdfjs, pdfjsDocOptions } from '../client-pdf';

export interface PageTexts {
  pages: string[];
  /** Characters of text on all pages (0: no text layer, e.g. a scan). */
  chars: number;
}

export async function pdfPageTexts(bytes: Uint8Array): Promise<PageTexts> {
  const pdfjsLib = await import('pdfjs-dist');
  await initPdfjs();
  const task = pdfjsLib.getDocument(pdfjsDocOptions(bytes));
  let doc;
  try {
    doc = await task.promise;
  } catch (e) {
    if ((e as { name?: string })?.name === 'PasswordException') throw new Error('PDF jest zabezpieczony hasłem. Najpierw odblokuj dokument.');
    throw e;
  }
  const pages: string[] = [];
  let chars = 0;
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let text = '';
      for (const item of content.items) {
        if (!('str' in item)) continue;
        text += item.str;
        if (item.hasEOL) text += '\n';
      }
      chars += text.replace(/\s+/g, '').length;
      pages.push(text);
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return { pages, chars };
}
