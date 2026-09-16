// Audit finding (Low, backend area) — components/CloudFilePicker.tsx's OneDrive file-download
// URL fallback chain ended with f.webUrl, a link to OneDrive's web viewer/login page, not a raw
// downloadable file. If it were ever actually reached (downloadUrl and content.downloadUrl both
// missing), fetching webUrl would silently produce an HTML page disguised as the user's PDF
// instead of failing loudly with a clear "No download URL" error.
//
// Fixed by removing webUrl from the fallback chain entirely, so a genuinely missing download
// URL now throws the existing 'No download URL for <name>' error instead of masquerading as a
// successful download.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== OneDrive download URL fallback: webUrl removed, no silent wrong-file risk ===');

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'components', 'CloudFilePicker.tsx'), 'utf-8');

check(!/f\.downloadUrl \|\| f\.content\?\.downloadUrl \|\| f\.webUrl/.test(src), 'webUrl is gone from the OneDrive fallback chain');
check(/const url = f\.downloadUrl \|\| f\.content\?\.downloadUrl \|\| f\['@microsoft\.graph\.downloadUrl'\] \|\| '';/.test(src), 'the remaining chain still tries every genuine raw-download field, in the same order');
check(src.includes("throw new Error('No download URL for '"), 'a missing real download URL still throws loudly instead of silently falling through');

console.log('\n--- exact chain behavior, re-derived from source, for representative response shapes ---');
function pickUrl(f: { downloadUrl?: string; content?: { downloadUrl?: string }; webUrl?: string; ['@microsoft.graph.downloadUrl']?: string; name: string }): string {
  return f.downloadUrl || f.content?.downloadUrl || f['@microsoft.graph.downloadUrl'] || '';
}
check(pickUrl({ downloadUrl: 'https://real/direct.pdf', webUrl: 'https://onedrive.live.com/view', name: 'a' }) === 'https://real/direct.pdf', 'a genuine downloadUrl still wins over everything else');
check(pickUrl({ webUrl: 'https://onedrive.live.com/view', name: 'b' }) === '', 'when ONLY webUrl is present, the fallback now correctly yields empty (triggers the loud error) instead of returning the HTML viewer link');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
