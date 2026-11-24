// "Add QR code to PDF" (plan 2.5, 2026-11-24): draws a QR code on pages of a PDF as vector
// shapes (sharp at any zoom and in print), on a white square with the standard quiet zone, where
// the reader of the page sees it: positions are measured on the page as displayed (crop box,
// turned by /Rotate), and every corner is mapped to the page's own coordinates, so the code is
// upright and in the chosen corner on turned pages too. When the text is a web address, the code
// is also a clickable link. pdf-lib only.
import { PDFDocument, PDFHexString, PDFName, PDFString, rgb, type PDFPage } from 'pdf-lib';
import { QUIET_ZONE, isWebLink, qrMatrix, qrRuns } from '../qr';

export type QrPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
export type QrPages = 'all' | 'first' | 'last';

export interface AddQrOptions {
  text: string;
  /** Width of the code with its white margin, in millimetres. */
  sizeMm: number;
  position: QrPosition;
  pages: QrPages;
  /** Distance from the edge of the page, in millimetres. */
  marginMm?: number;
}

const MM = 72 / 25.4;

// The page as displayed: its crop box turned by /Rotate (same formulas as lib/client-pdf.ts
// visualPageSize/visualToRawPoint, copied so this module does not load the whole engine).
function view(page: PDFPage) {
  const crop = page.getCropBox();
  const rot = ((page.getRotation().angle % 360) + 360) % 360;
  const turned = rot === 90 || rot === 270;
  const w = turned ? crop.height : crop.width;
  const h = turned ? crop.width : crop.height;
  /** A point given from the top-left of the page as displayed (y downwards) → page coordinates. */
  const pt = (vx: number, vyTop: number) => {
    const vy = h - vyTop;
    let x = vx, y = vy;
    if (rot === 90) { x = crop.width - vy; y = vx; }
    else if (rot === 180) { x = crop.width - vx; y = crop.height - vy; }
    else if (rot === 270) { x = vy; y = crop.height - vx; }
    return { x: crop.x + x, y: crop.y + y };
  };
  return { w, h, pt };
}

/** Top-left corner of the code, from the top-left of the page as displayed. */
export function qrBoxOrigin(pageW: number, pageH: number, size: number, margin: number, position: QrPosition): { x: number; y: number } {
  const [v, hpos] = position.split('-') as ['top' | 'bottom', 'left' | 'center' | 'right'];
  const x = hpos === 'left' ? margin : hpos === 'right' ? pageW - margin - size : (pageW - size) / 2;
  const y = v === 'top' ? margin : pageH - margin - size;
  return { x, y };
}

function path(points: { x: number; y: number }[]): string {
  // drawSvgPath at (0,0) flips y, so page coordinates go in with y negated.
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(3)},${(-p.y).toFixed(3)}`).join(' ') + ' Z';
}

export async function addQrCodeToPdf(bytes: Uint8Array | ArrayBuffer, opts: AddQrOptions): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  if (pdf.isEncrypted) throw new Error('PDF jest zabezpieczony hasłem. Najpierw odblokuj dokument.');
  const matrix = qrMatrix(opts.text);
  const modules = matrix.length + QUIET_ZONE * 2;
  const pages = pdf.getPages();
  const chosen = opts.pages === 'first' ? pages.slice(0, 1) : opts.pages === 'last' ? pages.slice(-1) : pages;
  const link = isWebLink(opts.text) ? new URL(opts.text.trim()).href : null;

  for (const page of chosen) {
    const v = view(page);
    // Never off the page: on a page too small for the chosen size, the code takes at most 90 % of
    // the shorter side and the margin shrinks to what is left.
    const short = Math.min(v.w, v.h);
    const size = Math.min(opts.sizeMm * MM, short * 0.9);
    const margin = Math.min((opts.marginMm ?? 10) * MM, (short - size) / 2);
    const o = qrBoxOrigin(v.w, v.h, size, margin, opts.position);
    const unit = size / modules;
    const quad = (x: number, y: number, w: number, h: number) =>
      path([v.pt(o.x + x * unit, o.y + y * unit), v.pt(o.x + (x + w) * unit, o.y + y * unit), v.pt(o.x + (x + w) * unit, o.y + (y + h) * unit), v.pt(o.x + x * unit, o.y + (y + h) * unit)]);
    page.drawSvgPath(quad(0, 0, modules, modules), { x: 0, y: 0, color: rgb(1, 1, 1) });
    // All dark modules in ONE path: abutting squares filled together leave no hairline seams.
    page.drawSvgPath(qrRuns(matrix).map((r) => quad(r.x, r.y, r.w, 1)).join(' '), { x: 0, y: 0, color: rgb(0, 0, 0) });

    if (link) {
      const corners = [v.pt(o.x, o.y), v.pt(o.x + size, o.y + size)];
      const ctx = pdf.context;
      const annot = ctx.register(ctx.obj({
        Type: 'Annot', Subtype: 'Link', Border: [0, 0, 0],
        Rect: [Math.min(corners[0]!.x, corners[1]!.x), Math.min(corners[0]!.y, corners[1]!.y), Math.max(corners[0]!.x, corners[1]!.x), Math.max(corners[0]!.y, corners[1]!.y)],
        A: ctx.obj({ Type: 'Action', S: 'URI', URI: PDFString.of(link) }),
        Contents: PDFHexString.fromText(opts.text.trim()),
      }));
      const existing = page.node.Annots();
      if (existing) existing.push(annot);
      else page.node.set(PDFName.of('Annots'), ctx.obj([annot]));
    }
  }
  return pdf.save();
}
