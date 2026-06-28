'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';

type T = Record<string, string>;

function lc(locale: string, obj: T): string {
  return obj[locale] || obj['en'] || '';
}

interface GuideEntry {
  key: string;
  href: string;
  desc: T;
  steps: T[];
  tips?: T;
}

const guides: GuideEntry[] = [
  {
    key: 'merge', href: '/merge',
    desc: { pl: 'Scalanie PDF pozwala połączyć wiele plików PDF w jeden dokument. Przydaje się, gdy masz kilka osobnych plików, np. zeskanowane strony, faktury, raporty, i chcesz zrobić z nich jeden spójny plik.', en: 'Merge PDF lets you combine multiple PDF files into a single document. Useful when you have several separate files like scanned pages, invoices or reports and want to create one cohesive file.' },
    steps: [
      { pl: 'Przeciągnij pliki PDF w pole wyboru lub kliknij, aby je wybrać.', en: 'Drag and drop PDF files into the upload area or click to select them.' },
      { pl: 'Ustaw kolejność plików — przeciągnij je w odpowiedniej kolejności.', en: 'Arrange the files in the desired order by dragging them.' },
      { pl: 'Kliknij przycisk "Połącz PDF", aby scalić pliki.', en: 'Click the "Merge PDF" button to combine the files.' },
      { pl: 'Pobierz połączony plik PDF.', en: 'Download the merged PDF file.' },
    ],
    tips: { pl: 'Możesz dodawać pliki wielokrotnie — nowe pliki dołączą na koniec listy.', en: 'You can add files multiple times — new files will be appended at the end of the list.' },
  },
  {
    key: 'split', href: '/split',
    desc: { pl: 'Dzielenie PDF umożliwia podzielenie jednego dokumentu na mniejsze części. Możesz wybrać tryb dzielenia: co N stron, zakresy stron lub konkretne strony do wydzielenia.', en: 'Split PDF lets you divide a single document into smaller parts. You can choose the mode: every N pages, page ranges or specific pages to extract.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Wybierz tryb dzielenia: "Co N stron", "Zakresy niestandardowe" lub "Wybierz strony".', en: 'Choose the split mode: "Every N pages", "Custom ranges" or "Select pages".' },
      { pl: 'Wprowadź parametry — liczbę stron, zakresy (np. 1-5, 8, 10-15) lub zaznacz strony.', en: 'Enter the parameters — number of pages, ranges (e.g. 1-5, 8, 10-15) or select pages.' },
      { pl: 'Kliknij "Podziel PDF" i pobierz pliki ZIP z podzielonymi dokumentami.', en: 'Click "Split PDF" and download the ZIP file with the split documents.' },
    ],
    tips: { pl: 'Zakresy stron wpisuj bez spacji: "1-5,8,10-15". Możesz mieszać pojedyncze strony i zakresy.', en: 'Enter page ranges without spaces: "1-5,8,10-15". You can mix single pages and ranges.' },
  },
  {
    key: 'compress', href: '/compress',
    desc: { pl: 'Kompresja PDF zmniejsza rozmiar pliku, co ułatwia wysyłanie go e-mailem lub przechowywanie. Narzędzie oferuje trzy poziomy kompresji.', en: 'Compress PDF reduces file size, making it easier to email or store. The tool offers three compression levels.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Wybierz poziom kompresji: Niski (minimalna utrata jakości), Zalecany (zbalansowany) lub Ekstremalny (maksymalne zmniejszenie).', en: 'Choose the compression level: Low (minimal quality loss), Recommended (balanced) or Extreme (maximum reduction).' },
      { pl: 'Kliknij "Kompresuj PDF".', en: 'Click "Compress PDF".' },
      { pl: 'Pobierz skompresowany plik PDF.', en: 'Download the compressed PDF file.' },
    ],
    tips: { pl: 'Jeśli plik zawiera głównie tekst, kompresja może nie przynieść dużej różnicy — tekst już jest mocno skompresowany.', en: 'If the file contains mostly text, compression may not make a big difference — text is already highly compressed.' },
  },
  {
    key: 'word', href: '/pdf-to-word',
    desc: { pl: 'Konwersja PDF do Word zamienia plik PDF na edytowalny dokument DOCX. Przydaje się, gdy otrzymałeś PDF i potrzebujesz edytować jego treść.', en: 'PDF to Word converts a PDF file to an editable DOCX document. Useful when you received a PDF and need to edit its content.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Poczekaj na automatyczną konwersję.', en: 'Wait for the automatic conversion.' },
      { pl: 'Pobierz plik DOCX.', en: 'Download the DOCX file.' },
    ],
    tips: { pl: 'Proste układy (tekst, listy) konwertują się najlepiej. Tabele i zaawansowane formatowanie mogą wymagać ręcznej korekty w Wordzie.', en: 'Simple layouts (text, lists) convert best. Tables and complex formatting may need manual adjustment in Word.' },
  },
  {
    key: 'wordtopdf', href: '/word-to-pdf',
    desc: { pl: 'Konwersja Word do PDF zamienia dokument DOCX na plik PDF, który wygląda identycznie na każdym urządzeniu.', en: 'Word to PDF converts a DOCX document to a PDF file that looks identical on every device.' },
    steps: [
      { pl: 'Przeciągnij plik DOCX w pole wyboru.', en: 'Drop the DOCX file into the upload area.' },
      { pl: 'Poczekaj na konwersję.', en: 'Wait for the conversion.' },
      { pl: 'Pobierz plik PDF.', en: 'Download the PDF file.' },
    ],
    tips: { pl: 'Obsługiwane są pliki .docx (utworzone przez Word, LibreOffice lub Google Docs).', en: 'Only .docx files are supported (created by Word, LibreOffice or Google Docs).' },
  },
  {
    key: 'jpgTopdf', href: '/jpg-to-pdf',
    desc: { pl: 'Konwersja obrazów do PDF zamienia zdjęcia i obrazy (JPG, PNG, WebP) w jeden plik PDF. Możesz łączyć wiele obrazów w jeden dokument.', en: 'Images to PDF converts photos and images (JPG, PNG, WebP) into a single PDF file. You can combine multiple images into one document.' },
    steps: [
      { pl: 'Przeciągnij obrazy w pole wyboru (JPG, PNG lub WebP).', en: 'Drop images into the upload area (JPG, PNG or WebP).' },
      { pl: 'Ustaw kolejność obrazów, przeciągając je.', en: 'Arrange the images in the desired order by dragging them.' },
      { pl: 'Wybierz rozmiar strony i margines.', en: 'Choose the page size and margin.' },
      { pl: 'Kliknij "Utwórz PDF" i pobierz plik.', en: 'Click "Create PDF" and download the file.' },
    ],
    tips: { pl: 'Możesz mieszać różne formaty obrazów w jednym dokumencie.', en: 'You can mix different image formats in a single document.' },
  },
  {
    key: 'images', href: '/pdf-to-images',
    desc: { pl: 'PDF do obrazów zamienia każdą stronę PDF na osobny obrazek w formacie JPG, PNG lub WebP. Możesz wybrać format, rozdzielczość i jakość.', en: 'PDF to Images converts each PDF page into a separate image in JPG, PNG or WebP format. You can choose the format, resolution and quality.' },
    steps: [
      { pl: 'Przeciągnij jeden lub więcej plików PDF w pole wyboru.', en: 'Drop one or more PDF files into the upload area.' },
      { pl: 'Wybierz format obrazu (PNG, JPEG, WebP).', en: 'Choose the image format (PNG, JPEG, WebP).' },
      { pl: 'Ustaw skalę (im wyższa, tym lepsza jakość) i jakość dla JPEG/WebP.', en: 'Set the scale (higher = better quality) and quality for JPEG/WebP.' },
      { pl: 'Kliknij przycisk konwersji i pobierz plik ZIP z obrazami.', en: 'Click the convert button and download the ZIP file with images.' },
    ],
    tips: { pl: 'Wyższa skala = większa rozdzielczość, ale też większy plik. Dla tekstu wystarczy skala 2, dla zdjęć użyj skali 3-4.', en: 'Higher scale = higher resolution, but also larger file size. For text, scale 2 is sufficient; for photos, use scale 3-4.' },
  },
  {
    key: 'protect', href: '/protect-pdf',
    desc: { pl: 'Zabezpieczanie PDF pozwala dodać hasło do pliku, które uniemożliwi otwarcie dokumentu bez znajomości hasła.', en: 'Protect PDF lets you add a password to a file, preventing anyone from opening the document without the password.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Wprowadź hasło i potwierdź je w drugim polu.', en: 'Enter a password and confirm it in the second field.' },
      { pl: 'Sprawdź siłę hasła — zalecane jest co najmniej 8 znaków.', en: 'Check the password strength — at least 8 characters is recommended.' },
      { pl: 'Kliknij "Zabezpiecz PDF" i pobierz plik chroniony hasłem.', en: 'Click "Protect PDF" and download the password-protected file.' },
    ],
    tips: { pl: 'PDFTools NIE przechowuje haseł — jeśli je zapomnisz, nie ma możliwości odzyskania dostępu do pliku. Zrób kopię zapasową przed zabezpieczeniem.', en: 'PDFTools does NOT store passwords — if you forget it, there is no way to recover access to the file. Keep a backup copy before protecting.' },
  },
  {
    key: 'unlock', href: '/unlock-pdf',
    desc: { pl: 'Odblokowywanie PDF usuwa zabezpieczenie hasłem z pliku PDF, dzięki czemu można go otwierać i edytować bez podawania hasła.', en: 'Unlock PDF removes password protection from a PDF file, allowing it to be opened and edited without entering a password.' },
    steps: [
      { pl: 'Przeciągnij plik PDF chroniony hasłem w pole wyboru.', en: 'Drop the password-protected PDF file into the upload area.' },
      { pl: 'Wprowadź hasło do dokumentu.', en: 'Enter the document password.' },
      { pl: 'Kliknij "Odblokuj PDF" i pobierz odblokowany plik.', en: 'Click "Unlock PDF" and download the unlocked file.' },
    ],
    tips: { pl: 'Jeśli nie znasz hasła, nie ma możliwości odblokowania pliku — narzędzie działa w przeglądarce i nie omija zabezpieczeń.', en: 'If you don\'t know the password, there is no way to unlock the file — the tool works in the browser and does not bypass security.' },
  },
  {
    key: 'rotate', href: '/rotate-pdf',
    desc: { pl: 'Obracanie stron PDF pozwala zmienić orientację wybranych stron o 90°, 180° lub 270°.', en: 'Rotate PDF lets you change the orientation of selected pages by 90°, 180° or 270°.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Wybierz kąt obrotu (90° w lewo, 90° w prawo lub 180°).', en: 'Choose the rotation angle (90° left, 90° right or 180°).' },
      { pl: 'Kliknij "Obróć PDF" i pobierz plik.' , en: 'Click "Rotate PDF" and download the file.' },
    ],
    tips: { pl: 'Możesz przetwarzać wiele plików jednocześnie — każdy zostanie obrócony o ten sam kąt, a wyniki zapakowane w ZIP.', en: 'You can process multiple files at once — each will be rotated by the same angle and the results packed in a ZIP.' },
  },
  {
    key: 'pagenumbers', href: '/page-numbers',
    desc: { pl: 'Dodawanie numerów stron umieszcza numery na wybranych stronach dokumentu PDF. Możesz wybrać pozycję, rozmiar czcionki i numer początkowy.', en: 'Page Numbers adds page numbers to selected pages of a PDF document. You can choose the position, font size and starting number.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Wybierz pozycję numeru (góra/dół, lewo/środek/prawo).', en: 'Choose the number position (top/bottom, left/center/right).' },
      { pl: 'Ustaw rozmiar czcionki i numer początkowy (opcjonalnie).', en: 'Set the font size and starting number (optional).' },
      { pl: 'Kliknij "Dodaj numery stron" i pobierz plik.', en: 'Click "Add Page Numbers" and download the file.' },
    ],
    tips: { pl: 'Jeśli numery nakładają się na treść, zmień pozycję lub zmniejsz czcionkę. Dla małych marginesów wybierz dół z wyrównaniem do prawej.', en: 'If numbers overlap with content, change the position or reduce font size. For small margins, choose bottom-right alignment.' },
  },
  {
    key: 'watermark', href: '/watermark-pdf',
    desc: { pl: 'Znak wodny dodaje tekstowy napis (np. "POUFNE", "WERSJA ROBOCZA") na każdej stronie PDF. Możesz ustawić przezroczystość, rozmiar i położenie.', en: 'Watermark adds a text label (e.g. "CONFIDENTIAL", "DRAFT") to every PDF page. You can set opacity, size and position.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Wpisz tekst znaku wodnego.', en: 'Enter the watermark text.' },
      { pl: 'Dostosuj ustawienia: przezroczystość, rozmiar czcionki, kąt nachylenia i pozycję.', en: 'Adjust the settings: opacity, font size, rotation angle and position.' },
      { pl: 'Kliknij "Dodaj znak wodny" i pobierz plik.', en: 'Click "Add Watermark" and download the file.' },
    ],
    tips: { pl: 'Domyślna przezroczystość to 30%. Jeśli znak jest zbyt widoczny lub niewidoczny, dostosuj suwak przezroczystości.', en: 'Default opacity is 30%. If the watermark is too visible or invisible, adjust the opacity slider.' },
  },
  {
    key: 'ocr', href: '/ocr-pdf',
    desc: { pl: 'OCR (Optical Character Recognition) rozpoznaje tekst w zeskanowanych dokumentach PDF, dzięki czemu można go wyszukiwać i kopiować.', en: 'OCR (Optical Character Recognition) recognizes text in scanned PDF documents, making it searchable and copyable.' },
    steps: [
      { pl: 'Przeciągnij plik PDF (skan lub obraz) w pole wyboru.', en: 'Drop the PDF file (scan or image) into the upload area.' },
      { pl: 'Wybierz język dokumentu (domyślnie polski).', en: 'Select the document language (default is Polish).' },
      { pl: 'Kliknij "Uruchom OCR" i poczekaj na zakończenie.', en: 'Click "Run OCR" and wait for it to finish.' },
      { pl: 'Pobierz plik PDF z rozpoznanym tekstem.', en: 'Download the PDF file with recognized text.' },
    ],
    tips: { pl: 'OCR działa najlepiej na wyraźnych skanach w rozdzielczości 300 DPI. Krzywo zeskanowane strony i ręczne pismo mogą być rozpoznawane błędnie.', en: 'OCR works best on clear scans at 300 DPI. Crooked pages and handwriting may not be recognized correctly.' },
  },
  {
    key: 'extract', href: '/extract-pages',
    desc: { pl: 'Wyodrębnianie stron pozwala wybrać konkretne strony z PDF i zapisać je jako osobny dokument.', en: 'Extract Pages lets you select specific pages from a PDF and save them as a separate document.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Zaznacz strony, które chcesz wyodrębnić (kliknij na miniaturę).', en: 'Select the pages you want to extract (click on the thumbnail).' },
      { pl: 'Kliknij "Wyodrębnij" i pobierz plik PDF.', en: 'Click "Extract" and download the PDF file.' },
    ],
    tips: { pl: 'Aby wyodrębnić większość stron, zaznacz je wszystkie, a potem odznacz te, które chcesz pominąć.', en: 'To extract most pages, select all of them first, then deselect the ones you want to skip.' },
  },
  {
    key: 'delete', href: '/delete-pages',
    desc: { pl: 'Usuwanie stron pozwala trwale usunąć wybrane strony z dokumentu PDF.', en: 'Delete Pages lets you permanently remove selected pages from a PDF document.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Zaznacz strony do usunięcia (miniatury).', en: 'Select the pages to delete (thumbnails).' },
      { pl: 'Kliknij "Usuń wybrane strony" i pobierz plik.', en: 'Click "Delete Selected Pages" and download the file.' },
    ],
    tips: { pl: 'Usuwanie jest trwałe — przed operacją warto zrobić kopię oryginalnego pliku.', en: 'Deletion is permanent — consider making a backup of the original file before proceeding.' },
  },
  {
    key: 'reorder', href: '/reorder-pages',
    desc: { pl: 'Zmiana kolejności stron pozwala przeciągnąć strony w dowolnej kolejności i zapisać nowy układ dokumentu.', en: 'Reorder Pages lets you drag pages into any order and save the new document layout.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Przeciągaj miniatury stron, aby zmienić ich kolejność.', en: 'Drag the page thumbnails to change their order.' },
      { pl: 'Kliknij "Zapisz nową kolejność" i pobierz plik.', en: 'Click "Save New Order" and download the file.' },
    ],
    tips: { pl: 'Strony można przeciągać pojedynczo. Aby przesunąć stronę daleko, przeciągnij ją do krawędzi listy.', en: 'You can drag pages one by one. To move a page far, drag it to the edge of the list.' },
  },
  {
    key: 'crop', href: '/crop-pdf',
    desc: { pl: 'Przycinanie PDF umożliwia wycięcie wybranego obszaru z każdej strony — usunięcie białych marginesów, stopek lub nagłówków.', en: 'Crop PDF lets you trim a selected area from each page — removing white margins, footers or headers.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Ustaw marginesy (lewy, prawy, górny, dolny) w punktach.', en: 'Set the margins (left, right, top, bottom) in points.' },
      { pl: 'Wybierz strony do przycięcia (lub wszystkie).', en: 'Select which pages to crop (or all pages).' },
      { pl: 'Kliknij "Przytnij PDF" i pobierz plik.', en: 'Click "Crop PDF" and download the file.' },
    ],
    tips: { pl: 'Dla strony A4 (595x842 pt) spróbuj marginesów 30pt po bokach i 40pt góra/dół. Jednostki to punkty typograficzne (1 pt = 0,35 mm).', en: 'For A4 page (595x842 pt) try 30pt sides and 40pt top/bottom. Units are typographic points (1 pt = 0.35 mm).' },
  },
  {
    key: 'addpage', href: '/add-page',
    desc: { pl: 'Dodawanie strony wstawia pustą stronę na początku, na końcu lub w określonym miejscu dokumentu PDF.', en: 'Add Page inserts a blank page at the beginning, end or a specific position in a PDF document.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Wybierz miejsce dodania strony: początek, koniec lub konkretny numer strony.', en: 'Choose where to add the page: beginning, end or a specific page number.' },
      { pl: 'Kliknij "Dodaj stronę" i pobierz plik.', en: 'Click "Add Page" and download the file.' },
    ],
  },
  {
    key: 'edit', href: '/edit-pdf',
    desc: { pl: 'Edytor PDF umożliwia dodawanie tekstu, prostokątów i podświetleń do dowolnej strony dokumentu PDF.', en: 'PDF Editor lets you add text, rectangles and highlights to any page of a PDF document.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Wybierz stronę, którą chcesz edytować.', en: 'Select the page you want to edit.' },
      { pl: 'Dodaj element (tekst, podświetlenie, prostokąt) i umieść go na stronie.', en: 'Add an element (text, highlight, rectangle) and place it on the page.' },
      { pl: 'Dostosuj kolor, rozmiar i pozycję elementu.', en: 'Adjust the color, size and position of the element.' },
      { pl: 'Kliknij "Zapisz zmiany" i pobierz plik.', en: 'Click "Save Changes" and download the file.' },
    ],
    tips: { pl: 'Edytor dodaje nowe elementy, ale nie edytuje istniejącego tekstu. Aby zmienić istniejący tekst, skonwertuj PDF do Worda, edytuj i skonwertuj z powrotem.', en: 'The editor adds new elements but does not edit existing text. To change existing text, convert PDF to Word, edit it and convert back.' },
  },
  {
    key: 'sign', href: '/sign-pdf',
    desc: { pl: 'Podpisywanie PDF pozwala dodać podpis odręczny (narysowany myszką lub palcem) lub tekstowy do dokumentu PDF.', en: 'Sign PDF lets you add a handwritten signature (drawn with mouse or finger) or a text signature to a PDF document.' },
    steps: [
      { pl: 'Wybierz metodę podpisu: narysuj podpis lub wpisz tekst.', en: 'Choose the signature method: draw a signature or type text.' },
      { pl: 'Utwórz podpis (narysuj go lub wpisz imię i nazwisko).', en: 'Create your signature (draw it or type your name).' },
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Wybierz strony do podpisania i umieść podpis w wybranym miejscu.', en: 'Select the pages to sign and place the signature at the desired location.' },
      { pl: 'Kliknij "Podpisz PDF" i pobierz plik.', en: 'Click "Sign PDF" and download the file.' },
    ],
    tips: { pl: 'Możesz użyć szybkich pozycji (np. "Dół strony"), aby automatycznie umieścić podpis. Podpis można później przeciągnąć w dowolne miejsce.', en: 'You can use quick positions (e.g. "Bottom of page") to auto-place the signature. The signature can be dragged to any position afterwards.' },
  },
  {
    key: 'metadata', href: '/metadata',
    desc: { pl: 'Edycja metadanych pozwala wyświetlić i zmienić tytuł, autora, temat i słowa kluczowe dokumentu PDF.', en: 'Metadata Editor lets you view and change the title, author, subject and keywords of a PDF document.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Zmień pola: tytuł, autor, temat, słowa kluczowe.', en: 'Edit the fields: title, author, subject, keywords.' },
      { pl: 'Kliknij "Zapisz metadane" i pobierz plik.', en: 'Click "Save Metadata" and download the file.' },
    ],
  },
  {
    key: 'excel', href: '/pdf-to-excel',
    desc: { pl: 'Konwersja PDF do Excel wyodrębnia tabele i dane z pliku PDF do formatu XLSX.', en: 'PDF to Excel extracts tables and data from a PDF file to XLSX format.' },
    steps: [
      { pl: 'Przeciągnij plik PDF zawierający tabele w pole wyboru.', en: 'Drop a PDF file containing tables into the upload area.' },
      { pl: 'Wybierz strony do konwersji.', en: 'Select the pages to convert.' },
      { pl: 'Kliknij "Konwertuj do Excela" i pobierz plik XLSX.', en: 'Click "Convert to Excel" and download the XLSX file.' },
    ],
    tips: { pl: 'Proste tabele konwertują się najlepiej. Złożone tabele z łączonymi komórkami mogą wymagać korekty w Excelu.', en: 'Simple tables convert best. Complex tables with merged cells may need adjustment in Excel.' },
  },
  {
    key: 'excel2pdf', href: '/excel-to-pdf',
    desc: { pl: 'Konwersja Excel do PDF zamienia arkusz kalkulacyjny XLSX na plik PDF. Przydaje się przed udostępnieniem danych finansowych lub raportów.', en: 'Excel to PDF converts an XLSX spreadsheet to a PDF file. Useful before sharing financial data or reports.' },
    steps: [
      { pl: 'Przeciągnij plik Excel (XLSX) w pole wyboru.', en: 'Drop the Excel file (XLSX) into the upload area.' },
      { pl: 'Poczekaj na konwersję.', en: 'Wait for the conversion.' },
      { pl: 'Pobierz plik PDF.', en: 'Download the PDF file.' },
    ],
    tips: { pl: 'Obsługiwane są formaty .xlsx i .xls.', en: 'Supported formats: .xlsx and .xls.' },
  },
  {
    key: 'openoffice', href: '/openoffice-to-pdf',
    desc: { pl: 'Konwersja OpenOffice do PDF zamienia dokument ODT (z OpenOffice lub LibreOffice) na plik PDF.', en: 'OpenOffice to PDF converts an ODT document (from OpenOffice or LibreOffice) to a PDF file.' },
    steps: [
      { pl: 'Przeciągnij plik ODT w pole wyboru.', en: 'Drop the ODT file into the upload area.' },
      { pl: 'Poczekaj na konwersję.', en: 'Wait for the conversion.' },
      { pl: 'Pobierz plik PDF.', en: 'Download the PDF file.' },
    ],
    tips: { pl: 'Obsługiwane są tylko pliki .odt z OpenOffice i LibreOffice.', en: 'Only .odt files from OpenOffice and LibreOffice are supported.' },
  },
  {
    key: 'pdf2openoffice', href: '/pdf-to-openoffice',
    desc: { pl: 'Konwersja PDF do OpenOffice zamienia plik PDF na edytowalny dokument ODT.', en: 'PDF to OpenOffice converts a PDF file to an editable ODT document.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Poczekaj na konwersję.', en: 'Wait for the conversion.' },
      { pl: 'Pobierz plik ODT.', en: 'Download the ODT file.' },
    ],
  },
  {
    key: 'txt', href: '/pdf-to-txt',
    desc: { pl: 'Wyodrębnianie tekstu z PDF pozwala wydobyć całą treść tekstową z dokumentu i zapisać jako plik TXT.', en: 'Extract Text from PDF lets you extract all text content from a document and save it as a TXT file.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Kliknij "Wyodrębnij tekst".', en: 'Click "Extract Text".' },
      { pl: 'Pobierz plik TXT.', en: 'Download the TXT file.' },
    ],
    tips: { pl: 'Wyodrębniony tekst zachowuje podstawową strukturę akapitów. Tabele i kolumny mogą być pomieszane.', en: 'Extracted text preserves basic paragraph structure. Tables and columns may be jumbled.' },
  },
  {
    key: 'aichat', href: '/ai-chat',
    desc: { pl: 'AI Chat z PDF pozwala zadawać pytania dotyczące treści dokumentu. AI odpowiada na podstawie wyodrębnionego tekstu z pliku PDF.', en: 'AI Chat with PDF lets you ask questions about a document\'s content. The AI answers based on text extracted from the PDF.' },
    steps: [
      { pl: 'Skonfiguruj klucz API OpenRouter (wymagany).', en: 'Set up your OpenRouter API key (required).' },
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Kliknij "Wyodrębnij tekst", aby przetworzyć dokument.', en: 'Click "Extract Text" to process the document.' },
      { pl: 'Zadaj pytanie dotyczące dokumentu w polu tekstowym.', en: 'Ask a question about the document in the text field.' },
      { pl: 'AI udzieli odpowiedzi na podstawie treści dokumentu.', en: 'The AI will answer based on the document content.' },
    ],
    tips: { pl: 'Klucz API OpenRouter jest darmowy dla nowych użytkowników. Możesz go uzyskać na openrouter.ai/keys.', en: 'The OpenRouter API key is free for new users. Get one at openrouter.ai/keys.' },
  },
  {
    key: 'aisummary', href: '/ai-summary',
    desc: { pl: 'AI Streszczenie automatycznie generuje podsumowanie dokumentu PDF, wyodrębniając najważniejsze informacje.', en: 'AI Summary automatically generates a summary of a PDF document, extracting the key information.' },
    steps: [
      { pl: 'Skonfiguruj klucz API OpenRouter (wymagany).', en: 'Set up your OpenRouter API key (required).' },
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Kliknij "Wygeneruj podsumowanie".', en: 'Click "Generate Summary".' },
      { pl: 'Przeczytaj i skopiuj wygenerowane streszczenie.', en: 'Read and copy the generated summary.' },
    ],
    tips: { pl: 'Długość i jakość podsumowania zależy od modelu AI oraz długości dokumentu. Krótsze dokumenty dają bardziej precyzyjne streszczenia.', en: 'The length and quality of the summary depend on the AI model and document length. Shorter documents produce more precise summaries.' },
  },
  {
    key: 'ppt', href: '/pdf-to-powerpoint',
    desc: { pl: 'Konwersja PDF do PowerPoint zamienia strony pliku PDF na slajdy w formacie PPTX. Każda strona PDF staje się osobnym slajdem.', en: 'PDF to PowerPoint converts PDF pages into slides in PPTX format. Each PDF page becomes a separate slide.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Poczekaj na konwersję.', en: 'Wait for the conversion.' },
      { pl: 'Pobierz plik PPTX.', en: 'Download the PPTX file.' },
    ],
  },
  {
    key: 'compare', href: '/compare-pdf',
    desc: { pl: 'Porównywanie PDF umożliwia porównanie dwóch dokumentów PDF — tekstowo (różnice w treści) lub wizualnie (różnice w wyglądzie stron).', en: 'Compare PDF lets you compare two PDF documents — textually (differences in content) or visually (differences in page appearance).' },
    steps: [
      { pl: 'Przeciągnij pierwszy plik PDF w pole "Nowy plik".', en: 'Drop the first PDF file into the "New File" area.' },
      { pl: 'Przeciągnij drugi plik PDF w pole "Stary plik".', en: 'Drop the second PDF file into the "Old File" area.' },
      { pl: 'Wybierz tryb porównania: tekstowy lub wizualny.', en: 'Choose the comparison mode: textual or visual.' },
      { pl: 'Kliknij "Porównaj" i przejrzyj wyniki.', en: 'Click "Compare" and review the results.' },
    ],
    tips: { pl: 'Tryb wizualny porównuje obrazy stron (przydatny do wykrywania różnic w układzie). Tryb tekstowy porównuje tylko treść.', en: 'Visual mode compares page images (useful for detecting layout differences). Text mode compares only the content.' },
  },
  {
    key: 'html', href: '/html-to-pdf',
    desc: { pl: 'HTML do PDF konwertuje kod HTML na dokument PDF. Możesz wkleić kod HTML lub skorzystać z przykładu.', en: 'HTML to PDF converts HTML code to a PDF document. You can paste HTML code or use the example.' },
    steps: [
      { pl: 'Wklej kod HTML w polu tekstowym lub kliknij "Załaduj przykład".', en: 'Paste HTML code in the text area or click "Load example".' },
      { pl: 'Kliknij "Konwertuj do PDF".', en: 'Click "Convert to PDF".' },
      { pl: 'Pobierz plik PDF.', en: 'Download the PDF file.' },
    ],
  },
  {
    key: 'url', href: '/url-to-pdf',
    desc: { pl: 'URL do PDF konwertuje stronę internetową na dokument PDF. Wystarczy podać adres URL strony.', en: 'URL to PDF converts a web page to a PDF document. Simply provide the page URL.' },
    steps: [
      { pl: 'Wpisz adres URL strony internetowej.', en: 'Enter the web page URL.' },
      { pl: 'Kliknij "Konwertuj do PDF".', en: 'Click "Convert to PDF".' },
      { pl: 'Pobierz plik PDF.', en: 'Download the PDF file.' },
    ],
    tips: { pl: 'Nie wszystkie strony mogą być konwertowane — strony z silnym zabezpieczeniem CORS lub wymagające logowania mogą nie działać.', en: 'Not all pages can be converted — pages with strong CORS protection or requiring login may not work.' },
  },
  {
    key: 'html2pdf', href: '/pdf-to-html',
    desc: { pl: 'PDF do HTML konwertuje dokument PDF na stronę HTML, którą można otworzyć w przeglądarce.', en: 'PDF to HTML converts a PDF document to an HTML page that can be opened in a browser.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Kliknij "Konwertuj do HTML".', en: 'Click "Convert to HTML".' },
      { pl: 'Pobierz plik HTML.', en: 'Download the HTML file.' },
    ],
  },
  {
    key: 'flatten', href: '/flatten-pdf',
    desc: { pl: 'Spłaszczanie PDF usuwa adnotacje, pola formularzy i warstwy, łącząc je z treścią strony. Przydaje się przed archiwizacją lub drukiem.', en: 'Flatten PDF removes annotations, form fields and layers, merging them into the page content. Useful before archiving or printing.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Kliknij "Spłaszcz PDF".', en: 'Click "Flatten PDF".' },
      { pl: 'Pobierz spłaszczony plik PDF.', en: 'Download the flattened PDF file.' },
    ],
  },
  {
    key: 'svg', href: '/pdf-to-svg',
    desc: { pl: 'Konwersja PDF do SVG zamienia każdą stronę PDF na obraz wektorowy SVG. Skalowalne obrazy idealne do prezentacji i strony internetowych.', en: 'PDF to SVG converts each PDF page into a vector SVG image. Scalable images perfect for presentations and websites.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Kliknij "Konwertuj do SVG".', en: 'Click "Convert to SVG".' },
      { pl: 'Pobierz plik ZIP z obrazami SVG.', en: 'Download the ZIP file with SVG images.' },
    ],
  },
  {
    key: 'redact', href: '/redact-pdf',
    desc: { pl: 'Redakcja PDF trwale zaczernia wybrane obszary stron, aby ukryć poufne informacje — nie można cofnąć tej operacji.', en: 'Redact PDF permanently blacks out selected areas of pages to hide sensitive information — this operation cannot be undone.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Zaznacz strony, które chcesz zredagować.', en: 'Select the pages you want to redact.' },
      { pl: 'Kliknij "Redaguj wybrane strony" i potwierdź.', en: 'Click "Redact Selected Pages" and confirm.' },
      { pl: 'Pobierz plik PDF z zaczernionymi stronami.', en: 'Download the PDF file with blacked-out pages.' },
    ],
    tips: { pl: 'Redakcja jest nieodwracalna — ZAWSZE zrób kopię oryginalnego pliku przed rozpoczęciem.', en: 'Redaction is irreversible — ALWAYS keep a copy of the original file before starting.' },
  },
  {
    key: 'epub', href: '/pdf-to-epub',
    desc: { pl: 'Konwersja PDF do EPUB zamienia dokument PDF na format e-booka EPUB, czytelny na czytnikach ebooków i telefonach.', en: 'PDF to EPUB converts a PDF document to EPUB ebook format, readable on ebook readers and phones.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Kliknij "Konwertuj do EPUB".', en: 'Click "Convert to EPUB".' },
      { pl: 'Pobierz plik EPUB.', en: 'Download the EPUB file.' },
    ],
    tips: { pl: 'EPUB jest formatem "płynnym" — tekst dostosowuje się do rozmiaru ekranu. Obrazy i tabele mogą być przesunięte względem oryginału.', en: 'EPUB is a "reflowable" format — text adapts to screen size. Images and tables may shift from the original.' },
  },
  {
    key: 'translate', href: '/ai-translate',
    desc: { pl: 'Tłumacz AI tłumaczy treść dokumentu PDF na wybrany język przy użyciu sztucznej inteligencji.', en: 'AI Translate translates the content of a PDF document into a selected language using artificial intelligence.' },
    steps: [
      { pl: 'Skonfiguruj klucz API OpenRouter (wymagany).', en: 'Set up your OpenRouter API key (required).' },
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Wybierz język docelowy tłumaczenia.', en: 'Select the target language for translation.' },
      { pl: 'Kliknij "Przetłumacz" i poczekaj na wynik.', en: 'Click "Translate" and wait for the result.' },
      { pl: 'Skopiuj przetłumaczony tekst lub pobierz plik.', en: 'Copy the translated text or download the file.' },
    ],
  },
  {
    key: 'fillform', href: '/fill-form',
    desc: { pl: 'Wypełnianie formularzy PDF umożliwia wypełnienie interaktywnych pól formularza (tekstowe, checkboxy, listy rozwijane) i zapisanie wypełnionego dokumentu.', en: 'Fill PDF Form lets you fill interactive form fields (text fields, checkboxes, dropdowns) and save the completed document.' },
    steps: [
      { pl: 'Przeciągnij plik PDF z formularzem w pole wyboru.', en: 'Drop the PDF form file into the upload area.' },
      { pl: 'Wypełnij pola formularza według potrzeb.', en: 'Fill in the form fields as needed.' },
      { pl: 'Kliknij "Zapisz wypełniony formularz" i pobierz plik.', en: 'Click "Save Filled Form" and download the file.' },
    ],
    tips: { pl: 'Narzędzie wypełnia tylko interaktywne formularze AcroForm. Skanowane formularze nie mają pól do wypełnienia — wtedy użyj edytora PDF.', en: 'The tool only fills interactive AcroForm forms. Scanned forms don\'t have fillable fields — use the PDF editor instead.' },
  },
  {
    key: 'pdfa', href: '/to-pdfa',
    desc: { pl: 'Konwersja do PDF/A przekształca dokument w format archiwizacyjny PDF/A-1b, zapewniający długoterminową czytelność pliku.', en: 'Convert to PDF/A transforms your document into the PDF/A-1b archival format, ensuring long-term readability.' },
    steps: [
      { pl: 'Przeciągnij plik PDF w pole wyboru.', en: 'Drop the PDF file into the upload area.' },
      { pl: 'Zapoznaj się z informacją o konwersji.', en: 'Review the conversion information.' },
      { pl: 'Kliknij "Konwertuj do PDF/A" i pobierz plik.', en: 'Click "Convert to PDF/A" and download the file.' },
    ],
    tips: { pl: 'Konwersja działa w trybie "best-effort" — nie gwarantuje 100% zgodności ze standardem, ale działa w większości programów archiwizacyjnych.', en: 'Conversion is "best-effort" — it does not guarantee 100% standard compliance but works in most archiving programs.' },
  },
];

const categoryOrder: { key: string; label: T; toolKeys: string[] }[] = [
  {
    key: 'edit', label: { pl: 'Edycja PDF', en: 'Edit PDF' },
    toolKeys: ['merge', 'split', 'compress', 'rotate', 'crop', 'pagenumbers', 'watermark', 'extract', 'delete', 'reorder', 'addpage', 'edit', 'sign', 'metadata', 'redact', 'flatten', 'compare', 'fillform', 'ocr', 'pdfa'],
  },
  {
    key: 'convert', label: { pl: 'Konwersja PDF', en: 'Convert PDF' },
    toolKeys: ['word', 'wordtopdf', 'jpgTopdf', 'images', 'excel', 'excel2pdf', 'openoffice', 'pdf2openoffice', 'txt', 'ppt', 'html', 'html2pdf', 'url', 'svg', 'epub'],
  },
  {
    key: 'secure', label: { pl: 'Zabezpieczenia', en: 'Security' },
    toolKeys: ['protect', 'unlock'],
  },
  {
    key: 'ai', label: { pl: 'Narzędzia AI', en: 'AI Tools' },
    toolKeys: ['aichat', 'aisummary', 'translate'],
  },
];

export default function GuidePage() {
  const { locale } = useLocale();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const guideMap = new Map(guides.map(g => [g.key, g]));

  const filtered = categoryOrder
    .map(cat => ({
      ...cat,
      tools: cat.toolKeys
        .map(k => guideMap.get(k)!)
        .filter(Boolean)
        .filter(entry => {
          if (!search) return true;
          const q = search.toLowerCase();
          const name = lc(locale, entry.desc).toLowerCase();
          const toolName = t(`tool.${entry.key}`, locale).toLowerCase();
          return name.includes(q) || toolName.includes(q) || entry.key.includes(q);
        }),
    }))
    .filter(cat => cat.tools.length > 0);

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold tool-heading mb-3">
          Instrukcja obsługi — jak używać narzędzi PDF
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
          Szczegółowe opisy i instrukcje krok po kroku dla każdego narzędzia. Wybierz narzędzie poniżej lub skorzystaj z wyszukiwarki.
        </p>
      </div>

      <div className="max-w-md mx-auto mb-8">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Szukaj narzędzia..."
          className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 tool-heading focus:ring-2 focus:ring-blue-400 outline-none"
        />
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-10">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition border ${activeCategory === null ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          Wszystkie
        </button>
        {categoryOrder.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition border ${activeCategory === cat.key ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            {lc(locale, cat.label)}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {filtered
          .filter(cat => !activeCategory || cat.key === activeCategory)
          .map(cat => (
            <section key={cat.key}>
              <h2 className="text-xl sm:text-2xl font-bold mb-4 tool-heading">{lc(locale, cat.label)}</h2>
              <div className="grid gap-4">
                {cat.tools.map(tool => (
                  <ToolGuideCard key={tool.key} tool={tool} locale={locale} />
                ))}
              </div>
            </section>
          ))}
      </div>
    </main>
  );
}

function ToolGuideCard({ tool, locale }: { tool: GuideEntry; locale: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="tool-card rounded-2xl border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition hover:bg-[var(--coffee-surface-hover)]"
      >
        <div className="text-2xl shrink-0">{getToolIcon(tool.key)}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm sm:text-base tool-heading">{t(`tool.${tool.key}`, locale)}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{lc(locale, tool.desc)}</p>
        </div>
        <Link
          href={tool.href}
          onClick={e => e.stopPropagation()}
          className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
        >
          Otwórz →
        </Link>
        <svg
          className={`w-5 h-5 shrink-0 transition-transform duration-200 text-gray-400 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t px-5 py-4 space-y-4" style={{ borderColor: 'var(--coffee-border)' }}>
          <div>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{lc(locale, tool.desc)}</p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
              {locale === 'pl' ? 'Instrukcja krok po kroku:' : 'Step-by-step instructions:'}
            </h4>
            <ol className="list-decimal list-inside space-y-1.5">
              {tool.steps.map((step, i) => (
                <li key={i} className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{lc(locale, step)}</li>
              ))}
            </ol>
          </div>

          {tool.tips && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
              <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 mb-0.5">
                {locale === 'pl' ? '💡 Wskazówka:' : '💡 Tip:'}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-200">{lc(locale, tool.tips)}</p>
            </div>
          )}

          <Link
            href={tool.href}
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
          >
            {t('help.open_tool', locale)} →
          </Link>
        </div>
      )}
    </div>
  );
}
