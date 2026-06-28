'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

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
  label: { pl: string; en: string };
  items: HelpItem[];
}

const helpData: HelpCategory[] = [
  {
    key: 'general', icon: '⚠️',
    label: { pl: 'Problemy ogólne', en: 'General Issues' },
    items: [
      { key: 'largefile', href: '#', icon: '📦',
        q: { pl: 'Plik PDF jest za duży i nie chce się załadować?', en: 'The PDF file is too large and won\'t load?' },
        a: { pl: 'Jeśli plik ma kilkadziesiąt MB i strona działa wolno, spróbuj: (1) otworzyć plik w lżejszej przeglądarce (Chrome lub Edge). (2) Zamknąć inne karty, aby zwolnić pamięć RAM. (3) Użyć mniejszego pliku lub najpierw skompresować go za pomocą narzędzia Kompresuj PDF. (4) W ostateczności podzielić duży plik na mniejsze części przed przetwarzaniem.', en: 'If the file is several dozen MB and the page runs slow, try: (1) Open the file in a lighter browser (Chrome or Edge). (2) Close other tabs to free up RAM. (3) Use a smaller file or first compress it with the Compress PDF tool. (4) As a last resort, split the large file into smaller parts before processing.' },
      },
      { key: 'notpdf', href: '#', icon: '📄',
        q: { pl: 'Plik nie jest rozpoznawany jako PDF?', en: 'File is not recognized as PDF?' },
        a: { pl: 'Upewnij się, że plik ma rozszerzenie .pdf. Jeśli plik faktycznie jest PDF, ale nie chce się otworzyć, mógł zostać uszkodzony. Spróbuj otworzyć go w innym programie (Adobe Reader, przeglądarka). Jeśli działa w innych programach, zgłoś problem — możliwe, że plik używa niestandardowych funkcji PDF, które nie są obsługiwane.', en: 'Make sure the file has a .pdf extension. If the file is actually a PDF but won\'t open, it may be corrupted. Try opening it in another program (Adobe Reader, browser). If it works in other programs, report the issue — the file may use non-standard PDF features not yet supported.' },
      },
      { key: 'memory', href: '#', icon: '💾',
        q: { pl: 'Strona wyświetla błąd pamięci lub zawiesza się?', en: 'The page shows a memory error or freezes?' },
        a: { pl: 'Narzędzia działają w całości w przeglądarce, więc duże pliki mogą przekroczyć dostępną pamięć RAM. Rozwiązania: (1) Użyj przeglądarki Chrome/Edge — mają lepszą obsługę pamięci. (2) Zamknij inne programy i karty. (3) Przetwarzaj mniejsze pliki. (4) Jeśli problem występuje stale, spróbuj zaktualizować przeglądarkę.', en: 'All tools run entirely in the browser, so large files may exceed available RAM. Solutions: (1) Use Chrome/Edge — they handle memory better. (2) Close other programs and tabs. (3) Process smaller files. (4) If the issue persists, try updating your browser.' },
      },
      { key: 'save', href: '#', icon: '💿',
        q: { pl: 'Nie mogę zapisać wynikowego pliku?', en: 'Can\'t save the resulting file?' },
        a: { pl: 'Jeśli po przetworzeniu plik nie pobiera się automatycznie: (1) Sprawdź, czy przeglądarka nie blokuje pobierania (iconka w pasku adresu). (2) Kliknij przycisk pobierania ręcznie, jeśli jest dostępny. (3) Spróbuj użyć innej przeglądarki. (4) Upewnij się, że masz wystarczająco miejsca na dysku.', en: 'If the file doesn\'t download automatically after processing: (1) Check if your browser is blocking downloads (icon in the address bar). (2) Click the download button manually if available. (3) Try a different browser. (4) Make sure you have enough disk space.' },
      },
      { key: 'wrongbrowser', href: '#', icon: '🌐',
        q: { pl: 'Które przeglądarki są obsługiwane?', en: 'Which browsers are supported?' },
        a: { pl: 'Narzędzia działają w każdej nowoczesnej przeglądarce: Chrome, Edge, Firefox, Opera, Safari (wersje z ostatnich 2 lat). Najlepszą wydajność oferują Chrome i Edge. Starsze przeglądarki (Internet Explorer, stare wersje Safari) nie są obsługiwane.', en: 'The tools work in all modern browsers: Chrome, Edge, Firefox, Opera, Safari (versions from the last 2 years). Best performance is in Chrome and Edge. Older browsers (Internet Explorer, old Safari versions) are not supported.' },
      },
    ],
  },
  {
    key: 'edit', icon: '✏️',
    label: { pl: 'Edycja PDF', en: 'Edit PDF' },
    items: [
      { key: 'merge-slow', href: '/merge', icon: '🔗',
        q: { pl: 'Scalanie wielu plików działa wolno?', en: 'Merging many files is slow?' },
        a: { pl: 'Scalanie kilkudziesięciu plików lub plików z wieloma stronami może chwilę potrwać — wszystko dzieje się lokalnie w przeglądarce. Czas zależy od mocy Twojego procesora i ilości pamięci RAM. Dla bardzo dużych plików (ponad 100 stron) zalecamy przetwarzanie w partiach.', en: 'Merging dozens of files or files with many pages may take a moment — everything runs locally in your browser. Time depends on your CPU power and RAM. For very large files (over 100 pages), we recommend processing in batches.' },
      },
      { key: 'split-wrong', href: '/split', icon: '✂️',
        q: { pl: 'Dzielenie nie wyodrębnia poprawnych stron?', en: 'Split is not extracting the right pages?' },
        a: { pl: 'Upewnij się, że używasz poprawnego formatu zakresów. Przykłady: "1-5" (strony od 1 do 5), "1,3,5" (konkretne strony), "1-5,8,10-15" (mieszane). Strony numerowane są od 1. Jeśli używasz trybu "Co N stron", liczba oznacza, że co N-ta strona zostanie wydzielona.', en: 'Make sure you\'re using the correct range format. Examples: "1-5" (pages 1 through 5), "1,3,5" (specific pages), "1-5,8,10-15" (mixed). Pages are numbered starting from 1. If using "Every N pages" mode, the number means every Nth page will be extracted.' },
      },
      { key: 'compress-nochange', href: '/compress', icon: '🗜️',
        q: { pl: 'Kompresja nie zmniejsza rozmiaru pliku?', en: 'Compression doesn\'t reduce file size?' },
        a: { pl: 'Jeśli plik PDF zawiera głównie tekst (a nie obrazy), kompresja może nie przynieść znaczącej różnicy — tekst już jest mocno skompresowany. PDF z obrazami skompresuje się lepiej. Spróbuj wybrać wyższy poziom kompresji. Jeśli plik jest już zoptymalizowany, dalsza kompresja może być niemożliwa.', en: 'If the PDF contains mostly text (not images), compression may not make a significant difference — text is already highly compressed. Image-based PDFs will compress better. Try a higher compression level. If the file is already optimized, further compression may not be possible.' },
      },
      { key: 'crop-wrong', href: '/crop-pdf', icon: '📐',
        q: { pl: 'Przycięcie usuwa złe fragmenty strony?', en: 'Cropping removes the wrong parts of the page?' },
        a: { pl: 'Wartości marginesów są podawane w punktach (pt). Domyślnie przycięcie 50pt z każdej strony. Dla strony A4 (595x842pt) spróbuj: lewy/prawy 30pt, górny/dolny 40pt. Możesz podejrzeć efekt przed zapisaniem. Jeśli chcesz przyciąć tylko wybrane strony, użyj opcji wyboru stron przed przycięciem.', en: 'Margin values are given in points (pt). Default crops 50pt from each side. For an A4 page (595x842pt) try: left/right 30pt, top/bottom 40pt. You can preview the result before saving. To crop only selected pages, use the page selection option before cropping.' },
      },
      { key: 'watermark-notvisible', href: '/watermark-pdf', icon: '💧',
        q: { pl: 'Znak wodny jest niewidoczny lub zbyt duży?', en: 'Watermark is invisible or too large?' },
        a: { pl: 'Domyślna przezroczystość znaku wodnego to 30%. Jeśli znak jest niewidoczny, zmniejsz przezroczystość (wyższa wartość = bardziej widoczny). Jeśli tekst jest za duży, zmniejsz rozmiar czcionki. Możesz też zmienić kąt nachylenia i pozycję — eksperymentuj z ustawieniami, aby dopasować do swojego dokumentu.', en: 'Default watermark opacity is 30%. If the watermark is invisible, decrease opacity (higher value = more visible). If text is too large, reduce font size. You can also change the rotation angle and position — experiment with settings to match your document.' },
      },
      { key: 'redact-notworking', href: '/redact-pdf', icon: '✍️',
        q: { pl: 'Redakcja nie zakrywa tekstu poprawnie?', en: 'Redaction doesn\'t cover text correctly?' },
        a: { pl: 'Redakcja działa poprzez zakrycie wybranego obszaru czarnym prostokątem. Upewnij się, że prostokąt w pełni pokrywa tekst, który chcesz usunąć. Redakcja jest trwała — po zapisaniu nie można cofnąć tej operacji. Zawsze rób kopię oryginalnego pliku przed redakcją.', en: 'Redaction works by covering the selected area with a black rectangle. Make sure the rectangle fully covers the text you want to remove. Redaction is permanent — once saved, this operation cannot be undone. Always keep a copy of the original file before redacting.' },
      },
      { key: 'pagenumbers-position', href: '/page-numbers', icon: '🔢',
        q: { pl: 'Numery stron nakładają się na treść?', en: 'Page numbers overlap with content?' },
        a: { pl: 'Jeśli numery stron nachodzą na treść dokumentu, spróbuj zmienić pozycję (góra/dół) lub wyrównanie (lewo/prawo). Możesz też zmienić rozmiar czcionki na mniejszy. Dla dokumentów z małymi marginesami wybierz pozycję "Dół" z wyrównaniem do prawej.', en: 'If page numbers overlap with document content, try changing the position (top/bottom) or alignment (left/right). You can also reduce the font size. For documents with small margins, choose "Bottom" position with right alignment.' },
      },
      { key: 'edit-addtext', href: '/edit-pdf', icon: '✏️',
        q: { pl: 'Dodany tekst nie wygląda tak jak w oryginalnym dokumencie?', en: 'Added text doesn\'t match the original document?' },
        a: { pl: 'Edytor PDF umożliwia dodawanie nowego tekstu, ale nie edycję istniejącego. Nowy tekst może różnić się czcionką od oryginału, ponieważ używamy standardowych czcionek (Helvetica, Times, Courier). Aby edytować istniejący tekst, skorzystaj z konwersji PDF do Word, edytuj w Wordzie, a potem zapisz jako PDF.', en: 'The PDF Editor lets you add new text but not edit existing text. New text may differ in font from the original since we use standard fonts (Helvetica, Times, Courier). To edit existing text, convert PDF to Word, edit in Word, then save as PDF.' },
      },
    ],
  },
  {
    key: 'convert', icon: '🔄',
    label: { pl: 'Konwersja PDF', en: 'Convert PDF' },
    items: [
      { key: 'word-formatting', href: '/pdf-to-word', icon: '📑',
        q: { pl: 'Konwersja PDF do Word traci formatowanie?', en: 'PDF to Word conversion loses formatting?' },
        a: { pl: 'Pewna utrata formatowania przy konwersji PDF do Word jest naturalna — PDF nie przechowuje informacji o stylach tak jak dokument Word. Tabele, kolumny i zaawansowane układy mogą wymagać ręcznej korekty w Wordzie. Im prostszy układ PDF, tym lepszy wynik konwersji.', en: 'Some formatting loss during PDF to Word conversion is normal — PDF doesn\'t store style information like a Word document. Tables, columns and complex layouts may need manual adjustment in Word. The simpler the PDF layout, the better the conversion result.' },
      },
      { key: 'images-quality', href: '/pdf-to-images', icon: '🖼️',
        q: { pl: 'Jakość obrazów z PDF jest niska?', en: 'Image quality from PDF is low?' },
        a: { pl: 'Domyślna rozdzielczość to 150 DPI. Jeśli potrzebujesz wyższej jakości, przed konwersją dostosuj ustawienia — zwiększ skalę (Scale) do 3 lub 4. Dla tekstu wystarczy skala 2, dla zdjęć i grafik warto użyć skali 3-4. Przy bardzo dużym powiększeniu obrazy JPG mogą być rozmazane — wybierz wtedy format PNG.', en: 'Default resolution is 150 DPI. If you need higher quality, adjust settings before conversion — increase Scale to 3 or 4. For text, scale 2 is sufficient; for photos and graphics, use scale 3-4. Images may appear blurry at very high zoom with JPG — choose PNG format instead.' },
      },
      { key: 'excel-tables', href: '/pdf-to-excel', icon: '📊',
        q: { pl: 'Tabele z PDF nie przenoszą się poprawnie do Excela?', en: 'Tables from PDF don\'t transfer correctly to Excel?' },
        a: { pl: 'Konwersja tabel z PDF do Excela działa najlepiej dla prostych tabel. Złożone tabele z połączonymi komórkami, kolorami i niestandardowym formatowaniem mogą wymagać ręcznej korekty. Jeśli dane są wyświetlane w jednej kolumnie zamiast w tabeli, spróbuj najpierw wyeksportować PDF do TXT, a potem zaimportować do Excela z podziałem na kolumny.', en: 'PDF to Excel table conversion works best for simple tables. Complex tables with merged cells, colors and custom formatting may need manual adjustment. If data appears in one column instead of a table, try exporting PDF to TXT first, then import to Excel with column splitting.' },
      },
      { key: 'ocr-notext', href: '/ocr-pdf', icon: '🔍',
        q: { pl: 'OCR nie rozpoznaje tekstu lub rozpoznaje go błędnie?', en: 'OCR doesn\'t recognize text or recognizes it incorrectly?' },
        a: { pl: 'OCR działa najlepiej na wyraźnych skanach. Problemy: (1) Niska rozdzielczość skanu — zeskanuj dokument w 300 DPI. (2) Krzywo zeskanowany tekst — wyprostuj strony przed OCR. (3) Ręczne pismo — OCR nie rozpoznaje odręcznego pisma. (4) Język dokumentu — narzędzie obsługuje wiele języków, ale najlepiej rozpoznaje polski i angielski. (5) Czcionki ozdobne — mogą być rozpoznawane błędnie.', en: 'OCR works best on clear scans. Issues: (1) Low scan resolution — scan at 300 DPI. (2) Crooked text — straighten pages before OCR. (3) Handwriting — OCR doesn\'t recognize handwriting. (4) Document language — the tool supports many languages but works best with Polish and English. (5) Decorative fonts — may be recognized incorrectly.' },
      },
      { key: 'html-noresponse', href: '/html-to-pdf', icon: '🌐',
        q: { pl: 'Konwersja URL do PDF nie działa?', en: 'URL to PDF conversion doesn\'t work?' },
        a: { pl: 'Konwersja URL do PDF wymaga połączenia z serwerem i może nie działać dla stron z silnym zabezpieczeniem CORS. Strony wymagające logowania, z blokadą botów lub osadzone w ramkach (iframe) mogą nie zostać poprawnie przetworzone. Spróbuj skopiować treść strony i użyć opcji "HTML do PDF" zamiast URL.', en: 'URL to PDF requires a server connection and may not work for pages with strong CORS protection. Pages requiring login, with bot blocking or embedded in iframes may not process correctly. Try copying the page content and using "HTML to PDF" instead of URL.' },
      },
      { key: 'epub-layout', href: '/pdf-to-epub', icon: '📖',
        q: { pl: 'EPUB z PDF wygląda inaczej niż oryginał?', en: 'EPUB from PDF looks different from the original?' },
        a: { pl: 'To normalne — EPUB jest formatem typu "reflowable" (płynny), gdzie tekst dostosowuje się do rozmiaru ekranu, podczas gdy PDF ma stały układ. Obrazy, tabele i złożone układy mogą być przesunięte. Jeśli zależy Ci na oryginalnym układzie, pozostań przy PDF. EPUB lepiej nadaje się do czytania na czytnikach ebooków i telefonach.', en: 'This is normal — EPUB is a reflowable format where text adapts to screen size, while PDF has a fixed layout. Images, tables and complex layouts may be shifted. If you need the original layout, stay with PDF. EPUB is better for reading on ebook readers and phones.' },
      },
    ],
  },
  {
    key: 'secure', icon: '🔒',
    label: { pl: 'Zabezpieczenia PDF', en: 'PDF Security' },
    items: [
      { key: 'protect-password', href: '/protect-pdf', icon: '🔒',
        q: { pl: 'Nie mogę otworzyć pliku po zabezpieczeniu?', en: 'Can\'t open the file after protecting?' },
        a: { pl: 'Zapisz hasło w bezpiecznym miejscu! OptimaPDF nie przechowuje haseł i nie ma możliwości ich odzyskania. Jeśli zapomniałeś hasła, nie ma sposobu na otwarcie pliku. Zalecamy: (1) Używaj haseł, które pamiętasz. (2) Zapisz hasło w menedżerze haseł. (3) Przed zabezpieczeniem zrób kopię oryginalnego pliku bez hasła.', en: 'Save your password in a safe place! OptimaPDF does not store passwords and cannot recover them. If you forget your password, there is no way to open the file. We recommend: (1) Use passwords you can remember. (2) Save the password in a password manager. (3) Keep a backup of the original file before protecting.' },
      },
      { key: 'unlock-fail', href: '/unlock-pdf', icon: '🔓',
        q: { pl: 'Odblokowanie PDF nie działa — złe hasło?', en: 'Unlock doesn\'t work — wrong password?' },
        a: { pl: 'Odblokowanie wymaga podania poprawnego hasła. Jeśli hasło jest poprawne, ale odblokowanie nie działa, plik może używać starszego lub rzadkiego typu szyfrowania. W takim przypadku spróbuj otworzyć PDF w Adobe Reader, wpisz hasło, a następnie zapisz kopię bez zabezpieczeń — i tą kopię przetwarzaj dalej.', en: 'Unlocking requires the correct password. If the password is correct but unlocking doesn\'t work, the file may use an older or rare encryption type. In that case, try opening the PDF in Adobe Reader, enter the password, then save an unprotected copy — and process that copy further.' },
      },
      { key: 'sign-nosign', href: '/sign-pdf', icon: '🖊️',
        q: { pl: 'Podpis nie wyświetla się na stronie?', en: 'Signature doesn\'t appear on the page?' },
        a: { pl: 'Sprawdź: (1) Czy wybrałeś poprawną stronę do podpisania? (2) Czy współrzędne X/Y mieszczą się w obszarze strony? (3) Dla dużych dokumentów podpis może być dodany na ostatniej stronie. Spróbuj użyć opcji szybkich pozycji (np. "Dół strony"). Jeśli podpis jest niewidoczny, być może kolor jest zbyt jasny — spróbuj użyć domyślnego koloru czarnego.', en: 'Check: (1) Did you select the correct page to sign? (2) Are the X/Y coordinates within the page area? (3) For large documents, the signature may be placed on the last page. Try using the quick position options (e.g. "Bottom of page"). If the signature is invisible, the color may be too light — try using the default black color.' },
      },
      { key: 'fillform-notinteractive', href: '/fill-form', icon: '📝',
        q: { pl: 'Formularz PDF nie ma pól do wypełnienia?', en: 'The PDF form has no fillable fields?' },
        a: { pl: 'Narzędzie wypełnia tylko interaktywne formularze AcroForm. Jeśli PDF wygląda jak formularz, ale nie ma pól, to prawdopodobnie jest to skan lub obraz — w takim przypadku użyj opcji edycji (dodaj tekst ręcznie) lub OCR, aby rozpoznać tekst. Niektóre formularze wypełniane w programie Adobe Reader mogą nie być rozpoznawane jako AcroForm.', en: 'The tool only fills interactive AcroForm forms. If the PDF looks like a form but has no fields, it\'s likely a scan or image — in that case, use the edit tool (add text manually) or OCR to recognize text. Some forms filled in Adobe Reader may not be recognized as AcroForm.' },
      },
      { key: 'pdfa-error', href: '/to-pdfa', icon: '📦',
        q: { pl: 'Konwersja do PDF/A zgłasza błąd?', en: 'PDF/A conversion reports an error?' },
        a: { pl: 'Konwersja do PDF/A wykonuje "best-effort" — nie gwarantuje 100% zgodności ze standardem. Problemy mogą wystąpić dla plików z: (1) osadzonymi czcionkami bez licencji, (2) zaawansowanymi formularzami, (3) multimediami (audio, wideo). Mimo błędu plik może działać poprawnie w większości programów do archiwizacji.', en: 'PDF/A conversion is "best-effort" — it doesn\'t guarantee 100% standard compliance. Issues may occur for files with: (1) embedded fonts without license, (2) advanced forms, (3) multimedia (audio, video). Despite the error, the file may work correctly in most archiving programs.' },
      },
    ],
  },
  {
    key: 'ai', icon: '🤖',
    label: { pl: 'Narzędzia AI', en: 'AI Tools' },
    items: [
      { key: 'aikey', href: '/ai-chat', icon: '🔑',
        q: { pl: 'Jak zdobyć klucz API OpenRouter?', en: 'How to get an OpenRouter API key?' },
        a: { pl: 'Narzędzia AI wymagają własnego klucza API OpenRouter. Aby go zdobyć: (1) Wejdź na https://openrouter.ai/keys. (2) Zarejestruj się lub zaloguj. (3) Kliknij "Create Key". (4) Skopiuj klucz (zaczyna się od "sk-or-v1-..."). (5) Wklej go w polu klucza na stronie narzędzia AI. OpenRouter oferuje darmowy limit zapytań dla nowych użytkowników.', en: 'AI tools require your own OpenRouter API key. To get one: (1) Go to https://openrouter.ai/keys. (2) Register or log in. (3) Click "Create Key". (4) Copy the key (starts with "sk-or-v1-..."). (5) Paste it in the key field on the AI tool page. OpenRouter offers a free query limit for new users.' },
      },
      { key: 'ai-slow', href: '/ai-chat', icon: '⏳',
        q: { pl: 'AI odpowiada bardzo wolno?', en: 'AI responds very slowly?' },
        a: { pl: 'Szybkość odpowiedzi AI zależy od: (1) Wybranego modelu — większe modele (np. Llama 70B) są wolniejsze. (2) Długości dokumentu — im więcej tekstu, tym dłuższa analiza. (3) Obciążenia serwerów OpenRouter. (4) Jakości Twojego połączenia internetowego. Jeśli jest zbyt wolno, spróbuj użyć mniejszego modelu AI.', en: 'AI response speed depends on: (1) The selected model — larger models (e.g. Llama 70B) are slower. (2) Document length — more text means longer analysis. (3) OpenRouter server load. (4) Your internet connection quality. If too slow, try using a smaller AI model.' },
      },
      { key: 'ai-wrong', href: '/ai-summary', icon: '❌',
        q: { pl: 'AI podaje niepoprawne informacje?', en: 'AI gives incorrect information?' },
        a: { pl: 'Modele AI mogą się mylić lub "halucynować" — podawać informacje, które brzmią wiarygodnie, ale są nieprawdziwe. Zawsze weryfikuj odpowiedzi AI z oryginalnym dokumentem. AI najlepiej sprawdza się w: streszczaniu, wyszukiwaniu konkretnych informacji i generowaniu podsumowań. Nie ufaj AI w 100% przy ważnych dokumentach.', en: 'AI models can make mistakes or "hallucinate" — provide information that sounds plausible but is incorrect. Always verify AI answers against the original document. AI works best for: summarizing, finding specific information and generating overviews. Don\'t trust AI 100% for important documents.' },
      },
    ],
  },
];

export default function HelpPage() {
  const { locale } = useLocale();
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
