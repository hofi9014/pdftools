// IndexNow (scripts/indexnow.mjs) only works while the key file it names is published with
// exactly the key, and while the deploy does not drop it. Run: npx tsx tests/indexnow-key.mts
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { KEY, HOST } from '../scripts/indexnow.mjs';

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) fails++; };
const file = join(process.cwd(), 'public', `${KEY}.txt`);
check(/^[0-9a-f]{32}$/.test(KEY), 'the key is 32 hex characters (IndexNow allows 8-128 of a-z, A-Z, 0-9, -)');
check(existsSync(file) && readFileSync(file, 'utf8').trim() === KEY, `public/${KEY}.txt holds exactly the key`);
check(HOST === 'optimapdf.com', 'host is the production domain');
const ignore = readFileSync(join(process.cwd(), '.vercelignore'), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
check(!ignore.some((p) => p === '*.txt' || p === 'public' || p === 'public/' || p === `public/${KEY}.txt`), '.vercelignore does not drop the key file');
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
