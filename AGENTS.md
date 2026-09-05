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
- `pdfToWord`, `wordToPdf`, `pdfToJpgClient`, `jpgToPdf`, `pdfToIRSpreadsheet`(+`renderIRSpreadsheetToXlsx` in client-pdf-docx.ts, pdf-to-excel), `xlsxToPdf`, `pdfToPptx`, `pdfToOdt`, `officeToPdf`, `pdfToTxt`, `pdfToSvg`, `pdfToEpub`, `pdfToHtml`, `htmlToPdf`
- `segmentSlideElements` (C2, client-pdf.ts) — PDF page → IRSlide (text grouping, shapes, Y-flip)
- `renderIRToPptx` (C1, client-pptx.ts) — IRDeck → pptxgenjs Blob (dynamic layout, no distortion)
- `pdfToIRDeck` (C3, client-pdf.ts) — full PDF → IRDeck orchestrator (per-page segment, dims consistency + portrait warnings, first-page dims as deck layout) → `renderIRToPptx`
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
- **FINDING (buildTableClusters boundary-coverage, 2026-09-02):** Nowa reguła wykrywania tabel przez strokowane krawędzie (dodana dla pdf-to-excel/round-trip) zweryfikowana jako nie-regresyjna na 4 realnych plikach testowych pdf-to-word/pdf-to-openoffice (identyczne .docx bajt-po-bajcie). Nieprzetestowane: czy boundary-coverage tworzy fałszywe trafienia na PDF-ach z dekoracyjnymi ramkami/boxami niebędącymi tabelami (żaden z 4 plików testowych takich nie zawierał). Niski priorytet - do sprawdzenia, jeśli w przyszłości pojawi się zgłoszenie błędnego wykrycia tabeli w pdf-to-word na nowym pliku użytkownika.
- **FINDING (renderSpreadsheetIRToPdf, frozen header fallback, 2026-09-02):** Gdy plik XLSX nie ma `<pane state="frozen">` (fallback frozenRows=1), powtarzany nagłówek na stronach kontynuacji to dosłownie wiersz 0 arkusza — w plikach z wierszami tytułowymi przed właściwą tabelą (np. EPZ_SIERPIEN_2026.xlsx: wiersz 0 = "Załącznik nr 3 do...", właściwy nagłówek kolumn w wierszu 6) to daje bezużyteczny powtarzany nagłówek zamiast nazw kolumn. Potwierdzone wizualnie na pliku testowym. Możliwe kierunki naprawy: heurystyka wykrywania końca sekcji tytułowej (ryzyko fałszywych trafień na innych plikach) lub ręczny wybór wiersza przez użytkownika (wymaga UI, poza zakresem). Priorytet średni — nie blokuje podstawowej funkcjonalności (dane kompletne, strony poprawnie łamane), ale obniża czytelność długich arkuszy bez `<pane>`.
- **FINDING (pdf-to-excel round-trip, cross-page rowspans NOT recovered, 2026-09-02):** Round-trip (mergeBandsForRoundtrip → IRSheet) celowo NIE odzyskuje rowspanów przecinających granicę stron (split fragment-major). Powód: renderer `renderSpreadsheetIRToPdf`/`drawSpreadsheetCell` rysuje **zamknięty pełny prostokąt na KAŻDEJ stronie** (4 linie obramowania zawsze; `clipCellToBand` ścina ale nie usuwa linii stykowej), więc rowspan przecięty pagonowaniem ma ZAWSZE linię na styku (dwukrotną: dół strony N + góra strony N+1). Brak linii ("brak obramowania") fizycznie nie może wystąpić → sygnał topologiczny do sklejania jest bezużyteczny. Decyzja: rowspany mogące kontynuować się przez stronę są zawsze kierowane do warningów `merge-continuation-ambiguous` (NIGDY cicho sklejane); wynik ≈101/110/111 mergedRanges (GT=99/99/99 — odchylenie to false `cs2` pochodzące z treści BODY, nie z powtórzonych nagłówków). Ewentualna prawdziwa naprawa wymagałaby znacznika w metadanych PDF w `renderSpreadsheetIRToPdf` wskazującego, która strona kontynuuje którą komórkę — niski priorytet. Dodatkowo zaobserwowano sporadyczne błędne scalenie SĄSIADUJĄCYCH kolumn (nie tylko wierszy) przez topologię post-pass, gdy brakuje separatora pionowego między nimi (np. row38: oryginalnie 2 osobne mergi colspan=1 w kol.4/5, wykryte jako 1 merge colspan=2).
- **FINDING (pdf→excel, bold/italic NIE odzyskiwane z PDF, 2026-09-03):** `pdfToIRSpreadsheet` (Component 3.3) poprawnie wyciąga `fmt.bold/italic` z dominującego runa komórki (`clusterCellFormats`), ale wynik na realnym pliku to **0 bold / 0 italic**. Pierwotna przyczyna: `renderSpreadsheetIRToPdf` embeduje czcionki jako subsetowane nazwy `g_d0_fN` (przez `embedLiberationSans`), a `parseFontStyle()` wnioskuje Bold/Italic po substringu w nazwie czcionki (np. `-Bold`) — nazwy subsetowane NIE niosą wagi, więc każdy run dostaje `bold=false`/`italic=false` już na wejściu do obiektu `IRTextRun`. To NIE jest błąd konwersji PDF→IR (kod robi dokładnie to, co każe specyfikacja), tylko brak sygnału FontWeight w renderowanym PDF. Skutek: `fmt` na komórkach z `pdfToIRSpreadsheet` będzie zawsze pusty. Naprawa wymagałaby albo niemaskowanego embedowania nazw czcionek z węzłem Bold w `renderSpreadsheetIRToPdf` (ryzyko: większe PDF, potencjalne divergencje round-trip), albo fontkit do re-identyfikacji wagi z konturu glifów. Priorytet niski — nie blokuje danych; wpływ czysto estetyczny. Zweryfikowano na EPZ_SIERPIEN_2026.pdf (36 stron, 3 arkusze).
- **FINDING (pdf→excel, column widths odzyskiwane z geometrii, 2026-09-03):** `pdfToIRSpreadsheet` konwertuje szerokości kolumn **pt→chars** przez `ptToXlsxCharWidth` (odwrotność `xlsxCharWidthToPt`); round-trip pt→chars→pt stratny tylko do ~4 miejsc po przecinku (np. 91.482 pt → 16.7109 chars → 91.482 pt). Zweryfikowano na EPZ_SIERPIEN_2026.pdf: Arkusz1 → `[16.7109, 10.1406, 8.43, 8.43, 16.7109, 22.1406]` (docelowa kolumna 7 o szer. 29.4258 chars ginie, bo niesie ją tylko pas p.8-14 pomijany — zgodnie z warningiem `zero-cluster-skipped`); Arkusz2/3 → wszystkie `8.43` (domyślna — zgodne z GT, które nie miało `<col width>`).
- **FINDING (pdfToIRSpreadsheet, regex-heurystyka typów NUM_RE/DATE_RE/TIME_RE, 2026-09-03):** Nowy kod `irCellFromText()`/`pdfToIRSpreadsheet` (Component 3.3) klasyfikuje `type`/`raw`/`inferred` wyłącznie regexami z display: `NUM_RE /^\d+$/` i `/^\d+(\.\d+)?$/`, `DATE_RE /^\d{2}-\d{2}-\d{2}$|^\d{4}-\d{2}-\d{2}$/`, `TIME_RE /^\d{1,2}:\d{2}(:\d{2})?$/`; `inferred:true` tylko dla number/date/time, stringi bez etykiety. To daje dwie ZNANE rozbieżności względem ground-truth xlsxToIR na EPZ_SIERPIEN_2026.pdf: (1) godziny zapisane w XLSX jako **string** `"07.00"` (kol.1, rows 10/14/37/53/57/80, 6× na każdy arkusz = 18 komórek) łapie `NUM_RE` → `type:"number", raw:7` (zamiast `string raw:"07.00"`) — heurystyka nie odróżnia godziny dziesiętnej od tekstu; (2) komórka formuły Arkusz3 I3 (`raw:0`) dostaje `type:"number"` zamiast `"formula"`, bo PDF niesie tylko cache wartości `0`, bez żadnych metadanych formuły (to OSOBNY problem od FINDING z 2026-09-01 o numFmt display — tam chodziło o formatowanie wyświetlania, tu o etykietę typu). Obie to poprawne koordynaty i wierna treść — różni się tylko tag `type`. Teoretyczne konsekwencje: liczby z separatorem przecinkowym (`"1,5"`) zostają stringiem (regexy tylko kropkowe), waluty/procenty jako tekst nie dostają `inferred`. Priorytet niski — estetyka konsumenta (writer), nie poprawność danych.
- **FINDING (Component 3.4, renderIRSpreadsheetToXlsx — lossless-native types, 2026-09-03):** Writer zapisuje type natywny do XLSX **tylko gdy bezstratny**: `xlsxWriteValue` daje native number TYLKO gdy `type==='number' && typeof raw==='number' && isFinite(raw) && display === String(raw)`. Data/czas (raw=string, bez seriala) oraz liczba z nieokrągłym display (np. `"07.00"` → raw 7) → **zapis jako string** (zachowuje oryginalny tekst i, w przypadku `07.00`, zgadza się z ground-truth: to był string w oryginale). `"999.99"` → native number (zweryfikowane round-tripem `type:'number'`). Daty/czasy nigdy nie są zapisywane jako seriale Excela — brak jednoznacznego mapping MM-DD-YY→serial, priorytet bezpieczeństwa. Round-trip na EPZ_SIERPIEN_2026.pdf: `type-only-diffs=239` na każdy arkusz to wyłącznie te date/time/lossy-number→string, wszystkie display identyczne (True display-diffs: **0** na wszystkich 3 arkuszach).
- **FINDING (Component 3.4, Writer + covered-cell collapse vs pdfIR false merges, 2026-09-03):** Writer renderuje **wiernie** wszystkie `sharedRanges/mergedRanges` i wszystkie komórki (bez filtrowania); scalone regiony naturalnie rozwiązuje exceljs (wartości w nie-anchor slots giną). Round-trip strukturalny: rows 111=111, cols MATCH, **mergedRanges 101/110/111 = 101/110/111 MATCH**, columnWidths chars 1:1 MATCH. Komórki pdfIR leżące POD scaleniem (Arkusz1 52, Arkusz2 62, Arkusz3 63) celowo znikają — to artefakty Tury 2 (false `cs2` merges / treść BODY pod mergem), NIE błąd writera. Różne przyczyny, ten sam efekt: (a) pełny tekst tytułu rozbity przez PDF na r7c4+"czasu pracy..." (r9c4) — GT pokazuje anchor r7c4 z pełnym tekstem i r9c4=null, więc pdfIR zaanchorował tylko pierwszą linię → w XLSX scalona komórka pokazuje tylko "Wprowadzanie" (utrata dalszej części to limitacja wykrywania merge w pdfIR, nie writera); (b) komórka SUM Arkusz3 `r2c8 = "0"` ginie bo leży pod fałszywym mergem `{row:0,col:7,rowspan:16,colspan:2}` którego GT NIE MA (GT: r2c8 to osobna komórka formula SUM(A1:A5), 0 mergów w kol.7-8). Rozważano brute heuristic "pomiń WSZYSTKIE contentless merges gdy anchor pusty" — **odrzucona**: nadfiltrowuje (zrzucałoby też prawdziwe empty-anchor merges, np. header `1,0,1,3`, dając 93/97/97≠GT 99). **Zastosowana w Tura 4 fix:** precyzyjna reguła — skipuj blank-anchor merge TYLKO jeśli pokrywa JAKEŚ walouated cell (`coversValued`), bo wtedy to na pewno false `cs2` merge niszczący dane. Blank-anchor mergi pokrywające wyłącznie puste komórki są nadal emitowane (zachowują strukturę, np. genuine `1,0,1,3`). Zweryfikowano: jedyny walouated cell pochłaniany przez blank-anchor merge to Arkusz3 `0,7,16,2` → `r2c8` ("0" = wynik SUM); fix go uwalnia. Wynik: Arkusz3 mergedRanges 111→**110** (jeden false merge zniknął), I3=`0` (int) zachowany — potwierdzone openpyxl 3.1.5. Pozostałe 52/62/62 komórki "pod mergem" to cs2-merge bandy nagłówków bez wartości — brak utraty danych (cross-check: 0 LOSS). To samo naruszenie, co wcześniejszy FINDING z literatury: blank-anchor merge nad wartościowym covered-cell jest z definicji false.
- **Component 3.5, formal round-trip regression harness (2026-09-03):** Trwały skrypt `tests/pdf-excel-regression.mts` (uruchamiany: `npm run test:regression`), który automatycznie (CI-ready — exit code 0/1, PASS/FAIL per asercja) przechodzi cały cykl `pdfToIRSpreadsheet → renderIRSpreadsheetToXlsx → .xlsx → xlsxToIR` na trwałym fixture `test-fixtures/xlsx_EPZ_SIERPIEN_2026.pdf` i hard-asyguruje ground-truth z Tur 3.1–3.5: **3 arkusze**; dims `A1:F111` / `A1:G111` / `A1:I111`; mergedCells **101/110/110**; **Arkusz3 I3 = 0** (nie None — regresja-guard na fix blank-anchor false merge z Tura 4); **0 komórek 'number' poza I3** (guard na przyszłe zmiany heurystyki typów: EPZ ma dates/times/stringi, jedyny genuine number to SUM). Wymagania trwałości: ścieżki względne repo (nie `C:\`), brak `any` (lint-czysty), `tests/` w `tsconfig.json exclude` (poza typecheck app build — uruchamiane przez tsx, analogicznie do `scripts/`), skrypt w `package.json`. Fixture PDF skopiowany z `test-output/` → `test-fixtures/` (trwały). Negatywna ścieżka zweryfikowana: wymuszony FAIL → exit 1 + "FAILURES PRESENT".
- **FINDING (buildPageScaffold fontSize — Tf×Tm fix, 2026-09-04):** `buildPageScaffold` uses `fontInfo.size` (from `setFont` operator) as fontSize for text runs. Most renderers set the real size in `setFont` (Tf) with Tm scale=1, but LibreOffice Impress exports use Tf=1 and fold the actual scale into the text matrix (Tm). Result: all textRuns got fontSize=1 → title ranking in segmentation failed. Fix: `effectiveFontSize = Tf × sqrt(tmA² + tmB²)` (= Tf × |Tm|). Verified on allegro-raport.pdf: page 2 textRuns correctly report 25.6/13.0/14.7pt (was 1/1/1). Regression-safe: our own renderer PDFs use Tf=real, Tm≈1 → same result. All 13/13 excel regression tests PASS. Shared utility — benefits all consumers (extractFormattedTextFromPDF, pdfTablesToCells).
- **FINDING (segmentSlideElements v1: images not extracted, 2026-09-04):** `segmentSlideElements` does NOT emit image elements. `buildPageScaffold` stores images as `{ imageId: "Im0", natW, natH, bounds }` — only a string reference, not pixel data. Actual base64 extraction from PDF requires canvas rendering via `paintImageXObject` (separate, more complex operation). Scope: deferred to C3 or later. Consequence: image-dominated pages (e.g. cover pages) will appear nearly empty in the IR. Text and shape elements are correctly extracted. Documented in code comment at `lib/client-pdf.ts:~1898`.
- **FINDING (segmentSlideElements v1: paragraph merging, 2026-09-04):** `groupRunsIntoTextboxes` (in `lib/client-pdf.ts`, ~l.1752) is a two-pass textbox builder: Phase 1 groups runs into horizontal LINES via a 3 pt Y-band (baseline grouping), Phase 2 merges consecutive lines into PARAGRAPHS. Paragraph merge rules: (a) a font-size jump (>0.5 pt) ALWAYS starts a new paragraph; (b) a baseline-to-baseline gap > `max(fsCur,fsPrev)*1.2*1.6` = a line step larger than ~1.6× normal 1.2 leading starts a new paragraph; (c) two lines with no horizontal X-overlap (`hOverlap < -3`) are treated as separate columns → new paragraph. A line whose runs are ALL whitespace (`text.trim().length===0`) is a **hard block separator**: it never merges with either neighbor and is DROPPED from the output (never becomes an empty textbox) — the vertical spacing between surrounding real blocks already encodes the separation. This matters for LibreOffice Impress exports, which insert single-space `" "` lines as paragraph separators (baseline steps of 31.2 pt at paragraph breaks vs 15.6 pt within a paragraph) — without the blank-line handling the whole body would collapse into one 29-line mega-block. Verified on allegro-raport.pdf: page 2 → 11 clean multi-line paragraphs (was 42 one-line fragments / 8 with a 29-line mega-block), page 4 → 9 paragraphs, no over-splitting. Caveat: a bulleted-list PDF whose item spacing coincidentally exceeds 1.6× line step would split items into separate textboxes (acceptable for v1; exact dependency is font-size-relative, not absolute). All 13/13 excel regression tests still PASS (this code path is pptx-only, untouched by the excel pipeline).
- **FINDING (segmentSlideElements v1: invisible shapes filtered, 2026-09-04):** `segmentSlideElements`' shape filter (`lib/client-pdf.ts`, shape element mapping ~l.1958) drops any rect that has NO fill AND NO stroke (`r.fill || r.stroke` must be true), in addition to the existing `< 1 pt` size filter. Such rects are invisible — e.g. a full-page transparent clip-path rect or a leftover paint op without a paint action — and emitted no value, only noise. Verified on allegro-raport.pdf: page 4 dropped 2 invisible rects (a `595.3×841.9` full-page no-fill rect and a `387.8×193.9` transparent box near the title), 19→17 elements, nothing visible lost. Page 2 unchanged (all 3 of its shapes have a visible fill or stroke). All 13/13 excel regression tests still PASS.
- **FINDING (C3 pdfToIRDeck, cover-page-empties, 2026-09-04):** `pdfToIRDeck` (client-pdf.ts, after `pdfToWordIR`) segments every page via `segmentSlideElements` and returns `{ deck: IRDeck, warnings: PdfToIRDeckWarning[] }` (warnings as sibling, mirroring pdfToIRSpreadsheet). Warnings: (a) `inconsistent-page-dimensions` per page whose width/height differ (size OR orientation) from page 1; (b) `portrait-source` if page 1 is portrait (height>width). Deck layout = first page's dimensions; each slide carries its own widthPt/heightPt and the writer enforces equality. On the 27-page allegro fixture (all same A4-portrait dims) the warning list is EXACTLY `[portrait-source page=1]` — verified, not assumed (all pages share 595.28×841.89). IMPORTANT consequence, consistent with the earlier images-not-extracted FINDING: page 1 (cover) is a full-page `2480×3508` image with 0 text runs → `segmentSlideElements` emits 0 elements → the cover slide is legitimately EMPTY (not a regression). Test `tests/pptx-orchestrator-c3.mts` hard-asserts: 27 slides, dims 595.28×841.89, deck portrait, every slide matches deck dims, only cover empty + pages 2–27 all non-empty, exactly 1 warning. `npm run test:pptx` runs it. Independent python-pptx check: `scripts/verify_pptx_c3.py` (python-pptx 1.0.2) confirms 27 slides, 595.28pt/8.268in × 841.89pt/11.693in, and samples slides 1/2/4/27 element geometry. pptx output written to `test-output/allegro-C3.pptx` (357009 bytes).
