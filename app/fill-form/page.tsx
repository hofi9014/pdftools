'use client';
import { useState, useRef } from 'react';
import { extractFormFields, fillFormFields, downloadPdf, type FormField } from '@/lib/client-pdf';
import CloudFileSaver from '@/components/CloudFileSaver';
import CloudFilePicker from '@/components/CloudFilePicker';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';

export default function FillForm({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const locale = forcedLocale ?? useLocale().locale;
  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const processedBlobRef = useRef<Blob | null>(null);

  const handleFile = async (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { setError(t('error.onlypdf', locale)); return; }
    setFile(f);
    setError('');
    setSuccess(false);
    setFields([]);
    setValues({});
    try {
      const { fields: extracted } = await extractFormFields(f);
      setFields(extracted);
      const initVals: Record<string, string | boolean> = {};
      extracted.forEach(fld => {
        if (fld.type === 'checkbox') initVals[fld.name] = fld.value === true;
        else initVals[fld.name] = typeof fld.value === 'string' ? fld.value : '';
      });
      setValues(initVals);
      if (extracted.length === 0) setError(t('page.fillform.no_fields', locale));
    } catch {
      setError(t('page.fillform.cant_read', locale));
    }
  };

  const setVal = (name: string, val: string | boolean) => {
    setValues(prev => ({ ...prev, [name]: val }));
    setSuccess(false);
  };

  const handleSubmit = async () => {
    if (!file) { setError(t('error.select', locale)); return; }
    if (fields.length === 0) { setError(t('page.fillform.no_fields_to_fill', locale)); return; }
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const result = await fillFormFields(file, values);
      const blob = await downloadPdf(result, file.name.replace('.pdf', '_wypełniony.pdf'));
      processedBlobRef.current = blob;
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error.generic', locale));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">{getToolIcon('fillform')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.fillform', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.fillform.desc', locale)}</p>
      </div>

      <div
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => document.getElementById('fileInput')?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition mb-6
          ${dragOver ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'}
          ${file ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}>
        {file ? (
          <div>
            <div className="text-4xl mb-2">📄</div>
            <p className="font-medium tool-heading text-sm">{file.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('drag.change', locale)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('page.fillform.fields_count', locale).replace('{count}', String(fields.length))}</p>
          </div>
        ) : (
          <div>
            <div className="text-5xl mb-3">📂</div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">{t('page.fillform.drag_title', locale)}</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('drag.subtitle', locale)}</p>
          </div>
        )}
        <input id="fileInput" type="file" accept=".pdf" className="hidden"
          onChange={e => handleFile(e.target.files?.[0] || null)} />
      </div>

      <div className="flex justify-center gap-2 mb-6">
        <CloudFilePicker onFilesPicked={(f) => handleFile(f[0] || null)} label={"☁️ " + t('cloud.add', locale)} />
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">⚠️ {error}</div>}

      {fields.length > 0 && (
        <div className="tool-card rounded-2xl border mb-6">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <p className="font-bold tool-heading">{t('page.fillform.fields_label', locale)} ({fields.length})</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {fields.map((fld) => (
              <div key={fld.name} className="p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{fld.name}</label>
                {fld.type === 'text' && (
                  <input type="text" value={values[fld.name] as string || ''} onChange={e => setVal(fld.name, e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 tool-heading focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                )}
                {fld.type === 'checkbox' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!values[fld.name]} onChange={e => setVal(fld.name, e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{values[fld.name] ? t('page.fillform.checkbox_checked', locale) : t('page.fillform.checkbox_unchecked', locale)}</span>
                  </label>
                )}
                {fld.type === 'dropdown' && fld.options && (
                  <select value={values[fld.name] as string || ''} onChange={e => setVal(fld.name, e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 tool-heading focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                    <option value="">{t('page.fillform.select_placeholder', locale)}</option>
                    {fld.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                )}
                {fld.type === 'listbox' && fld.options && (
                  <select multiple value={[values[fld.name] as string || '']} onChange={e => setVal(fld.name, e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 tool-heading focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                    {fld.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                )}
                {fld.type === 'radio' && fld.options && (
                  <div className="flex flex-wrap gap-4">
                    {fld.options.map(opt => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name={fld.name} value={opt} checked={values[fld.name] === opt} onChange={e => setVal(fld.name, e.target.value)}
                          className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
                {fld.type === 'signature' && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic">{t('page.fillform.signature_skip', locale)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {fields.length > 0 && (
        <button onClick={handleSubmit} disabled={loading}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition mb-6
            ${loading ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
          {loading ? `⏳ ${t('page.fillform.btn_loading', locale)}` : `📝 ${t('page.fillform.btn_ready', locale)}`}
        </button>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6">{t('page.fillform.success', locale)}</div>
      )}
      {success && file && processedBlobRef.current && (
        <div className="flex justify-center mb-6">
          <CloudFileSaver blob={processedBlobRef.current} fileName={file.name.replace('.pdf', '_wypełniony.pdf')} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-center">
        {[
          { icon: '🔒', text: t('page.fillform.feature_no_upload', locale) },
          { icon: '📋', text: t('feature.form_fields', locale) },
          { icon: '🆓', text: t('feature.free_simple', locale) },
        ].map((item, i) => (
          <div key={i} className="tool-feature-card rounded-xl p-4 border">
            <div className="text-2xl mb-1">{item.icon}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
