// QR codes for the "Add QR code to PDF" tool (plan 2.5, 2026-11-24): the module grid from
// qrcode-generator, and the code as SVG and as a single vector path. Pure, no DOM.
//
// Text is encoded as UTF-8 bytes. The library's default byte conversion keeps only the low byte of
// each character (Latin-1), which turns "ż" into "|": its conversion is replaced here.
import qrcode from 'qrcode-generator';

/** Error correction M: up to ~15 % of the code can be damaged or covered and it still reads. */
const ECC = 'M' as const;
/** Bytes a version-40 code holds at level M — the most a QR code can carry. */
export const QR_MAX_BYTES = 2331;
/** Light modules around the code, as the QR standard requires (ISO/IEC 18004: 4). */
export const QUIET_ZONE = 4;

const utf8 = (s: string): number[] => Array.from(new TextEncoder().encode(s));

export function qrByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** The dark/light modules of the smallest code that holds `text` (rows top to bottom). */
export function qrMatrix(text: string): boolean[][] {
  if (!text) throw new Error('Empty QR text');
  if (qrByteLength(text) > QR_MAX_BYTES) throw new Error(`QR text too long: ${qrByteLength(text)} > ${QR_MAX_BYTES} bytes`);
  qrcode.stringToBytes = utf8;
  const qr = qrcode(0, ECC);
  qr.addData(text, 'Byte');
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

/**
 * The dark modules as rectangles, in module units with the quiet zone included (0..n+2q), one per
 * horizontal run of dark modules in a row. Drawn as ONE path, so abutting rectangles have no
 * hairline seams between them.
 */
export function qrRuns(matrix: boolean[][], quiet = QUIET_ZONE): { x: number; y: number; w: number }[] {
  const runs: { x: number; y: number; w: number }[] = [];
  matrix.forEach((row, r) => {
    let c = 0;
    while (c < row.length) {
      if (!row[c]) { c++; continue; }
      const start = c;
      while (c < row.length && row[c]) c++;
      runs.push({ x: start + quiet, y: r + quiet, w: c - start });
    }
  });
  return runs;
}

/** SVG path data of the dark modules, one unit per module. */
export function qrPathData(matrix: boolean[][], quiet = QUIET_ZONE): string {
  return qrRuns(matrix, quiet).map((s) => `M${s.x} ${s.y}h${s.w}v1h-${s.w}z`).join('');
}

/** A standalone SVG file: white quiet zone, black modules, `px` pixels wide (scalable). */
export function qrSvg(text: string, px = 512): string {
  const m = qrMatrix(text);
  const size = m.length + QUIET_ZONE * 2;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="#fff"/><path d="${qrPathData(m)}" fill="#000"/></svg>\n`;
}

/** Whether `text` is a web address a PDF viewer can open when the code is clicked. */
export function isWebLink(text: string): boolean {
  try {
    const u = new URL(text.trim());
    return (u.protocol === 'https:' || u.protocol === 'http:') && !/\s/.test(text.trim());
  } catch {
    return false;
  }
}
