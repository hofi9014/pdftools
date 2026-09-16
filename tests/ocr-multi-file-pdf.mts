// Audit finding U4 — OCR multi-file PDF data loss. app/ocr-pdf/page.tsx's OCR loop ran
// ocrPdfClient() once per uploaded file, but only ever kept the FIRST file's OCR'd PDF
// bytes (`if (i === 0) setPdfData(result.pdfData)`); files 2..N's OCR'd PDF output was
// silently discarded. Worse, the success banner for multi-file runs explicitly promised
// "All pages processed! Download ZIP with results." (page.ocr.success_zip, translated in
// all 16 locales) — but `downloadPDF()` only ever offered the single stored PDF as
// 'ocr-wyniki.pdf', and the `JSZip` import at the top of the file was never actually used
// anywhere. Text/DOCX downloads were unaffected (allText.push(result.text) already
// accumulated every file correctly) — only the PDF download path lost data.
//
// The full fix touches client state (React hooks) and dynamic OCR/Tesseract loading that
// aren't practical to mount in a Node test here, so — like the U2 fix in the same audit —
// this verifies the defect and the fix at the source level: the exact buggy pattern is gone,
// every file's result is unconditionally collected, and the ZIP path the UI already promises
// is actually wired to the shared, already-tested lib/client-pdf.ts `downloadZip` helper
// (used the same way by app/split/page.tsx).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== U4: OCR keeps every file\'s PDF output, and the promised ZIP is real ===');

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'app', 'ocr-pdf', 'page.tsx'), 'utf-8');

check(!/if \(i === 0\) setPdfData/.test(src), 'the "only keep file #0" pattern is gone from source');
check(!/import JSZip from 'jszip'/.test(src), 'the dead, never-used JSZip import is gone');
check(src.includes("import { downloadZip } from '@/lib/client-pdf'"), 'imports the shared, already-tested downloadZip helper instead');

// The OCR loop must push every file's result unconditionally (no `if (i === 0)` guard),
// into a plain array collected across the whole loop.
const loopMatch = src.match(/for \(let i = 0; i < files\.length; i\+\+\) \{[\s\S]*?\n {6}\}/);
check(!!loopMatch, 'sanity: found the OCR per-file loop');
if (loopMatch) {
  const loopBody = loopMatch[0];
  check(/pdfEntries\.push\(\{[^}]*data: result\.pdfData/.test(loopBody), 'every loop iteration unconditionally pushes result.pdfData into pdfEntries (not gated by file index)');
  check(!/if \(i === 0\)/.test(loopBody), 'no "only the first file" conditional remains anywhere in the loop');
}

// downloadPDF must branch on how many results there are, and use the ZIP helper for >1 —
// matching the "All pages processed! Download ZIP" promise shown to the user in that case.
const downloadPdfMatch = src.match(/const downloadPDF = async \(\) => \{[\s\S]*?\n {2}\};/);
check(!!downloadPdfMatch, 'sanity: found the downloadPDF function');
if (downloadPdfMatch) {
  const fn = downloadPdfMatch[0];
  check(/pdfResults\.length === 1/.test(fn), 'downloadPDF branches explicitly on the single-file case');
  check(/downloadZip\(pdfResults\)/.test(fn), 'downloadPDF calls downloadZip with ALL results (not just one) for the multi-file case');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
