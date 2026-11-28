// "Search in many PDFs" (plan 2.8, 2026-11-26): finding a phrase in the text of PDF pages. Pure,
// no DOM, no pdf.js — the page texts come from lib/pdf/pdfPageTexts.ts.
//
// The text and the query are compared after the same normalisation: runs of whitespace (spaces,
// line ends) become one space, a word split by a hyphen at the end of a line is joined again
// ("wyszu-\nkiwanie" finds "wyszukiwanie"), soft hyphens are dropped, and — unless asked
// otherwise — letter case and diacritics are ignored ("zolc" finds "Żółć"). Every normalised
// character remembers the position it came from, so the snippet shown is the original text.

export interface SearchOptions {
  matchCase?: boolean;
  matchDiacritics?: boolean;
  wholeWord?: boolean;
}

export interface SearchHit {
  /** 1-based page number. */
  page: number;
  before: string;
  match: string;
  after: string;
}

// Letters that do not decompose into a base letter and a combining mark.
// (ł Ł ø Ø đ Đ ħ Ħ ı ŀ Ŀ ß æ Æ œ Œ — written as escapes so the code holds no letters of any one language)
const BASE: Record<string, string> = { '\u0142': 'l', '\u0141': 'L', '\u00f8': 'o', '\u00d8': 'O', '\u0111': 'd', '\u0110': 'D', '\u0127': 'h', '\u0126': 'H', '\u0131': 'i', '\u0140': 'l', '\u013f': 'L', '\u00df': 'ss', '\u00e6': 'ae', '\u00c6': 'AE', '\u0153': 'oe', '\u0152': 'OE' };

interface Normalised { text: string; map: number[] }

/** The normalised text and, for each of its characters, the index of the source character. */
export function normalise(src: string, opts: SearchOptions = {}): Normalised {
  let text = '';
  const map: number[] = [];
  let pendingSpace = -1;
  const push = (s: string, at: number) => {
    if (pendingSpace >= 0 && text.length > 0) { text += ' '; map.push(pendingSpace); }
    pendingSpace = -1;
    for (const ch of s) { text += ch; map.push(at); }
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (ch === '\u00ad') continue; // soft hyphen
    // A hyphen ending a line between two letters joins the word: "wyszu-\nkiwanie".
    if ((ch === '-' || ch === '\u2010') && /\p{L}/u.test(src[i - 1] ?? '')) {
      let j = i + 1;
      while (j < src.length && (src[j] === ' ' || src[j] === '\t')) j++;
      if (src[j] === '\n' || src[j] === '\r') {
        while (j < src.length && /\s/.test(src[j]!)) j++;
        if (/\p{Ll}/u.test(src[j] ?? '')) { i = j - 1; continue; }
        // Before a capital the hyphen is real ("Polsko-" + line end + "Niemiecka"): keep it, drop the line break.
        if (/\p{Lu}/u.test(src[j] ?? '')) { push('-', i); i = j - 1; continue; }
      }
    }
    if (/\s/.test(ch)) { if (pendingSpace < 0) pendingSpace = i; continue; }
    let out = ch;
    if (!opts.matchDiacritics) {
      out = BASE[ch] ?? ch.normalize('NFD').replace(/\p{M}+/gu, '');
      if (!out) continue;
    }
    if (!opts.matchCase) out = out.toLocaleLowerCase('und');
    push(out, i);
  }
  return { text, map };
}

const isWordChar = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c);
const flat = (s: string) => s.replace(/\s+/g, ' ');

/** Every occurrence of the query on every page, in page order. */
export function searchPages(pages: string[], query: string, opts: SearchOptions = {}, context = 50): SearchHit[] {
  const q = normalise(query, opts).text;
  if (!q) return [];
  const hits: SearchHit[] = [];
  pages.forEach((src, p) => {
    const { text, map } = normalise(src, opts);
    for (let at = text.indexOf(q); at >= 0; at = text.indexOf(q, at + 1)) {
      const end = at + q.length;
      if (opts.wholeWord && (isWordChar(text[at - 1]) && isWordChar(text[at]) || isWordChar(text[end]) && isWordChar(text[end - 1]))) continue;
      const s = map[at]!;
      const e = map[end - 1]! + 1;
      const from = Math.max(0, s - context);
      const to = Math.min(src.length, e + context);
      hits.push({
        page: p + 1,
        before: (from > 0 ? '…' : '') + flat(src.slice(from, s)).trimStart(),
        match: flat(src.slice(s, e)),
        after: flat(src.slice(e, to)).trimEnd() + (to < src.length ? '…' : ''),
      });
    }
  });
  return hits;
}

/** Results as CSV (file, page, text around the match), with a BOM so spreadsheet programs read UTF-8. */
export function hitsToCsv(rows: { file: string; hit: SearchHit }[], header: [string, string, string]): string {
  const cell = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [header.map(cell).join(','), ...rows.map(({ file, hit }) => [file, String(hit.page), `${hit.before}${hit.match}${hit.after}`].map(cell).join(','))];
  return '﻿' + lines.join('\r\n') + '\r\n';
}
