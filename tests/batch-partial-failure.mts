// pdf-to-excel: one unconvertible file in a batch aborted the whole batch. The page converted
// every file in one loop under a single try/catch, so when e.g. file 2 of 3 had no table (the
// writer rightly refuses to write an empty, corrupt workbook), the user got an error and no
// download at all — not even for files 1 and 3. Conversion now goes through runBatch (one
// try/catch per file); the page downloads what succeeded and lists what failed, with the reason.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runBatch } from '../lib/batch';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

console.log('=== runBatch ===');
const progress: number[] = [];
const res = await runBatch(['a.pdf', 'no-table.pdf', 'c.pdf'], async (name) => {
  if (name === 'no-table.pdf') throw new Error('Nie wykryto żadnej tabeli w tym pliku PDF');
  return name.toUpperCase();
}, (d) => progress.push(d));
check(res.ok.map((r) => r.result).join(',') === 'A.PDF,C.PDF', `files after a failing one are still converted (got ${res.ok.map((r) => r.result).join(',')})`);
check(res.failed.length === 1 && res.failed[0]!.item === 'no-table.pdf' && res.failed[0]!.message.includes('tabeli'), 'the failing file is reported with its own message');
check(progress.join(',') === '1,2,3', `progress advances for every file, failed ones included (got ${progress.join(',')})`);
const allBad = await runBatch([1, 2], async () => { throw 'boom'; });
check(allBad.ok.length === 0 && allBad.failed.every((f) => f.message === 'boom'), 'non-Error throws are reported as text');

console.log('\n=== pdf-to-excel page ===');
const page = readFileSync(join(ROOT, 'app/pdf-to-excel/page.tsx'), 'utf8');
check(/await runBatch\(files,/.test(page), 'the page converts through runBatch');
check(!/for \(let i = 0; i < files\.length; i\+\+\)[\s\S]{0,200}await pdfToIRSpreadsheet/.test(page), 'the old single-try/catch loop is gone');
check(/data-testid="batch-failed"/.test(page) && /page\.excel\.partial_failed/.test(page), 'failed files are listed next to the successful download');
const i18n = readFileSync(join(ROOT, 'lib/i18n.ts'), 'utf8');
const partialLines = i18n.split('\n').filter((l) => l.includes("'page.excel.partial_failed':"));
check(partialLines.length === 16 && partialLines.every((l) => l.includes('{failed}') && l.includes('{total}')),
  'the partial-failure message has {failed} and {total} in all 16 locales');
check((i18n.match(/'page\.excel\.all_failed': '[^']+'/g) ?? []).length === 16, 'the all-failed message exists in all 16 locales');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
