'use client';
import { useState, useCallback } from 'react';
import { editPdfClient } from '@/lib/client-pdf';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';

type PdfElement = {
  id: number;
  type: 'text' | 'rect';
  x: number;
  y: number;
  text?: string;
  size?: number;
  color?: string;
  width?: number;
  height?: number;
  opacity?: number;
};

export default function EditPdf() {
  const { locale } = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [page, setPage] = useState(1);
  const [elements, setElements] = useState<PdfElement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newText, setNewText] = useState('');
  const [newX, setNewX] = useState(50);
  const [newY, setNewY] = useState(100);
  const [newSize, setNewSize] = useState(16);
  const [newColor, setNewColor] = useState('#000000');

  const addText = useCallback(() => {
    if (!newText.trim()) return;
    setElements(prev => [...prev, {
      id: Date.now(),
      type: 'text',
      x: newX,
      y: newY,
      text: newText,
      size: newSize,
      color: newColor,
      opacity: 1,
    }]);
    setNewText('');
  }, [newText, newX, newY, newSize, newColor]);

  const removeEl = useCallback((id: number) => {
    setElements(prev => prev.filter(e => e.id !== id));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || elements.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const blob = await editPdfClient(
        file,
        page - 1,
        elements.map((el) => ({ type: el.type, x: el.x, y: el.y, text: el.text, size: el.size, color: el.color, width: el.width, height: el.height, opacity: el.opacity }))
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edytowany-${file.name}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('page.edit.unknown_error', locale));
    } finally {
      setLoading(false);
    }
  }, [file, page, elements]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">{getToolIcon('edit')}</div>
        <h1 className="text-3xl font-bold tool-heading">{t('tool.edit', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{t('page.edit.desc', locale)}</p>
      </div>

      <form onSubmit={handleSubmit} className="tool-card rounded-2xl border p-8 space-y-6">
        <div className="tool-dropzone rounded-xl p-6 text-center cursor-pointer transition" onClick={() => document.getElementById('file-input')?.click()}>
          <input id="file-input" type="file" accept=".pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {file ? <p className="!text-[var(--coffee-accent)] font-medium">{file.name}</p> : <p className="text-gray-400 dark:text-gray-500">{t('page.edit.click_select', locale)}</p>}
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-600 dark:text-gray-400">{t('page.edit.page', locale)}</label>
          <input type="number" min={1} value={page} onChange={e => setPage(Number(e.target.value) || 1)} className="w-20 px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm tool-heading" />
        </div>

        {file && (
          <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-6 space-y-4">
            <p className="font-semibold tool-heading text-sm">{t('page.edit.add_element', locale)}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">{t('page.edit.text', locale)}</label>
                <input type="text" value={newText} onChange={e => setNewText(e.target.value)} placeholder={t('page.edit.placeholder_text', locale)} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm tool-heading" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">{t('page.edit.x', locale)}</label>
                <input type="number" value={newX} onChange={e => setNewX(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm tool-heading" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">{t('page.edit.y', locale)}</label>
                <input type="number" value={newY} onChange={e => setNewY(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm tool-heading" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">{t('page.edit.size', locale)}</label>
                <input type="number" min={8} max={72} value={newSize} onChange={e => setNewSize(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm tool-heading" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">{t('page.edit.color', locale)}</label>
                <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-full h-[38px] border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer" />
              </div>
            </div>
            <button type="button" onClick={addText} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition">
              {t('page.edit.add_text', locale)}
            </button>
          </div>
        )}

        {elements.length > 0 && (
          <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 space-y-2">
            <p className="font-semibold tool-heading text-sm">{t('page.edit.added_elements', locale)} ({elements.length})</p>
            {elements.map(el => (
              <div key={el.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-lg px-4 py-2 text-sm">
                <span className="text-gray-600 dark:text-gray-400">{el.type === 'text' ? `"${el.text}"` : t('page.edit.highlight', locale)} @ ({el.x}, {el.y})</span>
                <button type="button" onClick={() => removeEl(el.id)} className="text-red-500 hover:text-red-700 text-xs">{t('page.edit.remove', locale)}</button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={!file || elements.length === 0 || loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium rounded-xl transition">
          {loading ? t('page.edit.loading', locale) : t('page.edit.btn', locale)}
        </button>
      </form>

      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
        <h2 className="font-semibold tool-heading mb-2">{t('section.how_it_works', locale)}</h2>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
          <li>{t('page.edit.step1', locale)}</li>
          <li>{t('page.edit.step2', locale)}</li>
          <li>{t('page.edit.step3', locale)}</li>
          <li>{t('page.edit.step4', locale)}</li>
        </ul>
      </div>
    </div>
  );
}
