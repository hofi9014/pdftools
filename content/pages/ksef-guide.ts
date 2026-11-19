// "Jak otworzyć fakturę XML z KSeF i zapisać ją jako PDF" — a Polish-only guide under the KSeF tool
// (/pl/ksef-xml-na-pdf/jak-otworzyc-fakture-xml). Every statement about KSeF comes from the
// Ministry of Finance pages listed in KSEF_GUIDE_SOURCES (read 2026-11-18); every statement about
// the tool matches lib/ksef and components/ksef/KsefTool.tsx (tests/ksef-guide.mts checks the
// facts that can be checked in code). Not said on purpose, because the MF pages do not say it:
// how long KSeF keeps invoices, and whether a received invoice can be downloaded there as a PDF.

import { KSEF_GUIDE_PATH, KSEF_PATH, KSEF_TOOL_NAME } from '@/lib/ksef/route';

export const KSEF_GUIDE_TITLE = 'Jak otworzyć fakturę XML z KSeF i zapisać ją jako PDF';
export const KSEF_GUIDE_DESCRIPTION =
  'Faktura z KSeF to plik XML. Wyjaśniamy, skąd go wziąć, jak zobaczyć go jako zwykłą fakturę i zapisać do PDF – bez logowania – oraz kiedy potrzebny jest kod QR.';
export const KSEF_GUIDE_PUBLISHED = '2026-11-19';
export const KSEF_GUIDE_UPDATED = '2026-11-19';

export type GuideInline = string | { href: string; text: string };
export type GuideBlock =
  | { t: 'h2'; id: string; text: string }
  | { t: 'p'; parts: GuideInline[] }
  | { t: 'ul'; items: GuideInline[][] }
  | { t: 'steps'; items: { title: string; text: string }[] }
  | { t: 'figure'; src: string; alt: string; width: number; height: number; caption: string }
  | { t: 'table'; caption: string; head: string[]; rows: string[][] }
  | { t: 'cta'; text: string };

const MF_QR = 'https://ksef.podatki.gov.pl/informacje-ogolne-ksef-20/kody-weryfikujace-qr/';
const MF_FA = 'https://ksef.podatki.gov.pl/informacje-ogolne-ksef-20/faktura-ustrukturyzowana-i-struktura-logiczna-fa/';
const MF_APPS = 'https://ksef.podatki.gov.pl/aplikacja-podatnika-ksef-i-inne-narzedzia/';
const MF_STAGES = 'https://ksef.podatki.gov.pl/etapy-wdrozenia-ksef';

export const KSEF_GUIDE_LEAD =
  'Dostałeś fakturę jako plik .xml i po otwarciu widzisz tylko znaczniki i liczby? To normalne: faktura z KSeF jest zapisana w formacie XML, czytelnym dla programów, a nie dla ludzi. Poniżej wyjaśniamy, skąd się bierze taki plik, jak zobaczyć go jako zwykłą fakturę i zapisać do PDF oraz na co uważać.';

export const KSEF_GUIDE_BODY: GuideBlock[] = [
  { t: 'h2', id: 'dlaczego-xml', text: 'Dlaczego faktura z KSeF jest plikiem XML' },
  {
    t: 'p',
    parts: [
      'Faktura wystawiona w Krajowym Systemie e-Faktur to tzw. faktura ustrukturyzowana. Według Ministerstwa Finansów przyjmuje ona format XML zgodny ze strukturą logiczną opublikowaną przez resort. Od 1 lutego 2026 r. wszystkie nowe faktury ustrukturyzowane wystawia się wyłącznie w strukturze FA(3); starsze faktury, wystawione do 31 stycznia 2026 r., mogą mieć strukturę FA(2) (',
      { href: MF_FA, text: 'MF: faktura ustrukturyzowana i struktura FA' },
      ').',
    ],
  },
  {
    t: 'p',
    parts: [
      'Plik XML to dane faktury ułożone w pola o nazwach ze schematu – na przykład P_15 to kwota należności ogółem, a P_13_1 to suma wartości sprzedaży netto w stawce podstawowej. Dlatego po otwarciu w Notatniku albo w przeglądarce zobaczysz kod, a nie fakturę. Żeby ją przeczytać, potrzebny jest program, który zamieni te pola na czytelny układ – tak zwaną wizualizację.',
    ],
  },

  { t: 'h2', id: 'skad-plik', text: 'Skąd wziąć plik XML faktury' },
  {
    t: 'ul',
    items: [
      [
        'Z Aplikacji Podatnika KSeF – bezpłatnego narzędzia Ministerstwa Finansów do wystawiania, odbierania i przeglądania faktur (',
        { href: MF_APPS, text: 'MF: Aplikacja Podatnika KSeF i inne narzędzia' },
        '). Potrzebne jest zalogowanie i uprawnienia do faktur firmy.',
      ],
      ['Z programu do faktur albo programu księgowego, który pobiera faktury z KSeF – często można w nim zapisać plik XML na dysk.'],
      ['Od kontrahenta albo biura rachunkowego, na przykład jako załącznik do e-maila.'],
    ],
  },
  {
    t: 'p',
    parts: [
      'Bezpłatne narzędzia MF to także Aplikacja mobilna KSeF i e-mikrofirma (dla osób prowadzących jednoosobową działalność). Jeśli masz dostęp do KSeF, faktura widoczna w tych narzędziach pochodzi bezpośrednio z systemu – to najpewniejsze źródło.',
    ],
  },

  { t: 'h2', id: 'jak-otworzyc', text: 'Trzy sposoby, żeby zobaczyć fakturę z pliku XML' },
  {
    t: 'table',
    caption: 'Porównanie sposobów otwarcia faktury XML z KSeF',
    head: ['Sposób', 'Logowanie do KSeF', 'Kiedy się przydaje'],
    rows: [
      ['Aplikacja Podatnika KSeF (MF)', 'tak', 'Masz uprawnienia do faktur firmy i chcesz zobaczyć fakturę prosto z systemu.'],
      ['Program do faktur lub księgowy', 'zwykle przez program', 'Faktury i tak trafiają do Twojego programu albo do biura rachunkowego.'],
      [`${KSEF_TOOL_NAME} (OptimaPDF)`, 'nie', 'Masz sam plik .xml – na przykład z e-maila – i chcesz go szybko przeczytać, wydrukować albo zapisać jako PDF, także kilka faktur naraz.'],
    ],
  },

  { t: 'h2', id: 'krok-po-kroku', text: 'Krok po kroku: plik XML z KSeF → PDF bez logowania' },
  {
    t: 'steps',
    items: [
      {
        title: 'Otwórz narzędzie',
        text: `Wejdź na stronę ${KSEF_TOOL_NAME}. Nie trzeba zakładać konta ani instalować programu.`,
      },
      {
        title: 'Dodaj plik XML',
        text: 'Przeciągnij plik .xml na pole albo kliknij je i wybierz plik z dysku. Możesz dodać kilka faktur naraz. Plik jest odczytywany w Twojej przeglądarce i nie jest wysyłany na żaden serwer.',
      },
      {
        title: 'Sprawdź podgląd',
        text: 'Zobaczysz fakturę podzieloną na części: dane faktury, sprzedawcę i nabywcę, pozycje, podsumowanie według stawek VAT, adnotacje, płatność i pozostałe dane z pliku.',
      },
      {
        title: 'Zapisz PDF',
        text: 'Kliknij „Pobierz PDF”. Przy kilku fakturach wybierz jeden wspólny PDF (każda faktura zaczyna się od nowej strony) albo archiwum ZIP z osobnymi plikami.',
      },
    ],
  },
  {
    t: 'figure',
    src: '/guides/ksef/podglad-faktury-ksef.webp',
    alt: 'Lista dwóch dodanych plików XML z przyciskami Podgląd, Pobierz PDF i Usuń oraz podgląd faktury VAT nr FV/245/09/2026 z danymi faktury, sprzedawcą i nabywcą',
    width: 900,
    height: 953,
    caption: 'Dwie faktury dodane naraz i podgląd pierwszej z nich. Przykładowa faktura z fikcyjnymi danymi.',
  },
  { t: 'cta', text: 'Otwórz fakturę XML teraz' },

  { t: 'h2', id: 'co-w-podgladzie', text: 'Co zobaczysz w podglądzie i w PDF' },
  {
    t: 'ul',
    items: [
      ['Nazwy pól i znaczenia kodów pochodzą ze schematów XSD Ministerstwa Finansów, więc na przykład kod rodzaju faktury „KOR” jest pokazany jako faktura korygująca.'],
      ['Kwoty są pokazane dokładnie tak, jak zapisano je w pliku – podgląd niczego nie przelicza ani nie zaokrągla. W fakturze korygującej zobaczysz kwoty ze znakiem minus, jeśli tak je zapisano.'],
      ['Każde pole z pliku jest widoczne. Dane, które nie pasują do żadnej części podglądu, trafiają na koniec, do sekcji „Pozostałe dane z pliku”, z nazwą pola ze schematu.'],
      ['Każdy PDF ma na górze zdanie, że jest wizualizacją, a dokumentem księgowym pozostaje plik XML w KSeF.'],
    ],
  },
  {
    t: 'figure',
    src: '/guides/ksef/faktura-ksef-pdf.webp',
    alt: 'Pierwsza strona PDF faktury: tytuł Faktura VAT nr FV/245/09/2026, informacja o wizualizacji, tabele z danymi faktury, sprzedawcą i nabywcą oraz pozycjami',
    width: 620,
    height: 877,
    caption: 'Pierwsza strona zapisanego PDF. Przykładowa faktura z fikcyjnymi danymi.',
  },

  { t: 'h2', id: 'czy-pdf-to-faktura', text: 'Czy PDF z pliku XML jest fakturą?' },
  {
    t: 'p',
    parts: [
      'Nie. Fakturą jest plik XML zapisany w KSeF wraz z numerem, który system nadał tej fakturze. PDF to wygodny obraz tych danych – do przeczytania, wydruku czy pokazania komuś – ale go nie zastępuje. Plik XML zachowaj.',
    ],
  },

  { t: 'h2', id: 'kod-qr', text: 'Kiedy na wizualizacji musi być kod QR' },
  {
    t: 'p',
    parts: [
      'Jeśli faktura jest przekazywana nabywcy poza KSeF – na przykład konsumentowi albo firmie, która nie posługuje się numerem NIP – jej wizualizację trzeba oznaczyć kodem weryfikującym (kodem QR). Pod kodem znajduje się numer KSeF faktury. Po zeskanowaniu kodu widać podstawowe dane identyfikujące fakturę i informację, czy jest ona w KSeF. Faktury wystawione w trybie offline albo awaryjnym, przekazywane przed wysłaniem do KSeF, wymagają dwóch kodów: z napisem „OFFLINE” i z napisem „CERTYFIKAT” (',
      { href: MF_QR, text: 'MF: kody weryfikujące QR' },
      ').',
    ],
  },
  {
    t: 'p',
    parts: [
      'PDF z naszego narzędzia nie zawiera kodu QR. Nadaje się do przeczytania i wydruku faktury, którą otrzymałeś, ale nie do wydania faktury nabywcy poza KSeF – do tego użyj programu, którym fakturę wystawiasz, albo Aplikacji Podatnika KSeF.',
    ],
  },

  { t: 'h2', id: 'problemy', text: 'Najczęstsze problemy' },
  {
    t: 'ul',
    items: [
      ['„To jest Urzędowe Poświadczenie Odbioru (UPO)” – UPO to potwierdzenie przyjęcia dokumentu przez system, a nie faktura. Poszukaj właściwego pliku faktury.'],
      ['„Starsza struktura FA(1)” – narzędzie odczytuje faktury w strukturach FA(3) i FA(2). Faktury FA(1) i faktur w formacie PEF nie odczytuje.'],
      ['Brak numeru KSeF w podglądzie – numer nadaje system po przyjęciu faktury, więc nie ma go w treści pliku. Pokażemy go tylko wtedy, gdy jest w nazwie pliku (na przykład 5265877635-20260714-D5FB0C9ED490-89.xml) i zgadza się jego suma kontrolna.'],
      ['Plik otwiera się w przeglądarce jako kod – tak wygląda każdy plik XML. Dodaj go do narzędzia zamiast otwierać bezpośrednio.'],
    ],
  },

  { t: 'h2', id: 'terminy', text: 'Od kiedy faktury z KSeF trafiają do wszystkich firm' },
  {
    t: 'p',
    parts: [
      'Według Ministerstwa Finansów od 1 lutego 2026 r. KSeF jest obowiązkowy dla dużych przedsiębiorców i przy odbieraniu faktur, od 1 kwietnia 2026 r. dla pozostałych firm (z wyjątkiem najmniejszych, których sprzedaż dokumentowana fakturami nie przekracza 10 tys. zł miesięcznie), a od 1 stycznia 2027 r. dla wszystkich (',
      { href: MF_STAGES, text: 'MF: etapy wdrożenia KSeF' },
      '). To dlatego coraz więcej osób dostaje faktury jako pliki XML.',
    ],
  },
];

export const KSEF_GUIDE_FAQ: { q: string; a: string }[] = [
  {
    q: 'Czym otworzyć plik XML faktury z KSeF?',
    a: 'Programem, który zamienia dane z pliku na czytelną fakturę: Aplikacją Podatnika KSeF (wymaga logowania), programem do faktur albo narzędziem KSeF XML na PDF na tej stronie, które działa bez logowania i bez wysyłania pliku. Notatnik i przeglądarka pokażą tylko kod XML.',
  },
  {
    q: 'Czy muszę logować się do KSeF, żeby przeczytać fakturę?',
    a: 'Nie, jeśli masz już plik XML – na przykład z e-maila albo z programu księgowego. Logowanie jest potrzebne do pobrania faktury bezpośrednio z KSeF; bez logowania da się to zrobić tylko z kodem QR z wizualizacji i dodatkowymi danymi dostępowymi.',
  },
  {
    q: 'Czy mogę wysłać klientowi PDF zamiast faktury z KSeF?',
    a: 'PDF jest tylko wizualizacją. Gdy fakturę przekazuje się nabywcy poza KSeF, jej wizualizacja musi mieć kod QR z numerem KSeF – a PDF z naszego narzędzia go nie ma. Do wydania faktury użyj programu, w którym ją wystawiasz, albo Aplikacji Podatnika KSeF.',
  },
  {
    q: 'Czy plik faktury jest gdzieś wysyłany?',
    a: 'Nie. Narzędzie odczytuje plik i tworzy PDF w Twojej przeglądarce; nie wysyłamy go na serwer i nie zapisujemy jego treści. Możesz to sprawdzić w narzędziach deweloperskich przeglądarki (F12, zakładka „Sieć”).',
  },
];

export const KSEF_GUIDE_SOURCES: { href: string; text: string }[] = [
  { href: MF_FA, text: 'Faktura ustrukturyzowana i struktura logiczna FA – ksef.podatki.gov.pl' },
  { href: MF_QR, text: 'Kody weryfikujące QR – ksef.podatki.gov.pl' },
  { href: MF_APPS, text: 'Aplikacja Podatnika KSeF i inne narzędzia – ksef.podatki.gov.pl' },
  { href: MF_STAGES, text: 'Etapy wdrożenia KSeF – ksef.podatki.gov.pl' },
];

export { KSEF_GUIDE_PATH, KSEF_PATH };
