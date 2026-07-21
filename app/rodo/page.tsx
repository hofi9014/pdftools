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
  ar: {
    title: 'معلومات اللائحة العامة لحماية البيانات',
    updated: 'آخر تحديث: 25 يونيو 2026',
    sections: [
      {
        h: '1. من نحن بوصفنا مُلَيِّن للبيانات',
        p: 'مُلَيِّن بياناتك الشخصية هو Leszek Hofman، Dąbrówka Nowa، بولندا (optimapdf.com). بوصفنا مزودي خدمات رقمية، نقوم بمعالجة البيانات فقط بالقدر اللازم لتوفير أدوات PDF عبر الإنترنت. لجميع Matters المتعلقة بحماية البيانات، يمكنك التواصل معنا عبر البريد الإلكتروني: kontakt@optimapdf.com.',
      },
      {
        h: '2. ما هي البيانات الشخصية التي نقوم بمعالجةها ولأي غرض',
        p: 'تم تصميم OptimaPDF لتقليل جمع البيانات. نقوم بمعالجة:',
        items: [
          'عنوان IP — لضمان الأمان ومنع سوء الاستخدام (المصلحة المشروعة، المادة 6(1)(f) من اللائحة). يتم تخزين عناوين IP في سجلات الخادم لمدة أقصاها 7 أيام.',
          'الملفات التي يرفعها المستخدم — تتم معالجة معظم الأدوات للملفات بالكامل في المتصفح (WebAssembly/JavaScript). لا يتم إرسال هذه الملفات إلى الخادم ولا تغادر جهازك أبداً. الاستثناء هو الأدوات التي تتطلب مكتبات خارجية (الضغط، OCR، تحويلات الصيغ)، حيث يتم معالجة الملف مؤقتاً في ذاكرة RAM الخاصة بالخادم وحذفه فوراً بعد العملية — عادةً في غضون ثوانٍ.',
          'تفضيلات السمة واللغة — يتم تخزينها حصرياً في localStorage الخاص بمتصفحك. لا يتم إرسالها إلى الخادم أو مشاركتها مع أطراف ثالثة.',
        ],
      },
      {
        h: '3. الأساس القانوني للمعالجة',
        p: 'نقوم بمعالجة بياناتك بناءً على:',
        items: [
          'المادة 6(1)(b) من اللائحة (الضرورة لتنفيذ العقد) — توفير أدوات PDF بطلب منك.',
          'المادة 6(1)(f) من اللائحة (المصلحة المشروعة) — ضمان أمان الخدمة، ومنع سوء الاستخدام، والتحليل الفني لoperational الموقع.',
          'المادة 6(1)(a) من اللائحة (الموافقة) — لميزات الذكاء الاصطناعي التي تتطلب إرسال المحتوى إلى API خارجي (OpenRouter). يتطلب استخدام الذكاء الاصطناعي موافقة صريحة من خلال قبول الشروط.',
        ],
      },
      {
        h: '4. مدة الاحتفاظ بالبيانات',
        p: 'نطبق فترات الاحتفاظ التالية:',
        items: [
          'عناوين IP في سجلات الخادم: حتى 7 أيام.',
          'الملفات المُرسَلة إلى الأدوات التي تعمل من جانب العميل: لا يتم تخزينها — تُزاح من الذاكرة عند إغلاق تبويب المتصفح أو تحديث الصفحة.',
          'الملفات المُرسَلة إلى الأدوات التي تعمل من جانب الخادم (الضغط، OCR، التحويلات): تُحذف فوراً بعد المعالجة (عادةً في غضون ثوانٍ).',
          'بيانات localStorage: تُخزَّن حتى يحذفها المستخدم يدوياً أو حتى تتم مسح ذاكرة التخزين المؤقت للمتصفح.',
        ],
      },
      {
        h: '5. مع من نشارك البيانات',
        p: 'لا نبيع أو نؤجر أو نشارك بياناتك الشخصية مع أطراف ثالثة. في حدود محدودة، قد تتم معالجة البيانات من قِبَل:',
        items: [
          'OpenRouter.ai — عند استخدام ميزات الذكاء الاصطناعي (محادثة الذكاء الاصطناعي، ملخص الذكاء الاصطناعي، ترجمة الذكاء الاصطناعي). نرسل فقط النص المستخرج من PDF، دون بيانات تعريف المستخدم. يمتثل OpenRouter للائحة ويملك ضمانات كافية.',
          'مزوّد الاستضافة — موقعنا مُستضاف لدى مزوّد خارجي قد يحتفظ بسجلات خادم مجهولة الهوية (عنوان IP، نوع المتصفح) لمدة أقصاها 7 أيام. يحمل المزوّد شهادة ISO 27001 ويلبي متطلبات اللائحة.',
        ],
      },
      {
        h: '6. حقوقك بموجب اللائحة العامة لحماية البيانات',
        p: 'بموجب المواد 15-22 من اللائحة، لديك:',
        items: [
          'حق الوصول (المادة 15) — يمكنك السؤال عما إذا كنا نقوم بمعالجة بياناتك والحصول على الوصول إليها.',
          'right to rectification (المادة 16) — يمكنك طلب تصحيح بيانات غير دقيقة.',
          'right to erasure (المادة 17) — حق النسيان.',
          'right to restriction of processing (المادة 18).',
          'right to data portability (المادة 20).',
          'right to object (المادة 21).',
          'right to withdraw consent at any time — دون المساس بمشروعية المعالجة قبل سحب الموافقة.',
        ],
      },
      {
        h: '7. كيفية ممارسة حقوقك',
        p: 'لممارسة أي من الحقوق المذكورة أعلاه، أرسل بريداً إلكترونياً إلى: kontakt@optimapdf.com. سنجيب في غضون 30 يوماً. لا نفرض رسوماً لتنفيذ الطلبات ما لم تكن غير مبررة بشكل واضح أو مفرطة (المادة 12(5) من اللائحة).',
      },
      {
        h: '8. الحق في تقديم شكوى',
        p: 'إذا كنت تعتقد أن معالجة بياناتك تنتهك اللائحة العامة لحماية البيانات، فلك الحق في تقديم شكوى لدى رئيس مكتب حماية البيانات الشخصية (PUODO)، ul. Stawki 2، 00-193 وارسو، بولندا.',
      },
      {
        h: '9. نقل البيانات إلى دول ثالثة',
        p: 'عند استخدام ميزات الذكاء الاصطناعي، قد تتم معالجة النص بواسطة خوادم OpenRouter الموجودة في الولايات المتحدة. يشارك OpenRouter في برنامج إطار خصوصية البيانات (DPF)، مما يضمن مستوى كافياً من حماية البيانات وفقاً للقرار 2023/1795 الصادر عن المفوضية الأوروبية.',
      },
      {
        h: '10. ملفات تعريف الارتباط وlocalStorage',
        p: 'لا نستخدم ملفات تعريف الارتباط الإعلانية أو التتبعية أو التحليلية التابعة لجهات خارجية. نستخدم فقط localStorage الخاص بالمتصفح لتذكر تفضيلاتك (السمة، اللغة). يتم تخزين هذه البيانات محلياً على جهازك ويمكن حذفها في أي وقت عن طريق مسح التخزين المحلي لمتصفحك.',
      },
      {
        h: '11. تغييرات على إشعار اللائحة العامة لحماية البيانات هذا',
        p: 'نحتفظ بالحق في إجراء تغييرات على معلومات اللائحة العامة لحماية البيانات هذه. سيتم الإبلاغ عن أي تغييرات عن طريق تحديث التاريخ في أعلى هذه الصفحة. نشجعك على مراجعة هذا المحتوى بشكل دوري.',
      },
    ],
  },
  de: {
    title: 'DSGVO-Informationen',
    updated: 'Letzte Aktualisierung: 25. Juni 2026',
    sections: [
      {
        h: '1. Wer wir als Datenverantwortlicher sind',
        p: 'Der Verantwortliche für Ihre personenbezogenen Daten ist Leszek Hofman, Dąbrówka Nowa, Polen (optimapdf.com). Als digitaler Dienstleister verarbeiten wir Daten nur im zur Bereitstellung von Online-PDF-Werkzeugen erforderlichen Umfang. Bei allen Fragen zum Datenschutz können Sie uns per E-Mail kontaktieren: kontakt@optimapdf.com.',
      },
      {
        h: '2. Welche personenbezogenen Daten wir verarbeiten und zu welchem Zweck',
        p: 'OptimaPDF wurde so konzipiert, dass die Datenerfassung minimiert wird. Wir verarbeiten nur:',
        items: [
          'IP-Adresse — zur Gewährleistung der Sicherheit und zur Missbrauchsverhütung (berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO). IP-Adressen werden in Server-Logs maximal 7 Tage gespeichert.',
          'Vom Benutzer hochgeladene Dateien — die meisten Werkzeuge verarbeiten Dateien vollständig im Browser (WebAssembly/JavaScript). Diese Dateien werden nicht an den Server gesendet und verlassen niemals Ihr Gerät. Ausnahmen sind Werkzeuge, die externe Bibliotheken erfordern (Komprimierung, OCR, Formatkonvertierungen), bei denen die Datei vorübergehend im RAM des Servers verarbeitet und unmittelbar nach dem Vorgang gelöscht wird — in der Regel innerhalb weniger Sekunden.',
          'Design- und Spracheinstellungen — werden ausschließlich im localStorage Ihres Browsers gespeichert. Sie werden nicht an den Server gesendet oder an Dritte weitergegeben.',
        ],
      },
      {
        h: '3. Rechtsgrundlage der Verarbeitung',
        p: 'Wir verarbeiten Ihre Daten auf Grundlage von:',
        items: [
          'Art. 6 Abs. 1 lit. b DSGVO (Erforderlichkeit zur Vertragserfüllung) — Bereitstellung von PDF-Werkzeugen auf Ihren Antrag.',
          'Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse) — Gewährleistung der Dienstsicherheit, Missbrauchsverhütung und technische Analyse des Website-Betriebs.',
          'Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) — für KI-Funktionen, die das Senden von Inhalten an eine externe API erfordern (OpenRouter). Die Nutzung von KI erfordert eine ausdrückliche Einwilligung durch Annahme der Bedingungen.',
        ],
      },
      {
        h: '4. Wie lange wir Daten aufbewahren',
        p: 'Wir wenden folgende Aufbewahrungsfristen an:',
        items: [
          'IP-Adressen in Server-Logs: bis zu 7 Tage.',
          'An clientseitige Werkzeuge gesendete Dateien: werden nicht gespeichert — sie werden aus dem Speicher entfernt, wenn Sie den Browser-Tab schließen oder die Seite aktualisieren.',
          'An serverseitige Werkzeuge gesendete Dateien (Komprimierung, OCR, Konvertierungen): werden unmittelbar nach der Verarbeitung gelöscht (in der Regel innerhalb weniger Sekunden).',
          'localStorage-Daten: werden gespeichert, bis der Benutzer sie manuell löscht oder der Browser-Cache geleert wird.',
        ],
      },
      {
        h: '5. Mit wem wir Daten teilen',
        p: 'Wir verkaufen, vermieten oder geben Ihre personenbezogenen Daten nicht an Dritte weiter. In begrenztem Umfang können Daten verarbeitet werden von:',
        items: [
          'OpenRouter.ai — bei Nutzung von KI-Funktionen (KI-Chat, KI-Zusammenfassung, KI-Übersetzung). Wir senden nur den aus dem PDF extrahierten Text, ohne benutzeridentifizierende Daten. OpenRouter entspricht der DSGVO und verfügt über angemessene Schutzmaßnahmen.',
          'Hosting-Anbieter — unsere Website wird von einem externen Anbieter gehostet, der anonyme Server-Logs (IP-Adresse, Browsertyp) maximal 7 Tage speichern kann. Der Anbieter verfügt über ISO-27001-Zertifizierung und erfüllt die DSGVO-Anforderungen.',
        ],
      },
      {
        h: '6. Ihre Rechte nach der DSGVO',
        p: 'Gemäß den Art. 15–22 DSGVO haben Sie:',
        items: [
          'Auskunftsrecht (Art. 15) — Sie können fragen, ob wir Ihre Daten verarbeiten, und Zugang dazu erhalten.',
          'Recht auf Berichtigung (Art. 16) — Sie können die Korrektur unrichtiger Daten verlangen.',
          'Recht auf Löschung (Art. 17) — Recht auf Vergessenwerden.',
          'Recht auf Einschränkung der Verarbeitung (Art. 18).',
          'Recht auf Datenübertragbarkeit (Art. 20).',
          'Widerspruchsrecht (Art. 21).',
          'Recht auf jederzeitigen Widerruf der Einwilligung — ohne Beeinträchtigung der Rechtmäßigkeit der Verarbeitung bis zum Widerruf.',
        ],
      },
      {
        h: '7. Wie Sie Ihre Rechte ausüben',
        p: 'Um eines der oben genannten Rechte auszuüben, senden Sie eine E-Mail an: kontakt@optimapdf.com. Wir werden innerhalb von 30 Tagen antworten. Wir erheben keine Gebühren für die Erfüllung von Anfragen, es sei denn, sie sind offensichtlich unbegründet oder übermäßig (Art. 12 Abs. 5 DSGVO).',
      },
      {
        h: '8. Recht auf Einreichung einer Beschwerde',
        p: 'Wenn Sie der Meinung sind, dass die Verarbeitung Ihrer Daten gegen die DSGVO verstößt, haben Sie das Recht, bei dem Präsidenten des Büros für den Schutz personenbezogener Daten (PUODO), ul. Stawki 2, 00-193 Warschau, Polen, Beschwerde einzulegen.',
      },
      {
        h: '9. Datenübermittlungen in Drittländer',
        p: 'Bei Nutzung von KI-Funktionen kann der Text von OpenRouter-Servern in den USA verarbeitet werden. OpenRouter nimmt am Data Privacy Framework (DPF) teil, das ein angemessenes Schutzniveau gemäß dem Beschluss 2023/1795 der Europäischen Kommission gewährleistet.',
      },
      {
        h: '10. Cookies und localStorage',
        p: 'Wir verwenden keine Werbe-, Tracking- oder Third-Party-Analyse-Cookies. Wir verwenden ausschließlich localStorage Ihres Browsers, um Ihre Einstellungen (Design, Sprache) zu speichern. Diese Daten werden lokal auf Ihrem Gerät gespeichert und können jederzeit durch Löschen des lokalen Speichers Ihres Browsers gelöscht werden.',
      },
      {
        h: '11. Änderungen an diesem DSGVO-Hinweis',
        p: 'Wir behalten uns das Recht vor, Änderungen an diesen DSGVO-Informationen vorzunehmen. Änderungen werden durch Aktualisierung des Datums oben auf dieser Seite mitgeteilt. Wir empfehlen Ihnen, diesen Inhalt regelmäßig zu überprüfen.',
      },
    ],
  },
  es: {
    title: 'Información sobre el RGPD',
    updated: 'Última actualización: 25 de junio de 2026',
    sections: [
      {
        h: '1. Quiénes somos como responsable del tratamiento',
        p: 'El responsable de sus datos personales es Leszek Hofman, Dąbrówka Nowa, Polonia (optimapdf.com). Como proveedor de servicios digitales, procesamos datos solo en la medida necesaria para proporcionar herramientas PDF en línea. Para todos los asuntos de protección de datos, puede contactarnos en: kontakt@optimapdf.com.',
      },
      {
        h: '2. Qué datos personales procesamos y con qué finalidad',
        p: 'OptimaPDF está diseñado para minimizar la recopilación de datos. Solo procesamos:',
        items: [
          'Dirección IP — para garantizar la seguridad y prevenir abusos (interés legítimo, Art. 6(1)(f) RGPD). Las direcciones IP se almacenan en registros del servidor por un máximo de 7 días.',
          'Archivos subidos por el usuario — la mayoría de las herramientas procesan archivos completamente en el navegador (WebAssembly/JavaScript). Estos archivos no se envían al servidor y nunca salen de su dispositivo. Las excepciones son herramientas que requieren bibliotecas externas (compresión, OCR, conversiones de formato), donde el archivo se procesa temporalmente en la RAM del servidor y se elimina inmediatamente después de la operación — normalmente en cuestión de segundos.',
          'Preferencias de tema y idioma — almacenadas exclusivamente en el localStorage de su navegador. No se envían al servidor ni se comparten con terceros.',
        ],
      },
      {
        h: '3. Base legal para el tratamiento',
        p: 'Procesamos sus datos basándonos en:',
        items: [
          'Art. 6(1)(b) RGPD (necesidad para el cumplimiento del contrato) — proporcionar herramientas PDF a su solicitud.',
          'Art. 6(1)(f) RGPD (interés legítimo) — garantizar la seguridad del servicio, prevenir abusos y análisis técnico del funcionamiento del sitio web.',
          'Art. 6(1)(a) RGPD (consentimiento) — para funciones de IA que requieren enviar contenido a una API externa (OpenRouter). El uso de IA requiere consentimiento explícito al aceptar los términos.',
        ],
      },
      {
        h: '4. Cuánto tiempo conservamos los datos',
        p: 'Aplicamos los siguientes períodos de retención:',
        items: [
          'Direcciones IP en registros del servidor: hasta 7 días.',
          'Archivos enviados a herramientas del lado del cliente: no se almacenan — se eliminan de la memoria cuando cierra la pestaña del navegador o actualiza la página.',
          'Archivos enviados a herramientas del lado del servidor (compresión, OCR, conversiones): se eliminan inmediatamente después del procesamiento (normalmente en cuestión de segundos).',
          'Datos en localStorage: se almacenan hasta que el usuario los elimine manualmente o hasta que se borre la caché del navegador.',
        ],
      },
      {
        h: '5. Con quién compartimos los datos',
        p: 'No vendemos, alquilamos ni compartimos sus datos personales con terceros. En una medida limitada, los datos pueden ser procesados por:',
        items: [
          'OpenRouter.ai — al utilizar funciones de IA (Chat IA, Resumen IA, Traducción IA). Solo enviamos texto extraído del PDF, sin datos de identificación del usuario. OpenRouter cumple con el RGPD y tiene las garantías adecuadas.',
          'Proveedor de hosting — nuestro sitio web está alojado por un proveedor externo que puede almacenar registros anónimos del servidor (dirección IP, tipo de navegador) por un máximo de 7 días. El proveedor posee certificación ISO 27001 y cumple con los requisitos del RGPD.',
        ],
      },
      {
        h: '6. Sus derechos bajo el RGPD',
        p: 'De conformidad con los artículos 15–22 del RGPD, usted tiene:',
        items: [
          'Derecho de acceso (Art. 15) — puede preguntar si procesamos sus datos y obtener acceso a los mismos.',
          'Derecho de rectificación (Art. 16) — puede solicitar la corrección de datos inexactos.',
          'Derecho de supresión (Art. 17) — derecho al olvido.',
          'Derecho a la limitación del tratamiento (Art. 18).',
          'Derecho a la portabilidad de datos (Art. 20).',
          'Derecho de oposición (Art. 21).',
          'Derecho a retirar el consentimiento en cualquier momento — sin afectar la licitud del tratamiento realizado antes de su retirada.',
        ],
      },
      {
        h: '7. Cómo ejercer sus derechos',
        p: 'Para ejercer cualquiera de los derechos anteriores, envíe un correo electrónico a: kontakt@optimapdf.com. Responderemos en un plazo de 30 días. No cobramos tarjetas por atender solicitudes a menos que sean manifiestamente infundadas o excesivas (Art. 12(5) RGPD).',
      },
      {
        h: '8. Derecho a presentar una reclamación',
        p: 'Si considera que nuestro tratamiento de sus datos viola el RGPD, tiene derecho a presentar una reclamación ante el Presidente de la Oficina de Protección de Datos Personales (PUODO), ul. Stawki 2, 00-193 Varsovia, Polonia.',
      },
      {
        h: '9. Transferencias de datos a terceros países',
        p: 'Al utilizar funciones de IA, el texto puede ser procesado por servidores de OpenRouter ubicados en los EE. UU. OpenRouter participa en el programa Marco de Privacidad de Datos (DPF), que garantiza un nivel adecuado de protección de datos de conformidad con la Decisión 2023/1795 de la Comisión Europea.',
      },
      {
        h: '10. Cookies y localStorage',
        p: 'No utilizamos cookies de publicación, rastreo o análisis de terceros. Solo utilizamos el localStorage del navegador para recordar sus preferencias (tema, idioma). Estos datos se almacenan localmente en su dispositivo y pueden eliminarse en cualquier momento borrando el almacenamiento local de su navegador.',
      },
      {
        h: '11. Cambios en este aviso del RGPD',
        p: 'Nos reservamos el derecho de realizar cambios en esta información del RGPD. Cualquier cambio se comunicará actualizando la fecha en la parte superior de esta página. Le recomendamos revisar periódicamente este contenido.',
      },
    ],
  },
  fa: {
    title: 'اطلاعات مقررات حفاظت از داده‌های عمومی (GDPR)',
    updated: 'آخرین به‌روزرسانی: 25 ژوئن 2026',
    sections: [
      {
        h: '1. ما به عنوان کنترل‌کننده داده کیستیم',
        p: 'کنترل‌کننده داده‌های شخصی شما Leszek Hofman، Dąbrówka Nowa، لهستان (optimapdf.com) است. به عنوان ارائه‌دهنده خدمات دیجیتال، ما فقط در حد ضرورت برای ارائه ابزارهای PDF آنلاین، داده‌ها را پردازش می‌کنیم. برای تمامی مسائل مربوط به حفاظت از داده‌ها، می‌توانید از طریق ایمیل با ما تماس بگیرید: kontakt@optimapdf.com.',
      },
      {
        h: '2. چه داده‌های شخصی را پردازش می‌کنیم و با چه هدفی',
        p: 'OptimaPDF برای به حداقل رساندن جمع‌آوری داده‌ها طراحی شده است. ما فقط موارد زیر را پردازش می‌کنیم:',
        items: [
          'آدرس IP — برای تضمین امنیت و جلوگیری از سوءاستفاده (منافع مشروع، ماده 6(1)(f) GDPR). آدرس‌های IP در لاگ‌های سرور حداکثر 7 روز ذخیره می‌شوند.',
          'فایل‌های بارگذاری شده توسط کاربر — اکثر ابزارها فایل‌ها را به طور کامل در مرورگر پردازش می‌کنند (WebAssembly/JavaScript). این فایل‌ها به سرور ارسال نمی‌شوند و هرگز دستگاه شما را ترک نمی‌کنند. استثنا ابزارهایی هستند که به کتابخانه‌های خارجی نیاز دارند (فشرده‌سازی، OCR، تبدیل فرمت‌ها)، که در آنها فایل به طور موقت در RAM سرور پردازش شده و بلافاصله پس از عملیات حذف می‌شود — معمولاً ظرف چند ثانیه.',
          'ترجیحات پوسته و زبان — به طور انحصاری در localStorage مرورگر شما ذخیره می‌شوند. به سرور ارسال نمی‌شوند یا با طرف‌های ثالث به اشتراک گذاشته نمی‌شوند.',
        ],
      },
      {
        h: '3. مبنای قانونی پردازش',
        p: 'ما داده‌های شما را بر اساس موارد زیر پردازش می‌کنیم:',
        items: [
          'ماده 6(1)(b) GDPR (ضرورت برای اجرای قرارداد) — ارائه ابزارهای PDF به درخواست شما.',
          'ماده 6(1)(f) GDPR (منافع مشروع) — تضمین امنیت سرویس، جلوگیری از سوءاستفاده و تحلیل فنی عملکرد وب‌سایت.',
          'ماده 6(1)(a) GDPR (رضایت) — برای ویژگی‌های هوش مصنوعی که نیاز به ارسال محتوا به یک API خارجی (OpenRouter) دارند. استفاده از هوش مصنوعی نیاز به رضایت صریح از طریق پذیرش شرایط دارد.',
        ],
      },
      {
        h: '4. چه مدت داده‌ها را نگهداری می‌کنیم',
        p: 'ما دوره‌های نگهداری زیر را اعمال می‌کنیم:',
        items: [
          'آدرس‌های IP در لاگ‌های سرور: حداکثر 7 روز.',
          'فایل‌های ارسال شده به ابزارهای سمت کلاینت: ذخیره نمی‌شوند — هنگام بستن تب مرورگر یا تازه‌سازی صفحه از حافظه حذف می‌شوند.',
          'فایل‌های ارسال شده به ابزارهای سمت سرور (فشرده‌سازی، OCR، تبدیل‌ها): بلافاصله پس از پردازش حذف می‌شوند (معمولاً ظرف چند ثانیه).',
          'داده‌های localStorage: تا زمان حذف دستی توسط کاربر یا تا پاک شدن حافظه پنهان مرورگر نگهداری می‌شوند.',
        ],
      },
      {
        h: '5. با چه کسی داده‌ها را به اشتراک می‌گذاریم',
        p: 'ما داده‌های شخصی شما را نمی‌فروشیم، اجاره نمی‌دهیم یا با طرف‌های ثالث به اشتراک نمی‌گذاریم. در محدوده محدودی، داده‌ها ممکن است توسط موارد زیر پردازش شوند:',
        items: [
          'OpenRouter.ai — هنگام استفاده از ویژگی‌های هوش مصنوعی (چت هوش مصنوعی، خلاصه هوش مصنوعی، ترجمه هوش مصنوعی). ما فقط متن استخراج شده از PDF را ارسال می‌کنیم، بدون داده‌های شناسایی کاربر. OpenRouter با GDPR مطابقت دارد و ضمانت‌های مناسبی دارد.',
          'ارائه‌دهنده هاستینگ — وب‌سایت ما توسط یک ارائه‌دهنده خارجی میزبانی می‌شود که ممکن است لاگ‌های ناشناس سرور (آدرس IP، نوع مرورگر) را حداکثر 7 روز نگهداری کند. ارائه‌دهنده گواهینامه ISO 27001 دارد و الزامات GDPR را برآورده می‌کند.',
        ],
      },
      {
        h: '6. حقوق شما تحت GDPR',
        p: 'مطابق با مواد 15 تا 22 GDPR، شما دارای موارد زیر هستید:',
        items: [
          'حق دسترسی (ماده 15) — می‌توانید بپرسید که آیا ما داده‌های شما را پردازش می‌کنیم و به آنها دسترسی پیدا کنید.',
          'حق اصلاح (ماده 16) — می‌توانید اصلاح داده‌های نادرست را درخواست کنید.',
          'حق حذف (ماده 17) — حق فراموش شدن.',
          'حق محدود کردن پردازش (ماده 18).',
          'حق انتقال داده‌ها (ماده 20).',
          'حق اعتراض (ماده 21).',
          'حق لغو رضایت در هر زمان — بدون تأثیر بر قانونی بودن پردازش قبل از لغو آن.',
        ],
      },
      {
        h: '7. چگونه حقوق خود را اعمال کنیم',
        p: 'برای اعمال هر یک از حقوق فوق، یک ایمیل به آدرس زیر ارسال کنید: kontakt@optimapdf.com. ما ظرف 30 روز پاسخ خواهیم داد. ما هیچ هزینه‌ای برای انجام درخواست‌ها دریافت نمی‌کنیم مگر اینکه آشکارا بی‌اساس یا بیش از حد باشند (ماده 12(5) GDPR).',
      },
      {
        h: '8. حق شکایت',
        p: 'اگر معتقدید که پردازش داده‌های شما توسط ما ناقض GDPR است، حق شکایت نزد رئیس اداره حفاظت از داده‌های شخصی (PUODO)، ul. Stawki 2، 00-193 ورشو، لهستان را دارید.',
      },
      {
        h: '9. انتقال داده‌ها به کشورهای ثالث',
        p: 'هنگام استفاده از ویژگی‌های هوش مصنوعی، متن ممکن است توسط سرورهای OpenRouter واقع در ایالات متحده پردازش شود. OpenRouter در برنامه چارچوب حریم خصوصی داده‌ها (DPF) شرکت می‌کند که سطح کافی حفاظت از داده‌ها را مطابق با تصمیم کمیسیون اروپا 2023/1795 تضمین می‌کند.',
      },
      {
        h: '10. کوکی‌ها و localStorage',
        p: 'ما از کوکی‌های تبلیغاتی، ردیابی یا تحلیلی طرف ثالث استفاده نمی‌کنیم. ما فقط از localStorage مرورگر برای به خاطر سپردن ترجیحات شما (پوسته، زبان) استفاده می‌کنیم. این داده‌ها به صورت محلی در دستگاه شما ذخیره می‌شوند و در هر زمان با پاک کردن ذخیره محلی مرورگر خود قابل حذف هستند.',
      },
      {
        h: '11. تغییرات در این اطلاعیه GDPR',
        p: 'ما حق ایجاد تغییرات در این اطلاعات GDPR را برای خود محفوظ می‌داریم. هرگونه تغییر با به‌روزرسانی تاریخ در بالای این صفحه اطلاع‌رسانی خواهد شد. ما شما را تشویق می‌کنیم که به طور دوره‌ای این محتوا را بررسی کنید.',
      },
    ],
  },
  fr: {
    title: 'Informations RGPD',
    updated: 'Dernière mise à jour : 25 juin 2026',
    sections: [
      {
        h: '1. Qui nous sommes en tant que responsable du traitement',
        p: 'Le responsable de vos données personnelles est Leszek Hofman, Dąbrówka Nowa, Pologne (optimapdf.com). En tant que prestataire de services numériques, nous ne traitons les données que dans la mesure nécessaire à la fourniture d\'outils PDF en ligne. Pour toute question relative à la protection des données, vous pouvez nous contacter à l\'adresse : kontakt@optimapdf.com.',
      },
      {
        h: '2. Quelles données personnelles nous traitons et à quelle fin',
        p: 'OptimaPDF est conçu pour minimiser la collecte de données. Nous ne traitons que :',
        items: [
          'Adresse IP — pour assurer la sécurité et prévenir les abus (intérêt légitime, art. 6(1)(f) RGPD). Les adresses IP sont conservées dans les journaux du serveur pour une durée maximale de 7 jours.',
          'Fichiers téléchargés par l\'utilisateur — la plupart des outils traitent les fichiers entièrement dans le navigateur (WebAssembly/JavaScript). Ces fichiers ne sont pas envoyés au serveur et ne quittent jamais votre appareil. Les exceptions sont les outils nécessitant des bibliothèques externes (compression, OCR, conversions de format), où le fichier est temporairement traité en RAM du serveur et immédiatement supprimé après l\'opération — généralement en quelques secondes.',
          'Préférences de thème et de langue — stockées exclusivement dans le localStorage de votre navigateur. Elles ne sont pas envoyées au serveur ni partagées avec des tiers.',
        ],
      },
      {
        h: '3. Base légale du traitement',
        p: 'Nous traitons vos données sur la base de :',
        items: [
          'Art. 6(1)(b) RGPD (nécessité pour l\'exécution du contrat) — fourniture d\'outils PDF à votre demande.',
          'Art. 6(1)(f) RGPD (intérêt légitime) — garantie de la sécurité du service, prévention des abus et analyse technique du fonctionnement du site web.',
          'Art. 6(1)(a) RGPD (consentement) — pour les fonctionnalités d\'IA nécessitant l\'envoi de contenu à une API externe (OpenRouter). L\'utilisation de l\'IA nécessite un consentement explicite par l\'acceptation des conditions.',
        ],
      },
      {
        h: '4. Durée de conservation des données',
        p: 'Nous appliquons les périodes de conservation suivantes :',
        items: [
          'Adresses IP dans les journaux du serveur : jusqu\'à 7 jours.',
          'Fichiers envoyés aux outils côté client : non stockés — ils sont supprimés de la mémoire lorsque vous fermez l\'onglet du navigateur ou actualisez la page.',
          'Fichiers envoyés aux outils côté serveur (compression, OCR, conversions) : supprimés immédiatement après le traitement (généralement en quelques secondes).',
          'Données localStorage : stockées jusqu\'à ce qu\'elles soient manuellement supprimées par l\'utilisateur ou que le cache du navigateur soit effacé.',
        ],
      },
      {
        h: '5. Avec qui nous partageons les données',
        p: 'Nous ne vendons, louons ou partageons pas vos données personnelles avec des tiers. Dans une mesure limitée, les données peuvent être traitées par :',
        items: [
          'OpenRouter.ai — lors de l\'utilisation de fonctionnalités d\'IA (Chat IA, Résumé IA, Traduction IA). Nous n\'envoyons que le texte extrait du PDF, sans données d\'identification de l\'utilisateur. OpenRouter est conforme au RGPD et dispose de garanties appropriées.',
          'Fournisseur d\'hébergement — notre site web est hébergé par un fournisseur externe qui peut stocker des journaux anonymes du serveur (adresse IP, type de navigateur) pour une durée maximale de 7 jours. Le fournisseur détient la certification ISO 27001 et répond aux exigences du RGPD.',
        ],
      },
      {
        h: '6. Vos droits selon le RGPD',
        p: 'Conformément aux articles 15 à 22 du RGPD, vous disposez de :',
        items: [
          'Droit d\'accès (art. 15) — vous pouvez demander si nous traitons vos données et y obtenir l\'accès.',
          'Droit de rectification (art. 16) — vous pouvez demander la correction de données inexactes.',
          'Droit à l\'effacement (art. 17) — droit à l\'oubli.',
          'Droit à la limitation du traitement (art. 18).',
          'Droit à la portabilité des données (art. 20).',
          'Droit d\'opposition (art. 21).',
          'Droit de retirer son consentement à tout moment — sans affecter la licéité du traitement avant son retrait.',
        ],
      },
      {
        h: '7. Comment exercer vos droits',
        p: 'Pour exercer l\'un des droits ci-dessus, envoyez un e-mail à : kontakt@optimapdf.com. Nous répondrons dans un délai de 30 jours. Nous ne facturons pas de frais pour le traitement des demandes, à moins qu\'elles ne soient manifestement infondées ou excessives (art. 12(5) RGPD).',
      },
      {
        h: '8. Droit de déposer une plainte',
        p: 'Si vous estimez que le traitement de vos données viole le RGPD, vous avez le droit de déposer une plainte auprès du Président de l\'Office de protection des données personnelles (PUODO), ul. Stawki 2, 00-193 Varsovie, Pologne.',
      },
      {
        h: '9. Transferts de données vers des pays tiers',
        p: 'Lors de l\'utilisation de fonctionnalités d\'IA, le texte peut être traité par les serveurs d\'OpenRouter situés aux États-Unis. OpenRouter participe au programme Data Privacy Framework (DPF), garantissant un niveau adéquat de protection des données conformément à la Décision 2023/1795 de la Commission européenne.',
      },
      {
        h: '10. Cookies et localStorage',
        p: 'Nous n\'utilisons pas de cookies publicitaires, de suivi ou analytiques de tiers. Nous utilisons uniquement le localStorage du navigateur pour mémoriser vos préférences (thème, langue). Ces données sont stockées localement sur votre appareil et peuvent être supprimées à tout moment en effaçant le stockage local de votre navigateur.',
      },
      {
        h: '11. Modifications de cet avis RGPD',
        p: 'Nous nous réservons le droit d\'apporter des modifications à ces informations RGPD. Toute modification sera communiquée en mettant à jour la date en haut de cette page. Nous vous encourageons à consulter périodiquement ce contenu.',
      },
    ],
  },
  hi: {
    title: 'GDPR जानकारी',
    updated: 'अंतिम अद्यतन: 25 जून 2026',
    sections: [
      {
        h: '1. हम डेटा नियंत्रक के रूप में कौन हैं',
        p: 'आपके व्यक्तिगत डेटा का नियंत्रक Leszek Hofman है, Dąbrówka Nowa, पोलैंड (optimapdf.com)। एक डिजिटल सेवा प्रदाता के रूप में, हम केवल ऑनलाइन PDF टूल प्रदान करने के लिए आवश्यक सीमा तक डेटा संसाधित करते हैं। सभी डेटा सुरक्षा मामलों के लिए, आप हमसे संपर्क कर सकते हैं: kontakt@optimapdf.com.',
      },
      {
        h: '2. हम कौन सा व्यक्तिगत डेटा संसाधित करते हैं और किस उद्देश्य के लिए',
        p: 'OptimaPDF को डेटा संग्रह को न्यूनतम करने के लिए डिज़ाइन किया गया है। हम केवल इनको संसाधित करते हैं:',
        items: [
          'IP पता — सुरक्षा सुनिश्चित करने और दुर्व्यवहार को रोकने के लिए (वैध हित, अनुच्छेद 6(1)(f) GDPR)। IP पते सर्वर लॉग में अधिकतम 7 दिनों तक संग्रहीत किए जाते हैं।',
          'उपयोगकर्ता द्वारा अपलोड की गई फ़ाइलें — अधिकांश टूल फ़ाइलों को पूरी तरह से ब्राउज़र में संसाधित करते हैं (WebAssembly/JavaScript)। ये फ़ाइलें सर्वर को नहीं भेजी जातीं और आपका डिवाइस कभी नहीं छोड़तीं। अपवाद बाहरी लाइब्रेरी की आवश्यकता वाले टूल हैं (संपीड़न, OCR, प्रारूप रूपांतरण), जहाँ फ़ाइल अस्थाय� रूप से सर्वर की RAM में संसाधित होती है और ऑपरेशन के तुरंत बाद हटा दी जाती है — आमतौर पर कुछ सेकंड में।',
          'थीम और भाषा प्राथमिकताएँ — विशेष रूप से आपके ब्राउज़र के localStorage में संग्रहीत। वे सर्वर को नहीं भेजी जातीं या तीसरे पक्ष के साथ साझा नहीं की जातीं।',
        ],
      },
      {
        h: '3. संसाधन का कानूनी आधार',
        p: 'हम आपके डेटा को इन आधारों पर संसाधित करते हैं:',
        items: [
          'अनुच्छेद 6(1)(b) GDPR (अनुबंध के प्रदर्शन के लिए आवश्यकता) — आपके अनुरोध पर PDF टूल प्रदान करना।',
          'अनुच्छेद 6(1)(f) GDPR (वैध हित) — सेवा सुरक्षा सुनिश्चित करना, दुर्व्यवहार को रोकना, और वेबसाइट संचालन का तकनीकी विश्लेषण।',
          'अनुच्छेद 6(1)(a) GDPR (सहमति) — उन AI सुविधाओं के लिए जिन्हें बाहरी API (OpenRouter) को सामग्री भेजने की आवश्यकता होती है। AI का उपयोग करने के लिए शर्तों को स्वीकार करके स्पष्ट सहमति आवश्यक है।',
        ],
      },
      {
        h: '4. हम डेटा कितने समय तक रखते हैं',
        p: 'हम निम्नलिखित अवधि अवधि लागू करते हैं:',
        items: [
          'सर्वर लॉग में IP पते: अधिकतम 7 दिन।',
          'क्लाइंट-साइड टूल को भेजी गई फ़ाइलें: संग्रहीत नहीं — जब आप ब्राउज़र टैब बंद करते हैं या पेज रीफ्रेश करते हैं तो मेमोरी से हटा दी जाती हैं।',
          'सर्वर-साइड टूल को भेजी गई फ़ाइलें (संपीड़न, OCR, रूपांतरण): संसाधन के तुरंत बाद हटा दी जाती हैं (आमतौर पर कुछ सेकंड में)।',
          'localStorage डेटा: जब तक उपयोगकर्ता द्वारा मैन्युअल रूप से न हटाया जाए या ब्राउज़र कैश साफ न हो जाए, तब तक संग्रहीत।',
        ],
      },
      {
        h: '5. हम डेटा किसके साथ साझा करते हैं',
        p: 'हम आपका व्यक्तिगत डेटा तीसरे पक्ष को नहीं बेचते, किराए पर नहीं देते या साझा नहीं करते। सीमित सीमा में, डेटा इनके द्वारा संसाधित किया जा सकता है:',
        items: [
          'OpenRouter.ai — AI सुविधाओं का उपयोग करते समय (AI चैट, AI सारांश, AI अनुवाद)। हम केवल PDF से निकाला गया पाठ भेजते हैं, बिना उपयोगकर्ता-पहचान डेटा के। OpenRouter GDPR का अनुपालन करता है और उचित सुरक्षा रखता है।',
          'होस्टिंग प्रदाता — हमारी वेबसाइट एक बाहरी प्रदाता द्वारा होस्ट की जाती है जो अनाम सर्वर लॉग (IP पता, ब्राउज़र प्रकार) अधिकतम 7 दिनों तक संग्रहीत कर सकता है। प्रदाता के पास ISO 27001 प्रमाणन है और GDPR आवश्यकताओं को पूरा करता है।',
        ],
      },
      {
        h: '6. GDPR के तहत आपके अधिकार',
        p: 'GDPR के अनुच्छेद 15-22 के तहत आपके पास है:',
        items: [
          'पहुँच का अधिकार (अनुच्छेद 15) — आप पूछ सकते हैं कि क्या हम आपका डेटा संसाधित करते हैं और इसे प्राप्त कर सकते हैं।',
          'सुधार का अधिकार (अनुच्छेद 16) — आप अशुद्ध डेटा के सुधार का अनुरोध कर सकते हैं।',
          'मिटाने का अधिकार (अनुच्छेद 17) — भूलने का अधिकार।',
          'संसाधन को प्रतिबंधित करने का अधिकार (अनुच्छेद 18)।',
          'डेटा पोर्टेबिलिटी का अधिकार (अनुच्छेद 20)।',
          'आपत्ति का अधिकार (अनुच्छेद 21)।',
          'किसी भी समय सहमति वापस लेने का अधिकार — इसकी वापसी से पहले संसाधन की वैधता को प्रभावित किए बिना।',
        ],
      },
      {
        h: '7. अपने अधिकारों का प्रयोग कैसे करें',
        p: 'ऊपर उल्लिखित किसी भी अधिकार का प्रयोग करने के लिए, ईमेल भेजें: kontakt@optimapdf.com। हम 30 दिनों के भीतर जवाब देंगे। हम अनुरोधों को पूरा करने के लिए शुल्क नहीं लेते जब तक कि वे स्पष्ट रूप से निराधार या अत्यधिक न हों (अनुच्छेद 12(5) GDPR)।',
      },
      {
        h: '8. शिकायत दर्ज करने का अधिकार',
        p: 'यदि आपको लगता है कि आपके डेटा का हमारा संसाधन GDPR का उल्लंघन करता है, तो आपको व्यक्तिगत डेटा सुरक्षा कार्यालय (PUODO) के अध्यक्ष के पास शिकायत दर्ज करने का अधिकार है, ul. Stawki 2, 00-193 वारसा, पोलैंड।',
      },
      {
        h: '9. तीसरे देशों को डेटा हस्तांतरण',
        p: 'AI सुविधाओं का उपयोग करते समय, पाठ को US में स्थित OpenRouter सर्वर द्वारा संसाधित किया जा सकता है। OpenRouter Data Privacy Framework (DPF) कार्यक्रम में भाग लेता है, जो यूरोपीय आयोग के निर्णय 2023/1795 के अनुसार पर्याप्त डेटा सुरक्षा स्तर सुनिश्चित करता है।',
      },
      {
        h: '10. कुकीज़ और localStorage',
        p: 'हम विज्ञापन, ट्रैकिंग या तीसरे पक्ष के विश्लेषणात्मक कुकीज़ का उपयोग नहीं करते। हम केवल आपकी प्राथमिकताओं (थीम, भाषा) को याद रखने के लिए ब्राउज़र का localStorage उपयोग करते हैं। यह डेटा आपके डिवाइस पर स्थानीय रूप से संग्रहीत है और इसे कभी भी अपने ब्राउज़र का स्थानीय संग्रहण साफ करके हटाया जा सकता है।',
      },
      {
        h: '11. इस GDPR सूचना में परिवर्तन',
        p: 'हम इस GDPR जानकारी में परिवर्तन करने का अधिकार सुरक्षित रखते हैं। कोई भी परिवर्तन इस पृष्ठ के शीर्ष पर तिथि अद्यतन करके सूचित किया जाएगा। हम आपको समय-समय पर इस सामग्री की समीक्षा करने के लिए प्रोत्साहित करते हैं।',
      },
    ],
  },
  is: {
    title: 'Upplýsingar samkvæmt GDPR',
    updated: 'Síðast uppfært: 25. júní 2026',
    sections: [
      {
        h: '1. Hver við erum sem persónuverndaraðili',
        p: 'Aðili sem ábyrgð er á persónuupplýsingum þínum er Leszek Hofman, Dąbrówka Nowa, Pólland (optimapdf.com). Sem veitandi stafrænna þjónustu vinnum við aðeins úr göngum í þeim mæli sem nauðsynlegt er til að veita PDF-tæki á netinu. Fyrir öll mál er lúta að persónuvernd getur þú haft samband við okkur í: kontakt@optimapdf.com.',
      },
      {
        h: '2. Hvaða persónuupplýsingar við vinnum úr og í hvaða tilgangi',
        p: 'OptimaPDF er hannað til að lágmarka söfnun gagna. Við vinnum aðeins úr:',
        items: [
          'IP-tala — til að tryggja öryggi og koma í veg fyrir misnotkun (lögmætt áhugamál, grein 6(1)(f) GDPR). IP-tölur eru geymdar í netþjónaskrám í allt að 7 daga.',
          'Skrár sem notandi hlaðir upp — flest tæki vinna úr skrám að fullu í vafra (WebAssembly/JavaScript). Þessar skrár eru ekki sendar á netþjón og yfirgefa aldrei tækið þitt. Undantekningin eru tæki sem þurfa ytri bókasöfn (þjöppun, OCR, sniðbreytingar) þar sem skráin er tímabundið unnin í vinnsluminni netþjónsins og eytt strax eftir aðgerðina — yfirleitt innan nokkurra sekúndna.',
          'Þemu og tungumálakostningar — geymdar eingöngu í localStorage vafrans þíns. Þær eru ekki sendar á netþjón eða deilt með þriðja aðila.',
        ],
      },
      {
        h: '3. Lagalegur grundvöllur vinnslunnar',
        p: 'Við vinnum úr gögnum þínum á grundvelli:',
        items: [
          'Grein 6(1)(b) GDPR (nauðsynleg til að efna samning) — veiting PDF-tækja að beiðni þinni.',
          'Grein 6(1)(f) GDPR (lögmætt áhugamál) — tryggja þjónustuöryggi, koma í veg fyrir misnotkun og tæknilega greiningu á rekstri vefsíðu.',
          'Grein 6(1)(a) GDPR (samþykki) — fyrir AI aðgerðir sem krefjast þess að efni sé sent til ytri API (OpenRouter). Notkun AI krefst skýrs samþykki með því að samþykkja skilmálana.',
        ],
      },
      {
        h: '4. Hve lengi við geymum gögn',
        p: 'Við beitum eftirfarandi geymslutímum:',
        items: [
          'IP-tölur í netþjónaskrám: allt að 7 daga.',
          'Skrár sendar til viðskiptavinasíðutækja: ekki geymdar — þeim er eytt úr minni þegar þú lokar vafraglugganum eða endurnýjar síðuna.',
          'Skrár sendar til netþjónatækja (þjöppun, OCR, sniðbreytingar): eytt strax eftir vinnslu (yfirleitt innan nokkurra sekúndna).',
          'localStorage gögn: geymd þar til notandi eytir þeim handvirkt eða þar til vafragrunnur er hreinsaður.',
        ],
      },
      {
        h: '5. Með hverjum við deilum gögnum',
        p: 'Við seljum, leigjum eða deilum ekki persónuupplýsingum þínum með þriðja aðila. Takmarkaðri geta gögn verið unnin af:',
        items: [
          'OpenRouter.ai — við notkun AI aðgerða (AI spjall, AI samantekt, AI þýðing). Við sendum aðeins texta sem er sóttur úr PDF, án gagna sem auðkenna notandann. OpenRouter fer eftir GDPR og hefur viðeigandi öryggisráðstafanir.',
          'Hýsingaraðili — vefsíðan okkar er hýst af ytri aðila sem getur geymt nafnlausar netþjónaskrár (IP-tala, vafragerð) í allt að 7 daga. Aðilinn er með ISO 27001 vottun og uppfyllir GDPR kröfur.',
        ],
      },
      {
        h: '6. Réttindi þín samkvæmt GDPR',
        p: 'Samkvæmt greinum 15–22 GDPR hefur þú:',
        items: [
          'Réttur á aðgengi (grein 15) — þú getur spurt hvort við vinnum úr gögnum þínum og fengið aðgang að þeim.',
          'Réttur til leiðréttingar (grein 16) — þú getur óskað eftir leiðréttingu ónákvæmra gagna.',
          'Réttur til eyðingar (grein 17) — réttur til að gleyma.',
          'Réttur til takmarkningar á vinnslu (grein 18).',
          'Réttur til gagnafærni (grein 20).',
          'Réttur til andmæla (grein 21).',
          'Réttur til að draga samþykki til baka hvenær sem er — án þess að hafa áhrif á lögmæti vinnslu fyrir aftöku þess.',
        ],
      },
      {
        h: '7. Hvernig á að nýta réttindi þín',
        p: 'Til að nýta réttindi ofangreind skaltu senda tölvupóst á: kontakt@optimapdf.com. Við munum svara innan 30 daga. Við ekki innheimtum gjöld fyrir að fullnægja beiðnum nema þær séu augljósla grunnlausar eða of miklar (grein 12(5) GDPR).',
      },
      {
        h: '8. Réttur til að legja fram kvörtun',
        p: 'Ef þú telur að vinnsla gagna okkar á gögnum þínum brjóti gegn GDPR hefur þú rétt til að legja fram kvörtun hjá forseta Persónuverndar (PUODO), ul. Stawki 2, 00-193 Varsjá, Pólland.',
      },
      {
        h: '9. Flutningur gagna til þriðja landa',
        p: 'Við notkun AI aðgerða getur texti verið unninn af OpenRouter netþjónum í Bandaríkjunum. OpenRouter tekur þátt í Data Privacy Framework (DPF) áætluninni sem tryggir fullnægjandi persónuvernd í samræmi við ákvörðun Evrópusambandsins 2023/1795.',
      },
      {
        h: '10. Vafrakökur og localStorage',
        p: 'Við notum ekki auglýsinga-, rekjanlega eða þriðja aðila greiningarkökur. Við notum eingöngu localStorage vafrans til að muna stillingar þínar (þema, tungumál). Þessi gögn eru geymd staðbundið á tækinu þínu og er hægt að eyða hvenær sem er með því að hreinsa staðvæsan gagnageymslu vafrans þíns.',
      },
      {
        h: '11. Breytingar á þessari GDPR tilkynningu',
        p: 'Við áskiljum okkur rétt til að gera breytingar á þessum GDPR upplýsingum. Allar breytingar verða tilkynntar með því að uppfæra dagsetningu efst á þessari síðu. Við hvetjum þig til að fara reglulega yfir þetta efni.',
      },
    ],
  },
  it: {
    title: 'Informazioni GDPR',
    updated: 'Ultimo aggiornamento: 25 giugno 2026',
    sections: [
      {
        h: '1. Chi siamo come titolare del trattamento',
        p: 'Il titolare dei vostri dati personali è Leszek Hofman, Dąbrówka Nowa, Polonia (optimapdf.com). In qualità di fornitore di servizi digitali, trattiamo i dati solo nella misura necessaria per fornire strumenti PDF online. Per tutte le questioni relative alla protezione dei dati, potete contattarci a: kontakt@optimapdf.com.',
      },
      {
        h: '2. Quali dati personali trattiamo e per quale scopo',
        p: 'OptimaPDF è progettato per minimizzare la raccolta di dati. Trattiamo solo:',
        items: [
          'Indirizzo IP — per garantire la sicurezza e prevenire abusi (interesse legittimo, art. 6(1)(f) GDPR). Gli indirizzi IP vengono memorizzati nei log del server per un massimo di 7 giorni.',
          'File caricati dall\'utente — la maggior parte degli strumenti elabora i file interamente nel browser (WebAssembly/JavaScript). Questi file non vengono inviati al server e non lasciano mai il vostro dispositivo. Le eccezioni sono gli strumenti che richiedono librerie esterne (compressione, OCR, conversioni di formato), dove il file viene temporaneamente elaborato nella RAM del server e cancellato immediatamente dopo l\'operazione — tipicamente entro pochi secondi.',
          'Preferenze di tema e lingua — memorizzate esclusivamente nel localStorage del vostro browser. Non vengono inviate al server né condivise con terze parti.',
        ],
      },
      {
        h: '3. Base giuridica del trattamento',
        p: 'Trattiamo i vostri dati sulla base di:',
        items: [
          'Art. 6(1)(b) GDPR (necessità per l\'esecuzione del contratto) — fornire strumenti PDF su vostra richiesta.',
          'Art. 6(1)(f) GDPR (interesse legittimo) — garantire la sicurezza del servizio, prevenire abusi e analisi tecnica del funzionamento del sito web.',
          'Art. 6(1)(a) GDPR (consenso) — per le funzionalità AI che richiedono l\'invio di contenuti a un\'API esterna (OpenRouter). L\'utilizzo dell\'AI richiede il consenso esplicito accettando i termini.',
        ],
      },
      {
        h: '4. Quanto a lungo conserviamo i dati',
        p: 'Applichiamo i seguenti periodi di conservazione:',
        items: [
          'Indirizzi IP nei log del server: fino a 7 giorni.',
          'File inviati agli strumenti lato client: non memorizzati — vengono rimossi dalla memoria quando chiudete il tab del browser o aggiornate la pagina.',
          'File inviati agli strumenti lato server (compressione, OCR, conversioni): cancellati immediatamente dopo l\'elaborazione (tipicamente entro pochi secondi).',
          'Dati in localStorage: memorizzati fino a quando non cancellati manualmente dall\'utente o fino a quando la cache del browser non viene cancellata.',
        ],
      },
      {
        h: '5. Con chi condividiamo i dati',
        p: 'Non vendiamo, affittiamo o condividiamo i vostri dati personali con terze parti. In misura limitata, i dati possono essere trattati da:',
        items: [
          'OpenRouter.ai — quando si utilizzano le funzionalità AI (Chat AI, Riepilogo AI, Traduzione AI). Inviamo solo il testo estratto dal PDF, senza dati identificativi dell\'utente. OpenRouter è conforme al GDPR e dispone di garanzie adeguate.',
          'Fornitore di hosting — il nostro sito web è ospitato da un fornitore esterno che può memorizzare log anonimi del server (indirizzo IP, tipo di browser) per un massimo di 7 giorni. Il fornitore è in possesso della certificazione ISO 27001 e soddisfa i requisiti GDPR.',
        ],
      },
      {
        h: '6. I vostri diritti ai sensi del GDPR',
        p: 'Ai sensi degli artt. 15–22 del GDPR avete:',
        items: [
          'Diritto di accesso (art. 15) — potete chiedere se trattiamo i vostri dati e ottenerne l\'accesso.',
          'Diritto di rettifica (art. 16) — potete richiedere la correzione di dati inesatti.',
          'Diritto alla cancellazione (art. 17) — diritto all\'oblio.',
          'Diritto alla limitazione del trattamento (art. 18).',
          'Diritto alla portabilità dei dati (art. 20).',
          'Diritto di opposizione (art. 21).',
          'Diritto di revocare il consenso in qualsiasi momento — senza pregiudicare la liceità del trattamento anteriormente alla revoca.',
        ],
      },
      {
        h: '7. Come esercitare i vostri diritti',
        p: 'Per esercitare uno dei diritti sopra indicati, inviate un\'email a: kontakt@optimapdf.com. Risponderemo entro 30 giorni. Non addebitiamo compensi per la soddisfazione delle richieste, a meno che siano manifestamente infondate o eccessive (art. 12(5) GDPR).',
      },
      {
        h: '8. Diritto di proporre reclamo',
        p: 'Se ritenete che il trattamento dei vostri dati da parte nostra violi il GDPR, avete il diritto di proporre reclamo al Presidente dell\'Ufficio per la protezione dei dati personali (PUODO), ul. Stawki 2, 00-193 Varsavia, Polonia.',
      },
      {
        h: '9. Trasferimenti di dati verso paesi terzi',
        p: 'Quando si utilizzano le funzionalità AI, il testo può essere elaborato dai server di OpenRouter situati negli Stati Uniti. OpenRouter partecipa al programma Data Privacy Framework (DPF), garantendo un livello adeguato di protezione dei dati conformemente alla Decisione 2023/1795 della Commissione europea.',
      },
      {
        h: '10. Cookie e localStorage',
        p: 'Non utilizziamo cookie pubblicitari, di tracciamento o analitici di terze parti. Utilizziamo esclusivamente il localStorage del browser per ricordare le vostre preferenze (tema, lingua). Questi dati sono memorizzati localmente sul vostro dispositivo e possono essere cancellati in qualsiasi momento cancellando l\'archiviazione locale del vostro browser.',
      },
      {
        h: '11. Modifiche a questo avviso GDPR',
        p: 'Ci riserviamo il diritto di apportare modifiche a queste informazioni GDPR. Qualsiasi modifica sarà comunicata aggiornando la data in cima a questa pagina. Vi incoraggiamo a rivedere periodicamente questo contenuto.',
      },
    ],
  },
  ja: {
    title: 'GDPR情報',
    updated: '最終更新：2026年6月25日',
    sections: [
      {
        h: '1. データ管理者としての当社について',
        p: 'お客様の個人データの管理者は、Leszek Hofman、Dąbrówka Nowa、ポーランド（optimapdf.com）です。デジタルサービスプロバイダーとして、当社はオンラインPDFツールを提供するために必要な範囲のみでデータを処理します。すべてのデータ保護に関するお問い合わせは、メール：kontakt@optimapdf.com までご連絡ください。',
      },
      {
        h: '2. 処理する個人データとその目的',
        p: 'OptimaPDFはデータ収集を最小限に抑えるように設計されています。当社は以下のみを処理します：',
        items: [
          'IPアドレス — セキュリティの確保と不正の防止のため（正当な利益、GDPR第6条第1項第f号）。IPアドレスはサーバーログに最大7日間保存されます。',
          'ユーザーがアップロードしたファイル — ほとんどのツールはファイルをブラウザ全体で処理します（WebAssembly/JavaScript）。これらのファイルはサーバーに送信されず、デバイスから出ることはありません。例外は、外部ライブラリを必要とするツール（圧縮、OCR、フォーマット変換）で、ファイルがサーバーのRAMで一時的に処理され、操作後すぐに削除されます — 通常は数秒以内です。',
          'テーマと言語の設定 — ブラウザのlocalStorageに専属で保存されます。サーバーに送信されたり、第三者と共有されたりすることはありません。',
        ],
      },
      {
        h: '3. 処理の法的根拠',
        p: '当社は以下に基づいてお客様のデータを処理します：',
        items: [
          'GDPR第6条第1項第b号（契約履行のための必要性） — お客様の要求に応じてPDFツールを提供する。',
          'GDPR第6条第1項第f号（正当な利益） — サービスのセキュリティ確保、不正の防止、ウェブサイト運用の技術的分析。',
          'GDPR第6条第1項第a号（同意） — 外部API（OpenRouter）にコンテンツを送信する必要があるAI機能について。AIの使用には、利用規約に同意することによる明示的な同意が必要です。',
        ],
      },
      {
        h: '4. データの保持期間',
        p: '当社は以下の保持期間を適用します：',
        items: [
          'サーバーログのIPアドレス：最大7日間。',
          'クライアント側ツールに送信されたファイル：保存されません — ブラウザのタブを閉じるかページを更新した際にメモリから削除されます。',
          'サーバー側ツールに送信されたファイル（圧縮、OCR、変換）：処理後に即座に削除されます（通常は数秒以内）。',
          'localStorageデータ：ユーザーが手動で削除するか、ブラウザキャッシュがクリアされるまで保存されます。',
        ],
      },
      {
        h: '5. データを共有する相手',
        p: '当社はお客様の個人データを第三者に売却、賃貸、共有しません。限定的な範囲で、以下の者によってデータが処理される場合があります：',
        items: [
          'OpenRouter.ai — AI機能（AIチャット、AI要約、AI翻訳）の使用時。PDFから抽出されたテキストのみを送信し、ユーザーを識別するデータは送信しません。OpenRouterはGDPRに準拠し、適切な保護措置を有しています。',
          'ホスティングプロバイダー — 当社のウェブサイトは外部プロバイダーによってホストされており、匿名のサーバーログ（IPアドレス、ブラウザの種類）を最大7日間保存する場合があります。プロバイダーはISO 27001認証を取得しており、GDPR要件を満たしています。',
        ],
      },
      {
        h: '6. GDPRに基づくお客様の権利',
        p: 'GDPR第15条から第22条に基づき、お客様には以下の権利があります：',
        items: [
          'アクセス権（第15条） — 当社がお客様のデータを処理しているかどうかを問い、そのアクセスを受けることができます。',
          '訂正権（第16条） — 不正確なデータの訂正を要求することができます。',
          '削除権（第17条） — 消忘権。',
          '処理の制限権（第18条）。',
          'データポータビリティの権利（第20条）。',
          '異議申立権（第21条）。',
          'いつでも同意を取り消す権利 — 取り消し前の処理の合法性に影響を与えません。',
        ],
      },
      {
        h: '7. 権利を行使する方法',
        p: '上記のいずれかの権利を行使するには、メールを送信してください：kontakt@optimapdf.com。30日以内にお答えします。明白に無根拠または過度でない限り、要求の履行に対する料金は請求しません（GDPR第12条第5項）。',
      },
      {
        h: '8. 苦情を申し立てる権利',
        p: '当社によるデータ処理がGDPRに違反すると信じる場合、個人データ保護局（PUODO）の長に苦情を申し立てる権利があります。住所：ul. Stawki 2、00-193 ワルシャワ、ポーランド。',
      },
      {
        h: '9. 第三国へのデータ移転',
        p: 'AI機能を使用する際、テキストは米国にあるOpenRouterサーバーによって処理される場合があります。OpenRouterはData Privacy Framework（DPF）プログラムに参加しており、欧州委員会の決定2023/1795に従って適切なレベルのデータ保護を保証しています。',
      },
      {
        h: '10. CookieとlocalStorage',
        p: '当社は広告、トラッキング、または第三者の分析Cookieを使用していません。ブラウザのlocalStorageのみを使用して、お客様の設定（テーマ、言語）を記憶します。このデータはデバイスにローカルに保存され、ブラウザのローカルストレージをクリアすることでいつでも削除できます。',
      },
      {
        h: '11. このGDPR通知の変更',
        p: '当社はこのGDPR情報に変更を加える権利を留保します。変更はこのページの先頭で日付を更新することによって通知されます。定期的にこのコンテンツを確認することをお勧めします。',
      },
    ],
  },
  no: {
    title: 'GDPR-informasjon',
    updated: 'Sist oppdatert: 25. juni 2026',
    sections: [
      {
        h: '1. Hvem vi er som behandlingsansvarlig',
        p: 'Den behandlingsansvarlige for dine personopplysninger er Leszek Hofman, Dąbrówka Nowa, Polen (optimapdf.com). Som digital tjenesteleverandør behandler vi data kun i den utstrekning det er nødvendig for å tilby PDF-verktøy på nett. For alle spørsmål om personvern kan du kontakte oss på: kontakt@optimapdf.com.',
      },
      {
        h: '2. Hvilke personopplysninger vi behandler og til hvilket formål',
        p: 'OptimaPDF er designet for å minimere datainnsamling. Vi behandler kun:',
        items: [
          'IP-adresse — for å sikre trygghet og forhindre misbruk (berettiget interesse, art. 6(1)(f) GDPR). IP-adresser lagres i serverlogger i maksimalt 7 dager.',
          'Filer lastet opp av brukeren — de fleste verktøy behandler filer helt i nettleseren (WebAssembly/JavaScript). Disse filene sendes ikke til serveren og forlater aldri enheten din. Unntak er verktøy som krever eksterne bibliotek (komprimering, OCR, formatkonverteringer), der filen midlertidig behandles i serverens RAM og slettes umiddelbart etter operasjonen — vanligvis innen noen få sekunder.',
          'Tema- og språkinnstillinger — lagres utelukkende i nettleserens localStorage. De sendes ikke til serveren eller deles med tredjeparter.',
        ],
      },
      {
        h: '3. Rettslig grunnlag for behandling',
        p: 'Vi behandler dine data basert på:',
        items: [
          'Art. 6(1)(b) GDPR (nødvendighet for oppfyllelse av kontrakt) — tilby PDF-verktøy etter din forespørsel.',
          'Art. 6(1)(f) GDPR (berettiget interesse) — sikre tjenestesikkerhet, forhindre misbruk og teknisk analyse av nettstedets drift.',
          'Art. 6(1)(a) GDPR (samtykke) — for AI-funksjoner som krever sending av innhold til en ekstern API (OpenRouter). Bruk av AI krever uttrykkelig samtykke ved å akseptere vilkårene.',
        ],
      },
      {
        h: '4. Hvor lenge vi oppbevarer data',
        p: 'Vi bruker følgende oppbevaringsperioder:',
        items: [
          'IP-adresser i serverlogger: opptil 7 dager.',
          'Filer sendt til klientverktøy: lagres ikke — de fjernes fra minnet når du lukker nettleserfanen eller oppdaterer siden.',
          'Filer sendt til serververktøy (komprimering, OCR, konverteringer): slettes umiddelbart etter behandling (vanligvis innen noen få sekunder).',
          'localStorage-data: lagres til de slettes manuelt av brukeren eller til nettleserens hurtigbuffer tømmes.',
        ],
      },
      {
        h: '5. Hvem vi deler data med',
        p: 'Vi selger, leier ut eller deler ikke dine personopplysninger med tredjeparter. I begrenset omfang kan data bli behandlet av:',
        items: [
          'OpenRouter.ai — ved bruk av AI-funksjoner (AI Chat, AI Sammendrag, AI Oversettelse). Vi sender kun tekst utvunnet fra PDF, uten brukeridentifiserende data. Overholder GDPR og har passende garantier.',
          'Hosting-leverandør — nettstedet vårt er vertssatt av en ekstern leverandør som kan lagre anonyme serverlogger (IP-adresse, nettlesertype) i maksimalt 7 dager. Leverandøren har ISO 27001-sertifisering og oppfyller GDPR-kravene.',
        ],
      },
      {
        h: '6. Dine rettigheter under GDPR',
        p: 'I henhold til artiklene 15–22 GDPR har du:',
        items: [
          'Innsynsrett (art. 15) — du kan spørre om vi behandler dine data og få tilgang til dem.',
          'Retten til retting (art. 16) — du kan be om korrektur av unøyaktige data.',
          'Retten til sletting (art. 17) — retten til å bli glemt.',
          'Retten til å begrense behandling (art. 18).',
          'Retten til dataportabilitet (art. 20).',
          'Retten til å motsette seg (art. 21).',
          'Retten til å trekke tilbake samtykke når som helst — uten å påvirke lovligheten av behandlingen før tilbakekallingen.',
        ],
      },
      {
        h: '7. Hvordan utøve dine rettigheter',
        p: 'For å utøve noen av rettighetene ovenfor, send en e-post til: kontakt@optimapdf.com. Vi vil svare innen 30 dager. Vi krever ikke gebyr for å oppfylle forespørsler med mindre de er åpenbart grunnløse eller overdrevne (art. 12(5) GDPR).',
      },
      {
        h: '8. Retten til å klage',
        p: 'Hvis du mener at vår behandling av dine data bryter med GDPR, har du rett til å klage til presidenten for Personvernnemnda (PUODO), ul. Stawki 2, 00-193 Warszawa, Polen.',
      },
      {
        h: '9. Dataoverføringer til tredjeland',
        p: 'Ved bruk av AI-funksjoner kan tekst bli behandlet av OpenRouter-servere plassert i USA. OpenRouter deltar i Data Privacy Framework (DPF)-programmet, som sikrer et tilstrekkelig beskyttelsesnivå i samsvar med European Commission Decision 2023/1795.',
      },
      {
        h: '10. Informasjonskapsler og localStorage',
        p: 'Vi bruker ikke reklame-, sporing- eller tredjepartsanalyse-informasjonskapsler. Vi bruker kun nettleserens localStorage for å huske dine innstillinger (tema, språk). Disse dataene lagres lokalt på enheten din og kan slettes når som helst ved å tømme nettleserens lokale lagring.',
      },
      {
        h: '11. Endringer i denne GDPR-meldingen',
        p: 'Vi forbeholder oss retten til å gjøre endringer i denne GDPR-informasjonen. Eventuelle endringer vil bli kommunisert ved å oppdatere datoen øverst på denne siden. Vi oppfordrer deg til å gjennomgå dette innholdet med jevne mellomrom.',
      },
    ],
  },
  pt: {
    title: 'Informação sobre o RGPD',
    updated: 'Última atualização: 25 de junho de 2026',
    sections: [
      {
        h: '1. Quem somos como controlador de dados',
        p: 'O controlador dos seus dados pessoais é Leszek Hofman, Dąbrówka Nowa, Polônia (optimapdf.com). Como provedor de serviços digitais, processamos dados apenas na medida necessária para fornecer ferramentas PDF online. Para todas as questões de proteção de dados, você pode nos contatar em: kontakt@optimapdf.com.',
      },
      {
        h: '2. Quais dados pessoais processamos e para qual finalidade',
        p: 'OptimaPDF foi projetado para minimizar a coleta de dados. Processamos apenas:',
        items: [
          'Endereço IP — para garantir a segurança e prevenir abusos (interesse legítimo, Art. 6(1)(f) RGPD). Os endereços IP são armazenados nos logs do servidor por um máximo de 7 dias.',
          'Arquivos enviados pelo usuário — a maioria das ferramentas processa arquivos inteiramente no navegador (WebAssembly/JavaScript). Esses arquivos não são enviados ao servidor e nunca saem do seu dispositivo. Exceções são ferramentas que exigem bibliotecas externas (compactação, OCR, conversões de formato), onde o arquivo é processado temporariamente na RAM do servidor e imediatamente deletado após a operação — tipicamente em questão de segundos.',
          'Preferências de tema e idioma — armazenadas exclusivamente no localStorage do seu navegador. Não são enviadas ao servidor nem compartilhadas com terceiros.',
        ],
      },
      {
        h: '3. Base legal para o processamento',
        p: 'Processamos seus dados com base em:',
        items: [
          'Art. 6(1)(b) RGPD (necessidade para execução do contrato) — fornecer ferramentas PDF a seu pedido.',
          'Art. 6(1)(f) RGPD (interesse legítimo) — garantir a segurança do serviço, prevenir abusos e análise técnica do funcionamento do site.',
          'Art. 6(1)(a) RGPD (consentimento) — para funcionalidades de IA que requerem envio de conteúdo para uma API externa (OpenRouter). Usar IA requer consentimento explícito aceitando os termos.',
        ],
      },
      {
        h: '4. Quanto tempo retemos os dados',
        p: 'Aplicamos os seguintes períodos de retenção:',
        items: [
          'Endereços IP nos logs do servidor: até 7 dias.',
          'Arquivos enviados para ferramentas do lado do cliente: não armazenados — são removidos da memória quando você fecha a aba do navegador ou atualiza a página.',
          'Arquivos enviados para ferramentas do lado do servidor (compactação, OCR, conversões): deletados imediatamente após o processamento (tipicamente em questão de segundos).',
          'Dados do localStorage: armazenados até serem deletados manualmente pelo usuário ou até o cache do navegador ser limpo.',
        ],
      },
      {
        h: '5. Com quem compartilhamos os dados',
        p: 'Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros. Em medida limitada, os dados podem ser processados por:',
        items: [
          'OpenRouter.ai — ao usar funcionalidades de IA (Chat IA, Resumo IA, Tradução IA). Enviamos apenas texto extraído do PDF, sem dados de identificação do usuário. O OpenRouter está em conformidade com o RGPD e possui garantias adequadas.',
          'Provedor de hospedagem — nosso site é hospedado por um provedor externo que pode armazenar logs anônimos do servidor (endereço IP, tipo de navegador) por um máximo de 7 dias. O provedor possui certificação ISO 27001 e atende aos requisitos do RGPD.',
        ],
      },
      {
        h: '6. Seus direitos sob o RGPD',
        p: 'De acordo com os artigos 15–22 do RGPD, você tem:',
        items: [
          'Direito de acesso (Art. 15) — você pode perguntar se processamos seus dados e obtê-los.',
          'Direito de retificação (Art. 16) — você pode solicitar a correção de dados inexatos.',
          'Direito de eliminação (Art. 17) — direito ao esquecimento.',
          'Direito à restrição do processamento (Art. 18).',
          'Direito à portabilidade dos dados (Art. 20).',
          'Direito de oposição (Art. 21).',
          'Direito de retirar o consentimento a qualquer momento — sem afetar a licitude do processamento antes de sua retirada.',
        ],
      },
      {
        h: '7. Como exercer seus direitos',
        p: 'Para exercer qualquer um dos direitos acima, envie um e-mail para: kontakt@optimapdf.com. Responderemos dentro de 30 dias. Não cobramos taxas pelo atendimento de solicitações, a menos que sejam manifestamente infundadas ou excessivas (Art. 12(5) RGPD).',
      },
      {
        h: '8. Direito de apresentar uma reclamação',
        p: 'Se você acredita que nosso processamento de seus dados viola o RGPD, você tem o direito de apresentar uma reclamação ao Presidente do Escritório de Proteção de Dados Pessoais (PUODO), ul. Stawki 2, 00-193 Varsóvia, Polônia.',
      },
      {
        h: '9. Transferências de dados para países terceiros',
        p: 'Ao usar funcionalidades de IA, o texto pode ser processado por servidores da OpenRouter localizados nos EUA. A OpenRouter participa do programa Data Privacy Framework (DPF), garantindo um nível adequado de proteção de dados de acordo com a Decisão 2023/1795 da Comissão Europeia.',
      },
      {
        h: '10. Cookies e localStorage',
        p: 'Não usamos cookies de publicidade, rastreamento ou análise de terceiros. Usamos apenas o localStorage do navegador para lembrar suas preferências (tema, idioma). Esses dados são armazenados localmente no seu dispositivo e podem ser deletados a qualquer momento limpando o armazenamento local do seu navegador.',
      },
      {
        h: '11. Alterações neste aviso do RGPD',
        p: 'Reservamo-nos o direito de fazer alterações nesta informação do RGPD. Quaisquer alterações serão comunicadas atualizando a data no topo desta página. Encorajamos você a revisar periodicamente este conteúdo.',
      },
    ],
  },
  sv: {
    title: 'GDPR-information',
    updated: 'Senast uppdaterad: 25 juni 2026',
    sections: [
      {
        h: '1. Vi vi är som personuppgiftsansvarig',
        p: 'Den personuppgiftsansvarige för dina personuppgifter är Leszek Hofman, Dąbrówka Nowa, Polen (optimapdf.com). Som digital tjänsteleverantör behandlar vi data endast i den omfattning som krävs för att tillhandahålla PDF-verktyg online. För alla frågor om dataskydd kan du kontakta oss på: kontakt@optimapdf.com.',
      },
      {
        h: '2. Vilka personuppgifter vi behandlar och i vilket syfte',
        p: 'OptimaPDF är utformat för att minimera datainsamling. Vi behandlar endast:',
        items: [
          'IP-adress — för att säkerställa säkerhet och förhindra missbruk (berättigat intresse, art. 6(1)(f) GDPR). IP-adresser lagras i serverloggar i maximalt 7 dagar.',
          'Filer uppladdade av användaren — de flesta verktyg behandlar filer helt i webbläsaren (WebAssembly/JavaScript). Dessa filer skickas inte till servern och lämnar aldrig din enhet. Undantag är verktyg som kräver externa bibliotek (komprimering, OCR, formatkonverteringar), där filen tillfälligt behandlas i serverns RAM och omedelbart tas bort efter åtgärden — vanligtvis inom några få sekunder.',
          'Tema- och språkinställningar — lagras uteslutande i webbläsarens localStorage. De skickas inte till servern eller delas med tredje parter.',
        ],
      },
      {
        h: '3. Rättslig grund för behandling',
        p: 'Vi behandlar dina data baserat på:',
        items: [
          'Art. 6(1)(b) GDPR (nödvändighet för uppfyllelse av kontrakt) — tillhandahålla PDF-verktyg på din begäran.',
          'Art. 6(1)(f) GDPR (berättigat intresse) — säkerställa tjänstesäkerhet, förhindra missbruk och teknisk analys av webbplatsens funktion.',
          'Art. 6(1)(a) GDPR (samtycke) — för AI-funktioner som kräver sändning av innehåll till ett externt API (OpenRouter). Användning av AI kräver uttryckligt samtycke genom att acceptera villkoren.',
        ],
      },
      {
        h: '4. Hur länge vi behåller data',
        p: 'Vi tillämpar följande förvaringstider:',
        items: [
          'IP-adresser i serverloggar: upp till 7 dagar.',
          'Filer skickade till klientverktyg: lagras inte — de tas bort från minnet när du stänger webbläsarfliken eller uppdaterar sidan.',
          'Filer skickade till serververktyg (komprimering, OCR, konverteringar): tas bort omedelbart efter behandling (vanligtvis inom några få sekunder).',
          'localStorage-data: lagras tills de manuellt tas bort av användaren eller tills webbläsarens cache rensas.',
        ],
      },
      {
        h: '5. Med vem vi delar data',
        p: 'Vi säljer, hyr ut eller delar inte dina personuppgifter med tredje parter. I begränsad omfattning kan data behandlas av:',
        items: [
          'OpenRouter.ai — vid användning av AI-funktioner (AI-chatt, AI-sammanfattning, AI-översättning). Vi skickar endast text utvunnen från PDF, utan användaridentifierande data. Överensstämmer med GDPR och har lämpliga garantier.',
          'Hosting-leverantör — vår webbplats är värd för en extern leverantör som kan lagra anonyma serverloggar (IP-adress, webbläsertyp) i maximalt 7 dagar. Leverantören har ISO 27001-certifiering och uppfyller GDPR-kraven.',
        ],
      },
      {
        h: '6. Dina rättigheter enligt GDPR',
        p: 'Enligt artiklarna 15–22 GDPR har du:',
        items: [
          'Rätt till insyn (art. 15) — du kan fråga om vi behandlar dina data och få tillgång till dem.',
          'Rätt till rättelse (art. 16) — du kan begära korrigering av inaktiva data.',
          'Rätt till radering (art. 17) — rätt att bli glömd.',
          'Rätt att begränsa behandling (art. 18).',
          'Rätt till dataportabilitet (art. 20).',
          'Rätt att invända (art. 21).',
          'Rätt att dra tillbaka samtycke när som helst — utan att påverka behandlingens laglighet före dess återkallelse.',
        ],
      },
      {
        h: '7. Hur du utövar dina rättigheter',
        p: 'För att utöva någon av rättigheterna ovan, skicka ett e-postmeddelande till: kontakt@optimapdf.com. Vi svarar inom 30 dagar. Vi tar inte ut avgifter för att uppfylla begäran om de inte är uppenbart obefogade eller overdrevna (art. 12(5) GDPR).',
      },
      {
        h: '8. Rätt att lämna in en klagomål',
        p: 'Om du anser att vår behandling av dina data bryter mot GDPR har du rätt att lämna in en klagomål till ordföranden för Personuppgiftsmyndigheten (PUODO), ul. Stawki 2, 00-193 Warszawa, Polen.',
      },
      {
        h: '9. Dataöverföringar till tredjeländer',
        p: 'Vid användning av AI-funktioner kan text behandlas av OpenRouter-servrar belägna i USA. OpenRouter deltar i Data Privacy Framework (DPF)-programmet, vilket säkerställer en tillräcklig dataskyddsnivå i enlighet med Europeiska kommissionens beslut 2023/1795.',
      },
      {
        h: '10. Kakor och localStorage',
        p: 'Vi använder inte annonserings-, spårnings- eller tredjepartsanalyskakor. Vi använder endast webbläsarens localStorage för att komma ihåg dina inställningar (tema, språk). Dessa data lagras lokalt på din enhet och kan tas bort när som helst genom att rensa webbläsarens lokala lagring.',
      },
      {
        h: '11. Ändringar i detta GDPR-meddelande',
        p: 'Vi förbehåller oss rätten att göra ändringar i denna GDPR-information. Eventuella ändringar kommuniceras genom att uppdatera datumet högst upp på denna sida. Vi uppmuntrar dig att regelbundet granska detta innehåll.',
      },
    ],
  },
  tr: {
    title: 'GDPR Bilgisi',
    updated: 'Son güncelleme: 25 Haziran 2026',
    sections: [
      {
        h: '1. Veri sorumlusu olarak biz kimiz',
        p: 'Kişisel verilerinizin sorumlusu Leszek Hofman, Dąbrówka Nowa, Polonya (optimapdf.com)dir. Dijital hizmet sağlayıcı olarak, yalnızca çevrimiçi PDF araçlarını sağlamak için gerekli olan ölçüde veri işliyoruz. Tüm veri koruma konularında bize şu adresten ulaşabilirsiniz: kontakt@optimapdf.com.',
      },
      {
        h: '2. Hangi kişisel verileri işliyoruz ve hangi amaçla',
        p: 'OptimaPDF, veri toplamayı en aza indirecek şekilde tasarlanmıştır. Yalnızca şunları işliyoruz:',
        items: [
          'IP adresi — güvenliği sağlamak ve suistimalleri önlemek için (meşru menfaat, GDPR Madde 6(1)(f)). IP adresleri sunucu günlüklerinde en fazla 7 gün saklanır.',
          'Kullanıcı tarafından yüklenen dosyalar — çoğu araç dosyaları tamamen tarayıcıda işler (WebAssembly/JavaScript). Bu dosyalar sunucuya gönderilmez ve cihazınızdan asla çıkmaz. İstisna, harici kütüphanelere ihtiyaç duyan araçlardır (sıkıştırma, OCR, biçim dönüştürmeler), burada dosya sunucunun RAM\'inde geçici olarak işlenir ve işlem sonrası hemen silinir — genellikle birkaç saniye içinde.',
          'Tema ve dil tercihleri — yalnızca tarayıcınızın localStorage\'ında saklanır. Sunucuya gönderilmez veya üçüncü taraflarla paylaşılmaz.',
        ],
      },
      {
        h: '3. İşlemenin yasal dayanağı',
        p: 'Verilerinizi şunlara dayanarak işliyoruz:',
        items: [
          'GDPR Madde 6(1)(b) (sözleşme.performan için zorunluluk) — talebiniz üzerine PDF araçları sağlamak.',
          'GDPR Madde 6(1)(f) (meşru menfaat) — hizmet güvenliğini sağlamak, suistimalleri önlemek ve web sitesi çalışmasının teknik analizi.',
          'GDPR Madde 6(1)(a) (rıza) — harici bir API\'ye (OpenRouter) içerik göndermeyi gerektiren AI özellikleri için. AI\'ın kullanımı, koşulları kabul ederek açık rıza gerektirir.',
        ],
      },
      {
        h: '4. Verileri ne kadar süre saklıyoruz',
        p: 'Aşağıdaki saklama sürelerini uyguluyoruz:',
        items: [
          'Sunucu günlüklerindeki IP adresleri: en fazla 7 gün.',
          'İstemci tarafı araçlara gönderilen dosyalar: saklanmaz — tarayıcı sekmesini kapattığınızda veya sayfayı yenilediğinizde bellekten kaldırılır.',
          'Sunucu tarafı araçlara gönderilen dosyalar (sıkıştırma, OCR, dönüştürmeler): işleme sonrası hemen silinir (genellikle birkaç saniye içinde).',
          'localStorage verileri: kullanıcı tarafından manuel olarak silinene veya tarayıcı önbelleği temizlenene kadar saklanır.',
        ],
      },
      {
        h: '5. Verileri kiminle paylaşıyoruz',
        p: 'Kişisel verilerinizi satmıyoruz, kiralamıyoruz veya üçüncü taraflarla paylaşmıyoruz. Sınırlı bir kapsamda veriler şunlar tarafından işlenebilir:',
        items: [
          'OpenRouter.ai — AI özelliklerini kullanırken (AI Sohbet, AI Özet, AI Çeviri). Yalnızca PDF\'den çıkarılan metni, kullanıcı tanımlayıcı veriler olmadan gönderiyoruz. OpenRouter GDPR\'a uygundur ve uygun güvencelere sahiptir.',
          'Barındırma sağlayıcısı — sitemiz, anonim sunucu günlüklerini (IP adresi, tarayıcı türü) en fazla 7 gün saklayabilen harici bir sağlayıcı tarafından barındırılmaktadır. Sağlayıcı ISO 27001 sertifikasına sahiptir ve GDPR gereksinimlerini karşılar.',
        ],
      },
      {
        h: '6. GDPR kapsamındaki haklarınız',
        p: 'GDPR Madde 15–22 kapsamında şunlara sahipsiniz:',
        items: [
          'Erişim hakkı (Madde 15) — verilerinizi işleyip işlemediğimizi sorabilir ve bunlara erişebilirsiniz.',
          'Düzeltme hakkı (Madde 16) — hatalı verilerin düzeltilmesini talep edebilirsiniz.',
          'Silme hakkı (Madde 17) — unutulma hakkı.',
          'İşlemeyi kısıtlama hakkı (Madde 18).',
          'Veri taşınabilirliği hakkı (Madde 20).',
          'İtiraz hakkı (Madde 21).',
          'İstediğiniz zaman rızayı geri çekme hakkı — geri çekme öncesindeki işlemenin meşruluğunu etkilemeksizin.',
        ],
      },
      {
        h: '7. Haklarınızı nasıl kullanabilirsiniz',
        p: 'Yukarıdaki haklardan herhangi birini kullanmak için e-posta gönderin: kontakt@optimapdf.com. 30 gün içinde yanıt vereceğiz. Açıkça temelsiz veya aşırı olmadıkça talepleri yerine getirme ücreti almıyoruz (GDPR Madde 12(5)).',
      },
      {
        h: '8. Şikayet etme hakkı',
        p: 'Verilerinizin işlenmesinin GDPR\'ı ihlal ettiğine inanıyorsanız, Kişisel Verileri Koruma Ofisi (PUODO) Başkanı\'na şikayette bulunma hakkına sahipsiniz. Adres: ul. Stawki 2, 00-193 Varşova, Polonya.',
      },
      {
        h: '9. Üçüncü ülkelere veri transferleri',
        p: 'AI özelliklerini kullanırken metin, ABD\'de bulunan OpenRouter sunucuları tarafından işlenebilir. OpenRouter, Avrupa Komisyonu Kararı 2023/1795 uyarınca uygun düzeyde veri koruması sağlayan Data Privacy Framework (DPF) programına katılmaktadır.',
      },
      {
        h: '10. Çerezler ve localStorage',
        p: 'Reklam, izleme veya üçüncü taraf analitik çerezleri kullanmıyoruz. Yalnızca tercihlerinizi (tema, dil) hatırlamak için tarayıcının localStorage\'ını kullanıyoruz. Bu veriler cihazınızda yerel olarak saklanır ve tarayıcınızın yerel depolamasını temizleyerek istediğiniz zaman silinebilir.',
      },
      {
        h: '11. Bu GDPR bildirimindeki değişiklikler',
        p: 'Bu GDPR bilgisinde değişiklik yapma hakkını saklı tutuyoruz. Herhangi bir değişiklik, bu sayfanın üstündeki tarihi güncelleyerek bildirilecektir. Bu içeriği periyodik olarak gözden geçirmenizi tavsiye ederiz.',
      },
    ],
  },
  zh: {
    title: 'GDPR信息',
    updated: '最后更新：2026年6月25日',
    sections: [
      {
        h: '1. 我们作为数据控制者是谁',
        p: '您个人数据的控制者是Leszek Hofman，Dąbrówka Nowa，波兰（optimapdf.com）。作为数字服务提供商，我们仅在提供在线PDF工具所需的范围内处理数据。有关所有数据保护事宜，您可以通过以下方式联系我们：kontakt@optimapdf.com。',
      },
      {
        h: '2. 我们处理哪些个人数据及目的',
        p: 'OptimaPDF旨在最大限度地减少数据收集。我们仅处理：',
        items: [
          'IP地址 — 为确保安全和防止滥用（合法利益，GDPR第6条第1款第f项）。IP地址在服务器日志中最多保存7天。',
          '用户上传的文件 — 大多数工具完全在浏览器中处理文件（WebAssembly/JavaScript）。这些文件不会发送到服务器，也不会离开您的设备。例外是需要外部库的工具（压缩、OCR、格式转换），其中文件在服务器的RAM中临时处理，并在操作后立即删除 — 通常在几秒内。',
          '主题和语言偏好 — 仅存储在浏览器的localStorage中。它们不会发送到服务器或与第三方共享。',
        ],
      },
      {
        h: '3. 处理的法律依据',
        p: '我们基于以下内容处理您的数据：',
        items: [
          'GDPR第6条第1款第b项（合同履行的必要性） — 根据您的要求提供PDF工具。',
          'GDPR第6条第1款第f项（合法利益） — 确保服务安全、防止滥用和网站运营的技术分析。',
          'GDPR第6条第1款第a项（同意） — 对于需要将内容发送到外部API（OpenRouter）的AI功能。使用AI需要通过接受条款给予明确同意。',
        ],
      },
      {
        h: '4. 我们保留数据多长时间',
        p: '我们适用以下保留期限：',
        items: [
          '服务器日志中的IP地址：最多7天。',
          '发送到客户端工具的文件：不存储 — 当您关闭浏览器标签页或刷新页面时从内存中删除。',
          '发送到服务器端工具的文件（压缩、OCR、转换）：处理后立即删除（通常在几秒内）。',
          'localStorage数据：存储到用户手动删除或浏览器缓存被清除时。',
        ],
      },
      {
        h: '5. 我们与谁共享数据',
        p: '我们不出售、出租或与第三方共享您的个人数据。在有限范围内，数据可能由以下方处理：',
        items: [
          'OpenRouter.ai — 使用AI功能时（AI聊天、AI摘要、AI翻译）。我们仅发送从PDF中提取的文本，不包含用户识别数据。OpenRouter遵守GDPR并具有适当的保障措施。',
          '托管提供商 — 我们的网站由外部提供商托管，该提供商可以存储匿名的服务器日志（IP地址、浏览器类型）最多7天。该提供商持有ISO 27001认证并满足GDPR要求。',
        ],
      },
      {
        h: '6. 您在GDPR下的权利',
        p: '根据GDPR第15至22条，您拥有：',
        items: [
          '访问权（第15条） — 您可以询问我们是否处理您的数据并获取访问权限。',
          '更正权（第16条） — 您可以要求更正不准确的数据。',
          '删除权（第17条） — 被遗忘的权利。',
          '限制处理权（第18条）。',
          '数据可携带权（第20条）。',
          '反对权（第21条）。',
          '随时撤回同意的权利 — 不影响撤回前处理的合法性。',
        ],
      },
      {
        h: '7. 如何行使您的权利',
        p: '要行使上述任何权利，请发送电子邮件至：kontakt@optimapdf.com。我们将在30天内回复。除非请求明显无理或过度，否则我们不收取履行请求的费用（GDPR第12条第5款）。',
      },
      {
        h: '8. 提出投诉的权利',
        p: '如果您认为我们对您数据的处理违反了GDPR，您有权向个人数据保护局（PUODO）主席提出投诉。地址：ul. Stawki 2，00-193 华沙，波兰。',
      },
      {
        h: '9. 向第三国的数据传输',
        p: '使用AI功能时，文本可能由位于美国的OpenRouter服务器处理。OpenRouter参与数据隐私框架（DPF）计划，确保根据欧盟委员会决定2023/1795提供适当水平的数据保护。',
      },
      {
        h: '10. Cookie和localStorage',
        p: '我们不使用广告、跟踪或第三方分析Cookie。我们仅使用浏览器localStorage来记住您的偏好设置（主题、语言）。这些数据本地存储在您的设备上，可以通过清除浏览器的本地存储随时删除。',
      },
      {
        h: '11. 本GDPR通知的变更',
        p: '我们保留对本GDPR信息进行更改的权利。任何更改将通过更新本页顶部的日期来通知。我们建议您定期查看此内容。',
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
