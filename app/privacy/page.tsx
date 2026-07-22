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
          'Google LLC (Google Analytics) — anonimowe dane statystyczne o ruchu na stronie, na podstawie Twojej zgody.',
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
          'Google LLC (Google Analytics) — anonymized traffic statistics, based on your consent.',
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
  ar: {
    title: 'سياسة الخصوصية',
    updated: 'آخر تحديث: 30 يونيو 2026',
    sections: [
      { h: '1. أحكام عامة', p: 'تحدد سياسة الخصوصية هذه مبادئ معالجة وحماية البيانات الشخصية لمستخدمي موقع OptimaPDF (optimapdf.com). تولي OptimaPDF أهمية قصوى للخصوصية وأمن البيانات. تم تصميم جميع الأدوات وفقاً لمبدأ الخصوصية بالتصميم — بشكل افتراضي، يتم معالجة ملفاتك محلياً في متصفحك.' },
      { h: '2. مُحدِّث البيانات', p: 'مُحدِّث البيانات هو Leszek Hofman، Dąbrówka Nowa، بولندا. الاتصال: kontakt@optimapdf.com. لم يُعيّن المُحدِّث مسؤول حماية البيانات — لجميع المسائل المتعلقة بحماية البيانات الشخصية، تواصل معنا مباشرة عبر عنوان البريد الإلكتروني أعلاه.' },
      { h: '3. نطاق وأغراض جمع البيانات', sub: [
        { h: '3.1 البيانات التقنية', p: 'عند استخدام الموقع، يتم جمع البيانات التقنية التالية تلقائياً: عنوان IP، نوع وإصدار المتصفح، نظام التشغيل، دقة الشاشة، الموقع الجغرافي التقريبي (على مستوى الدولة)، وقت الزيارة والوقت الم قضي في الموقع. يتم إخفاء هوية هذه البيانات واستخدامها حصرياً لأغراض إحصائية وضمان الأمان.' },
        { h: '3.2 الملفات التي يرفعها المستخدم', p: 'تتم معالجة ملفات PDF التي يتم رفعها إلى الأدوات كالتالي:', items: [
          'الأدوات الجانبية (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) — يتم معالجة الملف بالكامل في المتصفح باستخدام WebAssembly و JavaScript. لا يغادر الملف جهازك.',
          'الأدوات الجانبية للخادم (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) — يتم إرسال الملف مؤقتاً إلى الخادم، ومعالجته حصرياً في ذاكرة RAM، وحذفه فوراً بعد العملية. الحد الأقصى للاحتفاظ: بضع ثوانٍ.',
          'وظائف الذكاء الاصطناعي (AI Chat, AI Summary, AI Translate) — يتم إرسال النص المستخرج من PDF إلى واجهة برمجة التطبيقات الخارجية OpenRouter. لا نرسل بيانات تحدد المستخدم. المحتوى لا يُخزَّن أو يُستخدم لتدريب النماذج.'
        ] },
        { h: '3.3 تفضيلات المستخدم', p: 'يتم تخزين معلومات حول السمة المختارة (داكن/فاتح) واللغة (بولندية/إنجليزية) في localStorage المتصفح. لا يتم إرسالها إلى الخادم أو مشاركتها مع أطراف ثالثة.' }
      ] },
      { h: '4. الأساس القانوني للمعالجة', items: [
        'المادة 6(1)(ب) من اللائحة العامة لحماية البيانات — تنفيذ عقد خدمة إلكترونية (توفير أدوات PDF).',
        'المادة 6(1)(ف) من اللائحة العامة لحماية البيانات — المصلحة المشروعة لمُحدِّث البيانات (ضمان الأمان، منع سوء الاستخدام، التحليل التقني).',
        'المادة 6(1)(أ) من اللائحة العامة لحماية البيانات — موافقة المستخدم (للوظائف الذكية). يمكن سحب الموافقة في أي وقت.'
      ] },
      { h: '5. متلقوا البيانات', p: 'قد تتم ترقية البيانات إلى فئات المتلقين التالية:', items: [
        'Google LLC (Google Analytics) — إحصاءات حركة المرور المجهولة الهوية، بناءً على موافقتك.',
        'المعالجون الذين يействون نيابةً عننا (الاستضافة، OpenRouter.ai) — بناءً على اتفاقيات معالجة البيانات.',
        'الجهات المعنية بموجب الأحكام القانونية — فقط في الحالات المنصوص عليها قانوناً.'
      ] },
      { h: '6. نقل البيانات خارج منطقة الاقتصاد الأوروبي', p: 'عند استخدام ميزات الذكاء الاصطناعي، قد يتم معالجة النص على خوادم OpenRouter في الولايات المتحدة. تشارك OpenRouter في إطار خصوصية البيانات (DPF)، مما يضمن مستوى كافياً من حماية البيانات (قرار الم commission الأوروبية 2023/1795). في الحالات الأخرى، لا يتم نقل البيانات إلى دول ثالثة.' },
      { h: '7. مدة الاحتفاظ بالبيانات', p: 'يتم تخزين البيانات لمدة:', items: [
        'سجلات الخادم (عنوان IP، User-Agent): حتى 7 أيام.',
        'الملفات المرفوعة إلى الأدوات الجانبية: لا يتم تخزينها — تُحذف من الذاكرة عند تحديث الصفحة.',
        'الملفات المرفوعة إلى أدوات الخادم: تُحذف فوراً بعد المعالجة.',
        'بيانات localStorage: حتى يتم حذفها يدوياً من قبل المستخدم.'
      ] },
      { h: '8. حقوق المستخدم', p: 'لك الحق في:', items: [
        'الوصول إلى بياناتك (المادة 15 من اللائحة العامة لحماية البيانات).',
        'تصحيح البيانات (المادة 16 من اللائحة العامة لحماية البيانات).',
        'حذف البيانات (المادة 17 من اللائحة العامة لحماية البيانات) — الحق في النسيان.',
        'تقييد المعالجة (المادة 18 من اللائحة العامة لحماية البيانات).',
        'نقل البيانات (المادة 20 من اللائحة العامة لحماية البيانات).',
        'الاعتراض على المعالجة (المادة 21 من اللائحة العامة لحماية البيانات).',
        'سحب الموافقة في أي وقت دون المساس بمشروعة المعالجة بناءً على الموافقة قبل سحبها.',
        'تقديم شكوى إلى رئيس مكتب حماية البيانات الشخصية (PUODO)، ul. Stawki 2، 00-193 وارسو، بولندا.'
      ] },
      { h: '9. أمن البيانات', p: 'نطبق تدابير الأمان التالية:', items: [
        'تشفير TLS/SSL — جميع الاتصالات بين المتصفح والخادم مشفرة.',
        'سياسة أمان المحتوى (CSP) — تُحد من قدرة تنفيذ السكريبت غير الموثوقة.',
        'المعالجة في ذاكرة RAM فقط — لا يتم كتابة الملفات على قرص الخادم.',
        'الحذف التلقائي — تُحذف الملفات فوراً اكتمال العملية.',
        'حد حجم الملف — الحد الأقصى 100 ميجابايت.',
        'التحقق من نوع الملف — نتحقق من توقيع الملف (magic bytes) قبل المعالجة.',
        'لا حاجة لتسجيل الدخول — لا نطلب التسجيل أو تسجيل الدخول.'
      ] },
      { h: '10. Google Analytics والموافقة على التحليلات', p: 'يستخدم هذا الموقع Google Analytics (Google LLC، الولايات المتحدة) لتحليل حركة المرور المجهولة الهوية. يجمع Google Analytics بيانات إحصائية مجمعة مثل: عدد الزيارات، الوقت الم قضي في الموقع، نوع المتصفح، الموقع التقريبي (على مستوى الدولة)، مصدر حركة المرور. البيانات مجهولة الهوية (anonymize_ip: true).', items: [
        'عند أول زيارة، يتم عرض شريط موافقة — يتم تنشيط Google Analytics فقط بعد النقر على "Accept".',
        'يمكنك سحب الموافقة في أي وقت عن طريق إزالة سجل "cookie-consent" من localStorage المتصفح.',
        'لا يُستخدم Google Analytics لاستهداف الإعلانات أو التصنيف السلوكي.',
        'البيانات في localStorage (السمة، اللغة، تفضيلات الموافقة) полностью تحت سيطرة المستخدم ويمكن حذفها في أي وقت.'
      ] },
      { h: '11. وظائف الذكاء الاصطناعي وOpenRouter', p: 'يتطلب استخدام وظائف الذكاء الاصطناعي (AI Chat, AI Summary, AI Translate) مفتاح API خاص بك من OpenRouter، والذي يُخزن حصرياً في localStorage المتصفح ولا يُشارك مع مسؤول الموقع. يُستخدم مفتاح API حصرياً للاتصال بواجهة برمجة تطبيقات OpenRouter. ليس لدينا الوصول إلى مفتاح API الخاص بك أو محتوى الاستشارات المرسلة إلى OpenRouter.' },
      { h: '12. أحكام نهائية', p: 'نحتفظ بحق إجراء تغييرات على سياسة الخصوصية هذه. سيتم الإبلاغ عن التغييرات بتحديث التاريخ في أعلى هذه الصفحة. يجب توجيه أي أسئلة بخصوص سياسة الخصوصية إلى: kontakt@optimapdf.com.' }
    ]
  },
  de: {
    title: 'Datenschutzerklärung',
    updated: 'Letzte Aktualisierung: 30. Juni 2026',
    sections: [
      { h: '1. Allgemeine Bestimmungen', p: 'Diese Datenschutzerklärung definiert die Grundsätze der Verarbeitung und des Schutzes personenbezogener Daten der Nutzer der OptimaPDF-Website (optimapdf.com). OptimaPDF legt größten Wert auf Datenschutz und Datensicherheit. Alle Werkzeuge wurden nach dem Prinzip Privacy by Design entworfen — standardmäßig werden Ihre Dateien lokal in Ihrem Browser verarbeitet.' },
      { h: '2. Verantwortlicher', p: 'Der Verantwortliche ist Leszek Hofman, Dąbrówka Nowa, Polen. Kontakt: kontakt@optimapdf.com. Der Verantwortliche hat keinen Datenschutzbeauftragten ernannt — für alle Fragen zum Schutz personenbezogener Daten kontaktieren Sie uns bitte direkt über die oben genannte E-Mail-Adresse.' },
      { h: '3. Umfang und Zwecke der Datenerhebung', sub: [
        { h: '3.1 Technische Daten', p: 'Bei der Nutzung der Website werden automatisch folgende technische Daten erhoben: IP-Adresse, Browsertyp und -version, Betriebssystem, Bildschirmauflösung, ungefährer geografischer Standort (Länderebene), Besuchszeit und auf der Seite verbrachte Zeit. Diese Daten werden anonymisiert und ausschließlich für statistische Zwecke und zur Sicherheitsgewährleistung verwendet.' },
        { h: '3.2 Vom Nutzer hochgeladene Dateien', p: 'PDF-Dateien, die zu Werkzeugen hochgeladen werden, werden wie folgt verarbeitet:', items: [
          'Client-seitige Werkzeuge (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) — die Datei wird vollständig im Browser mit WebAssembly und JavaScript verarbeitet. Die Datei verlässt nie Ihr Gerät.',
          'Server-seitige Werkzeuge (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) — die Datei wird vorübergehend an den Server gesendet, ausschließlich im RAM verarbeitet und unmittelbar nach dem Vorgang gelöscht. Maximale Aufbewahrungszeit: einige Sekunden.',
          'KI-Funktionen (AI Chat, AI Summary, AI Translate) — der aus dem PDF extrahierte Text wird an die externe OpenRouter API gesendet. Wir senden keine nutzeridentifizierenden Daten. Der Inhalt wird nicht gespeichert oder für das Training von Modellen verwendet.'
        ] },
        { h: '3.3 Nutzerpräferenzen', p: 'Informationen über das ausgewählte Thema (dunkel/hell) und die Sprache (Polnisch/Englisch) werden im localStorage des Browsers gespeichert. Sie werden nicht an den Server gesendet oder mit Dritten geteilt.' }
      ] },
      { h: '4. Rechtsgrundlage der Verarbeitung', items: [
        'Art. 6 Abs. 1 lit. b DSGVO — Erfüllung eines Vertrags über elektronische Dienstleistungen (Bereitstellung von PDF-Werkzeugen).',
        'Art. 6 Abs. 1 lit. f DSGVO — berechtigtes Interesse des Verantwortlichen (Gewährleistung der Sicherheit, Missbrauchsprävention, technische Analyse).',
        'Art. 6 Abs. 1 lit. a DSGVO — Einwilligung des Nutzers (für KI-Funktionen). Die Einwilligung kann jederzeit widerrufen werden.'
      ] },
      { h: '5. Empfänger der Daten', p: 'Die Daten können an folgende Kategorien von Empfängern weitergegeben werden:', items: [
        'Google LLC (Google Analytics) — anonymisierte Verkehrsstatistiken, basierend auf Ihrer Einwilligung.',
        'Auftragsverarbeiter, die in unserem Namen handeln (Hosting, OpenRouter.ai) — basierend auf Auftragsverarbeitungsverträgen.',
        'Behörden, die nach gesetzlichen Bestimmungen berechtigt sind — nur in gesetzlich vorgesehenen Fällen.'
      ] },
      { h: '6. Datenübermittlungen außerhalb des EWR', p: 'Bei der Nutzung von KI-Funktionen kann Text auf OpenRouter-Servern in den USA verarbeitet werden. OpenRouter nimmt am Data Privacy Framework (DPF) teil, das ein angemessenes Schutzniveau gewährleistet (Entscheidung der Europäischen Kommission 2023/1795). In anderen Fällen werden keine Daten in Drittländer übermittelt.' },
      { h: '7. Aufbewahrungsfrist der Daten', p: 'Die Daten werden für folgende Zeiträume gespeichert:', items: [
        'Server-Logs (IP-Adresse, User-Agent): bis zu 7 Tage.',
        'Zu client-seitigen Werkzeugen hochgeladene Dateien: nicht gespeichert — werden bei Seitenneustart aus dem Speicher entfernt.',
        'Zu server-seitigen Werkzeugen hochgeladene Dateien: unmittelbar nach der Verarbeitung gelöscht.',
        'localStorage-Daten: bis zum manuellen Löschen durch den Nutzer.'
      ] },
      { h: '8. Rechte des Nutzers', p: 'Sie haben das Recht auf:', items: [
        'Auskunft über Ihre Daten (Art. 15 DSGVO).',
        'Berichtigung der Daten (Art. 16 DSGVO).',
        'Löschung der Daten (Art. 17 DSGVO) — Recht auf Vergessenwerden.',
        'Einschränkung der Verarbeitung (Art. 18 DSGVO).',
        'Datenübertragbarkeit (Art. 20 DSGVO).',
        'Widerspruch gegen die Verarbeitung (Art. 21 DSGVO).',
        'Jederzeitige Widerruf der Einwilligung ohne Beeinträchtigung der Rechtmäßigkeit der aufgrund der Einwilligung vor ihrem Widerruf erfolgten Verarbeitung.',
        'Einlegen einer Beschwerde beim Präsidenten des Büros für den Schutz personenbezogener Daten (PUODO), ul. Stawki 2, 00-193 Warschau, Polen.'
      ] },
      { h: '9. Datensicherheit', p: 'Wir setzen folgende Sicherheitsmaßnahmen ein:', items: [
        'TLS/SSL-Verschlüsselung — die gesamte Kommunikation zwischen Browser und Server ist verschlüsselt.',
        'Content Security Policy (CSP) — begrenzt die Fähigkeit, nicht vertrauenswürdige Skripte auszuführen.',
        'Nur-RAM-Verarbeitung — Dateien werden nicht auf die Festplatte des Servers geschrieben.',
        'Automatische Löschung — Dateien werden unmittelbar nach Abschluss des Vorgangs gelöscht.',
        'Dateigrößenlimit — maximal 100 MB.',
        'Dateitypverifikation — wir prüfen die Dateisignatur (Magic Bytes) vor der Verarbeitung.',
        'Keine Anmeldung erforderlich — wir erfordern keine Registrierung oder Anmeldung.'
      ] },
      { h: '10. Google Analytics und Analyse-Einwilligung', p: 'Diese Website verwendet Google Analytics (Google LLC, USA) zur anonymen Verkehrsanalyse. Google Analytics erfasst aggregierte statistische Daten wie: Besuchsanzahl, auf der Seite verbrachte Zeit, Browsertyp, ungefährer Standort (Länderebene), Verkehrsquelle. Die Daten sind anonymisiert (anonymize_ip: true).', items: [
        'Beim ersten Besuch wird ein Einwilligungsbanner angezeigt — Google Analytics wird erst nach Klicken auf \u201eAccept\u201c aktiviert.',
        'Sie können die Einwilligung jederzeit widerrufen, indem Sie den Eintrag \u201ecookie-consent\u201c aus dem localStorage Ihres Browsers entfernen.',
        'Google Analytics wird nicht für Werbe-Targeting oder Verhaltensprofiling verwendet.',
        'Daten im localStorage (Thema, Sprache, Einwilligungspräferenzen) werden vollständig vom Nutzer kontrolliert und können jederzeit gelöscht werden.'
      ] },
      { h: '11. KI-Funktionen und OpenRouter', p: 'Die Nutzung von KI-Funktionen (AI Chat, AI Summary, AI Translate) erfordert Ihren eigenen OpenRouter API-Schlüssel, der ausschließlich im localStorage Ihres Browsers gespeichert und nicht mit dem Website-Betreiber geteilt wird. Der API-Schlüssel wird ausschließlich zur Kommunikation mit der OpenRouter API verwendet. Wir haben keinen Zugang zu Ihrem API-Schlüssel oder zum Inhalt der an OpenRouter gesendeten Anfragen.' },
      { h: '12. Schlussbestimmungen', p: 'Wir behalten uns das Recht vor, Änderungen an dieser Datenschutzerklärung vorzunehmen. Änderungen werden durch Aktualisierung des Datums oben auf dieser Seite mitgeteilt. Alle Fragen zur Datenschutzerklärung richten Sie bitte an: kontakt@optimapdf.com.' }
    ]
  },
  es: {
    title: 'Política de Privacidad',
    updated: 'Última actualización: 30 de junio de 2026',
    sections: [
      { h: '1. Disposiciones generales', p: 'Esta Política de Privacidad define los principios de tratamiento y protección de datos personales de los usuarios del sitio web OptimaPDF (optimapdf.com). OptimaPDF otorga la mayor importancia a la privacidad y la seguridad de los datos. Todas las herramientas han sido diseñadas siguiendo el principio de privacidad por diseño — por defecto, sus archivos se procesan localmente en su navegador.' },
      { h: '2. Controlador de datos', p: 'El controlador de datos es Leszek Hofman, Dąbrówka Nowa, Polonia. Contacto: kontakt@optimapdf.com. El controlador no ha designado un Delegado de Protección de Datos — para todas las cuestiones relacionadas con la protección de datos personales, contáctenos directamente a través de la dirección de correo electrónico anterior.' },
      { h: '3. Alcance y propósitos de recopilación de datos', sub: [
        { h: '3.1 Datos técnicos', p: 'Al utilizar el sitio web, se recopilan automáticamente los siguientes datos técnicos: dirección IP, tipo y versión del navegador, sistema operativo, resolución de pantalla, ubicación geográfica aproximada (a nivel de país), tiempo de visita y tiempo pasado en el sitio. Estos datos se anonimizan y se utilizan exclusivamente con fines estadísticos y de garantía de seguridad.' },
        { h: '3.2 Archivos cargados por el usuario', p: 'Los archivos PDF cargados en las herramientas se procesan de la siguiente manera:', items: [
          'Herramientas del lado del cliente (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) — el archivo se procesa completamente en el navegador utilizando WebAssembly y JavaScript. El archivo nunca sale de su dispositivo.',
          'Herramientas del lado del servidor (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) — el archivo se envía temporalmente al servidor, se procesa exclusivamente en RAM y se elimina inmediatamente después de la operación. Tiempo máximo de retención: unos segundos.',
          'Funciones de IA (AI Chat, AI Summary, AI Translate) — el texto extraído del PDF se envía a la API externa de OpenRouter. No enviamos datos que identifiquen al usuario. El contenido no se almacena ni se utiliza para el entrenamiento de modelos.'
        ] },
        { h: '3.3 Preferencias del usuario', p: 'La información sobre el tema seleccionado (oscuro/claro) y el idioma (polaco/inglés) se almacena en el localStorage del navegador. No se envía al servidor ni se comparte con terceros.' }
      ] },
      { h: '4. Base legal para el tratamiento', items: [
        'Art. 6(1)(b) RGPD — ejecución de un contrato de servicio electrónico (proporcionar herramientas PDF).',
        'Art. 6(1)(f) RGPD — interés legítimo del controlador (garantizar la seguridad, prevenir abusos, análisis técnico).',
        'Art. 6(1)(a) RGPD — consentimiento del usuario (para funciones de IA). El consentimiento puede retirarse en cualquier momento.'
      ] },
      { h: '5. Destinatarios de datos', p: 'Los datos pueden transferirse a las siguientes categorías de destinatarios:', items: [
        'Google LLC (Google Analytics) — estadísticas de tráfico anonimizadas, basadas en su consentimiento.',
        'Procesadores que actúan en nuestro nombre (hosting, OpenRouter.ai) — basados en acuerdos de procesamiento de datos.',
        'Autoridades facultadas por disposiciones legales — solo en casos previstos por la ley.'
      ] },
      { h: '6. Transferencias de datos fuera del EEE', p: 'Al utilizar funciones de IA, el texto puede procesarse en servidores de OpenRouter en EE. UU. OpenRouter participa en el Marco de Privacidad de Datos (DPF), garantizando un nivel adecuado de protección de datos (Decisión de la Comisión Europea 2023/1795). En otros casos, no se transfieren datos a terceros países.' },
      { h: '7. Período de retención de datos', p: 'Los datos se almacenan por los siguientes períodos:', items: [
        'Registros del servidor (dirección IP, User-Agent): hasta 7 días.',
        'Archivos cargados en herramientas del lado del cliente: no se almacenan — se eliminan de la memoria al actualizar la página.',
        'Archivos cargados en herramientas del lado del servidor: se eliminan inmediatamente después del procesamiento.',
        'Datos en localStorage: hasta que el usuario los elimine manualmente.'
      ] },
      { h: '8. Derechos del usuario', p: 'Usted tiene derecho a:', items: [
        'Acceder a sus datos (Art. 15 RGPD).',
        'Rectificación de datos (Art. 16 RGPD).',
        'Supresión de datos (Art. 17 RGPD) — derecho al olvido.',
        'Restricción del tratamiento (Art. 18 RGPD).',
        'Portabilidad de datos (Art. 20 RGPD).',
        'Oponerse al tratamiento (Art. 21 RGPD).',
        'Retirar el consentimiento en cualquier momento sin afectar la licitud del tratamiento basado en el consentimiento antes de su retirada.',
        'Presentar una queja ante el Presidente de la Oficina de Protección de Datos Personales (PUODO), ul. Stawki 2, 00-193 Varsovia, Polonia.'
      ] },
      { h: '9. Seguridad de datos', p: 'Aplicamos las siguientes medidas de seguridad:', items: [
        'Cifrado TLS/SSL — toda la comunicación entre el navegador y el servidor está cifrada.',
        'Política de Seguridad de Contenido (CSP) — limita la capacidad de ejecutar scripts no confiables.',
        'Procesamiento solo en RAM — los archivos no se escriben en el disco del servidor.',
        'Eliminación automática — los archivos se eliminan inmediatamente después de completar la operación.',
        'Límite de tamaño de archivo — máximo 100 MB.',
        'Verificación del tipo de archivo — verificamos la firma del archivo (magic bytes) antes del procesamiento.',
        'No se requiere inicio de sesión — no requerimos registro ni inicio de sesión.'
      ] },
      { h: '10. Google Analytics y consentimiento de análisis', p: 'Este sitio web utiliza Google Analytics (Google LLC, EE. UU.) para el análisis anónimo del tráfico. Google Analytics recopila datos estadísticos agregados como: conteo de visitas, tiempo pasado en el sitio, tipo de navegador, ubicación aproximada (nivel de país), fuente de tráfico. Los datos están anonimizados (anonymize_ip: true).', items: [
        'En la primera visita, se muestra un banner de consentimiento — Google Analytics solo se activa después de hacer clic en "Aceptar".',
        'Puede retirar el consentimiento en cualquier momento eliminando la entrada "cookie-consent" del localStorage de su navegador.',
        'Google Analytics no se utiliza para la segmentación de anuncios o el perfilado de comportamiento.',
        'Los datos en localStorage (tema, idioma, preferencias de consentimiento) están completamente controlados por el usuario y pueden eliminarse en cualquier momento.'
      ] },
      { h: '11. Funciones de IA y OpenRouter', p: 'El uso de funciones de IA (AI Chat, AI Summary, AI Translate) requiere su propia clave de API de OpenRouter, que se almacena exclusivamente en el localStorage de su navegador y no se comparte con el administrador del sitio web. La clave de API se utiliza exclusivamente para la comunicación con la API de OpenRouter. No tenemos acceso a su clave de API ni al contenido de las consultas enviadas a OpenRouter.' },
      { h: '12. Disposiciones finales', p: 'Nos reservamos el derecho de realizar cambios en esta Política de Privacidad. Los cambios se comunicarán actualizando la fecha en la parte superior de esta página. Cualquier pregunta sobre la política de privacidad debe dirigirse a: kontakt@optimapdf.com.' }
    ]
  },
  fa: {
    title: '\u062d\u0631\u06cc\u0645 \u062e\u0635\u0648\u0635\u06cc\u062a',
    updated: '\u0622\u062e\u0631\u06cc\u0646 \u0628\u0647\u200c\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06cc: 30 \u0698\u0648\u0626\u0646 2026',
    sections: [
      { h: '1. \u0645\u0642\u0631\u0631\u0627\u062a \u06a9\u0644\u06cc', p: '\u0627\u06cc\u0646 \u0633\u06cc\u0627\u0633\u062a \u062d\u0641\u0638 \u062e\u0635\u0648\u0635\u06cc\u062a \u0627\u0635\u0648\u0644 \u067e\u0631\u062f\u0627\u0632\u0634 \u0648 \u062d\u0641\u0627\u0638 \u0627\u0632 \u062f\u0627\u062f\u0647\u200c\u0647\u0627\u06cc \u0634\u062e\u0635\u06cc \u06a9\u0627\u0631\u0628\u0631\u0627\u0646 \u0648\u0628\u0633\u0627\u06cc\u062a \u0648\u0628\u0633\u0627\u06cc\u062a \u062e\u0635\u0648\u0635\u06cc\u062a (optimapdf.com) \u0631\u0627 \u062a\u0639\u0631\u06cc\u0641 \u0645\u06cc\u200c\u06a9\u0646\u062f. OptimaPDF \u0628\u0627\u0644\u0627\u062a\u0631\u06cc\u0646 \u0627\u0647\u0645\u06cc\u062a \u0631\u0627 \u0628\u0647 \u062d\u0641\u0638 \u062e\u0635\u0648\u0635\u06cc\u062a \u0648 \u0627\u0645\u0646\u06cc\u062a \u062f\u0627\u062f\u0647\u200c\u0647\u0627 \u0645\u06cc\u200c\u062f\u0647\u062f. \u062a\u0645\u0627\u0645 \u0627\u0628\u0632\u0627\u0631\u0647\u0627 \u0628\u0627 \u0627\u0635\u0644 \u062d\u0641\u0638 \u062e\u0635\u0648\u0635\u06cc\u062a \u062f\u0631 \u0637\u0631\u0627\u062d\u06cc \u0637\u0631\u0627\u062d\u06cc \u0634\u062f\u0647 \u0627\u0633\u062a \u2014 \u0628\u0647 \u0637\u0648\u0631 \u067e\u06cc\u0634\u0648\u0636\u0631\u0641\u062a\u060c \u0641\u0627\u06cc\u0644\u200c\u0647\u0627\u06cc \u0634\u0645\u0627 \u0628\u0647 \u0637\u0648\u0631 \u0645\u062d\u0644\u06cc \u062f\u0631 \u0645\u0635\u0631\u0648\u0639 \u0634\u0645\u0627 \u067e\u0631\u062f\u0627\u0632\u0634 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f.' },
      { h: '2. \u06a9\u0646\u062a\u0631\u0644\u200c\u06a9\u0646\u0646\u062f\u0647 \u062f\u0627\u062f\u0647', p: '\u06a9\u0646\u062a\u0631\u0644\u200c\u06a9\u0646\u0646\u062f\u0647 \u062f\u0627\u062f\u0647 Leszek Hofman\u060c D\u0105br\u00f3wka Nowa\u060c \u0628\u0648\u0644\u0633\u062a\u0627\u0646 \u0627\u0633\u062a. \u062a\u0645\u0627\u0633: kontakt@optimapdf.com. \u06a9\u0646\u062a\u0631\u0644\u200c\u06a9\u0646\u0646\u062f\u0647 \u06cc\u06a9 \u0645\u0633\u0626\u0648\u0644 \u062d\u0641\u0627\u0638 \u0627\u0632 \u062f\u0627\u062f\u0647\u200c\u0647\u0627 \u062a\u0639\u06cc\u06cc\u0646 \u0646\u06a9\u0631\u062f\u0647 \u0627\u0633\u062a \u2014 \u0628\u0631\u0627\u06cc \u062a\u0645\u0627\u0645 \u0645\u0648\u0627\u0631\u062f \u0645\u0631\u062a\u0628\u0637 \u0628\u0647 \u062d\u0641\u0627\u0638 \u0627\u0632 \u062f\u0627\u062f\u0647\u200c\u0647\u0627\u06cc \u0634\u062e\u0635\u06cc\u060c \u0628\u0627 \u0645\u0627 \u062a\u0645\u0627\u0633 \u0628\u06af\u06cc\u0631\u06cc\u062f \u0639\u0628\u0648\u0631 \u0622\u062f\u0631\u0633 \u0627\u06cc\u0645\u06cc\u0644 \u0627\u0632\u0644\u0627.' },
      { h: '3. \u062f\u0627\u0645\u0646\u0647 \u0648 \u0627\u0647\u062f\u0627\u0641 \u062c\u0645\u200c\u0622\u0648\u0631\u06cc \u062f\u0627\u062f\u0647\u200c\u0647\u0627', sub: [
        { h: '3.1 \u062f\u0627\u062f\u0647\u200c\u0647\u0627\u06cc \u0641\u0646\u06cc', p: '\u0647\u0646\u06af\u0627\u0645 \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u0627\u0632 \u0648\u0628\u200c\u0633\u0627\u06cc\u062a\u060c \u062f\u0627\u062f\u0647\u200c\u0647\u0627\u06cc \u0641\u0646\u06cc \u0632\u06cc\u0631 \u0627\u0633\u062a\u062e\u0631\u0627\u062c \u0645\u06cc\u200c\u0634\u0648\u0646\u062f: \u0622\u0636\u0631\u0633 IP\u060c \u0646\u0648\u0639 \u0648 \u0646\u0633\u062e\u0647 \u0645\u062a\u0635\u0631\u0641\u060c \u0646\u0638\u0627\u0645 \u0634\u063a\u0648\u0636\u060c \u0648\u0636\u062d \u0635\u0641\u062d\u0647 \u0646\u0645\u0627\u06cc\u0634\u060c \u0645\u0648\u0642\u0639\u06cc\u062a \u062c\u063a\u0631\u0627\u0641\u06cc\u0627\u06cc\u06cc \u062a\u0642\u0631\u06cc\u0628\u06cc (\u062f\u0631 \u0633\u0637\u062d \u06a9\u0634\u0648\u0631)\u060c \u0632\u0645\u0627\u0646 \u0628\u0627\u0632\u062f\u06cc\u062f \u0648 \u0632\u0645\u0627\u0646 \u0635\u0631\u0641 \u0634\u062f\u0647 \u062f\u0631 \u0633\u0627\u06cc\u062a. \u0627\u06cc\u0646 \u062f\u0627\u062f\u0647\u200c\u0647\u0627 \u0646\u0627\u0634\u0646\u0627\u0633 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f \u0648 \u0628\u0631\u0627\u06cc \u0627\u0647\u062f\u0627\u0641 \u0622\u0645\u0627\u0631\u06cc \u0648 \u062a\u0636\u0645\u06cc\u0646 \u0627\u0645\u0646\u06cc\u062a \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f.' },
        { h: '3.2 \u0641\u0627\u06cc\u0644\u200c\u0647\u0627\u06cc \u0622\u067e\u0644\u0648\u062f \u0634\u062f\u0647 \u062a\u0648\u0633\u0637 \u06a9\u0627\u0631\u0628\u0631', p: '\u0641\u0627\u06cc\u0644\u200c\u0647\u0627\u06cc PDF \u0622\u067e\u0644\u0648\u062f \u0634\u062f\u0647 \u0628\u0647 \u0627\u0628\u0632\u0627\u0631\u0647\u0627 \u0628\u0647 \u0634\u0631\u062d \u0632\u06cc\u0631 \u067e\u0631\u062f\u0627\u0632\u0634 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f:', items: [
          '\u0627\u0628\u0632\u0627\u0631\u0647\u0627\u06cc \u0633\u0645\u062a \u06a9\u0644\u0627\u06cc\u0646\u062a (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) \u2014 \u0641\u0627\u06cc\u0644 \u06a9\u0627\u0645\u0644\u0627\u060c \u062f\u0631 \u0645\u0635\u0631\u0648\u0639 \u0645\u0635\u0631\u0641 \u0628\u0627 \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u0627\u0632 WebAssembly \u0648 JavaScript \u067e\u0631\u062f\u0627\u0632\u0634 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f. \u0641\u0627\u06cc\u0644 \u0647\u0631\u06af\u0631\u0647 \u062f\u0633\u062a\u06af\u0627\u0647 \u0634\u0645\u0627 \u0631\u0627 \u062a\u0631\u06a9 \u0646\u0645\u06cc\u200c\u06a9\u0646\u062f.',
          '\u0627\u0628\u0632\u0627\u0631\u0647\u0627\u06cc \u0633\u0645\u062a \u0633\u0631\u0648\u0631 (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) \u2014 \u0641\u0627\u06cc\u0644 \u0645\u0648\u0642\u062a\u0627\u064b \u0628\u0647 \u0633\u0631\u0648\u0631 \u0627\u0631\u0633\u0627\u0644 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f\u060c \u0645\u0646\u062d\u0635\u0631\u0627\u064b \u062f\u0631 RAM \u067e\u0631\u062f\u0627\u0632\u0634 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f \u0648 \u0628\u0627\u0644\u0641\u0627\u0635\u0644\u0647 \u067e\u0633 \u0627\u0632 \u0639\u0645\u0644\u06cc\u0627\u062a \u062d\u0630\u0641 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f. \u062d\u062f\u0627\u06a9\u0633\u0631 \u0632\u0645\u0627\u0646 \u0646\u06af\u0647\u062f\u0627\u0631\u06cc: \u0686\u0646\u062f \u062b\u0627\u0646\u06cc\u0647.',
          '\u0639\u0645\u0644\u06a9\u0631\u062f\u0647\u0627\u06cc \u0627\u0634\u062a\u0628\u0627\u0647 \u0627\u0635\u0637\u0646\u0627\u0639\u06cc (AI Chat, AI Summary, AI Translate) \u2014 \u0645\u062a\u0646 \u0627\u0633\u062a\u062e\u0631\u0627\u062c \u0634\u062f\u0647 \u0627\u0632 PDF \u0628\u0647 API \u062e\u0627\u0631\u062c\u06cc OpenRouter \u0627\u0631\u0633\u0627\u0644 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f. \u0645\u0627 \u062f\u0627\u062f\u0647\u200c\u0647\u0627\u06cc \u0634\u0646\u0627\u062e\u062a\u0647\u0648 \u06a9\u0627\u0631\u0628\u0631 \u0631\u0627 \u0627\u0631\u0633\u0627\u0644 \u0646\u0645\u06cc\u200c\u06a9\u0646\u06cc\u0645. \u0645\u062d\u062a\u0648\u0627\u064a \u0630\u062e\u06cc\u0631\u0647 \u0646\u0645\u06cc\u200c\u0634\u0648\u0646\u062f \u06cc\u0627 \u0628\u0631\u0627\u06cc \u0622\u0645\u0648\u0632\u0634 \u0646\u0645\u0627\u0626\u0644 \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u0634\u0648\u062f.'
        ] },
        { h: '3.3 \u062a\u0631\u062c\u06cc\u062d\u0627\u062a \u06a9\u0627\u0631\u0628\u0631', p: '\u0627\u0637\u0644\u0627\u0639\u0627\u062a \u0645\u0631\u062a\u0628\u0637 \u0628\u0647 \u062a\u0645 \u0627\u0646\u062a\u062e\u0627\u0628 \u0634\u062f\u0647 (\u062a\u0627\u0631\u06cc\u06a9/\u0641\u0627\u0637\u062d) \u0648 \u0632\u0628\u0627\u0646 (\u0628\u0648\u0644\u0633\u062a\u0627\u0646\u06cc/\u0627\u0646\u06af\u0644\u06cc\u0632\u06cc) \u062f\u0631 localStorage \u0645\u0635\u0631\u0648\u0639 \u0630\u062e\u06cc\u0631\u0647 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f. \u0628\u0647 \u0633\u0631\u0648\u0631 \u0627\u0631\u0633\u0627\u0644 \u0646\u0645\u06cc\u200c\u0634\u0648\u0646\u062f \u06cc\u0627 \u0628\u0627 \u0627\u0634\u062a\u0631\u0627\u06a9 \u06af\u0630\u0627\u0631\u06cc \u0634\u062f\u0647 \u0628\u0627 \u0627\u0634\u062e\u0627\u0635 \u062b\u0627\u0644\u062b\u0647.' }
      ] },
      { h: '4. \u0645\u0628\u0646\u0627\u06cc \u0642\u0627\u0646\u0648\u0646\u06cc \u067e\u0631\u062f\u0627\u0632\u0634', items: [
        '\u0645\u0627\u062f\u0647 6(1)(\u0628) \u0645\u0642\u0631\u0631\u0627\u062a \u0639\u0645\u0648\u0645\u06cc \u062d\u0641\u0627\u0638 \u0627\u0632 \u062f\u0627\u062f\u0647\u200c\u0647\u0627 \u2014 \u0627\u062c\u0631\u0627\u06cc \u0642\u0631\u0627\u0631\u062f\u0627\u062f \u062e\u062f\u0645\u062a \u0625\u0644\u06a9\u062a\u0631\u0648\u0646\u06cc\u06a9\u06cc (\u0627\u0631\u0627\u0626\u0647 \u0627\u0628\u0632\u0627\u0631\u0647\u0627\u06cc PDF).',
        '\u0645\u0627\u062f\u0647 6(1)(\u0641) \u0645\u0642\u0631\u0631\u0627\u062a \u0639\u0645\u0648\u0645\u06cc \u062d\u0641\u0627\u0638 \u0627\u0632 \u062f\u0627\u062f\u0647\u200c\u0647\u0627 \u2014 \u0645\u0646\u0627\u0641\u0639 \u0645\u0634\u0631\u0648\u0639 \u06a9\u0646\u062a\u0631\u0644\u200c\u06a9\u0646\u0646\u062f\u0647 (\u0636\u0645\u0627\u0646\u062a \u0627\u0645\u0646\u06cc\u062a\u060c \u062c\u0644\u0648\u06af\u0631\u06cc \u0627\u0632 \u0633\u0648\u0627\u0633\u062a\u0627\u062f\u0647\u060c \u062a\u062d\u0644\u06cc\u0644 \u0641\u0646\u06cc).',
        '\u0645\u0627\u062f\u0647 6(1)(\u0627) \u0645\u0642\u0631\u0631\u0627\u062a \u0639\u0645\u0648\u0645\u06cc \u062d\u0641\u0627\u0638 \u0627\u0632 \u062f\u0627\u062f\u0647\u200c\u0647\u0627 \u2014 \u0631\u0636\u0627\u06cc\u062a \u06a9\u0627\u0631\u0628\u0631 (\u0628\u0631\u0627\u06cc \u0639\u0645\u0644\u06a9\u0631\u062f\u0647\u0627\u06cc \u0627\u0634\u062a\u0628\u0627\u0647 \u0627\u0635\u0637\u0646\u0627\u0639\u06cc). \u0631\u0636\u0627\u06cc\u062a \u0631\u0627 \u0645\u06cc\u200c\u062a\u0648\u0627\u0646 \u062f\u0631 \u0647\u0631 \u0632\u0645\u0627\u0646 \u067e\u0633 \u06af\u0631\u0641\u062a.'
      ] },
      { h: '5. \u062f\u0631\u06cc\u0627\u0641\u062a\u200c\u06a9\u0646\u0646\u062f\u06af\u0627\u0646 \u062f\u0627\u062f\u0647', p: '\u062f\u0627\u062f\u0647\u200c\u0647\u0627 \u0645\u0645\u06a9\u0646 \u0627\u0633\u062a \u0628\u0647 \u062f\u0633\u062a\u0647\u200c\u0647\u0627\u06cc \u0632\u06cc\u0631 \u0627\u0632 \u062f\u0631\u06cc\u0627\u0641\u062a\u200c\u06a9\u0646\u0646\u062f\u06af\u0627\u0646 \u062a\u0646\u0642\u0644 \u0634\u0648\u0646\u062f:', items: [
        'Google LLC (Google Analytics) \u2014 \u0622\u0645\u0627\u0631 \u062a\u0631\u0627\u0641\u06cc\u06a9 \u0646\u0627\u0634\u0646\u0627\u0633\u060c \u0628\u0631 \u0627\u0633\u0627\u0633 \u0631\u0636\u0627\u06cc\u062a \u0634\u0645\u0627.',
        '\u067e\u0631\u062f\u0627\u0632\u0634\u06af\u0631\u0627\u0646\u06cc \u06a9\u0647 \u0628\u0647 \u0639\u0646\u0648\u0627\u0646 \u0645\u0627 \u0639\u0645\u0644 \u0645\u06cc\u200c\u06a9\u0646\u0646\u062f (\u0647\u0627\u0633\u062a\u06cc\u0646\u06af\u060c OpenRouter.ai) \u2014 \u0628\u0631 \u0627\u0633\u0627\u0633 \u062a\u0648\u0627\u0641\u0642\u0646\u0627\u0645\u0647\u200c\u0647\u0627\u06cc \u067e\u0631\u062f\u0627\u0632\u0634 \u062f\u0627\u062f\u0647.',
        '\u0645\u0642\u0627\u0645\u0631\u0627\u062a \u0635\u0644\u062d\u06cc\u062a\u200c\u062f\u0647 \u0628\u0645\u0648\u062c\u0628 \u0645\u0642\u0631\u0631\u0627\u062a \u0642\u0627\u0646\u0648\u0646\u06cc \u2014 \u0641\u0642\u0637 \u062f\u0631 \u0645\u0648\u0627\u0631\u062f \u067e\u06cc\u0634\u200c\u0628\u06cc\u0646\u06cc \u0634\u062f\u0647 \u062a\u0648\u0633\u0637 \u0642\u0627\u0646\u0648\u0646.'
      ] },
      { h: '6. \u0646\u0642\u0644 \u062f\u0627\u062f\u0647\u200c\u0647\u0627 \u062e\u0627\u0631\u062c \u0627\u0632 \u0645\u0646\u0637\u0642\u0647 \u0627\u0642\u062a\u0635\u0627\u062f\u06cc \u0627\u0631\u0648\u067e\u0627', p: '\u0647\u0646\u06af\u0627\u0645 \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u0627\u0632 \u0639\u0645\u0644\u06a9\u0631\u062f\u0647\u0627\u06cc \u0627\u0634\u062a\u0628\u0627\u0647 \u0627\u0635\u0637\u0646\u0627\u0639\u06cc\u060c \u0645\u062a\u0646 \u0645\u0645\u06a9\u0646 \u0627\u0633\u062a \u062f\u0631 \u0633\u0631\u0648\u0631\u0647\u0627\u06cc OpenRouter \u062f\u0631 \u0627\u06cc\u0627\u0644\u0627\u062a \u0645\u062a\u062d\u062f\u0647 \u067e\u0631\u062f\u0627\u0632\u0634 \u0634\u0648\u062f. OpenRouter \u062f\u0631 \u0686\u0627\u0631\u0686 \u062e\u0635\u0648\u0635\u06cc\u062a \u062f\u0627\u062f\u0647 (DPF) \u0634\u0631\u06a9\u062a \u0645\u06cc\u200c\u06a9\u0646\u062f\u060c \u06a9\u0647 \u0636\u0645\u0627\u0646\u062a \u0633\u0637\u062d \u06a9\u0627\u0641\u06cc\u0627\u06cc \u062d\u0641\u0627\u0638 \u0627\u0632 \u062f\u0627\u062f\u0647\u200c\u0647\u0627 \u0631\u0627 \u062a\u0636\u0645\u06cc\u0646 \u0645\u06cc\u200c\u06a9\u0646\u062f (\u062a\u0635\u0645\u06cc\u0645 \u06a9\u0645\u06cc\u0633\u06cc\u0648\u0646 \u0627\u0631\u0648\u067e\u0627 2023/1795). \u062f\u0631 \u0627\u0644\u0645\u0648\u0627\u0631\u062f \u062f\u06cc\u06af\u0631\u060c \u062f\u0627\u062f\u0647\u200c\u0647\u0627 \u0628\u0647 \u06a9\u0634\u0648\u0631\u0647\u0627\u06cc \u062b\u0627\u0644\u062b \u062a\u0646\u0642\u0644 \u0646\u0645\u06cc\u200c\u0634\u0648\u0646\u062f.' },
      { h: '7. \u0645\u062f\u0629 \u0646\u06af\u0647\u062f\u0627\u0631\u06cc \u0628\u0627 \u062f\u0627\u062f\u0647\u200c\u0647\u0627', p: '\u062f\u0627\u062f\u0647\u200c\u0647\u0627 \u0628\u0631\u0627\u06cc \u062f\u0648\u0631\u0647\u200c\u0647\u0627\u06cc \u0632\u06cc\u0631 \u062e\u0632\u06cc\u0631\u0647 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f:', items: [
        '\u0633\u0631\u0648\u0631\u0633\u062e\u062a\u0631\u0633 (\u0622\u0636\u0631\u0633 IP\u060c User-Agent): \u062a\u0627 7 \u0631\u0648\u0632.',
        '\u0641\u0627\u06cc\u0644\u200c\u0647\u0627\u06cc \u0622\u067e\u0644\u0648\u062f \u0634\u062f\u0647 \u0628\u0647 \u0627\u0628\u0632\u0627\u0631\u0647\u0627\u06cc \u0633\u0645\u062a \u06a9\u0644\u0627\u06cc\u0646\u062a: \u0630\u062e\u06cc\u0631\u0647 \u0646\u0645\u06cc\u200c\u0634\u0648\u0646\u062f \u2014 \u0628\u0627 \u062a\u0627\u0632\u0647 \u0635\u0641\u062d\u0647 \u0627\u0632 \u062d\u0636\u0631\u0647 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f.',
        '\u0641\u0627\u06cc\u0644\u200c\u0647\u0627\u06cc \u0622\u067e\u0644\u0648\u062f \u0634\u062f\u0647 \u0628\u0647 \u0627\u0628\u0632\u0627\u0631\u0647\u0627\u06cc \u0633\u0631\u0648\u0631: \u0628\u0627\u0644\u0641\u0627\u0635\u0644\u0647 \u067e\u0633 \u0627\u0632 \u067e\u0631\u062f\u0627\u0632\u0634 \u062d\u0630\u0641 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f.',
        'localStorage \u062f\u0627\u062f\u0647: \u062a\u0627 \u0632\u0645\u0627\u0646\u06cc \u06a9\u0647 \u062a\u0648\u0633\u0637 \u06a9\u0627\u0631\u0628\u0631 \u0628\u0647 \u0635\u0648\u0631\u062a \u062f\u0633\u062a\u06cc \u062d\u0630\u0641 \u0634\u0648\u062f.'
      ] },
      { h: '8. \u0642\u0637\u0648\u0639 \u06a9\u0627\u0631\u0628\u0631', p: '\u0634\u0645\u0627 \u0642\u0637\u0639 \u062f\u0627\u0631\u06cc\u062f:', items: [
        '\u062f\u0633\u062a\u0631\u0633 \u0628\u0647 \u062f\u0627\u062f\u0647\u200c\u0647\u0627\u06cc \u062e\u0648\u062f (\u0645\u0627\u062f\u0647 15 \u0645\u0642\u0631\u0631\u0627\u062a \u0639\u0645\u0648\u0645\u06cc \u062d\u0641\u0627\u0638 \u0627\u0632 \u062f\u0627\u062f\u0647\u200c\u0647\u0627).',
        '\u0627\u0635\u0644\u0627\u062d \u062f\u0627\u062f\u0647\u200c\u0647\u0627 (\u0645\u0627\u062f\u0647 16 \u0645\u0642\u0631\u0631\u0627\u062a \u0639\u0645\u0648\u0645\u06cc \u062d\u0641\u0627\u0638 \u0627\u0632 \u062f\u0627\u062f\u0647\u200c\u0647\u0627).',
        '\u062d\u0630\u0641 \u062f\u0627\u062f\u0647\u200c\u0647\u0627 (\u0645\u0627\u062f\u0647 17 \u0645\u0642\u0631\u0631\u0627\u062a \u0639\u0645\u0648\u0645\u06cc \u062d\u0641\u0627\u0638 \u0627\u0632 \u062f\u0627\u062f\u0647\u200c\u0647\u0627) \u2014 \u0642\u0637\u0639 \u0641\u0631\u0627\u0645\u0648\u0634 \u0634\u062f\u0646.',
        '\u0645\u062d\u062f\u0648\u062f \u06a9\u0631\u062f\u0646 \u062a\u0645\u0627\u0645\u0648\u0635 \u062e\u0637\u06cc (\u0645\u0627\u062f\u0647 18 \u0645\u0642\u0631\u0631\u0627\u062a \u0639\u0645\u0648\u0645\u06cc \u062d\u0641\u0627\u0638 \u0627\u0632 \u062f\u0627\u062f\u0647\u200c\u0647\u0627).',
        '\u0642\u0627\u0628\u0644\u06cc\u062a \u062d\u0645\u0644 \u062f\u0627\u062f\u0647\u200c\u0647\u0627 (\u0645\u0627\u062f\u0647 20 \u0645\u0642\u0631\u0631\u0627\u062a \u0639\u0645\u0648\u0645\u06cc \u062d\u0641\u0627\u0638 \u0627\u0632 \u062f\u0627\u062f\u0647\u200c\u0647\u0627).',
        '\u0627\u0639\u062a\u0631\u0627\u0636 \u0628\u0647 \u067e\u0631\u062f\u0627\u0632\u0634 (\u0645\u0627\u062f\u0647 21 \u0645\u0642\u0631\u0631\u0627\u062a \u0639\u0645\u0648\u0645\u06cc \u062d\u0641\u0627\u0638 \u0627\u0632 \u062f\u0627\u062f\u0647\u200c\u0647\u0627).',
        '\u067e\u0633 \u06af\u0631\u0641\u062a\u0646 \u0631\u0636\u0627\u06cc\u062a \u062f\u0631 \u0647\u0631 \u0632\u0645\u0627\u0646 \u0628\u062f\u0648\u0646 \u062a\u0623\u062b\u0631 \u0628\u0631 \u0642\u0627\u0646\u0648\u0646\u06cc \u067e\u0631\u062f\u0627\u0632\u0634 \u0628\u0627 \u0631\u0636\u0627\u06cc\u062a \u0642\u0628\u0644 \u0627\u0632 \u0635\u0631\u0641 \u0622\u0646.',
        '\u0634\u06a9\u0627\u06cc\u062a \u0628\u0647 \u0631\u0626\u06cc\u0633 \u0645\u062d\u0637\u0648\u0645 \u062d\u0641\u0627\u0638 \u0627\u0632 \u062f\u0627\u062f\u0647\u200c\u0647\u0627\u06cc \u0634\u062e\u0635\u06cc \u0635\u0648\u0631\u062a\u06cc (PUODO)\u060c ul. Stawki 2\u060c 00-193 \u0648\u0631\u0634\u0648\u060c \u0628\u0648\u0644\u0633\u062a\u0627\u0646.'
      ] },
      { h: '9. \u0627\u0645\u0646\u06cc\u062a \u062f\u0627\u062f\u0647\u200c\u0647\u0627', p: '\u0646\u0642\u0637\u0628 \u062a\u062f\u0627\u0628\u0631 \u0627\u0645\u0646\u06cc\u062a\u06cc \u0632\u06cc\u0631 \u0631\u0627 \u0627\u0639\u0645\u0627\u0644 \u0645\u06cc\u200c\u06a9\u0646\u06cc\u0645:', items: [
        '\u0631\u0645\u0632\u06af\u0630\u0627\u0631\u06cc TLS/SSL \u2014 \u062a\u0645\u0627\u0645 \u0627\u062a\u0635\u0627\u0644\u0627\u062a \u0628\u06cc\u0646 \u0645\u0635\u0631\u0641 \u0648 \u0633\u0631\u0648\u0631 \u067e\u0634\u062a\u0631\u0641\u0647 \u0627\u0633\u062a.',
        '\u0633\u06cc\u0627\u0633\u062a \u0627\u0645\u0646\u06cc\u062a \u0645\u062d\u062a\u0648\u0627\u06cc (CSP) \u2014 \u0642\u062f\u0631\u062a \u062a\u0646\u0641\u06cc\u0630 \u0627\u0633\u06a9\u0631\u06cc\u067e\u062a \u063a\u06cc\u0631 \u0645\u0648\u062b\u0648\u0642 \u0631\u0627 \u0645\u062d\u062f\u0648\u062f \u0645\u06cc\u200c\u06a9\u0646\u062f.',
        '\u067e\u0631\u062f\u0627\u0632\u0634 \u0641\u0642\u0637 \u062f\u0631 RAM \u2014 \u0641\u0627\u06cc\u0644\u200c\u0647\u0627 \u0631\u0627 \u062f\u0631 \u0642\u0631\u0636 \u062e\u0627\u062f\u0645 \u0646\u0645\u06cc\u200c\u0646\u0648\u06cc\u0633\u0646\u062f.',
        '\u062d\u0630\u0641 \u062e\u0648\u062f\u06a9\u0627\u0631 \u2014 \u0641\u0627\u06cc\u0644\u200c\u0647\u0627 \u0628\u0627\u0644\u0641\u0627\u0635\u0644\u0647 \u0627\u06a9\u062a\u0645\u0627\u0644 \u0639\u0645\u0644\u06cc\u0627\u062a \u062d\u0630\u0641 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f.',
        '\u062d\u062f \u062d\u062c\u0645 \u0641\u0627\u06cc\u0644 \u2014 \u062d\u062f \u0627\u0644\u0627\u0642\u0635\u0649 100 \u0645\u06cc\u062c\u0627\u0628\u0627\u06cc\u062a.',
        '\u062a\u062d\u0642\u0642 \u0627\u0632 \u0646\u0648\u0639 \u0641\u0627\u06cc\u0644 \u2014 \u0645\u0627 \u0627\u0632 \u062a\u0648\u0642\u06cc\u0639 \u0641\u0627\u06cc\u0644 (magic bytes) \u0642\u0628\u0644 \u0627\u0632 \u067e\u0631\u062f\u0627\u0632\u0634 \u0628\u0631\u0631\u0633\u06cc \u0645\u06cc\u200c\u06a9\u0646\u06cc\u0645.',
        '\u0644\u0627 \u0646\u06cc\u0627\u0632 \u0628\u0647 \u062a\u0633\u062c\u06cc\u0644 \u062f\u062e\u0644 \u2014 \u0645\u0627 \u062a\u0633\u062c\u06cc\u0644 \u06cc\u0627 \u062a\u0633\u062c\u06cc\u0644 \u062f\u062e\u0644 \u0631\u0627 \u062f\u0631\u062e\u0648\u0627\u0633\u062a \u0646\u0645\u06cc\u200c\u06a9\u0646\u06cc\u0645.'
      ] },
      { h: '10. Google Analytics \u0648 \u0631\u0636\u0627\u06cc\u062a \u062a\u062d\u0644\u06cc\u0644\u0627\u062a', p: '\u0627\u06cc\u0646 \u0648\u0628\u200c\u0633\u0627\u06cc\u062a \u0627\u0632 Google Analytics (Google LLC\u060c \u0627\u06cc\u0627\u0644\u0627\u062a \u0645\u062a\u062d\u062f\u0647) \u0628\u0631\u0627\u06cc \u062a\u062d\u0644\u06cc\u0644 \u0646\u0627\u0634\u0646\u0627\u0633 \u062a\u0631\u0627\u0641\u06cc\u06a9 \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f. Google Analytics \u062f\u0627\u062f\u0647\u200c\u0647\u0627\u06cc \u0622\u0645\u0627\u0631\u06cc \u0645\u062c\u0645\u0648\u0639 \u0634\u062f\u0647 \u0645\u0646\u0644 \u0645\u0646\u062a\u0642\u062f\u0633 \u0648\u0635\u0641\u062d\u0647 \u0645\u0642\u062f\u0645\u0647\u0631 \u0631\u0627 \u062c\u0645\u200c\u0622\u0648\u0631\u06cc \u0645\u06cc\u200c\u06a9\u0646\u062f: \u062a\u0639\u062f\u0627\u062f \u0628\u0627\u0632\u062f\u06cc\u062f\u0647\u0627\u060c \u0632\u0645\u0627\u0646 \u0635\u0631\u0641 \u0634\u062f\u0647 \u062f\u0631 \u0633\u0627\u06cc\u062a\u060c \u0646\u0648\u0639 \u0645\u062a\u0635\u0631\u0641\u060c \u0645\u0648\u0642\u0639\u06cc\u062a \u062a\u0642\u0631\u06cc\u0628\u06cc (\u062f\u0631 \u0633\u0637\u062d \u06a9\u0634\u0648\u0631)\u060c \u0645\u0628\u062f\u0626 \u062a\u0631\u0627\u0641\u06cc\u06a9. \u062f\u0627\u062f\u0647\u200c\u0647\u0627 \u0646\u0627\u0634\u0646\u0627\u0633 \u0647\u0633\u062a\u0646\u062f (anonymize_ip: true).', items: [
        '\u0639\u0646\u062f \u0627\u0648\u0644\u06cc\u0646 \u0628\u0627\u0632\u062f\u06cc\u062f\u060c \u0634\u0631\u06cc\u0637 \u0631\u0636\u0627\u06cc\u062a \u0646\u0634\u0627\u0646 \u062f\u0627\u062f\u0647 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f \u2014 Google Analytics \u0641\u0642\u0637 \u067e\u0633 \u0627\u0632 \u06a9\u0644\u06cc\u06a9 \u0631\u0648\u06cc "Accept" \u0641\u0639\u0627\u0644 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f.',
        '\u0634\u0645\u0627 \u0645\u06cc\u200c\u062a\u0648\u0627\u0646\u06cc\u062f \u062f\u0631 \u0647\u0631 \u0632\u0645\u0627\u0646 \u0628\u0627 \u062d\u0630\u0641 \u0631\u0636\u0627\u06cc\u062a \u0631\u0627 \u0632\u0645\u0627\u0646\u06cc \u062e\u0648\u062f \u0645\u0642\u0635\u062f \u0628\u0631\u062f\u0631 \u0647\u0645\u0631\u0627\u0647 "cookie-consent" \u0627\u0632 localStorage \u0645\u062a\u0635\u0631\u0641 \u062e\u0648\u062f \u0628\u0631\u062f\u0627\u0631\u06cc\u062f.',
        'Google Analytics \u0628\u0631\u0627\u06cc \u0647\u062f\u0641\u06af\u0630\u0627\u0631\u06cc \u062a\u063a\u0636\u06cc\u0647 \u06cc\u0627 \u062a\u0635\u0646\u06cc\u0641 \u0633\u0644\u0648\u06a9\u06cc \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u0646\u0645\u06cc\u200c\u0634\u0648\u0646\u062f.',
        '\u062f\u0627\u062f\u0647\u200c\u0647\u0627 \u062f\u0631 localStorage (\u062a\u0645\u0627\u060c \u0632\u0628\u0627\u0646\u060c \u062a\u0631\u062c\u06cc\u062d\u0627\u062a \u0631\u0636\u0627\u06cc\u062a) \u06a9\u0627\u0645\u0644\u0627\u060c \u0632\u06cc\u0631 \u0642\u0627\u0646\u062a\u0631\u0644 \u06a9\u0627\u0631\u0628\u0631 \u0627\u0633\u062a \u0648 \u0642\u0627\u0628\u0644 \u062d\u0630\u0641 \u0634\u0648\u062f.'
      ] },
      { h: '11. \u0648\u0638\u0627\u06cc\u0641 \u0627\u0634\u062a\u0628\u0627\u0647 \u0627\u0635\u0637\u0646\u0627\u0639\u06cc \u0648 OpenRouter', p: '\u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u0627\u0632 \u0648\u0638\u0627\u06cc\u0641 \u0627\u0634\u062a\u0628\u0627\u0647 \u0627\u0635\u0637\u0646\u0627\u0639\u06cc (AI Chat, AI Summary, AI Translate) \u0646\u06cc\u0627\u0632 \u0628\u0647 \u06a9\u0644\u06cc\u062f API \u062e\u0627\u0635 \u06a9\u0627\u0631\u0628\u0631 \u0627\u0632 OpenRouter \u062f\u0627\u0631\u062f\u060c \u06a9\u0647 \u0627\u0646\u062d\u0635\u0631\u0627\u064b \u062f\u0631 localStorage \u0645\u062a\u0635\u0631\u0641 \u0634\u0645\u0627 \u0630\u062e\u06cc\u0631\u0647 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f \u0648 \u0628\u0627 \u0645\u0633\u0626\u0648\u0644 \u0648\u0628 \u0633\u0627\u06cc\u062a \u0634\u0631\u06cc\u06a9 \u0646\u0634\u0648\u062f\u0647 \u0627\u0633\u062a. \u06a9\u0644\u06cc\u062f API \u0635\u0631\u0641\u0627\u064b \u0628\u0631\u0627\u06cc \u0627\u062a\u0635\u0627\u0644 \u0628\u0627 OpenRouter API \u0627\u0633\u062a\u0641\u0627\u062f\u0647 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f. \u0645\u0627 \u0628\u0647 \u062f\u0633\u062a\u0631\u0633\u06cc \u0628\u0647 \u06a9\u0644\u06cc\u062f API \u0634\u0645\u0627 \u06cc\u0627 \u0645\u062d\u062a\u0648\u0627\u064a \u0627\u0633\u062a\u0634\u0631\u0627\u062a \u0645\u0631\u0633\u0627\u0644\u0647 \u0628\u0647 OpenRouter \u0646\u062f\u0627\u0631\u06cc\u0645.' },
      { h: '12. \u0623\u062d\u06a9\u0627\u0645 \u0646\u0647\u0627\u0626\u06cc', p: '\u0646\u062d\u062a\u0641\u0638 \u0628\u062d\u0642 \u062a\u063a\u06cc\u06cc\u0631\u0627\u062a \u0628\u0631 \u0627\u06cc\u0646 \u0633\u06cc\u0627\u0633\u062a \u062d\u0641\u0638 \u062e\u0635\u0648\u0635\u06cc\u062a \u0631\u0627 \u0628\u0631\u0627\u06cc \u062e\u0648\u062f \u0645\u062d\u0641\u0638 \u0645\u06cc\u200c\u06a9\u0646\u06cc\u0645. \u062a\u063a\u06cc\u06cc\u0631\u0627\u062a \u0628\u0627 \u0628\u0647\u200c\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06cc \u0627\u0644\u062a\u0627\u0631\u06cc\u062e \u0631\u0648\u0632 \u062f\u0631 \u0627\u0644\u0649 \u0627\u06cc\u0646 \u0635\u0641\u062d\u0647 \u0627\u0637\u0644\u0627\u0639 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f. \u0628\u0648\u062c\u0648\u0628 \u062a\u0648\u062c\u0647 \u0647\u0631 \u0633\u0624\u0627\u0644 \u062f\u0631 \u0645\u0648\u0631\u062f \u0633\u06cc\u0627\u0633\u062a \u062e\u0635\u0648\u0635\u06cc\u062e \u0628\u0647 kontakt@optimapdf.com. \u0631\u0633\u0627\u0644\u0647 \u0634\u0648\u062f.' }
    ]
  },
  fr: {
    title: 'Politique de confidentialit\u00e9',
    updated: 'Derni\u00e8re mise \u00e0 jour : 30 juin 2026',
    sections: [
      { h: '1. Dispositions g\u00e9n\u00e9rales', p: 'Cette Politique de confidentialit\u00e9 d\u00e9finit les principes de traitement et de protection des donn\u00e9es personnelles des utilisateurs du site web OptimaPDF (optimapdf.com). OptimaPDF accorde la plus haute importance \u00e0 la confidentialit\u00e9 et \u00e0 la s\u00e9curit\u00e9 des donn\u00e9es. Tous les outils ont \u00e9t\u00e9 con\u00e7us selon le principe de la confidentialit\u00e9 par conception \u2014 par d\u00e9faut, vos fichiers sont trait\u00e9s localement dans votre navigateur.' },
      { h: '2. Responsable du traitement', p: 'Le responsable du traitement est Leszek Hofman, D\u0105br\u00f3wka Nowa, Pologne. Contact : kontakt@optimapdf.com. Le responsable n\u2019a pas nomm\u00e9 de D\u00e9l\u00e9gu\u00e9 \u00e0 la protection des donn\u00e9es \u2014 pour toutes les questions li\u00e9es \u00e0 la protection des donn\u00e9es personnelles, contactez-nous directement via l\u2019adresse e-mail ci-dessus.' },
      { h: '3. Port\u00e9e et finalit\u00e9s de la collecte de donn\u00e9es', sub: [
        { h: '3.1 Donn\u00e9es techniques', p: 'Lors de l\u2019utilisation du site web, les donn\u00e9es techniques suivantes sont automatiquement collect\u00e9es : adresse IP, type et version du navigateur, syst\u00e8me d\u2019exploitation, r\u00e9solution d\u2019\u00e9cran, emplacement g\u00e9ographique approximatif (niveau pays), heure de visite et temps pass\u00e9 sur le site. Ces donn\u00e9es sont anonymis\u00e9es et utilis\u00e9es uniquement \u00e0 des fins statistiques et pour garantir la s\u00e9curit\u00e9.' },
        { h: '3.2 Fichiers t\u00e9l\u00e9vers\u00e9s par l\u2019utilisateur', p: 'Les fichiers PDF t\u00e9l\u00e9vers\u00e9s vers les outils sont trait\u00e9s comme suit :', items: [
          'Outils c\u00f4t\u00e9 client (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) \u2014 le fichier est enti\u00e8rement trait\u00e9 dans le navigateur \u00e0 l\u2019aide de WebAssembly et JavaScript. Le fichier ne quitte jamais votre appareil.',
          'Outils c\u00f4t\u00e9 serveur (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) \u2014 le fichier est temporairement envoy\u00e9 au serveur, trait\u00e9 exclusivement en RAM et imm\u00e9diatement supprim\u00e9 apr\u00e8s l\u2019op\u00e9ration. Dur\u00e9e de r\u00e9tention maximale : quelques secondes.',
          'Fonctions IA (AI Chat, AI Summary, AI Translate) \u2014 le texte extrait du PDF est envoy\u00e9 \u00e0 l\u2019API externe OpenRouter. Nous n\u2019envoyons pas de donn\u00e9es identifiant l\u2019utilisateur. Le contenu n\u2019est pas stock\u00e9 ni utilis\u00e9 pour l\u2019entra\u00eEnement de mod\u00e8les.'
        ] },
        { h: '3.3 Pr\u00e9f\u00e9rences de l\u2019utilisateur', p: 'Les informations sur le th\u00e8me s\u00e9lectionn\u00e9 (sombre/clair) et la langue (polonais/anglais) sont stock\u00e9es dans le localStorage du navigateur. Elles ne sont pas envoy\u00e9es au serveur ni partag\u00e9es avec des tiers.' }
      ] },
      { h: '4. Base juridique du traitement', items: [
        'Art. 6(1)(b) RGPD \u2014 ex\u00e9cution d\u2019un contrat de service \u00e9lectronique (fourniture d\u2019outils PDF).',
        'Art. 6(1)(f) RGPD \u2014 int\u00e9r\u00eat l\u00e9gitime du responsable (garantie de la s\u00e9curit\u00e9, pr\u00e9vention des abus, analyse technique).',
        'Art. 6(1)(a) RGPD \u2014 consentement de l\u2019utilisateur (pour les fonctions IA). Le consentement peut \u00eatre retir\u00e9 \u00e0 tout moment.'
      ] },
      { h: '5. Destinataires des donn\u00e9es', p: 'Les donn\u00e9es peuvent \u00eatre transf\u00e9r\u00e9es aux cat\u00e9gories de destinataires suivantes :', items: [
        'Google LLC (Google Analytics) \u2014 statistiques de trafic anonymis\u00e9es, bas\u00e9es sur votre consentement.',
        'Traitants agissant en notre nom (h\u00e9bergement, OpenRouter.ai) \u2014 sur la base de contrats de traitement de donn\u00e9es.',
        'Autorit\u00e9s habilit\u00e9es par des dispositions l\u00e9gales \u2014 uniquement dans les cas pr\u00e9vus par la loi.'
      ] },
      { h: '6. Transferts de donn\u00e9es hors de l\u2019EEE', p: 'Lors de l\u2019utilisation de fonctions IA, le texte peut \u00eatre trait\u00e9 sur les serveurs OpenRouter aux \u00c9tats-Unis. OpenRouter participe au cadre de confidentialit\u00e9 des donn\u00e9es (DPF), garantissant un niveau ad\u00e9quat de protection des donn\u00e9es (D\u00e9cision de la Commission europ\u00e9enne 2023/1795). Dans d\u2019autres cas, les donn\u00e9es ne sont pas transf\u00e9r\u00e9es vers des pays tiers.' },
      { h: '7. Dur\u00e9e de conservation des donn\u00e9es', p: 'Les donn\u00e9es sont conserv\u00e9es pour les dur\u00e9es suivantes :', items: [
        'Journaux du serveur (adresse IP, User-Agent) : jusqu\u2019\u00e0 7 jours.',
        'Fichiers t\u00e9l\u00e9vers\u00e9s vers des outils c\u00f4t\u00e9 client : non conserv\u00e9s \u2014 supprim\u00e9s de la m\u00e9moire lors du rechargement de la page.',
        'Fichiers t\u00e9l\u00e9vers\u00e9s vers des outils c\u00f4t\u00e9 serveur : supprim\u00e9s imm\u00e9diatement apr\u00e8s le traitement.',
        'Donn\u00e9es localStorage : jusqu\u2019\u00e0 leur suppression manuelle par l\u2019utilisateur.'
      ] },
      { h: '8. Droits de l\u2019utilisateur', p: 'Vous avez le droit de :', items: [
        'Acc\u00e9der \u00e0 vos donn\u00e9es (Art. 15 RGPD).',
        'Rectification des donn\u00e9es (Art. 16 RGPD).',
        'Effacement des donn\u00e9es (Art. 17 RGPD) \u2014 droit \u00e0 l\u2019oubli.',
        'Limitation du traitement (Art. 18 RGPD).',
        'Portabilit\u00e9 des donn\u00e9es (Art. 20 RGPD).',
        'S\u2019opposer au traitement (Art. 21 RGPD).',
        'Retirer le consentement \u00e0 tout moment sans affecter la lic\u00e9it\u00e9 du traitement fond\u00e9 sur le consentement avant son retrait.',
        'Introduire une r\u00e9clamation aupr\u00e8s du Pr\u00e9sident de l\u2019Office de protection des donn\u00e9es personnelles (PUODO), ul. Stawki 2, 00-193 Varsovie, Pologne.'
      ] },
      { h: '9. S\u00e9curit\u00e9 des donn\u00e9es', p: 'Nous appliquons les mesures de s\u00e9curit\u00e9 suivantes :', items: [
        'Chiffrement TLS/SSL \u2014 toute la communication entre le navigateur et le serveur est chiffr\u00e9e.',
        'Content Security Policy (CSP) \u2014 limite la capacit\u00e9 d\u2019ex\u00e9cuter des scripts non fiables.',
        'Traitement uniquement en RAM \u2014 les fichiers ne sont pas \u00e9crits sur le disque du serveur.',
        'Suppression automatique \u2014 les fichiers sont supprim\u00e9s imm\u00e9diatement apr\u00e8s l\u2019ach\u00e8vement de l\u2019op\u00e9ration.',
        'Limite de taille de fichier \u2014 maximum 100 Mo.',
        'V\u00e9rification du type de fichier \u2014 nous v\u00e9rifions la signature du fichier (magic bytes) avant le traitement.',
        'Aucune connexion requise \u2014 nous ne demandons pas d\u2019inscription ni de connexion.'
      ] },
      { h: '10. Google Analytics et consentement analytique', p: 'Ce site utilise Google Analytics (Google LLC, \u00c9tats-Unis) pour l\u2019analyse anonyme du trafic. Google Analytics collecte des donn\u00e9es statistiques agr\u00e9g\u00e9es telles que : nombre de visites, temps pass\u00e9 sur le site, type de navigateur, emplacement approximatif (niveau pays), source de trafic. Les donn\u00e9es sont anonymis\u00e9es (anonymize_ip: true).', items: [
        'Lors de la premi\u00e8re visite, une banni\u00e8re de consentement est affich\u00e9e \u2014 Google Analytics n\u2019est activ\u00e9 qu\u2019apr\u00e8s avoir cliqu\u00e9 sur \u00ab Accept \u00bb.',
        'Vous pouvez retirer votre consentement \u00e0 tout moment en supprimant l\u2019entr\u00e9e \u00ab cookie-consent \u00bb du localStorage de votre navigateur.',
        'Google Analytics n\u2019est pas utilis\u00e9 pour le ciblage publicitaire ou le profilage comportemental.',
        'Les donn\u00e9es dans localStorage (th\u00e8me, langue, pr\u00e9f\u00e9rences de consentement) sont enti\u00e8rement contr\u00f4l\u00e9es par l\u2019utilisateur et peuvent \u00eatre supprim\u00e9es \u00e0 tout moment.'
      ] },
      { h: '11. Fonctions IA et OpenRouter', p: 'L\u2019utilisation des fonctions IA (AI Chat, AI Summary, AI Translate) n\u00e9cessite votre propre cl\u00e9 API OpenRouter, qui est stock\u00e9e exclusivement dans le localStorage de votre navigateur et n\u2019est pas partag\u00e9e avec l\u2019administrateur du site web. La cl\u00e9 API est utilis\u00e9e uniquement pour la communication avec l\u2019API OpenRouter. Nous n\u2019avons pas acc\u00e8s \u00e0 votre cl\u00e9 API ni au contenu des requ\u00eates envoy\u00e9es \u00e0 OpenRouter.' },
      { h: '12. Dispositions finales', p: 'Nous nous r\u00e9servons le droit d\u2019apporter des modifications \u00e0 cette Politique de confidentialit\u00e9. Les modifications seront communiqu\u00e9es en mettant \u00e0 jour la date en haut de cette page. Toute question concernant la politique de confidentialit\u00e9 doit \u00eatre adress\u00e9e \u00e0 : kontakt@optimapdf.com.' }
    ]
  },
  hi: {
    title: '\u0938\u093e\u092e\u093e\u0928\u094d\u0938\u094d \u0938\u094d\u0930\u0947ष्त\u093e',
    updated: '\u0905ंतिम \u0905द्यतन: 30 \u091cून 2026',
    sections: [
      { h: '1. \u0938ामान्य \u092a्क्षिप', p: '\u092fह \u0905नुबंधेत \u0935\u0947बसाइट OptimaPDF (optimapdf.com) \u0915े \u0909पयोगकों \u0915ी \u0935्यक्तिगत\u093e \u0914र \u0935्यक्तिगत \u0921\u0947ट\u093e \u0915ी \u092a्र\u0915्रिय\u093e \u0915ो \u092aरिभाषित \u0915रत\u093e \u0939ै. \u0935ेबसाइट \u0935्यक्तिगत \u0914र \u0938ुरक्षा \u0915ो \u0938बसे महत्व देता \u0939ै. सभी टूल को \u0921\u093fज़ाइन भाव में वेबसाइट के ब्राउसर में व्बक्स तथा जावास्क्रिप्ट का उपयोग किया जाता है.' },
      { h: '2. \u0921\u0947ट\u093e \u092a्रसंकार का उत्तरदायिता', p: '\u0921\u0947ट\u093e \u092a्रसंकार Leszek Hofman, Dąbrówka Nowa, \u092aोलैंड. \u0938म्पर्क: kontakt@optimapdf.com. \u0921\u0947ट\u093e \u092a्रसंकार ने DPO नहीं नियुक्त किया है — व्यक्तिगत \u0938म्बंध के लिए \u0905पने मेल \u0915रे kontakt@optimapdf.com.' },
      { h: '3. \u0921\u0947ट\u093e \u0938ंकलन और \u0909द्देश्यों', sub: [
        { h: '3.1 \u0924\u0915नीकी ड\u0947ट\u093e', p: '\u0935ेबसाइट \u0915ा उपयोग करते समय निम्न तकनीकी ड\u0947ट\u093e स्वचालित रूप से एकत्था जाता है: IP \u092aता, ब्राकाएर प्रकार और \u0938ंस्करण, ऑपरेटिंग सिस्टम, \u0938्क्रीन रास्टाइट, \u0905नुमानत भौगोलिक स्थान, वेबसाटा समय और \u0938ाइट पर बिताया व्तीत. \u092fह ड\u0947ट\u093e गोपनीय है और \u0938ाइट पर बिताया व्तीत बिताया.' },
        { h: '3.2 \u0909पयोगकर्ता \u0926्वारा \u0905पलोड किया गया', p: 'PDF फ़ाइलों का प्रोवेसन निम्न किया जाता है:', items: [
          '\u0915्लाइंट की टूल (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) \u2014 फ़ाइल पूरी तरह वेबसाइट में WebAssembly और JavaScript की सहायता से प्रकारित होता है. फ़ाइल कदेस्थे आपके डिवाइस से बाहर नहीं जाता.',
          '\u0938र्वर की टूल (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) \u2014 फ़ाइल अस्थायी रूप पर भेजा को भेजा जाता है, RAM में प्रक्रित रूपा जाता है और \u0911परेशन के तुरंत बाद में तुरंत डाली जाता है. अधिकतम विलंब: कुछ सेकंड.',
          'AI फ़रन्ट्स (AI Chat, AI Summary, AI Translate) \u2014 PDF से निकाला पाठा टेक्स्ट OpenRouter API को भेजा जाता है. अमें पहचान पहहाने वाली ड\u0947ट\u093e नहीं भेजे जाता है. सामग्री संतोषित नहीं किया जाता है और \u092eोडल पहरामान के लिए इस्तेमाल नहीं किया जाता.'
        ] },
        { h: '3.3 \u0909पयोगकर्ता प्राथामान', p: 'थीम और भाषा संबंधित की जानकारी localStorage में स्टोर की जाती है. इसे सर्वर पर नहीं भेजी जाती हैं और \u0924ीसरों से साझा नहीं किया जाता.' }
      ] },
      { h: '4. डेटा प्रसंकारण का आधार', items: [
        'आर्टिकल 6(1)(b) GDPR \u2014 इलेक्ट्रॉनिक सेवा अनुबंधना के निष्पादन.',
        'आर्टिकल 6(1)(f) GDPR \u2014 वैज्नापक हित को सुरक्षा और दुरुचनता.',
        'आर्टिकल 6(1)(a) GDPR \u2014 AI फ़रन्ट्स के लिये उपयोगकर्ता का सम्मति.'
      ] }
    ]
  },
  is: {
    title: 'Persónuverndarstefna',
    updated: 'Síðast uppfært: 30. júní 2026',
    sections: [
      { h: '1. Almenn ákvæði', p: 'Þessi persónuverndarstefna þekkir þau meðferðarreglur og vernd persónuupplýsinga notenda OptimaPDF (optimapdf.com). OptimaPDF leggur mikla áherslu á persónuvernd og öryggi gagna. Öll verkfærin hafa verið hönnuð eftir persónuverndarreglum — sjálfgefið er að skrá í vafra notandans.' },
      { h: '2. Ákilsábyrgð þjónnna', p: 'Ákilsábyrgð er Leszek Hofman, Dąbrówka Nowa, Pólland. Tölvupóstur: kontakt@optimapdf.com. Enginn persónuverndarstjóri hefur verið skipaður — vinsamlegast hafið samband í gegnum tölvupóst hér að neðan.' },
      { h: '3. Gagnasöfnun og tilgangur', sub: [
        { h: '3.1 Tækniumlýsingar', p: 'Við notkun á vefsíðunni eru eftirfarandi tækniumlýsingar safnaðar sjálfkrafa: IP-tölu, tegund og útgáfa vafra, stýrikerfi, skjámyndastærð, landfræðileg nálægind (að landi), tími heimsóknar og tími í ákveðnum verkfærum. Þessar upplýsingar eru nafnlausar og einungis notaðar í tæknilegum tilgangi og öryggisástæðum.' },
        { h: '3.2 Skrár sem notendur hlaða niður', p: 'PDF-skjár sem hlaðið er niður í verkfærin eru meðhönduð á eftirfarandi hátt:', items: [
          'Klænt svæðisverkfæri (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) — skráin er unnin að fullu í vafranum með WebAssembly og JavaScript. Skráin yfirgefur aldrei tölvuna.',
          'Miðlsværk verkfæri (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) — skráin er tímabundið send á þjón, vinnslu eingöngu í minni og strax eytt eftir aðgerð. Hámarks geymslutími: nokkrar sekúndur.',
          'AI aðgerðir (AI Chat, AI Summary, AI Translate) — texti úr PDF er sendur á ytri OpenRouter API. Við sendum engar persónuupplýsingar. Innihald er ekki geymt í þjónaskál.',
        ] },
        { h: '3.3 Val notenda', p: 'Upplýsingar um valin þemu og tungumál eru geymdar í localStorage vafra. Þær eru ekki sendar á þjón né deilt með þriðja aðila.' }
      ] },
      { h: '4. Lagagrundvöllur meðferðar', items: [
        'Grein 6(1)(b) GDPR — framkvæmd þjónnusamnings um rafræna þjónustu.',
        'Grein 6(1)(f) GDPR — lögmætur áhugi ákils (öryggi, forvarnir gegn misnotkun, tæknileg greining).',
        'Grein 6(1)(a) GDPR — samþykki notanda fyrir AI verkfærum. Samþykki er hægt að afturkalla hvenær sem er.',
      ] },
      { h: '5. Viðtakendur gagna', p: 'Gögnum er hugsanlega deilt með eftirfarandi flokkum viðtakenda:', items: [
        'Google LLC (Google Analytics) — nafnlaus umferðargreining, byggð á þínu samþykki.',
        'Meðhöndlar sem starfa fyrir okkar hönd (hýsing, OpenRouter.ai) — á grundvelli meðferðarsamninga.',
        'Yfirvöld með lögboðnum heimildum — aðeins í þeim tilfellum sem lög krefjast.',
      ] },
      { h: '6. Flutningur gagna utan EES', p: 'Við notkun AI verkfæra getur texti verið unninn á netþjónum OpenRouter í Bandaríkjunum. OpenRouter þátttakur í gagnaverndarramma (DPF), sem tryggir fullnægjandi vernd gagna (ákvörðun ESB 2023/1795). Önnur gögn eru ekki flutt til þriðja landa.' },
      { h: '7. Geymslutími gagna', p: 'Gögn eru geymd í eftirfarandi tímalengd:', items: [
        'Atburðaskrár þjóns (IP-tala, User-Agent): allt að 7 dögum.',
        'Skrár sendar á klænt verkfæri: ekki geymdar — eytt úr minni við endurhleðslu síðu.',
        'Skrár sendar á miðlsværk verkfæri: strax eytt eftir vinnslu.',
        'Gögn í localStorage: allt að þeim tíma er notandi eykir þeim handvirkt.',
      ] },
      { h: '8. Réttindi notenda', p: 'Þú hefur rétt á:', items: [
        'Aðgang að gögnum þínum (grein 15 GDPR).',
        'Leiðréttingu gagna (grein 16 GDPR).',
        'Eyðingu gagna (grein 17 GDPR) — réttur til gleymingar.',
        'Takmarkun meðferðar (grein 18 GDPR).',
        'Flutningu gagna (grein 20 GDPR).',
        'Andmælum gegn meðferð (grein 21 GDPR).',
        'Afturköllun samþykkis hvenær sem er án þess að hafa áhrif á lögmæti meðferðar áður en afturköllun.',
        'Kæru til Persónuverndar (PUODO), ul. Stawki 2, 00-193 Warszawa, Pólland.',
      ] },
      { h: '9. Öryggi gagna', p: 'Við beitum eftirfarandi öryggisráðstöfunum:', items: [
        'TLS/SSL dulkóðun — all samskipti milli vafra og þjóns eru dulkóðuð.',
        'Content Security Policy (CSP) — takmarkar hæfni til að keyra óörugg skript.',
        'Vinnslu eingöngu í minni — skrár eru ekki skrifaðar á disk þjóns.',
        'Sjálfvirk eyðing — skrár er strax eytt eftir aðgerð.',
        'Stærðatakmarka skráa — hámark 100 MB.',
        'Skráargerðaryfirferð — við yfirfærum skráarundirrit (magic bytes) áður en unnið er.',
        'Engin tenging nauðsynleg — við biðjum ekki um skráningu eða innskráningu.',
      ] },
      { h: '10. Google Analytics og samþykki greiningar', p: 'Þessi síða notar Google Analytics (Google LLC, Bandaríkin) fyrir nafnlaus umferðargreiningu.', items: [
        'Við fyrsta heimsókn er birt samþykkisborði — Google Analytics er ekki virkjað fyrr en smellt er á Accept.',
        'Þú getur afturkallað samþykkið hvenær sem er með því að eyða færslu cookie-consent úr localStorage.',
        'Google Analytics er ekki notað fyrir auglýsingamarkmið eða hegðunarsniðmyndun.',
        'Gögn í localStorage (þema, tungumál, samþykkisval) eru alfarið undir stjórn notanda og hægt að eyða hvenær sem er.',
      ] },
      { h: '11. AI verkfæri og OpenRouter', p: 'Notkun AI verkfæra (AI Chat, AI Summary, AI Translate) krefst þíns eigin OpenRouter API lykils, sem er einungis geymdur í localStorage vafra og ekki deilt með eiganda vefsíðunnar.' },
      { h: '12. Lokákvæði', p: 'Við áskiljum okkur rétt til að breyta þessari persónuverndarstefnu. Breytingar verða tilkynntar með uppfærslu dagsetnings í efri hluta þessarar síðu. Öll spurningum um persónuvernd skal beina til: kontakt@optimapdf.com.' }
    ]
  },
  it: {
    title: 'Informativa sulla Privacy',
    updated: 'Ultimo aggiornamento: 30 giugno 2026',
    sections: [
      { h: '1. Disposizioni generali', p: 'La presente Informativa sulla Privacy descrive le regole di trattamento e protezione dei dati personali degli utenti di OptimaPDF (optimapdf.com). OptimaPDF attribuisce grande importanza alla privacy e alla sicurezza dei dati. Tutti gli strumenti sono progettati secondo i principi della privacy by design — per impostazione predefinita, i dati vengono salvati solo nel browser dell\'utente.' },
      { h: '2. Titolare del trattamento', p: 'Il titolare del trattamento è Leszek Hofman, Dąbrówka Nowa, Polonia. Email: kontakt@optimapdf.com. Non è stato nominato un Responsabile della Protezione dei Dati (DPO) — per domande relative ai dati personali, contattare via email kontakt@optimapdf.com.' },
      { h: '3. Raccolta dati e finalità', sub: [
        { h: '3.1 Dati tecnici', p: 'Durante l\'utilizzo del sito vengono raccolti automaticamente i seguenti dati tecnici: indirizzo IP, tipo e versione del browser, sistema operativo, risoluzione dello schermo, posizione geografica approssimativa (paese), ora della visita e tempo trascorso sui singoli strumenti. Questi dati sono anonimi e vengono utilizzati esclusivamente per scopi tecnici e di sicurezza.' },
        { h: '3.2 File caricati dagli utenti', p: 'I file PDF elaborati negli strumenti vengono trattati come segue:', items: [
          'Strumenti lato client (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) — il file viene elaborato interamente nel browser tramite WebAssembly e JavaScript. Il file non esce mai dal tuo dispositivo.',
          'Strumenti lato server (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) — il file viene inviato temporaneamente al server, elaborato solo in memoria e cancellato immediatamente dopo l\'operazione. Tempo massimo di retention: pochi secondi.',
          'Strumenti AI (AI Chat, AI Summary, AI Translate) — il testo estratto dal PDF viene inviato all\'API esterna di OpenRouter. Non vengono inviati dati personali identificabili. Il contenuto non viene memorizzato nel server.',
        ] },
        { h: '3.3 Preferenze utente', p: 'Le informazioni su tema e lingua selezionati vengono memorizzate nel localStorage del browser. Non vengono inviate al server né condivise con terzi.' },
      ] },
      { h: '4. Base giuridica del trattamento', items: [
        'Art. 6(1)(b) RGDPR — esecuzione del contratto di servizio elettronico.',
        'Art. 6(1)(f) RGDPR — legittimo interesse (sicurezza, prevenzione abusi, analisi tecnica).',
        'Art. 6(1)(a) RGDPR — consenso dell\'utente per gli strumenti AI. Il consenso può essere revocato in qualsiasi momento.',
      ] },
      { h: '5. Destinatari dei dati', p: 'I dati possono essere condivisi con le seguenti categorie di destinatari:', items: [
        'Google LLC (Google Analytics) — analisi del traffico anonima, basata sul tuo consenso.',
        'Fornitori che operano per nostro conto (hosting, OpenRouter.ai) — sulla base di contratti di trattamento.',
        'Autorità con poteri legali — solo nei casi previsti dalla legge.',
      ] },
      { h: '6. Trasferimento dati al di fuori dello SEE', p: 'Durante l\'utilizzo degli strumenti AI, il testo può essere elaborato sui server di OpenRouter negli Stati Uniti. OpenRouter partecipa al Data Privacy Framework (DPF), che garantisce una protezione adeguata dei dati (Decisione UE 2023/1795). Altri dati non vengono trasferiti a paesi terzi.' },
      { h: '7. Periodo di conservazione', p: 'I dati vengono conservati per i seguenti periodi:', items: [
        'Log del server (indirizzo IP, User-Agent): fino a 7 giorni.',
        'File inviati agli strumenti lato client: non conservati — cancellati al ricaricamento della pagina.',
        'File inviati agli strumenti lato server: cancellati immediatamente dopo l\'elaborazione.',
        'Dati nel localStorage: fino a quando l\'utente non li cancella manualmente.',
      ] },
      { h: '8. Diritti dell\'utente', p: 'Hai diritto a:', items: [
        'Accesso ai tuoi dati (art. 15 RGDPR).',
        'Rettifica dei dati (art. 16 RGDPR).',
        'Cancellazione dei dati (art. 17 RGDPR) — diritto all\'oblio.',
        'Limitazione del trattamento (art. 18 RGDPR).',
        'Portabilità dei dati (art. 20 RGDPR).',
        'Opposizione al trattamento (art. 21 RGDPR).',
        'Revoca del consenso in qualsiasi momento senza effetto sulla liceità del trattamento precedente.',
        'Reclamo all\'Ufficio del Protector dei Dati Personali (PUODO), ul. Stawki 2, 00-193 Warszawa, Polonia.',
      ] },
      { h: '9. Sicurezza dei dati', p: 'Adottiamo le seguenti misure di sicurezza:', items: [
        'Crittografia TLS/SSL — tutta la comunicazione tra browser e server è crittografata.',
        'Content Security Policy (CSP) — limita la possibilità di eseguire script non sicuri.',
        'Elaborazione solo in memoria — i file non vengono scritti su disco del server.',
        'Cancellazione automatica — i file vengono cancellati immediatamente dopo l\'operazione.',
        'Limite dimensione file — massimo 100 MB.',
        'Verifica tipo file — controlliamo i magic bytes prima dell\'elaborazione.',
        'Nessuna registrazione necessaria — non chiediamo registrazione o accesso.',
      ] },
      { h: '10. Google Analytics e consenso analitico', p: 'Questo sito utilizza Google Analytics (Google LLC, USA) per l\'analisi anonima del traffico.', items: [
        'Al primo访问 viene visualizzata una barra di consenso — Google Analytics non viene attivato fino al clic su Accetta.',
        'Puoi revocare il consenso in qualsiasi momento eliminando la voce cookie-consent dal localStorage.',
        'Google Analytics non viene utilizzato per la pubblicità comportamentale o il profilazione.',
        'I dati nel localStorage (tema, lingua, scelta consenso) sono interamente sotto il controllo dell\'utente e possono essere eliminati in qualsiasi momento.',
      ] },
      { h: '11. Strumenti AI e OpenRouter', p: 'L\'utilizzo degli strumenti AI (AI Chat, AI Summary, AI Translate) richiede la tua chiave API personale di OpenRouter, memorizzata esclusivamente nel localStorage del browser e non condivisa con il proprietario del sito.' },
      { h: '12. Disposizioni finali', p: 'Ci riserviamo il diritto di apportare modifiche alla presente Informativa sulla Privacy. Le modifiche verranno comunicate aggiornando la data in alto su questa pagina. Per domande sulla privacy, contattare: kontakt@optimapdf.com.' },
    ]
  },
  ja: {
    title: 'プライバシーポリシー',
    updated: '最終更新日: 2026年6月30日',
    sections: [
      { h: '1. 一般条項', p: 'このプライバシーポリシーは、OptimaPDF（optimapdf.com）ユーザーの個人情報の取扱いと保護に関する規則を定めるものです。OptimaPDFはプライバシーセキュリティを最優先します。すべてのツールはプライバシーバイデザインに従って設計されています。デフォルトでは、すべてのデータがユーザーのブラウザ内にのみ保存されます。' },
      { h: '2. データ管理者', p: 'データ管理者はレシェク・ホフマン（Leszek Hofman）、ポーランド・ドブロフカ・ノヴァ。メール: kontakt@optimapdf.com。データ保護責任者（DPO）は任命されていません。個人データに関するお問い合わせは、メールで kontakt@optimapdf.com までご連絡ください。' },
      { h: '3. データ収集と目的', sub: [
        { h: '3.1 技術データ', p: 'サイト利用時に以下の技術データが自動的に収集されます：IPアドレス、ブラウザの種類とバージョン、オペレーティングシステム、画面解像度、大まかな地理的位置（国）、訪問時刻、各ツールでの滞在時間。これらのデータは匿名であり、技術的・セキュリティ上の目的のみに使用されます。' },
        { h: '3.2 ユーザーがアップロードしたファイル', p: 'ツールで処理されるPDFファイルは以下のように取り扱われます：', items: [
          'クライアント側ツール（merge、split、rotate、watermark、page-numbers、crop-pdf、edit-pdf、sign-pdf、redact-pdf、flatten-pdf、delete-pages、extract-pages、reorder-pages、add-page、metadata、pdf-to-svg、pdf-to-epub、pdf-to-txt、fill-form、pdf-to-images、to-pdfa、compare-pdf、unlock-pdf、protect-pdf）— ファイルはWebAssemblyとJavaScriptを使用してブラウザ内で完全に処理されます。ファイルはデバイスから出ません。',
          'サーバー側ツール（compress-pdf、ocr-pdf、pdf-to-word、word-to-pdf、jpg-to-pdf、pdf-to-excel、excel-to-pdf、pdf-to-powerpoint、openoffice-to-pdf、pdf-to-openoffice、pdf-to-html、html-to-pdf、url-to-pdf）— ファイルは一時的にサーバーに送られ、メモリ内で処理された直後に削除されます。最大保持時間：数秒。',
          'AIツール（AI Chat、AI Summary、AI Translate）— PDFから抽出されたテキストは外部のOpenRouter APIに送信されます。個人を特定する情報は送信されません。コンテンツはサーバーに保存されません。',
        ] },
        { h: '3.3 ユーザー設定', p: '選択されたテーマと言語の情報はブラウザのlocalStorageに保存されます。サーバーに送信されることも、第三者と共有されることもありません。' },
      ] },
      { h: '4. 処理の法的根拠', items: [
        'GDPR第6条第1項第b号 — 電子サービス契約の履行。',
        'GDPR第6条第1項第f号 — 正当な利益（セキュリティ、不正利用防止、技術的分析）。',
        'GDPR第6条第1項第a号 — AIツール利用のユーザー同意。同意はいつでも撤回可能です。',
      ] },
      { h: '5. データ受領者', p: 'データは以下のカテゴリの受領者と共有される場合があります：', items: [
        'Google LLC（Google Analytics）— 匿名のトラフィック分析、ユーザーの同意に基づきます。',
        '当社の代理で業務を行うプロバイダー（ホスティング、OpenRouter.ai）— 処理契約に基づきます。',
        '法的権限を持つ当局 — 法律で要求される場合のみ。',
      ] },
      { h: '6. EEA外へのデータ転送', p: 'AIツール使用時、テキストが米国のOpenRouterサーバーで処理される場合があります。OpenRouterはデータプライバシーフレームワーク（DPF）に参加しており、十分なデータ保護を保証しています（EU決定2023/1795）。その他のデータは第三国に転送されません。' },
      { h: '7. データ保持期間', p: 'データは以下の期間保存されます：', items: [
        'サーバーイベントログ（IPアドレス、User-Agent）：最大7日間。',
        'クライアント側ツールに送信されたファイル：保存なし — ページ再読み込み時に削除。',
        'サーバー側ツールに送信されたファイル：処理後に即時削除。',
        'localStorageのデータ：ユーザーが手動で削除するまで。',
      ] },
      { h: '8. ユーザーの権利', p: '以下のような権利があります：', items: [
        'データへのアクセス（GDPR第15条）。',
        'データの修正（GDPR第16条）。',
        'データの削除（GDPR第17条）— 消忘する権利。',
        '処理の制限（GDPR第18条）。',
        'データのポータビリティ（GDPR第20条）。',
        '処理への反対（GDPR第21条）。',
        '同意の撤回（いつでも可能。撤回前の処理の合法性には影響しません）。',
        '個人情報保護局（PUODO）への苦情。住所：ul. Stawki 2, 00-193 Warszawa, ポーランド。',
      ] },
      { h: '9. データセキュリティ', p: '以下のセキュリティ対策を講じています：', items: [
        'TLS/SSL暗号化 — ブラウザとサーバー間のすべての通信は暗号化されています。',
        'Content Security Policy（CSP）— 安全でないスクリプトの実行可能性を制限。',
        'メモリ内のみの処理 — ファイルはサーバーのディスクに書き込まれません。',
        '自動削除 — 操作後にファイルは即時削除。',
        'ファイルサイズ制限 — 最大100MB。',
        'ファイルタイプ検証 — 処理前にマジックバイトを確認。',
        '登録不要 — 登録やログインは求めません。',
      ] },
      { h: '10. Google Analyticsと分析同意', p: '当サイトはトラフィックの匿名分析にGoogle Analytics（Google LLC、米国）を使用しています。', items: [
        '初回アクセス時に同意バーが表示されます。AcceptをクリックするまでGoogle Analyticsは有効になりません。',
        'localStorageのcookie-consent項目を削除することで、いつでも同意を撤回できます。',
        'Google Analyticsは行動ターゲティングやプロファイリングには使用されません。',
        'localStorageのデータ（テーマ、言語、同意設定）はユーザーが完全に管理でき、いつでも削除可能です。',
      ] },
      { h: '11. AIツールとOpenRouter', p: 'AIツール（AI Chat、AI Summary、AI Translate）の利用には、ご自身のOpenRouter APIキーが必要です。このキーはブラウザのlocalStorageにのみ保存され、サイトオーナーと共有されることはありません。' },
      { h: '12. 最終規定', p: '本プライバシーポリシーは予告なく変更する場合があります。変更はこのページの上部の日付を更新して通知されます。プライバシーに関するご質問は：kontakt@optimapdf.com までご連絡ください。' },
    ]
  },
  no: {
    title: 'Personvernpolicy',
    updated: 'Sist oppdatert: 30. juni 2026',
    sections: [
      { h: '1. Generelle bestemmelser', p: 'Denne personvernpolitikken beskriver reglene for behandling og beskyttelse av personopplysninger til brukere av OptimaPDF (optimapdf.com). OptimaPDF legger stor vekt på personvern og datasikkerhet. Alle verktøyene er designet i henhold til personvernprinsippene — som standard lagres all informasjon kun i brukerens nettleser.' },
      { h: '2. Behandlingsansvarlig', p: 'Behandlingsansvarlig er Leszek Hofman, Dąbrówka Nowa, Polen. E-post: kontakt@optimapdf.com. Det er ikke utnevnt en databeskyttelsesoffiser (DPO) — for spørsmål knyttet til personopplysninger, kontakt via e-post kontakt@optimapdf.com.' },
      { h: '3. Innsamling av data og formål', sub: [
        { h: '3.1 Tekniske data', p: 'Ved bruk av nettstedet samles følgende tekniske data automatisk inn: IP-adresse, nettlesertype og -versjon, operativsystem, skjermoppløsning, omtrentlig geografisk plassering (land), besøkstid og tid brukt på hvert verktøy. Disse dataene er anonyme og brukes utelukkende til tekniske og sikkerhetsmessige formål.' },
        { h: '3.2 Filer lastet opp av brukere', p: 'PDF-filer behandlet i verktøyene håndteres som følger:', items: [
          'Klientsiderverktøy (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) — filen behandles fullstendig i nettleseren ved hjelp av WebAssembly og JavaScript. Filen forlater aldri enheten din.',
          'Serververktøy (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) — filen sendes midlertidig til serveren, behandles kun i minne og slettes umiddelbart etter operasjonen. Maksimal oppbevaringstid: noen få sekunder.',
          'AI-verktøy (AI Chat, AI Summary, AI Translate) — tekst utvunnet fra PDF sendes til ekstern OpenRouter API. Ingen personlige identifiserbare data sendes. Innholdet lagres ikke på serveren.',
        ] },
        { h: '3.3 Brukerpreferanser', p: 'Informasjon om valgt tema og språk lagres i nettleserens localStorage. Det sendes ikke til serveren og deles ikke med tredjeparter.' },
      ] },
      { h: '4. Rettslig grunnlag for behandling', items: [
        'Art. 6(1)(b) GDPR — oppfyllelse av kontrakten om elektronisk tjeneste.',
        'Art. 6(1)(f) GDPR — berettiget interesse (sikkerhet, misbrukforebygging, teknisk analyse).',
        'Art. 6(1)(a) GDPR — brukers samtykke for AI-verktøy. Samtykke kan trekkes tilbake når som helst.',
      ] },
      { h: '5. Mottakere av data', p: 'Data kan deles med følgende kategorier av mottakere:', items: [
        'Google LLC (Google Analytics) — anonym trafikkanalyse, basert på ditt samtykke.',
        'Leverandører som opererer på våre vegne (hosting, OpenRouter.ai) — på grunnlag av databehandlingsavtaler.',
        'Myndigheter med juridisk myndighet — kun i de tilfellene loven krever det.',
      ] },
      { h: '6. Overføring av data utenfor EØS', p: 'Ved bruk av AI-verktøy kan tekst behandles på OpenRouter-servere i USA. OpenRouter deltar i rammeverket for datapersonvern (DPF), som sikrer tilstrekkelig beskyttelse av data (beslutning EU 2023/1795). Andre data overføres ikke til tredjeland.' },
      { h: '7. Lagringstid for data', p: 'Data oppbevares i følgende tidsperioder:', items: [
        'Serverhendelseslogger (IP-adresse, User-Agent): opptil 7 dager.',
        'Filer sendt til klientsiderverktøy: ikke lagret — slettes ved opplasting av siden.',
        'Filer sendt til serververktøy: slettes umiddelbart etter behandling.',
        'Data i localStorage: inntil brukeren sletter dem manuelt.',
      ] },
      { h: '8. Brukerrettigheter', p: 'Du har rett til:', items: [
        'Innsyn i dataene dine (art. 15 GDPR).',
        'Retting av data (art. 16 GDPR).',
        'Sletting av data (art. 17 GDPR) — retten til å bli glemt.',
        'Begrensning av behandling (art. 18 GDPR).',
        'Databærbarehet (art. 20 GDPR).',
        'Innsigelse mot behandling (art. 21 GDPR).',
        'Trekke tilbake samtykke når som helst uten at det påvirker lovligheten av behandlingen før tilbaketrekkingen.',
        'Klage til Personvernnemnda (PUODO), ul. Stawki 2, 00-193 Warszawa, Polen.',
      ] },
      { h: '9. Datasikkerhet', p: 'Vi bruker følgende sikkerhetstiltak:', items: [
        'TLS/SSL-kryptering — all kommunikasjon mellom nettleser og server er kryptert.',
        'Content Security Policy (CSP) — begrenser muligheten til å kjøre usikre skript.',
        'Behandling kun i minne — filer skrives ikke til serverens disk.',
        'Automatisk sletting — filer slettes umiddelbart etter operasjonen.',
        'Filstørrelsesgrense — maks 100 MB.',
        'Filsjekk — vi kontrollerer magiske bytes før behandling.',
        'Ingen påkrevd registrering — vi ber ikke om registrering eller pålogging.',
      ] },
      { h: '10. Google Analytics og samtykke til analyse', p: 'Dette nettstedet bruker Google Analytics (Google LLC, USA) for anonym trafikkanalyse.', items: [
        'Ved første besøk vises en samtykkebanner — Google Analytics aktiveres ikke før du klikker på Aksepter.',
        'Du kan trekke tilbake samtykket når som helst ved å slette cookie-consent-posten fra localStorage.',
        'Google Analytics brukes ikke for atferdsbasert annonsering eller profilering.',
        'Data i localStorage (tema, språk, samtykkevalg) er fullstendig under brukerens kontroll og kan slettes når som helst.',
      ] },
      { h: '11. AI-verktøy og OpenRouter', p: 'Bruk av AI-verktøy (AI Chat, AI Summary, AI Translate) krever din egen OpenRouter API-nøkkel, som kun lagres i nettleserens localStorage og ikke deles med nettstedseieren.' },
      { h: '12. Sluttbestemmelser', p: 'Vi forbeholder oss retten til å gjøre endringer i denne personvernpolitikken. Endringer vil bli kunngjort ved å oppdatere datoen øverst på denne siden. Eventuelle spørsmål om personvern kan rettes til: kontakt@optimapdf.com.' },
    ]
  },
  pt: {
    title: 'Política de Privacidade',
    updated: 'Última atualização: 30 de junho de 2026',
    sections: [
      { h: '1. Disposições gerais', p: 'Esta Política de Privacidade descreve as regras de tratamento e proteção de dados pessoais dos usuários do OptimaPDF (optimapdf.com). O OptimaPDF dá grande importância à privacidade e segurança de dados. Todas as ferramentas são projetadas de acordo com os princípios de privacidade por design — por padrão, todas as informações ficam armazenadas apenas no navegador do usuário.' },
      { h: '2. Controlador de dados', p: 'O controlador de dados é Leszek Hofman, Dąbrówka Nowa, Polônia. E-mail: kontakt@optimapdf.com. Não foi nomeado um Encarregado de Proteção de Dados (DPO) — para perguntas sobre dados pessoais, entre em contato por e-mail kontakt@optimapdf.com.' },
      { h: '3. Coleta de dados e finalidade', sub: [
        { h: '3.1 Dados técnicos', p: 'Ao usar o site, os seguintes dados técnicos são coletados automaticamente: endereço IP, tipo e versão do navegador, sistema operacional, resolução da tela, localização geográfica aproximada (país), horário da visita e tempo gasto em cada ferramenta. Esses dados são anônimos e usados exclusivamente para fins técnicos e de segurança.' },
        { h: '3.2 Arquivos carregados pelos usuários', p: 'Os arquivos PDF processados nas ferramentas são tratados da seguinte forma:', items: [
          'Ferramentas do lado do cliente (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) — o arquivo é processado inteiramente no navegador usando WebAssembly e JavaScript. O arquivo nunca sai do seu dispositivo.',
          'Ferramentas do lado do servidor (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) — o arquivo é enviado temporariamente ao servidor, processado apenas na memória e imediatamente excluído após a operação. Tempo máximo de retenção: poucos segundos.',
          'Ferramentas de IA (AI Chat, AI Summary, AI Translate) — o texto extraído do PDF é enviado à API externa da OpenRouter. Nenhum dado pessoal identificável é enviado. O conteúdo não é armazenado no servidor.',
        ] },
        { h: '3.3 Preferências do usuário', p: 'As informações sobre o tema e idioma selecionados são armazenadas no localStorage do navegador. Não são enviadas ao servidor nem compartilhadas com terceiros.' },
      ] },
      { h: '4. Base legal do tratamento', items: [
        'Art. 6(1)(b) RGPD — execução do contrato de serviço eletrônico.',
        'Art. 6(1)(f) RGPD — interesse legítimo (segurança, prevenção de abusos, análise técnica).',
        'Art. 6(1)(a) RGPD — consentimento do usuário para ferramentas de IA. O consentimento pode ser revogado a qualquer momento.',
      ] },
      { h: '5. Destinatários dos dados', p: 'Os dados podem ser compartilhados com as seguintes categorias de destinatários:', items: [
        'Google LLC (Google Analytics) — análise de tráfego anônima, baseada no seu consentimento.',
        'Fornecedores que operam em nosso nome (hospedagem, OpenRouter.ai) — com base em contratos de tratamento.',
        'Autoridades com poderes legais — apenas nos casos exigidos por lei.',
      ] },
      { h: '6. Transferência de dados para fora doEEE', p: 'Ao usar ferramentas de IA, o texto pode ser processado em servidores da OpenRouter nos EUA. A OpenRouter participa do Privacy Shield (DPF), que garante proteção adequada dos dados (Decisão UE 2023/1795). Outros dados não são transferidos para países terceiros.' },
      { h: '7. Prazo de retenção de dados', p: 'Os dados são armazenados pelos seguintes períodos:', items: [
        'Logs de eventos do servidor (endereço IP, User-Agent): até 7 dias.',
        'Arquivos enviados para ferramentas do lado do cliente: não armazenados — excluídos ao recarregar a página.',
        'Arquivos enviados para ferramentas do lado do servidor: excluídos imediatamente após o processamento.',
        'Dados no localStorage: até que o usuário os exclua manualmente.',
      ] },
      { h: '8. Direitos do usuário', p: 'Você tem direito a:', items: [
        'Acesso aos seus dados (art. 15 RGPD).',
        'Retificação dos dados (art. 16 RGPD).',
        'Exclusão dos dados (art. 17 RGPD) — direito ao esquecimento.',
        'Limitação do tratamento (art. 18 RGPD).',
        'Portabilidade dos dados (art. 20 RGPD).',
        'Oposição ao tratamento (art. 21 RGPD).',
        'Revogação do consentimento a qualquer momento sem afetar a legalidade do tratamento anterior.',
        'Reclamação à Autoridade de Proteção de Dados (PUODO), ul. Stawki 2, 00-193 Warszawa, Polônia.',
      ] },
      { h: '9. Segurança dos dados', p: 'Adotamos as seguintes medidas de segurança:', items: [
        'Criptografia TLS/SSL — toda comunicação entre navegador e servidor é criptografada.',
        'Content Security Policy (CSP) — limita a capacidade de executar scripts inseguros.',
        'Processamento apenas em memória — os arquivos não são gravados no disco do servidor.',
        'Exclusão automática — os arquivos são excluídos imediatamente após a operação.',
        'Limite de tamanho de arquivo — máximo de 100 MB.',
        'Verificação de tipo de arquivo — verificamos os magic bytes antes do processamento.',
        'Nenhum cadastro necessário — não pedimos cadastro ou login.',
      ] },
      { h: '10. Google Analytics e consentimento de análise', p: 'Este site usa o Google Analytics (Google LLC, EUA) para análise anônima de tráfego.', items: [
        'Na primeira visita, é exibida uma barra de consentimento — o Google Analytics não é ativado até clicar em Aceitar.',
        'Você pode revogar o consentimento a qualquer momento excluindo a entrada cookie-consent do localStorage.',
        'O Google Analytics não é usado para publicidade comportamental ou perfilamento.',
        'Dados no localStorage (tema, idioma, escolha de consentimento) são totalmente controlados pelo usuário e podem ser excluídos a qualquer momento.',
      ] },
      { h: '11. Ferramentas de IA e OpenRouter', p: 'O uso das ferramentas de IA (AI Chat, AI Summary, AI Translate) requer sua chave API pessoal da OpenRouter, armazenada exclusivamente no localStorage do navegador e não compartilhada com o proprietário do site.' },
      { h: '12. Disposições finais', p: 'Reservamo-nos o direito de alterar esta Política de Privacidade. As alterações serão comunicadas atualizando a data no topo desta página. Qualquer pergunta sobre privacidade deve ser dirigida a: kontakt@optimapdf.com.' },
    ]
  },
  sv: {
    title: 'Integritetspolicy',
    updated: 'Senast uppdaterad: 30 juni 2026',
    sections: [
      { h: '1. Allmänna bestämmelser', p: 'Denna integritetspolicy beskriver reglerna för behandling och skydd av personuppgifter för användare av OptimaPDF (optimapdf.com). OptimaPDF lägger stor vikt vid integritet och datasäkerhet. Alla verktyg är designade enligt integritetsprinciperna — som standard sparas all information endast i användarens webbläsare.' },
      { h: '2. Personuppgiftsansvarig', p: 'Personuppgiftsansvarig är Leszek Hofman, Dąbrówka Nowa, Polen. E-post: kontakt@optimapdf.com. Ingen dataskyddslämnare har utsetts — för frågor om personuppgifter, kontakta via e-post kontakt@optimapdf.com.' },
      { h: '3. Insamling av data och ändamål', sub: [
        { h: '3.1 Tekniska data', p: 'Vid användning av webbplatsen samlas följande tekniska data automatiskt in: IP-adress, webblänsartyp och version, operativsystem, skärmupplösning, ungefärlig geografisk plats (land), besökstid och tid spenderad på varje verktyg. Dessa data är anonyma och används enbart för tekniska och säkerhetsmässiga ändamål.' },
        { h: '3.2 Filer som laddas upp av användare', p: 'PDF-filer som behandlas i verktygen hanteras på följande sätt:', items: [
          'Klientsideverktyg (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) — filen behandlas helt i webbläsaren med WebAssembly och JavaScript. Filen lämnar aldrig din enhet.',
          'Serververktyg (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) — filen skickas tillfälligt till servern, behandlas endast i minnet och raderas omedelbart efter åtgärden. Maximal lagringstid: några få sekunder.',
          'AI-verktyg (AI Chat, AI Summary, AI Translate) — text som extraheras från PDF skickas till extern OpenRouter API. Inga personligt identifierbara data skickas. Innehållet lagras inte på servern.',
        ] },
        { h: '3.3 Användarinställningar', p: 'Information om valt tema och språk sparas i webbläsarens localStorage. Den skickas inte till servern och delas inte med tredje parter.' },
      ] },
      { h: '4. Rättslig grund för behandling', items: [
        'Art. 6(1)(b) GDPR — uppfyllande av kontraktet om elektronisk tjänst.',
        'Art. 6(1)(f) GDPR — berättigat intresse (säkerhet, missbruksförhindring, teknisk analys).',
        'Art. 6(1)(a) GDPR — användarens samtycke för AI-verktyg. Samtycke kan återkallas när som helst.',
      ] },
      { h: '5. Mottagare av data', p: 'Data kan delas med följande kategorier av mottagare:', items: [
        'Google LLC (Google Analytics) — anonym trafikanalys, baserad på ditt samtycke.',
        'Leverantörer som opererar på vår väg (hosting, OpenRouter.ai) — på grundlag av databehandlingsavtal.',
        'Myndigheter med juridisk behörighet — endast i de fall lagen kräver det.',
      ] },
      { h: '6. Överföring av data utanför EES', p: 'Vid användning av AI-verktyg kan text behandlas på OpenRouter-servrar i USA. OpenRouter deltar i dataskyddsramverket (DPF), som garanterar tillräckligt dataskydd (beslut EU 2023/1795). Andra data överförs inte till tredjeländer.' },
      { h: '7. Lagringstid för data', p: 'Data lagras under följande tidsperioder:', items: [
        'Serverhändelseloggar (IP-adress, User-Agent): upp till 7 dagar.',
        'Filer skickade till klientsideverktyg: inte lagrade — raderade vid omladdning av sidan.',
        'Filer skickade till serververktyg: raderade omedelbart efter behandlingen.',
        'Data i localStorage: tills användaren manuellt raderar dem.',
      ] },
      { h: '8. Användarrättigheter', p: 'Du har rätt till:', items: [
        'Tillgång till dina uppgifter (art. 15 GDPR).',
        'Rättelse av uppgifter (art. 16 GDPR).',
        'Radering av uppgifter (art. 17 GDPR) — rätten att bli glömd.',
        'Begränsning av behandling (art. 18 GDPR).',
        'Databarhet (art. 20 GDPR).',
        'Invändning mot behandling (art. 21 GDPR).',
        'Återkallelse av samtycke när som helst utan att påverka behandlingens laglighet före återkallelsen.',
        'Klagomål till Dataskyddsmyndigheten (PUODO), ul. Stawki 2, 00-193 Warszawa, Polen.',
      ] },
      { h: '9. Datasäkerhet', p: 'Vi vidtar följande säkerhetsåtgärder:', items: [
        'TLS/SSL-kryptering — all kommunikation mellan webbläsare och server är krypterad.',
        'Content Security Policy (CSP) — begränsar möjligheten att köra osäkra skript.',
        'Behandling endast i minne — filer skrivs inte till serverns disk.',
        'Automatisk radering — filer raderas omedelbart efter åtgärden.',
        'Filstorleksgräns — max 100 MB.',
        'Filtypverifiering — vi kontrollerar magiska byte före behandling.',
        'Ingen registrering krävs — vi ber inte om registrering eller inloggning.',
      ] },
      { h: '10. Google Analytics och samtycke till analys', p: 'Denna webbplats använder Google Analytics (Google LLC, USA) för anonym trafikanalys.', items: [
        'Vid första besöket visas en samtyckesbanner — Google Analytics aktiveras inte förrän du klickar på Accept.',
        'Du kan återkalla samtycket när som helst genom att radera cookie-consent-posten från localStorage.',
        'Google Analytics används inte för beteendebaserad annons eller profilering.',
        'Data i localStorage (tema, språk, samtyckesval) är helt under användarens kontroll och kan raderas när som helst.',
      ] },
      { h: '11. AI-verktyg och OpenRouter', p: 'Användning av AI-verktyg (AI Chat, AI Summary, AI Translate) kräver din egen OpenRouter API-nyckel, som lagras endast i webbläsarens localStorage och inte delas med webbplatsägaren.' },
      { h: '12. Slutsatser', p: 'Vi förbehåller oss rätten att ändra denna integritetspolicy. Ändringar meddelas genom att uppdatera datumet högst upp på denna sida. Eventuella frågor om integritet kan ställas till: kontakt@optimapdf.com.' },
    ]
  },
  tr: {
    title: 'Gizlilik Politikası',
    updated: 'Son güncelleme: 30 Haziran 2026',
    sections: [
      { h: '1. Genel hükümler', p: 'Bu Gizlilik Politikası, OptimaPDF (optimapdf.com) kullanıcılarının kişisel verilerinin işlenmesi ve korunmasına ilişkin kuralları açıklar. OptimaPDF gizlilik ve veri güvenliğine büyük önem verir. Tüm araçlar gizlilik temelinde tasarlanmıştır — varsayılan olarak tüm bilgiler yalnızca kullanıcının tarayıcısında saklanır.' },
      { h: '2. Veri sorumlusu', p: 'Veri sorumlusu Leszek Hofman, Dąbrówka Nowa, Polonya\'dır. E-posta: kontakt@optimapdf.com. Veri Koruma Görevlisi (DPO) atanmamıştır — kişisel verilerle ilgili sorularınız için e-posta ile kontakt@optimapdf.com adresine başvurun.' },
      { h: '3. Veri toplama ve amaçlar', sub: [
        { h: '3.1 Teknik veriler', p: 'Siteyi kullanırken aşağıdaki teknik veriler otomatik olarak toplanır: IP adresi, tarayıcı türü ve sürümü, işletim sistemi, ekran çözünürlüğü, yaklaşık coğrafi konum (ülke), ziyaret saati ve her araçta geçirilen süre. Bu veriler anonimdir ve yalnızca teknik ve güvenlik amaçlı kullanılır.' },
        { h: '3.2 Kullanıcılar tarafından yüklenen dosyalar', p: 'Araçlarda işlenen PDF dosyaları aşağıdaki şekilde işlenir:', items: [
          'İstemci tarafı araçları (merge, split, rotate, watermark, page-numbers, crop-pdf, edit-pdf, sign-pdf, redact-pdf, flatten-pdf, delete-pages, extract-pages, reorder-pages, add-page, metadata, pdf-to-svg, pdf-to-epub, pdf-to-txt, fill-form, pdf-to-images, to-pdfa, compare-pdf, unlock-pdf, protect-pdf) — dosya WebAssembly ve JavaScript kullanılarak tarayıcıda tamamen işlenir. Dosya cihazınızdan çıkmaz.',
          'Sunucu tarafı araçları (compress-pdf, ocr-pdf, pdf-to-word, word-to-pdf, jpg-to-pdf, pdf-to-excel, excel-to-pdf, pdf-to-powerpoint, openoffice-to-pdf, pdf-to-openoffice, pdf-to-html, html-to-pdf, url-to-pdf) — dosya geçici olarak sunucuya gönderilir, yalnızca bellekte işlenir ve işlemden hemen sonra silinir. Maksimum saklama süresi: birkaç saniye.',
          'AI araçları (AI Chat, AI Summary, AI Translate) — PDF\'den çıkarılan metin OpenRouter API\'ye gönderilir. Kişisel tanımlayıcı bilgi gönderilmez. İçerik sunucuda saklanmaz.',
        ] },
        { h: '3.3 Kullanıcı tercihleri', p: 'Seçilen tema ve dil ile ilgili bilgiler tarayıcının localStorage\'ında saklanır. Sunucuya gönderilmez ve üçüncü taraflarla paylaşılmaz.' },
      ] },
      { h: '4. İşlemenin yasal dayanağı', items: [
        'GDPR Madde 6(1)(b) — elektronik hizmet sözleşmesinin ifası.',
        'GDPR Madde 6(1)(f) — meşru menfaat (güvenlik, kötüye kullanım önleme, teknik analiz).',
        'GDPR Madde 6(1)(a) — AI araçları için kullanıcı rızası. Rıza herhangi bir zamanda geri çekilebilir.',
      ] },
      { h: '5. Veri alıcıları', p: 'Veriler aşağıdaki alıcı kategorileriyle paylaşılabilir:', items: [
        'Google LLC (Google Analytics) — anonim trafik analizi, rızanıza dayalı.',
        'Bizim adımıza faaliyet gösteren sağlayıcılar (barındırma, OpenRouter.ai) — veri işleme sözleşmeleri kapsamında.',
        'Yasal yetkileri olan otoriteler — yalnızca yasaların gerektirdiği durumlarda.',
      ] },
      { h: '6. AEA dışına veri aktarımı', p: 'AI araçlarını kullanırken metin ABD\'deki OpenRouter sunucularında işlenebilir. OpenRouter Veri Gizliliği Çerçevesine (DPF) katılır ve bu yeterli veri koruması sağlar (AB kararı 2023/1795). Diğer veriler üçüncü ülkelere aktarılmaz.' },
      { h: '7. Veri saklama süresi', p: 'Veriler aşağıdaki süreler boyunca saklanır:', items: [
        'Sunucu olay günlükleri (IP adresi, User-Agent): en fazla 7 gün.',
        'İstemci tarafı araçlarına gönderilen dosyalar: saklanmaz — sayfa yeniden yüklendiğinde silinir.',
        'Sunucu tarafı araçlarına gönderilen dosyalar: işlendikten hemen sonra silinir.',
        'localStorage\'daki veriler: kullanıcı bunları manuel olarak silene kadar.',
      ] },
      { h: '8. Kullanıcı hakları', p: 'Şu haklara sahipsiniz:', items: [
        'Verilerinize erişim (GDPR Madde 15).',
        'Verilerin düzeltilmesi (GDPR Madde 16).',
        'Verilerin silinmesi (GDPR Madde 17) — unutulma hakkı.',
        'İşlemenin kısıtlanması (GDPR Madde 18).',
        'Veri taşınabilirliği (GDPR Madde 20).',
        'İşlemeye itiraz (GDPR Madde 21).',
        'Rızanın herhangi bir zamanda geri çekilmesi (önceki işlemenin yasallığını etkilemez).',
        'Kişisel Verileri Koruma Kurumuna (PUODO) şikayet. Adres: ul. Stawki 2, 00-193 Warszawa, Polonya.',
      ] },
      { h: '9. Veri güvenliği', p: 'Aşağıdaki güvenlik önlemlerini alıyoruz:', items: [
        'TLS/SSL şifreleme — tarayıcı ile sunucu arasındaki tüm iletişim şifrelenir.',
        'Content Security Policy (CSP) — güvensiz betiklerin çalıştırılma olasılığını sınırlar.',
        'Yalnızca bellekte işleme — dosyalar sunucunun diskine yazılmaz.',
        'Otomatik silme — dosyalar işlemden hemen sonra silinir.',
        'Dosya boyutu sınırı — maksimum 100 MB.',
        'Dosya türü doğrulama — işlemden önce sihirli baytları kontrol ederiz.',
        'Kayıt gerekmez — kayıt veya giriş istemeyiz.',
      ] },
      { h: '10. Google Analytics ve analiz rızası', p: 'Bu site, anonim trafik analizi için Google Analytics (Google LLC, ABD) kullanır.', items: [
        'İlk ziyarette bir rıza çubuğu gösterilir — Kabul\'e tıklanana kadar Google Analytics etkinleştirilmez.',
        'Rızanızı localStorage\'daki cookie-consent kaydını silerek herhangi bir zamanda geri çekebilirsiniz.',
        'Google Analytics davranışlı reklamcılık veya profilleme için kullanılmaz.',
        'localStorage\'daki veriler (tema, dil, rıza seçimi) tamamen kullanıcının kontrolündedir ve herhangi bir zamanda silinebilir.',
      ] },
      { h: '11. AI araçları ve OpenRouter', p: 'AI araçlarını (AI Chat, AI Summary, AI Translate) kullanmak için kendi OpenRouter API anahtarınız gereklidir; bu anahtar yalnızca tarayıcının localStorage\'ında saklanır ve site sahibiyle paylaşılmaz.' },
      { h: '12. Son hükümler', p: 'Bu Gizlilik Politikasında değişiklik yapma hakkını saklı tutarız. Değişiklikler bu sayfanın üst kısmındaki tarih güncellenerek bildirilir. Gizlilikle ilgili sorularınız için: kontakt@optimapdf.com.' },
    ]
  },
  zh: {
    title: '隐私政策',
    updated: '最后更新：2026年6月30日',
    sections: [
      { h: '1. 一般条款', p: '本隐私政策描述了OptimaPDF（optimapdf.com）用户个人数据处理和保护的规则。OptimaPDF高度重视隐私和数据安全。所有工具均按照隐私设计原则设计——默认情况下，所有信息仅保存在用户的浏览器中。' },
      { h: '2. 数据控制者', p: '数据控制者为Leszek Hofman，Dąbrówka Nowa，波兰。电子邮件：kontakt@optimapdf.com。未任命数据保护官（DPO）——如有个人数据相关问题，请通过电子邮件kontakt@optimapdf.com联系我们。' },
      { h: '3. 数据收集与目的', sub: [
        { h: '3.1 技术数据', p: '使用网站时，以下技术数据会自动收集：IP地址、浏览器类型和版本、操作系统、屏幕分辨率、大致地理位置（国家）、访问时间以及在各工具上花费的时间。这些数据是匿名的，仅用于技术和安全目的。' },
        { h: '3.2 用户上传的文件', p: '在工具中处理的PDF文件按以下方式处理：', items: [
          '客户端工具（merge、split、rotate、watermark、page-numbers、crop-pdf、edit-pdf、sign-pdf、redact-pdf、flatten-pdf、delete-pages、extract-pages、reorder-pages、add-page、metadata、pdf-to-svg、pdf-to-epub、pdf-to-txt、fill-form、pdf-to-images、to-pdfa、compare-pdf、unlock-pdf、protect-pdf）——文件使用WebAssembly和JavaScript在浏览器中完全处理。文件永远不会离开您的设备。',
          '服务器端工具（compress-pdf、ocr-pdf、pdf-to-word、word-to-pdf、jpg-to-pdf、pdf-to-excel、excel-to-pdf、pdf-to-powerpoint、openoffice-to-pdf、pdf-to-openoffice、pdf-to-html、html-to-pdf、url-to-pdf）——文件临时发送到服务器，仅在内存中处理，操作后立即删除。最长保留时间：几秒钟。',
          'AI工具（AI Chat、AI Summary、AI Translate）——从PDF中提取的文本发送到外部OpenRouter API。不会发送个人可识别信息。内容不会保存在服务器上。',
        ] },
        { h: '3.3 用户偏好', p: '所选主题和语言的信息保存在浏览器的localStorage中。不会发送到服务器，也不会与第三方共享。' },
      ] },
      { h: '4. 处理的法律依据', items: [
        'GDPR第6条第1款第b项——电子服务合同的履行。',
        'GDPR第6条第1款第f项——正当利益（安全、防止滥用、技术分析）。',
        'GDPR第6条第1款第a项——用户对AI工具的同意。同意可随时撤回。',
      ] },
      { h: '5. 数据接收者', p: '数据可能与以下类别的接收者共享：', items: [
        'Google LLC（Google Analytics）——匿名流量分析，基于您的同意。',
        '代表我们运营的供应商（托管、OpenRouter.ai）——基于数据处理合同。',
        '具有法律权力的当局——仅在法律要求的情况下。',
      ] },
      { h: '6. 向欧洲经济区外传输数据', p: '使用AI工具时，文本可能会在美国的OpenRouter服务器上处理。OpenRouter参与数据隐私框架（DPF），该框架保证充分的数据保护（欧盟决定2023/1795）。其他数据不会传输到第三国。' },
      { h: '7. 数据保留期限', p: '数据保留以下时长：', items: [
        '服务器事件日志（IP地址、User-Agent）：最长7天。',
        '发送到客户端工具的文件：不保留——页面重新加载时删除。',
        '发送到服务器端工具的文件：处理后立即删除。',
        'localStorage中的数据：直到用户手动删除。',
      ] },
      { h: '8. 用户权利', p: '您有权：', items: [
        '访问您的数据（GDPR第15条）。',
        '更正数据（GDPR第16条）。',
        '删除数据（GDPR第17条）——被遗忘权。',
        '限制处理（GDPR第18条）。',
        '数据可携性（GDPR第20条）。',
        '反对处理（GDPR第21条）。',
        '随时撤回同意，不影响撤回前处理的合法性。',
        '向个人数据保护局（PUODO）投诉。地址：ul. Stawki 2, 00-193 Warszawa，波兰。',
      ] },
      { h: '9. 数据安全', p: '我们采取以下安全措施：', items: [
        'TLS/SSL加密——浏览器和服务器之间的所有通信均经过加密。',
        'Content Security Policy（CSP）——限制运行不安全脚本的能力。',
        '仅在内存中处理——文件不会写入服务器磁盘。',
        '自动删除——文件在操作后立即删除。',
        '文件大小限制——最大100MB。',
        '文件类型验证——处理前检查magic bytes。',
        '无需注册——不要求注册或登录。',
      ] },
      { h: '10. Google Analytics和分析同意', p: '本页面使用Google Analytics（Google LLC，美国）进行匿名流量分析。', items: [
        '首次访问时显示同意栏——点击接受前不会激活Google Analytics。',
        '您可以通过删除localStorage中的cookie-consent条目随时撤回同意。',
        'Google Analytics不用于行为广告或用户画像。',
        'localStorage中的数据（主题、语言、同意选择）完全由用户控制，可随时删除。',
      ] },
      { h: '11. AI工具和OpenRouter', p: '使用AI工具（AI Chat、AI Summary、AI Translate）需要您自己的OpenRouter API密钥，该密钥仅保存在浏览器的localStorage中，不与网站所有者共享。' },
      { h: '12. 最终条款', p: '我们保留修改本隐私政策的权利。修改将通过更新本页面顶部的日期来通知。如有隐私相关问题，请联系：kontakt@optimapdf.com。' },
    ]
  },
};

export default function PrivacyPage({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const { locale: detectedLocale } = useLocale();
  const locale = forcedLocale || detectedLocale;
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