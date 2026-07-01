'use client';
import { useState, useEffect, useRef } from 'react';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { FONT_OPTIONS, getFontFamily } from '@/lib/pdf/fonts';
import type { TextEdit } from '@/lib/pdf/exportEditedPdf';

interface TextBlockData {
  id: string
  page: number
  x: number
  y: number
  width: number
  height: number
  originalText: string
  fontSize: number
  fontName: string
  rotation: number
}

interface Props {
  block: TextBlockData
  onSave: (edit: TextEdit) => void
  onCancel: () => void
  position: { top: number; left: number }
}

const COLORS = ['#000000', '#ff0000', '#0000ff', '#00aa00', '#ff8800', '#8800ff'];

export default function TextEditPopup({ block, onSave, onCancel, position }: Props) {
  const { locale } = useLocale();
  const [text, setText] = useState(block.originalText);
  const [fontSize, setFontSize] = useState(Math.min(Math.max(block.fontSize, 8), 72));
  const [color, setColor] = useState('#000000');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  useEffect(() => {
    popupRef.current?.querySelector('textarea')?.focus();
  }, []);

  const handleSave = () => {
    onSave({
      id: block.id,
      page: block.page,
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.height,
      originalText: block.originalText,
      newText: text,
      fontSize,
      fontFamily,
      color,
      bold,
      italic,
    });
  };

  return (
    <div
      ref={popupRef}
      className="fixed z-[200] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-[var(--coffee-border)] p-3 w-72"
      style={{ top: position.top, left: position.left }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-[var(--coffee-text-secondary)]">{t('edit.popup_heading', locale)}</span>
      </div>

      <div className="flex gap-1 mb-2 flex-wrap">
        {FONT_OPTIONS.map(f => (
          <button key={f.family} onClick={() => setFontFamily(f.family)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition
              ${fontFamily === f.family ? 'bg-[var(--coffee-accent)] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            style={{ fontFamily: getFontFamily(f.family) }}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-2 items-center">
        <input type="number" value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
          className="w-14 px-1.5 py-1 border rounded text-xs bg-white dark:bg-gray-700" min={6} max={72} />
        <div className="flex gap-0.5">
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border-2 ${color === c ? 'border-[var(--coffee-accent)]' : 'border-transparent'}`}
              style={{ backgroundColor: c }} />
          ))}
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="w-5 h-5 rounded cursor-pointer p-0 border-0" />
        </div>
        <button onClick={() => setBold(!bold)}
          className={`px-2 py-0.5 rounded text-xs font-bold ${bold ? 'bg-[var(--coffee-accent)] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>B</button>
        <button onClick={() => setItalic(!italic)}
          className={`px-2 py-0.5 rounded text-xs italic ${italic ? 'bg-[var(--coffee-accent)] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>I</button>
      </div>

      <textarea value={text} onChange={e => setText(e.target.value)}
        className="w-full border rounded-lg p-2 text-sm bg-white dark:bg-gray-700 resize-none mb-2"
        rows={3}
        style={{ fontFamily: getFontFamily(fontFamily), fontSize: `${Math.min(fontSize, 16)}px` }}
      />

      <div className="flex gap-2 justify-end">
        <button onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
          {t('edit.btn_cancel', locale)}
        </button>
        <button onClick={handleSave}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--coffee-accent)] text-white hover:bg-[var(--coffee-accent-hover)] transition">
          {t('edit.btn_save', locale)}
        </button>
      </div>
    </div>
  );
}
