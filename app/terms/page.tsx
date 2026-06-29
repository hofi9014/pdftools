'use client';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

const content = {
  pl: {
    title: 'Regulamin',
    updated: 'Ostatnia aktualizacja: 29 czerwca 2026',
    sections: [
      {
        h: '1. Postanowienia ogólne',
        p: 'Niniejszy Regulamin określa zasady korzystania z serwisu OptimaPDF (optimapdf.com). Korzystając z serwisu, akceptujesz postanowienia niniejszego Regulaminu.',
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
      { h: '1. General Provisions', p: 'These Terms of Service govern your use of OptimaPDF (optimapdf.com). By using the service, you accept these terms.' },
      { h: '2. Service Description', p: 'OptimaPDF offers free online PDF editing, conversion and management tools. All tools are available without registration. File processing happens locally in your browser — files are not sent to our server (except URL-to-PDF).' },
      { h: '3. Liability', p: 'OptimaPDF strives for accuracy but does not guarantee uninterrupted service. Users are advised to keep backups of their files.' },
      { h: '4. Copyright', p: 'The OptimaPDF name and logo are property of the service. Copying or distributing the code without permission is prohibited.' },
      { h: '5. Privacy', p: 'See our Privacy Policy for details on data processing.' },
      { h: '6. Contact', p: 'For inquiries: kontakt@optimapdf.com.' },
    ],
  },
};

export default function TermsPage() {
  const { locale } = useLocale();
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
