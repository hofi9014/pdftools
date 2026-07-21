import Link from 'next/link';
import { t } from '@/lib/i18n';
import { toolPath } from '@/lib/tools';
import type { ToolSlug } from '@/types/guide';

export default function CTATool({ tool, locale }: { tool: ToolSlug; locale: string }) {
  const href = toolPath(tool, locale);
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
