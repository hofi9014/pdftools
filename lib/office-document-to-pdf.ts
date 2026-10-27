import { officeToPdf } from '@/lib/client-pdf';
import {
  docxToIR, odtToIR, renderIRToPdf, hasUnsupportedScriptInPages,
  xlsxToIR, renderSpreadsheetIRToPdf, detectUnsupportedScript,
} from '@/lib/client-pdf-docx';
import { positionedDocxToPdf, positionedOdtToPdf } from '@/lib/pdf/fixedLayoutToPdf';

/** A converted document, and whether the plain-text fallback (officeToPdf) had to be used. */
export interface OfficeConversion {
  blob: Blob;
  fallbackUsed: boolean;
}

/**
 * One conversion per format, shared by Word to PDF (with its Excel and OpenOffice tabs), Excel to
 * PDF and OpenOffice to PDF. Before 2026-10-27 each page had its own copy, and the tabs of Word to
 * PDF fell behind: an .xlsx there went through officeToPdf's plain dump (dates as 46235, no grid)
 * and an .odt without a positioned layout skipped the full ODT reader, while the dedicated pages
 * used the full engines. officeToPdf stays the fallback everywhere — for a file the reader cannot
 * parse, or text in a script the embedded font cannot draw.
 */

/** .docx or .odt: a positioned layout (PDF → Word/ODT faithful layout) is drawn where it says; any
 *  other document is read into paragraphs, tables and images and laid out again. */
export async function textDocumentToPdf(file: File): Promise<OfficeConversion> {
  const odt = /\.odt$/i.test(file.name);
  try {
    const positioned = odt ? await positionedOdtToPdf(file) : await positionedDocxToPdf(file);
    if (positioned) return { blob: positioned, fallbackUsed: false };
    const { pages, images } = odt ? await odtToIR(file) : await docxToIR(file);
    if (hasUnsupportedScriptInPages(pages)) {
      console.warn('Unsupported script detected, falling back to legacy officeToPdf');
      return { blob: await officeToPdf(file), fallbackUsed: true };
    }
    return { blob: await renderIRToPdf(pages, images), fallbackUsed: false };
  } catch (irErr) {
    console.error('document reader failed, falling back:', irErr);
    return { blob: await officeToPdf(file), fallbackUsed: true };
  }
}

/** .xlsx: the real sheet — grid, merged cells, column widths, dates and times in their cell
 *  format, cell colours, a repeated header row, one PDF section per sheet. */
export async function spreadsheetToPdf(file: File): Promise<OfficeConversion> {
  try {
    const ir = await xlsxToIR(file);
    const cellText = ir.sheets.flatMap((s) => s.cells.flatMap((row) => (row ?? []).map((c) => c?.display ?? ''))).join(' ');
    if (detectUnsupportedScript(cellText)) return { blob: await officeToPdf(file), fallbackUsed: true };
    return { blob: await renderSpreadsheetIRToPdf(ir), fallbackUsed: false };
  } catch (irErr) {
    console.error('xlsxToIR/renderSpreadsheetIRToPdf failed, falling back:', irErr);
    return { blob: await officeToPdf(file), fallbackUsed: true };
  }
}

/** Any accepted office file by its extension. .ods and .odp have no full reader yet — plain text. */
export async function officeDocumentToPdf(file: File): Promise<OfficeConversion> {
  const ext = file.name.toLowerCase().split('.').pop() || '';
  if (ext === 'docx' || ext === 'odt') return textDocumentToPdf(file);
  if (ext === 'xlsx') return spreadsheetToPdf(file);
  return { blob: await officeToPdf(file), fallbackUsed: false };
}
