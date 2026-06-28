'use client';
import { useState } from 'react';
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
