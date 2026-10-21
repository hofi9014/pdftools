// The installed Microsoft Office (Word, Excel, PowerPoint) as a judge for the documents this site
// writes: open each file the way a user would, read-only and without repair, and print it to PDF
// (or read the cells) so a test can compare it with the source. Windows only, through COM
// (e2e/helpers/msoffice.ps1); on any other system, or without Office, `findMsOffice()` returns
// null and the tests report SKIP.

import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(here, 'msoffice.ps1');

export interface MsOffice { word: boolean; excel: boolean; powerpoint: boolean }

let cached: MsOffice | null | undefined;

/** Which Office applications can be driven here, or null when none can. */
export function findMsOffice(): MsOffice | null {
  if (cached !== undefined) return cached;
  if (process.platform !== 'win32' || process.env.E2E_NO_MSOFFICE) return (cached = null);
  const probe = (progId: string): boolean => {
    try {
      const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
        `try { $o = New-Object -ComObject ${progId}; $o.Quit(); 'yes' } catch { 'no' }`], { encoding: 'utf8', timeout: 60000 });
      return out.trim().endsWith('yes');
    } catch { return false; }
  };
  const found = { word: probe('Word.Application'), excel: probe('Excel.Application'), powerpoint: probe('PowerPoint.Application') };
  return (cached = found.word || found.excel || found.powerpoint ? found : null);
}

export interface SheetCell { r: number; c: number; text: string; number: boolean; value: string; merged: boolean }
export interface OpenResult {
  in: string;
  ok: boolean;
  error: string | null;
  pages?: number | null;
  slides?: number | null;
  sheets?: Array<{ name: string; rows: number; cols: number; cells: SheetCell[] }>;
}

function run(app: 'word' | 'excel' | 'powerpoint', items: Array<{ in: string; pdf: string | null }>): OpenResult[] {
  const dir = mkdtempSync(join(tmpdir(), 'msoffice-'));
  try {
    const job = join(dir, 'job.json');
    const out = join(dir, 'out.json');
    writeFileSync(job, JSON.stringify({ app, items: items.map((i) => ({ in: resolve(i.in), pdf: i.pdf ? resolve(i.pdf) : null })) }), 'utf8');
    try {
      execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT, '-JobFile', job, '-OutFile', out], { timeout: 600000, stdio: 'pipe' });
    } catch (e) {
      const stderr = (e as { stderr?: Buffer }).stderr?.toString('utf8') ?? '';
      throw new Error(`Microsoft ${app} could not be driven: ${stderr.trim() || (e as Error).message}`);
    }
    const parsed = JSON.parse(readFileSync(out, 'utf8').replace(/^﻿/, '')) as OpenResult[] | OpenResult;
    return Array.isArray(parsed) ? parsed : [parsed];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Open each .docx/.odt in Word and print it to the paired PDF (pdf may be null to only open). */
export function wordOpen(pairs: Array<[string, string | null]>): OpenResult[] {
  return run('word', pairs.map(([i, p]) => ({ in: i, pdf: p })));
}

/** Open each .xlsx in Excel, read every non-empty cell as Excel shows it, optionally print to PDF. */
export function excelOpen(pairs: Array<[string, string | null]>): OpenResult[] {
  return run('excel', pairs.map(([i, p]) => ({ in: i, pdf: p })));
}

/** Open each .pptx in PowerPoint, count the slides, optionally save as PDF. */
export function powerpointOpen(pairs: Array<[string, string | null]>): OpenResult[] {
  return run('powerpoint', pairs.map(([i, p]) => ({ in: i, pdf: p })));
}
