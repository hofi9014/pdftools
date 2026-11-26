// Undoing PNG predictors (DecodeParms /Predictor 10-15) of Flate-compressed image data.
// Moved from lib/pdf/extractPdfImages.ts so the grayscale tool can use it without the PDF engine.

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function unfilterPng(data: Uint8Array, width: number, height: number, channels: number): Uint8Array {
  const stride = width * channels;
  const result = new Uint8Array(height * stride);
  let srcOff = 0;
  let dstOff = 0;
  for (let y = 0; y < height; y++) {
    const filterType = data[srcOff++];
    const row = data.subarray(srcOff, srcOff + stride);
    srcOff += stride;
    const prevOff = dstOff - stride;
    // Safe: x < stride === row.length by the loop bound; dstOff/prevOff + x(-channels) always
    // lands on an already-written earlier position in `result` (or is skipped via the x>=channels /
    // y>0 guards), never past what has been written so far.
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? result[dstOff + x - channels]! : 0;
      const b = y > 0 ? result[prevOff + x]! : 0;
      const c = y > 0 && x >= channels ? result[prevOff + x - channels]! : 0;
      let raw: number;
      switch (filterType) {
        case 0:
          raw = row[x]!;
          break;
        case 1:
          raw = (row[x]! + a) & 0xff;
          break;
        case 2:
          raw = (row[x]! + b) & 0xff;
          break;
        case 3:
          raw = (row[x]! + Math.floor((a + b) / 2)) & 0xff;
          break;
        case 4:
          raw = (row[x]! + paeth(a, b, c)) & 0xff;
          break;
        default:
          raw = row[x]!;
      }
      result[dstOff + x] = raw;
    }
    dstOff += stride;
  }
  return result;
}

