'use client';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';

interface Section {
  h: string;
  p?: string;
  pStart?: string;
  linkLabel?: string;
  pEnd?: string;
}

const content: Record<string, { title: string; subtitle: string; sections: Section[] }> = {
  pl: {
    title: 'Nasze zasady',
    subtitle: 'Jak budujemy OptimaPDF — przejrzyście i uczciwie.',
    sections: [
      {
        h: '1. W 100% darmowe dla każdego użytkownika',
        p: 'Wszystkie 40+ narzędzi PDF oraz funkcje AI (w ramach dziennego limitu) są i pozostaną bezpłatne — bez ukrytych opłat, bez karty płatniczej, bez rejestracji, bez subskrypcji do korzystania z narzędzi. W przyszłości planujemy oddzielny, płatny plan Optimapdf dla Firm z dodatkowymi funkcjami (wyższe limity AI, wsparcie priorytetowe, API). To nie zmienia niczego dla obecnych, darmowych funkcji — pozostają dostępne dla wszystkich bez opłat, tak jak teraz.',
      },
      {
        h: '2. Dlaczego istnieje limit AI (15 zapytań dziennie)?',
        p: 'Funkcje AI (Chat AI, Streszczenie AI, Tłumacz AI) są darmowe i nie wymagają własnego klucza API — każdy użytkownik otrzymuje 15 zapytań dziennie bez żadnych opłat. Limit istnieje, ponieważ każde zapytanie AI kosztuje nas pieniądze (opłaty za API OpenRouter). W przeciwieństwie do narzędzi PDF, które działają w 100% lokalnie w Twojej przeglądarce, AI wymaga komunikacji z zewnętrznym serwerem, co generuje rzeczywiste koszty operacyjne. Limit 15 zapytań dziennie pozwala nam oferować tę funkcję za darmo wszystkim użytkownikom, bez konieczności wprowadzania subskrypcji czy opłat. Jeśli potrzebujesz więcej, możesz skonfigurować własny klucz API OpenRouter — wówczas limit nie obowiązuje.',
      },
      {
        h: '3. Twoja prywatność jest najważniejsza',
        p: 'OptimaPDF został zaprojektowany zgodnie z zasadą privacy by design. Większość narzędzi przetwarza pliki w całości w Twojej przeglądarce — plik nigdy nie opuszcza Twojego urządzenia. Nie wymagamy rejestracji, logowania ani podawania jakichkolwiek danych osobowych.',
      },
      {
        h: '4. Przejrzystość techniczna',
        p: 'Informujemy, które narzędzia działają po stronie klienta (w przeglądarce), a które wymagają przetwarzania na serwerze. Zawsze jasno komunikujemy, co dzieje się z Twoim plikiem na każdym etapie.',
      },
      {
        h: '5. Bezpieczeństwo przede wszystkim',
        p: 'Stosujemy szyfrowanie TLS/SSL, Content Security Policy (CSP), przetwarzanie plików wyłącznie w pamięci RAM oraz automatyczne usuwanie danych po zakończeniu operacji. Nie przechowujemy plików na dyskach serwera.',
      },
      {
        h: '6. Reklamy i śledzenie — uczciwie i przejrzyście',
        p: 'Obecnie strona nie wyświetla żadnych reklam. W przyszłości możemy wprowadzić dyskretne reklamy (np. Google AdSense), żeby pokryć koszty utrzymania i rozwoju — jeśli to nastąpi, zaktualizujemy tę informację. Niezależnie od tego, wszystkie narzędzia PDF pozostaną darmowe i bez limitu. Google Analytics używamy wyłącznie za Twoją zgodą, w formie zanonimizowanej. Nie stosujemy pikseli remarketingowych ani profilowania behawioralnego.',
      },
      {
        h: 'Dobrowolne wsparcie',
        pStart: 'Możesz dobrowolnie wesprzeć rozwój OptimaPDF przez stronę ',
        linkLabel: 'Wsparcie',
        pEnd: '. To w pełni opcjonalne i nie wpływa na dostęp do żadnej funkcji — narzędzia pozostają darmowe niezależnie od tego, czy zdecydujesz się wesprzeć projekt.',
      },
      {
        h: '7. Otwartość na feedback',
        p: 'Tworzymy OptimaPDF z myślą o użytkownikach. Każda opinia, zgłoszenie błędu czy sugestia nowej funkcji jest dla nas cenna. Możesz skontaktować się z nami poprzez stronę wsparcia.',
      },
    ],
  },
  en: {
    title: 'Our Principles',
    subtitle: 'How we build OptimaPDF — transparently and fairly.',
    sections: [
      {
        h: '1. 100% free for every user',
        p: 'All 40+ PDF tools and AI features (within the daily limit) are and will remain free — no hidden fees, no credit card, no registration, no subscription required to use the tools. In the future, we plan a separate paid Optimapdf for Business plan with additional features (higher AI limits, priority support, API). This does not change anything for the current free features — they remain available to everyone at no charge, just as they are now.',
      },
      {
        h: '2. Why is there an AI limit (15 queries per day)?',
        p: 'AI features (AI Chat, AI Summary, AI Translate) are free and do not require your own API key — every user gets 15 queries per day at no charge. The limit exists because each AI query costs us money (OpenRouter API fees). Unlike PDF tools which work 100% locally in your browser, AI requires communication with an external server, generating real operational costs. The 15 queries per day limit allows us to offer this feature for free to all users without introducing subscriptions or fees. If you need more, you can configure your own OpenRouter API key — the limit does not apply then.',
      },
      {
        h: '3. Your privacy comes first',
        p: 'OptimaPDF is built on the privacy by design principle. Most tools process files entirely in your browser — the file never leaves your device. We do not require registration, login, or any personal data.',
      },
      {
        h: '4. Technical transparency',
        p: 'We clearly indicate which tools work client-side (in your browser) and which require server processing. We always communicate what happens to your file at every step.',
      },
      {
        h: '5. Security first',
        p: 'We use TLS/SSL encryption, Content Security Policy (CSP), RAM-only file processing, and automatic data deletion after each operation. We do not store files on server disks.',
      },
      {
        h: '6. Ads and tracking — fairly and transparently',
        p: 'Currently the site does not display any ads. In the future, we may introduce discreet ads (e.g. Google AdSense) to cover maintenance and development costs — if that happens, we will update this notice. Regardless, all PDF tools will remain free and unlimited. Google Analytics is used only with your consent and in anonymized form. We do not use remarketing pixels or behavioral profiling.',
      },
      {
        h: 'Voluntary support',
        pStart: "You can voluntarily support the development of OptimaPDF through the ",
        linkLabel: "Support",
        pEnd: " page. This is completely optional and does not affect access to any feature — tools remain free regardless of whether you choose to support the project.",
      },
      {
        h: '7. Open to feedback',
        p: 'We build OptimaPDF with our users in mind. Every opinion, bug report, or feature suggestion is valuable to us. You can contact us through the support page.',
      },
    ],
  },
  de: {
    title: 'Unsere Grundsätze',
    subtitle: 'Wie wir OptimaPDF aufbauen — transparent und fair.',
    sections: [
      {
        h: '1. 100 % kostenlos für jeden Nutzer',
        p: 'Alle 40+ PDF-Werkzeuge und KI-Funktionen (innerhalb des täglichen Limits) sind und bleiben kostenlos — ohne versteckte Gebühren, ohne Kreditkarte, ohne Registrierung, ohne Abonnement zur Nutzung der Werkzeuge. In Zukunft planen wir einen separaten, kostenpflichtigen Optimapdf für Unternehmen-Tarif mit zusätzlichen Funktionen (höhere KI-Limits, Prioritäts-Support, API). Dies ändert nichts an den derzeitigen kostenlosen Funktionen — sie bleiben für alle kostenlos verfügbar, genau wie jetzt.',
      },
      {
        h: '2. Warum gibt es ein KI-Limit (15 Anfragen pro Tag)?',
        p: 'KI-Funktionen (KI-Chat, KI-Zusammenfassung, KI-Übersetzer) sind kostenlos und erfordern keinen eigenen API-Schlüssel — jeder Nutzer erhält 15 Anfragen pro Tag kostenlos. Das Limit besteht, weil jede KI-Anfrage uns Geld kostet (OpenRouter-API-Gebühren). Im Gegensatz zu PDF-Werkzeugen, die zu 100 % lokal in Ihrem Browser arbeiten, benötigt KI die Kommunikation mit einem externen Server, was echte Betriebskosten verursacht. Das Limit von 15 Anfragen pro Tag ermöglicht es uns, diese Funktion allen Nutzern kostenlos anzubieten, ohne Abonnements oder Gebühren einführen zu müssen. Wenn Sie mehr benötigen, können Sie Ihren eigenen OpenRouter-API-Schlüssel konfigurieren — dann gilt das Limit nicht.',
      },
      {
        h: '3. Ihre Privatsphäre steht an erster Stelle',
        p: 'OptimaPDF wurde nach dem Privacy-by-Design-Prinzip entwickelt. Die meisten Werkzeuge verarbeiten Dateien vollständig in Ihrem Browser — die Datei verlässt niemals Ihr Gerät. Wir verlangen keine Registrierung, Anmeldung oder persönliche Daten.',
      },
      {
        h: '4. Technische Transparenz',
        p: 'Wir geben klar an, welche Werkzeuge clientseitig (im Browser) arbeiten und welche eine Serververarbeitung erfordern. Wir kommunizieren stets klar, was mit Ihrer Datei in jedem Schritt geschieht.',
      },
      {
        h: '5. Sicherheit steht an erster Stelle',
        p: 'Wir verwenden TLS/SSL-Verschlüsselung, Content Security Policy (CSP), RAM-only-Dateiverarbeitung und automatische Datenlöschung nach jedem Vorgang. Wir speichern keine Dateien auf Server-Festplatten.',
      },
      {
        h: '6. Werbung und Tracking — fair und transparent',
        p: 'Die Website zeigt derzeit keine Werbung an. In Zukunft könnten wir diskrete Anzeigen (z. B. Google AdSense) einführen, um Wartungs- und Entwicklungskosten zu decken — falls dies geschieht, werden wir diesen Hinweis aktualisieren. Unabhängig davon bleiben alle PDF-Werkzeuge kostenlos und unbegrenzt. Google Analytics wird nur mit Ihrer Zustimmung und in anonymisierter Form verwendet. Wir verwenden keine Remarketing-Pixel oder Verhaltensprofilierung.',
      },
      {
        h: 'Freiwillige Unterstützung',
        pStart: 'Sie können die Entwicklung von OptimaPDF freiwillig über die ',
        linkLabel: 'Support-Seite',
        pEnd: ' unterstützen. Dies ist völlig optional und hat keinen Einfluss auf den Zugriff auf Funktionen — die Werkzeuge bleiben kostenlos, unabhängig davon, ob Sie das Projekt unterstützen möchten.',
      },
      {
        h: '7. Offen für Feedback',
        p: 'Wir entwickeln OptimaPDF mit Blick auf unsere Nutzer. Jede Meinung, Fehlermeldung oder Funktionsanregung ist wertvoll für uns. Sie können uns über die Support-Seite kontaktieren.',
      },
    ],
  },
  es: {
    title: 'Nuestros principios',
    subtitle: 'Cómo construimos OptimaPDF — con transparencia y equidad.',
    sections: [
      {
        h: '1. 100 % gratuito para cada usuario',
        p: 'Las más de 40 herramientas PDF y las funciones de IA (dentro del límite diario) son y seguirán siendo gratuitas — sin cargos ocultos, sin tarjeta de crédito, sin registro, sin suscripción para usar las herramientas. En el futuro, planeamos un plan separado de pago Optimapdf para Empresas con funciones adicionales (límites de IA más altos, soporte prioritario, API). Esto no cambia nada para las funciones gratuitas actuales — siguen disponibles para todos sin costo, tal como ahora.',
      },
      {
        h: '2. ¿Por qué existe un límite de IA (15 consultas al día)?',
        p: 'Las funciones de IA (Chat IA, Resumen IA, Traductor IA) son gratuitas y no requieren su propia clave API — cada usuario recibe 15 consultas al día sin costo. El límite existe porque cada consulta de IA nos cuesta dinero (tarifas de API de OpenRouter). A diferencia de las herramientas PDF, que funcionan 100 % localmente en su navegador, la IA requiere comunicación con un servidor externo, generando costos operativos reales. El límite de 15 consultas al día nos permite ofrecer esta función de forma gratuita a todos los usuarios sin introducir suscripciones ni tarifas. Si necesita más, puede configurar su propia clave API de OpenRouter — entonces el límite no aplica.',
      },
      {
        h: '3. Su privacidad es lo primero',
        p: 'OptimaPDF está diseñado según el principio de privacidad desde el diseño. La mayoría de las herramientas procesan archivos completamente en su navegador — el archivo nunca sale de su dispositivo. No requerimos registro, inicio de sesión ni ningún dato personal.',
      },
      {
        h: '4. Transparencia técnica',
        p: 'Indicamos claramente qué herramientas funcionan del lado del cliente (en el navegador) y cuáles requieren procesamiento en el servidor. Siempre comunicamos claramente qué sucede con su archivo en cada paso.',
      },
      {
        h: '5. La seguridad ante todo',
        p: 'Utilizamos cifrado TLS/SSL, Política de Seguridad de Contenido (CSP), procesamiento de archivos solo en RAM y eliminación automática de datos después de cada operación. No almacenamos archivos en discos del servidor.',
      },
      {
        h: '6. Anuncios y rastreo — justa y transparentemente',
        p: 'Actualmente el sitio no muestra ningún anuncio. En el futuro, podríamos introducir anuncios discretos (p. ej., Google AdSense) para cubrir los costos de mantenimiento y desarrollo — si eso ocurre, actualizaremos este aviso. Independientemente de ello, todas las herramientas PDF seguirán siendo gratuitas e ilimitadas. Google Analytics se utiliza solo con su consentimiento y de forma anonimizada. No utilizamos píxeles de remarketing ni perfiles de comportamiento.',
      },
      {
        h: 'Apoyo voluntario',
        pStart: 'Puede apoyar voluntariamente el desarrollo de OptimaPDF a través de la página de ',
        linkLabel: 'Soporte',
        pEnd: '. Esto es completamente opcional y no afecta el acceso a ninguna función — las herramientas permanecen gratuitas independientemente de si decide apoyar el proyecto.',
      },
      {
        h: '7. Abiertos a comentarios',
        p: 'Construimos OptimaPDF pensando en nuestros usuarios. Cada opinión, informe de error o sugerencia de función es valiosa para nosotros. Puede contactarnos a través de la página de soporte.',
      },
    ],
  },
  fr: {
    title: 'Nos principes',
    subtitle: 'Comment nous construisons OptimaPDF — de manière transparente et équitable.',
    sections: [
      {
        h: '1. 100 % gratuit pour chaque utilisateur',
        p: 'Les 40+ outils PDF et les fonctionnalités IA (dans la limite quotidienne) sont et resteront gratuits — sans frais cachés, sans carte bancaire, sans inscription, sans abonnement pour utiliser les outils. À l\'avenir, nous prévoyons un plan payant séparé Optimapdf pour les Entreprises avec des fonctionnalités supplémentaires (limites IA plus élevées, support prioritaire, API). Cela ne change rien aux fonctionnalités gratuites actuelles — elles restent disponibles pour tous gratuitement, comme maintenant.',
      },
      {
        h: '2. Pourquoi y a-t-il une limite IA (15 requêtes par jour) ?',
        p: 'Les fonctionnalités IA (Chat IA, Résumé IA, Traduction IA) sont gratuites et ne nécessitent pas votre propre clé API — chaque utilisateur reçoit 15 requêtes par jour sans frais. La limite existe car chaque requête IA nous coûte de l\'argent (frais API OpenRouter). Contrairement aux outils PDF qui fonctionnent 100 % localement dans votre navigateur, l\'IA nécessite une communication avec un serveur externe, générant des coûts opérationnels réels. La limite de 15 requêtes par jour nous permet d\'offrir cette fonctionnalité gratuitement à tous les utilisateurs sans introduire d\'abonnements ni de frais. Si vous avez besoin de plus, vous pouvez configurer votre propre clé API OpenRouter — la limite ne s\'applique alors plus.',
      },
      {
        h: '3. Votre vie privée est primordiale',
        p: 'OptimaPDF est conçu selon le principe de confidentialité dès la conception. La plupart des outils traitent les fichiers entièrement dans votre navigateur — le fichier ne quitte jamais votre appareil. Nous n\'exigeons ni inscription, ni connexion, ni données personnelles.',
      },
      {
        h: '4. Transparence technique',
        p: 'Nous indiquons clairement quels outils fonctionnent côté client (dans le navigateur) et lesquels nécessitent un traitement sur serveur. Nous communiquons toujours clairement ce qu\'il advient de votre fichier à chaque étape.',
      },
      {
        h: '5. La sécurité avant tout',
        p: 'Nous utilisons le chiffrement TLS/SSL, une politique de sécurité de contenu (CSP), un traitement des fichiers exclusivement en RAM et une suppression automatique des données après chaque opération. Nous ne stockons pas les fichiers sur les disques du serveur.',
      },
      {
        h: '6. Publicités et suivi — de manière juste et transparente',
        p: 'Actuellement, le site n\'affiche aucune publicité. À l\'avenir, nous pourrions introduire des publicités discrètes (par ex. Google AdSense) pour couvrir les coûts de maintenance et de développement — si cela se produit, nous mettrons à jour cet avis. Indépendamment de cela, tous les outils PDF resteront gratuits et sans limite. Google Analytics est utilisé uniquement avec votre consentement et sous forme anonymisée. Nous n\'utilisons pas de pixels de remarketing ni de profilage comportemental.',
      },
      {
        h: 'Soutien volontaire',
        pStart: 'Vous pouvez soutenir volontairement le développement d\'OptimaPDF via la page ',
        linkLabel: 'Soutien',
        pEnd: '. Cela est entièrement facultatif et n\'affecte pas l\'accès à aucune fonctionnalité — les outils restent gratuits, que vous choisissiez ou non de soutenir le projet.',
      },
      {
        h: '7. Ouverts aux retours',
        p: 'Nous construisons OptimaPDF en pensant à nos utilisateurs. Chaque avis, rapport de bug ou suggestion de fonctionnalité est précieux pour nous. Vous pouvez nous contacter via la page de soutien.',
      },
    ],
  },
  it: {
    title: 'I nostri principi',
    subtitle: 'Come costruiamo OptimaPDF — in modo trasparente ed equo.',
    sections: [
      {
        h: '1. 100 % gratuito per ogni utente',
        p: 'Tutti i 40+ strumenti PDF e le funzionalità AI (entro il limite giornaliero) sono e rimarranno gratuiti — senza costi nascosti, senza carta di credito, senza registrazione, senza abbonamento per utilizzare gli strumenti. In futuro, prevediamo un piano a pagamento separato Optimapdf per le Aziende con funzionalità aggiuntive (limiti AI più elevati, supporto prioritario, API). Questo non cambia nulla per le attuali funzionalità gratuite — rimangono disponibili per tutti senza costi, proprio come ora.',
      },
      {
        h: '2. Perché esiste un limite AI (15 richieste al giorno)?',
        p: 'Le funzionalità AI (Chat AI, Riepilogo AI, Traduttore AI) sono gratuite e non richiedono una propria chiave API — ogni utente riceve 15 richieste al giorno senza alcun costo. Il limite esiste perché ogni richiesta AI ci costa denaro (commissioni API OpenRouter). A differenza degli strumenti PDF, che funzionano al 100 % localmente nel tuo browser, l\'AI richiede comunicazione con un server esterno, generando costi operativi reali. Il limite di 15 richieste al giorno ci permette di offrire questa funzionalità gratuitamente a tutti gli utenti senza introdurre abbonamenti o costi. Se hai bisogno di più, puoi configurare la tua chiave API OpenRouter — allora il limite non si applica.',
      },
      {
        h: '3. La tua privacy è al primo posto',
        p: 'OptimaPDF è progettato secondo il principio della privacy by design. La maggior parte degli strumenti elabora i file interamente nel tuo browser — il file non lascia mai il tuo dispositivo. Non richiediamo registrazione, login né dati personali.',
      },
      {
        h: '4. Trasparenza tecnica',
        p: 'Indichiamo chiaramente quali strumenti funzionano lato client (nel browser) e quali richiedono elaborazione sul server. Comunichiamo sempre chiaramente cosa succede al tuo file in ogni fase.',
      },
      {
        h: '5. La sicurezza prima di tutto',
        p: 'Utilizziamo crittografia TLS/SSL, Content Security Policy (CSP), elaborazione dei file esclusivamente in RAM e cancellazione automatica dei dati dopo ogni operazione. Non memorizziamo file sui dischi del server.',
      },
      {
        h: '6. Pubblicità e tracciamento — in modo equo e trasparente',
        p: 'Attualmente il sito non mostra alcuna pubblicità. In futuro, potremmo introdurre annunci discreti (es. Google AdSense) per coprire i costi di manutenzione e sviluppo — se ciò accadrà, aggiorneremo questa informativa. Indipendentemente da ciò, tutti gli strumenti PDF rimarranno gratuiti e senza limiti. Google Analytics è utilizzato solo con il tuo consenso e in forma anonimizzata. Non utilizziamo pixel di remarketing né profilazione comportamentale.',
      },
      {
        h: 'Supporto volontario',
        pStart: 'Puoi supportare volontariamente lo sviluppo di OptimaPDF attraverso la pagina di ',
        linkLabel: 'Supporto',
        pEnd: '. È completamente opzionale e non influisce sull\'accesso a nessuna funzionalità — gli strumenti rimangono gratuiti indipendentemente dal fatto che tu scelga di supportare il progetto.',
      },
      {
        h: '7. Aperti al feedback',
        p: 'Costruiamo OptimaPDF pensando ai nostri utenti. Ogni opinione, segnalazione di bug o suggerimento di funzionalità è prezioso per noi. Puoi contattarci tramite la pagina di supporto.',
      },
    ],
  },
  pt: {
    title: 'Nossos princípios',
    subtitle: 'Como construímos o OptimaPDF — de forma transparente e justa.',
    sections: [
      {
        h: '1. 100 % gratuito para cada usuário',
        p: 'Todas as 40+ ferramentas PDF e funcionalidades de IA (dentro do limite diário) são e continuarão gratuitas — sem taxas ocultas, sem cartão de crédito, sem registro, sem assinatura para usar as ferramentas. No futuro, planejamos um plano pago separado Optimapdf para Empresas com funcionalidades adicionais (limites de IA mais altos, suporte prioritário, API). Isso não muda nada para as funcionalidades gratuitas atuais — elas permanecem disponíveis para todos sem custo, exatamente como agora.',
      },
      {
        h: '2. Por que existe um limite de IA (15 consultas por dia)?',
        p: 'As funcionalidades de IA (Chat IA, Resumo IA, Tradutor IA) são gratuitas e não exigem sua própria chave de API — cada usuário recebe 15 consultas por dia sem custo. O limite existe porque cada consulta de IA nos custa dinheiro (taxas de API do OpenRouter). Ao contrário das ferramentas PDF, que funcionam 100 % localmente no seu navegador, a IA requer comunicação com um servidor externo, gerando custos operacionais reais. O limite de 15 consultas por dia nos permite oferecer este recurso gratuitamente a todos os usuários sem introduzir assinaturas ou taxas. Se precisar de mais, você pode configurar sua própria chave de API OpenRouter — então o limite não se aplica.',
      },
      {
        h: '3. Sua privacidade vem primeiro',
        p: 'O OptimaPDF foi projetado com o princípio de privacidade desde a concepção. A maioria das ferramentas processa arquivos inteiramente no seu navegador — o arquivo nunca sai do seu dispositivo. Não exigimos registro, login ou quaisquer dados pessoais.',
      },
      {
        h: '4. Transparência técnica',
        p: 'Indicamos claramente quais ferramentas funcionam no lado do cliente (no navegador) e quais requerem processamento no servidor. Sempre comunicamos claramente o que acontece com seu arquivo em cada etapa.',
      },
      {
        h: '5. Segurança em primeiro lugar',
        p: 'Usamos criptografia TLS/SSL, Política de Segurança de Conteúdo (CSP), processamento de arquivos exclusivamente em RAM e exclusão automática de dados após cada operação. Não armazenamos arquivos em discos do servidor.',
      },
      {
        h: '6. Anúncios e rastreamento — de forma justa e transparente',
        p: 'Atualmente o site não exibe nenhum anúncio. No futuro, podemos introduzir anúncios discretos (ex. Google AdSense) para cobrir custos de manutenção e desenvolvimento — se isso acontecer, atualizaremos este aviso. Independentemente disso, todas as ferramentas PDF permanecerão gratuitas e ilimitadas. O Google Analytics é usado apenas com seu consentimento e de forma anonimizada. Não usamos pixels de remarketing nem perfil comportamental.',
      },
      {
        h: 'Apoio voluntário',
        pStart: 'Você pode apoiar voluntariamente o desenvolvimento do OptimaPDF através da página de ',
        linkLabel: 'Suporte',
        pEnd: '. Isso é completamente opcional e não afeta o acesso a nenhuma funcionalidade — as ferramentas permanecem gratuitas independentemente de você escolher apoiar o projeto.',
      },
      {
        h: '7. Abertos a feedback',
        p: 'Construímos o OptimaPDF pensando em nossos usuários. Cada opinião, relatório de erro ou sugestão de funcionalidade é valioso para nós. Você pode nos contatar através da página de suporte.',
      },
    ],
  },
  sv: {
    title: 'Våra principer',
    subtitle: 'Hur vi bygger OptimaPDF — transparent och rättvist.',
    sections: [
      {
        h: '1. 100 % gratis för varje användare',
        p: 'Alla 40+ PDF-verktyg och AI-funktioner (inom den dagliga gränsen) är och förblir gratis — utan dolda avgifter, utan kreditkort, utan registrering, utan prenumeration för att använda verktygen. I framtiden planerar vi en separat betald Optimapdf för Företag med ytterligare funktioner (högre AI-gränser, prioriterad support, API). Detta förändrar inget för de nuvarande gratis funktionerna — de förblir tillgängliga för alla utan kostnad, precis som nu.',
      },
      {
        h: '2. Varför finns det en AI-gräns (15 förfrågningar per dag)?',
        p: 'AI-funktioner (AI-chatt, AI-sammanfattning, AI-översättning) är gratis och kräver ingen egen API-nyckel — varje användare får 15 förfrågningar per dag utan kostnad. Gränsen finns eftersom varje AI-förfrågan kostar oss pengar (OpenRouter API-avgifter). Till skillnad från PDF-verktyg som fungerar 100 % lokalt i din webbläsare, kräver AI kommunikation med en extern server, vilket genererar verkliga driftskostnader. Gränsen på 15 förfrågningar per dag gör att vi kan erbjuda denna funktion gratis till alla användare utan att införa prenumerationer eller avgifter. Om du behöver mer kan du konfigurera din egen OpenRouter API-nyckel — då gäller inte gränsen.',
      },
      {
        h: '3. Din integritet kommer först',
        p: 'OptimaPDF är byggt enligt principen privacy by design. De flesta verktyg bearbetar filer helt i din webbläsare — filen lämnar aldrig din enhet. Vi kräver ingen registrering, inloggning eller personuppgifter.',
      },
      {
        h: '4. Teknisk transparens',
        p: 'Vi anger tydligt vilka verktyg som fungerar klientsidans (i webbläsaren) och vilka som kräver serverbearbetning. Vi kommunicerar alltid tydligt vad som händer med din fil i varje steg.',
      },
      {
        h: '5. Säkerhet först',
        p: 'Vi använder TLS/SSL-kryptering, Content Security Policy (CSP), filbearbetning endast i RAM och automatisk radering av data efter varje operation. Vi lagrar inte filer på serverdiskar.',
      },
      {
        h: '6. Annonser och spårning — rättvist och transparent',
        p: 'Webbplatsen visar för närvarande inga annonser. I framtiden kan vi införa diskreta annonser (t.ex. Google AdSense) för att täcka underhålls- och utvecklingskostnader — om det händer kommer vi att uppdatera denna information. Oavsett detta kommer alla PDF-verktyg att förbli gratis och obegränsade. Google Analytics används endast med ditt samtycke och i anonymiserad form. Vi använder inte remarketing-pixlar eller beteendeprofilering.',
      },
      {
        h: 'Frivilligt stöd',
        pStart: 'Du kan frivilligt stödja utvecklingen av OptimaPDF via ',
        linkLabel: 'Support',
        pEnd: '-sidan. Detta är helt valfritt och påverkar inte tillgången till någon funktion — verktygen förblir gratis oavsett om du väljer att stödja projektet.',
      },
      {
        h: '7. Öppna för feedback',
        p: 'Vi bygger OptimaPDF med våra användare i åtanke. Varje åsikt, felrapport eller funktionsförslag är värdefullt för oss. Du kan kontakta oss via supportsidan.',
      },
    ],
  },
  no: {
    title: 'Våre prinsipper',
    subtitle: 'Hvordan vi bygger OptimaPDF — transparent og rettferdig.',
    sections: [
      {
        h: '1. 100 % gratis for hver bruker',
        p: 'Alle 40+ PDF-verktøy og AI-funksjoner (innenfor den daglige grensen) er og forblir gratis — uten skjulte avgifter, uten kredittkort, uten registrering, uten abonnement for å bruke verktøyene. I fremtiden planlegger vi en separat betalt Optimapdf for Bedrifter med ekstra funksjoner (høyere AI-grenser, prioritert støtte, API). Dette endrer ingenting for de nåværende gratis funksjonene — de forblir tilgjengelige for alle uten kostnad, akkurat som nå.',
      },
      {
        h: '2. Hvorfor finnes det en AI-grense (15 forespørsler per dag)?',
        p: 'AI-funksjoner (AI-chat, AI-sammendrag, AI-oversetter) er gratis og krever ingen egen API-nøkkel — hver bruker får 15 forespørsler per dag uten kostnad. Grensen finnes fordi hver AI-forespørsel koster oss penger (OpenRouter API-gebyrer). I motsetning til PDF-verktøy som fungerer 100 % lokalt i nettleseren din, krever AI kommunikasjon med en ekstern server, noe som genererer reelle driftskostnader. Grensen på 15 forespørsler per dag gjør at vi kan tilby denne funksjonen gratis til alle brukere uten å innføre abonnementer eller avgifter. Hvis du trenger mer, kan du konfigurere din egen OpenRouter API-nøkkel — da gjelder ikke grensen.',
      },
      {
        h: '3. Ditt personvern kommer først',
        p: 'OptimaPDF er bygget etter prinsippet privacy by design. De fleste verktøy behandler filer helt i nettleseren din — filen forlater aldri enheten din. Vi krever ingen registrering, innlogging eller personopplysninger.',
      },
      {
        h: '4. Teknisk transparens',
        p: 'Vi angir tydelig hvilke verktøy som fungerer på klientsiden (i nettleseren) og hvilke som krever serverbehandling. Vi kommuniserer alltid tydelig hva som skjer med filen din i hvert trinn.',
      },
      {
        h: '5. Sikkerhet først',
        p: 'Vi bruker TLS/SSL-kryptering, Content Security Policy (CSP), filbehandling kun i RAM og automatisk sletting av data etter hver operasjon. Vi lagrer ikke filer på serverdisker.',
      },
      {
        h: '6. Annonser og sporing — rettferdig og transparent',
        p: 'Nettstedet viser for øyeblikket ingen annonser. I fremtiden kan vi innføre diskrete annonser (f.eks. Google AdSense) for å dekke vedlikeholds- og utviklingskostnader — hvis det skjer, vil vi oppdatere denne informasjonen. Uavhengig av dette vil alle PDF-verktøy forbli gratis og ubegrensede. Google Analytics brukes kun med ditt samtykke og i anonymisert form. Vi bruker ikke remarketing-piksler eller atferdsprofilering.',
      },
      {
        h: 'Frivillig støtte',
        pStart: 'Du kan frivillig støtte utviklingen av OptimaPDF gjennom ',
        linkLabel: 'Støtte',
        pEnd: '-siden. Dette er helt valgfritt og påvirker ikke tilgangen til noen funksjon — verktøyene forblir gratis uavhengig av om du velger å støtte prosjektet.',
      },
      {
        h: '7. Åpne for tilbakemeldinger',
        p: 'Vi bygger OptimaPDF med brukerne våre i tankene. Hver mening, feilrapport eller funksjonsforslag er verdifullt for oss. Du kan kontakte oss via støttesiden.',
      },
    ],
  },

  ar: {
    title: 'مبادئنا',
    subtitle: 'كيف نبني OptimaPDF — بشفافية وإنصاف.',
    sections: [
      {
        h: '1. مجاني 100٪ لكل مستخدم',
        p: 'جميع أدوات PDF الـ 40+ ووظائف الذكاء الاصطناعي (ضمن الحد اليومي) هي وستبقى مجانية — بدون رسوم خفية، بدون بطاقة ائتمان، بدون تسجيل، بدون اشتراك لاستخدام الأدوات. في المستقبل، نخطط لخطة مدفوعة منفصلة Optimapdf للشركات مع ميزات إضافية (حدود أعلى للذكاء الاصطناعي، دعم ذو أولوية، واجهة برمجية). هذا لا يغير شيئًا في الوظائف المجانية الحالية — تبقى متاحة للجميع بدون مقابل، كما هي الآن.',
      },
      {
        h: '2. لماذا يوجد حد للذكاء الاصطناعي (15 استعلامًا يوميًا)؟',
        p: 'وظائف الذكاء الاصطناعي (الدردشة الذكية، الملخص الذكي، الترجمة الذكية) مجانية ولا تتطلب مفتاح API خاص بك — كل مستخدم يحصل على 15 استعلامًا يوميًا بدون أي رسوم. الحد موجود لأن كل استعلام ذكاء اصطناعي يكلفنا مالًا (رسوم API الخاصة بـ OpenRouter). على عكس أدوات PDF التي تعمل 100٪ محليًا في متصفحك، يتطلب الذكاء الاصطناعي اتصالًا بخادم خارجي، مما يولد تكاليف تشغيلية حقيقية. حد 15 استعلامًا يوميًا يسمح لنا بتقديم هذه الوظيفة مجانًا لجميع المستخدمين دون إدخال اشتراكات أو رسوم. إذا كنت بحاجة إلى المزيد، يمكنك تكوين مفتاح API الخاص بك لـ OpenRouter — عندها لا ينطبق الحد.',
      },
      {
        h: '3. خصوصيتك هي الأولوية',
        p: 'تم تصميم OptimaPDF وفقًا لمبدأ الخصوصية من خلال التصميم. معظم الأدوات تعالج الملفات بالكامل في متصفحك — الملف لا يغادر جهازك أبدًا. لا نطلب تسجيلًا أو دخولًا أو أي بيانات شخصية.',
      },
      {
        h: '4. الشفافية التقنية',
        p: 'نوضح أي الأدوات تعمل من جانب العميل (في المتصفح) وأيها تتطلب معالجة على الخادم. نتواصل دائمًا بوضوح حول ما يحدث لملفك في كل خطوة.',
      },
      {
        h: '5. الأمان أولاً',
        p: 'نستخدم تشفير TLS/SSL، سياسة أمان المحتوى (CSP)، معالجة الملفات فقط في الذاكرة العشوائية (RAM)، وحذف البيانات تلقائيًا بعد كل عملية. لا نخزن الملفات على أقراص الخادم.',
      },
      {
        h: '6. الإعلانات والتتبع — بإنصاف وشفافية',
        p: 'الموقع لا يعرض حاليًا أي إعلانات. في المستقبل، قد نقدم إعلانات غير مزعجة (مثل Google AdSense) لتغطية تكاليف الصيانة والتطوير — إذا حدث ذلك، سنقوم بتحديث هذا الإشعار. بغض النظر عن ذلك، جميع أدوات PDF ستبقى مجانية وغير محدودة. Google Analytics يُستخدم فقط بموافقتك وبشكل مجهول. لا نستخدم بكسلات إعادة التسويق أو التنميط السلوكي.',
      },
      {
        h: 'دعم تطوعي',
        pStart: 'يمكنك دعم تطوير OptimaPDF طواعية من خلال صفحة ',
        linkLabel: 'الدعم',
        pEnd: '. هذا اختياري بالكامل ولا يؤثر على الوصول إلى أي وظيفة — الأدوات تبقى مجانية بغض النظر عما إذا اخترت دعم المشروع.',
      },
      {
        h: '7. مفتوحون للملاحظات',
        p: 'نبني OptimaPDF مع وضع مستخدمينا في الاعتبار. كل رأي أو تقرير خطأ أو اقتراح ميزة هو قيم بالنسبة لنا. يمكنك الاتصال بنا من خلال صفحة الدعم.',
      },
    ],
  },
  fa: {
    title: 'اصول ما',
    subtitle: 'چگونه OptimaPDF را می‌سازیم — شفاف و منصفانه.',
    sections: [
      {
        h: '1. 100٪ رایگان برای هر کاربر',
        p: 'همه 40+ ابزار PDF و ویژگی‌های هوش مصنوعی (در محدوده روزانه) رایگان هستند و رایگان باقی خواهند ماند — بدون هزینه‌های پنهان، بدون کارت اعتباری، بدون ثبت‌نام، بدون اشتراک برای استفاده از ابزارها. در آینده، ما یک طرح پرداختی جداگانه Optimapdf برای شرکت‌ها با ویژگی‌های اضافی (محدودیت‌های بالاتر هوش مصنوعی، پشتیبانی اولویت‌دار، API) برنامه‌ریزی می‌کنیم. این هیچ چیزی را برای ویژگی‌های رایگان فعلی تغییر نمی‌دهد — آنها برای همه بدون هزینه در دسترس باقی می‌مانند، درست مثل الان.',
      },
      {
        h: '2. چرا محدودیت هوش مصنوعی (15 پرسش در روز) وجود دارد؟',
        p: 'ویژگی‌های هوش مصنوعی (چت هوش مصنوعی، خلاصه‌سازی هوش مصنوعی، ترجمه هوش مصنوعی) رایگان هستند و نیاز به کلید API شخصی ندارند — هر کاربر روزانه 15 پرسش بدون هیچ هزینه‌ای دریافت می‌کند. محدودیت وجود دارد زیرا هر پرسش هوش مصنوعی برای ما هزینه دارد (هزینه‌های API OpenRouter). بر خلاف ابزارهای PDF که 100٪ به صورت محلی در مرورگر شما کار می‌کنند، هوش مصنوعی نیاز به ارتباط با سرور خارجی دارد که هزینه‌های عملیاتی واقعی ایجاد می‌کند. محدودیت 15 پرسش در روز به ما امکان می‌دهد این ویژگی را به صورت رایگان به همه کاربران ارائه دهیم بدون اینکه اشتراک‌ها یا هزینه‌هایی معرفی کنیم. اگر به بیشتر نیاز دارید، می‌توانید کلید API OpenRouter خود را پیکربندی کنید — در آن صورت محدودیت اعمال نمی‌شود.',
      },
      {
        h: '3. حریم خصوصی شما در اولویت است',
        p: 'OptimaPDF بر اساس اصل حریم خصوصی در طراحی ساخته شده است. بیشتر ابزارها فایل‌ها را کاملاً در مرورگر شما پردازش می‌کنند — فایل هرگز دستگاه شما را ترک نمی‌کند. ما به ثبت‌نام، ورود یا هیچ داده شخصی نیاز نداریم.',
      },
      {
        h: '4. شفافیت فنی',
        p: 'ما به وضوح مشخص می‌کنیم که کدام ابزارها در سمت مشتری (در مرورگر) کار می‌کنند و کدامها نیاز به پردازش سرور دارند. همیشه به وضوح ارتباط برقرار می‌کنیم که در هر مرحله چه اتفاقی برای فایل شما می‌افتد.',
      },
      {
        h: '5. امنیت در اولویت',
        p: 'ما از رمزنگاری TLS/SSL، خط مشی امنیت محتوا (CSP)، پردازش فایل‌ها فقط در RAM و حذف خودکار داده‌ها پس از هر عملیات استفاده می‌کنیم. فایل‌ها را روی دیسک‌های سرور ذخیره نمی‌کنیم.',
      },
      {
        h: '6. تبلیغات و ردیابی — منصفانه و شفاف',
        p: 'وب‌سایت در حال حاضر هیچ تبلیغاتی نمایش نمی‌دهد. در آینده، ممکن است تبلیغات غیرمزاحم (مانند Google AdSense) را برای پوشش هزینه‌های نگهداری و توسعه معرفی کنیم — اگر این اتفاق بیفتد، این اطلاعیه را به‌روزرسانی می‌کنیم. صرف نظر از این، همه ابزارهای PDF رایگان و بدون محدودیت باقی خواهند ماند. Google Analytics فقط با رضایت شما و به صورت ناشناس استفاده می‌شود. ما از پیکسل‌های بازاریابی مجدد یا پروفایل‌سازی رفتاری استفاده نمی‌کنیم.',
      },
      {
        h: 'حمایت داوطلبانه',
        pStart: 'شما می‌توانید داوطلبانه از توسعه OptimaPDF از طریق صفحه ',
        linkLabel: 'پشتیبانی',
        pEnd: ' حمایت کنید. این کاملاً اختیاری است و بر دسترسی به هیچ ویژگی تأثیری ندارد — ابزارها صرف نظر از اینکه تصمیم به حمایت از پروژه بگیرید، رایگان باقی می‌مانند.',
      },
      {
        h: '7. باز برای بازخورد',
        p: 'ما OptimaPDF را با در نظر گرفتن کاربران خود می‌سازیم. هر نظر، گزارش خطا یا پیشنهاد ویژگی برای ما ارزشمند است. شما می‌توانید از طریق صفحه پشتیبانی با ما تماس بگیرید.',
      },
    ],
  },
  hi: {
    title: 'हमारे सिद्धांत',
    subtitle: 'हम कैसे OptimaPDF बनाते हैं — पारदर्शी और निष्पक्ष रूप से।',
    sections: [
      {
        h: '1. प्रत्येक उपयोगकर्ता के लिए 100% मुफ्त',
        p: 'सभी 40+ PDF उपकरण और AI सुविधाएँ (दैनिक सीमा के भीतर) मुफ्त हैं और रहेंगी — बिना छिपे शुल्क, बिना क्रेडिट कार्ड, बिना पंजीकरण, बिना सदस्यता के उपकरणों का उपयोग करने के लिए। भविष्य में, हम अतिरिक्त सुविधाओं (उच्च AI सीमाएँ, प्राथमिकता समर्थन, API) के साथ व्यवसायों के लिए एक अलग भुगतान योजना Optimapdf की योजना बना रहे हैं। यह वर्तमान मुफ्त सुविधाओं के लिए कुछ भी नहीं बदलता — वे सभी के लिए बिना किसी शुल्क के उपलब्ध रहती हैं, बिल्कुल अब की तरह।',
      },
      {
        h: '2. AI सीमा (प्रतिदिन 15 क्वेरी) क्यों है?',
        p: 'AI सुविधाएँ (AI चैट, AI सारांश, AI अनुवाद) मुफ्त हैं और आपकी अपनी API कुंजी की आवश्यकता नहीं है — प्रत्येक उपयोगकर्ता को प्रतिदिन 15 क्वेरी बिना किसी शुल्क के मिलती हैं। सीमा इसलिए मौजूद है क्योंकि प्रत्येक AI क्वेरी में हमें पैसा खर्च होता है (OpenRouter API शुल्क)। PDF उपकरणों के विपरीत जो 100% आपके ब्राउज़र में स्थानीय रूप से काम करते हैं, AI को बाहरी सर्वर के साथ संचार की आवश्यकता होती है, जो वास्तविक परिचालन लागत उत्पन्न करता है। प्रतिदिन 15 क्वेरी की सीमा हमें सदस्यता या शुल्क शुरू किए बिना सभी उपयोगकर्ताओं को यह सुविधा मुफ्त प्रदान करने की अनुमति देती है। यदि आपको अधिक आवश्यकता है, तो आप अपनी स्वयं की OpenRouter API कुंजी कॉन्फ़िगर कर सकते हैं — तब सीमा लागू नहीं होती।',
      },
      {
        h: '3. आपकी गोपनीयता सर्वोपरि है',
        p: 'OptimaPDF गोपनीयता-द्वारा-डिज़ाइन सिद्धांत पर बनाया गया है। अधिकांश उपकरण फ़ाइलों को पूरी तरह से आपके ब्राउज़र में प्रोसेस करते हैं — फ़ाइल कभी भी आपके डिवाइस को नहीं छोड़ती। हमें पंजीकरण, लॉगिन या किसी व्यक्तिगत डेटा की आवश्यकता नहीं है।',
      },
      {
        h: '4. तकनीकी पारदर्शिता',
        p: 'हम स्पष्ट रूप से बताते हैं कि कौन से उपकरण क्लाइंट-साइड (ब्राउज़र में) काम करते हैं और किन्हें सर्वर प्रोसेसिंग की आवश्यकता है। हम हमेशा स्पष्ट रूप से बताते हैं कि प्रत्येक चरण में आपकी फ़ाइल के साथ क्या होता है।',
      },
      {
        h: '5. सुरक्षा पहले',
        p: 'हम TLS/SSL एन्क्रिप्शन, सामग्री सुरक्षा नीति (CSP), केवल RAM में फ़ाइल प्रोसेसिंग और प्रत्येक ऑपरेशन के बाद स्वचालित डेटा हटाने का उपयोग करते हैं। हम सर्वर डिस्क पर फ़ाइलें संग्रहीत नहीं करते।',
      },
      {
        h: '6. विज्ञापन और ट्रैकिंग — निष्पक्ष और पारदर्शी रूप से',
        p: 'वर्तमान में साइट कोई विज्ञापन प्रदर्शित नहीं करती है। भविष्य में, हम रखरखाव और विकास लागतों को कवर करने के लिए विनीत विज्ञापन (जैसे Google AdSense) शुरू कर सकते हैं — यदि ऐसा होता है, तो हम इस सूचना को अपडेट करेंगे। इसके बावजूद, सभी PDF उपकरण मुफ्त और असीमित रहेंगे। Google Analytics का उपयोग केवल आपकी सहमति से और अज्ञात रूप में किया जाता है। हम रीमार्केटिंग पिक्सेल या व्यवहार प्रोफाइलिंग का उपयोग नहीं करते।',
      },
      {
        h: 'स्वैच्छिक समर्थन',
        pStart: 'आप ',
        linkLabel: 'समर्थन',
        pEnd: ' पृष्ठ के माध्यम से स्वेच्छा से OptimaPDF के विकास का समर्थन कर सकते हैं। यह पूरी तरह से वैकल्पिक है और किसी भी सुविधा तक पहुँच को प्रभावित नहीं करता — उपकरण मुफ्त रहते हैं चाहे आप परियोजना का समर्थन करना चुनें या नहीं।',
      },
      {
        h: '7. प्रतिक्रिया के लिए खुले',
        p: 'हम अपने उपयोगकर्ताओं को ध्यान में रखते हुए OptimaPDF बनाते हैं। हर राय, बग रिपोर्ट या सुविधा सुझाव हमारे लिए मूल्यवान है। आप समर्थन पृष्ठ के माध्यम से हमसे संपर्क कर सकते हैं।',
      },
    ],
  },
  ja: {
    title: '私たちの理念',
    subtitle: 'OptimaPDFの構築方法 — 透明かつ公正に。',
    sections: [
      {
        h: '1. すべてのユーザーに100％無料',
        p: '40以上のPDFツールとAI機能（1日あたりの制限内）はすべて無料であり、無料のままです — 隠れた料金、クレジットカード、登録、サブスクリプションは一切必要ありません。将来、追加機能（より高いAI制限、優先サポート、API）を備えた有料のOptimapdf for Businessプランを別途計画しています。これは現在の無料機能には何も影響しません — これまで通り、すべてのユーザーが無料で利用できます。',
      },
      {
        h: '2. AI制限（1日15クエリ）がある理由',
        p: 'AI機能（AIチャット、AI要約、AI翻訳）は無料で、独自のAPIキーは不要です — すべてのユーザーは1日15クエリを無料で受け取れます。制限があるのは、各AIクエリにコストがかかるためです（OpenRouter API料金）。ブラウザで100％ローカルに動作するPDFツールとは異なり、AIは外部サーバーとの通信が必要で、実際の運用コストが発生します。1日15クエリの制限により、サブスクリプションや料金を導入せずに、この機能をすべてのユーザーに無料で提供できます。さらに必要な場合は、ご自身のOpenRouter APIキーを設定してください — その場合、制限は適用されません。',
      },
      {
        h: '3. プライバシーを最優先',
        p: 'OptimaPDFはプライバシーバイデザインの原則に基づいて構築されています。ほとんどのツールはブラウザ内で完全にファイルを処理します — ファイルがデバイスから外部に出ることはありません。登録、ログイン、個人情報の提供は必要ありません。',
      },
      {
        h: '4. 技術的な透明性',
        p: 'どのツールがクライアントサイド（ブラウザ内）で動作し、どのツールがサーバー処理を必要とするかを明確に示します。各段階でファイルがどうなるかを常に明確に説明します。',
      },
      {
        h: '5. セキュリティを最優先',
        p: 'TLS/SSL暗号化、コンテンツセキュリティポリシー（CSP）、RAMのみでのファイル処理、各操作後の自動データ削除を採用しています。サーバーディスクにファイルを保存することはありません。',
      },
      {
        h: '6. 広告とトラッキング — 公正かつ透明に',
        p: '現在、サイトは広告を表示していません。将来的に、メンテナンスと開発コストをカバーするために控えめな広告（例：Google AdSense）を導入する可能性があります — その場合は、この通知を更新します。いずれにしても、すべてのPDFツールは無料で制限なく利用可能です。Google Analyticsはお客様の同意がある場合にのみ、匿名化された形で使用されます。リマーケティングピクセルや行動プロファイリングは使用していません。',
      },
      {
        h: '任意のサポート',
        pStart: 'OptimaPDFの開発を',
        linkLabel: 'サポート',
        pEnd: 'ページから任意で支援できます。これは完全にオプションであり、機能へのアクセスに影響を与えません — プロジェクトを支援するかどうかに関わらず、ツールは無料のままです。',
      },
      {
        h: '7. フィードバックを受け入れます',
        p: '私たちはユーザーを第一に考えてOptimaPDFを構築しています。意見、バグ報告、機能提案はすべて貴重です。サポートページからお問い合わせください。',
      },
    ],
  },
  zh: {
    title: '我们的原则',
    subtitle: '我们如何构建 OptimaPDF — 透明且公正。',
    sections: [
      {
        h: '1. 对每位用户100%免费',
        p: '所有40多种PDF工具和AI功能（在每日限额内）现在和将来都保持免费 — 无隐藏费用，无需信用卡，无需注册，无需订阅即可使用工具。未来，我们计划推出单独的付费 Optimapdf for Business 计划，提供额外功能（更高的AI限额、优先支持、API）。这不会改变当前的免费功能 — 它们仍然像现在一样对所有用户免费开放。',
      },
      {
        h: '2. 为什么有AI限额（每天15次查询）？',
        p: 'AI功能（AI聊天、AI摘要、AI翻译）是免费的，不需要您自己的API密钥 — 每位用户每天可免费获得15次查询。存在限额是因为每次AI查询都会产生费用（OpenRouter API费用）。与100%在浏览器本地运行的PDF工具不同，AI需要与外部服务器通信，产生实际运营成本。每天15次查询的限额使我们能够在无需引入订阅或费用的情况下，向所有用户免费提供此功能。如果您需要更多，可以配置自己的OpenRouter API密钥 — 此时限额不适用。',
      },
      {
        h: '3. 您的隐私至上',
        p: 'OptimaPDF 遵循隐私设计原则构建。大多数工具完全在您的浏览器中处理文件 — 文件永远不会离开您的设备。我们不需要注册、登录或任何个人数据。',
      },
      {
        h: '4. 技术透明',
        p: '我们清楚标明哪些工具在客户端（浏览器中）运行，哪些需要服务器处理。我们始终清楚地告知您文件在每个阶段的情况。',
      },
      {
        h: '5. 安全第一',
        p: '我们使用TLS/SSL加密、内容安全策略（CSP）、仅内存文件处理以及每次操作后自动删除数据。我们不会将文件存储在服务器磁盘上。',
      },
      {
        h: '6. 广告和跟踪 — 公正透明',
        p: '目前网站不显示任何广告。未来，我们可能会引入谨慎的广告（例如 Google AdSense）来覆盖维护和开发成本 — 如果发生这种情况，我们将更新此通知。无论如何，所有PDF工具将保持免费且无限制。Google Analytics 仅在您同意的情况下以匿名形式使用。我们不使用再营销像素或行为分析。',
      },
      {
        h: '自愿支持',
        pStart: '您可以通过',
        linkLabel: '支持',
        pEnd: '页面自愿支持 OptimaPDF 的开发。这完全是可选的，不影响任何功能的访问 — 无论您是否选择支持该项目，工具都保持免费。',
      },
      {
        h: '7. 欢迎反馈',
        p: '我们以用户为中心构建 OptimaPDF。每一条意见、错误报告或功能建议对我们都很有价值。您可以通过支持页面联系我们。',
      },
    ],
  },
  tr: {
    title: 'İlkelerimiz',
    subtitle: 'OptimaPDF\'yi nasıl inşa ediyoruz — şeffaf ve adil bir şekilde.',
    sections: [
      {
        h: '1. Her kullanıcı için %100 ücretsiz',
        p: '40+ PDF aracı ve AI özelliklerinin (günlük limit dahilinde) tümü ücretsizdir ve ücretsiz kalacaktır — gizli ücretler, kredi kartı, kayıt veya abonelik gerektirmez. Gelecekte, ek özelliklere (daha yüksek AI limitleri, öncelikli destek, API) sahip ayrı bir ücretli Optimapdf for Business planı planlıyoruz. Bu, mevcut ücretsiz özellikler için hiçbir şeyi değiştirmez — şu an olduğu gibi herkes için ücretsiz olarak kullanılabilir durumda kalırlar.',
      },
      {
        h: '2. Neden AI limiti (günde 15 sorgu) var?',
        p: 'AI özellikleri (AI Sohbet, AI Özet, AI Çeviri) ücretsizdir ve kendi API anahtarınızı gerektirmez — her kullanıcı günde 15 sorguyu ücretsiz alır. Limit, her AI sorgusunun bize maliyeti olduğu için vardır (OpenRouter API ücretleri). %100 tarayıcınızda yerel olarak çalışan PDF araçlarının aksine, AI harici bir sunucuyla iletişim gerektirir ve gerçek işletme maliyetleri oluşturur. Günde 15 sorgu limiti, bu özelliği abonelik veya ücret getirmeden tüm kullanıcılara ücretsiz sunmamızı sağlar. Daha fazlasına ihtiyacınız varsa, kendi OpenRouter API anahtarınızı yapılandırabilirsiniz — o zaman limit uygulanmaz.',
      },
      {
        h: '3. Gizliliğiniz en önemlisi',
        p: 'OptimaPDF, privacy by design ilkesiyle oluşturulmuştur. Çoğu araç dosyaları tamamen tarayıcınızda işler — dosya cihazınızdan asla ayrılmaz. Kayıt, giriş veya kişisel veri talep etmiyoruz.',
      },
      {
        h: '4. Teknik şeffaflık',
        p: 'Hangi araçların istemci tarafında (tarayıcıda) çalıştığını ve hangilerinin sunucu işleme gerektirdiğini açıkça belirtiyoruz. Dosyanıza her adımda ne olduğunu her zaman açıkça bildiriyoruz.',
      },
      {
        h: '5. Güvenlik öncelikli',
        p: 'TLS/SSL şifreleme, İçerik Güvenlik Politikası (CSP), yalnızca RAM\'de dosya işleme ve her işlemden sonra otomatik veri silme kullanıyoruz. Dosyaları sunucu disklerinde saklamıyoruz.',
      },
      {
        h: '6. Reklamlar ve izleme — adil ve şeffaf bir şekilde',
        p: 'Site şu anda hiçbir reklam göstermemektedir. Gelecekte, bakım ve geliştirme maliyetlerini karşılamak için gizli reklamlar (ör. Google AdSense) ekleyebiliriz — bu olursa, bu bildirimi güncelleyeceğiz. Bundan bağımsız olarak, tüm PDF araçları ücretsiz ve sınırsız kalacaktır. Google Analytics yalnızca izninizle ve anonimleştirilmiş biçimde kullanılır. Yeniden pazarlama pikselleri veya davranışsal profilleme kullanmıyoruz.',
      },
      {
        h: 'Gönüllü destek',
        pStart: 'OptimaPDF\'nin geliştirilmesini ',
        linkLabel: 'Destek',
        pEnd: ' sayfası aracılığıyla gönüllü olarak destekleyebilirsiniz. Bu tamamen isteğe bağlıdır ve hiçbir özelliğe erişimi etkilemez — projeyi desteklemeyi seçseniz de seçmeseniz de araçlar ücretsiz kalır.',
      },
      {
        h: '7. Geri bildirime açık',
        p: 'OptimaPDF\'yi kullanıcılarımızı düşünerek inşa ediyoruz. Her görüş, hata raporu veya özellik önerisi bizim için değerlidir. Bizimle destek sayfası aracılığıyla iletişime geçebilirsiniz.',
      },
    ],
  },
  is: {
    title: 'Meginreglur okkar',
    subtitle: 'Hvernig við byggjum OptimaPDF — gagnsætt og réttlátt.',
    sections: [
      {
        h: '1. 100% ókeypis fyrir hvern notanda',
        p: 'Öll 40+ PDF tækin og AI aðgerðirnar (innan daglegs marks) eru og verða áfram ókeypis — án falinna gjalda, án kreditkorts, án skráningar, án áskriftar til að nota tækin. Í framtíðinni ætlum við aðskilinn greiddan Optimapdf fyrir Fyrirtæki valkost með viðbótareiginleikum (hærri AI mörk, forgangsþjónusta, API). Þetta breytir engu fyrir núverandi ókeypis eiginleika — þeir eru áfram aðgengilegir öllum án kostnaðar, alveg eins og núna.',
      },
      {
        h: '2. Af hverju er AI mark (15 fyrirspurnir á dag)?',
        p: 'AI aðgerðir (AI spjall, AI samantekt, AI þýðandi) eru ókeypis og þurfa ekki þinn eigin API lykil — hver notandi fær 15 fyrirspurnir á dag án nokkurs kostnaðar. Markið er til vegna þess að hver AI fyrirspurn kostar okkur peninga (OpenRouter API gjöld). Ólíkt PDF tækjum sem vinna 100% staðbundið í vafranum þínum, þarf AI samskipti við utanaðkomandi miðlara, sem myndar raunverulegan rekstrarkostnað. 15 fyrirspurnir á dag markið gerir okkur kleift að bjóða þennan eiginleika ókeypis öllum notendum án þess að taka upp áskriftir eða gjöld. Ef þú þarft meira geturðu stillt þinn eigin OpenRouter API lykil — þá gildir markið ekki.',
      },
      {
        h: '3. Næði þitt kemur fyrst',
        p: 'OptimaPDF er byggt á privacy by design meginreglunni. Flest tæki vinna skrár alveg í vafranum þínum — skráin yfirgefur aldrei tækið þitt. Við krefjumst ekki skráningar, innskráningar eða neinna persónulegra gagna.',
      },
      {
        h: '4. Tæknilegt gagnsæi',
        p: 'Við tilgreinum skýrt hvaða tæki virka á biðlarahlið (í vafra) og hver þurfa miðlaravinnslu. Við miðlum alltaf skýrt hvað verður um skrána þína á hverju skrefi.',
      },
      {
        h: '5. Öryggi fyrst',
        p: 'Við notum TLS/SSL dulkóðun, Content Security Policy (CSP), skráavinnslu eingöngu í vinnsluminni (RAM) og sjálfvirka eyðingu gagna eftir hverja aðgerð. Við geymum ekki skrár á diskum miðlara.',
      },
      {
        h: '6. Auglýsingar og rakning — réttlátt og gagnsætt',
        p: 'Vefsíðan sýnir engar auglýsingar eins og er. Í framtíðinni gætum við kynnt til sögunnar lúmskar auglýsingar (t.d. Google AdSense) til að standa straum af viðhalds- og þróunarkostnaði — ef það gerist munum við uppfæra þessa tilkynningu. Óháð þessu verða öll PDF tæki áfram ókeypis og ótakmörkuð. Google Analytics er aðeins notað með þínu samþykki og í nafnlausu formi. Við notum ekki endurmarkaðsmyndpunkta eða hegðunarsnið.',
      },
      {
        h: 'Sjálfboðaliðastuðningur',
        pStart: 'Þú getur sjálfviljugur stutt þróun OptimaPDF í gegnum ',
        linkLabel: 'Stuðningur',
        pEnd: ' síðuna. Þetta er algjörlega valkvætt og hefur ekki áhrif á aðgang að neinum eiginleika — tækin eru áfram ókeypis óháð því hvort þú kýst að styðja verkefnið.',
      },
      {
        h: '7. Opin fyrir endurgjöf',
        p: 'Við byggjum OptimaPDF með notendur okkar í huga. Sérhver skoðun, villutilkynning eða tillaga að nýjum eiginleika er dýrmæt fyrir okkur. Þú getur haft samband við okkur í gegnum stuðningssíðuna.',
      },
    ],
  },
};

export default function RulesPage({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const { locale: detectedLocale } = useLocale();
  const locale = forcedLocale || detectedLocale;
  const lang = content[locale] || content.en;

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">📋</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{lang.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">{lang.subtitle}</p>
      </div>

      <div className="tool-card rounded-2xl border p-8 space-y-8 text-sm leading-relaxed" style={{ color: 'var(--coffee-text-secondary)' }}>
        {lang.sections.map((sec, i) => (
          <section key={i}>
            <h2 className="text-lg sm:text-xl font-bold tool-heading mb-3">{sec.h}</h2>
            {sec.pStart ? (
              <p>{sec.pStart}<Link href={`/${locale}/wsparcie`}>{sec.linkLabel}</Link>{sec.pEnd}</p>
            ) : (
              <p>{sec.p}</p>
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
