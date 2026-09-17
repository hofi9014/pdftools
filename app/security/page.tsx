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
      {
        h: '13. Szyfrowanie danych w spoczynku i certyfikaty ISO 27001 / SOC 2',
        p: 'Większość operacji na Twoich plikach odbywa się wyłącznie w przeglądarce i nigdy nie trafia na żaden serwer — nie istnieją więc po naszej stronie żadne "dane w spoczynku" do zaszyfrowania. Dla nielicznych narzędzi wymagających przetwarzania serwerowego (patrz punkty 4 i 11) plik istnieje wyłącznie w pamięci RAM serwera przez kilka sekund i jest usuwany natychmiast po zakończeniu operacji — nigdy nie trafia na dysk, do kopii zapasowej ani do bazy danych, więc pojęcie "szyfrowania danych w spoczynku" w praktyce nie ma tu zastosowania. Nie posiadamy formalnych certyfikatów ISO 27001 ani SOC 2. Są to kosztowne, wieloletnie procesy audytowe zaprojektowane przede wszystkim dla organizacji utrzymujących trwałe magazyny danych klientów, procesy operacyjne i wieloosobowe zespoły — w architekturze, w której serwer w ogóle nie przechowuje danych użytkownika, większość kontroli objętych tymi certyfikatami traci swój przedmiot. Zamiast tego stosujemy alternatywne, możliwe do zweryfikowania w kodzie źródłowym gwarancje opisane w punktach 1–12 powyżej (zero przechowywania, szyfrowana transmisja, CSP, ochrona przed atakami, jawny proces zgłaszania podatności).',
      },
      {
        h: '14. eIDAS i kwalifikowany podpis elektroniczny (QES)',
        p: 'Narzędzie "Podpisz PDF" oferuje tryb podpisu cyfrowego PAdES (zaawansowany podpis elektroniczny) z wykorzystaniem własnego certyfikatu użytkownika (.p12/.pfx) — cała operacja odbywa się lokalnie w przeglądarce, a plik i certyfikat nigdy nie są przesyłane na serwer. To prawdziwy podpis kryptograficzny, a nie tylko wizualny obrazek. Ważne zastrzeżenie: taki podpis NIE jest automatycznie kwalifikowanym podpisem elektronicznym (QES) w rozumieniu unijnego rozporządzenia eIDAS (910/2014) — status QES zależy wyłącznie od tego, czy Twój certyfikat został wydany przez kwalifikowanego dostawcę usług zaufania (QTSP) na kwalifikowanym urządzeniu do składania podpisu. Wystawienie takiego certyfikatu i weryfikacja tożsamości jego posiadacza z definicji wymaga zewnętrznego, licencjonowanego podmiotu — to jedyny element tego procesu, którego nie da się zrealizować w 100% lokalnie, bez serwera. Jeśli Twój certyfikat ma status kwalifikowany, złożony nim podpis PAdES spełnia wymogi QES; jeśli używasz certyfikatu self-signed lub firmowego, tworzysz ważny prawnie zaawansowany podpis elektroniczny, ale nie kwalifikowany. Sprawdź wymogi prawne właściwe dla Twojego zastosowania.',
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
      {
        h: '13. Verschlüsselung ruhender Daten und ISO-27001-/SOC-2-Zertifizierung',
        p: 'Die meisten Vorgänge mit Ihren Dateien finden ausschließlich in Ihrem Browser statt und erreichen niemals einen Server — auf unserer Seite gibt es also gar keine "ruhenden Daten", die verschlüsselt werden müssten. Bei den wenigen Werkzeugen, die eine serverseitige Verarbeitung erfordern (siehe Punkte 4 und 11), existiert die Datei nur wenige Sekunden im Arbeitsspeicher (RAM) des Servers und wird unmittelbar nach Abschluss des Vorgangs gelöscht — sie wird niemals auf Festplatte geschrieben, gesichert oder in einer Datenbank gespeichert, sodass der Begriff "Verschlüsselung ruhender Daten" hier praktisch nicht greift. Wir verfügen nicht über eine formale ISO-27001- oder SOC-2-Zertifizierung. Dabei handelt es sich um kostspielige, mehrjährige Auditprogramme, die vor allem für Organisationen konzipiert sind, die dauerhafte Kundendatenspeicher, Betriebsprozesse und mehrköpfige Teams unterhalten — in einer Architektur, in der der Server überhaupt keine Nutzerdaten dauerhaft speichert, laufen die meisten der von diesen Zertifizierungen abgedeckten Kontrollen ins Leere. Stattdessen setzen wir auf die alternativen, im Quellcode nachprüfbaren Garantien aus den Punkten 1–12 oben (keine Speicherung, verschlüsselte Übertragung, CSP, Angriffsschutz, öffentlicher Prozess zur Meldung von Schwachstellen).',
      },
      {
        h: '14. eIDAS und qualifizierte elektronische Signatur (QES)',
        p: 'Das Werkzeug "PDF signieren" bietet einen PAdES-Signaturmodus (eine fortgeschrittene elektronische Signatur) mit Ihrem eigenen Zertifikat (.p12/.pfx) — der gesamte Vorgang läuft lokal in Ihrem Browser ab; Ihre Datei und Ihr Zertifikat werden niemals auf einen Server hochgeladen. Dies ist eine echte kryptografische Signatur, kein bloßes Bild einer Unterschrift. Wichtiger Hinweis: Diese Signatur ist NICHT automatisch eine qualifizierte elektronische Signatur (QES) im Sinne der EU-Verordnung eIDAS (910/2014) — der QES-Status hängt ausschließlich davon ab, ob Ihr Zertifikat von einem qualifizierten Vertrauensdiensteanbieter (QTSP) auf einer qualifizierten Signaturerstellungseinheit ausgestellt wurde. Die Ausstellung eines solchen Zertifikats und die Identitätsprüfung seines Inhabers erfordern zwangsläufig einen externen, lizenzierten Dritten — das ist der einzige Teil dieses Prozesses, der nicht zu 100 % lokal, ohne Server, erledigt werden kann. Ist Ihr Zertifikat qualifiziert, erfüllt eine damit erstellte PAdES-Signatur die Anforderungen einer QES; verwenden Sie ein selbstsigniertes oder firmeneigenes Zertifikat, erstellen Sie eine rechtsgültige fortgeschrittene elektronische Signatur, jedoch keine qualifizierte. Prüfen Sie die für Ihren Anwendungsfall geltenden rechtlichen Anforderungen.',
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
      {
        h: '13. Cifrado de datos en reposo y certificaciones ISO 27001 / SOC 2',
        p: 'La mayoría de las operaciones sobre tus archivos se realizan íntegramente en tu navegador y nunca llegan a ningún servidor, por lo que no existen "datos en reposo" en nuestro lado que cifrar. Para las pocas herramientas que sí requieren procesamiento en servidor (véanse los puntos 4 y 11), el archivo existe únicamente en la memoria RAM del servidor durante unos segundos y se elimina inmediatamente después de la operación — nunca se escribe en disco, ni se realiza copia de seguridad, ni se almacena en una base de datos, por lo que el concepto de "cifrado de datos en reposo" no resulta aplicable en la práctica. No contamos con certificación formal ISO 27001 ni SOC 2. Se trata de procesos de auditoría costosos y plurianuales, diseñados principalmente para organizaciones que mantienen almacenes de datos de clientes persistentes, procesos operativos y equipos de varias personas; en una arquitectura donde el servidor nunca conserva datos del usuario, la mayoría de los controles que cubren estas certificaciones carecen de objeto. En su lugar, aplicamos las garantías alternativas, verificables en el propio código fuente, descritas en los puntos 1 a 12 anteriores (cero almacenamiento, transmisión cifrada, CSP, protección frente a ataques, un proceso público de notificación de vulnerabilidades).',
      },
      {
        h: '14. eIDAS y firma electrónica cualificada (QES)',
        p: 'La herramienta "Firmar PDF" ofrece un modo de firma digital PAdES (firma electrónica avanzada) utilizando tu propio certificado (.p12/.pfx) — toda la operación se ejecuta localmente en tu navegador; tu archivo y tu certificado nunca se suben a un servidor. Se trata de una firma criptográfica real, no solo de una imagen visual de una firma. Aviso importante: esta firma NO es automáticamente una firma electrónica cualificada (QES) conforme al Reglamento eIDAS de la UE (910/2014) — el estatus de QES depende exclusivamente de si tu certificado fue emitido por un prestador cualificado de servicios de confianza (QTSP) en un dispositivo cualificado de creación de firmas. La emisión de dicho certificado y la verificación de la identidad de su titular requieren necesariamente a un tercero externo y autorizado — es la única parte de este proceso que no puede realizarse al 100% de forma local, sin servidor. Si tu certificado es cualificado, una firma PAdES creada con él cumple los requisitos de una QES; si utilizas un certificado autofirmado o corporativo, creas una firma electrónica avanzada legalmente válida, pero no cualificada. Verifica los requisitos legales aplicables a tu caso de uso concreto.',
      },
    ],
  },
  pt: {
    title: 'Segurança',
    updated: 'Última atualização: 25 de junho de 2026',
    intro: 'OptimaPDF atribui a máxima importância à segurança dos dados. Apresentamos de seguida uma descrição detalhada das medidas de segurança que empregamos para proteger os seus ficheiros e dados ao utilizar as nossas ferramentas.',
    sections: [
      {
        h: '1. Processamento do lado do cliente no navegador',
        p: 'A maioria das ferramentas do OptimaPDF funciona com uma arquitetura zero-trust — o seu ficheiro nunca sai do seu dispositivo. Utilizamos WebAssembly e JavaScript para processar ficheiros PDF diretamente no seu navegador. Isto significa que até nós, como operadores do serviço, não temos acesso aos seus ficheiros. Isto aplica-se a: juntar, dividir, rodar, marca de água, numeração de páginas, recortar, editar, assinar, anonimizar, achatar, eliminar páginas, extrair páginas, reordenar páginas, adicionar página, metadados, PDF→SVG, PDF→EPUB, PDF→TXT, preencher formulários, PDF→imagens, PDF/A, comparar PDF, desbloquear e proteger com palavra-passe.',
      },
      {
        h: '2. Encriptação TLS/SSL',
        p: 'Toda a comunicação entre o seu navegador e o nosso servidor é encriptada utilizando TLS 1.3 (Transport Layer Security). Utilizamos um certificado SSL emitido por uma autoridade de certificação de confiança. Isto significa que os dados transmitidos através da internet são ilegíveis para terceiros. Pode verificar a validade do certificado clicando no ícone da fechadura na barra de endereços do seu navegador.',
      },
      {
        h: '3. Content Security Policy (CSP)',
        p: 'Aplicamos uma Content Security Policy (CSP) rigorosa que restringe a execução de scripts de fontes não fiáveis. CSP previne ataques Cross-Site Scripting (XSS), injeção de código e roubo de dados. A nossa política CSP é regularmente auditada e atualizada.',
      },
      {
        h: '4. Processamento exclusivo em RAM',
        p: 'Para ferramentas que requerem processamento do lado do servidor (compressão, OCR, conversões de formato), os ficheiros são processados exclusivamente na RAM do servidor. Os ficheiros não são escritos no disco rígido, não são copiados para backups nem replicados. Uma vez concluída a operação, o ficheiro é imediatamente removido da memória. Tempo máximo de retenção no servidor: alguns segundos.',
      },
      {
        h: '5. Verificação de ficheiros',
        items: [
          'Verificação de magic bytes — antes do processamento, verificamos que o ficheiro carregado é efetivamente um PDF analisando o seu cabeçalho (%PDF). Isto previne ataques de falsificação de tipo de ficheiro.',
          'Limite de tamanho de ficheiro — o tamanho máximo de carregamento é de 100 MB. Isto protege tanto contra sobrecarga do servidor como contra potenciais ataques DoS.',
          'Verificação de integridade — verificamos que o ficheiro não está danificado antes de iniciar o processamento.',
        ],
      },
      {
        h: '6. Proteção contra ataques',
        items: [
          'Proteção CSRF — utilizamos tokens anti-CSRF e verificação de cabeçalhos Origin/Referer para prevenir ataques Cross-Site Request Forgery.',
          'Rate limiting — limitamos os pedidos de um único endereço IP, protegendo contra ataques de força bruta e DoS.',
          'HTTP Security Headers — aplicamos os cabeçalhos X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) e Referrer-Policy.',
          'Validação de entrada — todos os dados de entrada são validados tanto do lado do cliente como do servidor, prevenindo ataques de injeção.',
        ],
      },
      {
        h: '7. Armazenamento zero de dados',
        p: 'Não armazenamos os seus ficheiros nem dados pessoais no servidor. Não requeremos registo, início de sessão nem endereço de correio eletrónico para utilizar as ferramentas. Não criamos perfis de utilizador nem rastreamos a sua atividade entre visitas.',
      },
      {
        h: '8. Segurança das funções de IA',
        p: 'As funções de IA utilizam a API externa do OpenRouter. A sua chave de API é armazenada exclusivamente no localStorage do seu navegador — nós não temos acesso a ela. O texto enviado ao OpenRouter é limitado ao conteúdo extraído do PDF. Não enviamos dados de identificação do utilizador, endereço IP nem informações do navegador. O OpenRouter utiliza encriptação TLS e não utiliza o conteúdo submetido para treino de modelos de IA.',
      },
      {
        h: '9. Segurança de dependências',
        p: 'Atualizamos regularmente todas as bibliotecas e dependências utilizadas no projeto. Utilizamos ferramentas de verificação automática de vulnerabilidades (npm audit, Snyk). Todas as vulnerabilidades críticas são corrigidas no prazo de 48 horas após a publicação do CVE.',
      },
      {
        h: '10. Divulgação de vulnerabilidades',
        p: 'Se descobrir uma vulnerabilidade de segurança no OptimaPDF, por favor divulgue de forma responsável enviando um correio eletrónico para kontakt@optimapdf.com. Comprometemo-nos a:',
        items: [
          'Confirmar a receção no prazo de 24 horas.',
          'Realizar uma análise e tomar medidas corretivas no prazo de 14 dias (dependendo da gravidade).',
          'Informar o reportador sobre as medidas tomadas.',
          'Não intentar ações legais contra pessoas que divulguem vulnerabilidades de forma responsável.',
        ],
      },
      {
        h: '11. Segurança de transmissão de ficheiros',
        p: 'Nos casos raros em que um ficheiro deve ser enviado ao servidor (ferramentas do lado do servidor), a transmissão ocorre através de uma ligação HTTPS encriptada com TLS 1.3. O ficheiro é transmitido em memória (streaming) sem armazenamento temporário em disco. Após receber a resposta, o ficheiro é imediatamente removido da memória do servidor. Não mantemos registos de operações com ficheiros.',
      },
      {
        h: '12. Conformidade com normas',
        p: 'Seguimos as seguintes normas e recomendações de segurança:',
        items: [
          'OWASP Top 10 — proteção contra as vulnerabilidades mais comuns de aplicações web.',
          'RGPD — proteção de dados pessoais de acordo com o Regulamento UE 2016/679.',
          'Diretrizes do CERT Polska — seguimento das recomendações da equipa CERT polaca.',
          'Mozilla Observatory — pretendemos uma classificação A+ no teste de segurança de cabeçalhos HTTP.',
        ],
      },
      {
        h: '13. Cifragem de dados em repouso e certificações ISO 27001 / SOC 2',
        p: 'A maioria das operações sobre os seus ficheiros ocorre inteiramente no seu navegador e nunca chega a qualquer servidor — não existem, portanto, "dados em repouso" do nosso lado para cifrar. Para as poucas ferramentas que exigem processamento no servidor (ver pontos 4 e 11), o ficheiro existe apenas na memória RAM do servidor durante alguns segundos e é eliminado imediatamente após a conclusão da operação — nunca é escrito em disco, copiado para backup nem guardado numa base de dados, pelo que o conceito de "cifragem de dados em repouso" não se aplica na prática. Não possuímos certificação formal ISO 27001 nem SOC 2. Trata-se de processos de auditoria dispendiosos e plurianuais, concebidos sobretudo para organizações que mantêm repositórios persistentes de dados de clientes, processos operacionais e equipas de várias pessoas — numa arquitetura em que o servidor nunca retém dados do utilizador, a maioria dos controlos abrangidos por estas certificações perde o seu objeto. Em vez disso, aplicamos as garantias alternativas, verificáveis no próprio código-fonte, descritas nos pontos 1 a 12 acima (zero armazenamento, transmissão cifrada, CSP, proteção contra ataques, um processo público de divulgação de vulnerabilidades).',
      },
      {
        h: '14. eIDAS e assinatura eletrónica qualificada (QES)',
        p: 'A ferramenta "Assinar PDF" oferece um modo de assinatura digital PAdES (assinatura eletrónica avançada) utilizando o seu próprio certificado (.p12/.pfx) — toda a operação decorre localmente no seu navegador; o seu ficheiro e o certificado nunca são enviados para um servidor. Trata-se de uma assinatura criptográfica real, não apenas de uma imagem visual de uma assinatura. Aviso importante: esta assinatura NÃO é automaticamente uma assinatura eletrónica qualificada (QES) nos termos do Regulamento eIDAS da UE (910/2014) — o estatuto de QES depende exclusivamente de o seu certificado ter sido emitido por um prestador qualificado de serviços de confiança (QTSP) num dispositivo qualificado de criação de assinaturas. A emissão de tal certificado e a verificação da identidade do seu titular exigem necessariamente um terceiro externo e licenciado — esta é a única parte do processo que não pode ser realizada a 100% localmente, sem servidor. Se o seu certificado for qualificado, uma assinatura PAdES criada com ele cumpre os requisitos de uma QES; se utilizar um certificado autoassinado ou empresarial, cria uma assinatura eletrónica avançada juridicamente válida, mas não qualificada. Verifique os requisitos legais aplicáveis ao seu caso de utilização.',
      },
    ],
  },
  no: {
    title: 'Sikkerhet',
    updated: 'Sist oppdatert: 25. juni 2026',
    intro: 'OptimaPDF legger størst vekt på datasikkerhet. Nedenfor presenterer vi en detaljert beskrivelse av sikkerhetstiltakene vi bruker for å beskytte filene og dataene dine når du bruker verktøyene våre.',
    sections: [
      {
        h: '1. Client-side behandling i nettleseren',
        p: 'De fleste OptimaPDF-verktøyene bruker en zero-trust-arkitektur — filen din forlater aldri enheten din. Vi bruker WebAssembly og JavaScript for å behandle PDF-filer direkte i nettleseren din. Dette betyr at selv vi, som tjenesteoperatører, ikke har tilgang til filene dine. Dette gjelder: slå sammen, dele, rotere, vannmerke, sidetall, beskjære, redigere, signere, sladde ut, flate ut, slette sider, ekstrahere sider, endre rekkefølge, legge til side, metadata, PDF→SVG, PDF→EPUB, PDF→TXT, fylle skjemaer, PDF→bilder, PDF/A, sammenligne PDF, låse opp og beskytte med passord.',
      },
      {
        h: '2. TLS/SSL-kryptering',
        p: 'All kommunikasjon mellom nettleseren din og serveren vår er kryptert med TLS 1.3 (Transport Layer Security). Vi bruker et SSL-sertifikat utstedt av en betrodd sertifiseringsmyndighet. Dette betyr at data som overføres over internett er uleselige for tredjeparter. Du kan verifisere sertifikatets gyldighet ved å klikke på hengelåsikonet i adresselinjen til nettleseren din.',
      },
      {
        h: '3. Content Security Policy (CSP)',
        p: 'Vi håndhever en streng Content Security Policy (CSP) som begrenser kjøring av skripter fra utrygge kilder. CSP forhindrer Cross-Site Scripting (XSS)-angrep, kodeinjeksjon og datatyveri. CSP-retningslinjene våre revideres og oppdateres jevnlig.',
      },
      {
        h: '4. Kun RAM-behandling',
        p: 'For verktøy som krever serverbehandling (komprimering, OCR, formatkonverteringer), behandles filene utelukkende i serverens RAM. Filene skrives ikke til harddisken, kopieres ikke til sikkerhetskopier og replikeres ikke. Når operasjonen er fullført, fjernes filen umiddelbart fra minnet. Maksimal lagringstid på serveren: noen få sekunder.',
      },
      {
        h: '5. Filverifisering',
        items: [
          'Magic bytes-verifisering — før behandling verifiserer vi at den opplastede filen faktisk er en PDF ved å analysere filens header (%PDF). Dette forhindrer angrep av type-spoofing.',
          'Filstørrelsesgrense — maksimal opplastningsstørrelse er 100 MB. Dette beskytter både mot serveroverbelastning og potensielle DoS-angrep.',
          'Integritetssjekk — vi verifiserer at filen ikke er skadet før behandling starter.',
        ],
      },
      {
        h: '6. Beskyttelse mot angrep',
        items: [
          'CSRF-beskyttelse — vi bruker anti-CSRF-tokener og Origin/Referer-hodeverifisering for å forhindre Cross-Site Request Forgery-angrep.',
          'Rate limiting — vi begrenser forespørsler fra én enkelt IP-adresse, og beskytter mot brute-force- og DoS-angrep.',
          'HTTP-sikkerhetshoder — vi bruker X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) og Referrer-Policy-hoder.',
          'Inndata-validering — alle inndata valideres både på klientsiden og serversiden, noe som forhindrer injeksjonsangrep.',
        ],
      },
      {
        h: '7. Null datalagring',
        p: 'Vi lagrer ikke filene eller personopplysningene dine på serveren. Vi krever ikke registrering, pålogging eller e-postadresse for å bruke verktøyene. Vi oppretter ikke brukerprofiler og sporer ikke aktiviteten din mellom besøk.',
      },
      {
        h: '8. Sikkerhet for AI-funksjoner',
        p: 'AI-funksjoner bruker det eksterne OpenRouter API-et. API-nøkkelen din lagres utelukkende i nettleserens localStorage — vi har ikke tilgang til den. Tekst sendt til OpenRouter er begrenset til innhold hentet fra PDF-en. Vi sender ikke brukeridentifiserende data, IP-adresse eller nettleserinformasjon. OpenRouter bruker TLS-kryptering og bruker ikke innhold sendt inn for opplæring av AI-modeller.',
      },
      {
        h: '9. Avhengighetssikkerhet',
        p: 'Vi oppdaterer jevnlig alle bibliotekene og avhengighetene som brukes i prosjektet. Vi bruker automatiske sårbarhetsskannerverktøy (npm audit, Snyk). Alle kritiske sårbarheter lappes innen 48 timer etter CVE-publisering.',
      },
      {
        h: '10. Sårbarhetsrapportering',
        p: 'Hvis du oppdager en sikkerhetssårbarhet i OptimaPDF, vennligst rapporter den ansvarlig ved å sende e-post til kontakt@optimapdf.com. Vi forplikter oss til:',
        items: [
          'Bekrefte mottakelse innen 24 timer.',
          'Gjennomføre analyse og iverksette korrigerende tiltak innen 14 dager (avhengig av alvorlighetsgrad).',
          'Informere varsleren om tiltakene som er tatt.',
          'Ikke forfølge juridiske tiltak mot de som rapporterer sårbarheter ansvarlig.',
        ],
      },
      {
        h: '11. Sikkerhet for filoverføring',
        p: 'I sjeldne tilfeller der en fil må sendes til serveren (server-side verktøy), skjer overføringen over en kryptert HTTPS-tilkobling med TLS 1.3. Filen overføres i minnet (streaming) uten midlertidig disklagring. Etter å ha mottatt svaret, fjernes filen umiddelbart fra serverminnet. Vi fører ikke logger over filoperasjoner.',
      },
      {
        h: '12. Standardetterlevelse',
        p: 'Vi følger følgende sikkerhetsstandarder og anbefalinger:',
        items: [
          'OWASP Top 10 — beskyttelse mot de vanligste sårbarhetene i webapplikasjoner.',
          'GDPR — personvern i samsvar med EU-forordning 2016/679.',
          'CERT Polska-retningslinjer — etterlevelse av anbefalingene fra det polske CERT-teamet.',
          'Mozilla Observatory — vi sikter mot en A+-vurdering i HTTP-hodenesikkerhetstesten.',
        ],
      },
      {
        h: '13. Kryptering av data i hvile og ISO 27001-/SOC 2-sertifisering',
        p: 'De fleste operasjoner på filene dine skjer utelukkende i nettleseren din og når aldri en server — det finnes derfor ingen "data i hvile" på vår side å kryptere. For de få verktøyene som krever serverbehandling (se punkt 4 og 11), eksisterer filen kun i serverens RAM i noen sekunder og slettes umiddelbart etter at operasjonen er fullført — den skrives aldri til disk, sikkerhetskopieres ikke og lagres ikke i en database, så begrepet "kryptering av data i hvile" har i praksis ingen anvendelse her. Vi har ikke formell ISO 27001- eller SOC 2-sertifisering. Dette er kostbare, flerårige revisjonsprogrammer utformet primært for organisasjoner som opprettholder permanente kundedatalagre, driftsprosesser og team med mange ansatte — i en arkitektur der serveren aldri beholder brukerdata i det hele tatt, mister de fleste kontrollene disse sertifiseringene dekker sitt formål. I stedet bruker vi de alternative, kildekode-verifiserbare garantiene beskrevet i punkt 1–12 ovenfor (null lagring, kryptert overføring, CSP, angrepsbeskyttelse, en offentlig prosess for sårbarhetsrapportering).',
      },
      {
        h: '14. eIDAS og kvalifisert elektronisk signatur (QES)',
        p: 'Verktøyet "Signer PDF" tilbyr en PAdES-signaturmodus (en avansert elektronisk signatur) med ditt eget sertifikat (.p12/.pfx) — hele operasjonen kjører lokalt i nettleseren din; filen og sertifikatet ditt lastes aldri opp til en server. Dette er en ekte kryptografisk signatur, ikke bare et visuelt bilde av en signatur. Viktig forbehold: denne signaturen er IKKE automatisk en kvalifisert elektronisk signatur (QES) etter EUs eIDAS-forordning (910/2014) — QES-status avhenger utelukkende av om sertifikatet ditt er utstedt av en kvalifisert tillitstjenesteleverandør (QTSP) på en kvalifisert signaturopprettelsesenhet. Utstedelse av et slikt sertifikat og identitetsverifisering av innehaveren krever nødvendigvis en ekstern, lisensiert tredjepart — dette er den eneste delen av prosessen som ikke kan gjøres 100 % lokalt, uten server. Hvis sertifikatet ditt er kvalifisert, oppfyller en PAdES-signatur laget med det kravene til QES; bruker du et selvsignert eller firmasertifikat, oppretter du en juridisk gyldig avansert elektronisk signatur, men ikke en kvalifisert en. Sjekk de juridiske kravene som gjelder for ditt bruksområde.',
      },
    ],
  },
  sv: {
    title: 'Säkerhet',
    updated: 'Senast uppdaterad: 25 juni 2026',
    intro: 'OptimaPDF lägger störst vikt vid dataskydd. Nedan presenterar vi en detaljerad beskrivning av de säkerhetsåtgärder vi använder för att skydda dina filer och data när du använder våra verktyg.',
    sections: [
      {
        h: '1. Client-side behandling i webbläsaren',
        p: 'De flesta OptimaPDF-verktygen använder en zero-trust-arkitektur — din fil lämnar aldrig din enhet. Vi använder WebAssembly och JavaScript för att behandla PDF-filer direkt i din webbläsare. Detta betyder att även vi, som tjänsteoperatörer, inte har tillgång till dina filer. Detta gäller: slå ihop, dela, rotera, vattenstämpling, sidnummering, beskära, redigera, signera, sudda ut, platta ut, ta bort sidor, extrahera sidor, ordna om sidor, lägga till sida, metadata, PDF→SVG, PDF→EPUB, PDF→TXT, fylla i formulär, PDF→bilder, PDF/A, jämföra PDF, låsa upp och skydda med lösenord.',
      },
      {
        h: '2. TLS/SSL-kryptering',
        p: 'All kommunikation mellan din webbläsare och vår server är krypterad med TLS 1.3 (Transport Layer Security). Vi använder ett SSL-certifikat utfärdat av en betrodd certifieringsmyndighet. Detta betyder att data som överförs över internet är oläsbar för tredje part. Du kan verifiera certifikatets giltighet genom att klicka på hänglåsikonen i din webbläsares adressfält.',
      },
      {
        h: '3. Content Security Policy (CSP)',
        p: 'Vi tillämpar en strikt Content Security Policy (CSP) som begränsar körning av skripter från obetrodda källor. CSP förhindrar Cross-Site Scripting (XSS)-attacker, kodinjektion och datastöld. Vår CSP-policy revideras och uppdateras regelbundet.',
      },
      {
        h: '4. Enbart RAM-behandling',
        p: 'För verktyg som kräver serverbehandling (komprimering, OCR, formatkonverteringar), behandlas filerna uteslutande i serverns RAM. Filerna skrivs inte till hårddisken, kopieras inte till säkerhetskopieringar och replikeras inte. När operationen är klar tas filen omedelbart bort från minnet. Maximal lagringstid på servern: några få sekunder.',
      },
      {
        h: '5. Filverifiering',
        items: [
          'Magic bytes-verifiering — före behandling verifierar vi att den uppladdade filen faktiskt är en PDF genom att analysera filens huvud (%PDF). Detta förhindrar attacker av typen filtypsförfalskning.',
          'Filstorleksgräns — maximal uppladdningsstorlek är 100 MB. Detta skyddar både mot serveröverbelastning och potentiella DoS-attacker.',
          'Integritetskontroll — vi verifierar att filen inte är skadad före behandlingens start.',
        ],
      },
      {
        h: '6. Skydd mot attacker',
        items: [
          'CSRF-skydd — vi använder anti-CSRF-token och Origin/Referer-huvudverifiering för att förhindra Cross-Site Request Forgery-attacker.',
          'Rate limiting — vi begränsar förfrågningar från en enda IP-adress, vilket skyddar mot brute-force- och DoS-attacker.',
          'HTTP-säkerhetshuvuden — vi tillämpar X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) och Referrer-Policy-huvuden.',
          'Inmatningsvalidering — all inmatningsdata valideras både på klientsidan och serversidan, vilket förhindrar injektionsattacker.',
        ],
      },
      {
        h: '7. Noll datalagring',
        p: 'Vi lagrar inte dina filer eller personuppgifter på servern. Vi kräver inte registrering, inloggning eller e-postadress för att använda verktygen. Vi skapar inte användarprofiler och spårar inte din aktivitet mellan besök.',
      },
      {
        h: '8. Säkerhet för AI-funktioner',
        p: 'AI-funktionerna använder det externa OpenRouter API:et. Din API-nyckel lagras uteslutande i webbläsarens localStorage — vi har inte tillgång till den. Text som skickas till OpenRouter är begränsat till innehåll extraherat från PDF:en. Vi skickar inte användaridentifierande data, IP-adress eller webbläsarinformation. OpenRouter använder TLS-kryptering och använder inte innehåll som skickats in för träning av AI-modeller.',
      },
      {
        h: '9. Beroendesäkerhet',
        p: 'Vi uppdaterar regelbundet alla bibliotek och beroenden som används i projektet. Vi använder automatiska sårbarhetsskannerverktyg (npm audit, Snyk). Alla kritiska sårbarheter åtgärdas inom 48 timmar efter CVE-publicering.',
      },
      {
        h: '10. Sårbarhetsrapportering',
        p: 'Om du upptäcker en säkerhetssårbarhet i OptimaPDF, vänligen rapportera den ansvarsfullt genom att skicka e-post till kontakt@optimapdf.com. Vi åtar oss att:',
        items: [
          'Bekräfta mottagandet inom 24 timmar.',
          'Genomföra analys och vidta åtgärdande åtgärder inom 14 dagar (beroende på allvarlighetsgrad).',
          'Informera anmälaren om vidtagna åtgärder.',
          'Inte vidta rättsliga åtgärder mot de som rapporterar sårbarheter ansvarsfullt.',
        ],
      },
      {
        h: '11. Säkerhet för filöverföring',
        p: 'I de sällsynta fallen där en fil måste skickas till servern (server-side verktyg), sker överföringen över en krypterad HTTPS-anslutning med TLS 1.3. Filen överförs i minnet (streaming) utan tillfällig disklagring. Efter att ha mottagit svaret tas filen omedelbart bort från serverminnet. Vi för inte loggar över filoperationer.',
      },
      {
        h: '12. Efterlevnad av standarder',
        p: 'Vi följer följande säkerhetsstandarder och rekommendationer:',
        items: [
          'OWASP Top 10 — skydd mot de vanligaste sårbarheterna i webapplikationer.',
          'GDPR — personuppgiftsskydd i enlighet med EU-förordning 2016/679.',
          'CERT Polska-riktlinjer — efterlevnad av rekommendationerna från det polska CERT-teamet.',
          'Mozilla Observatory — vi strävar efter ett A+-betyg i HTTP-huvuden:säkerhetstest.',
        ],
      },
      {
        h: '13. Kryptering av data i vila samt ISO 27001-/SOC 2-certifiering',
        p: 'De flesta åtgärder på dina filer sker uteslutande i din webbläsare och når aldrig någon server — det finns därför ingen "data i vila" på vår sida att kryptera. För de få verktyg som kräver serverbehandling (se punkt 4 och 11) finns filen enbart i serverns RAM-minne under några sekunder och raderas omedelbart efter att åtgärden slutförts — den skrivs aldrig till disk, säkerhetskopieras inte och lagras inte i någon databas, så begreppet "kryptering av data i vila" saknar i praktiken tillämpning här. Vi innehar ingen formell ISO 27001- eller SOC 2-certifiering. Det är kostsamma, fleråriga revisionsprogram som i första hand är utformade för organisationer som upprätthåller permanenta kunddatalager, driftsprocesser och team med flera anställda — i en arkitektur där servern aldrig behåller användardata alls saknar de flesta kontroller som dessa certifieringar omfattar sitt egentliga syfte. Istället tillämpar vi de alternativa, i källkoden verifierbara garantier som beskrivs i punkt 1–12 ovan (ingen lagring, krypterad överföring, CSP, attackskydd, en offentlig process för rapportering av sårbarheter).',
      },
      {
        h: '14. eIDAS och kvalificerad elektronisk underskrift (QES)',
        p: 'Verktyget "Signera PDF" erbjuder ett PAdES-signaturläge (en avancerad elektronisk underskrift) med ditt eget certifikat (.p12/.pfx) — hela åtgärden körs lokalt i din webbläsare; din fil och ditt certifikat laddas aldrig upp till någon server. Det här är en riktig kryptografisk signatur, inte bara en visuell bild av en underskrift. Viktigt förbehåll: denna signatur är INTE automatiskt en kvalificerad elektronisk underskrift (QES) enligt EU:s eIDAS-förordning (910/2014) — QES-status beror uteslutande på om ditt certifikat utfärdats av en kvalificerad betrodd tjänsteleverantör (QTSP) på en kvalificerad anordning för skapande av underskrifter. Utfärdande av ett sådant certifikat och identitetskontroll av innehavaren kräver med nödvändighet en extern, licensierad tredje part — det är den enda delen av processen som inte kan göras till 100 % lokalt, utan server. Om ditt certifikat är kvalificerat uppfyller en PAdES-signatur som skapats med det kraven för QES; använder du ett självsignerat eller företagscertifikat skapar du en juridiskt giltig avancerad elektronisk underskrift, men inte en kvalificerad sådan. Kontrollera de juridiska krav som gäller för ditt specifika användningsfall.',
      },
    ],
  },
  fr: {
    title: 'Sécurité',
    updated: 'Dernière mise à jour : 25 juin 2026',
    intro: 'OptimaPDF accorde la plus grande importance à la sécurité des données. Vous trouverez ci-dessous une description détaillée des mesures de sécurité que nous mettons en œuvre pour protéger vos fichiers et vos données lors de l\'utilisation de nos outils.',
    sections: [
      {
        h: '1. Traitement côté client dans le navigateur',
        p: 'La plupart des outils OptimaPDF fonctionnent avec une architecture zero-trust — votre fichier ne quitte jamais votre appareil. Nous utilisons WebAssembly et JavaScript pour traiter les fichiers PDF directement dans votre navigateur. Cela signifie que même nous, en tant qu\'opérateurs du service, n\'avons pas accès à vos fichiers. Cela s\'applique à : fusionner, diviser, tourner, filigrane, numérotation des pages, recadrer, modifier, signer, flouter, aplatir, supprimer des pages, extraire des pages, réorganiser des pages, ajouter une page, métadonnées, PDF→SVG, PDF→EPUB, PDF→TXT, remplir des formulaires, PDF→images, PDF/A, comparer PDF, déverrouiller et protéger par mot de passe.',
      },
      {
        h: '2. Chiffrement TLS/SSL',
        p: 'Toute la communication entre votre navigateur et notre serveur est chiffrée à l\'aide de TLS 1.3 (Transport Layer Security). Nous utilisons un certificat SSL émis par une autorité de certification de confiance. Cela signifie que les données transmises sur Internet sont illisibles par des tiers. Vous pouvez vérifier la validité du certificat en cliquant sur l\'icône de cadenas dans la barre d\'adresse de votre navigateur.',
      },
      {
        h: '3. Content Security Policy (CSP)',
        p: 'Nous appliquons une Content Security Policy (CSP) stricte qui restreint l\'exécution de scripts provenant de sources non fiables. Le CSP prévient les attaques de type Cross-Site Scripting (XSS), l\'injection de code et le vol de données. Notre politique CSP est régulièrement auditée et mise à jour.',
      },
      {
        h: '4. Traitement exclusif en RAM',
        p: 'Pour les outils nécessitant un traitement côté serveur (compression, OCR, conversions de formats), les fichiers sont traités exclusivement en RAM du serveur. Les fichiers ne sont pas écrits sur le disque dur, pas copiés dans des sauvegardes et pas répliqués. Une fois l\'opération terminée, le fichier est immédiatement supprimé de la mémoire. Durée de rétention maximale sur le serveur : quelques secondes.',
      },
      {
        h: '5. Vérification des fichiers',
        items: [
          'Vérification des magic bytes — avant le traitement, nous vérifions que le fichier téléchargé est bien un PDF en analysant son en-tête (%PDF). Cela prévient les attaques de falsification de type de fichier.',
          'Limite de taille de fichier — la taille maximale de téléchargement est de 100 Mo. Cela protège à la fois contre la surcharge du serveur et les attaques DoS potentielles.',
          'Vérification d\'intégrité — nous vérifions que le fichier n\'est pas endommagé avant de commencer le traitement.',
        ],
      },
      {
        h: '6. Protection contre les attaques',
        items: [
          'Protection CSRF — nous utilisons des jetons anti-CSRF et la vérification des en-têtes Origin/Referer pour prévenir les attaques Cross-Site Request Forgery.',
          'Rate limiting — nous limitons les requêtes depuis une seule adresse IP, protégeant contre les attaques par force brute et les attaques DoS.',
          'En-têtes de sécurité HTTP — nous appliquons les en-têtes X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) et Referrer-Policy.',
          'Validation des entrées — toutes les données d\'entrée sont validées tant côté client que côté serveur, prévenant les attaques par injection.',
        ],
      },
      {
        h: '7. Stockage zéro de données',
        p: 'Nous ne stockons pas vos fichiers ni vos données personnelles sur le serveur. Nous n\'exigeons pas d\'inscription, de connexion ni d\'adresse e-mail pour utiliser les outils. Nous ne créons pas de profils utilisateurs et ne suivons pas votre activité entre les visites.',
      },
      {
        h: '8. Sécurité des fonctions IA',
        p: 'Les fonctions IA utilisent l\'API externe OpenRouter. Votre clé API est stockée exclusivement dans le localStorage de votre navigateur — nous n\'y avons pas accès. Le texte envoyé à OpenRouter est limité au contenu extrait du PDF. Nous n\'envoyons pas de données d\'identification utilisateur, d\'adresse IP ni d\'informations sur le navigateur. OpenRouter utilise le chiffrement TLS et n\'utilise pas le contenu soumis pour l\'entraînement de modèles IA.',
      },
      {
        h: '9. Sécurité des dépendances',
        p: 'Nous mettons régulièrement à jour toutes les bibliothèques et dépendances utilisées dans le projet. Nous utilisons des outils de scan automatique des vulnérabilités (npm audit, Snyk). Toutes les vulnérabilités critiques sont corrigées dans les 48 heures suivant la publication du CVE.',
      },
      {
        h: '10. Divulgation des vulnérabilités',
        p: 'Si vous découvrez une vulnérabilité de sécurité dans OptimaPDF, veuillez la divulguer de manière responsable en envoyant un e-mail à kontakt@optimapdf.com. Nous nous engageons à :',
        items: [
          'Accuser réception dans les 24 heures.',
          'Effectuer une analyse et prendre des mesures correctives dans les 14 jours (selon la gravité).',
          'Informer le déclarant des mesures prises.',
          'Ne pas engager de poursuites judiciaires contre les personnes qui divulguent les vulnérabilités de manière responsable.',
        ],
      },
      {
        h: '11. Sécurité de la transmission des fichiers',
        p: 'Dans les rares cas où un fichier doit être envoyé au serveur (outils côté serveur), la transmission se fait via une connexion HTTPS chiffrée utilisant TLS 1.3. Le fichier est transmis en mémoire (streaming) sans stockage temporaire sur disque. Après réception de la réponse, le fichier est immédiatement supprimé de la mémoire du serveur. Nous ne conservons pas de journaux des opérations sur les fichiers.',
      },
      {
        h: '12. Conformité aux normes',
        p: 'Nous respectons les normes et recommandations de sécurité suivantes :',
        items: [
          'OWASP Top 10 — protection contre les vulnérabilités les plus courantes des applications web.',
          'RGPD — protection des données personnelles conformément au règlement UE 2016/679.',
          'Directives de CERT Polska — suivi des recommandations de l\'équipe CERT polonaise.',
          'Mozilla Observatory — nous visons une note A+ au test de sécurité des en-têtes HTTP.',
        ],
      },
      {
        h: '13. Chiffrement des données au repos et certifications ISO 27001 / SOC 2',
        p: 'La plupart des opérations sur vos fichiers s\'effectuent entièrement dans votre navigateur et n\'atteignent jamais aucun serveur — il n\'existe donc, de notre côté, aucune « donnée au repos » à chiffrer. Pour les quelques outils nécessitant un traitement côté serveur (voir points 4 et 11), le fichier n\'existe que dans la mémoire RAM du serveur pendant quelques secondes et est supprimé immédiatement après l\'opération — il n\'est jamais écrit sur disque, sauvegardé ni stocké dans une base de données, si bien que la notion de « chiffrement des données au repos » ne s\'applique pas réellement ici. Nous ne détenons pas de certification formelle ISO 27001 ni SOC 2. Ce sont des programmes d\'audit coûteux et pluriannuels, conçus avant tout pour des organisations qui conservent des entrepôts de données clients persistants, des processus opérationnels et des équipes de plusieurs personnes — dans une architecture où le serveur ne conserve jamais aucune donnée utilisateur, la plupart des contrôles couverts par ces certifications n\'ont tout simplement plus d\'objet. Nous appliquons à la place les garanties alternatives, vérifiables dans le code source, décrites aux points 1 à 12 ci-dessus (zéro stockage, transmission chiffrée, CSP, protections contre les attaques, un processus public de signalement des vulnérabilités).',
      },
      {
        h: '14. eIDAS et signature électronique qualifiée (QES)',
        p: 'L\'outil « Signer PDF » propose un mode de signature numérique PAdES (une signature électronique avancée) utilisant votre propre certificat (.p12/.pfx) — l\'ensemble de l\'opération s\'exécute localement dans votre navigateur ; votre fichier et votre certificat ne sont jamais envoyés à un serveur. Il s\'agit d\'une véritable signature cryptographique, et non d\'une simple image visuelle de signature. Avertissement important : cette signature n\'est PAS automatiquement une signature électronique qualifiée (QES) au sens du règlement eIDAS de l\'UE (910/2014) — le statut QES dépend exclusivement du fait que votre certificat ait été délivré par un prestataire de services de confiance qualifié (QTSP) sur un dispositif qualifié de création de signature. La délivrance d\'un tel certificat et la vérification de l\'identité de son titulaire nécessitent par nature un tiers externe et agréé — c\'est le seul élément de ce processus qui ne peut pas être réalisé à 100 % localement, sans serveur. Si votre certificat est qualifié, une signature PAdES réalisée avec celui-ci répond aux exigences d\'une QES ; si vous utilisez un certificat auto-signé ou d\'entreprise, vous créez une signature électronique avancée juridiquement valable, mais non qualifiée. Vérifiez les exigences légales applicables à votre cas d\'usage.',
      },
    ],
  },
  ar: {
    title: 'الأمان',
    updated: 'آخر تحديث: 25 يونيو 2026',
    intro: 'تضع OptimaPDF أهمية قصوى على أمان البيانات. فيما يلي وصف مفصل لتدابير الأمان التي نستخدمها لحماية ملفاتك وبياناتك عند استخدام أدواتنا.',
    sections: [
      {
        h: '1. المعالجة من جانب العميل في المتصفح',
        p: 'تعمل معظم أدوات OptimaPDF على معمارية zero-trust — ملفك لا يغادر أبداً جهازك. نستخدم WebAssembly و JavaScript لمعالجة ملفات PDF مباشرة في متصفحك. هذا يعني أن حتى نحن كمشغلي الخدمة ليس لدينا الوصول إلى ملفاتك. ينطبق هذا على: دمج، تقسيم، تدوير، علامة مائية، ترقيم الصفحات، قص، تعديل، توقيع، حذف النص، تسطيح، حذف الصفحات، استخراج الصفحات، إعادة ترتيب الصفحات، إضافة صفحة، البيانات الوصفية، PDF→SVG، PDF→EPUB، PDF→TXT، ملء النماذج، PDF→صور، PDF/A، مقارنة PDF، فتح القفل والحماية بكلمة مرور.',
      },
      {
        h: '2. تشفير TLS/SSL',
        p: 'جميع الاتصالات بين متصفحك وخادمنا مشفرة باستخدام TLS 1.3 (Transport Layer Security). نستخدم شهادة SSL صادرة عن جهة إصدار شهادات موثوقة. هذا يعني أن البيانات المنقولة عبر الإنترنت غير مقروءة لأطراف ثالثة. يمكنك التحقق من صحة الشهادة بالنقر على أيقونة القفل في شريط العنوان في متصفحك.',
      },
      {
        h: '3. Content Security Policy (CSP)',
        p: 'نفرض سياسة Content Security Policy (CSP) صارمة تقييد تنفيذ السكريبتات من مصادر غير موثوقة. يمنع CSP هجمات Cross-Site Scripting (XSS) وحقن الكود وسرقة البيانات. يتم تدقيق سياسة CSP لدينا وتحديثها بانتظام.',
      },
      {
        h: '4. المعالجة في RAM فقط',
        p: 'للأدوات التي تتطلب معالجة من جانب الخادم (الضغط، OCR، تحويلات التنسيق)، تتم معالجة الملفات حصرياً في ذاكرة الوصول العشوائي (RAM) للخادم. لا يتم كتابة الملفات على القرص الصلب، ولا نسخها إلى النسخ الاحتياطية، أو تكرارها. بمجرد اكتمال العملية، يتم حذف الملف فوراً من الذاكرة. أقصى وقت احتفاظ بالملف على الخادم: بضع ثوانٍ.',
      },
      {
        h: '5. التحقق من الملفات',
        items: [
          'التحقق من البايتات السحرية — قبل المعالجة، نتحقق من أن الملف الذي تم رفعه هو فعلياً ملف PDF عن طريق تحليل ترويسة (%PDF). هذا يمنع هجمات تزوير نوع الملف.',
          'حد حجم الملف — الحد الأقصى لحجم الرفع هو 100 ميجابايت. هذا يحمي من تحميل الخادم الزائد ومن هجمات DoS المحتملة.',
          'فحص السلامة — نتحقق من أن الملف غير تالف قبل بدء المعالجة.',
        ],
      },
      {
        h: '6. الحماية من الهجمات',
        items: [
          'حماية CSRF — نستخدم رموز anti-CSRF والتحقق من ترويسات Origin/Referer لمنع هجمات Cross-Site Request Forgery.',
          'Rate Limiting — نقيّد الطلبات من عنوان IP واحد، مما يحمي من هجمات brute-force و DoS.',
          'ترويسات HTTP الأمنية — نطبق ترويسات X-Content-Type-Options (nosniff) و X-Frame-Options (DENY) و Strict-Transport-Security (HSTS) و Referrer-Policy.',
          'التحقق من المدخلات — يتم التحقق من جميع بيانات المدخلات من جانب العميل كما من جانب الخادم، مما يمنع هجمات الحقن.',
        ],
      },
      {
        h: '7. عدم تخزين البيانات',
        p: 'لا نخزّن ملفاتك أو بياناتك الشخصية على الخادم. لا نطلب التسجيل أو تسجيل الدخول أو عنوان البريد الإلكتروني لاستخدام الأدوات. لا ننشئ ملفات تعريف للمستخدمين أو نتتبع نشاطك بين الزيارات.',
      },
      {
        h: '8. أمان وظائف الذكاء الاصطناعي',
        p: 'تستخدم وظائف الذكاء الاصطناعي واجهة برمجة التطبيقات الخارجية OpenRouter. يتم تخزين مفتاح API الخاص بك حصرياً في localStorage في متصفحك — ليس لدينا الوصول إليه. النص المرسل إلى OpenRouter محدود بالمحتوى المستخرج من PDF. لا نرسل بيانات تعريف المستخدم أو عنوان IP أو معلومات المتصفح. يستخدم OpenRouter تشفير TLS ولا يستخدم المحتوى المرسل لتدريب نماذج الذكاء الاصطناعي.',
      },
      {
        h: '9. أمان التبعيات',
        p: 'نقوم بتحديث جميع المكتبات والتبعيات المستخدمة في المشروع بانتظام. نستخدم أدوات فحص الثغرات الأمنية التلقائية (npm audit، Snyk). يتم رفع جميع الثغرات الحرجة خلال 48 ساعة من نشر CVE.',
      },
      {
        h: '10. الإبلاغ عن الثغرات',
        p: 'إذا اكتشفت ثغرة أمنية في OptimaPDF، يرجى الإبلاغ عنها بشكل مسؤول عن طريق إرسال بريد إلكتروني إلى kontakt@optimapdf.com. نلتزم بـ:',
        items: [
          'تأكيد الاستلام خلال 24 ساعة.',
          'إجراء تحليل واتخاذ إجراءات تصحيحية خلال 14 يوماً (حسب الخطورة).',
          'إبلاغ المُبلّغ بالإجراءات المتخذة.',
          'عدم اتخاذ إجراءات قانونية ضد الأشخاص الذين يكشفون عن الثغرات بشكل مسؤول.',
        ],
      },
      {
        h: '11. أمان نقل الملفات',
        p: 'في الحالات النادرة التي يجب فيها إرسال ملف إلى الخادم (أدوات جانب الخادم)، يحدث النقل عبر اتصال HTTPS مشفر باستخدام TLS 1.3. يتم نقل الملف في الذاكرة (البث) بدون تخزين مؤقت على القرص. بعد استلام الرد، يتم حذف الملف فوراً من ذاكرة الخادم. لا نحتفظ بسجلات لعمليات الملفات.',
      },
      {
        h: '12. الامتثال للمعايير',
        p: 'نتبع معايير وتوصيات الأمان التالية:',
        items: [
          'OWASP Top 10 — الحماية من أكثر الثغرات شيوعاً في تطبيقات الويب.',
          'GDPR — حماية البيانات الشخصية وفقاً للائحة الاتحاد الأوروبي 2016/679.',
          'إرشادات CERT Polska — اتباع توصيات فريق CERT البولندي.',
          'Mozilla Observatory — نهدف إلى الحصول على تقييم A+ في اختبار أمان ترويسات HTTP.',
        ],
      },
      {
        h: '13. تشفير البيانات الساكنة وشهادات ISO 27001 / SOC 2',
        p: 'تتم معظم العمليات على ملفاتك بالكامل داخل متصفحك ولا تصل أبداً إلى أي خادم — لذلك لا توجد من جانبنا أي "بيانات ساكنة" لتشفيرها أصلاً. بالنسبة للأدوات القليلة التي تتطلب معالجة على الخادم (انظر البندين 4 و11)، لا يوجد الملف إلا في ذاكرة الوصول العشوائي (RAM) للخادم لبضع ثوانٍ ويُحذف فوراً بعد اكتمال العملية — لا يُكتب أبداً على القرص، ولا يُنسخ احتياطياً، ولا يُخزَّن في أي قاعدة بيانات، لذا فإن مفهوم "تشفير البيانات الساكنة" لا ينطبق عملياً هنا. لا نملك شهادة رسمية ISO 27001 أو SOC 2. هذه برامج تدقيق مكلفة ومتعددة السنوات، مصممة بالأساس للمؤسسات التي تحتفظ بمخازن بيانات عملاء دائمة، وعمليات تشغيلية، وفرق عمل متعددة الأفراد — وفي بنية لا يحتفظ فيها الخادم بأي بيانات للمستخدم على الإطلاق، تفقد معظم الضوابط التي تغطيها هذه الشهادات موضوعها أصلاً. بدلاً من ذلك، نعتمد الضمانات البديلة القابلة للتحقق من الكود المصدري، الموضحة في البنود من 1 إلى 12 أعلاه (عدم التخزين، النقل المشفر، سياسة أمان المحتوى CSP، الحماية من الهجمات، عملية علنية للإبلاغ عن الثغرات).',
      },
      {
        h: '14. eIDAS والتوقيع الإلكتروني المؤهل (QES)',
        p: 'توفر أداة "توقيع PDF" وضع توقيع رقمي PAdES (توقيع إلكتروني متقدم) باستخدام شهادتك الخاصة (.p12/.pfx) — تتم العملية بأكملها محلياً داخل متصفحك؛ لا يُرفع ملفك ولا شهادتك أبداً إلى أي خادم. هذا توقيع تشفيري حقيقي، وليس مجرد صورة مرئية لتوقيع. ملاحظة مهمة: هذا التوقيع لا يُعد تلقائياً توقيعاً إلكترونياً مؤهلاً (QES) بموجب لائحة eIDAS الأوروبية (910/2014) — فحالة QES تعتمد كلياً على ما إذا كانت شهادتك صادرة عن مزوّد خدمات ثقة مؤهل (QTSP) على جهاز إنشاء توقيع مؤهل. إصدار مثل هذه الشهادة والتحقق من هوية حاملها يتطلبان بالضرورة طرفاً ثالثاً خارجياً مرخصاً — وهذا هو الجزء الوحيد من هذه العملية الذي لا يمكن إنجازه محلياً بنسبة 100% دون خادم. إذا كانت شهادتك مؤهلة، فإن توقيع PAdES المُنشأ بها يستوفي متطلبات QES؛ أما إذا استخدمت شهادة موقعة ذاتياً أو شهادة شركة، فإنك تُنشئ توقيعاً إلكترونياً متقدماً صالحاً قانونياً، لكنه غير مؤهل. تحقق من المتطلبات القانونية المطبقة على حالة استخدامك.',
      },
    ],
  },
  fa: {
    title: 'امنیت',
    updated: 'آخرین به‌روزرسانی: ۲۵ ژوئن ۲۰۲۶',
    intro: 'OptimaPDF بالاترین اهمیت را به امنیت داده‌ها اختصاص می‌دهد. در زیر شرح مفصلی از اقدامات امنیتی که برای محافظت از فایل‌ها و داده‌های شما هنگام استفاده از ابزارهای ما به کار می‌بریم، ارائه شده است.',
    sections: [
      {
        h: '۱. پردازش سمت کلاینت در مرورگر',
        p: 'اکثر ابزارهای OptimaPDF بر معماری zero-trust کار می‌کنند — فایل شما هرگز دستگاه شما را ترک نمی‌کند. ما از WebAssembly و JavaScript برای پردازش فایل‌های PDF به طور مستقیم در مرورگر شما استفاده می‌کنیم. این بدان معناست که حتی ما به عنوان اپراتورهای سرویس، به فایل‌های شما دسترسی نداریم. این مورد شامل موارد زیر می‌شود: ادغام، تقسیم، چرخش، واترمارک، شماره‌گذاری صفحات، برش، ویرایش، امضا، حذف متن، تسطیح، حذف صفحات، استخراج صفحات، ترتیب مجدد صفحات، افزودن صفحه، فراداده، PDF→SVG، PDF→EPUB، PDF→TXT، پر کردن فرم‌ها، PDF→تصاویر، PDF/A، مقایسه PDF، باز کردن قفل و محافظت با رمز عبور.',
      },
      {
        h: '۲. رمزگذاری TLS/SSL',
        p: 'تمام ارتباطات بین مرورگر شما و سرور ما با استفاده از TLS 1.3 (Transport Layer Security) رمزگذاری شده است. ما از گواهی SSL صادر شده توسط یک مرجع صدور گواهی معتبر استفاده می‌کنیم. این بدان معناست که داده‌های منتقل شده از طریق اینترنت برای اشخاص ثالث غیرقابل خواندن هستند. شما می‌توانید اعتبار گواهی را با کلیک روی آیکون قفل در نوار آدرس مرورگر خود بررسی کنید.',
      },
      {
        h: '۳. Content Security Policy (CSP)',
        p: 'ما یک سیاست امنیت محتوا (CSP) سخت‌گیرانه اعمال می‌کنیم که اجرای اسکریپت‌ها از منابع غیرقابل اعتماد را محدود می‌کند. CSP از حملات Cross-Site Scripting (XSS)، تزریق کد و سرقت داده جلوگیری می‌کند. سیاست CSP ما به طور منظم بازبینی و به‌روزرسانی می‌شود.',
      },
      {
        h: '۴. پردازش فقط در RAM',
        p: 'برای ابزارهایی که نیاز به پردازش سمت سرور دارند (فشرده‌سازی، OCR، تبدیل فرمت‌ها)، فایل‌ها به طور انحصاری در حافظه RAM سرور پردازش می‌شوند. فایل‌ها روی هارد دیسک نوشته نمی‌شوند، در پشتیبان‌ها کپی نمی‌شوند و تکرار نمی‌شوند. پس از تکمیل عملیات، فایل بلافاصله از حافظه حذف می‌شود. حداکثر زمان نگهداری فایل در سرور: چند ثانیه.',
      },
      {
        h: '۵. بررسی فایل‌ها',
        items: [
          'بررسی magic bytes — قبل از پردازش، ما تأیید می‌کنیم که فایل بارگذاری شده واقعاً یک PDF است با تحلیل هدر آن (%PDF). این از حملات جعل نوع فایل جلوگیری می‌کند.',
          'محدودیت اندازه فایل — حداکثر اندازه آپلود ۱۰۰ مگابایت است. این هم از بار اضافی سرور و هم از حملات احتمالی DoS محافظت می‌کند.',
          'بررسی سلامت — ما تأیید می‌کنیم که فایل قبل از شروع پردازش خراب نیست.',
        ],
      },
      {
        h: '۶. محافظت در برابر حملات',
        items: [
          'محافظت CSRF — ما از توکن‌های anti-CSRF و بررسی هدرهای Origin/Referer برای جلوگیری از حملات Cross-Site Request Forgery استفاده می‌کنیم.',
          'Rate Limiting — ما درخواست‌ها را از یک آدرس IP واحد محدود می‌کنیم و از حملات brute-force و DoS محافظت می‌کنیم.',
          'هدرهای امنیتی HTTP — ما هدرهای X-Content-Type-Options (nosniff)، X-Frame-Options (DENY)، Strict-Transport-Security (HSTS) و Referrer-Policy را اعمال می‌کنیم.',
          'اعتبارسنجی ورودی — تمام داده‌های ورودی هم در سمت کلاینت و هم در سمت سرور اعتبارسنجی می‌شوند و از حملات تزریق جلوگیری می‌شود.',
        ],
      },
      {
        h: '۷. عدم ذخیره‌سازی داده‌ها',
        p: 'ما فایل‌ها یا داده‌های شخصی شما را روی سرور ذخیره نمی‌کنیم. ما برای استفاده از ابزارها نیازی به ثبت‌نام، ورود یا آدرس ایمیل نداریم. ما پروفایل کاربر ایجاد نمی‌کنیم و فعالیت شما را بین بازدیدها ردیابی نمی‌کنیم.',
      },
      {
        h: '۸. امنیت ویژگی‌های هوش مصنوعی',
        p: 'ویژگی‌های هوش مصنوعی از API خارجی OpenRouter استفاده می‌کنند. کلید API شما به طور انحصاری در localStorage مرورگر شما ذخیره می‌شود — ما به آن دسترسی نداریم. متن ارسال شده به OpenRouter محدود به محتوای استخراج شده از PDF است. ما داده‌های شناسایی کاربر، آدرس IP یا اطلاعات مرورگر ارسال نمی‌کنیم. OpenRouter از رمزگذاری TLS استفاده می‌کند و محتوای ارسال شده را برای آموزش مدل‌های هوش مصنوعی استفاده نمی‌کند.',
      },
      {
        h: '۹. امنیت وابستگی‌ها',
        p: 'ما به طور منظم تمام کتابخانه‌ها و وابستگی‌های مورد استفاده در پروژه را به‌روزرسانی می‌کنیم. ما از ابزارهای اسکن خودکار آسیب‌پذیری (npm audit, Snyk) استفاده می‌کنیم. تمام آسیب‌پذیری‌های بحرانی ظرف ۴۸ ساعت پس از انتشار CVE رفع می‌شوند.',
      },
      {
        h: '۱۰. افشای آسیب‌پذیری‌ها',
        p: 'اگر آسیب‌پذیری امنیتی در OptimaPDF کشف کردید، لطفاً آن را به طور مسئولانه با ارسال ایمیل به kontakt@optimapdf.com افشا کنید. ما متعهد می‌شویم:',
        items: [
          'تأیید دریافت ظرف ۲۴ ساعت.',
          'انجام تحلیل و اقدامات اصلاحی ظرف ۱۴ روز (بسته به شدت).',
          'اطلاع‌رسانی به گزارش‌دهنده در مورد اقدامات انجام شده.',
          'عدم اقدام قانونی علیه اشخاصی که آسیب‌پذیری‌ها را به طور مسئولانه افشا می‌کنند.',
        ],
      },
      {
        h: '۱۱. امنیت انتقال فایل‌ها',
        p: 'در موارد نادری که فایل باید به سرور ارسال شود (ابزارهای سمت سرور)، انتقال از طریق اتصال HTTPS رمزگذاری شده با TLS 1.3 انجام می‌شود. فایل در حافظه (Streaming) منتقل می‌شود بدون ذخیره‌سازی موقت روی دیسک. پس از دریافت پاسخ، فایل بلافاصله از حافظه سرور حذف می‌شود. ما لاگی از عملیات فایل‌ها نگهداری نمی‌کنیم.',
      },
      {
        h: '۱۲. انطباق با استانداردها',
        p: 'ما از استانداردها و توصیه‌های امنیتی زیر پیروی می‌کنیم:',
        items: [
          'OWASP Top 10 — محافظت در برابر رایج‌ترین آسیب‌پذیری‌های برنامه‌های کاربردی وب.',
          'GDPR — محافظت از داده‌های شخصی مطابق با مقررات اتحادیه اروپا ۲۰۱۶/۶۷۹.',
          'دستورالعمل‌های CERT Polska — پیروی از توصیه‌های تیم CERT لهستان.',
          'Mozilla Observatory — ما به دنبال رتبه A+ در تست امنیت هدرهای HTTP هستیم.',
        ],
      },
      {
        h: '۱۳. رمزگذاری داده‌های در حالت سکون و گواهی‌نامه‌های ISO 27001 / SOC 2',
        p: 'بیشتر عملیات روی فایل‌های شما به‌طور کامل در مرورگرتان انجام می‌شود و هرگز به هیچ سروری نمی‌رسد — بنابراین اصلاً هیچ "داده‌ای در حالت سکون" در سمت ما وجود ندارد که رمزگذاری شود. برای معدود ابزارهایی که به پردازش سمت سرور نیاز دارند (بند ۴ و ۱۱ را ببینید)، فایل فقط برای چند ثانیه در حافظه RAM سرور وجود دارد و بلافاصله پس از پایان عملیات حذف می‌شود — هرگز روی دیسک نوشته نمی‌شود، پشتیبان‌گیری نمی‌شود و در هیچ پایگاه‌داده‌ای ذخیره نمی‌شود، بنابراین مفهوم "رمزگذاری داده‌های در حالت سکون" در عمل در اینجا کاربردی ندارد. ما گواهی‌نامه رسمی ISO 27001 یا SOC 2 نداریم. این‌ها فرآیندهای ممیزی پرهزینه و چندساله‌ای هستند که عمدتاً برای سازمان‌هایی طراحی شده‌اند که انبارهای داده دائمی مشتریان، فرآیندهای عملیاتی و تیم‌های چندنفره را نگه می‌دارند — در معماری‌ای که سرور اصلاً هیچ داده‌ای از کاربر را نگه نمی‌دارد، بیشتر کنترل‌های تحت پوشش این گواهی‌نامه‌ها اصلاً موضوعی برای اعمال شدن ندارند. در عوض، ما از تضمین‌های جایگزین و قابل‌راستی‌آزمایی در کد منبع که در بندهای ۱ تا ۱۲ بالا توضیح داده شد استفاده می‌کنیم (ذخیره‌سازی صفر، انتقال رمزگذاری‌شده، CSP، محافظت در برابر حملات، فرآیندی عمومی برای گزارش آسیب‌پذیری‌ها).',
      },
      {
        h: '۱۴. eIDAS و امضای الکترونیکی واجد شرایط (QES)',
        p: 'ابزار "امضا کردن PDF" حالت امضای دیجیتال PAdES (امضای الکترونیکی پیشرفته) را با استفاده از گواهی خودتان (.p12/.pfx) ارائه می‌دهد — کل عملیات به‌صورت محلی در مرورگر شما اجرا می‌شود؛ فایل و گواهی شما هرگز در هیچ سروری بارگذاری نمی‌شوند. این یک امضای رمزنگاری‌شده واقعی است، نه صرفاً یک تصویر بصری از امضا. نکته مهم: این امضا به‌طور خودکار یک امضای الکترونیکی واجد شرایط (QES) طبق مقررات eIDAS اتحادیه اروپا (۹۱۰/۲۰۱۴) محسوب نمی‌شود — وضعیت QES کاملاً به این بستگی دارد که آیا گواهی شما توسط یک ارائه‌دهنده خدمات اعتماد واجد شرایط (QTSP) روی یک دستگاه ایجاد امضای واجد شرایط صادر شده باشد یا خیر. صدور چنین گواهی‌ای و تأیید هویت دارنده آن ذاتاً به یک شخص ثالث خارجی و دارای مجوز نیاز دارد — این تنها بخشی از این فرآیند است که نمی‌توان آن را صد در صد به‌صورت محلی و بدون سرور انجام داد. اگر گواهی شما واجد شرایط باشد، امضای PAdES ایجادشده با آن الزامات QES را برآورده می‌کند؛ اگر از گواهی خوداِمضا یا سازمانی استفاده کنید، یک امضای الکترونیکی پیشرفته و از نظر قانونی معتبر ایجاد می‌کنید، اما واجد شرایط نیست. الزامات قانونی قابل‌اجرا برای مورد استفاده خاص خود را بررسی کنید.',
      },
    ],
  },
  hi: {
    title: 'सुरक्षा',
    updated: 'अंतिम अपडेट: 25 जून 2026',
    intro: 'OptimaPDF डेटा सुरक्षा को सर्वोच्च महत्व देता है। नीचे हमारे उपकरणों का उपयोग करते समय आपकी फ़ाइलों और डेटा की रक्षा के लिए अपनाई गई सुरक्षा उपायों का विस्तृत विवरण दिया गया है।',
    sections: [
      {
        h: '1. ब्राउज़र में क्लाइंट-साइड संचालन',
        p: 'OptimaPDF के अधिकांश उपकरण ज़ीरो-ट्रस्ट आर्किटेक्चर पर काम करते हैं — आपकी फ़ाइल कभी भी आपका डिवाइस नहीं छोड़ती। हम आपके ब्राउज़र में सीधे PDF फ़ाइलों को संचालित करने के लिए WebAssembly और JavaScript का उपयोग करते हैं। इसका मतलब है कि हम सेवा संचालक के रूप में भी आपकी फ़ाइलों तक पहुँच नहीं रखते। यह निम्नलिखित पर लागू होता है: विलय, विभाजन, घुमाव, वॉटरमार्क, पेज नंबरिंग, क्रॉप, संपादन, हस्ताक्षर, रेडैक्ट, फ़्लैटेन, पेज हटाना, पेज निकालना, पेज पुनर्क्रम, पेज जोड़ना, मेटाडेटा, PDF→SVG, PDF→EPUB, PDF→TXT, फ़ॉर्म भरना, PDF→छवियाँ, PDF/A, PDF की तुलना, अनलॉक और पासवर्ड से सुरक्षित करना।',
      },
      {
        h: '2. TLS/SSL एन्क्रिप्शन',
        p: 'आपके ब्राउज़र और हमारे सर्वर के बीच सभी संचार TLS 1.3 (Transport Layer Security) का उपयोग करके एन्क्रिप्ट किया गया है। हम एक विश्वसनीय प्रमाणपत्र प्राधिकरण द्वारा जारी SSL प्रमाणपत्र का उपयोग करते हैं। इसका मतलब है कि इंटरनेट पर प्रसारित डेटा तृतीय पक्षों के लिए अपठनीय है। आप अपने ब्राउज़र के पता बार में ताला आइकन पर क्लिक करके प्रमाणपत्र की वैधता की जाँच कर सकते हैं।',
      },
      {
        h: '3. Content Security Policy (CSP)',
        p: 'हम एक सख्त Content Security Policy (CSP) लागू करते हैं जो अविश्वसनीय स्रोतों से स्क्रिप्ट के निष्पादन को प्रतिबंधित करती है। CSP Cross-Site Scripting (XSS) हमलों, कोड इंजेक्शन और डेटा चोरी को रोकता है। हमारी CSP नीति का नियमित रूप से ऑडिट और अपडेट किया जाता है।',
      },
      {
        h: '4. केवल RAM में संचालन',
        p: 'सर्वर-साइड संचालन की आवश्यकता वाले उपकरणों (संपीड़न, OCR, प्रारूप रूपांतरण) के लिए, फ़ाइलें विशेष रूप से सर्वर की RAM में संचालित की जाती हैं। फ़ाइलें हार्ड ड्राइव पर नहीं लिखी जातीं, बैकअप में कॉपी नहीं की जातीं और न ही रिप्लिकेट की जाती हैं। ऑपरेशन पूरा होने के बाद, फ़ाइल तुरंत मेमोरी से हटा दी जाती है। सर्वर पर अधिकतम प्रतिधारण समय: कुछ सेकंड।',
      },
      {
        h: '5. फ़ाइल सत्यापन',
        items: [
          'मैजिक बाइट्स सत्यापन — संचालन से पहले, हम अपलोड की गई फ़ाइल के हेडर (%PDF) का विश्लेषण करके यह सत्यापित करते हैं कि वह वास्तव में एक PDF है। यह फ़ाइल-प्रकार स्पूफिंग हमलों को रोकता है।',
          'फ़ाइल आकार सीमा — अधिकतम अपलोड आकार 100 MB है। यह सर्वर अतिभार और संभावित DoS हमलों दोनों से बचाता है।',
          'अखंडता जाँच — हम संचालन शुरू करने से पहले यह सत्यापित करते हैं कि फ़ाइल दूषित नहीं है।',
        ],
      },
      {
        h: '6. हमलों से सुरक्षा',
        items: [
          'CSRF सुरक्षा — हम Cross-Site Request Forgery हमलों को रोकने के लिए एंटी-CSRF टोकन और Origin/Referer हेडर सत्यापन का उपयोग करते हैं।',
          'Rate Limiting — हम एक ही IP पते से अनुरोधों को सीमित करते हैं, ब्रूट-फ़ोर्स और DoS हमलों से बचाते हैं।',
          'HTTP सुरक्षा हेडर — हम X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) और Referrer-Policy हेडर लागू करते हैं।',
          'इनपुट सत्यापन — सभी इनपुट डेटा क्लाइंट और सर्वर दोनों पक्षों पर सत्यापित किया जाता है, जो इंजेक्शन हमलों को रोकता है।',
        ],
      },
      {
        h: '7. शून्य डेटा भंडारण',
        p: 'हम आपकी फ़ाइलों या व्यक्तिगत डेटा को सर्वर पर संग्रहीत नहीं करते। हम उपकरणों का उपयोग करने के लिए पंजीकरण, लॉगिन या ईमेल पते की आवश्यकता नहीं रखते। हम उपयोगकर्ता प्रोफ़ाइल नहीं बनाते और न ही विज़िट के बीच आपकी गतिविधि को ट्रैक करते हैं।',
      },
      {
        h: '8. AI सुविधा सुरक्षा',
        p: 'AI सुविधाएँ बाहरी OpenRouter API का उपयोग करती हैं। आपकी API कुंजी विशेष रूप से आपके ब्राउज़र के localStorage में संग्रहीत होती है — हमारी उस तक पहुँच नहीं होती। OpenRouter को भेजा गया पाठ PDF से निकाली गई सामग्री तक सीमित है। हम उपयोगकर्ता-पहचान वाला डेटा, IP पता या ब्राउज़र जानकारी नहीं भेजते। OpenRouter TLS एन्क्रिप्शन का उपयोग करता है और AI मॉडल प्रशिक्षण के लिए प्रस्तुत सामग्री का उपयोग नहीं करता।',
      },
      {
        h: '9. निर्भरता सुरक्षा',
        p: 'हम नियमित रूप से प्रोजेक्ट में उपयोग की जाने वाली सभी पुस्तकालयों और निर्भरताओं को अपडेट करते हैं। हम स्वचालित भेद्यता स्कैनिंग टूल (npm audit, Snyk) का उपयोग करते हैं। सभी गंभीर भेद्यताओं को CVE प्रकाशन के 48 घंटे के भीतर पैच किया जाता है।',
      },
      {
        h: '10. भेद्यता प्रकटीकरण',
        p: 'यदि आप OptimaPDF में कोई सुरक्षा भेद्यता खोजते हैं, तो कृपया kontakt@optimapdf.com पर ईमेल भेजकर जिम्मेदारी से इसका खुलासा करें। हम प्रतिबद्ध हैं:',
        items: [
          '24 घंटे के भीतर प्राप्ति की पुष्टि।',
          '14 दिनों के भीतर विश्लेषण और सुधारात्मक कार्रवाई (गंभीरता के अनुसार)।',
          'रिपोर्टर को की गई कार्रवाई के बारे में सूचित करना।',
          'जिम्मेदारी से भेद्यताओं का खुलासा करने वालों के खिलाफ कानूनी कार्रवाई न करना।',
        ],
      },
      {
        h: '11. फ़ाइल प्रसारण सुरक्षा',
        p: 'दुर्लभ मामलों में जहाँ फ़ाइल को सर्वर को भेजा जाना चाहिए (सर्वर-साइड उपकरण), TLS 1.3 का उपयोग करके एन्क्रिप्टेड HTTPS पर प्रसारण होता है। फ़ाइल मेमोरी में (Streaming) प्रसारित होती है बिना डिस्क पर अस्थायी भंडारण के। प्रतिक्रिया प्राप्त करने के बाद, फ़ाइल तुरंत सर्वर मेमोरी से हटा दी जाती है। हम फ़ाइल ऑपरेशन के लॉग नहीं रखते।',
      },
      {
        h: '12. मानक अनुपालन',
        p: 'हम निम्नलिखित सुरक्षा मानकों और सिफारिशों का पालन करते हैं:',
        items: [
          'OWASP Top 10 — वेब एप्लिकेशन की सबसे सामान्य भेद्यताओं से सुरक्षा।',
          'GDPR — EU विनियमन 2016/679 के अनुसार व्यक्तिगत डेटा की सुरक्षा।',
          'CERT Polska दिशानिर्देश — पोलिश CERT टीम की सिफारिशों का पालन करना।',
          'Mozilla Observatory — हम HTTP हेडर सुरक्षा परीक्षण में A+ रेटिंग का लक्ष्य रखते हैं।',
        ],
      },
      {
        h: '13. निष्क्रिय डेटा एन्क्रिप्शन और ISO 27001 / SOC 2 प्रमाणन',
        p: 'आपकी फ़ाइलों पर अधिकांश कार्रवाइयाँ पूरी तरह आपके ब्राउज़र में होती हैं और कभी किसी सर्वर तक नहीं पहुँचतीं — इसलिए हमारी ओर से एन्क्रिप्ट करने के लिए कोई "निष्क्रिय डेटा" (data at rest) मौजूद ही नहीं है। सर्वर-साइड प्रोसेसिंग की आवश्यकता वाले कुछ गिने-चुने टूल्स के लिए (बिंदु 4 और 11 देखें), फ़ाइल केवल कुछ सेकंड के लिए सर्वर की RAM में मौजूद रहती है और कार्रवाई पूरी होते ही तुरंत हटा दी जाती है — यह कभी डिस्क पर लिखी नहीं जाती, बैकअप नहीं ली जाती, और न ही किसी डेटाबेस में संग्रहीत होती है, इसलिए "निष्क्रिय डेटा एन्क्रिप्शन" की अवधारणा यहाँ व्यावहारिक रूप से लागू नहीं होती। हमारे पास औपचारिक ISO 27001 या SOC 2 प्रमाणन नहीं है। ये महंगी, बहु-वर्षीय ऑडिट प्रक्रियाएँ मुख्य रूप से उन संगठनों के लिए बनाई गई हैं जो स्थायी ग्राहक डेटा स्टोर, परिचालन प्रक्रियाएँ और बहु-सदस्यीय टीमें बनाए रखते हैं — ऐसी वास्तुकला में जहाँ सर्वर कभी भी उपयोगकर्ता डेटा नहीं रखता, इन प्रमाणनों के अधिकांश नियंत्रणों का वास्तव में कोई विषय ही नहीं बचता। इसके बजाय, हम ऊपर बिंदु 1–12 में वर्णित वैकल्पिक, स्रोत कोड में सत्यापन योग्य गारंटी लागू करते हैं (शून्य भंडारण, एन्क्रिप्टेड ट्रांसमिशन, CSP, हमलों से सुरक्षा, भेद्यता रिपोर्टिंग की सार्वजनिक प्रक्रिया)।',
      },
      {
        h: '14. eIDAS और योग्य इलेक्ट्रॉनिक हस्ताक्षर (QES)',
        p: '"PDF हस्ताक्षर करें" टूल आपके अपने सर्टिफिकेट (.p12/.pfx) का उपयोग करके PAdES डिजिटल हस्ताक्षर मोड (एडवांस्ड इलेक्ट्रॉनिक सिग्नेचर) प्रदान करता है — पूरी प्रक्रिया आपके ब्राउज़र में स्थानीय रूप से चलती है; आपकी फ़ाइल और सर्टिफिकेट कभी सर्वर पर अपलोड नहीं होते। यह केवल हस्ताक्षर की एक दृश्य छवि नहीं, बल्कि एक वास्तविक क्रिप्टोग्राफ़िक हस्ताक्षर है। महत्वपूर्ण चेतावनी: यह हस्ताक्षर EU के eIDAS विनियमन (910/2014) के तहत स्वतः योग्य इलेक्ट्रॉनिक हस्ताक्षर (QES) नहीं बन जाता — QES का दर्जा पूरी तरह इस बात पर निर्भर करता है कि आपका सर्टिफिकेट किसी योग्य ट्रस्ट सेवा प्रदाता (QTSP) द्वारा योग्य हस्ताक्षर निर्माण उपकरण पर जारी किया गया था या नहीं। ऐसा सर्टिफिकेट जारी करना और उसके धारक की पहचान सत्यापित करना, स्वभावतः किसी बाहरी, लाइसेंस-प्राप्त तीसरे पक्ष की आवश्यकता रखता है — प्रक्रिया का यही एकमात्र हिस्सा है जिसे सर्वर के बिना, 100% स्थानीय रूप से पूरा नहीं किया जा सकता। यदि आपका सर्टिफिकेट योग्य है, तो उससे बनाया गया PAdES हस्ताक्षर QES की आवश्यकताओं को पूरा करता है; यदि आप स्व-हस्ताक्षरित या कॉर्पोरेट सर्टिफिकेट का उपयोग करते हैं, तो आप कानूनी रूप से वैध एडवांस्ड इलेक्ट्रॉनिक हस्ताक्षर बनाते हैं, लेकिन योग्य नहीं। अपने विशिष्ट उपयोग के लिए लागू कानूनी आवश्यकताओं की जाँच करें।',
      },
    ],
  },
  is: {
    title: 'Öryggi',
    updated: 'Síðast uppfært: 25. júní 2026',
    intro: 'OptimaPDF leggur mestu áherslu á gagnöryggi. Hér að neðan er ítarleg lýsing á þeim öryggisráðstöfunum sem við beitum til að vernda skrár þínar og gögn þegar þú notar tækin okkar.',
    sections: [
      {
        h: '1. Vinnsla í vafrara (client-side)',
        p: 'Flest OptimaPDF tæki starfa á grundvelli zero-trust arkitektúrs — skráin þín yfirgæfir aldrei tækið þitt. Við notum WebAssembly og JavaScript til að meðhöndla PDF-skrár beint í vafraranum þínum. Þetta þýðir að jafnvel sem þjónustuaðilar höfum við engan aðgang að skránum þínum. Þetta á við um: sameiningu, sundursmíði, snúning, vatnsmerki, síðunúmer, skurð, ritstjórn, undirskriftir, afmörkun, flettingu, síðueyðingu, síðuúrtak, síðuendurröðun, síðuviðbót, hugtök, PDF→SVG, PDF→EPUB, PDF→TXT, eyðublöð, PDF→myndir, PDF/A, PDF-samanburð, aflæsingu og lykilorðavernd.',
      },
      {
        h: '2. TLS/SSL dulkóðun',
        p: 'Allt samskipti á milli vafrarans þins og þjónsins okkar eru dulkóðuð með TLS 1.3 (Transport Layer Security). Við notum SSL-vottorð frá viðurkenndum vottorðsaðila. Þetta þýðir að gögn sem flutt eru yfir internetið eru ólesanleg fyrir þriðja aðila. Þú getur athugað gildi vottorðsins með því að smella á lásatáknið í veffangastiku vafrarans þíns.',
      },
      {
        h: '3. Content Security Policy (CSP)',
        p: 'Við beitum ströngu Content Security Policy (CSP) sem kemur í veg fyrir keyrslu ótraustra skripta. CSP kemur í veg fyrir Cross-Site Scripting (XSS) árásir, kóðainnskeytingu og gagnastuld. Öryggisstefna okkar er endurskoðuð og uppfærð reglulega.',
      },
      {
        h: '4. Vinnsla eingöngu í vinnsluminni (RAM)',
        p: 'Fyrir tæki sem þurfa vinnslu á þjóni (þjöppun, OCR, sniðbreyting) eru skrárnar meðhöndlaðar eingöngu í vinnsluminni þjónsins. Skrárnar eru ekki skrifaðar á disk, ekki afritaðar í öryggisafrit og ekki endurhluttengdar. Eftir að aðgerðinni er lokið er skránni eytt úr minni strax. Hámarks geymslutími á þjóni: nokkrar sekúndur.',
      },
      {
        h: '5. Staðfesting á skrám',
        items: [
          'Staðfesting á gagnabótum (magic bytes) — áður en aðgerð hefst greinum við höfuðskrá (%PDF) hlaðinnar skráar til að staðfesta að hún sé raunverulega PDF. Þetta kemur í veg fyrir svikaraðir árásum á skráargerð.',
          'Stærðarmörk — hámarks upphleðslustærð er 100 MB. Þetta verndar jafnt gegn þjónsálagi og hugsanlegum DoS-árásum.',
          'Heildarsemi — við staðfestum að skráin sé ekki skemmd áður en aðgerð hefst.',
        ],
      },
      {
        h: '6. Vernd gegn árásum',
        items: [
          'CSRF-vernd — við notum CSRF-varnartegn og tilvísunarstaðfestingu til að koma í veg fyrir Cross-Site Request Forgery árásir.',
          'Hraðatakmarkanir — við takmarkum beiðnir frá einum IP-tölu, verndum gegn brute-force og DoS-árásum.',
          'HTTP-öryggisfyrirsagnir — við beitum X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) og Referrer-Policy.',
          'Inntaksstaðfesting — allt inntaksgögn eru staðfest á bæði biðlara og þjóni, þetta kemur í veg fyrir innskeytingaárásir.',
        ],
      },
      {
        h: '7. Engin gagnageymsla',
        p: 'Við geymum ekki skrár þínar né persónuleg gögn á þjóni. Við krefjumst ekki skráningar, innskráningar eða netfangs til að nota tækin. Við búum ekki til notendaupplýsingar og fylgjum ekki með virkni þinni milli heimsókna.',
      },
      {
        h: '8. Öryggi AI aðgerða',
        p: 'AI aðgerðir nota ytri OpenRouter API. Þín API-lykil er geymdur eingöngu í localStorage vafrarans þíns — við höfum ekki aðgang að honum. Texti sem sendur er til OpenRouter er takmarkaður við efni sem dregið er úr PDF. Við sendum ekki persónugögn, IP-tölu eða upplýsingar um vafrara. OpenRouter notar TLS-dulkóðun og notar ekki efni til þjálfunar gervigreindarlíkana.',
      },
      {
        h: '9. Öryggi hugbúnaðar',
        p: 'Við uppfærum reglulega allar þær bókasöfn og aðföng sem notuð eru í verkefninu. Við notum sjálfvirk öryggisskönnunaratól (npm audit, Snyk). Allar alvarlegar öryggisuppfærslur eru lagðar inn innan 48 klukkustunda frá birtingu CVE.',
      },
      {
        h: '10. Skýrsla um öryggisveikleika',
        p: 'Ef þú finnur öryggisveikleika í OptimaPDF, vinsamlegast sendu tölvupóst á kontakt@optimapdf.com með ábyrgðarskýrslu. Við skuldbindum okkur:',
        items: [
          'Staðfesting á mótttöku innan 24 klukkustunda.',
          'Greining og úrbætur innan 14 daga (eftir alvarleika).',
          'Tilkynning til skýrandi um gerðar ráðstafanir.',
          'Engin lagaleg aðgerð gegn þeim sem skýra á ábyrgan hátt.',
        ],
      },
      {
        h: '11. Öryggi gagnasendingar',
        p: 'Í sjaldgæfum tilvikum þar sem skrá þarf að senda til þjónsins (þjónshliðartæki) fer sending yfir dulkóðað HTTPS með TLS 1.3. Skráin flæðir í gegnum minni (streaming) án tímabundinnar geymslu á diski. Eftir að svar hefur borist er skránni eytt úr minni þjónsins strax. Við skrá ekki atburði gagnasendinga.',
      },
      {
        h: '12. Viðmiðunarstaðlar',
        p: 'Við höfum eftirfarandi öryggisstaðla og ráðleggingar að leiðarljósi:',
        items: [
          'OWASP Top 10 — vörn gegn algengustu veikleikum vefumsókna.',
          'GDPR — gagnavernd samkvæmt reglugerð Evrópusambandsins 2016/679.',
          'Ráðleggingar CERT Polska — samkvæmt ráðleggingum Pólska CERT-liðsins.',
          'Mozilla Observatory — við stefnum á einkunn A+ í HTTP-öryggisprófunum.',
        ],
      },
      {
        h: '13. Dulkóðun gagna í hvíld og ISO 27001 / SOC 2 vottun',
        p: 'Flestar aðgerðir á skránum þínum eiga sér stað eingöngu í vafranum þínum og ná aldrei til neins netþjóns — því eru engin „gögn í hvíld" okkar megin til að dulkóða. Fyrir þau fáu verkfæri sem krefjast vinnslu á netþjóni (sjá lið 4 og 11) er skráin einungis til í vinnsluminni (RAM) netþjónsins í nokkrar sekúndur og er eytt strax að lokinni aðgerðinni — hún er aldrei skrifuð á disk, afrituð né geymd í gagnagrunni, svo hugtakið „dulkóðun gagna í hvíld" á í reynd ekki við hér. Við höfum ekki formlega ISO 27001 eða SOC 2 vottun. Þetta eru kostnaðarsöm, margra ára úttektarferli sem eru fyrst og fremst hönnuð fyrir stofnanir sem viðhalda varanlegum gagnageymslum viðskiptavina, rekstrarferlum og fjölmennum teymum — í kerfi þar sem netþjónninn geymir aldrei nein notandagögn missa flestar þær eftirlitsaðgerðir sem þessar vottanir ná yfir einfaldlega tilgang sinn. Þess í stað notum við þær staðgengilsábyrgðir sem lýst er í liðum 1–12 hér að ofan og hægt er að sannreyna í frumkóðanum sjálfum (engin geymsla, dulkóðuð sending, CSP, árásarvarnir, opinbert ferli fyrir tilkynningu veikleika).',
      },
      {
        h: '14. eIDAS og fullgild rafræn undirskrift (QES)',
        p: 'Verkfærið „Undirrita PDF" býður upp á PAdES stafræna undirskrift (þróaða rafræna undirskrift) með þínu eigin skilríki (.p12/.pfx) — öll aðgerðin fer fram á staðnum í vafranum þínum; skráin þín og skilríkið eru aldrei send til netþjóns. Þetta er alvöru dulkóðuð undirskrift, ekki bara sjónræn mynd af undirskrift. Mikilvægur fyrirvari: þessi undirskrift telst EKKI sjálfkrafa fullgild rafræn undirskrift (QES) samkvæmt eIDAS reglugerð ESB (910/2014) — QES-staða veltur eingöngu á því hvort skilríkið þitt hafi verið gefið út af fullgildum traustþjónustuveitanda (QTSP) á fullgildum undirskriftarbúnaði. Útgáfa slíks skilríkis og staðfesting á auðkenni handhafa þess krefst óhjákvæmilega utanaðkomandi, löggilts þriðja aðila — það er eini hluti þessa ferlis sem ekki er hægt að framkvæma að fullu á staðnum, án netþjóns. Ef skilríkið þitt er fullgilt uppfyllir PAdES undirskrift gerð með því kröfur QES; ef þú notar sjálfundirritað eða fyrirtækjaskilríki býrðu til lagalega gilda þróaða rafræna undirskrift, en ekki fullgilda. Kannaðu lagalegar kröfur sem eiga við um þitt notkunartilvik.',
      },
    ],
  },
  it: {
    title: 'Sicurezza',
    updated: 'Ultimo aggiornamento: 25 giugno 2026',
    intro: 'OptimaPDF attribuisce la massima importanza alla sicurezza dei dati. Di seguito è riportata una descrizione dettagliata delle misure di sicurezza che adottiamo per proteggere i tuoi file e i tuoi dati quando utilizzi i nostri strumenti.',
    sections: [
      {
        h: '1. Elaborazione lato client nel browser',
        p: 'La maggior parte degli strumenti OptimaPDF opera su un\'architettura zero-trust — il tuo file non lascia mai il tuo dispositivo. Utilizziamo WebAssembly e JavaScript per elaborare i file PDF direttamente nel tuo browser. Questo significa che nemmeno noi, come operatori del servizio, abbiamo accesso ai tuoi file. Ciò si applica a: merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf e protect-pdf.',
      },
      {
        h: '2. Crittografia TLS/SSL',
        p: 'Tutte le comunicazioni tra il tuo browser e il nostro server sono crittografate utilizzando TLS 1.3 (Transport Layer Security). Utilizziamo un certificato SSL rilasciato da un\'autorità di certificazione attendibile. Ciò significa che i dati trasmessi su internet sono illeggibili da terze parti. Puoi verificare la validità del certificato facendo clic sull\'icona del lucchetto nella barra degli indirizzi del tuo browser.',
      },
      {
        h: '3. Content Security Policy (CSP)',
        p: 'Applichiamo una Content Security Policy (CSP) rigorosa che limita l\'esecuzione di script da fonti non attendibili. CSP previene gli attacchi Cross-Site Scripting (XSS), l\'iniezione di codice e il furto di dati. La nostra politica CSP viene regolarmente auditata e aggiornata.',
      },
      {
        h: '4. Elaborazione esclusiva in RAM',
        p: 'Per gli strumenti che richiedono elaborazione lato server (compressione, OCR, conversioni di formato), i file vengono elaborati esclusivamente nella RAM del server. I file non vengono scritti sul disco rigido, non vengono copiati nei backup e non vengono replicati. Una volta completata l\'operazione, il file viene immediatamente rimosso dalla memoria. Tempo massimo di conservazione sul server: pochi secondi.',
      },
      {
        h: '5. Verifica dei file',
        items: [
          'Verifica dei magic bytes — prima dell\'elaborazione, verifichiamo che il file caricato sia effettivamente un PDF analizzando il suo header (%PDF). Questo previene gli attacchi di spoofing del tipo di file.',
          'Limite di dimensione del file — la dimensione massima di upload è 100 MB. Questo protegge sia dal sovraccarico del server che da potenziali attacchi DoS.',
          'Controllo di integrità — verifichiamo che il file non sia corrotto prima di avviare l\'elaborazione.',
        ],
      },
      {
        h: '6. Protezione dagli attacchi',
        items: [
          'Protezione CSRF — utilizziamo token anti-CSRF e la verifica degli header Origin/Referer per prevenire attacchi Cross-Site Request Forgery.',
          'Rate limiting — limitiamo le richieste da un singolo indirizzo IP, proteggendo da attacchi brute-force e DoS.',
          'HTTP Security Headers — applichiamo gli header X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) e Referrer-Policy.',
          'Validazione dell\'input — tutti i dati in input vengono validati sia lato client che lato server, prevenendo attacchi di injection.',
        ],
      },
      {
        h: '7. Archiviazione zero di dati',
        p: 'Non memorizziamo i tuoi file o dati personali sul server. Non richiediamo registrazione, login o indirizzo email per utilizzare gli strumenti. Non creiamo profili utente né tracciamo la tua attività tra le visite.',
      },
      {
        h: '8. Sicurezza delle funzionalità AI',
        p: 'Le funzionalità AI utilizzano l\'API esterna OpenRouter. La tua chiave API è memorizzata esclusivamente nel localStorage del tuo browser — noi non abbiamo accesso ad essa. Il testo inviato a OpenRouter è limitato al contenuto estratto dal PDF. Non inviamo dati identificativi dell\'utente, indirizzo IP o informazioni sul browser. OpenRouter utilizza la crittografia TLS e non utilizza i contenuti inviati per l\'addestramento dei modelli AI.',
      },
      {
        h: '9. Sicurezza delle dipendenze',
        p: 'Aggiorniamo regolarmente tutte le librerie e dipendenze utilizzate nel progetto. Utilizziamo strumenti automatici di scansione delle vulnerabilità (npm audit, Snyk). Tutte le vulnerabilità critiche vengono corrette entro 48 ore dalla pubblicazione della CVE.',
      },
      {
        h: '10. Segnalazione delle vulnerabilità',
        p: 'Se scopri una vulnerabilità di sicurezza in OptimaPDF, ti preghiamo di segnalarla in modo responsabile inviando un\'email a kontakt@optimapdf.com. Ci impegniamo a:',
        items: [
          'Confermare la ricezione entro 24 ore.',
          'Effettuare l\'analisi e intraprendere azioni correttive entro 14 giorni (in base alla gravità).',
          'Informare il segnalante delle azioni intraprese.',
          'Non intraprendere azioni legali contro coloro che segnalano vulnerabilità in modo responsabile.',
        ],
      },
      {
        h: '11. Sicurezza della trasmissione dei file',
        p: 'Nei rari casi in cui un file deve essere inviato al server (strumenti lato server), la trasmissione avviene su HTTPS crittografato utilizzando TLS 1.3. Il file viene trasmesso in memoria (streaming) senza archiviazione temporanea su disco. Dopo aver ricevuto la risposta, il file viene immediatamente rimosso dalla memoria del server. Non conserviamo log delle operazioni sui file.',
      },
      {
        h: '12. Conformità agli standard',
        p: 'Aderiamo ai seguenti standard e raccomandazioni di sicurezza:',
        items: [
          'OWASP Top 10 — protezione contro le vulnerabilità più comuni delle applicazioni web.',
          'GDPR — protezione dei dati personali in conformità con il Regolamento UE 2016/679.',
          'Linee guida CERT Polska — seguendo le raccomandazioni del team CERT polacco.',
          'Mozilla Observatory — puntiamo a una valutazione A+ nel test di sicurezza degli header HTTP.',
        ],
      },
      {
        h: '13. Crittografia dei dati a riposo e certificazioni ISO 27001 / SOC 2',
        p: 'La maggior parte delle operazioni sui tuoi file avviene interamente nel tuo browser e non raggiunge mai alcun server — non esistono quindi, da parte nostra, "dati a riposo" da cifrare. Per i pochi strumenti che richiedono un\'elaborazione lato server (vedi punti 4 e 11), il file esiste solo nella RAM del server per pochi secondi e viene eliminato immediatamente al termine dell\'operazione — non viene mai scritto su disco, sottoposto a backup né memorizzato in un database, quindi il concetto di "crittografia dei dati a riposo" non trova qui reale applicazione. Non disponiamo di certificazioni formali ISO 27001 o SOC 2. Si tratta di programmi di audit costosi e pluriennali, pensati soprattutto per organizzazioni che mantengono archivi permanenti di dati dei clienti, processi operativi e team composti da più persone — in un\'architettura in cui il server non conserva mai alcun dato dell\'utente, la maggior parte dei controlli coperti da queste certificazioni perde semplicemente il proprio oggetto. Applichiamo invece le garanzie alternative, verificabili nel codice sorgente, descritte nei punti 1-12 precedenti (zero conservazione, trasmissione cifrata, CSP, protezioni dagli attacchi, un processo pubblico di segnalazione delle vulnerabilità).',
      },
      {
        h: '14. eIDAS e firma elettronica qualificata (QES)',
        p: 'Lo strumento "Firmare PDF" offre una modalità di firma digitale PAdES (una firma elettronica avanzata) che utilizza il tuo certificato personale (.p12/.pfx) — l\'intera operazione viene eseguita localmente nel tuo browser; il file e il certificato non vengono mai caricati su un server. Si tratta di una vera firma crittografica, non di una semplice immagine visiva di una firma. Avvertenza importante: questa firma NON è automaticamente una firma elettronica qualificata (QES) ai sensi del regolamento UE eIDAS (910/2014) — lo status di QES dipende esclusivamente dal fatto che il tuo certificato sia stato rilasciato da un prestatore di servizi fiduciari qualificato (QTSP) su un dispositivo qualificato per la creazione di firme. Il rilascio di tale certificato e la verifica dell\'identità del suo titolare richiedono necessariamente una terza parte esterna e autorizzata — è l\'unico elemento di questo processo che non può essere svolto al 100% localmente, senza server. Se il tuo certificato è qualificato, una firma PAdES creata con esso soddisfa i requisiti di una QES; se utilizzi un certificato autofirmato o aziendale, crei una firma elettronica avanzata legalmente valida, ma non qualificata. Verifica i requisiti legali applicabili al tuo caso d\'uso specifico.',
      },
    ],
  },
  ja: {
    title: 'セキュリティ',
    updated: '最終更新日：2026年6月25日',
    intro: 'OptimaPDFはデータセキュリティを最も重要視しています。以下は、当社のツールをご利用いただく際にお客様のファイルとデータを保護するために採用しているセキュリティ対策の詳細な説明です。',
    sections: [
      {
        h: '1. ブラウザでのクライアント側処理',
        p: 'ほとんどのOptimaPDFツールはゼロトラストアーキテクチャに基づいて動作します — お客様のファイルがデバイスから送信されることはありません。WebAssemblyとJavaScriptを使用して、ブラウザで直接PDFファイルを処理します。これは、サービス運営者である当社でさえもお客様のファイルにアクセスできないことを意味します。これは以下に適用されます：merge、split、rotate、watermark、page-numbers、crop-pdf、edit-pdf、sign-pdf、redact-pdf、flatten-pdf、delete-pages、extract-pages、reorder-pages、add-page、metadata、pdf-to-svg、pdf-to-epub、pdf-to-txt、fill-form、pdf-to-images、to-pdfa、compare-pdf、unlock-pdf、protect-pdf。',
      },
      {
        h: '2. TLS/SSL暗号化',
        p: 'ブラウザとサーバー間のすべての通信はTLS 1.3（Transport Layer Security）を使用して暗号化されています。信頼できる認証局によって発行されたSSL証明書を使用しています。つまり、インターネット上で送信されるデータは第三者が読み取れません。ブラウザのアドレスバーにある鍵アイコンをクリックして、証明書の有効性を確認できます。',
      },
      {
        h: '3. Content Security Policy（CSP）',
        p: '信頼できないソースからのスクリプトの実行を制限する厳格なContent Security Policy（CSP）を適用しています。CSPはクロスサイトスクリプティング（XSS）攻撃、コードインジェクション、データ盗難を防ぎます。当社のCSPポリシーは定期的に監査および更新されています。',
      },
      {
        h: '4. RAMのみでの処理',
        p: 'サーバー側の処理を必要とするツール（圧縮、OCR、形式変換）の場合、ファイルはサーバーのRAMでのみ処理されます。ファイルはハードドライブに書き込まれず、バックアップにコピーされず、複製もされません。操作が完了すると、ファイルは即座にメモリから削除されます。サーバーでの最大保持時間：数秒。',
      },
      {
        h: '5. ファイルの検証',
        items: [
          'マジックバイト検証 — 処理前に、アップロードされたファイルのヘッダー（%PDF）を分析して、実際にPDFであることを確認します。これにより、ファイルタイプのなりすまし攻撃を防ぎます。',
          'ファイルサイズ制限 — 最大アップロードサイズは100MBです。これにより、サーバーの過負荷と潜在的なDoS攻撃の両方から保護します。',
          '整合性チェック — 処理を開始する前に、ファイルが破損していないことを確認します。',
        ],
      },
      {
        h: '6. 攻撃からの保護',
        items: [
          'CSRF対策 — CSRFトークンとOrigin/Refererヘッダーの検証を使用して、クロスサイトリクエストフォージェリ攻撃を防ぎます。',
          'レート制限 — 単一のIPアドレスからのリクエストを制限し、ブルートフォース攻撃やDoS攻撃から保護します。',
          'HTTPセキュリティヘッダー — X-Content-Type-Options（nosniff）、X-Frame-Options（DENY）、Strict-Transport-Security（HSTS）、Referrer-Policyの各ヘッダーを適用しています。',
          '入力検証 — すべての入力データはクライアント側とサーバー側の両方で検証され、インジェクション攻撃を防ぎます。',
        ],
      },
      {
        h: '7. データのゼロ保存',
        p: 'お客様のファイルや個人データをサーバーに保存することはありません。ツールを使用するために登録、ログイン、メールアドレスは必要ありません。ユーザープロファイルを作成したり、訪問間でのアクティビティを追跡したりすることはありません。',
      },
      {
        h: '8. AI機能のセキュリティ',
        p: 'AI機能は外部のOpenRouter APIを使用しています。お客様のAPIキーはブラウザのlocalStorageにのみ保存されます — 当社はそれにアクセスできません。OpenRouterに送信されるテキストは、PDFから抽出されたコンテンツに限定されます。ユーザーを識別するデータ、IPアドレス、ブラウザ情報は送信しません。OpenRouterはTLS暗号化を使用し、送信されたコンテンツをAIモデルのトレーニングに使用することはありません。',
      },
      {
        h: '9. 依存関係のセキュリティ',
        p: 'プロジェクトで使用されているすべてのライブラリと依存関係を定期的に更新しています。自動脆弱性スキャンツール（npm audit、Snyk）を使用しています。すべての深刻な脆弱性は、CVE公開から48時間以内に修正されます。',
      },
      {
        h: '10. 脆弱性の開示',
        p: 'OptimaPDFでセキュリティ上の脆弱性を発見された場合は、kontakt@optimapdf.comまでご連絡いただき、責任を持って開示してください。当社は以下を約束します：',
        items: [
          '24時間以内に受領を確認すること。',
          '14日以内に分析を実施し、是正措置を講じること（重大度に応じて）。',
          '報告者に講じた措置について通知すること。',
          '責任を持って脆弱性を開示する者に対して法的措置を取らないこと。',
        ],
      },
      {
        h: '11. ファイル送信のセキュリティ',
        p: 'ファイルをサーバーに送信する必要があるまれなケース（サーバー側ツール）では、TLS 1.3を使用した暗号化HTTPSを介して送信が行われます。ファイルは一時的なディスク保存なしで、メモリ内でストリーミング送信されます。応答を受信した後、ファイルは即座にサーバーメモリから削除されます。ファイル操作のログは保持しません。',
      },
      {
        h: '12. 標準準拠',
        p: '以下のセキュリティ標準と推奨事項に準拠しています：',
        items: [
          'OWASP Top 10 — 最も一般的なWebアプリケーションの脆弱性からの保護。',
          'GDPR — EU規則2016/679に従った個人データの保護。',
          'CERT Polskaガイドライン — ポーランドCERTチームの推奨事項に従っています。',
          'Mozilla Observatory — HTTPヘッダーセキュリティテストでA+評価を目指しています。',
        ],
      },
      {
        h: '13. 保存データの暗号化とISO 27001 / SOC 2認証について',
        p: 'ファイルに対するほとんどの操作はブラウザ内で完結し、サーバーに送信されることはありません。そのため、当社側で暗号化すべき「保存データ」はそもそも存在しません。サーバー側処理が必要なごく一部のツール（項目4・11を参照)では、ファイルはサーバーのRAM上に数秒間だけ存在し、処理完了後ただちに削除されます — ディスクへの書き込み、バックアップ、データベースへの保存は一切行われないため、「保存データの暗号化」という概念は実質的に当てはまりません。当社はISO 27001またはSOC 2の正式な認証を取得していません。これらは主に、永続的な顧客データストア、運用プロセス、多人数のチームを維持する組織向けに設計された、費用と年月を要する監査プログラムです — サーバーがユーザーデータを一切保持しないアーキテクチャでは、これらの認証が対象とする管理策の大半はそもそも適用対象がありません。代わりに、上記の項目1〜12で説明した、ソースコードで検証可能な代替の保証（ゼロ保存、暗号化された通信、CSP、攻撃対策、公開された脆弱性報告プロセス)を採用しています。',
      },
      {
        h: '14. eIDASと適格電子署名（QES）について',
        p: '「PDFに署名」ツールでは、ご自身の証明書（.p12/.pfx）を使用したPAdESデジタル署名モード（高度電子署名）を提供しています — 処理はすべてブラウザ内でローカルに実行され、ファイルと証明書がサーバーにアップロードされることはありません。これは単なる署名の視覚的な画像ではなく、本物の暗号署名です。重要な注意点：この署名はEUのeIDAS規則（910/2014）における適格電子署名（QES）に自動的に該当するものではありません — QESとしての地位は、ご使用の証明書が適格信頼サービス提供者（QTSP）により適格署名作成装置上で発行されたものであるかどうかにのみ依存します。そのような証明書の発行および所有者の本人確認には、本質的に外部の認可された第三者が必要です — これがこのプロセスの中で、サーバーなしで100%ローカルに実行できない唯一の部分です。証明書が適格なものであれば、それを用いて作成されたPAdES署名はQESの要件を満たします。自己署名証明書や企業証明書を使用する場合、法的に有効な高度電子署名は作成されますが、適格電子署名にはなりません。ご自身の用途に適用される法的要件をご確認ください。',
      },
    ],
  },
  tr: {
    title: 'Güvenlik',
    updated: 'Son güncelleme: 25 Haziran 2026',
    intro: 'OptimaPDF, veri güvenliğine en büyük önemi vermektedir. Aşağıda, araçlarımızı kullanırken dosyalarınızı ve verilerinizi korumak için uyguladığımız güvenlik önlemlerinin ayrıntılı bir açıklaması bulunmaktadır.',
    sections: [
      {
        h: '1. Tarayıcıda istemci tarafı işleme',
        p: 'OptimaPDF araçlarının çoğu, sıfır güven mimarisiyle çalışır — dosyanız cihazınızdan asla ayrılmaz. PDF dosyalarını doğrudan tarayıcınızda işlemek için WebAssembly ve JavaScript kullanırız. Bu, hizmet operatörleri olarak bizim bile dosyalarınıza erişimimizin olmadığı anlamına gelir. Bu, aşağıdakiler için geçerlidir: merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf ve protect-pdf.',
      },
      {
        h: '2. TLS/SSL şifrelemesi',
        p: 'Tarayıcınız ile sunucumuz arasındaki tüm iletişim, TLS 1.3 (Transport Layer Security) kullanılarak şifrelenmektedir. Güvenilir bir sertifika yetkilisi tarafından verilen SSL sertifikası kullanıyoruz. Bu, internet üzerinden iletilen verilerin üçüncü taraflarca okunamayacağı anlamına gelir. Tarayıcınızın adres çubuğundaki kilit simgesine tıklayarak sertifikanın geçerliliğini doğrulayabilirsiniz.',
      },
      {
        h: '3. Content Security Policy (CSP)',
        p: 'Güvenilmeyen kaynaklardan gelen komut dosyalarının yürütülmesini kısıtlayan sıkı bir Content Security Policy (CSP) uyguluyoruz. CSP, Cross-Site Scripting (XSS) saldırılarını, kod enjeksiyonunu ve veri hırsızlığını önler. CSP politikamız düzenli olarak denetlenmekte ve güncellenmektedir.',
      },
      {
        h: '4. Yalnızca RAM\'de işleme',
        p: 'Sunucu tarafı işleme gerektiren araçlar (sıkıştırma, OCR, biçim dönüşümleri) için dosyalar yalnızca sunucunun RAM\'inde işlenir. Dosyalar sabit sürücüye yazılmaz, yedeklere kopyalanmaz ve çoğaltılmaz. İşlem tamamlandıktan sonra dosya derhal bellekten silinir. Sunucuda maksimum saklama süresi: birkaç saniye.',
      },
      {
        h: '5. Dosya doğrulaması',
        items: [
          'Sihirli bayt doğrulaması — işleme başlamadan önce, yüklenen dosyanın başlığını (%PDF) analiz ederek gerçekten bir PDF olup olmadığını doğrularız. Bu, dosya türü sahteciliği saldırılarını önler.',
          'Dosya boyutu sınırı — maksimum yükleme boyutu 100 MB\'dir. Bu, hem sunucu aşırı yüklenmesine hem de olası DoS saldırılarına karşı korur.',
          'Bütünlük kontrolü — işleme başlamadan önce dosyanın bozuk olmadığını doğrularız.',
        ],
      },
      {
        h: '6. Saldırılara karşı koruma',
        items: [
          'CSRF koruması — CSRF token\'ları ve Origin/Referer başlık doğrulaması kullanarak Cross-Site Request Forgery saldırılarını önleriz.',
          'Hız sınırlama — tek bir IP adresinden gelen istekleri sınırlayarak brute-force ve DoS saldırılarına karşı koruruz.',
          'HTTP Güvenlik Başlıkları — X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) ve Referrer-Policy başlıklarını uygularız.',
          'Girdi doğrulaması — tüm girdi verileri hem istemci hem de sunucu tarafında doğrulanarak enjeksiyon saldırıları önlenir.',
        ],
      },
      {
        h: '7. Sıfır veri depolama',
        p: 'Dosyalarınızı veya kişisel verilerinizi sunucuda depolamıyoruz. Araçları kullanmak için kayıt, giriş veya e-posta adresi talep etmiyoruz. Kullanıcı profilleri oluşturmuyor veya ziyaretler arasında etkinliğinizi takip etmiyoruz.',
      },
      {
        h: '8. Yapay zeka özellik güvenliği',
        p: 'Yapay zeka özellikleri harici OpenRouter API\'sini kullanır. API anahtarınız yalnızca tarayıcınızın localStorage\'ında saklanır — bizim ona erişimimiz yoktur. OpenRouter\'a gönderilen metin, PDF\'den çıkarılan içerikle sınırlıdır. Kullanıcı tanımlayıcı veri, IP adresi veya tarayıcı bilgisi göndermiyoruz. OpenRouter, TLS şifrelemesi kullanır ve gönderilen içeriği yapay zeka model eğitimi için kullanmaz.',
      },
      {
        h: '9. Bağımlılık güvenliği',
        p: 'Projede kullanılan tüm kütüphaneleri ve bağımlılıkları düzenli olarak güncelliyoruz. Otomatik zafiyet tarama araçları (npm audit, Snyk) kullanıyoruz. Tüm kritik zafiyetler, CVE yayınlandıktan sonra 48 saat içinde düzeltilir.',
      },
      {
        h: '10. Zafiyet bildirimi',
        p: 'OptimaPDF\'de bir güvenlik zafiyeti keşfederseniz, lütfen kontakt@optimapdf.com adresine e-posta göndererek sorumlu bir şekilde bildirin. Şunları taahhüt ediyoruz:',
        items: [
          '24 saat içinde alındığını onaylamak.',
          '14 gün içinde analiz yapmak ve düzeltici önlemler almak (ciddiyetine bağlı olarak).',
          'Bildiriciyi alınan önlemler hakkında bilgilendirmek.',
          'Zafiyetleri sorumlu bir şekilde bildirenlere karşı yasal işlem başlatmamak.',
        ],
      },
      {
        h: '11. Dosya iletim güvenliği',
        p: 'Bir dosyanın sunucuya gönderilmesi gereken nadir durumlarda (sunucu tarafı araçlar), iletim TLS 1.3 kullanılarak şifrelenmiş HTTPS üzerinden gerçekleşir. Dosya, geçici disk depolaması olmadan bellek üzerinden akışlı (streaming) olarak iletilir. Yanıt alındıktan sonra dosya derhal sunucu belleğinden silinir. Dosya işlem günlüklerini tutmuyoruz.',
      },
      {
        h: '12. Standartlara uygunluk',
        p: 'Aşağıdaki güvenlik standartlarına ve tavsiyelerine uyuyoruz:',
        items: [
          'OWASP Top 10 — en yaygın web uygulaması zafiyetlerine karşı koruma.',
          'GDPR — AB Tüzüğü 2016/679 uyarınca kişisel veri koruması.',
          'CERT Polska kılavuzları — Polonya CERT ekibinin tavsiyelerine uyarak.',
          'Mozilla Observatory — HTTP başlık güvenlik testinde A+ derecesi hedefliyoruz.',
        ],
      },
      {
        h: '13. Bekleyen verilerin şifrelenmesi ve ISO 27001 / SOC 2 sertifikasyonu',
        p: 'Dosyalarınız üzerindeki işlemlerin çoğu tamamen tarayıcınızda gerçekleşir ve hiçbir zaman bir sunucuya ulaşmaz — bu nedenle bizim tarafımızda şifrelenecek herhangi bir "bekleyen veri" bulunmaz. Sunucu tarafı işlem gerektiren birkaç araç için (bkz. madde 4 ve 11), dosya yalnızca birkaç saniye boyunca sunucunun RAM belleğinde bulunur ve işlem tamamlanır tamamlanmaz hemen silinir — hiçbir zaman diske yazılmaz, yedeklenmez veya bir veritabanında saklanmaz, bu nedenle "bekleyen veri şifrelemesi" kavramı burada pratikte geçerli değildir. Resmi ISO 27001 veya SOC 2 sertifikasyonuna sahip değiliz. Bunlar, öncelikle kalıcı müşteri veri depoları, operasyonel süreçler ve çok kişili ekipler bulunduran kuruluşlar için tasarlanmış, maliyetli ve çok yıllı denetim programlarıdır — sunucunun kullanıcı verilerini hiçbir zaman tutmadığı bir mimaride, bu sertifikaların kapsadığı kontrollerin çoğunun üzerine uygulanacağı bir konu kalmaz. Bunun yerine, yukarıdaki 1-12. maddelerde açıklanan, kaynak kodundan doğrulanabilir alternatif güvenceleri uyguluyoruz (sıfır depolama, şifreli iletim, CSP, saldırı korumaları, herkese açık bir güvenlik açığı bildirim süreci).',
      },
      {
        h: '14. eIDAS ve nitelikli elektronik imza (QES)',
        p: '"PDF İmzala" aracı, kendi sertifikanızı (.p12/.pfx) kullanan bir PAdES dijital imza modu (gelişmiş elektronik imza) sunar — işlemin tamamı tarayıcınızda yerel olarak çalışır; dosyanız ve sertifikanız hiçbir zaman bir sunucuya yüklenmez. Bu, yalnızca görsel bir imza resmi değil, gerçek bir kriptografik imzadır. Önemli uyarı: bu imza, AB eIDAS Tüzüğü (910/2014) kapsamında otomatik olarak nitelikli elektronik imza (QES) sayılmaz — QES statüsü yalnızca sertifikanızın nitelikli bir güven hizmeti sağlayıcısı (QTSP) tarafından nitelikli bir imza oluşturma cihazında düzenlenip düzenlenmediğine bağlıdır. Böyle bir sertifikanın düzenlenmesi ve sahibinin kimliğinin doğrulanması, doğası gereği harici, lisanslı bir üçüncü tarafı gerektirir — bu, sürecin %100 yerel olarak, sunucusuz gerçekleştirilemeyen tek parçasıdır. Sertifikanız nitelikliyse, onunla oluşturulan bir PAdES imzası QES gereksinimlerini karşılar; kendinden imzalı veya kurumsal bir sertifika kullanıyorsanız, yasal olarak geçerli bir gelişmiş elektronik imza oluşturursunuz, ancak nitelikli bir imza değil. Kullanım durumunuz için geçerli yasal gereklilikleri kontrol edin.',
      },
    ],
  },
  zh: {
    title: '安全',
    updated: '最后更新：2026年6月25日',
    intro: 'OptimaPDF高度重视数据安全。以下是我们为保护您在使用我们的工具时的文件和数据所采取的安全措施的详细描述。',
    sections: [
      {
        h: '1. 客户端浏览器处理',
        p: '大多数OptimaPDF工具采用零信任架构运行——您的文件永远不会离开您的设备。我们使用WebAssembly和JavaScript直接在您的浏览器中处理PDF文件。这意味着即使作为服务运营者，我们也无法访问您的文件。这适用于：merge、split、rotate、watermark、page-numbers、crop-pdf、edit-pdf、sign-pdf、redact-pdf、flatten-pdf、delete-pages、extract-pages、reorder-pages、add-page、metadata、pdf-to-svg、pdf-to-epub、pdf-to-txt、fill-form、pdf-to-images、to-pdfa、compare-pdf、unlock-pdf和protect-pdf。',
      },
      {
        h: '2. TLS/SSL加密',
        p: '您的浏览器与我们的服务器之间的所有通信均使用TLS 1.3（传输层安全协议）进行加密。我们使用由受信任的证书颁发机构签发的SSL证书。这意味着通过互联网传输的数据对第三方来说是不可读的。您可以通过单击浏览器地址栏中的挂锁图标来验证证书的有效性。',
      },
      {
        h: '3. Content Security Policy（CSP）',
        p: '我们实行严格的内容安全策略（CSP），限制来自不受信任来源的脚本执行。CSP可防止跨站脚本（XSS）攻击、代码注入和数据盗窃。我们的CSP策略会定期审计和更新。',
      },
      {
        h: '4. 仅RAM处理',
        p: '对于需要服务器端处理的工具（压缩、OCR、格式转换），文件仅在服务器的RAM中处理。文件不会写入硬盘、不会备份到副本、也不会被复制。操作完成后，文件会立即从内存中删除。服务器最大保留时间：几秒钟。',
      },
      {
        h: '5. 文件验证',
        items: [
          '幻数（magic bytes）验证——在处理之前，我们通过分析文件的头部（%PDF）来验证上传的文件是否真的是PDF文件。这可以防止文件类型欺骗攻击。',
          '文件大小限制——最大上传大小为100 MB。这既防止了服务器过载，也防止了潜在的DoS攻击。',
          '完整性检查——我们会在开始处理之前验证文件是否损坏。',
        ],
      },
      {
        h: '6. 攻击防护',
        items: [
          'CSRF防护——我们使用CSRF令牌和Origin/Referer标头验证来防止跨站请求伪造攻击。',
          '速率限制——我们限制来自单个IP地址的请求数量，防止暴力破解和DoS攻击。',
          'HTTP安全标头——我们应用X-Content-Type-Options（nosniff）、X-Frame-Options（DENY）、Strict-Transport-Security（HSTS）和Referrer-Policy标头。',
          '输入验证——所有输入数据均在客户端和服务器端进行验证，防止注入攻击。',
        ],
      },
      {
        h: '7. 零数据存储',
        p: '我们不会将您的文件或个人数据存储在服务器上。我们不需要注册、登录或电子邮件地址即可使用工具。我们不会创建用户资料，也不会跟踪您在不同访问之间的活动。',
      },
      {
        h: '8. AI功能安全',
        p: 'AI功能使用外部OpenRouter API。您的API密钥仅存储在浏览器的localStorage中——我们无法访问它。发送到OpenRouter的文本仅限于从PDF中提取的内容。我们不发送用户识别数据、IP地址或浏览器信息。OpenRouter使用TLS加密，并且不会将提交的内容用于AI模型训练。',
      },
      {
        h: '9. 依赖项安全',
        p: '我们定期更新项目中使用的所有库和依赖项。我们使用自动漏洞扫描工具（npm audit、Snyk）。所有关键漏洞在CVE发布后48小时内修补。',
      },
      {
        h: '10. 漏洞披露',
        p: '如果您在OptimaPDF中发现安全漏洞，请通过发送电子邮件至kontakt@optimapdf.com负责任地进行披露。我们承诺：',
        items: [
          '在24小时内确认收到。',
          '在14天内进行分析并采取纠正措施（取决于严重程度）。',
          '告知报告者所采取的措施。',
          '不会对负责任披露漏洞的人采取法律行动。',
        ],
      },
      {
        h: '11. 文件传输安全',
        p: '在极少数需要将文件发送到服务器的情况下（服务器端工具），传输通过使用TLS 1.3加密的HTTPS进行。文件在内存中传输（流式传输），无需临时磁盘存储。收到响应后，文件会立即从服务器内存中删除。我们不保留文件操作日志。',
      },
      {
        h: '12. 标准合规',
        p: '我们遵守以下安全标准和建议：',
        items: [
          'OWASP Top 10——针对最常见的Web应用程序漏洞进行防护。',
          'GDPR——根据欧盟法规2016/679保护个人数据。',
          'CERT Polska指南——遵循波兰CERT团队的建议。',
          'Mozilla Observatory——我们旨在HTTP标头安全测试中获得A+评级。',
        ],
      },
      {
        h: '13. 静态数据加密与ISO 27001 / SOC 2认证',
        p: '对文件的大多数操作完全在您的浏览器中完成，从不会到达任何服务器——因此我们这边根本不存在需要加密的"静态数据"。对于少数确实需要服务器端处理的工具（参见第4点和第11点），文件仅在服务器的内存（RAM）中存在几秒钟，操作完成后立即删除——它从不写入磁盘、不进行备份，也不存储在数据库中，因此"静态数据加密"这一概念在此实际上并不适用。我们没有正式的ISO 27001或SOC 2认证。这些是耗资巨大、历时多年的审计项目，主要面向那些维护持久性客户数据存储、运营流程和多人团队的组织——在服务器从不保留任何用户数据的架构下，这些认证所涵盖的大多数控制措施根本没有适用对象。相反，我们采用上文第1至12点所述的、可在源代码中验证的替代性保障措施（零存储、加密传输、CSP、攻击防护、公开的漏洞报告流程)。',
      },
      {
        h: '14. eIDAS与合格电子签名（QES）',
        p: '"PDF签名"工具提供使用您自己的证书（.p12/.pfx）的PAdES数字签名模式（高级电子签名)——整个操作在您的浏览器本地完成；您的文件和证书永远不会上传到服务器。这是真正的加密签名，而不仅仅是签名的可视化图像。重要提示：根据欧盟eIDAS法规（910/2014），此签名并不自动构成合格电子签名（QES)——QES资格完全取决于您的证书是否由合格信任服务提供商（QTSP）在合格签名创建设备上签发。签发此类证书并验证持有人身份，本质上需要一个外部的、持牌的第三方机构——这是整个流程中唯一无法百分之百在本地、无需服务器完成的部分。如果您的证书是合格证书，用它创建的PAdES签名即满足QES的要求；如果您使用自签名证书或企业证书，则会创建一个具有法律效力的高级电子签名，但并非合格签名。请核实适用于您具体使用场景的法律要求。',
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
      {
        h: '13. Encryption at rest and ISO 27001 / SOC 2 certification',
        p: 'Most operations on your files happen entirely in your browser and never reach any server — so there is no "data at rest" on our side to encrypt in the first place. For the few tools that do require server-side processing (see points 4 and 11), the file exists only in the server\'s RAM for a few seconds and is deleted immediately after the operation completes — it is never written to disk, backed up, or stored in a database, so "encryption at rest" doesn\'t meaningfully apply here. We do not hold formal ISO 27001 or SOC 2 certification. These are expensive, multi-year audit programs designed primarily for organizations that maintain persistent customer data stores, operational processes, and multi-person teams; in an architecture where the server never retains user data at all, most of the controls these certifications cover simply have no subject to apply to. Instead, we rely on the alternative, source-verifiable guarantees described in points 1–12 above (zero storage, encrypted transit, CSP, attack protections, a public vulnerability-disclosure process).',
      },
      {
        h: '14. eIDAS and Qualified Electronic Signatures (QES)',
        p: 'The "Sign PDF" tool offers a PAdES digital-signature mode (an Advanced Electronic Signature) using your own certificate (.p12/.pfx) — the entire operation runs locally in your browser; your file and certificate are never uploaded to a server. This is a real cryptographic signature, not just a visual image of one. Important caveat: this signature is NOT automatically a Qualified Electronic Signature (QES) under the EU eIDAS regulation (910/2014) — QES status depends entirely on whether your certificate was issued by a Qualified Trust Service Provider (QTSP) on a Qualified Signature Creation Device. Issuing such a certificate and verifying its holder\'s identity inherently requires an external, licensed third party — this is the one part of the process that cannot be done 100% locally, without a server. If your certificate is qualified, a PAdES signature made with it meets the requirements of QES; if you use a self-signed or corporate certificate, you create a legally valid advanced electronic signature, but not a qualified one. Check the legal requirements that apply to your specific use case.',
      },
    ],
  },
};

export default function SecurityPage({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const { locale: detectedLocale } = useLocale();
  const locale = forcedLocale || detectedLocale;
  const lang = (content as Record<string, typeof content.pl>)[locale] || content.en;
  const isRtl = locale === 'ar' || locale === 'fa';

  return (
    <main className="max-w-3xl mx-auto px-4 py-12" dir={isRtl ? 'rtl' : undefined}>
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
