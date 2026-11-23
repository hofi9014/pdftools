// FINDING 2026-11-23: "Fill form" (extractFormFields / fillFormFields) and "Flatten" (flattenPDF)
// told field types apart by f.constructor.name ('PDFTextField', 'PDFSignature'…). A production
// build shortens class names, so on the live site every field was 'unknown': the fill-form page
// showed no inputs and filled nothing, and flattening also flattened digital signature fields
// it promises to keep. Found by e2e/make-pdf-fillable.mts on a production build.
// This test does what the minifier does — renames pdf-lib's field classes — and checks that the
// three functions still work. Without the fix: every field 'unknown', no value written.
// Run: npm run test:form-fields-minified
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import * as pdfLib from 'pdf-lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const fontBytes = readFileSync(join(ROOT, 'public/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf'));
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.toString();
  if (url.includes('LiberationSans-Regular.ttf')) return new Response(new Uint8Array(fontBytes), { status: 200 });
  return realFetch(input, init);
}) as typeof fetch;

const { PDFDocument, PDFName, PDFHexString } = pdfLib;
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };

// A form with every field type, plus a filled digital signature field.
const d = await PDFDocument.create();
const p = d.addPage([595, 842]);
const form = d.getForm();
form.createTextField('imie').addToPage(p, { x: 50, y: 750, width: 200, height: 20 });
form.createCheckBox('zgoda').addToPage(p, { x: 50, y: 700, width: 15, height: 15 });
const dd = form.createDropdown('miasto'); dd.addOptions(['Warszawa', 'Gdansk']); dd.addToPage(p, { x: 50, y: 650, width: 150, height: 20 });
const ol = form.createOptionList('lista'); ol.addOptions(['A', 'B']); ol.addToPage(p, { x: 50, y: 560, width: 150, height: 60 });
const rg = form.createRadioGroup('plec'); rg.addOptionToPage('K', p, { x: 50, y: 520, width: 15, height: 15 }); rg.addOptionToPage('M', p, { x: 80, y: 520, width: 15, height: 15 });
const sigV = d.context.register(d.context.obj({ Type: 'Sig', Filter: 'Adobe.PPKLite' }));
const sig = d.context.register(d.context.obj({ Type: 'Annot', Subtype: 'Widget', FT: 'Sig', T: PDFHexString.fromText('podpis'), Rect: [300, 50, 500, 100], V: sigV, F: 4, P: p.ref }));
p.node.set(PDFName.of('Annots'), d.context.obj([...(p.node.Annots()?.asArray() ?? []), sig]));
form.acroForm.addField(sig);
const file = () => new File([bytes as unknown as BlobPart], 'f.pdf', { type: 'application/pdf' });
const bytes = await d.save();

// What a production build does to class names.
for (const [i, cls] of [pdfLib.PDFTextField, pdfLib.PDFCheckBox, pdfLib.PDFDropdown, pdfLib.PDFOptionList, pdfLib.PDFRadioGroup, pdfLib.PDFSignature].entries()) {
  Object.defineProperty(cls, 'name', { value: String.fromCharCode(97 + i) });
}
check(pdfLib.PDFTextField.name === 'a', 'class names shortened, as in a production build');

const { extractFormFields, fillFormFields, flattenPDF } = await import('../lib/client-pdf.ts');
const { fields } = await extractFormFields(file());
const types = Object.fromEntries(fields.map((f) => [f.name, f.type]));
check(JSON.stringify(types) === JSON.stringify({ imie: 'text', zgoda: 'checkbox', miasto: 'dropdown', lista: 'listbox', plec: 'radio', podpis: 'signature' }),
  `field types recognised (${JSON.stringify(types)})`);

const filledBytes = await fillFormFields(file(), { imie: 'Jan Nowak', zgoda: true, miasto: 'Gdansk', lista: 'B', plec: 'M' });
check((await PDFDocument.load(filledBytes)).getForm().getFields().length === 0, 'the form was flattened after filling');
const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(ROOT, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
const task = pdfjs.getDocument({ data: new Uint8Array(filledBytes), verbosity: 0, standardFontDataUrl: join(ROOT, 'node_modules/pdfjs-dist/standard_fonts/') + '/' });
const text = (await (await (await task.promise).getPage(1)).getTextContent()).items.map((i) => ('str' in i ? i.str : '')).join(' ');
await task.destroy();
check(text.includes('Jan Nowak') && text.includes('Gdansk'), `the typed values are on the page (${text.trim()})`);

const flat = await flattenPDF(file());
const left = (await PDFDocument.load(flat.bytes)).getForm().getFields().map((f) => f.getName());
check(left.join() === 'podpis', `flatten keeps the digital signature field (left: ${left.join() || 'none'})`);

globalThis.fetch = realFetch;
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
