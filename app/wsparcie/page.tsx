'use client';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';

/* ------------------------------------------------------------------ */
/*  Skonfiguruj poniższe stałe przed wdrożeniem                       */
/* ------------------------------------------------------------------ */
/*                                                                      */
/*  UWAGA — link TESTOWY (tryb Sandbox Stripe). Zwróć uwagę na 'test_'  */
/*  w URL. Przed uruchomieniem prawdziwych wpłat ZASTĄP go linkiem     */
/*  produkcyjnym Stripe (bez 'test_').                                 */
/*                                                                      */
const STRIPE_DONATE_URL = 'https://buy.stripe.com/test_aFafZie8kb3OcUecDwgfu00';
const SUPPORTER_BADGE_URL = '/supporter-badge.svg';                   /* ← ścieżka do odznaki (opcjonalnie)    */
const IS_TEST_MODE = STRIPE_DONATE_URL.includes('test_');              /* ← automatycznie wykrywa tryb testowy   */
/* ------------------------------------------------------------------ */

const content = {
  pl: {
    title: 'Wsparcie',
    subtitle: 'Jak możesz pomóc w rozwoju OptimaPDF.',
    donateSection: {
      h: '☕️ Postaw nam kawę',
      p: 'OptimaPDF jest darmowy i pozostanie darmowy. Jeśli nasze narzędzia są dla Ciebie przydatne, możesz wesprzeć rozwój serwisu dobrowolną wpłatą. Każda, nawet najmniejsza kwota, pomaga pokryć koszty utrzymania serwerów, API i domeny. Nie ma żadnych zobowiązań — to czysto dobrowolne wsparcie.',
      button: '☕️ Postaw kawę',
      note: 'Payments processed securely by Stripe. No account required.',
      badgeLabel: 'Jesteś supporterem OptimaPDF?',
      badgeDesc: 'Jeśli dokonałeś wpłaty, możesz poprosić o odznakę "Supporter" — wyślij nam e-mail z potwierdzeniem transakcji, a dodamy Cię do listy supporterów na stronie.',
    },
    sections: [
      {
        h: '📧 Kontakt e-mail',
        p: 'Napisz do nas na adres:',
        link: 'mailto:kontakt@optimapdf.com',
        linkText: 'kontakt@optimapdf.com',
      },
      {
        h: '❓ Najczęściej zadawane pytania',
        p: 'Zanim napiszesz, sprawdź naszą stronę FAQ — znajdziesz tam odpowiedzi na najczęściej zadawane pytania dotyczące narzędzi, prywatności i działania serwisu.',
        link: '/faq',
        linkText: 'Przejdź do FAQ →',
      },
      {
        h: '🐛 Zgłoszenie błędu',
        p: 'Jeśli znalazłeś błąd w działaniu któregokolwiek z narzędzi, opisz go jak najdokładniej:',
        items: [
          'Które narzędzie i jaka operacja powoduje błąd?',
          'Jaką przeglądarkę i system operacyjny używasz?',
          'Czy błąd pojawia się dla konkretnego pliku? (jeśli tak, jaki jest jego rozmiar i liczba stron)',
          'Czy w konsoli przeglądarki (F12 → Console) pojawiają się jakieś czerwone błędy?',
        ],
      },
      {
        h: '💡 Sugestia nowej funkcji',
        p: 'Masz pomysł na nowe narzędzie lub ulepszenie istniejącego? Chętnie go poznamy! Opisz krótko, czego dotyczy sugestia i dlaczego Twoim zdaniem byłaby przydatna.',
      },
      {
        h: '🔗 Linki',
        items: [
          'Polityka prywatności — /privacy',
          'Regulamin — /terms',
          'FAQ — /faq',
          'Strona główna — /',
        ],
      },
    ],
  },
  en: {
    title: 'Support',
    subtitle: 'How you can help OptimaPDF grow.',
    donateSection: {
      h: '☕️ Buy us a coffee',
      p: 'OptimaPDF is free and will remain free. If you find our tools useful, you can support the development of the site with a voluntary donation. Every amount, no matter how small, helps cover server, API, and domain costs. There are no obligations — this is purely voluntary support.',
      button: '☕️ Buy us a coffee',
      note: 'Payments processed securely by Stripe. No account required.',
      badgeLabel: 'Are you an OptimaPDF supporter?',
      badgeDesc: 'If you have made a donation, you can request a "Supporter" badge — send us an email with your transaction confirmation and we will add you to the supporter list on the site.',
    },
    sections: [
      {
        h: '📧 Email contact',
        p: 'Write to us at:',
        link: 'mailto:kontakt@optimapdf.com',
        linkText: 'kontakt@optimapdf.com',
      },
      {
        h: '❓ Frequently asked questions',
        p: 'Before reaching out, check our FAQ page — you will find answers to common questions about tools, privacy, and how the site works.',
        link: '/faq',
        linkText: 'Go to FAQ →',
      },
      {
        h: '🐛 Bug report',
        p: 'If you found a bug in any of the tools, please describe it as accurately as possible:',
        items: [
          'Which tool and which operation causes the error?',
          'What browser and operating system are you using?',
          'Does the error occur with a specific file? (if so, what is its size and page count)',
          'Are there any red errors in the browser console (F12 → Console)?',
        ],
      },
      {
        h: '💡 Feature suggestion',
        p: 'Have an idea for a new tool or an improvement to an existing one? We would love to hear it! Briefly describe your suggestion and why you think it would be useful.',
      },
      {
        h: '🔗 Links',
        items: [
          'Privacy Policy — /privacy',
          'Terms of Service — /terms',
          'FAQ — /faq',
          'Homepage — /',
        ],
      },
    ],
  },
  ar: {
    title: 'الدعم',
    subtitle: 'كيف يمكنك مساعدة OptimaPDF على النمو.',
    donateSection: {
      h: '☕️ اشترِ لنا قهوة',
      p: 'OptimaPDF مجاني وسيظل مجانيًا. إذا وجدت أدواتنا مفيدة، يمكنك دعم تطوير الموقع بتبرع طوعي. كل مبلغ، مهما كان صغيرًا، يساعد في تغطية تكاليف الخوادم وواجهات البرمجة والنطاقات. لا توجد التزامات — هذا دعم طوعي تمامًا.',
      button: '☕️ اشترِ لنا قهوة',
      note: 'تتم معالجة المدفوعات بشكل آمن عبر Stripe. لا حاجة لحساب.',
      badgeLabel: 'هل أنت من مؤيدي OptimaPDF؟',
      badgeDesc: 'إذا قمت بتبرع، يمكنك طلب شارة "Supporter" — أرسل لنا بريدًا إلكترونيًا بتأكيد معاملتك وسنضيفك إلى قائمة المؤيدين على الموقع.',
    },
    sections: [
      {
        h: '📧 التواصل عبر البريد الإلكتروني',
        p: 'اكتب إلينا على:',
        link: 'mailto:kontakt@optimapdf.com',
        linkText: 'kontakt@optimapdf.com',
      },
      {
        h: '❓ الأسئلة الشائعة',
        p: 'قبل التواصل، تحقق من صفحة الأسئلة الشائعة — ستجد إجابات على الأسئلة الشائعة حول الأدوات والخصوصية وكيفية عمل الموقع.',
        link: '/faq',
        linkText: 'انتقل إلى الأسئلة الشائعة →',
      },
      {
        h: '🐛 الإبلاغ عن خلل',
        p: 'إذا وجدت خللًا في أي من الأدوات، يرجى وصفه بأكبر قدر ممكن من الدقة:',
        items: [
          'أي أداة وأي عملية تسبب الخطأ؟',
          'أي متصفح ونظام تشغيل تستخدم؟',
          'هل يحدث الخطأ مع ملف محدد؟ (إذا كان كذلك، ما هو حجمه وعدد صفحاته)',
          'هل هناك أخطاء حمراء في وحدة تحكم المتصفح (F12 → Console)؟',
        ],
      },
      {
        h: '💡 اقتراح ميزة جديدة',
        p: 'هل لديك فكرة لأداة جديدة أو تحسين أداة موجودة؟ يسعدنا سماعها! صف اقتراحك باختصار ولماذا تعتقد أنه سيكون مفيدًا.',
      },
      {
        h: '🔗 روابط',
        items: [
          'سياسة الخصوصية — /privacy',
          'شروط الخدمة — /terms',
          'الأسئلة الشائعة — /faq',
          'الصفحة الرئيسية — /',
        ],
      },
    ],
  },
  de: {
    title: 'Unterstützung',
    subtitle: 'Wie Sie OptimaPDF beim Wachstum helfen können.',
    donateSection: {
      h: '☕️ Stellen Sie uns einen Kaffee zu',
      p: 'OptimaPDF ist kostenlos und wird es auch bleiben. Wenn Sie unsere Tools nützlich finden, können Sie die Entwicklung der Seite mit einer freiwilligen Spende unterstützen. Jeder Betrag, egal wie klein, hilft bei der Deckung der Kosten für Server, API und Domain. Es gibt keine Verpflichtungen — dies ist rein freiwillige Unterstützung.',
      button: '☕️ Kaffee ausgeben',
      note: 'Zahlungen werden sicher über Stripe abgewickelt. Kein Konto erforderlich.',
      badgeLabel: 'Sind Sie ein OptimaPDF-Unterstützer?',
      badgeDesc: 'Wenn Sie eine Spende getätigt haben, können Sie ein "Supporter"-Abzeichen anfordern — senden Sie uns eine E-Mail mit Ihrer Transaktionsbestätigung und wir fügen Sie zur Unterstützerliste auf der Seite hinzu.',
    },
    sections: [
      {
        h: '📧 E-Mail-Kontakt',
        p: 'Schreiben Sie uns an:',
        link: 'mailto:kontakt@optimapdf.com',
        linkText: 'kontakt@optimapdf.com',
      },
      {
        h: '❓ Häufig gestellte Fragen',
        p: 'Bevor Sie uns kontaktieren, besuchen Sie unsere FAQ-Seite — Sie finden Antworten auf häufige Fragen zu Tools, Datenschutz und der Funktionsweise der Seite.',
        link: '/faq',
        linkText: 'Zu FAQ gehen →',
      },
      {
        h: '🐛 Fehlerbericht',
        p: 'Wenn Sie einen Fehler in einem der Tools gefunden haben, beschreiben Sie ihn bitte so genau wie möglich:',
        items: [
          'Welches Tool und welche Operation verursacht den Fehler?',
          'Welchen Browser und welches Betriebssystem verwenden Sie?',
          'Tritt der Fehler bei einer bestimmten Datei auf? (Wenn ja, wie groß ist sie und wie viele Seiten hat sie?)',
          'Gibt es rote Fehler in der Browserkonsole (F12 → Console)?',
        ],
      },
      {
        h: '💡 Funktionsvorschlag',
        p: 'Haben Sie eine Idee für ein neues Tool oder eine Verbesserung eines bestehenden? Wir würden sie gerne hören! Beschreiben Sie kurz Ihren Vorschlag und warum Sie denken, dass er nützlich wäre.',
      },
      {
        h: '🔗 Links',
        items: [
          'Datenschutzrichtlinie — /privacy',
          'Nutzungsbedingungen — /terms',
          'FAQ — /faq',
          'Startseite — /',
        ],
      },
    ],
  },
  es: {
    title: 'Apoyo',
    subtitle: 'Cómo puedes ayudar a que OptimaPDF crezca.',
    donateSection: {
      h: '☕️ Invítanos un café',
      p: 'OptimaPDF es gratuito y seguirá siendo gratuito. Si encuentras nuestras herramientas útiles, puedes apoyar el desarrollo del sitio con una donación voluntaria. Cualquier cantidad, por pequeña que sea, ayuda a cubrir los costos de servidor, API y dominio. No hay obligaciones — esto es apoyo puramente voluntario.',
      button: '☕️ Invitar un café',
      note: 'Pagos procesados de forma segura por Stripe. No se requiere cuenta.',
      badgeLabel: '¿Eres un simpatizante de OptimaPDF?',
      badgeDesc: 'Si has realizado una donación, puedes solicitar una insignia "Supporter" — envíanos un correo electrónico con la confirmación de tu transacción y te añadiremos a la lista de simpatizantes del sitio.',
    },
    sections: [
      {
        h: '📧 Contacto por correo electrónico',
        p: 'Escríbenos a:',
        link: 'mailto:kontakt@optimapdf.com',
        linkText: 'kontakt@optimapdf.com',
      },
      {
        h: '❓ Preguntas frecuentes',
        p: 'Antes de contactarnos, consulta nuestra página de FAQ — encontrarás respuestas a preguntas comunes sobre herramientas, privacidad y el funcionamiento del sitio.',
        link: '/faq',
        linkText: 'Ir a FAQ →',
      },
      {
        h: '🐛 Informe de error',
        p: 'Si encontraste un error en cualquiera de las herramientas, descríbelo con el mayor detalle posible:',
        items: [
          '¿Qué herramienta y qué operación causa el error?',
          '¿Qué navegador y sistema operativo estás usando?',
          '¿El error ocurre con un archivo específico? (si es así, ¿cuál es su tamaño y número de páginas?)',
          '¿Hay errores rojos en la consola del navegador (F12 → Console)?',
        ],
      },
      {
        h: '💡 Sugerencia de función',
        p: '¿Tienes una idea para una nueva herramienta o una mejora de una existente? ¡Nos encantaría escucharla! Describe brevemente tu sugerencia y por qué crees que sería útil.',
      },
      {
        h: '🔗 Enlaces',
        items: [
          'Política de privacidad — /privacy',
          'Términos de servicio — /terms',
          'FAQ — /faq',
          'Página principal — /',
        ],
      },
    ],
  },
  fa: {
    title: 'پشتیبانی',
    subtitle: 'چگونه می\u200cتوانید به رشد OptimaPDF کمک کنید.',
    donateSection: {
      h: '☕️ برای ما قهوه بخرید',
      p: 'OptimaPDF رایگان است و رایگان باقی خواهد ماند. اگر ابزارهای ما را مفید می\u200cیابید، می\u200cتوانید با کمک داوطلبانه از توسعه سایت حمایت کنید. هر مبلغی، هرچند کوچک، به پوشش هزینه\u200cهای سرور، API و دامنه کمک می\u200cکند. هیچ تعهدی وجود ندارد — این صرفاً حمایت داوطلبانه است.',
      button: '☕️ برای ما قهوه بخرید',
      note: 'پرداخت\u200cها به صورت امن توسط Stripe پردازش می\u200cشوند. نیازی به حساب نیست.',
      badgeLabel: 'آیا شما یک حامی OptimaPDF هستید؟',
      badgeDesc: 'اگر کمک مالی کرده\u200cاید، می\u200cتوانید درخواست نشان "Supporter" کنید — ایمیلی با تأیید تراکنش خود برای ما ارسال کنید و شما را به لیست حامیان در سایت اضافه خواهیم کرد.',
    },
    sections: [
      {
        h: '📧 تماس از طریق ایمیل',
        p: 'به ما بنویسید در:',
        link: 'mailto:kontakt@optimapdf.com',
        linkText: 'kontakt@optimapdf.com',
      },
      {
        h: '❓ سوالات متداول',
        p: 'قبل از تماس، صفحه سوالات متداول ما را بررسی کنید — پاسخ سوالات رایج در مورد ابزارها، حریم خصوصی و نحوه کار سایت را خواهید یافت.',
        link: '/faq',
        linkText: 'رفتن به سوالات متداول →',
      },
      {
        h: '🐛 گزارش خطا',
        p: 'اگر خطایی در هر یک از ابزارها پیدا کردید، لطفاً آن را تا حد ممکن دقیق توصیف کنید:',
        items: [
          'کدام ابزار و کدام عملیات خطا را ایجاد می\u200cکند؟',
          'از کدام مرورگر و سیستم عامل استفاده می\u200cکنید؟',
          'آیا خطا با یک فایل خاص رخ می\u200cدهد؟ (اگر بله، اندازه و تعداد صفحات آن چقدر است)',
          'آیا خطاهای قرمزی در کنسول مرورگر (F12 → Console) وجود دارد؟',
        ],
      },
      {
        h: '💡 پیشنهاد قابلیت جدید',
        p: 'آیا ایده\u200cای برای ابزار جدید یا بهبود ابزار موجود دارید؟ خوشحال می\u200cشویم آن را بشنویم! پیشنهاد خود را به طور خلاصه توصیف کنید و چرا فکر می\u200cکنید مفید خواهد بود.',
      },
      {
        h: '🔗 پیوندها',
        items: [
          'سیاست حفظ حریم خصوصی — /privacy',
          'شرایط خدمات — /terms',
          'سوالات متداول — /faq',
          'صفحه اصلی — /',
        ],
      },
    ],
  },
  fr: {
    title: 'Soutien',
    subtitle: 'Comment vous pouvez aider OptimaPDF à grandir.',
    donateSection: {
      h: '☕️ Offrez-nous un café',
      p: 'OptimaPDF est gratuit et le restera. Si vous trouvez nos outils utiles, vous pouvez soutenir le développement du site par un don volontaire. Tout montant, aussi petit soit-il, aide à couvrir les coûts de serveur, d\'API et de domaine. Il n\'y a aucune obligation — il s\'agit d\'un soutien purement volontaire.',
      button: '☕️ Offrir un café',
      note: 'Paiements traités de manière sécurisée par Stripe. Aucun compte requis.',
      badgeLabel: 'Êtes-vous un supporter d\'OptimaPDF ?',
      badgeDesc: 'Si vous avez effectué un don, vous pouvez demander un badge « Supporter » — envoyez-nous un e-mail avec la confirmation de votre transaction et nous vous ajouterons à la liste des supporters sur le site.',
    },
    sections: [
      {
        h: '📧 Contact par e-mail',
        p: 'Écrivez-nous à :',
        link: 'mailto:kontakt@optimapdf.com',
        linkText: 'kontakt@optimapdf.com',
      },
      {
        h: '❓ Foire aux questions',
        p: 'Avant de nous contacter, consultez notre page FAQ — vous y trouverez des réponses aux questions courantes sur les outils, la confidentialité et le fonctionnement du site.',
        link: '/faq',
        linkText: 'Aller à la FAQ →',
      },
      {
        h: '🐛 Signaler un bug',
        p: 'Si vous avez trouvé un bug dans l\'un des outils, veuillez le décrire le plus précisément possible :',
        items: [
          'Quel outil et quelle opération provoque l\'erreur ?',
          'Quel navigateur et quel système d\'exploitation utilisez-vous ?',
          'L\'erreur se produit-elle avec un fichier spécifique ? (si oui, quelle est sa taille et son nombre de pages)',
          'Y a-t-il des erreurs rouges dans la console du navigateur (F12 → Console) ?',
        ],
      },
      {
        h: '💡 Suggestion de fonctionnalité',
        p: 'Vous avez une idée pour un nouvel outil ou une amélioration d\'un outil existant ? Nous serions ravis de l\'entendre ! Décrivez brièvement votre suggestion et pourquoi vous pensez qu\'elle serait utile.',
      },
      {
        h: '🔗 Liens',
        items: [
          'Politique de confidentialité — /privacy',
          'Conditions d\'utilisation — /terms',
          'FAQ — /faq',
          'Page d\'accueil — /',
        ],
      },
    ],
  },
  hi: {
    title: 'समर्थन',
    subtitle: 'आप OptimaPDF की वृद्धि में कैसे मदद कर सकते हैं।',
    donateSection: {
      h: '☕️ हमें कॉफी दिलाएं',
      p: 'OptimaPDF मुफ़्त है और मुफ़्त रहेगा। यदि आपको हमारे उपकरण उपयोगी लगते हैं, तो आप एक स्वैच्छिक दान के साथ साइट के विकास का समर्थन कर सकते हैं। हर राशि, चाहे वह कितनी भी छोटी हो, सर्वर, API और डोमेन की लागत को कवर करने में मदद करती है। कोई बाध्यता नहीं है — यह पूरी तरह से स्वैच्छिक समर्थन है।',
      button: '☕️ कॉफी दिलाएं',
      note: 'भुगतान Stripe द्वारा सुरक्षित रूप से संसाधित किए जाते हैं। किसी खाते की आवश्यकता नहीं है।',
      badgeLabel: 'क्या आप OptimaPDF के समर्थक हैं?',
      badgeDesc: 'यदि आपने दान किया है, तो आप "Supporter" बैज का अनुरोध कर सकते हैं — अपने लेनदेन की पुष्टि के साथ हमें ईमेल भेजें और हम आपको साइट पर समर्थक सूची में जोड़ देंगे।',
    },
    sections: [
      {
        h: '📧 ईमेल संपर्क',
        p: 'हमें लिखें पर:',
        link: 'mailto:kontakt@optimapdf.com',
        linkText: 'kontakt@optimapdf.com',
      },
      {
        h: '❓ अक्सर पूछे जाने वाले प्रश्न',
        p: 'संपर्क करने से पहले, हमारे FAQ पृष्ठ की जांच करें — आपको उपकरणों, गोपनीयता और साइट के काम करने के तरीके के बारे में सामान्य प्रश्नों के उत्तर मिलेंगे।',
        link: '/faq',
        linkText: 'FAQ पर जाएं →',
      },
      {
        h: '🐛 बग रिपोर्ट',
        p: 'यदि आपको किसी भी उपकरण में कोई बग मिला है, तो कृपया इसे यथासंभव सटीक रूप से वर्णित करें:',
        items: [
          'कौन सा उपकरण और कौन सी ऑपरेशन त्रुटि का कारण बनता है?',
          'आप कौन सा ब्राउज़र और ऑपरेटिंग सिस्टम उपयोग कर रहे हैं?',
          'क्या त्रुटि किसी विशिष्ट फ़ाइल के साथ होती है? (यदि हां, तो इसका आकार और पृष्ठ गणना क्या है)',
          'क्या ब्राउज़र कंसोल (F12 → Console) में कोई लाल त्रुटियां हैं?',
        ],
      },
      {
        h: '💡 सुविधा सुझाव',
        p: 'क्या आपके पास एक नए उपकरण या मौजूदा उपकरण में सुधार के लिए कोई विचार है? हम इसे सुनना पसंद करेंगे! संक्षेप में अपना सुझाव और इसे उपयोगी क्यों मानते हैं, यह बताएं।',
      },
      {
        h: '🔗 लिंक',
        items: [
          'गोपनीयता नीति — /privacy',
          'सेवा की शर्तें — /terms',
          'FAQ — /faq',
          'मुख्य पृष्ठ — /',
        ],
      },
    ],
  },
  is: {
    title: 'Stuðningur',
    subtitle: 'Hvernig þú getur hjálpað OptimaPDF að vaxa.',
    donateSection: {
      h: '☕️ Keyptu okkur kaffi',
      p: 'OptimaPDF er ókeypis og verður áfram ókeypis. Ef þú finnur verkfærin okkar gagnleg geturðu stutt þróun síðunnar með sjálfboðið framlag. Hver upphæð, sama hversu lítil, hjálpar til við að greiða fyrir netþjóna, API og lénskostnað. Engin skylda er — þetta er alfarið sjálfboðinn stuðningur.',
      button: '☕️ Kaupa kaffi',
      note: 'Greiðslur eru örugglega meðhöndlaðar af Stripe. Engin reikningur þarf.',
      badgeLabel: 'Ertu stuðningsmaður OptimaPDF?',
      badgeDesc: 'Ef þú hefur lagt inn framlag geturðu óskað eftir "Supporter" merki — sendu okkur tölvupóst með staðfestingu á færslunni og við bætum þér við á stuðningsmannalistann á síðunni.',
    },
    sections: [
      {
        h: '📧 Tölvupóstssamband',
        p: 'Skrifaðu okkur á:',
        link: 'mailto:kontakt@optimapdf.com',
        linkText: 'kontakt@optimapdf.com',
      },
      {
        h: '❓ Algengar spurningar',
        p: 'Áður en þú hefur samband, skoðaðu FAQ síðuna okkar — þú finnur svör við algengum spurningum um verkfæri, persónuvernd og hvernig síðan virkar.',
        link: '/faq',
        linkText: 'Fara á FAQ →',
      },
      {
        h: '🐛 Villuskýrsla',
        p: 'Ef þú fannst villa í einhverju af verkfærunum, vinsamlegast lýstu henni eins nákvæmlega og hægt er:',
        items: [
          'Hvaða verkfæri og hvaða aðgerð veldur villunni?',
          'Hvaða vafri og stýrikerfi ertu að nota?',
          'Verður villan við tiltekið skrá? (ef svo er, hvað er stærð hennar og fjöldi síðna)',
          'Eru einhverjar rauðar villur í vafraglugganum (F12 → Console)?',
        ],
      },
      {
        h: '💡 Tillaga um aðgerð',
        p: 'Hefurðu hugmynd um nýtt verkfæri eða endurbætur á tilverkfæri? Við myndum gjarnan vilja heyra það! Lýstu stuttlega tillögunni þinni og af hverju þú heldur að hún væri gagnleg.',
      },
      {
        h: '🔗 Tenglar',
        items: [
          'Persónuverndarstefna — /privacy',
          'Notkunarskilmálar — /terms',
          'FAQ — /faq',
          'Heimasíða — /',
        ],
      },
    ],
  },
  it: {
    title: 'Sostegno',
    subtitle: 'Come puoi aiutare OptimaPDF a crescere.',
    donateSection: {
      h: '☕️ Offrici un caffè',
      p: 'OptimaPDF è gratuito e lo rimarrà. Se trovi i nostri strumenti utili, puoi sostenere lo sviluppo del sito con una donazione volontaria. Ogni somma, per quanto piccola, aiuta a coprire i costi del server, dell\'API e del dominio. Non ci sono obblighi — è un sostegno puramente volontario.',
      button: '☕️ Offri un caffè',
      note: 'Pagamenti elaborati in modo sicuro da Stripe. Nessun account richiesto.',
      badgeLabel: 'Sei un supporter di OptimaPDF?',
      badgeDesc: 'Se hai effettuato una donazione, puoi richiedere un badge "Supporter" — inviaci un\'e-mail con la conferma della transazione e ti aggiungeremo alla lista dei supporter sul sito.',
    },
    sections: [
      {
        h: '📧 Contatto e-mail',
        p: 'Scrivici a:',
        link: 'mailto:kontakt@optimapdf.com',
        linkText: 'kontakt@optimapdf.com',
      },
      {
        h: '❓ Domande frequenti',
        p: 'Prima di contattarci, consulta la nostra pagina FAQ — troverai risposte alle domande comuni sugli strumenti, la privacy e il funzionamento del sito.',
        link: '/faq',
        linkText: 'Vai alla FAQ →',
      },
      {
        h: '🐛 Segnalazione di bug',
        p: 'Se hai trovato un bug in uno degli strumenti, descrivilo il più accuratamente possibile:',
        items: [
          'Quale strumento e quale operazione causa l\'errore?',
          'Quale browser e sistema operativo stai usando?',
          'L\'errore si verifica con un file specifico? (se sì, qual è la sua dimensione e il numero di pagine)',
          'Ci sono errori rossi nella console del browser (F12 → Console)?',
        ],
      },
      {
        h: '💡 Suggerimento per una funzionalità',
        p: 'Hai un\'idea per un nuovo strumento o un miglioramento di uno esistente? Ci piacerebbe sentirla! Descrivi brevemente il tuo suggerimento e perché pensi che sarebbe utile.',
      },
      {
        h: '🔗 Link',
        items: [
          'Informativa sulla privacy — /privacy',
          'Termini di servizio — /terms',
          'FAQ — /faq',
          'Pagina iniziale — /',
        ],
      },
    ],
  },
  ja: {
    title: 'サポート',
    subtitle: 'OptimaPDFの成長を支援する方法。',
    donateSection: {
      h: '☕️ コーヒーを奢る',
      p: 'OptimaPDFは無料であり、今後も無料です。当社のツールが有用であると感じていただけた場合は、任意の寄付によるサイト開発のサポートをお願いいたします。金額の大小を問わず、サーバー、API、ドメインのコストをカバーするのに役立ちます。義務はありません — これは純粋な任意のサポートです。',
      button: '☕️ コーヒーを奢る',
      note: '支払いはStripeによって安全に処理されます。アカウントは不要です。',
      badgeLabel: 'OptimaPDFのサポーターですか？',
      badgeDesc: '寄付を行った場合、「Supporter」バッジをリクエストできます — 取引確認メールをお送りいただければ、サイトのサポーターリストに追加いたします。',
    },
    sections: [
      {
        h: '📧 メールでのお問い合わせ',
        p: 'こちらへご連絡ください：',
        link: 'mailto:kontakt@optimapdf.com',
        linkText: 'kontakt@optimapdf.com',
      },
      {
        h: '❓ よくあるご質問',
        p: 'お問い合わせの前に、よくあるご質問ページをご確認ください — ツール、プライバシー、サイトの仕組みに関する一般的な質問への回答が見つかります。',
        link: '/faq',
        linkText: 'よくあるご質問へ →',
      },
      {
        h: '🐛 バグ報告',
        p: 'ツールのいずれかでバグを見つけた場合は、できる限り正確に記述してください：',
        items: [
          'どのツールとどの操作がエラーを引き起こしていますか？',
          'どのブラウザとオペレーティングシステムを使用していますか？',
          '特定のファイルでエラーが発生しますか？（もしそうなら、サイズとページ数は？）',
          'ブラウザコンソール（F12 → Console）に赤いエラーはありますか？',
        ],
      },
      {
        h: '💡 機能の提案',
        p: '新ツールや既存ツールの改善のアイデアがありますか？ぜひお聞かせください！ご提案内容と、それが有用だと思う理由を簡単に記述してください。',
      },
      {
        h: '🔗 リンク',
        items: [
          'プライバシーポリシー — /privacy',
          '利用規約 — /terms',
          'よくあるご質問 — /faq',
          'ホームページ — /',
        ],
      },
    ],
  },
  no: {
    title: 'Støtte',
    subtitle: 'Hvordan du kan hjelpe OptimaPDF å vokse.',
    donateSection: {
      h: '☕️ Kjøp oss en kaffe',
      p: 'OptimaPDF er gratis og vil forbli gratis. Hvis du finner verktøyene våre nyttige, kan du støtte utviklingen av siden med en frivillig donasjon. Ethvert beløp, uansett hvor lite, bidrar til å dekke kostnadene for server, API og domene. Det er ingen forpliktelser — dette er rent frivillig støtte.',
      button: '☕️ Kjøp kaffe',
      note: 'Betalinger behandles sikkert av Stripe. Ingen konto kreves.',
      badgeLabel: 'Er du en OptimaPDF-støtteperson?',
      badgeDesc: 'Hvis du har gjort en donasjon, kan du be om et "Supporter"-merke — send oss en e-post med transaksjonsbekreftelsen din, så legger vi deg til på supporterlisten på siden.',
    },
    sections: [
      {
        h: '📧 E-postkontakt',
        p: 'Skriv til oss på:',
        link: 'mailto:kontakt@optimapdf.com',
        linkText: 'kontakt@optimapdf.com',
      },
      {
        h: '❓ Ofte stilte spørsmål',
        p: 'Før du kontakter oss, sjekk FAQ-siden vår — du finner svar på vanlige spørsmål om verktøy, personvern og hvordan siden fungerer.',
        link: '/faq',
        linkText: 'Gå til FAQ →',
      },
      {
        h: '🐛 Feilmelding',
        p: 'Hvis du fant en feil i noen av verktøyene, vennligst beskriv den så nøyaktig som mulig:',
        items: [
          'Hvilket verktøy og hvilken operasjon forårsaker feilen?',
          'Hvilken nettleser og operativsystem bruker du?',
          'Skjer feilen med en bestemt fil? (i så fall, hva er størrelsen og antall sider)',
          'Er det noen røde feil i nettleserkonsollen (F12 → Console)?',
        ],
      },
      {
        h: '💡 Funksjonsforslag',
        p: 'Har du en idé til et nytt verktøy eller en forbedring av et eksisterende? Vi vil gjerne høre det! Beskriv forslaget ditt kort og hvorfor du tror det ville være nyttig.',
      },
      {
        h: '🔗 Lenker',
        items: [
          'Personvernregler — /privacy',
          'Vilkår for tjenesten — /terms',
          'FAQ — /faq',
          'Hjemmeside — /',
        ],
      },
    ],
  },
  pt: {
    title: 'Apoio',
    subtitle: 'Como você pode ajudar o OptimaPDF a crescer.',
    donateSection: {
      h: '☕️ Compre-nos um café',
      p: 'O OptimaPDF é gratuito e continuará sendo. Se você acha nossas ferramentas úteis, você pode apoiar o desenvolvimento do site com uma doação voluntária. Qualquer valor, por menor que seja, ajuda a cobrir os custos de servidor, API e domínio. Não há obrigações — é puramente apoio voluntário.',
      button: '☕️ Comprar café',
      note: 'Pagamentos processados com segurança pela Stripe. Nenhuma conta necessária.',
      badgeLabel: 'Você é um apoiador do OptimaPDF?',
      badgeDesc: 'Se você fez uma doação, pode solicitar um distintivo "Supporter" — nos envie um e-mail com a confirmação da sua transação e adicionaremos você à lista de apoiadores no site.',
    },
    sections: [
      {
        h: '📧 Contato por e-mail',
        p: 'Escreva para nós em:',
        link: 'mailto:kontakt@optimapdf.com',
        linkText: 'kontakt@optimapdf.com',
      },
      {
        h: '❓ Perguntas frequentes',
        p: 'Antes de entrar em contato, consulte nossa página de FAQ — você encontrará respostas a perguntas comuns sobre ferramentas, privacidade e como o site funciona.',
        link: '/faq',
        linkText: 'Ir para FAQ →',
      },
      {
        h: '🐛 Relatório de erro',
        p: 'Se você encontrou um erro em qualquer uma das ferramentas, por favor descreva-o com o máximo de precisão possível:',
        items: [
          'Qual ferramenta e qual operação causa o erro?',
          'Qual navegador e sistema operacional você está usando?',
          'O erro ocorre com um arquivo específico? (se sim, qual é seu tamanho e número de páginas)',
          'Há erros vermelhos no console do navegador (F12 → Console)?',
        ],
      },
      {
        h: '💡 Sugestão de funcionalidade',
        p: 'Você tem uma ideia para uma nova ferramenta ou uma melhoria em uma existente? Adoraríamos ouvi-la! Descreva brevemente sua sugestão e por que acha que seria útil.',
      },
      {
        h: '🔗 Links',
        items: [
          'Política de Privacidade — /privacy',
          'Termos de Serviço — /terms',
          'FAQ — /faq',
          'Página Inicial — /',
        ],
      },
    ],
  },
  sv: {
    title: 'Stöd',
    subtitle: 'Hjälp OptimaPDF att växa.',
    donateSection: {
      h: '☕️ Bjud oss på kaffe',
      p: 'OptimaPDF är gratis och kommer att förbli gratis. Om du finner våra verktyg användbara kan du stöda utvecklingen av webbplatsen med en frivillig donation. Varje belopp, oavsett hur litet, hjälper till att täcka kostnaderna för server, API och domän. Det finns inga åtaganden — detta är rent frivilligt stöd.',
      button: '☕️ Bjud på kaffe',
      note: 'Betalningar hanteras säkert av Stripe. Inget konto krävs.',
      badgeLabel: 'Är du en OptimaPDF-stödjare?',
      badgeDesc: 'Om du har gjort en donation kan du begära en "Supporter"-bricka — skicka oss ett e-postmeddelande med din transaktionsbekräftelse så lägger vi dig till på stödjarelistan på webbplatsen.',
    },
    sections: [
      {
        h: '📧 E-postkontakt',
        p: 'Skriv till oss på:',
        link: 'mailto:kontakt@optimapdf.com',
        linkText: 'kontakt@optimapdf.com',
      },
      {
        h: '❓ Vanliga frågor',
        p: 'Innan du kontakter oss, besök vår FAQ-sida — du hittar svar på vanliga frågor om verktyg, integritet och hur webbplatsen fungerar.',
        link: '/faq',
        linkText: 'Gå till FAQ →',
      },
      {
        h: '🐛 Felrapport',
        p: 'Om du hittade ett fel i något av verktygen, vänligen beskriv det så noggrant som möjligt:',
        items: [
          'Vilket verktyg och vilken operation orsakar felet?',
          'Vilken webbläsare och operativsystem använder du?',
          'Förekommer felet med en specifik fil? (i så fall, vad är dess storlek och sidantal)',
          'Finns det några röda fel i webbläsrarkonsolen (F12 → Console)?',
        ],
      },
      {
        h: '💡 Funktionsförslag',
        p: 'Har du en idé till ett nytt verktyg eller en förbättring av ett befintligt? Vi skulle gärna höra det! Beskriv kort ditt förslag och varför du tror det skulle vara användbart.',
      },
      {
        h: '🔗 Länkar',
        items: [
          'Integritetspolicy — /privacy',
          'Användarvillkor — /terms',
          'FAQ — /faq',
          'Hemsida — /',
        ],
      },
    ],
  },
  tr: {
    title: 'Destek',
    subtitle: 'OptimaPDF\'in büyümesine nasıl yardımcı olabilirsiniz.',
    donateSection: {
      h: '☕️ Bize bir kahve ısmarlayın',
      p: 'OptimaPDF ücretsizdir ve ücretsiz kalacaktır. Araçlarımızı faydalı bulursanız, sitenin gelişimini gönüllü bir bağışla destekleyebilirsiniz. Herhangi bir miktar, ne kadar küçük olursa olsun, sunucu, API ve alan adı maliyetlerini karşılamaya yardımcı olur. Herhangi bir zorunluluk yoktur — bu tamamen gönüllü bir destektir.',
      button: '☕️ Kahve ısmarla',
      note: 'Ödemeler Stripe tarafından güvenli bir şekilde işlenir. Hesap gerekmez.',
      badgeLabel: 'Bir OptimaPDF destekçisi misiniz?',
      badgeDesc: 'Bir bağış yaptıysanız, "Supporter" rozeti talep edebilirsiniz — işlem onayınızla bize bir e-posta gönderin ve sizi site destekçi listesine ekleyelim.',
    },
    sections: [
      {
        h: '📧 E-posta ile iletişim',
        p: 'Bize yazın:',
        link: 'mailto:kontakt@optimapdf.com',
        linkText: 'kontakt@optimapdf.com',
      },
      {
        h: '❓ Sıkça sorulan sorular',
        p: 'Bize ulaşmadan önce SSS sayfamıza göz atın — araçlar, gizlilik ve sitenin nasıl çalıştığına dair sık sorulan soruların yanıtlarını bulacaksınız.',
        link: '/faq',
        linkText: 'SSS sayfasına git →',
      },
      {
        h: '🐛 Hata raporu',
        p: 'Herhangi bir araçta bir hata bulduysanız, lütfen mümkün olduğunca doğru bir şekilde açıklayın:',
        items: [
          'Hangi araç ve hangi işlem hataya neden oluyor?',
          'Hangi tarayıcıyı ve işletim sistemini kullanıyorsunuz?',
          'Hata belirli bir dosya ile mi oluşuyor? (evetse, boyutu ve sayfa sayısı nedir)',
          'Tarayıcı konsolunda (F12 → Console) kırmızı hatalar var mı?',
        ],
      },
      {
        h: '💡 Özellik önerisi',
        p: 'Yeni bir araç veya mevcut bir araç için iyileştirme fikriniz mi var? Duymak isteriz! Önerinizi kısaca açıklayın ve neden faydalı olacağını düşünüyorsunuz.',
      },
      {
        h: '🔗 Bağlantılar',
        items: [
          'Gizlilik Politikası — /privacy',
          'Hizmet Şartları — /terms',
          'SSS — /faq',
          'Ana Sayfa — /',
        ],
      },
    ],
  },
  zh: {
    title: '支持',
    subtitle: '您可以如何帮助 OptimaPDF 成长。',
    donateSection: {
      h: '☕️ 请我们喝杯咖啡',
      p: 'OptimaPDF 是免费的，将来也会继续保持免费。如果您觉得我们的工具有用，可以通过自愿捐赠来支持网站的发展。无论金额大小，都有助于支付服务器、API 和域名的费用。没有义务——这完全是自愿的支持。',
      button: '☕️ 请喝咖啡',
      note: '付款由 Stripe 安全处理。无需账户。',
      badgeLabel: '您是 OptimaPDF 的支持者吗？',
      badgeDesc: '如果您进行了捐赠，可以申请"Supporter"徽章——将交易确认发送给我们，我们将把您添加到网站的支持者列表中。',
    },
    sections: [
      {
        h: '📧 电子邮件联系',
        p: '写信给我们：',
        link: 'mailto:kontakt@optimapdf.com',
        linkText: 'kontakt@optimapdf.com',
      },
      {
        h: '❓ 常见问题',
        p: '在联系我们之前，请查看我们的常见问题页面——您将找到有关工具、隐私和网站运作方式的常见问题解答。',
        link: '/faq',
        linkText: '前往常见问题 →',
      },
      {
        h: '🐛 错误报告',
        p: '如果您在任何工具中发现了错误，请尽可能准确地描述它：',
        items: [
          '哪个工具和哪个操作导致了错误？',
          '您使用的是什么浏览器和操作系统？',
          '错误是否针对特定文件？（如果是，文件大小和页数是多少）',
          '浏览器控制台（F12 → Console）中是否有红色错误？',
        ],
      },
      {
        h: '💡 功能建议',
        p: '您有新工具或改进现有工具的想法吗？我们很想听听！请简要描述您的建议以及您认为它有用的原因。',
      },
      {
        h: '🔗 链接',
        items: [
          '隐私政策 — /privacy',
          '服务条款 — /terms',
          '常见问题 — /faq',
          '主页 — /',
        ],
      },
    ],
  },
};

export default function SupportPage({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const { locale: detectedLocale } = useLocale();
  const locale = forcedLocale || detectedLocale;
  const lang = (content as Record<string, typeof content.pl>)[locale] || content.en;

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">💬</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{lang.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">{lang.subtitle}</p>
      </div>

      <div className="tool-card rounded-2xl border p-8 space-y-8 text-sm leading-relaxed" style={{ color: 'var(--coffee-text-secondary)' }}>
        {/* Donation section — prominent, at the top */}
        <section className="text-center pb-6 border-b" style={{ borderColor: 'var(--coffee-border)' }}>
          <h2 className="text-xl font-bold tool-heading mb-3">{lang.donateSection.h}</h2>
          <p className="mb-4 max-w-lg mx-auto">{lang.donateSection.p}</p>
          <a
            href={STRIPE_DONATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--coffee-accent)', color: '#fff' }}
          >
            {lang.donateSection.button}
          </a>
          <p className="mt-2 text-xs opacity-60">{lang.donateSection.note}</p>
          {IS_TEST_MODE && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide"
              style={{ backgroundColor: '#fef08a', color: '#854d0e', border: '1px solid #facc15' }}>
              ⚠️ TRYB TESTOWY (Stripe Sandbox)
            </div>
          )}
        </section>

        {/* Supporter badge info */}
        <section className="text-center">
          <h2 className="text-lg font-bold tool-heading mb-2">🏅 {lang.donateSection.badgeLabel}</h2>
          <p className="max-w-lg mx-auto">{lang.donateSection.badgeDesc}</p>
          {SUPPORTER_BADGE_URL && (
            <div className="mt-4 flex justify-center gap-4 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border" style={{ borderColor: 'var(--coffee-border)', backgroundColor: 'var(--coffee-badge-bg)' }}>
                <span>⭐</span> Supporter
              </span>
            </div>
          )}
        </section>

        {/* Other sections */}
        {lang.sections.map((sec, i) => (
          <section key={i} className="pt-2">
            <h2 className="text-lg sm:text-xl font-bold tool-heading mb-3">{sec.h}</h2>
            <p className="mb-2">{sec.p}</p>
            {sec.link && (
              <p>
                <a href={`/${locale}${sec.link}`} className="!text-[var(--coffee-accent)] hover:underline font-medium">
                  {sec.linkText}
                </a>
              </p>
            )}
            {sec.items && (
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                {sec.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link href={`/${locale}`} className="!text-[var(--coffee-accent)] hover:underline text-sm">
          {t('back.to_home', locale)}
        </Link>
      </div>
    </main>
  );
}
