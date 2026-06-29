'use client';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

const content = {
  pl: {
    title: 'Informacja o RODO',
    updated: 'Ostatnia aktualizacja: 25 czerwca 2026',
    sections: [
      {
        h: '1. Kim jesteśmy jako administrator danych',
        p: 'Administratorem Twoich danych osobowych jest Leszek Hofman, Dąbrówka Nowa, Polska (optimapdf.com). Jako podmiot świadczący usługi cyfrowe przetwarzamy dane wyłącznie w zakresie niezbędnym do zapewnienia działania narzędzi PDF online. We wszystkich sprawach związanych z ochroną danych możesz kontaktować się pod adresem e-mail: kontakt@optimapdf.com.',
      },
      {
        h: '2. Jakie dane osobowe przetwarzamy i w jakim celu',
        p: 'OptimaPDF został zaprojektowany tak, aby minimalizować ilość zbieranych danych. Przetwarzamy wyłącznie:',
        items: [
          'Adres IP — w celu zapewnienia bezpieczeństwa i przeciwdziałania nadużyciom (prawnie uzasadniony interes, art. 6 ust. 1 lit. f RODO). Adres IP jest przechowywany w dziennikach serwera przez maksymalnie 7 dni.',
          'Pliki przesłane przez użytkownika — większość narzędzi przetwarza pliki w całości po stronie przeglądarki (WebAssembly/JavaScript). Pliki te nie są wysyłane na serwer i nie opuszczają Twojego urządzenia. Wyjątkiem są narzędzia wymagające zewnętrznych bibliotek (kompresja, OCR, konwersje formatów), gdzie plik jest tymczasowo przetwarzany w pamięci RAM serwera i natychmiast usuwany po zakończeniu operacji — maksymalnie do kilku sekund.',
          'Ustawienia motywu i języka — przechowywane wyłącznie w localStorage Twojej przeglądarki. Nie są one wysyłane na serwer ani udostępniane stronom trzecim.',
        ],
      },
      {
        h: '3. Podstawa prawna przetwarzania',
        p: 'Przetwarzamy Twoje dane w oparciu o:',
        items: [
          'Art. 6 ust. 1 lit. b RODO (niezbędność do wykonania umowy) — udostępnienie narzędzi PDF na Twoje żądanie.',
          'Art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes) — zapewnienie bezpieczeństwa usługi, zapobieganie nadużyciom, analiza techniczna działania strony.',
          'Art. 6 ust. 1 lit. a RODO (zgoda) — w przypadku funkcji AI, które wymagają wysłania treści do zewnętrznego API (OpenRouter). Korzystanie z AI wymaga wyraźnej zgody poprzez akceptację regulaminu.',
        ],
      },
      {
        h: '4. Jak długo przechowujemy dane',
        p: 'Stosujemy następujące okresy przechowywania:',
        items: [
          'Adresy IP w dziennikach serwera: do 7 dni.',
          'Pliki przesłane do narzędzi klienckich: nie są przechowywane — są usuwane z pamięci po zamknięciu karty przeglądarki lub odświeżeniu strony.',
          'Pliki przesłane do narzędzi serwerowych (kompresja, OCR, konwersje): usuwane natychmiast po zakończeniu przetwarzania (maksymalnie kilka sekund).',
          'Dane w localStorage: przechowywane do momentu ich ręcznego usunięcia przez użytkownika lub wyczyszczenia pamięci przeglądarki.',
        ],
      },
      {
        h: '5. Komu udostępniamy dane',
        p: 'Nie sprzedajemy, nie wynajmujemy ani nie udostępniamy Twoich danych osobowych stronom trzecim. W ograniczonym zakresie dane mogą być przetwarzane przez:',
        items: [
          'OpenRouter.ai — w przypadku korzystania z funkcji AI (Chat AI, Streszczenie AI, Tłumacz AI). Wysyłamy wyłącznie tekst wyodrębniony z PDF, bez danych identyfikujących użytkownika. OpenRouter działa zgodnie z RODO i posiada odpowiednie zabezpieczenia.',
          'Hosting — nasza strona hostowana jest u zewnętrznego dostawcy, który może przechowywać anonimowe dzienniki serwera (adres IP, typ przeglądarki) przez maksymalnie 7 dni. Dostawca posiada certyfikat ISO 27001 i spełnia wymogi RODO.',
        ],
      },
      {
        h: '6. Twoje prawa wynikające z RODO',
        p: 'Zgodnie z art. 15–22 RODO przysługuje Ci:',
        items: [
          'Prawo dostępu do danych (art. 15) — możesz zapytać, czy przetwarzamy Twoje dane i uzyskać do nich dostęp.',
          'Prawo do sprostowania danych (art. 16) — możesz żądać poprawienia nieprawidłowych danych.',
          'Prawo do usunięcia danych (art. 17) — prawo do bycia zapomnianym.',
          'Prawo do ograniczenia przetwarzania (art. 18).',
          'Prawo do przenoszenia danych (art. 20).',
          'Prawo do sprzeciwu wobec przetwarzania (art. 21).',
          'Prawo do cofnięcia zgody w dowolnym momencie — bez wpływu na zgodność z prawem przetwarzania przed jej cofnięciem.',
        ],
      },
      {
        h: '7. Jak skorzystać ze swoich praw',
        p: 'Aby skorzystać z któregokolwiek z powyższych praw, wyślij wiadomość e-mail na adres: kontakt@optimapdf.com. Odpowiemy w terminie do 30 dni. Nie pobieramy opłat za realizację żądań, chyba że są one ewidentnie nieuzasadnione lub nadmierne (art. 12 ust. 5 RODO).',
      },
      {
        h: '8. Prawo do wniesienia skargi',
        p: 'Jeśli uważasz, że przetwarzanie Twoich danych narusza RODO, masz prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (PUODO), ul. Stawki 2, 00-193 Warszawa.',
      },
      {
        h: '9. Przekazywanie danych do państw trzecich',
        p: 'W przypadku korzystania z funkcji AI, tekst może być przetwarzany przez serwery OpenRouter zlokalizowane w USA. OpenRouter uczestniczy w programie Data Privacy Framework (DPF), co zapewnia odpowiedni stopień ochrony danych zgodnie z decyzją Komisji Europejskiej 2023/1795.',
      },
      {
        h: '10. Pliki cookies i localStorage',
        p: 'Nie używamy cookies reklamowych, śledzących ani analitycznych stron trzecich. Używamy wyłącznie localStorage przeglądarki do zapamiętania Twoich preferencji (motyw, język). Dane te są przechowywane lokalnie na Twoim urządzeniu i możesz je w każdej chwili usunąć poprzez wyczyszczenie pamięci lokalnej przeglądarki.',
      },
      {
        h: '11. Zmiany w polityce RODO',
        p: 'Zastrzegamy sobie prawo do wprowadzania zmian w niniejszej informacji RODO. O wszelkich zmianach poinformujemy poprzez aktualizację daty na górze strony. Zachęcamy do okresowego sprawdzania treści.',
      },
    ],
  },
  en: {
    title: 'GDPR Information',
    updated: 'Last updated: June 25, 2026',
    sections: [
      {
        h: '1. Who we are as data controller',
        p: 'The controller of your personal data is Leszek Hofman, Dąbrówka Nowa, Poland (optimapdf.com). As a digital service provider, we process data only to the extent necessary to provide online PDF tools. For all data protection matters, you can contact us at: kontakt@optimapdf.com.',
      },
      {
        h: '2. What personal data we process and for what purpose',
        p: 'OptimaPDF is designed to minimize data collection. We process only:',
        items: [
          'IP address — to ensure security and prevent abuse (legitimate interest, Art. 6(1)(f) GDPR). IP addresses are stored in server logs for a maximum of 7 days.',
          'Files uploaded by the user — most tools process files entirely in the browser (WebAssembly/JavaScript). These files are not sent to the server and never leave your device. Exceptions are tools requiring external libraries (compression, OCR, format conversions), where the file is temporarily processed in the server\'s RAM and immediately deleted after the operation — typically within seconds.',
          'Theme and language preferences — stored exclusively in your browser\'s localStorage. They are not sent to the server or shared with third parties.',
        ],
      },
      {
        h: '3. Legal basis for processing',
        p: 'We process your data based on:',
        items: [
          'Art. 6(1)(b) GDPR (necessity for contract performance) — providing PDF tools upon your request.',
          'Art. 6(1)(f) GDPR (legitimate interest) — ensuring service security, preventing abuse, and technical analysis of website operation.',
          'Art. 6(1)(a) GDPR (consent) — for AI features that require sending content to an external API (OpenRouter). Using AI requires explicit consent by accepting the terms.',
        ],
      },
      {
        h: '4. How long we retain data',
        p: 'We apply the following retention periods:',
        items: [
          'IP addresses in server logs: up to 7 days.',
          'Files sent to client-side tools: not stored — they are removed from memory when you close the browser tab or refresh the page.',
          'Files sent to server-side tools (compression, OCR, conversions): deleted immediately after processing (typically within seconds).',
          'localStorage data: stored until manually deleted by the user or until browser cache is cleared.',
        ],
      },
      {
        h: '5. Who we share data with',
        p: 'We do not sell, rent, or share your personal data with third parties. To a limited extent, data may be processed by:',
        items: [
          'OpenRouter.ai — when using AI features (AI Chat, AI Summary, AI Translate). We send only text extracted from the PDF, without user-identifying data. OpenRouter complies with GDPR and has appropriate safeguards.',
          'Hosting provider — our website is hosted by an external provider who may store anonymous server logs (IP address, browser type) for a maximum of 7 days. The provider holds ISO 27001 certification and meets GDPR requirements.',
        ],
      },
      {
        h: '6. Your rights under GDPR',
        p: 'Under Articles 15–22 GDPR you have:',
        items: [
          'Right of access (Art. 15) — you may ask whether we process your data and obtain access to it.',
          'Right to rectification (Art. 16) — you may request correction of inaccurate data.',
          'Right to erasure (Art. 17) — right to be forgotten.',
          'Right to restriction of processing (Art. 18).',
          'Right to data portability (Art. 20).',
          'Right to object (Art. 21).',
          'Right to withdraw consent at any time — without affecting the lawfulness of processing before its withdrawal.',
        ],
      },
      {
        h: '7. How to exercise your rights',
        p: 'To exercise any of the above rights, send an email to: kontakt@optimapdf.com. We will respond within 30 days. We do not charge fees for fulfilling requests unless they are manifestly unfounded or excessive (Art. 12(5) GDPR).',
      },
      {
        h: '8. Right to lodge a complaint',
        p: 'If you believe that our processing of your data violates GDPR, you have the right to lodge a complaint with the President of the Personal Data Protection Office (PUODO), ul. Stawki 2, 00-193 Warsaw, Poland.',
      },
      {
        h: '9. Data transfers to third countries',
        p: 'When using AI features, text may be processed by OpenRouter servers located in the US. OpenRouter participates in the Data Privacy Framework (DPF) program, ensuring an adequate level of data protection in accordance with European Commission Decision 2023/1795.',
      },
      {
        h: '10. Cookies and localStorage',
        p: 'We do not use advertising, tracking, or third-party analytical cookies. We only use browser localStorage to remember your preferences (theme, language). This data is stored locally on your device and can be deleted at any time by clearing your browser\'s local storage.',
      },
      {
        h: '11. Changes to this GDPR notice',
        p: 'We reserve the right to make changes to this GDPR information. Any changes will be communicated by updating the date at the top of this page. We encourage you to periodically review this content.',
      },
    ],
  },
};

export default function RodoPage() {
  const { locale } = useLocale();
  const lang = (content as Record<string, typeof content.pl>)[locale] || content.en;

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">🛡️</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{lang.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">{lang.updated}</p>
      </div>

      <div className="tool-card rounded-2xl border p-8 space-y-8 text-sm leading-relaxed" style={{ color: 'var(--coffee-text-secondary)' }}>
        {lang.sections.map((sec, i) => (
          <section key={i}>
            <h2 className="text-lg sm:text-xl font-bold tool-heading mb-3">{sec.h}</h2>
            <p className="mb-2">{sec.p}</p>
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
