# OptimaPDF — audyt bezpieczeństwa, przekazanie kontekstu

**Data sesji:** 15 września 2026
**Repozytorium:** https://github.com/hofi9014/pdftools
**Produkcja:** https://optimapdf.com (Vercel, plan Hobby, region `iad1`)
**Stan na koniec sesji:** `main @ 7a376a1`. Zaktualizowano w kolejnych sesjach —
zob. commity `78899c5`, `e828ac7`, `b4221f2` (SEC-003b, A4, dokumentacja).

---

## Jak pracowaliśmy — zasady do zachowania

Te zasady wyłapały w tej sesji kilka błędów, które przeszłyby przez `tsc`, lint i build.
Warto je utrzymać.

1. **Dowód, nie deklaracja.** Raport opisuje intencję, kod pokazuje rzeczywistość.
   Każda zmiana przechodzi przegląd faktycznego diffu, nie streszczenia.
2. **Baseline przez `git stash`.** Wyniki `tsc` i lint porównywane ze stanem na HEAD,
   nie oceniane w oderwaniu — repo ma 233 błędy i 1647 ostrzeżeń lintera jako stan wyjściowy.
3. **Test rozstrzygający musi być inny niż kompilacja.** `tsc`/lint/build przechodzą także
   wtedy, gdy logika jest martwa. Przy SEC-001 dowodem był restart procesu, przy SEC-014 —
   otwarcie okna wyboru pliku.
4. **Weryfikacja niezależnym narzędziem** tam, gdzie się da (przy tej sesji: `curl`
   przeciw produkcji, `openpyxl`/`python-docx` w poprzednich sesjach).
5. **Nie zgadywać nazw i API.** Dwa razy w tej sesji założenie okazało się fałszywe:
   `gapi.picker` (nie istnieje, jest `google.picker`) i `Redis.fromEnv()`
   (szuka innych nazw zmiennych niż wstrzyknął Vercel).
6. **Jawna lista „czego nie robić"** w każdym zadaniu — ogranicza niechciane refaktory.
7. **Diff przesyłać jako plik**, nie przepisywać. Dwa razy przepisany wypis okazał się
   rekonstrukcją, nie dosłownym wyjściem.

---

## Co zostało zamknięte

### Bezpieczeństwo

| ID | Problem | Rozwiązanie |
|---|---|---|
| SEC-001 | Limit 15 zapytań AI/dobę żył w `Map` w pamięci instancji serverless (15,4% cold startów, okno 24 h vs. życie instancji liczone w minutach) | Upstash Redis, atomowy `INCR` + `EXPIRE`, zapas w pamięci przy awarii Redisa. Potwierdzone na produkcji malejącym `X-RateLimit-Remaining` |
| SEC-002 | Podejrzenie podszycia pod `X-Forwarded-For` | **Fałszywy alarm.** Vercel nadpisuje ten nagłówek, brak proxy przed nim (`Server: Vercel`, brak `cf-ray`) |
| SEC-004 | Kontrola źródła pomijana przy braku `Origin` i `Referer` | Metody zmieniające stan bez obu nagłówków → 403 |
| SEC-006 | `file.name` klienta wprost w `Content-Disposition` | `sanitizeHeaderFileName()` + `filename*=UTF-8''` |
| SEC-007 | Limit 100 MB tylko w middleware po `Content-Length` | Sprawdzenie rozmiaru bufora w handlerze, wspólna stała w `lib/upload-limit.ts` |
| SEC-008 | Klucze iLovePDF żywe w Production, kod usunięty miesiące temu | Projekt skasowany w iLoveAPI, zmienne usunięte z Vercela. Zero użycia na wykresie — nikt nie nadużył |
| SEC-009 | `NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY` bez ograniczeń („Brak") | Ograniczenie do domen optimapdf.com, `*.vercel.app`, localhost |
| SEC-010 | Nieaktualny OneDrive Client ID i błędny komentarz o adresie przekierowania w `.env.example` | Wyczyszczone, komentarze poprawione z ostrzeżeniem o dopasowaniu `www.` znak po znaku |
| SEC-012 | Brak `accounts.google.com` w `frame-src` CSP | Dodane |
| SEC-003b | `url-to-pdf`: `dns.lookup()` walidował jedną rezolucję DNS, `fetch()` wykonywał drugą, niezależną — luka na DNS rebinding z krótkim TTL | Hostname rozwiązywany raz, każdy adres zwalidowany, lista zamrożona jako custom `lookup` przekazany bezpośrednio do `http(s).request` (zamiast `fetch()`, który nie daje sposobu na przypięcie połączenia). `isPrivateOrReservedAddress` przepisany na `net.BlockList`, uzupełniony o CGNAT/`0.0.0.0/8`/benchmarking/reserved i poprawną normalizację rozwiniętego IPv6. Dowód: `tests/url-to-pdf-ssrf.mts` (`npm run test:url-to-pdf-ssrf`) — żądanie do hosta nieistniejącego w DNS kończy się sukcesem wyłącznie dzięki zamrożonemu adresowi (przy starym błędzie: `ENOTFOUND`); empirycznie potwierdzone, że Happy Eyeballs (`autoSelectFamily`) nadal próbuje kolejnych zwalidowanych adresów. Commit `b4221f2` |

### Błędy funkcjonalne znalezione przy okazji audytu

| ID | Problem |
|---|---|
| SEC-014 | **Import z Google Drive nie działał nigdy.** Kod używał `gapi.picker.PickerBuilder` zamiast `google.picker.PickerBuilder`. Zamaskowane przez nieprawdziwą deklarację w `types/cloud-picker.d.ts`, która deklarowała `gapi.picker` jako istniejący, a `google` bez `picker` — czyli aktywnie kierowała w złą stronę |
| SEC-015 | `urlToFile` bez nagłówka `Authorization` — endpoint Google Drive zwróciłby 401. Token był zapisywany do `googleTokenRef` i nigdy nieużywany |
| SEC-011 | `throw` wewnątrz funkcji zwrotnej wykonywanej poza `try/catch` + pusty `.catch(() => {})` — błędy połykane bez śladu |
| SEC-013 | `setLoading(null)` nie wywoływane **nigdzie** w ścieżce Google, nawet przy powodzeniu. Dodany watchdog 120 s |
| SEC-016 | Puste bloki `catch` w ścieżkach Dropbox i OneDrive |
| — | SharePoint: w Azure zarejestrowano `https://www.optimapdf.com/sharepoint-oauth.html`, a kod wysyła bez `www.` Microsoft porównuje znak po znaku |
| — | SharePoint dla kont osobistych Microsoft: Graph zwraca „not supported for MSA accounts". To ograniczenie platformy, nie błąd. Dodany czytelny komunikat zamiast surowego JSON |
| QA-001 | Licznik limitu AI (15/dobę) inkrementował się **przed** wywołaniem OpenRoutera, bez sposobu na zwrot przy błędzie dostawcy — seria awarii OpenRoutera paliła cały dzienny limit na samych błędach | `refundAiRateLimit()` w `lib/ai-rate-limit.ts` (Redis `DECR` + klamra na ujemną wartość jako zabezpieczenie przed race'em przy równoległych zwrotach; fallback in-memory przez `Math.max(0, …)`), podpięte w `app/api/ai/route.ts` przy błędzie sieci (`fetch()` rzuca — wcześniej w ogóle bez `try/catch`) **oraz wyłącznie przy `res.status >= 500`** — pierwsza wersja poprawki refundowała przy każdym `!res.ok`, co obejmowało też 4xx wywoływalne treścią żądania (np. 400 przy tekście przekraczającym kontekst modelu); refundowanie ich otwierałoby furtkę na darmowe, nielimitowane odpytywanie endpointu. Dowód: `tests/ai-rate-limit-refund.mts` (`npm run test:ai-rate-limit-refund`) — realny handler `POST()`: refund przy 5xx/błędzie sieci (kolejne żądanie po awarii nadal się udaje), **brak refundu przy 400** (kolejne żądanie po 400 dostaje 429, a powtórzenie wadliwego żądania po wyczerpaniu limitu w ogóle nie dociera do OpenRoutera). Test świadomie na fallbacku in-memory (tsx nie ładuje `.env.local`), żeby nie dotykać produkcyjnego licznika Redis |

**Stan integracji chmurowych po naprawach:** Google Drive ✅, Dropbox ✅, OneDrive ✅,
SharePoint ✅ technicznie (konta firmowe M365; osobiste dostają wyjaśnienie).

### Etap 2 — magazyn eksportów usunięty, Dropbox bez pośrednictwa serwera

**Decyzja (2026-09-15, ta sesja):** opcja A z trzech rozważanych — zamiast łatać magazyn
(np. Vercel Blob) lub usuwać funkcję zapisu do Dropboksa, wyeliminowana została przyczyna:
Dropbox Saver (wymagający publicznie pobieralnego URL-a — stąd serwer w środku) zastąpiony
Dropbox API v2 (OAuth 2.0 implicit grant + `POST content.dropboxapi.com/2/files/upload`
bezpośrednio z przeglądarki), tym samym wzorcem co Google Drive i OneDrive w tym samym pliku
(`components/CloudFileSaver.tsx`).

**Usunięte całkowicie:** `lib/exports.ts`, `app/api/exports/route.ts`,
`app/api/exports/[id]/route.ts` — magazyn w `Map` w pamięci procesu (źródło zawodności
międzyinstancyjnej) oraz mechanizm podpisywania HMAC znikają wraz z całą ścieżką, nie tylko
symptom.

**Nowe:** `lib/dropbox-upload.ts` (czysta logika: budowa URL-a OAuth, nagłówek
`Dropbox-API-Arg` — Dropbox wymaga w nim **wyłącznie ASCII**, więc polskie znaki/emoji
w nazwie pliku są escapowane do `\uXXXX` wg oficjalnej rekomendacji Dropboksa, nie wysyłane
jako surowe UTF-8), `public/dropbox-oauth.html` (redirect popup+postMessage, analogicznie do
`onedrive-oauth.html`). Scope żądany przy autoryzacji: **wyłącznie** `files.content.write`
(najwęższy możliwy do samego zapisu — ta sama filozofia co `drive.file` dla Google).

**Rezultat:** twierdzenie „pliki nigdy nie opuszczają przeglądarki" jest teraz prawdziwe
bez wyjątku, dla wszystkich czterech dostawców chmury. Powierzchnia ataku zmniejszona
(dwa endpointy API mniej, brak magazynu plików po stronie serwera do audytowania).

**Dowód:** `tests/dropbox-upload.mts` (`npm run test:dropbox-upload`) — 21 asercji na
czystej logice: ASCII-only + bajt-dokładny round-trip dla polskich diakrytyków i emoji
(pary surogatowe) w nagłówku `Dropbox-API-Arg`, sanityzacja nazw plików, poprawność URL-a
autoryzacji (endpoint, `response_type=token`, `scope=files.content.write`).
`npx tsc --noEmit`/`npm run build`/`eslint` — bez nowych błędów względem stanu wyjściowego.

**✅ Zweryfikowane ręcznie na żywo (2026-09-15, ta sesja, po stronie użytkownika):**
scope `files.content.write` włączony w Dropbox App Console, oba redirect URI
(`https://optimapdf.com/dropbox-oauth.html`, `http://localhost:3000/dropbox-oauth.html`)
zarejestrowane, `NEXT_PUBLIC_DROPBOX_APP_KEY` był ustawiony **wyłącznie** dla środowiska
Production w Vercelu (typ „Secret" — wartość odczytana ponownie z App Console, nie z
Vercela, bo Vercel nie pozwala podejrzeć wartości oznaczonych jako Secret) — dodany też do
lokalnego `.env.local` do testów. Test end-to-end w przeglądarce, **zarówno lokalnie
(`localhost:3000`), jak i na produkcji (`optimapdf.com`)**: import przez Dropbox Chooser
oraz zapis przez nową ścieżkę OAuth + `files/upload` — plik faktycznie wylądował w koncie
Dropbox użytkownika. Przy okazji usunięty z Vercela osierocony `EXPORT_LINK_HMAC_SECRET`
(potwierdzone: „No Environment Variables Match Your Filters" po wyszukaniu).

Do rozważenia później (nieblokujące, osobna decyzja): zawężenie typu dostępu aplikacji
z „Full Dropbox" na „App folder" — wymagałoby jednak nowej aplikacji/App Key (Dropbox nie
pozwala zmienić typu dostępu istniejącej aplikacji), więc zerwałoby to obecny Chooser
współdzielący ten sam klucz. Nie zrobione w tej sesji — brak wystarczającego uzasadnienia
kosztu/ryzyka wobec korzyści.

### SEC-005 — zakresy uprawnień Microsoftu: świadomie zaakceptowane ograniczenie platformy

**Decyzja (2026-09-15, ta sesja):** zakresy zostają bez zmian. Zbadano oficjalną
dokumentację Microsoft Graph — nie istnieje stabilny, węższy odpowiednik `drive.file`
Google dla scenariusza „użytkownik wybiera dowolne miejsce zapisu":

| Ścieżka | Scope w kodzie | Uwaga |
|---|---|---|
| Google Drive (import+zapis) | `drive.file` | najwęższy możliwy |
| OneDrive **import** (`js.live.net`, `action:'download'`) | `Files.Read.All` — żądany automatycznie przez SDK Microsoftu | **nie jest węższy** niż scope SharePoint — patrz uwaga niżej |
| OneDrive **zapis** (`CloudFileSaver.tsx`) | `Files.ReadWrite.All` | pełny dostęp do OneDrive |
| SharePoint **import** (własny UI przeglądania witryn/bibliotek) | `Sites.Read.All Files.Read.All` | — |
| SharePoint **zapis** (`CloudFileSaver.tsx`) | `Sites.ReadWrite.All` | **korekta względem poprzedniej wersji tej tabeli** — szerszy niż wcześniej udokumentowano; poprzednia wersja pokazywała tylko scope trybu importu, nie zapisu |

**Poprawka do wcześniejszego ustalenia w tej samej sesji:** wstępnie zapisałem tu, że
zarządzany widget Microsoftu (`js.live.net`) daje OneDrive importowi „wąską, per-plikową
zgodę" analogiczną do Google Picker. To było błędne, niezweryfikowane założenie.
Dokumentacja Microsoftu wprost stwierdza: *„The SDK will automatically request the
Files.Read.All scope for open flows, and Files.ReadWrite.All scope for save flows."*
— czyli ten sam poziom szerokiego dostępu (pełny odczyt wszystkich plików), jaki ma już
dzisiaj własny UI SharePoint. Przepisanie SharePoint importu na ten widget **nie
zawęziłoby uprawnień** — dałoby tylko inny (i uboższy — bez wyszukiwania witryn po
nazwie, listy ostatnich witryn, wklejania URL-a, komunikatu dla kont MSA) interfejs.
Z tego powodu **zrezygnowano z tego przepisania** — nie przynosiłoby obiecanej korzyści
bezpieczeństwa, tylko koszt (utrata funkcjonalności, nakład pracy).

Sprawdzone alternatywy i dlaczego żadna nie pasuje bez kompromisu:
1. `Files.ReadWrite.AppFolder` — ogranicza zapis do jednego ukrytego folderu `/Apps/…`;
   użytkownik traciłby możliwość wyboru miejsca zapisu (regresja UX względem Google
   Drive/Dropbox/OneDrive). Tylko konta osobiste — nie działa dla SharePoint/OneDrive
   for Business.
2. `Files.SelectedOperations.Selected` (najbliższy odpowiednik `drive.file`) — status
   **preview**, nie GA. Oparcie funkcji produkcyjnej na niestabilnym API odrzucone.
3. Oficjalny widget Microsoftu do zapisu (`OneDrive.save({action:'save', sourceUri:…})`,
   architektonicznie ten sam mechanizm co usunięty w Etapie 2 Dropbox Saver) —
   dokumentacja Microsoftu wprost zaleca te same szerokie scope'y
   (`Files.ReadWrite.All`/`Sites.ReadWrite.All`) nawet przy jego użyciu. W przeciwieństwie
   do Dropboksa, u Microsoftu zmiana mechanizmu nie zawęża uprawnień — to ograniczenie
   platformy, nie naszej implementacji.

Źródła: [Overview of Selected Permissions in OneDrive and SharePoint](https://learn.microsoft.com/en-us/graph/permissions-selected-overview),
[Using app folder in OneDrive and SharePoint](https://learn.microsoft.com/en-us/graph/onedrive-sharepoint-appfolder),
[OneDrive File Picker](https://learn.microsoft.com/en-us/onedrive/developer/controls/file-pickers/?view=odsp-graph-online),
[Open from OneDrive in JavaScript](https://learn.microsoft.com/en-us/onedrive/developer/controls/file-pickers/js-v72/open-file?view=odsp-graph-online)
(źródło poprawki o `Files.Read.All`/`Files.ReadWrite.All` — sekcja "Advanced options",
wiersz `scopes`),
[Save to OneDrive from JavaScript](https://learn.microsoft.com/en-us/onedrive/developer/controls/file-pickers/js-v72/save-file?view=odsp-graph-online),
[Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference).

**Rozważone i odrzucone:** przepisanie SharePoint importu na zarządzany widget
`js.live.net` (`sourceTypes: ['Sites']`) — sprawdzone i **odrzucone** po weryfikacji
dokumentacji Microsoftu (patrz uwaga w tabeli wyżej): nie zawęża scope'u, tylko zmienia
(i ubożą) interfejs. Żadna zmiana kodu nie jest tu planowana.

### Higiena

- `playwright` przeniesiony do `devDependencies` (używany wyłącznie w `e2e/`)
- `archiver` + `@types/archiver` usunięte (zero importów; ZIP robi `jszip` po stronie klienta)
- `new plik.zip` (6 MB) usunięty z repo
- `diff-*.txt`, `b3-*.txt` w `.gitignore`
- **A4:** `flag-icons` i `dommatrix` usunięte — zero importów w kodzie aplikacji (potwierdzone
  grepem: SVG-i w `public/flags/` to statyczne pliki, `DOMMatrix` w `lib/pdf-engine.ts` pochodzi
  z `@napi-rs/canvas`, nie z pakietu `dommatrix`). Usuwane pojedynczo z buildem po każdej —
  build zielony po obu. Commity `78899c5`/`e828ac7`
- **Gałąź `fix/google-drive-picker`** — potwierdzona jako w pełni scalona
  (`git merge-base --is-ancestor` zwrócił true), usunięta lokalnie i na origin.

### `/[locale]` — 100% błędów w Observability: dwie naprawy, nie jedna

**Pierwsza naprawa (realna, ale niewystarczająca — korekta poniżej):** `app/[locale]/layout.tsx`
nie walidował parametru `locale`. `generateStaticParams` buduje statycznie tylko 16 znanych
języków; każde inne pojedyncze żądanie ścieżki (boty skanujące `/wp-admin`, `/.env`, `/xx`
itp.) trafia w `[locale]` i — poza zbiorem prebuildowanym — Next.js renderuje je **na żywo**.
Dodano `notFound()` dla nieznanego `locale`. Dobre wzmocnienie samo w sobie, ale **nie było
prawdziwą przyczyną obserwowanych błędów** — co ujawniło się dopiero po wdrożeniu.

**Test rozstrzygający po wdrożeniu (zgodnie z zasadą sesji — sprawdzić na produkcji, nie
zakładać):** `GET https://optimapdf.com/xx` **dalej dawał 500** po wdrożeniu poprawki.
Sprawdzenie `vercel logs` na tym konkretnym deploymencie (dopasowanym po znaczniku czasu:
commit 16:02:52, deployment 16:03:00) ujawniło prawdziwy błąd, niezwiązany z `locale`:

```
Error: Failed to load external module sharp: ERR_DLOPEN_FAILED:
libvips-cpp.so.8.18.3: cannot open shared object file
```

**Prawdziwa przyczyna:** `app/icon.tsx` (mimo że `AGENTS.md` opisywał go jako "PNG,
statyczny") dynamicznie skalował `public/logo.png` przez `sharp` **przy każdym żądaniu**
zamiast być czysto statyczny. Natywna biblioteka `sharp` (`libvips`) nie ładowała się
w runtime Vercela (Linux) dla tej konkretnej ścieżki wykonania — stąd crash, ~2-3 s
opóźnienia (próba załadowania) i 100% Error Rate na `/[locale]`/`/[locale]/guide`
(strony z poprawnym językiem nie były dotknięte, bo serwowane statycznie, bez wywołania
funkcji — stąd nigdy nie trafiały w ten kod). Walidacja `locale` nie miała tu znaczenia,
bo crash następował wcześniej, przy próbie rozwiązania metadanych ikony.

**Druga naprawa (faktyczna przyczyna):** `app/icon.tsx` zastąpiony w pełni statycznym
`app/icon.png` (wygenerowanym raz lokalnie z `public/logo.png`, tym samym rozmiarem
32×32) — konwencja plikowa Next.js, zero kodu, zero zależności runtime. `sharp` usunięty
z `package.json` (był używany **wyłącznie** w tym jednym pliku — potwierdzone grepem).
Przy okazji usunięty też `lib/pdf-engine.ts` — martwy kod (zero rzeczywistych importów,
potwierdzone świeżo; jedyne trafienie grepa to komentarz odsyłający, nie import), który
też importował `sharp` i zaczął blokować `tsc` po usunięciu pakietu.

**Dowód:** build lokalny w trybie produkcyjnym (`next start`, bliższy runtime'owi Vercela
niż `next dev`) — `/icon.png` → 200 `image/png`, `/xx` → **404**, `/pl` → 200. `tsc`/`build`
bez nowych błędów. Build output: `/icon.png` jako `○` (Static) — potwierdza zero
wywołania funkcji dla ikony.

**Wniosek do zapamiętania:** lokalna weryfikacja (`next dev`, Windows) nie wykryła tego
problemu, bo `sharp` ładuje się poprawnie na tej platformie — awaria była specyficzna dla
runtime'u Linux na Vercelu. Sama poprawka `notFound()` — choć słuszna — dawałaby fałszywe
poczucie zamknięcia tematu, gdyby nie sprawdzono efektu **na żywo na produkcji** po
wdrożeniu, a nie tylko lokalnie.

---

## Co zostało do zrobienia

### Drobne obserwacje

- **Azure — status wydawcy sprawdzony (2026-09-15): potwierdzone niezweryfikowany,
  i strukturalnie zablokowane, nie tylko "jeszcze nie zrobione".** (Problem logowania
  po drodze: konflikt sesji wielu kont Microsoft w jednej przeglądarce — obszedł go
  incognito + logowanie wyłącznie kontem `LeszekHofman@OptimaPDF.onmicrosoft.com`.)
  Aplikacja: **"Optimapdf SharePoint"** w dzierżawie `OptimaPDF.onmicrosoft.com`
  (Znakowanie i właściwości → Domena wydawcy). Portal wprost: *"Domena wydawcy
  aplikacji jest ustawiona na OptimaPDF.onmicrosoft.com, ale domeny wydawcy
  onmicrosoft.com nie są dozwolone. W celu kontynuowania użyj domeny
  niestandardowej."* Ścieżka do pełnej weryfikacji:
  1. ✅ **Zrobione (2026-09-15):** dodano i zweryfikowano przez DNS domenę
     `optimapdf.com` w dzierżawie Azure AD. Rekord TXT `MS=ms12693569` dodany
     w Vercel DNS (domena `optimapdf.com` jest zarejestrowana w Hostingerze, ale
     strefa DNS jest delegowana do `ns1/ns2.vercel-dns.com` — Hostinger tu nie
     służy do niczego poza rejestracją). Weryfikacja w Azure potwierdzona
     niezależnie: `nslookup -type=TXT optimapdf.com` i zapytanie do `dns.google`
     zwracają `MS=ms12693569` zgodnie z tym, czego żądał Azure.
  2. ✅ **Zrobione (2026-09-15):** domena wydawcy aplikacji zmieniona z
     `OptimaPDF.onmicrosoft.com` na `optimapdf.com` (Azure: "Pomyślnie
     zaktualizowano domenę wydawcy"). Ostrzeżenie o niedozwolonej domenie
     `.onmicrosoft.com` zniknęło.
  3. ⬜ **Pozostało:** posiadać konto w Microsoft Partner Network (MPN) z domeną
     kontaktową zgodną z `optimapdf.com` — realny proces biznesowy (rejestracja
     firmy/tożsamości u Microsoftu), nie techniczny, może potrwać dni.
  4. ⬜ **Pozostało:** powiązać identyfikator MPN z aplikacją (Azure pokazuje już
     pole "Dodaj identyfikator programu MPN, aby zweryfikować wydawcę").

  **Praktyczny skutek dziś:** ekran zgody OAuth dla OneDrive/SharePoint pokaże
  teraz `optimapdf.com` zamiast `.onmicrosoft.com` jako domenę aplikacji — realna
  poprawa zaufania, choć plakietka pełnej weryfikacji ("Verified") pojawi się
  dopiero po kroku 3-4. Brak weryfikacji **nie jest i nigdy nie był luką
  bezpieczeństwa**, tylko sygnałem zaufania na ekranie zgody.
  **Decyzja:** kroki 1-2 wykonane w tej sesji na żywo z użytkownikiem (nie tylko
  kod — realna konfiguracja DNS + Azure Portal, każdy krok zweryfikowany
  niezależnie przed przejściem dalej). Krok 3 (MPN) pozostaje odłożony — do
  podjęcia osobno, gdy będzie na to czas/potrzeba biznesowa.

  **Przy okazji zweryfikowane (2026-09-15): rzeczywista konfiguracja "Uprawnienia
  interfejsu API" tej samej aplikacji potwierdza tabelę scope'ów z SEC-005**, bez
  niespodzianek. 4 uprawnienia Microsoft Graph, wszystkie typu **Delegated** (nie
  Application): `offline_access`, `Sites.Read.All`, `Sites.ReadWrite.All` — zgodne
  z kodem; `User.Read` — domyślne dla każdej rejestracji aplikacji, nieszkodliwe.
  „Wymagana zgoda administratora": **Nie** dla wszystkich czterech — zgoda jest per-
  -użytkownik przy logowaniu (zgodnie z projektem: OAuth implicit grant,
  `prompt=select_account`), stąd pusta kolumna „Stan" jest prawidłowa, nie błędem.
  **Jedna drobna niezgodność:** kod (`SharePointPickerDialog.tsx`, tryb picker) żąda
  w URL-u OAuth dodatkowo `Files.Read.All`, którego nie ma w konfiguracji Azure —
  najpewniej zbędne (`Sites.Read.All` już obejmuje odczyt plików w bibliotekach
  dokumentów tych witryn), nie rozszerza uprawnień ponad to, co widać w Azure.
  Niski priorytet — do rozważenia usunięcia z kodu jako kosmetyka, nie luka.
- **Deployment Storage — trend potwierdzony pozytywny.** Wykres 30-dniowy (sprawdzony
  2026-09-15): spadek z ~40 GB (18 sierpnia) do 13,43 GB (dziś), wyraźnie w dół od
  usunięcia `archiver`/przeniesienia `playwright`. Wciąż nad limitem 10 GB, ale trend
  jednoznaczny — obserwować dalej, nic do zrobienia teraz.
- **Przy okazji zauważone (2026-09-15):** 83,4% wywołań funkcji Vercel w ciągu 30 dni
  to "User Error" (357/428) — prawdopodobnie spodziewane przy wielowarstwowych limitach
  tej aplikacji (rate limit 30/min na `/api/*`, limit AI 15/dobę, blokady SSRF/CSRF,
  limit 100 MB), ale nie zweryfikowane rozbiciem po kodach/endpointach. Do sprawdzenia,
  jeśli będzie okazja.

---

## Infrastruktura — stan faktyczny (zweryfikowany, nie zakładany)

**Vercel:** plan Hobby, region funkcji `iad1`, Fluid Compute włączone, Cold Start 15,4%,
Skew Protection 12 h, brak Cloudflare ani innego proxy przed Vercelem.

**Firewall Vercela:** aktywny, DDoS Mitigation działa (324 zablokowane żądania/dobę),
Custom Rules: 0, Bot Protection: nieaktywne.

**Upstash Redis:** baza `upstash-kv-citrine-forest`, plan Free (500 tys. operacji/mies.),
region us-east-1, Eviction wyłączone.

**Nazwy zmiennych Upstash — UWAGA:** Vercel wstrzyknął człon `KV` w środku.
`Redis.fromEnv()` **nie zadziała**.

```
UPSTASH_REDIS_KV_REST_API_URL
UPSTASH_REDIS_KV_REST_API_TOKEN
UPSTASH_REDIS_KV_REST_API_READ_ONLY_TOKEN   ← nie używać do licznika (wymaga zapisu)
```

**Adresy przekierowania OAuth** (muszą zgadzać się znak po znaku):
- `https://optimapdf.com/onedrive-oauth.html`
- `https://optimapdf.com/onedrive-picker-oauth.html`
- `https://optimapdf.com/sharepoint-oauth.html`
- Google (źródła JavaScript): `https://optimapdf.com`, `http://localhost:3000`

**Sekrety w repozytorium:** zweryfikowane — w historii git istnieje wyłącznie `.env.example`.
Żaden plik z prawdziwymi sekretami nigdy nie był śledzony.

---

## Ocena zewnętrznego audytu, od którego zaczęliśmy

Użytkownik dostał wcześniej zewnętrzny audyt (black-box + `package.json`), oceniający
architekturę na 7/10. Weryfikacja na kodzie pokazała, że większość jego alarmów była
nietrafiona:

| Obawa audytora | Rzeczywistość |
|---|---|
| Klucz AI może być po stronie klienta | Wyłącznie serwerowo, w `app/api/ai/route.ts` |
| Playwright server-side → SSRF | Tylko w testach `e2e/`, nigdy w runtime |
| Brak CSP i nagłówków bezpieczeństwa | Komplet obecny i działający na produkcji |
| Brak rate limitingu | Był na trzech poziomach — tylko nietrwały (to naprawiliśmy) |
| Zbyt szeroki zakres Google Drive | `drive.file` — najwęższy możliwy |

Trafne okazały się dwa punkty: niespójność komunikatu o prywatności (Etap 2)
oraz zwrócenie uwagi na SSRF w `url-to-pdf` (SEC-003b).

Audyt kończył się prośbą o przesłanie całego repozytorium. Zalecono tego nie robić —
wnioski dało się zweryfikować samodzielnie.

---

## Sugerowana kolejność dalszych prac

SEC-003b, A4, QA-001, Etap 2 i SEC-005 zamknięte (Etap 2 zweryfikowane ręcznie na żywo na
produkcji; SEC-005 to decyzja bez zmiany kodu — rozważone przepisanie SharePoint importu
na widget `js.live.net` odrzucone po weryfikacji, że nie zawęża scope'u — zob. wyżej).
Pozostało:

1. Drobne obserwacje przy okazji
