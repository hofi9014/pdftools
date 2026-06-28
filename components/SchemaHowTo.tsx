'use client';
import { usePathname } from 'next/navigation';

const toolSchemas: Record<string, { nameEN: string; namePL: string; steps: { en: string; pl: string }[] }> = {
  merge: {
    nameEN: 'Merge PDF', namePL: 'Połącz PDF',
    steps: [
      { en: 'Upload PDF files by dragging and dropping or clicking the upload area', pl: 'Przeciągnij pliki PDF lub kliknij aby wybrać' },
      { en: 'Arrange files in the desired order', pl: 'Ustaw pliki w żądanej kolejności' },
      { en: 'Click the merge button to combine files', pl: 'Kliknij przycisk łączenia' },
      { en: 'Download the merged PDF file', pl: 'Pobierz połączony plik PDF' },
    ],
  },
  split: {
    nameEN: 'Split PDF', namePL: 'Podziel PDF',
    steps: [
      { en: 'Upload the PDF file you want to split', pl: 'Przeciągnij plik PDF do podziału' },
      { en: 'Choose split mode: every page separately or custom ranges', pl: 'Wybierz tryb podziału: każda strona osobno lub zakresy' },
      { en: 'Click the split button', pl: 'Kliknij przycisk podziału' },
      { en: 'Download the individual PDF files', pl: 'Pobierz rozdzielone pliki PDF' },
    ],
  },
  compress: {
    nameEN: 'Compress PDF', namePL: 'Kompresuj PDF',
    steps: [
      { en: 'Upload the PDF file you want to compress', pl: 'Przeciągnij plik PDF do kompresji' },
      { en: 'Select compression level: low, recommended, or extreme', pl: 'Wybierz poziom kompresji: niski, zalecany lub ekstremalny' },
      { en: 'Click the compress button', pl: 'Kliknij przycisk kompresji' },
      { en: 'Download the compressed PDF file', pl: 'Pobierz skompresowany plik PDF' },
    ],
  },
  'pdf-to-word': {
    nameEN: 'PDF to Word', namePL: 'PDF do Word',
    steps: [
      { en: 'Upload the PDF file to convert', pl: 'Przeciągnij plik PDF do konwersji' },
      { en: 'Wait for the conversion process', pl: 'Poczekaj na konwersję' },
      { en: 'Click the download button to save the Word document', pl: 'Kliknij przycisk pobierania' },
    ],
  },
  'word-to-pdf': {
    nameEN: 'Word to PDF', namePL: 'Word do PDF',
    steps: [
      { en: 'Upload the Word document', pl: 'Przeciągnij dokument Word' },
      { en: 'Wait for conversion to PDF', pl: 'Poczekaj na konwersję' },
      { en: 'Download the PDF file', pl: 'Pobierz plik PDF' },
    ],
  },
  'pdf-to-images': {
    nameEN: 'PDF to Images', namePL: 'PDF do obrazów',
    steps: [
      { en: 'Upload PDF files by dragging and dropping', pl: 'Przeciągnij pliki PDF' },
      { en: 'Select image format (PNG, JPEG, WebP), scale and quality', pl: 'Wybierz format obrazu (PNG, JPEG, WebP), skalę i jakość' },
      { en: 'Click the convert button', pl: 'Kliknij przycisk konwersji' },
      { en: 'Download the images as a ZIP file', pl: 'Pobierz obrazy jako plik ZIP' },
    ],
  },
  'jpg-to-pdf': {
    nameEN: 'Images to PDF', namePL: 'JPG do PDF',
    steps: [
      { en: 'Upload JPG images by dragging and dropping', pl: 'Przeciągnij obrazy JPG' },
      { en: 'Arrange images in the desired order', pl: 'Ustaw obrazy w żądanej kolejności' },
      { en: 'Adjust page size and orientation', pl: 'Dostosuj rozmiar i orientację strony' },
      { en: 'Click the convert button to create a PDF', pl: 'Kliknij przycisk konwersji' },
    ],
  },
  'protect-pdf': {
    nameEN: 'Protect PDF', namePL: 'Zabezpiecz PDF',
    steps: [
      { en: 'Upload the PDF file to protect', pl: 'Przeciągnij plik PDF do zabezpieczenia' },
      { en: 'Enter a strong password', pl: 'Wprowadź silne hasło' },
      { en: 'Click the protect button', pl: 'Kliknij przycisk zabezpieczenia' },
      { en: 'Download the password-protected PDF', pl: 'Pobierz zabezpieczony plik PDF' },
    ],
  },
  'unlock-pdf': {
    nameEN: 'Unlock PDF', namePL: 'Odblokuj PDF',
    steps: [
      { en: 'Upload the password-protected PDF', pl: 'Przeciągnij plik PDF chroniony hasłem' },
      { en: 'Enter the password', pl: 'Wprowadź hasło' },
      { en: 'Click unlock to remove the password', pl: 'Kliknij odblokuj' },
      { en: 'Download the unlocked PDF', pl: 'Pobierz odblokowany plik PDF' },
    ],
  },
  'rotate-pdf': {
    nameEN: 'Rotate PDF', namePL: 'Obróć PDF',
    steps: [
      { en: 'Upload the PDF file', pl: 'Przeciągnij plik PDF' },
      { en: 'Select rotation angle: 90, 180, or 270 degrees', pl: 'Wybierz kąt obrotu: 90, 180 lub 270 stopni' },
      { en: 'Click the rotate button', pl: 'Kliknij przycisk obrotu' },
      { en: 'Download the rotated PDF', pl: 'Pobierz obrócony plik PDF' },
    ],
  },
  'page-numbers': {
    nameEN: 'Add Page Numbers', namePL: 'Numery stron',
    steps: [
      { en: 'Upload the PDF file', pl: 'Przeciągnij plik PDF' },
      { en: 'Choose position, starting number, and font size', pl: 'Wybierz pozycję, numer początkowy i rozmiar czcionki' },
      { en: 'Click the add numbers button', pl: 'Kliknij przycisk dodawania numerów' },
      { en: 'Download the PDF with page numbers', pl: 'Pobierz plik PDF z numerami stron' },
    ],
  },
  'watermark-pdf': {
    nameEN: 'Add Watermark', namePL: 'Znak wodny',
    steps: [
      { en: 'Upload the PDF file', pl: 'Przeciągnij plik PDF' },
      { en: 'Enter watermark text and customize appearance', pl: 'Wprowadź tekst znaku wodnego i dostosuj wygląd' },
      { en: 'Click the add watermark button', pl: 'Kliknij przycisk dodawania znaku wodnego' },
      { en: 'Download the PDF with watermark', pl: 'Pobierz plik PDF ze znakiem wodnym' },
    ],
  },
  'ocr-pdf': {
    nameEN: 'OCR PDF', namePL: 'OCR PDF',
    steps: [
      { en: 'Upload a scanned PDF document', pl: 'Przeciągnij zeskanowany dokument PDF' },
      { en: 'Select the document language', pl: 'Wybierz język dokumentu' },
      { en: 'Click the OCR button to recognize text', pl: 'Kliknij przycisk OCR' },
      { en: 'Download the PDF with recognized text', pl: 'Pobierz PDF z rozpoznanym tekstem' },
    ],
  },
  'extract-pages': {
    nameEN: 'Extract Pages', namePL: 'Wyodrębnij strony',
    steps: [
      { en: 'Upload the PDF file', pl: 'Przeciągnij plik PDF' },
      { en: 'Select pages to extract by clicking thumbnails', pl: 'Wybierz strony klikając miniatury' },
      { en: 'Click the extract button', pl: 'Kliknij przycisk wyodrębniania' },
      { en: 'Download the extracted pages as a new PDF', pl: 'Pobierz wyodrębnione strony jako nowy PDF' },
    ],
  },
  'delete-pages': {
    nameEN: 'Delete Pages', namePL: 'Usuń strony',
    steps: [
      { en: 'Upload the PDF file', pl: 'Przeciągnij plik PDF' },
      { en: 'Select pages to delete by clicking thumbnails', pl: 'Wybierz strony do usunięcia klikając miniatury' },
      { en: 'Click the delete button', pl: 'Kliknij przycisk usuwania' },
      { en: 'Download the PDF without selected pages', pl: 'Pobierz plik PDF bez wybranych stron' },
    ],
  },
  'reorder-pages': {
    nameEN: 'Reorder Pages', namePL: 'Zmień kolejność',
    steps: [
      { en: 'Upload the PDF file', pl: 'Przeciągnij plik PDF' },
      { en: 'Drag and drop page thumbnails to reorder', pl: 'Przeciągnij miniatury stron aby zmienić kolejność' },
      { en: 'Click the reorder button', pl: 'Kliknij przycisk zmiany kolejności' },
      { en: 'Download the reordered PDF', pl: 'Pobierz PDF z nową kolejnością' },
    ],
  },
  'crop-pdf': {
    nameEN: 'Crop PDF', namePL: 'Przytnij PDF',
    steps: [
      { en: 'Upload the PDF file', pl: 'Przeciągnij plik PDF' },
      { en: 'Set margin values for top, bottom, left, and right', pl: 'Ustaw marginesy: góra, dół, lewo, prawo' },
      { en: 'Click the crop button', pl: 'Kliknij przycisk przycinania' },
      { en: 'Download the cropped PDF', pl: 'Pobierz przycięty plik PDF' },
    ],
  },
  'add-page': {
    nameEN: 'Add Blank Page', namePL: 'Dodaj stronę',
    steps: [
      { en: 'Upload the PDF file', pl: 'Przeciągnij plik PDF' },
      { en: 'Click the add page button', pl: 'Kliknij przycisk dodawania strony' },
      { en: 'Download the PDF with the new blank page', pl: 'Pobierz plik PDF z nową stroną' },
    ],
  },
  metadata: {
    nameEN: 'Edit Metadata', namePL: 'Metadane',
    steps: [
      { en: 'Upload the PDF file', pl: 'Przeciągnij plik PDF' },
      { en: 'Edit title, author, subject, and keywords', pl: 'Edytuj tytuł, autora, temat i słowa kluczowe' },
      { en: 'Click the save button', pl: 'Kliknij przycisk zapisu' },
      { en: 'Download the PDF with updated metadata', pl: 'Pobierz plik PDF z nowymi metadanymi' },
    ],
  },
  'edit-pdf': {
    nameEN: 'Edit PDF', namePL: 'Edytuj PDF',
    steps: [
      { en: 'Upload the PDF file to edit', pl: 'Przeciągnij plik PDF do edycji' },
      { en: 'Add text, highlights, or annotations', pl: 'Dodaj tekst, podświetlenia lub adnotacje' },
      { en: 'Click the save changes button', pl: 'Kliknij przycisk zapisu' },
      { en: 'Download the edited PDF', pl: 'Pobierz edytowany plik PDF' },
    ],
  },
  'sign-pdf': {
    nameEN: 'Sign PDF', namePL: 'Podpisz PDF',
    steps: [
      { en: 'Upload the PDF file to sign', pl: 'Przeciągnij plik PDF do podpisania' },
      { en: 'Draw or type your signature', pl: 'Narysuj lub wpisz swój podpis' },
      { en: 'Place the signature on the document', pl: 'Umieść podpis na dokumencie' },
      { en: 'Download the signed PDF', pl: 'Pobierz podpisany plik PDF' },
    ],
  },
  'pdf-to-excel': {
    nameEN: 'PDF to Excel', namePL: 'PDF do Excel',
    steps: [
      { en: 'Upload the PDF file with tabular data', pl: 'Przeciągnij plik PDF z danymi tabelarycznymi' },
      { en: 'Wait for data extraction', pl: 'Poczekaj na ekstrakcję danych' },
      { en: 'Download the Excel spreadsheet', pl: 'Pobierz arkusz Excel' },
    ],
  },
  'excel-to-pdf': {
    nameEN: 'Excel to PDF', namePL: 'Excel do PDF',
    steps: [
      { en: 'Upload the Excel file', pl: 'Przeciągnij plik Excel' },
      { en: 'Wait for conversion', pl: 'Poczekaj na konwersję' },
      { en: 'Download the PDF document', pl: 'Pobierz dokument PDF' },
    ],
  },
  'pdf-to-txt': {
    nameEN: 'PDF to TXT', namePL: 'PDF do TXT',
    steps: [
      { en: 'Upload the PDF file', pl: 'Przeciągnij plik PDF' },
      { en: 'Wait for text extraction', pl: 'Poczekaj na ekstrakcję tekstu' },
      { en: 'Download the text file', pl: 'Pobierz plik tekstowy' },
    ],
  },
  'html-to-pdf': {
    nameEN: 'HTML to PDF', namePL: 'HTML do PDF',
    steps: [
      { en: 'Paste HTML code or upload an HTML file', pl: 'Wklej kod HTML lub prześlij plik HTML' },
      { en: 'Customize PDF options if needed', pl: 'Dostosuj opcje PDF' },
      { en: 'Click the convert button', pl: 'Kliknij przycisk konwersji' },
      { en: 'Download the PDF document', pl: 'Pobierz dokument PDF' },
    ],
  },
  'url-to-pdf': {
    nameEN: 'URL to PDF', namePL: 'URL do PDF',
    steps: [
      { en: 'Enter the website URL', pl: 'Wprowadź adres URL strony' },
      { en: 'Click the convert button', pl: 'Kliknij przycisk konwersji' },
      { en: 'Download the PDF of the web page', pl: 'Pobierz PDF strony internetowej' },
    ],
  },
  'pdf-to-html': {
    nameEN: 'PDF to HTML', namePL: 'PDF do HTML',
    steps: [
      { en: 'Upload the PDF file', pl: 'Przeciągnij plik PDF' },
      { en: 'Wait for conversion to HTML', pl: 'Poczekaj na konwersję do HTML' },
      { en: 'Download the HTML file', pl: 'Pobierz plik HTML' },
    ],
  },
  'flatten-pdf': {
    nameEN: 'Flatten PDF', namePL: 'Spłaszcz PDF',
    steps: [
      { en: 'Upload the PDF file with annotations', pl: 'Przeciągnij plik PDF z adnotacjami' },
      { en: 'Click the flatten button', pl: 'Kliknij przycisk spłaszczania' },
      { en: 'Download the flattened PDF', pl: 'Pobierz spłaszczony plik PDF' },
    ],
  },
  'pdf-to-powerpoint': {
    nameEN: 'PDF to PowerPoint', namePL: 'PDF do PowerPoint',
    steps: [
      { en: 'Upload the PDF file', pl: 'Przeciągnij plik PDF' },
      { en: 'Wait for conversion to PPTX', pl: 'Poczekaj na konwersję do PPTX' },
      { en: 'Download the PowerPoint presentation', pl: 'Pobierz prezentację PowerPoint' },
    ],
  },
  'compare-pdf': {
    nameEN: 'Compare PDF', namePL: 'Porównaj PDF',
    steps: [
      { en: 'Upload two PDF files to compare', pl: 'Przeciągnij dwa pliki PDF do porównania' },
      { en: 'Click the compare button', pl: 'Kliknij przycisk porównania' },
      { en: 'View the differences between files', pl: 'Zobacz różnice między plikami' },
      { en: 'Download the comparison report', pl: 'Pobierz raport porównania' },
    ],
  },
  'ai-chat': {
    nameEN: 'AI Chat with PDF', namePL: 'Chat AI z PDF',
    steps: [
      { en: 'Upload a PDF document', pl: 'Przeciągnij dokument PDF' },
      { en: 'Wait for AI to analyze the document', pl: 'Poczekaj na analizę dokumentu przez AI' },
      { en: 'Ask questions about the document content', pl: 'Zadawaj pytania dotyczące treści dokumentu' },
      { en: 'Receive AI-generated answers', pl: 'Otrzymuj odpowiedzi wygenerowane przez AI' },
    ],
  },
  'ai-summary': {
    nameEN: 'AI Summary', namePL: 'AI Streszczenie',
    steps: [
      { en: 'Upload a PDF document', pl: 'Przeciągnij dokument PDF' },
      { en: 'Click the summarize button', pl: 'Kliknij przycisk streszczenia' },
      { en: 'Read the AI-generated summary', pl: 'Przeczytaj streszczenie wygenerowane przez AI' },
    ],
  },
  'openoffice-to-pdf': {
    nameEN: 'OpenOffice to PDF', namePL: 'OpenOffice do PDF',
    steps: [
      { en: 'Upload an OpenOffice document', pl: 'Przeciągnij dokument OpenOffice' },
      { en: 'Wait for conversion', pl: 'Poczekaj na konwersję' },
      { en: 'Download the PDF file', pl: 'Pobierz plik PDF' },
    ],
  },
  'pdf-to-openoffice': {
    nameEN: 'PDF to OpenOffice', namePL: 'PDF do OpenOffice',
    steps: [
      { en: 'Upload the PDF file', pl: 'Przeciągnij plik PDF' },
      { en: 'Wait for conversion to ODT', pl: 'Poczekaj na konwersję do ODT' },
      { en: 'Download the OpenOffice document', pl: 'Pobierz dokument OpenOffice' },
    ],
  },
  'pdf-to-svg': {
    nameEN: 'PDF to SVG', namePL: 'PDF do SVG',
    steps: [
      { en: 'Upload the PDF file', pl: 'Przeciągnij plik PDF' },
      { en: 'Wait for SVG conversion', pl: 'Poczekaj na konwersję do SVG' },
      { en: 'Download the SVG files', pl: 'Pobierz pliki SVG' },
    ],
  },
  'redact-pdf': {
    nameEN: 'Redact PDF', namePL: 'Redaguj PDF',
    steps: [
      { en: 'Upload the PDF file', pl: 'Przeciągnij plik PDF' },
      { en: 'Select pages to redact by clicking thumbnails', pl: 'Wybierz strony do redakcji klikając miniatury' },
      { en: 'Click the redact button', pl: 'Kliknij przycisk redakcji' },
      { en: 'Download the redacted PDF', pl: 'Pobierz zeredagowany plik PDF' },
    ],
  },
  'pdf-to-epub': {
    nameEN: 'PDF to EPUB', namePL: 'PDF do EPUB',
    steps: [
      { en: 'Upload the PDF file', pl: 'Przeciągnij plik PDF' },
      { en: 'Wait for EPUB conversion', pl: 'Poczekaj na konwersję do EPUB' },
      { en: 'Download the EPUB ebook', pl: 'Pobierz e-book EPUB' },
    ],
  },
  'to-pdfa': {
    nameEN: 'Convert to PDF/A', namePL: 'Konwertuj do PDF/A',
    steps: [
      { en: 'Upload the PDF file', pl: 'Przeciągnij plik PDF' },
      { en: 'Click the convert button', pl: 'Kliknij przycisk konwersji' },
      { en: 'Download the PDF/A document', pl: 'Pobierz dokument PDF/A' },
    ],
  },
  'fill-form': {
    nameEN: 'Fill PDF Form', namePL: 'Wypełnij formularz PDF',
    steps: [
      { en: 'Upload the PDF with a form', pl: 'Przeciągnij plik PDF z formularzem' },
      { en: 'Fill in text fields, checkboxes and dropdowns', pl: 'Wypełnij pola tekstowe, checkboxy i listy' },
      { en: 'Click the download button', pl: 'Kliknij przycisk pobierania' },
      { en: 'Download the filled PDF', pl: 'Pobierz wypełniony plik PDF' },
    ],
  },
};

export default function SchemaHowTo() {
  const pathname = usePathname();
  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment || !toolSchemas[segment]) return null;

  const t = toolSchemas[segment];
  const url = `https://optimapdf.com/${segment}`;
  const name = t.namePL;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description: `Dowiedz się jak używać narzędzia ${name} krok po kroku.`,
    url,
    image: `https://optimapdf.com/icon-512.svg`,
    estimatedCost: { '@type': 'MonetaryAmount', currency: 'PLN', value: '0' },
    supply: { '@type': 'HowToSupply', name: 'Plik PDF' },
    tool: { '@type': 'HowToTool', name: 'OptimaPDF' },
    step: t.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.pl,
      text: s.pl,
      url: url + `#step-${i + 1}`,
    })),
    inLanguage: ['pl', 'en'],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
