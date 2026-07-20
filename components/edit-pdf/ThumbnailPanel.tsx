'use client';
import { useEffect, useRef, useState } from 'react';
import { useHydrationSafeLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';

interface Props {
  pageCount: number
  currentPage: number
  onPageSelect: (page: number) => void
  renderPageThumbnail: (pageNum: number) => Promise<{ canvas: HTMLCanvasElement; width: number; height: number } | null>
}

export default function ThumbnailPanel({ pageCount, currentPage, onPageSelect, renderPageThumbnail }: Props) {
  const locale = useHydrationSafeLocale();
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());
  const rendering = useRef(new Set<number>());

  useEffect(() => {
    const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
    for (const p of pages) {
      if (thumbnails.has(p) || rendering.current.has(p)) continue;
      rendering.current.add(p);
      renderPageThumbnail(p).then(result => {
        if (result) {
          setThumbnails(prev => {
            const next = new Map(prev);
            next.set(p, result.canvas.toDataURL('image/jpeg', 0.5));
            return next;
          });
        }
        rendering.current.delete(p);
      }).catch(() => rendering.current.delete(p));
    }
  }, [pageCount, renderPageThumbnail, thumbnails]);

  return (
    <div className="w-full lg:w-28 shrink-0 overflow-y-auto max-h-[calc(100vh-200px)] space-y-2 p-2">
      {Array.from({ length: pageCount }, (_, i) => i + 1).map(p => (
        <button
          key={p}
          onClick={() => onPageSelect(p)}
          className={`w-full rounded-lg overflow-hidden border-2 transition-all ${
            p === currentPage
              ? 'border-[var(--coffee-accent)] shadow-md'
              : 'border-transparent hover:border-[var(--coffee-border-strong)] opacity-60 hover:opacity-100'
          }`}
        >
          {thumbnails.has(p) ? (
            <img src={thumbnails.get(p)} alt={t('edit.page_alt', locale, { n: p })} className="w-full h-auto block" />
          ) : (
            <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-400">
              {p}
            </div>
          )}
          <div className="text-[10px] text-center py-0.5 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            {p}
          </div>
        </button>
      ))}
    </div>
  );
}
