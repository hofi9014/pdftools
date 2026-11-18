// The invoice view as HTML: one version for the on-page preview (definition lists, styled by the
// page) and one for the PDF (tables only — the tagged-PDF renderer lays out tables, not CSS).
// Every value is escaped; nothing from the file is ever inserted as markup.
import { KSEF_NOTICE, type InvoiceView, type ViewBlock } from './view';

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const text = (s: string): string => escapeHtml(s).replace(/\n/g, '<br>');

export function invoiceTitle(view: InvoiceView): string {
  return view.number ? `${view.title} nr ${view.number}` : view.title;
}

function block(b: ViewBlock, forPdf: boolean, headingLevel: number): string {
  switch (b.t) {
    case 'heading':
      return `<h${headingLevel}>${text(b.text)}</h${headingLevel}>`;
    case 'total':
      return `<p class="ksef-total"><b>${text(b.label)}: ${text(b.value)}</b></p>`;
    case 'rows':
      if (forPdf) {
        return `<table><colgroup><col width="38%"><col width="62%"></colgroup>${b.rows.map((r) => `<tr><td><b>${text(r.label)}</b></td><td>${text(r.value)}</td></tr>`).join('')}</table>`;
      }
      return `<dl class="ksef-rows">${b.rows.map((r) => `<div><dt>${text(r.label)}</dt><dd>${text(r.value)}</dd></div>`).join('')}</dl>`;
    case 'table': {
      const align = (i: number) => (b.columns[i]?.align === 'right' ? ' style="text-align:right"' : '');
      const cols = `<colgroup>${b.columns.map((c) => `<col width="${(c.width * 100).toFixed(2)}%">`).join('')}</colgroup>`;
      const caption = b.caption ? (forPdf ? `<h${headingLevel + 1}>${text(b.caption)}</h${headingLevel + 1}>` : '') : '';
      const head = `<tr>${b.columns.map((c, i) => `<th scope="col"${align(i)}>${text(c.label)}</th>`).join('')}</tr>`;
      const body = b.rows.map((r) => `<tr>${r.map((cell, i) => `<td${align(i)}>${text(cell)}</td>`).join('')}</tr>`).join('');
      if (forPdf) return `${caption}<table>${cols}${head}${body}</table>`;
      return `<div class="ksef-table-wrap"><table class="ksef-table">${b.caption ? `<caption>${text(b.caption)}</caption>` : ''}${cols}<thead>${head}</thead><tbody>${body}</tbody></table></div>`;
    }
  }
}

/** The preview inside the page (the page supplies the h2 of the whole tool, so sections are h3). */
export function invoicePreviewHtml(view: InvoiceView): string {
  return `<div class="ksef-invoice" lang="pl"><h3 class="ksef-title">${text(invoiceTitle(view))}</h3>${view.blocks.map((b) => block(b, false, 4)).join('')}</div>`;
}

/** The body of one invoice in the PDF. */
export function invoicePdfBody(view: InvoiceView, fileName: string): string {
  return `<h1>${text(invoiceTitle(view))}</h1><p><i>${text(KSEF_NOTICE)}</i></p><p>Plik: ${text(fileName)} · struktura ${text(view.version)}</p>${view.blocks.map((b) => block(b, true, 2)).join('')}`;
}

/** A whole PDF document: one invoice, or several, each starting on a new page. */
export function invoicesPdfHtml(items: { view: InvoiceView; fileName: string }[]): string {
  const title = items.length === 1 ? invoiceTitle(items[0]!.view) : `Faktury KSeF (${items.length})`;
  return `<!doctype html><html lang="pl"><head><title>${text(title)}</title></head><body>${items.map((it, i) => `${i ? '<hr data-page-break>' : ''}${invoicePdfBody(it.view, it.fileName)}`).join('')}</body></html>`;
}
