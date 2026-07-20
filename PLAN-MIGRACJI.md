# Plan Migracji: URL-e per język

## Spis treści
1. [Nowa struktura URL](#1-nowa-struktura-url)
2. [Zakres zmian — wszystkie pliki](#2-zakres-zmian--wszystkie-pliki)
3. [Przekierowania 301 — middleware](#3-przekierowania-301--middleware)
4. [Hreflang](#4-hreflang)
5. [Sitemap](#5-sitemap)
6. [Edge cases](#6-edge-cases)
7. [Sekwencja wdrożenia](#7-sekwencja-wdrożenia)
8. [Ryzyka i mitygacja](#8-ryzyka-i-mitygacja)

---

## (1) Nowa struktura URL

**Rekomendacja:** `/[locale]/[tool]` **z prefiksem dla WSZYSTKICH języków, włączając `en`.**

| Stary URL | Nowy URL |
|---|---|
| `/merge` | `/en/merge`, `/pl/merge`, `/de/merge`, ... (×16) |
| `/privacy` | `/en/privacy`, `/pl/privacy`, `/de/privacy` ... (×16, angielski slug dla wszystkich locale) |
| `/` (homepage) | `/en`, `/pl`, `/de`, ... |
| `/guides/guides/...` | bez zmian |

**Uzasadnienie SEO:**
- **Brak duplikacji** — każde narzędzie ma dokładnie jeden canonical URL na język
- **Spójność** — `x-default` hreflang wskazuje na `/en/merge`, ta sama struktura co pozostałe języki
- **Przyszłościowość** — dodanie nowego locale nie tworzy pytań o "który jest domyślny"

**Guide pages:** istniejąca struktura `/guides/{localeSegment}/...` (gdzie localeSegment to np. `przewodnik`, `guides`, `anleitungen`) pozostaje bez zmian. Migracja guidów do `/{locale}/guides/` to osobny projekt — złamałaby wszystkie istniejące linki. Niespójność między `/{locale}/tool` a `/guides/{localeSegment}/...` jest akceptowalna.

**Strony PL-only (rodo, wsparcie, nasze-zasady):** Zostaną zunifikowane — angielski slug dla wszystkich locale: `/pl/support`, `/en/support`, `/pl/rules`, `/en/rules`.

---

## (2) Zakres zmian — wszystkie pliki

### Faza przygotowawcza: scentralizowana lista narzędzi

Przed migracją URL-i, wyodrębnić listę narzędzi do osobnego pliku:

```ts
// NOWY: lib/tools.ts
export interface ToolDef { key: string; slug: string; category: string }
export const tools: ToolDef[] = [
  { key: 'merge', slug: 'merge', category: 'organize' },
  // ... wszystkie 39 narzędzi
];
export function toolPath(slug: string, locale: string): string {
  return `/${locale}/${slug}`;
}
```

Wszystkie pliki które obecnie DUPLIKUJĄ listę narzędzi zostaną przekonwertowane na import z `lib/tools.ts`:
- `components/Header.tsx` — `categories` array
- `components/MobileMenu.tsx` — identyczny `categories` array
- `components/Footer.tsx` — `toolLinks`, `convLinks`, `infoLinks`
- `components/guides/CTATool.tsx` — `toolHref` Record
- `components/Breadcrumbs.tsx` — `segmentToKey` Record
- `components/SchemaHowTo.tsx` — `segKey` Record
- `app/page.tsx` — `toolDefs` array
- `app/guide/page.tsx` — `guides` array
- `app/sitemap.ts` — `pages` array

### Nowe / zmodyfikowane pliki (routing)

| Plik | Operacja | Opis |
|---|---|---|
| `app/[locale]/page.tsx` | NOWY | Homepage przeniesiony z `app/page.tsx`, locale z params |
| `app/[locale]/layout.tsx` | NOWY | Layout per-locale z `generateMetadata` z hreflang alternates |
| `app/[locale]/[tool]/page.tsx` ×39 | NOWE (39) | Każde narzędzie przeniesione z `app/[tool]/page.tsx` |
| `app/[locale]/faq/page.tsx` | NOWY | Przeniesiony z `app/faq/page.tsx` |
| `app/[locale]/privacy/page.tsx` | NOWY | Przeniesiony z `app/privacy/page.tsx` |
| `app/[locale]/terms/page.tsx` | NOWY | Przeniesiony z `app/terms/page.tsx` |
| `app/[locale]/help/page.tsx` | NOWY | Przeniesiony z `app/help/page.tsx` |
| `app/[locale]/rodo/page.tsx` | NOWY | Slug zmieniony na `support` (unified English slug) |
| `app/[locale]/security/page.tsx` | NOWY | Przeniesiony z `app/security/page.tsx` |
| `app/[locale]/wsparcie/page.tsx` | NOWY | Slug zmieniony na `support` (unified English slug) |
| `app/[locale]/nasze-zasady/page.tsx` | NOWY | Slug zmieniony na `rules` (unified English slug) |
| `app/[locale]/guide/page.tsx` | NOWY | Przeniesiony z `app/guide/page.tsx` |
| `middleware.ts` | NOWY | 301 redirects ze starych URL-i na nowe |
| `app/sitemap.ts` | ZMIANA | Generowanie 1000+ entry z hreflang |
| `app/robots.ts` | BEZ ZMIAN | Sitemap URL działa z każdego locale |

### Pliki wymagające refactoringu (komponenty)

| Plik | Zmiana |
|---|---|
| `components/Header.tsx` | Użycie `toolPath(slug, locale)` z `lib/tools.ts` do generowania hrefów z prefixem locale |
| `components/MobileMenu.tsx` | j.w. |
| `components/Footer.tsx` | j.w. |
| `components/Breadcrumbs.tsx` | `segmentToKey` → import z `lib/tools.ts`; generowanie href z prefixem locale |
| `components/SchemaHowTo.tsx` | `segKey` → import z `lib/tools.ts`; URL-e z prefixem locale |
| `components/guides/CTATool.tsx` | `toolHref` → import z `lib/tools.ts`; href z locale prop |
| `components/LanguageSelector.tsx` | Logika przełączania: dla tool pages → `router.push(/${newLocale}/${currentSlug})`; dla guides → pozostaje bez zmian |
| `components/CookieConsent.tsx` | Naprawa: `/{locale}/privacy` zamiast hardcodowanego `/en/privacy` |
| `lib/locale-context.tsx` | Uproszczenie: locale może być odczytywany z URL zamiast localStorage; `setLocale` może zmieniać URL |

### Pliki do usunięcia (po migracji)

Po wdrożeniu redirectów, do usunięcia 39 plików narzędziowych:
`app/merge/page.tsx`, `app/split/page.tsx`, ... wszystkie 39 (+ ewentualne layouty)

Oraz strony informacyjne:
`app/faq/page.tsx`, `app/help/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx`,
`app/rodo/page.tsx`, `app/security/page.tsx`, `app/wsparcie/page.tsx`,
`app/nasze-zasady/page.tsx`, `app/guide/page.tsx`

---

## (3) Przekierowania 301 — middleware

```ts
const LOCALES = ['ar', 'de', 'en', 'es', 'fa', 'fr', 'hi', 'is', 'it', 'ja', 'no', 'pl', 'pt', 'sv', 'tr', 'zh'];

const LEGACY_PATHS = new Set([
  '', 'merge', 'split', 'compress', 'pdf-to-word', 'word-to-pdf',
  'jpg-to-pdf', 'protect-pdf', 'unlock-pdf', 'rotate-pdf', 'page-numbers',
  'watermark-pdf', 'ocr-pdf', 'extract-pages', 'delete-pages', 'reorder-pages',
  'crop-pdf', 'add-page', 'edit-pdf', 'metadata', 'openoffice-to-pdf', 'sign-pdf',
  'pdf-to-openoffice', 'pdf-to-excel', 'ai-chat', 'ai-summary', 'privacy',
  'pdf-to-powerpoint', 'compare-pdf', 'excel-to-pdf', 'pdf-to-txt',
  'html-to-pdf', 'url-to-pdf', 'pdf-to-html', 'flatten-pdf',
  'pdf-to-svg', 'redact-pdf', 'pdf-to-epub', 'ai-translate', 'fill-form',
  'pdf-to-images', 'to-pdfa', 'faq', 'help', 'rodo', 'security',
  'wsparcie', 'nasze-zasady', 'guide', 'terms',
]);
```

**Logika:**
1. Pierwszy segment jest locale (`en`, `pl`, ...) → przepuść
2. `_next`, `api`, `guides`, `icon` → przepuść
3. Stara ścieżka narzędzia → wybierz locale z cookie → nagłówek `Accept-Language` → fallback `en` → redirect na `/${locale}/path`
4. Ścieżka `/` → redirect na `/${locale}`
5. Stare slugi PL-only (`rodo` → `support`, `wsparcie` → `support`, `nasze-zasady` → `rules`) → redirect na `/${locale}/support` lub `/${locale}/rules`

**Ważne:** Najpierw 302 (tymczasowy), zmiana na 301 po potwierdzeniu indeksacji.

---

## (4) Hreflang

**Rozwiązanie: layout per-locale z `generateMetadata`**

```ts
// app/[locale]/layout.tsx (NOWY)
export async function generateMetadata({ params }): Promise<Metadata> {
  const { locale } = await params;
  const path = getToolPathFromSegment(/* wyciągnięte z URL */);

  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = `https://optimapdf.com/${l}${path}`;
  }
  languages['x-default'] = `https://optimapdf.com/en${path}`;

  return { alternates: { languages } };
}
```

To obsłuży WSZYSTKIE 39 narzędzi × 16 języków = **624 kombinacje** bez potrzeby osobnego `generateMetadata` dla każdej strony. Layout aplikuje się automatycznie do wszystkich podstron `/[locale]/...`.

**Wzór z guides:** już istniejące rozwiązanie w `app/guides/[locale]/[category]/[slug]/page.tsx` — generuje `alternates: { canonical, languages }`.

---

## (5) Sitemap

**Szacowany rozmiar:**
- Narzędzia: 39 × 16 = 624
- Strony informacyjne (faq, privacy, terms, help, support, rules, security, guide): 9 × 16 = 144
- Homepage: 16
- Guide hub: 16
- Guide categories: 7 × 16 = 112
- Guide articles: 7 × 16 = 112
- **Razem: ~1024 wpisy**

Jeden sitemap wystarczy (limit Google: 50 000).

**Struktura:**

```ts
export default function sitemap(): MetadataRoute.Sitemap {
  // 1. Homepage per locale z hreflang
  // 2. Tool pages per locale z hreflang
  // 3. Info pages per locale z hreflang
  // 4. Guide entries — istniejąca logika, bez zmian
}
```

**Walidacja:** dodać brakujące strony: `/nasze-zasady`, `/wsparcie`, `/terms`, `/guide`, `/security`.

---

## (6) Edge cases

**a) Stan narzędzi w URL:**
Żadne narzędzie (`edit-pdf`, `sign-pdf`, `compress`, `merge`, `split`, `protect-pdf`, `unlock-pdf`, `fill-form`, `ocr-pdf`, `compare-pdf`, `ai-chat`, `ai-summary`, `ai-translate`) nie używa URL query params ani hash dla stanu. Wszystkie przechowują stan w React useState / useRef / localStorage. Migracja URL nie wpływa na działanie.

**b) CookieConsent — hardcoded `/en/privacy`:**
Obecnie linia 68 ma `locale === 'pl' ? '/privacy' : '/en/privacy'`. Migracja naprawi: `/${locale}/privacy` dla wszystkich locale.

**c) pdf-to-jpg redirect:**
`app/pdf-to-jpg/page.tsx` → `redirect('/pdf-to-images')`. Po migracji: `/${locale}/pdf-to-jpg` → `/${locale}/pdf-to-images`. Wymaga aktualizacji ścieżki.

**d) LanguageSelector — guide path swapping:**
Dla guide pages podmienia segment locale (np. `guides` → `przewodnik`). Dla tool pages: `router.push(/${newLocale}/${currentSlug})`.

**e) Build time:**
~1024 statycznych stron zamiast ~300. Build time może wzrosnąć z ~12s do ~40s. Wciąż akceptowalne.

**f) PL-only pages:**
`rodo`, `wsparcie`, `nasze-zasady` → unified slugi: `support`, `rules` (angielskie slugi dla wszystkich locale). Treść dla PL po polsku, dla innych locale po angielsku.

---

## (7) Sekwencja wdrożenia

### Etap 1 — Scentralizowana lista narzędzi (bez zmian URL)
- Stworzyć `lib/tools.ts` z listą wszystkich narzędzi i helperem `toolPath()`
- Przekonwertować `Header.tsx`, `MobileMenu.tsx`, `Footer.tsx` na import z tego pliku
- Przekonwertować `Breadcrumbs.tsx`, `SchemaHowTo.tsx`, `CTATool.tsx`, `app/page.tsx`, `app/guide/page.tsx`, `app/sitemap.ts`
- **Test:** strona działa jak przed zmianą (nic się nie zmienia wizualnie)
- **Czas:** ~2h

### Etap 2 — Przygotowanie struktury `app/[locale]/` (proof of concept)
- Stworzyć `app/[locale]/layout.tsx` z `generateMetadata` generującym hreflang
- Stworzyć `app/[locale]/page.tsx` (homepage per locale)
- Stworzyć `app/[locale]/[tool]/page.tsx` dla 1-2 narzędzi jako proof of concept
- **Test:** `npm run dev` — sprawdzić `/en/merge` działa
- **Czas:** ~4h

### Etap 3 — Migracja wszystkich narzędzi i stron informacyjnych
- Skopiować wszystkie 39 `app/[tool]/page.tsx` → `app/[locale]/[tool]/page.tsx`
- Skopiować strony informacyjne (faq, privacy, help, terms, security, guide)
- Stworzyć nowe dla zmienionych slugów (support, rules)
- Zaktualizować komponenty (Header, Footer, MobileMenu, Breadcrumbs, SchemaHowTo, CTATool) na `toolPath(slug, locale)`
- Zaktualizować LanguageSelector, CookieConsent
- Zaktualizować lib/locale-context.tsx
- **Test:** `npm run build` — ~1024 stron z 0 błędami
- **Czas:** ~6h

### Etap 4 — Middleware z 302 redirectami
- Dodać `middleware.ts` z redirectami (locale z cookie → Accept-Language → en)
- **Test:** `/merge` → 302 → `/en/merge`; `/pl/merge` → przepuszczone
- **Test:** `/api/...`, `/_next/...`, `/guides/...` → przepuszczone
- **Deploy na staging/produkcję**
- Monitorować logi 404 przez 1-2 tygodnie

### Etap 5 — Aktualizacja sitemap
- Zaktualizować `app/sitemap.ts` na generowanie locale-prefixed entries
- **Test:** sitemap.xml zawiera `/en/merge`, `/pl/merge`, ... wszystkie kombinacje
- **Deploy**

### Etap 6 — Stałe przekierowania (po potwierdzeniu)
- 302 → 301 w middleware
- Usunąć stare pliki `app/[tool]/page.tsx`
- Zaktualizować `robots.ts` jeśli potrzebne

**Czas całkowity:** ~4-5 dni roboczych (z testowaniem i deployem).

---

## (8) Ryzyka i mitygacja

| Ryzyko | Prawdopodobieństwo | Wpływ | Mitygacja |
|---|---|---|---|
| Utrata SEO equity przy redirectach | Niskie-Średnie | Wysoki | 302 na początku (do potwierdzenia indeksacji), potem 301. Zachować stare URL-e przez min. 6 mies. Monitorować GSC. |
| Wzrost build time (300→1000 stron) | Pewne | Średni | Oczekiwane ~30-40s. Jeśli przekroczy 60s, rozważyć output: 'export' z pre-renderowaniem tylko popularnych locale (en, pl, de, es, fr) reszta on-demand. |
| Błędy w redirectach middleware | Niskie | Średni | Testy automatyczne: lista wszystkich starych URL-i → oczekiwany kod + nowy URL. |
| Złamanie linków zewnętrznych | Wysokie (nieuniknione) | Wysoki | 301 redirect przenosi ~90-99% link equity. Im szybciej po migracji, tym mniejsza utrata. |
| Regresja w LanguageSelector | Niskie | Niski | Osobne testy dla guide pages (localeSegment swap) i tool pages (locale code swap). |
| Duplikacja w Google (wersje z/bez locale) | Średnie (tymczasowo) | Średni | canonical linki w layout per-locale rozwiewają wątpliwości. |
| Decyzja biznesowa: treść EN dla support/rules | Niskie | Niski | Angielska treść do napisania dla `/en/support`, `/en/rules`. Jeśli nie gotowa → tymczasowo przekierować do `/en/privacy`. |

**Podsumowanie:** Głównym ryzykiem jest tymczasowe pogorszenie SEO podczas okresu przejściowego. Standardowe ryzyko każdej migracji URL-i. Najważniejsze: (a) 302 na początku, (b) monitorować GSC daily przez 2 tygodnie po 301, (c) nie usuwać starych plików zanim Google nie zaindeksuje nowych URL-i.
