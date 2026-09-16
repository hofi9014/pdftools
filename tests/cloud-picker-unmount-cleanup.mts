// Audit finding (Medium, backend area) — CloudFilePicker.tsx's unmount-cleanup useEffect
// only cleared googleWatchdogRef (a 120s Google sign-in timer). If the component unmounted
// while a OneDrive OAuth flow was in progress (user navigates away mid-login), the OneDrive
// polling interval (oauthIntervalRef, checking the popup every 500ms) and the open
// BroadcastChannel (bcRef) kept running/open indefinitely — a resource leak, and a path to
// calling setState on an unmounted component.
//
// Fixed by extending the same unmount cleanup to also clear the OneDrive interval and close
// the BroadcastChannel, matching the existing googleWatchdogRef pattern already there.
//
// This component holds real browser state (window.open popups, BroadcastChannel) not
// practically mountable/unmountable in a Node test without new browser-simulation
// infrastructure this project doesn't otherwise use, so this verifies the fix at the source
// level: the unmount effect's cleanup function now references and clears all three refs, not
// just the Google one.

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

console.log('=== CloudFilePicker: unmount cleanup covers the OneDrive interval/channel, not just Google ===');

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'components', 'CloudFilePicker.tsx'), 'utf-8');

const commentAnchor = src.indexOf('when the component unmounts');
check(commentAnchor !== -1, 'sanity: found the unmount-cleanup comment');

const afterComment = src.slice(commentAnchor);
const effectMatch = afterComment.match(/useEffect\(\(\) => \{\s*return \(\) => \{/);
check(!!effectMatch, 'sanity: found the unmount useEffect right after the comment');
const effectStart = effectMatch ? commentAnchor + effectMatch.index! : -1;

function extractBalanced(text: string, openIndex: number): string {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(openIndex, i + 1);
    }
  }
  throw new Error('unbalanced braces');
}

const bodyOpenIdx = src.indexOf('{', effectStart);
const effectBody = extractBalanced(src, bodyOpenIdx);

check(effectBody.includes('googleWatchdogRef.current') && effectBody.includes('clearTimeout(googleWatchdogRef.current)'), 'unmount cleanup still clears the Google watchdog (unchanged)');
check(effectBody.includes('oauthIntervalRef.current') && effectBody.includes('clearInterval(oauthIntervalRef.current)'), 'unmount cleanup now clears the OneDrive polling interval');
check(effectBody.includes('bcRef.current') && effectBody.includes('bcRef.current.close()'), 'unmount cleanup now closes the OneDrive BroadcastChannel');

// Regression guard: the dependency array must still be empty ([]) — this must run exactly
// once on mount and clean up exactly once on unmount, not re-subscribe on every render.
const afterEffectBody = src.slice(bodyOpenIdx + effectBody.length, bodyOpenIdx + effectBody.length + 20);
check(/^\s*,\s*\[\]\s*\)/.test(afterEffectBody), `the effect still has an empty dependency array, runs once (got: ${JSON.stringify(afterEffectBody)})`);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
