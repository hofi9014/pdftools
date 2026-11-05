'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';
import { toolPath } from '@/lib/tools';
import type { GuideData, GuideTool, LocaleContent } from '@/content/pages/guide';

function lc(locale: string, obj: LocaleContent): string {
  return obj[locale] || obj['en'] || '';
}

// The page text arrives as a prop: one language on /{locale}/guide, all of them on /guide.
// Every tool's steps are in the HTML; a closed card only hides them.
export default function GuideView({ locale: forcedLocale, guideData }: { locale?: Locale; guideData: GuideData }) {
  const { locale: detectedLocale } = useLocale();
  const locale = forcedLocale || detectedLocale;
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const q = search.trim().toLowerCase();
  const shown = guideData.categories
    .filter((cat) => !activeCategory || cat.key === activeCategory)
    .map((cat) => ({
      ...cat,
      tools: cat.tools.filter((tool) => !q
        || lc(locale, tool.name).toLowerCase().includes(q)
        || lc(locale, tool.desc).toLowerCase().includes(q)
        || tool.key.toLowerCase().includes(q)),
    }))
    .filter((cat) => cat.tools.length > 0);

  const chip = (active: boolean) =>
    `px-4 py-2 rounded-full text-sm font-medium transition border ${active ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-600 hover:bg-[var(--coffee-surface-hover)]'}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold tool-heading mb-3">
          {t('page.guide.title', locale)}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
          {t('page.guide.subtitle', locale)}
        </p>
      </div>

      <div className="max-w-md mx-auto mb-8">
        <label htmlFor="guide-search" className="sr-only">{t('page.guide.search', locale)}</label>
        <input
          id="guide-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('page.guide.search', locale)}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 tool-heading focus:ring-2 focus:ring-blue-400 outline-none"
        />
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-10">
        <button type="button" aria-pressed={activeCategory === null} onClick={() => setActiveCategory(null)} className={chip(activeCategory === null)}>
          {t('page.guide.all', locale)}
        </button>
        {guideData.categories.map((cat) => (
          <button key={cat.key} type="button" aria-pressed={activeCategory === cat.key} onClick={() => setActiveCategory(cat.key)} className={chip(activeCategory === cat.key)}>
            {lc(locale, cat.label)}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {shown.map((cat) => (
          <section key={cat.key}>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 tool-heading">{lc(locale, cat.label)}</h2>
            <div className="grid gap-4">
              {cat.tools.map((tool) => <ToolGuideCard key={tool.key} tool={tool} locale={locale} />)}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 tool-heading">{lc(locale, guideData.cloud.label)}</h2>
        <div className="space-y-4 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {guideData.cloud.items.map((item) => (
            <div key={item.key}>
              <h3 className="font-bold tool-heading mb-1">{lc(locale, item.q)}</h3>
              <p>{lc(locale, item.a)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ToolGuideCard({ tool, locale }: { tool: GuideTool; locale: string }) {
  const [open, setOpen] = useState(false);
  const panelId = `guide-${tool.key}`;

  return (
    <div className="tool-card rounded-2xl border overflow-hidden">
      <div className="flex items-center gap-2 pe-4 transition hover:bg-[var(--coffee-surface-hover)]">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex-1 min-w-0 flex items-center gap-4 ps-5 py-4 text-start"
        >
          <span aria-hidden="true" className="text-2xl shrink-0">{getToolIcon(tool.key)}</span>
          <span className="flex-1 min-w-0">
            <span className="block font-bold text-sm sm:text-base tool-heading">{lc(locale, tool.name)}</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{lc(locale, tool.desc)}</span>
          </span>
          <svg
            aria-hidden="true"
            className={`w-5 h-5 shrink-0 transition-transform duration-200 text-gray-400 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <Link
          href={toolPath(tool.key, locale)}
          className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
        >
          {t('help.open_tool', locale)} →
        </Link>
      </div>

      <div id={panelId} hidden={!open} className="border-t px-5 py-4" style={{ borderColor: 'var(--coffee-border)' }}>
        <div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">{t('guide.steps_title', locale)}</h3>
          <ol className="list-decimal list-inside space-y-1.5">
            {tool.steps.map((step, i) => (
              <li key={i} className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{lc(locale, step)}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
