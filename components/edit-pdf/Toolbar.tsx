'use client';
import { useHydrationSafeLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import ToolGlyph, { type GlyphName } from '@/components/ToolGlyph';

interface ToolDef {
  id: string
  label: string
  icon?: string
  glyph?: GlyphName
  shortcut?: string
}

interface Props {
  activeTool: string
  onToolChange: (tool: string) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onAddImage: () => void
  onAddSignature: () => void
}

export default function Toolbar({
  activeTool, onToolChange, onUndo, onRedo,
  canUndo, canRedo, onAddImage, onAddSignature,
}: Props) {
  const locale = useHydrationSafeLocale();

  const TOOLS: (ToolDef | 'sep')[] = [
    { id: 'select', label: t('edit.toolbar_select', locale), glyph: 'pointer', shortcut: 'V' },
    'sep',
    { id: 'text', label: t('edit.toolbar_text', locale), icon: 'T', shortcut: 'T' },
    { id: 'rect', label: t('edit.toolbar_rect', locale), icon: '▬', shortcut: 'R' },
    { id: 'circle', label: t('edit.toolbar_circle', locale), icon: '●', shortcut: 'C' },
    { id: 'line', label: t('edit.toolbar_line', locale), icon: '╱', shortcut: 'L' },
    { id: 'arrow', label: t('edit.toolbar_arrow', locale), icon: '→', shortcut: 'A' },
    'sep',
    { id: 'freehand', label: t('edit.toolbar_freehand', locale), glyph: 'freehand', shortcut: 'F' },
    { id: 'highlight', label: t('edit.toolbar_highlight', locale), glyph: 'highlighter', shortcut: 'H' },
    'sep',
    { id: 'image', label: t('edit.toolbar_image', locale), glyph: 'image', shortcut: 'I' },
    { id: 'signature', label: t('edit.toolbar_signature', locale), glyph: 'signature', shortcut: 'S' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-[var(--coffee-surface-solid)] dark:bg-gray-800 rounded-xl border border-[var(--coffee-border)] shadow-sm">
      {TOOLS.map((t, i) => {
        if (t === 'sep') return <div key={`sep-${i}`} className="w-px h-6 bg-[var(--coffee-border)] mx-1" />;
        const td = t as ToolDef;
        if (td.id === 'image') {
          return (
            <button key={td.id} onClick={onAddImage}
              className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1
                ${activeTool === td.id
                  ? 'bg-[var(--coffee-accent-ink)] text-[var(--coffee-on-accent)] shadow-sm'
                  : 'text-[var(--coffee-text-secondary)] hover:bg-[var(--coffee-surface-hover)]'}`}
              title={`${td.label} (${td.shortcut || ''})`}>
              <span className="text-base">{td.glyph ? <ToolGlyph name={td.glyph} /> : td.icon}</span>
              <span className="hidden sm:inline text-xs">{td.label}</span>
            </button>
          );
        }
        if (td.id === 'signature') {
          return (
            <button key={td.id} onClick={onAddSignature}
              className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1
                ${activeTool === td.id
                  ? 'bg-[var(--coffee-accent-ink)] text-[var(--coffee-on-accent)] shadow-sm'
                  : 'text-[var(--coffee-text-secondary)] hover:bg-[var(--coffee-surface-hover)]'}`}
              title={`${td.label} (${td.shortcut || ''})`}>
              <span className="text-base">{td.glyph ? <ToolGlyph name={td.glyph} /> : td.icon}</span>
              <span className="hidden sm:inline text-xs">{td.label}</span>
            </button>
          );
        }
        return (
          <button key={td.id} onClick={() => onToolChange(td.id)}
            className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1
              ${activeTool === td.id
                ? 'bg-[var(--coffee-accent-ink)] text-[var(--coffee-on-accent)] shadow-sm'
                : 'text-[var(--coffee-text-secondary)] hover:bg-[var(--coffee-surface-hover)]'}`}
            title={`${td.label} (${td.shortcut || ''})`}>
            {td.id === 'text' ? (
              <span className="text-sm font-bold w-4 h-4 flex items-center justify-center bg-[var(--coffee-accent-subtle)] rounded text-xs"
                style={activeTool === 'text' ? { background: 'rgba(255,255,255,0.2)' } : {}}>T</span>
            ) : (
              <span className="text-base">{td.glyph ? <ToolGlyph name={td.glyph} /> : td.icon}</span>
            )}
            <span className="hidden sm:inline text-xs">{td.label}</span>
          </button>
        );
      })}

      <div className="flex-1" />

      <button onClick={onUndo} disabled={!canUndo}
        className={`px-2.5 py-1.5 rounded-lg text-sm transition flex items-center gap-1
          ${canUndo ? 'text-[var(--coffee-text-secondary)] hover:bg-[var(--coffee-surface-hover)]' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
        title={t('edit.undo_title', locale)}>
        <ToolGlyph name="undo" /> {t('edit.undo_btn', locale)}
      </button>
      <button onClick={onRedo} disabled={!canRedo}
        className={`px-2.5 py-1.5 rounded-lg text-sm transition flex items-center gap-1
          ${canRedo ? 'text-[var(--coffee-text-secondary)] hover:bg-[var(--coffee-surface-hover)]' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
        title={t('edit.redo_title', locale)}>
        <ToolGlyph name="redo" /> {t('edit.redo_btn', locale)}
      </button>
    </div>
  );
}
