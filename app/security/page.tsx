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
