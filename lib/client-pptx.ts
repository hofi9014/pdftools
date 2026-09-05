// PPTX IR types + writer (Component C1: pdf-to-powerpoint)
// A slide is positioned absolutely (x/y/w/h), unlike docx's flowing paragraphs
// or xlsx's row/col grid. So this uses its OWN IR model (IRSlide + elements),
// never IRPageIR/IRSpreadsheet. Units are points internally (matches PDF user
// space); converted to inches (÷72) and Y-flipped at write time for pptxgenjs.
// Dependencies: pptxgenjs

export const PT_PER_INCH = 72;

import type { IRTableCell } from './client-pdf-docx';

export interface IRPtRect {
  x: number; // points, top-left origin (Y grows DOWN, like pptxgenjs, unlike raw PDF)
  y: number;
  width: number;
  height: number;
}

export interface IRTextContent {
  text: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  color: string; // '#RRGGBB' or ''
  align: 'left' | 'center' | 'right' | 'justify';
}

export type IRSlideElement =
  | { kind: 'textbox'; bounds: IRPtRect; content: IRTextContent }
  | { kind: 'image'; bounds: IRPtRect; dataBase64: string }
  | { kind: 'shape'; bounds: IRPtRect; shape: 'rect'; fill: string; stroke: string }
  | { kind: 'table'; bounds: IRPtRect; rows: number; cols: number; cells: IRTableCell[][]; columnWidths: number[] };

export interface IRSlide {
  // Per-slide page size in points. MUST equal the deck's widthPt/heightPt —
  // renderIRToPptx enforces this (throws if a slide's dims diverge from the
  // deck's). Carried on the slide because C3 derives per-page size for the
  // "inconsistent page dimensions" warning before normalizing the deck; by
  // write time they are always identical, so the field is a contract, not a
  // per-slide override.
  widthPt: number;
  heightPt: number;
  elements: IRSlideElement[];
}

export interface IRDeck {
  widthPt: number;
  heightPt: number;
  slides: IRSlide[];
}

// PPTX colors are bare hex 'RRGGBB'; IR uses '#RRGGBB'. Strip the hash.
function hexColor(color: string): string | undefined {
  const c = color.replace(/^#/, '');
  return /^[0-9a-fA-F]{6}$/.test(c) ? c : undefined;
}

export async function renderIRToPptx(deck: IRDeck): Promise<Blob> {
  const pptxgen = (await import('pptxgenjs')).default;
  const pres = new pptxgen();

  // Dynamic layout: recreate the source page's aspect ratio exactly (pt -> in).
  // A 4:3 PDF yields a 4:3 slide, 16:9 -> 16:9, A4-portrait -> A4-portrait —
  // elements map 1:1, no scaling distortion.
  const layoutName = `pt_${Math.round(deck.widthPt * 10)}_${Math.round(deck.heightPt * 10)}`;
  const layoutW = deck.widthPt / PT_PER_INCH;
  const layoutH = deck.heightPt / PT_PER_INCH;
  pres.defineLayout({ name: layoutName, width: layoutW, height: layoutH });
  pres.layout = layoutName;

  for (const slide of deck.slides) {
    // Contract guarantee: a slide whose dims diverge from the deck's would
    // render with incorrect geometry against the layout — never silent.
    if (slide.widthPt !== deck.widthPt || slide.heightPt !== deck.heightPt) {
      throw new Error(
        `IRSlide dims (${slide.widthPt}x${slide.heightPt}) diverge from IRDeck layout (${deck.widthPt}x${deck.heightPt}); ` +
        'normalize page sizes to the deck dims before writing');
    }
    const s = pres.addSlide();
    for (const el of slide.elements) {
      const x = el.bounds.x / PT_PER_INCH;
      const y = el.bounds.y / PT_PER_INCH;
      const w = el.bounds.width / PT_PER_INCH;
      const h = el.bounds.height / PT_PER_INCH;
      switch (el.kind) {
        case 'textbox': {
          const c = el.content;
          const color = hexColor(c.color);
          s.addText(c.text, {
            x, y, w, h,
            fontSize: c.fontSize,
            bold: c.bold,
            italic: c.italic,
            color: color ?? '000000',
            align: c.align,
            valign: 'top',
          });
          break;
        }
        case 'image':
          s.addImage({ x, y, w, h, data: el.dataBase64 });
          break;
        case 'shape': {
          const opts: Record<string, unknown> = { x, y, w, h };
          const fill = hexColor(el.fill);
          if (fill && el.fill !== 'transparent') opts.fill = { color: fill };
          const stroke = hexColor(el.stroke);
          if (stroke) opts.line = { color: stroke, width: 1 };
          s.addShape('rect', opts);
          break;
        }
        case 'table': {
          // Native colspan/rowspan table via pptxgenjs addTable. Merged grid
          // slots are emitted EXACTLY ONCE (the anchor cell): pptxgenjs expands
          // colspan/rowspan anchors into merge-mask cells itself ("lopsided
          // rows" contract — covered positions must be absent from the rows).
          const covered = new Set<string>();
          const tabRows: { text: string; options?: object }[][] = [];
          for (let r = 0; r < el.rows; r++) {
            const tabRow: { text: string; options?: object }[] = [];
            for (let c = 0; c < el.cols; c++) {
              if (covered.has(`${r}:${c}`)) continue;
              const cell = el.cells[r][c];
              const colspan = cell.colspan ?? 1;
              const rowspan = cell.rowspan ?? 1;
              for (let rr = r; rr < r + rowspan; rr++) {
                for (let cc = c; cc < c + colspan; cc++) covered.add(`${rr}:${cc}`);
              }
              const text = (cell.runs ?? []).map(run => run.text).join('\n');
              const options =
                colspan > 1 || rowspan > 1
                  ? { ...(colspan > 1 ? { colspan } : {}), ...(rowspan > 1 ? { rowspan } : {}) }
                  : undefined;
              tabRow.push({ text, options });
            }
            tabRows.push(tabRow);
          }
          s.addTable(tabRows, {
            x,
            y,
            w: el.bounds.width / PT_PER_INCH,
            h: el.bounds.height / PT_PER_INCH,
            colW: el.columnWidths.length === el.cols
              ? el.columnWidths.map(pt => pt / PT_PER_INCH)
              : undefined,
          });
          break;
        }
      }
    }
  }

  return (await pres.write({ outputType: 'blob' })) as Blob;
}