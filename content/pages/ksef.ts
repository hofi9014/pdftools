// Text of the KSeF XML to PDF page (Polish only — see lib/ksef). Every statement matches what the
// tool does (lib/ksef/*, components/ksef/KsefTool.tsx); the KSeF dates come from the Ministry of
// Finance's page https://ksef.podatki.gov.pl/etapy-wdrozenia-ksef (checked 2026-11-18).

export { KSEF_SLUG, KSEF_TOOL_NAME } from '@/lib/ksef/route';
export const KSEF_TITLE = 'KSeF XML na PDF – otwórz e-fakturę bez logowania';
export const KSEF_DESCRIPTION =
  'Otwórz plik XML e-faktury z KSeF (FA(3) i FA(2)) i zapisz go jako PDF. Bez logowania i bez wysyłania pliku – faktura nie opuszcza Twojego komputera.';
export const KSEF_LEAD =
  'Masz fakturę z KSeF w pliku XML i nie wiesz, jak ją otworzyć? Dodaj plik tutaj: zobaczysz czytelną fakturę i zapiszesz ją jako PDF. Wszystko dzieje się w Twojej przeglądarce.';
export const KSEF_SOURCE_URL = 'https://ksef.podatki.gov.pl/etapy-wdrozenia-ksef';

export const KSEF_STEPS = [
  'Przeciągnij plik XML faktury (albo kilka plików) na pole powyżej lub kliknij je i wybierz pliki z dysku.',
  'Obejrzyj podgląd: sprzedawcę i nabywcę, pozycje, stawki i kwoty VAT, płatność oraz wszystkie pozostałe dane z pliku.',
  'Kliknij „Pobierz PDF”. Przy kilku fakturach wybierz jeden wspólny plik PDF albo archiwum ZIP z osobnymi plikami.',
];

export const KSEF_FAQ: { q: string; a: string }[] = [
  {
    q: 'Jak otworzyć plik XML z KSeF?',
    a: 'Przeciągnij plik .xml na pole na tej stronie albo wybierz go z dysku. Narzędzie odczyta fakturę w strukturze FA(3) lub FA(2) i pokaże ją jak zwykłą fakturę, a jednym kliknięciem zapiszesz ją jako PDF. Nie musisz logować się do KSeF ani instalować programu.',
  },
  {
    q: 'Czy PDF z KSeF jest fakturą?',
    a: 'Nie. Fakturą w KSeF jest plik XML zapisany w systemie. PDF z tej strony to wizualizacja tego pliku: ułatwia przeczytanie, wydrukowanie albo pokazanie faktury, ale nie zastępuje pliku XML. Plik XML zachowaj.',
  },
  {
    q: 'Czy moje dane są bezpieczne?',
    a: 'Plik jest odczytywany i zamieniany na PDF w Twojej przeglądarce. Nie wysyłamy go na żaden serwer i nie zapisujemy jego treści. Możesz to sprawdzić sam: otwórz narzędzia deweloperskie (F12), zakładkę „Sieć”, i dodaj plik — nie pojawi się żadne wysłanie pliku.',
  },
  {
    q: 'Od kiedy KSeF jest obowiązkowy dla małych firm?',
    a: 'Według Ministerstwa Finansów KSeF 2.0 działa od 1 lutego 2026 r. (obowiązkowo dla dużych przedsiębiorców i dla odbierania faktur). Od 1 kwietnia 2026 r. jest obowiązkowy dla pozostałych przedsiębiorców, z wyjątkiem najmniejszych firm, których sprzedaż dokumentowana fakturami nie przekracza 10 tys. zł miesięcznie. Od 1 stycznia 2027 r. KSeF jest obowiązkowy dla wszystkich.',
  },
  {
    q: 'Gdzie jest numer KSeF faktury?',
    a: 'Numer KSeF nadaje system po przyjęciu faktury, więc nie ma go w treści pliku XML. Jeśli nazwa pliku zawiera numer KSeF (np. 5265877635-20260714-D5FB0C9ED490-89), pokażemy go w podglądzie — tylko wtedy, gdy zgadza się jego suma kontrolna.',
  },
  {
    q: 'Czy mogę zamienić kilka faktur naraz?',
    a: 'Tak. Dodaj kilka plików XML: każdą fakturę możesz obejrzeć i pobrać osobno albo pobrać wszystkie naraz jako jeden PDF (każda faktura od nowej strony) lub jako archiwum ZIP z osobnymi plikami PDF.',
  },
];

/** What the tool does not do — shown on the page, so nobody relies on it for more. */
export const KSEF_LIMITS = [
  'Nie sprawdza, czy faktura istnieje w KSeF ani czy plik jest zgodny ze schematem — pokazuje to, co jest w pliku.',
  'Podgląd nie zawiera kodu QR do weryfikacji faktury w KSeF.',
  'Obsługuje faktury w strukturze FA(3) i FA(2). Starszej struktury FA(1) oraz faktur w formacie PEF nie odczytuje.',
  'Pola, których nie ma w żadnej sekcji podglądu, pokazuje na końcu, w części „Pozostałe dane z pliku”, z nazwą pola ze schematu.',
];
