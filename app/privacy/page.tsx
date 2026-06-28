'use client';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

const content = {
  pl: {
    title: 'Polityka prywatności',
    updated: 'Ostatnia aktualizacja: 25 czerwca 2026',
    sections: [
      {
        h: '1. Postanowienia ogólne',
        p: 'Niniejsza Polityka prywatności określa zasady przetwarzania i ochrony danych osobowych użytkowników serwisu PDFTools (optimapdf.com). PDFTools przykłada najwyższą wagę do ochrony prywatności i bezpieczeństwa danych. Wszystkie narzędzia zostały zaprojektowane zgodnie z zasadą privacy by design — domyślnie Twoje pliki przetwarzane są lokalnie w przeglądarce.',
      },
      {
        h: '2. Administrator danych',
        p: 'Administratorem danych osobowych jest PDFTools. Kontakt: kontakt@optimapdf.com. Administrator nie wyznaczył Inspektora Ochrony Danych — we wszystkich sprawach związanych z ochroną danych osobowych kontaktuj się bezpośrednio poprzez powyższy adres e-mail.',
      },
      {
        h: '3. Zakres i cele zbierania danych',
        sub: [
          {
            h: '3.1 Dane techniczne',
            p: 'Podczas korzystania ze strony automatycznie zbierane są następujące dane techniczne: adres IP, typ i wersja przeglądarki, system operacyjny, rozdzielczość ekranu, przybliżona lokalizacja geograficzna (na poziomie kraju), czas odwiedzin i czas spędzony na stronie. Dane te są anonimizowane i wykorzystywane wyłącznie do celów statystycznych oraz zapewnienia bezpieczeństwa.',
          },
          {
            h: '3.2 Pliki przesyłane przez użytkownika',
            p: 'Pliki PDF przesyłane do narzędzi są przetwarzane w następujący sposób:',
            items: [
              'Narzędzia klienckie (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) — plik jest przetwarzany w całości w przeglądarce za pomocą WebAssembly i JavaScript. Plik nie opuszcza Twojego urządzenia.',
              'Narzędzia serwerowe (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) — plik jest tymczasowo przesyłany na serwer, przetwarzany wyłącznie w pamięci RAM i natychmiast usuwany po zakończeniu operacji. Maksymalny czas przechowania: kilka sekund.',
              'Funkcje AI (Chat AI, Streszczenie AI, Tłumacz AI) — tekst wyodrębniony z PDF jest wysyłany do zewnętrznego API OpenRouter. Nie wysyłamy danych identyfikujących użytkownika. Treść nie jest przechowywana ani wykorzystywana do trenowania modeli.',
            ],
          },
          {
            h: '3.3 Preferencje użytkownika',
            p: 'Informacje o wybranym motywie (ciemny/jasny) i języku (polski/angielski) są przechowywane w localStorage przeglądarki. Nie są one wysyłane na serwer ani udostępniane stronom trzecim.',
          },
        ],
      },
      {
        h: '4. Podstawa prawna przetwarzania',
        items: [
          'Art. 6 ust. 1 lit. b RODO — wykonanie umowy o świadczenie usług drogą elektroniczną (udostępnienie narzędzi PDF).',
          'Art. 6 ust. 1 lit. f RODO — prawnie uzasadniony interes administratora (zapewnienie bezpieczeństwa, zapobieganie nadużyciom, analiza techniczna).',
          'Art. 6 ust. 1 lit. a RODO — zgoda użytkownika (w przypadku funkcji AI). Zgodę można wycofać w dowolnym momencie.',
        ],
      },
      {
        h: '5. Odbiorcy danych',
        p: 'Dane mogą być przekazywane następującym kategoriom odbiorców:',
        items: [
          'Podmioty przetwarzające na nasze zlecenie (hosting, OpenRouter.ai) — na podstawie umowy powierzenia przetwarzania danych.',
          'Organy uprawnione na podstawie przepisów prawa — wyłącznie w przypadkach przewidzianych prawem.',
        ],
      },
      {
        h: '6. Przekazywanie danych poza EOG',
        p: 'W przypadku korzystania z funkcji AI, tekst może być przetwarzany na serwerach OpenRouter w USA. OpenRouter uczestniczy w Data Privacy Framework (DPF), co zapewnia odpowiedni stopień ochrony danych (decyzja Komisji Europejskiej 2023/1795). W pozostałych przypadkach dane nie są przekazywane do państw trzecich.',
      },
      {
        h: '7. Okres przechowywania danych',
        p: 'Dane przechowywane są przez następujące okresy:',
        items: [
          'Dzienniki serwera (adres IP, User-Agent): do 7 dni.',
          'Pliki przesłane do narzędzi klienckich: nie są przechowywane — usuwane z pamięci po odświeżeniu strony.',
          'Pliki przesłane do narzędzi serwerowych: usuwane natychmiast po przetworzeniu.',
          'Dane w localStorage: do momentu ich ręcznego usunięcia przez użytkownika.',
        ],
      },
      {
        h: '8. Prawa użytkownika',
        p: 'Przysługuje Ci prawo do:',
        items: [
          'Dostępu do treści swoich danych (art. 15 RODO).',
          'Sprostowania danych (art. 16 RODO).',
          'Usunięcia danych (art. 17 RODO) — prawo do bycia zapomnianym.',
          'Ograniczenia przetwarzania (art. 18 RODO).',
          'Przenoszenia danych (art. 20 RODO).',
          'Sprzeciwu wobec przetwarzania (art. 21 RODO).',
          'Cofnięcia zgody w dowolnym momencie bez wpływu na zgodność z prawem przetwarzania przed jej cofnięciem.',
          'Wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (PUODO), ul. Stawki 2, 00-193 Warszawa.',
        ],
      },
      {
        h: '9. Bezpieczeństwo danych',
        p: 'Stosujemy następujące środki bezpieczeństwa:',
        items: [
          'Szyfrowanie TLS/SSL — cała komunikacja między przeglądarką a serwerem jest szyfrowana.',
          'Content Security Policy (CSP) — ogranicza możliwość wykonywania niezaufanych skryptów.',
          'Przetwarzanie w pamięci RAM — pliki nie są zapisywane na dysku serwera.',
          'Automatyczne usuwanie — pliki są usuwane natychmiast po zakończeniu operacji.',
          'Limit rozmiaru pliku — maksymalnie 100 MB.',
          'Weryfikacja typu pliku — sprawdzamy sygnaturę (magic bytes) przed przetworzeniem.',
          'Brak logowania — nie wymagamy rejestracji ani logowania.',
          'Brak cookies śledzących — nie używamy cookies reklamowych ani analitycznych stron trzecich.',
        ],
      },
      {
        h: '10. LocalStorage i cookies',
        p: 'Strona korzysta wyłącznie z localStorage (pamięć lokalna przeglądarki) do przechowywania preferencji użytkownika (motyw, język). Nie używamy cookies służących do śledzenia, targetowania reklam ani analityki behawioralnej. Dane w localStorage są w pełni kontrolowane przez użytkownika i mogą być w każdej chwili usunięte.',
      },
      {
        h: '11. Funkcje AI i OpenRouter',
        p: 'Korzystanie z funkcji AI (Chat AI, Streszczenie AI, Tłumacz AI) wymaga posiadania własnego klucza API OpenRouter, który jest przechowywany wyłącznie w localStorage Twojej przeglądarki i nie jest udostępniany administratorowi serwisu. Klucz API jest wykorzystywany wyłącznie do komunikacji z API OpenRouter. Nie mamy dostępu do Twojego klucza API ani do treści zapytań wysyłanych do OpenRouter.',
      },
      {
        h: '12. Postanowienia końcowe',
        p: 'Zastrzegamy sobie prawo do wprowadzania zmian w niniejszej Polityce prywatności. O zmianach poinformujemy poprzez aktualizację daty na górze strony. Wszelkie pytania dotyczące polityki prywatności prosimy kierować na adres: kontakt@optimapdf.com.',
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: June 25, 2026',
    sections: [
      {
        h: '1. General provisions',
        p: 'This Privacy Policy defines the principles of processing and protection of personal data of users of the PDFTools website (optimapdf.com). PDFTools places the highest importance on privacy and data security. All tools have been designed following the privacy by design principle — by default, your files are processed locally in your browser.',
      },
      {
        h: '2. Data controller',
        p: 'The data controller is PDFTools. Contact: kontakt@optimapdf.com. The controller has not appointed a Data Protection Officer — for all matters related to personal data protection, contact us directly via the email address above.',
      },
      {
        h: '3. Scope and purposes of data collection',
        sub: [
          {
            h: '3.1 Technical data',
            p: 'When using the website, the following technical data is automatically collected: IP address, browser type and version, operating system, screen resolution, approximate geographic location (country level), visit time and time spent on the site. This data is anonymized and used solely for statistical purposes and security assurance.',
          },
          {
            h: '3.2 User-uploaded files',
            p: 'PDF files uploaded to tools are processed as follows:',
            items: [
              'Client-side tools (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) — the file is processed entirely in the browser using WebAssembly and JavaScript. The file never leaves your device.',
              'Server-side tools (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) — the file is temporarily sent to the server, processed exclusively in RAM, and immediately deleted after the operation. Maximum retention time: a few seconds.',
              'AI functions (AI Chat, AI Summary, AI Translate) — text extracted from the PDF is sent to the external OpenRouter API. We do not send user-identifying data. The content is not stored or used for model training.',
            ],
          },
          {
            h: '3.3 User preferences',
            p: 'Information about the selected theme (dark/light) and language (Polish/English) is stored in the browser\'s localStorage. It is not sent to the server or shared with third parties.',
          },
        ],
      },
      {
        h: '4. Legal basis for processing',
        items: [
          'Art. 6(1)(b) GDPR — performance of an electronic service contract (providing PDF tools).',
          'Art. 6(1)(f) GDPR — legitimate interest of the controller (ensuring security, preventing abuse, technical analysis).',
          'Art. 6(1)(a) GDPR — user consent (for AI functions). Consent can be withdrawn at any time.',
        ],
      },
      {
        h: '5. Data recipients',
        p: 'Data may be transferred to the following categories of recipients:',
        items: [
          'Processors acting on our behalf (hosting, OpenRouter.ai) — based on data processing agreements.',
          'Authorities entitled under legal provisions — only in cases provided for by law.',
        ],
      },
      {
        h: '6. Data transfers outside the EEA',
        p: 'When using AI features, text may be processed on OpenRouter servers in the US. OpenRouter participates in the Data Privacy Framework (DPF), ensuring an adequate level of data protection (European Commission Decision 2023/1795). In other cases, data is not transferred to third countries.',
      },
      {
        h: '7. Data retention period',
        p: 'Data is stored for the following periods:',
        items: [
          'Server logs (IP address, User-Agent): up to 7 days.',
          'Files uploaded to client-side tools: not stored — removed from memory upon page refresh.',
          'Files uploaded to server-side tools: deleted immediately after processing.',
          'localStorage data: until manually deleted by the user.',
        ],
      },
      {
        h: '8. User rights',
        p: 'You have the right to:',
        items: [
          'Access your data (Art. 15 GDPR).',
          'Rectification of data (Art. 16 GDPR).',
          'Erasure of data (Art. 17 GDPR) — right to be forgotten.',
          'Restriction of processing (Art. 18 GDPR).',
          'Data portability (Art. 20 GDPR).',
          'Object to processing (Art. 21 GDPR).',
          'Withdraw consent at any time without affecting the lawfulness of processing based on consent before its withdrawal.',
          'Lodge a complaint with the President of the Personal Data Protection Office (PUODO), ul. Stawki 2, 00-193 Warsaw, Poland.',
        ],
      },
      {
        h: '9. Data security',
        p: 'We apply the following security measures:',
        items: [
          'TLS/SSL encryption — all communication between browser and server is encrypted.',
          'Content Security Policy (CSP) — limits the ability to execute untrusted scripts.',
          'RAM-only processing — files are not written to the server\'s disk.',
          'Automatic deletion — files are deleted immediately after the operation completes.',
          'File size limit — maximum 100 MB.',
          'File type verification — we check the file signature (magic bytes) before processing.',
          'No login required — we do not require registration or login.',
          'No tracking cookies — we do not use advertising or third-party analytical cookies.',
        ],
      },
      {
        h: '10. LocalStorage and cookies',
        p: 'The website only uses localStorage (browser local storage) to store user preferences (theme, language). We do not use cookies for tracking, ad targeting, or behavioral analytics. localStorage data is fully controlled by the user and can be deleted at any time.',
      },
      {
        h: '11. AI functions and OpenRouter',
        p: 'Using AI functions (AI Chat, AI Summary, AI Translate) requires your own OpenRouter API key, which is stored exclusively in your browser\'s localStorage and is not shared with the website administrator. The API key is used solely for communication with the OpenRouter API. We do not have access to your API key or the content of queries sent to OpenRouter.',
      },
      {
        h: '12. Final provisions',
        p: 'We reserve the right to make changes to this Privacy Policy. Changes will be communicated by updating the date at the top of this page. Any questions regarding the privacy policy should be directed to: kontakt@optimapdf.com.',
      },
    ],
  },
};

export default function PrivacyPage() {
  const { locale } = useLocale();
  const lang = (content as Record<string, typeof content.pl>)[locale] || content.en;

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{lang.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">{lang.updated}</p>
      </div>

      <div className="tool-card rounded-2xl border p-8 space-y-8 text-sm leading-relaxed" style={{ color: 'var(--coffee-text-secondary)' }}>
        {lang.sections.map((sec, i) => (
          <section key={i}>
            <h2 className="text-lg sm:text-xl font-bold tool-heading mb-3">{sec.h}</h2>
            {'p' in sec && <p className="mb-2">{sec.p}</p>}
            {'items' in sec && sec.items && (
              <ul className="list-disc pl-5 space-y-1.5">
                {sec.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            )}
            {'sub' in sec && sec.sub && (
              <div className="space-y-4 mt-3">
                {sec.sub.map((sub, k) => (
                  <div key={k}>
                    <h3 className="text-base font-bold tool-heading mb-2">{sub.h}</h3>
                    <p className="mb-2">{sub.p}</p>
                    {'items' in sub && sub.items && (
                      <ul className="list-disc pl-5 space-y-1.5">
                        {sub.items.map((item, l) => (
                          <li key={l}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link href="/" className="!text-[var(--coffee-accent)] hover:underline text-sm">
          {t('back.to_home', locale)}
        </Link>
      </div>
    </main>
  );
}
