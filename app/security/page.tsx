'use client';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

const content = {
  pl: {
    title: 'Bezpieczeństwo',
    updated: 'Ostatnia aktualizacja: 25 czerwca 2026',
    intro: 'PDFTools przykłada najwyższą wagę do bezpieczeństwa danych. Poniżej przedstawiamy szczegółowy opis stosowanych środków bezpieczeństwa, które chronią Twoje pliki i dane podczas korzystania z naszych narzędzi.',
    sections: [
      {
        h: '1. Przetwarzanie lokalne w przeglądarce',
        p: 'Większość narzędzi PDFTools działa w architekturze zero-trust — Twój plik nie opuszcza Twojego urządzenia. Wykorzystujemy technologie WebAssembly i JavaScript do przetwarzania plików PDF bezpośrednio w przeglądarce. Oznacza to, że nawet my, jako operatorzy serwisu, nie mamy dostępu do Twoich plików. Dotyczy to następujących narzędzi: łączenie, dzielenie, obracanie, znak wodny, numerowanie, przycinanie, edycja, podpis, redakcja, spłaszczanie, usuwanie stron, wyodrębnianie, zmiana kolejności, dodawanie strony, metadane, PDF→SVG, PDF→EPUB, PDF→TXT, wypełnianie formularzy, PDF→obrazy, PDF/A, porównywanie PDF, odblokowywanie i zabezpieczanie hasłem.',
      },
      {
        h: '2. Szyfrowanie TLS/SSL',
        p: 'Cała komunikacja między Twoją przeglądarką a naszym serwerem jest szyfrowana za pomocą protokołu TLS 1.3 (Transport Layer Security). Używamy certyfikatu SSL wydanego przez zaufany urząd certyfikacji. Oznacza to, że dane przesyłane przez internet są nieczytelne dla osób trzecich. Możesz zweryfikować ważność certyfikatu, klikając ikonę kłódki w pasku adresu przeglądarki.',
      },
      {
        h: '3. Content Security Policy (CSP)',
        p: 'Stosujemy rygorystyczną politykę Content Security Policy (CSP), która ogranicza możliwość wykonywania skryptów pochodzących z niezaufanych źródeł. CSP zapobiega atakom typu Cross-Site Scripting (XSS), wstrzykiwaniu kodu oraz kradzieży danych poprzez ataki typu data theft. Nasza polityka CSP jest regularnie audytowana i aktualizowana.',
      },
      {
        h: '4. Przetwarzanie w pamięci RAM',
        p: 'W przypadku narzędzi, które wymagają przetwarzania serwerowego (kompresja, OCR, konwersje formatów), pliki są przetwarzane wyłącznie w pamięci RAM serwera. Pliki nie są zapisywane na dysku twardym, nie są kopiowane do backupów ani replikowane. Po zakończeniu operacji plik jest natychmiast usuwany z pamięci. Maksymalny czas przechowania pliku na serwerze to kilka sekund.',
      },
      {
        h: '5. Weryfikacja plików',
        items: [
          'Weryfikacja sygnatury (magic bytes) — przed przetworzeniem sprawdzamy, czy przesłany plik faktycznie jest plikiem PDF, poprzez analizę jego nagłówka (%PDF). Zapobiega to atakom polegającym na podszywaniu się pod format PDF.',
          'Limit rozmiaru pliku — maksymalny rozmiar przesyłanego pliku to 100 MB. Chroni to zarówno przed przeciążeniem serwera, jak i przed potencjalnymi atakami DoS.',
          'Weryfikacja integralności — sprawdzamy, czy plik nie jest uszkodzony przed rozpoczęciem przetwarzania.',
        ],
      },
      {
        h: '6. Ochrona przed atakami',
        items: [
          'Ochrona CSRF — stosujemy tokeny anty-CSRF oraz weryfikację nagłówka Origin/Referer, aby zapobiec atakom Cross-Site Request Forgery.',
          'Rate limiting — ograniczamy liczbę zapytań z jednego adresu IP, co chroni przed atakami brute-force i DoS.',
          'HTTP Security Headers — stosujemy nagłówki X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) oraz Referrer-Policy.',
          'Walidacja wejścia — wszystkie dane wejściowe są walidowane zarówno po stronie klienta, jak i serwera, co zapobiega atakom injection.',
        ],
      },
      {
        h: '7. Zero przechowywania danych',
        p: 'Nie przechowujemy Twoich plików ani danych osobowych na serwerze. Nie wymagamy rejestracji, logowania ani podawania adresu e-mail do korzystania z narzędzi. Nie tworzymy profili użytkowników ani nie śledzimy Twojej aktywności między wizytami.',
      },
      {
        h: '8. Bezpieczeństwo funkcji AI',
        p: 'Funkcje AI korzystają z zewnętrznego API OpenRouter. Twój klucz API jest przechowywany wyłącznie w localStorage Twojej przeglądarki — nie mamy do niego dostępu. Tekst wysyłany do OpenRouter jest ograniczony do treści wyodrębnionej z PDF. Nie wysyłamy danych identyfikujących użytkownika, adresu IP ani informacji o przeglądarce. OpenRouter stosuje szyfrowanie TLS i nie wykorzystuje przesłanych treści do trenowania modeli AI.',
      },
      {
        h: '9. Bezpieczeństwo zależności',
        p: 'Regularnie aktualizujemy wszystkie biblioteki i zależności używane w projekcie. Używamy narzędzi do automatycznego skanowania podatności (npm audit, Snyk). Wszelkie krytyczne podatności są łatane w ciągu 48 godzin od publikacji informacji o CVE.',
      },
      {
        h: '10. Raportowanie podatności',
        p: 'Jeśli odkryjesz lukę bezpieczeństwa w PDFTools, prosimy o odpowiedzialne zgłoszenie: wyślij wiadomość na adres kontakt@optimapdf.com. Zobowiązujemy się do:',
        items: [
          'Potwierdzenia otrzymania zgłoszenia w ciągu 24 godzin.',
          'Przeprowadzenia analizy i podjęcia działań naprawczych w ciągu 14 dni (w zależności od krytyczności).',
          'Poinformowania zgłaszającego o podjętych działaniach.',
          'Niepodejmowania działań prawnych wobec osób dokonujących odpowiedzialnego ujawnienia podatności.',
        ],
      },
      {
        h: '11. Bezpieczeństwo transmisji plików',
        p: 'W rzadkich przypadkach, gdy plik musi zostać przesłany na serwer (narzędzia serwerowe), transmisja odbywa się przez szyfrowane połączenie HTTPS z użyciem protokołu TLS 1.3. Plik jest przesyłany w pamięci (streaming), bez zapisu tymczasowego na dysku. Po otrzymaniu odpowiedzi plik jest natychmiast usuwany z pamięci serwera. Nie prowadzimy logów operacji na plikach.',
      },
      {
        h: '12. Zgodność ze standardami',
        p: 'Stosujemy się do następujących standardów i rekomendacji bezpieczeństwa:',
        items: [
          'OWASP Top 10 — zabezpieczenia przed najczęstszymi podatnościami aplikacji webowych.',
          'RODO (GDPR) — ochrona danych osobowych zgodnie z rozporządzeniem UE 2016/679.',
          'Wytyczne CERT Polska — stosowanie rekomendacji polskiego zespołu CERT.',
          'Mozilla Observatory — dążymy do oceny A+ w teście bezpieczeństwa nagłówków HTTP.',
        ],
      },
    ],
  },
  en: {
    title: 'Security',
    updated: 'Last updated: June 25, 2026',
    intro: 'PDFTools places the highest importance on data security. Below is a detailed description of the security measures we employ to protect your files and data when using our tools.',
    sections: [
      {
        h: '1. Client-side processing in the browser',
        p: 'Most PDFTools operate on a zero-trust architecture — your file never leaves your device. We use WebAssembly and JavaScript to process PDF files directly in your browser. This means that even we, as service operators, have no access to your files. This applies to: merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, and protect-pdf.',
      },
      {
        h: '2. TLS/SSL encryption',
        p: 'All communication between your browser and our server is encrypted using TLS 1.3 (Transport Layer Security). We use an SSL certificate issued by a trusted certificate authority. This means that data transmitted over the internet is unreadable to third parties. You can verify the certificate validity by clicking the padlock icon in your browser\'s address bar.',
      },
      {
        h: '3. Content Security Policy (CSP)',
        p: 'We enforce a strict Content Security Policy (CSP) that restricts the execution of scripts from untrusted sources. CSP prevents Cross-Site Scripting (XSS) attacks, code injection, and data theft. Our CSP policy is regularly audited and updated.',
      },
      {
        h: '4. RAM-only processing',
        p: 'For tools requiring server-side processing (compression, OCR, format conversions), files are processed exclusively in the server\'s RAM. Files are not written to the hard drive, not copied to backups, and not replicated. Once the operation completes, the file is immediately removed from memory. Maximum server retention time: a few seconds.',
      },
      {
        h: '5. File verification',
        items: [
          'Magic bytes verification — before processing, we verify that the uploaded file is actually a PDF by analyzing its header (%PDF). This prevents file-type spoofing attacks.',
          'File size limit — maximum upload size is 100 MB. This protects against both server overload and potential DoS attacks.',
          'Integrity check — we verify that the file is not corrupted before starting processing.',
        ],
      },
      {
        h: '6. Attack protection',
        items: [
          'CSRF protection — we use anti-CSRF tokens and Origin/Referer header verification to prevent Cross-Site Request Forgery attacks.',
          'Rate limiting — we limit requests from a single IP address, protecting against brute-force and DoS attacks.',
          'HTTP Security Headers — we apply X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS), and Referrer-Policy headers.',
          'Input validation — all input data is validated on both client and server side, preventing injection attacks.',
        ],
      },
      {
        h: '7. Zero data storage',
        p: 'We do not store your files or personal data on the server. We do not require registration, login, or email address to use the tools. We do not create user profiles or track your activity between visits.',
      },
      {
        h: '8. AI feature security',
        p: 'AI features use the external OpenRouter API. Your API key is stored exclusively in your browser\'s localStorage — we have no access to it. Text sent to OpenRouter is limited to content extracted from the PDF. We do not send user-identifying data, IP address, or browser information. OpenRouter uses TLS encryption and does not use submitted content for AI model training.',
      },
      {
        h: '9. Dependency security',
        p: 'We regularly update all libraries and dependencies used in the project. We use automatic vulnerability scanning tools (npm audit, Snyk). All critical vulnerabilities are patched within 48 hours of CVE publication.',
      },
      {
        h: '10. Vulnerability disclosure',
        p: 'If you discover a security vulnerability in PDFTools, please responsibly disclose it by emailing kontakt@optimapdf.com. We commit to:',
        items: [
          'Acknowledging receipt within 24 hours.',
          'Performing analysis and taking corrective action within 14 days (depending on severity).',
          'Informing the reporter about actions taken.',
          'Not pursuing legal action against those who responsibly disclose vulnerabilities.',
        ],
      },
      {
        h: '11. File transmission security',
        p: 'In the rare cases where a file must be sent to the server (server-side tools), transmission occurs over encrypted HTTPS using TLS 1.3. The file is transmitted in memory (streaming) without temporary disk storage. After receiving the response, the file is immediately removed from server memory. We do not keep logs of file operations.',
      },
      {
        h: '12. Standards compliance',
        p: 'We adhere to the following security standards and recommendations:',
        items: [
          'OWASP Top 10 — protection against the most common web application vulnerabilities.',
          'GDPR — personal data protection in accordance with EU Regulation 2016/679.',
          'CERT Polska guidelines — following recommendations from the Polish CERT team.',
          'Mozilla Observatory — we aim for an A+ rating in HTTP headers security test.',
        ],
      },
    ],
  },
};

export default function SecurityPage() {
  const { locale } = useLocale();
  const lang = (content as Record<string, typeof content.pl>)[locale] || content.en;

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">🔐</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{lang.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">{lang.updated}</p>
      </div>

      <div className="tool-card rounded-2xl border p-8 space-y-6 text-sm leading-relaxed" style={{ color: 'var(--coffee-text-secondary)' }}>
        <p className="text-base leading-relaxed">{lang.intro}</p>

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
