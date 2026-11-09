import { t } from '@/lib/i18n';
import { ApiError, apiErrorText } from '@/lib/api-error';

// The PDF engine (lib/client-pdf.ts, lib/client-ocr.ts, lib/pdf/*) throws its user-facing errors
// in Polish, and the tool pages showed err.message as is — so a German or Japanese visitor with a
// password-protected PDF read "PDF jest zabezpieczony hasłem…". The engine messages stay as they
// are (tests and logs rely on them); this turns a known one into the page's language.
// tests/hardcoded-polish.mts checks that every Polish message thrown under lib/ has an entry here.
export const ENGINE_MESSAGES: { re: RegExp; key: string; params?: (m: RegExpMatchArray) => Record<string, string> }[] = [
  { re: /^PDF jest zabezpieczony hasłem/, key: 'engine.err.encrypted' },
  { re: /^Nie można odczytać pliku/, key: 'engine.err.file_unreadable' },
  { re: /^Błąd OCR na stronie (\d+)/, key: 'engine.err.ocr_page', params: (m) => ({ page: m[1]! }) },
  { re: /^Nie wykryto żadnej tabeli/, key: 'engine.err.no_table' },
  { re: /^Nie znaleziono dokumentu w pliku \.docx/, key: 'engine.err.docx_empty' },
  { re: /^Nie znaleziono treści w pliku ODF/, key: 'engine.err.odf_empty' },
  { re: /^Format \.(\w+) nie jest obsługiwany/, key: 'engine.err.format_unsupported', params: (m) => ({ ext: m[1]! }) },
  { re: /^Nie wybrano żadnej strony/, key: 'engine.err.no_pages' },
  { re: /^Nie udało się zapisać obrazu strony/, key: 'engine.err.page_image' },
  { re: /^Nie udało się odczytać pliku \.p12\/\.pfx/, key: 'engine.err.p12_read' },
  { re: /^Ten plik \.p12\/\.pfx zawiera klucz prywatny w nieobsługiwanym formacie/, key: 'engine.err.p12_ec' },
  { re: /^Nie znaleziono klucza prywatnego w pliku \.p12\/\.pfx/, key: 'engine.err.p12_no_key' },
  { re: /^Nie znaleziono certyfikatu w pliku \.p12\/\.pfx/, key: 'engine.err.p12_no_cert' },
  { re: /^Nie udało się zlokalizować pola (ByteRange|Contents)|^Nieoczekiwana zawartość wokół pola Contents/, key: 'engine.err.sign_internal' },
  { re: /^Podpis \(\d+ B\) jest większy niż zarezerwowane miejsce/, key: 'engine.err.sign_too_large' },
  { re: /^Canvas nie udostępnia/, key: 'engine.err.browser_unsupported' },
];

/** The text of an engine message in the page's language, or null when the message is not known. */
export function engineMessageText(message: string, locale: string): string | null {
  for (const { re, key, params } of ENGINE_MESSAGES) {
    const m = message.match(re);
    if (m) return t(key, locale, params?.(m));
  }
  return null;
}

/** What a tool page shows for anything thrown while processing a file. */
export function errorText(err: unknown, locale: string): string {
  if (err instanceof ApiError) return apiErrorText(err, locale);
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  if (!message) return t('error.generic', locale);
  return engineMessageText(message, locale) ?? message;
}
