// The source text of the translations, for tests that count a key across the 16 languages
// ("'page.x': appears 16 times"). Since 2026-10-22 the dictionaries are one file per language in
// lib/translations/; lib/i18n.ts keeps the code (and the `locales` list).
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function i18nSource(): string {
  const dir = join(ROOT, 'lib', 'translations');
  const files = readdirSync(dir).filter((f) => /^[a-z]{2}\.ts$/.test(f)).sort();
  return [join(ROOT, 'lib', 'i18n.ts'), ...files.map((f) => join(dir, f))].map((f) => readFileSync(f, 'utf8')).join('\n');
}
