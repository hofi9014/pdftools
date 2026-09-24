// Evaluates raw XLSX conditional-formatting rules (stored verbatim on IRSheet by xlsxToIR)
// against cell values and returns a copy of the sheet whose cell.fmt has the winning dxf
// fill/colour/bold/italic merged in. Display-only: callers render the copy, the source IR
// (and anything re-emitted to XLSX) is left untouched.
//
// Supported: cellIs, containsText, notContainsText, beginsWith, endsWith, containsBlanks,
// notContainsBlanks, duplicateValues, uniqueValues, top10 (rank/bottom/percent), aboveAverage,
// and `expression` limited to a single comparison between cell refs / number / string literals
// (relative refs shifted from the range's top-left, e.g. `$B2>100`).
// NOT supported (rule skipped, never guessed): colorScale, dataBar, iconSet, and expressions
// using functions/AND/OR/arithmetic.
import type { IRSheet, IRSpreadsheetCell, IRSpreadsheetRunFormat } from './client-pdf-docx';

type Rule = NonNullable<IRSheet['conditionalFormattingRules']>[number];
type Pos = { row: number; col: number };
type Range = { r0: number; c0: number; r1: number; c1: number };

function colIndex(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseRef(ref: string): Pos | null {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(ref.trim());
  return m ? { col: colIndex(m[1]!), row: parseInt(m[2]!, 10) - 1 } : null;
}

export function parseSqref(sqref: string): Range[] {
  const out: Range[] = [];
  for (const part of sqref.split(/\s+/).filter(Boolean)) {
    const [a, b] = part.split(':');
    const p0 = parseRef(a ?? '');
    const p1 = b === undefined ? p0 : parseRef(b);
    if (!p0 || !p1) continue;
    out.push({
      r0: Math.min(p0.row, p1.row), r1: Math.max(p0.row, p1.row),
      c0: Math.min(p0.col, p1.col), c1: Math.max(p0.col, p1.col),
    });
  }
  return out;
}

function numericOf(c: IRSpreadsheetCell | undefined): number | null {
  if (!c) return null;
  if ((c.type === 'number' || c.type === 'formula' || c.type === 'date' || c.type === 'time') && typeof c.raw === 'number') return c.raw;
  return null;
}

function textOf(c: IRSpreadsheetCell | undefined): string {
  return c ? c.display : '';
}

type Operand = { num: number | null; str: string };

function operandFromLiteral(tok: string): Operand | null {
  const t = tok.trim();
  if (/^-?\d+(\.\d+)?$/.test(t)) return { num: parseFloat(t), str: t };
  const m = /^"((?:[^"]|"")*)"$/.exec(t);
  if (m) return { num: null, str: m[1]!.replace(/""/g, '"') };
  return null;
}

function operandFromCell(sheet: IRSheet, ref: string, dRow: number, dCol: number): Operand | null {
  const m = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/.exec(ref.trim());
  if (!m) return null;
  const col = colIndex(m[2]!) + (m[1] ? 0 : dCol);
  const row = parseInt(m[4]!, 10) - 1 + (m[3] ? 0 : dRow);
  if (row < 0 || col < 0) return null;
  const c = sheet.cells[row]?.[col];
  return { num: numericOf(c), str: textOf(c) };
}

function resolveOperand(sheet: IRSheet, tok: string, dRow: number, dCol: number): Operand | null {
  return operandFromLiteral(tok) ?? operandFromCell(sheet, tok, dRow, dCol);
}

function compare(op: string, a: Operand, b: Operand): boolean | null {
  const useNum = a.num !== null && b.num !== null;
  const cmp = useNum ? a.num! - b.num! : a.str.toLowerCase().localeCompare(b.str.toLowerCase());
  switch (op) {
    case 'equal': case '=': return cmp === 0;
    case 'notEqual': case '<>': return cmp !== 0;
    case 'greaterThan': case '>': return useNum ? cmp > 0 : false;
    case 'greaterThanOrEqual': case '>=': return useNum ? cmp >= 0 : false;
    case 'lessThan': case '<': return useNum ? cmp < 0 : false;
    case 'lessThanOrEqual': case '<=': return useNum ? cmp <= 0 : false;
    default: return null;
  }
}

function between(v: number, lo: number, hi: number): boolean {
  return v >= Math.min(lo, hi) && v <= Math.max(lo, hi);
}

function rangeCells(sheet: IRSheet, ranges: Range[]): Array<{ pos: Pos; cell: IRSpreadsheetCell }> {
  const out: Array<{ pos: Pos; cell: IRSpreadsheetCell }> = [];
  for (const r of ranges) {
    for (let row = r.r0; row <= r.r1; row++) {
      for (let col = r.c0; col <= r.c1; col++) {
        const cell = sheet.cells[row]?.[col];
        if (cell) out.push({ pos: { row, col }, cell });
      }
    }
  }
  return out;
}

/** Returns a predicate for the rule, or null when the rule type/shape is unsupported. */
function buildPredicate(sheet: IRSheet, rule: Rule, ranges: Range[]): ((pos: Pos, cell: IRSpreadsheetCell | undefined) => boolean) | null {
  const f = rule.formula ?? [];
  const anchor = ranges[0] ? { row: ranges[0].r0, col: ranges[0].c0 } : { row: 0, col: 0 };
  switch (rule.type) {
    case 'cellIs': {
      const op = rule.operator ?? '';
      const a = f[0] !== undefined ? resolveOperand(sheet, f[0], 0, 0) : null;
      if (!a) return null;
      if (op === 'between' || op === 'notBetween') {
        const b = f[1] !== undefined ? resolveOperand(sheet, f[1], 0, 0) : null;
        if (!b || a.num === null || b.num === null) return null;
        return (_p, c) => {
          const v = numericOf(c);
          if (v === null) return false;
          const inside = between(v, a.num!, b.num!);
          return op === 'between' ? inside : !inside;
        };
      }
      return (_p, c) => {
        if (!c || c.type === 'empty') return false;
        return compare(op, { num: numericOf(c), str: textOf(c) }, a) === true;
      };
    }
    case 'containsText': case 'notContainsText': case 'beginsWith': case 'endsWith': {
      const needle = (rule.text ?? '').toLowerCase();
      if (!needle) return null;
      return (_p, c) => {
        const s = textOf(c).toLowerCase();
        const hit = rule.type === 'beginsWith' ? s.startsWith(needle)
          : rule.type === 'endsWith' ? s.endsWith(needle) : s.includes(needle);
        return rule.type === 'notContainsText' ? !hit : hit;
      };
    }
    case 'containsBlanks': return (_p, c) => !c || textOf(c).trim() === '';
    case 'notContainsBlanks': return (_p, c) => !!c && textOf(c).trim() !== '';
    case 'duplicateValues': case 'uniqueValues': {
      const counts = new Map<string, number>();
      for (const { cell } of rangeCells(sheet, ranges)) {
        if (cell.type === 'empty') continue;
        const k = textOf(cell).toLowerCase();
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      return (_p, c) => {
        if (!c || c.type === 'empty') return false;
        const n = counts.get(textOf(c).toLowerCase()) ?? 0;
        return rule.type === 'duplicateValues' ? n > 1 : n === 1;
      };
    }
    case 'top10': {
      const nums = rangeCells(sheet, ranges).map((x) => numericOf(x.cell)).filter((v): v is number => v !== null);
      if (nums.length === 0 || rule.rank === undefined) return null;
      const sorted = [...nums].sort((x, y) => (rule.bottom ? x - y : y - x));
      const take = rule.percent ? Math.max(1, Math.floor((nums.length * rule.rank) / 100)) : Math.max(1, rule.rank);
      const threshold = sorted[Math.min(take, sorted.length) - 1]!;
      return (_p, c) => {
        const v = numericOf(c);
        return v !== null && (rule.bottom ? v <= threshold : v >= threshold);
      };
    }
    case 'aboveAverage': {
      const nums = rangeCells(sheet, ranges).map((x) => numericOf(x.cell)).filter((v): v is number => v !== null);
      if (nums.length === 0) return null;
      const avg = nums.reduce((s, v) => s + v, 0) / nums.length;
      const above = rule.aboveAverage !== false;
      return (_p, c) => {
        const v = numericOf(c);
        return v !== null && (above ? v > avg : v < avg);
      };
    }
    case 'expression': {
      const src = (f[0] ?? '').trim().replace(/^=/, '');
      const m = /^(.+?)(>=|<=|<>|=|>|<)(.+)$/.exec(src);
      if (!m || /[()+*/&,]/.test(src.replace(/"[^"]*"/g, ''))) return null;
      const [, lhs, op, rhs] = m;
      return (p) => {
        const dRow = p.row - anchor.row;
        const dCol = p.col - anchor.col;
        const a = resolveOperand(sheet, lhs!, dRow, dCol);
        const b = resolveOperand(sheet, rhs!, dRow, dCol);
        if (!a || !b) return false;
        return compare(op!, a, b) === true;
      };
    }
    default:
      return null;
  }
}

function mergeFmt(base: IRSpreadsheetRunFormat | undefined, add: IRSpreadsheetRunFormat): IRSpreadsheetRunFormat {
  return {
    ...base,
    bold: add.bold ?? base?.bold,
    italic: add.italic ?? base?.italic,
    colorHex: add.colorHex ?? base?.colorHex,
    fillHex: add.fillHex ?? base?.fillHex,
  };
}

export function applyConditionalFormatting(sheet: IRSheet): IRSheet {
  const rules = (sheet.conditionalFormattingRules ?? []).filter((r) => r.dxf);
  if (rules.length === 0) return sheet;

  const cells = sheet.cells.map((row) => row.slice());
  const ordered = [...rules].sort((a, b) => (a.priority ?? 1e9) - (b.priority ?? 1e9));
  // Per cell: which dxf properties were already claimed by a higher-priority rule, and whether a
  // stopIfTrue rule already matched (lower-priority rules then skip that cell entirely).
  const claimed = new Map<string, IRSpreadsheetRunFormat>();
  const stopped = new Set<string>();

  for (const rule of ordered) {
    const ranges = parseSqref(rule.sqref);
    if (ranges.length === 0) continue;
    const pred = buildPredicate(sheet, rule, ranges);
    if (!pred) continue;
    for (const r of ranges) {
      for (let row = r.r0; row <= r.r1; row++) {
        for (let col = r.c0; col <= r.c1; col++) {
          const key = `${row},${col}`;
          if (stopped.has(key)) continue;
          const orig = sheet.cells[row]?.[col];
          if (!pred({ row, col }, orig)) continue;
          const prev = claimed.get(key);
          const add = rule.dxf!;
          claimed.set(key, {
            bold: prev?.bold ?? add.bold,
            italic: prev?.italic ?? add.italic,
            colorHex: prev?.colorHex ?? add.colorHex,
            fillHex: prev?.fillHex ?? add.fillHex,
          });
          if (rule.stopIfTrue) stopped.add(key);
        }
      }
    }
  }

  for (const [key, add] of claimed) {
    const [row, col] = key.split(',').map(Number) as [number, number];
    const cell = cells[row]?.[col];
    if (cell) cells[row]![col] = { ...cell, fmt: mergeFmt(cell.fmt, add) };
  }
  return { ...sheet, cells };
}
