'use client';
import { t } from '@/lib/i18n';
import { useLocale } from '@/lib/locale-context';

export function RecommendedSize({ locale }: { locale: string }) {
  return (
    <p className="text-xs mt-3 text-center" style={{ color: 'var(--coffee-text-tertiary)' }}>
      {t('upload.recommended_size', locale)}
    </p>
  );
}

export function LargeFileWarning({ size, locale }: { size: string; locale: string }) {
  return (
    <p className="text-xs mt-2 text-center" style={{ color: 'var(--coffee-accent)' }}>
      {t('upload.large_file_warning', locale).replace('{size}', size)}
    </p>
  );
}
