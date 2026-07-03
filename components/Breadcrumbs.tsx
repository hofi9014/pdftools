'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { localeGuidesSlug, localeFromSegment } from '@/lib/guides-slugs';

const guidesLocaleSegments = new Set(Object.values(localeGuidesSlug));

const segmentToKey: Record<string, string> = {
  'merge': 'merge',
  'split': 'split',
  'compress': 'compress',
  'pdf-to-word': 'word',
  'word-to-pdf': 'wordtopdf',
  'pdf-to-jpg': 'jpg',
  'jpg-to-pdf': 'jpgTopdf',
  'protect-pdf': 'protect',
  'unlock-pdf': 'unlock',
  'rotate-pdf': 'rotate',
  'page-numbers': 'pagenumbers',
  'watermark-pdf': 'watermark',
  'ocr-pdf': 'ocr',
  'extract-pages': 'extract',
  'delete-pages': 'delete',
  'reorder-pages': 'reorder',
  'crop-pdf': 'crop',
  'add-page': 'addpage',
  'metadata': 'metadata',
  'edit-pdf': 'edit',
  'sign-pdf': 'sign',
  'pdf-to-excel': 'excel',
  'excel-to-pdf': 'excel2pdf',
  'pdf-to-txt': 'txt',
  'pdf-to-svg': 'svg',
  'redact-pdf': 'redact',
  'pdf-to-epub': 'epub',
  'ai-chat': 'aichat',
  'ai-summary': 'aisummary',
  'ai-translate': 'translate',
  'pdf-to-powerpoint': 'ppt',
  'compare-pdf': 'compare',
  'html-to-pdf': 'html',
  'url-to-pdf': 'url',
  'pdf-to-html': 'html2pdf',
  'flatten-pdf': 'flatten',
  'openoffice-to-pdf': 'openoffice',
  'pdf-to-openoffice': 'pdf2openoffice',
  'fill-form': 'fillform',
  'pdf-to-images': 'images',
  'to-pdfa': 'pdfa',
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  const { locale } = useLocale();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const homeLabel = t('breadcrumb.home', locale);

  return (
    <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 pt-4 text-sm" style={{ color: 'var(--coffee-text-tertiary)' }}>
      <ol className="flex items-center flex-wrap gap-x-1.5 gap-y-1 text-xs sm:text-sm">
        <li>
          <Link href="/" className="hover:text-[var(--coffee-accent)] transition">{homeLabel}</Link>
        </li>
        {segments.map((seg, i) => {
          const key = segmentToKey[seg];
          let label: string;
          if (key) {
            label = t(`tool.${key}`, locale);
          } else if (seg === 'guides') {
            // skip — the next segment is the locale segment
            return null;
          } else if (guidesLocaleSegments.has(seg)) {
            label = t('guides.breadcrumb', locale);
          } else {
            label = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
          }
          const href = '/' + segments.slice(0, i + 1).join('/');
          const isLast = i === segments.length - 1;
          return (
            <li key={seg} className="flex items-center gap-1.5">
              <span style={{ color: 'var(--coffee-border-strong)' }}>/</span>
              {isLast ? (
                <span className="font-medium" style={{ color: 'var(--coffee-text)' }}>{label}</span>
              ) : (
                <Link href={href} className="hover:text-[var(--coffee-accent)] transition" style={{ color: 'var(--coffee-text-tertiary)' }}>{label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
