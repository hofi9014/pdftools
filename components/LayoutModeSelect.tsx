'use client';
import { t, type Locale } from '@/lib/i18n';
import { PDF_LAYOUT_MODES, type PdfLayoutMode } from '@/lib/pdf/pdfDocumentExport';

/**
 * Choice of how a PDF is turned into a document (PDF → Word, PDF → OpenOffice): automatic,
 * faithful page layout, or flowing text. The hint under the buttons explains the selected one.
 */
export default function LayoutModeSelect({ value, onChange, locale, disabled }: {
  value: PdfLayoutMode;
  onChange: (mode: PdfLayoutMode) => void;
  locale: Locale;
  disabled?: boolean;
}) {
  return (
    <div className="tool-card rounded-2xl shadow-sm border p-4 mb-6">
      <p id="layout-mode-label" className="font-medium text-gray-700 dark:text-gray-300 mb-3">{t('layout.label', locale)}</p>
      <div role="radiogroup" aria-labelledby="layout-mode-label" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {PDF_LAYOUT_MODES.map((mode) => {
          const selected = mode === value;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={selected}
              data-layout-mode={mode}
              disabled={disabled}
              onClick={() => onChange(mode)}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition
                ${selected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-500'}
                ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {t(`layout.${mode}`, locale)}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">{t(`layout.${value}_hint`, locale)}</p>
    </div>
  );
}
