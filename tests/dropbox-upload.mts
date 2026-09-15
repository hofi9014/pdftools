// Etap 2 — Dropbox "save to" no longer goes through a server (see AUDYT-BEZPIECZENSTWA.md).
// components/CloudFileSaver.tsx now does OAuth + a direct Dropbox API v2 upload from the
// browser, the same pattern already used for Google Drive/OneDrive in that file. The pure
// logic for that flow lives in lib/dropbox-upload.ts specifically so it can be exercised
// here without a browser (the component itself is 'use client' and pulls in React/DOM).
//
// The one genuinely tricky piece is encodeDropboxApiArg: Dropbox's HTTP API requires the
// Dropbox-API-Arg header to be pure ASCII, so a filename with Polish diacritics (a very
// real case for this app) has to be \uXXXX-escaped rather than sent as raw UTF-8 — this
// file proves that escaping is both ASCII-only AND round-trips back to the exact original
// value, not just "looks escaped".

import {
  encodeDropboxApiArg,
  sanitizeDropboxFileName,
  buildDropboxUploadArgHeader,
  buildDropboxAuthUrl,
} from '../lib/dropbox-upload';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

const isAsciiOnly = (s: string): boolean => /^[\x00-\x7f]*$/.test(s);

console.log('=== encodeDropboxApiArg: ASCII-only output, byte-exact round-trip ===');
{
  const value = { path: '/plik.pdf', mode: 'add' as const, autorename: true, mute: false };
  const encoded = encodeDropboxApiArg(value);
  check(isAsciiOnly(encoded), `plain-ASCII input stays ASCII (${encoded})`);
  check(JSON.stringify(JSON.parse(encoded)) === JSON.stringify(value), 'round-trips to the exact same object for plain ASCII');
}
{
  const value = { path: '/połączony raport (ą,ć,ę,ł,ń,ó,ś,ź,ż).pdf', mode: 'add' as const, autorename: true, mute: false };
  const encoded = encodeDropboxApiArg(value);
  check(isAsciiOnly(encoded), `Polish diacritics are escaped to pure ASCII (${encoded})`);
  const decoded = JSON.parse(encoded) as typeof value;
  check(decoded.path === value.path, `round-trips back to the exact original path with diacritics intact (got "${decoded.path}")`);
}
{
  // Emoji / astral characters (surrogate pairs) — a realistic case for a user-renamed file.
  const value = { path: '/raport 📊.pdf' };
  const encoded = encodeDropboxApiArg(value);
  check(isAsciiOnly(encoded), `emoji (surrogate pair) is escaped to pure ASCII (${encoded})`);
  check((JSON.parse(encoded) as typeof value).path === value.path, 'round-trips the emoji back exactly');
}

console.log('\n=== sanitizeDropboxFileName ===');
check(sanitizeDropboxFileName('polaczony.pdf') === 'polaczony.pdf', 'plain filename unchanged');
check(sanitizeDropboxFileName('sub/folder/file.pdf') === 'sub_folder_file.pdf', 'forward slashes replaced (would otherwise be read as a subfolder path)');
check(sanitizeDropboxFileName('weird\\name.pdf') === 'weird_name.pdf', 'backslashes replaced');
check(sanitizeDropboxFileName('  ') === 'file', 'whitespace-only name falls back to "file" instead of an empty path segment');
check(sanitizeDropboxFileName('połączony.pdf') === 'połączony.pdf', 'diacritics themselves are left alone — only escaped later, in the header, not stripped from the visible filename');

console.log('\n=== buildDropboxUploadArgHeader ===');
{
  const header = buildDropboxUploadArgHeader('połączony.pdf');
  check(isAsciiOnly(header), `full header is ASCII-only (${header})`);
  const parsed = JSON.parse(header) as { path: string; mode: string; autorename: boolean; mute: boolean };
  check(parsed.path === '/połączony.pdf', `path is "/" + the filename, diacritics intact after round-trip (got "${parsed.path}")`);
  check(parsed.mode === 'add', 'mode is "add" — never silently overwrites an existing file (matches the old Saver widget behavior)');
  check(parsed.autorename === true, 'autorename true — a name collision gets renamed, not rejected or overwritten');
}
{
  const header = buildDropboxUploadArgHeader('a/b/c.pdf');
  const parsed = JSON.parse(header) as { path: string };
  check(parsed.path === '/a_b_c.pdf', `slashes in the filename don't create a nested Dropbox path (got "${parsed.path}")`);
}

console.log('\n=== buildDropboxAuthUrl ===');
{
  const url = new URL(buildDropboxAuthUrl('my-app-key', 'https://optimapdf.com/dropbox-oauth.html'));
  check(url.origin + url.pathname === 'https://www.dropbox.com/oauth2/authorize', `correct authorize endpoint (got ${url.origin}${url.pathname})`);
  check(url.searchParams.get('client_id') === 'my-app-key', 'client_id passed through');
  check(url.searchParams.get('response_type') === 'token', 'implicit grant (response_type=token), matching the getMicrosoftToken pattern — no server-side code exchange needed');
  check(url.searchParams.get('redirect_uri') === 'https://optimapdf.com/dropbox-oauth.html', 'redirect_uri passed through and correctly decoded by URL parsing');
  check(url.searchParams.get('scope') === 'files.content.write', 'requests only the upload scope — not read/list/delete (least privilege, like Google Drive\'s drive.file)');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
