'use client';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';

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
        p: 'When using AI features, text may be processed by OpenRouter servers located in the US. In such cases, appropriate safeguards are applied in accordance with GDPR requirements, including Standard Contractual Clauses where applicable, to ensure an adequate level of data protection.',
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
  de: {
    title: 'DSGVO-Informationen',
    updated: 'Letzte Aktualisierung: 25. Juni 2026',
    sections: [
      {
        h: '1. Wer wir als Verantwortlicher sind',
        p: 'Der Verantwortliche für Ihre personenbezogenen Daten ist Leszek Hofman, Dąbrówka Nowa, Polen (optimapdf.com). Als Anbieter digitaler Dienste verarbeiten wir Daten nur insoweit, als dies zur Bereitstellung von Online-PDF-Werkzeugen erforderlich ist. Bei allen Fragen zum Datenschutz können Sie uns unter folgender E-Mail-Adresse kontaktieren: kontakt@optimapdf.com.',
      },
      {
        h: '2. Welche personenbezogenen Daten wir verarbeiten und zu welchem Zweck',
        p: 'OptimaPDF ist darauf ausgelegt, die Datenerhebung zu minimieren. Wir verarbeiten ausschließlich:',
        items: [
          'IP-Adresse — zur Gewährleistung der Sicherheit und zur Missbrauchsprävention (berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO). IP-Adressen werden in Serverprotokollen für maximal 7 Tage gespeichert.',
          'Vom Benutzer hochgeladene Dateien — die meisten Werkzeuge verarbeiten Dateien vollständig im Browser (WebAssembly/JavaScript). Diese Dateien werden nicht an den Server gesendet und verlassen niemals Ihr Gerät. Ausgenommen sind Werkzeuge, die externe Bibliotheken erfordern (Komprimierung, OCR, Formatkonvertierungen), bei denen die Datei vorübergehend im RAM des Servers verarbeitet und unmittelbar nach dem Vorgang gelöscht wird — in der Regel innerhalb weniger Sekunden.',
          'Design- und Spracheinstellungen — werden ausschließlich im localStorage Ihres Browsers gespeichert. Sie werden nicht an den Server gesendet oder mit Dritten geteilt.',
        ],
      },
      {
        h: '3. Rechtsgrundlage der Verarbeitung',
        p: 'Wir verarbeiten Ihre Daten auf Grundlage von:',
        items: [
          'Art. 6 Abs. 1 lit. b DSGVO (Erforderlichkeit für die Vertragsdurchführung) — Bereitstellung von PDF-Werkzeugen auf Ihren Wunsch.',
          'Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse) — Gewährleistung der Dienstsicherheit, Missbrauchsprävention und technische Analyse des Websitebetriebs.',
          'Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) — für KI-Funktionen, die das Senden von Inhalten an eine externe API (OpenRouter) erfordern. Die Nutzung von KI erfordert eine ausdrückliche Einwilligung durch Akzeptanz der Nutzungsbedingungen.',
        ],
      },
      {
        h: '4. Wie lange wir Daten aufbewahren',
        p: 'Wir wenden folgende Aufbewahrungsfristen an:',
        items: [
          'IP-Adressen in Serverprotokollen: bis zu 7 Tage.',
          'An clientseitige Werkzeuge gesendete Dateien: werden nicht gespeichert — sie werden aus dem Speicher entfernt, wenn Sie den Browsertab schließen oder die Seite aktualisieren.',
          'An serverseitige Werkzeuge gesendete Dateien (Komprimierung, OCR, Konvertierungen): unmittelbar nach der Verarbeitung gelöscht (in der Regel innerhalb weniger Sekunden).',
          'localStorage-Daten: werden gespeichert, bis sie vom Benutzer manuell gelöscht oder der Browsercache geleert wird.',
        ],
      },
      {
        h: '5. Mit wem wir Daten teilen',
        p: 'Wir verkaufen, vermieten oder teilen Ihre personenbezogenen Daten nicht mit Dritten. In begrenztem Umfang können Daten verarbeitet werden durch:',
        items: [
          'OpenRouter.ai — bei der Nutzung von KI-Funktionen (AI Chat, AI Zusammenfassung, AI Übersetzer). Wir senden ausschließlich den aus dem PDF extrahierten Text, ohne nutzeridentifizierende Daten. OpenRouter entspricht der DSGVO und verfügt über angemessene Schutzmaßnahmen.',
          'Hosting-Anbieter — unsere Website wird von einem externen Anbieter gehostet, der anonyme Serverprotokolle (IP-Adresse, Browsertyp) für maximal 7 Tage speichern kann. Der Anbieter verfügt über eine ISO-27001-Zertifizierung und erfüllt die Anforderungen der DSGVO.',
        ],
      },
      {
        h: '6. Ihre Rechte nach der DSGVO',
        p: 'Gemäß Art. 15–22 DSGVO stehen Ihnen folgende Rechte zu:',
        items: [
          'Auskunftsrecht (Art. 15) — Sie können fragen, ob wir Ihre Daten verarbeiten, und Zugang dazu erhalten.',
          'Recht auf Berichtigung (Art. 16) — Sie können die Korrektur unrichtiger Daten verlangen.',
          'Recht auf Löschung (Art. 17) — Recht auf Vergessenwerden.',
          'Recht auf Einschränkung der Verarbeitung (Art. 18).',
          'Recht auf Datenübertragbarkeit (Art. 20).',
          'Widerspruchsrecht (Art. 21).',
          'Recht auf Widerruf der Einwilligung jederzeit — ohne Auswirkung auf die Rechtmäßigkeit der aufgrund der Einwilligung bis zum Widerruf erfolgten Verarbeitung.',
        ],
      },
      {
        h: '7. Wie Sie Ihre Rechte ausüben',
        p: 'Um eines der oben genannten Rechte auszuüben, senden Sie eine E-Mail an: kontakt@optimapdf.com. Wir werden innerhalb von 30 Tagen antworten. Wir erheben keine Gebühren für die Erfüllung von Anfragen, es sei denn, sie sind offensichtlich unbegründet oder unverhältnismäßig (Art. 12 Abs. 5 DSGVO).',
      },
      {
        h: '8. Beschwerderecht',
        p: 'Wenn Sie der Auffassung sind, dass die Verarbeitung Ihrer Daten gegen die DSGVO verstößt, haben Sie das Recht, bei dem Präsidenten des Büros für den Schutz personenbezogener Daten (PUODO), ul. Stawki 2, 00-193 Warschau, Polen, Beschwerde einzulegen.',
      },
      {
        h: '9. Datenübermittlung in Drittländer',
        p: 'Bei der Nutzung von KI-Funktionen kann der Text von OpenRouter-Servern in den USA verarbeitet werden. In solchen Fällen werden entsprechende Garantien gemäß den Anforderungen der DSGVO angewandt, einschließlich Standardvertragsklauseln, wo anwendbar, um ein angemessenes Schutzniveau der Daten zu gewährleisten.',
      },
      {
        h: '10. Cookies und localStorage',
        p: 'Wir verwenden keine Werbe-, Tracking- oder Analyse-Cookies Dritter. Wir verwenden ausschließlich das localStorage Ihres Browsers, um Ihre Einstellungen (Design, Sprache) zu speichern. Diese Daten werden lokal auf Ihrem Gerät gespeichert und können jederzeit durch Löschen des localStorage Ihres Browsers gelöscht werden.',
      },
      {
        h: '11. Änderungen an diesem DSGVO-Hinweis',
        p: 'Wir behalten uns das Recht vor, Änderungen an diesen DSGVO-Informationen vorzunehmen. Änderungen werden durch Aktualisierung des Datums oben auf dieser Seite mitgeteilt. Wir empfehlen, diesen Inhalt regelmäßig zu überprüfen.',
      },
    ],
  },
  es: {
    title: 'Información sobre el RGPD',
    updated: 'Última actualización: 25 de junio de 2026',
    sections: [
      {
        h: '1. Quiénes somos como responsable del tratamiento',
        p: 'El responsable del tratamiento de sus datos personales es Leszek Hofman, Dąbrówka Nowa, Polonia (optimapdf.com). Como proveedor de servicios digitales, procesamos datos únicamente en la medida necesaria para proporcionar herramientas PDF en línea. Para todas las cuestiones relacionadas con la protección de datos, puede contactarnos en: kontakt@optimapdf.com.',
      },
      {
        h: '2. Qué datos personales procesamos y con qué finalidad',
        p: 'OptimaPDF está diseñado para minimizar la recopilación de datos. Procesamos únicamente:',
        items: [
          'Dirección IP — para garantizar la seguridad y prevenir abusos (interés legítimo, art. 6.1.f RGPD). Las direcciones IP se almacenan en registros del servidor durante un máximo de 7 días.',
          'Archivos subidos por el usuario — la mayoría de las herramientas procesan archivos completamente en el navegador (WebAssembly/JavaScript). Estos archivos no se envían al servidor y nunca salen de su dispositivo. La excepción son las herramientas que requieren bibliotecas externas (compresión, OCR, conversiones de formato), donde el archivo se procesa temporalmente en la RAM del servidor y se elimina inmediatamente después de la operación — normalmente en pocos segundos.',
          'Preferencias de tema y idioma — se almacenan exclusivamente en el localStorage de su navegador. No se envían al servidor ni se comparten con terceros.',
        ],
      },
      {
        h: '3. Base jurídica del tratamiento',
        p: 'Tratamos sus datos en base a:',
        items: [
          'Art. 6.1.b RGPD (necesidad para la ejecución del contrato) — proporcionar herramientas PDF a su solicitud.',
          'Art. 6.1.f RGPD (interés legítimo) — garantizar la seguridad del servicio, prevenir abusos y análisis técnico del funcionamiento del sitio web.',
          'Art. 6.1.a RGPD (consentimiento) — para funciones de IA que requieren enviar contenido a una API externa (OpenRouter). El uso de IA requiere un consentimiento explícito mediante la aceptación de los términos.',
        ],
      },
      {
        h: '4. Cuánto tiempo conservamos los datos',
        p: 'Aplicamos los siguientes plazos de conservación:',
        items: [
          'Direcciones IP en registros del servidor: hasta 7 días.',
          'Archivos enviados a herramientas del lado del cliente: no se almacenan — se eliminan de la memoria cuando cierra la pestaña del navegador o actualiza la página.',
          'Archivos enviados a herramientas del lado del servidor (compresión, OCR, conversiones): se eliminan inmediatamente después del procesamiento (normalmente en pocos segundos).',
          'Datos en localStorage: se almacenan hasta que el usuario los elimine manualmente o se borre la caché del navegador.',
        ],
      },
      {
        h: '5. Con quién compartimos los datos',
        p: 'No vendemos, alquilamos ni compartimos sus datos personales con terceros. En medida limitada, los datos pueden ser procesados por:',
        items: [
          'OpenRouter.ai — al utilizar funciones de IA (AI Chat, AI Summary, AI Translate). Solo enviamos el texto extraído del PDF, sin datos identificativos del usuario. OpenRouter cumple con el RGPD y dispone de garantías adecuadas.',
          'Proveedor de hosting — nuestro sitio web está alojado por un proveedor externo que puede almacenar registros anónimos del servidor (dirección IP, tipo de navegador) durante un máximo de 7 días. El proveedor cuenta con certificación ISO 27001 y cumple con los requisitos del RGPD.',
        ],
      },
      {
        h: '6. Sus derechos bajo el RGPD',
        p: 'Conforme a los arts. 15–22 del RGPD, usted tiene derecho a:',
        items: [
          'Derecho de acceso (art. 15) — puede preguntar si tratamos sus datos y obtener acceso a los mismos.',
          'Derecho de rectificación (art. 16) — puede solicitar la corrección de datos inexactos.',
          'Derecho de supresión (art. 17) — derecho al olvido.',
          'Derecho a la limitación del tratamiento (art. 18).',
          'Derecho a la portabilidad de los datos (art. 20).',
          'Derecho de oposición (art. 21).',
          'Derecho a retirar el consentimiento en cualquier momento — sin afectar la licitud del tratamiento realizado antes de su retirada.',
        ],
      },
      {
        h: '7. Cómo ejercer sus derechos',
        p: 'Para ejercer cualquiera de los derechos anteriores, envíe un correo electrónico a: kontakt@optimapdf.com. Responderemos en un plazo de 30 días. No cobramos tasas por el cumplimiento de las solicitudes, salvo que sean manifiestamente infundadas o excesivas (art. 12.5 RGPD).',
      },
      {
        h: '8. Derecho a presentar una reclamación',
        p: 'Si considera que el tratamiento de sus datos viola el RGPD, tiene derecho a presentar una reclamación ante el Presidente de la Oficina de Protección de Datos Personales (PUODO), ul. Stawki 2, 00-193 Varsovia, Polonia.',
      },
      {
        h: '9. Transferencias de datos a terceros países',
        p: 'Al utilizar funciones de IA, el texto puede ser procesado por servidores de OpenRouter ubicados en EE. UU. En tales casos, se aplican garantías adecuadas de conformidad con los requisitos del RGPD, incluyendo Cláusulas Contractuales Estándar cuando corresponda, para garantizar un nivel adecuado de protección de datos.',
      },
      {
        h: '10. Cookies y localStorage',
        p: 'No utilizamos cookies publicitarias, de rastreo o analíticas de terceros. Solo utilizamos el localStorage del navegador para recordar sus preferencias (tema, idioma). Estos datos se almacenan localmente en su dispositivo y pueden eliminarse en cualquier momento borrando el localStorage de su navegador.',
      },
      {
        h: '11. Cambios en este aviso del RGPD',
        p: 'Nos reservamos el derecho de realizar cambios en esta información del RGPD. Cualquier cambio se comunicará actualizando la fecha en la parte superior de esta página. Le recomendamos revisar periódicamente este contenido.',
      },
    ],
  },
};

export default function RodoPage({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const { locale: detectedLocale } = useLocale();
  const locale = forcedLocale || detectedLocale;
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
