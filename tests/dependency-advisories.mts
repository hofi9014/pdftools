// Watches the one production advisory that had no fixed release when it was reviewed
// (2026-10-03): node-forge <= 1.4.0, GHSA-86w9-cpqp-85rv — RSA PKCS#1 v1.5 signature
// VERIFICATION accepts extra nested DigestAlgorithm elements.
//
// Why the site is not exposed today: node-forge is used in exactly one file,
// lib/pdf/padesSign.ts, and only to read a .p12 and to SIGN. Nothing verifies a signature or a
// certificate chain with it. This test keeps both halves true:
//   1. the code still never verifies with node-forge (if that changes, the advisory applies);
//   2. `npm audit` for production dependencies still shows only this known, unfixable advisory
//      — it FAILS as soon as a fixed node-forge is published (time to update) or a new
//      high/critical production advisory appears.
// The registry part needs the network; without it that part is skipped, not failed.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) {
      if (name !== 'node_modules' && name !== 'pdfjs-dist') sourceFiles(rel, out);
    } else if (/\.(ts|tsx|mjs)$/.test(name)) out.push(rel);
  }
  return out;
}

console.log('=== node-forge is only used to sign, never to verify ===');
const files = ['lib', 'app', 'components', 'hooks'].flatMap((d) => sourceFiles(d));
const importers = files.filter((f) => /from 'node-forge'|require\('node-forge'\)/.test(readFileSync(join(ROOT, f), 'utf8')));
check(files.length > 150, `sanity: scanned the application source (${files.length} files)`);
check(importers.join() === 'lib/pdf/padesSign.ts', `node-forge is imported only by lib/pdf/padesSign.ts (${importers.join(', ')})`);
const pades = readFileSync(join(ROOT, 'lib/pdf/padesSign.ts'), 'utf8');
const verifying = pades.match(/\.verify\s*\(|verifyCertificateChain|createCaStore|\.verifySubjectKeyIdentifier/g) ?? [];
check(verifying.length === 0, `padesSign.ts calls no verification API (${verifying.join(', ')})`);
check(/createSignedData\(\)/.test(pades) && /pkcs12FromAsn1/.test(pades), 'sanity: it does sign and read .p12 (the scan looked at the right file)');

console.log('\n=== production advisories: only the known one, and still without a fix ===');
interface Vuln { severity: string; fixAvailable: unknown; via: unknown[] }
let report: { vulnerabilities?: Record<string, Vuln> } | undefined;
try {
  let out: string;
  try {
    out = execSync('npm audit --omit=dev --json', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024 });
  } catch (e) {
    // npm audit exits non-zero whenever it finds anything; the JSON is still on stdout.
    out = (e as { stdout?: string }).stdout ?? '';
  }
  const parsed = JSON.parse(out) as { vulnerabilities?: Record<string, Vuln>; error?: unknown };
  if (!parsed.error) report = parsed;
} catch {
  report = undefined;
}

if (!report) {
  console.log('  SKIP npm audit could not reach the registry — rerun with a network connection');
} else {
  const vulns = Object.entries(report.vulnerabilities ?? {});
  const serious = vulns.filter(([, v]) => v.severity === 'high' || v.severity === 'critical');
  const unexpected = serious.filter(([name]) => name !== 'node-forge').map(([name, v]) => `${name} (${v.severity})`);
  check(unexpected.length === 0, `no other high/critical advisory in production dependencies (${unexpected.join(', ')})`);
  const forge = report.vulnerabilities?.['node-forge'];
  if (!forge) {
    console.log('  NOTE node-forge is no longer reported — the advisory is resolved; this watch can be retired.');
  } else {
    check(forge.fixAvailable === false,
      'node-forge still has no fixed release (when this FAILS: run `npm install node-forge@latest`, then test:pades-sign, test:pades-signature-field-name, test:pades-ec-key-error)');
    const titles = forge.via.filter((v): v is { title: string } => typeof v === 'object' && v !== null && 'title' in v).map((v) => v.title);
    check(titles.length > 0 && titles.every((t) => /verif/i.test(t)),
      `every node-forge advisory is about verification, which this app does not use (${titles.join(' | ')})`);
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
