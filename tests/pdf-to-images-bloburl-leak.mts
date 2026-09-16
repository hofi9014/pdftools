// Audit finding (Low, engine area) — lib/client-pdf.ts's extractImagesFromPdf creates one
// URL.createObjectURL(blob) per extracted page, returned to the caller for use as preview <img>
// src. The consuming component, app/pdf-to-images/page.tsx, held these in `images` state but
// never called URL.revokeObjectURL when replacing or clearing that state (new file selected,
// file removed, "Clear" clicked, re-running extraction, or navigating away) — leaking one Blob
// URL per previously-extracted page on every such action within the same browser session.
//
// Fixed by adding a clearImages() helper that revokes every URL in the current `images` state
// before clearing it, called from all four places that previously did `setImages([])` directly,
// plus an unmount-cleanup effect (via a ref kept in sync with `images`) that revokes whatever's
// still alive if the user navigates away mid-session.
//
// Verified live in the browser (not just by source inspection): with URL.revokeObjectURL spied,
// extracting a 3-page test PDF showed 3 live blob: <img> URLs and exactly 1 revoke (the
// auto-downloaded ZIP, an existing, correct, unrelated pattern). Re-running the same extraction
// then showed exactly 5 total revokes — the 3 preview URLs from the first run (each revoked
// EXACTLY once) plus 2 ZIP downloads — proving the leak is fixed with no double-revoke.
//
// An earlier version of this fix put the revoke inside the setImages functional updater
// (`setImages(prev => { prev.forEach(revoke); return []; })`), which is an anti-pattern (updater
// functions must be pure) and was caught live: under this dev server's StrictMode double-invoke,
// each of the 3 URLs was revoked TWICE. Moving the revoke into the calling closure (reading
// `images` directly, not via the updater) fixed that — confirmed by the exactly-5 count above.

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

console.log('=== pdf-to-images: Blob URL leak fixed, no double-revoke ===');

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'app', 'pdf-to-images', 'page.tsx'), 'utf-8');

console.log('--- clearImages revokes from the render closure, not inside the setState updater ---');
check(/const clearImages = \(\) => \{\s*images\.forEach\(img => URL\.revokeObjectURL\(img\.url\)\);\s*setImages\(\[\]\);\s*\}/.test(src), 'clearImages reads `images` directly and revokes before calling setImages([]) — not inside a functional updater');
check(!/setImages\(prev => \{ prev\.forEach/.test(src), 'the revoke is not done inside a setImages functional updater (would double-fire under StrictMode)');

console.log('\n--- every place that used to silently drop images now goes through clearImages() ---');
check((src.match(/clearImages\(\)/g) || []).length >= 4, 'clearImages() is called from all 4 sites that used to call setImages([]) directly (new files, remove file, start of convert, Clear button)');
check(!/setImages\(\[\]\)/.test(src.replace(/const clearImages = \(\) => \{[\s\S]*?\};/, '')), 'no remaining bare setImages([]) call outside the clearImages() definition itself');

console.log('\n--- unmount cleanup revokes whatever is still alive when the page is left ---');
check(/imagesRef\.current = images/.test(src), 'a ref is kept in sync with the latest images state');
check(/useEffect\(\(\) => \(\) => \{ imagesRef\.current\.forEach\(img => URL\.revokeObjectURL\(img\.url\)\); \}, \[\]\)/.test(src), 'an unmount-only effect (empty deps) revokes every URL still in the ref');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
