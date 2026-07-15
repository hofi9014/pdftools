'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getToolIcon, getCategoryIcon } from '@/lib/icons';

type LocaleContent = Record<string, string>;

function lc(locale: string, obj: LocaleContent): string {
  return obj[locale] || obj['en'] || '';
}

interface FaqItem {
  key: string;
  href: string;
  q: LocaleContent;
  a: LocaleContent;
}

interface FaqCategory {
  key: string;
  label: LocaleContent;
  items: FaqItem[];
}

const faqData: FaqCategory[] = [
  {
    key: 'edit',
    label: { pl: 'Edycja PDF', en: 'Edit PDF' },
    items: [
      { key: 'merge', href: '/merge',
        q: { pl: 'Czym jest Scalanie PDF i do czego służy?', en: 'What is Merge PDF and what is it for?' },
        a: { pl: 'Scalanie PDF pozwala połączyć wiele plików PDF w jeden dokument. Przydaje się, gdy masz kilka oddzielnych plików — np. zeskanowane strony, faktury lub raporty — i chcesz z nich zrobić jeden spójny plik. Wystarczy przeciągnąć pliki, ustawić ich kolejność i kliknąć "Połącz". Wszystko działa lokalnie w przeglądarce.', en: 'Merge PDF lets you combine multiple PDF files into a single document. Useful when you have several separate files — like scanned pages, invoices or reports — and want to make one cohesive file. Just drag and drop files, set their order and click "Merge". Everything works locally in your browser.' },
      },
      { key: 'split', href: '/split',
        q: { pl: 'Czym jest Dzielenie PDF i do czego służy?', en: 'What is Split PDF and what is it for?' },
        a: { pl: 'Dzielenie PDF umożliwia podzielenie jednego dokumentu na mniejsze części. Możesz wybrać tryb: co N stron, zakresy stron (np. 1-5, 8, 10-15) lub wybrać konkretne strony do wydzielenia jako osobne pliki. Przydaje się, gdy z dużego dokumentu potrzebujesz tylko wybranych fragmentów.', en: 'Split PDF lets you divide one document into smaller parts. You can choose the mode: every N pages, page ranges (e.g. 1-5, 8, 10-15) or select specific pages to extract as separate files. Useful when you need only selected fragments from a large document.' },
      },
      { key: 'compress', href: '/compress',
        q: { pl: 'Czym jest Kompresja PDF i do czego służy?', en: 'What is Compress PDF and what is it for?' },
        a: { pl: 'Kompresja PDF zmniejsza rozmiar pliku, co ułatwia wysyłanie go mailem lub przechowywanie. Narzędzie oferuje trzy poziomy kompresji: Niska (mała utrata jakości), Średnia (zbalansowana) i Wysoka (maksymalne zmniejszenie). Wszystkie obrazy w PDF są optymalizowane, a niepotrzebne dane usuwane — wszystko lokalnie, bez wysyłania na serwer.', en: 'Compress PDF reduces file size, making it easier to email or store. The tool offers three compression levels: Low (minimal quality loss), Medium (balanced) and High (maximum reduction). All images in the PDF are optimized and unnecessary data removed — all locally, no server upload.' },
      },
      { key: 'rotate', href: '/rotate-pdf',
        q: { pl: 'Czym jest Obracanie stron PDF i do czego służy?', en: 'What is Rotate PDF and what is it for?' },
        a: { pl: 'Obracanie stron PDF pozwala zmienić orientację wybranych stron — o 90°, 180° lub 270°. Przydaje się, gdy zeskanowałeś dokument i część stron jest przekręcona, albo gdy łączysz dokumenty w różnych orientacjach. Możesz też zapisać wszystkie strony jako plik ZIP.', en: 'Rotate PDF lets you change the orientation of selected pages — by 90°, 180° or 270°. Useful when you scanned a document and some pages are rotated, or when merging documents in different orientations. You can also save all pages as a ZIP file.' },
      },
      { key: 'crop', href: '/crop-pdf',
        q: { pl: 'Czym jest Przycinanie stron PDF i do czego służy?', en: 'What is Crop PDF and what is it for?' },
        a: { pl: 'Przycinanie PDF umożliwia wycięcie wybranego obszaru z każdej strony. Możesz wybrać strony do przycięcia, ustawić marginesy (lewy, prawy, górny, dolny) i podejrzeć efekt przed zapisaniem. Przydaje się do usunięcia białych marginesów, stopek lub nagłówków z dokumentu.', en: 'Crop PDF lets you trim a selected area from each page. You can choose which pages to crop, set margins (left, right, top, bottom) and preview the result before saving. Useful for removing white margins, footers or headers from a document.' },
      },
      { key: 'delete', href: '/delete-pages',
        q: { pl: 'Czym jest Usuwanie stron PDF i do czego służy?', en: 'What is Delete Pages and what is it for?' },
        a: { pl: 'Usuwanie stron PDF pozwala wybrać i usunąć niepotrzebne strony z dokumentu. Zaznacz miniatury stron, które chcesz usunąć, a reszta zostanie zapisana jako nowy plik. Przydaje się, gdy chcesz pozbyć się pustych stron, stron reklamowych lub zbędnych fragmentów.', en: 'Delete Pages lets you select and remove unwanted pages from a document. Mark the page thumbnails you want to delete and the rest will be saved as a new file. Useful for removing blank pages, ad pages or unnecessary sections.' },
      },
      { key: 'extract', href: '/extract-pages',
        q: { pl: 'Czym jest Ekstrakcja stron PDF i do czego służy?', en: 'What is Extract Pages and what is it for?' },
        a: { pl: 'Ekstrakcja stron pozwala wybrać konkretne strony z PDF i zapisać je jako osobny plik. W przeciwieństwie do dzielenia, nie usuwasz oryginalnych stron — tworzysz nowy dokument z kopiami wybranych stron. Przydaje się, gdy potrzebujesz tylko wybranego rozdziału z książki lub kilku stron z umowy.', en: 'Extract Pages lets you select specific pages from a PDF and save them as a separate file. Unlike splitting, you don\'t remove the original pages — you create a new document with copies of selected pages. Useful when you need only a specific chapter from a book or a few pages from a contract.' },
      },
      { key: 'reorder', href: '/reorder-pages',
        q: { pl: 'Czym jest Zmiana kolejności stron PDF i do czego służy?', en: 'What is Reorder Pages and what is it for?' },
        a: { pl: 'Zmiana kolejności stron PDF pozwala przeciągać miniatury stron, aby ustawić je w dowolnej kolejności. Przydaje się, gdy zeskanowałeś dokument w złej kolejności, skleiłeś strony w nieodpowiednim porządku lub chcesz przearanżować strony przed finalnym zapisem.', en: 'Reorder Pages lets you drag page thumbnails to arrange them in any order. Useful when you scanned a document in the wrong order, glued pages out of sequence or want to rearrange pages before the final save.' },
      },
      { key: 'addpage', href: '/add-page',
        q: { pl: 'Czym jest Dodawanie strony do PDF i do czego służy?', en: 'What is Add Page and what is it for?' },
        a: { pl: 'Dodawanie strony pozwala wstawić pustą stronę do istniejącego PDF. Możesz wybrać format (A4, Letter, itp.) i orientację (pionowa/pozioma). Strona jest dodawana na końcu dokumentu. Przydaje się, gdy potrzebujesz dodać sekcję na notatki lub oddzielić części dokumentu.', en: 'Add Page lets you insert a blank page into an existing PDF. You can choose the format (A4, Letter, etc.) and orientation (portrait/landscape). The page is added at the end of the document. Useful when you need a section for notes or to separate document parts.' },
      },
      { key: 'edit', href: '/edit-pdf',
        q: { pl: 'Czym jest Edytor PDF i do czego służy?', en: 'What is Edit PDF and what is it for?' },
        a: { pl: 'Edytor PDF umożliwia dodawanie tekstu i prostokątów na dowolnych stronach dokumentu. Możesz wybrać czcionkę, kolor, rozmiar i położenie. Przydaje się do wypełniania formularzy, dodawania adnotacji, zakrywania fragmentów tekstu lub uzupełniania brakujących informacji w dokumencie.', en: 'Edit PDF lets you add text and rectangles on any page of the document. You can choose the font, color, size and position. Useful for filling forms, adding annotations, covering text fragments or completing missing information in a document.' },
      },
      { key: 'pagenumbers', href: '/page-numbers',
        q: { pl: 'Czym jest Numerowanie stron PDF i do czego służy?', en: 'What is Page Numbers and what is it for?' },
        a: { pl: 'Numerowanie stron pozwala dodać numery stron do dokumentu PDF. Możesz wybrać pozycję (u góry/u dołu), wyrównanie (lewo/środek/prawo), styl numeracji i stronę początkową. Przydaje się do profesjonalnego formatowania dokumentów, raportów i prezentacji.', en: 'Page Numbers lets you add page numbers to a PDF document. You can choose the position (top/bottom), alignment (left/center/right), numbering style and starting page. Useful for professional formatting of documents, reports and presentations.' },
      },
      { key: 'watermark', href: '/watermark-pdf',
        q: { pl: 'Czym jest Znak wodny PDF i do czego służy?', en: 'What is Watermark PDF and what is it for?' },
        a: { pl: 'Znak wodny pozwala dodać tekstowy znak wodny (np. "POUFNE", "SZKOŁA", "WERSJA ROBOCZA") do każdej strony PDF. Możesz ustawić przezroczystość, kolor, rozmiar, kąt nachylenia i pozycję. Przydaje się do oznaczania dokumentów przed udostępnieniem.', en: 'Watermark lets you add a text watermark (e.g. "CONFIDENTIAL", "DRAFT") to every page of a PDF. You can set opacity, color, size, rotation angle and position. Useful for marking documents before sharing.' },
      },
      { key: 'redact', href: '/redact-pdf',
        q: { pl: 'Czym jest Redakcja PDF i do czego służy?', en: 'What is Redact PDF and what is it for?' },
        a: { pl: 'Redakcja PDF pozwala trwale usunąć (zakryć czarnym prostokątem) wybrane fragmenty tekstu na stronie. W przeciwieństwie do zwykłego zamalowania, dane są fizycznie usuwane z pliku. Przydaje się do anonimizacji danych osobowych, ukrywania poufnych informacji przed udostępnieniem dokumentu.', en: 'Redact PDF lets you permanently remove (cover with a black rectangle) selected text fragments on a page. Unlike simple painting over, the data is physically removed from the file. Useful for anonymizing personal data, hiding confidential information before sharing a document.' },
      },
      { key: 'flatten', href: '/flatten-pdf',
        q: { pl: 'Czym jest Spłaszczanie PDF i do czego służy?', en: 'What is Flatten PDF and what is it for?' },
        a: { pl: 'Spłaszczanie PDF łączy wszystkie warstwy, adnotacje i pola formularzy w jedną statyczną warstwę. Po spłaszczeniu nie można edytować tekstu ani wypełniać pól — wszystko staje się "obrazem". Przydaje się do finalizacji dokumentu przed wysyłką, aby nikt nie mógł zmienić jego treści.', en: 'Flatten PDF merges all layers, annotations and form fields into a single static layer. After flattening, text cannot be edited nor fields filled — everything becomes a "flat image". Useful for finalizing a document before sending so nobody can alter its content.' },
      },
      { key: 'metadata', href: '/metadata',
        q: { pl: 'Czym jest Edycja metadanych PDF i do czego służy?', en: 'What is PDF Metadata and what is it for?' },
        a: { pl: 'Edycja metadanych pozwala przeglądać i zmieniać informacje o pliku PDF, takie jak tytuł, autor, temat i słowa kluczowe. Te dane są widoczne w właściwościach pliku i wpływają na wyniki wyszukiwania. Przydaje się do kategoryzacji dokumentów i poprawy organizacji plików.', en: 'Metadata editing lets you view and change information about a PDF file, such as title, author, subject and keywords. This data is visible in file properties and affects search results. Useful for categorizing documents and improving file organization.' },
      },
    ],
  },
  {
    key: 'convert',
    label: { pl: 'Konwersja PDF', en: 'Convert PDF' },
    items: [
      { key: 'word', href: '/pdf-to-word',
        q: { pl: 'Czym jest konwersja PDF do Word i do czego służy?', en: 'What is PDF to Word and what is it for?' },
        a: { pl: 'Konwersja PDF do Word zamienia plik PDF na format DOCX, który można edytować w Microsoft Word, LibreOffice lub Google Docs. Przydaje się, gdy otrzymałeś PDF i potrzebujesz edytować jego treść — zmienić tekst, poprawić błąd lub dodać własne fragmenty.', en: 'PDF to Word converts a PDF file to DOCX format, editable in Microsoft Word, LibreOffice or Google Docs. Useful when you received a PDF and need to edit its content — change text, fix an error or add your own sections.' },
      },
      { key: 'wordtopdf', href: '/word-to-pdf',
        q: { pl: 'Czym jest konwersja Word do PDF i do czego służy?', en: 'What is Word to PDF and what is it for?' },
        a: { pl: 'Konwersja Word do PDF zamienia dokument DOCX na plik PDF, który wygląda identycznie na każdym urządzeniu. Przydaje się przed wysyłką dokumentu — PDF zachowuje formatowanie, czcionki i układ niezależnie od tego, gdzie zostanie otwarty.', en: 'Word to PDF converts a DOCX document to a PDF file that looks identical on every device. Useful before sending a document — PDF preserves formatting, fonts and layout regardless of where it is opened.' },
      },
      { key: 'jpgTopdf', href: '/jpg-to-pdf',
        q: { pl: 'Czym jest konwersja JPG do PDF i do czego służy?', en: 'What is JPG to PDF and what is it for?' },
        a: { pl: 'Konwersja JPG do PDF zamienia obrazy JPG, PNG i WebP na plik PDF. Możesz połączyć wiele zdjęć w jeden dokument, ustawić ich kolejność i wybrać orientację strony. Przydaje się do skanowania dokumentów telefonem i łączenia zdjęć w jeden plik PDF.', en: 'JPG to PDF converts JPG, PNG and WebP images into a PDF file. You can combine multiple photos into one document, set their order and choose page orientation. Useful for scanning documents with your phone and combining photos into a single PDF.' },
      },
      { key: 'images', href: '/pdf-to-images',
        q: { pl: 'Czym jest konwersja PDF do obrazów i do czego służy?', en: 'What is PDF to Images and what is it for?' },
        a: { pl: 'Konwersja PDF do obrazów zamienia każdą stronę PDF na osobny obrazek w formacie JPG, PNG lub WebP. Możesz wybrać format, rozdzielczość i jakość. Przydaje się, gdy chcesz udostępnić pojedynczą stronę z dokumentu, wstawić ją do prezentacji lub opublikować w mediach społecznościowych.', en: 'PDF to Images converts each PDF page into a separate image in JPG, PNG or WebP format. You can choose format, resolution and quality. Useful when you want to share a single page from a document, insert it into a presentation or publish on social media.' },
      },
      { key: 'excel', href: '/pdf-to-excel',
        q: { pl: 'Czym jest konwersja PDF do Excel i do czego służy?', en: 'What is PDF to Excel and what is it for?' },
        a: { pl: 'Konwersja PDF do Excel zamienia tabele i dane z pliku PDF na format XLSX. Przydaje się, gdy otrzymałeś raport w PDF i chcesz go dalej analizować w arkuszu kalkulacyjnym — sortować, filtrować lub wykonać obliczenia na danych.', en: 'PDF to Excel converts tables and data from a PDF file to XLSX format. Useful when you received a report in PDF and want to further analyze it in a spreadsheet — sort, filter or perform calculations on the data.' },
      },
      { key: 'excel2pdf', href: '/excel-to-pdf',
        q: { pl: 'Czym jest konwersja Excel do PDF i do czego służy?', en: 'What is Excel to PDF and what is it for?' },
        a: { pl: 'Konwersja Excel do PDF zamienia arkusz kalkulacyjny XLSX na plik PDF. Przydaje się przed udostępnieniem danych finansowych lub raportów — PDF wygląda tak samo na każdym urządzeniu i nie można przypadkowo zmienić komórek.', en: 'Excel to PDF converts an XLSX spreadsheet to a PDF file. Useful before sharing financial data or reports — PDF looks the same on every device and cells cannot be accidentally changed.' },
      },
      { key: 'ppt', href: '/pdf-to-powerpoint',
        q: { pl: 'Czym jest konwersja PDF do PowerPoint i do czego służy?', en: 'What is PDF to PowerPoint and what is it for?' },
        a: { pl: 'Konwersja PDF do PowerPoint zamienia strony pliku PDF na slajdy w formacie PPTX. Każda strona PDF staje się osobnym slajdem. Przydaje się, gdy masz prezentację w PDF i chcesz ją edytować lub dostosować w programie PowerPoint.', en: 'PDF to PowerPoint converts PDF pages into slides in PPTX format. Each PDF page becomes a separate slide. Useful when you have a presentation in PDF and want to edit or customize it in PowerPoint.' },
      },
      { key: 'openoffice', href: '/openoffice-to-pdf',
        q: { pl: 'Czym jest konwersja OpenOffice do PDF i do czego służy?', en: 'What is OpenOffice to PDF and what is it for?' },
        a: { pl: 'Konwersja OpenOffice do PDF zamienia dokumenty ODT (Writer), ODS (Calc) i ODP (Impress) na plik PDF. Przydaje się użytkownikom LibreOffice i OpenOffice, którzy chcą udostępnić swoje dokumenty w uniwersalnym formacie PDF.', en: 'OpenOffice to PDF converts ODT (Writer), ODS (Calc) and ODP (Impress) documents to PDF format. Useful for LibreOffice and OpenOffice users who want to share their documents in the universal PDF format.' },
      },
      { key: 'pdf2openoffice', href: '/pdf-to-openoffice',
        q: { pl: 'Czym jest konwersja PDF do OpenOffice i do czego służy?', en: 'What is PDF to OpenOffice and what is it for?' },
        a: { pl: 'Konwersja PDF do OpenOffice zamienia plik PDF na format ODT, który można edytować w LibreOffice Writer lub OpenOffice Writer. Przydaje się, gdy używasz darmowych pakietów biurowych i potrzebujesz edytować treść z pliku PDF.', en: 'PDF to OpenOffice converts a PDF file to ODT format, editable in LibreOffice Writer or OpenOffice Writer. Useful when you use free office suites and need to edit content from a PDF file.' },
      },
      { key: 'txt', href: '/pdf-to-txt',
        q: { pl: 'Czym jest konwersja PDF do TXT i do czego służy?', en: 'What is PDF to TXT and what is it for?' },
        a: { pl: 'Konwersja PDF do TXT wyodrębnia cały tekst z pliku PDF i zapisuje go jako zwykły plik tekstowy. Traci przy tym formatowanie, ale zyskujesz czysty, łatwy do przetworzenia tekst. Przydaje się do analizy danych, kopiowania treści lub użycia w innych programach.', en: 'PDF to TXT extracts all text from a PDF file and saves it as a plain text file. It loses formatting but you get clean, easy-to-process text. Useful for data analysis, copying content or use in other programs.' },
      },
      { key: 'svg', href: '/pdf-to-svg',
        q: { pl: 'Czym jest konwersja PDF do SVG i do czego służy?', en: 'What is PDF to SVG and what is it for?' },
        a: { pl: 'Konwersja PDF do SVG zamienia każdą stronę PDF na skalowalny plik SVG (wektorowy). W przeciwieństwie do JPG, SVG można powiększać bez utraty jakości. Przydaje się projektantom i grafikom, którzy potrzebują dalej edytować zawartość strony w programach takich jak Illustrator, Inkscape lub Figma.', en: 'PDF to SVG converts each PDF page into a scalable SVG (vector) file. Unlike JPG, SVG can be enlarged without quality loss. Useful for designers and graphic artists who need to further edit page content in programs like Illustrator, Inkscape or Figma.' },
      },
      { key: 'epub', href: '/pdf-to-epub',
        q: { pl: 'Czym jest konwersja PDF do EPUB i do czego służy?', en: 'What is PDF to EPUB and what is it for?' },
        a: { pl: 'Konwersja PDF do EPUB zamienia dokument PDF na format EPUB, powszechnie używany w czytnikach ebooków (Kindle, PocketBook, Kobo). Tekst dostosowuje się do rozmiaru ekranu, co ułatwia czytanie na małych urządzeniach. Przydaje się, gdy chcesz czytać PDF na czytniku ebooków w wygodniejszej formie.', en: 'PDF to EPUB converts a PDF document to EPUB format, commonly used in ebook readers (Kindle, PocketBook, Kobo). Text adapts to screen size, making reading easier on small devices. Useful when you want to read a PDF on an ebook reader in a more comfortable format.' },
      },
      { key: 'html', href: '/html-to-pdf',
        q: { pl: 'Czym jest konwersja HTML do PDF i do czego służy?', en: 'What is HTML to PDF and what is it for?' },
        a: { pl: 'Konwersja HTML do PDF zamienia kod strony internetowej na plik PDF. Wklej kod HTML lub podaj URL strony. Przydaje się do archiwizacji stron internetowych, zapisywania artykułów do czytania offline lub generowania raportów z kodu HTML.', en: 'HTML to PDF converts webpage code into a PDF file. Paste HTML code or provide a page URL. Useful for archiving web pages, saving articles for offline reading or generating reports from HTML code.' },
      },
      { key: 'url', href: '/url-to-pdf',
        q: { pl: 'Czym jest konwersja URL do PDF i do czego służy?', en: 'What is URL to PDF and what is it for?' },
        a: { pl: 'Konwersja URL do PDF pozwala zapisać stronę internetową jako plik PDF, podając jej adres URL. Przydaje się do archiwizacji artykułów, zapisywania instrukcji lub dokumentacji do czytania offline. Uwaga: ta funkcja wymaga połączenia z serwerem (nie działa w pełni lokalnie).', en: 'URL to PDF lets you save a webpage as a PDF file by providing its URL. Useful for archiving articles, saving instructions or documentation for offline reading. Note: this function requires a server connection (not fully local).' },
      },
      { key: 'html2pdf', href: '/pdf-to-html',
        q: { pl: 'Czym jest konwersja PDF do HTML i do czego służy?', en: 'What is PDF to HTML and what is it for?' },
        a: { pl: 'Konwersja PDF do HTML zamienia strony pliku PDF na kod HTML. Przydaje się, gdy chcesz opublikować treść PDF na stronie internetowej, blogu lub w systemie CMS bez potrzeby ręcznego przepisywania.', en: 'PDF to HTML converts PDF pages into HTML code. Useful when you want to publish PDF content on a website, blog or CMS without manually rewriting it.' },
      },
    ],
  },
  {
    key: 'secure',
    label: { pl: 'Zabezpieczenia PDF', en: 'PDF Security' },
    items: [
      { key: 'protect', href: '/protect-pdf',
        q: { pl: 'Czym jest Zabezpieczanie PDF hasłem i do czego służy?', en: 'What is Protect PDF and what is it for?' },
        a: { pl: 'Zabezpieczanie PDF hasłem pozwala ustawić hasło otwarcia dokumentu — bez niego nikt nie odczyta pliku. Możesz też dodać hasło uprawnień, które ogranicza drukowanie, kopiowanie i edycję. Przydaje się do wysyłania poufnych dokumentów mailem lub przechowywania danych wrażliwych.', en: 'Protect PDF lets you set a password to open the document — without it, nobody can read the file. You can also add a permissions password that restricts printing, copying and editing. Useful for sending confidential documents by email or storing sensitive data.' },
      },
      { key: 'unlock', href: '/unlock-pdf',
        q: { pl: 'Czym jest Odblokowywanie PDF i do czego służy?', en: 'What is Unlock PDF and what is it for?' },
        a: { pl: 'Odblokowywanie PDF usuwa hasło i ograniczenia z zabezpieczonego pliku PDF. Działa zarówno dla hasła otwarcia, jak i hasła uprawnień. Przydaje się, gdy znasz hasło do swojego PDF i chcesz usunąć zabezpieczenia, aby swobodnie edytować lub drukować dokument.', en: 'Unlock PDF removes the password and restrictions from a secured PDF file. Works for both the open password and permissions password. Useful when you know the password to your PDF and want to remove protection to freely edit or print the document.' },
      },
      { key: 'sign', href: '/sign-pdf',
        q: { pl: 'Czym jest Podpisywanie PDF i do czego służy?', en: 'What is Sign PDF and what is it for?' },
        a: { pl: 'Podpisywanie PDF pozwala dodać podpis odręczny (narysowany myszką lub palcem) albo tekstowy na wybranej stronie dokumentu. Możesz też dodać datę i szybkie pozycje. Przydaje się do podpisywania umów, wniosków i innych dokumentów bez drukowania i skanowania.', en: 'Sign PDF lets you add a handwritten signature (drawn with mouse or finger) or a text signature on a selected page. You can also add the date and quick positions. Useful for signing contracts, applications and other documents without printing and scanning.' },
      },
    ],
  },
  {
    key: 'cloud',
    label: { pl: 'Import/eksport z chmury', ar: 'الاستيراد/التصدير من السحابة', de: 'Cloud-Import/-Export', en: 'Cloud import/export', es: 'Importación/exportación desde la nube', fa: 'واردات / صادرات ابری', fr: 'Import/export depuis le cloud', hi: 'क्लाउड इम्पोर्ट/एक्सपोर्ट', is: 'Skýja innflutningur/útflutningur', it: 'Importazione/esportazione dal cloud', ja: 'クラウドインポート/エクスポート', no: 'Skyimport/-eksport', pt: 'Importação/exportação da nuvem', sv: 'Molnimport/-export', tr: 'Bulut içe/dışa aktarma', zh: '云导入/导出' },
    items: [
      { key: 'cloud-access', href: '/guide',
        q: {
          pl: 'Czy OptimaPDF ma dostęp do moich plików w Google Drive/OneDrive/SharePoint?',
          ar: 'هل OptimaPDF لديه حق الوصول إلى ملفاتي في Google Drive / OneDrive / SharePoint؟',
          de: 'Hat OptimaPDF Zugriff auf meine Dateien in Google Drive/OneDrive/SharePoint?',
          en: 'Does OptimaPDF have access to my files in Google Drive/OneDrive/SharePoint?',
          es: '¿Tiene OptimaPDF acceso a mis archivos en Google Drive/OneDrive/SharePoint?',
          fa: 'آیا OptimaPDF به فایل‌های من در Google Drive / OneDrive / SharePoint دسترسی دارد؟',
          fr: 'OptimaPDF a-t-il accès à mes fichiers sur Google Drive/OneDrive/SharePoint ?',
          hi: 'क्या OptimaPDF को Google Drive/OneDrive/SharePoint में मेरी फ़ाइलों तक पहुंच है?',
          is: 'Hefur OptimaPDF aðgang að skránum mínum í Google Drive/OneDrive/SharePoint?',
          it: 'OptimaPDF ha accesso ai miei file su Google Drive/OneDrive/SharePoint?',
          ja: 'OptimaPDFはGoogle Drive/OneDrive/SharePointのファイルにアクセスできますか？',
          no: 'Har OptimaPDF tilgang til filene mine i Google Drive/OneDrive/SharePoint?',
          pt: 'O OptimaPDF tem acesso aos meus ficheiros no Google Drive/OneDrive/SharePoint?',
          sv: 'Har OptimaPDF tillgång till mina filer i Google Drive/OneDrive/SharePoint?',
          tr: 'OptimaPDF, Google Drive/OneDrive/SharePoint\'teki dosyalarıma erişebilir mi?',
          zh: 'OptimaPDF可以访问我在Google Drive/OneDrive/SharePoint中的文件吗？',
        },
        a: {
          pl: 'Nie. OptimaPDF żąda dostępu tylko do plików, które samodzielnie wybierzesz. Token OAuth przyznaje dostęp wyłącznie do konkretnych plików, które zdecydujesz się zaimportować lub folderu, do którego chcesz wyeksportować. OptimaPDF nigdy nie skanuje Twojego dysku, nie przechowuje tokenów na serwerze i nie ma ciągłego dostępu do Twoich plików.',
          ar: 'لا. يطلب OptimaPDF الوصول فقط إلى الملفات التي تختارها بنفسك. يمنح رمز OAuth الوصول فقط إلى الملفات المحددة التي تختار استيرادها أو المجلد الذي تريد التصدير إليه. لا يقوم OptimaPDF أبدًا بفحص وحدة التخزين السحابية الخاصة بك، ولا يخزن الرموز على الخادم، وليس لديه وصول مستمر إلى ملفاتك.',
          de: 'Nein. OptimaPDF fordert nur Zugriff auf Dateien an, die Sie selbst auswählen. Das OAuth-Token gewährt nur Zugriff auf die spezifischen Dateien, die Sie importieren möchten, oder den Ordner, in den Sie exportieren möchten. OptimaPDF scannt niemals Ihre Cloud-Speicher, speichert keine Token auf dem Server und hat keinen dauerhaften Zugriff auf Ihre Dateien.',
          en: 'No. OptimaPDF only requests access to files you explicitly select. The OAuth token grants access only to the specific files you choose to import or the folder you want to export to. OptimaPDF never scans your cloud storage, never stores tokens on the server, and has no ongoing access to your files.',
          es: 'No. OptimaPDF solo solicita acceso a los archivos que selecciones explícitamente. El token OAuth otorga acceso solo a los archivos específicos que elijas importar o a la carpeta a la que deseas exportar. OptimaPDF nunca escanea tu almacenamiento en la nube, nunca almacena tokens en el servidor y no tiene acceso continuo a tus archivos.',
          fa: 'خیر. OptimaPDF فقط به فایل‌هایی دسترسی می‌خواهد که خودتان انتخاب کنید. توکن OAuth فقط به فایل‌های خاصی که برای وارد کردن انتخاب می‌کنید یا پوشه‌ای که می‌خواهید به آن صادر کنید دسترسی می‌دهد. OptimaPDF هرگز فضای ذخیره‌سازی ابری شما را اسکن نمی‌کند، هرگز توکن‌ها را روی سرور ذخیره نمی‌کند و دسترسی مداوم به فایل‌های شما ندارد.',
          fr: 'Non. OptimaPDF ne demande accès qu\'aux fichiers que vous sélectionnez vous-même. Le jeton OAuth n\'accorde l\'accès qu\'aux fichiers spécifiques que vous choisissez d\'importer ou au dossier vers lequel vous souhaitez exporter. OptimaPDF ne scanne jamais votre stockage cloud, ne stocke jamais de jetons sur le serveur et n\'a aucun accès continu à vos fichiers.',
          hi: 'नहीं। OptimaPDF केवल उन फ़ाइलों तक पहुंच का अनुरोध करता है जिन्हें आप स्वयं चुनते हैं। OAuth टोकन केवल उन विशिष्ट फ़ाइलों तक पहुंच प्रदान करता है जिन्हें आप आयात करना चुनते हैं या उस फ़ोल्डर तक जिसमें आप निर्यात करना चाहते हैं। OptimaPDF आपके क्लाउड स्टोरेज को कभी स्कैन नहीं करता, सर्वर पर टोकन कभी संग्रहीत नहीं करता, और आपकी फ़ाइलों तक उसकी कोई निरंतर पहुंच नहीं है।',
          is: 'Nei. OptimaPDF biður aðeins um aðgang að skrám sem þú velur sjálfur. OAuth táknið veitir aðeins aðgang að þeim tilteknu skrám sem þú velur að flytja inn eða möppunni sem þú vilt flytja út í. OptimaPDF skannar aldrei skýjageymsluna þína, geymir aldrei tákn á þjóninum og hefur engan viðvarandi aðgang að skránum þínum.',
          it: 'No. OptimaPDF richiede l\'accesso solo ai file che selezioni esplicitamente. Il token OAuth concede l\'accesso solo ai file specifici che scegli di importare o alla cartella in cui desideri esportare. OptimaPDF non scansiona mai il tuo cloud storage, non memorizza mai i token sul server e non ha accesso continuo ai tuoi file.',
          ja: 'いいえ。OptimaPDFは、お客様が明示的に選択したファイルにのみアクセスを要求します。OAuthトークンは、お客様がインポートすることを選択した特定のファイル、またはエクスポート先のフォルダにのみアクセスを許可します。OptimaPDFはお客様のクラウドストレージをスキャンすることはなく、サーバーにトークンを保存することも、お客様のファイルへの継続的なアクセス権を持つこともありません。',
          no: 'Nei. OptimaPDF ber bare om tilgang til filer du selv velger. OAuth-tokenet gir kun tilgang til de spesifikke filene du velger å importere eller mappen du vil eksportere til. OptimaPDF skanner aldri skylagringen din, lagrer aldri token på serveren og har ingen løpende tilgang til filene dine.',
          pt: 'Não. O OptimaPDF só solicita acesso aos ficheiros que seleciona explicitamente. O token OAuth concede acesso apenas aos ficheiros específicos que escolhe importar ou à pasta para a qual pretende exportar. O OptimaPDF nunca analisa o seu armazenamento na nuvem, nunca armazena tokens no servidor e não tem acesso contínuo aos seus ficheiros.',
          sv: 'Nej. OptimaPDF begär endast åtkomst till filer som du själv väljer. OAuth-tokenet ger endast åtkomst till de specifika filer du väljer att importera eller mappen du vill exportera till. OptimaPDF skannar aldrig ditt molnlagring, lagrar aldrig tokens på servern och har ingen löpande åtkomst till dina filer.',
          tr: 'Hayır. OptimaPDF yalnızca sizin açıkça seçtiğiniz dosyalara erişim talep eder. OAuth tokeni yalnızca içe aktarmayı seçtiğiniz belirli dosyalara veya dışa aktarmak istediğiniz klasöre erişim izni verir. OptimaPDF bulut depolama alanınızı asla taramaz, tokenleri sunucuda asla saklamaz ve dosyalarınıza sürekli erişimi yoktur.',
          zh: '不。OptimaPDF仅请求访问您明确选择的文件。OAuth令牌仅授予对您选择导入的特定文件或您要导出到的文件夹的访问权限。OptimaPDF从不扫描您的云存储，从不在服务器上存储令牌，并且没有对您文件的持续访问权限。',
        },
      },
      { key: 'cloud-relogin', href: '/guide',
        q: {
          pl: 'Dlaczego muszę się logować za każdym razem?',
          ar: 'لماذا يجب علي تسجيل الدخول في كل مرة؟',
          de: 'Warum muss ich mich jedes Mal anmelden?',
          en: 'Why do I have to log in every time?',
          es: '¿Por qué tengo que iniciar sesión cada vez?',
          fa: 'چرا باید هر بار وارد شوم؟',
          fr: 'Pourquoi dois-je me connecter à chaque fois ?',
          hi: 'मुझे हर बार लॉग इन क्यों करना पड़ता है?',
          is: 'Af hverju þarf ég að skrá mig inn í hvert skipti?',
          it: 'Perché devo accedere ogni volta?',
          ja: '毎回ログインする必要があるのはなぜですか？',
          no: 'Hvorfor må jeg logge på hver gang?',
          pt: 'Por que tenho de iniciar sessão sempre?',
          sv: 'Varför måste jag logga in varje gång?',
          tr: 'Neden her seferinde oturum açmak zorundayım?',
          zh: '为什么我每次都要登录？',
        },
        a: {
          pl: 'Ze względów bezpieczeństwa Twoja sesja logowania jest tymczasowa. Token OAuth wygasa po krótkim czasie lub po zamknięciu karty przeglądarki. Zapobiega to nieautoryzowanemu dostępowi, jeśli zostawisz komputer bez nadzoru. Ostatnio używane witryny i foldery są zapisywane lokalnie w przeglądarce, więc ponowne połączenie wymaga tylko jednego kliknięcia.',
          ar: 'لأسباب أمنية، جلسة تسجيل الدخول الخاصة بك مؤقتة. تنتهي صلاحية رمز OAuth بعد فترة قصيرة أو بعد إغلاق علامة تبويب المتصفح. يمنع هذا الوصول غير المصرح به إذا تركت جهاز الكمبيوتر الخاص بك دون مراقبة. يتم حفظ المواقع والمجلدات المستخدمة مؤخرًا محليًا في متصفحك، لذا فإن إعادة الاتصال تتطلب نقرة واحدة فقط.',
          de: 'Aus Sicherheitsgründen ist Ihre Anmeldesitzung temporär. Das OAuth-Token läuft nach kurzer Zeit oder nach dem Schließen des Browser-Tabs ab. Dies verhindert unbefugten Zugriff, falls Sie Ihren Computer unbeaufsichtigt lassen. Zuletzt verwendete Websites und Ordner werden lokal in Ihrem Browser gespeichert, sodass die erneute Verbindung nur einen Klick erfordert.',
          en: 'For security reasons, your login session is temporary. The OAuth token expires after a short period or when you close the browser tab. This prevents unauthorized access if you leave your computer unattended. Recently used sites and folders are saved locally in your browser, so reconnecting takes just one click.',
          es: 'Por razones de seguridad, su sesión de inicio de sesión es temporal. El token OAuth caduca después de un breve período o cuando cierra la pestaña del navegador. Esto evita el acceso no autorizado si deja su computadora desatendida. Los sitios y carpetas utilizados recientemente se guardan localmente en su navegador, por lo que reconectarse solo requiere un clic.',
          fa: 'به دلایل امنیتی، نشست ورود شما موقت است. توکن OAuth پس از مدت کوتاهی یا پس از بستن برگه مرورگر منقضی می‌شود. این امر از دسترسی غیرمجاز در صورت ترک رایانه بدون مراقبت جلوگیری می‌کند. سایت‌ها و پوشه‌های اخیراً استفاده شده به صورت محلی در مرورگر شما ذخیره می‌شوند، بنابراین اتصال مجدد فقط یک کلیک نیاز دارد.',
          fr: 'Pour des raisons de sécurité, votre session de connexion est temporaire. Le jeton OAuth expire après une courte période ou lorsque vous fermez l\'onglet du navigateur. Cela empêche tout accès non autorisé si vous laissez votre ordinateur sans surveillance. Les sites et dossiers récemment utilisés sont enregistrés localement dans votre navigateur, donc la reconnexion ne nécessite qu\'un clic.',
          hi: 'सुरक्षा कारणों से, आपका लॉगिन सत्र अस्थायी है। OAuth टोकन थोड़े समय के बाद या ब्राउज़र टैब बंद करने पर समाप्त हो जाता है। यदि आप अपने कंप्यूटर को बिना निगरानी छोड़ते हैं तो यह अनधिकृत पहुंच को रोकता है। हाल ही में उपयोग की गई साइटें और फ़ोल्डर आपके ब्राउज़र में स्थानीय रूप से सहेजे जाते हैं, इसलिए पुनः कनेक्ट करने में केवल एक क्लिक लगता है।',
          is: 'Af öryggisástæðum er innskráningarsetan þín tímabundin. OAuth táknið rennur út eftir stuttan tíma eða þegar þú lokar vafraflipanum. Þetta kemur í veg fyrir óviðkomandi aðgang ef þú skilur tölvuna eftir án eftirlits. Nýlega notuð svæði og möppur eru vistuð staðvært í vafranum þínum, svo endurtenging tekur aðeins eitt smelli.',
          it: 'Per motivi di sicurezza, la sessione di accesso è temporanea. Il token OAuth scade dopo un breve periodo o quando si chiude la scheda del browser. Ciò impedisce l\'accesso non autorizzato se si lascia il computer incustodito. I siti e le cartelle utilizzati di recente vengono salvati localmente nel browser, quindi la riconnessione richiede un solo clic.',
          ja: 'セキュリティ上の理由から、ログインセッションは一時的なものです。OAuthトークンは短期間経過後、またはブラウザタブを閉じると期限切れになります。これにより、コンピューターを無人にした場合の不正アクセスを防ぎます。最近使用したサイトやフォルダはブラウザにローカルに保存されるため、再接続はワンクリックで行えます。',
          no: 'Av sikkerhetsgrunner er innloggingsøkten din midlertidig. OAuth-tokenet utløper etter en kort periode eller når du lukker nettleserfanen. Dette forhindrer uautorisert tilgang hvis du forlater datamaskinen uten tilsyn. Nylig brukte områder og mapper lagres lokalt i nettleseren din, så gjenoppretting av tilkobling tar bare ett klikk.',
          pt: 'Por razões de segurança, a sua sessão de início de sessão é temporária. O token OAuth expira após um curto período ou quando fecha o separador do navegador. Isto impede o acesso não autorizado se deixar o seu computador sem vigilância. Os sites e pastas utilizados recentemente são guardados localmente no seu navegador, pelo que restabelecer a ligação requer apenas um clique.',
          sv: 'Av säkerhetsskäl är din inloggningssession tillfällig. OAuth-tokenet upphör att gälla efter en kort period eller när du stänger webbläsarfliken. Detta förhindrar obehörig åtkomst om du lämnar din dator utan uppsikt. Nyligen använda webbplatser och mappar sparas lokalt i din webbläsare, så återanslutning tar bara ett klick.',
          tr: 'Güvenlik nedeniyle oturum açma oturumunuz geçicidir. OAuth tokeni kısa bir süre sonra veya tarayıcı sekmesini kapattığınızda sona erer. Bu, bilgisayarınızı gözetimsiz bırakmanız durumunda yetkisiz erişimi önler. Son kullanılan siteler ve klasörler tarayıcınızda yerel olarak kaydedilir, böylece yeniden bağlanmak yalnızca bir tıklama alır.',
          zh: '出于安全原因，您的登录会话是临时的。OAuth令牌会在短时间后或关闭浏览器标签页时过期。这可以防止您在计算机无人看管时发生未经授权的访问。最近使用的站点和文件夹会保存在您的浏览器本地，因此重新连接只需单击一次。',
        },
      },
      { key: 'cloud-privacy', href: '/guide',
        q: {
          pl: 'Czy inne osoby widzą moje połączone konta chmurowe?',
          ar: 'هل يمكن للأشخاص الآخرين رؤية حساباتي السحابية المتصلة؟',
          de: 'Können andere Personen meine verbundenen Cloud-Konten sehen?',
          en: 'Can other people see my connected cloud accounts?',
          es: '¿Pueden otras personas ver mis cuentas de nube conectadas?',
          fa: 'آیا افراد دیگر می‌توانند حساب‌های ابری متصل من را ببینند؟',
          fr: 'D\'autres personnes peuvent-elles voir mes comptes cloud connectés ?',
          hi: 'क्या अन्य लोग मेरे कनेक्टेड क्लाउड खातों को देख सकते हैं?',
          is: 'Getur annað fólk séð tengdu skýjareikningana mína?',
          it: 'Altre persone possono vedere i miei account cloud connessi?',
          ja: '他の人は私の接続済みクラウドアカウントを見ることができますか？',
          no: 'Kan andre personer se de tilkoblede skykontoene mine?',
          pt: 'Outras pessoas podem ver as minhas contas de nuvem conectadas?',
          sv: 'Kan andra personer se mina anslutna molnkonton?',
          tr: 'Diğer kişiler bağlı bulut hesaplarımı görebilir mi?',
          zh: '其他人可以看到我连接的云账户吗？',
        },
        a: {
          pl: 'Nie. Wszelkie zapisane połączenia (ostatnie witryny SharePoint, foldery OneDrive, foldery Google Drive) są przechowywane wyłącznie w localStorage Twojej przeglądarki na Twoim urządzeniu. Nigdy nie są wysyłane na serwer OptimaPDF, nie są synchronizowane między urządzeniami, a inne osoby korzystające z tego samego serwisu na innych komputerach nie widzą Twoich połączeń.',
          ar: 'لا. يتم تخزين أي اتصالات محفوظة (مواقع SharePoint الأخيرة، مجلدات OneDrive، مجلدات Google Drive) حصريًا في localStorage لمتصفحك على جهازك. لا يتم إرسالها أبدًا إلى خادم OptimaPDF، ولا تتم مزامنتها بين الأجهزة، والأشخاص الآخرون الذين يستخدمون نفس الموقع من أجهزة كمبيوتر مختلفة لا يمكنهم رؤية اتصالاتك.',
          de: 'Nein. Alle gespeicherten Verbindungen (zuletzt verwendete SharePoint-Websites, OneDrive-Ordner, Google Drive-Ordner) werden ausschließlich im localStorage Ihres Browsers auf Ihrem Gerät gespeichert. Sie werden niemals an den OptimaPDF-Server gesendet, nicht zwischen Geräten synchronisiert, und andere Personen, die dieselbe Website von anderen Computern aus nutzen, können Ihre Verbindungen nicht sehen.',
          en: 'No. Any saved connections (recent SharePoint sites, OneDrive folders, Google Drive folders) are stored exclusively in your browser\'s localStorage on your device. They are never sent to the OptimaPDF server, never synced between devices, and other people using the same site from different computers cannot see your connections.',
          es: 'No. Todas las conexiones guardadas (sitios recientes de SharePoint, carpetas de OneDrive, carpetas de Google Drive) se almacenan exclusivamente en el localStorage de su navegador en su dispositivo. Nunca se envían al servidor de OptimaPDF, no se sincronizan entre dispositivos, y otras personas que usan el mismo sitio desde diferentes computadoras no pueden ver sus conexiones.',
          fa: 'خیر. هرگونه اتصال ذخیره شده (سایت‌های اخیر SharePoint، پوشه‌های OneDrive، پوشه‌های Google Drive) منحصراً در localStorage مرورگر شما روی دستگاه شما ذخیره می‌شوند. آنها هرگز به سرور OptimaPDF ارسال نمی‌شوند، هرگز بین دستگاه‌ها همگام‌سازی نمی‌شوند و سایر افراد استفاده‌کننده از همان سایت از رایانه‌های مختلف نمی‌توانند اتصالات شما را ببینند.',
          fr: 'Non. Toutes les connexions enregistrées (sites SharePoint récents, dossiers OneDrive, dossiers Google Drive) sont stockées exclusivement dans le localStorage de votre navigateur sur votre appareil. Elles ne sont jamais envoyées au serveur OptimaPDF, jamais synchronisées entre les appareils, et les autres personnes utilisant le même site depuis différents ordinateurs ne peuvent pas voir vos connexions.',
          hi: 'नहीं। कोई भी सहेजा गया कनेक्शन (हाल के SharePoint साइट, OneDrive फ़ोल्डर, Google Drive फ़ोल्डर) आपके डिवाइस पर आपके ब्राउज़र के localStorage में विशेष रूप से संग्रहीत किया जाता है। वे कभी भी OptimaPDF सर्वर पर नहीं भेजे जाते, उपकरणों के बीच कभी सिंक नहीं किए जाते, और विभिन्न कंप्यूटरों से同一 साइट का उपयोग करने वाले अन्य लोग आपके कनेक्शन नहीं देख सकते।',
          is: 'Nei. Allar vistaðar tengingar (nýleg SharePoint svæði, OneDrive möppur, Google Drive möppur) eru geymdar eingöngu í localStorage vafrans þíns á tækinu þínu. Þær eru aldrei sendar til OptimaPDF þjónsins, aldrei samstilltar á milli tækja og annað fólk sem notar sömu síðu frá mismunandi tölvum getur ekki séð tengingarnar þínar.',
          it: 'No. Tutte le connessioni salvate (siti SharePoint recenti, cartelle OneDrive, cartelle Google Drive) vengono memorizzate esclusivamente nel localStorage del tuo browser sul tuo dispositivo. Non vengono mai inviate al server OptimaPDF, mai sincronizzate tra dispositivi e altre persone che utilizzano lo stesso sito da computer diversi non possono vedere le tue connessioni.',
          ja: 'いいえ。保存された接続（最近のSharePointサイト、OneDriveフォルダ、Google Driveフォルダ）は、お客様のデバイスのブラウザのlocalStorageにのみ保存されます。OptimaPDFサーバーに送信されることはなく、デバイス間で同期されることもなく、異なるコンピュータから同じサイトを使用する他の人には接続は見えません。',
          no: 'Nei. Eventuelle lagrede tilkoblinger (nylige SharePoint-områder, OneDrive-mapper, Google Drive-mapper) lagres utelukkende i nettleserens localStorage på enheten din. De blir aldri sendt til OptimaPDF-serveren, aldri synkronisert mellom enheter, og andre personer som bruker samme nettsted fra forskjellige datamaskiner kan ikke se tilkoblingene dine.',
          pt: 'Não. Quaisquer ligações guardadas (sites recentes do SharePoint, pastas do OneDrive, pastas do Google Drive) são armazenadas exclusivamente no localStorage do seu navegador no seu dispositivo. Nunca são enviadas para o servidor OptimaPDF, nunca são sincronizadas entre dispositivos, e outras pessoas que utilizam o mesmo site a partir de computadores diferentes não podem ver as suas ligações.',
          sv: 'Nej. Alla sparade anslutningar (senaste SharePoint-webbplatser, OneDrive-mappar, Google Drive-mappar) lagras uteslutande i din webbläsares localStorage på din enhet. De skickas aldrig till OptimaPDF-servern, synkroniseras aldrig mellan enheter och andra personer som använder samma webbplats från olika datorer kan inte se dina anslutningar.',
          tr: 'Hayır. Kaydedilen tüm bağlantılar (son SharePoint siteleri, OneDrive klasörleri, Google Drive klasörleri) yalnızca cihazınızdaki tarayıcınızın localStorage\'ında saklanır. Asla OptimaPDF sunucusuna gönderilmez, cihazlar arasında asla senkronize edilmez ve farklı bilgisayarlardan aynı siteyi kullanan diğer kişiler bağlantılarınızı göremez.',
          zh: '不。任何已保存的连接（最近的SharePoint站点、OneDrive文件夹、Google Drive文件夹）都仅存储在您设备上的浏览器localStorage中。它们永远不会发送到OptimaPDF服务器，永远不会在设备之间同步，从不同计算机使用同一站点的其他人无法看到您的连接。',
        },
      },
    ],
  },
  {
    key: 'more',
    label: { pl: 'Dodatkowe narzędzia', en: 'More Tools' },
    items: [
      { key: 'aichat', href: '/ai-chat',
        q: { pl: 'Czym jest Czat AI z PDF i do czego służy?', en: 'What is AI Chat with PDF and what is it for?' },
        a: { pl: 'Czat AI pozwala zadawać pytania dotyczące treści dokumentu PDF — AI analizuje tekst i odpowiada na podstawie jego zawartości. Wymaga własnego klucza API OpenRouter. Przydaje się do szybkiego znajdowania informacji w długich dokumentach, streszczania fragmentów lub zadawania pytań o konkretne dane.', en: 'AI Chat lets you ask questions about the content of a PDF document — AI analyzes the text and answers based on its content. Requires your own OpenRouter API key. Useful for quickly finding information in long documents, summarizing sections or asking about specific data.' },
      },
      { key: 'aisummary', href: '/ai-summary',
        q: { pl: 'Czym jest AI Streszczenie PDF i do czego służy?', en: 'What is AI Summary and what is it for?' },
        a: { pl: 'AI Streszczenie generuje krótkie podsumowanie treści pliku PDF przy użyciu sztucznej inteligencji. Wymaga własnego klucza API OpenRouter. Przydaje się, gdy chcesz szybko poznać główne punkty długiego dokumentu bez czytania go w całości.', en: 'AI Summary generates a short summary of a PDF file\'s content using artificial intelligence. Requires your own OpenRouter API key. Useful when you want to quickly understand the main points of a long document without reading it entirely.' },
      },
      { key: 'translate', href: '/ai-translate',
        q: { pl: 'Czym jest AI Tłumacz PDF i do czego służy?', en: 'What is AI Translate and what is it for?' },
        a: { pl: 'AI Tłumacz pozwala przetłumaczyć treść pliku PDF na inny język przy użyciu sztucznej inteligencji. Wymaga własnego klucza API OpenRouter. Przydaje się do tłumaczenia dokumentów, umów i artykułów bez konieczności kopiowania tekstu do zewnętrznych translatorów.', en: 'AI Translate lets you translate a PDF file\'s content to another language using artificial intelligence. Requires your own OpenRouter API key. Useful for translating documents, contracts and articles without copying text to external translators.' },
      },
      { key: 'ocr', href: '/ocr-pdf',
        q: { pl: 'Czym jest OCR PDF i do czego służy?', en: 'What is OCR PDF and what is it for?' },
        a: { pl: 'OCR (Optical Character Recognition) rozpoznaje tekst na zeskanowanych obrazach i stronach PDF, zamieniając go na edytowalny tekst. Przydaje się, gdy masz skan dokumentu (zdjęcie lub PDF z obrazów) i chcesz wyodrębnić z niego tekst do dalszej edycji lub wyszukiwania.', en: 'OCR (Optical Character Recognition) recognizes text in scanned images and PDF pages, converting it into editable text. Useful when you have a document scan (photo or image-based PDF) and want to extract text for further editing or searching.' },
      },
      { key: 'compare', href: '/compare-pdf',
        q: { pl: 'Czym jest Porównywanie PDF i do czego służy?', en: 'What is Compare PDF and what is it for?' },
        a: { pl: 'Porównywanie PDF analizuje dwa dokumenty i pokazuje różnice między nimi — zarówno w trybie tekstowym (lista dodanych/usuniętych fragmentów), jak i wizualnym (wizualne oznaczenie różnic na stronach). Przydaje się do sprawdzania zmian w umowach, wersjach dokumentów i korektach.', en: 'Compare PDF analyzes two documents and shows differences between them — both in text mode (list of added/removed fragments) and visual mode (visual marking of differences on pages). Useful for checking changes in contracts, document versions and revisions.' },
      },
      { key: 'fillform', href: '/fill-form',
        q: { pl: 'Czym jest Wypełnianie formularzy PDF i do czego służy?', en: 'What is Fill PDF Form and what is it for?' },
        a: { pl: 'Wypełnianie formularzy PDF umożliwia wypełnienie pól w interaktywnych formularzach AcroForm (pola tekstowe, checkboxy, listy rozwijane) i spłaszczenie wyniku. Przydaje się do wypełniania wniosków, ankiet i formularzy urzędowych bez drukowania i ręcznego wypełniania.', en: 'Fill PDF Form lets you fill fields in interactive AcroForm forms (text fields, checkboxes, dropdown lists) and flatten the result. Useful for filling applications, surveys and official forms without printing and manual filling.' },
      },
      { key: 'pdfa', href: '/to-pdfa',
        q: { pl: 'Czym jest konwersja do PDF/A i do czego służy?', en: 'What is PDF/A conversion and what is it for?' },
        a: { pl: 'PDF/A to standard archiwizacyjny PDF przeznaczony do długoterminowego przechowywania dokumentów. Narzędzie konwertuje zwykły PDF do formatu PDF/A-1b, dodając metadane XMP, profil kolorów i usuwając elementy dynamiczne. Przydaje się do archiwizacji dokumentów, które muszą być czytelne przez wiele lat.', en: 'PDF/A is an archival PDF standard designed for long-term document storage. The tool converts a regular PDF to PDF/A-1b format, adding XMP metadata, color profile and removing dynamic elements. Useful for archiving documents that must remain readable for many years.' },
      },
    ],
  },
];

export default function FaqPage() {
  const { locale } = useLocale();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const faqSchema = useMemo(() => {
    const mainEntity = faqData.flatMap(cat =>
      cat.items.map(item => ({
        '@type': 'Question' as const,
        name: lc(locale, item.q),
        acceptedAnswer: {
          '@type': 'Answer' as const,
          text: lc(locale, item.a),
        },
      }))
    );
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage' as const,
      mainEntity,
    };
  }, [locale]);

  const toggleSection = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleItem = (key: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="text-center mb-12">
        <div className="text-5xl mb-4">❓</div>
        <h1 className="text-3xl sm:text-4xl font-bold tool-heading mb-3">
          {t('faq.title', locale)}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
          {t('faq.subtitle', locale)}
        </p>
      </div>

      <div className="space-y-4">
        {faqData.map(cat => (
          <div key={cat.key} className="tool-card rounded-2xl border overflow-hidden">
            <button
              onClick={() => toggleSection(cat.key)}
              className="w-full flex items-center justify-between px-6 py-4 text-left transition hover:bg-[var(--coffee-surface-hover)]"
            >
              <span className="font-bold text-base" style={{ color: 'var(--coffee-text)' }}>
                {getCategoryIcon(cat.key)} {lc(locale, cat.label)}
              </span>
              <svg
                className={`w-5 h-5 transition-transform duration-200 ${openSections.has(cat.key) ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--coffee-text-tertiary)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openSections.has(cat.key) && (
              <div className="border-t" style={{ borderColor: 'var(--coffee-border)' }}>
                {cat.items.map(item => (
                  <div key={item.key}>
                    <button
                      onClick={() => toggleItem(item.key)}
                      className="w-full flex items-center justify-between px-6 py-3.5 text-left transition hover:bg-[var(--coffee-surface-hover)] gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg shrink-0">{getToolIcon(item.key)}</span>
                          <span className="text-sm font-medium" style={{ color: 'var(--coffee-text-secondary)' }}>
                          {lc(locale, item.q)}
                        </span>
                      </div>
                      <svg
                        className={`w-4 h-4 shrink-0 transition-transform duration-200 ${openItems.has(item.key) ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--coffee-text-tertiary)' }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {openItems.has(item.key) && (
                      <div className="px-6 pb-4" style={{ backgroundColor: 'var(--coffee-accent-soft)' }}>
                        <div className="pt-3 pb-2 text-sm leading-relaxed" style={{ color: 'var(--coffee-text)' }}>
                          {lc(locale, item.a)}
                        </div>
                        <Link
                          href={item.href}
                          className="inline-flex items-center gap-1 text-sm font-medium transition hover:underline"
                          style={{ color: 'var(--coffee-accent)' }}
                        >
                          {t('help.open_tool', locale)} →
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
