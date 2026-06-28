<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# OptimaPDF — Stan projektu

## Opis
Polskojęzyczna aplikacja webowa do edycji plików PDF (Next.js 16, React 19, Tailwind CSS 4, TypeScript).
**Wszystkie narzędzia działają w całości po stronie klienta (przeglądarka).** Jeden endpoint: `/api/url-to-pdf`.

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
- `CloudFilePicker` — "☁️ Dodaj z chmury" (merge, compress, rotate-pdf)
- `PagePreview` — miniatury PDF (tryby: delete/extract/reorder; 4 strony)
- `LanguageToggle` — PL/EN (Header)
- `ThemeToggle`, `MobileMenu`, `Breadcrumbs` (i18n), `SchemaHowTo`, `PwaRegister`

## Zależności klienckie
- `pdf-lib` — tworzenie/modyfikacja PDF
- `pdfjs-dist` — renderowanie stron do canvas
- `jszip` — pakiety ZIP
- `@pdfsmaller/pdf-encrypt`, `@pdfsmaller/pdf-decrypt` — szyfrowanie
- `tesseract.js` — OCR
- `pptxgenjs` — PowerPoint, `xlsx` — Excel

## Backend
- `app/api/url-to-pdf/route.ts` — jedyny endpoint (CORS)

## Uruchamianie
- `npm run dev` — dev server
- `npm run build` — build (49 stron statycznych)
- `npm run lint` — eslint
