'use client';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

const content = {
  pl: {
    title: 'Nasze zasady',
    subtitle: 'Jak budujemy OptimaPDF — przejrzyście i uczciwie.',
    sections: [
      {
        h: '1. Twoja prywatność jest najważniejsza',
        p: 'OptimaPDF został zaprojektowany zgodnie z zasadą privacy by design. Większość narzędzi przetwarza pliki w całości w Twojej przeglądarce — plik nigdy nie opuszcza Twojego urządzenia. Nie wymagamy rejestracji, logowania ani podawania jakichkolwiek danych osobowych.',
      },
      {
        h: '2. Darmowe narzędzia PDF dla każdego',
        p: 'Wszystkie podstawowe narzędzia do edycji PDF są w pełni darmowe — bez ukrytych opłat, bez limitów, bez subskrypcji. Uważamy, że podstawowe funkcje pracy z PDF powinny być dostępne dla każdego, niezależnie od budżetu.',
      },
      {
        h: '3. Przejrzystość techniczna',
        p: 'Informujemy, które narzędzia działają po stronie klienta (w przeglądarce), a które wymagają przetwarzania na serwerze. Zawsze jasno komunikujemy, co dzieje się z Twoim plikiem na każdym etapie.',
      },
      {
        h: '4. Bezpieczeństwo przede wszystkim',
        p: 'Stosujemy szyfrowanie TLS/SSL, Content Security Policy (CSP), przetwarzanie plików wyłącznie w pamięci RAM oraz automatyczne usuwanie danych po zakończeniu operacji. Nie przechowujemy plików na dyskach serwera.',
      },
      {
        h: '5. Zero reklam, zero trackingu',
        p: 'Nie wyświetlamy reklam ani nie sprzedajemy danych użytkowników. Google Analytics jest używany wyłącznie za Twoją zgodą i w anonimowej formie. Nie używamy pikseli śledzących, remarketingu ani profilowania behawioralnego.',
      },
      {
        h: '6. Otwartość na feedback',
        p: 'Tworzymy OptimaPDF z myślą o użytkownikach. Każda opinia, zgłoszenie błędu czy sugestia nowej funkcji jest dla nas cenna. Możesz skontaktować się z nami poprzez stronę wsparcia.',
      },
    ],
  },
  en: {
    title: 'Our Principles',
    subtitle: 'How we build OptimaPDF — transparently and fairly.',
    sections: [
      {
        h: '1. Your privacy comes first',
        p: 'OptimaPDF is built on the privacy by design principle. Most tools process files entirely in your browser — the file never leaves your device. We do not require registration, login, or any personal data.',
      },
      {
        h: '2. Free PDF tools for everyone',
        p: 'All basic PDF editing tools are completely free — no hidden fees, no limits, no subscriptions. We believe essential PDF functionality should be accessible to everyone, regardless of budget.',
      },
      {
        h: '3. Technical transparency',
        p: 'We clearly indicate which tools work client-side (in your browser) and which require server processing. We always communicate what happens to your file at every step.',
      },
      {
        h: '4. Security first',
        p: 'We use TLS/SSL encryption, Content Security Policy (CSP), RAM-only file processing, and automatic data deletion after each operation. We do not store files on server disks.',
      },
      {
        h: '5. Zero ads, zero tracking',
        p: 'We do not display ads or sell user data. Google Analytics is used only with your consent and in anonymized form. We do not use tracking pixels, remarketing, or behavioral profiling.',
      },
      {
        h: '6. Open to feedback',
        p: 'We build OptimaPDF with our users in mind. Every opinion, bug report, or feature suggestion is valuable to us. You can contact us through the support page.',
      },
    ],
  },
};

export default function RulesPage() {
  const { locale } = useLocale();
  const lang = (content as Record<string, typeof content.pl>)[locale] || content.en;

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
            <p>{sec.p}</p>
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
