'use client';
import { useCallback, useState } from 'react';
import CloudFileSaver from '@/components/CloudFileSaver';
import CloudFilePicker from '@/components/CloudFilePicker';
import FieldCanvas, { KIND_COLOR, type DraftField } from '@/components/make-fillable/FieldCanvas';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';
import ToolGlyph from '@/components/ToolGlyph';
import PdfBadge from '@/components/PdfBadge';
import { errorText } from '@/lib/error-text';
import { useIdlePreload } from '@/hooks/useIdlePreload';
import type { FieldKind } from '@/lib/pdf/makeFillable';

// "Make PDF fillable" (plan 2.2, 2026-11-23). The user draws boxes on the page preview; the
// engine (lib/pdf/makeFillable.ts, loaded when idle or on first use) adds real form fields.
// Fields use Liberation Sans, the font the site already serves for pdf.js: with the standard
// Helvetica, Edge (Acrobat's viewer) drew Polish text in a multi-line field as one huge line.
const loadEngine = () => import('@/lib/pdf/makeFillable');
const KINDS: FieldKind[] = ['text', 'multiline', 'checkbox', 'dropdown', 'signature'];

export default function MakePdfFillable({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const contextLocale = useLocale().locale;
  const locale = forcedLocale ?? contextLocale;
  useIdlePreload(loadEngine);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [existing, setExisting] = useState(0);
  const [page, setPage] = useState(0);
  const [kind, setKind] = useState<FieldKind>('text');
  const [fields, setFields] = useState<DraftField[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [nextId, setNextId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [outBlob, setOutBlob] = useState<Blob | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const outName = (f: File) => f.name.replace(/\.pdf$/i, '') + t('file.fillable_suffix', locale) + '.pdf';
  const kindLabel = (k: FieldKind) => t(`page.makefillable.type_${k}`, locale);

  const handleFile = async (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { setError(t('error.onlypdf', locale)); return; }
    setError('');
    setOutBlob(null);
    setFields([]);
    setSelectedId(null);
    setPage(0);
    setPageCount(0);
    try {
      const { countFormFields } = await loadEngine();
      const info = await countFormFields(await f.arrayBuffer());
      setFile(f);
      setPageCount(info.pages);
      setExisting(info.fields);
    } catch (err: unknown) {
      setFile(null);
      setError(errorText(err, locale));
    }
  };

  const addField = (box: { x: number; y: number; width: number; height: number }) => {
    const n = fields.filter((f) => f.kind === kind).length + 1;
    setFields((all) => [...all, { id: nextId, kind, page, ...box, name: `${kindLabel(kind)} ${n}`, options: '', required: false }]);
    setSelectedId(nextId);
    setNextId((i) => i + 1);
    setOutBlob(null);
  };

  const moveField = useCallback((id: number, x: number, y: number) => {
    setFields((all) => all.map((f) => (f.id === id ? { ...f, x, y } : f)));
  }, []);

  const update = (id: number, patch: Partial<DraftField>) => {
    setFields((all) => all.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    setOutBlob(null);
  };
  const remove = (id: number) => {
    setFields((all) => all.filter((f) => f.id !== id));
    setSelectedId(null);
    setOutBlob(null);
  };

  const handleCreate = async () => {
    if (!file) { setError(t('error.select', locale)); return; }
    if (fields.length === 0) { setError(t('page.makefillable.no_fields', locale)); return; }
    setLoading(true);
    setError('');
    try {
      const { makePdfFillable, loadFieldFont } = await loadEngine();
      const bytes = await makePdfFillable(await file.arrayBuffer(), fields.map((f) => ({
        kind: f.kind, page: f.page, x: f.x, y: f.y, width: f.width, height: f.height, name: f.name,
        required: f.required, options: f.options.split('\n'),
      })), { unicodeFont: await loadFieldFont() });
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outName(file);
      a.click();
      URL.revokeObjectURL(url);
      setOutBlob(blob);
    } catch (err: unknown) {
      setError(errorText(err, locale));
    } finally {
      setLoading(false);
    }
  };

  const selected = fields.find((f) => f.id === selectedId) ?? null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">{getToolIcon('makefillable')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.makefillable', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.makefillable.desc', locale)}</p>
      </div>

      <div
        onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleFile(e.dataTransfer.files[0] ?? null); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => document.getElementById('fileInput')?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('fileInput')?.click(); } }}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition mb-6
          ${dragOver ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'}
          ${file ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}>
        {file ? (
          <div>
            <div className="text-4xl mb-2"><PdfBadge /></div>
            <p className="font-medium tool-heading">{file.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('drag.change', locale)}</p>
          </div>
        ) : (
          <div>
            <div className="text-5xl mb-3"><ToolGlyph name="folderOpen" /></div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">{t('drag.title', locale)}</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('drag.subtitle', locale)}</p>
          </div>
        )}
        <input id="fileInput" type="file" accept=".pdf" className="hidden" onChange={(e) => void handleFile(e.target.files?.[0] || null)} />
      </div>

      {!file && (
        <div className="flex justify-center gap-2 mb-6">
          <CloudFilePicker onFilesPicked={(f) => void handleFile(f[0] || null)} label={t('cloud.add', locale)} />
        </div>
      )}

      {file && pageCount > 0 && (
        <section className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-6" aria-labelledby="mf-editor">
          <h2 id="mf-editor" className="font-bold tool-heading mb-1">{t('page.makefillable.editor_title', locale)}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{t('page.makefillable.draw_hint', locale)}</p>
          {existing > 0 && <p className="text-sm text-gray-600 dark:text-gray-300 mb-3"><ToolGlyph name="info" /> {t('page.makefillable.existing', locale, { n: existing })}</p>}

          <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label={t('page.makefillable.type_label', locale)}>
            {KINDS.map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition ${kind === k ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300'}`}
                style={kind === k ? { borderColor: KIND_COLOR[k] } : undefined}>
                <span className="inline-block w-2.5 h-2.5 rounded-sm me-1.5 align-middle" style={{ backgroundColor: KIND_COLOR[k] }} aria-hidden="true" />
                {kindLabel(k)}
              </button>
            ))}
          </div>

          {pageCount > 1 && (
            <div className="flex flex-wrap items-center gap-1 mb-3">
              <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 disabled:opacity-40">{t('redact.prev', locale)}</button>
              <span className="px-2 text-sm text-gray-600 dark:text-gray-300">{t('page.makefillable.page_of', locale, { n: page + 1, total: pageCount })}</span>
              <button type="button" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page === pageCount - 1}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 disabled:opacity-40">{t('redact.next', locale)}</button>
            </div>
          )}

          <div className="flex justify-center">
            <FieldCanvas file={file} pageIndex={page} fields={fields} selectedId={selectedId}
              onSelect={setSelectedId} onAdd={addField} onMove={moveField}
              pageLabel={t('page.makefillable.page_of', locale, { n: page + 1, total: pageCount })} />
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 mt-3" aria-live="polite">{t('page.makefillable.count', locale, { n: fields.length })}</p>

          {selected && (
            <div className="mt-3 rounded-xl border-2 p-3 space-y-3" style={{ borderColor: KIND_COLOR[selected.kind] }} data-testid="mf-selected">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('page.makefillable.selected', locale, { type: kindLabel(selected.kind) })}</p>
              <div>
                <label htmlFor="mf-name" className="block text-sm text-gray-700 dark:text-gray-300 mb-1">{t('page.makefillable.name_label', locale)}</label>
                <input id="mf-name" type="text" value={selected.name} onChange={(e) => update(selected.id, { name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
              </div>
              {selected.kind === 'dropdown' && (
                <div>
                  <label htmlFor="mf-options" className="block text-sm text-gray-700 dark:text-gray-300 mb-1">{t('page.makefillable.options_label', locale)}</label>
                  <textarea id="mf-options" rows={4} value={selected.options} onChange={(e) => update(selected.id, { options: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
                </div>
              )}
              {selected.kind !== 'signature' && (
                <label htmlFor="mf-required" className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input id="mf-required" type="checkbox" checked={selected.required} onChange={(e) => update(selected.id, { required: e.target.checked })} />
                  {t('page.makefillable.required_label', locale)}
                </label>
              )}
              <button type="button" onClick={() => remove(selected.id)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-red-300 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                {t('page.makefillable.delete', locale)}
              </button>
            </div>
          )}
        </section>
      )}

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6" role="alert"><ToolGlyph name="warning" /> {error}</div>}
      {outBlob && file && (
        <>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-4" role="status">
            <ToolGlyph name="success" /> {t('page.makefillable.success', locale, { n: fields.length })}
          </div>
          <div className="flex justify-center mb-6"><CloudFileSaver blob={outBlob} fileName={outName(file)} /></div>
        </>
      )}

      <button onClick={handleCreate} disabled={loading || !file || fields.length === 0}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition
          ${loading || !file || fields.length === 0 ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
        {loading ? <span><ToolGlyph name="hourglass" /> {t('page.makefillable.loading', locale)}</span> : <span>{t('page.makefillable.btn', locale)}</span>}
      </button>

      <div className="tool-info-box rounded-2xl p-5 mt-8">
        <h2 className="font-bold tool-heading mb-2">{t('page.makefillable.info_title', locale)}</h2>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>{t('page.makefillable.info_1', locale, { tool: t('tool.fillform', locale) })}</li>
          <li>{t('page.makefillable.info_2', locale)}</li>
          <li>{t('page.makefillable.info_3', locale)}</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-center">
        {[
          { icon: 'shield' as const, text: t('feature.local_short', locale) },
          { icon: 'bolt' as const, text: t('feature.instant_result', locale) },
          { icon: 'gift' as const, text: t('feature.free_simple', locale) },
        ].map((item, i) => (
          <div key={i} className="tool-feature-card rounded-xl p-4 border">
            <div className="text-2xl mb-1"><ToolGlyph name={item.icon} /></div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
