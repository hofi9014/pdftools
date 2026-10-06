// A defect in Apache OpenOffice 4's Word (.docx) import, measured with OpenOffice 4.1 on every
// code point: a run whose whole text is ONE character with a UTF-16 low byte of 0x07 or 0x0D is
// not text to it — the importer compares that low byte with Word's old binary control codes
// (0x07 cell mark, 0x0D paragraph mark), drops the character and ends the paragraph there.
//
// The Polish "ć" is U+0107. So are the Czech/Croatian "č" (U+010D), the Ukrainian "Ї" (U+0407),
// the zero-width joiner (U+200D)… A PDF drawn glyph by glyph (every Chrome "Save as PDF") turns
// into runs of one or two characters, and each lone "ć" became a missing letter and a broken
// line in OpenOffice. Word and LibreOffice read such a run correctly.
//
// The same character inside a longer run is read correctly, so a lone unsafe character is given
// company: one character taken from the neighbouring run (it takes on this run's formatting —
// one character of formatting bleed instead of a lost letter), or a trailing space when the run
// has no neighbour to borrow from.

export function isAooUnsafeSingleChar(text: string): boolean {
  if (text.length !== 1) return false;
  const code = text.charCodeAt(0);
  const low = code & 0xff;
  return code > 0xff && (low === 0x07 || low === 0x0d);
}

/**
 * Returns runs (shallow copies where changed) in which no run consists of a single unsafe
 * character. The concatenated text is unchanged, except for a trailing space added to a run that
 * is alone in its group.
 */
export function protectSingleCharRuns<T extends { text: string }>(runs: readonly T[]): T[] {
  const out: T[] = runs.map((r) => r);
  for (let i = 0; i < out.length; i++) {
    const run = out[i]!;
    if (!isAooUnsafeSingleChar(run.text)) continue;
    const next = out[i + 1];
    const prev = out[i - 1];
    if (next && next.text.length >= 1) {
      // Take the next run's first character (a surrogate pair stays whole).
      const take = /^[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(next.text) ? 2 : 1;
      out[i] = { ...run, text: run.text + next.text.slice(0, take) };
      const rest = next.text.slice(take);
      if (rest.length > 0) out[i + 1] = { ...next, text: rest };
      else out.splice(i + 1, 1);
    } else if (prev) {
      const take = /[\uD800-\uDBFF][\uDC00-\uDFFF]$/.test(prev.text) ? 2 : 1;
      const left = prev.text.slice(0, -take);
      if (left.length > 0 && !isAooUnsafeSingleChar(left)) {
        out[i - 1] = { ...prev, text: left };
        out[i] = { ...run, text: prev.text.slice(-take) + run.text };
      } else {
        // Borrowing would empty the previous run or leave it a lone unsafe character itself:
        // the two become one run.
        out[i] = { ...run, text: prev.text + run.text };
        out.splice(i - 1, 1);
        i--;
      }
    } else {
      out[i] = { ...run, text: `${run.text} ` };
    }
  }
  return out;
}
