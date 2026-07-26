'use client';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';

const content = {
  pl: {
    title: 'Bezpieczeństwo',
    updated: 'Ostatnia aktualizacja: 25 czerwca 2026',
    intro: 'OptimaPDF przykłada najwyższą wagę do bezpieczeństwa danych. Poniżej przedstawiamy szczegółowy opis stosowanych środków bezpieczeństwa, które chronią Twoje pliki i dane podczas korzystania z naszych narzędzi.',
    sections: [
      {
        h: '1. Przetwarzanie lokalne w przeglądarce',
        p: 'Większość narzędzi OptimaPDF działa w architekturze zero-trust — Twój plik nie opuszcza Twojego urządzenia. Wykorzystujemy technologie WebAssembly i JavaScript do przetwarzania plików PDF bezpośrednio w przeglądarce. Oznacza to, że nawet my, jako operatorzy serwisu, nie mamy dostępu do Twoich plików. Dotyczy to następujących narzędzi: łączenie, dzielenie, obracanie, znak wodny, numerowanie, przycinanie, edycja, podpis, redakcja, spłaszczanie, usuwanie stron, wyodrębnianie, zmiana kolejności, dodawanie strony, metadane, PDF→SVG, PDF→EPUB, PDF→TXT, wypełnianie formularzy, PDF→obrazy, PDF/A, porównywanie PDF, odblokowywanie i zabezpieczanie hasłem.',
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
        p: 'Jeśli odkryjesz lukę bezpieczeństwa w OptimaPDF, prosimy o odpowiedzialne zgłoszenie: wyślij wiadomość na adres kontakt@optimapdf.com. Zobowiązujemy się do:',
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
  de: {
    title: 'Sicherheit',
    updated: 'Zuletzt aktualisiert: 25. Juni 2026',
    intro: 'OptimaPDF legt größten Wert auf Datensicherheit. Nachfolgend finden Sie eine detaillierte Beschreibung der Sicherheitsmaßnahmen, die wir einsetzen, um Ihre Dateien und Daten beim Nutzung unserer Werkzeuge zu schützen.',
    sections: [
      {
        h: '1. Client-seitige Verarbeitung im Browser',
        p: 'Die meisten OptimaPDF-Werkzeuge arbeiten mit einer Zero-Trust-Architektur — Ihre Datei verlässt niemals Ihr Gerät. Wir verwenden WebAssembly und JavaScript, um PDF-Dateien direkt in Ihrem Browser zu verarbeiten. Das bedeutet, dass sogar wir als Betreiber des Dienstes keinen Zugriff auf Ihre Dateien haben. Dies betrifft: Zusammenfügen, Teilen, Drehen, Wasserzeichen, Seitennummerierung, Zuschneiden, Bearbeiten, Signieren, Schwärzen, Flattening, Seiten löschen, Seiten extrahieren, Reihenfolge ändern, Seite hinzufügen, Metadaten, PDF→SVG, PDF→EPUB, PDF→TXT, Formulare ausfüllen, PDF→Bilder, PDF/A, PDF vergleichen, Entsperren und Passwortschutz.',
      },
      {
        h: '2. TLS/SSL-Verschlüsselung',
        p: 'Die gesamte Kommunikation zwischen Ihrem Browser und unserem Server wird mit TLS 1.3 (Transport Layer Security) verschlüsselt. Wir verwenden ein SSL-Zertifikat, das von einer vertrauenswürdigen Zertifizierungsstelle ausgestellt wurde. Das bedeutet, dass Daten, die über das Internet übertragen werden, für Dritte unlesbar sind. Sie können die Gültigkeit des Zertifikats überprüfen, indem Sie auf das Schlosssymbol in der Adressleiste Ihres Browsers klicken.',
      },
      {
        h: '3. Content Security Policy (CSP)',
        p: 'Wir setzen eine strenge Content Security Policy (CSP) durch, die die Ausführung von Skripten aus nicht vertrauenswürdigen Quellen einschränkt. CSP verhindert Cross-Site Scripting (XSS)-Angriffe, Code-Injection und Datendiebstahl. Unsere CSP-Richtlinie wird regelmäßig auditiert und aktualisiert.',
      },
      {
        h: '4. Nur-RAM-Verarbeitung',
        p: 'Für Werkzeuge, die eine serverseitige Verarbeitung erfordern (Komprimierung, OCR, Formatkonvertierungen), werden Dateien ausschließlich im RAM des Servers verarbeitet. Dateien werden nicht auf die Festplatte geschrieben, nicht in Backups kopiert und nicht repliziert. Sobald der Vorgang abgeschlossen ist, wird die Datei sofort aus dem Speicher gelöscht. Maximale Speicherzeit auf dem Server: einige Sekunden.',
      },
      {
        h: '5. Dateiverifizierung',
        items: [
          'Magic-Bytes-Verifizierung — vor der Verarbeitung prüfen wir, ob die hochgeladene Datei tatsächlich eine PDF-Datei ist, indem wir ihren Header (%PDF) analysieren. Dies verhindert Angriffe durch Dateityp-Spoofing.',
          'Dateigrößenlimit — maximale Upload-Größe ist 100 MB. Dies schützt sowohl vor Serverüberlastung als auch vor potenziellen DoS-Angriffen.',
          'Integritätsprüfung — wir prüfen, ob die Datei vor Beginn der Verarbeitung nicht beschädigt ist.',
        ],
      },
      {
        h: '6. Schutz vor Angriffen',
        items: [
          'CSRF-Schutz — wir verwenden Anti-CSRF-Token und Origin/Referer-Header-Überprüfung, um Cross-Site Request Forgery-Angriffe zu verhindern.',
          'Rate Limiting — wir begrenzen Anfragen von einer einzelnen IP-Adresse, um Brute-Force- und DoS-Angriffe zu verhindern.',
          'HTTP-Sicherheitsheader — wir setzen X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) und Referrer-Policy-Header.',
          'Eingabevalidierung — alle Eingabedaten werden sowohl auf Client- als auch auf Serverseite validiert, was Injection-Angriffe verhindert.',
        ],
      },
      {
        h: '7. Null Datenspeicherung',
        p: 'Wir speichern Ihre Dateien oder personenbezogenen Daten nicht auf dem Server. Wir erfordern keine Registrierung, Anmeldung oder E-Mail-Adresse zur Nutzung der Werkzeuge. Wir erstellen keine Benutzerprofile und verfolgen Ihre Aktivitäten nicht zwischen Besuchen.',
      },
      {
        h: '8. Sicherheit der KI-Funktionen',
        p: 'KI-Funktionen verwenden die externe OpenRouter-API. Ihr API-Schlüssel wird ausschließlich im localStorage Ihres Browsers gespeichert — wir haben keinen Zugriff darauf. An OpenRouter gesendeter Text ist auf den aus dem PDF extrahierten Inhalt beschränkt. Wir senden keine nutzerverknüpfenden Daten, IP-Adressen oder Browser-Informationen. OpenRouter verwendet TLS-Verschlüsselung und nutzt eingereichte Inhalte nicht zum Training von KI-Modellen.',
      },
      {
        h: '9. Abhängigkeitssicherheit',
        p: 'Wir aktualisieren regelmäßig alle im Projekt verwendeten Bibliotheken und Abhängigkeiten. Wir verwenden automatische Schwachstellenscan-Tools (npm audit, Snyk). Alle kritischen Schwachstellen werden innerhalb von 48 Stunden nach CVE-Veröffentlichung behoben.',
      },
      {
        h: '10. Schwachstellenoffenlegung',
        p: 'Wenn Sie eine Sicherheitslücke in OptimaPDF entdecken, melden Sie diese bitte verantwortungsvoll per E-Mail an kontakt@optimapdf.com. Wir verpflichten uns zu:',
        items: [
          'Bestätigung des Eingangs innerhalb von 24 Stunden.',
          'Durchführung einer Analyse und Ergreifung korrekter Maßnahmen innerhalb von 14 Tagen (je nach Schweregrad).',
          'Information des Melders über ergriffene Maßnahmen.',
          'Keine rechtlichen Schritte gegen Personen, die Schwachstellen verantwortungsvoll offenlegen.',
        ],
      },
      {
        h: '11. Sicherheit der Dateiübertragung',
        p: 'In den seltenen Fällen, in denen eine Datei an den Server gesendet werden muss (serverseitige Werkzeuge), erfolgt die Übertragung über eine verschlüsselte HTTPS-Verbindung mit TLS 1.3. Die Datei wird im Speicher (Streaming) übertragen, ohne temporäre Festplattenspeicherung. Nach Erhalt der Antwort wird die Datei sofort aus dem Serverspeicher gelöscht. Wir führen keine Protokolle über Dateivorgänge.',
      },
      {
        h: '12. Standards-Konformität',
        p: 'Wir halten uns an folgende Sicherheitsstandards und Empfehlungen:',
        items: [
          'OWASP Top 10 — Schutz vor den häufigsten Schwachstellen von Webanwendungen.',
          'DSGVO (GDPR) — Schutz personenbezogener Daten gemäß EU-Verordnung 2016/679.',
          'CERT Polska-Richtlinien — Befolgung der Empfehlungen des polnischen CERT-Teams.',
          'Mozilla Observatory — wir streben eine A+-Bewertung im HTTP-Header-Sicherheitstest an.',
        ],
      },
    ],
  },
  es: {
    title: 'Seguridad',
    updated: 'Última actualización: 25 de junio de 2026',
    intro: 'OptimaPDF otorga la máxima importancia a la seguridad de los datos. A continuación se presenta una descripción detallada de las medidas de seguridad que empleamos para proteger sus archivos y datos al utilizar nuestras herramientas.',
    sections: [
      {
        h: '1. Procesamiento del lado del cliente en el navegador',
        p: 'La mayoría de las herramientas de OptimaPDF funcionan con una arquitectura zero-trust — su archivo nunca abandona su dispositivo. Utilizamos WebAssembly y JavaScript para procesar archivos PDF directamente en su navegador. Esto significa que incluso nosotros, como operadores del servicio, no tenemos acceso a sus archivos. Esto se aplica a: fusionar, dividir, rotar, marca de agua, numeración de páginas, recortar, editar, firmar, redactar, aplanar, eliminar páginas, extraer páginas, reordenar páginas, añadir página, metadatos, PDF→SVG, PDF→EPUB, PDF→TXT, rellenar formularios, PDF→imágenes, PDF/A, comparar PDF, desbloquear y proteger con contraseña.',
      },
      {
        h: '2. Cifrado TLS/SSL',
        p: 'Toda la comunicación entre su navegador y nuestro servidor está cifrada utilizando TLS 1.3 (Transport Layer Security). Utilizamos un certificado SSL emitido por una autoridad de certificación de confianza. Esto significa que los datos transmitidos a través de internet son ilegibles para terceros. Puede verificar la validez del certificado haciendo clic en el icono del candado en la barra de direcciones de su navegador.',
      },
      {
        h: '3. Content Security Policy (CSP)',
        p: 'Aplicamos una estricta Content Security Policy (CSP) que restringe la ejecución de scripts de fuentes no confiables. CSP previene ataques de Cross-Site Scripting (XSS), inyección de código y robo de datos. Nuestra política CSP se audita y actualiza regularmente.',
      },
      {
        h: '4. Procesamiento exclusivo en RAM',
        p: 'Para herramientas que requieren procesamiento del lado del servidor (compresión, OCR, conversiones de formato), los archivos se procesan exclusivamente en la RAM del servidor. Los archivos no se escriben en el disco duro, no se copian en backups ni se replican. Una vez completada la operación, el archivo se elimina inmediatamente de la memoria. Tiempo máximo de retención en el servidor: unos segundos.',
      },
      {
        h: '5. Verificación de archivos',
        items: [
          'Verificación de magic bytes — antes del procesamiento, verificamos que el archivo subido sea realmente un PDF analizando su cabecera (%PDF). Esto previene ataques de suplantación de tipo de archivo.',
          'Límite de tamaño de archivo — el tamaño máximo de subida es de 100 MB. Esto protege tanto contra la sobrecarga del servidor como contra posibles ataques DoS.',
          'Verificación de integridad — verificamos que el archivo no esté dañado antes de iniciar el procesamiento.',
        ],
      },
      {
        h: '6. Protección contra ataques',
        items: [
          'Protección CSRF — utilizamos tokens anti-CSRF y verificación de cabeceras Origin/Referer para prevenir ataques Cross-Site Request Forgery.',
          'Rate limiting — limitamos las solicitudes desde una sola dirección IP, protegiendo contra ataques de fuerza bruta y DoS.',
          'HTTP Security Headers — aplicamos las cabeceras X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) y Referrer-Policy.',
          'Validación de entrada — todos los datos de entrada se validan tanto en el lado del cliente como del servidor, previniendo ataques de inyección.',
        ],
      },
      {
        h: '7. Almacenamiento cero de datos',
        p: 'No almacenamos sus archivos ni datos personales en el servidor. No requerimos registro, inicio de sesión ni dirección de correo electrónico para utilizar las herramientas. No creamos perfiles de usuario ni rastreamos su actividad entre visitas.',
      },
      {
        h: '8. Seguridad de funciones de IA',
        p: 'Las funciones de IA utilizan la API externa de OpenRouter. Su clave de API se almacena exclusivamente en el localStorage de su navegador — nosotros no tenemos acceso a ella. El texto enviado a OpenRouter se limita al contenido extraído del PDF. No enviamos datos de identificación del usuario, dirección IP ni información del navegador. OpenRouter utiliza cifrado TLS y no utiliza el contenido enviado para el entrenamiento de modelos de IA.',
      },
      {
        h: '9. Seguridad de dependencias',
        p: 'Actualizamos regularmente todas las bibliotecas y dependencias utilizadas en el proyecto. Utilizamos herramientas de escaneo automático de vulnerabilidades (npm audit, Snyk). Todas las vulnerabilidades críticas se corrigen dentro de las 48 horas de la publicación del CVE.',
      },
      {
        h: '10. Divulgación de vulnerabilidades',
        p: 'Si descubre una vulnerabilidad de seguridad en OptimaPDF, por favor divulgue responsablemente enviando un correo electrónico a kontakt@optimapdf.com. Nos comprometemos a:',
        items: [
          'Confirmar la recepción dentro de 24 horas.',
          'Realizar un análisis y tomar medidas correctivas dentro de 14 días (dependiendo de la gravedad).',
          'Informar al reportero sobre las acciones tomadas.',
          'No emprender acciones legales contra quienes divulgan responsablemente vulnerabilidades.',
        ],
      },
      {
        h: '11. Seguridad de transmisión de archivos',
        p: 'En los casos poco comunes en que un archivo debe enviarse al servidor (herramientas del lado del servidor), la transmisión se realiza a través de una conexión HTTPS cifrada usando TLS 1.3. El archivo se transmite en memoria (streaming) sin almacenamiento temporal en disco. Después de recibir la respuesta, el archivo se elimina inmediatamente de la memoria del servidor. No mantenemos registros de operaciones con archivos.',
      },
      {
        h: '12. Cumplimiento de estándares',
        p: 'Nos adherimos a los siguientes estándares y recomendaciones de seguridad:',
        items: [
          'OWASP Top 10 — protección contra las vulnerabilidades más comunes de aplicaciones web.',
          'RGPD — protección de datos personales de acuerdo con el Reglamento UE 2016/679.',
          'Directrices de CERT Polska — seguimiento de las recomendaciones del equipo CERT polaco.',
          'Mozilla Observatory — aspiramos a una calificación A+ en la prueba de seguridad de cabeceras HTTP.',
        ],
      },
    ],
  },
  en: {
    title: 'Security',
    updated: 'Last updated: June 25, 2026',
    intro: 'OptimaPDF places the highest importance on data security. Below is a detailed description of the security measures we employ to protect your files and data when using our tools.',
    sections: [
      {
        h: '1. Client-side processing in the browser',
        p: 'Most OptimaPDF tools operate on a zero-trust architecture — your file never leaves your device. We use WebAssembly and JavaScript to process PDF files directly in your browser. This means that even we, as service operators, have no access to your files. This applies to: merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, and protect-pdf.',
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
        p: 'If you discover a security vulnerability in OptimaPDF, please responsibly disclose it by emailing kontakt@optimapdf.com. We commit to:',
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

export default function SecurityPage({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const { locale: detectedLocale } = useLocale();
  const locale = forcedLocale || detectedLocale;
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
