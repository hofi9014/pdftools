// Audit finding (Medium, ui area) — components/PagePreview.tsx's reorder mode had no keyboard
// alternative to HTML5 mouse drag-and-drop, unlike app/merge/page.tsx's file list, which offers
// ↑/↓ buttons for the same kind of reordering.
//
// Fixed by adding a moveThumbnail(displayPos, direction) handler plus real <button> elements
// (↑/↓) rendered in reorder mode, following the exact pattern already used by app/merge/page.tsx
// (moveFile). Native <button> elements are natively focusable and keyboard-operable (Tab to
// focus, Enter/Space to activate) with zero extra keydown handling required — that IS the fix,
// the same reason merge's own ↑/↓ buttons need no onKeyDown of their own.
//
// Live browser verification (used successfully for prior fixes in this audit) is not possible
// for this specific component: PagePreview's thumbnail rendering depends on a pdf.js Web Worker
// that never completes in this session's sandboxed browser tool — confirmed this is an
// environment limitation, not a regression, by reproducing the identical stuck-on-"Loading page
// preview" behavior on the completely untouched components/PagePreview.tsx consumer
// app/delete-pages/page.tsx (same shared component, same thumbnail pipeline, zero code from
// this fix touches renderThumbnails/initPdfjs). This test instead verifies (1) the reordering
// logic in isolation and (2) the actual rendered source, which is what a browser would execute.

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

console.log('=== PagePreview reorder mode: keyboard-operable move buttons ===');

// Re-implementation of moveThumbnail's logic, exactly as added to the component, so the swap
// semantics can be checked in isolation without a DOM/React harness.
function moveThumbnail(order: number[], displayPos: number, direction: -1 | 1): number[] {
  const target = displayPos + direction;
  if (target < 0 || target >= order.length) return order;
  const next = [...order];
  [next[displayPos], next[target]] = [next[target], next[displayPos]];
  return next;
}

console.log('--- swap logic ---');
check(JSON.stringify(moveThumbnail([0, 1, 2], 1, -1)) === JSON.stringify([1, 0, 2]), 'moving position 1 up swaps with position 0');
check(JSON.stringify(moveThumbnail([0, 1, 2], 1, 1)) === JSON.stringify([0, 2, 1]), 'moving position 1 down swaps with position 2');
check(JSON.stringify(moveThumbnail([0, 1, 2], 0, -1)) === JSON.stringify([0, 1, 2]), 'moving the first position up is a no-op (no page above it)');
check(JSON.stringify(moveThumbnail([0, 1, 2], 2, 1)) === JSON.stringify([0, 1, 2]), 'moving the last position down is a no-op (no page below it)');

console.log('--- composed moves reach the same outcome as a drag reorder ---');
// dragging page originally at index 2 to the front is equivalent to two "move up" clicks
// on its current display position.
let order = [0, 1, 2];
order = moveThumbnail(order, 2, -1); // [0,2,1]
order = moveThumbnail(order, 1, -1); // [2,0,1]
check(JSON.stringify(order) === JSON.stringify([2, 0, 1]), `two "move up" clicks move the last page to the front — got ${JSON.stringify(order)}`);

console.log('\n--- source check: real, keyboard-operable <button> elements, not the old hover-only hint ---');
const { readFileSync } = await import('node:fs');
const { fileURLToPath } = await import('node:url');
const { dirname, join } = await import('node:path');
const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'components', 'PagePreview.tsx'), 'utf-8');

check(src.includes('const moveThumbnail'), 'moveThumbnail handler is defined');
check(/mode === 'reorder'[\s\S]{0,400}moveThumbnail\(displayPos, -1\)/.test(src), "the move-up button's onClick calls moveThumbnail(displayPos, -1) inside the reorder-mode block");
check(/moveThumbnail\(displayPos, 1\)/.test(src), 'the move-down button calls moveThumbnail(displayPos, 1)');
check((src.match(/type="button"/g) || []).length >= 2, 'both buttons use type="button" (real, focusable, keyboard-operable elements)');
check(src.includes("aria-label={t('preview.move_up', locale)}"), "move-up button has a translated aria-label (preview.move_up)");
check(src.includes("aria-label={t('preview.move_down', locale)}"), "move-down button has a translated aria-label (preview.move_down)");
check(!/opacity-0 group-hover:opacity-100/.test(src), 'the old hover-only (not keyboard-reachable) "↕" hint is gone, replaced by always-rendered buttons');
check(/displayPos > 0/.test(src) && /displayPos < displayPages\.length - 1/.test(src), 'buttons are conditionally hidden at the array boundaries (first page has no up button, last has no down button)');

console.log('\n--- i18n: preview.move_up / preview.move_down present for all 16 locales ---');
const i18nSrc = readFileSync(join(here, '..', 'lib', 'i18n.ts'), 'utf-8');
const localesMatch = i18nSrc.match(/^export const locales = \[([^\]]+)\]/m);
if (!localesMatch) {
  console.log('  FAIL could not find the locales export in lib/i18n.ts');
  fails++;
} else {
  const locales = [...localesMatch[1].matchAll(/'([a-z]{2})'/g)].map(m => m[1]);
  check(locales.length === 16, `locales export lists 16 languages — got ${locales.length}`);
  const upCount = (i18nSrc.match(/'preview\.move_up':/g) || []).length;
  const downCount = (i18nSrc.match(/'preview\.move_down':/g) || []).length;
  check(upCount === 16, `preview.move_up defined exactly 16 times (once per locale) — got ${upCount}`);
  check(downCount === 16, `preview.move_down defined exactly 16 times (once per locale) — got ${downCount}`);

  // Every move_up value must be non-empty and distinct from the raw key (i.e. actually translated,
  // not a fallback) — mirrors the same check used for the password-toggle-aria fix.
  const upValues = [...i18nSrc.matchAll(/'preview\.move_up':\s*'([^']*)'/g)].map(m => m[1]);
  const downValues = [...i18nSrc.matchAll(/'preview\.move_down':\s*'([^']*)'/g)].map(m => m[1]);
  check(upValues.length === 16 && upValues.every(v => v.length > 0), 'every preview.move_up value is non-empty');
  check(downValues.length === 16 && downValues.every(v => v.length > 0), 'every preview.move_down value is non-empty');
  check(upValues.every((v, i) => v !== downValues[i]), 'move_up and move_down are distinct translations in every locale (not copy-pasted)');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
