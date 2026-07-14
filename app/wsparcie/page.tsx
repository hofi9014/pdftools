'use client';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

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
