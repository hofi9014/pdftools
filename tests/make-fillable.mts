// "Make PDF fillable" (lib/pdf/makeFillable.ts, plan 2.2, 2026-11-23).
// Fields are drawn on the page as displayed; the saved file is read back by pdf.js — an
// independent reader — and every field must sit exactly where it was drawn, as displayed, for
// pages turned 0/90/180/270 degrees and for a crop box that does not start at (0,0). Also: field
// types, names, required flags, dropdown choices, the field's border drawn where the field is,
// existing fields kept, repeated names made unique, a value can be filled in afterwards, and an
// encrypted file is refused.
// Run: npm run test:make-fillable
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PDFDocument, PDFName, PDFDict, degrees, StandardFonts } from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const canvasMod = await import('@napi-rs/canvas');
const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
const { makePdfFillable: makeRaw, uniqueFieldName } = await import('../lib/pdf/makeFillable.ts');
const { readFileSync } = await import('node:fs');
// The page passes the font it serves for pdf.js (public/pdfjs-dist/standard_fonts/).
const unicodeFont = new Uint8Array(readFileSync(join(ROOT, 'public/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf')));
const makePdfFillable = (b: Uint8Array | ArrayBuffer, f: FieldSpec[]) => makeRaw(b, f, { unicodeFont });
type FieldSpec = import('../lib/pdf/makeFillable.ts').FieldSpec;

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };
const near = (a: number, b: number, eps = 0.002) => Math.abs(a - b) <= eps;

type Annot = { fieldType?: string; fieldName?: string; rect: number[]; multiLine?: boolean; checkBox?: boolean; combo?: boolean; options?: { exportValue: string; displayValue: string }[]; required?: boolean };

/** Every widget on every page, with its rectangle as displayed (fractions, top-left origin). */
async function readFields(bytes: Uint8Array, render = false) {
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0, standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/' });
  const doc = await task.promise;
  const out: { page: number; a: Annot; shown: { x: number; y: number; width: number; height: number }; px?: (fx: number, fy: number) => number }[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 2 });
    let px: ((fx: number, fy: number) => number) | undefined;
    if (render) {
      const c = canvasMod.createCanvas(Math.round(vp.width), Math.round(vp.height));
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: g as never, viewport: vp, canvas: c as never, annotationMode: pdfjs.AnnotationMode.ENABLE }).promise;
      const data = g.getImageData(0, 0, c.width, c.height).data;
      // Darkest pixel in a 7x7 square around a point given as fractions of the page.
      px = (fx, fy) => {
        let min = 255;
        const cx = Math.round(fx * c.width), cy = Math.round(fy * c.height);
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
          const x = cx + dx, y = cy + dy;
          if (x < 0 || y < 0 || x >= c.width || y >= c.height) continue;
          const i = (y * c.width + x) * 4;
          min = Math.min(min, (data[i]! + data[i + 1]! + data[i + 2]!) / 3);
        }
        return min;
      };
    }
    for (const a of (await page.getAnnotations()) as Annot[]) {
      if (!a.fieldType) continue;
      const [x1, y1] = vp.convertToViewportPoint(a.rect[0]!, a.rect[1]!);
      const [x2, y2] = vp.convertToViewportPoint(a.rect[2]!, a.rect[3]!);
      out.push({ page: n - 1, a, px, shown: { x: Math.min(x1!, x2!) / vp.width, y: Math.min(y1!, y2!) / vp.height, width: Math.abs(x2! - x1!) / vp.width, height: Math.abs(y2! - y1!) / vp.height } });
    }
  }
  await task.destroy();
  return out;
}

// ---------- 1. position on turned pages and an offset crop box ----------
console.log('=== every field lands where it was drawn, on pages as displayed ===');
const specs: FieldSpec[] = [
  { kind: 'text', page: 0, x: 0.1, y: 0.15, width: 0.4, height: 0.06, name: 'imie' },
  { kind: 'multiline', page: 0, x: 0.1, y: 0.3, width: 0.6, height: 0.2, name: 'uwagi' },
  { kind: 'checkbox', page: 0, x: 0.75, y: 0.15, width: 0.04, height: 0.04, name: 'zgoda', required: true },
  { kind: 'dropdown', page: 0, x: 0.1, y: 0.6, width: 0.3, height: 0.06, name: 'miasto', options: ['Warszawa', ' Kraków ', '', 'Gdańsk'] },
  { kind: 'signature', page: 0, x: 0.55, y: 0.75, width: 0.35, height: 0.12, name: 'podpis' },
];
for (const [rot, crop] of [[0, null], [90, null], [180, null], [270, null], [0, [40, 60, 500, 300]], [90, [40, 60, 500, 300]]] as const) {
  const src = await PDFDocument.create();
  const p = src.addPage([600, 400]);
  p.setRotation(degrees(rot));
  if (crop) p.setCropBox(...(crop as unknown as [number, number, number, number]));
  const out = await makePdfFillable(await src.save(), specs);
  const fields = await readFields(out, true);
  const label = `rotate ${rot}${crop ? ', crop box at (40,60)' : ''}`;
  check(fields.length === specs.length, `${label}: ${fields.length} fields`);
  for (const s of specs) {
    const f = fields.find((x) => x.a.fieldName === s.name);
    const ok = !!f && near(f.shown.x, s.x) && near(f.shown.y, s.y) && near(f.shown.width, s.width) && near(f.shown.height, s.height);
    check(ok, `${label}: ${s.name} at (${f?.shown.x.toFixed(3)}, ${f?.shown.y.toFixed(3)}) ${f?.shown.width.toFixed(3)}×${f?.shown.height.toFixed(3)} as drawn`);
  }
  // The field's border is drawn where the field is: dark on the middle of its top edge,
  // white well inside the box.
  const t = fields.find((x) => x.a.fieldName === 'uwagi')!;
  check(t.px!(t.shown.x + t.shown.width / 2, t.shown.y) < 200 && t.px!(t.shown.x + t.shown.width / 2, t.shown.y + t.shown.height / 2) > 240,
    `${label}: the border is drawn on the field's edge, its inside is empty`);
  const sig = fields.find((x) => x.a.fieldName === 'podpis')!;
  check(sig.px!(sig.shown.x + sig.shown.width / 2, sig.shown.y + sig.shown.height) < 200, `${label}: the signature box is drawn`);
}

// ---------- 2. types, flags, choices ----------
console.log('\n=== types, names, required, choices ===');
{
  const src = await PDFDocument.create();
  src.addPage([595, 842]);
  const out = await makePdfFillable(await src.save(), specs);
  const fields = await readFields(out);
  const by = (n: string) => fields.find((f) => f.a.fieldName === n)!.a;
  check(by('imie').fieldType === 'Tx' && !by('imie').multiLine, 'text field: Tx, one line');
  check(by('uwagi').fieldType === 'Tx' && !!by('uwagi').multiLine, 'multi-line field: Tx, multiLine');
  check(by('zgoda').fieldType === 'Btn' && !!by('zgoda').checkBox && !!by('zgoda').required, 'checkbox: Btn, check box, required');
  check(by('miasto').fieldType === 'Ch' && !!by('miasto').combo && by('miasto').options!.map((o) => o.displayValue).join('|') === 'Warszawa|Kraków|Gdańsk', 'dropdown: Ch, combo, choices trimmed and empty ones dropped (Polish letters kept)');
  check(by('podpis').fieldType === 'Sig', 'signature field: Sig');
  // The fields' font: Liberation Sans in the form's resources, whole (people type any letter
  // later — with Helvetica, Edge/Acrobat drew Polish text in a multi-line field as one huge line).
  const loaded = await PDFDocument.load(out);
  const acro = loaded.getForm().acroForm.dict;
  const drFont = ((acro.lookup(PDFName.of('DR')) as PDFDict).lookup(PDFName.of('Font')) as PDFDict).lookup(PDFName.of('LiSa')) as PDFDict;
  check(!!drFont && /LiberationSans/.test(String(drFont.get(PDFName.of('BaseFont')))) && !/\+/.test(String(drFont.get(PDFName.of('BaseFont')))),
    `the form's resources hold the whole Liberation Sans as /LiSa (${drFont ? String(drFont.get(PDFName.of('BaseFont'))) : 'missing'})`);
  const das = loaded.getForm().getFields().filter((f) => ['imie', 'uwagi', 'miasto'].includes(f.getName())).map((f) => `${f.getName()}:${f.acroField.getDefaultAppearance()}`);
  check(das.join() === 'imie:/LiSa 0 Tf 0 g,uwagi:/LiSa 11 Tf 0 g,miasto:/LiSa 0 Tf 0 g', `typing uses that font: automatic size, 11 pt in the multi-line field (${das.join(' ')})`);
  check(out.length < 160_000, `the font costs about 100 kB (${(out.length / 1024).toFixed(0)} kB)`);
  // A value can be filled in afterwards and read back (as any form-filling program would).
  const filled = await PDFDocument.load(out);
  const form = filled.getForm();
  form.getTextField('imie').setText('Anna');
  form.getCheckBox('zgoda').check();
  form.getDropdown('miasto').select('Gdańsk');
  // Saved without redrawing appearances: a viewer draws the value itself (Polish letters included).
  const again = (await PDFDocument.load(await filled.save({ updateFieldAppearances: false }))).getForm();
  check(again.getTextField('imie').getText() === 'Anna' && again.getCheckBox('zgoda').isChecked() && again.getDropdown('miasto').getSelected().join() === 'Gdańsk', 'values filled in afterwards are saved and read back');
}

// ---------- 3. existing fields, names, encryption ----------
console.log('\n=== existing fields, repeated names, encrypted file ===');
{
  const src = await PDFDocument.create();
  const p = src.addPage([595, 842]);
  src.getForm().createTextField('imie').addToPage(p, { x: 50, y: 50, width: 100, height: 20 });
  p.drawText('Form', { x: 50, y: 800, size: 20, font: await src.embedFont(StandardFonts.Helvetica) });
  const out = await makePdfFillable(await src.save(), [
    { kind: 'text', page: 0, x: 0.1, y: 0.1, width: 0.2, height: 0.03, name: 'imie' },
    { kind: 'text', page: 0, x: 0.1, y: 0.2, width: 0.2, height: 0.03, name: 'imie' },
    { kind: 'text', page: 0, x: 0.1, y: 0.3, width: 0.2, height: 0.03, name: 'a.b' },
    { kind: 'text', page: 5, x: 0.1, y: 0.3, width: 0.2, height: 0.03, name: 'nowhere' },
  ]);
  const names = (await PDFDocument.load(out)).getForm().getFields().map((f) => f.getName()).sort();
  check(names.join() === 'a_b,imie,imie_2,imie_3', `existing field kept, repeated names numbered, dots replaced, a field on a missing page skipped (${names.join()})`);
  check(uniqueFieldName('  ', new Set()) === 'field', 'an empty name becomes "field"');
  const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
  const enc = await encryptPDF(new Uint8Array(await src.save()), 'test1234');
  let msg = '';
  try { await makePdfFillable(enc, []); } catch (e) { msg = (e as Error).message; }
  check(/zabezpieczony hasłem/.test(msg), `an encrypted file is refused with the usual message (${msg})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
