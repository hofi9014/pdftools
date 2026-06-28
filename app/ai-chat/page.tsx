'use client';
import { useState, useRef, useEffect } from 'react';
import { extractTextFromPDF } from '@/lib/client-pdf';
import { getApiKey, setApiKey, hasApiKey, askAI, keywordSearch } from '@/lib/client-ai';
import { useLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChat() {
  const { locale } = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [asking, setAsking] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInput, setKeyInput] = useState(getApiKey());
  const [aiOk, setAiOk] = useState(hasApiKey());
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf') { setError(t('error.onlypdf', locale)); return; }
    setFile(f); setError(''); setExtractedText(''); setMessages([]);
  };

  const saveKey = () => {
    if (keyInput.trim()) { setApiKey(keyInput.trim()); setAiOk(true); setShowKeyInput(false); }
    else { setApiKey(''); setAiOk(false); }
  };

  const handleExtract = async () => {
    if (!file) { setError(t('error.select', locale)); return; }
    setLoading(true); setError('');
    try {
      const text = await extractTextFromPDF(file);
      setExtractedText(text);
      const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
      const preview = text.trim().substring(0, 300);
      const mode = aiOk ? '🤖 AI' : t('page.aichat.search_mode', locale);
      const hint = aiOk
        ? t('page.aichat.ai_hint', locale)
        : t('page.aichat.keyword_hint', locale);
      setMessages([{
        role: 'assistant',
        content: `${t('page.aichat.extracted_msg', locale).replace('{wordCount}', String(wordCount)).replace('{mode}', mode)}`
          + `\n${hint}` + (preview ? `\n\n${t('page.aichat.fragment_label', locale)}:\n${preview}${text.length > 300 ? '...' : ''}` : ''),
      }]);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : t('error.generic', locale)); }
    finally { setLoading(false); }
  };

  const handleAsk = async () => {
    if (!question.trim() || !extractedText) return;
    setAsking(true);
    const q = question.trim();
    setQuestion('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    try {
      let answer: string;
      if (aiOk) {
        answer = await askAI(extractedText, q, getApiKey());
      } else {
        answer = keywordSearch(extractedText, q);
      }
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : t('error.generic', locale)); }
    finally { setAsking(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">{getToolIcon('aichat')}</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{t('tool.aichat', locale)}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{t('page.aichat.desc', locale)}</p>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => setShowKeyInput(!showKeyInput)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition ${aiOk ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}>
          {aiOk ? `✓ ${t('page.aichat.key_set', locale)}` : `⚙️ ${t('page.aichat.key_setup', locale)}`}
        </button>
      </div>
      {showKeyInput && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6 flex gap-2 items-center">
          <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)}
            placeholder="sk-or-v1-..." className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800" />
          <button onClick={saveKey} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">{t('page.aichat.save', locale)}</button>
          <button onClick={() => { setApiKey(''); setAiOk(false); setKeyInput(''); setShowKeyInput(false); }} className="text-gray-400 hover:text-red-500 text-sm">✕</button>
        </div>
      )}

      {!extractedText ? (
        <>
          <div onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => document.getElementById('fileInput')?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition mb-6
              ${dragOver ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'}
              ${file ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}>
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
            <input id="fileInput" type="file" accept=".pdf" className="hidden" onChange={e => handleFile(e.target.files?.[0] || null)} />
          </div>

          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6">⚠️ {error}</div>}

          <button onClick={handleExtract} disabled={loading || !file}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition
              ${loading || !file ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg'}`}>
            {loading ? `⏳ ${t('page.aichat.extract_loading', locale)}` : `📄 ${t('page.aichat.extract_btn', locale)}`}
          </button>
        </>
      ) : (
        <div className="tool-card rounded-2xl border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50">
            <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{file?.name}</span>
            <button onClick={() => { setExtractedText(''); setMessages([]); setFile(null); setError(''); }}
              className="text-xs !text-[var(--coffee-accent)] hover:underline shrink-0 ml-2">+ {t('page.aichat.new_file', locale)}</button>
          </div>
          <div className="max-h-96 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-100 dark:bg-gray-700 tool-heading rounded-bl-md'
                }`}>{msg.content}</div>
              </div>
            ))}
            {asking && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-gray-500">
                  ⏳ {aiOk ? t('page.aichat.ai_analyzing', locale) : t('page.aichat.searching', locale)}
                </div>
              </div>
            )}
            <div ref={chatEnd} />
          </div>

          <button onClick={() => setShowText(!showText)} className="w-full text-left px-4 py-2 text-xs text-gray-500 dark:text-gray-400 hover:bg-[var(--coffee-surface-hover)] border-t border-gray-200 dark:border-gray-600 font-mono">
            {showText ? `▲ ${t('page.aichat.hide_text', locale)}` : `▼ ${t('page.aichat.show_text', locale)} (${extractedText.trim().split(/\s+/).length} ${t('page.aichat.words', locale)})`}
          </button>
          {showText && (
            <pre className="max-h-60 overflow-y-auto p-4 text-xs leading-relaxed text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 whitespace-pre-wrap font-sans">{extractedText}</pre>
          )}

          {error && <div className="bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-2 text-sm">⚠️ {error}</div>}

          <div className="border-t border-gray-200 dark:border-gray-600 p-4 flex gap-2">
            <input type="text" value={question} onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
              placeholder={aiOk ? t('page.aichat.ask_placeholder', locale) : t('page.aichat.keyword_placeholder', locale)}
              disabled={asking}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 bg-transparent" />
            <button onClick={handleAsk} disabled={asking || !question.trim()}
              className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm transition disabled:opacity-50">
              {asking ? '⏳' : aiOk ? t('page.aichat.ask_btn', locale) : t('page.aichat.search_btn', locale)}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-center">
        {[
          { icon: '🔒', text: t('feature.no_upload_browser', locale) },
          { icon: '🤖', text: t('feature.ai_analysis', locale) },
          { icon: '🆓', text: t('feature.own_key', locale) },
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
