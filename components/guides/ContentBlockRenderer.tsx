import type { ContentBlock, LocalizedString } from '@/types/guide';
import CTATool from './CTATool';

function tls(text: LocalizedString, locale: string): string {
  return (text as Record<string, string>)[locale] || text['en'] || '';
}

export default function ContentBlockRenderer({
  blocks,
  locale,
}: {
  blocks: ContentBlock[];
  locale: string;
}) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'paragraph':
            return <p key={i} className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">{tls(block.text, locale)}</p>;
          case 'heading':
            if (block.level === 2) {
              return <h2 key={i} className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-8 mb-3">{tls(block.text, locale)}</h2>;
            }
            return <h3 key={i} className="text-lg font-semibold text-gray-800 dark:text-gray-100 mt-6 mb-2">{tls(block.text, locale)}</h3>;
          case 'step':
            return (
              <div key={i} className="flex gap-4 mb-5">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold mt-0.5">
                  {(i + 1).toString()}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{tls(block.title, locale)}</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{tls(block.text, locale)}</p>
                </div>
              </div>
            );
          case 'list':
            return (
              <ul key={i} className="list-disc list-inside space-y-2 mb-4 text-gray-700 dark:text-gray-300">
                {block.items.map((item, j) => (
                  <li key={j}>{tls(item, locale)}</li>
                ))}
              </ul>
            );
          case 'cta':
            return <CTATool key={i} tool={block.tool} locale={locale} />;
          default:
            return null;
        }
      })}
    </>
  );
}
