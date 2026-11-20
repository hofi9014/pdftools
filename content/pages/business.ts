// The /{pl|en}/for-business page (2026-11-20): a page the owner can send to companies. It says
// what happens to a company's files, how its IT department can check that, which tools teams use
// and how to get in touch. No prices: there is no paid plan. Every statement must be true for
// the code — tests/business-page.mts checks the numbers, links and tool names.
// Placeholders filled by the view: {local}/{total}, {exceptions}, {limit}.

export const BUSINESS_LOCALES = ['pl', 'en'] as const;
export type BusinessLocale = (typeof BUSINESS_LOCALES)[number];

/** Tools a team is pointed at, in this order; names and links come from lib/tools. */
export const BUSINESS_TOOLS = ['compress', 'merge', 'redact', 'sign', 'protect', 'ocr', 'word', 'excel'] as const;

export type BusinessTexts = {
  seoTitle: string;
  seoDescription: string;
  title: string;
  lead: string;
  whoTitle: string;
  who: string[];
  filesTitle: string;
  files: string[];
  gdprTitle: string;
  gdpr: string;
  gdprNote: string;
  itTitle: string;
  it: string[];
  toolsTitle: string;
  toolsIntro: string;
  ksef: string;
  practicalTitle: string;
  practical: string[];
  limitsTitle: string;
  limits: string;
  contactTitle: string;
  contact: string;
  contactIdeas: string;
};

export const content: Record<BusinessLocale, BusinessTexts> = {
  pl: {
    seoTitle: 'OptimaPDF dla firm – narzędzia PDF bez wysyłania plików',
    seoDescription: 'Narzędzia PDF dla kancelarii, biur rachunkowych i działów HR: dokumenty są przetwarzane w przeglądarce, bez wysyłania na serwer. Za darmo, bez kont.',
    title: 'OptimaPDF dla firm',
    lead: 'Narzędzia PDF, które nie wysyłają dokumentów Twojej firmy na cudzy serwer. Pracownik łączy, kompresuje, podpisuje albo anonimizuje plik w przeglądarce, a dokument przez cały czas zostaje na jego komputerze.',
    whoTitle: 'Dla kogo',
    who: [
      'Kancelarie i działy prawne — umowy, pełnomocnictwa, pisma procesowe.',
      'Biura rachunkowe i księgowość — faktury, deklaracje, wyciągi bankowe.',
      'Kadry i HR — umowy o pracę, świadectwa, dokumenty kandydatów.',
      'Placówki medyczne — skierowania, wyniki badań, dokumentacja pacjentów.',
      'Każdy zespół, który na co dzień ma w PDF-ach dane osobowe albo tajemnicę firmy.',
    ],
    filesTitle: 'Co dzieje się z plikami',
    files: [
      '{local} z {total} narzędzi przetwarza plik w całości w przeglądarce pracownika. Plik nie trafia na nasz serwer ani na serwer kogokolwiek innego i nie jest nigdzie zapisywany.',
      'Wyjątki są oznaczone na swoich stronach: {exceptions}. Do narzędzi AI trafia tylko tekst wyodrębniony z pliku (do {limit} zapytań na dobę), a URL do PDF pobiera na naszym serwerze stronę o podanym adresie. Jeśli Wasze zasady na to nie pozwalają, wystarczy z nich nie korzystać — pozostałe narzędzia działają bez nich.',
      'Nie trzeba zakładać kont ani instalować programów. Narzędzia są darmowe i nie dodają znaku wodnego.',
      'Przy zapisie do Google Drive, Dropbox albo OneDrive plik idzie z przeglądarki prosto na konto firmy w tej usłudze, bez naszego serwera.',
    ],
    gdprTitle: 'RODO',
    gdpr: 'Przy narzędziach działających w przeglądarce OptimaPDF nie otrzymuje treści dokumentu, więc nie przetwarza zawartych w nim danych osobowych. Dane z dokumentu nie opuszczają komputera pracownika.',
    gdprNote: 'To opis działania narzędzia, nie porada prawna — ostateczną ocenę zostawcie swojemu inspektorowi ochrony danych. Szczegóły:',
    itTitle: 'Jak to sprawdzi dział IT',
    it: [
      'Narzędzia deweloperskie przeglądarki (F12), zakładka Sieć: przy użyciu narzędzia widać tylko pobieranie kodu strony, bez żadnego żądania z treścią pliku.',
      'Narzędzie otwarte raz działa później także bez internetu — można je przetestować przy odłączonej sieci.',
      'Cały kod OptimaPDF jest publiczny na GitHubie, razem ze skryptem, którym zmierzyliśmy, że popularne serwisy PDF wysyłają pliki na swoje serwery.',
      'Strona ustawia ścisłe nagłówki bezpieczeństwa (Content-Security-Policy, HSTS, X-Frame-Options), a statystyki Google Analytics włączają się dopiero po zgodzie użytkownika.',
    ],
    toolsTitle: 'Czego zespoły używają najczęściej',
    toolsIntro: 'Wszystkie te narzędzia działają w przeglądarce:',
    ksef: 'Dla firm w Polsce: odczyt faktur KSeF (pliki XML FA(3) i FA(2)) i zapis jako czytelny PDF — także wielu faktur naraz.',
    practicalTitle: 'W praktyce',
    practical: [
      'Działa w każdej nowoczesnej przeglądarce na komputerze i telefonie, w 17 językach.',
      'Można zainstalować jako aplikację na komputerze (przycisk instalacji w przeglądarce) — bez uprawnień administratora.',
      'Kompresja do docelowego rozmiaru (np. 2 MB) przydaje się przy limitach załączników e-mail i portali.',
      'Redagowanie trwale usuwa zaznaczone fragmenty: zredagowana strona jest zamieniana w obraz, więc ukrytego tekstu nie da się skopiować.',
    ],
    limitsTitle: 'Ograniczenia',
    limits: 'Szybkość zależy od komputera pracownika, a konwersja PDF do Worda nie zawsze daje dokument identyczny z oryginałem. Pełną listę ograniczeń opisujemy na stronie o projekcie.',
    contactTitle: 'Kontakt',
    contact: 'Pytania o działanie narzędzi albo o to, jak sprawdzić je w Waszej firmie:',
    contactIdeas: 'Jeśli Wasz zespół potrzebuje czegoś, czego tu brakuje — na przykład przetwarzania wielu plików jednym kliknięciem albo wersji uruchamianej w sieci firmy — napiszcie. Takie potrzeby decydują o tym, co powstaje dalej.',
  },
  en: {
    seoTitle: 'OptimaPDF for business – PDF tools that never upload files',
    seoDescription: 'PDF tools for law firms, accounting offices and HR: documents are processed in the browser and never uploaded to a server. Free, no accounts.',
    title: 'OptimaPDF for business',
    lead: 'PDF tools that never send your company\'s documents to someone else\'s server. An employee merges, compresses, signs or redacts a file in the browser, and the document stays on their computer the whole time.',
    whoTitle: 'Who it is for',
    who: [
      'Law firms and legal departments — contracts, powers of attorney, court filings.',
      'Accounting offices and finance teams — invoices, tax returns, bank statements.',
      'HR — employment contracts, references, candidates\' documents.',
      'Healthcare — referrals, test results, patient records.',
      'Any team that handles personal data or trade secrets in PDFs every day.',
    ],
    filesTitle: 'What happens to the files',
    files: [
      '{local} of {total} tools process the file entirely in the employee\'s browser. The file is not sent to our server or anyone else\'s, and it is not stored anywhere.',
      'The exceptions are marked on their pages: {exceptions}. The AI tools receive only the text extracted from the file (up to {limit} requests a day), and URL to PDF fetches the page you enter on our server. If your policies do not allow that, simply do not use them — the other tools work without them.',
      'No accounts and no software to install. The tools are free and add no watermark.',
      'When saving to Google Drive, Dropbox or OneDrive, the file goes from the browser straight to the company\'s account with that service, not through our server.',
    ],
    gdprTitle: 'GDPR',
    gdpr: 'With the tools that run in the browser, OptimaPDF never receives the document\'s content, so it does not process the personal data in it. The data does not leave the employee\'s computer.',
    gdprNote: 'This describes how the tool works; it is not legal advice — leave the final assessment to your data protection officer. Details:',
    itTitle: 'How your IT department can check it',
    it: [
      'Browser developer tools (F12), Network tab: while a tool runs, you see only the page\'s code being downloaded, never a request carrying the file.',
      'A tool opened once also works without internet afterwards — you can test it with the network disconnected.',
      'All of OptimaPDF\'s code is public on GitHub, together with the script we used to measure that popular PDF sites upload files to their servers.',
      'The site sends strict security headers (Content-Security-Policy, HSTS, X-Frame-Options), and Google Analytics starts only after the user agrees.',
    ],
    toolsTitle: 'What teams use most',
    toolsIntro: 'All of these run in the browser:',
    ksef: 'For companies in Poland: reading KSeF e-invoices (FA(3) and FA(2) XML files) and saving them as readable PDFs — many invoices at once, too.',
    practicalTitle: 'In practice',
    practical: [
      'Works in any modern browser on computers and phones, in 17 languages.',
      'Can be installed as an app on a computer (the browser\'s install button) — no administrator rights needed.',
      'Compressing to a target size (e.g. 2 MB) helps with e-mail and portal attachment limits.',
      'Redaction permanently removes the marked parts: the redacted page is turned into an image, so the hidden text cannot be copied.',
    ],
    limitsTitle: 'Limits',
    limits: 'Speed depends on the employee\'s computer, and PDF to Word does not always produce a document identical to the original. The full list of limits is on the About page.',
    contactTitle: 'Contact',
    contact: 'Questions about how the tools work, or how to check them in your company:',
    contactIdeas: 'If your team needs something that is missing — for example processing many files with one click, or a version that runs inside the company network — write to us. Needs like these decide what gets built next.',
  },
};
