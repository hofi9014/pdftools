// Audit finding (Medium, backend area) — types/cloud-picker.d.ts declared OneDrive.open's
// success callback as `(files: { name: string; content?: { downloadUrl: string } }[]) => void`
// — a single, invented shape that never matched the real OneDrive file picker SDK response.
// The actual response can be a bare array OR a Graph-style `{ value: [...] }` wrapper, and the
// real download URL can land in any of several fields (downloadUrl / content.downloadUrl /
// webUrl / the raw Graph `@microsoft.graph.downloadUrl` property) depending on picker version
// and the requested queryParameters — CloudFilePicker.tsx's actual handling code already
// checked all of these, but only by casting everything to `any` to bypass the wrong type
// (the same class of problem as the historical SEC-014 Google Picker type mismatch).
//
// Fixed with an OneDrivePickerFileItem interface + a success type that's a real union of both
// observed response shapes, with every field the code actually reads present. The call site
// no longer needs `any` anywhere.
//
// This can't be "run" in the traditional sense (it's a type-only fix) — this test proves it by
// compiling small TypeScript snippets against the real .d.ts and checking whether tsc accepts
// or rejects them, for exactly the shapes the real handling code exercises.

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const typesPath = join(ROOT, 'types', 'cloud-picker.d.ts').replace(/\\/g, '/');

function typechecks(snippet: string): boolean {
  const dir = mkdtempSync(join(tmpdir(), 'onedrive-type-check-'));
  try {
    const file = join(dir, 'check.ts');
    writeFileSync(file, `/// <reference path="${typesPath}" />\n${snippet}\n`);
    try {
      // Run from the project root (so tsc resolves the local typescript install) but
      // with --moduleResolution bundler (matching the project's own tsconfig — its
      // @types packages need this to resolve their own internal imports) and --types
      // emptied, so no ambient globals beyond dom/es2020 leak into this snippet.
      execFileSync('npx', ['tsc', '--noEmit', '--strict', '--target', 'es2020', '--moduleResolution', 'bundler', '--lib', 'es2020,dom', file], {
        cwd: ROOT,
        stdio: 'pipe',
        shell: true,
      });
      return true;
    } catch (e) {
      const out = (e as { stdout?: Buffer }).stdout?.toString() || '';
      if (process.env.DEBUG_TSC) console.log(out);
      return false;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log('=== types/cloud-picker.d.ts: OneDrive.open success type matches both real response shapes ===');

check(
  typechecks(`
    window.OneDrive!.open({
      clientId: 'x',
      success: (response) => {
        const list = Array.isArray(response) ? response : response.value;
        for (const f of list) {
          const url: string = f.downloadUrl || f.content?.downloadUrl || f.webUrl || f['@microsoft.graph.downloadUrl'] || '';
          const name: string = f.name;
        }
      },
    });
  `),
  'a bare-array response is accepted, and every field the real handler reads (downloadUrl, content.downloadUrl, webUrl, the raw Graph field, name) type-checks',
);

check(
  typechecks(`
    window.OneDrive!.open({
      clientId: 'x',
      success: (response) => {
        const list = Array.isArray(response) ? response : response.value;
        list.forEach(f => { const n: string = f.name; });
      },
    });
  `),
  'a { value: [...] } wrapper response is ALSO accepted by the same handler code (real union, not just one shape)',
);

check(
  !typechecks(`
    window.OneDrive!.open({
      clientId: 'x',
      success: (response) => {
        const bogus: number = response;
      },
    });
  `),
  'sanity: the type-check harness itself actually rejects genuinely wrong code (not silently passing everything)',
);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
