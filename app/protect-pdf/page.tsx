'use client';
import { useState } from 'react';
import { protectPdfClient } from '@/lib/client-pdf';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';

export default function ProtectPDF() {
  const { locale } = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { setError(t('error.onlypdf', locale)); return; }
    setFile(f);
    setError('');
    setSuccess(false);
  };

  const handleProtect = async () => {
    if (!file) { setError(t('error.select', locale)); return; }
    if (password.length < 4) { setError(t('page.protect.password_min_length', locale)); return; }
    if (password !== confirmPassword) { setError(t('page.protect.passwords_no_match', locale)); return; }
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const blob = await protectPdfClient(file, password);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace('.pdf', '_chroniony.pdf');
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error.generic', locale));
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (password.length === 0) return null;
    if (password.length < 6) return { label: 'page.protect.weak', color: 'bg-red-400 dark:bg-red-500', width: 'w-1/3' };
    if (password.length < 10) return { label: 'page.protect.medium', color: 'bg-yellow-400 dark:bg-yellow-500', width: 'w-2/3' };
    return { label: 'page.protect.strong', color: 'bg-green-400 dark:bg-green-500', width: 'w-full' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">{getToolIcon('protect')}</div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.protect', locale)}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.protect.desc', locale)}</p>
        </div>

        <div
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => document.getElementById('fileInput')?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition mb-6
            ${dragOver ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'}
            ${file ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}
        >
          {file ? (
            <div>
              <div className="text-5xl mb-3">📄</div>
              <p className="font-medium tool-heading">{file.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{t('drag.change', locale)}</p>
            </div>
          ) : (
            <div>
              <div className="text-5xl mb-3">📂</div>
              <p className="text-gray-600 dark:text-gray-300 font-medium">{t('drag.title', locale)}</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('drag.subtitle', locale)}</p>
            </div>
          )}
          <input id="fileInput" type="file" accept=".pdf" className="hidden"
            onChange={e => handleFile(e.target.files?.[0] || null)} />
        </div>

        {/* Hasło */}
        <div className="tool-card rounded-2xl border p-6 mb-6 space-y-4">
          <h3 className="font-bold text-gray-700 dark:text-gray-300">{t('page.protect.set_password', locale)}</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('page.protect.password_label', locale)}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('page.protect.password_min', locale)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-blue-500 dark:border-blue-400 dark:focus:border-blue-400"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 dark:text-gray-300">
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {strength && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500 dark:text-gray-400">{t('page.protect.strength_label', locale)}</span>
                  <span className={`font-medium ${strength.label === 'page.protect.weak' ? 'text-red-500 dark:text-red-300' : strength.label === 'page.protect.medium' ? 'text-yellow-500 dark:text-yellow-300' : 'text-green-500 dark:text-green-300'}`}>
                    {t(strength.label, locale)}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full">
                  <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('page.protect.confirm_label', locale)}</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder={t('page.protect.confirm_placeholder', locale)}
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none
                ${confirmPassword && password !== confirmPassword ? 'border-red-400 focus:border-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:border-blue-400 dark:focus:border-blue-400'}`}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500 dark:text-red-300 mt-1">{t('page.protect.passwords_no_match', locale)}</p>
            )}
            {confirmPassword && password === confirmPassword && password.length >= 4 && (
              <p className="text-xs text-green-500 dark:text-green-300 mt-1">✓ {t('page.protect.passwords_match', locale)}</p>
            )}
          </div>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">⚠️ {error}</div>}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4 mb-6">
            ✅ {t('result.success', locale)}
          </div>
        )}

        <button onClick={handleProtect} disabled={loading || !file || password.length < 4 || password !== confirmPassword}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition
            ${loading || !file || password.length < 4 || password !== confirmPassword
              ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
          {loading ? `⏳ ${t('page.protect.loading', locale)}` : `🔒 ${t('page.protect.button', locale)}`}
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-center">
          {[
            { icon: '🔐', text: t('feature.aes_encrypt', locale) },
            { icon: '⚡', text: t('feature.fast_cloud', locale) },
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
