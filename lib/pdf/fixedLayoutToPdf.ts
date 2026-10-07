// A positioned document (see fixedLayoutRead.ts) drawn as a PDF: every page gets its picture and
// every line of text goes exactly where the document says — the baseline and left edge the
// reader worked out, the horizontal scale and letter spacing the writer fitted.
//
// Text is drawn with Liberation Sans, the one family this site ships with full Latin, Cyrillic
// and Greek coverage (the PDF writers for Word and OpenDocument files use nothing else). It has
// Arial's metrics, so text the document sets in Arial comes out at its own width. Text in another
// family (Times New Roman, Courier New…) is squeezed or stretched to the width that family would
// give it, so a line still ends where it ended and never runs into the text beside it; it is
// sans-serif in the PDF all the same.

import {
  PDFDocument, PDFString, concatTransformationMatrix, popGraphicsState, pushGraphicsState, rgb, setCharacterSpacing,
  type PDFFont, type PDFImage,
} from 'pdf-lib';
import type { MeasureText } from './fixedLayout';
import { layoutPlacedBoxes, readFixedDocx, readFixedOdt, type PlacedPage } from './fixedLayoutRead';
import { detectUnsupportedScript } from '../client-pdf-docx';

export interface PlacedPdfOptions {
  /** Font files by name; defaults to the copies served for pdf.js. Tests inject their own loader. */
  loadFontBytes?: (fileName: string) => Promise<Uint8Array>;
  /** Width of text in the family the document names; without it such text keeps Arial's width. */
  measure?: MeasureText;
}

/** Families whose widths are Liberation Sans's own. */
const ARIAL_METRICS = /^(arial|helvetica|liberation sans|arimo)$/i;

const FONT_FILES = {
  r: 'LiberationSans-Regular.ttf', b: 'LiberationSans-Bold.ttf', i: 'LiberationSans-Italic.ttf', bi: 'LiberationSans-BoldItalic.ttf',
} as const;
type FontKey = keyof typeof FONT_FILES;
const fontKey = (bold: boolean, italic: boolean): FontKey => (bold ? (italic ? 'bi' : 'b') : italic ? 'i' : 'r');

/** A fitted scale outside this range is a measuring accident, not a layout. */
const MIN_SQUEEZE = 0.5;
const MAX_SQUEEZE = 2;

function hexToRgb(hex: string): ReturnType<typeof rgb> {
  const n = /^[0-9a-f]{6}$/i.test(hex) ? parseInt(hex, 16) : 0;
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/**
 * The pages as a PDF, or null when the text needs a script the font does not have (Arabic, CJK…)
 * — the callers then take the same path such documents took before.
 */
export async function renderPlacedPagesToPdf(pages: PlacedPage[], opts: PlacedPdfOptions = {}): Promise<Blob | null> {
  const runs = pages.flatMap((p) => p.lines.flatMap((l) => l.segments.flatMap((s) => s.runs)));
  if (runs.some((r) => detectUnsupportedScript(r.text))) return null;

  const load = opts.loadFontBytes ?? (async (name: string) => {
    const res = await fetch(`/pdfjs-dist/standard_fonts/${name}`);
    if (!res.ok) throw new Error(`Font fetch failed: ${name} (${res.status})`);
    return new Uint8Array(await res.arrayBuffer());
  });
  const fontkit = (await import('@pdf-lib/fontkit')).default;
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  // Only the styles the document uses: each embedded font file is a few hundred kilobytes.
  const fonts = new Map<FontKey, PDFFont>();
  for (const key of new Set(runs.map((r) => fontKey(r.bold, r.italic)))) {
    fonts.set(key, await pdf.embedFont(await load(FONT_FILES[key])));
  }
  // A picture shared by several pages is embedded once.
  const pictures = new Map<Uint8Array, PDFImage>();

  for (const src of pages) {
    const page = pdf.addPage([src.width, src.height]);
    const draw = async (pic: { data: Uint8Array; mime: string }, x: number, top: number, width: number, height: number): Promise<void> => {
      let image = pictures.get(pic.data);
      if (!image) {
        image = pic.mime === 'image/png' ? await pdf.embedPng(pic.data) : await pdf.embedJpg(pic.data);
        pictures.set(pic.data, image);
      }
      page.drawImage(image, { x, y: src.height - top - height, width, height });
    };
    if (src.background) await draw(src.background, 0, 0, src.width, src.height);
    // The page's photos, bottom to top, above the page picture and under the text.
    for (const pic of src.pictures ?? []) await draw(pic, pic.x, pic.y, pic.width, pic.height);
    for (const line of src.lines) {
      for (const seg of line.segments) {
        let x = seg.x;
        for (const r of seg.runs) {
          const font = fonts.get(fontKey(r.bold, r.italic))!;
          const size = r.fontSize;
          const natural = font.widthOfTextAtSize(r.text, size);
          const spacing = r.spacingTw / 20;
          const count = [...r.text].length;
          const named = ARIAL_METRICS.test(r.font) ? natural : opts.measure?.(r.text, r.font, r.bold, r.italic, size) ?? natural;
          const squeeze = natural > 0 ? Math.min(MAX_SQUEEZE, Math.max(MIN_SQUEEZE, named * r.scale / 100 / natural)) : 1;
          const width = natural * squeeze + spacing * count;
          const y = src.height - line.baseline + r.raise;
          if (r.text.trim()) {
            const color = hexToRgb(r.color);
            // The scale is a transformation, so the letter spacing (set in the scaled space) is
            // divided by it to stay what the document asked for.
            page.pushOperators(pushGraphicsState(), concatTransformationMatrix(squeeze, 0, 0, 1, x, y), setCharacterSpacing(spacing / squeeze));
            page.drawText(r.text, { x: 0, y: 0, size, font, color });
            page.pushOperators(popGraphicsState());
            if (r.underline) page.drawLine({ start: { x, y: y - size * 0.1 }, end: { x: x + width, y: y - size * 0.1 }, thickness: Math.max(0.4, size / 18), color });
            if (r.link && /^(https?:|mailto:)/i.test(r.link)) {
              const annot = pdf.context.obj({
                Type: 'Annot', Subtype: 'Link', Rect: [x, y - size * 0.22, x + width, y + size * 0.8], Border: [0, 0, 0],
                A: pdf.context.obj({ Type: 'Action', S: 'URI', URI: PDFString.of(r.link) }),
              });
              page.node.addAnnot(pdf.context.register(annot));
            }
          }
          x += width;
        }
      }
    }
  }
  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}

/** Metrics for the families a document names besides Arial; undefined when none (or unavailable). */
async function metricsFor(pages: PlacedPage[]): Promise<MeasureText | undefined> {
  const variants = new Map<string, { family: string; bold: boolean; italic: boolean }>();
  const add = (r: { font: string; bold: boolean; italic: boolean }, always: boolean): void => {
    if (always || !ARIAL_METRICS.test(r.font)) variants.set(`${r.font}|${r.bold}|${r.italic}`, { family: r.font, bold: r.bold, italic: r.italic });
  };
  for (const p of pages) {
    for (const l of p.lines) for (const s of l.segments) for (const r of s.runs) add(r, false);
    // Text in frames has to be wrapped first, and that needs every family's widths, Arial's too.
    for (const b of p.boxes ?? []) for (const para of b.paragraphs) for (const line of para.lines) for (const r of line) add(r, true);
  }
  if (variants.size === 0) return undefined;
  try {
    const { createFixedLayoutMetrics } = await import('./fixedLayoutPdf');
    const metrics = createFixedLayoutMetrics();
    await metrics.ensure(variants.values());
    return metrics.measure;
  } catch {
    return undefined;
  }
}

async function positionedToPdf(pages: PlacedPage[] | null, opts: PlacedPdfOptions): Promise<Blob | null> {
  if (!pages) return null;
  const measure = opts.measure ?? await metricsFor(pages);
  layoutPlacedBoxes(pages, measure);
  return renderPlacedPagesToPdf(pages, { ...opts, ...(measure ? { measure } : {}) });
}

/**
 * Word -> PDF for a document laid out by position (what PDF -> Word writes in its faithful
 * layout). Null for every other document: the caller then converts it the ordinary way.
 */
export async function positionedDocxToPdf(file: Blob, opts: PlacedPdfOptions = {}): Promise<Blob | null> {
  return positionedToPdf(await readFixedDocx(file), opts);
}

/** The same for OpenDocument text. */
export async function positionedOdtToPdf(file: Blob, opts: PlacedPdfOptions = {}): Promise<Blob | null> {
  return positionedToPdf(await readFixedOdt(file), opts);
}
