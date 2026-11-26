// A content stream read as operators with their operands, keeping the exact byte positions, so a
// tool can replace a few operators and copy everything else unchanged (ISO 32000-1 §7.2, §7.8.2).
// Works on a latin1 string: one character per byte, binary data included.

export type Operand =
  | { kind: 'num'; value: number }
  | { kind: 'name'; value: string }
  | { kind: 'other' }; // string, array, dict, true/false/null — kept as written

export interface Op {
  op: string;
  operands: Operand[];
  /** Start of the first operand (or of the operator), end after the operator. */
  start: number;
  end: number;
  /** For BI: the image dictionary (keys without the slash) and the raw image data. */
  inline?: { dict: Map<string, Operand | Operand[]>; dictText: string; data: string };
}

const WS = new Set([0, 9, 10, 12, 13, 32]);
const DELIM = new Set(['(', ')', '<', '>', '[', ']', '{', '}', '/', '%']);
const isWs = (c: string) => WS.has(c.charCodeAt(0));
const isRegular = (c: string | undefined) => c !== undefined && !isWs(c) && !DELIM.has(c);

export function latin1(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return s;
}
export function fromLatin1(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

/** Reads the stream into operators. Unbalanced or broken syntax ends the reading (rest left as is). */
export function parseOps(src: string): Op[] {
  const ops: Op[] = [];
  let i = 0;
  let operands: Operand[] = [];
  let opStart = -1;
  const n = src.length;

  const skipWs = () => {
    while (i < n) {
      const c = src[i]!;
      if (isWs(c)) i++;
      else if (c === '%') { while (i < n && src[i] !== '\n' && src[i] !== '\r') i++; }
      else break;
    }
  };
  const readLiteral = () => { // at '('
    let depth = 0;
    for (; i < n; i++) {
      const c = src[i];
      if (c === '\\') { i++; continue; }
      if (c === '(') depth++;
      else if (c === ')') { depth--; if (depth === 0) { i++; return; } }
    }
  };
  // One complete object (value) at i; returns it as an operand.
  const readObject = (): Operand => {
    const c = src[i]!;
    if (c === '(') { readLiteral(); return { kind: 'other' }; }
    if (c === '<' && src[i + 1] === '<') {
      i += 2;
      for (;;) { skipWs(); if (i >= n) break; if (src[i] === '>' && src[i + 1] === '>') { i += 2; break; } readObject(); }
      return { kind: 'other' };
    }
    if (c === '<') { const e = src.indexOf('>', i); i = e < 0 ? n : e + 1; return { kind: 'other' }; }
    if (c === '[') {
      i++;
      for (;;) { skipWs(); if (i >= n) break; if (src[i] === ']') { i++; break; } readObject(); }
      return { kind: 'other' };
    }
    if (c === '/') {
      let j = i + 1;
      while (j < n && isRegular(src[j])) j++;
      const name = src.slice(i + 1, j).replace(/#([0-9a-fA-F]{2})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
      i = j;
      return { kind: 'name', value: name };
    }
    let j = i;
    while (j < n && isRegular(src[j])) j++;
    if (j === i) { i++; return { kind: 'other' }; } // a stray delimiter
    const word = src.slice(i, j);
    i = j;
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) return { kind: 'num', value: parseFloat(word) };
    return { kind: 'other', word } as Operand & { word: string };
  };

  for (;;) {
    skipWs();
    if (i >= n) break;
    const c = src[i]!;
    const start = i;
    if (c === '(' || c === '<' || c === '[' || c === '/') {
      if (opStart < 0) opStart = start;
      operands.push(readObject());
      continue;
    }
    if (c === ')' || c === '>' || c === ']' || c === '{' || c === '}') { i++; continue; }
    let j = i;
    while (j < n && isRegular(src[j])) j++;
    const word = src.slice(i, j);
    i = j;
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) {
      if (opStart < 0) opStart = start;
      operands.push({ kind: 'num', value: parseFloat(word) });
      continue;
    }
    if (word === 'true' || word === 'false' || word === 'null') {
      if (opStart < 0) opStart = start;
      operands.push({ kind: 'other' });
      continue;
    }
    if (word === 'BI') {
      // Inline image: key/value pairs up to ID, one whitespace byte, data up to EI.
      const dict = new Map<string, Operand | Operand[]>();
      const dictStart = i;
      for (;;) {
        skipWs();
        if (i >= n) break;
        if (src.startsWith('ID', i) && !isRegular(src[i + 2])) break;
        const key = readObject();
        skipWs();
        if (src[i] === '[') {
          const arrStart = i + 1;
          i++;
          const items: Operand[] = [];
          for (;;) { skipWs(); if (i >= n || src[i] === ']') { i++; break; } items.push(readObject()); }
          void arrStart;
          if (key.kind === 'name') dict.set(key.value, items);
        } else {
          const v = readObject();
          if (key.kind === 'name') dict.set(key.value, v);
        }
      }
      const dictText = src.slice(dictStart, i);
      i += 3; // "ID" + one whitespace byte
      const dataStart = i;
      // EI preceded by whitespace and followed by whitespace or the end.
      const re = /[\0\t\n\f\r ]EI(?=[\0\t\n\f\r ]|$)/g;
      re.lastIndex = dataStart;
      const m = re.exec(src);
      const dataEnd = m ? m.index : n;
      i = m ? m.index + m[0].length : n;
      ops.push({ op: 'BI', operands: [], start, end: i, inline: { dict, dictText, data: src.slice(dataStart, dataEnd) } });
      operands = [];
      opStart = -1;
      continue;
    }
    ops.push({ op: word, operands, start: opStart < 0 ? start : opStart, end: i });
    operands = [];
    opStart = -1;
  }
  return ops;
}

export interface Edit { start: number; end: number; text: string }

/** `src` with the edits applied (edits must not overlap). */
export function applyEdits(src: string, edits: Edit[]): string {
  const sorted = [...edits].sort((a, b) => a.start - b.start);
  let out = '';
  let pos = 0;
  for (const e of sorted) {
    out += src.slice(pos, e.start) + e.text;
    pos = e.end;
  }
  return out + src.slice(pos);
}
