'use client';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';

const content = {
  pl: {
    title: 'Polityka prywatności',
    updated: 'Ostatnia aktualizacja: 30 czerwca 2026',
    sections: [
      {
        h: '1. Postanowienia ogólne',
        p: 'Niniejsza Polityka prywatności określa zasady przetwarzania i ochrony danych osobowych użytkowników serwisu OptimaPDF (optimapdf.com). OptimaPDF przykłada najwyższą wagę do ochrony prywatności i bezpieczeństwa danych. Wszystkie narzędzia zostały zaprojektowane zgodnie z zasadą privacy by design — domyślnie Twoje pliki przetwarzane są lokalnie w przeglądarce.',
      },
      {
        h: '2. Administrator danych',
        p: 'Administratorem danych osobowych jest Leszek Hofman, Dąbrówka Nowa, Polska. Kontakt: kontakt@optimapdf.com. Administrator nie wyznaczył Inspektora Ochrony Danych — we wszystkich sprawach związanych z ochroną danych osobowych kontaktuj się bezpośrednio poprzez powyższy adres e-mail.',
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
            p: 'Informacje o wybranym motywie (ciemny/jasny) i preferowanym języku są przechowywane w localStorage przeglądarki. Nie są one wysyłane na serwer ani udostępniane stronom trzecim.',
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
          'Google LLC (Google Analytics) — anonimowe dane statystyczne o ruchu na stronie, na podstawie Twojej zgody.',
          'Podmioty przetwarzające na nasze zlecenie (hosting, OpenRouter.ai) — na podstawie umowy powierzenia przetwarzania danych.',
          'Organy uprawnione na podstawie przepisów prawa — wyłącznie w przypadkach przewidzianych prawem.',
        ],
      },
      {
        h: '6. Przekazywanie danych poza EOG',
        p: 'W przypadku korzystania z funkcji AI, tekst może być przetwarzany na serwerach OpenRouter w USA. W takich przypadkach stosuje się odpowiednie zabezpieczenia zgodnie z wymogami RODO, w tym w stosownych przypadkach Standardowe Klauzule Umowne, aby zapewnić odpowiedni poziom ochrony danych. W pozostałych przypadkach dane nie są przekazywane do państw trzecich.',
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
        ],
      },
      {
        h: '10. Google Analytics i zgoda na analitykę',
        p: 'Serwis korzysta z Google Analytics (Google LLC, USA) do anonimowej analizy ruchu. Google Analytics zbiera zagregowane dane statystyczne, takie jak: liczba odwiedzin, czas spędzony na stronie, typ przeglądarki, przybliżona lokalizacja (poziom kraju), źródło ruchu. Dane są anonimizowane (anonymize_ip: true).',
        items: [
          'Przy pierwszej wizycie wyświetlany jest baner zgody — Google Analytics jest aktywowany dopiero po kliknięciu "Akceptuję".',
          'W każdej chwili możesz wycofać zgodę, usuwając zapis "cookie-consent" z localStorage przeglądarki.',
          'Google Analytics nie jest używane do targetowania reklam ani profilowania behawioralnego.',
          'Dane w localStorage (motyw, język, preferencje zgód) są w pełni kontrolowane przez użytkownika i mogą być w każdej chwili usunięte.',
        ],
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
    updated: 'Last updated: June 30, 2026',
    sections: [
      {
        h: '1. General provisions',
        p: 'This Privacy Policy defines the principles of processing and protection of personal data of users of the OptimaPDF website (optimapdf.com). OptimaPDF places the highest importance on privacy and data security. All tools have been designed following the privacy by design principle — by default, your files are processed locally in your browser.',
      },
      {
        h: '2. Data controller',
        p: 'The data controller is Leszek Hofman, Dąbrówka Nowa, Poland. Contact: kontakt@optimapdf.com. The controller has not appointed a Data Protection Officer — for all matters related to personal data protection, contact us directly via the email address above.',
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
            p: 'Information about the selected theme (dark/light) and your language preference is stored in the browser\'s localStorage. It is not sent to the server or shared with third parties.',
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
          'Google LLC (Google Analytics) — anonymized traffic statistics, based on your consent.',
          'Processors acting on our behalf (hosting, OpenRouter.ai) — based on data processing agreements.',
          'Authorities entitled under legal provisions — only in cases provided for by law.',
        ],
      },
      {
        h: '6. Data transfers outside the EEA',
        p: 'When using AI features, text may be processed on OpenRouter servers in the US. In such cases, appropriate safeguards are applied in accordance with GDPR requirements, including Standard Contractual Clauses where applicable, to ensure an adequate level of data protection. In other cases, data is not transferred to third countries.',
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
        ],
      },
      {
        h: '10. Google Analytics and analytics consent',
        p: 'This website uses Google Analytics (Google LLC, USA) for anonymous traffic analysis. Google Analytics collects aggregated statistical data such as: visit count, time spent on site, browser type, approximate location (country level), traffic source. Data is anonymized (anonymize_ip: true).',
        items: [
          'On first visit, a consent banner is shown — Google Analytics is only activated after clicking "Accept".',
          'You can withdraw consent at any time by removing the "cookie-consent" entry from your browser\'s localStorage.',
          'Google Analytics is not used for ad targeting or behavioral profiling.',
          'Data in localStorage (theme, language, consent preferences) is fully controlled by the user and can be deleted at any time.',
        ],
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
  de: {
    title: 'Datenschutzerklärung',
    updated: 'Letzte Aktualisierung: 30. Juni 2026',
    sections: [
      {
        h: '1. Allgemeine Bestimmungen',
        p: 'Diese Datenschutzerklärung legt die Grundsätze für die Verarbeitung und den Schutz personenbezogener Daten der Nutzer der OptimaPDF-Website (optimapdf.com) fest. OptimaPDF legt größten Wert auf den Schutz der Privatsphäre und die Datensicherheit. Alle Werkzeuge wurden nach dem Prinzip Privacy by Design entwickelt — standardmäßig werden Ihre Dateien lokal in Ihrem Browser verarbeitet.',
      },
      {
        h: '2. Verantwortlicher',
        p: 'Verantwortlicher für die Verarbeitung personenbezogener Daten ist Leszek Hofman, Dąbrówka Nowa, Polen. Kontakt: kontakt@optimapdf.com. Es wurde kein Datenschutzbeauftragter benannt — bei allen Fragen zum Schutz personenbezogener Daten wenden Sie sich direkt an die oben genannte E-Mail-Adresse.',
      },
      {
        h: '3. Umfang und Zwecke der Datenerhebung',
        sub: [
          {
            h: '3.1 Technische Daten',
            p: 'Bei Nutzung der Website werden automatisch folgende technische Daten erhoben: IP-Adresse, Browsertyp und -version, Betriebssystem, Bildschirmaufösung, ungefähre geografische Standortbestimmung (Länderebene), Besuchszeit und Verweildauer auf der Seite. Diese Daten werden anonymisiert und ausschließlich zu statistischen Zwecken und zur Gewährleistung der Sicherheit verwendet.',
          },
          {
            h: '3.2 Vom Benutzer hochgeladene Dateien',
            p: 'PDF-Dateien, die in die Werkzeuge hochgeladen werden, werden wie folgt verarbeitet:',
            items: [
              'Clientseitige Werkzeuge (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) — die Datei wird vollständig im Browser mit WebAssembly und JavaScript verarbeitet. Die Datei verlässt niemals Ihr Gerät.',
              'Serverseitige Werkzeuge (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) — die Datei wird vorübergehend an den Server gesendet, ausschließlich im RAM verarbeitet und unmittelbar nach dem Vorgang gelöscht. Maximale Speicherzeit: wenige Sekunden.',
              'KI-Funktionen (AI Chat, AI Summary, AI Translate) — der aus dem PDF extrahierte Text wird an die externe OpenRouter-API gesendet. Wir senden keine nutzeridentifizierenden Daten. Der Inhalt wird nicht gespeichert oder zum Training von Modellen verwendet.',
            ],
          },
          {
            h: '3.3 Benutzereinstellungen',
            p: 'Informationen über das ausgewählte Design (dunkel/hell) und Ihre Spracheinstellung werden im localStorage Ihres Browsers gespeichert. Sie werden nicht an den Server gesendet oder mit Dritten geteilt.',
          },
        ],
      },
      {
        h: '4. Rechtsgrundlage der Verarbeitung',
        items: [
          'Art. 6 Abs. 1 lit. b DSGVO — Durchführung eines Vertrags über elektronische Dienstleistungsbereitstellung (Bereitstellung von PDF-Werkzeugen).',
          'Art. 6 Abs. 1 lit. f DSGVO — berechtigtes Interesse des Verantwortlichen (Gewährleistung der Sicherheit, Missbrauchsprävention, technische Analyse).',
          'Art. 6 Abs. 1 lit. a DSGVO — Einwilligung des Nutzers (bei KI-Funktionen). Die Einwilligung kann jederzeit widerrufen werden.',
        ],
      },
      {
        h: '5. Empfänger der Daten',
        p: 'Die Daten können folgenden Kategorien von Empfängern übermittelt werden:',
        items: [
          'Google LLC (Google Analytics) — anonymisierte Zugriffsstatistiken, auf Grundlage Ihrer Einwilligung.',
          'Auftragsverarbeiter (Hosting, OpenRouter.ai) — auf Grundlage von Auftragsverarbeitungsverträgen.',
          'Behörden auf Grundlage gesetzlicher Bestimmungen — ausschließlich in gesetzlich vorgesehenen Fällen.',
        ],
      },
      {
        h: '6. Datenübermittlung außerhalb des EWR',
        p: 'Bei Nutzung von KI-Funktionen kann der Text auf OpenRouter-Servern in den USA verarbeitet werden. In solchen Fällen werden zum Schutz eines angemessenen Datenschutzniveaus Standardvertragsklauseln gemäß den Anforderungen der DSGVO vereinbart. In den übrigen Fällen werden keine Daten in Drittländer übermittelt.',
      },
      {
        h: '7. Speicherdauer der Daten',
        p: 'Die Daten werden für folgende Zeiträume gespeichert:',
        items: [
          'Serverprotokolle (IP-Adresse, User-Agent): bis zu 7 Tage.',
          'An clientseitige Werkzeuge hochgeladene Dateien: werden nicht gespeichert — werden beim Aktualisieren der Seite aus dem Speicher entfernt.',
          'An serverseitige Werkzeuge hochgeladene Dateien: werden unmittelbar nach der Verarbeitung gelöscht.',
          'localStorage-Daten: bis zur manuellen Löschung durch den Benutzer.',
        ],
      },
      {
        h: '8. Rechte der betroffenen Person',
        p: 'Sie haben das Recht auf:',
        items: [
          'Auskunft über Ihre Daten (Art. 15 DSGVO).',
          'Berichtigung der Daten (Art. 16 DSGVO).',
          'Löschung der Daten (Art. 17 DSGVO) — Recht auf Vergessenwerden.',
          'Einschränkung der Verarbeitung (Art. 18 DSGVO).',
          'Datenübertragbarkeit (Art. 20 DSGVO).',
          'Widerspruch gegen die Verarbeitung (Art. 21 DSGVO).',
          'Widerruf der Einwilligung jederzeit, ohne dass die Rechtmäßigkeit der aufgrund der Einwilligung bis zum Widerruf erfolgten Verarbeitung berührt wird.',
          'Beschwerde bei dem Präsidenten des Büros für den Schutz personenbezogener Daten (PUODO), ul. Stawki 2, 00-193 Warschau, Polen.',
        ],
      },
      {
        h: '9. Datensicherheit',
        p: 'Wir setzen folgende Sicherheitsmaßnahmen ein:',
        items: [
          'TLS/SSL-Verschlüsselung — die gesamte Kommunikation zwischen Browser und Server ist verschlüsselt.',
          'Content Security Policy (CSP) — schränkt die Möglichkeit der Ausführung nicht vertrauenswürdiger Skripte ein.',
          'Ausschließlich RAM-Verarbeitung — Dateien werden nicht auf die Festplatte des Servers geschrieben.',
          'Automatische Löschung — Dateien werden unmittelbar nach Abschluss des Vorgangs gelöscht.',
          'Dateigrößenbeschränkung — maximal 100 MB.',
          'Dateitypüberprüfung — wir prüfen die Dateisignatur (Magic Bytes) vor der Verarbeitung.',
          'Keine Anmeldung erforderlich — wir erfordern keine Registrierung oder Anmeldung.',
        ],
      },
      {
        h: '10. Google Analytics und Einwilligung in die Analyse',
        p: 'Diese Website nutzt Google Analytics (Google LLC, USA) zur anonymisierten Zugriffsanalyse. Google Analytics erfasst aggregierte statistische Daten wie: Besuchsanzahl, Verweildauer auf der Seite, Browsertyp, ungefähre Standortbestimmung (Länderebene), Zugriffsquelle. Die Daten werden anonymisiert (anonymize_ip: true).',
        items: [
          'Beim ersten Besuch wird ein Einwilligungsbanner angezeigt — Google Analytics wird erst nach Klick auf „Akzeptieren" aktiviert.',
          'Sie können die Einwilligung jederzeit widerrufen, indem Sie den Eintrag „cookie-consent" aus dem localStorage Ihres Browsers entfernen.',
          'Google Analytics wird nicht für werbliches Targeting oder verhaltensbasiertes Profiling verwendet.',
          'Daten im localStorage (Design, Sprache, Einwilligungseinstellungen) werden vollständig vom Benutzer kontrolliert und können jederzeit gelöscht werden.',
        ],
      },
      {
        h: '11. KI-Funktionen und OpenRouter',
        p: 'Die Nutzung von KI-Funktionen (AI Chat, AI Summary, AI Translate) erfordert einen eigenen OpenRouter-API-Schlüssel, der ausschließlich im localStorage Ihres Browsers gespeichert wird und nicht dem Websitebetreiber zur Verfügung gestellt wird. Der API-Schlüssel wird ausschließlich zur Kommunikation mit der OpenRouter-API verwendet. Wir haben keinen Zugang zu Ihrem API-Schlüssel oder zu den Inhalten der Anfragen, die an OpenRouter gesendet werden.',
      },
      {
        h: '12. Schlussbestimmungen',
        p: 'Wir behalten uns das Recht vor, Änderungen an dieser Datenschutzerklärung vorzunehmen. Änderungen werden durch Aktualisierung des Datums oben auf dieser Seite mitgeteilt. Bei Fragen zur Datenschutzerklärung wenden Sie sich bitte an: kontakt@optimapdf.com.',
      },
    ],
  },
  es: {
    title: 'Política de Privacidad',
    updated: 'Última actualización: 30 de junio de 2026',
    sections: [
      {
        h: '1. Disposiciones generales',
        p: 'Esta Política de Privacidad define los principios de tratamiento y protección de datos personales de los usuarios del sitio web OptimaPDF (optimapdf.com). OptimaPDF otorga la máxima importancia a la privacidad y la seguridad de los datos. Todas las herramientas han sido diseñadas siguiendo el principio de privacidad por defecto — por defecto, sus archivos se procesan localmente en su navegador.',
      },
      {
        h: '2. Responsable del tratamiento',
        p: 'El responsable del tratamiento de datos personales es Leszek Hofman, Dąbrówka Nowa, Polonia. Contacto: kontakt@optimapdf.com. No se ha designado un Delegado de Protección de Datos — para todas las cuestiones relacionadas con la protección de datos, contacte directamente con la dirección de correo electrónico indicada.',
      },
      {
        h: '3. Alcance y fines de la recopilación de datos',
        sub: [
          {
            h: '3.1 Datos técnicos',
            p: 'Al utilizar el sitio web, se recopilan automáticamente los siguientes datos técnicos: dirección IP, tipo y versión del navegador, sistema operativo, resolución de pantalla, ubicación geográfica aproximada (a nivel de país), hora de visita y tiempo empleado en el sitio. Estos datos se anonimizan y se utilizan exclusivamente con fines estadísticos y de garantía de seguridad.',
          },
          {
            h: '3.2 Archivos subidos por el usuario',
            p: 'Los archivos PDF subidos a las herramientas se procesan de la siguiente manera:',
            items: [
              'Herramientas del lado del cliente (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) — el archivo se procesa completamente en el navegador utilizando WebAssembly y JavaScript. El archivo nunca sale de su dispositivo.',
              'Herramientas del lado del servidor (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) — el archivo se envía temporalmente al servidor, se procesa exclusivamente en la RAM y se elimina inmediatamente después de la operación. Tiempo máximo de retención: unos pocos segundos.',
              'Funciones de IA (AI Chat, AI Summary, AI Translate) — el texto extraído del PDF se envía a la API externa de OpenRouter. No enviamos datos identificativos del usuario. El contenido no se almacena ni se utiliza para el entrenamiento de modelos.',
            ],
          },
          {
            h: '3.3 Preferencias del usuario',
            p: 'La información sobre el tema seleccionado (oscuro/claro) y su preferencia de idioma se almacena en el localStorage del navegador. No se envía al servidor ni se comparte con terceros.',
          },
        ],
      },
      {
        h: '4. Base jurídica del tratamiento',
        items: [
          'Art. 6.1.b RGPD — ejecución de un contrato de prestación de servicios electrónicos (proporcionar herramientas PDF).',
          'Art. 6.1.f RGPD — interés legítimo del responsable (garantizar la seguridad, prevenir abusos, análisis técnico).',
          'Art. 6.1.a RGPD — consentimiento del usuario (para funciones de IA). El consentimiento puede retirarse en cualquier momento.',
        ],
      },
      {
        h: '5. Destinatarios de los datos',
        p: 'Los datos pueden transferirse a las siguientes categorías de destinatarios:',
        items: [
          'Google LLC (Google Analytics) — estadísticas de tráfico anonimizadas, basadas en su consentimiento.',
          'Encargados del tratamiento en nuestro nombre (hosting, OpenRouter.ai) — en base a contratos de encargado del tratamiento.',
          'Autoridades habilitadas por disposiciones legales — únicamente en los casos previstos por la ley.',
        ],
      },
      {
        h: '6. Transferencias de datos fuera del EEE',
        p: 'Al utilizar funciones de IA, el texto puede ser procesado en servidores de OpenRouter en Estados Unidos. En estos casos, para garantizar un nivel adecuado de protección de datos se aplican las cláusulas contractuales tipo conforme a los requisitos del RGPD. En los demás casos, no se transfieren datos a terceros países.',
      },
      {
        h: '7. Plazo de conservación de los datos',
        p: 'Los datos se conservan durante los siguientes plazos:',
        items: [
          'Registros del servidor (dirección IP, User-Agent): hasta 7 días.',
          'Archivos subidos a herramientas del lado del cliente: no se almacenan — se eliminan de la memoria al actualizar la página.',
          'Archivos subidos a herramientas del lado del servidor: se eliminan inmediatamente después del procesamiento.',
          'Datos en localStorage: hasta que el usuario los elimine manualmente.',
        ],
      },
      {
        h: '8. Derechos del interesado',
        p: 'Usted tiene derecho a:',
        items: [
          'Acceder a sus datos (art. 15 RGPD).',
          'Rectificación de datos (art. 16 RGPD).',
          'Supresión de datos (art. 17 RGPD) — derecho al olvido.',
          'Limitación del tratamiento (art. 18 RGPD).',
          'Portabilidad de datos (art. 20 RGPD).',
          'Oposición al tratamiento (art. 21 RGPD).',
          'Retirar el consentimiento en cualquier momento sin que se vea afectada la licitud del tratamiento basado en el consentimiento previo a su retirada.',
          'Presentar una reclamación ante el Presidente de la Oficina de Protección de Datos Personales (PUODO — Urząd Ochrony Danych Osobowych, ul. Stawki 2, 00-193 Varsovia, Polonia).',
        ],
      },
      {
        h: '9. Seguridad de los datos',
        p: 'Aplicamos las siguientes medidas de seguridad:',
        items: [
          'Cifrado TLS/SSL — toda la comunicación entre el navegador y el servidor está cifrada.',
          'Content Security Policy (CSP) — limita la capacidad de ejecutar scripts no fiables.',
          'Procesamiento exclusivo en RAM — los archivos no se escriben en el disco del servidor.',
          'Eliminación automática — los archivos se eliminan inmediatamente después de completar la operación.',
          'Límite de tamaño de archivo — máximo 100 MB.',
          'Verificación del tipo de archivo — comprobamos la firma del archivo (magic bytes) antes de procesarlo.',
          'No se requiere inicio de sesión — no exigimos registro ni inicio de sesión.',
        ],
      },
      {
        h: '10. Google Analytics y consentimiento de análisis',
        p: 'Este sitio web utiliza Google Analytics (Google LLC, EE. UU.) para el análisis anónimo del tráfico. Google Analytics recopila datos estadísticos agregados como: número de visitas, tiempo empleado en el sitio, tipo de navegador, ubicación aproximada (a nivel de país), fuente del tráfico. Los datos se anonimizan (anonymize_ip: true).',
        items: [
          'En la primera visita se muestra un banner de consentimiento — Google Analytics solo se activa después de hacer clic en «Aceptar».',
          'Puede retirar el consentimiento en cualquier momento eliminando la entrada «cookie-consent» del localStorage de su navegador.',
          'Google Analytics no se utiliza para la segmentación publicitaria ni el perfilado conductual.',
          'Los datos en localStorage (tema, idioma, preferencias de consentimiento) están controlados completamente por el usuario y pueden eliminarse en cualquier momento.',
        ],
      },
      {
        h: '11. Funciones de IA y OpenRouter',
        p: 'El uso de funciones de IA (AI Chat, AI Summary, AI Translate) requiere su propia clave API de OpenRouter, que se almacena exclusivamente en el localStorage de su navegador y no se comparte con el administrador del sitio web. La clave API se utiliza únicamente para la comunicación con la API de OpenRouter. No tenemos acceso a su clave API ni al contenido de las consultas enviadas a OpenRouter.',
      },
      {
        h: '12. Disposiciones finales',
        p: 'Nos reservamos el derecho a realizar cambios en esta Política de Privacidad. Los cambios se comunicarán actualizando la fecha en la parte superior de esta página. Cualquier pregunta sobre la política de privacidad puede dirigirse a: kontakt@optimapdf.com.',
      },
    ],
  },
  pt: {
    title: 'Política de Privacidade',
    updated: 'Última atualização: 30 de junho de 2026',
    sections: [
      {
        h: '1. Disposições gerais',
        p: 'Esta Política de Privacidade define os princípios de tratamento e proteção de dados pessoais dos utilizadores do site OptimaPDF (optimapdf.com). O OptimaPDF atribui a máxima importância à privacidade e à segurança dos dados. Todas as ferramentas foram concebidas seguindo o princípio de privacy by design — por predefinição, os seus ficheiros são processados localmente no seu navegador.',
      },
      {
        h: '2. Responsável pelo tratamento',
        p: 'O responsável pelo tratamento de dados pessoais é Leszek Hofman, Dąbrówka Nowa, Polónia. Contacto: kontakt@optimapdf.com. Não foi nomeado um Encarregado de Proteção de Dados — para todas as questões relacionadas com a proteção de dados, contacte-nos diretamente através do endereço de e-mail acima indicado.',
      },
      {
        h: '3. Âmbito e finalidades da recolha de dados',
        sub: [
          {
            h: '3.1 Dados técnicos',
            p: 'Ao utilizar o website, são recolhidos automaticamente os seguintes dados técnicos: endereço IP, tipo e versão do navegador, sistema operativo, resolução do ecrã, localização geográfica aproximada (a nível de país), hora de visita e tempo despendido no site. Estes dados são anonimizados e utilizados exclusivamente para fins estatísticos e de garantia de segurança.',
          },
          {
            h: '3.2 Ficheiros carregados pelo utilizador',
            p: 'Os ficheiros PDF carregados para as ferramentas são processados da seguinte forma:',
            items: [
              'Ferramentas do lado do cliente (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) — o ficheiro é processado integralmente no navegador utilizando WebAssembly e JavaScript. O ficheiro nunca sai do seu dispositivo.',
              'Ferramentas do lado do servidor (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) — o ficheiro é enviado temporariamente para o servidor, processado exclusivamente na RAM e eliminado imediatamente após a operação. Tempo máximo de retenção: alguns segundos.',
              'Funções de IA (AI Chat, AI Summary, AI Translate) — o texto extraído do PDF é enviado para a API externa da OpenRouter. Não enviamos dados identificativos do utilizador. O conteúdo não é armazenado nem utilizado para treino de modelos.',
            ],
          },
          {
            h: '3.3 Preferências do utilizador',
            p: 'As informações sobre o tema selecionado (escuro/claro) e a sua preferência de idioma são armazenadas no localStorage do navegador. Não são enviadas para o servidor nem partilhadas com terceiros.',
          },
        ],
      },
      {
        h: '4. Base jurídica do tratamento',
        items: [
          'Art. 6.1.b RGPD — execução de um contrato de prestação de serviços eletrónicos (disponibilização de ferramentas PDF).',
          'Art. 6.1.f RGPD — interesse legítimo do responsável (garantir a segurança, prevenir abusos, análise técnica).',
          'Art. 6.1.a RGPD — consentimento do utilizador (para funções de IA). O consentimento pode ser retirado a qualquer momento.',
        ],
      },
      {
        h: '5. Destinatários dos dados',
        p: 'Os dados podem ser transferidos para as seguintes categorias de destinatários:',
        items: [
          'Google LLC (Google Analytics) — estatísticas de tráfego anonimizadas, com base no seu consentimento.',
          'Operadores que atuam em nosso nome (hosting, OpenRouter.ai) — com base em contratos de tratamento de dados.',
          'Autoridades habilitadas por disposições legais — apenas nos casos previstos por lei.',
        ],
      },
      {
        h: '6. Transferências de dados fora do EEE',
        p: 'Ao utilizar funções de IA, o texto pode ser processado em servidores da OpenRouter nos EUA. Nesses casos, são aplicadas garantias adequadas de acordo com os requisitos do RGPD, incluindo Cláusulas Contratuais-Tipo quando aplicável, para garantir um nível adequado de proteção de dados. Nos demais casos, os dados não são transferidos para países terceiros.',
      },
      {
        h: '7. Prazo de retenção dos dados',
        p: 'Os dados são armazenados pelos seguintes prazos:',
        items: [
          'Registos do servidor (endereço IP, User-Agent): até 7 dias.',
          'Ficheiros carregados para ferramentas do lado do cliente: não são armazenados — eliminados da memória ao atualizar a página.',
          'Ficheiros carregados para ferramentas do lado do servidor: eliminados imediatamente após o processamento.',
          'Dados no localStorage: até serem eliminados manualmente pelo utilizador.',
        ],
      },
      {
        h: '8. Direitos do titular dos dados',
        p: 'Tem direito a:',
        items: [
          'Aceder aos seus dados (art. 15 RGPD).',
          'Retificação de dados (art. 16 RGPD).',
          'Eliminação de dados (art. 17 RGPD) — direito ao esquecimento.',
          'Restrição do tratamento (art. 18 RGPD).',
          'Portabilidade de dados (art. 20 RGPD).',
          'Oposição ao tratamento (art. 21 RGPD).',
          'Retirar o consentimento a qualquer momento sem afetar a licitude do tratamento baseado no consentimento anterior à sua retirada.',
          'Apresentar uma reclamação junto do Presidente do Escritório de Proteção de Dados Pessoais (PUODO — Urząd Ochrony Danych Osobowych, ul. Stawki 2, 00-193 Varsóvia, Polónia).',
        ],
      },
      {
        h: '9. Segurança dos dados',
        p: 'Aplicamos as seguintes medidas de segurança:',
        items: [
          'Encriptação TLS/SSL — toda a comunicação entre o navegador e o servidor é encriptada.',
          'Content Security Policy (CSP) — limita a capacidade de executar scripts não fidedignos.',
          'Processamento exclusivamente em RAM — os ficheiros não são escritos no disco do servidor.',
          'Eliminação automática — os ficheiros são eliminados imediatamente após a conclusão da operação.',
          'Limite de tamanho de ficheiro — máximo de 100 MB.',
          'Verificação do tipo de ficheiro — verificamos a assinatura do ficheiro (magic bytes) antes de processar.',
          'Sem necessidade de início de sessão — não exigemos registo nem início de sessão.',
        ],
      },
      {
        h: '10. Google Analytics e consentimento de análise',
        p: 'Este website utiliza o Google Analytics (Google LLC, EUA) para análise anónima de tráfego. O Google Analytics recolhe dados estatísticos agregados como: número de visitas, tempo despendido no site, tipo de navegador, localização aproximada (a nível de país), origem do tráfego. Os dados são anonimizados (anonymize_ip: true).',
        items: [
          'Na primeira visita, é apresentado um banner de consentimento — o Google Analytics só é ativado após clicar em «Aceitar».',
          'Pode retirar o consentimento a qualquer momento, removendo a entrada «cookie-consent» do localStorage do seu navegador.',
          'O Google Analytics não é utilizado para segmentação publicitária ou perfilamento comportamental.',
          'Os dados no localStorage (tema, idioma, preferências de consentimento) são totalmente controlados pelo utilizador e podem ser eliminados a qualquer momento.',
        ],
      },
      {
        h: '11. Funções de IA e OpenRouter',
        p: 'A utilização de funções de IA (AI Chat, AI Summary, AI Translate) requer a sua própria chave API da OpenRouter, que é armazenada exclusivamente no localStorage do seu navegador e não é partilhada com o administrador do website. A chave API é utilizada exclusivamente para comunicação com a API da OpenRouter. Não temos acesso à sua chave API nem ao conteúdo das consultas enviadas para a OpenRouter.',
      },
      {
        h: '12. Disposições finais',
        p: 'Reservamo-nos o direito de efetuar alterações a esta Política de Privacidade. As alterações serão comunicadas atualizando a data no topo desta página. Quaisquer questões relativas à política de privacidade devem ser dirigidas a: kontakt@optimapdf.com.',
      },
    ],
  },
  no: {
    title: 'Personvernerklæring',
    updated: 'Sist oppdatert: 30. juni 2026',
    sections: [
      {
        h: '1. Generelle bestemmelser',
        p: 'Denne personvernerklæringen fastsetter prinsippene for behandling og beskyttelse av personopplysninger for brukere av OptimaPDF-nettstedet (optimapdf.com). OptimaPDF legger størst vekt på personvern og datasikkerhet. Alle verktøy er utviklet i henhold til prinsippet om personvern som utgangspunkt — som standard behandles filene dine lokalt i nettleseren.',
      },
      {
        h: '2. Behandlingsansvarlig',
        p: 'Den behandlingsansvarlige for personopplysninger er Leszek Hofman, Dąbrówka Nowa, Polen. Kontakt: kontakt@optimapdf.com. Det er ikke utnevnt en personvernombud — for alle spørsmål knyttet til beskyttelse av personopplysninger, kontakt oss direkte via e-postadressen ovenfor.',
      },
      {
        h: '3. Omfang og formål med datainnsamling',
        sub: [
          {
            h: '3.1 Tekniske data',
            p: 'Når du bruker nettstedet, samles følgende tekniske data automatisk inn: IP-adresse, nettlesertype og -versjon, operativsystem, skjermoppløsning, omtrentlig geografisk plassering (landnivå), besøkstid og tid brukt på siden. Disse dataene anonymiseres og brukes utelukkende til statistiske formål og sikkerhetssikring.',
          },
          {
            h: '3.2 Filer lastet opp av brukeren',
            p: 'PDF-filer som lastes opp til verktøyene, behandles på følgende måte:',
            items: [
              'Klientsideverktøy (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) — filen behandles fullstendig i nettleseren ved bruk av WebAssembly og JavaScript. Filen forlater aldri enheten din.',
              'Serversideverktøy (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) — filen sendes midlertidig til serveren, behandles utelukkende i RAM og slettes umiddelbart etter operasjonen. Maksimal lagringstid: noen få sekunder.',
              'AI-funksjoner (AI Chat, AI Summary, AI Translate) — tekst utvunnet fra PDFen sendes til den eksterne OpenRouter APIen. Vi sender ikke brukeridentifiserende data. Innholdet lagres ikke eller brukes til modelltrening.',
            ],
          },
          {
            h: '3.3 Brukerinnstillinger',
            p: 'Informasjon om det valgte temaet (mørk/lys) og ditt språkval lagres i nettleserens localStorage. Det sendes ikke til serveren eller deles med tredjeparter.',
          },
        ],
      },
      {
        h: '4. Rettslig grunnlag for behandling',
        items: [
          'Art. 6(1)(b) GDPR — oppfyllelse av en kontrakt om elektronisk tjenesteytelse (stilling av PDF-verktøy).',
          'Art. 6(1)(f) GDPR — berettiget interesse for den behandlingsansvarlige (sikkerhetssikring, forebygging av misbruk, teknisk analyse).',
          'Art. 6(1)(a) GDPR — brukerens samtykke (for AI-funksjoner). Samtykke kan trekkes tilbake når som helst.',
        ],
      },
      {
        h: '5. Datamottakere',
        p: 'Data kan overføres til følgende kategorier av mottakere:',
        items: [
          'Google LLC (Google Analytics) — anonymisert trafikkstatistikk, basert på ditt samtykke.',
          'Behandlere som opptrer på våre vegne (hosting, OpenRouter.ai) — basert på databehandlingsavtaler.',
          'Myndigheter med hjemmel i lovbestemmelser — kun i tilfeller fastsatt i lov.',
        ],
      },
      {
        h: '6. Dataoverføring utenfor EØS',
        p: 'Ved bruk av AI-funksjoner kan tekst behandles på OpenRouter-servere i USA. I slike tilfeller treffes passende tiltak i samsvar med GDPR-krav, herunder standardkontraktsklausuler der det er aktuelt, for å sikre et tilstrekkelig beskyttelsesnivå for dataene. I andre tilfeller overføres ikke data til tredjestater.',
      },
      {
        h: '7. Lagringstid for data',
        p: 'Data lagres i følgende perioder:',
        items: [
          'Serverlogger (IP-adresse, User-Agent): opptil 7 dager.',
          'Filer lastet opp til klientsideverktøy: lagres ikke — fjernes fra minnet ved oppdatering av siden.',
          'Filer lastet opp til serversideverktøy: slettes umiddelbart etter behandling.',
          'localStorage-data: inntil de slettes manuelt av brukeren.',
        ],
      },
      {
        h: '8. Den registrertes rettigheter',
        p: 'Du har rett til:',
        items: [
          'Innsyn i dine data (art. 15 GDPR).',
          'Retting av data (art. 16 GDPR).',
          'Sletting av data (art. 17 GDPR) — retten til å bli glemt.',
          'Begrensning av behandling (art. 18 GDPR).',
          'Dataportabilitet (art. 20 GDPR).',
          'Innsigelse mot behandling (art. 21 GDPR).',
          'Trekke tilbake samtykke når som helst uten at det berører lovligheten av behandlingen basert på samtykke før tilbakekallingen.',
          'Klage til Datatilsynets president (PUODO — Urząd Ochrony Danych Osobowych, ul. Stawki 2, 00-193 Warszawa, Polen).',
        ],
      },
      {
        h: '9. Datasikkerhet',
        p: 'Vi bruker følgende sikkerhetstiltak:',
        items: [
          'TLS/SSL-kryptering — all kommunikasjon mellom nettleser og server er kryptert.',
          'Content Security Policy (CSP) — begrenser muligheten til å kjøre upålitelige skripter.',
          'Behandling utelukkende i RAM — filer skrives ikke til serverens disk.',
          'Automatisk sletting — filer slettes umiddelbart etter at operasjonen er fullført.',
          'Filstørrelsesgrense — maksimalt 100 MB.',
          'Filtyperverifisering — vi kontrollerer filsignaturen (magic bytes) før behandling.',
          'Ingen pålogging kreves — vi krever ikke registrering eller pålogging.',
        ],
      },
      {
        h: '10. Google Analytics og samtykke til analyse',
        p: 'Dette nettstedet bruker Google Analytics (Google LLC, USA) for anonymisert trafikanalyse. Google Analytics samler inn aggregerte statistiske data som: antall besøk, tid brukt på siden, nettlesertype, omtrentlig plassering (landnivå), trafikkilde. Dataene anonymiseres (anonymize_ip: true).',
        items: [
          'Ved første besøk vises et samtykkebanner — Google Analytics aktiveres først etter klikk på «Godta».',
          'Du kan trekke tilbake samtykke når som helst ved å fjerne oppføringen «cookie-consent» fra nettleserens localStorage.',
          'Google Analytics brukes ikke til målrettet annonsering eller atferdsbasert profilering.',
          'Data i localStorage (tema, språk, samtykkeinnstillinger) er fullt kontrollert av brukeren og kan slettes når som helst.',
        ],
      },
      {
        h: '11. AI-funksjoner og OpenRouter',
        p: 'Bruk av AI-funksjoner (AI Chat, AI Summary, AI Translate) krever din egen OpenRouter API-nøkkel, som lagres utelukkende i nettleserens localStorage og ikke deles med nettstedets administrator. API-nøkkelen brukes utelukkende til kommunikasjon med OpenRouter APIen. Vi har ikke tilgang til din API-nøkkel eller innholdet i forespørsler sendt til OpenRouter.',
      },
      {
        h: '12. Sluttbestemmelser',
        p: 'Vi forbeholder oss retten til å gjøre endringer i denne personvernerklæringen. Endringer vil bli kunngjort ved å oppdatere datoen øverst på denne siden. Spørsmål om personvernerklæringen kan rettes til: kontakt@optimapdf.com.',
      },
    ],
  },
  sv: {
    title: 'Integritetspolicy',
    updated: 'Senast uppdaterad: 30 juni 2026',
    sections: [
      {
        h: '1. Allmänna bestämmelser',
        p: 'Denna integritetspolicy fastställer principerna för behandling och skydd av personuppgifter för användare av OptimaPDF-webbplatsen (optimapdf.com). OptimaPDF lägger störst vikt vid integritet och dataskydd. Alla verktyg har utformats utifrån principen om integritet genom design — som standard behandlas dina filer lokalt i din webbläsare.',
      },
      {
        h: '2. Personuppgiftsansvarig',
        p: 'Personuppgiftsansvarig för dina personuppgifter är Leszek Hofman, Dąbrówka Nowa, Polen. Kontakt: kontakt@optimapdf.com. En dataskyddsombud har inte utnämnts — för alla frågor rörande skydd av personuppgifter, kontakta oss direkt via e-postadressen ovan.',
      },
      {
        h: '3. Omfattning och syfte med datainsamling',
        sub: [
          {
            h: '3.1 Tekniska data',
            p: 'Vid användning av webbplatsen samlas följande tekniska data automatiskt in: IP-adress, webbläsartyp och version, operativsystem, bildskärmsupplösning, ungefärlig geografisk plats (landnivå), besökstid och tid som tillbringats på sidan. Dessa data anonymiseras och används enbart i statistiskt syfte och för att säkerställa skydd.',
          },
          {
            h: '3.2 Filer som laddats upp av användaren',
            p: 'PDF-filer som laddas upp till verktygen behandlas enligt följande:',
            items: [
              'Klientbaserade verktyg (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) — filen behandlas helt i webbläsaren med hjälp av WebAssembly och JavaScript. Filen lämnar aldrig din enhet.',
              'Serverbaserade verktyg (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) — filen skickas tillfälligt till servern, behandlas uteslutande i RAM och raderas omedelbart efter åtgärden. Maximal lagringstid: några få sekunder.',
              'AI-funktioner (AI Chat, AI Summary, AI Translate) — text som extraherats från PDF:en skickas till den externa OpenRouter API:en. Vi skickar inga användaridentifierande uppgifter. Innehållet lagras inte eller används för modellträning.',
            ],
          },
          {
            h: '3.3 Användarinställningar',
            p: 'Information om det valda temat (mörkt/ljust) och ditt språkval lagras i webbläsarens local storage. Den skickas inte till servern eller delas med tredjeparter.',
          },
        ],
      },
      {
        h: '4. Rättslig grund för behandling',
        items: [
          'Art. 6(1)(b) GDPR — uppfyllelse av ett avtal om elektronisk tjänsteleverans (tillhandahållande av PDF-verktyg).',
          'Art. 6(1)(f) GDPR — berättigat intresse för personuppgiftsansvarigen (att säkerställa skydd, förhindra missbruk, teknisk analys).',
          'Art. 6(1)(a) GDPR — användarens samtycke (för AI-funktioner). Samtycke kan återkallas när som helst.',
        ],
      },
      {
        h: '5. Datamottagare',
        p: 'Uppgifter kan överföras till följande kategorier av mottagare:',
        items: [
          'Google LLC (Google Analytics) — anonymiserad trafikstatistik, baserad på ditt samtycke.',
          'Biträden som agerar på våra vägnar (hosting, OpenRouter.ai) — baserat på databehandlingsavtal.',
          'Myndigheter som är behöriga enligt rättsliga bestämmelser — endast i de fall som föreskrivs i lag.',
        ],
      },
      {
        h: '6. Överföring av uppgifter utanför EES',
        p: 'Vid användning av AI-funktioner kan text behandlas på OpenRouter-servrar i USA. I sådana fall tillämpas lämpliga skyddsåtgärder i enlighet med GDPR-krav, inklusive standardavtalsklausuler där det är tillämpligt, för att säkerställa en adekvat nivå av dataskydd. I andra fall överförs inte uppgifter till tredjeländer.',
      },
      {
        h: '7. Lagringstid för data',
        p: 'Uppgifter lagras under följande tidsperioder:',
        items: [
          'Serveloggar (IP-adress, User-Agent): högst 7 dygn.',
          'Filer som laddats upp till klientbaserade verktyg: lagras inte — tas bort ur minnet vid sidladdning.',
          'Filer som laddats upp till serverbaserade verktyg: raderas omedelbart efter behandling.',
          'Local storage-uppgifter: tills de manuellt raderas av användaren.',
        ],
      },
      {
        h: '8. Den registrerades rättigheter',
        p: 'Du har rätt till:',
        items: [
          'Insyn i dina uppgifter (art. 15 GDPR).',
          'Rättelse av uppgifter (art. 16 GDPR).',
          'Radering av uppgifter (art. 17 GDPR) — rätten att bli glömd.',
          'Begränsning av behandling (art. 18 GDPR).',
          'Dataportabilitet (art. 20 GDPR).',
          'Invändning mot behandling (art. 21 GDPR).',
          'Återkalla samtycke när som helst utan att detta påverkar lagligheten i behandlingen som företogs innan samtycket återkallades.',
          'Lämna klagomål till Polska dataskyddsmyndigheten (PUODO — Urząd Ochrony Danych Osobowych, ul. Stawki 2, 00-193 Warszawa, Polen).',
        ],
      },
      {
        h: '9. Dataskydd',
        p: 'Vi tillämpar följande skyddsåtgärder:',
        items: [
          'TLS/SSL-kryptering — all kommunikation mellan webbläsare och server är krypterad.',
          'Content Security Policy (CSP) — begränsar möjligheten att köra opålitliga skript.',
          'Behandling enbart i RAM — filer skrivs inte till serverns disk.',
          'Automatisk radering — filer raderas omedelbart efter att åtgärden slutförts.',
          'Filstorleksgräns — maximalt 100 MB.',
          'Filtypsverifiering — vi kontrollerar filsignaturen (magic bytes) innan behandling.',
          'Inloggning krävs inte — vi kräver ingen registrering eller inloggning.',
        ],
      },
      {
        h: '10. Google Analytics och samtycke till analys',
        p: 'Denna webbplats använder Google Analytics (Google LLC, USA) för anonym trafikanalys. Google Analytics samlar in aggregerad statistisk data såsom: antal besök, tid tillbringad på sidan, webbläsartyp, ungefärlig plats (landnivå), trafikkälla. Data anonymiseras (anonymize_ip: true).',
        items: [
          'Vid första besöket visas ett samtyckesbanderoll — Google Analytics aktiveras först efter klick på "Acceptera".',
          'Du kan återkalla samtycket när som helst genom att ta bort posten "cookie-consent" från webbläsarens local storage.',
          'Google Analytics används inte för annonsmålgrupper eller beteendebaserad profilering.',
          'Data i local storage (tema, språk, samtyckesinställningar) är fullt kontrollerad av användaren och kan raderas när som helst.',
        ],
      },
      {
        h: '11. AI-funktioner och OpenRouter',
        p: 'Användning av AI-funktioner (AI Chat, AI Summary, AI Translate) kräver din egen OpenRouter API-nyckel, som lagras uteslutande i webbläsarens local storage och inte delas med webbplatsens administratör. API-nyckeln används enbart för kommunikation med OpenRouter API:en. Vi har inte tillgång till din API-nyckel eller innehållet i förfrågningar som skickas till OpenRouter.',
      },
      {
        h: '12. Slutbestämmelser',
        p: 'Vi förbehåller oss rätten att göra ändringar i denna integritetspolicy. Ändringar meddelas genom att uppdatera datumet högst upp på denna sida. Frågor om integritetspolicy kan ställas till: kontakt@optimapdf.com.',
      },
    ],
  },
  fr: {
    title: 'Politique de confidentialité',
    updated: 'Dernière mise à jour : 30 juin 2026',
    sections: [
      {
        h: '1. Dispositions générales',
        p: 'La présente Politique de confidentialité définit les principes de traitement et de protection des données personnelles des utilisateurs du site OptimaPDF (optimapdf.com). OptimaPDF accorde la plus grande importance à la confidentialité et à la sécurité des données. Tous les outils ont été conçus selon le principe de privacy by design — par défaut, vos fichiers sont traités localement dans votre navigateur.',
      },
      {
        h: '2. Responsable du traitement',
        p: 'Le responsable du traitement des données personnelles est Leszek Hofman, Dąbrówka Nowa, Pologne. Contact : kontakt@optimapdf.com. Aucun délégué à la protection des données n\'a été désigné — pour toute question relative à la protection des données personnelles, contactez-nous directement à l\'adresse e-mail indiquée ci-dessus.',
      },
      {
        h: '3. Portée et finalités de la collecte de données',
        sub: [
          {
            h: '3.1 Données techniques',
            p: 'Lors de l\'utilisation du site, les données techniques suivantes sont automatiquement collectées : adresse IP, type et version du navigateur, système d\'exploitation, résolution d\'écran, localisation géographique approximative (niveau pays), heure de visite et temps passé sur la page. Ces données sont anonymisées et utilisées uniquement à des fins statistiques et pour garantir la sécurité.',
          },
          {
            h: '3.2 Fichiers téléversés par l\'utilisateur',
            p: 'Les fichiers PDF téléversés vers les outils sont traités comme suit :',
            items: [
              'Outils côté client (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) — le fichier est traité entièrement dans le navigateur à l\'aide de WebAssembly et JavaScript. Le fichier ne quitte jamais votre appareil.',
              'Outils côté serveur (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) — le fichier est temporairement envoyé au serveur, traité exclusivement en mémoire RAM et immédiatement supprimé après l\'opération. Durée de conservation maximale : quelques secondes.',
              'Fonctionnalités IA (AI Chat, AI Summary, AI Translate) — le texte extrait du PDF est envoyé à l\'API externe OpenRouter. Nous n\'envoyons pas de données identifiant l\'utilisateur. Le contenu n\'est pas stocké ni utilisé pour l\'entraînement de modèles.',
            ],
          },
          {
            h: '3.3 Préférences utilisateur',
            p: 'Les informations sur le thème sélectionné (sombre/clair) et votre préférence de langue sont stockées dans le local storage du navigateur. Elles ne sont pas envoyées au serveur ni partagées avec des tiers.',
          },
        ],
      },
      {
        h: '4. Base juridique du traitement',
        items: [
          'Art. 6, par. 1, point b RGPD — exécution d\'un contrat de prestation de services électroniques (mise à disposition d\'outils PDF).',
          'Art. 6, par. 1, point f RGPD — intérêt légitime du responsable du traitement (garantie de la sécurité, prévention des abus, analyse technique).',
          'Art. 6, par. 1, point a RGPD — consentement de l\'utilisateur (pour les fonctionnalités IA). Le consentement peut être retiré à tout moment.',
        ],
      },
      {
        h: '5. Destinataires des données',
        p: 'Les données peuvent être transférées aux catégories de destinataires suivantes :',
        items: [
          'Google LLC (Google Analytics) — statistiques de trafic anonymisées, fondées sur votre consentement.',
          'Sous-traitants agissant pour notre compte (hébergement, OpenRouter.ai) — sur la base de contrats de traitement de données.',
          'Autorités habilitées par des dispositions légales — uniquement dans les cas prévus par la loi.',
        ],
      },
      {
        h: '6. Transferts de données hors de l\'EEE',
        p: 'Lors de l\'utilisation des fonctionnalités IA, le texte peut être traité par des serveurs OpenRouter situés aux États-Unis. Dans de tels cas, des garanties appropriées sont mises en œuvre conformément aux exigences du RGPD, y compris des clauses contractuelles types le cas échéant, afin de garantir un niveau adéquat de protection des données. Dans les autres cas, les données ne sont pas transférées vers des pays tiers.',
      },
      {
        h: '7. Durée de conservation des données',
        p: 'Les données sont conservées pour les durées suivantes :',
        items: [
          'Journaux serveur (adresse IP, User-Agent) : jusqu\'à 7 jours.',
          'Fichiers téléversés vers des outils côté client : non stockés — supprimés de la mémoire lors du rafraîchissement de la page.',
          'Fichiers téléversés vers des outils côté serveur : supprimés immédiatement après le traitement.',
          'Données du local storage : jusqu\'à leur suppression manuelle par l\'utilisateur.',
        ],
      },
      {
        h: '8. Droits de la personne concernée',
        p: 'Vous disposez des droits suivants :',
        items: [
          'Droit d\'accès à vos données (art. 15 RGPD).',
          'Droit de rectification des données (art. 16 RGPD).',
          'Droit à l\'effacement des données (art. 17 RGPD) — droit à l\'oubli.',
          'Droit à la limitation du traitement (art. 18 RGPD).',
          'Droit à la portabilité des données (art. 20 RGPD).',
          'Droit d\'opposition au traitement (art. 21 RGPD).',
          'Retirer votre consentement à tout moment sans affecter la licéité du traitement effectué avant le retrait du consentement.',
          'Déposer une plainte auprès du Président de l\'Autorité polonaise de protection des données (PUODO — Urząd Ochrony Danych Osobowych, ul. Stawki 2, 00-193 Varsovie, Pologne).',
        ],
      },
      {
        h: '9. Sécurité des données',
        p: 'Nous appliquons les mesures de sécurité suivantes :',
        items: [
          'Chiffrement TLS/SSL — toute la communication entre le navigateur et le serveur est chiffrée.',
          'Content Security Policy (CSP) — limite la possibilité d\'exécuter des scripts non fiables.',
          'Traitement exclusivement en RAM — les fichiers ne sont pas écrits sur le disque du serveur.',
          'Suppression automatique — les fichiers sont supprimés immédiatement après l\'exécution de l\'opération.',
          'Taille maximale du fichier — 100 Mo.',
          'Vérification du type de fichier — nous contrôlons la signature du fichier (magic bytes) avant le traitement.',
          'Aucune connexion requise — nous n\'exigeons ni inscription ni connexion.',
        ],
      },
      {
        h: '10. Google Analytics et consentement à l\'analyse',
        p: 'Ce site utilise Google Analytics (Google LLC, États-Unis) pour l\'analyse anonyme du trafic. Google Analytics collecte des données statistiques agrégées telles que : nombre de visites, temps passé sur le site, type de navigateur, localisation approximative (niveau pays), source du trafic. Les données sont anonymisées (anonymize_ip: true).',
        items: [
          'Lors de la première visite, une bannière de consentement s\'affiche — Google Analytics n\'est activé qu\'après avoir cliqué sur « Accepter ».',
          'Vous pouvez retirer votre consentement à tout moment en supprimant l\'entrée « cookie-consent » du local storage de votre navigateur.',
          'Google Analytics n\'est pas utilisé pour le ciblage publicitaire ni le profilage comportemental.',
          'Les données du local storage (thème, langue, préférences de consentement) sont entièrement contrôlées par l\'utilisateur et peuvent être supprimées à tout moment.',
        ],
      },
      {
        h: '11. Fonctionnalités IA et OpenRouter',
        p: 'L\'utilisation des fonctionnalités IA (AI Chat, AI Summary, AI Translate) nécessite votre propre clé API OpenRouter, qui est stockée exclusivement dans le local storage de votre navigateur et n\'est pas partagée avec l\'administrateur du site. La clé API est utilisée uniquement pour la communication avec l\'API OpenRouter. Nous n\'avons pas accès à votre clé API ni au contenu des requêtes envoyées à OpenRouter.',
      },
      {
        h: '12. Dispositions finales',
        p: 'Nous nous réservons le droit d\'apporter des modifications à la présente Politique de confidentialité. Les modifications seront communiquées en mettant à jour la date en haut de cette page. Toute question relative à la politique de confidentialité peut être adressée à : kontakt@optimapdf.com.',
      },
    ],
  },
  ar: {
    title: 'سياسة الخصوصية',
    updated: 'آخر تحديث: 30 يونيو 2026',
    sections: [
      {
        h: '1. أحكام عامة',
        p: 'تحدد سياسة الخصوصية هذه مبادئ معالجة وحماية البيانات الشخصية لمستخدمي موقع OptimaPDF (optimapdf.com). تضع OptimaPDF أعلى أهمية للخصوصية وأمن البيانات. صُمّمت جميع الأدوات وفقاً لمبدأ الخصوصية بالتصميم — افتراضياً، تتم معالجة ملفاتك محلياً في متصفحك.',
      },
      {
        h: '2. متحكّم بالبيانات',
        p: 'متحكّم بالبيانات الشخصية هو Leszek Hofman، Dąbrówka Nowa، بولندا. التواصل: kontakt@optimapdf.com. لم يتم تعيين مسؤول عن حماية البيانات — لجميع المسائل المتعلقة بحماية البيانات الشخصية، تواصل معنا مباشرة عبر عنوان البريد الإلكتروني أعلاه.',
      },
      {
        h: '3. نطاق وأغراض جمع البيانات',
        sub: [
          {
            h: '3.1 البيانات التقنية',
            p: 'عند استخدام الموقع، يتم جمع البيانات التقنية التالية تلقائياً: عنوان IP، نوع المتصفح وإصداره، نظام التشغيل، دقة الشاشة، الموقع الجغرافي التقريبي (مستوى البلد)، وقت الزيارة والوقت المقضي على الصفحة. يتم إخفاء هوية هذه البيانات واستخدامها حصرياً لأغراض إحصائية وضمان الأمان.',
          },
          {
            h: '3.2 الملفات المرفوعة من قبل المستخدم',
            p: 'تتم معالجة ملفات PDF المرفوعة إلى الأدوات كالتالي:',
            items: [
              'الأدوات الجانبية للعميل (merge، split، rotate، watermark، page-numbers، crop-pdf، edit-pdf، sign-pdf، redact-pdf، flatten-pdf، delete-pages، extract-pages، reorder-pages، add-page، metadata، pdf-to-svg، pdf-to-epub، pdf-to-txt، fill-form، pdf-to-images، to-pdfa، compare-pdf، unlock-pdf، protect-pdf) — تتم معالجة الملف بالكامل في المتصفح باستخدام WebAssembly و JavaScript. لا يترك الملف جهازك أبداً.',
              'الأدوات الجانبية للخادم (compress-pdf، ocr-pdf، pdf-to-word، word-to-pdf، jpg-to-pdf، pdf-to-excel، excel-to-pdf، pdf-to-powerpoint، openoffice-to-pdf، pdf-to-openoffice، pdf-to-html، html-to-pdf، url-to-pdf) — يتم إرسال الملف مؤقتاً إلى الخادم، ومعالجته حصرياً في ذاكرة RAM، وحذفه فوراً بعد العملية. أقصى مدة تخزين: ثوانٍ قليلة.',
              'وظائف الذكاء الاصطناعي (AI Chat، AI Summary، AI Translate) — يتم إرسال النص المستخرج من ملف PDF إلى واجهة برمجة OpenRouter الخارجية. لا نرسل بيانات تحدد هوية المستخدم. لا يتم تخزين المحتوى أو استخدامه لتدريب النماذج.',
            ],
          },
          {
            h: '3.3 تفضيلات المستخدم',
            p: 'يتم تخزين معلومات المظهر المختار (الداكن/الفاتح) وتفضيلاتك اللغوية في التخزين المحلي لمتصفحك. لا يتم إرسالها إلى الخادم أو مشاركتها مع أطراف ثالثة.',
          },
        ],
      },
      {
        h: '4. الأساس القانوني للمعالجة',
        items: [
          'المادة 6(1)(ب) GDPR — تنفيذ عقد لتقديم خدمات إلكترونية (توفير أدوات PDF).',
          'المادة 6(1)(ف) GDPR — المصلحة المشروعة لمتحكّم بالبيانات (ضمان الأمان، ومنع سوء الاستخدام، والتحليل الفني).',
          'المادة 6(1)(أ) GDPR — موافقة المستخدم (لوظائف الذكاء الاصطناعي). يمكن سحب الموافقة في أي وقت.',
        ],
      },
      {
        h: '5. متلقّيات البيانات',
        p: 'قد تتم نقل البيانات إلى فئات المتلقّيات التالية:',
        items: [
          'Google LLC (Google Analytics) — إحصائيات مرور مجهولة الهوية، بناءً على موافقتك.',
          'المعالجون الذين يعملون نيابةً عنّا (الاستضافة، OpenRouter.ai) — بناءً على اتفاقيات معالجة البيانات.',
          'الجهات المخولة بموجب الأحكام القانونية — فقط في الحالات المنصوص عليها قانوناً.',
        ],
      },
      {
        h: '6. نقل البيانات خارج المنطقة الاقتصادية الأوروبية',
        p: 'عند استخدام وظائف الذكاء الاصطناعي، قد تتم معالجة النص بواسطة خوادم OpenRouter الموجودة في الولايات المتحدة. في مثل هذه الحالات، يتم تطبيق ضمانات مناسبة وفقاً لمتطلبات GDPR، بما في ذلك البنود التعاقدية القياسية حيثما كان ذلك مناسباً، لضمان مستوى كافٍ من حماية البيانات. في الحالات الأخرى، لا تتم نقل البيانات إلى دول ثالثة.',
      },
      {
        h: '7. مدة الاحتفاظ بالبيانات',
        p: 'يتم الاحتفاظ بالبيانات للفترات التالية:',
        items: [
          'سجلات الخادم (عنوان IP، User-Agent): حتى 7 أيام.',
          'الملفات المرفوعة إلى الأدوات الجانبية للعميل: لا يتم تخزينها — تُزال من الذاكرة عند تحديث الصفحة.',
          'الملفات المرفوعة إلى الأدوات الجانبية للخادم: تُحذف فوراً بعد المعالجة.',
          'بيانات التخزين المحلي: حتى يتم حذفها يدوياً من قبل المستخدم.',
        ],
      },
      {
        h: '8. حقوق الشخص المعني',
        p: 'يحق لكم:',
        items: [
          'الوصول إلى بياناتكم (المادة 15 GDPR).',
          'تصحيح البيانات (المادة 16 GDPR).',
          'حذف البيانات (المادة 17 GDPR) — الحق في النسيان.',
          'تقييد المعالجة (المادة 18 GDPR).',
          'نقل البيانات (المادة 20 GDPR).',
          'الاعتراض على المعالجة (المادة 21 GDPR).',
          'سحب الموافقة في أي وقت دون المساس بقانونية المعالجة التي تمت قبل سحب الموافقة.',
          'تقديم شكوى لدى رئيس مكتب حماية البيانات الشخصية البولندي (PUODO — Urząd Ochrony Danych Osobowych)، ul. Stawki 2، 00-193 وارسو، بولندا.',
        ],
      },
      {
        h: '9. أمن البيانات',
        p: 'نطبق تدابير الأمان التالية:',
        items: [
          'تشفير TLS/SSL — تشفير جميع الاتصالات بين المتصفح والخادم.',
          'سياسة أمان المحتوى (CSP) — تقييد القدرة على تنفيذ السكريبتات غير الموثوقة.',
          'المعالجة حصرياً في RAM — لا يتم كتابة الملفات على قرص الخادم.',
          'الحذف التلقائي — تُحذف الملفات فوراً بعد اكتمال العملية.',
          'حد حجم الملف — أقصى حجم 100 ميغابايت.',
          'التحقق من نوع الملف — نتحقق من توقيع الملف (magic bytes) قبل المعالجة.',
          'لا حاجة لتسجيل الدخول — لا نطلب التسجيل أو تسجيل الدخول.',
        ],
      },
      {
        h: '10. Google Analytics والموافقة على التحليل',
        p: 'يستخدم هذا الموقع Google Analytics (Google LLC، الولايات المتحدة) لتحليل المرور بشكل مجهول. يجمع Google Analytics بيانات إحصائية مجمّعة مثل: عدد الزيارات، الوقت المقضي على الموقع، نوع المتصفح، الموقع التقريبي (مستوى البلد)، مصدر المرور. يتم إخفاء هوية البيانات (anonymize_ip: true).',
        items: [
          'عند الزيارة الأولى، يظهر بانر الموافقة — لا يتم تنشيط Google Analytics إلا بعد النقر على "قبول".',
          'يمكنكم سحب الموافقة في أي وقت عن طريق حذف إدخال "cookie-consent" من التخزين المحلي لمتصفحكم.',
          'لا يُستخدم Google Analytics لاستهداف الإعلانات أو إنشاء ملفات تعريف سلوكية.',
          'البيانات في التخزين المحلي (المظهر، اللغة، تفضيلات الموافقة) تخضع لتحكم المستخدم بالكامل ويمكن حذفها في أي وقت.',
        ],
      },
      {
        h: '11. وظائف الذكاء الاصطناعي وOpenRouter',
        p: 'يتطلب استخدام وظائف الذكاء الاصطناعي (AI Chat، AI Summary، AI Translate) مفتاح API خاص بك من OpenRouter، والذي يتم تخزينه حصرياً في التخزين المحلي لمتصفحك ولا يُشارك مع مسؤول الموقع. يُستخدم مفتاح API حصرياً للاتصال بـ OpenRouter API. ليس لدينا الوصول إلى مفتاح API الخاص بك أو محتوى الطلبات المرسلة إلى OpenRouter.',
      },
      {
        h: '12. أحكام ختامية',
        p: 'نحتفظ بالحق في إجراء تغييرات على سياسة الخصوصية هذه. سيتم الإعلان عن أي تغييرات من خلال تحديث التاريخ في أعلى هذه الصفحة. أي أسئلة بشأن سياسة الخصوصية يمكن توجيهها إلى: kontakt@optimapdf.com.',
      },
    ],
  },
  fa: {
    title: 'سیاست حفظ حریم خصوصی',
    updated: 'آخرین به‌روزرسانی: ۳۰ ژوئن ۲۰۲۶',
    sections: [
      {
        h: '۱. مقررات کلی',
        p: 'این سیاست حفظ حریم خصوصی اصول پردازش و حفاظت از داده‌های شخصی کاربران وب‌سایت OptimaPDF (optimapdf.com) را تعریف می‌کند. OptimaPDF بالاترین اهمیت را به حریم خصوصی و امنیت داده‌ها اختصاص می‌دهد. تمام ابزارها بر اساس اصل حریم خصوصی از طراحی طراحی شده‌اند — به طور پیش‌فرض، فایل‌های شما به صورت محلی در مرورگر شما پردازش می‌شوند.',
      },
      {
        h: '۲. کنترل‌کننده داده',
        p: 'کنترل‌کننده داده‌های شخصی شما Leszek Hofman، Dąbrówka Nowa، لهستان است. تماس: kontakt@optimapdf.com. هیچ مسئول حفاظت از داده‌ها منصوب نشده است — برای تمام مسائل مربوط به حفاظت از داده‌های شخصی، مستقیماً از طریق آدرس ایمیل بالا با ما تماس بگیرید.',
      },
      {
        h: '۳. دامنه و اهداف جمع‌آوری داده‌ها',
        sub: [
          {
            h: '۳.۱ داده‌های فنی',
            p: 'هنگام استفاده از وب‌سایت، داده‌های فنی زیر به طور خودکار جمع‌آوری می‌شوند: آدرس IP، نوع و نسخه مرورگر، سیستم عامل، وضوح صفحه نمایش، موقعیت جغرافیایی تقریبی (سطح کشور)، زمان بازدید و زمان صرف شده در صفحه. این داده‌ها ناشناس شده و فقط برای اهداف آماری و تضمین امنیت استفاده می‌شوند.',
          },
          {
            h: '۳.۲ فایل‌های آپلود شده توسط کاربر',
            p: 'فایل‌های PDF آپلود شده به ابزارها به شرح زیر پردازش می‌شوند:',
            items: [
              'ابزارهای سمت کلاینت (merge، split، rotate، watermark، page-numbers، crop-pdf، edit-pdf، sign-pdf، redact-pdf، flatten-pdf، delete-pages، extract-pages، reorder-pages، add-page، metadata، pdf-to-svg، pdf-to-epub، pdf-to-txt، fill-form، pdf-to-images، to-pdfa، compare-pdf، unlock-pdf، protect-pdf) — فایل به طور کامل در مرورگر با استفاده از WebAssembly و JavaScript پردازش می‌شود. فایل هرگز دستگاه شما را ترک نمی‌کند.',
              'ابزارهای سمت سرور (compress-pdf، ocr-pdf، pdf-to-word، word-to-pdf، jpg-to-pdf، pdf-to-excel، excel-to-pdf، pdf-to-powerpoint، openoffice-to-pdf، pdf-to-openoffice، pdf-to-html، html-to-pdf، url-to-pdf) — فایل به طور موقت به سرور ارسال شده، فقط در حافظه RAM پردازش شده و بلافاصله پس از عملیات حذف می‌شود. حداکثر زمان نگهداری: چند ثانیه.',
              'ویژگی‌های هوش مصنوعی (AI Chat، AI Summary، AI Translate) — متن استخراج شده از فایل PDF به API خارجی OpenRouter ارسال می‌شود. ما داده‌های شناسایی کاربر ارسال نمی‌کنیم. محتوا ذخیره یا برای آموزش مدل‌ها استفاده نمی‌شود.',
            ],
          },
          {
            h: '۳.۳ تنظیمات کاربر',
            p: 'اطلاعات درباره پوسته انتخاب شده (تاریک/روشن) و ترجیح زبانی شما در localStorage مرورگر شما ذخیره می‌شود. این اطلاعات به سرور ارسال نمی‌شوند یا با اشخاص ثالث به اشتراک گذاشته نمی‌شوند.',
          },
        ],
      },
      {
        h: '۴. مبنای قانونی پردازش',
        items: [
          'ماده ۶(۱)(ب) GDPR — اجرای قرارداد ارائه خدمات الکترونیکی (ارائه ابزارهای PDF).',
          'ماده ۶(۱)(ف) GDPR — منافع مشروع کنترل‌کننده داده (تضمین امنیت، جلوگیری از سوءاستفاده، تحلیل فنی).',
          'ماده ۶(۱)(ا) GDPR — رضایت کاربر (برای ویژگی‌های هوش مصنوعی). رضایت را می‌توان در هر زمان پس گرفت.',
        ],
      },
      {
        h: '۵. دریافت‌کنندگان داده',
        p: 'داده‌ها ممکن است به دسته‌های زیر از دریافت‌کنندگان منتقل شوند:',
        items: [
          'Google LLC (Google Analytics) — آمار ترافیک ناشناس، بر اساس رضایت شما.',
          'پردازشگرهایی که از طرف ما عمل می‌کنند (میزبانی، OpenRouter.ai) — بر اساس قراردادهای پردازش داده.',
          'مقامات صلاحیت‌دار طبق مقررات قانونی — فقط در موارد مقرر قانونی.',
        ],
      },
      {
        h: '۶. انتقال داده‌ها به خارج از منطقه اقتصادی اروپا',
        p: 'هنگام استفاده از ویژگی‌های هوش مصنوعی، ممکن است متن توسط سرورهای OpenRouter واقع در ایالات متحده پردازش شود. در چنین مواردی، ضمانت‌نامه‌های مناسب مطابق با الزامات GDPR اعمال می‌شوند، از جمله بندهای قراردادی استاندارد در صورت لزوم، برای تضمین سطح کافی حفاظت از داده‌ها. در موارد دیگر، داده‌ها به کشورهای ثالث منتقل نمی‌شوند.',
      },
      {
        h: '۷. مدت زمان نگهداری داده‌ها',
        p: 'داده‌ها برای دوره‌های زیر نگهداری می‌شوند:',
        items: [
          'گزارش‌های سرور (آدرس IP، User-Agent): حداکثر ۷ روز.',
          'فایل‌های آپلود شده به ابزارهای سمت کلاینت: ذخیره نمی‌شوند — هنگام بازخوانی صفحه از حافظه حذف می‌شوند.',
          'فایل‌های آپلود شده به ابزارهای سمت سرور: بلافاصله پس از پردازش حذف می‌شوند.',
          'داده‌های localStorage: تا زمانی که توسط کاربر به صورت دستی حذف شوند.',
        ],
      },
      {
        h: '۸. حقوق شخص مربوطه',
        p: 'شما حق دارید:',
        items: [
          'دسترسی به داده‌های خود (ماده ۱۵ GDPR).',
          'اصلاح داده‌ها (ماده ۱۶ GDPR).',
          'حذف داده‌ها (ماده ۱۷ GDPR) — حق فراموش‌شدن.',
          'محدود کردن پردازش (ماده ۱۸ GDPR).',
          'انتقال داده‌ها (ماده ۲۰ GDPR).',
          'اعتراض به پردازش (ماده ۲۱ GDPR).',
          'پس گرفتن رضایت در هر زمان بدون تاثیر بر قانونی بودن پردازش انجام شده قبل از پس گرفتن رضایت.',
          'شکایت نزد رئیس دفتر حفاظت از داده‌های شخصی لهستان (PUODO — Urząd Ochrony Danych Osobowych)، ul. Stawki 2، ۰۰-۱۹۳ ورشو، لهستان.',
        ],
      },
      {
        h: '۹. امنیت داده‌ها',
        p: 'ما اقدامات امنیتی زیر را اعمال می‌کنیم:',
        items: [
          'رمزنگاری TLS/SSL — تمام ارتباطات بین مرورگر و سرور رمزگذاری شده است.',
          'سیاست امنیت محتوا (CSP) — اجرای اسکریپت‌های غیرقابل اعتماد را محدود می‌کند.',
          'پردازش فقط در RAM — فایل‌ها روی دیسک سرور نوشته نمی‌شوند.',
          'حذف خودکار — فایل‌ها بلافاصله پس از اتمام عملیات حذف می‌شوند.',
          'حداکثر اندازه فایل — حداکثر ۱۰۰ مگابایت.',
          'تایید نوع فایل — قبل از پردازش، امضای فایل (magic bytes) را بررسی می‌کنیم.',
          'نیازی به ورود نیست — ما ثبت نام یا ورود را درخواست نمی‌کنیم.',
        ],
      },
      {
        h: '۱۰. Google Analytics و رضایت برای تحلیل',
        p: 'این وب‌سایت از Google Analytics (Google LLC، ایالات متحده) برای تحلیل ناشناس ترافیک استفاده می‌کند. Google Analytics داده‌های آماری تجمعی مانند تعداد بازدیدها، زمان صرف شده در سایت، نوع مرورگر، موقعیت تقریبی (سطح کشور)، منبع ترافیک جمع‌آوری می‌کند. داده‌ها ناشناس می‌شوند (anonymize_ip: true).',
        items: [
          'هنگام اولین بازدید، یک بنر رضایت نمایش داده می‌شود — Google Analytics فقط پس از کلیک بر روی "پذیرش" فعال می‌شود.',
          'شما می‌توانید در هر زمان با حذف رکورد "cookie-consent" از localStorage مرورگر خود، رضایت خود را پس بگیرید.',
          'Google Analytics برای هدف‌گیری تبلیغات یا ایجاد پروفایل‌های رفتاری استفاده نمی‌شود.',
          'داده‌ها در localStorage (پوسته، زبان، ترجیحات رضایت) کاملاً توسط کاربر کنترل می‌شوند و می‌توانند در هر زمان حذف شوند.',
        ],
      },
      {
        h: '۱۱. ویژگی‌های هوش مصنوعی و OpenRouter',
        p: 'استفاده از ویژگی‌های هوش مصنوعی (AI Chat، AI Summary، AI Translate) نیاز به کلید API شخصی شما از OpenRouter دارد، که فقط در localStorage مرورگر شما ذخیره شده و با مدیر وب‌سایت به اشتراک گذاشته نمی‌شود. کلید API فقط برای ارتباط با OpenRouter API استفاده می‌شود. ما به کلید API شما یا محتوای درخواست‌های ارسال شده به OpenRouter دسترسی نداریم.',
      },
      {
        h: '۱۲. مقررات پایانی',
        p: 'ما حق ایجاد تغییرات در این سیاست حفظ حریم خصوصی را برای خود محفوظ می‌داریم. هرگونه تغییر از طریق به‌روزرسانی تاریخ در بالای این صفحه اعلام خواهد شد. هرگونه سؤال درباره سیاست حفظ حریم خصوصی را می‌توان به آدرس زیر ارسال کرد: kontakt@optimapdf.com.',
      },
    ],
  },
  hi: {
    title: 'गोपनीयता नीति',
    updated: 'अंतिम अपडेट: 30 जून 2026',
    sections: [
      {
        h: '1. सामान्य प्रावधान',
        p: 'यह गोपनीयता नीति OptimaPDF वेबसाइट (optimapdf.com) के उपयोगकर्ताओं के व्यक्तिगत डेटा के संचालन और सुरक्षा के सिद्धांतों को परिभाषित करती है। OptimaPDF गोपनीयता और डेटा सुरक्षा को सर्वोच्च महत्व देता है। सभी उपकरण डिज़ाइन द्वारा गोपनीयता के सिद्धांत का पालन करते हुए डिज़ाइन किए गए हैं — डिफ़ॉल्ट रूप से, आपकी फ़ाइलें आपके ब्राउज़र में स्थानीय रूप से संचालित की जाती हैं।',
      },
      {
        h: '2. डेटा नियंत्रक',
        p: 'व्यक्तिगत डेटा का डेटा नियंत्रक Leszek Hofman, Dąbrówka Nowa, पोलैंड हैं। संपर्क: kontakt@optimapdf.com। नियंत्रक ने कोई डेटा सुरक्षा अधिकारी नियुक्त नहीं किया है — व्यक्तिगत डेटा सुरक्षा से संबंधित सभी मामलों के लिए, ऊपर दिए गए ईमेल पते के माध्यम से हमसे सीधे संपर्क करें।',
      },
      {
        h: '3. डेटा संग्रह का दायरा और उद्देश्य',
        sub: [
          {
            h: '3.1 तकनीकी डेटा',
            p: 'वेबसाइट का उपयोग करते समय, निम्नलिखित तकनीकी डेटा स्वचालित रूप से एकत्र किया जाता है: IP पता, ब्राउज़र का प्रकार और संस्करण, ऑपरेटिंग सिस्टम, स्क्रीन रिज़ॉल्यूशन, अनुमानित भौगोलिक स्थान (देश स्तर), विज़िट का समय और साइट पर बिताया गया समय। यह डेटा गुमनाम किया जाता है और केवल सांख्यिकीय उद्देश्यों और सुरक्षा सुनिश्चित करने के लिए उपयोग किया जाता है।',
          },
          {
            h: '3.2 उपयोगकर्ता द्वारा अपलोड की गई फ़ाइलें',
            p: 'उपकरणों में अपलोड की गई PDF फ़ाइलों को निम्न प्रकार से संचालित किया जाता है:',
            items: [
              'क्लाइंट-साइड उपकरण (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) — फ़ाइल का संचालन WebAssembly और JavaScript का उपयोग करके पूरी तरह से ब्राउज़र में किया जाता है। फ़ाइल आपका डिवाइस कभी नहीं छोड़ती।',
              'सर्वर-साइड उपकरण (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) — फ़ाइल अस्थायी रूप से सर्वर को भेजी जाती है, केवल RAM में संचालित की जाती है, और ऑपरेशन के तुरंत बाद हटा दी जाती है। अधिकतम प्रतिधारण समय: कुछ सेकंड।',
              'AI फ़ंक्शन (AI Chat, AI Summary, AI Translate) — PDF से निकाला गया पाठ बाहरी OpenRouter API को भेजा जाता है। हम उपयोगकर्ता-पहचान वाला डेटा नहीं भेजते। सामग्री संग्रहीत या मॉडल प्रशिक्षण के लिए उपयोग नहीं की जाती।',
            ],
          },
          {
            h: '3.3 उपयोगकर्ता प्राथमिकताएँ',
            p: 'चयनित थीम (डार्क/लाइट) और आपकी भाषा प्राथमिकता के बारे में जानकारी आपके ब्राउज़र के localStorage में संग्रहीत की जाती है। इसे सर्वर को नहीं भेजा जाता और न ही तृतीय पक्षों के साथ साझा किया जाता है।',
          },
        ],
      },
      {
        h: '4. संचालन का कानूनी आधार',
        items: [
          'अनुच्छेद 6(1)(ख) GDPR — इलेक्ट्रॉनिक सेवा अनुबंध का निष्पादन (PDF उपकरण प्रदान करना)।',
          'अनुच्छेद 6(1)(फ) GDPR — नियंत्रक का वैध हित (सुरक्षा सुनिश्चित करना, दुरुपयोग को रोकना, तकनीकी विश्लेषण)।',
          'अनुच्छेद 6(1)(क) GDPR — उपयोगकर्ता की सहमति (AI फ़ंक्शन के लिए)। सहमति किसी भी समय वापस ली जा सकती है।',
        ],
      },
      {
        h: '5. डेटा प्राप्तकर्ता',
        p: 'डेटा निम्नलिखित श्रेणियों के प्राप्तकर्ताओं को हस्तांतरित किया जा सकता है:',
        items: [
          'Google LLC (Google Analytics) — आपकी सहमति पर आधारित गुमनाम ट्रैफ़िक आंकड़े।',
          'हमारी ओर से कार्य करने वाले प्रोसेसर (होस्टिंग, OpenRouter.ai) — डेटा प्रसंस्करण समझौतों के आधार पर।',
          'कानूनी प्रावधानों के तहत अधिकृत अधिकारी — केवल कानून में निर्धारित मामलों में।',
        ],
      },
      {
        h: '6. EEA के बाहर डेटा हस्तांतरण',
        p: 'AI सुविधाओं का उपयोग करते समय, पाठ का संचालन अमेरिका में OpenRouter सर्वर पर किया जा सकता है। ऐसे मामलों में, GDPR आवश्यकताओं के अनुसार उपयुक्त सुरक्षा उपाय लागू किए जाते हैं, जिसमें आवश्यकता पड़ने पर मानक संविदा खंड शामिल हैं, ताकि डेटा के पर्याप्त सुरक्षा स्तर को सुनिश्चित किया जा सके। अन्य मामलों में, डेटा का तृतीय देशों में हस्तांतरण नहीं किया जाता।',
      },
      {
        h: '7. डेटा प्रतिधारण अवधि',
        p: 'डेटा निम्नलिखित अवधि के लिए संग्रहीत किया जाता है:',
        items: [
          'सर्वर लॉग (IP पता, User-Agent): 7 दिनों तक।',
          'क्लाइंट-साइड उपकरणों में अपलोड की गई फ़ाइलें: संग्रहीत नहीं की जातीं — पेज रिफ्रेश पर मेमोरी से हटा दी जाती हैं।',
          'सर्वर-साइड उपकरणों में अपलोड की गई फ़ाइलें: प्रसंस्करण के तुरंत बाद हटा दी जाती हैं।',
          'localStorage डेटा: जब तक उपयोगकर्ता द्वारा मैन्युअल रूप से हटाया नहीं जाता।',
        ],
      },
      {
        h: '8. उपयोगकर्ता के अधिकार',
        p: 'आपके पास निम्नलिखित अधिकार हैं:',
        items: [
          'अपने डेटा तक पहुँचने का अधिकार (अनुच्छेद 15 GDPR)।',
          'डेटा में सुधार का अधिकार (अनुच्छेद 16 GDPR)।',
          'डेटा के विलोपन का अधिकार (अनुच्छेद 17 GDPR) — भुला दिए जाने का अधिकार।',
          'संचालन के प्रतिबंध का अधिकार (अनुच्छेद 18 GDPR)।',
          'डेटा वहनीयता का अधिकार (अनुच्छेद 20 GDPR)।',
          'संचालन पर आपत्ति का अधिकार (अनुच्छेद 21 GDPR)।',
          'किसी भी समय सहमति वापस लेने का अधिकार, बिना वापसी से पहले सहमति पर आधारित संचालन की वैधता को प्रभावित किए।',
          'व्यक्तिगत डेटा सुरक्षा कार्यालय (PUODO — Urząd Ochrony Danych Osobowych) के अध्यक्ष के पास शिकायत दर्ज करने का अधिकार, ul. Stawki 2, 00-193 वारसा, पोलैंड।',
        ],
      },
      {
        h: '9. डेटा सुरक्षा',
        p: 'हम निम्नलिखित सुरक्षा उपाय लागू करते हैं:',
        items: [
          'TLS/SSL एन्क्रिप्शन — ब्राउज़र और सर्वर के बीच सभी संचार एन्क्रिप्ट किया जाता है।',
          'Content Security Policy (CSP) — अविश्वसनीय स्क्रिप्ट चलाने की क्षमता को सीमित करता है।',
          'केवल RAM में प्रसंस्करण — फ़ाइलें सर्वर की डिस्क पर नहीं लिखी जातीं।',
          'स्वचालित विलोपन — ऑपरेशन पूरा होने के तुरंत बाद फ़ाइलें हटा दी जाती हैं।',
          'फ़ाइल आकार सीमा — अधिकतम 100 MB।',
          'फ़ाइल प्रकार सत्यापन — प्रसंस्करण से पहले हम फ़ाइल हस्ताक्षर (magic bytes) जाँचते हैं।',
          'लॉगिन की आवश्यकता नहीं — हम पंजीकरण या लॉगिन की आवश्यकता नहीं रखते।',
        ],
      },
      {
        h: '10. Google Analytics और विश्लेषण के लिए सहमति',
        p: 'यह वेबसाइट गुमनाम ट्रैफ़िक विश्लेषण के लिए Google Analytics (Google LLC, USA) का उपयोग करती है। Google Analytics एकत्रित सांख्यिकीय डेटा एकत्र करता है जैसे: विज़िट की संख्या, साइट पर बिताया गया समय, ब्राउज़र का प्रकार, अनुमानित स्थान (देश स्तर), ट्रैफ़िक स्रोत। डेटा गुमनाम किया जाता है (anonymize_ip: true)।',
        items: [
          'पहली विज़िट पर, एक सहमति बैनर दिखाया जाता है — Google Analytics केवल "Accept" पर क्लिक करने के बाद सक्रिय होता है।',
          'आप किसी भी समय अपने ब्राउज़र के localStorage से "cookie-consent" प्रविष्टि हटाकर सहमति वापस ले सकते हैं।',
          'Google Analytics का उपयोग विज्ञापन लक्ष्यीकरण या व्यवहारिक प्रोफाइलिंग के लिए नहीं किया जाता।',
          'localStorage में डेटा (थीम, भाषा, सहमति प्राथमिकताएँ) पूरी तरह से उपयोगकर्ता द्वारा नियंत्रित होता है और किसी भी समय हटाया जा सकता है।',
        ],
      },
      {
        h: '11. AI फ़ंक्शन और OpenRouter',
        p: 'AI फ़ंक्शन (AI Chat, AI Summary, AI Translate) का उपयोग करने के लिए आपकी अपनी OpenRouter API कुंजी आवश्यक है, जो केवल आपके ब्राउज़र के localStorage में संग्रहीत होती है और वेबसाइट प्रशासक के साथ साझा नहीं की जाती। API कुंजी का उपयोग केवल OpenRouter API के साथ संचार के लिए किया जाता है। हमें आपकी API कुंजी या OpenRouter को भेजे गए प्रश्नों की सामग्री तक पहुँच नहीं है।',
      },
      {
        h: '12. अंतिम प्रावधान',
        p: 'हम इस गोपनीयता नीति में परिवर्तन करने का अधिकार सुरक्षित रखते हैं। परिवर्तनों की सूचना इस पृष्ठ के शीर्ष पर तिथि अपडेट करके दी जाएगी। गोपनीयता नीति से संबंधित कोई भी प्रश्न kontakt@optimapdf.com पर भेजा जा सकता है।',
      },
    ],
  },
  is: {
    title: 'Persónuverndarstefna',
    updated: 'Síðast uppfært: 30. júní 2026',
    sections: [
      {
        h: '1. Almenn ákvæði',
        p: 'Þessi persónuverndarstefna skilgreinir meðferðarreglur og vernd persónuupplýsinga notenda OptimaPDF vefsins (optimapdf.com). OptimaPDF leggur mestu áherslu á persónuvernd og gagnöryggi. Öll tæki eru hönnuð samkvæmt persónuverndarhönnunarreglunni — sjálfgefið eru skrár þínar meðhöndlaðar staðbundið í vafraranum þínum.',
      },
      {
        h: '2. Ábyrgðaraðili',
        p: 'Ábyrgðaraðili fyrir persónuupplýsingar þínar er Leszek Hofman, Dąbrówka Nowa, Pólland. Tengiliður: kontakt@optimapdf.com. Ábyrgðaraðili hefur ekki skipað persónuverndarfulltrúa — í öllum málum er lúta að vernd persónuupplýsinga skaltu hafa samband beint í gegnum netfangið hér að ofan.',
      },
      {
        h: '3. Umfang og tilgangur gagnasöfnunar',
        sub: [
          {
            h: '3.1 Tæknileg gögn',
            p: 'Þegar notuð er vefsíðan eru eftirfarandi tæknileg gögn safnað sjálfkrafa: IP-tala, tegund og útgáfa vafrara, stýrikerfi, upplausn skjás, áætluð landfræðileg staðsetning (landsstig), heimsóknartími og tími sem varið er á síðunni. Þessi gögn eru nafnlaus og eingöngu notuð í tölfræðilegum tilgangi og til að tryggja öryggi.',
          },
          {
            h: '3.2 Skrár hlaðnar upp af notanda',
            p: 'PDF-skrár sem hlaðið er upp í tækin eru meðhöndlaðar á eftirfarandi hátt:',
            items: [
              'Biðlaraþættir (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) — skráin er fullkomlega meðhöndluð í vafraranum með WebAssembly og JavaScript. Skráin yfirgæfir aldrei tækið þitt.',
              'Þjónustuþættir (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) — skráin er tímabundið send til þjónsins, meðhöndluð eingöngu í RAM-minni og strax eytt eftir aðgerðina. Hámarks geymslutími: nokkrar sekúndur.',
              'AI aðgerðir (AI Chat, AI Summary, AI Translate) — texti dreginn úr PDF er sendur til ytri OpenRouter API. Við sendum ekki gögn sem auðkenna notanda. Efnið er ekki geymt né notað til þjálfunar líkana.',
            ],
          },
          {
            h: '3.3 Óskir notanda',
            p: 'Upplýsingar um valið þema (dökkt/ljóst) og tungumálaósk þín er geymt í localStorage vafrarans. Þær eru ekki sendar til þjónsins né deilt með þriðja aðila.',
          },
        ],
      },
      {
        h: '4. Lagagrundvöllur meðferðar',
        items: [
          'Grein 6(1)(b) GDPR — frammistöðu samnings um rafræna þjónustu (veitu PDF-tækja).',
          'Grein 6(1)(f) GDPR — lögmætum hagsmunum ábyrgðaraðila (tryggja öryggi, koma í veg fyrir misnotkun, tæknilega greiningu).',
          'Grein 6(1)(a) GDPR — samþykki notanda (fyrir AI aðgerðir). Hægt er að afturkalla samþykki hvenær sem er.',
        ],
      },
      {
        h: '5. Viðtakendur gagna',
        p: 'Gögnum má flytja til eftirfarandi flokka viðtakenda:',
        items: [
          'Google LLC (Google Analytics) — nafnlaus umferðarstölfræði, byggð á samþykki þínu.',
          'Vinnsluaðilar á vegum okkar (hýsing, OpenRouter.ai) — á grundvelli samninga um gagnameðferð.',
          'Yfirvöld skv. lagaákvæðum — eingöngu í tilvikum sem lög kveða á um.',
        ],
      },
      {
        h: '6. Flutningur gagna utan EES',
        p: 'Við notkun AI aðgerða má meðhöndla texta á OpenRouter þjónum í Bandaríkjunum. Slíkum tilfellum eru viðeigandi tryggingar veittar í samræmi við kröfur GDPR, þar á meðal staðal samningsskilmála þar sem við á, til að tryggja fullnægjandi stig gagnaverndar. Í öðrum tilfellum eru gögn ekki flutt til þriðja landa.',
      },
      {
        h: '7. Geymslutími gagna',
        p: 'Gögn eru geymd í eftirfarandi tímabil:',
        items: [
          'Þjónslogs (IP-tala, User-Agent): allt að 7 daga.',
          'Skrár hlaðnar upp í biðlaraþætti — ekki geymdar — fjarlægðar úr minni við endurhleðslu síðu.',
          'Skrár hlaðnar upp í þjónustuþætti — eytt strax eftir meðferð.',
          'localStorage gögn — þar til notandi eyðir þeim handvirkt.',
        ],
      },
      {
        h: '8. Réttindi skráðs einstaklings',
        p: 'Þú átt rétt á eftirfarandi:',
        items: [
          'Aðgang að gögnum þínum (grein 15 GDPR).',
          'Leiðréttingu gagna (grein 16 GDPR).',
          'Eyðingu gagna (grein 17 GDPR) — réttur til að gleymast.',
          'Takmörkun meðferðar (grein 18 GDPR).',
          'Gagnaflutning (grein 20 GDPR).',
          'Andmæli gegn meðferð (grein 21 GDPR).',
          'Að afturkalla samþykki hvenær sem er án þess að hafa áhrif á lögmæti meðferðar sem byggð er á samþykki fyrir afturköllunina.',
          'Leggja fram kvörtun hjá forseta Persónuverndar (PUODO — Urząd Ochrony Danych Osobowych), ul. Stawki 2, 00-193 Varsjá, Pólland.',
        ],
      },
      {
        h: '9. Gagnöryggi',
        p: 'Við beitum eftirfarandi öryggisráðstöfunum:',
        items: [
          'TLS/SSL dulkóðun — öll samskipti á milli vafrara og þjóns eru dulkóðuð.',
          'Efnisöryggisstefna (CSP) — takmarkar getu til að keyra ótraustar skriptur.',
          'Meðferð eingöngu í RAM-minni — skrár eru ekki skrifaðar á disk þjónsins.',
          'Sjálfvirk eyðing — skrár eru eytt strax eftir aðgerðina.',
          'Skráarstærðarmörk — hámark 100 MB.',
          'Skráargerðaryfirferð — við athugum undirskrift skráar (magic bytes) áður en meðferð hefst.',
          'Engin innskráning nauðsynleg — við krefjum ekki skráningar eða innskráningar.',
        ],
      },
      {
        h: '10. Google Analytics og samþykki greiningar',
        p: 'Þessi vefsíða notar Google Analytics (Google LLC, Bandaríkin) til nafnlausrar umferðargreiningar. Google Analytics safnar saman tölfræðigögnum eins og: heimsóknafjöldi, tími á síðunni, tegund vafrara, áætluð staðsetning (landsstig), umferðaruppspretta. Gögn eru nafnlaus (anonymize_ip: true).',
        items: [
          'Við fyrstu heimsókn birtist samþykkisbori — Google Analytics er aðeins virkjað eftir að smellt er á „Samþykkja".',
          'Þú getur afturkallað samþykki hvenær sem er með því að fjarlægja „cookie-consent" færsluna úr localStorage vafrarans þíns.',
          'Google Analytics er ekki notað til markaðssetningar eða hegðunarprófíleringar.',
          'Gögn í localStorage (þemu, tungumál, samþykkisóskir) eru fullkomlega undir stjórn notanda og má eyða hvenær sem er.',
        ],
      },
      {
        h: '11. AI aðgerðir og OpenRouter',
        p: 'Til að nota AI aðgerðir (AI Chat, AI Summary, AI Translate) þarft þú þinn eigin OpenRouter API-lykil, sem er eingöngu geymdur í localStorage vafrarans þíns og ekki deilt með vefstjóra. API-lykilinn er eingöngu notaður til samskipta við OpenRouter API. Við höfum ekki aðgang að API-lyklinum þínum né efni fyrirspurna sem sendar eru til OpenRouter.',
      },
      {
        h: '12. Lokákvæði',
        p: 'Við áskiljum okkur rétt til að gera breytingar á þessari persónuverndarstefnu. Breytingar verða tilkynntar með uppfærslu dagsetningar efst á þessari síðu. Allar spurningar varðandi persónuverndarstefnuna skal senda á: kontakt@optimapdf.com.',
      },
    ],
  },
  it: {
    title: 'Informativa sulla Privacy',
    updated: 'Ultimo aggiornamento: 30 giugno 2026',
    sections: [
      {
        h: '1. Disposizioni generali',
        p: 'La presente Informativa sulla Privacy definisce i principi di trattamento e protezione dei dati personali degli utenti del sito web OptimaPDF (optimapdf.com). OptimaPDF attribuisce la massima importanza alla privacy e alla sicurezza dei dati. Tutti gli strumenti sono stati progettati seguendo il principio di privacy by design — per impostazione predefinita, i vostri file vengono elaborati localmente nel vostro browser.',
      },
      {
        h: '2. Titolare del trattamento',
        p: 'Il titolare del trattamento dei vostri dati personali è Leszek Hofman, Dąbrówka Nowa, Polonia. Contatto: kontakt@optimapdf.com. Il titolare non ha designato un Responsabile della Protezione dei Dati — per ogni questione relativa alla protezione dei dati personali, contattateci direttamente all\'indirizzo email sopra indicato.',
      },
      {
        h: '3. Ambito e finalità della raccolta di dati',
        sub: [
          {
            h: '3.1 Dati tecnici',
            p: 'Durante l\'utilizzo del sito web, i seguenti dati tecnici vengono raccolti automaticamente: indirizzo IP, tipo e versione del browser, sistema operativo, risoluzione dello schermo, posizione geografica approssimativa (livello paese), ora della visita e tempo trascorso sul sito. Questi dati sono anonimizzati e utilizzati esclusivamente per finalità statistiche e per garantire la sicurezza.',
          },
          {
            h: '3.2 File caricati dall\'utente',
            p: 'I file PDF caricati sugli strumenti vengono elaborati come segue:',
            items: [
              'Strumenti lato client (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) — il file viene elaborato interamente nel browser utilizzando WebAssembly e JavaScript. Il file non lascia mai il vostro dispositivo.',
              'Strumenti lato server (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) — il file viene inviato temporaneamente al server, elaborato esclusivamente nella RAM e cancellato immediatamente dopo l\'operazione. Tempi di conservazione massimi: pochi secondi.',
              'Funzionalità AI (AI Chat, AI Summary, AI Translate) — il testo estratto dal PDF viene inviato all\'API esterna di OpenRouter. Non inviamo dati identificativi dell\'utente. I contenuti non vengono conservati né utilizzati per l\'addestramento dei modelli.',
            ],
          },
          {
            h: '3.3 Preferenze dell\'utente',
            p: 'Le informazioni sul tema selezionato (scuro/chiaro) e sulla vostra preferenza linguistica vengono memorizzate nel localStorage del browser. Non vengono inviate al server né condivise con terzi.',
          },
        ],
      },
      {
        h: '4. Base giuridica del trattamento',
        items: [
          'Art. 6, par. 1, lett. b RGPD — esecuzione del contratto di servizio elettronico (fornitura degli strumenti PDF).',
          'Art. 6, par. 1, lett. f RGPD — interesse legittimo del titolare del trattamento (garantire la sicurezza, prevenire abusi, analisi tecnica).',
          'Art. 6, par. 1, lett. a RGPD — consenso dell\'interessato (per le funzionalità AI). Il consenso può essere revocato in qualsiasi momento.',
        ],
      },
      {
        h: '5. Destinatari dei dati',
        p: 'I dati possono essere trasferiti alle seguenti categorie di destinatari:',
        items: [
          'Google LLC (Google Analytics) — statistiche del traffico anonimizzate, basate sul vostro consenso.',
          'Responsabili del trattamento che agiscono per nostro conto (hosting, OpenRouter.ai) — sulla base di accordi di trattamento dei dati.',
          'Autorità competenti in base alle normative vigenti — solo nei casi previsti dalla legge.',
        ],
      },
      {
        h: '6. Trasferimenti di dati al di fuori dello SEE',
        p: 'In caso di utilizzo delle funzionalità AI, il testo può essere elaborato sui server di OpenRouter negli Stati Uniti. In tali casi vengono applicate garanzie adeguate conformi ai requisiti del RGPD, incluse le clausole contrattuali standard ove applicabile, al fine di garantire un livello adeguato di protezione dei dati. Negli altri casi, i dati non vengono trasferiti a paesi terzi.',
      },
      {
        h: '7. Periodo di conservazione dei dati',
        p: 'I dati vengono conservati per i seguenti periodi:',
        items: [
          'Log del server (indirizzo IP, User-Agent): fino a 7 giorni.',
          'File caricati negli strumenti lato client: non conservati — rimossi dalla memoria al caricamento della pagina.',
          'File caricati negli strumenti lato server: cancellati immediatamente dopo l\'elaborazione.',
          'Dati nel localStorage: fino a quando l\'utente non li cancella manualmente.',
        ],
      },
      {
        h: '8. Diritti dell\'interessato',
        p: 'Avete diritto a:',
        items: [
          'Accesso ai vostri dati (art. 15 RGPD).',
          'Rettifica dei dati (art. 16 RGPD).',
          'Cancellazione dei dati (art. 17 RGPD) — diritto all\'oblio.',
          'Limitazione del trattamento (art. 18 RGPD).',
          'Portabilità dei dati (art. 20 RGPD).',
          'Opposizione al trattamento (art. 21 RGPD).',
          'Revocare il consenso in qualsiasi momento senza pregiudicare la liceità del trattamento basata sul consenso prestato prima della revoca.',
          'Proporre reclamo al Presidente dell\'Ufficio per la Protezione dei Dati Personali (PUODO — Urząd Ochrony Danych Osobowych), ul. Stawki 2, 00-193 Varsavia, Polonia.',
        ],
      },
      {
        h: '9. Sicurezza dei dati',
        p: 'Applichiamo le seguenti misure di sicurezza:',
        items: [
          'Crittografia TLS/SSL — tutta la comunicazione tra browser e server è crittografata.',
          'Content Security Policy (CSP) — limita l\'esecuzione di script non affidabili.',
          'Elaborazione esclusivamente in RAM — i file non vengono scritti sul disco del server.',
          'Cancellazione automatica — i file vengono cancellati immediatamente dopo il completamento dell\'operazione.',
          'Limite di dimensione dei file — massimo 100 MB.',
          'Verifica del tipo di file — controlliamo la firma del file (magic bytes) prima dell\'elaborazione.',
          'Nessuna registrazione richiesta — non richiediamo registrazione né accesso.',
        ],
      },
      {
        h: '10. Google Analytics e consenso all\'analisi',
        p: 'Questo sito web utilizza Google Analytics (Google LLC, USA) per l\'analisi anonima del traffico. Google Analytics raccoglie dati statistici aggregati quali: numero di visite, tempo trascorso sul sito, tipo di browser, posizione approssimativa (livello paese), fonte del traffico. I dati sono anonimizzati (anonymize_ip: true).',
        items: [
          'Alla prima visita viene visualizzato un banner di consenso — Google Analytics viene attivato solo dopo aver cliccato "Accetta".',
          'Potete revocare il consenso in qualsiasi momento rimuovendo la voce "cookie-consent" dal localStorage del vostro browser.',
          'Google Analytics non viene utilizzato per il targeting pubblicitario o la profilazione comportamentale.',
          'I dati nel localStorage (tema, lingua, preferenze di consenso) sono completamente sotto il controllo dell\'utente e possono essere cancellati in qualsiasi momento.',
        ],
      },
      {
        h: '11. Funzionalità AI e OpenRouter',
        p: 'Per utilizzare le funzionalità AI (AI Chat, AI Summary, AI Translate) è necessaria una chiave API OpenRouter personale, memorizzata esclusivamente nel localStorage del vostro browser e non condivisa con l\'amministratore del sito web. La chiave API viene utilizzata esclusivamente per la comunicazione con l\'API di OpenRouter. Non abbiamo accesso alla vostra chiave API né al contenuto delle query inviate a OpenRouter.',
      },
      {
        h: '12. Disposizioni finali',
        p: 'Ci riserviamo il diritto di apportare modifiche alla presente Informativa sulla Privacy. Le modifiche saranno comunicate aggiornando la data in cima a questa pagina. Qualsiasi domanda relativa all\'informativa sulla privacy può essere inviata a: kontakt@optimapdf.com.',
      },
    ],
  },
};

export default function PrivacyPage({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const { locale: detectedLocale } = useLocale();
  const locale = forcedLocale || detectedLocale;
  const lang = (content as Record<string, typeof content.pl>)[locale] || content.en;

  const isRtl = locale === 'ar' || locale === 'fa';

  return (
    <main className="max-w-3xl mx-auto px-4 py-12" dir={isRtl ? 'rtl' : 'ltr'}>
      {isRtl && (
        <style>{`
          .privacy-rtl ul { padding-right: 1.25rem; padding-left: 0; }
          .privacy-rtl ol { padding-right: 1.25rem; padding-left: 0; }
          .privacy-rtl { text-align: right; }
        `}</style>
      )}
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{lang.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">{lang.updated}</p>
      </div>

      <div className={`tool-card rounded-2xl border p-8 space-y-8 text-sm leading-relaxed ${isRtl ? 'privacy-rtl' : ''}`} style={{ color: 'var(--coffee-text-secondary)' }}>
        {lang.sections.map((sec, i) => (
          <section key={i}>
            <h2 className="text-lg sm:text-xl font-bold tool-heading mb-3">{sec.h}</h2>
            {'p' in sec && <p className="mb-2">{sec.p}</p>}
            {'items' in sec && sec.items && (
              <ul className={`list-disc space-y-1.5 ${isRtl ? 'pr-5' : 'pl-5'}`}>
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
                      <ul className={`list-disc space-y-1.5 ${isRtl ? 'pr-5' : 'pl-5'}`}>
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
