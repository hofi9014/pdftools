// IR types shared between extraction (client-pdf.ts) and rendering (docx)
// This file has ZERO browser dependencies — only `docx`.

// ============================================================
// IR TYPES (Phase 1a — without TableBlock)
// ============================================================

export interface IRPoint { x: number; y: number; }
export interface IRRect { x: number; y: number; width: number; height: number; }

export interface IRTextRun {
  text: string;
  fontName: string;
  fontSize: number;
  width: number;
  height: number;
  position: IRPoint;
  color: string;
  bold: boolean;
  italic: boolean;
  rotation: number;
}

export interface IRParagraphBlock {
  kind: 'paragraph';
  runs: IRTextRun[];
  bounds: IRRect;
  role?: 'header' | 'footer' | 'body';
}

export interface IRHeadingBlock {
  kind: 'heading';
  level: number;
  runs: IRTextRun[];
  bounds: IRRect;
  role?: 'header' | 'footer' | 'body';
}

export interface IRListItemBlock {
  kind: 'list-item';
  marker: string;
  level: number;
  runs: IRTextRun[];
  bounds: IRRect;
}

export interface IRImageBlock {
  kind: 'image';
  imageId: string;
  naturalWidth: number;
  naturalHeight: number;
  bounds: IRRect;
}

export interface IRTableCell {
  runs: IRTextRun[];
  colspan: number;
  rowspan: number;
}

export interface IRTableBlock {
  kind: 'table';
  cells: IRTableCell[][];  // cells[row][col], only top-left of merged cells
  bounds: IRRect;
  columnWidths: number[];
}

export type IRBlock = IRParagraphBlock | IRHeadingBlock | IRListItemBlock | IRImageBlock | IRTableBlock;

export interface IRPageIR {
  width: number;
  height: number;
  blocks: IRBlock[];
}

// ============================================================
// IR → DOCX RENDERER
// ============================================================

const IR_HEADING_MAP: Record<number, string> = {
  1: 'Heading1', 2: 'Heading2', 3: 'Heading3',
  4: 'Heading4', 5: 'Heading5', 6: 'Heading6',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function irRunsToTextRuns(TRC: any, runs: IRTextRun[]): any[] {
  return runs.map(run => new TRC({
    text: run.text,
    bold: run.bold || undefined,
    italics: run.italic || undefined,
    color: run.color.replace('#', ''),
    size: Math.round(run.fontSize * 2),
    font: run.fontName || undefined,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function irRunsToTextRunsRotated(TRC: any, runs: IRTextRun[], rotation: number): any[] {
  const prefix = new TRC({
    text: `[Obrócony tekst ${Math.round(rotation)}°: "`,
    italics: true,
    color: '888888',
    size: 10,
  });
  const content = runs.map(run => new TRC({
    text: run.text,
    italics: true,
    color: '888888',
    size: Math.round(run.fontSize * 2),
    font: run.fontName || undefined,
  }));
  const suffix = new TRC({
    text: '"]',
    italics: true,
    color: '888888',
    size: 10,
  });
  return [prefix, ...content, suffix];
}

export async function renderIRToDocx(pages: IRPageIR[]): Promise<Blob> {
  const {
    Document, Packer, Paragraph, HeadingLevel, TextRun,
    Table, TableRow, TableCell, WidthType, BorderStyle,
  } = await import('docx');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allChildren: any[] = [];

  for (const page of pages) {
    for (const block of page.blocks) {
      if (block.kind === 'table') {
        const table = block as IRTableBlock;
        const docxRows = table.cells.map(row =>
          new TableRow({
            children: row.map(cell => {
              if (!cell) return new TableCell({ children: [new Paragraph('')] });
              const paragraphs = cell.runs.length > 0
                ? [new Paragraph({ children: irRunsToTextRuns(TextRun, cell.runs) })]
                : [new Paragraph('')];
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const opts: any = { children: paragraphs };
              if (cell.colspan > 1) opts.columnSpan = cell.colspan;
              if (cell.rowspan > 1) opts.rowSpan = cell.rowspan;
              return new TableCell(opts);
            }),
          })
        );

        // columnWidths from IR are in PDF points; docx columnWidths expects DXA (1pt = 20 DXA)
        allChildren.push(new Table({
          rows: docxRows,
          columnWidths: table.columnWidths.map(w => Math.round(w * 20)),
          width: { size: Math.round(table.columnWidths.reduce((a, b) => a + b, 0) * 20), type: WidthType.DXA },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
          },
        }));
        continue;
      }

      const hasRotation = 'runs' in block && (block as { runs: IRTextRun[] }).runs.some(r => Math.abs(r.rotation) > 1);

      if (block.kind === 'image') {
        const img = block as IRImageBlock;
        allChildren.push(new Paragraph({
          children: [new TextRun({
            text: `[Image: ${img.naturalWidth}×${img.naturalHeight}]`,
            italics: true,
            color: '888888',
          })],
        }));
      } else if (block.kind === 'heading') {
        const h = block as IRHeadingBlock;
        const level = Math.min(Math.max(h.level, 1), 6);
        const headingKey = IR_HEADING_MAP[level] as keyof typeof HeadingLevel;
        if (hasRotation) {
          allChildren.push(new Paragraph({
            children: irRunsToTextRunsRotated(TextRun, h.runs, h.runs[0]?.rotation ?? 0),
          }));
        } else {
          allChildren.push(new Paragraph({
            heading: HeadingLevel[headingKey],
            children: irRunsToTextRuns(TextRun, h.runs),
          }));
        }
      } else if (block.kind === 'list-item') {
        const li = block as IRListItemBlock;
        const level = Math.min(li.level, 8);
        if (hasRotation) {
          allChildren.push(new Paragraph({
            children: irRunsToTextRunsRotated(TextRun, li.runs, li.runs[0]?.rotation ?? 0),
          }));
        } else {
          allChildren.push(new Paragraph({
            bullet: { level },
            children: irRunsToTextRuns(TextRun, li.runs),
          }));
        }
      } else {
        const p = block as IRParagraphBlock;
        if (hasRotation) {
          allChildren.push(new Paragraph({
            children: irRunsToTextRunsRotated(TextRun, p.runs, p.runs[0]?.rotation ?? 0),
          }));
        } else {
          allChildren.push(new Paragraph({
            children: irRunsToTextRuns(TextRun, p.runs),
          }));
        }
      }
    }
  }

  const doc = new Document({
    sections: [{ children: allChildren }],
  });
  return await Packer.toBlob(doc);
}
