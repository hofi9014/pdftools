// Everything the KSeF page needs once a file is added, in one module the page loads on demand
// (the schema descriptions weigh ~180 kB and are not needed before that).
import { readKsefXml, type KsefReadError } from './parse';
import { buildInvoiceView, type InvoiceView } from './view';
import { invoicePreviewHtml, invoicesPdfHtml, invoiceTitle } from './html';

export const MAX_XML_BYTES = 20 * 1024 * 1024;

export type KsefFileResult =
  | { ok: true; fileName: string; view: InvoiceView; previewHtml: string; title: string }
  | { ok: false; fileName: string; message: string };

export function errorMessage(error: KsefReadError): string {
  switch (error.code) {
    case 'empty': return 'Plik jest pusty.';
    case 'not-xml': return 'To nie jest plik XML. Wybierz plik faktury z KSeF z rozszerzeniem .xml.';
    case 'upo': return 'To jest Urzędowe Poświadczenie Odbioru (UPO), a nie faktura. Wybierz plik XML faktury.';
    case 'fa1': return 'To faktura w starszej strukturze FA(1). Podgląd obsługuje faktury w strukturze FA(3) i FA(2).';
    case 'unknown-version': return `To faktura w nieznanej wersji struktury (przestrzeń nazw: ${error.namespace || 'brak'}). Podgląd obsługuje faktury w strukturze FA(3) i FA(2).`;
    case 'not-invoice': return `Ten plik XML nie jest fakturą KSeF (główny element: „${error.root}”). Wybierz plik XML faktury w strukturze FA(3) lub FA(2).`;
  }
}

export function readInvoiceText(text: string, fileName: string): KsefFileResult {
  const read = readKsefXml(text, fileName);
  if ('error' in read) return { ok: false, fileName, message: errorMessage(read.error) };
  const view = buildInvoiceView(read.invoice);
  return { ok: true, fileName, view, previewHtml: invoicePreviewHtml(view), title: invoiceTitle(view) };
}

export async function readInvoiceFile(file: File): Promise<KsefFileResult> {
  if (file.size > MAX_XML_BYTES) return { ok: false, fileName: file.name, message: 'Plik jest za duży (ponad 20 MB). Faktura z KSeF ma zwykle kilkadziesiąt kilobajtów.' };
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, fileName: file.name, message: 'Nie udało się odczytać pliku.' };
  }
  return readInvoiceText(text, file.name);
}

/** The PDF name for an XML file: the same name with .pdf. */
export function pdfName(fileName: string): string {
  return `${fileName.replace(/\.xml$/i, '') || 'faktura'}.pdf`;
}

export async function invoicesToPdf(items: { view: InvoiceView; fileName: string }[]): Promise<Blob> {
  const { htmlToTaggedPdf } = await import('@/lib/pdf/htmlToTaggedPdf');
  return htmlToTaggedPdf(invoicesPdfHtml(items));
}
