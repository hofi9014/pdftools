// Audit finding (Medium, ui area) — app/compress/page.tsx matched each row's compression
// result by NAME PREFIX (`results.find(r => r.name.startsWith(file.name.replace('.pdf','')))`)
// instead of by position. Compressed result names are the original name with
// "_skompresowany.pdf" appended, so "report2_skompresowany.pdf" also starts with "report" —
// two files sharing a prefix (e.g. "report.pdf" and "report2.pdf") could show each other's
// savings percentage.
//
// Fixed by matching on array index instead: `results` is always either empty or a direct,
// same-order 1:1 map of `files` (both handleFiles/removeFile reset results to [] whenever
// files changes, and handleCompressAll rebuilds results by iterating files in that same
// order), so `results[i]` is always the correct result for `files[i]`.
//
// Reproduced live in the browser with two real PDFs named "report2.pdf" then "report.pdf"
// (in that upload order — the exact ordering that triggers the bug, since .find() returns
// the FIRST array match and "report2_skompresowany.pdf" sorts before "report.pdf"'s own true
// result when report2 is uploaded first): the unpatched page showed report.pdf's row as -14%
// (report2's real result) instead of its own true -25%; the fixed page shows report.pdf at
// -25% and report2.pdf at -14%, correctly, regardless of upload order.
//
// This test checks the underlying matching logic directly (the page itself needs a browser
// to exercise end-to-end, already done manually above) by re-deriving what each approach
// would produce for exactly this scenario.

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== compress: results matched by index, not by colliding name prefix ===');

interface Result { name: string; originalSize: number; compressedSize: number }

function oldPrefixMatch(files: { name: string }[], results: Result[], fileIdx: number): Result | undefined {
  const file = files[fileIdx];
  return results.find(r => r.name.startsWith(file.name.replace('.pdf', '')));
}

function newIndexMatch(files: { name: string }[], results: Result[], fileIdx: number): Result | undefined {
  return results.length === files.length ? results[fileIdx] : undefined;
}

// Exact reproduction of the live browser scenario: report2.pdf uploaded first, report.pdf
// second — files[0]="report2.pdf" (true result -14%), files[1]="report.pdf" (true result -25%).
const files = [{ name: 'report2.pdf' }, { name: 'report.pdf' }];
const results: Result[] = [
  { name: 'report2_skompresowany.pdf', originalSize: 1000, compressedSize: 860 }, // -14%
  { name: 'report_skompresowany.pdf', originalSize: 1000, compressedSize: 750 },  // -25%
];

console.log('--- reproducing the exact live-browser scenario (report2.pdf uploaded before report.pdf) ---');
const oldForReport = oldPrefixMatch(files, results, 1); // files[1] = "report.pdf"
check(oldForReport?.name === 'report2_skompresowany.pdf', `sanity: the OLD prefix-matching logic really does steal report2's result for report.pdf's row (got "${oldForReport?.name}") — matches what was observed live`);

const newForReport2 = newIndexMatch(files, results, 0);
const newForReport = newIndexMatch(files, results, 1);
check(newForReport2?.name === 'report2_skompresowany.pdf', `NEW index-matching: report2.pdf's row gets its own result ("${newForReport2?.name}")`);
check(newForReport?.name === 'report_skompresowany.pdf', `NEW index-matching: report.pdf's row gets ITS OWN result, not report2's ("${newForReport?.name}")`);
check(newForReport?.compressedSize === 750, `report.pdf's row shows its true compressed size (750), not report2's (860)`);

console.log('\n--- regression guard: non-colliding, ordinary filenames still match correctly either way ---');
const plainFiles = [{ name: 'a.pdf' }, { name: 'b.pdf' }];
const plainResults: Result[] = [
  { name: 'a_skompresowany.pdf', originalSize: 100, compressedSize: 90 },
  { name: 'b_skompresowany.pdf', originalSize: 100, compressedSize: 50 },
];
check(newIndexMatch(plainFiles, plainResults, 0)?.compressedSize === 90, 'a.pdf still matches its own result');
check(newIndexMatch(plainFiles, plainResults, 1)?.compressedSize === 50, 'b.pdf still matches its own result');

console.log('\n--- source check: app/compress/page.tsx actually uses index matching now ---');
const { readFileSync } = await import('node:fs');
const { fileURLToPath } = await import('node:url');
const { dirname, join } = await import('node:path');
const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'app', 'compress', 'page.tsx'), 'utf-8');
check(!src.includes('r.name.startsWith(file.name.replace'), 'the old prefix-matching lookup is gone from the source');
check(src.includes('results.length === files.length ? results[i] : undefined'), 'the new index-based lookup is present');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
