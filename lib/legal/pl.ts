import type { LegalTexts } from './types';

const pl: LegalTexts = {
  privacy: {
    title: 'Polityka prywatności',
    updated: 'Ostatnia aktualizacja: 14 października 2026',
    sections: [
      {
        h: '1. Najważniejsze w skrócie',
        p: 'Narzędzia OptimaPDF działają w Twojej przeglądarce: pliki, na których pracujesz, nie są wysyłane na nasz serwer ani nigdzie indziej. Na serwer trafia tylko to, czego wymagają dwie funkcje — tekst przy funkcjach AI i adres strony przy konwersji URL do PDF. Statystyki odwiedzin (Google Analytics) zbieramy wyłącznie za Twoją zgodą. Nie prowadzimy kont użytkowników.',
      },
      {
        h: '2. Administrator danych',
        p: 'Administratorem danych osobowych jest Leszek Hofman, Dąbrówka Nowa, Polska. Kontakt: kontakt@optimapdf.com. Administrator nie wyznaczył Inspektora Ochrony Danych — we wszystkich sprawach związanych z ochroną danych pisz na powyższy adres.',
      },
      {
        h: '3. Jakie dane przetwarzamy',
        sub: [
          {
            h: '3.1 Twoje pliki',
            p: 'Wszystkie narzędzia do plików — m.in. łączenie, dzielenie, kompresja, OCR, edycja, podpis, redakcja, zabezpieczanie hasłem i wszystkie konwersje plików (PDF ↔ Word, Excel, PowerPoint, OpenOffice, obrazy, HTML, EPUB, TXT, SVG) — działają w całości w Twojej przeglądarce (JavaScript i WebAssembly). Plik nie jest wysyłany na nasz serwer. Z serwera pobierane są tylko pliki aplikacji, czcionki i dane językowe do OCR.',
          },
          {
            h: '3.2 Funkcje AI (Chat AI, Streszczenie AI, Tłumacz AI)',
            p: 'Gdy użyjesz funkcji AI, tekst wyodrębniony z pliku (a w czacie także Twoje pytanie) jest wysyłany przez nasz serwer do OpenRouter, Inc. (USA), który przekazuje go dostawcy modelu językowego (obecnie GPT-4o mini firmy OpenAI, obsługiwany przez OpenAI lub Microsoft Azure). Narzędzie uprzedza o tym, zanim cokolwiek wyślesz.',
            items: [
              'Każde zapytanie zawiera wymóg, by obsłużył je wyłącznie dostawca, który według OpenRouter nie przechowuje danych trwale i nie trenuje na nich modeli. Jeśli żaden taki dostawca nie jest dostępny, zapytanie kończy się błędem — nie jest wysyłane do innego.',
              'Zapytanie wysyła nasz serwer wspólnym kluczem API serwisu: do OpenRouter nie trafia Twój adres IP ani dane o przeglądarce, a Ty nie potrzebujesz własnego klucza.',
              'Nie zapisujemy wysłanego tekstu ani odpowiedzi.',
              'Limit to 15 zapytań dziennie na adres IP. Licznik (Twój adres IP i liczba zapytań) jest przechowywany w bazie Upstash przez 24 godziny od pierwszego zapytania i usuwany automatycznie.',
            ],
          },
          {
            h: '3.3 Konwersja adresu URL do PDF',
            p: 'Podany adres strony trafia na nasz serwer, który pobiera tę stronę i tworzy z niej PDF. Nie zapisujemy ani adresu, ani strony, ani pliku PDF. Limit to 30 konwersji na 10 minut na adres IP — licznik jest przechowywany w bazie Upstash przez 10 minut.',
          },
          {
            h: '3.4 Dane techniczne',
            p: 'Dostawca hostingu (Vercel Inc.) przy obsłudze żądań przetwarza dane techniczne — adres IP, adres strony, czas i typ przeglądarki — w celu działania i ochrony serwisu. Nasz serwer zapisuje w dzienniku tylko odrzucone żądania do API (np. przekroczony limit albo żądanie z obcej strony), z adresem IP skróconym do pierwszych trzech części (np. 203.0.113.0).',
          },
          {
            h: '3.5 Zapis w Twojej przeglądarce',
            p: 'Część ustawień zapisujemy na Twoim urządzeniu. Nie są wysyłane do nas ani do stron trzecich:',
            items: [
              'localStorage: motyw (jasny/ciemny), wybrany język, Twoja decyzja w sprawie analityki, ustawienia narzędzi i lista ostatnio używanych narzędzi.',
              'Ciasteczko „x-detected-locale” (do 12 miesięcy) z wybranym językiem — żeby strona otwierała się w Twoim języku. Jest niezbędne do działania wersji językowych i nie wymaga zgody.',
              'Pamięć podręczna aplikacji (service worker): pliki strony i pobrane dane językowe OCR — żeby narzędzia działały szybciej i bez sieci.',
              'Po połączeniu z Google Drive: token dostępu w sessionStorage, usuwany po zamknięciu karty albo po jego wygaśnięciu.',
            ],
          },
          {
            h: '3.6 Google Drive, Dropbox i OneDrive',
            p: 'Jeśli sam wybierzesz plik z chmury albo zapis do chmury, plik przechodzi bezpośrednio między Twoją przeglądarką a wybranym dostawcą (Google, Dropbox, Microsoft) — nie przez nasz serwer. Logujesz się w oknie tego dostawcy i to jego warunki oraz polityka prywatności dotyczą tej operacji. Google Drive daje nam dostęp tylko do plików otwartych lub utworzonych przez OptimaPDF; Dropbox — do zapisu plików; OneDrive i SharePoint — do plików, o które prosi okno Microsoft.',
          },
        ],
      },
      {
        h: '4. Podstawa prawna',
        items: [
          'Art. 6 ust. 1 lit. b RODO — wykonanie usługi, o którą prosisz: funkcje AI i konwersja URL do PDF.',
          'Art. 6 ust. 1 lit. f RODO — prawnie uzasadniony interes administratora: działanie i bezpieczeństwo serwisu, limity zapytań, ochrona przed nadużyciami, dzienniki techniczne.',
          'Art. 6 ust. 1 lit. a RODO — Twoja zgoda: statystyki odwiedzin w Google Analytics. Zgodę możesz wycofać w każdej chwili (pkt 10).',
        ],
      },
      {
        h: '5. Odbiorcy danych',
        p: 'Dane przetwarzają na nasze zlecenie albo otrzymują je:',
        items: [
          'Vercel Inc. (USA) — hosting strony i serwera aplikacji.',
          'Upstash, Inc. (USA) — baza liczników limitów zapytań (adres IP i liczba zapytań).',
          'OpenRouter, Inc. (USA) i dostawca modelu, któremu OpenRouter przekaże zapytanie — tylko gdy korzystasz z funkcji AI.',
          'Google LLC (USA) — Google Analytics, tylko po Twojej zgodzie.',
          'Organy państwowe — wyłącznie gdy wymaga tego prawo.',
        ],
      },
      {
        h: '6. Przekazywanie danych poza EOG',
        p: 'Serwer aplikacji działa w centrum danych Vercel w USA, a wszyscy odbiorcy z pkt 5 mają siedzibę w USA. Dane opisane w pkt 3.2–3.4 oraz dane Google Analytics są więc przekazywane do USA. Vercel Inc. i Google LLC są certyfikowane w ramach EU-US Data Privacy Framework (decyzja wykonawcza Komisji Europejskiej (UE) 2023/1795); Vercel stosuje także standardowe klauzule umowne. W przypadku Upstash i OpenRouter przekazanie odbywa się na warunkach ich umów o przetwarzaniu danych. Twoje pliki nie są przekazywane nigdzie (pkt 3.1).',
      },
      {
        h: '7. Jak długo przechowujemy dane',
        items: [
          'Twoje pliki: nie trafiają do nas. W przeglądarce znikają po zamknięciu lub odświeżeniu strony.',
          'Tekst wysłany do AI i adresy stron do konwersji: nie zapisujemy ich.',
          'Licznik limitu AI (adres IP): 24 godziny od pierwszego zapytania. Licznik konwersji URL do PDF: 10 minut.',
          'Dzienniki serwera u dostawcy hostingu: na obecnym planie Vercel 1 godzina.',
          'Dane Google Analytics: zgodnie z ustawieniem przechowywania danych w Google Analytics, nie dłużej niż 14 miesięcy.',
          'Ustawienia w przeglądarce: dopóki ich nie usuniesz; ciasteczko języka do 12 miesięcy.',
        ],
      },
      {
        h: '8. Twoje prawa',
        p: 'Masz prawo do dostępu do danych (art. 15 RODO), ich sprostowania (art. 16), usunięcia (art. 17), ograniczenia przetwarzania (art. 18), przenoszenia (art. 20), sprzeciwu (art. 21) oraz do wycofania zgody w każdej chwili, bez wpływu na zgodność z prawem przetwarzania przed jej wycofaniem. Możesz też złożyć skargę do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa). Nie prowadzimy kont, więc danych technicznych zwykle nie da się przypisać do konkretnej osoby (art. 11 RODO) — napisz do nas, a sprawdzimy, co możemy zrobić.',
      },
      {
        h: '9. Bezpieczeństwo',
        items: [
          'Szyfrowane połączenie HTTPS z wymuszonym HSTS.',
          'Content Security Policy i nagłówki, które blokują osadzanie strony w obcych witrynach oraz dostęp do kamery, mikrofonu i lokalizacji.',
          'Sprawdzanie pochodzenia żądań do API (ochrona przed CSRF), limity zapytań i limit rozmiaru żądania (100 MB).',
          'Konwersja URL do PDF nie pobiera adresów sieci wewnętrznych ani usług chmurowych serwera (ochrona przed SSRF).',
          'Szczegóły: strona „Bezpieczeństwo”.',
        ],
      },
      {
        h: '10. Google Analytics i zgoda',
        p: 'Za Twoją zgodą korzystamy z Google Analytics 4 (Google LLC), żeby liczyć odwiedziny i sprawdzać, z których narzędzi się korzysta. Google zapisuje wtedy w Twojej przeglądarce ciasteczka z identyfikatorem (_ga, _ga_*) i otrzymuje dane o odwiedzinach: odwiedzone strony, przybliżoną lokalizację, typ urządzenia i przeglądarki oraz źródło wejścia.',
        items: [
          'Bez zgody skrypt Google Analytics w ogóle się nie ładuje — strona nie łączy się z Google.',
          'Zgodę zmienisz lub wycofasz w każdej chwili przyciskiem „Ustawienia cookies” na dole każdej strony. Wycofanie od razu wyłącza Google Analytics i usuwa jego ciasteczka.',
          'Nie używamy Google Analytics do reklam ani profilowania. Pliki, które przetwarzasz, nigdy nie trafiają do Google.',
        ],
      },
      {
        h: '11. Zmiany polityki',
        p: 'Możemy zmieniać tę politykę, gdy zmienia się działanie serwisu; datę ostatniej zmiany podajemy na górze strony. Pytania: kontakt@optimapdf.com.',
      },
    ],
  },

  rodo: {
    title: 'Informacja o RODO',
    updated: 'Ostatnia aktualizacja: 14 października 2026',
    sections: [
      {
        h: '1. Administrator danych',
        p: 'Administratorem danych osobowych jest Leszek Hofman, Dąbrówka Nowa, Polska (optimapdf.com). Kontakt we wszystkich sprawach dotyczących danych: kontakt@optimapdf.com.',
      },
      {
        h: '2. Jakie dane przetwarzamy i po co',
        items: [
          'Twoje pliki — nie przetwarzamy ich na serwerze. Wszystkie narzędzia do plików działają w Twojej przeglądarce, a plik nie opuszcza urządzenia.',
          'Tekst wysłany do funkcji AI — przekazujemy go przez nasz serwer do OpenRouter i dostawcy modelu, żeby wykonać Twoje polecenie (streszczenie, tłumaczenie, odpowiedź). Nie zapisujemy go.',
          'Adres strony przy konwersji URL do PDF — nasz serwer pobiera tę stronę i tworzy PDF. Nie zapisujemy go.',
          'Adres IP — do liczenia limitów zapytań (AI: 24 godziny, URL do PDF: 10 minut) i ochrony przed nadużyciami; w dzienniku serwera tylko przy odrzuconym żądaniu i w skróconej postaci.',
          'Dane o odwiedzinach w Google Analytics — tylko po Twojej zgodzie.',
          'Ustawienia (motyw, język, decyzja o analityce) — zapisane wyłącznie w Twojej przeglądarce.',
        ],
      },
      {
        h: '3. Podstawy prawne',
        items: [
          'Art. 6 ust. 1 lit. b RODO — wykonanie usługi, o którą prosisz (funkcje AI, konwersja URL do PDF).',
          'Art. 6 ust. 1 lit. f RODO — prawnie uzasadniony interes: bezpieczeństwo i limity zapytań.',
          'Art. 6 ust. 1 lit. a RODO — zgoda na Google Analytics.',
        ],
      },
      {
        h: '4. Okresy przechowywania',
        items: [
          'Pliki, tekst wysłany do AI i adresy stron do konwersji: nie są przechowywane.',
          'Liczniki limitów z adresem IP: 24 godziny (AI) i 10 minut (URL do PDF).',
          'Dzienniki serwera u dostawcy hostingu: 1 godzina (obecny plan Vercel).',
          'Google Analytics: nie dłużej niż 14 miesięcy.',
          'Ustawienia w przeglądarce: dopóki ich nie usuniesz; ciasteczko języka do 12 miesięcy.',
        ],
      },
      {
        h: '5. Odbiorcy',
        p: 'Nie sprzedajemy ani nie udostępniamy danych w celach marketingowych. Dane przetwarzają na nasze zlecenie: Vercel Inc. (hosting), Upstash, Inc. (liczniki limitów), OpenRouter, Inc. i dostawca modelu (tylko funkcje AI), a po Twojej zgodzie — Google LLC (Google Analytics). Wszyscy mają siedzibę w USA.',
      },
      {
        h: '6. Przekazywanie do państw trzecich',
        p: 'Serwer aplikacji działa w USA, więc dane z pkt 2 (poza plikami i ustawieniami w przeglądarce) są przekazywane do USA. Vercel i Google są certyfikowani w ramach EU-US Data Privacy Framework (decyzja Komisji (UE) 2023/1795); Upstash i OpenRouter przetwarzają dane na warunkach swoich umów o przetwarzaniu danych.',
      },
      {
        h: '7. Twoje prawa',
        items: [
          'Dostęp do danych (art. 15) i ich sprostowanie (art. 16).',
          'Usunięcie danych (art. 17) i ograniczenie przetwarzania (art. 18).',
          'Przenoszenie danych (art. 20) i sprzeciw wobec przetwarzania (art. 21).',
          'Wycofanie zgody w każdej chwili — dla Google Analytics przyciskiem „Ustawienia cookies” na dole strony.',
        ],
      },
      {
        h: '8. Jak skorzystać z praw',
        p: 'Napisz na kontakt@optimapdf.com. Odpowiemy w ciągu 30 dni, bez opłat (chyba że żądanie jest ewidentnie nieuzasadnione lub nadmierne — art. 12 ust. 5 RODO). Nie prowadzimy kont, więc danych technicznych zwykle nie da się przypisać do konkretnej osoby (art. 11 RODO).',
      },
      {
        h: '9. Skarga do organu nadzorczego',
        p: 'Jeśli uważasz, że przetwarzamy Twoje dane niezgodnie z RODO, możesz złożyć skargę do Prezesa Urzędu Ochrony Danych Osobowych, ul. Stawki 2, 00-193 Warszawa.',
      },
      {
        h: '10. Ciasteczka i pamięć przeglądarki',
        p: 'Używamy jednego ciasteczka niezbędnego (x-detected-locale — język strony, do 12 miesięcy) oraz localStorage na ustawienia. Ciasteczka Google Analytics (_ga, _ga_*) pojawiają się tylko po Twojej zgodzie i znikają po jej wycofaniu. Nie używamy ciasteczek reklamowych.',
      },
      {
        h: '11. Zmiany',
        p: 'Tę informację aktualizujemy, gdy zmienia się działanie serwisu; data ostatniej zmiany jest na górze strony.',
      },
    ],
  },

  security: {
    title: 'Bezpieczeństwo',
    updated: 'Ostatnia aktualizacja: 14 października 2026',
    intro: 'Najważniejszym zabezpieczeniem OptimaPDF jest to, czego nie robimy: nie wysyłamy Twoich plików na serwer. Poniżej opisujemy, jak to działa i jakie są pozostałe zabezpieczenia — tylko te, które naprawdę stosujemy.',
    sections: [
      {
        h: '1. Pliki zostają na Twoim urządzeniu',
        p: 'Wszystkie narzędzia do plików, łącznie z kompresją, OCR i konwersjami, działają w Twojej przeglądarce (JavaScript i WebAssembly). Plik nie jest wysyłany na serwer, więc nikt po naszej stronie nie ma do niego dostępu. Możesz to sprawdzić sam: otwórz narzędzia deweloperskie przeglądarki (F12), zakładkę „Sieć”, i przetwórz plik — nie zobaczysz żadnego wysyłania pliku. Na serwer trafia tylko tekst przy funkcjach AI i adres strony przy konwersji URL do PDF.',
      },
      {
        h: '2. Szyfrowane połączenie',
        p: 'Strona działa wyłącznie przez HTTPS. Nagłówek HSTS (z wpisem na listę preload przeglądarek) każe przeglądarce zawsze łączyć się szyfrowanie, także przy pierwszej wizycie.',
      },
      {
        h: '3. Ochrona strony w przeglądarce',
        items: [
          'Content Security Policy ogranicza, skąd strona może ładować skrypty i z kim może się łączyć: z naszą domeną oraz z wymienionymi z nazwy usługami (logowanie Google, Dropbox, Microsoft, a po zgodzie Google Analytics).',
          'Strony nie da się osadzić w obcej witrynie (X-Frame-Options: DENY, frame-ancestors) — chroni to przed podstępnym klikaniem.',
          'Permissions-Policy blokuje dostęp do kamery, mikrofonu, lokalizacji, USB i płatności.',
          'X-Content-Type-Options i Referrer-Policy ograniczają zgadywanie typów plików i przekazywanie adresów stron.',
        ],
      },
      {
        h: '4. Ochrona serwera',
        items: [
          'Żądania do API są przyjmowane tylko z naszej strony (sprawdzanie nagłówków Origin i Referer — ochrona przed CSRF).',
          'Limity zapytań: 30 na minutę na adres IP dla API, 15 dziennie dla funkcji AI, 30 na 10 minut dla konwersji URL do PDF; limit rozmiaru żądania 100 MB.',
          'Konwersja URL do PDF odrzuca adresy sieci prywatnych, lokalnych i usług chmurowych serwera, a adres sprawdzony przy weryfikacji jest tym samym, z którym serwer się łączy (ochrona przed SSRF i podmianą DNS).',
          'Dane wejściowe API są sprawdzane po stronie serwera (długość tekstu, dozwolone języki tłumaczenia).',
        ],
      },
      {
        h: '5. Funkcje AI',
        p: 'Do AI wysyłamy tylko tekst wyodrębniony z pliku i Twoje pytanie — bez adresu IP i danych o przeglądarce, przez nasz serwer i jego klucz API (nie potrzebujesz własnego). Każde zapytanie wymaga dostawcy, który według OpenRouter nie przechowuje danych trwale i nie trenuje na nich modeli; gdy takiego brak, zapytanie się nie wykonuje.',
      },
      {
        h: '6. Brak kont i profili',
        p: 'Nie wymagamy rejestracji ani logowania, nie przechowujemy haseł i nie tworzymy profili użytkowników. Hasła do zabezpieczania i odblokowywania PDF oraz certyfikaty do podpisu są używane tylko w Twojej przeglądarce.',
      },
      {
        h: '7. Zależności',
        p: 'Biblioteki aktualizujemy, a ich znane podatności sprawdzamy narzędziem npm audit i testem, który zgłasza każde nowe ostrzeżenie o wysokim lub krytycznym poziomie w zależnościach używanych przez stronę.',
      },
      {
        h: '8. Zgłaszanie podatności',
        p: 'Jeśli znajdziesz lukę bezpieczeństwa, napisz na kontakt@optimapdf.com. Zobowiązujemy się:',
        items: [
          'potwierdzić otrzymanie zgłoszenia w ciągu 24 godzin,',
          'przeanalizować je i wdrożyć poprawkę w ciągu 14 dni (zależnie od wagi),',
          'poinformować Cię o podjętych działaniach,',
          'nie podejmować kroków prawnych wobec osób zgłaszających podatności w dobrej wierze.',
        ],
      },
      {
        h: '9. Certyfikaty',
        p: 'OptimaPDF nie ma własnych certyfikatów ISO 27001 ani SOC 2. Dostawca hostingu, Vercel, ma certyfikat ISO 27001:2022 i raport SOC 2 typu 2. Ponieważ pliki nie trafiają na nasz serwer, nie ma po naszej stronie plików „w spoczynku” do szyfrowania.',
      },
      {
        h: '10. Podpis cyfrowy i eIDAS',
        p: 'Narzędzie „Podpisz PDF” tworzy podpis cyfrowy PAdES Twoim certyfikatem (.p12/.pfx) — w całości w przeglądarce; ani plik, ani certyfikat nie są wysyłane. To prawdziwy podpis kryptograficzny, ale nie automatycznie kwalifikowany podpis elektroniczny (QES) w rozumieniu rozporządzenia eIDAS (UE 910/2014): status QES zależy od tego, czy certyfikat wydał kwalifikowany dostawca usług zaufania i czy klucz jest na kwalifikowanym urządzeniu.',
      },
    ],
  },

  principles: {
    security: 'Stosujemy szyfrowane połączenie HTTPS, Content Security Policy, ochronę API przed nadużyciami i limity zapytań. Najważniejsze: narzędzia do plików działają w Twojej przeglądarce, więc pliki w ogóle nie trafiają na nasz serwer.',
    tracking: 'Obecnie strona nie wyświetla żadnych reklam. W przyszłości możemy wprowadzić dyskretne reklamy (np. Google AdSense), żeby pokryć koszty utrzymania i rozwoju — jeśli to nastąpi, zaktualizujemy tę informację. Niezależnie od tego wszystkie narzędzia PDF pozostaną darmowe i bez limitu. Google Analytics używamy wyłącznie za Twoją zgodą, którą możesz wycofać w każdej chwili przyciskiem „Ustawienia cookies”. Nie stosujemy pikseli remarketingowych ani profilowania behawioralnego.',
  },
};

export default pl;
