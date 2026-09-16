// Audit finding (Medium, engine area) — lib/pdf/fonts.ts's Noto Sans and Open Sans entries
// used the IDENTICAL woff2 URL for weight 700 (bold) as for weight 400 (regular). Noto Sans
// is edit-pdf's default font family, so every "bold" checkbox in that tool silently embedded
// the regular weight instead — text that should look bold renders identically to normal text
// in the exported PDF.
//
// Root cause (confirmed by fetching Google's live css2 API both ways): requesting weight 400
// and 700 TOGETHER in one query returns a single shared variable-font blob for these two
// families specifically — its un-instanced default renders as regular for both. Querying each
// weight in ISOLATION returns genuinely distinct static instances. Open Sans additionally had
// all three of its URLs pointing at an aged-out v40 path that now 404s outright.
//
// This test fetches the REAL fonts over the network (same pattern as tests/url-to-pdf-ssrf.mts
// hitting example.com) and verifies with fontkit — not just "different bytes", but genuinely
// different font programs with the expected PostScript names and a measurably wider bold.

import { getFontBytes } from '../lib/pdf/fonts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== Noto Sans / Open Sans: bold actually loads a bold font, not regular ===');

const fontkit = (await import('@pdf-lib/fontkit')).default ?? (await import('@pdf-lib/fontkit'));
const SAMPLE = 'AVWMil';

async function checkFamily(family: string): Promise<void> {
  const regularBytes = await getFontBytes(family, 400, false);
  const boldBytes = await getFontBytes(family, 700, false);

  check(regularBytes.byteLength > 1000, `[${family}] regular font fetched (${regularBytes.byteLength} bytes)`);
  check(boldBytes.byteLength > 1000, `[${family}] bold font fetched (${boldBytes.byteLength} bytes)`);

  const regularHash = Buffer.from(regularBytes.slice(0, 64)).toString('hex');
  const boldHash = Buffer.from(boldBytes.slice(0, 64)).toString('hex');
  check(regularHash !== boldHash, `[${family}] regular and bold are NOT byte-identical (the exact old bug)`);

  const regularFont = fontkit.create(Buffer.from(regularBytes));
  const boldFont = fontkit.create(Buffer.from(boldBytes));

  check(/regular/i.test(regularFont.postscriptName), `[${family}] regular font's own name says Regular (got: ${regularFont.postscriptName})`);
  check(/bold/i.test(boldFont.postscriptName), `[${family}] bold font's own name says Bold (got: ${boldFont.postscriptName})`);

  const regularWidth = regularFont.layout(SAMPLE).advanceWidth;
  const boldWidth = boldFont.layout(SAMPLE).advanceWidth;
  check(boldWidth > regularWidth * 1.02, `[${family}] bold measurably wider than regular for "${SAMPLE}" (regular=${regularWidth}, bold=${boldWidth})`);
}

await checkFamily('Noto Sans');
await checkFamily('Open Sans');

// Regression guard: a family that was NEVER buggy (had genuinely distinct URLs all along)
// still resolves fine and its bold is still wider — proves this fix didn't disturb it.
console.log('--- regression guard: Roboto (never buggy) ---');
await checkFamily('Roboto');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
