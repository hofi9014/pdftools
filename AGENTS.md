<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# OptimaPDF — Stan projektu

## Opis
Polskojęzyczna aplikacja webowa do edycji plików PDF (Next.js 16, React 19, Tailwind CSS 4, TypeScript).
**Wszystkie narzędzia działają w całości po stronie klienta (przeglądarka).** Dwa endpointy: `/api/url-to-pdf` i `/api/exports`.

## Strony (50 statycznych, wszystkie ○)
- `/` — strona główna z listą narzędzi (PL/EN, i18n)
- Narzędzia: `merge`, `split`, `compress`, `protect-pdf`, `unlock-pdf`, `rotate-pdf`, `watermark-pdf`, `page-numbers`, `ocr-pdf`, `extract-pages`, `delete-pages`, `reorder-pages`, `crop-pdf`, `add-page`, `metadata`, `edit-pdf`, `sign-pdf`, `redact-pdf`
- Konwersje: `pdf-to-word`, `word-to-pdf`, `pdf-to-jpg`, `jpg-to-pdf`, `pdf-to-excel`, `excel-to-pdf`, `pdf-to-powerpoint`, `pdf-to-openoffice`, `openoffice-to-pdf`, `pdf-to-txt`, `pdf-to-svg`, `pdf-to-epub`, `pdf-to-html`, `html-to-pdf`, `url-to-pdf`, `flatten-pdf`, `pdf-to-images`
- AI: `ai-chat`, `ai-summary`, `ai-translate` (kliencko, OpenRouter API key w localStorage)
- Porównanie: `compare-pdf` (tekstowe + wizualne z canvas overlay)
- Formularze: `fill-form` (AcroForm — wypełnianie pól)
- Archiwizacja: `to-pdfa` (PDF/A-1b best-effort)
- Inne: `privacy` (polityka prywatności RODO)

## Kluczowe funkcje w `lib/client-pdf.ts`
- `initPdfjs()` — singleton pdfjs-dist worker, exportowana do współdzielenia
- `mergePDFs`, `splitPDF`, `splitByRanges`, `compressPDFClient`
- `rotatePDF`, `addPageNumbers`, `addWatermark`, `cropPages`, `flattenPDF`
- `deletePages`, `extractPages`, `reorderPages`, `addBlankPage`, `redactPDF`
- `editPdf` (tekst, prostokąty na strony)
- `signPdfClient` (Canvas API → PNG → pdf-lib embed)
- `unlockPdfClient` (@pdfsmaller/pdf-decrypt), `protectPdfClient` (@pdfsmaller/pdf-encrypt)
- `pdfToWord`, `wordToPdf`, `pdfToJpgClient`, `jpgToPdf`, `pdfToExcel`, `xlsxToPdf`, `pdfToPptx`, `pdfToOdt`, `officeToPdf`, `pdfToTxt`, `pdfToSvg`, `pdfToEpub`, `pdfToHtml`, `htmlToPdf`
- `comparePdfTextClient`, `comparePdfVisual` (canvas pixel diff)
- `extractFormFields`, `fillFormFields` (AcroForm), `extractImagesFromPdf`
- `convertToPdfA` (PDF/A-1b best-effort: XMP, OutputIntent, flatten, JS cleanup)
- `downloadPdf`, `downloadZip`

## Komponenty
- `CloudFilePicker` — "☁️ Dodaj z chmury" (merge, compress, rotate-pdf) — Google Drive (Picker API), Dropbox (Chooser), OneDrive (SDK)
- `CloudFileSaver` — "Zapisz do:" Google Drive, Dropbox (Saver przez /api/exports), OneDrive (Graph API)
- `PagePreview` — miniatury PDF (tryby: delete/extract/reorder; 4 strony)
- `LanguageToggle` — PL/EN (Header)
- `ThemeToggle`, `MobileMenu`, `Breadcrumbs` (i18n), `SchemaHowTo`, `PwaRegister`
- Komponenty poradników: `ContentBlockRenderer`, `CTATool` w `components/guides/`

## Zależności klienckie
- `pdf-lib` — tworzenie/modyfikacja PDF
- `pdfjs-dist` — renderowanie stron do canvas
- `jszip` — pakiety ZIP
- `@pdfsmaller/pdf-encrypt`, `@pdfsmaller/pdf-decrypt` — szyfrowanie
- `tesseract.js` — OCR
- `pptxgenjs` — PowerPoint, `xlsx` — Excel

## Backend
- `app/api/url-to-pdf/route.ts` — endpoint do konwersji URL → PDF (CORS)
- `app/api/exports/route.ts` — POST: przyjmuje plik, zapisuje w pamięci podręcznej (5min TTL), zwraca podpisany HMAC URL (/api/exports/{id}?expiry=&hmac=)
- `app/api/exports/[id]/route.ts` — GET: weryfikuje HMAC, sprawdza TTL, konsumuje jednorazowo, zwraca plik (używane przez Dropbox Saver)
- `lib/exports.ts` — `storeFile()`, `signExportUrl()`, `verifyAndConsume()` (Map in-memory, HMAC-SHA256, timingSafeEqual)
- Tokeny OAuth (Google/Dropbox/OneDrive) przechowywane wyłącznie w pamięci JS (React state/ref), nigdy nie trafiają do backendu ani localStorage

## System poradników (guides)
- Lokalizacja: `content/guides/{category}/{slug}.ts` — dane w TS (bez CMS/markdown)
- Routing: `/guides/{localeSegment}/{category}/{slug}`
- 16 locale segmentów (localeGuidesSlug w `lib/guides-slugs.ts`)
- Typ `GuideArticle` w `types/guide.ts`: title, excerpt, body (ContentBlock[]), faq, relatedTool
- Komponenty renderujące: `ContentBlockRenderer` (paragraph/heading/step/list/cta), `CTATool`
- Schema.org: HowTo + FAQPage + BreadcrumbList na stronach artykułów
- Walidacja w buildzie: `validateGuides()` — sprawdza wszystkie tłumaczenia, długość excerptów, poprawność ToolSlug
- Skrypt: `npm run validate:guides`
- Stare strony: `/guide` (lista narzędzi z instrukcjami), `/guides/[locale]/` (hub), `/guides/[locale]/[category]/` (lista kategorii), `/guides/[locale]/[category]/[slug]/` (artykuł)
- Kategorie: compress-pdf (docelowo więcej)

## Integracja z chmurą
- Google Drive: OAuth 2.0 (drive.file) + Picker API do wyboru plików, upload przez Google Drive API (multipart)
- Dropbox: Chooser API do wyboru plików (direct link); Saver API + /api/exports do zapisu (plik → podpisany URL → Dropbox pobiera)
- OneDrive: SDK (js.live.net) do wyboru plików; OAuth implicit grant (popup + postMessage przez onedrive-oauth.html) + Graph API upload

## Bezpieczeństwo
- CSP w next.config.ts: strict (self, tylko zaufane domeny cloud)
- HMAC-SHA256 + timingSafeEqual dla signed URL-i eksportu
- Pliki w pamięci serwera: 5 min TTL, jednorazowe użycie, cleanup co 60s
- Żaden token OAuth nie jest przechowywany po stronie serwera

## ⚠️ WinAnsi / StandardFonts — NOTATKA 2026-08-27
- `StandardFonts.Helvetica` (WinAnsi) **nie potrafi zakodować polskich/łacińskich rozszerzonych glifów** — `widthOfTextAtSize()`/`drawText()` rzucają `WinAnsi cannot encode "ś"`, crashując narzędzia albo cicho usuwając słowa.
- Naprawa: wspólny helper `embedLiberationSans(pdf)` w `lib/client-pdf.ts` (LiberationSans przez fontkit, embedowanie raz na PDF) — używany już przez: `officeToPdf` (commit a804f5c), `addWatermark`, `htmlToPdf`, `flattenPDF`, oraz OCR (`client-ocr.ts`, embed w `ocrPdfClient` raz na dokument).
- OCR: niespójne skrypty są wykrywane **przez pokrycie glifów** (`font.getCharacterSet()`, try/catch jako siatka bezpieczeństwa), a słowa z naprawdę nieobsługiwanych skryptów (arabski/CJK/Hangul) są **zliczane i logowane** (`[OCR] Total: N words...`); `ocrPdfClient()` zwraca też `droppedWordCount`/`droppedWordSamples` zamiast całkowitej ciszy.
- **Pozostałe miejsce o tym samym wzorcu (NIEnaprawione, niski priorytet):** fallback Helvetica w `lib/pdf/exportEditedPdf.ts:89` (edit-pdf) — aktywuje się tylko gdy embedowanie WOFF2 z Google Fonts zawiedzie; wtedy polski tekst crashes. `addPageNumbers` nadal używa Helvetica — bezpieczne (tylko cyfry). `lib/pdf-engine.ts` to **martwy kod** (zero importów) — nie naprawiać.
- Ograniczenie wspólne: LiberationSans pokrywa tylko łacinę/cyrylicę/grecki — arabski/CJK/Hangul renderuje się jako `.notdef` (nie crash, tofu).

## Uruchamianie
- `npm run dev` — dev server
- `npm run build` — build
- `npm run lint` — eslint

## ⚠️ Next.js app/ vs public/ — konwencje plików
Projekt używa plików konwencji Next.js w `app/`, które generują endpointy build-time:
- `app/robots.ts` → `/robots.txt`
- `app/sitemap.ts` → `/sitemap.xml`
- `app/icon.tsx` → `/icon` (PNG, statyczny)
- ~~`app/manifest.ts`~~ — usunięty, użyty `public/manifest.json`

**Next.js zawsze preferuje pliki w `app/` nad `public/` dla tych samych ścieżek.** Jeśli ktoś doda:
- `public/robots.txt` — zostanie zignorowany (robi to `app/robots.ts`)
- `public/sitemap.xml` — zostanie zignorowany (robi to `app/sitemap.ts`)
- `public/favicon.ico` — nie jest referencjonowany w `<link>` (używane jest `/icon` z `app/icon.tsx`)

Nie dodawać plików w `public/` o tych samych nazwach — będą martwe.

## Znane luki / FINDINGI
- **FINDING (RTL):** strony narzędzi (np. /compress, prawdopodobnie wszystkie w `app/[locale]/[tool]/page.tsx`) nie ustawiają `dir='rtl'` dla ar/fa, mimo że `<html lang>` jest poprawnie ustawiane dynamicznie (patrz poprawka a11y, commit `eec603b`). Strony informacyjne (/help, /faq, /wsparcie, /privacy, /terms, /rodo, /security) poprawnie ustawiają dir per-stronę, ale strony narzędzi tego nie robią. To nie jest regresja z tej sesji — istniejąca luka, udokumentowana podczas prac nad punktem g) (2026-08-09, weryfikacja /ar/compress i /fa/compress). **Naprawa wymaga:** `dir=rtl` na layoutcie narzędzi + weryfikacja układu (kierunek kart, kolejność kolumn, wyrównanie) dla ar i fa. Poza zakresem obecnej sesji — osobne zadanie (punkt i) w rejestrze Priorytetu 2/3).
- **FINDING (konwersja Office, 2026-08-12):** Konwersja PDF→Word/ODT/PDF↔OpenOffice to czysta ekstrakcja tekstu bez zachowania formatowania (kolory/obrazy/tabele/style tracone) — potwierdzone diagnozą 2026-08-12. iLovePDF API sprawdzone i wykluczone (nie oferuje PDF→Word ani PDF→ODT). Wymaga decyzji strategicznej: przepisanie silnika lokalnie (layout analysis, R&D, tygodnie pracy) vs integracja Adobe PDF Services API (serwerowe, koszt licencyjny, wymaga oznaczenia 🔵 CLOUD w systemie odznak). Poza zakresem szybkich napraw — do rozpatrzenia osobno.
- **REJESTR (XLSX→IR, 2026-09-01):** `Component 2b: CF rule evaluation + dxf color resolution at render time` — priorytet średni. `xlsxToIR` zapisuje teraz reguły CF **surowo** (`IRSheet.conditionalFormattingRules`: sqref/type/operator/formula/dxfId) bez ewaluacji. Silnik ewaluacji reguł względem wartości + mapowanie dxf→kolor (styles.xml `<dxfs>`) przy renderze do PDF to osobne zadanie na później — bez niego pliki polegające WYŁĄCZNIE na CF dla koloru stracą to formatowanie w PDF.
- **FINDING (xlsxToIR, formuła + numFmt, 2026-09-01):** Komórki typu 'formula' pokazują surową wartość cache'a (`<v>`) bez zastosowania formatowania numFmt (waluta/procent/data) do display. Zweryfikowano na pliku testowym EPZ_SIERPIEN_2026.xlsx: jedyna formuła w pliku (Arkusz3, I3=SUM) ma numFmtId=0 (General), więc problem się NIE ujawnia w tym przypadku. Teoretyczny edge case (formuła z formatem walutowym/procentowym/datowym pokazałaby niesformatowaną liczbę) pozostaje nienaprawiony — priorytet niski, do rozważenia jeśli pojawi się realny plik z tym przypadkiem.
