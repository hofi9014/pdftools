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
  de: {
    title: 'Nutzungsbedingungen',
    updated: 'Letzte Aktualisierung: 29. Juni 2026',
    sections: [
      { h: '1. Allgemeine Bestimmungen', p: 'Diese Nutzungsbedingungen regeln die Nutzung von OptimaPDF (optimapdf.com), betrieben von Leszek Hofman, Dąbrówka Nowa, Polen. Durch die Nutzung des Dienstes akzeptieren Sie diese Bedingungen.' },
      { h: '2. Dienstleistungsbeschreibung', p: 'OptimaPDF bietet kostenlose Online-PDF-Bearbeitungs-, Konvertierungs- und Verwaltungswerkzeuge. Alle Werkzeuge sind ohne Registrierung verfügbar. Die Dateiverarbeitung erfolgt lokal in Ihrem Browser — Dateien werden nicht an unseren Server gesendet (außer URL-to-PDF).' },
      { h: '3. Haftung', p: 'OptimaPDF bemüht sich um Genauigkeit, garantiert jedoch keine unterbrechungsfreie Nutzung. Benutzern wird empfohlen, Sicherungskopien ihrer Dateien zu erstellen.' },
      { h: '4. Urheberrecht', p: 'Der Name und das Logo von OptimaPDF sind Eigentum des Dienstes. Das Kopieren oder Verteilen des Codes ohne Genehmigung ist verboten.' },
      { h: '5. Datenschutz', p: 'Einzelheiten zur Datenverarbeitung finden Sie in unserer Datenschutzerklärung.' },
      { h: '6. Kontakt', p: 'Für Anfragen: kontakt@optimapdf.com.' },
    ],
  },
  es: {
    title: 'Términos de Uso',
    updated: 'Última actualización: 29 de junio de 2026',
    sections: [
      { h: '1. Disposiciones generales', p: 'Estos Términos de Uso rigen el uso de OptimaPDF (optimapdf.com), operado por Leszek Hofman, Dąbrówka Nowa, Polonia. Al utilizar el servicio, usted acepta estos términos.' },
      { h: '2. Descripción del servicio', p: 'OptimaPDF ofrece herramientas gratuitas de edición, conversión y gestión de PDF en línea. Todas las herramientas están disponibles sin registro. El procesamiento de archivos se realiza localmente en su navegador — los archivos no se envían a nuestro servidor (excepto URL-to-PDF).' },
      { h: '3. Responsabilidad', p: 'OptimaPDF se esfuerza por la exactitud pero no garantiza un servicio ininterrumpido. Se aconseja a los usuarios que mantengan copias de seguridad de sus archivos.' },
      { h: '4. Derechos de autor', p: 'El nombre y el logo de OptimaPDF son propiedad del servicio. Está prohibido copiar o distribuir el código sin permiso.' },
      { h: '5. Privacidad', p: 'Consulte nuestra Política de Privacidad para detalles sobre el procesamiento de datos.' },
      { h: '6. Contacto', p: 'Para consultas: kontakt@optimapdf.com.' },
    ],
  },
  pt: {
    title: 'Termos de Utilização',
    updated: 'Última atualização: 29 de junho de 2026',
    sections: [
      { h: '1. Disposições Gerais', p: 'Estes Termos de Utilização regulam a utilização do OptimaPDF (optimapdf.com), operado por Leszek Hofman, Dąbrówka Nowa, Polónia. Ao utilizar o serviço, o utilizador aceita estes termos.' },
      { h: '2. Descrição do Serviço', p: 'O OptimaPDF oferece ferramentas gratuitas de edição, conversão e gestão de PDF em linha. Todas as ferramentas estão disponíveis sem registo. O processamento de ficheiros é feito localmente no navegador do utilizador — os ficheiros não são enviados para o nosso servidor (exceto URL-to-PDF).' },
      { h: '3. Responsabilidade', p: 'O OptimaPDF esforça-se pela precisão mas não garante um serviço ininterrupto. Aconselha-se os utilizadores a manterem cópias de segurança dos seus ficheiros.' },
      { h: '4. Direitos de Autor', p: 'O nome e o logótipo do OptimaPDF são propriedade do serviço. É proibido copiar ou distribuir o código sem autorização.' },
      { h: '5. Privacidade', p: 'Consulte a nossa Política de Privacidade para detalhes sobre o processamento de dados.' },
      { h: '6. Contacto', p: 'Para esclarecimentos: kontakt@optimapdf.com.' },
    ],
  },
  no: {
    title: 'Bruksvilkår',
    updated: 'Sist oppdatert: 29. juni 2026',
    sections: [
      { h: '1. Generelle vilkår', p: 'Disse bruksvilkårene regulerer bruken av OptimaPDF (optimapdf.com), driftet av Leszek Hofman, Dąbrówka Nowa, Polen. Ved å bruke tjenesten aksepterer du disse vilkårene.' },
      { h: '2. Tjenestebeskrivelse', p: 'OptimaPDF tilbyr gratis nettbaserte PDF-redigerings-, konverterings- og administrasjonsverktøy. Alle verktøy er tilgjengelige uten registrering. Filbehandling skjer lokalt i nettleseren din — filer sendes ikke til vår server (unntatt URL-to-PDF).' },
      { h: '3. Ansvar', p: 'OptimaPDF streber etter nøyaktighet, men garanterer ikke uavbrutt tjeneste. Brukere anbefales å sikkerhetskopiere filene sine.' },
      { h: '4. Opphavsrett', p: 'OptimaPDF-navnet og -logoen er eiendom til tjenesten. Kopiering eller distribusjon av koden uten tillatelse er forbudt.' },
      { h: '5. Personvern', p: 'Se vår personvernpolicy for detaljer om databehandling.' },
      { h: '6. Kontakt', p: 'For henvendelser: kontakt@optimapdf.com.' },
    ],
  },
  sv: {
    title: 'Användarvillkor',
    updated: 'Senast uppdaterad: 29 juni 2026',
    sections: [
      { h: '1. Allmänna användarvillkor', p: 'Dessa användarvillkor reglerar användningen av OptimaPDF (optimapdf.com), drivet av Leszek Hofman, Dąbrówka Nowa, Polen. Genom att använda tjänsten accepterar du dessa villkor.' },
      { h: '2. Tjänstebeskrivning', p: 'OptimaPDF erbjuder gratis onlineverktyg för redigering, konvertering och hantering av PDF-filer. Alla verktyg är tillgängliga utan registrering. Filhantering sker lokalt i din webbläsare — filer skickas inte till vår server (undantaget URL-to-PDF).' },
      { h: '3. Ansvar', p: 'OptimaPDF strävar efter noggrannhet men garanterar inte oavbruten tjänst. Användare rekommenderas att säkerhetskopiera sina filer.' },
      { h: '4. Upphovsrätt', p: 'OptimaPDF-namnet och logotypen är tjänstens egendom. Kopiering eller distribution av koden utan tillstånd är förbjudet.' },
      { h: '5. Integritet', p: 'Se vår integritetspolicy för detaljer om databehandling.' },
      { h: '6. Kontakt', p: 'För förfrågningar: kontakt@optimapdf.com.' },
    ],
  },
  fr: {
    title: 'Conditions d\'Utilisation',
    updated: 'Dernière mise à jour : 29 juin 2026',
    sections: [
      { h: '1. Conditions Générales', p: 'Les présentes Conditions d\'Utilisation régissent l\'utilisation d\'OptimaPDF (optimapdf.com), exploité par Leszek Hofman, Dąbrówka Nowa, Pologne. En utilisant le service, vous acceptez ces conditions.' },
      { h: '2. Description du service', p: 'OptimaPDF propose des outils gratuits en ligne pour l\'édition, la conversion et la gestion de fichiers PDF. Tous les outils sont accessibles sans inscription. Le traitement des fichiers s\'effectue localement dans votre navigateur — les fichiers ne sont pas envoyés à notre serveur (sauf URL-to-PDF).' },
      { h: '3. Responsabilité', p: 'OptimaPDF s\'efforce d\'assurer l\'exactitude des informations mais ne garantit pas une disponibilité ininterrompue du service. Il est conseillé aux utilisateurs de conserver des copies de sauvegarde de leurs fichiers.' },
      { h: '4. Droits d\'auteur', p: 'Le nom et le logo d\'OptimaPDF sont la propriété du service. La copie ou la distribution du code sans autorisation est interdite.' },
      { h: '5. Confidentialité', p: 'Veuillez consulter notre Politique de Confidentialité pour plus de détails concernant le traitement des données.' },
      { h: '6. Contact', p: 'Pour toute demande : kontakt@optimapdf.com.' },
    ],
  },
  ar: {
    title: 'شروط الخدمة',
    updated: 'آخر تحديث: 29 يونيو 2026',
    sections: [
      { h: '1. الأحكام العامة', p: 'تحكم شروط الخدمة هذه استخدامك لموقع OptimaPDF (optimapdf.com)، الذي يُشغّله Leszek Hofman، Dąbrówka Nowa، بولندا. باستخدامك للخدمة، أنت تقبل هذه الشروط.' },
      { h: '2. وصف الخدمة', p: 'يوفر OptimaPDF أدوات مجانية عبر الإنترنت لتحرير ملفات PDF وتحويلها وإدارتها. جميع الأدوات متاحة بدون تسجيل. تتم معالجة الملفات محلياً في متصفحك — لا يتم إرسال الملفات إلى خادمنا (باستثناء URL-to-PDF).' },
      { h: '3. المسؤولية', p: 'بذل OptimaPDF جهوداً لضمان دقة المعلومات ولكنه لا يضمن خدمة دون انقطاع. يُنصح المستخدمون بالاحتفاظ بنسخ احتياطية من ملفاتهم.' },
      { h: '4. حقوق النشر', p: 'اسم OptimaPDF وشعاره هما ملك للخدمة. يُحظر نسخ الكود أو توزيعه دون إذن.' },
      { h: '5. الخصوصية', p: 'راجع سياسة الخصوصية الخاصة بنا لمزيد من التفاصيل حول معالجة البيانات.' },
      { h: '6. للتواصل', p: 'للاستفسارات: kontakt@optimapdf.com.' },
    ],
  },
  fa: {
    title: 'شرایط استفاده',
    updated: 'آخرین به‌روزرسانی: ۲۹ ژوئن ۲۰۲۶',
    sections: [
      { h: '۱. مقررات کلی', p: 'این شرایط استفاده، استفاده شما از OptimaPDF (optimapdf.com) را که توسط Leszek Hofman، Dąbrówka Nowa، لهستان اداره می‌شود، تنظیم می‌کند. با استفاده از سرویس، شما این شرایط را می‌پذیرید.' },
      { h: '۲. توضیحات سرویس', p: 'OptimaPDF ابزارهای رایگان آنلاین برای ویرایش، تبدیل و مدیریت فایل‌های PDF ارائه می‌دهد. تمام ابزارها بدون ثبت‌نام در دسترس هستند. پردازش فایل‌ها به صورت محلی در مرورگر شما انجام می‌شود — فایل‌ها به سرور ما ارسال نمی‌شوند (به استثنای URL-to-PDF).' },
      { h: '۳. مسئولیت', p: 'OptimaPDF تلاش می‌کند اطلاعات دقیق ارائه دهد اما خدمات بدون وقفه را تضمین نمی‌کند. به کاربران توصیه می‌شود نسخه‌های پشتیبان از فایل‌های خود نگهداری کنند.' },
      { h: '۴. حق نشر', p: 'نام و لوگوی OptimaPDF متعلق به سرویس است. کپی یا توزیع کد بدون اجازه ممنوع است.' },
      { h: '۵. حریم خصوصی', p: 'برای جزئیات بیشتر در مورد پردازش داده‌ها، سیاست حفظ حریم خصوصی ما را مشاهده کنید.' },
      { h: '۶. تماس', p: 'برای پرسش‌ها: kontakt@optimapdf.com.' },
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
};

export default function TermsPage({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const { locale: detectedLocale } = useLocale();
  const locale = forcedLocale || detectedLocale;
  const lang = (locale === 'en' || !(locale in content)) ? 'en' : (locale as keyof typeof content);
  const data = content[lang] || content.en;
  const isRtl = locale === 'ar' || locale === 'fa';

  return (
    <main className="max-w-3xl mx-auto px-4 py-12" dir={isRtl ? 'rtl' : 'ltr'}>
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
