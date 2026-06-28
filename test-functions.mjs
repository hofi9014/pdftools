import { readFileSync, writeFileSync } from 'fs';
import { convertPdfToImagePages, compressPDFAdvanced } from './lib/pdf-engine.ts';

const buf = readFileSync('./test_plain.pdf');
console.log('Original:', buf.length, 'bytes');

// Test compress
console.log('\n=== Compress ===');
for (const level of ['low', 'recommended', 'extreme']) {
  const c = await compressPDFAdvanced(buf, level);
  const pct = Math.round((1 - c.length / buf.length) * 100);
  console.log(`${level}: ${buf.length} -> ${c.length} bytes (${pct}%)`);
}

// Test pdf-to-jpg
console.log('\n=== PDF-to-JPG ===');
try {
  const images = await convertPdfToImagePages(buf, 1.5, 85);
  console.log(`Pages: ${images.length}`);
  images.forEach((img, i) => {
    console.log(`  Page ${i+1}: ${img.length} bytes, header: ${img.slice(0,8).toString('hex')}`);
    writeFileSync(`test_page_${i+1}.jpg`, img);
  });
} catch (e) {
  console.log('Error:', e.message);
}
