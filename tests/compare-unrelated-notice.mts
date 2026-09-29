// compare-pdf: two unrelated documents produced a wall of "differences" with no explanation.
// A user compared an e-book about the stock exchange (gpw-ebook.pdf) with a report about selling
// on Allegro (allegro-raport.pdf) and asked whether the result — everything marked as changed —
// was what the tool is for. It is not: the tool compares two versions of one document. The page
// now measures how much vocabulary the files share (vocabularySimilarity) and says plainly when
// they are unrelated documents. This test checks the measure on real files: the user's unrelated
// pair must fall below the threshold, while two versions of one document — the same report
// encoded by two different producers, and a document against a copy with a changed paragraph —
// must stay far above it.
import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
register(pathToFileURL(join(ROOT, 'scripts/_pdfjs_remap.mjs')).href, pathToFileURL(ROOT + '/'));
const { vocabularySimilarity, comparePdfTextClient, UNRELATED_DOCUMENTS_THRESHOLD } = await import('../lib/client-pdf');
const { PDFDocument, StandardFonts } = await import('pdf-lib');

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}
const fixture = (name: string): File =>
  Object.assign(new Blob([readFileSync(join(ROOT, 'test-real-pdfs', name))]), { name }) as unknown as File;
const pct = (v: number | null) => (v === null ? 'null' : `${(v * 100).toFixed(1)}%`);

console.log('=== vocabularySimilarity (pure) ===');
const para = 'Umowa najmu lokalu mieszkalnego zawarta pomiędzy wynajmującym oraz najemcą określa wysokość czynszu, kaucji, terminy płatności oraz zasady wypowiedzenia umowy przez każdą ze stron';
check(vocabularySimilarity(para, para) === 1, 'identical text → 1');
check(vocabularySimilarity('krótki tekst', para) === null, 'too few words to judge → null (e.g. a scan without a text layer)');
const edited = para.replace('kaucji', 'depozytu').replace('wypowiedzenia', 'rozwiązania');
check((vocabularySimilarity(para, edited) ?? 0) > 0.7, `a lightly edited version stays similar (${pct(vocabularySimilarity(para, edited))})`);
const fillers = 'i w na się to jest '.repeat(20);
const recipe = 'Przepis kulinarny: mąka, jajka, mleko, cukier, masło, drożdże, szczypta soli, wymieszać, odstawić ciasto, piec godzinę, podawać ciepłe z konfiturą';
const unrelatedPl = vocabularySimilarity(fillers + para, fillers + recipe);
check(unrelatedPl !== null && unrelatedPl < UNRELATED_DOCUMENTS_THRESHOLD,
  `shared short function words do not make unrelated texts look alike (${pct(unrelatedPl)})`);

console.log('\n=== real files through comparePdfTextClient ===');
const unrelated = await comparePdfTextClient(fixture('gpw-ebook.pdf'), fixture('allegro-raport.pdf'));
check(unrelated.similarity !== null && unrelated.similarity < UNRELATED_DOCUMENTS_THRESHOLD,
  `the user's pair (stock-exchange e-book vs Allegro report) is flagged as unrelated (${pct(unrelated.similarity)})`);

const versions = await comparePdfTextClient(fixture('epz_pptx_table_fixture.pdf'), fixture('epz-report-variant2.pdf'));
check(versions.similarity !== null && versions.similarity >= UNRELATED_DOCUMENTS_THRESHOLD * 2,
  `the same report from two different producers is not flagged (${pct(versions.similarity)})`);

// One document against a copy with one paragraph changed.
async function makePdf(lines: string[]): Promise<File> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  lines.forEach((l, i) => page.drawText(l, { x: 50, y: 780 - i * 18, size: 11, font }));
  return Object.assign(new Blob([await doc.save() as BlobPart]), { name: 'x.pdf' }) as unknown as File;
}
const base = [
  'Contract for the rental of an apartment between the landlord and the tenant.',
  'The monthly rent amounts to 2500 and is payable before the tenth day of each month.',
  'The deposit equals two monthly payments and is returned after the tenancy ends.',
  'Either party may terminate the agreement with three months written notice.',
  'The tenant covers electricity, heating, water and internet according to meters.',
];
const changed = [...base];
changed[3] = 'Either party may terminate the agreement with one month written notice sent by email.';
const small = await comparePdfTextClient(await makePdf(base), await makePdf(changed));
check(small.similarity !== null && small.similarity > 0.7, `two versions of one contract are not flagged (${pct(small.similarity)})`);
check(small.differences.length > 0, 'the actual change is still reported as a difference');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
