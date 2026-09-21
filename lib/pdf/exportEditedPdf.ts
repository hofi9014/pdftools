import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { embedFont } from './fonts';

export interface TextEdit {
  id: string
  page: number
  x: number
  y: number
  width: number
  height: number
  originalText: string
  newText: string
  fontSize: number
  fontFamily: string
  color: string
  bold: boolean
  italic: boolean
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

// FINDING (engine, edit-pdf text-position/size, 2026-09-18) — TextBlock/TextEdit's x/y/
// width/height/fontSize are produced by lib/pdf/extractTextBlocks.ts via pdf.js's
// viewport.convertToViewportPoint() and a `* renderScale` multiply, i.e. CANVAS PIXEL space
// at the fixed render scale (1.5) used throughout components/edit-pdf/ — never PDF point
// space. Every caller downstream that needs PIXELS (positioning the edit popup, drawing the
// on-canvas overlay box) works correctly as-is, but this function draws directly onto the
// PDF page via pdf-lib, which only understands POINTS — it was treating the raw pixel-space
// numbers as if they were already points, so every saved text edit (position of the redrawn
// text AND its white-out background box) landed at 1.5x the correct offset and 1.5x the
// correct size on every real document, on every use of edit-pdf's core "click text, retype,
// save" feature. `renderScale` converts back to points; defaults to 1 (no-op) so existing
// callers/tests built directly against point-space TextEdit values are unaffected.
export async function applyTextEdits(pdfDoc: PDFDocument, textEdits: TextEdit[], canvasByPage?: Map<number, HTMLCanvasElement>, renderScale: number = 1): Promise<void> {
  const pages = pdfDoc.getPages();
  const fontkit = await import('@pdf-lib/fontkit');
  (pdfDoc as any).registerFontkit(fontkit.default || fontkit);

  for (const rawEdit of textEdits) {
    if (rawEdit.page < 1 || rawEdit.page > pages.length) continue;
    const edit: TextEdit = renderScale === 1 ? rawEdit : {
      ...rawEdit,
      x: rawEdit.x / renderScale,
      y: rawEdit.y / renderScale,
      width: rawEdit.width / renderScale,
      height: rawEdit.height / renderScale,
      fontSize: rawEdit.fontSize / renderScale,
    };
    // Safe: edit.page is bounds-checked above to be within [1, pages.length].
    const page = pages[edit.page - 1]!;
    const { width, height } = page.getSize();

    const pdfY = height - edit.y - edit.height;

    const bgColor = (() => {
      if (canvasByPage) {
        const canvas = canvasByPage.get(edit.page);
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const scaleX = canvas.width / width;
            const scaleY = canvas.height / height;
            const cx = Math.min(edit.x * scaleX + (edit.width * scaleX) / 2, canvas.width - 1);
            const cy = Math.min(edit.y * scaleY + (edit.height * scaleY) / 2, canvas.height - 1);
            // Safe: a 1x1 getImageData() always yields exactly 4 bytes (RGBA).
            const p = ctx.getImageData(Math.max(0, Math.round(cx)), Math.max(0, Math.round(cy)), 1, 1).data;
            if (p[3]! > 200) return rgb(p[0]! / 255, p[1]! / 255, p[2]! / 255);
          }
        }
      }
      return rgb(1, 1, 1);
    })();

    const margin = 4;
    page.drawRectangle({
      x: edit.x - margin,
      y: pdfY - margin,
      width: edit.width + margin * 2,
      height: edit.height + margin * 2,
      color: bgColor,
    });

    if (!edit.newText || edit.newText.trim().length === 0) continue;

    try {
      const font = await embedFont(pdfDoc, edit.fontFamily || 'Noto Sans', edit.bold ? 700 : 400, edit.italic);
      const lines = edit.newText.split('\n');
      const lineHeight = edit.fontSize * 1.2;
      const color = hexToRgb(edit.color || '#000000');

      const checkFit = (text: string, size: number) => font.widthOfTextAtSize(text, size) <= edit.width;

      let finalSize = edit.fontSize;
      // Safe: String.split always returns a non-empty array, so lines[0] and lines[li]
      // (li < lines.length) always exist.
      if (!checkFit(lines[0]!, finalSize)) {
        while (finalSize > 6 && !checkFit(lines[0]!, finalSize)) finalSize -= 0.5;
      }

      for (let li = 0; li < lines.length; li++) {
        const lineY = pdfY + edit.height - (li + 1) * lineHeight;
        if (lineY < 0) break;
        page.drawText(lines[li]!, { x: edit.x, y: lineY, size: finalSize, font, color: rgb(color.r, color.g, color.b) });
      }
    } catch {
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const color = hexToRgb(edit.color || '#000000');
      const lines = edit.newText.split('\n');
      const lineHeight = edit.fontSize * 1.2;
      for (let li = 0; li < lines.length; li++) {
        page.drawText(lines[li]!, { x: edit.x, y: pdfY + edit.height - (li + 1) * lineHeight, size: edit.fontSize, font, color: rgb(color.r, color.g, color.b) });
      }
    }
  }
}

export async function exportEditedPdf(
  originalFile: File,
  textEdits: TextEdit[],
  canvasByPage?: Map<number, HTMLCanvasElement>,
  renderScale: number = 1,
): Promise<Blob> {
  const buf = await originalFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  await applyTextEdits(pdfDoc, textEdits, canvasByPage, renderScale);
  const bytes = await pdfDoc.save();
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}
