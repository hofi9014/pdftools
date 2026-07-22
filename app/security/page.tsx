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
  en: {
    title: 'Security',
    updated: 'Last updated: June 25, 2026',
    intro: 'OptimaPDF places the highest importance on data security. Below is a detailed description of the security measures we employ to protect your files and data when using our tools.',
    sections: [
      {
        h: '1. Client-side processing in the browser',
        p: 'Most OptimaPDF operate on a zero-trust architecture — your file never leaves your device. We use WebAssembly and JavaScript to process PDF files directly in your browser. This means that even we, as service operators, have no access to your files. This applies to: merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, and protect-pdf.',
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
  ar: {
    title: 'الأمان',
    updated: 'آخر تحديث: 25 يونيو 2026',
    intro: 'يولي OptimaPDF أهمية قصوى لأمن البيانات. فيما يلي وصف تفصيلي لتدابير الأمان التي نستخدمها لحماية ملفاتك وبياناتك عند استخدام أدواتنا.',
    sections: [
      { h: '1. المعالجة من جانب العميل في المتصفح', p: 'تعمل معظم أدوات OptimaPDF على بنية عدم الثقة — ملفك لا يغادر جهازك أبداً. نستخدم WebAssembly وJavaScript لمعالجة ملفات PDF مباشرة في متصفحك. هذا يعني أنه حتى نحن، كمشغلي الخدمة، ليس لدينا إمكانية الوصول إلى ملفاتك. ينطبق هذا على: الدمج، التقسيم، التدوير، العلامة المائية، ترقيم الصفحات، القص، التحرير، التوقيع، التنقيح، التسوية، حذف الصفحات، استخراج الصفحات، إعادة الترتيب، إضافة صفحة، البيانات الوصفية، PDF→SVG، PDF→EPUB، PDF→TXT، ملء النماذج، PDF→صور، PDF/A، مقارنة PDF، إلغاء القفل، وحماية PDF.' },
      { h: '2. تشفير TLS/SSL', p: 'جميع الاتصالات بين متصفحك وخادمنا مشفرة باستخدام TLS 1.3 (أمان طبقة النقل). نستخدم شهادة SSL صادرة عن هيئة تصديق موثوقة. هذا يعني أن البيانات المنقولة عبر الإنترنت غير قابلة للقراءة من قبل أطراف ثالثة. يمكنك التحقق من صحة الشهادة من خلال النقر على أيقونة القفل في شريط عنوان متصفحك.' },
      { h: '3. سياسة أمان المحتوى (CSP)', p: 'نفرض سياسة أمان محتوى (CSP) صارمة تحد من تنفيذ البرامج النصية من مصادر غير موثوقة. تمنع CSP هجمات البرمجة النصية عبر المواقع (XSS)، وحقن الكود، وسرقة البيانات. يتم تدقيق وتحديث سياسة CSP الخاصة بنا بانتظام.' },
      { h: '4. المعالجة في ذاكرة RAM فقط', p: 'بالنسبة للأدوات التي تتطلب معالجة من جانب الخادم (الضغط، OCR، تحويلات التنسيق)، تتم معالجة الملفات حصرياً في ذاكرة RAM للخادم. لا تتم كتابة الملفات على القرص الصلب، ولا يتم نسخها احتياطياً أو تكرارها. بمجرد اكتمال العملية، تتم إزالة الملف فوراً من الذاكرة. الحد الأقصى لوقت الاحتفاظ بالخادم: بضع ثوانٍ.' },
      { h: '5. التحقق من الملفات', items: ['التحقق من التوقيع (magic bytes) — قبل المعالجة، نتحقق من أن الملف المرفوع هو بالفعل PDF من خلال تحليل رأسه (%PDF). يمنع هذا هجمات انتحال نوع الملف.', 'حد حجم الملف — الحد الأقصى لحجم الرفع هو 100 ميجابايت. هذا يحمي من التحميل الزائد للخادم وهجمات DoS المحتملة.', 'التحقق من السلامة — نتحقق من أن الملف غير تالف قبل بدء المعالجة.'] },
      { h: '6. الحماية من الهجمات', items: ['حماية CSRF — نستخدم رموز anti-CSRF والتحقق من رأس Origin/Referer لمنع هجمات تزوير الطلبات عبر المواقع.', 'تحديد المعدل — نحدد عدد الطلبات من عنوان IP واحد، للحماية من هجمات القوة الغاشمة وDoS.', 'رؤوس أمان HTTP — نطبق رؤوس X-Content-Type-Options (nosniff)، X-Frame-Options (DENY)، Strict-Transport-Security (HSTS)، وReferrer-Policy.', 'التحقق من المدخلات — يتم التحقق من جميع بيانات الإدخال على جانبي العميل والخادم، مما يمنع هجمات الحقن.'] },
      { h: '7. عدم تخزين البيانات', p: 'لا نخزن ملفاتك أو بياناتك الشخصية على الخادم. لا نطلب التسجيل أو تسجيل الدخول أو عنوان البريد الإلكتروني لاستخدام الأدوات. لا ننشئ ملفات تعريف مستخدمين أو نتتبع نشاطك بين الزيارات.' },
      { h: '8. أمان ميزات الذكاء الاصطناعي', p: 'تستخدم ميزات الذكاء الاصطناعي واجهة برمجة تطبيقات OpenRouter الخارجية. يتم تخزين مفتاح API الخاص بك حصرياً في localStorage لمتصفحك — ليس لدينا إمكانية الوصول إليه. يقتصر النص المرسل إلى OpenRouter على المحتوى المستخرج من PDF. لا نرسل بيانات تحدد هوية المستخدم أو عنوان IP أو معلومات المتصفح. يستخدم OpenRouter تشفير TLS ولا يستخدم المحتوى المرسل لتدريب نماذج الذكاء الاصطناعي.' },
      { h: '9. أمان التبعيات', p: 'نقوم بتحديث جميع المكتبات والتبعيات المستخدمة في المشروع بانتظام. نستخدم أدوات المسح التلقائي للثغرات (npm audit, Snyk). يتم تصحيح جميع الثغرات الحرجة في غضون 48 ساعة من نشر CVE.' },
      { h: '10. الإبلاغ عن الثغرات', p: 'إذا اكتشفت ثغرة أمنية في OptimaPDF، يرجى الإبلاغ عنها بمسؤولية عبر البريد الإلكتروني: kontakt@optimapdf.com. نتعهد بما يلي:', items: ['تأكيد الاستلام في غضون 24 ساعة.', 'إجراء التحليل واتخاذ الإجراءات التصحيحية في غضون 14 يوماً (حسب الخطورة).', 'إبلاغ المبلغ عن الإجراءات المتخذة.', 'عدم اتخاذ إجراءات قانونية ضد الذين يبلغون عن الثغرات بمسؤولية.'] },
      { h: '11. أمان نقل الملفات', p: 'في الحالات النادرة التي يجب فيها إرسال ملف إلى الخادم (أدوات جانب الخادم)، يتم النقل عبر HTTPS المشفر باستخدام TLS 1.3. يتم نقل الملف في الذاكرة (تدفق) دون تخزين مؤقت على القرص. بعد تلقي الرد، تتم إزالة الملف فوراً من ذاكرة الخادم. لا نحتفظ بسجلات لعمليات الملفات.' },
      { h: '12. الامتثال للمعايير', p: 'نلتزم بمعايير وتوصيات الأمان التالية:', items: ['OWASP Top 10 — الحماية من أكثر ثغرات تطبيقات الويب شيوعاً.', 'GDPR — حماية البيانات الشخصية وفقاً للائحة الاتحاد الأوروبي 2016/679.', 'إرشادات CERT Polska — اتباع توصيات فريق CERT البولندي.', 'Mozilla Observatory — نسعى للحصول على تصنيف A+ في اختبار أمان رؤوس HTTP.'] },
    ],
  },
  de: {
    title: 'Sicherheit',
    updated: 'Zuletzt aktualisiert: 25. Juni 2026',
    intro: 'OptimaPDF legt größten Wert auf Datensicherheit. Nachfolgend finden Sie eine detaillierte Beschreibung der Sicherheitsmaßnahmen, die wir zum Schutz Ihrer Dateien und Daten bei der Nutzung unserer Tools einsetzen.',
    sections: [
      { h: '1. Clientseitige Verarbeitung im Browser', p: 'Die meisten OptimaPDF-Tools arbeiten nach einer Zero-Trust-Architektur — Ihre Datei verlässt niemals Ihr Gerät. Wir verwenden WebAssembly und JavaScript, um PDF-Dateien direkt in Ihrem Browser zu verarbeiten. Das bedeutet, dass nicht einmal wir als Betreiber Zugriff auf Ihre Dateien haben. Dies gilt für: Zusammenführen, Teilen, Drehen, Wasserzeichen, Seitenzahlen, Zuschneiden, Bearbeiten, Signieren, Schwärzen, Reduzieren, Seiten löschen, Seiten extrahieren, Neu anordnen, Seite hinzufügen, Metadaten, PDF→SVG, PDF→EPUB, PDF→TXT, Formular ausfüllen, PDF→Bilder, PDF/A, PDF vergleichen, Entsperren und Schützen.' },
      { h: '2. TLS/SSL-Verschlüsselung', p: 'Die gesamte Kommunikation zwischen Ihrem Browser und unserem Server wird mit TLS 1.3 (Transport Layer Security) verschlüsselt. Wir verwenden ein SSL-Zertifikat einer vertrauenswürdigen Zertifizierungsstelle. Dies bedeutet, dass über das Internet übertragene Daten für Dritte unlesbar sind. Sie können die Gültigkeit des Zertifikats überprüfen, indem Sie auf das Vorhängeschloss-Symbol in der Adressleiste Ihres Browsers klicken.' },
      { h: '3. Content Security Policy (CSP)', p: 'Wir setzen eine strenge Content Security Policy (CSP) durch, die die Ausführung von Skripten aus nicht vertrauenswürdigen Quellen einschränkt. CSP verhindert Cross-Site-Scripting (XSS)-Angriffe, Code-Injection und Datendiebstahl. Unsere CSP-Richtlinie wird regelmäßig geprüft und aktualisiert.' },
      { h: '4. RAM-only-Verarbeitung', p: 'Bei Tools, die eine serverseitige Verarbeitung erfordern (Komprimierung, OCR, Formatkonvertierungen), werden Dateien ausschließlich im RAM des Servers verarbeitet. Dateien werden nicht auf die Festplatte geschrieben, nicht in Backups kopiert und nicht repliziert. Sobald der Vorgang abgeschlossen ist, wird die Datei sofort aus dem Speicher entfernt. Maximale Aufbewahrungszeit auf dem Server: wenige Sekunden.' },
      { h: '5. Dateiüberprüfung', items: ['Magic-Bytes-Überprüfung — vor der Verarbeitung überprüfen wir durch Analyse des Headers (%PDF), ob die hochgeladene Datei tatsächlich eine PDF-Datei ist. Dies verhindert Dateityp-Spoofing-Angriffe.', 'Dateigrößenbeschränkung — die maximale Upload-Größe beträgt 100 MB. Dies schützt sowohl vor Serverüberlastung als auch vor potenziellen DoS-Angriffen.', 'Integritätsprüfung — wir überprüfen, ob die Datei vor Beginn der Verarbeitung nicht beschädigt ist.'] },
      { h: '6. Angriffsschutz', items: ['CSRF-Schutz — wir verwenden Anti-CSRF-Token und Origin/Referer-Header-Überprüfung, um Cross-Site-Request-Forgery-Angriffe zu verhindern.', 'Rate Limiting — wir begrenzen Anfragen von einer einzelnen IP-Adresse, um Brute-Force- und DoS-Angriffe zu verhindern.', 'HTTP-Sicherheitsheader — wir verwenden X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) und Referrer-Policy-Header.', 'Eingabevalidierung — alle Eingabedaten werden sowohl client- als auch serverseitig validiert, um Injection-Angriffe zu verhindern.'] },
      { h: '7. Keine Datenspeicherung', p: 'Wir speichern Ihre Dateien oder persönlichen Daten nicht auf dem Server. Wir verlangen keine Registrierung, Anmeldung oder E-Mail-Adresse zur Nutzung der Tools. Wir erstellen keine Benutzerprofile und verfolgen Ihre Aktivitäten zwischen Besuchen nicht.' },
      { h: '8. Sicherheit der KI-Funktionen', p: 'KI-Funktionen nutzen die externe OpenRouter-API. Ihr API-Schlüssel wird ausschließlich im localStorage Ihres Browsers gespeichert — wir haben keinen Zugriff darauf. Der an OpenRouter gesendete Text beschränkt sich auf den aus der PDF extrahierten Inhalt. Wir senden keine personenidentifizierenden Daten, IP-Adressen oder Browserinformationen. OpenRouter verwendet TLS-Verschlüsselung und nutzt übermittelte Inhalte nicht zum Training von KI-Modellen.' },
      { h: '9. Abhängigkeitssicherheit', p: 'Wir aktualisieren regelmäßig alle im Projekt verwendeten Bibliotheken und Abhängigkeiten. Wir verwenden automatische Schwachstellen-Scanning-Tools (npm audit, Snyk). Alle kritischen Schwachstellen werden innerhalb von 48 Stunden nach Veröffentlichung einer CVE behoben.' },
      { h: '10. Offenlegung von Schwachstellen', p: 'Wenn Sie eine Sicherheitslücke in OptimaPDF entdecken, melden Sie diese bitte verantwortungsvoll per E-Mail an kontakt@optimapdf.com. Wir verpflichten uns zu:', items: ['Bestätigung des Eingangs innerhalb von 24 Stunden.', 'Durchführung einer Analyse und Ergreifung von Korrekturmaßnahmen innerhalb von 14 Tagen (abhängig von der Schwere).', 'Information des Melders über ergriffene Maßnahmen.', 'Keine rechtlichen Schritte gegen Personen, die Schwachstellen verantwortungsvoll offenlegen.'] },
      { h: '11. Sicherheit der Dateiübertragung', p: 'In den seltenen Fällen, in denen eine Datei an den Server gesendet werden muss (serverseitige Tools), erfolgt die Übertragung über verschlüsseltes HTTPS mit TLS 1.3. Die Datei wird im Speicher (Streaming) ohne temporäre Zwischenspeicherung auf der Festplatte übertragen. Nach Erhalt der Antwort wird die Datei sofort aus dem Serverspeicher entfernt. Wir führen keine Protokolle über Dateioperationen.' },
      { h: '12. Einhaltung von Standards', p: 'Wir halten uns an die folgenden Sicherheitsstandards und -empfehlungen:', items: ['OWASP Top 10 — Schutz vor den häufigsten Webanwendungs-Schwachstellen.', 'DSGVO — Schutz personenbezogener Daten gemäß der EU-Verordnung 2016/679.', 'CERT Polska-Richtlinien — Befolgung der Empfehlungen des polnischen CERT-Teams.', 'Mozilla Observatory — wir streben eine A+-Bewertung im Sicherheitstest für HTTP-Header an.'] },
    ],
  },
  es: {
    title: 'Seguridad',
    updated: 'Última actualización: 25 de junio de 2026',
    intro: 'OptimaPDF otorga la máxima importancia a la seguridad de los datos. A continuación se presenta una descripción detallada de las medidas de seguridad que empleamos para proteger sus archivos y datos al utilizar nuestras herramientas.',
    sections: [
      { h: '1. Procesamiento local en el navegador', p: 'La mayoría de las herramientas de OptimaPDF operan bajo una arquitectura de confianza cero — su archivo nunca sale de su dispositivo. Usamos WebAssembly y JavaScript para procesar archivos PDF directamente en su navegador. Esto significa que ni siquiera nosotros, como operadores del servicio, tenemos acceso a sus archivos. Esto aplica a: fusionar, dividir, rotar, marca de agua, numeración, recortar, editar, firmar, redactar, aplanar, eliminar páginas, extraer páginas, reordenar, añadir página, metadatos, PDF→SVG, PDF→EPUB, PDF→TXT, rellenar formularios, PDF→imágenes, PDF/A, comparar PDF, desbloquear y proteger.' },
      { h: '2. Cifrado TLS/SSL', p: 'Toda la comunicación entre su navegador y nuestro servidor está cifrada mediante TLS 1.3 (Seguridad de la Capa de Transporte). Utilizamos un certificado SSL emitido por una autoridad de certificación de confianza. Esto significa que los datos transmitidos a través de internet son ilegibles para terceros. Puede verificar la validez del certificado haciendo clic en el icono del candado en la barra de direcciones de su navegador.' },
      { h: '3. Política de Seguridad del Contenido (CSP)', p: 'Aplicamos una Política de Seguridad del Contenido (CSP) estricta que restringe la ejecución de scripts de fuentes no confiables. CSP previene ataques de Cross-Site Scripting (XSS), inyección de código y robo de datos. Nuestra política CSP se audita y actualiza regularmente.' },
      { h: '4. Procesamiento solo en RAM', p: 'Para las herramientas que requieren procesamiento del lado del servidor (compresión, OCR, conversiones de formato), los archivos se procesan exclusivamente en la RAM del servidor. Los archivos no se escriben en el disco duro, no se copian en copias de seguridad ni se replican. Una vez completada la operación, el archivo se elimina inmediatamente de la memoria. Tiempo máximo de retención en el servidor: unos segundos.' },
      { h: '5. Verificación de archivos', items: ['Verificación de bytes mágicos — antes del procesamiento, verificamos que el archivo subido sea realmente un PDF analizando su cabecera (%PDF). Esto evita ataques de suplantación de tipo de archivo.', 'Límite de tamaño de archivo — el tamaño máximo de carga es de 100 MB. Esto protege tanto contra la sobrecarga del servidor como contra posibles ataques DoS.', 'Verificación de integridad — comprobamos que el archivo no esté dañado antes de comenzar el procesamiento.'] },
      { h: '6. Protección contra ataques', items: ['Protección CSRF — usamos tokens anti-CSRF y verificación del encabezado Origin/Referer para prevenir ataques de Falsificación de Solicitud entre Sitios.', 'Limitación de velocidad — limitamos las solicitudes desde una única dirección IP, protegiendo contra ataques de fuerza bruta y DoS.', 'Encabezados de Seguridad HTTP — aplicamos encabezados X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) y Referrer-Policy.', 'Validación de entrada — todos los datos de entrada se validan tanto del lado del cliente como del servidor, evitando ataques de inyección.'] },
      { h: '7. Almacenamiento cero de datos', p: 'No almacenamos sus archivos ni datos personales en el servidor. No requerimos registro, inicio de sesión ni dirección de correo electrónico para usar las herramientas. No creamos perfiles de usuario ni rastreamos su actividad entre visitas.' },
      { h: '8. Seguridad de funciones de IA', p: 'Las funciones de IA utilizan la API externa de OpenRouter. Su clave de API se almacena exclusivamente en el localStorage de su navegador — no tenemos acceso a ella. El texto enviado a OpenRouter se limita al contenido extraído del PDF. No enviamos datos de identificación del usuario, dirección IP ni información del navegador. OpenRouter utiliza cifrado TLS y no utiliza el contenido enviado para entrenar modelos de IA.' },
      { h: '9. Seguridad de dependencias', p: 'Actualizamos regularmente todas las bibliotecas y dependencias utilizadas en el proyecto. Utilizamos herramientas de escaneo automático de vulnerabilidades (npm audit, Snyk). Todas las vulnerabilidades críticas se corrigen dentro de las 48 horas posteriores a la publicación de un CVE.' },
      { h: '10. Divulgación de vulnerabilidades', p: 'Si descubre una vulnerabilidad de seguridad en OptimaPDF, por favor divúlgala de manera responsable enviando un correo electrónico a kontakt@optimapdf.com. Nos comprometemos a:', items: ['Acusar recibo dentro de las 24 horas.', 'Realizar el análisis y tomar medidas correctivas dentro de 14 días (dependiendo de la gravedad).', 'Informar al denunciante sobre las acciones tomadas.', 'No emprender acciones legales contra quienes divulguen vulnerabilidades de manera responsable.'] },
      { h: '11. Seguridad de transmisión de archivos', p: 'En los raros casos en que un archivo debe enviarse al servidor (herramientas del lado del servidor), la transmisión se realiza a través de HTTPS cifrado con TLS 1.3. El archivo se transmite en memoria (streaming) sin almacenamiento temporal en disco. Después de recibir la respuesta, el archivo se elimina inmediatamente de la memoria del servidor. No mantenemos registros de las operaciones con archivos.' },
      { h: '12. Cumplimiento de estándares', p: 'Cumplimos con los siguientes estándares y recomendaciones de seguridad:', items: ['OWASP Top 10 — protección contra las vulnerabilidades de aplicaciones web más comunes.', 'RGPD — protección de datos personales de acuerdo con el Reglamento UE 2016/679.', 'Directrices CERT Polska — siguiendo las recomendaciones del equipo CERT polaco.', 'Mozilla Observatory — buscamos una calificación A+ en la prueba de seguridad de encabezados HTTP.'] },
    ],
  },
  fa: {
    title: 'امنیت',
    updated: 'آخرین به‌روزرسانی: 25 ژوئن 2026',
    intro: 'Optimapdf بالاترین اهمیت را برای امنیت داده‌ها قائل است. در زیر شرح مفصلی از اقدامات امنیتی که برای محافظت از فایل‌ها و داده‌های شما هنگام استفاده از ابزارهای خود به کار می‌گیریم، ارائه شده است.',
    sections: [
      { h: '1. پردازش سمت مشتری در مرورگر', p: 'اکثر ابزارهای OptimaPDF بر اساس معماری اعتماد صفر عمل می‌کنند — فایل شما هرگز دستگاه شما را ترک نمی‌کند. ما از WebAssembly و JavaScript برای پردازش مستقیم فایل‌های PDF در مرورگر شما استفاده می‌کنیم. این بدان معناست که حتی ما به عنوان اپراتورهای سرویس به فایل‌های شما دسترسی نداریم. این امر در مورد: ادغام، تقسیم، چرخش، واترمارک، شماره‌گذاری صفحات، برش، ویرایش، امضا، پاک‌سازی، مسطح‌سازی، حذف صفحات، استخراج صفحات، مرتب‌سازی مجدد، افزودن صفحه، فراداده‌ها، PDFبهSVG، PDFبهEPUB، PDFبهTXT، پر کردن فرم‌ها، PDFبهتصاویر، PDF/A، مقایسه PDF، باز کردن قفل و محافظت از PDF اعمال می‌شود.' },
      { h: '2. رمزنگاری TLS/SSL', p: 'تمام ارتباطات بین مرورگر شما و سرور ما با استفاده از TLS 1.3 (امنیت لایه حمل و نقل) رمزنگاری می‌شود. ما از گواهی SSL صادر شده توسط یک مرجع گواهی معتبر استفاده می‌کنیم. این بدان معناست که داده‌های منتقل شده از طریق اینترنت برای اشخاص ثالث غیرقابل خواندن است. شما می‌توانید اعتبار گواهی را با کلیک روی نماد قفل در نوار آدرس مرورگر خود تأیید کنید.' },
      { h: '3. سیاست امنیت محتوا (CSP)', p: 'ما یک سیاست امنیت محتوای (CSP) سختگیرانه اعمال می‌کنیم که اجرای اسکریپت‌ها از منابع غیرمعتمد را محدود می‌کند. CSP از حملات اسکریپت‌نویسی بین‌سایتی (XSS)، تزریق کد و سرقت داده جلوگیری می‌کند. خط مشی CSP ما به طور منظم حسابرسی و به‌روزرسانی می‌شود.' },
      { h: '4. پردازش فقط در RAM', p: 'برای ابزارهایی که نیاز به پردازش سمت سرور دارند (فشرده‌سازی، OCR، تبدیل فرمت)، فایل‌ها منحصراً در RAM سرور پردازش می‌شوند. فایل‌ها روی هارد دیسک نوشته نمی‌شوند، در پشتیبان‌گیری کپی نمی‌شوند و تکرار نمی‌شوند. پس از اتمام عملیات، فایل بلافاصله از حافظه حذف می‌شود. حداکثر زمان نگهداری در سرور: چند ثانیه.' },
      { h: '5. تأیید فایل', items: ['تأیید بایت جادویی — قبل از پردازش، با تجزیه و تحلیل هدر (%PDF) تأیید می‌کنیم که فایل آپلود شده واقعاً یک PDF است. این از حملات جعل نوع فایل جلوگیری می‌کند.', 'محدودیت اندازه فایل — حداکثر اندازه آپلود 100 مگابایت است. این امر هم در برابر اضافه بار سرور و هم در برابر حملات DoS احتمالی محافظت می‌کند.', 'بررسی یکپارچگی — قبل از شروع پردازش بررسی می‌کنیم که فایل خراب نباشد.'] },
      { h: '6. محافظت در برابر حملات', items: ['محافظت CSRF — ما از توکن‌های anti-CSRF و تأیید هدر Origin/Referer برای جلوگیری از حملات جعل درخواست بین‌سایتی استفاده می‌کنیم.', 'محدودسازی نرخ — ما درخواست‌ها را از یک آدرس IP محدود می‌کنیم که در برابر حملات brute-force و DoS محافظت می‌کند.', 'هدرهای امنیتی HTTP — ما هدرهای X-Content-Type-Options (nosniff)، X-Frame-Options (DENY)، Strict-Transport-Security (HSTS) و Referrer-Policy را اعمال می‌کنیم.', 'اعتبارسنجی ورودی — تمام داده‌های ورودی در دو سمت کلاینت و سرور اعتبارسنجی می‌شوند که از حملات تزریق جلوگیری می‌کند.'] },
      { h: '7. ذخیره‌سازی صفر داده', p: 'ما فایل‌ها یا داده‌های شخصی شما را در سرور ذخیره نمی‌کنیم. برای استفاده از ابزارها نیازی به ثبت‌نام، ورود به سیستم یا آدرس ایمیل نداریم. ما پروفایل کاربری ایجاد نمی‌کنیم یا فعالیت شما را بین بازدیدها ردیابی نمی‌کنیم.' },
      { h: '8. امنیت ویژگی‌های هوش مصنوعی', p: 'ویژگی‌های هوش مصنوعی از API خارجی OpenRouter استفاده می‌کنند. کلید API شما منحصراً در localStorage مرورگر شما ذخیره می‌شود — ما به آن دسترسی نداریم. متن ارسال شده به OpenRouter به محتوای استخراج شده از PDF محدود می‌شود. ما داده‌های شناسایی کاربر، آدرس IP یا اطلاعات مرورگر را ارسال نمی‌کنیم. OpenRouter از رمزنگاری TLS استفاده می‌کند و از محتوای ارسالی برای آموزش مدل‌های هوش مصنوعی استفاده نمی‌کند.' },
      { h: '9. امنیت وابستگی‌ها', p: 'ما به طور منظم تمام کتابخانه‌ها و وابستگی‌های استفاده شده در پروژه را به‌روزرسانی می‌کنیم. ما از ابزارهای اسکن خودکار آسیب‌پذیری (npm audit, Snyk) استفاده می‌کنیم. تمام آسیب‌پذیری‌های بحرانی ظرف 48 ساعت پس از انتشار CVE وصله می‌شوند.' },
      { h: '10. افشای آسیب‌پذیری', p: 'اگر یک آسیب‌پذیری امنیتی در OptimaPDF کشف کردید، لطفاً آن را به طور مسئولانه از طریق ایمیل kontakt@optimapdf.com گزارش دهید. ما متعهد می‌شویم:', items: ['تأیید دریافت ظرف 24 ساعت.', 'انجام تجزیه و تحلیل و اقدام اصلاحی ظرف 14 روز (بسته به شدت).', 'اطلاع‌رسانی به گزارش‌دهنده درباره اقدامات انجام شده.', 'عدم پیگرد قانونی علیه افرادی که آسیب‌پذیری‌ها را به طور مسئولانه افشا می‌کنند.'] },
      { h: '11. امنیت انتقال فایل', p: 'در موارد نادری که فایل باید به سرور ارسال شود (ابزارهای سمت سرور)، انتقال از طریق HTTPS رمزنگاری شده با استفاده از TLS 1.3 انجام می‌شود. فایل در حافظه (جریانی) بدون ذخیره موقت روی دیسک منتقل می‌شود. پس از دریافت پاسخ، فایل بلافاصله از حافظه سرور حذف می‌شود. ما گزارش‌هایی از عملیات فایل نگهداری نمی‌کنیم.' },
      { h: '12. انطباق با استانداردها', p: 'ما از استانداردها و توصیه‌های امنیتی زیر پیروی می‌کنیم:', items: ['OWASP Top 10 — محافظت در برابر رایج‌ترین آسیب‌پذیری‌های برنامه‌های وب.', 'GDPR — حفاظت از داده‌های شخصی مطابق با مقررات اتحادیه اروپا 2016/679.', 'دستورالعمل‌های CERT لهستان — پیروی از توصیه‌های تیم CERT لهستان.', 'Mozilla Observatory — ما برای کسب رتبه A+ در آزمون امنیتی هدرهای HTTP تلاش می‌کنیم.'] },
    ],
  },
  fr: {
    title: 'Sécurité',
    updated: 'Dernière mise à jour : 25 juin 2026',
    intro: 'OptimaPDF accorde la plus haute importance à la sécurité des données. Vous trouverez ci-dessous une description détaillée des mesures de sécurité que nous employons pour protéger vos fichiers et vos données lors de l\'utilisation de nos outils.',
    sections: [
      { h: '1. Traitement local dans le navigateur', p: 'La plupart des outils OptimaPDF fonctionnent selon une architecture zero-trust — votre fichier ne quitte jamais votre appareil. Nous utilisons WebAssembly et JavaScript pour traiter les fichiers PDF directement dans votre navigateur. Cela signifie que même nous, en tant qu\'opérateurs du service, n\'avons pas accès à vos fichiers. Cela s\'applique à : fusionner, diviser, pivoter, filigrane, numéros de page, rogner, modifier, signer, caviarder, aplatir, supprimer des pages, extraire des pages, réorganiser, ajouter une page, métadonnées, PDF→SVG, PDF→EPUB, PDF→TXT, remplir des formulaires, PDF→images, PDF/A, comparer des PDF, déverrouiller et protéger.' },
      { h: '2. Chiffrement TLS/SSL', p: 'Toutes les communications entre votre navigateur et notre serveur sont chiffrées via TLS 1.3 (Transport Layer Security). Nous utilisons un certificat SSL délivré par une autorité de certification de confiance. Cela signifie que les données transmises sur Internet sont illisibles pour les tiers. Vous pouvez vérifier la validité du certificat en cliquant sur l\'icône du cadenas dans la barre d\'adresse de votre navigateur.' },
      { h: '3. Content Security Policy (CSP)', p: 'Nous appliquons une politique de sécurité du contenu (CSP) stricte qui limite l\'exécution de scripts provenant de sources non fiables. CSP prévient les attaques de Cross-Site Scripting (XSS), l\'injection de code et le vol de données. Notre politique CSP est régulièrement auditée et mise à jour.' },
      { h: '4. Traitement en RAM uniquement', p: 'Pour les outils nécessitant un traitement côté serveur (compression, OCR, conversions de format), les fichiers sont traités exclusivement dans la RAM du serveur. Les fichiers ne sont pas écrits sur le disque dur, ni copiés dans des sauvegardes, ni répliqués. Une fois l\'opération terminée, le fichier est immédiatement supprimé de la mémoire. Durée de conservation maximale sur le serveur : quelques secondes.' },
      { h: '5. Vérification des fichiers', items: ['Vérification des octets magiques — avant le traitement, nous vérifions que le fichier téléchargé est bien un PDF en analysant son en-tête (%PDF). Cela empêche les attaques d\'usurpation de type de fichier.', 'Limite de taille de fichier — la taille maximale de téléchargement est de 100 Mo. Cela protège à la fois contre la surcharge du serveur et contre d\'éventuelles attaques DoS.', 'Vérification d\'intégrité — nous vérifions que le fichier n\'est pas corrompu avant de commencer le traitement.'] },
      { h: '6. Protection contre les attaques', items: ['Protection CSRF — nous utilisons des jetons anti-CSRF et la vérification de l\'en-tête Origin/Referer pour prévenir les attaques de Cross-Site Request Forgery.', 'Limitation de débit — nous limitons les requêtes depuis une seule adresse IP, protégeant contre les attaques par force brute et DoS.', 'En-têtes de sécurité HTTP — nous appliquons les en-têtes X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) et Referrer-Policy.', 'Validation des entrées — toutes les données d\'entrée sont validées côté client et côté serveur, empêchant les attaques par injection.'] },
      { h: '7. Stockage zéro des données', p: 'Nous ne stockons pas vos fichiers ou données personnelles sur le serveur. Nous n\'exigeons pas d\'inscription, de connexion ou d\'adresse e-mail pour utiliser les outils. Nous ne créons pas de profils d\'utilisateurs et ne suivons pas votre activité entre les visites.' },
      { h: '8. Sécurité des fonctions IA', p: 'Les fonctions IA utilisent l\'API externe OpenRouter. Votre clé API est stockée exclusivement dans le localStorage de votre navigateur — nous n\'y avons pas accès. Le texte envoyé à OpenRouter est limité au contenu extrait du PDF. Nous n\'envoyons pas de données d\'identification de l\'utilisateur, d\'adresse IP ou d\'informations sur le navigateur. OpenRouter utilise le chiffrement TLS et n\'utilise pas le contenu soumis pour l\'entraînement des modèles d\'IA.' },
      { h: '9. Sécurité des dépendances', p: 'Nous mettons régulièrement à jour toutes les bibliothèques et dépendances utilisées dans le projet. Nous utilisons des outils de scan automatique des vulnérabilités (npm audit, Snyk). Toutes les vulnérabilités critiques sont corrigées dans les 48 heures suivant la publication d\'un CVE.' },
      { h: '10. Divulgation des vulnérabilités', p: 'Si vous découvrez une vulnérabilité de sécurité dans OptimaPDF, veuillez la divulguer de manière responsable en envoyant un e-mail à kontakt@optimapdf.com. Nous nous engageons à :', items: ['Accuser réception dans les 24 heures.', 'Effectuer une analyse et prendre des mesures correctives dans les 14 jours (selon la gravité).', 'Informer le déclarant des mesures prises.', 'Ne pas engager de poursuites judiciaires contre les personnes qui divulguent des vulnérabilités de manière responsable.'] },
      { h: '11. Sécurité de la transmission des fichiers', p: 'Dans les rares cas où un fichier doit être envoyé au serveur (outils côté serveur), la transmission s\'effectue via HTTPS chiffré avec TLS 1.3. Le fichier est transmis en mémoire (streaming) sans stockage temporaire sur disque. Après réception de la réponse, le fichier est immédiatement supprimé de la mémoire du serveur. Nous ne conservons pas de journaux des opérations sur les fichiers.' },
      { h: '12. Conformité aux normes', p: 'Nous adhérons aux normes et recommandations de sécurité suivantes :', items: ['OWASP Top 10 — protection contre les vulnérabilités d\'applications web les plus courantes.', 'RGPD — protection des données personnelles conformément au règlement UE 2016/679.', 'Directives CERT Polska — suivi des recommandations de l\'équipe CERT polonaise.', 'Mozilla Observatory — nous visons une note A+ au test de sécurité des en-têtes HTTP.'] },
    ],
  },
  hi: {
    title: 'सुरक्षा',
    updated: 'अंतिम अपडेट: 25 जून 2026',
    intro: 'OptimaPDF डेटा सुरक्षा को सर्वोच्च प्राथमिकता देता है। नीचे हमारे टूल का उपयोग करते समय आपकी फ़ाइलों और डेटा की सुरक्षा के लिए हमारे द्वारा उपयोग किए जाने वाले सुरक्षा उपायों का विस्तृत विवरण दिया गया है।',
    sections: [
      { h: '1. ब्राउज़र में क्लाइंट-साइड प्रोसेसिंग', p: 'अधिकांश OptimaPDF टूल जीरो-ट्रस्ट आर्किटेक्चर पर काम करते हैं — आपकी फ़ाइल आपके डिवाइस को कभी नहीं छोड़ती है। हम PDF फ़ाइलों को सीधे आपके ब्राउज़र में प्रोसेस करने के लिए WebAssembly और JavaScript का उपयोग करते हैं। इसका मतलब है कि सेवा संचालक के रूप में हमें भी आपकी फ़ाइलों तक पहुँच नहीं है। यह लागू होता है: मर्ज, स्प्लिट, रोटेट, वॉटरमार्क, पेज-नंबर, क्रॉप, एडिट, साइन, रिडैक्ट, फ्लैटन, पेज हटाएँ, पेज निकालें, पुनर्व्यवस्थित करें, पेज जोड़ें, मेटाडेटा, PDF→SVG, PDF→EPUB, PDF→TXT, फॉर्म भरें, PDF→इमेज, PDF/A, PDF तुलना, अनलॉक और प्रोटेक्ट PDF पर।' },
      { h: '2. TLS/SSL एन्क्रिप्शन', p: 'आपके ब्राउज़र और हमारे सर्वर के बीच सभी संचार TLS 1.3 (ट्रांसपोर्ट लेयर सिक्योरिटी) का उपयोग करके एन्क्रिप्ट किए जाते हैं। हम एक विश्वसनीय प्रमाणन प्राधिकरण द्वारा जारी SSL प्रमाणपत्र का उपयोग करते हैं। इसका मतलब है कि इंटरनेट पर प्रेषित डेटा तीसरे पक्ष के लिए अपठनीय है। आप अपने ब्राउज़र के एड्रेस बार में पैडलॉक आइकन पर क्लिक करके प्रमाणपत्र की वैधता सत्यापित कर सकते हैं।' },
      { h: '3. कंटेंट सिक्योरिटी पॉलिसी (CSP)', p: 'हम एक सख्त कंटेंट सिक्योरिटी पॉलिसी (CSP) लागू करते हैं जो अविश्वसनीय स्रोतों से स्क्रिप्ट के निष्पादन को प्रतिबंधित करती है। CSP क्रॉस-साइट स्क्रिप्टिंग (XSS) हमलों, कोड इंजेक्शन और डेटा चोरी को रोकता है। हमारी CSP नीति की नियमित रूप से जाँच और अद्यतन किया जाता है।' },
      { h: '4. केवल RAM प्रोसेसिंग', p: 'सर्वर-साइड प्रोसेसिंग (कंप्रेशन, OCR, फ़ॉर्मेट रूपांतरण) की आवश्यकता वाले टूल के लिए, फ़ाइलें विशेष रूप से सर्वर की RAM में प्रोसेस की जाती हैं। फ़ाइलें हार्ड ड्राइव पर नहीं लिखी जातीं, बैकअप में कॉपी नहीं की जातीं और न ही दोहराई जातीं। ऑपरेशन पूरा होने के बाद, फ़ाइल तुरंत मेमोरी से हटा दी जाती है। अधिकतम सर्वर प्रतिधारण समय: कुछ सेकंड।' },
      { h: '5. फ़ाइल सत्यापन', items: ['मैजिक बाइट्स सत्यापन — प्रोसेसिंग से पहले, हम इसके हेडर (%PDF) का विश्लेषण करके सत्यापित करते हैं कि अपलोड की गई फ़ाइल वास्तव में PDF है। यह फ़ाइल-प्रकार स्पूफिंग हमलों को रोकता है।', 'फ़ाइल आकार सीमा — अधिकतम अपलोड आकार 100 MB है। यह सर्वर ओवरलोड और संभावित DoS हमलों दोनों से बचाता है।', 'अखंडता जाँच — प्रोसेसिंग शुरू करने से पहले हम सत्यापित करते हैं कि फ़ाइल दूषित नहीं है।'] },
      { h: '6. हमले से सुरक्षा', items: ['CSRF सुरक्षा — हम क्रॉस-साइट रिक्वेस्ट फोर्जरी हमलों को रोकने के लिए एंटी-CSRF टोकन और Origin/Referer हेडर सत्यापन का उपयोग करते हैं।', 'रेट लिमिटिंग — हम एकल IP पते से अनुरोधों को सीमित करते हैं, जो ब्रूट-फोर्स और DoS हमलों से बचाता है।', 'HTTP सुरक्षा हेडर — हम X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) और Referrer-Policy हेडर लागू करते हैं।', 'इनपुट सत्यापन — सभी इनपुट डेटा क्लाइंट और सर्वर दोनों तरफ मान्य किया जाता है, जो इंजेक्शन हमलों को रोकता है।'] },
      { h: '7. शून्य डेटा भंडारण', p: 'हम आपकी फ़ाइलों या व्यक्तिगत डेटा को सर्वर पर संग्रहीत नहीं करते हैं। टूल का उपयोग करने के लिए हमें पंजीकरण, लॉगिन या ईमेल पते की आवश्यकता नहीं है। हम उपयोगकर्ता प्रोफ़ाइल नहीं बनाते हैं या विज़िट के बीच आपकी गतिविधि को ट्रैक नहीं करते हैं।' },
      { h: '8. AI सुविधा सुरक्षा', p: 'AI सुविधाएँ बाहरी OpenRouter API का उपयोग करती हैं। आपकी API कुंजी विशेष रूप से आपके ब्राउज़र के localStorage में संग्रहीत होती है — हमारी उस तक कोई पहुँच नहीं है। OpenRouter को भेजा गया टेक्स्ट PDF से निकाली गई सामग्री तक सीमित है। हम उपयोगकर्ता की पहचान करने वाला डेटा, IP पता या ब्राउज़र जानकारी नहीं भेजते हैं। OpenRouter TLS एन्क्रिप्शन का उपयोग करता है और AI मॉडल प्रशिक्षण के लिए प्रस्तुत सामग्री का उपयोग नहीं करता है।' },
      { h: '9. निर्भरता सुरक्षा', p: 'हम परियोजना में उपयोग की जाने वाली सभी लाइब्रेरी और निर्भरताओं को नियमित रूप से अपडेट करते हैं। हम स्वचालित भेद्यता स्कैनिंग टूल (npm audit, Snyk) का उपयोग करते हैं। CVE प्रकाशन के 48 घंटों के भीतर सभी महत्वपूर्ण भेद्यताओं को पैच कर दिया जाता है।' },
      { h: '10. भेद्यता प्रकटीकरण', p: 'यदि आपको OptimaPDF में कोई सुरक्षा भेद्यता मिलती है, तो कृपया kontakt@optimapdf.com पर ईमेल करके जिम्मेदारी से इसका खुलासा करें। हम प्रतिबद्ध हैं:', items: ['24 घंटे के भीतर प्राप्ति की पुष्टि करना।', '14 दिनों के भीतर विश्लेषण और सुधारात्मक कार्रवाई करना (गंभीरता पर निर्भर)।', 'रिपोर्टर को की गई कार्रवाइयों के बारे में सूचित करना।', 'जिम्मेदारी से भेद्यता प्रकट करने वालों के खिलाफ कानूनी कार्रवाई नहीं करना।'] },
      { h: '11. फ़ाइल ट्रांसमिशन सुरक्षा', p: 'दुर्लभ मामलों में जहाँ फ़ाइल को सर्वर पर भेजा जाना चाहिए (सर्वर-साइड टूल), ट्रांसमिशन TLS 1.3 का उपयोग करके एन्क्रिप्टेड HTTPS पर होता है। फ़ाइल अस्थायी डिस्क स्टोरेज के बिना मेमोरी (स्ट्रीमिंग) में प्रेषित होती है। प्रतिक्रिया प्राप्त करने के बाद, फ़ाइल तुरंत सर्वर मेमोरी से हटा दी जाती है। हम फ़ाइल संचालन के लॉग नहीं रखते हैं।' },
      { h: '12. मानकों का अनुपालन', p: 'हम निम्नलिखित सुरक्षा मानकों और अनुशंसाओं का पालन करते हैं:', items: ['OWASP Top 10 — सबसे सामान्य वेब एप्लिकेशन भेद्यताओं से सुरक्षा।', 'GDPR — EU विनियमन 2016/679 के अनुसार व्यक्तिगत डेटा सुरक्षा।', 'CERT Polska दिशानिर्देश — पोलिश CERT टीम की सिफारिशों का पालन करना।', 'Mozilla Observatory — हम HTTP हेडर सुरक्षा परीक्षण में A+ रेटिंग का लक्ष्य रखते हैं।'] },
    ],
  },
  is: {
    title: 'Öryggi',
    updated: 'Síðast uppfært: 25. júní 2026',
    intro: 'OptimaPDF leggur áherslu á öryggi gagna. Hér að neðan er ítarleg lýsing á öryggisráðstöfunum sem við beitum til að vernda skrárnar þínar og gögn þegar þú notar verkfærin okkar.',
    sections: [
      { h: '1. Vinnsla á biðlara í vafranum', p: 'Flest OptimaPDF verkfæri starfa á núlltraustsarkitektúr — skráin þín yfirgefur aldrei tækið þitt. Við notum WebAssembly og JavaScript til að vinna PDF-skrár beint í vafranum þínum. Þetta þýðir að jafnvel við, sem rekstraraðilar þjónustunnar, höfum engan aðgang að skránum þínum. Þetta á við um: sameina, skipta, snúa, vatnsmerki, síðunúmer, klippa, breyta, undirrita, svartna, fletja út, eyða síðum, draga út síður, endurraða, bæta við síðu, lýsigögn, PDF→SVG, PDF→EPUB, PDF→TXT, fylla út eyðublöð, PDF→myndir, PDF/A, bera saman PDF, opna lás og vernda PDF.' },
      { h: '2. TLS/SSL dulkóðun', p: 'Öll samskipti milli vafrans þíns og þjónsins okkar eru dulkóðuð með TLS 1.3 (Transport Layer Security). Við notum SSL-vottorð gefið út af traustum vottunaraðila. Þetta þýðir að gögn sem send eru yfir internetið eru ólæsileg fyrir óviðkomandi aðilum. Þú getur staðfest gildi vottorðsins með því að smella á hengilástáknið í heimilisfangsstiku vafrans þíns.' },
      { h: '3. Content Security Policy (CSP)', p: 'Við beitum ströngum Content Security Policy (CSP) sem takmarkar keyrslu skripta frá ótraustum uppruna. CSP kemur í veg fyrir Cross-Site Scripting (XSS) árásir, kóðainnspýtingu og gagnaþjófnað. CSP-reglunum okkar er reglulega endurskoðað og uppfært.' },
      { h: '4. Einungis vinnsla í vinnsluminni', p: 'Fyrir verkfæri sem krefjast vinnslu á þjóni (þjöppun, OCR, sniðbreytingar), eru skrár unnar eingöngu í vinnsluminni þjónsins. Skrár eru ekki skrifaðar á harða diskinn, ekki afritaðar í öryggisafrit og ekki endurteknar. Þegar aðgerð lýkur er skránni strax eytt úr minni. Hámarksgeymslutími á þjóni: nokkrar sekúndur.' },
      { h: '5. Skráastaðfesting', items: ['Töfrabætastaðfesting — fyrir vinnslu staðfestum við að upphlaðna skráin sé raunverulega PDF með því að greina haus hennar (%PDF). Þetta kemur í veg fyrir árásir með fölsun skráargerðar.', 'Stærðartakmörkun skráar — hámarks upphleðslustærð er 100 MB. Þetta verndar bæði gegn ofhleðslu þjóns og mögulegum DoS-árásum.', 'Heilleikaathugun — við staðfestum að skráin sé ekki skemmd áður en vinnsla hefst.'] },
      { h: '6. Vörn gegn árásum', items: ['CSRF-vörn — við notum anti-CSRF tákn og Origin/Referer hausstaðfestingu til að koma í veg fyrir Cross-Site Request Forgery árásir.', 'Tíðnitakmörkun — við takmörkum beiðnir frá einu IP-tölu, sem verndar gegn brute-force og DoS árásum.', 'HTTP öryggishausar — við notum X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) og Referrer-Policy hausa.', 'Inntaksstaðfesting — öll inntaksgögn eru staðfest bæði á biðlara- og þjónshlið, sem kemur í veg fyrir innspýtingarárásir.'] },
      { h: '7. Núll gagnageymsla', p: 'Við geymum ekki skrárnar þínar eða persónuleg gögn á þjóninum. Við krefjumst ekki skráningar, innskráningar eða netfangs til að nota verkfærin. Við búum ekki til notandasnið eða rekjum virkni þína milli heimsókna.' },
      { h: '8. Öryggi gervigreindarvirkni', p: 'Gervigreindarvirkni notar ytri OpenRouter API. API-lykillinn þinn er geymdur eingöngu í localStorage vafrans þíns — við höfum engan aðgang að honum. Texti sendur til OpenRouter er takmarkaður við efni sem dregið er úr PDF. Við sendum ekki persónugreinanleg gögn, IP-tölu eða vafraupplýsingar. OpenRouter notar TLS dulkóðun og notar ekki innsent efni fyrir þjálfun gervigreindarlíkana.' },
      { h: '9. Ósjálfstæðisöryggi', p: 'Við uppfærum reglulega allar bókasöfn og ósjálfstæði sem notuð eru í verkefninu. Við notum sjálfvirk veikleikaskönnunartæki (npm audit, Snyk). Allir mikilvægir veikleikar eru lagfærðir innan 48 klukkustunda frá birtingu CVE.' },
      { h: '10. Uppgötvun veikleika', p: 'Ef þú uppgötvar öryggisveikleika í OptimaPDF, vinsamlegast tilkynntu hann á ábyrgan hátt með tölvupósti á kontakt@optimapdf.com. Við skuldbindum okkur til:', items: ['Að staðfesta móttöku innan 24 klukkustunda.', 'Að framkvæma greiningu og gera úrbætur innan 14 daga (fer eftir alvarleika).', 'Að tilkynna tilkynnanda um aðgerðir sem gripið hefur verið til.', 'Að sækjast ekki eftir lagalegum aðgerðum gegn þeim sem tilkynna veikleika á ábyrgan hátt.'] },
      { h: '11. Öryggi skráaflutnings', p: 'Í þeim sjaldgæfu tilvikum þar sem senda þarf skrá á þjón (þjónshliðarverkfæri), fer flutningur fram með dulkóðuðu HTTPS með TLS 1.3. Skránni er send í minni (streymi) án tímabundinnar geymslu á diski. Eftir að svar berst er skránni tafarlaust eytt úr minni þjónsins. Við geymum ekki annála um skráaaðgerðir.' },
      { h: '12. Fylgni við staðla', p: 'Við fylgjum eftirfarandi öryggisstöðlum og tilmælum:', items: ['OWASP Top 10 — vörn gegn algengustu veikleikum vefforrita.', 'GDPR — vernd persónugagna í samræmi við ESB reglugerð 2016/679.', 'CERT Polska leiðbeiningar — fylgni við tilmæli frá pólska CERT teyminu.', 'Mozilla Observatory — við stefnum að A+ einkunn í öryggisprófi HTTP hausa.'] },
    ],
  },
  it: {
    title: 'Sicurezza',
    updated: 'Ultimo aggiornamento: 25 giugno 2026',
    intro: 'OptimaPDF attribuisce la massima importanza alla sicurezza dei dati. Di seguito è riportata una descrizione dettagliata delle misure di sicurezza che impieghiamo per proteggere i vostri file e dati quando utilizzate i nostri strumenti.',
    sections: [
      { h: '1. Elaborazione lato client nel browser', p: 'La maggior parte degli strumenti OptimaPDF opera su un\'architettura zero-trust — il vostro file non lascia mai il vostro dispositivo. Utilizziamo WebAssembly e JavaScript per elaborare i file PDF direttamente nel vostro browser. Ciò significa che neppure noi, come operatori del servizio, abbiamo accesso ai vostri file. Questo si applica a: unire, dividere, ruotare, filigrana, numerazione pagine, ritagliare, modificare, firmare, oscurare, appiattire, eliminare pagine, estrarre pagine, riordinare, aggiungere pagina, metadati, PDF→SVG, PDF→EPUB, PDF→TXT, compilare moduli, PDF→immagini, PDF/A, confrontare PDF, sbloccare e proteggere PDF.' },
      { h: '2. Crittografia TLS/SSL', p: 'Tutte le comunicazioni tra il vostro browser e il nostro server sono crittografate utilizzando TLS 1.3 (Transport Layer Security). Utilizziamo un certificato SSL rilasciato da un\'autorità di certificazione fiduciaria. Ciò significa che i dati trasmessi su Internet sono illeggibili per terze parti. Potete verificare la validità del certificato facendo clic sull\'icona del lucchetto nella barra degli indirizzi del vostro browser.' },
      { h: '3. Content Security Policy (CSP)', p: 'Applichiamo una rigorosa Content Security Policy (CSP) che limita l\'esecuzione di script da fonti non attendibili. CSP previene attacchi di Cross-Site Scripting (XSS), iniezione di codice e furto di dati. La nostra politica CSP viene regolarmente controllata e aggiornata.' },
      { h: '4. Elaborazione solo in RAM', p: 'Per gli strumenti che richiedono elaborazione lato server (compressione, OCR, conversioni di formato), i file vengono elaborati esclusivamente nella RAM del server. I file non vengono scritti sul disco rigido, non vengono copiati nei backup e non vengono replicati. Una volta completata l\'operazione, il file viene immediatamente rimosso dalla memoria. Tempo massimo di conservazione sul server: pochi secondi.' },
      { h: '5. Verifica dei file', items: ['Verifica dei byte magici — prima dell\'elaborazione, verifichiamo che il file caricato sia effettivamente un PDF analizzandone l\'intestazione (%PDF). Ciò previene attacchi di spoofing del tipo di file.', 'Limite di dimensione del file — la dimensione massima di caricamento è 100 MB. Questo protegge sia dal sovraccarico del server che da potenziali attacchi DoS.', 'Controllo di integrità — verifichiamo che il file non sia danneggiato prima di iniziare l\'elaborazione.'] },
      { h: '6. Protezione dagli attacchi', items: ['Protezione CSRF — utilizziamo token anti-CSRF e verifica dell\'intestazione Origin/Referer per prevenire attacchi di Cross-Site Request Forgery.', 'Limitazione della frequenza — limitiamo le richieste da un singolo indirizzo IP, proteggendo da attacchi brute-force e DoS.', 'Intestazioni di sicurezza HTTP — applichiamo le intestazioni X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) e Referrer-Policy.', 'Validazione dell\'input — tutti i dati di input vengono validati sia lato client che lato server, prevenendo attacchi di iniezione.'] },
      { h: '7. Archiviazione zero dei dati', p: 'Non memorizziamo i vostri file o dati personali sul server. Non richiediamo registrazione, login o indirizzo email per utilizzare gli strumenti. Non creiamo profili utente né tracciamo la vostra attività tra le visite.' },
      { h: '8. Sicurezza delle funzioni AI', p: 'Le funzioni AI utilizzano l\'API esterna OpenRouter. La vostra chiave API è memorizzata esclusivamente nel localStorage del vostro browser — non abbiamo accesso ad essa. Il testo inviato a OpenRouter è limitato al contenuto estratto dal PDF. Non inviamo dati identificativi dell\'utente, indirizzo IP o informazioni sul browser. OpenRouter utilizza la crittografia TLS e non utilizza il contenuto inviato per l\'addestramento dei modelli AI.' },
      { h: '9. Sicurezza delle dipendenze', p: 'Aggiorniamo regolarmente tutte le librerie e dipendenze utilizzate nel progetto. Utilizziamo strumenti di scansione automatica delle vulnerabilità (npm audit, Snyk). Tutte le vulnerabilità critiche vengono corrette entro 48 ore dalla pubblicazione del CVE.' },
      { h: '10. Divulgazione delle vulnerabilità', p: 'Se scoprite una vulnerabilità di sicurezza in OptimaPDF, segnalatela responsabilmente inviando un\'email a kontakt@optimapdf.com. Ci impegniamo a:', items: ['Confermare la ricezione entro 24 ore.', 'Effettuare l\'analisi e adottare misure correttive entro 14 giorni (a seconda della gravità).', 'Informare il segnalante sulle azioni intraprese.', 'Non intraprendere azioni legali contro coloro che divulgano responsabilmente le vulnerabilità.'] },
      { h: '11. Sicurezza della trasmissione dei file', p: 'Nei rari casi in cui un file deve essere inviato al server (strumenti lato server), la trasmissione avviene tramite HTTPS crittografato utilizzando TLS 1.3. Il file viene trasmesso in memoria (streaming) senza archiviazione temporanea su disco. Dopo aver ricevuto la risposta, il file viene immediatamente rimosso dalla memoria del server. Non conserviamo registri delle operazioni sui file.' },
      { h: '12. Conformità agli standard', p: 'Aderiamo ai seguenti standard e raccomandazioni di sicurezza:', items: ['OWASP Top 10 — protezione dalle vulnerabilità delle applicazioni web più comuni.', 'GDPR — protezione dei dati personali ai sensi del Regolamento UE 2016/679.', 'Linee guida CERT Polska — seguendo le raccomandazioni del team CERT polacco.', 'Mozilla Observatory — puntiamo a un rating A+ nel test di sicurezza delle intestazioni HTTP.'] },
    ],
  },
  ja: {
    title: 'セキュリティ',
    updated: '最終更新：2026年6月25日',
    intro: 'OptimaPDFはデータセキュリティを最重視しています。以下は、当社のツールを使用する際にお客様のファイルとデータを保護するために採用しているセキュリティ対策の詳細な説明です。',
    sections: [
      { h: '1. ブラウザでのクライアント側処理', p: 'ほとんどのOptimaPDFツールはゼロトラストアーキテクチャで動作します — お客様のファイルはデバイスから出ることはありません。WebAssemblyとJavaScriptを使用して、ブラウザ上で直接PDFファイルを処理します。これは、サービス運営者である私たちでさえ、お客様のファイルにアクセスできないことを意味します。これが適用されるツール：結合、分割、回転、透かし、ページ番号、切り抜き、編集、署名、墨消し、平坦化、ページ削除、ページ抽出、並べ替え、ページ追加、メタデータ、PDF→SVG、PDF→EPUB、PDF→TXT、フォーム入力、PDF→画像、PDF/A、PDF比較、ロック解除、PDF保護。' },
      { h: '2. TLS/SSL暗号化', p: 'ブラウザとサーバー間のすべての通信はTLS 1.3（トランスポート層セキュリティ）を使用して暗号化されています。当社は信頼できる認証局が発行したSSL証明書を使用しています。つまり、インターネット上で送信されるデータは第三者には読み取れません。ブラウザのアドレスバーの鍵アイコンをクリックして、証明書の有効性を確認できます。' },
      { h: '3. コンテンツセキュリティポリシー（CSP）', p: '当社は、信頼できないソースからのスクリプト実行を制限する厳格なコンテンツセキュリティポリシー（CSP）を実施しています。CSPはクロスサイトスクリプティング（XSS）攻撃、コードインジェクション、データ盗難を防止します。当社のCSPポリシーは定期的に監査・更新されています。' },
      { h: '4. RAMのみでの処理', p: 'サーバー側処理（圧縮、OCR、形式変換）を必要とするツールの場合、ファイルはサーバーのRAM上でのみ処理されます。ファイルはハードドライブに書き込まれず、バックアップにコピーされず、複製もされません。操作が完了すると、ファイルはメモリから即座に削除されます。最大サーバー保持時間：数秒です。' },
      { h: '5. ファイル検証', items: ['マジックバイト検証 — 処理前に、アップロードされたファイルが実際にPDFであることをヘッダー（%PDF）を分析して検証します。これにより、ファイルタイプのなりすまし攻撃を防止します。', 'ファイルサイズ制限 — 最大アップロードサイズは100MBです。これにより、サーバーの過負荷と潜在的なDoS攻撃の両方から保護します。', '整合性チェック — 処理を開始する前に、ファイルが破損していないことを検証します。'] },
      { h: '6. 攻撃からの保護', items: ['CSRF保護 — クロスサイトリクエストフォージェリ攻撃を防ぐために、アンチCSRFトークンとOrigin/Refererヘッダー検証を使用しています。', 'レート制限 — 単一のIPアドレスからのリクエストを制限し、ブルートフォース攻撃やDoS攻撃から保護します。', 'HTTPセキュリティヘッダー — X-Content-Type-Options（nosniff）、X-Frame-Options（DENY）、Strict-Transport-Security（HSTS）、Referrer-Policyヘッダーを適用しています。', '入力検証 — すべての入力データはクライアント側とサーバー側の両方で検証され、インジェクション攻撃を防止します。'] },
      { h: '7. データのゼロ保存', p: '当社はお客様のファイルや個人データをサーバーに保存しません。ツールを使用するために登録、ログイン、メールアドレスの入力は必要ありません。ユーザープロファイルを作成したり、訪問間のアクティビティを追跡したりすることはありません。' },
      { h: '8. AI機能のセキュリティ', p: 'AI機能は外部のOpenRouter APIを使用します。APIキーはブラウザのlocalStorageにのみ保存され、当社はアクセスできません。OpenRouterに送信されるテキストはPDFから抽出されたコンテンツに限定されます。ユーザーを特定するデータ、IPアドレス、ブラウザ情報は送信しません。OpenRouterはTLS暗号化を使用し、送信されたコンテンツをAIモデルのトレーニングに使用することはありません。' },
      { h: '9. 依存関係のセキュリティ', p: 'プロジェクトで使用されるすべてのライブラリと依存関係を定期的に更新しています。自動脆弱性スキャンツール（npm audit、Snyk）を使用しています。すべての重大な脆弱性は、CVE公開後48時間以内に修正されます。' },
      { h: '10. 脆弱性の開示', p: 'OptimaPDFでセキュリティ脆弱性を発見された場合は、kontakt@optimapdf.comまで電子メールで責任を持って開示してください。当社は以下を約束します：', items: ['24時間以内の受領確認。', '14日以内の分析と是正措置の実施（重要度に応じて）。', '報告者への措置内容の通知。', '脆弱性を責任を持って開示した者に対する法的措置を取らないこと。'] },
      { h: '11. ファイル送信のセキュリティ', p: 'ファイルをサーバーに送信する必要がある稀なケース（サーバー側ツール）では、TLS 1.3を使用した暗号化HTTPSを介して送信が行われます。ファイルは一時的なディスク保存なしでメモリ内で（ストリーミング）送信されます。応答を受信した後、ファイルは直ちにサーバーメモリから削除されます。ファイル操作のログは保持しません。' },
      { h: '12. 標準への準拠', p: '当社は以下のセキュリティ基準と推奨事項を遵守しています：', items: ['OWASP Top 10 — 最も一般的なWebアプリケーションの脆弱性からの保護。', 'GDPR — EU規則2016/679に従った個人データ保護。', 'CERT Polskaガイドライン — ポーランドCERTチームの推奨事項に従う。', 'Mozilla Observatory — HTTPヘッダーセキュリティテストでA+評価を目指しています。'] },
    ],
  },
  no: {
    title: 'Sikkerhet',
    updated: 'Sist oppdatert: 25. juni 2026',
    intro: 'OptimaPDF legger størst vekt på datasikkerhet. Nedenfor finner du en detaljert beskrivelse av sikkerhetstiltakene vi bruker for å beskytte filene og dataene dine når du bruker verktøyene våre.',
    sections: [
      { h: '1. Klientsidebehandling i nettleseren', p: 'De fleste OptimaPDF-verktøy opererer med en null-tillit-arkitektur — filen din forlater aldri enheten din. Vi bruker WebAssembly og JavaScript for å behandle PDF-filer direkte i nettleseren din. Dette betyr at selv vi, som tjenesteoperatører, ikke har tilgang til filene dine. Dette gjelder: slå sammen, dele, rotere, vannmerke, sidenummerering, beskjære, redigere, signere, svartlegge, flate ut, slette sider, trekke ut sider, omorganisere, legge til side, metadata, PDF→SVG, PDF→EPUB, PDF→TXT, fylle ut skjemaer, PDF→bilder, PDF/A, sammenligne PDF, låse opp og beskytte PDF.' },
      { h: '2. TLS/SSL-kryptering', p: 'All kommunikasjon mellom nettleseren din og tjeneren vår er kryptert med TLS 1.3 (Transport Layer Security). Vi bruker et SSL-sertifikat utstedt av en pålitelig sertifikatmyndighet. Dette betyr at data som sendes over internett, er uleselige for tredjeparter. Du kan verifisere sertifikatets gyldighet ved å klikke på hengelåsikonet i adresselinjen i nettleseren din.' },
      { h: '3. Content Security Policy (CSP)', p: 'Vi håndhever en streng Content Security Policy (CSP) som begrenser utføring av skript fra upålitelige kilder. CSP forhindrer Cross-Site Scripting (XSS)-angrep, kodeinninjisering og datatyveri. CSP-policyen vår blir jevnlig revidert og oppdatert.' },
      { h: '4. Kun RAM-behandling', p: 'For verktøy som krever behandling på tjenersiden (komprimering, OCR, formatkonverteringer), blir filer behandlet utelukkende i tjenerens RAM. Filer blir ikke skrevet til harddisken, ikke kopiert til sikkerhetskopier og ikke replikert. Når operasjonen er fullført, blir filen umiddelbart fjernet fra minnet. Maksimal oppbevaringstid på tjeneren: noen få sekunder.' },
      { h: '5. Filverifisering', items: ['Magic bytes-verifisering — før behandling verifiserer vi at den opplastede filen faktisk er en PDF ved å analysere hodet (%PDF). Dette forhindrer filtype-forfalskningsangrep.', 'Filstørrelsesgrense — maksimal opplastingsstørrelse er 100 MB. Dette beskytter både mot overbelastning av tjeneren og potensielle DoS-angrep.', 'Integritetssjekk — vi verifiserer at filen ikke er korrupt før behandlingen starter.'] },
      { h: '6. Angrepsbeskyttelse', items: ['CSRF-beskyttelse — vi bruker anti-CSRF-tokener og Origin/Referer-header-verifisering for å forhindre Cross-Site Request Forgery-angrep.', 'Frekvensbegrensning — vi begrenser forespørsler fra en enkelt IP-adresse, noe som beskytter mot brute-force- og DoS-angrep.', 'HTTP-sikkerhetsheadere — vi bruker X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) og Referrer-Policy-headere.', 'Inndatavalidering — alle inndata blir validert både på klient- og tjenersiden, noe som forhindrer injeksjonsangrep.'] },
      { h: '7. Null datalagring', p: 'Vi lagrer ikke filene dine eller personopplysninger på tjeneren. Vi krever ikke registrering, innlogging eller e-postadresse for å bruke verktøyene. Vi oppretter ikke brukerprofiler eller sporer aktiviteten din mellom besøk.' },
      { h: '8. Sikkerhet for AI-funksjoner', p: 'AI-funksjoner bruker det eksterne OpenRouter API. API-nøkkelen din lagres utelukkende i nettleserens localStorage — vi har ikke tilgang til den. Tekst som sendes til OpenRouter, er begrenset til innhold hentet fra PDF. Vi sender ikke personidentifiserende data, IP-adresse eller nettleserinformasjon. OpenRouter bruker TLS-kryptering og bruker ikke innsendt innhold til trening av AI-modeller.' },
      { h: '9. Avhengighetssikkerhet', p: 'Vi oppdaterer jevnlig alle biblioteker og avhengigheter som brukes i prosjektet. Vi bruker automatiske verktøy for sårbarhetsskanning (npm audit, Snyk). Alle kritiske sårbarheter blir lappet innen 48 timer etter publisering av CVE.' },
      { h: '10. Sårbarhetsavsløring', p: 'Hvis du oppdager en sikkerhetssårbarhet i OptimaPDF, vennligst avslør den på en ansvarlig måte ved å sende en e-post til kontakt@optimapdf.com. Vi forplikter oss til:', items: ['Å bekrefte mottak innen 24 timer.', 'Å utføre analyse og iverksette korrigerende tiltak innen 14 dager (avhengig av alvorlighetsgrad).', 'Å informere innmelderen om tiltak som er utført.', 'Ikke å forfølge rettslige skritt mot de som avslører sårbarheter på en ansvarlig måte.'] },
      { h: '11. Sikkerhet for filoverføring', p: 'I de sjeldne tilfellene der en fil må sendes til tjeneren (tjener-sidet verktøy), skjer overføringen over kryptert HTTPS ved hjelp av TLS 1.3. Filen overføres i minnet (strømming) uten midlertidig disk lagring. Etter å ha mottatt svaret, blir filen umiddelbart fjernet fra tjenerens minne. Vi fører ikke logger over filoperasjoner.' },
      { h: '12. Overholdelse av standarder', p: 'Vi følger følgende sikkerhetsstandarder og anbefalinger:', items: ['OWASP Top 10 — beskyttelse mot de vanligste sårbarhetene i nettapplikasjoner.', 'GDPR — beskyttelse av personopplysninger i henhold til EU-forordning 2016/679.', 'CERT Polska-retningslinjer — følger anbefalingene fra det polske CERT-teamet.', 'Mozilla Observatory — vi sikter mot A+-vurdering i sikkerhetstesten for HTTP-headere.'] },
    ],
  },
  pt: {
    title: 'Segurança',
    updated: 'Última atualização: 25 de junho de 2026',
    intro: 'A OptimaPDF atribui a maior importância à segurança dos dados. Abaixo está uma descrição detalhada das medidas de segurança que empregamos para proteger os seus ficheiros e dados ao utilizar as nossas ferramentas.',
    sections: [
      { h: '1. Processamento local no navegador', p: 'A maioria das ferramentas OptimaPDF opera numa arquitetura de confiança zero — o seu ficheiro nunca sai do seu dispositivo. Utilizamos WebAssembly e JavaScript para processar ficheiros PDF diretamente no seu navegador. Isto significa que nem nós, como operadores do serviço, temos acesso aos seus ficheiros. Isto aplica-se a: mesclar, dividir, rodar, marca de água, numeração de páginas, cortar, editar, assinar, redigir, achatar, eliminar páginas, extrair páginas, reordenar, adicionar página, metadados, PDF→SVG, PDF→EPUB, PDF→TXT, preencher formulários, PDF→imagens, PDF/A, comparar PDF, desbloquear e proteger PDF.' },
      { h: '2. Encriptação TLS/SSL', p: 'Toda a comunicação entre o seu navegador e o nosso servidor é encriptada utilizando TLS 1.3 (Transport Layer Security). Utilizamos um certificado SSL emitido por uma autoridade de certificação confiável. Isto significa que os dados transmitidos através da internet são ilegíveis para terceiros. Pode verificar a validade do certificado clicando no ícone do cadeado na barra de endereços do seu navegador.' },
      { h: '3. Política de Segurança de Conteúdo (CSP)', p: 'Aplicamos uma Política de Segurança de Conteúdo (CSP) rigorosa que restringe a execução de scripts de fontes não confiáveis. A CSP previne ataques de Cross-Site Scripting (XSS), injeção de código e roubo de dados. A nossa política CSP é regularmente auditada e atualizada.' },
      { h: '4. Processamento apenas em RAM', p: 'Para ferramentas que requerem processamento do lado do servidor (compressão, OCR, conversões de formato), os ficheiros são processados exclusivamente na RAM do servidor. Os ficheiros não são escritos no disco rígido, não são copiados para backups e não são replicados. Assim que a operação é concluída, o ficheiro é imediatamente removido da memória. Tempo máximo de retenção no servidor: alguns segundos.' },
      { h: '5. Verificação de ficheiros', items: ['Verificação de bytes mágicos — antes do processamento, verificamos se o ficheiro carregado é realmente um PDF analisando o seu cabeçalho (%PDF). Isto evita ataques de falsificação de tipo de ficheiro.', 'Limite de tamanho de ficheiro — o tamanho máximo de carregamento é 100 MB. Isto protege tanto contra sobrecarga do servidor como contra potenciais ataques DoS.', 'Verificação de integridade — verificamos se o ficheiro não está corrompido antes de iniciar o processamento.'] },
      { h: '6. Proteção contra ataques', items: ['Proteção CSRF — utilizamos tokens anti-CSRF e verificação do cabeçalho Origin/Referer para prevenir ataques de Cross-Site Request Forgery.', 'Limitação de taxa — limitamos pedidos de um único endereço IP, protegendo contra ataques de força bruta e DoS.', 'Cabeçalhos de Segurança HTTP — aplicamos cabeçalhos X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) e Referrer-Policy.', 'Validação de entrada — todos os dados de entrada são validados tanto no lado do cliente como do servidor, evitando ataques de injeção.'] },
      { h: '7. Armazenamento zero de dados', p: 'Não armazenamos os seus ficheiros ou dados pessoais no servidor. Não exigimos registo, início de sessão ou endereço de email para utilizar as ferramentas. Não criamos perfis de utilizador nem rastreamos a sua atividade entre visitas.' },
      { h: '8. Segurança das funções de IA', p: 'As funções de IA utilizam a API externa OpenRouter. A sua chave API é armazenada exclusivamente no localStorage do seu navegador — não temos acesso a ela. O texto enviado para o OpenRouter é limitado ao conteúdo extraído do PDF. Não enviamos dados de identificação do utilizador, endereço IP ou informações do navegador. O OpenRouter utiliza encriptação TLS e não utiliza o conteúdo submetido para treino de modelos de IA.' },
      { h: '9. Segurança de dependências', p: 'Atualizamos regularmente todas as bibliotecas e dependências utilizadas no projeto. Utilizamos ferramentas de digitalização automática de vulnerabilidades (npm audit, Snyk). Todas as vulnerabilidades críticas são corrigidas no prazo de 48 horas após a publicação do CVE.' },
      { h: '10. Divulgação de vulnerabilidades', p: 'Se descobrir uma vulnerabilidade de segurança na OptimaPDF, divulgue-a de forma responsável enviando um email para kontakt@optimapdf.com. Comprometemo-nos a:', items: ['Confirmar a receção no prazo de 24 horas.', 'Realizar a análise e tomar medidas corretivas no prazo de 14 dias (dependendo da gravidade).', 'Informar o denunciante sobre as medidas tomadas.', 'Não intentar ações legais contra aqueles que divulgam vulnerabilidades de forma responsável.'] },
      { h: '11. Segurança da transmissão de ficheiros', p: 'Nos raros casos em que um ficheiro deve ser enviado para o servidor (ferramentas do lado do servidor), a transmissão ocorre através de HTTPS encriptado utilizando TLS 1.3. O ficheiro é transmitido em memória (streaming) sem armazenamento temporário em disco. Após receber a resposta, o ficheiro é imediatamente removido da memória do servidor. Não mantemos registos das operações com ficheiros.' },
      { h: '12. Conformidade com normas', p: 'Cumprimos as seguintes normas e recomendações de segurança:', items: ['OWASP Top 10 — proteção contra as vulnerabilidades de aplicações web mais comuns.', 'RGPD — proteção de dados pessoais de acordo com o Regulamento UE 2016/679.', 'Diretrizes CERT Polska — seguindo as recomendações da equipa CERT polaca.', 'Mozilla Observatory — visamos uma classificação A+ no teste de segurança de cabeçalhos HTTP.'] },
    ],
  },
  sv: {
    title: 'Säkerhet',
    updated: 'Senast uppdaterad: 25 juni 2026',
    intro: 'OptimaPDF lägger största vikt vid datasäkerhet. Nedan följer en detaljerad beskrivning av de säkerhetsåtgärder som vi använder för att skydda dina filer och data när du använder våra verktyg.',
    sections: [
      { h: '1. Klientsidebehandling i webbläsaren', p: 'De flesta OptimaPDF-verktyg arbetar med en nollförtroendearkitektur — din fil lämnar aldrig din enhet. Vi använder WebAssembly och JavaScript för att bearbeta PDF-filer direkt i din webbläsare. Detta innebär att inte ens vi, som tjänsteoperatörer, har tillgång till dina filer. Detta gäller för: slå samman, dela, rotera, vattenstämpel, sidnumrering, beskära, redigera, signera, svartlägga, platta ut, ta bort sidor, extrahera sidor, ordna om, lägg till sida, metadata, PDF→SVG, PDF→EPUB, PDF→TXT, fylla i formulär, PDF→bilder, PDF/A, jämför PDF, låsa upp och skydda PDF.' },
      { h: '2. TLS/SSL-kryptering', p: 'All kommunikation mellan din webbläsare och vår server är krypterad med TLS 1.3 (Transport Layer Security). Vi använder ett SSL-certifikat utfärdat av en betrodd certifikatutfärdare. Detta innebär att data som överförs via internet är oläslig för tredje part. Du kan verifiera certifikatets giltighet genom att klicka på hänglåsikonen i webbläsarens adressfält.' },
      { h: '3. Content Security Policy (CSP)', p: 'Vi tillämpar en strikt Content Security Policy (CSP) som begränsar exekvering av skript från opålitliga källor. CSP förhindrar Cross-Site Scripting (XSS)-attacker, kod-injektion och datastöld. Vår CSP-policy granskas och uppdateras regelbundet.' },
      { h: '4. Endast RAM-behandling', p: 'För verktyg som kräver serversidebehandling (komprimering, OCR, formatkonverteringar), bearbetas filer uteslutande i serverns RAM. Filer skrivs inte till hårddisken, kopieras inte till säkerhetskopior och replikeras inte. När åtgärden är slutförd tas filen omedelbart bort från minnet. Maximal lagringstid på servern: några sekunder.' },
      { h: '5. Filverifiering', items: ['Magic bytes-verifiering — före bearbetning verifierar vi att den uppladdade filen faktiskt är en PDF genom att analysera dess huvud (%PDF). Detta förhindrar filtypsförfalskningsattacker.', 'Filstorleksgräns — maximal uppladdningsstorlek är 100 MB. Detta skyddar både mot serveröverbelastning och potentiella DoS-attacker.', 'Integritetskontroll — vi verifierar att filen inte är skadad innan bearbetning påbörjas.'] },
      { h: '6. Skydd mot attacker', items: ['CSRF-skydd — vi använder anti-CSRF-tokens och Origin/Referer-huvudverifiering för att förhindra Cross-Site Request Forgery-attacker.', 'Hastighetsbegränsning — vi begränsar förfrågningar från en enskild IP-adress, vilket skyddar mot brute-force- och DoS-attacker.', 'HTTP-säkerhetshuvuden — vi tillämpar X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) och Referrer-Policy-huvuden.', 'Indatavalidering — all indata valideras både på klient- och serversidan, vilket förhindrar injektionsattacker.'] },
      { h: '7. Noll datalagring', p: 'Vi lagrar inte dina filer eller personuppgifter på servern. Vi kräver inte registrering, inloggning eller e-postadress för att använda verktygen. Vi skapar inte användarprofiler eller spårar din aktivitet mellan besök.' },
      { h: '8. Säkerhet för AI-funktioner', p: 'AI-funktioner använder det externa OpenRouter API. Din API-nyckel lagras uteslutande i webbläsarens localStorage — vi har inte tillgång till den. Text som skickas till OpenRouter är begränsad till innehåll som extraherats från PDF. Vi skickar inte användaridentifierande data, IP-adress eller webbläsarinformation. OpenRouter använder TLS-kryptering och använder inte inskickat innehåll för träning av AI-modeller.' },
      { h: '9. Beroendesäkerhet', p: 'Vi uppdaterar regelbundet alla bibliotek och beroenden som används i projektet. Vi använder automatiska sårbarhetsskanningsverktyg (npm audit, Snyk). Alla kritiska sårbarheter åtgärdas inom 48 timmar efter publicering av CVE.' },
      { h: '10. Rapportering av sårbarheter', p: 'Om du upptäcker en säkerhetssårbarhet i OptimaPDF, vänligen rapportera den på ett ansvarsfullt sätt via e-post till kontakt@optimapdf.com. Vi förbinder oss att:', items: ['Bekräfta mottagande inom 24 timmar.', 'Utföra analys och vidta korrigerande åtgärder inom 14 dagar (beroende på allvarlighetsgrad).', 'Informera rapportören om vidtagna åtgärder.', 'Inte vidta rättsliga åtgärder mot dem som på ett ansvarsfullt sätt rapporterar sårbarheter.'] },
      { h: '11. Säkerhet för filöverföring', p: 'I de sällsynta fall där en fil måste skickas till servern (server-side-verktyg), sker överföringen över krypterad HTTPS med TLS 1.3. Filen överförs i minnet (streaming) utan tillfällig disklagring. Efter att ha mottagit svaret tas filen omedelbart bort från serverns minne. Vi för inte loggar över filoperationer.' },
      { h: '12. Efterlevnad av standarder', p: 'Vi följer följande säkerhetsstandarder och rekommendationer:', items: ['OWASP Top 10 — skydd mot de vanligaste sårbarheterna i webbapplikationer.', 'GDPR — skydd av personuppgifter enligt EU-förordning 2016/679.', 'CERT Polska-riktlinjer — följer rekommendationer från det polska CERT-teamet.', 'Mozilla Observatory — vi strävar efter A+-betyg i säkerhetstestet för HTTP-huvuden.'] },
    ],
  },
  tr: {
    title: 'Güvenlik',
    updated: 'Son güncelleme: 25 Haziran 2026',
    intro: 'OptimaPDF veri güvenliğine en büyük önemi vermektedir. Araçlarımızı kullanırken dosyalarınızı ve verilerinizi korumak için kullandığımız güvenlik önlemlerinin ayrıntılı bir açıklaması aşağıda yer almaktadır.',
    sections: [
      { h: '1. Tarayıcıda istemci tarafı işleme', p: 'Çoğu OptimaPDF aracı sıfır güven mimarisiyle çalışır — dosyanız cihazınızdan asla ayrılmaz. PDF dosyalarını doğrudan tarayıcınızda işlemek için WebAssembly ve JavaScript kullanırız. Bu, hizmet operatörleri olarak bizlerin bile dosyalarınıza erişimi olmadığı anlamına gelir. Bu şunlar için geçerlidir: birleştirme, bölme, döndürme, filigran, sayfa numaralama, kırpma, düzenleme, imzalama, karartma, düzleştirme, sayfa silme, sayfa çıkarma, yeniden sıralama, sayfa ekleme, meta veriler, PDF→SVG, PDF→EPUB, PDF→TXT, form doldurma, PDF→görseller, PDF/A, PDF karşılaştırma, kilidi açma ve PDF koruma.' },
      { h: '2. TLS/SSL şifreleme', p: 'Tarayıcınız ile sunucumuz arasındaki tüm iletişim TLS 1.3 (Transport Layer Security) kullanılarak şifrelenir. Güvenilir bir sertifika yetkilisi tarafından verilen bir SSL sertifikası kullanırız. Bu, internet üzerinden iletilen verilerin üçüncü taraflarca okunamayacağı anlamına gelir. Tarayıcınızın adres çubuğundaki kilit simgesine tıklayarak sertifikanın geçerliliğini doğrulayabilirsiniz.' },
      { h: '3. İçerik Güvenlik Politikası (CSP)', p: 'Güvenilmeyen kaynaklardan gelen komut dosyalarının yürütülmesini kısıtlayan katı bir İçerik Güvenlik Politikası (CSP) uygularız. CSP, Siteler Arası Komut Dosyası Çalıştırma (XSS) saldırılarını, kod enjeksiyonunu ve veri hırsızlığını önler. CSP politikamız düzenli olarak denetlenir ve güncellenir.' },
      { h: '4. Yalnızca RAM işleme', p: 'Sunucu tarafı işleme gerektiren araçlar (sıkıştırma, OCR, biçim dönüştürme) için dosyalar yalnızca sunucunun RAM\'inde işlenir. Dosyalar sabit sürücüye yazılmaz, yedeklere kopyalanmaz ve çoğaltılmaz. İşlem tamamlandıktan sonra dosya derhal bellekten kaldırılır. Maksimum sunucuda saklama süresi: birkaç saniye.' },
      { h: '5. Dosya doğrulama', items: ['Sihirli bayt doğrulaması — işlemeden önce, yüklenen dosyanın başlığını (%PDF) analiz ederek gerçekten bir PDF olup olmadığını doğrularız. Bu, dosya türü sahteciliği saldırılarını önler.', 'Dosya boyutu sınırı — maksimum yükleme boyutu 100 MB\'tır. Bu, hem sunucu aşırı yüklenmesine hem de olası DoS saldırılarına karşı korur.', 'Bütünlük kontrolü — işleme başlamadan önce dosyanın bozuk olmadığını doğrularız.'] },
      { h: '6. Saldırı koruması', items: ['CSRF koruması — Siteler Arası İstek Sahteciliği saldırılarını önlemek için anti-CSRF belirteçleri ve Origin/Referer başlık doğrulaması kullanırız.', 'Hız sınırlama — tek bir IP adresinden gelen istekleri sınırlandırarak kaba kuvvet ve DoS saldırılarına karşı koruruz.', 'HTTP Güvenlik Başlıkları — X-Content-Type-Options (nosniff), X-Frame-Options (DENY), Strict-Transport-Security (HSTS) ve Referrer-Policy başlıklarını uygularız.', 'Girdi doğrulama — tüm girdi verileri hem istemci hem de sunucu tarafında doğrulanarak enjeksiyon saldırıları önlenir.'] },
      { h: '7. Sıfır veri depolama', p: 'Dosyalarınızı veya kişisel verilerinizi sunucuda depolamayız. Araçları kullanmak için kayıt, giriş veya e-posta adresi gerektirmeyiz. Kullanıcı profilleri oluşturmayız veya ziyaretler arasında etkinliğinizi izlemeyiz.' },
      { h: '8. AI özellik güvenliği', p: 'AI özellikleri harici OpenRouter API\'sini kullanır. API anahtarınız yalnızca tarayıcınızın localStorage\'ında saklanır — buna erişimimiz yoktur. OpenRouter\'a gönderilen metin, PDF\'den çıkarılan içerikle sınırlıdır. Kullanıcıyı tanımlayan veriler, IP adresi veya tarayıcı bilgileri göndermeyiz. OpenRouter TLS şifrelemesi kullanır ve gönderilen içeriği AI model eğitimi için kullanmaz.' },
      { h: '9. Bağımlılık güvenliği', p: 'Projede kullanılan tüm kütüphaneleri ve bağımlılıkları düzenli olarak güncelleriz. Otomatik güvenlik açığı tarama araçları (npm audit, Snyk) kullanırız. Tüm kritik güvenlik açıkları, CVE yayınlandıktan sonra 48 saat içinde yamalanır.' },
      { h: '10. Güvenlik açığı bildirimi', p: 'OptimaPDF\'de bir güvenlik açığı keşfederseniz, lütfen kontakt@optimapdf.com adresine e-posta göndererek sorumlu bir şekilde bildirin. Şunları taahhüt ederiz:', items: ['24 saat içinde alındığını onaylamak.', '14 gün içinde analiz yapmak ve düzeltici önlem almak (ciddiyetine bağlı olarak).', 'Bildirimde bulunan kişiyi alınan önlemler hakkında bilgilendirmek.', 'Güvenlik açıklarını sorumlu bir şekilde bildirenlere karşı yasal işlem başlatmamak.'] },
      { h: '11. Dosya iletim güvenliği', p: 'Bir dosyanın sunucuya gönderilmesi gereken nadir durumlarda (sunucu tarafı araçlar), iletim TLS 1.3 kullanılarak şifrelenmiş HTTPS üzerinden gerçekleşir. Dosya, geçici disk depolaması olmadan bellekte (akış) iletilir. Yanıt alındıktan sonra dosya derhal sunucu belleğinden kaldırılır. Dosya işlemlerinin günlüklerini tutmayız.' },
      { h: '12. Standartlara uygunluk', p: 'Aşağıdaki güvenlik standartlarına ve önerilerine uyuyoruz:', items: ['OWASP Top 10 — en yaygın web uygulaması güvenlik açıklarına karşı koruma.', 'GDPR — AB Yönetmeliği 2016/679 uyarınca kişisel veri koruması.', 'CERT Polska yönergeleri — Polonya CERT ekibinin önerilerini takip etme.', 'Mozilla Observatory — HTTP başlıkları güvenlik testinde A+ derecesini hedefliyoruz.'] },
    ],
  },
  zh: {
    title: '安全',
    updated: '最后更新：2026年6月25日',
    intro: 'OptimaPDF高度重视数据安全。以下是我们为保护您在使用我们工具时的文件和数据所采取的安全措施的详细说明。',
    sections: [
      { h: '1. 浏览器中的客户端处理', p: '大多数OptimaPDF工具采用零信任架构运行 — 您的文件永远不会离开您的设备。我们使用WebAssembly和JavaScript直接在您的浏览器中处理PDF文件。这意味着即使是作为服务运营商的我们，也无法访问您的文件。这适用于：合并、拆分、旋转、水印、页码、裁剪、编辑、签名、编辑、展平、删除页面、提取页面、重新排序、添加页面、元数据、PDF→SVG、PDF→EPUB、PDF→TXT、填写表单、PDF→图像、PDF/A、比较PDF、解锁和保护PDF。' },
      { h: '2. TLS/SSL加密', p: '您的浏览器与我们的服务器之间的所有通信都使用TLS 1.3（传输层安全）进行加密。我们使用受信任证书颁发机构颁发的SSL证书。这意味着通过互联网传输的数据对第三方是不可读的。您可以通过单击浏览器地址栏中的挂锁图标来验证证书的有效性。' },
      { h: '3. 内容安全策略（CSP）', p: '我们执行严格的内容安全策略（CSP），限制来自不可信来源的脚本执行。CSP可防止跨站脚本（XSS）攻击、代码注入和数据盗窃。我们的CSP策略会定期审计和更新。' },
      { h: '4. 仅RAM处理', p: '对于需要服务器端处理的工具（压缩、OCR、格式转换），文件仅在服务器的RAM中处理。文件不会写入硬盘，不会复制到备份，也不会被复制。操作完成后，文件将立即从内存中删除。最大服务器保留时间：几秒钟。' },
      { h: '5. 文件验证', items: ['魔术字节验证 — 在处理之前，我们通过分析文件头（%PDF）来验证上传的文件是否确实是PDF。这可以防止文件类型欺骗攻击。', '文件大小限制 — 最大上传大小为100 MB。这既可以防止服务器过载，也可以防止潜在的DoS攻击。', '完整性检查 — 我们在开始处理之前验证文件是否损坏。'] },
      { h: '6. 攻击防护', items: ['CSRF防护 — 我们使用反CSRF令牌和Origin/Referer标头验证来防止跨站请求伪造攻击。', '速率限制 — 我们限制来自单个IP地址的请求，防止暴力破解和DoS攻击。', 'HTTP安全标头 — 我们应用X-Content-Type-Options（nosniff）、X-Frame-Options（DENY）、Strict-Transport-Security（HSTS）和Referrer-Policy标头。', '输入验证 — 所有输入数据均在客户端和服务器端进行验证，防止注入攻击。'] },
      { h: '7. 零数据存储', p: '我们不会将您的文件或个人数据存储在服务器上。使用工具无需注册、登录或提供电子邮件地址。我们不会创建用户资料或跟踪您在不同访问之间的活动。' },
      { h: '8. AI功能安全', p: 'AI功能使用外部OpenRouter API。您的API密钥仅存储在您浏览器的localStorage中 — 我们无法访问它。发送到OpenRouter的文本仅限于从PDF中提取的内容。我们不会发送用户身份识别数据、IP地址或浏览器信息。OpenRouter使用TLS加密，并且不会使用提交的内容进行AI模型训练。' },
      { h: '9. 依赖项安全', p: '我们定期更新项目中使用的所有库和依赖项。我们使用自动漏洞扫描工具（npm audit、Snyk）。所有关键漏洞将在CVE发布后48小时内修复。' },
      { h: '10. 漏洞披露', p: '如果您在OptimaPDF中发现安全漏洞，请通过电子邮件kontakt@optimapdf.com负责任地披露。我们承诺：', items: ['在24小时内确认收到。', '在14天内进行分析并采取纠正措施（取决于严重程度）。', '告知报告者所采取的行动。', '不对负责任披露漏洞的人士采取法律行动。'] },
      { h: '11. 文件传输安全', p: '在极少数需要将文件发送到服务器的情况下（服务器端工具），传输通过使用TLS 1.3的加密HTTPS进行。文件在内存中传输（流式传输），无需临时磁盘存储。收到响应后，文件将立即从服务器内存中删除。我们不保留文件操作日志。' },
      { h: '12. 标准合规', p: '我们遵守以下安全标准和推荐实践：', items: ['OWASP Top 10 — 防范最常见的Web应用程序漏洞。', 'GDPR — 根据欧盟条例2016/679保护个人数据。', 'CERT Polska指南 — 遵循波兰CERT团队的推荐。', 'Mozilla Observatory — 我们力求在HTTP标头安全测试中获得A+评级。'] },
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
