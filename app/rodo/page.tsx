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
  pt: {
    title: 'Informação sobre o RGPD',
    updated: 'Última atualização: 25 de junho de 2026',
    sections: [
      {
        h: '1. Quem somos como responsável pelo tratamento',
        p: 'O responsável pelo tratamento dos seus dados pessoais é Leszek Hofman, Dąbrówka Nowa, Polónia (optimapdf.com). Como prestador de serviços digitais, tratamos dados apenas na medida estritamente necessária para disponibilizar ferramentas PDF online. Para todas as questões relativas à proteção de dados, pode contactar-nos em: kontakt@optimapdf.com.',
      },
      {
        h: '2. Que dados pessoais tratamos e para que finalidade',
        p: 'OptimaPDF foi concebido para minimizar a recolha de dados. Tratamos exclusivamente:',
        items: [
          'Endereço IP — para garantir a segurança e prevenir abusos (interesse legítimo, art. 6.º n.º 1 alínea f RGPD). Os endereços IP são armazenados nos registos do servidor por um máximo de 7 dias.',
          'Ficheiros carregados pelo utilizador — a maioria das ferramentas processa ficheiros integralmente no navegador (WebAssembly/JavaScript). Estes ficheiros não são enviados para o servidor e nunca saem do seu dispositivo. A exceção são ferramentas que requerem bibliotecas externas (compressão, OCR, conversões de formato), em que o ficheiro é processado temporariamente na RAM do servidor e eliminado imediatamente após a operação — normalmente em poucos segundos.',
          'Preferências de tema e idioma — armazenadas exclusivamente no localStorage do seu navegador. Não são enviadas para o servidor nem partilhadas com terceiros.',
        ],
      },
      {
        h: '3. Base jurídica do tratamento',
        p: 'Tratamos os seus dados com base em:',
        items: [
          'Art. 6.º n.º 1 alínea b RGPD (necessidade para a execução do contrato) — disponibilizar ferramentas PDF ao seu pedido.',
          'Art. 6.º n.º 1 alínea f RGPD (interesse legítimo) — garantir a segurança do serviço, prevenir abusos e análise técnica do funcionamento do site.',
          'Art. 6.º n.º 1 alínea a RGPD (consentimento) — para funções de IA que requerem o envio de conteúdo para uma API externa (OpenRouter). A utilização de IA requer um consentimento explícito mediante a aceitação dos termos.',
        ],
      },
      {
        h: '4. Quanto tempo conservamos os dados',
        p: 'Aplicamos os seguintes prazos de conservação:',
        items: [
          'Endereços IP nos registos do servidor: até 7 dias.',
          'Ficheiros enviados para ferramentas do lado do cliente: não são armazenados — são eliminados da memória quando fecha o separador do navegador ou atualiza a página.',
          'Ficheiros enviados para ferramentas do lado do servidor (compressão, OCR, conversões): eliminados imediatamente após o processamento (normalmente em poucos segundos).',
          'Dados no localStorage: armazenados até serem eliminados manualmente pelo utilizador ou até a cache do navegador ser limpa.',
        ],
      },
      {
        h: '5. Com quem partilhamos os dados',
        p: 'Não vendemos, alugamos nem partilhamos os seus dados pessoais com terceiros. Em medida limitada, os dados podem ser tratados por:',
        items: [
          'OpenRouter.ai — ao utilizar funções de IA (AI Chat, AI Summary, AI Translate). Enviamos apenas o texto extraído do PDF, sem dados identificativos do utilizador. O OpenRouter cumpre o RGPD e dispõe de garantias adequadas.',
          'Fornecedor de hosting — o nosso site é alojado por um fornecedor externo que pode armazenar registos anónimos do servidor (endereço IP, tipo de navegador) por um máximo de 7 dias. O fornecedor possui certificação ISO 27001 e cumpre os requisitos do RGPD.',
        ],
      },
      {
        h: '6. Os seus direitos ao abrigo do RGPD',
        p: 'Em conformidade com os arts. 15.º–22.º do RGPD, tem direito a:',
        items: [
          'Direito de acesso (art. 15.º) — pode perguntar se tratamos os seus dados e obter acesso aos mesmos.',
          'Direito de retificação (art. 16.º) — pode solicitar a correção de dados inexatos.',
          'Direito de eliminação (art. 17.º) — direito ao esquecimento.',
          'Direito à limitação do tratamento (art. 18.º).',
          'Direito à portabilidade dos dados (art. 20.º).',
          'Direito de oposição (art. 21.º).',
          'Direito a retirar o consentimento a qualquer momento — sem afetar a licitude do tratamento realizado antes da sua retirada.',
        ],
      },
      {
        h: '7. Como exercer os seus direitos',
        p: 'Para exercer qualquer um dos direitos acima referidos, envie um e-mail para: kontakt@optimapdf.com. Responderemos num prazo de 30 dias. Não cobramos taxas pelo cumprimento dos pedidos, salvo se forem manifestamente infundados ou excessivos (art. 12.º n.º 5 RGPD).',
      },
      {
        h: '8. Direito de reclamação',
        p: 'Se considera que o tratamento dos seus dados viola o RGPD, tem o direito de apresentar uma reclamação junto do Presidente do Escritório de Proteção de Dados Pessoais (PUODO), ul. Stawki 2, 00-193 Varsóvia, Polónia.',
      },
      {
        h: '9. Transferências de dados para países terceiros',
        p: 'Ao utilizar funções de IA, o texto pode ser processado por servidores da OpenRouter localizados nos EUA. Nesses casos, são aplicadas garantias adequadas em conformidade com os requisitos do RGPD, incluindo Cláusulas Contratuais-Tipo quando aplicável, para garantir um nível adequado de proteção de dados.',
      },
      {
        h: '10. Cookies e localStorage',
        p: 'Não utilizamos cookies publicitários, de rastreamento ou analíticos de terceiros. Utilizamos apenas o localStorage do navegador para recordar as suas preferências (tema, idioma). Estes dados são armazenados localmente no seu dispositivo e podem ser eliminados a qualquer momento ao limpar o localStorage do seu navegador.',
      },
      {
        h: '11. Alterações a este aviso RGPD',
        p: 'Reservamo-nos o direito de efetuar alterações a esta informação RGPD. Quaisquer alterações serão comunicadas mediante atualização da data no topo desta página. Recomendamos a revisão periódica deste conteúdo.',
      },
    ],
  },
  no: {
    title: 'Informasjon om personvernforordningen (GDPR)',
    updated: 'Sist oppdatert: 25. juni 2026',
    sections: [
      {
        h: '1. Hvem vi er som behandlingsansvarlig',
        p: 'Behandlingsansvarlig for dine personopplysninger er Leszek Hofman, Dąbrówka Nowa, Polen (optimapdf.com). Som digital tjenesteleverandør behandler vi data kun i den utstrekning det er nødvendig for å tilby PDF-verktøy på nett. Ved alle spørsmål om databeskyttelse kan du kontakte oss på: kontakt@optimapdf.com.',
      },
      {
        h: '2. Hvilke personopplysninger vi behandler og til hvilket formål',
        p: 'OptimaPDF er designet for å minimere innsamling av data. Vi behandler utelukkende:',
        items: [
          'IP-adresse — for å sikre beskyttelse og forhindre misbruk (berettiget interesse, art. 6 nr. 1 bokstav f GDPR). IP-adresser lagres i serverlogger i maksimalt 7 dager.',
          'Filer lastet opp av brukeren — de fleste verktøyene behandler filer fullstendig i nettleseren (WebAssembly/JavaScript). Disse filene sendes ikke til serveren og forlater aldri enheten din. Unntak er verktøy som krever eksterne bibliotek (komprimering, OCR, formatkonverteringer), der filen midlertidig behandles i serverens RAM og slettes umiddelbart etter operasjonen — vanligvis innen sekunder.',
          'Temapreferanser og språkpreferanser — lagres utelukkende i nettleserens local storage. De sendes ikke til serveren eller deles med tredjeparter.',
        ],
      },
      {
        h: '3. Rettslig grunnlag for behandlingen',
        p: 'Vi behandler dine data basert på:',
        items: [
          'Art. 6 nr. 1 bokstav b GDPR (nødvendighet for oppfyllelse av kontrakt) — tilby PDF-verktøy etter ditt forespørsel.',
          'Art. 6 nr. 1 bokstav f GDPR (berettiget interesse) — sikre tjenestesikkerhet, forhindre misbruk og teknisk analyse av nettstedets funksjon.',
          'Art. 6 nr. 1 bokstav a GDPR (samtykke) — for AI-funksjoner som krever sending av innhold til et eksternt API (OpenRouter). Bruk av AI krever eksplisitt samtykke ved å akseptere vilkårene.',
        ],
      },
      {
        h: '4. Hvor lenge vi oppbevarer data',
        p: 'Vi benytter følgende oppbevaringsperioder:',
        items: [
          'IP-adresser i serverlogger: opptil 7 dager.',
          'Filer sendt til klientbaserte verktøy: lagres ikke — de fjernes fra minnet når du lukker nettleserfanen eller oppdaterer siden.',
          'Filer sendt til serverbaserte verktøy (komprimering, OCR, konverteringer): slettes umiddelbart etter behandling (vanligvis innen sekunder).',
          'Local storage-data: lagres til de slettes manuelt av brukeren, eller til nettleserens buffer tømmes.',
        ],
      },
      {
        h: '5. Hvem vi deler data med',
        p: 'Vi selger, leier ut eller deler ikke dine personopplysninger med tredjeparter. I begrenset omfang kan data bli behandlet av:',
        items: [
          'OpenRouter.ai — ved bruk av AI-funksjoner (AI Chat, AI Summary, AI Translate). Vi sender kun tekst utvunnet fra PDF-en, uten data som identifiserer brukeren. OpenRouter overholder GDPR og har tilstrekkelige garantier.',
          'Vertstjenesteleverandør — nettstedet vårt driftes av en ekstern leverandør som kan lagre anonyme serverlogger (IP-adresse, nettlesertype) i maksimalt 7 dager. Leverandøren har ISO 27001-sertifisering og oppfyller GDPR-kravene.',
        ],
      },
      {
        h: '6. Dine rettigheter i henhold til GDPR',
        p: 'I henhold til artikkel 15–22 i GDPR har du:',
        items: [
          'Innsynsrett (art. 15) — du kan spørre om vi behandler dine data og få tilgang til dem.',
          'Rettingsrett (art. 16) — du kan be om korrigering av uriktige data.',
          'Retten til sletting (art. 17) — retten til å bli glemt.',
          'Retten til begrensning av behandling (art. 18).',
          'Retten til dataportabilitet (art. 20).',
          'Retten til å protestere (art. 21).',
          'Retten til å trekke tilbake samtykke når som helst — uten å påvirke lovligheten av behandlingen som ble foretatt før tilbaketrekkelsen.',
        ],
      },
      {
        h: '7. Hvordan utøve dine rettigheter',
        p: 'For å utøve noen av rettighetene ovenfor, send en e-post til: kontakt@optimapdf.com. Vi vil svare innen 30 dager. Vi krever ingen gebyr for å oppfylle forespørsler med mindre de er åpenbart grunnløse eller overdrevne (art. 12 nr. 5 GDPR).',
      },
      {
        h: '8. Retten til å klage',
        p: 'Dersom du mener at vår behandling av dine personopplysninger strider mot GDPR, har du rett til å klage til det polske datatilsynet (PUODO — Urząd Ochrony Danych Osobowych), ul. Stawki 2, 00-193 Warszawa, Polen.',
      },
      {
        h: '9. Overføring av data til tredjeland',
        p: 'Ved bruk av AI-funksjoner kan tekst bli behandlet av OpenRouter-servere lokalisert i USA. I slike tilfeller brukes tilstrekkelige garantier i samsvar med GDPR-kravene, herunder standardkontraktsklausuler der det er aktuelt, for å sikre et tilstrekkelig nivå av databeskyttelse.',
      },
      {
        h: '10. Informasjonskapsler og local storage',
        p: 'Vi bruker ikke annonserings-, sporings- eller analytiske informasjonskapsler fra tredjeparter. Vi benytter utelukkende nettleserens local storage til å huske dine preferanser (tema, språk). Disse dataene lagres lokalt på enheten din og kan slettes når som helst ved å tømme nettleserens local storage.',
      },
      {
        h: '11. Endringer i denne personvernerklæringen',
        p: 'Vi forbeholder oss retten til å gjøre endringer i denne GDPR-informasjonen. Eventuelle endringer vil bli kunngjort ved å oppdatere datoen øverst på denne siden. Vi anbefaler å gjennomgå innholdet jevnlig.',
      },
    ],
  },
  sv: {
    title: 'Information om dataskyddsförordningen (GDPR)',
    updated: 'Senast uppdaterad: 25 juni 2026',
    sections: [
      {
        h: '1. Vem vi är som personuppgiftsansvarig',
        p: 'Personuppgiftsansvarig för dina personuppgifter är Leszek Hofman, Dąbrówka Nowa, Polen (optimapdf.com). Som digital tjänsteleverantör behandlar vi uppgifter endast i den omfattning som är nödvändig för att tillhandahålla PDF-verktyg online. Vid alla frågor om dataskydd kan du kontakta oss på: kontakt@optimapdf.com.',
      },
      {
        h: '2. Vilka personuppgifter vi behandlar och i vilket syfte',
        p: 'OptimaPDF är designat för att minimera insamling av personuppgifter. Vi behandlar enbart:',
        items: [
          'IP-adress — för att säkerställa skydd och förhindra missbruk (berättigat intresse, art. 6.1 bokstav f GDPR). IP-adresser lagras i serveloggar i högst 7 dygn.',
          'Filer som laddas upp av användaren — de flesta verktygen behandlar filer helt i webbläsaren (WebAssembly/JavaScript). Dessa filer skickas inte till servern och lämnar aldrig din enhet. Undantag är verktyg som kräver externa bibliotek (komprimering, OCR, formatkonverteringar), där filen tillfälligt behandlas i serverns RAM och omedelbart raderas efter åtgärden — vanligen inom sekunder.',
          'Tema- och språkinställningar — lagras uteslutande i din webbläsares local storage. De skickas inte till servern eller delas med tredjeparter.',
        ],
      },
      {
        h: '3. Rättslig grund för behandlingen',
        p: 'Vi behandlar dina uppgifter med följande rättsliga grunder:',
        items: [
          'Art. 6.1 bokstav b GDPR (nödvändighet för uppfyllelse av avtal) — att tillhandahålla PDF-verktyg på din begäran.',
          'Art. 6.1 bokstav f GDPR (berättigat intresse) — att säkerställa tjänstens skydd, förhindra missbruk och teknisk analys av webbplatsens funktion.',
          'Art. 6.1 bokstav a GDPR (samtycke) — för AI-funktioner som kräver överföring av innehåll till ett externt API (OpenRouter). Användning av AI kräver uttryckligt samtycke genom att godkänna villkoren.',
        ],
      },
      {
        h: '4. Hur länge vi lagrar uppgifter',
        p: 'Vi tillämpar följande lagringstider:',
        items: [
          'IP-adresser i serveloggar: högst 7 dygn.',
          'Filer som skickas till klientbaserade verktyg: lagras inte — de tas bort ur minnet när du stänger webbläsarfliken eller uppdaterar sidan.',
          'Filer som skickas till serverbaserade verktyg (komprimering, OCR, konverteringar): raderas omedelbart efter behandling (vanligen inom sekunder).',
          'Local storage-uppgifter: lagras tills de manuellt raderas av användaren eller tills webbläsarens cache töms.',
        ],
      },
      {
        h: '5. Vem vi delar uppgifter med',
        p: 'Vi säljer, hyr ut eller delar inte dina personuppgifter med tredjeparter. I begränsad omfattning kan uppgifter behandlas av:',
        items: [
          'OpenRouter.ai — vid användning av AI-funktioner (AI Chat, AI Summary, AI Translate). Vi skickar endast text som extraherats från PDF:en, utan användaridentifierande uppgifter. OpenRouter efterlever GDPR och har lämpliga skyddsåtgärder.',
          'Hostingleverantör — vår webbplats driftas av en extern leverantör som kan lagra anonyma serveloggar (IP-adress, webbläsartyp) i högst 7 dygn. Leverantören har ISO 27001-certifiering och uppfyller GDPR-kraven.',
        ],
      },
      {
        h: '6. Dina rättigheter enligt GDPR',
        p: 'Enligt artiklarna 15–22 i GDPR har du:',
        items: [
          'Rätt till insyn (art. 15) — du kan fråga om vi behandlar dina uppgifter och få tillgång till dem.',
          'Rätt till rättelse (art. 16) — du kan begära rättelse av felaktiga uppgifter.',
          'Rätt till radering (art. 17) — rätten att bli glömd.',
          'Rätt till begränsning av behandling (art. 18).',
          'Rätt till dataportabilitet (art. 20).',
          'Rätt att invända (art. 21).',
          'Rätt att när som helst återkalla samtycke — utan att detta påverkar lagligheten i behandlingen som företogs innan samtycket återkallades.',
        ],
      },
      {
        h: '7. Hur du utövar dina rättigheter',
        p: 'För att utöva någon av ovanstående rättigheter, skicka ett e-postmeddelande till: kontakt@optimapdf.com. Vi svarar inom 30 dagar. Vi tar ingen avgift för att besvara begäran om det inte är uppenbart obefogat eller överdrivet omfattande (art. 12.5 GDPR).',
      },
      {
        h: '8. Rätt att lämna klagomål',
        p: 'Om du anser att vår behandling av dina personuppgifter strider mot GDPR, har du rätt att lämna in ett klagomål till Polens dataskyddsmyndighet (PUODO — Urząd Ochrony Danych Osobowych), ul. Stawki 2, 00-193 Warszawa, Polen.',
      },
      {
        h: '9. Överföring av uppgifter till tredjeländer',
        p: 'Vid användning av AI-funktioner kan text behandlas av OpenRouter-servrar som finns i USA. I sådana fall tillämpas lämpliga skyddsåtgärder i enlighet med GDPR, inklusive standardavtalsklausuler där det är tillämpligt, för att säkerställa en adekvat nivå av dataskydd.',
      },
      {
        h: '10. Kakor och local storage',
        p: 'Vi använder inte reklamkakor, spårningskakor eller analytiska kakor från tredjeparter. Vi använder uteslutande webbläsarens local storage för att komma ihåg dina inställningar (tema, språk). Dessa uppgifter lagras lokalt på din enhet och kan raderas när som helst genom att rensa webbläsarens local storage.',
      },
      {
        h: '11. Ändringar i denna dataskyddspolicy',
        p: 'Vi förbehåller oss rätten att göra ändringar i denna GDPR-information. Eventuella ändringar meddelas genom att uppdatera datumet högst upp på sidan. Vi rekommenderar att du regelbundet granskar detta innehåll.',
      },
    ],
  },
  fr: {
    title: 'Information sur le RGPD',
    updated: 'Dernière mise à jour : 25 juin 2026',
    sections: [
      {
        h: '1. Qui nous sommes en tant que responsable du traitement',
        p: 'Le responsable du traitement de vos données personnelles est Leszek Hofman, Dąbrówka Nowa, Pologne (optimapdf.com). En tant que fournisseur de services numériques, nous ne traitons les données que dans la mesure strictement nécessaire à la fourniture d\'outils PDF en ligne. Pour toute question relative à la protection des données, vous pouvez nous contacter à l\'adresse : kontakt@optimapdf.com.',
      },
      {
        h: '2. Quelles données personnelles nous traitons et à quelle fin',
        p: 'OptimaPDF est conçu pour minimiser la collecte de données. Nous traitons exclusivement :',
        items: [
          'Adresse IP — pour garantir la sécurité et prévenir les abus (intérêt légitime, art. 6, par. 1, point f RGPD). Les adresses IP sont conservées dans les journaux serveur pendant une durée maximale de 7 jours.',
          'Fichiers téléversés par l\'utilisateur — la plupart des outils traitent les fichiers entièrement dans le navigateur (WebAssembly/JavaScript). Ces fichiers ne sont pas envoyés au serveur et ne quittent jamais votre appareil. Les exceptions concernent les outils nécessitant des bibliothèques externes (compression, OCR, conversions de formats), où le fichier est temporairement traité en mémoire RAM serveur et immédiatement supprimé après l\'opération — généralement en quelques secondes.',
          'Préférences de thème et de langue — stockées exclusivement dans le local storage de votre navigateur. Elles ne sont pas envoyées au serveur ni partagées avec des tiers.',
        ],
      },
      {
        h: '3. Base juridique du traitement',
        p: 'Nous traitons vos données sur le fondement de :',
        items: [
          'Art. 6, par. 1, point b RGPD (nécessité pour l\'exécution du contrat) — fourniture des outils PDF à votre demande.',
          'Art. 6, par. 1, point f RGPD (intérêt légitime) — garantie de la sécurité du service, prévention des abus et analyse technique du fonctionnement du site.',
          'Art. 6, par. 1, point a RGPD (consentement) — pour les fonctionnalités IA nécessitant l\'envoi de contenu vers une API externe (OpenRouter). L\'utilisation de l\'IA nécessite un consentement exprès par l\'acceptation des conditions.',
        ],
      },
      {
        h: '4. Durée de conservation des données',
        p: 'Nous appliquons les durées de conservation suivantes :',
        items: [
          'Adresses IP dans les journaux serveur : jusqu\'à 7 jours.',
          'Fichiers envoyés aux outils côté client : non stockés — ils sont supprimés de la mémoire lors de la fermeture de l\'onglet du navigateur ou du rafraîchissement de la page.',
          'Fichiers envoyés aux outils côté serveur (compression, OCR, conversions) : supprimés immédiatement après le traitement (généralement en quelques secondes).',
          'Données du local storage : conservées jusqu\'à leur suppression manuelle par l\'utilisateur ou jusqu\'à l\'effacement du cache du navigateur.',
        ],
      },
      {
        h: '5. Avec qui nous partageons les données',
        p: 'Nous ne vendons, ne louons et ne partageons pas vos données personnelles avec des tiers. Dans une mesure limitée, des données peuvent être traitées par :',
        items: [
          'OpenRouter.ai — lors de l\'utilisation de fonctionnalités IA (AI Chat, AI Summary, AI Translate). Nous n\'envoyons que le texte extrait du PDF, sans données identifiant l\'utilisateur. OpenRouter respecte le RGPD et dispose de garanties appropriées.',
          'Fournisseur d\'hébergement — notre site est hébergé par un prestataire externe susceptible de conserver des journaux serveur anonymes (adresse IP, type de navigateur) pendant une durée maximale de 7 jours. Ce prestataire détient la certification ISO 27001 et satisfait aux exigences du RGPD.',
        ],
      },
      {
        h: '6. Vos droits au titre du RGPD',
        p: 'Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :',
        items: [
          'Droit d\'accès (art. 15) — vous pouvez demander si nous traitons vos données et en obtenir l\'accès.',
          'Droit de rectification (art. 16) — vous pouvez demander la correction de données inexactes.',
          'Droit à l\'effacement (art. 17) — droit à l\'oubli.',
          'Droit à la limitation du traitement (art. 18).',
          'Droit à la portabilité des données (art. 20).',
          'Droit d\'opposition (art. 21).',
          'Droit de retirer votre consentement à tout moment — sans affecter la licéité du traitement effectué avant le retrait.',
        ],
      },
      {
        h: '7. Exercer vos droits',
        p: 'Pour exercer l\'un des droits mentionnés ci-dessus, envoyez un courriel à : kontakt@optimapdf.com. Nous vous répondrons dans un délai de 30 jours. Nous n\'exigeons aucun frais pour le traitement des demandes, sauf si celles-ci sont manifestement infondées ou excessives (art. 12, par. 5 RGPD).',
      },
      {
        h: '8. Droit de déposer une plainte',
        p: 'Si vous estimez que notre traitement de vos données viole le RGPD, vous avez le droit de déposer une plainte auprès du Président de l\'Autorité polonaise de protection des données (PUODO — Urząd Ochrony Danych Osobowych), ul. Stawki 2, 00-193 Varsovie, Pologne.',
      },
      {
        h: '9. Transferts de données vers des pays tiers',
        p: 'Lors de l\'utilisation de fonctionnalités IA, le texte peut être traité par des serveurs OpenRouter situés aux États-Unis. Dans de tels cas, des garanties appropriées sont mises en œuvre conformément aux exigences du RGPD, y compris des clauses contractuelles types le cas échéant, afin de garantir un niveau adéquat de protection des données.',
      },
      {
        h: '10. Cookies et local storage',
        p: 'Nous n\'utilisons pas de cookies publicitaires, de traçage ou analytiques tiers. Nous utilisons exclusivement le local storage du navigateur pour mémoriser vos préférences (thème, langue). Ces données sont stockées localement sur votre appareil et peuvent être supprimées à tout moment en effaçant le local storage de votre navigateur.',
      },
      {
        h: '11. Modifications de cette information RGPD',
        p: 'Nous nous réservons le droit d\'apporter des modifications à cette information RGPD. Toute modification sera communiquée en mettant à jour la date en haut de cette page. Nous vous encourageons à consulter régulièrement ce contenu.',
      },
    ],
  },
  ar: {
    title: 'معلومات اللائحة العامة لحماية البيانات (GDPR)',
    updated: 'آخر تحديث: 25 يونيو 2026',
    sections: [
      {
        h: '1. من نحن بصفتنا متحكّماً بالبيانات',
        p: 'متحكّم بالبيانات الشخصية هو Leszek Hofman، Dąbrówka Nowa، بولندا (optimapdf.com). كمزود للخدمات الرقمية، نقوم بمعالجة البيانات فقط بالقدر اللازم لتوفير أدوات PDF عبر الإنترنت. لجميع مسائل حماية البيانات، يمكنكم التواصل معنا على: kontakt@optimapdf.com.',
      },
      {
        h: '2. أي بيانات شخصية نقوم بمعالجةها ولأي غرض',
        p: 'تم تصميم OptimaPDF لتقليل جمع البيانات إلى الحد الأدنى. نقوم بمعالجة ما يلي فقط:',
        items: [
          'عنوان IP — لضمان الأمان ومنع سوء الاستخدام (المصلحة المشروعة، المادة 6(1)(ف) GDPR). يتم تخزين عناوين IP في سجلات الخادم لمدة أقصاها 7 أيام.',
          'الملفات المرفوعة من قبل المستخدم — تتم معالجة معظم الأدوات للملفات بالكامل في المتصفح (WebAssembly/JavaScript). لا يتم إرسال هذه الملفات إلى الخادم ولا تترك جهازك أبداً. الاستثناء هو الأدوات التي تتطلب مكتبات خارجية (الضغط، OCR، تحويل الصيغ)، حيث تتم معالجة الملف مؤقتاً في ذاكرة الخادم العشوائية (RAM) ويتم حذفه فوراً بعد العملية — عادة في غضون ثوانٍ.',
          'تفضيلات المظهر واللغة — يتم تخزينها حصرياً في التخزين المحلي لمتصفحك. لا يتم إرسالها إلى الخادم أو مشاركتها مع أطراف ثالثة.',
        ],
      },
      {
        h: '3. الأساس القانوني للمعالجة',
        p: 'نقوم بمعالجة بياناتك بناءً على:',
        items: [
          'المادة 6(1)(ب) GDPR (الضرورة لتنفيذ العقد) — توفير أدوات PDF بطلبك.',
          'المادة 6(1)(ف) GDPR (المصلحة المشروعة) — ضمان أمان الخدمة، ومنع سوء الاستخدام، والتحليل الفني لعمل الموقع.',
          'المادة 6(1)(أ) GDPR (الموافقة) — لميزات الذكاء الاصطناعي التي تتطلب إرسال المحتوى إلى واجهة برمجة تطبيقات خارجية (OpenRouter). يتطلب استخدام الذكاء الاصطناعي موافقة صريحة بقبول الشروط.',
        ],
      },
      {
        h: '4. مدة الاحتفاظ بالبيانات',
        p: 'نطبق فترات التخزين التالية:',
        items: [
          'عناوين IP في سجلات الخادم: حتى 7 أيام.',
          'الملفات المرسلة إلى الأدوات العميلية: لا يتم تخزينها — يتم إزالتها من الذاكرة عند إغلاق تبويب المتصفح أو تحديث الصفحة.',
          'الملفات المرسلة إلى الأدوات الخادمية (الضغط، OCR، التحويلات): يتم حذفها فوراً بعد المعالجة (عادة في غضون ثوانٍ).',
          'بيانات التخزين المحلي: يتم تخزينها حتى يتم حذفها يدوياً من قبل المستخدم أو حتى يتم مسح ذاكرة التخزين المؤقت للمتصفح.',
        ],
      },
      {
        h: '5. مع من نشارك البيانات',
        p: 'لا نبيع أو نؤجر أو نشارك بياناتك الشخصية مع أطراف ثالثة. في نطاق محدود، قد تتم معالجة البيانات من قبل:',
        items: [
          'OpenRouter.ai — عند استخدام ميزات الذكاء الاصطناعي (AI Chat، AI Summary، AI Translate). نرسل فقط النص المستخرج من ملف PDF، بدون بيانات تحدد هوية المستخدم. يلتزم OpenRouter بـ GDPR ويتوفر لديه ضمانات مناسبة.',
          'مزود خدمة الاستضافة — يتم استضافة موقعنا من قبل مزود خارجي قد يقوم بتخزين سجلات الخادم المجهولة (عنوان IP، نوع المتصفح) لمدة أقصاها 7 أيام. يحمل المزود شهادة ISO 27001 ويلبي متطلبات GDPR.',
        ],
      },
      {
        h: '6. حقوقكم بموجب GDPR',
        p: 'وفقاً للمواد 15 إلى 22 من GDPR، يحق لكم:',
        items: [
          'الحق في الوصول (المادة 15) — يمكنكم السؤال عما إذا كنا نقوم بمعالجة بياناتكم والحصول على وصول إليها.',
          'الحق في التصحيح (المادة 16) — يمكنكم طلب تصحيح البيانات غير الدقيقة.',
          'الحق في المحو (المادة 17) — الحق في النسيان.',
          'الحق في تقييد المعالجة (المادة 18).',
          'الحق في نقل البيانات (المادة 20).',
          'الحق في الاعتراض (المادة 21).',
          'الحق في سحب الموافقة في أي وقت — دون المساس بقانونية المعالجة التي تمت قبل السحب.',
        ],
      },
      {
        h: '7. ممارسة حقوقكم',
        p: 'لممارسة أي من الحقوق المذكورة أعلاه، أرسل بريداً إلكترونياً إلى: kontakt@optimapdf.com. سنرد في غضون 30 يوماً. لا نفرض رسوماً لتنفيذ الطلبات ما لم تكن غير مبررة أو مفرطة بشكل واضح (المادة 12(5) GDPR).',
      },
      {
        h: '8. الحق في تقديم شكوى',
        p: 'إذا كنتم تعتقدون أن معالجتنا لبياناتكم تنتهك GDPR، يحق لكم تقديم شكوى لدى رئيس مكتب حماية البيانات الشخصية البولندي (PUODO — Urząd Ochrony Danych Osobowych)، ul. Stawki 2، 00-193 وارسو، بولندا.',
      },
      {
        h: '9. نقل البيانات إلى دول ثالثة',
        p: 'عند استخدام ميزات الذكاء الاصطناعي، قد تتم معالجة النص بواسطة خوادم OpenRouter الموجودة في الولايات المتحدة. في مثل هذه الحالات، يتم تطبيق ضمانات مناسبة وفقاً لمتطلبات GDPR، بما في ذلك البنود التعاقدية القياسية حيثما كان ذلك مناسباً، لضمان مستوى كافٍ من حماية البيانات.',
      },
      {
        h: '10. ملفات تعريف الارتباط والتخزين المحلي',
        p: 'لا نستخدم ملفات تعريف الارتباط الإعلانية أو التتبعية أو التحليلية التابعة لأطراف ثالثة. نستخدم فقط التخزين المحلي للمتصفح لتذكر تفضيلاتك (المظهر، اللغة). يتم تخزين هذه البيانات محلياً على جهازك ويمكن حذفها في أي وقت عن طريق مسح التخزين المحلي لمتصفحك.',
      },
      {
        h: '11. تعديلات على معلومات GDPR هذه',
        p: 'نحتفظ بالحق في إجراء تغييرات على معلومات GDPR هذه. سيتم الإعلان عن أي تغييرات من خلال تحديث التاريخ في أعلى هذه الصفحة. نشجعكم على مراجعة هذا المحتوى بشكل دوري.',
      },
    ],
  },
  fa: {
    title: 'اطلاعات مقررات عمومی حفاظت از داده‌ها (GDPR)',
    updated: 'آخرین به‌روزرسانی: ۲۵ ژوئن ۲۰۲۶',
    sections: [
      {
        h: '۱. ما به عنوان کنترل‌کننده داده',
        p: 'کنترل‌کننده داده‌های شخصی شما Leszek Hofman، Dąbrówka Nowa، لهستان (optimapdf.com) است. به عنوان ارائه‌دهنده خدمات دیجیتال، ما داده‌ها را فقط به اندازه لازم برای ارائه ابزارهای PDF آنلاین پردازش می‌کنیم. برای تمام مسائل مربوط به حفاظت از داده‌ها، می‌توانید از طریق ایمیل با ما تماس بگیرید: kontakt@optimapdf.com.',
      },
      {
        h: '۲. چه داده‌های شخصی را پردازش می‌کنیم و به چه منظور',
        p: 'OptimaPDF برای به حداقل رساندن جمع‌آوری داده‌ها طراحی شده است. ما فقط موارد زیر را پردازش می‌کنیم:',
        items: [
          'آدرس IP — برای تضمین امنیت و جلوگیری از سوءاستفاده (منافع مشروع، ماده ۶(۱)(ف) GDPR). آدرس‌های IP در گزارش‌های سرور به مدت حداکثر ۷ روز ذخیره می‌شوند.',
          'فایل‌های آپلود شده توسط کاربر — بیشتر ابزارها فایل‌ها را به طور کامل در مرورگر پردازش می‌کنند (WebAssembly/JavaScript). این فایل‌ها به سرور ارسال نمی‌شوند و هرگز دستگاه شما را ترک نمی‌کنند. استثنا ابزارهایی هستند که به کتابخانه‌های خارجی نیاز دارند (فشرده‌سازی، OCR، تبدیل قالب‌ها)، که در آنها فایل به طور موقت در حافظه RAM سرور پردازش شده و بلافاصله پس از عملیات حذف می‌شود — معمولاً در عرض چند ثانیه.',
          'ترجیحات ظاهر و زبان — به طور انحصاری در localStorage مرورگر شما ذخیره می‌شوند. آنها به سرور ارسال نمی‌شوند یا با اشخاص ثالث به اشتراک گذاشته نمی‌شوند.',
        ],
      },
      {
        h: '۳. مبنای قانونی پردازش',
        p: 'ما داده‌های شما را بر اساس موارد زیر پردازش می‌کنیم:',
        items: [
          'ماده ۶(۱)(ب) GDPR (ضرورت برای اجرای قرارداد) — ارائه ابزارهای PDF به درخواست شما.',
          'ماده ۶(۱)(ف) GDPR (منافع مشروع) — تضمین امنیت خدمات، جلوگیری از سوءاستفاده، و تحلیل فنی عملکرد وب‌سایت.',
          'ماده ۶(۱)(ا) GDPR (رضایت) — برای ویژگی‌های هوش مصنوعی که نیاز به ارسال محتوا به یک API خارجی (OpenRouter) دارند. استفاده از هوش مصنوعی نیاز به رضایت صریح با پذیرش شرایط دارد.',
        ],
      },
      {
        h: '۴. مدت نگهداری داده‌ها',
        p: 'ما دوره‌های نگهداری زیر را اعمال می‌کنیم:',
        items: [
          'آدرس‌های IP در گزارش‌های سرور: حداکثر ۷ روز.',
          'فایل‌های ارسال شده به ابزارهای سمت کلاینت: ذخیره نمی‌شوند — آنها از حافظه حذف می‌شوند هنگامی که تب مرورگر را می‌بندید یا صفحه را بازخوانی می‌کنید.',
          'فایل‌های ارسال شده به ابزارهای سمت سرور (فشرده‌سازی، OCR، تبدیل‌ها): بلافاصله پس از پردازش حذف می‌شوند (معمولاً در عرض چند ثانیه).',
          'داده‌های localStorage: تا زمانی که توسط کاربر به صورت دستی حذف شوند یا تا زمانی که حافظه پنهان مرورگر پاک شود، ذخیره می‌شوند.',
        ],
      },
      {
        h: '۵. با چه کسانی داده‌ها را به اشتراک می‌گذاریم',
        p: 'ما داده‌های شخصی شما را نمی‌فروشیم، اجاره نمی‌دهیم یا با اشخاص ثالث به اشتراک نمی‌گذاریم. در محدوده محدود، ممکن است داده‌ها توسط موارد زیر پردازش شوند:',
        items: [
          'OpenRouter.ai — هنگام استفاده از ویژگی‌های هوش مصنوعی (AI Chat، AI Summary، AI Translate). ما فقط متن استخراج شده از فایل PDF را ارسال می‌کنیم، بدون داده‌های شناسایی کاربر. OpenRouter با GDPR مطابقت دارد و ضمانت‌نامه‌های مناسبی دارد.',
          'ارائه‌دهنده میزبانی — وب‌سایت ما توسط یک ارائه‌دهنده خارجی میزبانی می‌شود که ممکن است گزارش‌های ناشناس سرور (آدرس IP، نوع مرورگر) را به مدت حداکثر ۷ روز ذخیره کند. ارائه‌دهنده دارای گواهینامه ISO 27001 است و الزامات GDPR را برآورده می‌کند.',
        ],
      },
      {
        h: '۶. حقوق شما طبق GDPR',
        p: 'طبق مواد ۱۵ تا ۲۲ GDPR، شما حقوق زیر را دارید:',
        items: [
          'حق دسترسی (ماده ۱۵) — می‌توانید بپرسید آیا ما داده‌های شما را پردازش می‌کنیم و به آنها دسترسی پیدا کنید.',
          'حق اصلاح (ماده ۱۶) — می‌توانید اصلاح داده‌های نادرست را درخواست کنید.',
          'حق حذف (ماده ۱۷) — حق فراموش‌شدن.',
          'حق محدودیت پردازش (ماده ۱۸).',
          'حق قابلیت انتقال داده‌ها (ماده ۲۰).',
          'حق اعتراض (ماده ۲۱).',
          'حق پس‌گرفتن رضایت در هر زمان — بدون تاثیر بر قانونی بودن پردازش قبل از پس‌گرفتن آن.',
        ],
      },
      {
        h: '۷. اعمال حقوق شما',
        p: 'برای اعمال هر یک از حقوق فوق، یک ایمیل به آدرس زیر ارسال کنید: kontakt@optimapdf.com. ما ظرف ۳۰ روز پاسخ خواهیم داد. ما هیچ هزینه‌ای برای اجرای درخواست‌ها دریافت نمی‌کنیم مگر اینکه آشکارا بی‌اساس یا افراطی باشند (ماده ۱۲(۵) GDPR).',
      },
      {
        h: '۸. حق شکایت',
        p: 'اگر معتقدید که پردازش داده‌های شما توسط ما ناقض GDPR است، شما حق دارید شکایتی نزد رئیس دفتر حفاظت از داده‌های شخصی لهستان (PUODO — Urząd Ochrony Danych Osobowych)، ul. Stawki 2، ۰۰-۱۹۳ ورشو، لهستان، ثبت کنید.',
      },
      {
        h: '۹. انتقال داده‌ها به کشورهای ثالث',
        p: 'هنگام استفاده از ویژگی‌های هوش مصنوعی، ممکن است متن توسط سرورهای OpenRouter واقع در ایالات متحده پردازش شود. در چنین مواردی، ضمانت‌نامه‌های مناسب مطابق با الزامات GDPR اعمال می‌شوند، از جمله بندهای قراردادی استاندارد در صورت لزوم، برای تضمین سطح کافی حفاظت از داده‌ها.',
      },
      {
        h: '۱۰. کوکی‌ها و localStorage',
        p: 'ما از کوکی‌های تبلیغاتی، ردیابی یا تحلیلی اشخاص ثالث استفاده نمی‌کنیم. ما فقط از localStorage مرورگر برای به یاد آوردن ترجیحات شما (ظاهر، زبان) استفاده می‌کنیم. این داده‌ها به طور محلی روی دستگاه شما ذخیره می‌شوند و می‌توانند در هر زمان با پاک کردن حافظه محلی مرورگر شما حذف شوند.',
      },
      {
        h: '۱۱. تغییرات در این اطلاعات GDPR',
        p: 'ما حق ایجاد تغییرات در این اطلاعات GDPR را برای خود محفوظ می‌داریم. هرگونه تغییر از طریق به‌روزرسانی تاریخ در بالای این صفحه اعلام خواهد شد. ما شما را تشویق می‌کنیم که به طور دوره‌ای این محتوا را مرور کنید.',
      },
    ],
  },
  hi: {
    title: 'GDPR जानकारी',
    updated: 'अंतिम अपडेट: 25 जून 2026',
    sections: [
      {
        h: '1. हम डेटा नियंत्रक के रूप में कौन हैं',
        p: 'आपके व्यक्तिगत डेटा का डेटा नियंत्रक Leszek Hofman, Dąbrówka Nowa, पोलैंड (optimapdf.com) हैं। डिजिटल सेवा प्रदाता के रूप में, हम केवल ऑनलाइन PDF उपकरण प्रदान करने के लिए आवश्यक सीमा तक ही डेटा का संचालन करते हैं। सभी डेटा सुरक्षा मामलों के लिए, आप हमसे संपर्क कर सकते हैं: kontakt@optimapdf.com.',
      },
      {
        h: '2. हम कौन सा व्यक्तिगत डेटा संचालित करते हैं और किस उद्देश्य के लिए',
        p: 'OptimaPDF को डेटा संग्रह को न्यूनतम करने के लिए डिज़ाइन किया गया है। हम केवल निम्नलिखित का संचालन करते हैं:',
        items: [
          'IP पता — सुरक्षा सुनिश्चित करने और दुरुपयोग को रोकने के लिए (वैध हित, अनुच्छेद 6(1)(f) GDPR)। IP पतों को सर्वर लॉग में अधिकतम 7 दिनों के लिए संग्रहीत किया जाता है।',
          'उपयोगकर्ता द्वारा अपलोड की गई फ़ाइलें — अधिकांश उपकरण फ़ाइलों को पूरी तरह से ब्राउज़र में संचालित करते हैं (WebAssembly/JavaScript)। ये फ़ाइलें सर्वर को नहीं भेजी जातीं और आपका डिवाइस कभी नहीं छोड़तीं। अपवाद वे उपकरण हैं जिन्हें बाहरी पुस्तकालयों की आवश्यकता होती है (संपीड़न, OCR, प्रारूप रूपांतरण), जहाँ फ़ाइल को अस्थायी रूप से सर्वर की RAM में संचालित किया जाता है और ऑपरेशन के तुरंत बाद हटा दिया जाता है — आमतौर पर कुछ ही सेकंड में।',
          'थीम और भाषा प्राथमिकताएँ — केवल आपके ब्राउज़र के localStorage में संग्रहीत। वे सर्वर को नहीं भेजी जातीं और न ही तृतीय पक्षों के साथ साझा की जाती हैं।',
        ],
      },
      {
        h: '3. संचालन का कानूनी आधार',
        p: 'हम आपके डेटा का संचालन निम्नलिखित के आधार पर करते हैं:',
        items: [
          'अनुच्छेद 6(1)(b) GDPR (अनुबंध निष्पादन के लिए आवश्यकता) — आपके अनुरोध पर PDF उपकरण प्रदान करना।',
          'अनुच्छेद 6(1)(f) GDPR (वैध हित) — सेवा सुरक्षा सुनिश्चित करना, दुरुपयोग को रोकना, और वेबसाइट संचालन का तकनीकी विश्लेषण करना।',
          'अनुच्छेद 6(1)(a) GDPR (सहमति) — उन AI सुविधाओं के लिए जिनमें बाहरी API (OpenRouter) को सामग्री भेजने की आवश्यकता होती है। AI का उपयोग शर्तों को स्वीकार करके स्पष्ट सहमति की आवश्यकता रखता है।',
        ],
      },
      {
        h: '4. हम डेटा कितने समय तक रखते हैं',
        p: 'हम निम्नलिखित अवधारण अवधि लागू करते हैं:',
        items: [
          'सर्वर लॉग में IP पते: 7 दिन तक।',
          'क्लाइंट-साइड उपकरणों को भेजी गई फ़ाइलें: संग्रहीत नहीं — जब आप ब्राउज़र टैब बंद करते हैं या पेज रीफ्रेश करते हैं तो वे स्मृति से हटा दी जाती हैं।',
          'सर्वर-साइड उपकरणों को भेजी गई फ़ाइलें (संपीड़न, OCR, रूपांतरण): संचालन के तुरंत बाद हटा दी जाती हैं (आमतौर पर कुछ ही सेकंड में)।',
          'localStorage डेटा: जब तक उपयोगकर्ता द्वारा मैन्युअल रूप से नहीं हटाया जाता या ब्राउज़र कैश साफ़ नहीं हो जाता, तब तक संग्रहीत।',
        ],
      },
      {
        h: '5. हम डेटा किसके साथ साझा करते हैं',
        p: 'हम आपके व्यक्तिगत डेटा को न बेचते हैं, न किराए पर देते हैं, और न ही तृतीय पक्षों के साथ साझा करते हैं। सीमित सीमा में, डेटा का संचालन निम्नलिखित द्वारा किया जा सकता है:',
        items: [
          'OpenRouter.ai — AI सुविधाओं (AI Chat, AI Summary, AI Translate) का उपयोग करते समय। हम केवल PDF से निकाला गया पाठ भेजते हैं, बिना किसी उपयोगकर्ता-पहचान वाले डेटा के। OpenRouter GDPR का पालन करता है और उचित सुरक्षा उपाय हैं।',
          'होस्टिंग प्रदाता — हमारी वेबसाइट एक बाहरी प्रदाता द्वारा होस्ट की जाती है जो अनाम सर्वर लॉग (IP पता, ब्राउज़र प्रकार) को अधिकतम 7 दिनों के लिए संग्रहीत कर सकता है। प्रदाता के पास ISO 27001 प्रमाणन है और GDPR आवश्यकताओं को पूरा करता है।',
        ],
      },
      {
        h: '6. GDPR के तहत आपके अधिकार',
        p: 'GDPR के अनुच्छेद 15–22 के तहत आपको निम्नलिखित अधिकार प्राप्त हैं:',
        items: [
          'पहुँच का अधिकार (अनुच्छेद 15) — आप पूछ सकते हैं कि क्या हम आपके डेटा का संचालन करते हैं और उसकी पहुँच प्राप्त कर सकते हैं।',
          'सुधार का अधिकार (अनुच्छेद 16) — आप गलत डेटा के सुधार का अनुरोध कर सकते हैं।',
          'हटाने का अधिकार (अनुच्छेद 17) — भुलाए जाने का अधिकार।',
          'संचालन के प्रतिबंधन का अधिकार (अनुच्छेद 18)।',
          'डेटा पोर्टेबिलिटी का अधिकार (अनुच्छेद 20)।',
          'आपत्ति का अधिकार (अनुच्छेद 21)।',
          'किसी भी समय सहमति वापस लेने का अधिकार — वापसी से पहले किए गए संचालन की वैधता को प्रभावित किए बिना।',
        ],
      },
      {
        h: '7. अपने अधिकारों का प्रयोग कैसे करें',
        p: 'उपरोक्त में से किसी भी अधिकार का प्रयोग करने के लिए, एक ईमेल भेजें: kontakt@optimapdf.com। हम 30 दिनों के भीतर जवाब देंगे। हम अनुरोधों की पूर्ति के लिए कोई शुल्क नहीं लेते, जब तक कि वे स्पष्ट रूप से निराधार या अत्यधिक न हों (अनुच्छेद 12(5) GDPR)।',
      },
      {
        h: '8. शिकायत दर्ज करने का अधिकार',
        p: 'यदि आपको लगता है कि आपके डेटा का हमारा संचालन GDPR का उल्लंघन करता है, तो आपके पास व्यक्तिगत डेटा सुरक्षा कार्यालय (PUODO — Urząd Ochrony Danych Osobowych) के अध्यक्ष के पास शिकायत दर्ज करने का अधिकार है, ul. Stawki 2, 00-193 वारसा, पोलैंड।',
      },
      {
        h: '9. तृतीय देशों में डेटा हस्तांतरण',
        p: 'AI सुविधाओं का उपयोग करते समय, पाठ का संचालन अमेरिका में स्थित OpenRouter सर्वर द्वारा किया जा सकता है। ऐसे मामलों में, GDPR आवश्यकताओं के अनुसार उचित सुरक्षा उपाय लागू किए जाते हैं, जिसमें जहाँ लागू हो वहाँ मानक संविदात्मक खंड शामिल हैं, ताकि डेटा सुरक्षा का पर्याप्त स्तर सुनिश्चित किया जा सके।',
      },
      {
        h: '10. कुकीज़ और localStorage',
        p: 'हम विज्ञापन, ट्रैकिंग, या तृतीय पक्ष विश्लेषणात्मक कुकीज़ का उपयोग नहीं करते। हम आपकी प्राथमिकताओं (थीम, भाषा) को याद रखने के लिए केवल ब्राउज़र के localStorage का उपयोग करते हैं। यह डेटा आपके डिवाइस पर स्थानीय रूप से संग्रहीत है और आपके ब्राउज़र के लोकल स्टोरेज को साफ़ करके कभी भी हटाया जा सकता है।',
      },
      {
        h: '11. इस GDPR सूचना में परिवर्तन',
        p: 'हम इस GDPR जानकारी में परिवर्तन करने का अधिकार सुरक्षित रखते हैं। कोई भी परिवर्तन इस पृष्ठ के शीर्ष पर तिथि अपडेट करके सूचित किया जाएगा। हम आपको समय-समय पर इस सामग्री की समीक्षा करने के लिए प्रोत्साहित करते हैं।',
      },
    ],
  },
  is: {
    title: 'Upplýsingar um GDPR',
    updated: 'Síðast uppfært: 25. júní 2026',
    sections: [
      {
        h: '1. Hver við erum sem ábyrgðaraðili',
        p: 'Ábyrgðaraðili persónuupplýsinga þinna er Leszek Hofman, Dąbrówka Nowa, Pólland (optimapdf.com). Sem veitandi stafrænnar þjónustu meðhöndlum við gögn aðeins að því marki sem þörf er til að veita PDF-verkfæri á netinu. Varðandi öll persónuverndarmálefni getur þú haft samband við okkur á: kontakt@optimapdf.com.',
      },
      {
        h: '2. Hverjar persónuupplýsingar við meðhöndlum og í hvaða tilgangi',
        p: 'OptimaPDF er hannað til að lágmarka gagnasöfnun. Við meðhöndlum aðeins:',
        items: [
          'IP-tala — til að tryggja öryggi og koma í veg fyrir misnotkun (lögmætir hagsmunir, 6. gr. 1. mgr. f-liður GDPR). IP-tölur eru geymdar í loggum vefþjóns í hámark 7 daga.',
          'Skrár sem notandinn hleður upp — flest verkfæri vinna með skrár alveg í vafra (WebAssembly/JavaScript). Þessar skrár eru ekki sendar til vefþjónsins og fara aldrei af tækinu þínu. Undantekningin eru verkfæri sem þurfa ytri söfn (þjöppun, OCR, sniðumbreytingar), þar sem skráin er tímabundið meðhöndluð í vinnsluminni vefþjónsins og strax eytt eftir aðgerðina — yfirleitt innan sekúndna.',
          'Tema- og tungumálastillingar — geymdar eingöngu í localStorage vafrans þíns. Þær eru ekki sendar til vefþjónsins né deilt með þriðjuaðilum.',
        ],
      },
      {
        h: '3. Lagagrundvöllur meðferðar',
        p: 'Við meðhöndlum gögn þín á grundvelli:',
        items: [
          '6. gr. 1. mgr. b-liður GDPR (nauðsyn til að efna samning) — veiting PDF-verkfæra að beiðni þinni.',
          '6. gr. 1. mgr. f-liður GDPR (lögmætir hagsmunir) — að tryggja öryggi þjónustunnar, koma í veg fyrir misnotkun og tæknilega greiningu á rekstri vefsins.',
          '6. gr. 1. mgr. a-liður GDPR (samþykki) — fyrir AI-eiginleika sem krefjast þess að efni sé sent til ytri viðmótsgrunns (OpenRouter). Notkun AI krefst skýrs samþykkis með því að samþykkja skilmálana.',
        ],
      },
      {
        h: '4. Hversu lengi við geymum gögn',
        p: 'Við beitum eftirfarandi geymslutíma:',
        items: [
          'IP-tölur í loggum vefþjóns: allt að 7 dögum.',
          'Skrár sem sendar eru til verkfæra á biðlara: ekki geymdar — þær eru fjarlægðar úr minni þegar þú lokar flipa vafrans eða endurlestrar síðuna.',
          'Skrár sem sendar eru til verkfæra á vefþjón (þjöppun, OCR, umbreytingar): eytt strax eftir meðferð (yfirleitt innan sekúndna).',
          'Gögn í localStorage: geymd þar til notandinn eyðir þeim handvirkt eða þar til skyndiminni vafrans er hreinsað.',
        ],
      },
      {
        h: '5. Með hverjum við deilum gögnum',
        p: 'Við seljum, leigjum eða deilum ekki persónuupplýsingum þínum með þriðjuaðilum. Takmarkað getur verið að gögn séu meðhöndluð af:',
        items: [
          'OpenRouter.ai — við notkun AI-eiginleika (AI Chat, AI Summary, AI Translate). Við sendum aðeins texta sem úr PDF er dreginn, án gagna sem greina notanda. OpenRouter uppfyllir GDPR og hefur viðeigandi tryggðarráðstafanir.',
          'Hýsingaraðili — vefsíðan okkar er höstuð af ytri aðila sem getur geymt nafnlaus logg vefþjóns (IP-tala, tegund vafrans) í hámark 7 daga. Aðilinn hefur ISO 27001 vottun og uppfyllir kröfur GDPR.',
        ],
      },
      {
        h: '6. Réttindi þín samkvæmt GDPR',
        p: 'Samkvæmt 15.–22. gr. GDPR hefur þú:',
        items: [
          'Aðgangsréttur (15. gr.) — þú getur spurt hvort við meðhöndlum gögn þín og fengið aðgang að þeim.',
          'Leiðréttingarréttur (16. gr.) — þú getur óskað eftir leiðréttingu rangra gagna.',
          'Eyðingarréttur (17. gr.) — réttur til að verða gleymdur.',
          'Réttur til takmörkunar á meðferð (18. gr.).',
          'Réttur til gagnahæfni (20. gr.).',
          'Andmælaréttur (21. gr.).',
          'Réttur til að afturkalla samþykki hvenær sem er — án þess að hafa áhrif á lögmæti meðferðar fyrir afturköllunina.',
        ],
      },
      {
        h: '7. Hvernig á að nýta réttindi þín',
        p: 'Til að nýta réttindi þín skaltu senda tölvupóst á: kontakt@optimapdf.com. Við munum svara innan 30 daga. Við innheimtum ekki gjöld fyrir að uppfylla beiðnir nema þær séu augljóslega tilhæfulausar eða óhófar (12. gr. 5. mgr. GDPR).',
      },
      {
        h: '8. Réttur til að leggja fram kvörtun',
        p: 'Ef þú telur að meðferð okkar á gögnum þínum brjóti gegn GDPR hefur þú rétt á að leggja fram kvörtun hjá forseta Persónuverndar (PUODO — Urząd Ochrony Danych Osobowych), ul. Stawki 2, 00-193 Varsjá, Pólland.',
      },
      {
        h: '9. Flutningur gagna til þriðja landa',
        p: 'Við notkun AI-eiginleika getur texti verið meðhöndluð af netþjónum OpenRouter staðsettum í Bandaríkjunum. Í slíkum tilvikum eru viðeigandi tryggðarráðstafanir gerðar í samræmi við kröfur GDPR, þar á meðal staðal samningsskilmála þar sem við á, til að tryggja fullnægjandi stig persónuverndar.',
      },
      {
        h: '10. Vefkökur og localStorage',
        p: 'Við notum ekki vefkökur í auglýsingum, rekstri eða greiningum þriðjuaðila. Við notum eingöngu localStorage vafrans til að muna stillingar þínar (þema, tungumál). Þessi gögn eru geymd staðbundið á tækinu þínu og er hægt að eyða þeim hvenær sem er með því að hreinsa localStorage vafrans þíns.',
      },
      {
        h: '11. Breytingar á þessari GDPR-upplýsingu',
        p: 'Við áskiljum okkur rétt til að gera breytingar á þessum upplýsingum um GDPR. Allar breytingar verða tilkynntar með því að uppfæra dagsetningu efst á þessari síðu. Við hvetjum þig til að fara reglulega yfir þetta efni.',
      },
    ],
  },
  it: {
    title: 'Informativa sul GDPR',
    updated: 'Ultimo aggiornamento: 25 giugno 2026',
    sections: [
      {
        h: '1. Chi siamo come titolare del trattamento',
        p: 'Il titolare dei vostri dati personali è Leszek Hofman, Dąbrówka Nowa, Polonia (optimapdf.com). Come fornitore di servizi digitali, trattiamo i dati solo nella misura necessaria per fornire strumenti PDF online. Per ogni questione relativa alla protezione dei dati potete contattarci all\'indirizzo: kontakt@optimapdf.com.',
      },
      {
        h: '2. Quali dati personali trattiamo e per quale finalità',
        p: 'OptimaPDF è progettato per minimizzare la raccolta di dati. Trattiamo esclusivamente:',
        items: [
          'Indirizzo IP — per garantire la sicurezza e prevenire abusi (interesse legittimo, art. 6, par. 1, lett. f del RGPD). Gli indirizzi IP vengono conservati nei log del server per un massimo di 7 giorni.',
          'File caricati dall\'utente — la maggior parte degli strumenti elabora i file interamente nel browser (WebAssembly/JavaScript). Questi file non vengono inviati al server e non lasciano mai il vostro dispositivo. Le eccezioni sono gli strumenti che richiedono librerie esterne (compressione, OCR, conversioni di formato), nei quali il file viene elaborato temporaneamente nella RAM del server e cancellato immediatamente dopo l\'operazione — generalmente entro pochi secondi.',
          'Preferenze di tema e lingua — conservate esclusivamente nel localStorage del vostro browser. Non vengono inviate al server né condivise con terzi.',
        ],
      },
      {
        h: '3. Base giuridica del trattamento',
        p: 'Trattiamo i vostri dati sulla base di:',
        items: [
          'Art. 6, par. 1, lett. b del RGPD (necessità per l\'esecuzione del contratto) — fornitura degli strumenti PDF su vostra richiesta.',
          'Art. 6, par. 1, lett. f del RGPD (interesse legittimo) — garantire la sicurezza del servizio, prevenire abusi e analisi tecnica del funzionamento del sito web.',
          'Art. 6, par. 1, lett. a del RGPD (consenso) — per le funzionalità AI che richiedono l\'invio di contenuti a un\'API esterna (OpenRouter). L\'uso dell\'AI richiede il consenso esplicito accettando i termini.',
        ],
      },
      {
        h: '4. Per quanto tempo conserviamo i dati',
        p: 'Applichiamo i seguenti periodi di conservazione:',
        items: [
          'Indirizzi IP nei log del server: fino a 7 giorni.',
          'File inviati agli strumenti lato client: non conservati — vengono rimossi dalla memoria quando chiudete il tab del browser o ricaricate la pagina.',
          'File inviati agli strumenti lato server (compressione, OCR, conversioni): cancellati immediatamente dopo l\'elaborazione (generalmente entro pochi secondi).',
          'Dati in localStorage: conservati fino a quando l\'utente non li cancella manualmente o fino a quando la cache del browser non viene svuotata.',
        ],
      },
      {
        h: '5. Con chi condividiamo i dati',
        p: 'Non vendiamo, affittiamo o condividiamo i vostri dati personali con terzi. In misura limitata, i dati possono essere trattati da:',
        items: [
          'OpenRouter.ai — durante l\'uso delle funzionalità AI (AI Chat, AI Summary, AI Translate). Inviamo solo il testo estratto dal PDF, senza dati identificativi dell\'utente. OpenRouter è conforme al RGPD e dispone di garanzie adeguate.',
          'Fornitore di hosting — il nostro sito web è ospitato da un fornitore esterno che può conservare log del server anonimi (indirizzo IP, tipo di browser) per un massimo di 7 giorni. Il fornitore è in possesso della certificazione ISO 27001 e rispetta i requisiti del RGPD.',
        ],
      },
      {
        h: '6. I vostri diritti ai sensi del RGPD',
        p: 'Ai sensi degli artt. 15–22 del RGPD avete diritto a:',
        items: [
          'Diritto di accesso (art. 15) — potete chiedere se trattiamo i vostri dati e ottenerne l\'accesso.',
          'Diritto alla rettifica (art. 16) — potete richiedere la correzione di dati inesatti.',
          'Diritto alla cancellazione (art. 17) — diritto all\'oblio.',
          'Diritto alla limitazione del trattamento (art. 18).',
          'Diritto alla portabilità dei dati (art. 20).',
          'Diritto di opposizione (art. 21).',
          'Diritto di revocare il consenso in qualsiasi momento — senza pregiudicare la liceità del trattamento basata sul consenso prestato prima della revoca.',
        ],
      },
      {
        h: '7. Come esercitare i vostri diritti',
        p: 'Per esercitare uno dei diritti sopra indicati, inviate una email a: kontakt@optimapdf.com. Risponderemo entro 30 giorni. Non addebriamo compensi per l\'esecuzione delle richieste salvo che siano manifestamente infondate o eccessive (art. 12, par. 5 del RGPD).',
      },
      {
        h: '8. Diritto di proporre reclamo',
        p: 'Se ritenete che il nostro trattamento dei vostri dati violi il RGPD, avete il diritto di proporre reclamo al Presidente dell\'Ufficio per la Protezione dei Dati Personali (PUODO - Urząd Ochrony Danych Osobowych), ul. Stawki 2, 00-193 Varsavia, Polonia.',
      },
      {
        h: '9. Trasferimenti di dati verso paesi terzi',
        p: 'In caso di utilizzo delle funzionalità AI, il testo può essere elaborato dai server di OpenRouter situati negli Stati Uniti. In tali casi, vengono applicate garanzie adeguate ai sensi del RGPD, incluse le clausole contrattuali standard ove applicabile, al fine di garantire un livello adeguato di protezione dei dati.',
      },
      {
        h: '10. Cookie e localStorage',
        p: 'Non utilizziamo cookie pubblicitari, di tracciamento o analitici di terze parti. Utilizziamo esclusivamente il localStorage del browser per ricordare le vostre preferenze (tema, lingua). Questi dati sono conservati localmente sul vostro dispositivo e possono essere cancellati in qualsiasi momento svuotando il localStorage del browser.',
      },
      {
        h: '11. Modifiche a questa informativa GDPR',
        p: 'Ci riserviamo il diritto di apportare modifiche a questa informativa sul GDPR. Eventuali modifiche saranno comunicate aggiornando la data in cima a questa pagina. Vi incoraggiamo a rivedere periodicamente questo contenuto.',
      },
    ],
  },
  ja: {
    title: 'GDPRに関する情報',
    updated: '最終更新日：2026年6月25日',
    sections: [
      {
        h: '1. データ管理者としての当社について',
        p: 'お客様の個人データの管理者は、Leszek Hofman、Dąbrówka Nowa、ポーランド（optimapdf.com）です。デジタルサービス提供者として、当社はオンラインPDFツールを提供するために必要な範囲でのみデータを処理します。データ保護に関するご質問は、kontakt@optimapdf.com までご連絡ください。',
      },
      {
        h: '2. 当社が処理する個人データとその目的',
        p: 'OptimaPDFはデータの収集を最小限に抑えるように設計されています。当社が処理するのは以下のデータのみです。',
        items: [
          'IPアドレス — セキュリティの確保と不正利用の防止のため（正当な利益、GDPR第6条第1項（f）号）。IPアドレスはサーバーログに最大7日間保存されます。',
          'ユーザーがアップロードしたファイル — 大半のツールはファイルをブラウザ上で完全に処理します（WebAssembly/JavaScript）。これらのファイルはサーバーに送信されず、お客様のデバイスから出ることはありません。例外は外部ライブラリを必要とするツール（圧縮、OCR、フォーマット変換）であり、ファイルはサーバーのRAMで一時的に処理された後、操作完了後すぐに削除されます。通常は数秒以内です。',
          'テーマと言語の設定 — ブラウザのlocalStorageにのみ保存されます。サーバーに送信されることも、第三者と共有されることもありません。',
        ],
      },
      {
        h: '3. 処理の法的根拠',
        p: '当社は、以下の法的根拠に基づいてお客様のデータを処理します。',
        items: [
          'GDPR第6条第1項（b）号（契約履行の必要性） — お客様のご要望に応じてPDFツールを提供するため。',
          'GDPR第6条第1項（f）号（正当な利益） — サービスのセキュリティ確保、不正利用の防止、ウェブサイト運営の技術的分析のため。',
          'GDPR第6条第1項（a）号（同意） — 外部API（OpenRouter）へのコンテンツ送信を必要とするAI機能について。AIの利用には、利用規約への同意による明示的な同意が必要です。',
        ],
      },
      {
        h: '4. データの保存期間',
        p: '当社は以下の保存期間を適用します。',
        items: [
          'サーバーログのIPアドレス：最大7日間。',
          'クライアント側ツールに送信されたファイル：保存されません。ブラウザのタブを閉じるか、ページを更新するとメモリから削除されます。',
          'サーバー側ツールに送信されたファイル（圧縮、OCR、変換）：処理完了後すぐに削除されます。通常は数秒以内です。',
          'localStorageのデータ：ユーザーが手動で削除するか、ブラウザのキャッシュがクリアされるまで保存されます。',
        ],
      },
      {
        h: '5. データの共有先',
        p: '当社はお客様の個人データを第三者に販売、貸与、共有することはありません。限定的な範囲で、以下の事業者がデータを処理する場合があります。',
        items: [
          'OpenRouter.ai — AI機能（AI Chat、AI Summary、AI Translate）の使用時。PDFから抽出されたテキストのみを送信し、ユーザーを識別するデータは含みません。OpenRouterはGDPRに準拠し、適切な保護措置を講じています。',
          'ホスティングプロバイダー — 当社のウェブサイトは外部プロバイダーによってホストされており、サーバーの匿名ログ（IPアドレス、ブラウザの種類）を最大7日間保存する場合があります。プロバイダーはISO 27001認証を取得しており、GDPRの要件を満たしています。',
        ],
      },
      {
        h: '6. GDPRに基づくお客様の権利',
        p: 'GDPR第15条から第22条に基づき、お客様には以下の権利があります。',
        items: [
          'アクセス権（第15条） — 当社がお客様のデータを処理しているかどうかを確認し、そのデータへのアクセスを受けることができます。',
          '訂正権（第16条） — 不正確なデータの訂正を請求することができます。',
          '消去権（第17条） — 忘れられる権利。',
          '処理の制限を求める権利（第18条）。',
          'データポータビリティの権利（第20条）。',
          '異議申立て権（第21条）。',
          '同意の撤回 — いつでも同意を撤回できます。撤回前の同意に基づく処理の適法性には影響を及ぼしません。',
        ],
      },
      {
        h: '7. 権利の行使方法',
        p: '上記の権利を行使する場合は、kontakt@optimapdf.com までメールでお問い合わせください。30日以内にご回答いたします。請求が明らかに根拠がない又は過大である場合を除き、権利の行使に対する料金は一切申し受けません（GDPR第12条第5項）。',
      },
      {
        h: '8. 苦情を申し立てる権利',
        p: '当社のデータ処理がGDPRに違反しているとお考えの場合、お客様はポーランド個人データ保護局長官（PUODO - Prezes Urzędu Ochrony Danych Osobowych, ul. Stawki 2, 00-193 Warszawa, ポーランド）に苦情を申し立てる権利を有します。',
      },
      {
        h: '9. 第三国へのデータ移転',
        p: 'AI機能の使用時、テキストは米国に所在するOpenRouterのサーバーによって処理される場合があります。その場合、GDPRの要件に従い、標準契約条項（SCC）を含む適切な保護措置が適用され、適切なレベルのデータ保護が確保されます。',
      },
      {
        h: '10. クッキーとlocalStorage',
        p: '当社は広告、トラッキング、または第三者の分析クッキーを使用しません。ブラウザのlocalStorageのみを使用して、お客様の設定（テーマ、言語）を記憶します。これらのデータはお客様のデバイスにローカルに保存され、ブラウザのローカルストレージをクリアすることでいつでも削除できます。',
      },
      {
        h: '11. 本GDPR情報の変更',
        p: '当社は、本GDPR情報に変更を加える権利を留保します。変更がある場合は、本ページの上部の日付を更新してお知らせします。定期的にこのコンテンツをご確認いただくことをお勧めします。',
      },
    ],
  },
};

export default function RodoPage({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const { locale: detectedLocale } = useLocale();
  const locale = forcedLocale || detectedLocale;
  const lang = (content as Record<string, typeof content.pl>)[locale] || content.en;

  const isRtl = locale === 'ar' || locale === 'fa';

  return (
    <main className="max-w-3xl mx-auto px-4 py-12" dir={isRtl ? 'rtl' : 'ltr'}>
      {isRtl && (
        <style>{`
          .rodo-rtl ul { padding-right: 1.25rem; padding-left: 0; }
          .rodo-rtl ol { padding-right: 1.25rem; padding-left: 0; }
          .rodo-rtl { text-align: right; }
        `}</style>
      )}
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">🛡️</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{lang.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">{lang.updated}</p>
      </div>

      <div className={`tool-card rounded-2xl border p-8 space-y-8 text-sm leading-relaxed ${isRtl ? 'rodo-rtl' : ''}`} style={{ color: 'var(--coffee-text-secondary)' }}>
        {lang.sections.map((sec, i) => (
          <section key={i}>
            <h2 className="text-lg sm:text-xl font-bold tool-heading mb-3">{sec.h}</h2>
            <p className="mb-2">{sec.p}</p>
            {'items' in sec && sec.items && (
              <ul className={`list-disc space-y-1.5 ${isRtl ? 'pr-5' : 'pl-5'}`}>
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
