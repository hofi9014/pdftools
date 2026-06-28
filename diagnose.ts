import { readFileSync } from 'fs';
import { PDFDocument, PDFName, PDFRawStream, PDFRef } from 'pdf-lib';

async function main() {
  const filePath = process.argv[2];
  if (!filePath) { console.error('Usage: npx tsx diagnose.ts <path-to-pdf>'); process.exit(1); }

  const buf = readFileSync(filePath);
  console.log('File size:', (buf.length / 1024).toFixed(2), 'KB');

  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  const ctx = pdf.context;

  let jpegCount = 0, flateImgCount = 0, flateOtherCount = 0;
  let jpegBytes = 0, flateImgBytes = 0, flateOtherBytes = 0;

  for (const [, obj] of ctx.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream) || !obj.dict) continue;

    const fRaw = obj.dict.get(PDFName.of('Filter'));
    const filters: string[] = !fRaw || typeof fRaw !== 'object'
      ? []
      : typeof (fRaw as any).asArray === 'function'
        ? (fRaw as any).asArray().map((e: unknown) => String(e))
        : [String(fRaw)];

    const isImg = obj.dict.get(PDFName.of('Subtype')) && String(obj.dict.get(PDFName.of('Subtype'))!) === '/Image';
    const isJpeg = filters.includes('/DCTDecode');
    const isFlate = filters.includes('/FlateDecode');

    if (isImg && isJpeg) { jpegCount++; jpegBytes += obj.contents.length; }
    else if (isImg && isFlate) {
      flateImgCount++; flateImgBytes += obj.contents.length;
      const cs = obj.dict.get(PDFName.of('ColorSpace'));
      const csStr = cs ? String(cs) : '(none)';
      const w = obj.dict.get(PDFName.of('Width'));
      const h = obj.dict.get(PDFName.of('Height'));
      const bpc = obj.dict.get(PDFName.of('BitsPerComponent'));
      const dp = obj.dict.get(PDFName.of('DecodeParms'));
      let dpDetail = '(none)';
      if (dp) {
        if (dp instanceof PDFRef) {
          try {
            const dpObj = (pdf.context as any).lookup(dp);
            const predVal = dpObj ? dpObj.get(PDFName.of('Predictor')) : null;
            dpDetail = `Predictor=${String(predVal ?? '?')}`;
          } catch { dpDetail = `ref:${dp.toString()}`; }
        } else if (typeof (dp as any).asArray === 'function') {
          dpDetail = '[' + (dp as any).asArray().map((e: unknown) => String(e)).join(' ') + ']';
        } else {
          dpDetail = String(dp);
        }
      }
      console.log(`  Image #${flateImgCount}: ${w}x${h} bpc=${bpc} CS="${csStr}" DP=${dpDetail} size=${(obj.contents.length / 1024).toFixed(1)}KB`);
    }
    else if (isFlate) { flateOtherCount++; flateOtherBytes += obj.contents.length; }
  }

  console.log('Pages:', pdf.getPageCount());
  console.log('JPEG images:', jpegCount, '-', (jpegBytes / 1024).toFixed(1), 'KB =', (jpegBytes / buf.length * 100).toFixed(1), '%');
  console.log('FlateDecode images:', flateImgCount, '-', (flateImgBytes / 1024).toFixed(1), 'KB =', (flateImgBytes / buf.length * 100).toFixed(1), '%');
  console.log('Other FlateDecode streams:', flateOtherCount, '-', (flateOtherBytes / 1024).toFixed(1), 'KB');

  const known = jpegBytes + flateImgBytes + flateOtherBytes;
  console.log('Stream data total:', (known / 1024).toFixed(1), 'KB =', (known / buf.length * 100).toFixed(1), '%');
  console.log('Non-stream data:', ((buf.length - known) / 1024).toFixed(1), 'KB');

  const hasInfo = !!(ctx.trailerInfo as Record<string, unknown>).Info;
  const hasMetadata = pdf.catalog.get(PDFName.of('Metadata')) != null;
  console.log('Has Info:', hasInfo, '| Has XMP Metadata:', hasMetadata);
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
