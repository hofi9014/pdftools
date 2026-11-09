# Plan działania OptimaPDF (od 2026-10-29)

Plan powstał po audycie zewnętrznym (base44) i jego weryfikacji na produkcji 2026-10-29.
Kolejność: najpierw to, co widzi każdy odwiedzający i co mogę zrobić sam; potem nowe
narzędzia; potem języki. Rzeczy wymagające decyzji albo kont właściciela są oznaczone
**[DECYZJA]** / **[WŁAŚCICIEL]** i nie są robione bez zgody.

## Zasady wykonania (każdy punkt)

1. Najpierw pomiar albo test, który pokazuje problem na obecnym kodzie (dowód „przed”).
2. Zmiana; teksty w 16 językach (bez tekstów maszynowych pozostawionych po angielsku).
3. Pełna macierz: `tsc --noEmit`, lint zmienionych plików względem bazy, `npm run test:all`,
   `npm run validate:guides` (gdy dotyczy), czysty `npm run build`, testy e2e z listy CI na
   `next start` + testy e2e dotyczące zmienionego narzędzia.
4. Obejrzenie wyniku: zrzut w motywie jasnym i ciemnym, telefon 375 px, wersja RTL (ar).
5. Wpis w AGENTS.md (po polsku), commit, wdrożenie, sprawdzenie na produkcji.
6. Odhaczenie punktu w tym pliku z datą i numerem commita.

## Etap 1 — zaufanie i pierwsze wrażenie (sam)

- [x] 1.1 (2026-11-02, `9a8e093`; na produkcji: streszczenie po niemiecku i po polsku, pytanie po niemiecku,
      nieznany język → 400) Narzędzia AI mówią prawdę i działają w języku strony. Rozszerzone po sprawdzeniu:
      - limit przy przycisku (liczba ze wspólnej stałej, nie wpisana w 16 tłumaczeń);
      - FAQ, Pomoc i Zasady (16 języków) obiecywały własny klucz API OpenRouter, którego nie ma;
      - AI Streszczenie odpowiadało po polsku na każdej stronie (zmierzone na produkcji);
      - wynik z części dokumentu nie był oznaczany (wejście ucinane, wyjście modelu do 16 384 tokenów);
      - tłumacz twierdził „16 języków” (jest 11), poradnik obiecywał pobieranie, którego nie ma.
- [x] 1.1b (2026-11-05, trzy partie) Sprawdzenie WSZYSTKICH tekstów o działaniu strony względem kodu: FAQ, Pomoc, Nasze
      zasady, Wsparcie, listy „jak to działa” i karty na każdej z 40 stron narzędzi. Każde zdanie
      albo prawdziwe, albo poprawione w 16 językach. Już potwierdzone w kodzie jako nieprawdziwe:
      - PDF do SVG: „wektorowy, powiększanie bez utraty jakości, edycja w Illustratorze” — plik SVG
        zawiera obraz PNG całej strony (`pdfToSvgPages`). Tekst do poprawy; **[DECYZJA]** czy robić
        prawdziwy wektor;
      - Zabezpiecz PDF: „hasło uprawnień ograniczające drukowanie i kopiowanie” — jest tylko hasło
        otwarcia;
      - Spłaszcz: „wszystko staje się obrazem” — tekst zostaje tekstem, znikają adnotacje i pola;
      - Word do PDF: „wygląda identycznie, zachowuje czcionki” — dokument jest składany na nowo
        jedną czcionką bezszeryfową;
      - HTML do PDF: „lub podaj URL” — jest tylko pole na kod;
      - Edytor: „dodawanie tekstu i prostokątów”, „nie edycja istniejącego”, „Helvetica, Times,
        Courier” — edytor poprawia istniejący tekst, ma więcej kształtów i 12 czcionek;
      - Dodaj stronę: „format i orientacja, zawsze na końcu” — nie ma tych opcji, jest wybór miejsca,
        a rozmiar pochodzi z sąsiedniej strony;
      - Obróć: „wybrane strony”, „ZIP stron” — obraca wszystkie strony, ZIP jest dla kilku plików;
      - Dzielenie: tryb „co N stron” (nie istnieje, także w Pomocy);
      - Obrazy do PDF: „orientacja strony” (jest tylko margines);
      - Numerowanie: „styl numeracji” (brak), Znak wodny: „kąt”, domyślne 30% (brak kąta, domyślne 50%);
      - Pomoc: „przycięcie domyślnie 50 pt” (domyślnie 0), „150 DPI” (skala 2 = 144 DPI),
        „blokada CORS” przy URL do PDF (serwer nie podlega CORS), OCR „najlepiej polski i angielski”
        (33 języki).
      Potwierdzone 2026-11-02:
      - **FAQ chmury (najważniejsze):** „token daje dostęp wyłącznie do plików, które wybierzesz” — prawda
        tylko dla Google (`drive.file`); OneDrive prosi o `Files.ReadWrite.All`, SharePoint o
        `Sites.Read.All`/`Sites.ReadWrite.All` (cała zawartość konta), `offline_access` też jest w żądaniu;
      - „jedyne narzędzie PDF, które działa w pełni offline” (`hero.offline_pitch`) — nie do obrony, a 4 z 40
        narzędzi potrzebuje sieci; „brak limitów rozmiaru” (`local.nolimits`) przy limicie 100 MB w edytorze;
      - Znak wodny: `page.watermark.desc` „tekst lub obraz” (tylko tekst); `desc.addpage` „na końcu”;
      - FAQ OpenOffice: „ODT, ODS, ODP” — strona `/openoffice-to-pdf` przyjmuje tylko ODT (reszta w zakładce
        na Word do PDF, tekstowo);
      - Wsparcie: „odznaka Supporter” i „lista supporterów na stronie” — na stronie nie ma takiej listy;
      - ~~Wypełnij formularz: „spłaszczenie wyniku” — strona zapisuje formularz, nie spłaszcza~~ — BŁĄD
        planu: `fillFormFields` woła `form.flatten()`, więc FAQ mówi prawdę (sprawdzone 2026-11-03);
      - Przytnij: „podgląd efektu” — miniatury służą do wyboru stron, podglądu efektu nie ma;
      - Podpis: „dodać datę” — do sprawdzenia w kodzie, opcji daty nie ma wśród stanów strony;
      - Obrazy do PDF: formularz przyjmuje `.tiff`, a `createImageBitmap` nie dekoduje TIFF w Chrome ani Edge
        — prawdopodobnie gwarantowany błąd, do zmierzenia w przeglądarce (GIF i BMP też).
      **Partia 1 ZROBIONA** (2026-11-02, `15e9d61`, produkcja sprawdzona 2026-11-03): FAQ i polityka
      chmury, offline i limity, opis znaku wodnego, `desc.addpage`, TIFF, odznaka Supporter.
      **Partia 2 ZROBIONA** (2026-11-03): 16 odpowiedzi FAQ i 8 Pomocy z listy wyżej, opisy SVG,
      kompresji i edytora, „zmiany zapisywane lokalnie” (edytor niczego nie zapisuje), etykiety
      „przezroczystość” przy suwakach krycia (pl/ar/fa/is), „Gamas/Gammes/serier” w nazwie trybu
      dzielenia (es/fr/no), 11 tureckich nazw narzędzi po angielsku.
      **Partia 3 ZROBIONA** (2026-11-05): angielskie zdania zostawione jako tłumaczenie (fr 15, tr 21,
      it 2, pt 1, sv 1, przykłady HTML pl/ja) — test pilnuje teraz wszystkich języków; `/guide` składany
      z tych samych źródeł co strony narzędzi (kroki z `content/tool-howto.ts`, odpowiedzi o chmurze z
      FAQ) zamiast własnej kopii z kluczem OpenRouter, trybem „co N stron”, przeciąganiem, `.xls`, CORS
      i „wektorowym” SVG — przy okazji 12 kB zamiast 328 kB na stronę; Nasze zasady bez „narzędzia PDF
      działają w 100% lokalnie” i „bez limitu”; ramka instalacji bez obietnicy offline dla wszystkich
      narzędzi. `page.*.howto_*` i `local.*` zgodne z kodem.
      Prawdziwe: Zmiana kolejności (miniatury są `draggable`), Pliki chmury w `localStorage`/`sessionStorage`.
- [x] 1.1c (2026-11-05) Dostępność stanów PO użyciu narzędzia (`e2e/a11y-axe.mts` ogląda tylko świeżo załadowane
      strony): lupa zasłania środek przycisku „Akceptuję” w banerze zgody przy 1024 px (zmierzone
      `elementFromPoint`); komunikaty błędów `text-red-500` (25 miejsc, 3,76:1 na białym) i inne kolory
      stanów (`text-green-500`, `text-yellow-500`) są poniżej AA w jasnym motywie. Do zrobienia: axe na
      stanach błędu i wyniku wszystkich narzędzi, naprawa jedną regułą w `globals.css`.
      **ZROBIONE:** `e2e/a11y-states.mts` prowadzi 37 narzędzi przez prawdziwe UI (zły plik → błąd,
      dobry plik → wynik) i mierzy axe w obu motywach; przed poprawkami 35 z 146 pomiarów nie
      przechodziło (kolory stanów, przyciski edytora, pola bez powiązanych etykiet, `h3` pod `h1`,
      niewidoczny podgląd HTML w ciemnym motywie); baner zgody zostawia miejsce na lupę.
- [x] 1.1d (2026-11-08) Polski tekst wpisany na sztywno, widoczny w każdym języku (znalezione 2026-11-05 przy
      1.1c): panel wyboru obszarów przy redakcji (`components/redact-pdf/RegionSelector.tsx`: „Zaznacz
      regiony do redakcji”, „Poprzednia/Następna”, „Wczytywanie podglądu…”, instrukcja), okno SharePoint
      (`components/SharePointPickerDialog.tsx`, kilkanaście komunikatów), tekst alternatywny obrazu
      różnic w porównaniu („Różnice strona N”), przykładowy HTML („Witaj świecie”), polskie końcówki
      nazw pobieranych plików („_wypełniony”, „-spłaszczony”). Do tego test, który znajdzie taki tekst.
      **ZROBIONE:** wszystko z listy oraz komunikaty błędów silnika PDF (np. „PDF jest zabezpieczony
      hasłem…” na każdej wersji językowej), błędy chmury, „To urządzenie”, „Zapisz do:”, domyślny znak
      wodny „POUFNE”, nazwy wszystkich pobieranych plików; przy okazji przycisk „Połącz” źle przetłumaczony
      w 9 językach („konwertuj”, „działa z…”, „otwiera”); `test:hardcoded-polish`, `test:e2e-page-language-texts`.
      2026-11-09: także polskie nazwy plików bez polskich liter („_chroniony”, „podpisany-”,
      „edytowany-”, „_znak_wodny”, „_numerowany”, „_odblokowany”, „strony-pdf.svg.zip”).
- [ ] 1.2 Strona „O projekcie” (16 języków): kto prowadzi (dane jak w polityce prywatności),
      co robi strona, jak przetwarzane są pliki i jak to sprawdzić samemu, z czego strona
      żyje (bez reklam, dobrowolne wsparcie), znane ograniczenia, kontakt. Link w stopce,
      mapa strony, metadane, okruszki, dane strukturalne `AboutPage`. Bez wymyślonej historii
      osobistej — miejsce na nią zostawię właścicielowi **[WŁAŚCICIEL: opcjonalnie 2–3 zdania
      „dlaczego”]**.
- [ ] 1.3 Kompresja do docelowego rozmiaru („zmniejsz do 1 / 2 / 5 MB / własny”): zmierzyć, co
      dziś daje każdy poziom na prawdziwych plikach, potem tryb, który dobiera poziom i jakość
      obrazów do celu; uczciwy komunikat, gdy cel jest nieosiągalny (np. sam tekst).
- [ ] 1.4 Lżejsze pierwsze wczytanie stron narzędzi: zmierzyć, które biblioteki ładują się
      przed wyborem pliku (pdf-lib, pdf.js, jszip…), przenieść je do importu dynamicznego;
      cel liczbowy po pomiarze. Bez pogorszenia pracy offline (service worker).
- [x] 1.5 (2026-11-07, zatwierdzone przez właściciela z podglądu) Emoji w ikonach narzędzi (`lib/icons.tsx`: 🗜️ 🔄 ✂️ 🔒 …) wyglądają inaczej
      na Windows, Androidzie i iPhonie. Ikony są na liście „nie zmieniać” z przeprojektowania,
      więc przygotuję podgląd wersji z rysunkami SVG w stylu PdfBadge obok obecnych — zmiana
      tylko po akceptacji. **ZROBIONE:** 28 z 40 ikon narzędzi i 4 ikony kategorii mają rysunki
      (`components/ToolGlyph.tsx`), plakietki i układ bez zmian; `test:tool-icons`.
      **Krok 2 (2026-11-08, zatwierdzone przez właściciela z podglądu):** pozostałe emoji całej strony
      (ok. 880 miejsc: komunikaty, pola wyboru pliku, cechy, opcje, menu, Pomoc, Wsparcie, 16 języków)
      zastąpione rysunkami według zasady „jedno narzędzie — jedna ikona, jedno znaczenie — jeden rysunek”;
      kategorie dostały własne rysunki (suwaki, dwie strzałki, klucz); `test:tool-icons`, `test:e2e-no-emoji`.

## Etap 2 — nowe narzędzia działające lokalnie (sam, po kolei)

Każde: strona w 16 językach, kroki i FAQ (`ToolGuide`), powiązane narzędzia, mapa strony,
test logiki + test e2e przez prawdziwą stronę + test „bez wysyłania” (`e2e/no-upload.mts`).

- [ ] 2.1 Usuń metadane jednym kliknięciem (Info + XMP + miniatury + załączniki? — najpierw
      ustalić, co faktycznie zostaje w plikach z Worda/Acrobata).
- [ ] 2.2 Uczyń PDF wypełnialnym (dodawanie pól: tekst, pole wyboru, lista, podpis) — wynik
      musi otwierać się i wypełniać w Acrobacie/Edge/Chrome (sprawdzenie pdf.js + Word nie
      wystarczy; Edge jest na komputerze).
- [ ] 2.3 Wypełnianie PDF bez pól formularza (pisanie w dowolnym miejscu) — rozszerzenie
      „Wypełnij formularz” o tryb z edytora.
- [ ] 2.4 Tekst / Markdown na PDF (silnik tagowanego PDF z html-to-pdf).
- [ ] 2.5 Kod QR do PDF (+ prosty generator na tej samej stronie).
- [ ] 2.6 PDF w skali szarości.
- [ ] 2.7 Kilka stron na arkuszu / broszura do druku.
- [ ] 2.8 Szukaj w wielu plikach PDF naraz.
- [ ] 2.9 Weryfikacja podpisów PDF (node-forge 1.4.1 — luka weryfikacji naprawiona).

## Etap 3 — widoczność

- [ ] 3.1 **[WŁAŚCICIEL]** Search Console + Bing Webmaster: dane po tygodniu → korekta tytułów.
      2026-11-09: raport „Strony” otrzymany (745 zindeksowanych, 217 nie); z niego naprawione
      `/guides/<cokolwiek>` → 404 (było 200). Czekam na raport „Skuteczność” (zapytania, strony) i Bing.
- [ ] 3.2 Teksty i zrzuty do zgłoszeń: AlternativeTo, SaaSHub, Product Hunt (ja przygotowuję,
      **[WŁAŚCICIEL]** zakłada konta i wysyła).
- [ ] 3.3 **[DECYZJA]** Porównanie „które narzędzia PDF wysyłają plik na serwer”: pomiar metodą
      z `e2e/no-upload.mts` na syntetycznym pliku, wyłącznie fakty możliwe do powtórzenia;
      publikacja dopiero po akceptacji treści.
- [ ] 3.4 Kolejne poradniki do narzędzi bez poradnika (po danych z Search Console).
- [x] 3.5 (2026-11-02, właściciel; sprawdzone na produkcji) `www.optimapdf.com` przekierowuje stale (308)
      na `optimapdf.com`; domena główna bez przekierowania, 200.
- [ ] 3.6 Adresy poradników w języku strony: dziś `/guides/anleitungen/compress-pdf/how-to-compress-pdf-online`
      ma angielską końcówkę we wszystkich 16 językach. Zmiana ze stałymi przekierowaniami, po sprawdzeniu w
      Search Console, ile z tych adresów jest już zaindeksowanych.

## Etap 4 — języki (każdy wdrażany osobno)

- [ ] 4.0 Czcionka z cyrylicą (Figtree/Bricolage jej nie mają) — przed uk i bg.
- [ ] 4.1 ukraiński · 4.2 czeski · 4.3 rumuński · 4.4 niderlandzki
- [ ] 4.5 węgierski · 4.6 słowacki · 4.7 bułgarski · 4.8 fiński

Na każdy język: listy języków w 4 miejscach (`proxy.ts`, jego matcher, `lib/i18n.ts`,
`LOCALE_SEGMENTS` w `next.config.ts`), skrypt wykrywania języka w `RootDocument`, `htmlLangMap`,
`OG_LOCALES`, segment poradników, słownik (~980 kluczy), teksty prawne, `content/pages/*`,
kroki narzędzi, 15 poradników, nazwy kategorii, flaga, język OCR. Przed wdrożeniem: zużycie
miejsca na wdrożenia (limit Hobby 10 GB).

## Do decyzji właściciela (nie ruszam bez zgody)

- **ZROBIONE 2026-11-02 (właściciel):** przechowywanie wdrożeń: Preview, Canceled i Errored 1 dzień,
  Production 7 dni (Settings → Build and Deployment). Deployment Storage było 17,6 GB przy limicie 10 GB;
  2026-11-03 panel pokazuje 0 B — poniżej limitu.
- **ZROBIONE 2026-11-02 (decyzja właściciela: usunąć):** obietnica „odznaki Supporter” i listy
  wspierających zniknęła ze strony Wsparcia w 16 językach (`15e9d61`, sprawdzone na produkcji).
- **[DECYZJA]** Faktury KSeF (XML → czytelny PDF) — duży projekt, najpierw sprawdzenie
  przepisów i schematu FA(3).
- **ZROBIONE 2026-11-04 (wygląd zatwierdzony przez właściciela):** filiżanka kawy z parą w kole na
  stronie głównej, za ikonami, w całości w kole (`components/HeroCoffeeCup.tsx`, `test:hero-coffee-cup`).
- **ZROBIONE 2026-11-07 (właściciel zatwierdził podgląd):** ikony narzędzi i kategorii rysowane zamiast emoji (1.5).
- **ZROBIONE 2026-11-08 (właściciel zatwierdził podgląd):** wszystkie pozostałe emoji na stronie zastąpione rysunkami (1.5, krok 2).
- **[DECYZJA]** „Nasze zasady” zapowiadają płatny plan dla firm i możliwe reklamy AdSense. To Twoje
  plany, więc ich nie zmieniam, ale oba wymagają planu Vercel Pro — czy zostawić te zdania?
- **[WŁAŚCICIEL]** Link do wsparcia na `/wsparcie` to nadal testowy Stripe (prawdziwa karta nie
  zapłaci): podmiana na prawdziwy albo ukrycie przycisku.

## Czego nie robię (świadomie)

Limitów w darmowych narzędziach, reklam i płatnych funkcji (plan Hobby = tylko użytek
niekomercyjny), Sentry i dodatkowego śledzenia, tekstów „po 1000 słów” pisanych pod roboty.
