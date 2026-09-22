// Audit finding (High, engine area) — signPdfClient's signature-IMAGE drawing path
// (lib/client-pdf.ts) drew at `y: normalizedY - imgH + 20` — an unexplained, hardcoded "+ 20"
// with no comment and no correspondence to anything else in the function. The sibling
// signature-TEXT/name path two blocks above draws at `y: normalizedY - s.height`, with no
// offset at all, and `estH` (used to compute every preset position like bottom-left/top-center)
// is computed via the exact same normalizedSigSize() formula as `imgH` here — so they're equal,
// and the "+ 20" was pure drift, not a real compensation.
//
// Concrete effect: for a preset like "bottom-left" (intended 40pt margin from the page's bottom
// edge), the signature image actually landed 20pt HIGHER than intended (an effective 60pt gap).
// For "top-*" presets, the margin was instead halved to 20pt. For manual custom X/Y placement,
// the drawn image was consistently 20pt off from where the equivalent text-signature mode would
// land at the same coordinates.
//
// Proven directly: pass a custom (non-preset) X/Y position in points — the simplest, most
// direct code path, isolating exactly this "+20" bug from the separate preset-estimation logic
// — and confirm via pdf.js's own operator list that the image's drawn position matches
// `y = pageHeight - signY - imageHeight` EXACTLY, with no residual offset.

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as PdfJsModule;
pdfjsLib.GlobalWorkerOptions.workerSrc =
  new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;

import { createCanvas } from '@napi-rs/canvas';
import { PDFDocument } from 'pdf-lib';
import { signPdfClient } from '../lib/client-pdf';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function toFile(bytes: Uint8Array | Buffer, name: string, type: string): File {
  const blob = new Blob([bytes as BlobPart], { type });
  return Object.assign(blob, { name }) as unknown as File;
}

console.log('=== signPdfClient: signature image lands exactly at the requested point, no +20 drift ===');
{
  const pdf = await PDFDocument.create();
  pdf.addPage([400, 400]);
  const bytes = await pdf.save();
  const pdfFile = toFile(bytes, 'blank.pdf', 'application/pdf');

  const sigCanvas = createCanvas(60, 30);
  const ctx = sigCanvas.getContext('2d');
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, 60, 30);
  const sigPngBytes = await sigCanvas.encode('png');
  const sigFile = toFile(sigPngBytes, 'signature.png', 'image/png');

  // No `preset` — direct custom X/Y in points, the simplest path, isolating the +20 bug from
  // the separate preset-estimation code (which needs createImageBitmap, unavailable here).
  const signX = 50, signY = 100;
  const outBlob = await signPdfClient(pdfFile, {
    pageMode: 'single', singlePage: 1,
    signImage: sigFile, signX, signY, unit: 'pt',
  });
  const outBytes = new Uint8Array(await outBlob.arrayBuffer());

  const doc = await pdfjsLib.getDocument({ data: outBytes, useSystemFonts: false, standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/' }).promise;
  const pdfPage = await doc.getPage(1);
  const { height: pageH } = pdfPage.getViewport({ scale: 1 });
  const opList = await pdfPage.getOperatorList();

  let drawnX: number | null = null;
  let drawnY: number | null = null;
  let drawnH = 0;
  for (let i = 0; i < opList.fnArray.length; i++) {
    if (opList.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
      // pdf-lib's drawImage() emits a CHAIN of `cm` (transform) operators between the nearest
      // preceding `save` and the paint (position, then intermediate identity resets, then the
      // image-dimension scale matrix — confirmed empirically) — composing only the single
      // transform closest to the paint grabs an unrelated identity reset, not the real
      // position. Per the PDF spec, each `cm` PREPENDS to the CTM (CTM_new = M_cm × CTM_old),
      // so a LOCAL point (the image's own unit square) picks up the transform CLOSEST to the
      // paint op first, then each earlier one in turn — i.e. composing in REVERSE document
      // order (confirmed empirically against this exact drawImage(x:50,y:100,...) call: forward
      // order gives (3000,3000), reverse order gives the correct (50,100)). Walk back to the
      // nearest `save`, then compose every transform in between in REVERSE order to get the
      // true CTM, whose translation (e,f) is the actual drawn position.
      let saveIdx = i - 1;
      while (saveIdx >= 0 && opList.fnArray[saveIdx] !== pdfjsLib.OPS.save) saveIdx--;
      let a = 1, b = 0, c = 0, d = 1, e = 0, f = 0;
      for (let j = i - 1; j > saveIdx; j--) {
        if (opList.fnArray[j] !== pdfjsLib.OPS.transform) continue;
        const [a2, b2, c2, d2, e2, f2] = opList.argsArray[j] as number[];
        const na = a * a2! + b * c2!;
        const nb = a * b2! + b * d2!;
        const nc = c * a2! + d * c2!;
        const nd = c * b2! + d * d2!;
        const ne = e * a2! + f * c2! + e2!;
        const nf = e * b2! + f * d2! + f2!;
        a = na; b = nb; c = nc; d = nd; e = ne; f = nf;
      }
      drawnX = e; drawnY = f;
      const args = opList.argsArray[i] as [string, number, number];
      drawnH = args[2];
      break;
    }
  }

  check(drawnX !== null, 'a paintImageXObject with a preceding transform was found in the output PDF');
  check(drawnX !== null && Math.abs(drawnX - signX) < 0.5, `drawn X matches the requested signX exactly (expected ${signX}, got ${drawnX})`);

  // Y: pdf-lib's page-space y for drawImage({x,y,...}) is the BOTTOM-left corner in PDF's
  // bottom-up coordinate system. signPdfClient's own convention (confirmed by reading the
  // signature-TEXT path, which has no offset bug) is: normalizedY = pageH - signY, then the
  // image's bottom edge = normalizedY - imgHeight = pageH - signY - imgHeight.
  const expectedY = pageH - signY - drawnH;
  check(drawnY !== null && Math.abs(drawnY - expectedY) < 0.5, `drawn Y matches pageHeight - signY - imageHeight exactly, no +20 drift (expected ${expectedY.toFixed(1)}, got ${drawnY?.toFixed(1)})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
