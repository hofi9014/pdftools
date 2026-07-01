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

export async function applyTextEdits(pdfDoc: PDFDocument, textEdits: TextEdit[], canvasByPage?: Map<number, HTMLCanvasElement>): Promise<void> {
  const pages = pdfDoc.getPages();
  const fontkit = await import('@pdf-lib/fontkit');
  (pdfDoc as any).registerFontkit(fontkit.default || fontkit);

  for (const edit of textEdits) {
    if (edit.page < 1 || edit.page > pages.length) continue;
    const page = pages[edit.page - 1];
    const { height } = page.getSize();

    const pdfY = height - edit.y - edit.height;

    const bgColor = (() => {
      if (canvasByPage) {
        const canvas = canvasByPage.get(edit.page);
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const scaleX = canvas.width / height;
            const scaleY = canvas.height / height;
            const cx = Math.min(edit.x * scaleX + (edit.width * scaleX) / 2, canvas.width - 1);
            const cy = Math.min(edit.y * scaleY + (edit.height * scaleY) / 2, canvas.height - 1);
            const p = ctx.getImageData(Math.max(0, Math.round(cx)), Math.max(0, Math.round(cy)), 1, 1).data;
            if (p[3] > 200) return rgb(p[0] / 255, p[1] / 255, p[2] / 255);
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
      if (!checkFit(lines[0], finalSize)) {
        while (finalSize > 6 && !checkFit(lines[0], finalSize)) finalSize -= 0.5;
      }

      for (let li = 0; li < lines.length; li++) {
        const lineY = pdfY + edit.height - (li + 1) * lineHeight;
        if (lineY < 0) break;
        page.drawText(lines[li], { x: edit.x, y: lineY, size: finalSize, font, color: rgb(color.r, color.g, color.b) });
      }
    } catch {
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const color = hexToRgb(edit.color || '#000000');
      const lines = edit.newText.split('\n');
      const lineHeight = edit.fontSize * 1.2;
      for (let li = 0; li < lines.length; li++) {
        page.drawText(lines[li], { x: edit.x, y: pdfY + edit.height - (li + 1) * lineHeight, size: edit.fontSize, font, color: rgb(color.r, color.g, color.b) });
      }
    }
  }
}

export async function exportEditedPdf(
  originalFile: File,
  textEdits: TextEdit[],
  canvasByPage?: Map<number, HTMLCanvasElement>,
): Promise<Blob> {
  const buf = await originalFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  await applyTextEdits(pdfDoc, textEdits, canvasByPage);
  const bytes = await pdfDoc.save();
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}
