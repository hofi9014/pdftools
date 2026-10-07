// Word (.docx) writer for the fixed page layout — see fixedLayout.ts for the model and the
// reasons behind it. One PDF page = one Word page:
//
//   - a 1 pt paragraph at the very top that starts the page and carries the page picture
//     (anchored to the page, behind the text),
//   - then the page's blocks: paragraphs with an exact line height and space before, text placed
//     with an indent (one piece of text on the line) or with tab stops (several), and borderless
//     fixed-width tables for side-by-side columns.
//
// Page margins are zero and every position is measured from the page's own edges, so nothing
// depends on a margin the reader's word processor might adjust.

import type { FixedBlock, FixedColumnsBlock, FixedLine, FixedPageLayout, FixedRun, FixedTextBlock } from './fixedLayout';
import { FIXED_AFTER_TABLE_PT, FIXED_PAGE_HEAD_PT, FIXED_PAGE_TAIL_PT } from './fixedLayout';
import { protectSingleCharRuns } from './docxRunSafety';

/** A photo of the page as a picture of its own (see cutOutPictures in fixedLayoutPdf.ts). */
export interface FixedPicture {
  /** Top-left corner and size on the page, points from the page's top-left corner. */
  x: number;
  y: number;
  width: number;
  height: number;
  data: Uint8Array;
  mime: 'image/jpeg' | 'image/png';
}

export interface FixedPage {
  layout: FixedPageLayout;
  /** The page without its (placed) text and without `pictures`, as a picture; absent = plain white page. */
  background?: { data: Uint8Array; mime: 'image/jpeg' | 'image/png' };
  /** The page's photos, in painting order: above the background, behind the text. */
  pictures?: FixedPicture[];
}

const tw = (pt: number): number => Math.round(pt * 20);

/** Word accepts 1…31680 twips for most measures; an exact line must be at least one twip. */
const lineTw = (pt: number): number => Math.max(1, tw(pt));

export async function renderFixedPagesToDocx(pages: FixedPage[]): Promise<Blob> {
  const {
    Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle,
    ExternalHyperlink, Tab, TabStopType, LineRuleType, HeightRule, TableLayoutType,
    HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType, PageOrientation,
  } = await import('docx');

  const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'auto' } as const;
  const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER } as const;
  const NO_CELL_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER } as const;
  const ZERO_MARGINS = { top: 0, bottom: 0, left: 0, right: 0, marginUnitType: WidthType.DXA } as const;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textRun = (r: FixedRun, leadingTab: boolean): any => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts: any = {
      children: leadingTab ? [new Tab(), r.text] : [r.text],
      font: r.font,
      size: Math.max(2, Math.round(r.fontSize * 2)),
      // A link keeps the colour it has in the PDF, and its underline is part of the page picture.
      color: r.color,
    };
    if (r.bold) opts.bold = true;
    if (r.italic) opts.italics = true;
    if (r.underline) opts.underline = {};
    if (r.scale !== 100) opts.scale = r.scale;
    if (r.spacingTw !== 0) opts.characterSpacing = r.spacingTw;
    // Written as "<n>pt" by the library; rewritten to whole half-points below (see fixPositions).
    if (Math.abs(r.raise) >= 0.5) opts.position = `${(Math.round(r.raise * 2) / 2).toFixed(1)}pt`;
    const run = new TextRun(opts);
    return r.link ? new ExternalHyperlink({ link: r.link, children: [run] }) : run;
  };

  /** The runs of one line; positions are relative to `originX` (the container's left edge). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineRuns = (line: FixedLine, useTabs: boolean): any[] => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: any[] = [];
    for (const seg of line.segments) {
      // OpenOffice drops a run that is a lone "ć"/"č" — see docxRunSafety.ts.
      protectSingleCharRuns(seg.runs).forEach((r, i) => out.push(textRun(r, useTabs && i === 0)));
    }
    return out;
  };

  /**
   * Emits the blocks of one container. `originX` is the container's left edge and `startY` the
   * top of its free space (page coordinates). Heights are rounded cumulatively, so a page of
   * eighty paragraphs ends within a twentieth of a point of where it should.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emitBlocks = (blocks: FixedBlock[], originX: number, startY: number): any[] => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: any[] = [];
    let exact = startY;
    let emitted = tw(startY);

    const emitText = (b: FixedTextBlock): void => {
      const height = lineTw(b.lineHeight);
      const before = Math.max(0, tw(exact + b.before) - emitted);
      const single = b.lines.every((l) => l.segments.length === 1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const children: any[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const para: any = { spacing: { before, after: 0, line: height, lineRule: LineRuleType.EXACT } };
      if (single) {
        // One piece of text per line: a plain indent, and line breaks between the lines.
        para.indent = { left: Math.max(0, tw(b.lines[0]!.segments[0]!.x - originX)) };
        b.lines.forEach((line, i) => {
          if (i > 0) children.push(new TextRun({ break: 1 }));
          children.push(...lineRuns(line, false));
        });
      } else {
        // Several pieces on the line: each starts at its own tab stop (the first one too, so the
        // result does not depend on whether tab positions count from the indent or the margin).
        const line = b.lines[0]!;
        para.tabStops = line.segments.map((s) => ({ type: TabStopType.LEFT, position: Math.max(1, tw(s.x - originX)) }));
        children.push(...lineRuns(line, true));
      }
      out.push(new Paragraph({ ...para, children }));
      emitted += before + height * b.lines.length;
      exact += b.before + b.lineHeight * b.lines.length;
    };

    const emitColumns = (b: FixedColumnsBlock): void => {
      const widths = b.columns.map((c) => Math.max(20, tw(c.width)));
      const cells = b.columns.map((c, i) => new TableCell({
        width: { size: widths[i]!, type: WidthType.DXA },
        margins: ZERO_MARGINS,
        borders: NO_CELL_BORDERS,
        children: (() => {
          const inner = emitBlocks(c.blocks, c.x, b.top);
          // A cell must end with a paragraph; after a nested table that is the 1 pt separator,
          // an empty column gets one too.
          const last = c.blocks[c.blocks.length - 1];
          if (!last || last.kind === 'columns') inner.push(tinyParagraph());
          return inner;
        })(),
      }));
      const height = Math.max(20, tw(b.top + b.height) - emitted);
      out.push(new Table({
        layout: TableLayoutType.FIXED,
        width: { size: widths.reduce((a, w) => a + w, 0), type: WidthType.DXA },
        indent: { size: Math.max(0, tw(b.columns[0]!.x - originX)), type: WidthType.DXA },
        columnWidths: widths,
        margins: ZERO_MARGINS,
        borders: NO_BORDERS,
        rows: [new TableRow({ height: { value: height, rule: HeightRule.ATLEAST }, cantSplit: true, children: cells })],
      }));
      out.push(tinyParagraph());
      emitted += height + tw(FIXED_AFTER_TABLE_PT);
      exact = b.top + b.height + FIXED_AFTER_TABLE_PT;
    };

    for (const b of blocks) {
      if (b.kind === 'text') emitText(b);
      else emitColumns(b);
    }
    return out;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tinyParagraph = (extra: any = {}): any => new Paragraph({
    spacing: { before: 0, after: 0, line: tw(FIXED_AFTER_TABLE_PT), lineRule: LineRuleType.EXACT },
    children: [],
    ...extra,
  });

  // Pages of one size share a section; a change of size starts a new one.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sections: any[] = [];
  let currentKey = '';
  pages.forEach((page, pageIdx) => {
    const { layout } = page;
    const key = `${tw(layout.width)}x${tw(layout.height)}`;
    const newSection = key !== currentKey;
    if (newSection) {
      currentKey = key;
      sections.push({
        properties: {
          page: {
            // The library swaps the two for a landscape page, so it is given the short side first.
            size: layout.width > layout.height
              ? { width: tw(layout.height), height: tw(layout.width), orientation: PageOrientation.LANDSCAPE }
              : { width: tw(layout.width), height: tw(layout.height) },
            margin: { top: 0, bottom: 0, left: 0, right: 0, header: 0, footer: 0, gutter: 0 },
          },
        },
        children: [],
      });
    }
    const children = sections[sections.length - 1].children as unknown[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const head: any = {
      spacing: { before: 0, after: 0, line: tw(FIXED_PAGE_HEAD_PT), lineRule: LineRuleType.EXACT },
      children: [],
    };
    // A new section already starts on a new page.
    if (pageIdx > 0 && !newSection) head.pageBreakBefore = true;
    // Anchored to the page, behind the text: the page picture first, then each photo above it.
    // zIndex is the stacking order among the pictures behind the text; it starts at 1 because
    // the library takes 0 for "not set" and writes a huge default — the page picture would then
    // lie ABOVE the photos in Word.
    const anchored = (pic: { data: Uint8Array; mime: string }, x: number, y: number, width: number, height: number, zIndex: number): unknown => new ImageRun({
      type: pic.mime === 'image/png' ? 'png' : 'jpg',
      data: pic.data,
      // The docx library takes pixels at 96 dpi (1 pt = 4/3 px) and offsets in EMU (1 pt = 12700).
      transformation: { width: width * 4 / 3, height: height * 4 / 3 },
      floating: {
        horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: Math.round(x * 12700) },
        verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: Math.round(y * 12700) },
        behindDocument: true,
        allowOverlap: true,
        lockAnchor: true,
        zIndex,
        wrap: { type: TextWrappingType.NONE },
      },
    });
    if (page.background) head.children.push(anchored(page.background, 0, 0, layout.width, layout.height, 1));
    (page.pictures ?? []).forEach((pic, i) => head.children.push(anchored(pic, pic.x, pic.y, pic.width, pic.height, i + 2)));
    children.push(new Paragraph(head));
    children.push(...emitBlocks(layout.blocks, 0, FIXED_PAGE_HEAD_PT));
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 20 },
          paragraph: { spacing: { before: 0, after: 0 } },
        },
      },
    },
    sections,
  });
  return fixDocumentXml(await Packer.toBlob(doc));
}

/**
 * Two things the docx library writes that have to be corrected in the finished document:
 *
 *  - a raised/lowered run as <w:position w:val="1.5pt"/>. The schema also allows a plain number
 *    of half-points, and that is the only form Apache OpenOffice reads — given "1.5pt" it blew
 *    the text up to several times its size;
 *  - the paragraph that ends a section (pages of another size follow) with no spacing at all,
 *    i.e. a full default line under a page that is already full, which would spill onto an empty
 *    extra page. It gets the same 1 pt exact height as the other structural paragraphs.
 */
async function fixDocumentXml(blob: Blob): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const file = zip.file('word/document.xml');
  if (!file) return blob;
  const xml = await file.async('string');
  const fixed = xml
    .replace(/<w:position w:val="(-?\d+(?:\.\d+)?)pt"\/>/g, (_m, v: string) => `<w:position w:val="${Math.round(parseFloat(v) * 2)}"/>`)
    .replace(/<w:p><w:pPr><w:sectPr>/g, `<w:p><w:pPr><w:spacing w:after="0" w:before="0" w:line="${tw(FIXED_PAGE_TAIL_PT)}" w:lineRule="exact"/><w:sectPr>`);
  if (fixed === xml) return blob;
  zip.file('word/document.xml', fixed);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE' });
}
