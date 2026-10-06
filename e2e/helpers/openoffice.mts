// A real word processor as an independent renderer for the e2e scripts: opens a .docx / .odt in
// an installed Apache OpenOffice 4 or LibreOffice and saves it as PDF, so a test can read back
// where the text and the pictures really ended up.
//
// The office is started headless with ITS OWN profile directory (never the user's) and is asked
// to quit over UNO at the end — it is never killed by process name, which could take a window
// the user has open with it. When no office is installed, findOffice() returns null and the
// calling test reports the check as skipped.
//
// Set OFFICE_PROGRAM_DIR to point at a specific installation's "program" directory.

import { existsSync, mkdirSync } from 'node:fs';
import { spawn, execFile } from 'node:child_process';
import { createConnection } from 'node:net';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = 2002;
const EXE = process.platform === 'win32' ? '.exe' : '';

export interface Office {
  programDir: string;
  /** "Apache OpenOffice" or "LibreOffice" — reported by the tests. */
  name: string;
}

export function findOffice(): Office | null {
  const candidates = [
    process.env.OFFICE_PROGRAM_DIR,
    'C:/Program Files (x86)/OpenOffice 4/program',
    'C:/Program Files/OpenOffice 4/program',
    'C:/Program Files/LibreOffice/program',
    'C:/Program Files (x86)/LibreOffice/program',
    '/usr/lib/libreoffice/program',
    '/opt/openoffice4/program',
    '/Applications/LibreOffice.app/Contents/MacOS',
    '/Applications/OpenOffice.app/Contents/MacOS',
  ].filter((p): p is string => !!p);
  for (const dir of candidates) {
    if (existsSync(join(dir, `soffice${EXE}`)) && existsSync(join(dir, `python${EXE}`))) {
      return { programDir: dir, name: /libreoffice/i.test(dir) ? 'LibreOffice' : 'Apache OpenOffice' };
    }
  }
  return null;
}

function listening(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port: PORT });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
  });
}

let startedHere = false;

async function ensureRunning(office: Office): Promise<void> {
  if (await listening()) return;
  const profile = join(tmpdir(), 'optimapdf-e2e-office-profile');
  mkdirSync(profile, { recursive: true });
  const child = spawn(join(office.programDir, `soffice${EXE}`), [
    `-env:UserInstallation=${pathToFileURL(profile).href}`,
    '-headless', '-nologo', '-norestore', '-nofirststartwizard',
    `-accept=socket,host=127.0.0.1,port=${PORT};urp;`,
  ], { detached: true, stdio: 'ignore' });
  child.unref();
  startedHere = true;
  for (let i = 0; i < 90; i++) {
    if (await listening()) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${office.name} did not start listening on port ${PORT}`);
}

function python(office: Office, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(join(office.programDir, `python${EXE}`), [join(HERE, 'openoffice_convert.py'), String(PORT), ...args], {
      cwd: office.programDir,
      env: { ...process.env, PYTHONPATH: office.programDir, URE_BOOTSTRAP: `vnd.sun.star.pathname:${join(office.programDir, process.platform === 'win32' ? 'fundamental.ini' : 'fundamentalrc')}` },
      timeout: 240000,
    }, (err, stdout, stderr) => (err ? reject(new Error(`${office.name} conversion failed: ${stderr || err.message}`)) : resolve(stdout)));
  });
}

/** Opens each input in the office and saves it as PDF. `pairs` = [input, output.pdf][]. */
export async function convertToPdf(office: Office, pairs: Array<[string, string]>): Promise<void> {
  await ensureRunning(office);
  await python(office, pairs.flat());
  for (const [, out] of pairs) if (!existsSync(out)) throw new Error(`${office.name} did not write ${out}`);
}

/** Asks the office started by ensureRunning() to quit. An office that was already running is left alone. */
export async function stopOffice(office: Office): Promise<void> {
  if (!startedHere) return;
  await python(office, ['--terminate']).catch(() => undefined);
  startedHere = false;
}
