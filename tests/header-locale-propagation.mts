// Audit finding (fresh scanning round, components/Header.tsx + MobileMenu/LanguageSelector/
// ThemeToggle) — Header receives a correct, URL-derived `locale` prop from its own parent
// (LayoutShell.tsx's extractLocaleFromPath(), passed down the same way to Footer/Breadcrumbs/
// SchemaHowTo/HtmlLang), but rendered its three child controls — <MobileMenu/>,
// <LanguageSelector/>, <ThemeToggle/> — with NO locale prop at all. All three, having no prop to
// fall back on, always called useHydrationSafeLocale() themselves, whose value comes only from
// localStorage/the x-detected-locale cookie (a browser-language guess set client-side) — never
// from the current URL path.
//
// Concrete, real scenario: a first-time visitor (nothing stored yet, browser language English)
// opens /de/merge directly. Header's own nav labels correctly render in German (it received the
// correct forcedLocale='de'), but the hamburger menu's labels, the language dropdown's shown
// flag/label and its "active" highlight, and the theme toggle's tooltip all rendered in
// English — a visible mismatch between sibling elements on the very same render.
//
// Fixed by having all three accept an optional `locale` prop (same `forcedLocale ??
// useHydrationSafeLocale()` pattern already used by Header/Footer/Breadcrumbs/SchemaHowTo), with
// Header now passing its own resolved `locale` down to all three.
//
// MobileMenu (uses createPortal against document.body) and LanguageSelector (uses
// next/navigation's usePathname/useRouter, which need an app-router context) aren't practical to
// fully render via react-dom/server here — verified at the source level instead. ThemeToggle has
// no such dependencies, so its actual rendered output is verified directly.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

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

console.log('=== source check: Header passes its resolved locale down to all 3 child controls ===');
{
  const src = readFileSync(join(ROOT, 'components', 'Header.tsx'), 'utf-8');
  check(/<MobileMenu\s+locale=\{locale\}\s*\/>/.test(src), 'Header renders <MobileMenu locale={locale} />');
  check(/<LanguageSelector\s+locale=\{locale\}\s*\/>/.test(src), 'Header renders <LanguageSelector locale={locale} />');
  check(/<ThemeToggle\s+locale=\{locale\}\s*\/>/.test(src), 'Header renders <ThemeToggle locale={locale} />');
}

console.log('\n=== source check: MobileMenu/LanguageSelector/ThemeToggle accept an optional locale prop with the established fallback ===');
for (const [file, fn] of [
  ['MobileMenu.tsx', 'MobileMenu'],
  ['LanguageSelector.tsx', 'LanguageSelector'],
  ['ThemeToggle.tsx', 'ThemeToggle'],
] as [string, string][]) {
  const src = readFileSync(join(ROOT, 'components', file), 'utf-8');
  const sigMatch = src.match(new RegExp(`export default function ${fn}\\(\\{ locale: forcedLocale \\}: \\{ locale\\?: Locale \\} = \\{\\}\\)`));
  check(!!sigMatch, `${file}: ${fn}() signature accepts an optional { locale?: Locale } prop`);
  check(src.includes('forcedLocale ?? useHydrationSafeLocale()'), `${file}: falls back to useHydrationSafeLocale() only when no locale prop was given`);
}

console.log('\n=== behavioral check: ThemeToggle actually renders the FORCED locale\'s translation, not the hydration-safe default ===');
{
  const { default: ThemeToggle } = await import('../components/ThemeToggle');
  const htmlDe = renderToStaticMarkup(React.createElement(ThemeToggle, { locale: 'de' }));
  const htmlDefault = renderToStaticMarkup(React.createElement(ThemeToggle));
  check(htmlDe.includes('Dunkler Modus'), `ThemeToggle with locale="de" renders the German tooltip "Dunkler Modus" (got: ${htmlDe.match(/title="[^"]*"/)?.[0]})`);
  check(!htmlDe.includes('Dark mode'), 'ThemeToggle with locale="de" does NOT render the English tooltip');
  check(htmlDefault.includes('Dark mode'), `ThemeToggle with no locale prop falls back to the hydration-safe default (English, server-side): "Dark mode" (got: ${htmlDefault.match(/title="[^"]*"/)?.[0]})`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
