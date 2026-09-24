// V=4/R=4 (AES-128, "Acrobat 7+") unlock. @pdfsmaller/pdf-decrypt rejects this with "Unsupported
// encryption: V=4" — the most common encryption on real PDFs. lib/pdf/decryptV4.ts adds it.
//
// No third-party AES-128 encryptor is available here, so this test contains its own writer built
// straight from ISO 32000-1 §7.6 (Algorithms 2, 3, 5, 1). To keep that from being a closed loop
// (my encryptor + my decryptor agreeing on a shared misreading of the spec), the encrypted file is
// FIRST opened by pdf.js — Mozilla's independent implementation — with the right password (text
// must come out) and a wrong one (must be refused). Only then is unlockPdfClient() run on it and
// its output re-read by pdf.js and pdf-lib without any password.
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DOMParser } from '@xmldom/xmldom';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
register('./_pdfjs_remap.mjs', pathToFileURL(join(ROOT, 'scripts') + '/'));
const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as typeof import('pdfjs-dist/legacy/build/pdf.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;
(globalThis as Record<string, unknown>).DOMParser = DOMParser;

import { unlockPdfClient } from '../lib/client-pdf.ts';
import { PdfUnlockError } from '../lib/pdf/decryptV4.ts';

let fails = 0;
function check(cond: boolean, msg: string): void {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) fails++;
}

import { buildEncrypted, TEXT, TITLE } from './helpers/aes128-fixture.mts';

async function pdfjsText(bytes: Uint8Array, password?: string): Promise<string> {
  const doc = await pdfjsLib.getDocument({ data: bytes.slice(), password, useSystemFonts: false }).promise;
  const tc = await (await doc.getPage(1)).getTextContent();
  return (tc.items as Array<{ str: string }>).map((i) => i.str).join('');
}

const asFile = (b: Uint8Array | Blob, name = 'x.pdf'): File => new File([b as BlobPart], name, { type: 'application/pdf' });

console.log('=== fixture sanity: pdf.js (independent implementation) opens the AES-128 file ===');
const enc = await buildEncrypted('userpw', 'ownerpw');
check(new TextDecoder('latin1').decode(enc).includes('/AESV2'), 'fixture really declares /CFM /AESV2');
check((await pdfjsText(enc, 'userpw')) === TEXT, 'pdf.js reads the text with the user password');
let refused = false;
try { await pdfjsText(enc, 'nope'); } catch (e) { refused = (e as Error).name === 'PasswordException'; }
check(refused, 'pdf.js refuses a wrong password (so the fixture is a genuine password-protected file)');

console.log('\n=== unlockPdfClient: AES-128 user password ===');
{
  const out = new Uint8Array(await (await unlockPdfClient(asFile(enc), 'userpw')).arrayBuffer());
  check((await pdfjsText(out)) === TEXT, 'unlocked file opens in pdf.js WITHOUT a password and has the original text');
  const reloaded = await PDFDocument.load(out); // throws if still flagged encrypted
  check(!reloaded.isEncrypted, 'pdf-lib no longer sees an /Encrypt dictionary');
  check(reloaded.getTitle() === TITLE, `string in /Info decrypted correctly (got "${reloaded.getTitle()}")`);
}

console.log('\n=== owner password also unlocks ===');
{
  const out = new Uint8Array(await (await unlockPdfClient(asFile(enc), 'ownerpw')).arrayBuffer());
  check((await pdfjsText(out)) === TEXT, 'owner password yields the original text');
}

console.log('\n=== errors are typed ===');
{
  let code = '';
  try { await unlockPdfClient(asFile(enc), 'wrong'); } catch (e) { code = e instanceof PdfUnlockError ? e.code : `other:${(e as Error).message}`; }
  check(code === 'wrong-password', `wrong password → PdfUnlockError('wrong-password') (got ${code})`);
  const plain = await (await PDFDocument.create()).save();
  code = '';
  try { await unlockPdfClient(asFile(plain), 'x'); } catch (e) { code = e instanceof PdfUnlockError ? e.code : `other:${(e as Error).message}`; }
  check(code === 'not-encrypted', `unencrypted file → PdfUnlockError('not-encrypted') (got ${code})`);
}

console.log('\n=== EncryptMetadata=false variant (key derivation appends 0xFFFFFFFF) ===');
{
  const enc2 = await buildEncrypted('pw2', '', { encryptMetadata: false });
  check((await pdfjsText(enc2, 'pw2')) === TEXT, 'fixture readable by pdf.js');
  const out = new Uint8Array(await (await unlockPdfClient(asFile(enc2), 'pw2')).arrayBuffer());
  check((await pdfjsText(out)) === TEXT, 'unlocked correctly');
}

console.log('\n=== RC4/AES-256 files still go through the library (no regression) ===');
{
  const { protectPdfClient } = await import('../lib/client-pdf.ts');
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]).drawText('lib path', { x: 10, y: 100, size: 12, font: await doc.embedFont(StandardFonts.Helvetica) });
  const prot = await protectPdfClient(asFile(await doc.save()), 'abcd');
  const out = new Uint8Array(await (await unlockPdfClient(asFile(prot), 'abcd')).arrayBuffer());
  check((await pdfjsText(out)) === 'lib path', 'protectPdfClient output still unlocks via the library');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
