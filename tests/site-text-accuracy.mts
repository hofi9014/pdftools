// Every sentence the site says about how it works has to match the code. Two halves:
//
// 1. The facts, read from the code the sentences describe, so a later code change that makes a
//    corrected sentence untrue fails here.
// 2. The false sentences stay gone, in all 16 languages. tests/fixtures/false-site-texts.json
//    holds a short hash of each sentence that was found untrue; it is written once, before the
//    fix, so nothing here depends on being able to read 16 languages.
//
// Found by checking the FAQ, Help and page texts against the code (PLAN-DZIALANIA.md, 1.1b).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { faqData } from '../content/pages/faq';
import { helpData } from '../content/pages/help';
import { locales, t } from '../lib/i18n';
import { legalFor } from '../lib/legal';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}
export const shortHash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);

console.log('=== the facts behind the corrected sentences ===');
{
  const picker = read('components/CloudFilePicker.tsx');
  const saver = read('components/CloudFileSaver.tsx');
  const sharepoint = read('components/SharePointPickerDialog.tsx');
  check(picker.includes('auth/drive.file') && saver.includes('auth/drive.file'), 'Google Drive asks only for files opened or created by the app (drive.file)');
  check(saver.includes("'Files.ReadWrite.All offline_access'"), 'OneDrive asks for all of the user\'s files (Files.ReadWrite.All)');
  check(sharepoint.includes("'Sites.Read.All offline_access'") && sharepoint.includes("'Sites.ReadWrite.All offline_access'"), 'SharePoint asks for all sites the user can open');
  check(read('lib/dropbox-upload.ts').includes("encodeURIComponent('files.content.write')"), 'Dropbox saving asks only for writing files');
  check(/saveRecentSite/.test(sharepoint) && sharepoint.includes("'sharepoint-recent-sites'"), 'SharePoint sites are remembered in the browser');
  check(!/recent|localStorage\.setItem/i.test(saver), 'no OneDrive or Google Drive folder list is remembered by the save dialog');

  const sw = read('public/sw.js');
  check(!/addAll\(\s*\[[^\]]*\/pl\//.test(sw), 'the service worker does not store every tool in advance: a tool works offline after it was opened once');

  const editPage = read('app/(unprefixed)/edit-pdf/page.tsx');
  check(/f\.size > 100 \* 1024 \* 1024/.test(editPage), 'the PDF editor has a 100 MB limit, so "no size limit" cannot be promised');

  const watermark = read('app/(unprefixed)/watermark-pdf/page.tsx');
  check(!/type="file"[^>]*accept="[^"]*image|embedPng|embedJpg/.test(watermark), 'the watermark tool has no image option');

  const addPage = read('app/(unprefixed)/add-page/page.tsx');
  check(addPage.includes("'page.addpage.custom'") && addPage.includes("'page.addpage.start'"), 'a page can be added anywhere, not only at the end');

  // The support page promised a "Supporter" badge and a list of supporters on the site. There is
  // no such list, and the donation link is still in test mode.
  check(!/supporter|badgeLabel|badgeDesc/i.test(read('components/pages/SupportView.tsx') + read('content/pages/wsparcie.ts')), 'the support page promises no badge and no list of supporters');

  const jpg = read('app/(unprefixed)/jpg-to-pdf/page.tsx');
  check(!/tiff/i.test(jpg), 'the image tool does not offer TIFF, which Chrome and Edge cannot decode');
}

console.log('\n=== the corrected sentences say it, in every language ===');
{
  const access = faqData.flatMap((c) => c.items).find((i) => i.key === 'cloud-access');
  for (const l of locales) {
    const a = access?.a[l] ?? '';
    check(['Google Drive', 'Dropbox', 'OneDrive', 'SharePoint'].every((w) => a.includes(w)), `${l}: the cloud answer treats each service separately`);
    const policy = JSON.stringify(legalFor(l));
    check(policy.includes('OneDrive') && policy.includes('SharePoint') && policy.includes('Dropbox'), `${l}: the privacy policy names them too`);
  }
}

console.log('\n=== none of the false sentences is left ===');
{
  type Fixture = { faq: Record<string, string[]>; help: Record<string, string[]>; keys: Record<string, string[]>; legal: string[] };
  const fixture = JSON.parse(read('tests/fixtures/false-site-texts.json')) as Fixture;
  const faq = faqData.flatMap((c) => c.items);
  const help = helpData.flatMap((c) => c.items);
  const leftovers = (hashes: string[], texts: string[]) => texts.filter((x) => hashes.includes(shortHash(x))).length;
  for (const [key, hashes] of Object.entries(fixture.faq)) {
    const item = faq.find((i) => i.key === key);
    check(!!item && leftovers(hashes, Object.values(item.a)) === 0, `FAQ ${key}: corrected in all languages`);
  }
  for (const [key, hashes] of Object.entries(fixture.help)) {
    const item = help.find((i) => i.key === key);
    check(!!item && leftovers(hashes, Object.values(item.a)) === 0, `Help ${key}: corrected in all languages`);
  }
  for (const [key, hashes] of Object.entries(fixture.keys)) {
    check(leftovers(hashes, locales.map((l) => t(key, l))) === 0, `${key}: corrected in all languages`);
  }
  const strings = (v: unknown): string[] => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);
  const cloudParagraphs = locales.flatMap((l) => strings(legalFor(l)).filter((s) => s.includes('OneDrive') && s.includes('SharePoint')));
  check(cloudParagraphs.length === locales.length && leftovers(fixture.legal, cloudParagraphs) === 0, 'privacy policy: the vague OneDrive/SharePoint paragraph is gone in all languages');
}

console.log(fails ? `\n${fails} FAIL` : '\nALL PASS');
process.exit(fails ? 1 : 0);
