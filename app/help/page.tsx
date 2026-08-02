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
    label: { pl: 'Problemy ogólne', en: 'General Issues' , de: 'Allgemeine Probleme', es: 'Problemas generales'},
    items: [
      { key: 'largefile', href: '#', icon: '📦',
        q: { pl: 'Plik PDF jest za duży i nie chce się załadować?', en: 'The PDF file is too large and won\'t load?' , de: 'Die PDF-Datei ist zu groß und lässt sich nicht laden?', es: '¿El archivo PDF es demasiado grande y no se carga?'},
        a: { pl: 'Jeśli plik ma kilkadziesiąt MB i strona działa wolno, spróbuj: (1) otworzyć plik w lżejszej przeglądarce (Chrome lub Edge). (2) Zamknąć inne karty, aby zwolnić pamięć RAM. (3) Użyć mniejszego pliku lub najpierw skompresować go za pomocą narzędzia Kompresuj PDF. (4) W ostateczności podzielić duży plik na mniejsze części przed przetwarzaniem.', en: 'If the file is several dozen MB and the page runs slow, try: (1) Open the file in a lighter browser (Chrome or Edge). (2) Close other tabs to free up RAM. (3) Use a smaller file or first compress it with the Compress PDF tool. (4) As a last resort, split the large file into smaller parts before processing.' , de: 'Wenn die Datei mehrere Dutzend MB groß ist und die Seite langsam läuft, versuchen Sie Folgendes: (1) Öffnen Sie die Datei in einem leichteren Browser (Chrome oder Edge). (2) Schließen Sie andere Tabs, um Arbeitsspeicher freizugeben. (3) Verwenden Sie eine kleinere Datei oder komprimieren Sie sie zuerst mit dem Werkzeug „PDF komprimieren“. (4) Teilen Sie die große Datei im Notfall vor der Verarbeitung in kleinere Teile.', es: 'Si el archivo pesa varias decenas de MB y la página va lenta, pruebe a: (1) abrir el archivo en un navegador más ligero (Chrome o Edge). (2) Cerrar otras pestañas para liberar memoria RAM. (3) Usar un archivo más pequeño o comprimirlo primero con la herramienta «Comprimir PDF». (4) Como último recurso, dividir el archivo grande en partes más pequeñas antes de procesarlo.'},
      },
      { key: 'notpdf', href: '#', icon: '📄',
        q: { pl: 'Plik nie jest rozpoznawany jako PDF?', en: 'File is not recognized as PDF?' , de: 'Die Datei wird nicht als PDF erkannt?', es: '¿El archivo no se reconoce como PDF?'},
        a: { pl: 'Upewnij się, że plik ma rozszerzenie .pdf. Jeśli plik faktycznie jest PDF, ale nie chce się otworzyć, mógł zostać uszkodzony. Spróbuj otworzyć go w innym programie (Adobe Reader, przeglądarka). Jeśli działa w innych programach, zgłoś problem — możliwe, że plik używa niestandardowych funkcji PDF, które nie są obsługiwane.', en: 'Make sure the file has a .pdf extension. If the file is actually a PDF but won\'t open, it may be corrupted. Try opening it in another program (Adobe Reader, browser). If it works in other programs, report the issue — the file may use non-standard PDF features not yet supported.' , de: 'Stellen Sie sicher, dass die Datei die Erweiterung .pdf hat. Wenn die Datei tatsächlich eine PDF-Datei ist, sich aber nicht öffnen lässt, ist sie möglicherweise beschädigt. Versuchen Sie, sie in einem anderen Programm zu öffnen (Adobe Reader, Browser). Wenn sie in anderen Programmen funktioniert, melden Sie das Problem – die Datei verwendet möglicherweise nicht standardkonforme PDF-Funktionen, die noch nicht unterstützt werden.', es: 'Asegúrese de que el archivo tenga la extensión .pdf. Si el archivo es realmente un PDF pero no se abre, puede estar dañado. Intente abrirlo en otro programa (Adobe Reader, navegador). Si funciona en otros programas, informe del problema: el archivo puede usar funciones de PDF no estándar que aún no son compatibles.'},
      },
      { key: 'memory', href: '#', icon: '💾',
        q: { pl: 'Strona wyświetla błąd pamięci lub zawiesza się?', en: 'The page shows a memory error or freezes?' , de: 'Die Seite zeigt einen Speicherfehler oder friert ein?', es: '¿La página muestra un error de memoria o se congela?'},
        a: { pl: 'Narzędzia działają w całości w przeglądarce, więc duże pliki mogą przekroczyć dostępną pamięć RAM. Rozwiązania: (1) Użyj przeglądarki Chrome/Edge — mają lepszą obsługę pamięci. (2) Zamknij inne programy i karty. (3) Przetwarzaj mniejsze pliki. (4) Jeśli problem występuje stale, spróbuj zaktualizować przeglądarkę.', en: 'All tools run entirely in the browser, so large files may exceed available RAM. Solutions: (1) Use Chrome/Edge — they handle memory better. (2) Close other programs and tabs. (3) Process smaller files. (4) If the issue persists, try updating your browser.' , de: 'Alle Werkzeuge laufen vollständig im Browser, sodass große Dateien den verfügbaren Arbeitsspeicher überschreiten können. Lösungen: (1) Verwenden Sie Chrome/Edge – sie verwalten den Speicher besser. (2) Schließen Sie andere Programme und Tabs. (3) Verarbeiten Sie kleinere Dateien. (4) Wenn das Problem weiterhin besteht, versuchen Sie, Ihren Browser zu aktualisieren.', es: 'Todas las herramientas se ejecutan por completo en el navegador, por lo que los archivos grandes pueden superar la memoria RAM disponible. Soluciones: (1) Use Chrome/Edge: gestionan mejor la memoria. (2) Cierre otros programas y pestañas. (3) Procese archivos más pequeños. (4) Si el problema continúa, intente actualizar su navegador.'},
      },
      { key: 'save', href: '#', icon: '💿',
        q: { pl: 'Nie mogę zapisać wynikowego pliku?', en: 'Can\'t save the resulting file?' , de: 'Kann die resultierende Datei nicht gespeichert werden?', es: '¿No puede guardar el archivo resultante?'},
        a: { pl: 'Jeśli po przetworzeniu plik nie pobiera się automatycznie: (1) Sprawdź, czy przeglądarka nie blokuje pobierania (iconka w pasku adresu). (2) Kliknij przycisk pobierania ręcznie, jeśli jest dostępny. (3) Spróbuj użyć innej przeglądarki. (4) Upewnij się, że masz wystarczająco miejsca na dysku.', en: 'If the file doesn\'t download automatically after processing: (1) Check if your browser is blocking downloads (icon in the address bar). (2) Click the download button manually if available. (3) Try a different browser. (4) Make sure you have enough disk space.' , de: 'Wenn die Datei nach der Verarbeitung nicht automatisch heruntergeladen wird: (1) Prüfen Sie, ob Ihr Browser Downloads blockiert (Symbol in der Adressleiste). (2) Klicken Sie den Download-Button bei Bedarf manuell an. (3) Versuchen Sie einen anderen Browser. (4) Stellen Sie sicher, dass Sie genügend Speicherplatz auf der Festplatte haben.', es: 'Si el archivo no se descarga automáticamente después del procesamiento: (1) Compruebe si su navegador bloquea las descargas (icono en la barra de direcciones). (2) Haga clic manualmente en el botón de descarga si está disponible. (3) Pruebe con otro navegador. (4) Asegúrese de tener suficiente espacio en el disco.'},
      },
      { key: 'wrongbrowser', href: '#', icon: '🌐',
        q: { pl: 'Które przeglądarki są obsługiwane?', en: 'Which browsers are supported?' , de: 'Welche Browser werden unterstützt?', es: '¿Qué navegadores son compatibles?'},
        a: { pl: 'Narzędzia działają w każdej nowoczesnej przeglądarce: Chrome, Edge, Firefox, Opera, Safari (wersje z ostatnich 2 lat). Najlepszą wydajność oferują Chrome i Edge. Starsze przeglądarki (Internet Explorer, stare wersje Safari) nie są obsługiwane.', en: 'The tools work in all modern browsers: Chrome, Edge, Firefox, Opera, Safari (versions from the last 2 years). Best performance is in Chrome and Edge. Older browsers (Internet Explorer, old Safari versions) are not supported.' , de: 'Die Werkzeuge funktionieren in allen modernen Browsern: Chrome, Edge, Firefox, Opera, Safari (Versionen der letzten 2 Jahre). Die beste Leistung bieten Chrome und Edge. Ältere Browser (Internet Explorer, alte Safari-Versionen) werden nicht unterstützt.', es: 'Las herramientas funcionan en todos los navegadores modernos: Chrome, Edge, Firefox, Opera, Safari (versiones de los últimos 2 años). El mejor rendimiento se obtiene en Chrome y Edge. Los navegadores antiguos (Internet Explorer, versiones antiguas de Safari) no son compatibles.'},
      },
    ],
  },
  {
    key: 'edit', icon: '✏️',
    label: { pl: 'Edycja PDF', en: 'Edit PDF' , de: 'PDF bearbeiten', es: 'Editar PDF'},
    items: [
      { key: 'merge-slow', href: '/merge', icon: '🔗',
        q: { pl: 'Scalanie wielu plików działa wolno?', en: 'Merging many files is slow?' , de: 'Das Zusammenführen vieler Dateien ist langsam?', es: '¿Combinar muchos archivos es lento?'},
        a: { pl: 'Scalanie kilkudziesięciu plików lub plików z wieloma stronami może chwilę potrwać — wszystko dzieje się lokalnie w przeglądarce. Czas zależy od mocy Twojego procesora i ilości pamięci RAM. Dla bardzo dużych plików (ponad 100 stron) zalecamy przetwarzanie w partiach.', en: 'Merging dozens of files or files with many pages may take a moment — everything runs locally in your browser. Time depends on your CPU power and RAM. For very large files (over 100 pages), we recommend processing in batches.' , de: 'Das Zusammenführen von Dutzenden Dateien oder Dateien mit vielen Seiten kann einen Moment dauern – alles läuft lokal in Ihrem Browser. Die Dauer hängt von der Leistung Ihrer CPU und dem Arbeitsspeicher ab. Bei sehr großen Dateien (über 100 Seiten) empfehlen wir die Verarbeitung in Stapeln.', es: 'Combinar decenas de archivos o archivos con muchas páginas puede llevar un momento: todo se ejecuta localmente en su navegador. El tiempo depende de la potencia de su CPU y de la memoria RAM. Para archivos muy grandes (más de 100 páginas), recomendamos procesarlos por lotes.'},
      },
      { key: 'split-wrong', href: '/split', icon: '✂️',
        q: { pl: 'Dzielenie nie wyodrębnia poprawnych stron?', en: 'Split is not extracting the right pages?' , de: 'Das Teilen extrahiert nicht die richtigen Seiten?', es: '¿Dividir no extrae las páginas correctas?'},
        a: { pl: 'Upewnij się, że używasz poprawnego formatu zakresów. Przykłady: "1-5" (strony od 1 do 5), "1,3,5" (konkretne strony), "1-5,8,10-15" (mieszane). Strony numerowane są od 1. Jeśli używasz trybu "Co N stron", liczba oznacza, że co N-ta strona zostanie wydzielona.', en: 'Make sure you\'re using the correct range format. Examples: "1-5" (pages 1 through 5), "1,3,5" (specific pages), "1-5,8,10-15" (mixed). Pages are numbered starting from 1. If using "Every N pages" mode, the number means every Nth page will be extracted.' , de: 'Stellen Sie sicher, dass Sie das richtige Bereichsformat verwenden. Beispiele: „1-5“ (Seiten 1 bis 5), „1,3,5“ (bestimmte Seiten), „1-5,8,10-15“ (gemischt). Seiten werden ab 1 nummeriert. Wenn Sie den Modus „Jede N. Seite“ verwenden, bedeutet die Zahl, dass jede N-te Seite extrahiert wird.', es: 'Asegúrese de usar el formato de rango correcto. Ejemplos: «1-5» (páginas de la 1 a la 5), «1,3,5» (páginas específicas), «1-5,8,10-15» (mixto). Las páginas se numeran a partir de 1. Si usa el modo «Cada N páginas», el número significa que se extraerá cada N-ésima página.'},
      },
      { key: 'compress-nochange', href: '/compress', icon: '🗜️',
        q: { pl: 'Kompresja nie zmniejsza rozmiaru pliku?', en: 'Compression doesn\'t reduce file size?' , de: 'Die Komprimierung verkleinert die Datei nicht?', es: '¿La compresión no reduce el tamaño del archivo?'},
        a: { pl: 'Jeśli plik PDF zawiera głównie tekst (a nie obrazy), kompresja może nie przynieść znaczącej różnicy — tekst już jest mocno skompresowany. PDF z obrazami skompresuje się lepiej. Spróbuj wybrać wyższy poziom kompresji. Jeśli plik jest już zoptymalizowany, dalsza kompresja może być niemożliwa.', en: 'If the PDF contains mostly text (not images), compression may not make a significant difference — text is already highly compressed. Image-based PDFs will compress better. Try a higher compression level. If the file is already optimized, further compression may not be possible.' , de: 'Wenn das PDF hauptsächlich Text enthält (keine Bilder), kann die Komprimierung keinen nennenswerten Unterschied bewirken – Text ist bereits stark komprimiert. Bildbasierte PDFs lassen sich besser komprimieren. Versuchen Sie eine höhere Komprimierungsstufe. Wenn die Datei bereits optimiert ist, ist eine weitere Komprimierung möglicherweise nicht möglich.', es: 'Si el PDF contiene principalmente texto (no imágenes), la compresión puede no suponer una diferencia significativa: el texto ya está muy comprimido. Los PDF basados en imágenes se comprimen mejor. Pruebe un nivel de compresión más alto. Si el archivo ya está optimizado, puede que no sea posible comprimirlo más.'},
      },
      { key: 'crop-wrong', href: '/crop-pdf', icon: '📐',
        q: { pl: 'Przycięcie usuwa złe fragmenty strony?', en: 'Cropping removes the wrong parts of the page?' , de: 'Beim Zuschneiden werden die falschen Teile der Seite entfernt?', es: '¿El recorte elimina partes incorrectas de la página?'},
        a: { pl: 'Wartości marginesów są podawane w punktach (pt). Domyślnie przycięcie 50pt z każdej strony. Dla strony A4 (595x842pt) spróbuj: lewy/prawy 30pt, górny/dolny 40pt. Możesz podejrzeć efekt przed zapisaniem. Jeśli chcesz przyciąć tylko wybrane strony, użyj opcji wyboru stron przed przycięciem.', en: 'Margin values are given in points (pt). Default crops 50pt from each side. For an A4 page (595x842pt) try: left/right 30pt, top/bottom 40pt. You can preview the result before saving. To crop only selected pages, use the page selection option before cropping.' , de: 'Randwerte werden in Punkt (pt) angegeben. Standardmäßig werden 50 pt von jeder Seite beschnitten. Für eine A4-Seite (595x842 pt) versuchen Sie: links/rechts 30 pt, oben/unten 40 pt. Sie können das Ergebnis vor dem Speichern in der Vorschau ansehen. Um nur ausgewählte Seiten zuzuschneiden, verwenden Sie vor dem Zuschneiden die Seitenauswahloption.', es: 'Los valores de los márgenes se indican en puntos (pt). Por defecto se recortan 50 pt de cada lado. Para una página A4 (595x842 pt) pruebe: izquierda/derecha 30 pt, arriba/abajo 40 pt. Puede previsualizar el resultado antes de guardar. Para recortar solo páginas seleccionadas, use la opción de selección de páginas antes de recortar.'},
      },
      { key: 'watermark-notvisible', href: '/watermark-pdf', icon: '💧',
        q: { pl: 'Znak wodny jest niewidoczny lub zbyt duży?', en: 'Watermark is invisible or too large?' , de: 'Das Wasserzeichen ist unsichtbar oder zu groß?', es: '¿La marca de agua es invisible o demasiado grande?'},
        a: { pl: 'Domyślna przezroczystość znaku wodnego to 30%. Jeśli znak jest niewidoczny, zmniejsz przezroczystość (wyższa wartość = bardziej widoczny). Jeśli tekst jest za duży, zmniejsz rozmiar czcionki. Możesz też zmienić kąt nachylenia i pozycję — eksperymentuj z ustawieniami, aby dopasować do swojego dokumentu.', en: 'Default watermark opacity is 30%. If the watermark is invisible, decrease opacity (higher value = more visible). If text is too large, reduce font size. You can also change the rotation angle and position — experiment with settings to match your document.' , de: 'Die Standard-Deckkraft des Wasserzeichens beträgt 30 %. Wenn das Wasserzeichen unsichtbar ist, verringern Sie die Deckkraft (höherer Wert = besser sichtbar). Wenn der Text zu groß ist, verkleinern Sie die Schriftgröße. Sie können auch den Drehwinkel und die Position ändern – experimentieren Sie mit den Einstellungen, um sie an Ihr Dokument anzupassen.', es: 'La opacidad predeterminada de la marca de agua es del 30 %. Si la marca de agua es invisible, reduzca la opacidad (un valor más alto = más visible). Si el texto es demasiado grande, reduzca el tamaño de la fuente. También puede cambiar el ángulo de rotación y la posición: experimente con los ajustes para adaptarlos a su documento.'},
      },
      { key: 'redact-notworking', href: '/redact-pdf', icon: '✍️',
        q: { pl: 'Redakcja nie zakrywa tekstu poprawnie?', en: 'Redaction doesn\'t cover text correctly?' , de: 'Die Schwärzung bedeckt den Text nicht richtig?', es: '¿La redacción no cubre el texto correctamente?'},
        a: { pl: 'Redakcja działa poprzez zakrycie wybranego obszaru czarnym prostokątem. Upewnij się, że prostokąt w pełni pokrywa tekst, który chcesz usunąć. Redakcja jest trwała — po zapisaniu nie można cofnąć tej operacji. Zawsze rób kopię oryginalnego pliku przed redakcją.', en: 'Redaction works by covering the selected area with a black rectangle. Make sure the rectangle fully covers the text you want to remove. Redaction is permanent — once saved, this operation cannot be undone. Always keep a copy of the original file before redacting.' , de: 'Die Schwärzung funktioniert, indem der ausgewählte Bereich mit einem schwarzen Rechteck abgedeckt wird. Stellen Sie sicher, dass das Rechteck den Text, den Sie entfernen möchten, vollständig abdeckt. Die Schwärzung ist dauerhaft – nach dem Speichern kann dieser Vorgang nicht rückgängig gemacht werden. Erstellen Sie vor dem Schwärzen immer eine Kopie der Originaldatei.', es: 'La redacción funciona cubriendo el área seleccionada con un rectángulo negro. Asegúrese de que el rectángulo cubra por completo el texto que desea eliminar. La redacción es permanente: una vez guardada, esta operación no se puede deshacer. Haga siempre una copia del archivo original antes de redactar.'},
      },
      { key: 'pagenumbers-position', href: '/page-numbers', icon: '🔢',
        q: { pl: 'Numery stron nakładają się na treść?', en: 'Page numbers overlap with content?' , de: 'Seitenzahlen überlappen den Inhalt?', es: '¿Los números de página se superponen con el contenido?'},
        a: { pl: 'Jeśli numery stron nachodzą na treść dokumentu, spróbuj zmienić pozycję (góra/dół) lub wyrównanie (lewo/prawo). Możesz też zmienić rozmiar czcionki na mniejszy. Dla dokumentów z małymi marginesami wybierz pozycję "Dół" z wyrównaniem do prawej.', en: 'If page numbers overlap with document content, try changing the position (top/bottom) or alignment (left/right). You can also reduce the font size. For documents with small margins, choose "Bottom" position with right alignment.' , de: 'Wenn Seitenzahlen den Dokumentinhalt überlappen, versuchen Sie, die Position (oben/unten) oder Ausrichtung (links/rechts) zu ändern. Sie können auch die Schriftgröße verkleinern. Wählen Sie bei Dokumenten mit kleinen Rändern die Position „Unten“ mit rechtsbündiger Ausrichtung.', es: 'Si los números de página se superponen con el contenido del documento, pruebe a cambiar la posición (arriba/abajo) o la alineación (izquierda/derecha). También puede reducir el tamaño de la fuente. Para documentos con márgenes pequeños, elija la posición «Abajo» con alineación a la derecha.'},
      },
      { key: 'edit-addtext', href: '/edit-pdf', icon: '✏️',
        q: { pl: 'Dodany tekst nie wygląda tak jak w oryginalnym dokumencie?', en: 'Added text doesn\'t match the original document?' , de: 'Hinzugefügter Text entspricht nicht dem Originaldokument?', es: '¿El texto añadido no coincide con el documento original?'},
        a: { pl: 'Edytor PDF umożliwia dodawanie nowego tekstu, ale nie edycję istniejącego. Nowy tekst może różnić się czcionką od oryginału, ponieważ używamy standardowych czcionek (Helvetica, Times, Courier). Aby edytować istniejący tekst, skorzystaj z konwersji PDF do Word, edytuj w Wordzie, a potem zapisz jako PDF.', en: 'The PDF Editor lets you add new text but not edit existing text. New text may differ in font from the original since we use standard fonts (Helvetica, Times, Courier). To edit existing text, convert PDF to Word, edit in Word, then save as PDF.' , de: 'Der PDF-Editor ermöglicht das Hinzufügen von neuem Text, aber nicht das Bearbeiten vorhandenen Texts. Neuer Text kann sich in der Schriftart vom Original unterscheiden, da wir Standard-Schriftarten verwenden (Helvetica, Times, Courier). Um vorhandenen Text zu bearbeiten, konvertieren Sie das PDF in Word, bearbeiten Sie es in Word und speichern Sie es dann als PDF.', es: 'El editor de PDF permite añadir texto nuevo, pero no editar el texto existente. El texto nuevo puede diferir en la fuente del original, ya que usamos fuentes estándar (Helvetica, Times, Courier). Para editar texto existente, convierta el PDF a Word, edítelo en Word y luego guárdelo como PDF.'},
      },
    ],
  },
  {
    key: 'convert', icon: '🔄',
    label: { pl: 'Konwersja PDF', en: 'Convert PDF' , de: 'PDF konvertieren', es: 'Convertir PDF'},
    items: [
      { key: 'word-formatting', href: '/pdf-to-word', icon: '📑',
        q: { pl: 'Konwersja PDF do Word traci formatowanie?', en: 'PDF to Word conversion loses formatting?' , de: 'Die Konvertierung von PDF zu Word verliert die Formatierung?', es: '¿La conversión de PDF a Word pierde el formato?'},
        a: { pl: 'Pewna utrata formatowania przy konwersji PDF do Word jest naturalna — PDF nie przechowuje informacji o stylach tak jak dokument Word. Tabele, kolumny i zaawansowane układy mogą wymagać ręcznej korekty w Wordzie. Im prostszy układ PDF, tym lepszy wynik konwersji.', en: 'Some formatting loss during PDF to Word conversion is normal — PDF doesn\'t store style information like a Word document. Tables, columns and complex layouts may need manual adjustment in Word. The simpler the PDF layout, the better the conversion result.' , de: 'Ein gewisser Formatierungsverlust bei der Konvertierung von PDF zu Word ist normal – PDF speichert keine Stilinformationen wie ein Word-Dokument. Tabellen, Spalten und komplexe Layouts müssen möglicherweise manuell in Word angepasst werden. Je einfacher das PDF-Layout, desto besser das Konvertierungsergebnis.', es: 'Cierta pérdida de formato durante la conversión de PDF a Word es normal: el PDF no almacena información de estilos como un documento de Word. Las tablas, columnas y diseños complejos pueden requerir un ajuste manual en Word. Cuanto más simple sea el diseño del PDF, mejor será el resultado de la conversión.'},
      },
      { key: 'images-quality', href: '/pdf-to-images', icon: '🖼️',
        q: { pl: 'Jakość obrazów z PDF jest niska?', en: 'Image quality from PDF is low?' , de: 'Die Bildqualität aus dem PDF ist niedrig?', es: '¿La calidad de las imágenes del PDF es baja?'},
        a: { pl: 'Domyślna rozdzielczość to 150 DPI. Jeśli potrzebujesz wyższej jakości, przed konwersją dostosuj ustawienia — zwiększ skalę (Scale) do 3 lub 4. Dla tekstu wystarczy skala 2, dla zdjęć i grafik warto użyć skali 3-4. Przy bardzo dużym powiększeniu obrazy JPG mogą być rozmazane — wybierz wtedy format PNG.', en: 'Default resolution is 150 DPI. If you need higher quality, adjust settings before conversion — increase Scale to 3 or 4. For text, scale 2 is sufficient; for photos and graphics, use scale 3-4. Images may appear blurry at very high zoom with JPG — choose PNG format instead.' , de: 'Die Standardauflösung beträgt 150 DPI. Wenn Sie eine höhere Qualität benötigen, passen Sie die Einstellungen vor der Konvertierung an – erhöhen Sie die Skalierung auf 3 oder 4. Für Text ist Skalierung 2 ausreichend; für Fotos und Grafiken verwenden Sie Skalierung 3-4. Bilder können bei sehr starker Vergrößerung mit JPG unscharf erscheinen – wählen Sie stattdessen das PNG-Format.', es: 'La resolución predeterminada es de 150 DPI. Si necesita mayor calidad, ajuste la configuración antes de la conversión: aumente la escala a 3 o 4. Para texto, la escala 2 es suficiente; para fotos y gráficos, use la escala 3-4. Las imágenes pueden verse borrosas con un zoom muy alto en JPG: elija el formato PNG.'},
      },
      { key: 'excel-tables', href: '/pdf-to-excel', icon: '📊',
        q: { pl: 'Tabele z PDF nie przenoszą się poprawnie do Excela?', en: 'Tables from PDF don\'t transfer correctly to Excel?' , de: 'Tabellen aus PDF werden nicht korrekt nach Excel übertragen?', es: '¿Las tablas del PDF no se transfieren correctamente a Excel?'},
        a: { pl: 'Konwersja tabel z PDF do Excela działa najlepiej dla prostych tabel. Złożone tabele z połączonymi komórkami, kolorami i niestandardowym formatowaniem mogą wymagać ręcznej korekty. Jeśli dane są wyświetlane w jednej kolumnie zamiast w tabeli, spróbuj najpierw wyeksportować PDF do TXT, a potem zaimportować do Excela z podziałem na kolumny.', en: 'PDF to Excel table conversion works best for simple tables. Complex tables with merged cells, colors and custom formatting may need manual adjustment. If data appears in one column instead of a table, try exporting PDF to TXT first, then import to Excel with column splitting.' , de: 'Die Tabellenkonvertierung von PDF zu Excel funktioniert am besten bei einfachen Tabellen. Komplexe Tabellen mit verbundenen Zellen, Farben und benutzerdefinierter Formatierung müssen möglicherweise manuell angepasst werden. Wenn die Daten in einer Spalte statt in einer Tabelle erscheinen, versuchen Sie, das PDF zuerst nach TXT zu exportieren und es dann mit Spaltentrennung in Excel zu importieren.', es: 'La conversión de tablas de PDF a Excel funciona mejor con tablas simples. Las tablas complejas con celdas combinadas, colores y formato personalizado pueden requerir un ajuste manual. Si los datos aparecen en una sola columna en lugar de una tabla, pruebe a exportar primero el PDF a TXT y luego importarlo a Excel con división de columnas.'},
      },
      { key: 'ocr-notext', href: '/ocr-pdf', icon: '🔍',
        q: { pl: 'OCR nie rozpoznaje tekstu lub rozpoznaje go błędnie?', en: 'OCR doesn\'t recognize text or recognizes it incorrectly?' , de: 'OCR erkennt Text nicht oder erkennt ihn falsch?', es: '¿El OCR no reconoce el texto o lo reconoce incorrectamente?'},
        a: { pl: 'OCR działa najlepiej na wyraźnych skanach. Problemy: (1) Niska rozdzielczość skanu — zeskanuj dokument w 300 DPI. (2) Krzywo zeskanowany tekst — wyprostuj strony przed OCR. (3) Ręczne pismo — OCR nie rozpoznaje odręcznego pisma. (4) Język dokumentu — narzędzie obsługuje wiele języków, ale najlepiej rozpoznaje polski i angielski. (5) Czcionki ozdobne — mogą być rozpoznawane błędnie.', en: 'OCR works best on clear scans. Issues: (1) Low scan resolution — scan at 300 DPI. (2) Crooked text — straighten pages before OCR. (3) Handwriting — OCR doesn\'t recognize handwriting. (4) Document language — the tool supports many languages but works best with Polish and English. (5) Decorative fonts — may be recognized incorrectly.' , de: 'OCR funktioniert am besten bei klaren Scans. Probleme: (1) Niedrige Scanauflösung – scannen Sie mit 300 DPI. (2) Schiefer Text – richten Sie die Seiten vor der OCR aus. (3) Handschrift – OCR erkennt keine Handschrift. (4) Dokumentsprache – das Werkzeug unterstützt viele Sprachen, funktioniert aber am besten mit Polnisch und Englisch. (5) Verzierte Schriftarten – können falsch erkannt werden.', es: 'El OCR funciona mejor con escaneos claros. Problemas: (1) Resolución de escaneo baja: escanee a 300 DPI. (2) Texto torcido: enderece las páginas antes del OCR. (3) Escritura a mano: el OCR no reconoce la escritura a mano. (4) Idioma del documento: la herramienta admite muchos idiomas, pero funciona mejor con polaco e inglés. (5) Fuentes decorativas: pueden reconocerse incorrectamente.'},
      },
      { key: 'html-noresponse', href: '/html-to-pdf', icon: '🌐',
        q: { pl: 'Konwersja URL do PDF nie działa?', en: 'URL to PDF conversion doesn\'t work?' , de: 'Die Konvertierung von URL zu PDF funktioniert nicht?', es: '¿La conversión de URL a PDF no funciona?'},
        a: { pl: 'Konwersja URL do PDF wymaga połączenia z serwerem i może nie działać dla stron z silnym zabezpieczeniem CORS. Strony wymagające logowania, z blokadą botów lub osadzone w ramkach (iframe) mogą nie zostać poprawnie przetworzone. Spróbuj skopiować treść strony i użyć opcji "HTML do PDF" zamiast URL.', en: 'URL to PDF requires a server connection and may not work for pages with strong CORS protection. Pages requiring login, with bot blocking or embedded in iframes may not process correctly. Try copying the page content and using "HTML to PDF" instead of URL.' , de: 'URL zu PDF erfordert eine Serververbindung und funktioniert möglicherweise nicht bei Seiten mit starkem CORS-Schutz. Seiten, die eine Anmeldung erfordern, Bots blockieren oder in iframes eingebettet sind, werden möglicherweise nicht korrekt verarbeitet. Versuchen Sie, den Seiteninhalt zu kopieren und anstelle von URL „HTML zu PDF“ zu verwenden.', es: 'URL a PDF requiere una conexión al servidor y puede no funcionar con páginas con fuerte protección CORS. Las páginas que requieren iniciar sesión, con bloqueo de bots o incrustadas en iframes pueden no procesarse correctamente. Intente copiar el contenido de la página y usar «HTML a PDF» en lugar de URL.'},
      },
      { key: 'epub-layout', href: '/pdf-to-epub', icon: '📖',
        q: { pl: 'EPUB z PDF wygląda inaczej niż oryginał?', en: 'EPUB from PDF looks different from the original?' , de: 'EPUB aus PDF sieht anders aus als das Original?', es: '¿El EPUB desde PDF se ve diferente del original?'},
        a: { pl: 'To normalne — EPUB jest formatem typu "reflowable" (płynny), gdzie tekst dostosowuje się do rozmiaru ekranu, podczas gdy PDF ma stały układ. Obrazy, tabele i złożone układy mogą być przesunięte. Jeśli zależy Ci na oryginalnym układzie, pozostań przy PDF. EPUB lepiej nadaje się do czytania na czytnikach ebooków i telefonach.', en: 'This is normal — EPUB is a reflowable format where text adapts to screen size, while PDF has a fixed layout. Images, tables and complex layouts may be shifted. If you need the original layout, stay with PDF. EPUB is better for reading on ebook readers and phones.' , de: 'Das ist normal – EPUB ist ein umfließendes (reflowable) Format, bei dem sich der Text an die Bildschirmgröße anpasst, während PDF ein festes Layout hat. Bilder, Tabellen und komplexe Layouts können verschoben sein. Wenn Sie das ursprüngliche Layout benötigen, bleiben Sie bei PDF. EPUB eignet sich besser zum Lesen auf E-Book-Readern und Smartphones.', es: 'Esto es normal: EPUB es un formato reflowable en el que el texto se adapta al tamaño de la pantalla, mientras que PDF tiene un diseño fijo. Las imágenes, tablas y diseños complejos pueden desplazarse. Si necesita el diseño original, quédese con el PDF. EPUB es mejor para leer en lectores de libros electrónicos y teléfonos.'},
      },
    ],
  },
  {
    key: 'secure', icon: '🔒',
    label: { pl: 'Zabezpieczenia PDF', en: 'PDF Security' , de: 'PDF-Sicherheit', es: 'Seguridad de PDF'},
    items: [
      { key: 'protect-password', href: '/protect-pdf', icon: '🔒',
        q: { pl: 'Nie mogę otworzyć pliku po zabezpieczeniu?', en: 'Can\'t open the file after protecting?' , de: 'Die Datei lässt sich nach dem Schützen nicht öffnen?', es: '¿No puede abrir el archivo después de protegerlo?'},
        a: { pl: 'Zapisz hasło w bezpiecznym miejscu! OptimaPDF nie przechowuje haseł i nie ma możliwości ich odzyskania. Jeśli zapomniałeś hasła, nie ma sposobu na otwarcie pliku. Zalecamy: (1) Używaj haseł, które pamiętasz. (2) Zapisz hasło w menedżerze haseł. (3) Przed zabezpieczeniem zrób kopię oryginalnego pliku bez hasła.', en: 'Save your password in a safe place! OptimaPDF does not store passwords and cannot recover them. If you forget your password, there is no way to open the file. We recommend: (1) Use passwords you can remember. (2) Save the password in a password manager. (3) Keep a backup of the original file before protecting.' , de: 'Bewahren Sie Ihr Passwort an einem sicheren Ort auf! OptimaPDF speichert keine Passwörter und kann sie nicht wiederherstellen. Wenn Sie Ihr Passwort vergessen, gibt es keine Möglichkeit, die Datei zu öffnen. Wir empfehlen: (1) Verwenden Sie Passwörter, die Sie sich merken können. (2) Speichern Sie das Passwort in einem Passwort-Manager. (3) Erstellen Sie vor dem Schützen eine Sicherungskopie der Originaldatei.', es: '¡Guarde su contraseña en un lugar seguro! OptimaPDF no almacena contraseñas y no puede recuperarlas. Si olvida su contraseña, no hay forma de abrir el archivo. Recomendamos: (1) usar contraseñas que pueda recordar. (2) Guardar la contraseña en un administrador de contraseñas. (3) Hacer una copia de seguridad del archivo original antes de protegerlo.'},
      },
      { key: 'unlock-fail', href: '/unlock-pdf', icon: '🔓',
        q: { pl: 'Odblokowanie PDF nie działa — złe hasło?', en: 'Unlock doesn\'t work — wrong password?' , de: 'Entsperren funktioniert nicht – falsches Passwort?', es: '¿El desbloqueo no funciona: contraseña incorrecta?'},
        a: { pl: 'Odblokowanie wymaga podania poprawnego hasła. Jeśli hasło jest poprawne, ale odblokowanie nie działa, plik może używać starszego lub rzadkiego typu szyfrowania. W takim przypadku spróbuj otworzyć PDF w Adobe Reader, wpisz hasło, a następnie zapisz kopię bez zabezpieczeń — i tą kopię przetwarzaj dalej.', en: 'Unlocking requires the correct password. If the password is correct but unlocking doesn\'t work, the file may use an older or rare encryption type. In that case, try opening the PDF in Adobe Reader, enter the password, then save an unprotected copy — and process that copy further.' , de: 'Zum Entsperren ist das richtige Passwort erforderlich. Wenn das Passwort korrekt ist, das Entsperren aber nicht funktioniert, verwendet die Datei möglicherweise einen älteren oder seltenen Verschlüsselungstyp. Öffnen Sie in diesem Fall das PDF in Adobe Reader, geben Sie das Passwort ein, speichern Sie dann eine ungeschützte Kopie – und verarbeiten Sie diese Kopie weiter.', es: 'El desbloqueo requiere la contraseña correcta. Si la contraseña es correcta pero el desbloqueo no funciona, el archivo puede usar un tipo de cifrado antiguo o poco común. En ese caso, intente abrir el PDF en Adobe Reader, introduzca la contraseña, guarde una copia sin protección y procese esa copia.'},
      },
      { key: 'sign-nosign', href: '/sign-pdf', icon: '🖊️',
        q: { pl: 'Podpis nie wyświetla się na stronie?', en: 'Signature doesn\'t appear on the page?' , de: 'Die Signatur erscheint nicht auf der Seite?', es: '¿La firma no aparece en la página?'},
        a: { pl: 'Sprawdź: (1) Czy wybrałeś poprawną stronę do podpisania? (2) Czy współrzędne X/Y mieszczą się w obszarze strony? (3) Dla dużych dokumentów podpis może być dodany na ostatniej stronie. Spróbuj użyć opcji szybkich pozycji (np. "Dół strony"). Jeśli podpis jest niewidoczny, być może kolor jest zbyt jasny — spróbuj użyć domyślnego koloru czarnego.', en: 'Check: (1) Did you select the correct page to sign? (2) Are the X/Y coordinates within the page area? (3) For large documents, the signature may be placed on the last page. Try using the quick position options (e.g. "Bottom of page"). If the signature is invisible, the color may be too light — try using the default black color.' , de: 'Prüfen Sie: (1) Haben Sie die richtige Seite zum Signieren ausgewählt? (2) Liegen die X/Y-Koordinaten innerhalb des Seitenbereichs? (3) Bei großen Dokumenten kann die Signatur auf der letzten Seite platziert werden. Verwenden Sie die Schnellpositionsoptionen (z. B. „Unten auf der Seite“). Wenn die Signatur unsichtbar ist, ist die Farbe möglicherweise zu hell – verwenden Sie die Standardfarbe Schwarz.', es: 'Compruebe: (1) ¿Seleccionó la página correcta para firmar? (2) ¿Están las coordenadas X/Y dentro del área de la página? (3) Para documentos grandes, la firma puede colocarse en la última página. Pruebe a usar las opciones de posición rápida (p. ej., «Abajo de la página»). Si la firma es invisible, el color puede ser demasiado claro: intente usar el color negro predeterminado.'},
      },
      { key: 'fillform-notinteractive', href: '/fill-form', icon: '📝',
        q: { pl: 'Formularz PDF nie ma pól do wypełnienia?', en: 'The PDF form has no fillable fields?' , de: 'Das PDF-Formular hat keine ausfüllbaren Felder?', es: '¿El formulario PDF no tiene campos rellenables?'},
        a: { pl: 'Narzędzie wypełnia tylko interaktywne formularze AcroForm. Jeśli PDF wygląda jak formularz, ale nie ma pól, to prawdopodobnie jest to skan lub obraz — w takim przypadku użyj opcji edycji (dodaj tekst ręcznie) lub OCR, aby rozpoznać tekst. Niektóre formularze wypełniane w programie Adobe Reader mogą nie być rozpoznawane jako AcroForm.', en: 'The tool only fills interactive AcroForm forms. If the PDF looks like a form but has no fields, it\'s likely a scan or image — in that case, use the edit tool (add text manually) or OCR to recognize text. Some forms filled in Adobe Reader may not be recognized as AcroForm.' , de: 'Das Werkzeug füllt nur interaktive AcroForm-Formulare aus. Wenn das PDF wie ein Formular aussieht, aber keine Felder hat, handelt es sich wahrscheinlich um einen Scan oder ein Bild – verwenden Sie in diesem Fall das Bearbeitungswerkzeug (Text manuell hinzufügen) oder OCR, um Text zu erkennen. Einige in Adobe Reader ausgefüllte Formulare werden möglicherweise nicht als AcroForm erkannt.', es: 'La herramienta solo rellena formularios AcroForm interactivos. Si el PDF parece un formulario pero no tiene campos, probablemente sea un escaneo o una imagen: en ese caso, use la herramienta de edición (añada texto manualmente) o el OCR para reconocer el texto. Algunos formularios rellenados en Adobe Reader pueden no reconocerse como AcroForm.'},
      },
      { key: 'pdfa-error', href: '/to-pdfa', icon: '📦',
        q: { pl: 'Konwersja do PDF/A zgłasza błąd?', en: 'PDF/A conversion reports an error?' , de: 'Die Konvertierung zu PDF/A meldet einen Fehler?', es: '¿La conversión a PDF/A informa de un error?'},
        a: { pl: 'Konwersja do PDF/A wykonuje "best-effort" — nie gwarantuje 100% zgodności ze standardem. Problemy mogą wystąpić dla plików z: (1) osadzonymi czcionkami bez licencji, (2) zaawansowanymi formularzami, (3) multimediami (audio, wideo). Mimo błędu plik może działać poprawnie w większości programów do archiwizacji.', en: 'PDF/A conversion is "best-effort" — it doesn\'t guarantee 100% standard compliance. Issues may occur for files with: (1) embedded fonts without license, (2) advanced forms, (3) multimedia (audio, video). Despite the error, the file may work correctly in most archiving programs.' , de: 'Die Konvertierung zu PDF/A ist eine „Best-Effort“-Konvertierung – sie garantiert keine 100%ige Konformität mit dem Standard. Probleme können bei Dateien auftreten mit: (1) eingebetteten Schriften ohne Lizenz, (2) erweiterten Formularen, (3) Multimedia (Audio, Video). Trotz des Fehlers kann die Datei in den meisten Archivierungsprogrammen korrekt funktionieren.', es: 'La conversión a PDF/A es de «mejor esfuerzo»: no garantiza una conformidad del 100 % con el estándar. Pueden surgir problemas con archivos que tengan: (1) fuentes incrustadas sin licencia, (2) formularios avanzados, (3) multimedia (audio, vídeo). A pesar del error, el archivo puede funcionar correctamente en la mayoría de los programas de archivado.'},
      },
    ],
  },
  {
    key: 'ai', icon: '🤖',
    label: { pl: 'Narzędzia AI', en: 'AI Tools' , de: 'KI-Werkzeuge', es: 'Herramientas de IA'},
    items: [
      { key: 'aikey', href: '/ai-chat', icon: '🔑',
        q: { pl: 'Jak zdobyć klucz API OpenRouter?', en: 'How to get an OpenRouter API key?' , de: 'Wie erhalte ich einen OpenRouter-API-Schlüssel?', es: '¿Cómo obtener una clave API de OpenRouter?'},
        a: { pl: 'Narzędzia AI wymagają własnego klucza API OpenRouter. Aby go zdobyć: (1) Wejdź na https://openrouter.ai/keys. (2) Zarejestruj się lub zaloguj. (3) Kliknij "Create Key". (4) Skopiuj klucz (zaczyna się od "sk-or-v1-..."). (5) Wklej go w polu klucza na stronie narzędzia AI. OpenRouter oferuje darmowy limit zapytań dla nowych użytkowników.', en: 'AI tools require your own OpenRouter API key. To get one: (1) Go to https://openrouter.ai/keys. (2) Register or log in. (3) Click "Create Key". (4) Copy the key (starts with "sk-or-v1-..."). (5) Paste it in the key field on the AI tool page. OpenRouter offers a free query limit for new users.' , de: 'KI-Werkzeuge erfordern einen eigenen OpenRouter-API-Schlüssel. So erhalten Sie einen: (1) Gehen Sie zu https://openrouter.ai/keys. (2) Registrieren Sie sich oder melden Sie sich an. (3) Klicken Sie auf „Create Key“. (4) Kopieren Sie den Schlüssel (beginnt mit „sk-or-v1-...“). (5) Fügen Sie ihn in das Schlüsselfeld auf der KI-Werkzeugseite ein. OpenRouter bietet neuen Benutzern ein kostenloses Abfragelimit.', es: 'Las herramientas de IA requieren su propia clave API de OpenRouter. Para obtenerla: (1) Vaya a https://openrouter.ai/keys. (2) Regístrese o inicie sesión. (3) Haga clic en «Crear clave». (4) Copie la clave (empieza por «sk-or-v1-...»). (5) Péguela en el campo de clave de la página de la herramienta de IA. OpenRouter ofrece un límite gratuito de consultas para nuevos usuarios.'},
      },
      { key: 'ai-slow', href: '/ai-chat', icon: '⏳',
        q: { pl: 'AI odpowiada bardzo wolno?', en: 'AI responds very slowly?' , de: 'KI antwortet sehr langsam?', es: '¿La IA responde muy lentamente?'},
        a: { pl: 'Szybkość odpowiedzi AI zależy od: (1) Wybranego modelu — większe modele (np. Llama 70B) są wolniejsze. (2) Długości dokumentu — im więcej tekstu, tym dłuższa analiza. (3) Obciążenia serwerów OpenRouter. (4) Jakości Twojego połączenia internetowego. Jeśli jest zbyt wolno, spróbuj użyć mniejszego modelu AI.', en: 'AI response speed depends on: (1) The selected model — larger models (e.g. Llama 70B) are slower. (2) Document length — more text means longer analysis. (3) OpenRouter server load. (4) Your internet connection quality. If too slow, try using a smaller AI model.' , de: 'Die Antwortgeschwindigkeit der KI hängt ab von: (1) dem ausgewählten Modell – größere Modelle (z. B. Llama 70B) sind langsamer, (2) der Dokumentlänge – mehr Text bedeutet eine längere Analyse, (3) der Auslastung der OpenRouter-Server, (4) der Qualität Ihrer Internetverbindung. Wenn es zu langsam ist, versuchen Sie, ein kleineres KI-Modell zu verwenden.', es: 'La velocidad de respuesta de la IA depende de: (1) el modelo seleccionado: los modelos más grandes (p. ej., Llama 70B) son más lentos. (2) La longitud del documento: más texto significa un análisis más largo. (3) La carga de los servidores de OpenRouter. (4) La calidad de su conexión a internet. Si es demasiado lenta, intente usar un modelo de IA más pequeño.'},
      },
      { key: 'ai-wrong', href: '/ai-summary', icon: '❌',
        q: { pl: 'AI podaje niepoprawne informacje?', en: 'AI gives incorrect information?' , de: 'KI liefert falsche Informationen?', es: '¿La IA ofrece información incorrecta?'},
        a: { pl: 'Modele AI mogą się mylić lub "halucynować" — podawać informacje, które brzmią wiarygodnie, ale są nieprawdziwe. Zawsze weryfikuj odpowiedzi AI z oryginalnym dokumentem. AI najlepiej sprawdza się w: streszczaniu, wyszukiwaniu konkretnych informacji i generowaniu podsumowań. Nie ufaj AI w 100% przy ważnych dokumentach.', en: 'AI models can make mistakes or "hallucinate" — provide information that sounds plausible but is incorrect. Always verify AI answers against the original document. AI works best for: summarizing, finding specific information and generating overviews. Don\'t trust AI 100% for important documents.' , de: 'KI-Modelle können Fehler machen oder „halluzinieren“ – Informationen liefern, die plausibel klingen, aber falsch sind. Überprüfen Sie KI-Antworten immer am Originaldokument. KI funktioniert am besten beim Zusammenfassen, Finden bestimmter Informationen und Erstellen von Übersichten. Vertrauen Sie bei wichtigen Dokumenten nicht zu 100 % der KI.', es: 'Los modelos de IA pueden cometer errores o «alucinar»: ofrecer información que parece plausible pero es incorrecta. Verifique siempre las respuestas de la IA con el documento original. La IA funciona mejor para: resumir, encontrar información específica y generar resúmenes. No confíe al 100 % en la IA para documentos importantes.'},
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
