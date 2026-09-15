# OptimaPDF — audyt bezpieczeństwa, przekazanie kontekstu

**Data sesji:** 15 września 2026
**Repozytorium:** https://github.com/hofi9014/pdftools
**Produkcja:** https://optimapdf.com (Vercel, plan Hobby, region `iad1`)
**Stan na koniec sesji:** `main @ 7a376a1` + niezacommitowana zmiana w `.gitignore`

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

**Stan integracji chmurowych po naprawach:** Google Drive ✅, Dropbox ✅, OneDrive ✅,
SharePoint ✅ technicznie (konta firmowe M365; osobiste dostają wyjaśnienie).

### Higiena

- `playwright` przeniesiony do `devDependencies` (używany wyłącznie w `e2e/`)
- `archiver` + `@types/archiver` usunięte (zero importów; ZIP robi `jszip` po stronie klienta)
- `new plik.zip` (6 MB) usunięty z repo
- `diff-*.txt`, `b3-*.txt` w `.gitignore`

---

## Co zostało do zrobienia

### SEC-003b — właściwa ochrona przed podmianą DNS (priorytet)

**Stan:** częściowo zrobione w commicie `7a376a1`, luka pozostaje.

`app/api/url-to-pdf/route.ts` rozwiązuje nazwę hosta przez `dns.lookup({all:true})`
i sprawdza adresy, ale potem woła `fetch(normalizedUrl)` — czyli **drugie, niezależne
zapytanie DNS**. Napastnik z krótkim TTL może zwrócić adres publiczny przy sprawdzeniu
i prywatny przy połączeniu.

**Co już działa:** domena statycznie wskazująca na adres prywatny jest blokowana
(zweryfikowane: `localtest.me` → 403, `example.com` → 200). Przekierowania odrzucane
w całości. Porty ograniczone do 80/443.

**Do zrobienia:** połączenie po zweryfikowanym adresie IP (uwaga na weryfikację certyfikatu
przy HTTPS) albo biblioteka wpinająca się w warstwę gniazda, np. `ssrf-req-filter`.

**Przy okazji** uzupełnić `isPrivateOrReservedAddress` o brakujące zakresy:
`100.64.0.0/10` (CGNAT), `0.0.0.0/8` (obecnie tylko dokładny `0.0.0.0`),
`198.18.0.0/15`, `240.0.0.0/4`. Adres metadanych `169.254.169.254` jest już pokryty.
Rozważyć też IPv6 w formie rozwiniętej (`0:0:0:0:0:0:0:1` nie jest łapany przez
porównanie z `::1`).

### A4 — dwie zależności do usunięcia

`flag-icons` i `dommatrix` — brak importów w kodzie aplikacji.
Usuwać **pojedynczo, z buildem po każdej** — `dommatrix` może być zależnością przechodnią
`pdfjs-dist`. Jeśli build padnie, cofnąć.

### Etap 2 — magazyn eksportów (większe, wymaga decyzji)

`lib/exports.ts` trzyma **bufory plików** w `Map` w pamięci procesu:

```js
const store = new Map<string, StoredFile>();   // buffer, contentType, fileName, expiresAt
```

Dwa skutki:

1. **Zawodność:** plik zapisany przez jedną instancję serverless jest niewidoczny dla innej.
   Przy małym ruchu i ciepłej instancji zwykle działa — bywa zawodne.
2. **Niespójność komunikatu o prywatności:** endpoint obsługuje zapis do Dropboxa
   (Dropbox Saver potrzebuje publicznego adresu do pobrania pliku), więc w tej ścieżce
   **plik opuszcza przeglądarkę**. Strona główna deklaruje, że pliki nigdy tego nie robią.

Redis nie jest tu właściwym narzędziem (pliki do 100 MB). Vercel Blob byłby, ale najpierw
warto rozstrzygnąć, czy ta ścieżka ma w ogóle istnieć, czy da się zapisywać do Dropboxa
bez pośrednictwa serwera.

Mechanizm podpisywania linków (`HMAC-SHA256`, `timingSafeEqual`, token jednorazowy, TTL 5 min)
jest zrobiony dobrze i warto go zachować niezależnie od decyzji o magazynie.

### SEC-005 — zakresy uprawnień Microsoftu (decyzja, nie kod)

| Dostawca | Zakres |
|---|---|
| Google | `drive.file` — najwęższy możliwy, plikowy |
| OneDrive (zapis) | `Files.ReadWrite.All` |
| SharePoint | `Sites.Read.All Files.Read.All` |

Microsoft dostaje nieporównanie szerszy dostęp niż Google. Do sprawdzenia, czy Graph
oferuje węższy odpowiednik dla samego wyboru/zapisu pliku. Jeśli nie — udokumentować
jako świadomie zaakceptowane ograniczenie platformy, nie przeoczenie.

### QA-001 — limit AI zjadany przy błędzie dostawcy

Licznik inkrementuje się **przed** wywołaniem OpenRoutera. Przy awarii dostawcy użytkownik
wypali 15 zapytań na odpowiedziach błędu i usłyszy, że limit wyczerpany. Rozważyć zwrot
limitu, gdy wywołanie zakończy się błędem po stronie dostawcy.

### Drobne obserwacje

- **Trasa `/[locale]` ma 100% błędów** w Observability (4 wywołania, wszystkie nieudane).
  Nie bezpieczeństwo, ale coś się psuje.
- **Azure: „End users cannot grant consent to newly registered multitenant apps without
  verified publishers"** — obcy użytkownicy mogą nie móc wyrazić zgody na dostęp
  do OneDrive/SharePoint. Do sprawdzenia.
- **Gałąź `fix/google-drive-picker`** scalona, do usunięcia razem z jej podglądem.
- **Deployment Storage 13,43 GB / 10 GB** — przekroczony. Usunięcie starych wdrożeń dało
  tylko 0,5 GB; problemem jest rozmiar pojedynczego builda. Po przeniesieniu `playwright`
  i usunięciu `archiver` obserwować, czy zejdzie poniżej limitu w miarę wypadania starych
  wdrożeń. Jeśli nie — szukać dalej.
- **`.gitignore`** ma niezacommitowaną zmianę (wzorce `diff-*.txt`, `b3-*.txt`).

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

1. **SEC-003b** — jedyna otwarta luka bezpieczeństwa; wymaga testu, który da się uruchomić
   lokalnie
2. **A4** — dwie zależności, szybkie, odciąża Deployment Storage
3. **QA-001** — mała zmiana, realna poprawa doświadczenia użytkownika
4. **Etap 2** — największy; zacząć od decyzji, czy ścieżka przez serwer ma istnieć
5. **SEC-005** — sprawdzić dostępne zakresy w Microsoft Graph, potem zdecydować
6. Drobne obserwacje przy okazji
