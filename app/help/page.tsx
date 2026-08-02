'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';

type LocaleContent = Record<string, string>;

function lc(locale: string, obj: LocaleContent): string {
  return obj[locale] || obj['en'] || '';
}

interface HelpItem {
  key: string;
  href: string;
  icon: string;
  q: LocaleContent;
  a: LocaleContent;
}

interface HelpCategory {
  key: string;
  icon: string;
  label: Record<string, string>;
  items: HelpItem[];
}

const helpData: HelpCategory[] = [
  {
    key: 'general', icon: '⚠️',
    label: { pl: 'Problemy ogólne', en: 'General Issues' , de: 'Allgemeine Probleme'},
    items: [
      { key: 'largefile', href: '#', icon: '📦',
        q: { pl: 'Plik PDF jest za duży i nie chce się załadować?', en: 'The PDF file is too large and won\'t load?' , de: 'Die PDF-Datei ist zu groß und lässt sich nicht laden?'},
        a: { pl: 'Jeśli plik ma kilkadziesiąt MB i strona działa wolno, spróbuj: (1) otworzyć plik w lżejszej przeglądarce (Chrome lub Edge). (2) Zamknąć inne karty, aby zwolnić pamięć RAM. (3) Użyć mniejszego pliku lub najpierw skompresować go za pomocą narzędzia Kompresuj PDF. (4) W ostateczności podzielić duży plik na mniejsze części przed przetwarzaniem.', en: 'If the file is several dozen MB and the page runs slow, try: (1) Open the file in a lighter browser (Chrome or Edge). (2) Close other tabs to free up RAM. (3) Use a smaller file or first compress it with the Compress PDF tool. (4) As a last resort, split the large file into smaller parts before processing.' , de: 'Wenn die Datei mehrere Dutzend MB groß ist und die Seite langsam läuft, versuchen Sie Folgendes: (1) Öffnen Sie die Datei in einem leichteren Browser (Chrome oder Edge). (2) Schließen Sie andere Tabs, um Arbeitsspeicher freizugeben. (3) Verwenden Sie eine kleinere Datei oder komprimieren Sie sie zuerst mit dem Werkzeug „PDF komprimieren“. (4) Teilen Sie die große Datei im Notfall vor der Verarbeitung in kleinere Teile.'},
      },
      { key: 'notpdf', href: '#', icon: '📄',
        q: { pl: 'Plik nie jest rozpoznawany jako PDF?', en: 'File is not recognized as PDF?' , de: 'Die Datei wird nicht als PDF erkannt?'},
        a: { pl: 'Upewnij się, że plik ma rozszerzenie .pdf. Jeśli plik faktycznie jest PDF, ale nie chce się otworzyć, mógł zostać uszkodzony. Spróbuj otworzyć go w innym programie (Adobe Reader, przeglądarka). Jeśli działa w innych programach, zgłoś problem — możliwe, że plik używa niestandardowych funkcji PDF, które nie są obsługiwane.', en: 'Make sure the file has a .pdf extension. If the file is actually a PDF but won\'t open, it may be corrupted. Try opening it in another program (Adobe Reader, browser). If it works in other programs, report the issue — the file may use non-standard PDF features not yet supported.' , de: 'Stellen Sie sicher, dass die Datei die Erweiterung .pdf hat. Wenn die Datei tatsächlich eine PDF-Datei ist, sich aber nicht öffnen lässt, ist sie möglicherweise beschädigt. Versuchen Sie, sie in einem anderen Programm zu öffnen (Adobe Reader, Browser). Wenn sie in anderen Programmen funktioniert, melden Sie das Problem – die Datei verwendet möglicherweise nicht standardkonforme PDF-Funktionen, die noch nicht unterstützt werden.'},
      },
      { key: 'memory', href: '#', icon: '💾',
        q: { pl: 'Strona wyświetla błąd pamięci lub zawiesza się?', en: 'The page shows a memory error or freezes?' , de: 'Die Seite zeigt einen Speicherfehler oder friert ein?'},
        a: { pl: 'Narzędzia działają w całości w przeglądarce, więc duże pliki mogą przekroczyć dostępną pamięć RAM. Rozwiązania: (1) Użyj przeglądarki Chrome/Edge — mają lepszą obsługę pamięci. (2) Zamknij inne programy i karty. (3) Przetwarzaj mniejsze pliki. (4) Jeśli problem występuje stale, spróbuj zaktualizować przeglądarkę.', en: 'All tools run entirely in the browser, so large files may exceed available RAM. Solutions: (1) Use Chrome/Edge — they handle memory better. (2) Close other programs and tabs. (3) Process smaller files. (4) If the issue persists, try updating your browser.' , de: 'Alle Werkzeuge laufen vollständig im Browser, sodass große Dateien den verfügbaren Arbeitsspeicher überschreiten können. Lösungen: (1) Verwenden Sie Chrome/Edge – sie verwalten den Speicher besser. (2) Schließen Sie andere Programme und Tabs. (3) Verarbeiten Sie kleinere Dateien. (4) Wenn das Problem weiterhin besteht, versuchen Sie, Ihren Browser zu aktualisieren.'},
      },
      { key: 'save', href: '#', icon: '💿',
        q: { pl: 'Nie mogę zapisać wynikowego pliku?', en: 'Can\'t save the resulting file?' , de: 'Kann die resultierende Datei nicht gespeichert werden?'},
        a: { pl: 'Jeśli po przetworzeniu plik nie pobiera się automatycznie: (1) Sprawdź, czy przeglądarka nie blokuje pobierania (iconka w pasku adresu). (2) Kliknij przycisk pobierania ręcznie, jeśli jest dostępny. (3) Spróbuj użyć innej przeglądarki. (4) Upewnij się, że masz wystarczająco miejsca na dysku.', en: 'If the file doesn\'t download automatically after processing: (1) Check if your browser is blocking downloads (icon in the address bar). (2) Click the download button manually if available. (3) Try a different browser. (4) Make sure you have enough disk space.' , de: 'Wenn die Datei nach der Verarbeitung nicht automatisch heruntergeladen wird: (1) Prüfen Sie, ob Ihr Browser Downloads blockiert (Symbol in der Adressleiste). (2) Klicken Sie den Download-Button bei Bedarf manuell an. (3) Versuchen Sie einen anderen Browser. (4) Stellen Sie sicher, dass Sie genügend Speicherplatz auf der Festplatte haben.'},
      },
      { key: 'wrongbrowser', href: '#', icon: '🌐',
        q: { pl: 'Które przeglądarki są obsługiwane?', en: 'Which browsers are supported?' , de: 'Welche Browser werden unterstützt?'},
        a: { pl: 'Narzędzia działają w każdej nowoczesnej przeglądarce: Chrome, Edge, Firefox, Opera, Safari (wersje z ostatnich 2 lat). Najlepszą wydajność oferują Chrome i Edge. Starsze przeglądarki (Internet Explorer, stare wersje Safari) nie są obsługiwane.', en: 'The tools work in all modern browsers: Chrome, Edge, Firefox, Opera, Safari (versions from the last 2 years). Best performance is in Chrome and Edge. Older browsers (Internet Explorer, old Safari versions) are not supported.' , de: 'Die Werkzeuge funktionieren in allen modernen Browsern: Chrome, Edge, Firefox, Opera, Safari (Versionen der letzten 2 Jahre). Die beste Leistung bieten Chrome und Edge. Ältere Browser (Internet Explorer, alte Safari-Versionen) werden nicht unterstützt.'},
      },
    ],
  },
  {
    key: 'edit', icon: '✏️',
    label: { pl: 'Edycja PDF', en: 'Edit PDF' , de: 'PDF bearbeiten'},
    items: [
      { key: 'merge-slow', href: '/merge', icon: '🔗',
        q: { pl: 'Scalanie wielu plików działa wolno?', en: 'Merging many files is slow?' , de: 'Das Zusammenführen vieler Dateien ist langsam?'},
        a: { pl: 'Scalanie kilkudziesięciu plików lub plików z wieloma stronami może chwilę potrwać — wszystko dzieje się lokalnie w przeglądarce. Czas zależy od mocy Twojego procesora i ilości pamięci RAM. Dla bardzo dużych plików (ponad 100 stron) zalecamy przetwarzanie w partiach.', en: 'Merging dozens of files or files with many pages may take a moment — everything runs locally in your browser. Time depends on your CPU power and RAM. For very large files (over 100 pages), we recommend processing in batches.' , de: 'Das Zusammenführen von Dutzenden Dateien oder Dateien mit vielen Seiten kann einen Moment dauern – alles läuft lokal in Ihrem Browser. Die Dauer hängt von der Leistung Ihrer CPU und dem Arbeitsspeicher ab. Bei sehr großen Dateien (über 100 Seiten) empfehlen wir die Verarbeitung in Stapeln.'},
      },
      { key: 'split-wrong', href: '/split', icon: '✂️',
        q: { pl: 'Dzielenie nie wyodrębnia poprawnych stron?', en: 'Split is not extracting the right pages?' , de: 'Das Teilen extrahiert nicht die richtigen Seiten?'},
        a: { pl: 'Upewnij się, że używasz poprawnego formatu zakresów. Przykłady: "1-5" (strony od 1 do 5), "1,3,5" (konkretne strony), "1-5,8,10-15" (mieszane). Strony numerowane są od 1. Jeśli używasz trybu "Co N stron", liczba oznacza, że co N-ta strona zostanie wydzielona.', en: 'Make sure you\'re using the correct range format. Examples: "1-5" (pages 1 through 5), "1,3,5" (specific pages), "1-5,8,10-15" (mixed). Pages are numbered starting from 1. If using "Every N pages" mode, the number means every Nth page will be extracted.' , de: 'Stellen Sie sicher, dass Sie das richtige Bereichsformat verwenden. Beispiele: „1-5“ (Seiten 1 bis 5), „1,3,5“ (bestimmte Seiten), „1-5,8,10-15“ (gemischt). Seiten werden ab 1 nummeriert. Wenn Sie den Modus „Jede N. Seite“ verwenden, bedeutet die Zahl, dass jede N-te Seite extrahiert wird.'},
      },
      { key: 'compress-nochange', href: '/compress', icon: '🗜️',
        q: { pl: 'Kompresja nie zmniejsza rozmiaru pliku?', en: 'Compression doesn\'t reduce file size?' , de: 'Die Komprimierung verkleinert die Datei nicht?'},
        a: { pl: 'Jeśli plik PDF zawiera głównie tekst (a nie obrazy), kompresja może nie przynieść znaczącej różnicy — tekst już jest mocno skompresowany. PDF z obrazami skompresuje się lepiej. Spróbuj wybrać wyższy poziom kompresji. Jeśli plik jest już zoptymalizowany, dalsza kompresja może być niemożliwa.', en: 'If the PDF contains mostly text (not images), compression may not make a significant difference — text is already highly compressed. Image-based PDFs will compress better. Try a higher compression level. If the file is already optimized, further compression may not be possible.' , de: 'Wenn das PDF hauptsächlich Text enthält (keine Bilder), kann die Komprimierung keinen nennenswerten Unterschied bewirken – Text ist bereits stark komprimiert. Bildbasierte PDFs lassen sich besser komprimieren. Versuchen Sie eine höhere Komprimierungsstufe. Wenn die Datei bereits optimiert ist, ist eine weitere Komprimierung möglicherweise nicht möglich.'},
      },
      { key: 'crop-wrong', href: '/crop-pdf', icon: '📐',
        q: { pl: 'Przycięcie usuwa złe fragmenty strony?', en: 'Cropping removes the wrong parts of the page?' , de: 'Beim Zuschneiden werden die falschen Teile der Seite entfernt?'},
        a: { pl: 'Wartości marginesów są podawane w punktach (pt). Domyślnie przycięcie 50pt z każdej strony. Dla strony A4 (595x842pt) spróbuj: lewy/prawy 30pt, górny/dolny 40pt. Możesz podejrzeć efekt przed zapisaniem. Jeśli chcesz przyciąć tylko wybrane strony, użyj opcji wyboru stron przed przycięciem.', en: 'Margin values are given in points (pt). Default crops 50pt from each side. For an A4 page (595x842pt) try: left/right 30pt, top/bottom 40pt. You can preview the result before saving. To crop only selected pages, use the page selection option before cropping.' , de: 'Randwerte werden in Punkt (pt) angegeben. Standardmäßig werden 50 pt von jeder Seite beschnitten. Für eine A4-Seite (595x842 pt) versuchen Sie: links/rechts 30 pt, oben/unten 40 pt. Sie können das Ergebnis vor dem Speichern in der Vorschau ansehen. Um nur ausgewählte Seiten zuzuschneiden, verwenden Sie vor dem Zuschneiden die Seitenauswahloption.'},
      },
      { key: 'watermark-notvisible', href: '/watermark-pdf', icon: '💧',
        q: { pl: 'Znak wodny jest niewidoczny lub zbyt duży?', en: 'Watermark is invisible or too large?' , de: 'Das Wasserzeichen ist unsichtbar oder zu groß?'},
        a: { pl: 'Domyślna przezroczystość znaku wodnego to 30%. Jeśli znak jest niewidoczny, zmniejsz przezroczystość (wyższa wartość = bardziej widoczny). Jeśli tekst jest za duży, zmniejsz rozmiar czcionki. Możesz też zmienić kąt nachylenia i pozycję — eksperymentuj z ustawieniami, aby dopasować do swojego dokumentu.', en: 'Default watermark opacity is 30%. If the watermark is invisible, decrease opacity (higher value = more visible). If text is too large, reduce font size. You can also change the rotation angle and position — experiment with settings to match your document.' , de: 'Die Standard-Deckkraft des Wasserzeichens beträgt 30 %. Wenn das Wasserzeichen unsichtbar ist, verringern Sie die Deckkraft (höherer Wert = besser sichtbar). Wenn der Text zu groß ist, verkleinern Sie die Schriftgröße. Sie können auch den Drehwinkel und die Position ändern – experimentieren Sie mit den Einstellungen, um sie an Ihr Dokument anzupassen.'},
      },
      { key: 'redact-notworking', href: '/redact-pdf', icon: '✍️',
        q: { pl: 'Redakcja nie zakrywa tekstu poprawnie?', en: 'Redaction doesn\'t cover text correctly?' , de: 'Die Schwärzung bedeckt den Text nicht richtig?'},
        a: { pl: 'Redakcja działa poprzez zakrycie wybranego obszaru czarnym prostokątem. Upewnij się, że prostokąt w pełni pokrywa tekst, który chcesz usunąć. Redakcja jest trwała — po zapisaniu nie można cofnąć tej operacji. Zawsze rób kopię oryginalnego pliku przed redakcją.', en: 'Redaction works by covering the selected area with a black rectangle. Make sure the rectangle fully covers the text you want to remove. Redaction is permanent — once saved, this operation cannot be undone. Always keep a copy of the original file before redacting.' , de: 'Die Schwärzung funktioniert, indem der ausgewählte Bereich mit einem schwarzen Rechteck abgedeckt wird. Stellen Sie sicher, dass das Rechteck den Text, den Sie entfernen möchten, vollständig abdeckt. Die Schwärzung ist dauerhaft – nach dem Speichern kann dieser Vorgang nicht rückgängig gemacht werden. Erstellen Sie vor dem Schwärzen immer eine Kopie der Originaldatei.'},
      },
      { key: 'pagenumbers-position', href: '/page-numbers', icon: '🔢',
        q: { pl: 'Numery stron nakładają się na treść?', en: 'Page numbers overlap with content?' , de: 'Seitenzahlen überlappen den Inhalt?'},
        a: { pl: 'Jeśli numery stron nachodzą na treść dokumentu, spróbuj zmienić pozycję (góra/dół) lub wyrównanie (lewo/prawo). Możesz też zmienić rozmiar czcionki na mniejszy. Dla dokumentów z małymi marginesami wybierz pozycję "Dół" z wyrównaniem do prawej.', en: 'If page numbers overlap with document content, try changing the position (top/bottom) or alignment (left/right). You can also reduce the font size. For documents with small margins, choose "Bottom" position with right alignment.' , de: 'Wenn Seitenzahlen den Dokumentinhalt überlappen, versuchen Sie, die Position (oben/unten) oder Ausrichtung (links/rechts) zu ändern. Sie können auch die Schriftgröße verkleinern. Wählen Sie bei Dokumenten mit kleinen Rändern die Position „Unten“ mit rechtsbündiger Ausrichtung.'},
      },
      { key: 'edit-addtext', href: '/edit-pdf', icon: '✏️',
        q: { pl: 'Dodany tekst nie wygląda tak jak w oryginalnym dokumencie?', en: 'Added text doesn\'t match the original document?' , de: 'Hinzugefügter Text entspricht nicht dem Originaldokument?'},
        a: { pl: 'Edytor PDF umożliwia dodawanie nowego tekstu, ale nie edycję istniejącego. Nowy tekst może różnić się czcionką od oryginału, ponieważ używamy standardowych czcionek (Helvetica, Times, Courier). Aby edytować istniejący tekst, skorzystaj z konwersji PDF do Word, edytuj w Wordzie, a potem zapisz jako PDF.', en: 'The PDF Editor lets you add new text but not edit existing text. New text may differ in font from the original since we use standard fonts (Helvetica, Times, Courier). To edit existing text, convert PDF to Word, edit in Word, then save as PDF.' , de: 'Der PDF-Editor ermöglicht das Hinzufügen von neuem Text, aber nicht das Bearbeiten vorhandenen Texts. Neuer Text kann sich in der Schriftart vom Original unterscheiden, da wir Standard-Schriftarten verwenden (Helvetica, Times, Courier). Um vorhandenen Text zu bearbeiten, konvertieren Sie das PDF in Word, bearbeiten Sie es in Word und speichern Sie es dann als PDF.'},
      },
    ],
  },
  {
    key: 'convert', icon: '🔄',
    label: { pl: 'Konwersja PDF', en: 'Convert PDF' , de: 'PDF konvertieren'},
    items: [
      { key: 'word-formatting', href: '/pdf-to-word', icon: '📑',
        q: { pl: 'Konwersja PDF do Word traci formatowanie?', en: 'PDF to Word conversion loses formatting?' , de: 'Die Konvertierung von PDF zu Word verliert die Formatierung?'},
        a: { pl: 'Pewna utrata formatowania przy konwersji PDF do Word jest naturalna — PDF nie przechowuje informacji o stylach tak jak dokument Word. Tabele, kolumny i zaawansowane układy mogą wymagać ręcznej korekty w Wordzie. Im prostszy układ PDF, tym lepszy wynik konwersji.', en: 'Some formatting loss during PDF to Word conversion is normal — PDF doesn\'t store style information like a Word document. Tables, columns and complex layouts may need manual adjustment in Word. The simpler the PDF layout, the better the conversion result.' , de: 'Ein gewisser Formatierungsverlust bei der Konvertierung von PDF zu Word ist normal – PDF speichert keine Stilinformationen wie ein Word-Dokument. Tabellen, Spalten und komplexe Layouts müssen möglicherweise manuell in Word angepasst werden. Je einfacher das PDF-Layout, desto besser das Konvertierungsergebnis.'},
      },
      { key: 'images-quality', href: '/pdf-to-images', icon: '🖼️',
        q: { pl: 'Jakość obrazów z PDF jest niska?', en: 'Image quality from PDF is low?' , de: 'Die Bildqualität aus dem PDF ist niedrig?'},
        a: { pl: 'Domyślna rozdzielczość to 150 DPI. Jeśli potrzebujesz wyższej jakości, przed konwersją dostosuj ustawienia — zwiększ skalę (Scale) do 3 lub 4. Dla tekstu wystarczy skala 2, dla zdjęć i grafik warto użyć skali 3-4. Przy bardzo dużym powiększeniu obrazy JPG mogą być rozmazane — wybierz wtedy format PNG.', en: 'Default resolution is 150 DPI. If you need higher quality, adjust settings before conversion — increase Scale to 3 or 4. For text, scale 2 is sufficient; for photos and graphics, use scale 3-4. Images may appear blurry at very high zoom with JPG — choose PNG format instead.' , de: 'Die Standardauflösung beträgt 150 DPI. Wenn Sie eine höhere Qualität benötigen, passen Sie die Einstellungen vor der Konvertierung an – erhöhen Sie die Skalierung auf 3 oder 4. Für Text ist Skalierung 2 ausreichend; für Fotos und Grafiken verwenden Sie Skalierung 3-4. Bilder können bei sehr starker Vergrößerung mit JPG unscharf erscheinen – wählen Sie stattdessen das PNG-Format.'},
      },
      { key: 'excel-tables', href: '/pdf-to-excel', icon: '📊',
        q: { pl: 'Tabele z PDF nie przenoszą się poprawnie do Excela?', en: 'Tables from PDF don\'t transfer correctly to Excel?' , de: 'Tabellen aus PDF werden nicht korrekt nach Excel übertragen?'},
        a: { pl: 'Konwersja tabel z PDF do Excela działa najlepiej dla prostych tabel. Złożone tabele z połączonymi komórkami, kolorami i niestandardowym formatowaniem mogą wymagać ręcznej korekty. Jeśli dane są wyświetlane w jednej kolumnie zamiast w tabeli, spróbuj najpierw wyeksportować PDF do TXT, a potem zaimportować do Excela z podziałem na kolumny.', en: 'PDF to Excel table conversion works best for simple tables. Complex tables with merged cells, colors and custom formatting may need manual adjustment. If data appears in one column instead of a table, try exporting PDF to TXT first, then import to Excel with column splitting.' , de: 'Die Tabellenkonvertierung von PDF zu Excel funktioniert am besten bei einfachen Tabellen. Komplexe Tabellen mit verbundenen Zellen, Farben und benutzerdefinierter Formatierung müssen möglicherweise manuell angepasst werden. Wenn die Daten in einer Spalte statt in einer Tabelle erscheinen, versuchen Sie, das PDF zuerst nach TXT zu exportieren und es dann mit Spaltentrennung in Excel zu importieren.'},
      },
      { key: 'ocr-notext', href: '/ocr-pdf', icon: '🔍',
        q: { pl: 'OCR nie rozpoznaje tekstu lub rozpoznaje go błędnie?', en: 'OCR doesn\'t recognize text or recognizes it incorrectly?' , de: 'OCR erkennt Text nicht oder erkennt ihn falsch?'},
        a: { pl: 'OCR działa najlepiej na wyraźnych skanach. Problemy: (1) Niska rozdzielczość skanu — zeskanuj dokument w 300 DPI. (2) Krzywo zeskanowany tekst — wyprostuj strony przed OCR. (3) Ręczne pismo — OCR nie rozpoznaje odręcznego pisma. (4) Język dokumentu — narzędzie obsługuje wiele języków, ale najlepiej rozpoznaje polski i angielski. (5) Czcionki ozdobne — mogą być rozpoznawane błędnie.', en: 'OCR works best on clear scans. Issues: (1) Low scan resolution — scan at 300 DPI. (2) Crooked text — straighten pages before OCR. (3) Handwriting — OCR doesn\'t recognize handwriting. (4) Document language — the tool supports many languages but works best with Polish and English. (5) Decorative fonts — may be recognized incorrectly.' , de: 'OCR funktioniert am besten bei klaren Scans. Probleme: (1) Niedrige Scanauflösung – scannen Sie mit 300 DPI. (2) Schiefer Text – richten Sie die Seiten vor der OCR aus. (3) Handschrift – OCR erkennt keine Handschrift. (4) Dokumentsprache – das Werkzeug unterstützt viele Sprachen, funktioniert aber am besten mit Polnisch und Englisch. (5) Verzierte Schriftarten – können falsch erkannt werden.'},
      },
      { key: 'html-noresponse', href: '/html-to-pdf', icon: '🌐',
        q: { pl: 'Konwersja URL do PDF nie działa?', en: 'URL to PDF conversion doesn\'t work?' , de: 'Die Konvertierung von URL zu PDF funktioniert nicht?'},
        a: { pl: 'Konwersja URL do PDF wymaga połączenia z serwerem i może nie działać dla stron z silnym zabezpieczeniem CORS. Strony wymagające logowania, z blokadą botów lub osadzone w ramkach (iframe) mogą nie zostać poprawnie przetworzone. Spróbuj skopiować treść strony i użyć opcji "HTML do PDF" zamiast URL.', en: 'URL to PDF requires a server connection and may not work for pages with strong CORS protection. Pages requiring login, with bot blocking or embedded in iframes may not process correctly. Try copying the page content and using "HTML to PDF" instead of URL.' , de: 'URL zu PDF erfordert eine Serververbindung und funktioniert möglicherweise nicht bei Seiten mit starkem CORS-Schutz. Seiten, die eine Anmeldung erfordern, Bots blockieren oder in iframes eingebettet sind, werden möglicherweise nicht korrekt verarbeitet. Versuchen Sie, den Seiteninhalt zu kopieren und anstelle von URL „HTML zu PDF“ zu verwenden.'},
      },
      { key: 'epub-layout', href: '/pdf-to-epub', icon: '📖',
        q: { pl: 'EPUB z PDF wygląda inaczej niż oryginał?', en: 'EPUB from PDF looks different from the original?' , de: 'EPUB aus PDF sieht anders aus als das Original?'},
        a: { pl: 'To normalne — EPUB jest formatem typu "reflowable" (płynny), gdzie tekst dostosowuje się do rozmiaru ekranu, podczas gdy PDF ma stały układ. Obrazy, tabele i złożone układy mogą być przesunięte. Jeśli zależy Ci na oryginalnym układzie, pozostań przy PDF. EPUB lepiej nadaje się do czytania na czytnikach ebooków i telefonach.', en: 'This is normal — EPUB is a reflowable format where text adapts to screen size, while PDF has a fixed layout. Images, tables and complex layouts may be shifted. If you need the original layout, stay with PDF. EPUB is better for reading on ebook readers and phones.' , de: 'Das ist normal – EPUB ist ein umfließendes (reflowable) Format, bei dem sich der Text an die Bildschirmgröße anpasst, während PDF ein festes Layout hat. Bilder, Tabellen und komplexe Layouts können verschoben sein. Wenn Sie das ursprüngliche Layout benötigen, bleiben Sie bei PDF. EPUB eignet sich besser zum Lesen auf E-Book-Readern und Smartphones.'},
      },
    ],
  },
  {
    key: 'secure', icon: '🔒',
    label: { pl: 'Zabezpieczenia PDF', en: 'PDF Security' , de: 'PDF-Sicherheit'},
    items: [
      { key: 'protect-password', href: '/protect-pdf', icon: '🔒',
        q: { pl: 'Nie mogę otworzyć pliku po zabezpieczeniu?', en: 'Can\'t open the file after protecting?' , de: 'Die Datei lässt sich nach dem Schützen nicht öffnen?'},
        a: { pl: 'Zapisz hasło w bezpiecznym miejscu! OptimaPDF nie przechowuje haseł i nie ma możliwości ich odzyskania. Jeśli zapomniałeś hasła, nie ma sposobu na otwarcie pliku. Zalecamy: (1) Używaj haseł, które pamiętasz. (2) Zapisz hasło w menedżerze haseł. (3) Przed zabezpieczeniem zrób kopię oryginalnego pliku bez hasła.', en: 'Save your password in a safe place! OptimaPDF does not store passwords and cannot recover them. If you forget your password, there is no way to open the file. We recommend: (1) Use passwords you can remember. (2) Save the password in a password manager. (3) Keep a backup of the original file before protecting.' , de: 'Bewahren Sie Ihr Passwort an einem sicheren Ort auf! OptimaPDF speichert keine Passwörter und kann sie nicht wiederherstellen. Wenn Sie Ihr Passwort vergessen, gibt es keine Möglichkeit, die Datei zu öffnen. Wir empfehlen: (1) Verwenden Sie Passwörter, die Sie sich merken können. (2) Speichern Sie das Passwort in einem Passwort-Manager. (3) Erstellen Sie vor dem Schützen eine Sicherungskopie der Originaldatei.'},
      },
      { key: 'unlock-fail', href: '/unlock-pdf', icon: '🔓',
        q: { pl: 'Odblokowanie PDF nie działa — złe hasło?', en: 'Unlock doesn\'t work — wrong password?' , de: 'Entsperren funktioniert nicht – falsches Passwort?'},
        a: { pl: 'Odblokowanie wymaga podania poprawnego hasła. Jeśli hasło jest poprawne, ale odblokowanie nie działa, plik może używać starszego lub rzadkiego typu szyfrowania. W takim przypadku spróbuj otworzyć PDF w Adobe Reader, wpisz hasło, a następnie zapisz kopię bez zabezpieczeń — i tą kopię przetwarzaj dalej.', en: 'Unlocking requires the correct password. If the password is correct but unlocking doesn\'t work, the file may use an older or rare encryption type. In that case, try opening the PDF in Adobe Reader, enter the password, then save an unprotected copy — and process that copy further.' , de: 'Zum Entsperren ist das richtige Passwort erforderlich. Wenn das Passwort korrekt ist, das Entsperren aber nicht funktioniert, verwendet die Datei möglicherweise einen älteren oder seltenen Verschlüsselungstyp. Öffnen Sie in diesem Fall das PDF in Adobe Reader, geben Sie das Passwort ein, speichern Sie dann eine ungeschützte Kopie – und verarbeiten Sie diese Kopie weiter.'},
      },
      { key: 'sign-nosign', href: '/sign-pdf', icon: '🖊️',
        q: { pl: 'Podpis nie wyświetla się na stronie?', en: 'Signature doesn\'t appear on the page?' , de: 'Die Signatur erscheint nicht auf der Seite?'},
        a: { pl: 'Sprawdź: (1) Czy wybrałeś poprawną stronę do podpisania? (2) Czy współrzędne X/Y mieszczą się w obszarze strony? (3) Dla dużych dokumentów podpis może być dodany na ostatniej stronie. Spróbuj użyć opcji szybkich pozycji (np. "Dół strony"). Jeśli podpis jest niewidoczny, być może kolor jest zbyt jasny — spróbuj użyć domyślnego koloru czarnego.', en: 'Check: (1) Did you select the correct page to sign? (2) Are the X/Y coordinates within the page area? (3) For large documents, the signature may be placed on the last page. Try using the quick position options (e.g. "Bottom of page"). If the signature is invisible, the color may be too light — try using the default black color.' , de: 'Prüfen Sie: (1) Haben Sie die richtige Seite zum Signieren ausgewählt? (2) Liegen die X/Y-Koordinaten innerhalb des Seitenbereichs? (3) Bei großen Dokumenten kann die Signatur auf der letzten Seite platziert werden. Verwenden Sie die Schnellpositionsoptionen (z. B. „Unten auf der Seite“). Wenn die Signatur unsichtbar ist, ist die Farbe möglicherweise zu hell – verwenden Sie die Standardfarbe Schwarz.'},
      },
      { key: 'fillform-notinteractive', href: '/fill-form', icon: '📝',
        q: { pl: 'Formularz PDF nie ma pól do wypełnienia?', en: 'The PDF form has no fillable fields?' , de: 'Das PDF-Formular hat keine ausfüllbaren Felder?'},
        a: { pl: 'Narzędzie wypełnia tylko interaktywne formularze AcroForm. Jeśli PDF wygląda jak formularz, ale nie ma pól, to prawdopodobnie jest to skan lub obraz — w takim przypadku użyj opcji edycji (dodaj tekst ręcznie) lub OCR, aby rozpoznać tekst. Niektóre formularze wypełniane w programie Adobe Reader mogą nie być rozpoznawane jako AcroForm.', en: 'The tool only fills interactive AcroForm forms. If the PDF looks like a form but has no fields, it\'s likely a scan or image — in that case, use the edit tool (add text manually) or OCR to recognize text. Some forms filled in Adobe Reader may not be recognized as AcroForm.' , de: 'Das Werkzeug füllt nur interaktive AcroForm-Formulare aus. Wenn das PDF wie ein Formular aussieht, aber keine Felder hat, handelt es sich wahrscheinlich um einen Scan oder ein Bild – verwenden Sie in diesem Fall das Bearbeitungswerkzeug (Text manuell hinzufügen) oder OCR, um Text zu erkennen. Einige in Adobe Reader ausgefüllte Formulare werden möglicherweise nicht als AcroForm erkannt.'},
      },
      { key: 'pdfa-error', href: '/to-pdfa', icon: '📦',
        q: { pl: 'Konwersja do PDF/A zgłasza błąd?', en: 'PDF/A conversion reports an error?' , de: 'Die Konvertierung zu PDF/A meldet einen Fehler?'},
        a: { pl: 'Konwersja do PDF/A wykonuje "best-effort" — nie gwarantuje 100% zgodności ze standardem. Problemy mogą wystąpić dla plików z: (1) osadzonymi czcionkami bez licencji, (2) zaawansowanymi formularzami, (3) multimediami (audio, wideo). Mimo błędu plik może działać poprawnie w większości programów do archiwizacji.', en: 'PDF/A conversion is "best-effort" — it doesn\'t guarantee 100% standard compliance. Issues may occur for files with: (1) embedded fonts without license, (2) advanced forms, (3) multimedia (audio, video). Despite the error, the file may work correctly in most archiving programs.' , de: 'Die Konvertierung zu PDF/A ist eine „Best-Effort“-Konvertierung – sie garantiert keine 100%ige Konformität mit dem Standard. Probleme können bei Dateien auftreten mit: (1) eingebetteten Schriften ohne Lizenz, (2) erweiterten Formularen, (3) Multimedia (Audio, Video). Trotz des Fehlers kann die Datei in den meisten Archivierungsprogrammen korrekt funktionieren.'},
      },
    ],
  },
  {
    key: 'ai', icon: '🤖',
    label: { pl: 'Narzędzia AI', en: 'AI Tools' , de: 'KI-Werkzeuge'},
    items: [
      { key: 'aikey', href: '/ai-chat', icon: '🔑',
        q: { pl: 'Jak zdobyć klucz API OpenRouter?', en: 'How to get an OpenRouter API key?' , de: 'Wie erhalte ich einen OpenRouter-API-Schlüssel?'},
        a: { pl: 'Narzędzia AI wymagają własnego klucza API OpenRouter. Aby go zdobyć: (1) Wejdź na https://openrouter.ai/keys. (2) Zarejestruj się lub zaloguj. (3) Kliknij "Create Key". (4) Skopiuj klucz (zaczyna się od "sk-or-v1-..."). (5) Wklej go w polu klucza na stronie narzędzia AI. OpenRouter oferuje darmowy limit zapytań dla nowych użytkowników.', en: 'AI tools require your own OpenRouter API key. To get one: (1) Go to https://openrouter.ai/keys. (2) Register or log in. (3) Click "Create Key". (4) Copy the key (starts with "sk-or-v1-..."). (5) Paste it in the key field on the AI tool page. OpenRouter offers a free query limit for new users.' , de: 'KI-Werkzeuge erfordern einen eigenen OpenRouter-API-Schlüssel. So erhalten Sie einen: (1) Gehen Sie zu https://openrouter.ai/keys. (2) Registrieren Sie sich oder melden Sie sich an. (3) Klicken Sie auf „Create Key“. (4) Kopieren Sie den Schlüssel (beginnt mit „sk-or-v1-...“). (5) Fügen Sie ihn in das Schlüsselfeld auf der KI-Werkzeugseite ein. OpenRouter bietet neuen Benutzern ein kostenloses Abfragelimit.'},
      },
      { key: 'ai-slow', href: '/ai-chat', icon: '⏳',
        q: { pl: 'AI odpowiada bardzo wolno?', en: 'AI responds very slowly?' , de: 'KI antwortet sehr langsam?'},
        a: { pl: 'Szybkość odpowiedzi AI zależy od: (1) Wybranego modelu — większe modele (np. Llama 70B) są wolniejsze. (2) Długości dokumentu — im więcej tekstu, tym dłuższa analiza. (3) Obciążenia serwerów OpenRouter. (4) Jakości Twojego połączenia internetowego. Jeśli jest zbyt wolno, spróbuj użyć mniejszego modelu AI.', en: 'AI response speed depends on: (1) The selected model — larger models (e.g. Llama 70B) are slower. (2) Document length — more text means longer analysis. (3) OpenRouter server load. (4) Your internet connection quality. If too slow, try using a smaller AI model.' , de: 'Die Antwortgeschwindigkeit der KI hängt ab von: (1) dem ausgewählten Modell – größere Modelle (z. B. Llama 70B) sind langsamer, (2) der Dokumentlänge – mehr Text bedeutet eine längere Analyse, (3) der Auslastung der OpenRouter-Server, (4) der Qualität Ihrer Internetverbindung. Wenn es zu langsam ist, versuchen Sie, ein kleineres KI-Modell zu verwenden.'},
      },
      { key: 'ai-wrong', href: '/ai-summary', icon: '❌',
        q: { pl: 'AI podaje niepoprawne informacje?', en: 'AI gives incorrect information?' , de: 'KI liefert falsche Informationen?'},
        a: { pl: 'Modele AI mogą się mylić lub "halucynować" — podawać informacje, które brzmią wiarygodnie, ale są nieprawdziwe. Zawsze weryfikuj odpowiedzi AI z oryginalnym dokumentem. AI najlepiej sprawdza się w: streszczaniu, wyszukiwaniu konkretnych informacji i generowaniu podsumowań. Nie ufaj AI w 100% przy ważnych dokumentach.', en: 'AI models can make mistakes or "hallucinate" — provide information that sounds plausible but is incorrect. Always verify AI answers against the original document. AI works best for: summarizing, finding specific information and generating overviews. Don\'t trust AI 100% for important documents.' , de: 'KI-Modelle können Fehler machen oder „halluzinieren“ – Informationen liefern, die plausibel klingen, aber falsch sind. Überprüfen Sie KI-Antworten immer am Originaldokument. KI funktioniert am besten beim Zusammenfassen, Finden bestimmter Informationen und Erstellen von Übersichten. Vertrauen Sie bei wichtigen Dokumenten nicht zu 100 % der KI.'},
      },
    ],
  },
];

export default function HelpPage({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const { locale: detectedLocale } = useLocale();
  const locale = forcedLocale || detectedLocale;
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['general']));
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
        <div className="text-5xl mb-4">🆘</div>
        <h1 className="text-3xl sm:text-4xl font-bold tool-heading mb-3">
          {t('help.title', locale)}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
          {t('help.subtitle', locale)}
        </p>
      </div>

      <div className="space-y-4">
        {helpData.map(cat => (
          <div key={cat.key} className="tool-card rounded-2xl border overflow-hidden">
            <button
              onClick={() => toggleSection(cat.key)}
              className="w-full flex items-center justify-between px-6 py-4 text-left transition hover:bg-[var(--coffee-surface-hover)]"
            >
              <span className="font-bold text-base" style={{ color: 'var(--coffee-text)' }}>
                {cat.icon} {lc(locale, cat.label)}
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
                        <span className="text-lg shrink-0">{item.icon}</span>
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
                        {item.href !== '#' && (
                          <Link
                            href={item.href}
                            className="inline-flex items-center gap-1 text-sm font-medium transition hover:underline"
                            style={{ color: 'var(--coffee-accent)' }}
                          >
                            {t('help.open_tool', locale)} →
                          </Link>
                        )}
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
