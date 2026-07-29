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
  de: {
    title: 'Unterstützung',
    subtitle: 'Wie Sie OptimaPDF beim Wachsen helfen können.',
    donateSection: {
      h: '☕️ Spendieren Sie uns einen Kaffee',
      p: 'OptimaPDF ist kostenlos und wird kostenlos bleiben. Wenn Sie unsere Werkzeuge nützlich finden, können Sie die Entwicklung der Seite mit einer freiwilligen Spende unterstützen. Jeder Betrag, egal wie klein, hilft, die Kosten für Server, API und Domain zu decken. Es gibt keine Verpflichtungen — dies ist rein freiwillige Unterstützung.',
      button: '☕️ Spendieren Sie uns einen Kaffee',
      note: 'Payments processed securely by Stripe. No account required.',
      badgeLabel: 'Sind Sie ein OptimaPDF-Unterstützer?',
      badgeDesc: 'Wenn Sie eine Spende getätigt haben, können Sie ein "Supporter"-Abzeichen anfordern — senden Sie uns eine E-Mail mit Ihrer Transaktionsbestätigung und wir werden Sie zur Unterstützerliste auf der Seite hinzufügen.',
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
        p: 'Bevor Sie uns kontaktieren, werfen Sie einen Blick auf unsere FAQ-Seite — dort finden Sie Antworten auf häufige Fragen zu den Werkzeugen, zum Datenschutz und zur Funktionsweise der Seite.',
        link: '/faq',
        linkText: 'Zum FAQ →',
      },
      {
        h: '🐛 Fehler melden',
        p: 'Wenn Sie einen Fehler in einem der Werkzeuge gefunden haben, beschreiben Sie ihn bitte so genau wie möglich:',
        items: [
          'Welches Werkzeug und welcher Vorgang verursacht den Fehler?',
          'Welchen Browser und welches Betriebssystem verwenden Sie?',
          'Tritt der Fehler bei einer bestimmten Datei auf? (falls ja, welche Größe und Seitenanzahl hat sie?)',
          'Gibt es rote Fehler in der Browser-Konsole (F12 → Konsole)?',
        ],
      },
      {
        h: '💡 Funktionsvorschlag',
        p: 'Haben Sie eine Idee für ein neues Werkzeug oder eine Verbesserung eines bestehenden? Wir würden uns freuen, davon zu hören! Beschreiben Sie kurz Ihren Vorschlag und warum Sie denken, dass er nützlich wäre.',
      },
      {
        h: '🔗 Links',
        items: [
          'Datenschutzerklärung — /privacy',
          'Nutzungsbedingungen — /terms',
          'FAQ — /faq',
          'Startseite — /',
        ],
      },
    ],
  },
  es: {
    title: 'Apoyo',
    subtitle: 'Cómo puede ayudar a que OptimaPDF crezca.',
    donateSection: {
      h: '☕️ Invítenos a un café',
      p: 'OptimaPDF es gratuito y seguirá siéndolo. Si encuentra útiles nuestras herramientas, puede apoyar el desarrollo del sitio con una donación voluntaria. Cualquier cantidad, por pequeña que sea, ayuda a cubrir los costos del servidor, la API y el dominio. No hay obligaciones — esto es apoyo puramente voluntario.',
      button: '☕️ Invítenos a un café',
      note: 'Pagos procesados de forma segura por Stripe. No se requiere cuenta.',
      badgeLabel: '¿Es usted un colaborador de OptimaPDF?',
      badgeDesc: 'Si ha realizado una donación, puede solicitar una insignia de "Supporter" — envíenos un correo electrónico con la confirmación de su transacción y lo añadiremos a la lista de colaboradores en el sitio.',
    },
    sections: [
      {
        h: '📧 Contacto por correo electrónico',
        p: 'Escríbanos a:',
        link: 'mailto:kontakt@optimapdf.com',
        linkText: 'kontakt@optimapdf.com',
      },
      {
        h: '❓ Preguntas frecuentes',
        p: 'Antes de contactarnos, consulte nuestra página de preguntas frecuentes — allí encontrará respuestas a las preguntas más comunes sobre las herramientas, la privacidad y el funcionamiento del sitio.',
        link: '/faq',
        linkText: 'Ir a preguntas frecuentes →',
      },
      {
        h: '🐛 Informar de un error',
        p: 'Si ha encontrado un error en alguna de las herramientas, descríbalo con la mayor precisión posible:',
        items: [
          '¿Qué herramienta y qué operación causa el error?',
          '¿Qué navegador y sistema operativo está utilizando?',
          '¿El error ocurre con un archivo específico? (en caso afirmativo, ¿cuál es su tamaño y número de páginas?)',
          '¿Aparecen errores en rojo en la consola del navegador (F12 → Consola)?',
        ],
      },
      {
        h: '💡 Sugerencia de función',
        p: '¿Tiene una idea para una nueva herramienta o una mejora de una existente? ¡Nos encantaría conocerla! Describa brevemente su sugerencia y por qué cree que sería útil.',
      },
      {
        h: '🔗 Enlaces',
        items: [
          'Política de privacidad — /privacy',
          'Términos de servicio — /terms',
          'Preguntas frecuentes — /faq',
          'Página de inicio — /',
        ],
      },
    ],
  },
  pt: {
    title: 'Apoio',
    subtitle: 'Como pode ajudar o OptimaPDF a crescer.',
    donateSection: {
      h: '☕️ Ofereça-nos um café',
      p: 'O OptimaPDF é gratuito e continuará a ser gratuito. Se achar as nossas ferramentas úteis, pode apoiar o desenvolvimento do site com um donativo voluntário. Qualquer montante, por mais pequeno que seja, ajuda a cobrir os custos do servidor, da API e do domínio. Não há obrigações — isto é um apoio puramente voluntário.',
      button: '☕️ Ofereça-nos um café',
      note: 'Pagamentos processados de forma segura pela Stripe. Não é necessária conta.',
      badgeLabel: 'É um apoiante do OptimaPDF?',
      badgeDesc: 'Se fez um donativo, pode solicitar um crachá de "Supporter" — envie-nos um e-mail com a confirmação da sua transação e adicioná-lo-emos à lista de apoiantes no site.',
    },
    sections: [
      {
        h: '📧 Contacto por e-mail',
        p: 'Escreva-nos para:',
        link: 'mailto:kontakt@optimapdf.com',
        linkText: 'kontakt@optimapdf.com',
      },
      {
        h: '❓ Perguntas frequentes',
        p: 'Antes de nos contactar, consulte a nossa página de perguntas frequentes — encontrará respostas a perguntas comuns sobre as ferramentas, a privacidade e o funcionamento do site.',
        link: '/faq',
        linkText: 'Ir para perguntas frequentes →',
      },
      {
        h: '🐛 Reportar um erro',
        p: 'Se encontrou um erro numa das ferramentas, por favor descreva-o com a maior precisão possível:',
        items: [
          'Qual ferramenta e qual operação causa o erro?',
          'Qual navegador e sistema operativo está a utilizar?',
          'O erro ocorre com um ficheiro específico? (em caso afirmativo, qual é o seu tamanho e número de páginas?)',
          'Aparecem erros a vermelho na consola do navegador (F12 → Consola)?',
        ],
      },
      {
        h: '💡 Sugestão de funcionalidade',
        p: 'Tem uma ideia para uma nova ferramenta ou uma melhoria de uma existente? Gostaríamos muito de a conhecer! Descreva brevemente a sua sugestão e por que pensa que seria útil.',
      },
      {
        h: '🔗 Ligações',
        items: [
          'Política de privacidade — /privacy',
          'Termos de serviço — /terms',
          'Perguntas frequentes — /faq',
          'Página inicial — /',
        ],
      },
    ],
  },
  no: {
    title: 'Støtte',
    subtitle: 'Hvordan du kan hjelpe OptimaPDF med å vokse.',
    donateSection: {
      h: '☕️ Kjøp oss en kaffe',
      p: 'OptimaPDF er gratis og vil forbli gratis. Hvis du finner verktøyene våre nyttige, kan du støtte utviklingen av nettstedet med en frivillig donasjon. Ethvert beløp, uansett hvor lite, hjelper til med å dekke kostnader til server, API og domene. Det er ingen forpliktelser — dette er rent frivillig støtte.',
      button: '☕️ Kjøp oss en kaffe',
      note: 'Betalinger behandles sikkert via Stripe. Ingen konto nødvendig.',
      badgeLabel: 'Er du en OptimaPDF-støttespiller?',
      badgeDesc: 'Hvis du har gitt en donasjon, kan du be om et "Supporter"-merke — send oss en e-post med bekreftelse på transaksjonen din, så legger vi deg til på støttespillerlisten på nettstedet.',
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
        p: 'Før du kontakter oss, sjekk vår FAQ-side — du finner svar på vanlige spørsmål om verktøyene, personvern og hvordan nettstedet fungerer.',
        link: '/faq',
        linkText: 'Gå til FAQ →',
      },
      {
        h: '🐛 Rapporter en feil',
        p: 'Hvis du har funnet en feil i noen av verktøyene, vennligst beskriv den så nøyaktig som mulig:',
        items: [
          'Hvilket verktøy og hvilken operasjon forårsaker feilen?',
          'Hvilken nettleser og operativsystem bruker du?',
          'Oppstår feilen med en bestemt fil? (i så fall, hva er størrelsen og antall sider?)',
          'Er det noen røde feil i nettleserkonsollen (F12 → Konsoll)?',
        ],
      },
      {
        h: '💡 Funksjonsforslag',
        p: 'Har du en idé til et nytt verktøy eller en forbedring av et eksisterende? Vi vil gjerne høre om det! Beskriv kort forslaget ditt og hvorfor du tror det ville være nyttig.',
      },
      {
        h: '🔗 Lenker',
        items: [
          'Personvernerklæring — /privacy',
          'Bruksvilkår — /terms',
          'FAQ — /faq',
          'Hjemmeside — /',
        ],
      },
    ],
  },
  sv: {
    title: 'Stöd',
    subtitle: 'Hur du kan hjälpa OptimaPDF att växa.',
    donateSection: {
      h: '☕️ Bjud oss på en kaffe',
      p: 'OptimaPDF är gratis och kommer att förbli gratis. Om du tycker att våra verktyg är användbara kan du stödja utvecklingen av webbplatsen med en frivillig donation. Varje belopp, oavsett hur litet, hjälper till att täcka kostnader för server, API och domän. Det finns inga förpliktelser — detta är rent frivilligt stöd.',
      button: '☕️ Bjud oss på en kaffe',
      note: 'Betalningar behandlas säkert via Stripe. Inget konto krävs.',
      badgeLabel: 'Är du en OptimaPDF-supporter?',
      badgeDesc: 'Om du har gjort en donation kan du begära ett "Supporter"-märke — skicka oss ett e-postmeddelande med din transaktionsbekräftelse så lägger vi till dig på supporterlistan på webbplatsen.',
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
        p: 'Innan du kontaktar oss, kolla vår FAQ-sida — du hittar svar på vanliga frågor om verktygen, integritet och hur webbplatsen fungerar.',
        link: '/faq',
        linkText: 'Gå till FAQ →',
      },
      {
        h: '🐛 Rapportera ett fel',
        p: 'Om du har hittat ett fel i något av verktygen, vänligen beskriv det så noggrant som möjligt:',
        items: [
          'Vilket verktyg och vilken operation orsakar felet?',
          'Vilken webbläsare och vilket operativsystem använder du?',
          'Uppstår felet med en specifik fil? (i så fall, vad är dess storlek och antal sidor?)',
          'Finns det några röda fel i webbläsarkonsolen (F12 → Konsol)?',
        ],
      },
      {
        h: '💡 Funktionsförslag',
        p: 'Har du en idé för ett nytt verktyg eller en förbättring av ett befintligt? Vi vill gärna höra om det! Beskriv kort ditt förslag och varför du tror att det skulle vara användbart.',
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
  fr: {
    title: 'Soutien',
    subtitle: 'Comment vous pouvez aider OptimaPDF à se développer.',
    donateSection: {
      h: '☕️ Offrez-nous un café',
      p: 'OptimaPDF est gratuit et le restera. Si vous trouvez nos outils utiles, vous pouvez soutenir le développement du site par un don volontaire. Chaque montant, aussi petit soit-il, aide à couvrir les coûts du serveur, de l’API et du domaine. Il n’y a aucune obligation — il s’agit d’un soutien purement volontaire.',
      button: '☕️ Offrez-nous un café',
      note: 'Paiements traités en toute sécurité par Stripe. Aucun compte requis.',
      badgeLabel: 'Êtes-vous un supporter d’OptimaPDF ?',
      badgeDesc: 'Si vous avez effectué un don, vous pouvez demander un badge "Supporter" — envoyez-nous un e-mail avec la confirmation de votre transaction et nous vous ajouterons à la liste des supporters sur le site.',
    },
    sections: [
      {
        h: '📧 Contact par e-mail',
        p: 'Écrivez-nous à :',
        link: 'mailto:kontakt@optimapdf.com',
        linkText: 'kontakt@optimapdf.com',
      },
      {
        h: '❓ Questions fréquentes',
        p: 'Avant de nous contacter, consultez notre page FAQ — vous y trouverez des réponses aux questions courantes sur les outils, la confidentialité et le fonctionnement du site.',
        link: '/faq',
        linkText: 'Aller à la FAQ →',
      },
      {
        h: '🐛 Signaler un bug',
        p: 'Si vous avez trouvé un bug dans l’un des outils, veuillez le décrire aussi précisément que possible :',
        items: [
          'Quel outil et quelle opération provoque l’erreur ?',
          'Quel navigateur et quel système d’exploitation utilisez-vous ?',
          'L’erreur se produit-elle avec un fichier spécifique ? (si oui, quelle est sa taille et son nombre de pages ?)',
          'Y a-t-il des erreurs rouges dans la console du navigateur (F12 → Console) ?',
        ],
      },
      {
        h: '💡 Suggestion de fonctionnalité',
        p: 'Vous avez une idée pour un nouvel outil ou une amélioration d’un outil existant ? Nous aimerions beaucoup la connaître ! Décrivez brièvement votre suggestion et pourquoi vous pensez qu’elle serait utile.',
      },
      {
        h: '🔗 Liens',
        items: [
          'Politique de confidentialité — /privacy',
          'Conditions d’utilisation — /terms',
          'FAQ — /faq',
          'Page d’accueil — /',
        ],
      },
    ],
  },
  ar: {
    title: 'الدعم',
    subtitle: 'كيف يمكنك المساعدة في تطوير OptimaPDF.',
    donateSection: {
      h: '☕️ اشتر لنا قهوة',
      p: 'OptimaPDF مجاني وسيظل مجانياً. إذا وجدت أدواتنا مفيدة، يمكنك دعم تطوير الموقع من خلال تبرع اختياري. أي مبلغ، مهما كان صغيراً، يساعد في تغطية تكاليف الخادم وواجهة API والنطاق. لا يوجد أي التزام — هذا دعم تطوعي بحت.',
      button: '☕️ اشتر لنا قهوة',
      note: 'تتم معالجة المدفوعات بشكل آمن عبر Stripe. لا حاجة لحساب.',
      badgeLabel: 'هل أنت أحد داعمي OptimaPDF؟',
      badgeDesc: 'إذا قمت بالتبرع، يمكنك طلب شارة "Supporter" — أرسل لنا بريداً إلكترونياً مع تأكيد المعاملة وسنضيفك إلى قائمة الداعمين على الموقع.',
    },
    sections: [
      {
        h: '📧 الاتصال عبر البريد الإلكتروني',
        p: 'اكتب لنا على:',
        link: 'mailto:kontakt@optimapdf.com',
        linkText: 'kontakt@optimapdf.com',
      },
      {
        h: '❓ الأسئلة الشائعة',
        p: 'قبل الاتصال بنا، تفضل بزيارة صفحة الأسئلة الشائعة — ستجد إجابات للأسئلة الشائعة حول الأدوات والخصوصية وكيفية عمل الموقع.',
        link: '/faq',
        linkText: 'انتقل إلى الأسئلة الشائعة ←',
      },
      {
        h: '🐛 الإبلاغ عن خطأ',
        p: 'إذا وجدت خطأ في إحدى الأدوات، يرجى وصفه بأكبر قدر ممكن من الدقة:',
        items: [
          'ما الأداة وأي عملية تسبب الخطأ؟',
          'ما المتصفح ونظام التشغيل الذي تستخدمه؟',
          'هل يحدث الخطأ مع ملف معين؟ (إذا كان الأمر كذلك، ما حجمه وعدد صفحاته؟)',
          'هل توجد أي أخطاء حمراء في وحدة تحكم المتصفح (F12 → Console)؟',
        ],
      },
      {
        h: '💡 اقتراح ميزة',
        p: 'هل لديك فكرة لأداة جديدة أو تحسين لأداة موجودة؟ يسعدنا جداً سماعها! صف باقتضاب اقتراحك ولماذا تعتقد أنه سيكون مفيداً.',
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
};

export default function SupportPage({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const { locale: detectedLocale } = useLocale();
  const locale = forcedLocale || detectedLocale;
  const lang = (content as Record<string, typeof content.pl>)[locale] || content.en;
  const isRtl = locale === 'ar' || locale === 'fa';

  return (
    <main className="max-w-3xl mx-auto px-4 py-12" dir={isRtl ? 'rtl' : 'ltr'}>
      {isRtl && (
        <style>{`
          .wsparcie-rtl ul { padding-right: 1.25rem; padding-left: 0; }
          .wsparcie-rtl ol { padding-right: 1.25rem; padding-left: 0; }
          .wsparcie-rtl { text-align: right; }
        `}</style>
      )}
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">💬</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{lang.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">{lang.subtitle}</p>
      </div>

      <div className={`tool-card rounded-2xl border p-8 space-y-8 text-sm leading-relaxed ${isRtl ? 'wsparcie-rtl' : ''}`} style={{ color: 'var(--coffee-text-secondary)' }}>
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
              <ul className={`list-disc space-y-1.5 mt-2 ${isRtl ? 'pr-5' : 'pl-5'}`}>
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
