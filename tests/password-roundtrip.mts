// Audit finding (Medium, tooling area) — protectPdfClient/unlockPdfClient (lib/client-pdf.ts)
// had no round-trip test: protect a PDF with a password, then unlock it, and confirm the
// content actually survives. Both functions are pure Uint8Array-in/Uint8Array-out wrappers
// around @pdfsmaller/pdf-encrypt and @pdfsmaller/pdf-decrypt with no browser-only APIs (no
// canvas, no DOM), so they run directly under Node/tsx exactly as exported, no simulation.

import { PDFDocument } from 'pdf-lib';
import { protectPdfClient, unlockPdfClient } from '../lib/client-pdf';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== password protect/unlock round trip (protectPdfClient + unlockPdfClient) ===');

async function makeTestPdf(text: string): Promise<File> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 300]);
  page.drawText(text, { x: 30, y: 150, size: 24 });
  const bytes = await doc.save();
  return new File([bytes as BlobPart], 'roundtrip-test.pdf', { type: 'application/pdf' });
}

console.log('--- basic round trip: protect then unlock recovers the original content ---');
{
  const original = await makeTestPdf('Round trip secret');
  const originalBuf = new Uint8Array(await original.arrayBuffer());
  const originalDoc = await PDFDocument.load(originalBuf);

  const protectedBlob = await protectPdfClient(original, 'correcthorse');
  check(protectedBlob.size > 0, `protected blob is non-empty (${protectedBlob.size} bytes)`);

  // A protected PDF must actually be encrypted: pdf-lib should refuse to load it without
  // ignoreEncryption, proving protectPdfClient did real work, not a pass-through.
  const protectedBuf = new Uint8Array(await protectedBlob.arrayBuffer());
  let rejectedWithoutPassword = false;
  try {
    await PDFDocument.load(protectedBuf);
  } catch {
    rejectedWithoutPassword = true;
  }
  check(rejectedWithoutPassword, 'the protected PDF is genuinely encrypted (pdf-lib refuses to load it without acknowledging encryption)');

  const protectedFile = new File([protectedBuf as unknown as BlobPart], 'roundtrip-test.pdf', { type: 'application/pdf' });
  const unlockedBlob = await unlockPdfClient(protectedFile, 'correcthorse');
  const unlockedBuf = new Uint8Array(await unlockedBlob.arrayBuffer());
  const unlockedDoc = await PDFDocument.load(unlockedBuf);

  check(unlockedDoc.getPageCount() === originalDoc.getPageCount(), `unlocked PDF has the same page count as the original (${unlockedDoc.getPageCount()})`);
  const origSize = originalDoc.getPage(0).getSize();
  const unlockedSize = unlockedDoc.getPage(0).getSize();
  check(Math.abs(origSize.width - unlockedSize.width) < 0.01 && Math.abs(origSize.height - unlockedSize.height) < 0.01, `unlocked page dimensions match the original (${unlockedSize.width}x${unlockedSize.height})`);
}

console.log('\n--- protectPdfClient rejects short passwords ---');
{
  const doc = await makeTestPdf('short password test');
  let threw = false;
  try {
    await protectPdfClient(doc, 'abc');
  } catch {
    threw = true;
  }
  check(threw, 'protectPdfClient throws for a password shorter than 4 characters');
}

console.log('\n--- unlockPdfClient with the WRONG password does not silently succeed ---');
{
  const original = await makeTestPdf('wrong password test');
  const protectedBlob = await protectPdfClient(original, 'righthorsebattery');
  const protectedBuf = new Uint8Array(await protectedBlob.arrayBuffer());
  const protectedFile = new File([protectedBuf as unknown as BlobPart], 'roundtrip-test.pdf', { type: 'application/pdf' });

  let wrongPasswordFailed = false;
  try {
    const badResult = await unlockPdfClient(protectedFile, 'totallywrongpassword');
    // If it didn't throw, the output must still not be a valid, readable PDF with our content —
    // treat "opens fine" as a failure of this check either way.
    const badBuf = new Uint8Array(await badResult.arrayBuffer());
    await PDFDocument.load(badBuf);
    // If we got here, decryptPDF silently accepted a wrong password AND produced a loadable
    // PDF — that would be the actual bug this check exists to catch.
  } catch {
    wrongPasswordFailed = true;
  }
  check(wrongPasswordFailed, 'unlocking with the wrong password fails (does not silently produce a readable PDF)');
}

console.log('\n--- round trip preserves multi-page documents ---');
{
  const doc = await PDFDocument.create();
  for (let i = 0; i < 3; i++) {
    const page = doc.addPage([200, 200]);
    page.drawText(`Page ${i + 1}`, { x: 20, y: 100, size: 18 });
  }
  const bytes = await doc.save();
  const file = new File([bytes as BlobPart], 'multi-page.pdf', { type: 'application/pdf' });

  const protectedBlob = await protectPdfClient(file, 'multipage1');
  const protectedBuf = new Uint8Array(await protectedBlob.arrayBuffer());
  const protectedFile = new File([protectedBuf as unknown as BlobPart], 'multi-page.pdf', { type: 'application/pdf' });

  const unlockedBlob = await unlockPdfClient(protectedFile, 'multipage1');
  const unlockedBuf = new Uint8Array(await unlockedBlob.arrayBuffer());
  const unlockedDoc = await PDFDocument.load(unlockedBuf);

  check(unlockedDoc.getPageCount() === 3, `all 3 pages survive the round trip — got ${unlockedDoc.getPageCount()}`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
