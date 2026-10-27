import { createHash } from 'node:crypto';
import { messagesFor, MESSAGES_GLOBAL, type Locale } from '@/lib/i18n';

/**
 * A page's dictionary as one small script per language (/pl/messages.js), served by
 * app/[locale]/messages.js/route.ts and loaded before hydration by app/_root/RootDocument.tsx.
 *
 * Until 2026-10-27 the dictionary was passed to the client as page data, so every prerendered
 * page carried it four times (HTML, .rsc, the layout segment and the full segment): about 230 of
 * the 340 kB of each of the 1109 pages, some 250 MB per deployment on a plan with a 10 GB
 * deployment storage limit. As a file it is stored once per language and, in the browser,
 * downloaded once and then cached for every page of that language.
 *
 * Server only (node:crypto).
 */

const cache = new Map<Locale, { source: string; version: string }>();

function build(locale: Locale) {
  let entry = cache.get(locale);
  if (!entry) {
    // JSON.parse of a string literal: parsed faster than an object literal of the same size,
    // and no eval (the CSP has none in production).
    const json = JSON.stringify(messagesFor(locale));
    const source = `(self.${MESSAGES_GLOBAL}=self.${MESSAGES_GLOBAL}||{})[${JSON.stringify(locale)}]=JSON.parse(${JSON.stringify(json)});\n`;
    entry = { source, version: createHash('sha256').update(source).digest('hex').slice(0, 12) };
    cache.set(locale, entry);
  }
  return entry;
}

/** The script's source. */
export function messagesScript(locale: Locale): string {
  return build(locale).source;
}

/**
 * Where the page loads it from. The version changes with the content, so the file can be cached
 * for a year: a changed dictionary is a new address.
 */
export function messagesSrc(locale: Locale): string {
  return `/${locale}/messages.js?v=${build(locale).version}`;
}
