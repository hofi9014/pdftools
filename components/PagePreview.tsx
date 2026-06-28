'use client';
import { useEffect, useState, useCallback } from 'react';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { initPdfjs } from '@/lib/client-pdf';

interface PagePreviewProps {
  file: File;
  mode: 'delete' | 'extract' | 'reorder' | 'select';
  selectedPages: number[];
  onSelectionChange: (pages: number[]) => void;
  onNewOrder: (order: number[]) => void;
}

interface Thumbnail {
  index: number;
  url: string;
}

export default function PagePreview({ file, mode, selectedPages, onSelectionChange, onNewOrder }: PagePreviewProps) {
  const { locale } = useLocale();
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const [currentOrder, setCurrentOrder] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const renderThumbnails = useCallback(async () => {
    setLoading(true);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      await initPdfjs();

      const buf = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
      const pageCount = doc.numPages;
      setTotalPages(pageCount);
      setCurrentOrder(Array.from({ length: pageCount }, (_, i) => i));

      const thumbs: Thumbnail[] = [];
      for (let i = 1; i <= pageCount; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        thumbs.push({ index: i - 1, url: canvas.toDataURL('image/png') });
      }
      setThumbnails(thumbs);
      await doc.cleanup();
    } catch (err) {
      console.error('Failed to render PDF thumbnails:', err);
    } finally {
      setLoading(false);
    }
  }, [file]);

  useEffect(() => { renderThumbnails(); }, [renderThumbnails]);

  const togglePage = (pageIdx: number) => {
    if (mode === 'reorder') return;
    const next = selectedPages.includes(pageIdx)
      ? selectedPages.filter(p => p !== pageIdx)
      : [...selectedPages, pageIdx];
    onSelectionChange(next);
  };

  const handleDragStart = (idx: number) => { setDraggedIdx(idx); };
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDropIdx(idx); };
  const handleDrop = () => {
    if (draggedIdx === null || dropIdx === null || draggedIdx === dropIdx) {
      setDraggedIdx(null); setDropIdx(null); return;
    }
    const newOrder = [...currentOrder];
    const [removed] = newOrder.splice(draggedIdx, 1);
    newOrder.splice(dropIdx, 0, removed);
    setCurrentOrder(newOrder);
    onNewOrder(newOrder);
    setDraggedIdx(null); setDropIdx(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">{t('preview.loading', locale)}</span>
      </div>
    );
  }

  const displayPages = mode === 'reorder' ? currentOrder : Array.from({ length: totalPages }, (_, i) => i);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 mb-6">
      <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3">
        {mode === 'delete' ? t('preview.heading.delete', locale) :
         mode === 'extract' ? t('preview.heading.extract', locale) :
         mode === 'select' ? t('preview.heading.select', locale) :
         t('preview.heading.reorder', locale)}
        <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
          ({mode === 'reorder' ? `${totalPages} ${t('preview.pages', locale)}` : `${selectedPages.length} z ${totalPages} ${t('preview.selected', locale)}`})
        </span>
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {displayPages.map((pageIdx, displayPos) => {
          const thumb = thumbnails[pageIdx];
          const isSelected = selectedPages.includes(pageIdx);
          return (
            <div
              key={pageIdx}
              draggable={mode === 'reorder'}
              onDragStart={() => handleDragStart(displayPos)}
              onDragOver={(e) => handleDragOver(e, displayPos)}
              onDrop={handleDrop}
              onClick={() => togglePage(pageIdx)}
              className={`
                relative rounded-xl border-2 overflow-hidden cursor-pointer transition group
                ${isSelected && mode !== 'reorder' ? (mode === 'select' ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-red-500 dark:border-red-400 ring-2 ring-red-200 dark:ring-red-800') : 'border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'}
                ${draggedIdx === displayPos ? 'opacity-50 scale-95' : ''}
                ${dropIdx === displayPos && draggedIdx !== null ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}
              `}
            >
              {thumb && <img src={thumb.url} alt={`${t('preview.page_alt', locale)} ${pageIdx + 1}`} className="w-full h-auto" />}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1 font-medium">
                {pageIdx + 1}
                {mode === 'reorder' && <span className="ml-1">(#{displayPos + 1})</span>}
              </div>
              {mode !== 'reorder' && (
                <div className={`absolute top-1 right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold transition
                  ${isSelected ? (mode === 'select' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-red-500 border-red-500 text-white') : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500'}`}>
                  {isSelected ? (mode === 'select' ? '✓' : '✕') : ''}
                </div>
              )}
              {mode === 'reorder' && (
                <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition">
                  <span className="text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">↕</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
