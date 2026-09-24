// PDF font resource names are not installed font names: subset tags, style/weight suffixes,
// PostScript suffixes and generator numeric suffixes made Word substitute a default face for every
// run of every converted document. docxFontFamily() maps them to real family names; bold/italic
// stay on the run flags. parseFontStyle now also treats Black/Heavy/Semibold/Demi as bold.
import { docxFontFamily } from '../lib/client-pdf-docx.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}
const cases: Array<[string, string | undefined]> = [
  ['PSWIZS+Gotham-Book', 'Gotham'],
  ['PSWIZS+Gotham-Black', 'Gotham'],
  ['PSWIZS+Gotham-Bold', 'Gotham'],
  ['LiberationSans-2867', 'Arial'],
  ['LiberationSans-Italic-8002', 'Arial'],
  ['BAAAAA+Times New Roman', 'Times New Roman'],
  ['CAAAAA+Carlito', 'Calibri'],
  ['DAAAAA+Carlito-Bold', 'Calibri'],
  ['CAAAAA+Carlito-Regular', 'Calibri'],
  ['DAAAAA+TimesNewRomanPSMT', 'Times New Roman'],
  ['CAAAAA+ArialMT', 'Arial'],
  ['BAAAAA+Arial-BoldMT', 'Arial'],
  ['Calibri-5570', 'Calibri'],
  ['Calibri-Bold-2603', 'Calibri'],
  ['Helvetica-Bold', 'Arial'],
  ['Courier', 'Courier New'],
  ['OpenSans-Semibold', 'Open Sans'],
  ['', undefined],
];
for (const [input, expected] of cases) {
  const got = docxFontFamily(input);
  check(got === expected, `"${input}" → ${JSON.stringify(got)} (expected ${JSON.stringify(expected)})`);
}
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
