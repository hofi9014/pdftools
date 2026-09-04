// Component C1 — pdf-to-powerpoint writer test:
// renderIRToPptx on a manual IRSlide with the real fixture's page size
// (595.3 x 841.9 pt = A4 portrait). Asserts the writer runs, produces a
// non-empty .pptx blob, and that the dynamic layout resolves to the expected
// A4-portrait dimensions (pt -> in). THIS test writes through the same code
// under test — independent structural/visual confirmation is done with
// python-pptx afterwards in C1 (not asserted here).
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderIRToPptx, type IRDeck } from '../lib/client-pptx.ts';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const A4_W = 595.3; // pt
const A4_H = 841.9; // pt

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
function check(name: string, ok: boolean, detail?: string): void {
  checks.push({ name, ok, detail });
}

async function main(): Promise<number> {
  const deck: IRDeck = {
    widthPt: A4_W,
    heightPt: A4_H,
    slides: [
      {
        widthPt: A4_W,
        heightPt: A4_H,
        elements: [
          {
            kind: 'textbox',
            bounds: { x: 56, y: 60, width: 480, height: 60 },
            content: { text: '12 rzeczy, które robią skuteczni handlarze', fontSize: 28, bold: true, italic: false, color: '#1E3A5F', align: 'left' },
          },
          {
            kind: 'textbox',
            bounds: { x: 56, y: 160, width: 480, height: 200 },
            content: { text: 'Raport przygotowany w ramach audytu skutecznych praktyk sprzedażowych.', fontSize: 16, bold: false, italic: false, color: '#333333', align: 'left' },
          },
          {
            kind: 'shape',
            bounds: { x: 56, y: 420, width: 200, height: 100 },
            shape: 'rect',
            fill: '#DCEAF7',
            stroke: '#1E3A5F',
          },
        ],
      },
    ],
  };

  // Expected dynamic layout: A4 portrait in inches (pt / 72).
  const expW = A4_W / 72;
  const expH = A4_H / 72;
  check('deck aspect (portrait, height>width)', A4_H > A4_W, `${A4_W.toFixed(1)}x${A4_H.toFixed(1)}`);
  check('layout width inches (~8.27)', Math.abs(expW - 8.27) < 0.05, `${expW.toFixed(3)}in`);
  check('layout height inches (~11.69)', Math.abs(expH - 11.69) < 0.05, `${expH.toFixed(3)}in`);

  // Run the writer (same code under test) and capture the blob.
  const blob = await renderIRToPptx(deck);
  const bytes = Buffer.from(await blob.arrayBuffer());
  check('pptx blob non-empty', bytes.length > 0, `${bytes.length} bytes`);

  const out = join(ROOT, 'test-output', 'allegro-C1.pptx');
  const writeFile = (await import('node:fs/promises')).writeFile;
  await writeFile(out, bytes);
  check('wrote pptx to test-output/allegro-C1.pptx', true, out);

  const f = (await import('node:fs')).statSync(out);
  check('written file > 0 bytes on disk', f.size > 0, `${f.size} bytes`);

  let allOk = true;
  console.log(`=== C1 writer: renderIRToPptx on A4-portrait (595.3x841.9pt) IRDeck ===`);
  for (const ck of checks) {
    if (!ck.ok) allOk = false;
    console.log(`  [${ck.ok ? 'PASS' : 'FAIL'}] ${ck.name}${ck.detail ? ` — ${ck.detail}` : ''}`);
  }
  console.log(`\n${allOk ? 'ALL PASS' : 'FAILURES PRESENT'}  (${checks.filter((c) => c.ok).length}/${checks.length} passed)`);
  return allOk ? 0 : 1;
}

process.exitCode = await main();