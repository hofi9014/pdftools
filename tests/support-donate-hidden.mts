// The /wsparcie page's donation button is hidden while the Stripe link is still in test mode
// (owner's decision 2026-11-20): a real card cannot pay there. Run: npm run test:support-donate-hidden
import { createElement as h, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const { locales } = await import('../lib/i18n.ts');
const { content } = await import('../content/pages/wsparcie.ts');
const View = (await import('../components/pages/SupportView.tsx')).default as ComponentType<Record<string, unknown>>;

let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };

for (const l of locales) {
  const lang = (content as Record<string, typeof content.pl>)[l] ?? content.en;
  const html = renderToStaticMarkup(h(View, { locale: l, content }));
  check(!/stripe\.com/i.test(html) && !html.includes(lang.donateSection.button) && !/TRYB TESTOWY/.test(html), `${l}: no donation button, no Stripe link`);
  check(html.includes(lang.sections[0]!.linkText ?? '@'), `${l}: the contact section is still there`);
}
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
