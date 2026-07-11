'use client';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

const content = {
  pl: {
    title: 'Wsparcie',
    subtitle: 'Masz pytanie? Jesteśmy tutaj, aby pomóc.',
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
    subtitle: 'Have a question? We are here to help.',
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
};

export default function SupportPage() {
  const { locale } = useLocale();
  const lang = (content as Record<string, typeof content.pl>)[locale] || content.en;

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">💬</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{lang.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">{lang.subtitle}</p>
      </div>

      <div className="tool-card rounded-2xl border p-8 space-y-8 text-sm leading-relaxed" style={{ color: 'var(--coffee-text-secondary)' }}>
        {lang.sections.map((sec, i) => (
          <section key={i}>
            <h2 className="text-lg sm:text-xl font-bold tool-heading mb-3">{sec.h}</h2>
            <p className="mb-2">{sec.p}</p>
            {sec.link && (
              <p>
                <a href={sec.link} className="!text-[var(--coffee-accent)] hover:underline font-medium">
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
        <Link href="/" className="!text-[var(--coffee-accent)] hover:underline text-sm">
          {t('back.to_home', locale)}
        </Link>
      </div>
    </main>
  );
}
