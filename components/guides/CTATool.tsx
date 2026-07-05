import Link from 'next/link';
import { t } from '@/lib/i18n';
import type { ToolSlug } from '@/types/guide';

const toolHref: Record<ToolSlug, string> = {
  merge: '/merge', split: '/split', compress: '/compress',
  word: '/pdf-to-word', wordtopdf: '/word-to-pdf',
  jpg: '/pdf-to-jpg', jpgTopdf: '/jpg-to-pdf',
  protect: '/protect-pdf', unlock: '/unlock-pdf',
  rotate: '/rotate-pdf', pagenumbers: '/page-numbers',
  watermark: '/watermark-pdf', ocr: '/ocr-pdf',
  extract: '/extract-pages', delete: '/delete-pages',
  reorder: '/reorder-pages', crop: '/crop-pdf',
  addpage: '/add-page', metadata: '/metadata',
  edit: '/edit-pdf', sign: '/sign-pdf',
  excel: '/pdf-to-excel', excel2pdf: '/excel-to-pdf',
  txt: '/pdf-to-txt', svg: '/pdf-to-svg',
  redact: '/redact-pdf', epub: '/pdf-to-epub',
  aichat: '/ai-chat', aisummary: '/ai-summary',
  translate: '/ai-translate', ppt: '/pdf-to-powerpoint',
  compare: '/compare-pdf', html: '/html-to-pdf',
  url: '/url-to-pdf', html2pdf: '/pdf-to-html',
  flatten: '/flatten-pdf', openoffice: '/openoffice-to-pdf',
  pdf2openoffice: '/pdf-to-openoffice',
  fillform: '/fill-form', images: '/pdf-to-images',
  pdfa: '/to-pdfa',
};

export default function CTATool({ tool, locale }: { tool: ToolSlug; locale: string }) {
  const href = toolHref[tool];
  const toolName = t(`tool.${tool}`, locale);

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 my-6 text-center">
      <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
        {t('guides.try_tool', locale)}
      </p>
      <p className="text-2xl mb-3">{toolName}</p>
      <Link
        href={href}
        className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition text-sm"
      >
        {t('guides.open_tool', locale)}
      </Link>
    </div>
  );
}
