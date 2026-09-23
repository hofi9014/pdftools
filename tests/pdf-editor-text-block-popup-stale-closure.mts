// Audit finding (components/edit-pdf/PdfEditor.tsx) — showTextEditPopup() was declared AFTER
// handleTextBlockClick() but called from inside it, with handleTextBlockClick's own useCallback
// dependency array listing only [currentPage, textBlocks] — NOT showTextEditPopup, even though
// its body calls it. Both eslint-plugin-react-hooks rules independently confirm this: the
// "accessed before it is declared... prevents the earlier access from updating when this value
// changes over time" error, and the classic exhaustive-deps "missing dependency:
// showTextEditPopup" warning.
//
// Real-world consequence: showTextEditPopup is its own useCallback depending on
// [canvasWidth, canvasHeight], so a fresh instance is created whenever those change (the canvas
// finishing its async render, well after PageRenderer mounts). But handleTextBlockClick only
// gets a fresh closure when currentPage/textBlocks change — and in the real page-load sequence,
// textBlocks arrives (from a separate async text-extraction effect) BEFORE the canvas finishes
// rendering. So by the time a user clicks a detected text block, handleTextBlockClick is very
// often still the ORIGINAL closure from the first render, permanently pinned to that render's
// showTextEditPopup — the one built with canvasWidth=canvasHeight=0 — regardless of what
// canvasWidth/canvasHeight hold in current state or in the live DOM. That stale
// showTextEditPopup divides by its own closed-over canvasHeight=0, producing `top: Infinity` —
// deterministic (reproducible every time in this exact loading sequence), not merely a rare
// timing race, and NOT something the `{canvasWidth > 0 && ...}` mount guard can prevent, since
// EditLayer (and its onTextBlockClick prop) mounts fine once canvasWidth is truthy — the guard
// only prevents the overlay from mounting at canvasWidth===0, it says nothing about which
// CLOSURE of handleTextBlockClick got passed down.
//
// Fixed by declaring showTextEditPopup before handleTextBlockClick (so the reference is to an
// already-initialized binding at read time, addressing the "accessed before declared" hazard
// too) and adding it to handleTextBlockClick's own dependency array, so a fresh
// showTextEditPopup (i.e. a real canvasWidth/canvasHeight change) now also forces a fresh
// handleTextBlockClick.
//
// Verified two ways: (1) a source-level check that showTextEditPopup is declared before
// handleTextBlockClick and that handleTextBlockClick's dependency array includes it; (2) a
// standalone reproduction of React's OWN useCallback memoization algorithm (Object.is comparison
// across the dependency array, returning the previous render's function reference unchanged when
// deps compare equal) driven through the EXACT render sequence this component goes through on a
// real page load (text blocks arrive before the canvas finishes rendering), proving the OLD
// dependency array calls a stale showTextEditPopup that computes top:Infinity, while the FIXED
// dependency array calls the current one that computes a finite, correct top.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');

console.log('=== source check: showTextEditPopup declared before handleTextBlockClick, and listed as its dependency ===');
{
  const src = readFileSync(join(ROOT, 'components', 'edit-pdf', 'PdfEditor.tsx'), 'utf-8');
  const showIdx = src.indexOf('const showTextEditPopup = useCallback');
  const clickIdx = src.indexOf('const handleTextBlockClick = useCallback');
  check(showIdx !== -1, 'found showTextEditPopup declaration');
  check(clickIdx !== -1, 'found handleTextBlockClick declaration');
  check(showIdx !== -1 && clickIdx !== -1 && showIdx < clickIdx, 'showTextEditPopup is declared BEFORE handleTextBlockClick (not just hoisted-in-time)');

  const clickBlockMatch = src.match(/const handleTextBlockClick = useCallback\(\(block[\s\S]*?\}, \[([^\]]*)\]\);/);
  check(!!clickBlockMatch, 'found handleTextBlockClick\'s full useCallback(...) call including its dependency array');
  const deps = clickBlockMatch?.[1] ?? '';
  check(deps.includes('showTextEditPopup'), `handleTextBlockClick's dependency array includes showTextEditPopup (got deps: "${deps.trim()}")`);
  check(deps.includes('currentPage') && deps.includes('textBlocks'), 'handleTextBlockClick still depends on currentPage and textBlocks too (no regression on the other deps)');
}

console.log('\n=== standalone reproduction: React\'s own useCallback memoization, driven through the real page-load render sequence ===');
{
  // A faithful, minimal reproduction of React's useCallback: returns the SAME function reference
  // across renders as long as every entry in `deps` is Object.is-equal to the previous render's
  // deps at the same slot — otherwise returns (and remembers) the new one. Each "hook slot" needs
  // its own independent memory cell, exactly like React's per-hook-call fiber state.
  function makeHookSlot<T>() {
    let memoFn: T | null = null;
    let memoDeps: unknown[] | null = null;
    return (fn: T, deps: unknown[]): T => {
      if (memoDeps && deps.length === memoDeps.length && deps.every((d, i) => Object.is(d, memoDeps![i]))) {
        return memoFn as T;
      }
      memoFn = fn;
      memoDeps = deps;
      return fn;
    };
  }

  type ShowPopupFn = (block: { y: number }) => number; // returns the computed `top`

  function simulateRender(
    showSlot: ReturnType<typeof makeHookSlot<ShowPopupFn>>,
    clickSlot: ReturnType<typeof makeHookSlot<(block: { y: number }) => number>>,
    canvasWidth: number,
    canvasHeight: number,
    textBlocks: object[],
    currentPage: number,
    useFixedDeps: boolean,
  ): (block: { y: number }) => number {
    // Mirrors the real showTextEditPopup body: `r.top + (block.y / canvasHeight) * r.height + 10`
    // — r.top/r.height are fixed real-DOM values (contRef's getBoundingClientRect()), stubbed as
    // constants here since the bug is entirely about which canvasHeight gets divided by, not
    // about the DOM rect itself.
    const R_TOP = 120, R_HEIGHT = 900;
    const showTextEditPopup = showSlot(
      (block: { y: number }) => R_TOP + (block.y / canvasHeight) * R_HEIGHT + 10,
      [canvasWidth, canvasHeight],
    );
    // handleTextBlockClick's body, as in source: looks up the block then calls
    // showTextEditPopup(tb) — the closure captures whichever `showTextEditPopup` binding was
    // live in THIS render's scope.
    const handleTextBlockClick = clickSlot(
      (block: { y: number }) => showTextEditPopup(block),
      useFixedDeps ? [currentPage, textBlocks, showTextEditPopup] : [currentPage, textBlocks],
    );
    return handleTextBlockClick;
  }

  // Real page-load sequence, reproduced faithfully:
  //   render 1: initial mount — canvasWidth=canvasHeight=0, textBlocks=[]
  //   render 2: text-extraction effect resolves — textBlocks becomes non-empty; canvas is STILL
  //             rendering (canvasWidth/canvasHeight still 0) — this is the real, common ordering
  //             (extraction and canvas rendering are two independent async processes, and
  //             extraction typically finishes first since canvas rendering waits on pdf.js's
  //             own page.render()).
  //   render 3: PageRenderer's onRenderComplete finally fires — canvasWidth/canvasHeight become
  //             real, non-zero values; textBlocks/currentPage are unchanged since render 2.
  //   (user clicks a detected text block AFTER render 3, using whatever handleTextBlockClick
  //   instance render 3 produced — exactly what EditLayer's onTextBlockClick prop holds.)
  const block = { y: 300 };

  for (const useFixedDeps of [false, true]) {
    const showSlot = makeHookSlot<ShowPopupFn>();
    const clickSlot = makeHookSlot<(block: { y: number }) => number>();
    const sameTextBlocks = [{ id: 'b1' }]; // same array reference across renders 2 and 3 — no re-extraction happens between them

    simulateRender(showSlot, clickSlot, 0, 0, [], 1, useFixedDeps); // render 1
    const clickAfterRender2 = simulateRender(showSlot, clickSlot, 0, 0, sameTextBlocks, 1, useFixedDeps); // render 2
    const clickAfterRender3 = simulateRender(showSlot, clickSlot, 800, 1000, sameTextBlocks, 1, useFixedDeps); // render 3

    const label = useFixedDeps ? 'FIXED (showTextEditPopup in deps)' : 'OLD (showTextEditPopup missing from deps)';
    check(useFixedDeps ? clickAfterRender2 !== clickAfterRender3 : clickAfterRender2 === clickAfterRender3,
      `${label}: handleTextBlockClick ${useFixedDeps ? 'gets a fresh closure' : 'reuses the SAME stale closure'} across render 2 -> render 3 (currentPage/textBlocks unchanged, only canvasWidth/canvasHeight changed)`);

    const resultTop = clickAfterRender3(block);
    if (useFixedDeps) {
      check(Number.isFinite(resultTop), `${label}: clicking the text block after the canvas finishes rendering computes a FINITE top (got: ${resultTop}) — the actual bug fix`);
      check(Math.abs(resultTop - (120 + (300 / 1000) * 900 + 10)) < 0.001, `${label}: the finite top is computed using the CURRENT canvasHeight=1000, not a stale one (got: ${resultTop})`);
    } else {
      check(resultTop === Infinity, `${label}: reproduces the exact reported bug — clicking the text block after the canvas finishes rendering still computes top:Infinity (got: ${resultTop}), because handleTextBlockClick never got a fresh closure`);
    }
  }
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
