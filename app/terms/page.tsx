'use client';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';

const content = {
  pl: {
    title: 'Regulamin',
    updated: 'Ostatnia aktualizacja: 29 czerwca 2026',
    sections: [
      {
        h: '1. Postanowienia ogólne',
        p: 'Niniejszy Regulamin określa zasady korzystania z serwisu OptimaPDF (optimapdf.com) prowadzonego przez Leszka Hofmana, Dąbrówka Nowa, Polska. Korzystając z serwisu, akceptujesz postanowienia niniejszego Regulaminu.',
      },
      {
        h: '2. Opis usług',
        p: 'Serwis OptimaPDF oferuje darmowe narzędzia online do edycji, konwersji i zarządzania plikami PDF. Wszystkie narzędzia są dostępne bez rejestracji. Przetwarzanie plików odbywa się lokalnie w przeglądarce użytkownika — pliki nie są wysyłane na serwer (z wyjątkiem funkcji URL-to-PDF).',
      },
      {
        h: '3. Odpowiedzialność',
        p: 'OptimaPDF dokłada wszelkich starań, aby narzędzia działały poprawnie, ale nie gwarantuje ciągłości działania ani braku błędów. Użytkownik korzysta z serwisu na własną odpowiedzialność. Zaleca się tworzenie kopii zapasowych plików przed przetwarzaniem.',
      },
      {
        h: '4. Prawa autorskie',
        p: 'Nazwa i logo OptimaPDF są własnością serwisu. Kopiowanie, modyfikacja lub dystrybucja kodu bez zgody jest zabroniona.',
      },
      {
        h: '5. Prywatność',
        p: 'Szczegółowe informacje o przetwarzaniu danych znajdują się w Polityce prywatności.',
      },
      {
        h: '6. Kontakt',
        p: 'W sprawach związanych z Regulaminem można kontaktować się pod adresem: kontakt@optimapdf.com.',
      },
    ],
  },
  en: {
    title: 'Terms of Service',
    updated: 'Last updated: June 29, 2026',
    sections: [
      { h: '1. General Provisions', p: 'These Terms of Service govern your use of OptimaPDF (optimapdf.com), operated by Leszek Hofman, Dąbrówka Nowa, Poland. By using the service, you accept these terms.' },
      { h: '2. Service Description', p: 'OptimaPDF offers free online PDF editing, conversion and management tools. All tools are available without registration. File processing happens locally in your browser — files are not sent to our server (except URL-to-PDF).' },
      { h: '3. Liability', p: 'OptimaPDF strives for accuracy but does not guarantee uninterrupted service. Users are advised to keep backups of their files.' },
      { h: '4. Copyright', p: 'The OptimaPDF name and logo are property of the service. Copying or distributing the code without permission is prohibited.' },
      { h: '5. Privacy', p: 'See our Privacy Policy for details on data processing.' },
      { h: '6. Contact', p: 'For inquiries: kontakt@optimapdf.com.' },
    ],
  },
  ar: {
    title: 'شروط الخدمة',
    updated: 'آخر تحديث: 29 يونيو 2026',
    sections: [
      { h: '1. الأحكام العامة', p: 'تحكم شروط الخدمة هذه استخدامك لـ OptimaPDF (optimapdf.com)، الذي يُشغّله Leszek Hofman، Dąbrówka Nowa، بولندا. باستخدامك للخدمة، فإنك تقبل هذه الشروط.' },
      { h: '2. وصف الخدمة', p: 'تقدم OptimaPDF أدوات مجانية عبر الإنترنت لتحرير ملفات PDF وتحويلها وإدارتها. جميع الأدوات متاحة دون تسجيل. تتم معالجة الملفات محليًا في متصفحك — لا يتم إرسال الملفات إلى خادمنا (باستثناء URL-to-PDF).' },
      { h: '3. المسؤولية', p: 'تسعى OptimaPDF إلى الدقة لكنها لا تضمن خدمة دون انقطاع. يُنصح المستخدمون بالاحتفاظ بنسخ احتياطية من ملفاتهم.' },
      { h: '4. حقوق النشر', p: 'اسم وشعار OptimaPDF هما ملكية للخدمة. يُحظر نسخ أو توزيع الكود بدون إذن.' },
      { h: '5. الخصوصية', p: 'اطلع على سياسة الخصوصية لدينا للتفاصيل حول معالجة البيانات.' },
      { h: '6. الاتصال', p: 'للاستفسارات: kontakt@optimapdf.com.' },
    ],
  },
  de: {
    title: 'Nutzungsbedingungen',
    updated: 'Zuletzt aktualisiert: 29. Juni 2026',
    sections: [
      { h: '1. Allgemeine Bestimmungen', p: 'Diese Nutzungsbedingungen regeln die Nutzung von OptimaPDF (optimapdf.com), betrieben von Leszek Hofman, Dąbrówka Nowa, Polen. Durch die Nutzung des Dienstes akzeptieren Sie diese Bedingungen.' },
      { h: '2. Dienstbeschreibung', p: 'OptimaPDF bietet kostenlose Online-Werkzeuge zur PDF-Bearbeitung, -Konvertierung und -Verwaltung. Alle Werkzeuge sind ohne Registrierung verfügbar. Die Dateiverarbeitung erfolgt lokal in Ihrem Browser — Dateien werden nicht an unseren Server gesendet (außer URL-to-PDF).' },
      { h: '3. Haftung', p: 'OptimaPDF bemüht sich um Genauigkeit, garantiert jedoch keinen unterbrechungsfreien Dienst. Benutzern wird empfohlen, Sicherungskopien ihrer Dateien aufzubewahren.' },
      { h: '4. Urheberrecht', p: 'Der Name und das Logo von OptimaPDF sind Eigentum des Dienstes. Das Kopieren oder Verteilen des Codes ohne Genehmigung ist verboten.' },
      { h: '5. Datenschutz', p: 'Details zur Datenverarbeitung finden Sie in unserer Datenschutzerklärung.' },
      { h: '6. Kontakt', p: 'Bei Anfragen: kontakt@optimapdf.com.' },
    ],
  },
  es: {
    title: 'Términos de Servicio',
    updated: 'Última actualización: 29 de junio de 2026',
    sections: [
      { h: '1. Disposiciones Generales', p: 'Estos Términos de Servicio rigen el uso de OptimaPDF (optimapdf.com), operado por Leszek Hofman, Dąbrówka Nowa, Polonia. Al utilizar el servicio, usted acepta estos términos.' },
      { h: '2. Descripción del Servicio', p: 'OptimaPDF ofrece herramientas gratuitas en línea para edición, conversión y gestión de archivos PDF. Todas las herramientas están disponibles sin registro. El procesamiento de archivos se realiza localmente en su navegador — los archivos no se envían a nuestro servidor (excepto URL-to-PDF).' },
      { h: '3. Responsabilidad', p: 'OptimaPDF se esfuerza por la exactitud pero no garantiza un servicio ininterrumpido. Se aconseja a los usuarios que mantengan copias de seguridad de sus archivos.' },
      { h: '4. Derechos de Autor', p: 'El nombre y el logotipo de OptimaPDF son propiedad del servicio. Está prohibido copiar o distribuir el código sin permiso.' },
      { h: '5. Privacidad', p: 'Consulte nuestra Política de Privacidad para detalles sobre el procesamiento de datos.' },
      { h: '6. Contacto', p: 'Para consultas: kontakt@optimapdf.com.' },
    ],
  },
  fa: {
    title: 'شرایط خدمات',
    updated: 'آخرین به‌روزرسانی: ۲۹ ژوئن ۲۰۲۶',
    sections: [
      { h: '۱. مقررات کلی', p: 'این شرایط خدمات استفاده شما از OptimaPDF (optimapdf.com) را که توسط Leszek Hofman، Dąbrówka Nowa، لهستان اداره می‌شود، تنظیم می‌کند. با استفاده از این خدمات، شما این شرایط را می‌پذیرید.' },
      { h: '۲. توضیحات خدمات', p: 'OptimaPDF ابزارهای رایگان آنلاین برای ویرایش، تبدیل و مدیریت فایل‌های PDF ارائه می‌دهد. همه ابزارها بدون ثبت‌نام در دسترس هستند. پردازش فایل‌ها به صورت محلی در مرورگر شما انجام می‌شود — فایل‌ها به سرور ما ارسال نمی‌شوند (به جز URL-to-PDF).' },
      { h: '۳. مسئولیت', p: 'OptimaPDF تلاش می‌کند دقت داشته باشد اما خدمات بدون وقفه را تضمین نمی‌کند. به کاربران توصیه می‌شود از فایل‌های خود نسخه پشتیبان تهیه کنند.' },
      { h: '۴. حق نشر', p: 'نام و لوگوی OptimaPDF متعلق به این خدمات است. کپی یا توزیع کد بدون اجازه ممنوع است.' },
      { h: '۵. حریم خصوصی', p: 'برای جزئیات درباره پردازش داده‌ها به سیاست حفظ حریم خصوصی ما مراجعه کنید.' },
      { h: '۶. تماس', p: 'برای سؤالات: kontakt@optimapdf.com.' },
    ],
  },
  fr: {
    title: 'Conditions d\'Utilisation',
    updated: 'Dernière mise à jour : 29 juin 2026',
    sections: [
      { h: '1. Dispositions Générales', p: 'Ces Conditions d\'Utilisation régissent votre utilisation d\'OptimaPDF (optimapdf.com), exploité par Leszek Hofman, Dąbrówka Nowa, Pologne. En utilisant le service, vous acceptez ces conditions.' },
      { h: '2. Description du Service', p: 'OptimaPDF propose des outils gratuits en ligne pour l\'édition, la conversion et la gestion de fichiers PDF. Tous les outils sont disponibles sans inscription. Le traitement des fichiers se fait localement dans votre navigateur — les fichiers ne sont pas envoyés à notre serveur (sauf URL-to-PDF).' },
      { h: '3. Responsabilité', p: 'OptimaPDF s\'efforce d\'être précis mais ne garantit pas un service ininterrompu. Il est conseillé aux utilisateurs de conserver des copies de sauvegarde de leurs fichiers.' },
      { h: '4. Droits d\'Auteur', p: 'Le nom et le logo d\'OptimaPDF sont la propriété du service. La copie ou la distribution du code sans autorisation est interdite.' },
      { h: '5. Confidentialité', p: 'Veuillez consulter notre Politique de Confidentialité pour les détails sur le traitement des données.' },
      { h: '6. Contact', p: 'Pour les demandes : kontakt@optimapdf.com.' },
    ],
  },
  hi: {
    title: 'सेवा की शर्तें',
    updated: 'अंतिम अपडेट: 29 जून 2026',
    sections: [
      { h: '1. सामान्य प्रावधान', p: 'ये सेवा की शर्तें आपके OptimaPDF (optimapdf.com) के उपयोग को नियंत्रित करती हैं, जिसका संचालन Leszek Hofman, Dąbrówka Nowa, पोलैंड द्वारा किया जाता है। सेवा का उपयोग करके, आप इन शर्तों को स्वीकार करते हैं।' },
      { h: '2. सेवा विवरण', p: 'OptimaPDF मुफ्त ऑनलाइन PDF संपादन, रूपांतरण और प्रबंधन उपकरण प्रदान करता है। सभी उपकरण बिना पंजीकरण के उपलब्ध हैं। फ़ाइल प्रसंस्करण आपके ब्राउज़र में स्थानीय रूप से होता है — फ़ाइलें हमारे सर्वर को नहीं भेजी जातीं (URL-to-PDF को छोड़कर)।' },
      { h: '3. दायित्व', p: 'OptimaPDF सटीकता के लिए प्रयास करता है लेकिन बिना रुकावट सेवा की गारंटी नहीं देता। उपयोगकर्ताओं को अपनी फ़ाइलों का बैकअप रखने की सलाह दी जाती है।' },
      { h: '4. कॉपीराइट', p: 'OptimaPDF का नाम और लोगो सेवा की संपत्ति है। अनुमति के बिना कोड की प्रतिलिपि या वितरण निषिद्ध है।' },
      { h: '5. गोपनीयता', p: 'डेटा प्रसंस्करण पर विवरण के लिए हमारी गोपनीयता नीति देखें।' },
      { h: '6. संपर्क', p: 'पूछताछ के लिए: kontakt@optimapdf.com.' },
    ],
  },
  is: {
    title: 'Þjónustuskilmálar',
    updated: 'Síðast uppfært: 29. júní 2026',
    sections: [
      { h: '1. Almenn ákvæði', p: 'Þessir þjónustuskilmálar gilda um notkun þína á OptimaPDF (optimapdf.com), sem rekið er af Leszek Hofman, Dąbrówka Nowa, Póllandi. Með því að nota þjónustuna samþykkir þú þessa skilmála.' },
      { h: '2. Lýsing þjónustu', p: 'OptimaPDF býður upp á ókeypis netverkfæri til ritstýringar, ummyndunar og stjórunar á PDF-skjölum. Öll verkfæri eru aðgengileg án skráningar. Vinnsla skjala fer fram staðbundið í vafranum þínum — skjöl eru ekki send á þjóninn okkar (nema URL-to-PDF).' },
      { h: '3. Ábyrgð', p: 'OptimaPDF leggur sig fram um nákvæmni en tryggir ekki óslitið þjónustu. Notendum er ráðlagt að geyma afrit af skjölum sínum.' },
      { h: '4. Höfundarréttur', p: 'Nafn og merki OptimaPDF eru eign þjónustunnar. Afritun eða dreifing á kóða án leyfis er bannað.' },
      { h: '5. Persónuvernd', p: 'Sjáðu persónuverndaryfirlýsingu okkar fyrir upplýsingar um vinnslu gagna.' },
      { h: '6. Hafa samband', p: 'Fyrir fyrirspurnir: kontakt@optimapdf.com.' },
    ],
  },
  it: {
    title: 'Termini di Servizio',
    updated: 'Ultimo aggiornamento: 29 giugno 2026',
    sections: [
      { h: '1. Disposizioni Generali', p: 'Questi Termini di Servizio regolano il vostro utilizzo di OptimaPDF (optimapdf.com), gestito da Leszek Hofman, Dąbrówka Nowa, Polonia. Utilizzando il servizio, accettate questi termini.' },
      { h: '2. Descrizione del Servizio', p: 'OptimaPDF offre strumenti gratuiti online per la modifica, la conversione e la gestione di file PDF. Tutti gli strumenti sono disponibili senza registrazione. L\'elaborazione dei file avviene localmente nel vostro browser — i file non vengono inviati al nostro server (eccetto URL-to-PDF).' },
      { h: '3. Responsabilità', p: 'OptimaPDF si impegna per l\'accuratezza ma non garantisce un servizio ininterrotto. Si consiglia agli utenti di conservare copie di backup dei propri file.' },
      { h: '4. Copyright', p: 'Il nome e il logo di OptimaPDF sono di proprietà del servizio. È vietato copiare o distribuire il codice senza autorizzazione.' },
      { h: '5. Privacy', p: 'Consultate la nostra Informativa sulla Privacy per i dettagli sul trattamento dei dati.' },
      { h: '6. Contatto', p: 'Per domande: kontakt@optimapdf.com.' },
    ],
  },
  ja: {
    title: '利用規約',
    updated: '最終更新: 2026年6月29日',
    sections: [
      { h: '1. 一般規定', p: '本利用規約は、ポーランドのDąbrówka NowaのLeszek Hofmanが運営するOptimaPDF（optimapdf.com）のご利用条件を定めるものです。本サービスを使用することにより、ユーザーは本規約に同意したものとみなされます。' },
      { h: '2. サービスの説明', p: 'OptimaPDFは、PDFファイルの編集、変換、管理のための無料オンラインツールを提供しています。すべてのツールは登録なしにご利用いただけます。ファイルの処理はブラウザ内でローカルに行われます — ファイルはサーバーに送信されません（URL-to-PDFを除く）。' },
      { h: '3. 免責事項', p: 'OptimaPDFは正確性を追求しますが、中断のないサービスを保証するものではありません。ユーザーはファイルのバックアップを取ることをお勧めします。' },
      { h: '4. 著作権', p: 'OptimaPDFの名称およびロゴは当サービスの所有物です。許可なくコードを複製または配布することは禁止されています。' },
      { h: '5. プライバシー', p: 'データ処理の詳細については、プライバシーポリシーをご参照ください。' },
      { h: '6. お問い合わせ', p: 'お問い合わせ: kontakt@optimapdf.com.' },
    ],
  },
  no: {
    title: 'Vilkår for bruk',
    updated: 'Sist oppdatert: 29. juni 2026',
    sections: [
      { h: '1. Generelle bestemmelser', p: 'Disse vilkårene for bruk regulerer din bruk av OptimaPDF (optimapdf.com), drevet av Leszek Hofman, Dąbrówka Nowa, Polen. Ved å bruke tjenesten aksepterer du disse vilkårene.' },
      { h: '2. Tjenestebeskrivelse', p: 'OptimaPDF tilbyr gratis nettbaserte verktøy for redigering, konvertering og administrasjon av PDF-filer. Alle verktøy er tilgjengelige uten registrering. Filbehandling skjer lokalt i nettleseren din — filer sendes ikke til serveren vår (unntatt URL-to-PDF).' },
      { h: '3. Ansvar', p: 'OptimaPDF streber etter nøyaktighet, men garanterer ikke uavbrutt tjeneste. Brukere anbefales å ta sikkerhetskopier av filene sine.' },
      { h: '4. Opphavsrett', p: 'Navnet og logoen til OptimaPDF er eiendom til tjenesten. Kopiering eller distribusjon av koden uten tillatelse er forbudt.' },
      { h: '5. Personvern', p: 'Se vår personvernpolicy for detaljer om databehandling.' },
      { h: '6. Kontakt', p: 'For henvendelser: kontakt@optimapdf.com.' },
    ],
  },
  pt: {
    title: 'Termos de Serviço',
    updated: 'Última atualização: 29 de junho de 2026',
    sections: [
      { h: '1. Disposições Gerais', p: 'Estes Termos de Serviço regem o seu uso do OptimaPDF (optimapdf.com), operado por Leszek Hofman, Dąbrówka Nowa, Polônia. Ao utilizar o serviço, você aceita estes termos.' },
      { h: '2. Descrição do Serviço', p: 'O OptimaPDF oferece ferramentas gratuitas online para edição, conversão e gerenciamento de arquivos PDF. Todas as ferramentas estão disponíveis sem registro. O processamento de arquivos ocorre localmente no seu navegador — os arquivos não são enviados ao nosso servidor (exceto URL-to-PDF).' },
      { h: '3. Responsabilidade', p: 'O OptimaPDF procura ser preciso, mas não garante serviço ininterrupto. Recomenda-se aos usuários manterem cópias de backup de seus arquivos.' },
      { h: '4. Direitos Autorais', p: 'O nome e o logotipo do OptimaPDF são propriedade do serviço. É proibido copiar ou distribuir o código sem permissão.' },
      { h: '5. Privacidade', p: 'Consulte nossa Política de Privacidade para detalhes sobre o processamento de dados.' },
      { h: '6. Contato', p: 'Para consultas: kontakt@optimapdf.com.' },
    ],
  },
  sv: {
    title: 'Användarvillkor',
    updated: 'Senast uppdaterad: 29 juni 2026',
    sections: [
      { h: '1. Allmänna bestämmelser', p: 'Dessa användarvillkor reglerar din användning av OptimaPDF (optimapdf.com), som drivs av Leszek Hofman, Dąbrówka Nowa, Polen. Genom att använda tjänsten godkänner du dessa villkor.' },
      { h: '2. Tjänstebeskrivning', p: 'OptimaPDF erbjuder gratis onlineverktyg för redigering, konvertering och hantering av PDF-filer. Alla verktyg är tillgängliga utan registrering. Filhanteringen sker lokalt i din webbläsare — filer skickas inte till vår server (undantaget URL-to-PDF).' },
      { h: '3. Ansvar', p: 'OptimaPDF strävar efter noggrannhet men garanterar inte avbröstfri tjänst. Användare rekommenderas att säkerhetskopiera sina filer.' },
      { h: '4. Upphovsrätt', p: 'Namnet och logotypen för OptimaPDF är tjänstens egendom. Kopiering eller distribution av koden utan tillstånd är förbjudet.' },
      { h: '5. Integritet', p: 'Se vår integritetspolicy för detaljer om databehandling.' },
      { h: '6. Kontakt', p: 'För förfrågningar: kontakt@optimapdf.com.' },
    ],
  },
  tr: {
    title: 'Hizmet Şartları',
    updated: 'Son güncelleme: 29 Haziran 2026',
    sections: [
      { h: '1. Genel Hükümler', p: 'Bu Hizmet Şartları, Polonya Dąbrówka Nowa\'da Leszek Hofman tarafından işletilen OptimaPDF (optimapdf.com) kullanımınızı düzenler. Hizmeti kullanarak bu şartları kabul edersiniz.' },
      { h: '2. Hizmet Açıklaması', p: 'OptimaPDF, PDF düzenleme, dönüştürme ve yönetimi için ücretsiz çevrimiçi araçlar sunar. Tüm araçlar kayıt olmadan kullanılabilir. Dosya işleme tarayıcınızda yerel olarak gerçekleşir — dosyalar sunucumuza gönderilmez (URL-to-PDF hariç).' },
      { h: '3. Sorumluluk', p: 'OptimaPDF doğruluk için çaba gösterir ancak kesintisiz hizmet garanti etmez. Kullanıcıların dosyalarının yedeklerini saklamaları tavsiye edilir.' },
      { h: '4. Telif Hakkı', p: 'OptimaPDF adı ve logosu hizmetin mülkiyetindedir. İzin olmadan kodu kopyalamak veya dağıtmak yasaktır.' },
      { h: '5. Gizlilik', p: 'Veri işleme hakkında ayrıntılar için Gizlilik Politikamıza bakın.' },
      { h: '6. İletişim', p: 'Sorularınız için: kontakt@optimapdf.com.' },
    ],
  },
  zh: {
    title: '服务条款',
    updated: '最后更新: 2026年6月29日',
    sections: [
      { h: '1. 一般条款', p: '本服务条款规范您对OptimaPDF (optimapdf.com) 的使用，该服务由Leszek Hofman, Dąbrówka Nowa, 波兰运营。使用本服务即表示您接受这些条款。' },
      { h: '2. 服务描述', p: 'OptimaPDF提供免费的在线PDF编辑、转换和管理工具。所有工具无需注册即可使用。文件处理在您的浏览器中本地进行 — 文件不会发送到我们的服务器（URL-to-PDF除外）。' },
      { h: '3. 责任', p: 'OptimaPDF力求准确但不保证不间断服务。建议用户保留文件备份。' },
      { h: '4. 版权', p: 'OptimaPDF的名称和标志是本服务的财产。未经许可复制或分发代码是被禁止的。' },
      { h: '5. 隐私', p: '有关数据处理的详细信息，请参阅我们的隐私政策。' },
      { h: '6. 联系方式', p: '咨询请发送至: kontakt@optimapdf.com.' },
    ],
  },
};

export default function TermsPage({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const { locale: detectedLocale } = useLocale();
  const locale = forcedLocale || detectedLocale;
  const lang = (locale === 'en' || !(locale in content)) ? 'en' : (locale as keyof typeof content);
  const data = content[lang] || content.en;

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/" className="text-sm text-[var(--coffee-accent)] hover:underline mb-4 inline-block">&larr; {t('back.to_home', locale)}</Link>
      <h1 className="text-3xl font-bold mb-2">{data.title}</h1>
      <p className="text-sm text-gray-500 mb-8">{data.updated}</p>
      {data.sections.map((s: any, i: number) => (
        <section key={i} className="mb-6">
          <h2 className="text-xl font-semibold mb-2">{s.h}</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{s.p}</p>
        </section>
      ))}
    </main>
  );
}
