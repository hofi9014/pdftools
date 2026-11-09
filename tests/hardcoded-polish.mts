// Polish text written straight into the code reached visitors of every language version (plan
// 1.1d, 2026-11-08): the redaction region panel, the SharePoint window (half Polish, half
// English), the cloud picker's errors and "To urządzenie", "Zapisz do:", the diff image's alt
// text, the HTML sample, the watermark presets (and the default watermark "POUFNE"), Polish names
// of downloaded files, and every error the PDF engine throws ("PDF jest zabezpieczony hasłem…"),
// which the tool pages showed as is.
//
// This test finds Polish text in string literals and JSX text of the interface code, checks
// that every Polish engine message has a translation that the pages use, and that the new texts
// exist in all 16 languages.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const { t, locales } = await import('../lib/i18n.ts');
const { ENGINE_MESSAGES, errorText, engineMessageText } = await import('../lib/error-text.ts');
const { saveErrorText } = await import('../components/CloudFileSaver.tsx');

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

const PL = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
const files: string[] = [];
const walk = (d: string) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(p)) files.push(p.split(sep).join('/'));
  }
};
['app', 'components', 'hooks', 'lib'].forEach((d) => { try { walk(d); } catch { /* no such dir */ } });

// Files that legitimately hold Polish: the translations themselves, per-language data, the
// build-time guide validator (console), the API routes (each error has a code the client
// translates, see tests/api-error-codes.mts), and code that handles Polish letters on purpose.
const SKIP = [
  /^lib\/translations\//, /^lib\/legal\//, /^lib\/guides-validate\.ts$/, /^lib\/guide-categories\.ts$/,
  /^app\/api\//, /^lib\/error-text\.ts$/, /^lib\/pdf\/pdfToSheet\.ts$/, /^lib\/pdf\/fixedLayoutPdf\.ts$/,
];
// A line is fine when it is a per-language map entry ("pl: '…'"), a console message, an engine
// message (checked below against ENGINE_MESSAGES), or Polish letters used as data.
const LINE_OK = /\b[a-z]{2}: ['"`]|console\.(log|warn|error)|throw new (Error|ApiError|OcrError|PdfUnlockError)\(|apiErrorFromResponse\(|match\(\/\[ąćęłńóśźż\]|\.replace\(\/ł\/g/;
// The AI translator sends the target language to the server as a Polish name (the API's own
// vocabulary, never shown: the option shows t('lang.*')).
const LINE_OK_FILE: Record<string, RegExp> = { 'app/(unprefixed)/ai-translate/page.tsx': /\{ value: '[^']+', key: 'lang\./ };

console.log('=== no Polish text written into the interface ===');
{
  const found: string[] = [];
  for (const f of files.filter((f) => !SKIP.some((re) => re.test(f)))) {
    readFileSync(f, 'utf8').split('\n').forEach((raw, i) => {
      const line = raw.trim();
      if (/^(\/\/|\*|\/\*)/.test(line) || /^\{\/\*.*\*\/\}$/.test(line)) return;
      const code = line.replace(/\s\/\/ .*$/, '');
      if (!PL.test(code) || LINE_OK.test(code) || LINE_OK_FILE[f]?.test(code)) return;
      found.push(`${f}:${i + 1}: ${code.slice(0, 90)}`);
    });
  }
  check(found.length === 0, `no Polish string or JSX text in app/, components/, hooks/, lib/ (${found.length})${found.length ? '\n      ' + found.slice(0, 12).join('\n      ') : ''}`);

  // Download names are often Polish without a single Polish letter ("_chroniony.pdf",
  // "podpisany-…", "edytowany-…"), which the letter check above cannot see.
  const PL_NAME = /(edytowan|numerowan|chronion|odblokowan|znak_wodny|podpis|stron[ay]|polaczon|przyciet|obrocon|skompresowan|zeredagowan|wynik|archiwum|obrazy)/i;
  const names: string[] = [];
  for (const f of files.filter((f) => !SKIP.some((re) => re.test(f)))) {
    readFileSync(f, 'utf8').split('\n').forEach((raw, i) => {
      if (!/download\s*=|fileName=|new File\(|zip\.file\(|replace\(['"]\.pdf/.test(raw)) return;
      for (const m of raw.matchAll(/(['"`])((?:(?!\1).)*)\1/g)) if (PL_NAME.test(m[2]!)) names.push(`${f}:${i + 1}: ${m[2]}`);
    });
  }
  check(names.length === 0, `no Polish download name in the code (${names.join('; ') || 'ok'})`);

  // English written into the components that were half Polish, half English.
  const english: string[] = [];
  for (const f of ['components/SharePointPickerDialog.tsx', 'components/redact-pdf/RegionSelector.tsx', 'components/CloudFilePicker.tsx', 'components/CloudFileSaver.tsx']) {
    readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
      const s = l.trim();
      if (/^(\/\/|\*)/.test(s)) return;
      if (/^[A-Z][a-z]+( [a-z]+)+[.!…]*$/.test(s) || />\s*[A-Z][a-z]+ [a-z]+[^<{]*</.test(s) || /(placeholder|title)="[A-Z][a-z]+ [a-z]/.test(s)
        // "… not configured" appears only on a build without the service's key (the button is hidden then).
        || (/setError\('[A-Z][a-z]+ /.test(s) && !/not configured'/.test(s)) || /: '[A-Z][a-z]+ [a-z][^']*'\}/.test(s)) english.push(`${f}:${i + 1}: ${s.slice(0, 80)}`);
    });
  }
  check(english.length === 0, `no English sentence written into the cloud and redaction components (${english.join('; ') || 'ok'})`);
  check(!/locale === 'pl' \?/.test(readFileSync('components/CloudFilePicker.tsx', 'utf8') + readFileSync('components/CloudFileSaver.tsx', 'utf8') + readFileSync('components/SharePointPickerDialog.tsx', 'utf8')),
    'the cloud components no longer choose between a Polish and an English sentence');
}

console.log('\n=== every Polish engine message is translated ===');
{
  const thrown: string[] = [];
  for (const f of files.filter((f) => f.startsWith('lib/') && !SKIP.some((re) => re.test(f)))) {
    for (const m of readFileSync(f, 'utf8').matchAll(/throw new (?:Error|OcrError)\(\s*(['`])((?:(?!\1).)*)\1/g)) {
      const msg = m[2]!.replace(/\$\{[^}]*\}/g, '7');
      if (PL.test(msg) || /^(Nie|Brak|Podpis|Format|Ten plik|Nieoczekiwana)\b/.test(msg)) thrown.push(`${f}: ${msg}`);
    }
  }
  // OcrError("language-unavailable") is shown through its own key on the OCR page.
  const unmapped = thrown.filter((x) => !x.includes('Dane języka OCR') && !ENGINE_MESSAGES.some((e) => e.re.test(x.slice(x.indexOf(': ') + 2))));
  check(thrown.length >= 15, `found the engine's Polish messages (${thrown.length})`);
  check(unmapped.length === 0, `each one has a translation (${unmapped.join('; ') || 'all'})`);
  const missing: string[] = [];
  for (const { key } of ENGINE_MESSAGES) for (const l of locales) if (t(key, l) === key) missing.push(`${l}:${key}`);
  check(missing.length === 0, `the ${ENGINE_MESSAGES.length} engine messages exist in all ${locales.length} languages (${missing.slice(0, 5).join(', ') || 'ok'})`);

  const de = errorText(new Error('PDF jest zabezpieczony hasłem. Najpierw odblokuj dokument.'), 'de');
  check(de === 'Diese PDF ist passwortgeschützt. Entsperren Sie sie zuerst.', `a German visitor reads the encrypted-PDF error in German: "${de}"`);
  check(errorText(new Error('Błąd OCR na stronie 3: x'), 'en') === 'OCR failed on page 3.', 'numbers in a message are carried over');
  check(errorText(new Error('Format .doc nie jest obsługiwany'), 'fr') === "Le format .doc n'est pas pris en charge.", 'the file extension is carried over');
  check(errorText(new Error('PDF jest zabezpieczony hasłem. Najpierw odblokuj dokument.'), 'pl').startsWith('PDF jest zabezpieczony'), 'Polish stays Polish');
  check(errorText(new Error('Some pdf.js error'), 'de') === 'Some pdf.js error' && engineMessageText('x', 'de') === null, 'an unknown message is shown as is');
  check(errorText('PDF jest zabezpieczony hasłem. Najpierw odblokuj dokument.', 'ja').includes('パスワード'), 'a batch failure (a plain message) is translated too');

  const pages = files.filter((f) => /^app\/\(unprefixed\)\/[^/]+\/page\.tsx$/.test(f) || f.startsWith('components/'));
  const raw = pages.filter((f) => /setError\([^)]*err(or)?\.message/.test(readFileSync(f, 'utf8')) && !f.includes('SharePoint'));
  check(raw.length === 0, `no tool page shows err.message directly (${raw.join(', ') || 'ok'})`);
  check(/errorText\(f\.message, locale\)/.test(readFileSync('components/BatchFailures.tsx', 'utf8')), 'the list of skipped files shows each reason in the page language');
}

console.log('\n=== the new texts ===');
{
  const en = readFileSync('lib/translations/en.ts', 'utf8');
  const keys = [...en.matchAll(/'((?:file|sp|redact|engine\.err)\.[\w.]+|cloud\.(?:this_device|save_to|err_\w+)|page\.compare\.diff_alt|page\.html\.sample_(?:title|text)|page\.watermark\.preset_\w+)':/g)].map((m) => m[1]!);
  const missing: string[] = [];
  for (const k of keys) for (const l of locales) if (t(k, l) === k) missing.push(`${l}:${k}`);
  check(keys.length > 90 && missing.length === 0, `${keys.length} new keys exist in all ${locales.length} languages (${missing.slice(0, 5).join(', ') || 'ok'})`);
  // Words that really are the same in another language: KOPIA (sv), dokument (de, no, sv), DRAFT.
  const samePolish = keys.filter((k) => !/^(page\.watermark\.preset_(draft|copy)|file\.document)$/.test(k)).filter((k) => locales.filter((l) => l !== 'pl').some((l) => t(k, l) === t(k, 'pl')));
  check(samePolish.length === 0, `no language repeats the Polish text (${samePolish.join(', ') || 'ok'})`);
  const badName: string[] = [];
  for (const k of keys.filter((k) => k.startsWith('file.'))) for (const l of locales) if (!t(k, l) || /[\\/:*?"<>| ]/.test(t(k, l))) badName.push(`${l}:${k}=${t(k, l)}`);
  check(badName.length === 0, `downloaded file names are safe on every system (${badName.slice(0, 5).join(', ') || 'ok'})`);
  // Liberation Sans (used for the watermark and HTML to PDF) has no Arabic, Persian, Devanagari
  // or CJK glyphs, so those languages use English presets and samples instead of empty boxes.
  const latinOnly = /^[\u0000-ɏ‐-‧ ]*$/;
  const tofu = ['ar', 'fa', 'hi', 'ja', 'zh'].flatMap((l) => ['page.watermark.preset_confidential', 'page.html.sample_title', 'page.html.sample_text'].filter((k) => !latinOnly.test(t(k, l))).map((k) => `${l}:${k}`));
  check(tofu.length === 0, `text drawn into the PDF stays in letters the PDF font has (${tofu.join(', ') || 'ok'})`);
  check(t('page.watermark.preset_confidential', 'de') === 'VERTRAULICH' && /useState\(\(\) => t\('page\.watermark\.preset_confidential', locale\)\)/.test(readFileSync('app/(unprefixed)/watermark-pdf/page.tsx', 'utf8')),
    'the default watermark is in the page language (was "POUFNE" everywhere)');
  // Found by e2e/page-language-texts.mts: the merge button said "convert PDFs" (de, no, sv, fr,
  // pt), "works with PDFs" (es, it), "opens PDFs" (tr) or "import PDFs" (ja).
  const OLD_MERGE = ['PDFs konvertieren', 'Funciona con archivos PDF', 'Converte ficheiros PDF', 'Konverter PDF-filer', 'Konvertera PDF-filer',
    'Convertir des fichiers PDF', "PDF'leri açar", 'Funziona con i PDF', 'PDFの取り込み'];
  const wrongMerge = locales.filter((l) => OLD_MERGE.includes(t('page.merge.button', l)));
  check(wrongMerge.length === 0, `the merge button says "merge" in every language (${wrongMerge.join(', ') || 'ok'})`);
  check(saveErrorText(new Error('Popup blocked'), 'Dropbox', 'de').startsWith('Der Browser hat') && saveErrorText(new Error('HTTP 500'), 'Dropbox', 'it') === 'Impossibile salvare il file in Dropbox.',
    'cloud saving errors are in the page language');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
