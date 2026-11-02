import { t, type Locale } from '@/lib/i18n';
import { DAILY_LIMIT } from '@/lib/ai-limit';

/**
 * Shown next to the action button of the three AI tools: what is free, how many requests a day,
 * and where the text goes. The number comes from the same constant the server enforces.
 */
export default function AiNotice({ locale }: { locale: Locale }) {
  return (
    <div
      className="rounded-xl border p-4 mb-6 text-sm leading-relaxed"
      style={{ background: 'var(--coffee-accent-subtle)', borderColor: 'var(--coffee-border-strong)' }}
    >
      <p className="font-semibold" style={{ color: 'var(--coffee-text)' }}>
        {t('ai.notice_free', locale, { limit: String(DAILY_LIMIT) })}
      </p>
      <p className="mt-1 text-xs" style={{ color: 'var(--coffee-text-secondary)' }}>
        {t('page.ai_warning', locale)}
      </p>
    </div>
  );
}
