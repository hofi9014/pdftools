// Audit finding (High, engine area) — editPdfClient's 'text' element branch (lib/client-pdf.ts)
// used the raw display name (el.font, e.g. "Times New Roman", "Noto Sans", "PT Sans", and even
// the DEFAULT "Arial") directly as the Canvas2D font family string. loadGoogleFontsCSS()
// (lib/pdf/fonts.ts, called once on mount by PdfEditor.tsx) registers @font-face rules under the
// INTERNAL, lowercase, no-space family keys ('tinos', 'notosans', 'opensans', 'ptsans', 'arimo'
// — Arial is aliased to the Arimo files — etc.), and the on-screen live preview correctly
// resolves through the same getFontFamily() used by EditLayer.tsx. A raw display name with a
// space ("Times New Roman") or a completely different word (Arial→arimo) never matches any
// registered @font-face family, so Canvas2D silently fell back to a generic system font — a
// deterministic WYSIWYG mismatch between the on-screen preview and the exported PDF for 5 of the
// 12 selectable fonts, including the DEFAULT ("Arial").
//
// Fixed by resolving el.font through getFontFamily() — the exact same function the preview
// already uses — before building the Canvas2D font string.
//
// Proven by polyfilling document.createElement('canvas') with @napi-rs/canvas (a real canvas
// implementation, not a mock) so the actual editPdfClient code path runs unmodified, capturing
// every canvas it creates, and reading back the actual font string Canvas2D ended up storing.

import { createCanvas } from '@napi-rs/canvas';
import { PDFDocument } from 'pdf-lib';
import { getFontFamily } from '../lib/pdf/fonts';

const createdContexts: { font: string }[] = [];
(globalThis as unknown as { document: unknown }).document = {
  createElement: (tag: string) => {
    if (tag !== 'canvas') throw new Error(`unexpected createElement(${tag})`);
    const canvas = createCanvas(1, 1);
    const realGetContext = canvas.getContext.bind(canvas);
    (canvas as unknown as { getContext: (t: string) => unknown }).getContext = (type: string) => {
      const ctx = realGetContext(type as '2d');
      createdContexts.push(ctx as unknown as { font: string });
      return ctx;
    };
    return canvas;
  },
};

const { editPdfClient } = await import('../lib/client-pdf');
type PdfEditElement = Parameters<typeof editPdfClient>[2][number];

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function toFile(buf: Uint8Array, name: string): File {
  return Object.assign(new Blob([buf as BlobPart]), { name }) as unknown as File;
}

async function getFinalFontString(fontDisplayName: string | undefined): Promise<string> {
  createdContexts.length = 0;
  const pdf = await PDFDocument.create();
  pdf.addPage([400, 400]);
  const bytes = await pdf.save();
  const file = toFile(bytes, 'x.pdf');

  const el: PdfEditElement = { type: 'text', x: 20, y: 20, text: 'Hello', size: 16, color: '#000000', font: fontDisplayName as never };
  await editPdfClient(file, 0, [el], 400, 400);

  // The LAST context created is the one used for the actual measure+fill (a throwaway 1x1
  // context is created first to call measureText before the real-sized canvas is made — see
  // editPdfClient's text branch), and both get the same `ctx.font = fnt` assignment.
  const last = createdContexts[createdContexts.length - 1];
  return last?.font ?? '';
}

console.log('=== editPdfClient text element: Canvas2D font family matches the REGISTERED @font-face key ===');
for (const displayName of ['Arial', 'Times New Roman', 'Noto Sans', 'Open Sans', 'PT Sans', 'Arimo', 'Roboto']) {
  const finalFont = await getFinalFontString(displayName);
  const expectedFamily = getFontFamily(displayName);
  check(
    finalFont.toLowerCase().includes(expectedFamily.toLowerCase()),
    `"${displayName}" resolves to the registered family "${expectedFamily}" in the actual Canvas2D font string (got: ${JSON.stringify(finalFont)})`,
  );
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
