'use client';
import { useState, useMemo } from 'react';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';
import { localeGuidesSlug } from '@/lib/guides-slugs';
import type { GuideCard } from '@/lib/guide-cards';
import InstallSection from '@/components/InstallSection';
import PdfBadge from '@/components/PdfBadge';
import { tools, toolPath, categories } from '@/lib/tools';

const aiTools = new Set(['aichat', 'aisummary', 'translate']);

const catBg = (k: string) => `var(--cat-${k}-bg)`;
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type ToolInfo = (typeof tools)[number];
type CategoryInfo = (typeof categories)[number];

const cardStyle = { backgroundColor: 'var(--coffee-surface-solid)', border: '1px solid var(--coffee-border)' };

function ToolCard({ tool, locale }: { tool: ToolInfo; locale: Locale }) {
  return (
    <a href={toolPath(tool.key)} className="coffee-card flex flex-col gap-3 p-4 sm:p-5 no-underline">
      <span className="self-start text-2xl sm:text-3xl px-3 py-2.5 rounded-2xl" style={{ backgroundColor: catBg(tool.category) }}>
        {getToolIcon(tool.key)}
      </span>
      <h4 className="font-bold text-sm sm:text-base" style={{ color: 'var(--coffee-text)' }}>{t(`tool.${tool.key}`, locale)}</h4>
      <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--coffee-text-tertiary)' }}>{t(`desc.${tool.key}`, locale)}</p>
      {aiTools.has(tool.key) && (
        <span className="self-start text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'var(--coffee-badge-bg)', color: 'var(--coffee-badge-text)' }}>
          {t('hero.ai_badge', locale)}
        </span>
      )}
    </a>
  );
}

function ToolCatalog({ groups, locale }: { groups: { cat: CategoryInfo; filtered: ToolInfo[] }[]; locale: Locale }) {
  return (
    <>
      {groups.map(({ cat, filtered }) => (
        <div key={cat.key} className="mb-12 last:mb-0">
          <h3 className="font-display text-xl font-extrabold mb-5 flex items-center gap-3" style={{ color: 'var(--coffee-text)' }}>
            <span aria-hidden="true" className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: catBg(cat.key) }}>{cat.icon}</span>
            <span>{t(`nav.category.${cat.key === 'more' ? 'more' : cat.key}`, locale)}</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((tool) => (
              <ToolCard key={tool.key} tool={tool} locale={locale} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

// The guide cards arrive as a prop (lib/guide-cards.ts): importing content/guides here put every
// article in all 16 languages (181 kB of script) on the home page to show four titles.
export default function HomeView({ locale: forcedLocale, guides }: { locale?: Locale; guides: GuideCard[] }) {
  const { locale: detectedLocale } = useLocale();
  const locale = forcedLocale || detectedLocale;
  const [search, setSearch] = useState('');
  const q = search ? norm(search) : '';
  const filteredTools = useMemo(() => {
    return categories
      .map(cat => {
        const base = tools.filter(t => t.category === cat.key && !t.disabled);
        const filtered = q
          ? base.filter(tt =>
              norm(t(`tool.${tt.key}`, locale)).includes(q) ||
              norm(t(`desc.${tt.key}`, locale)).includes(q) ||
              norm(tt.key).includes(q) ||
              norm(tt.slug).includes(q)
            )
          : base;
        return { cat, filtered };
      })
      .filter(({ filtered }) => filtered.length > 0);
  }, [q, locale]);
  const searchPlaceholder: Record<string, string> = {
    pl: 'Szukaj narzędzia...',
    en: 'Search tools...',
    es: 'Buscar herramientas...',
    de: 'Werkzeuge suchen...',
    fr: 'Rechercher des outils...',
    it: 'Cerca strumenti...',
    pt: 'Procurar ferramentas...',
    is: 'Leita að tólum...',
    tr: 'Araçları ara...',
    sv: 'Sök verktyg...',
    no: 'Søk verktøy...',
    ja: 'ツールを検索...',
    hi: 'उपकरण खोजें...',
    ar: 'بحث عن أدوات...',
    fa: 'جستجوی ابزارها...',
    zh: '搜索工具...',
  };
  const placeholder = searchPlaceholder[locale] || 'Search tools...';

  return (
    <div>
      {/* Hero: the tool search sits in the first screen, next to a fan of the file types the tools handle */}
      <section className="relative overflow-hidden px-4 pt-10 pb-12 sm:pt-14 sm:pb-16">
        <div aria-hidden="true" className="absolute pointer-events-none rounded-full" style={{
          insetInlineEnd: '-12rem', top: '-4rem', width: '46rem', height: '46rem',
          background: 'radial-gradient(circle, var(--coffee-accent-glow) 0%, transparent 62%)',
        }} />
        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[1.08fr_0.92fr] gap-10 lg:gap-12 items-center">
          <div className="flex flex-col gap-5 min-w-0">
            <span className="self-start inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-bold"
              style={{ backgroundColor: 'var(--coffee-badge-bg)', color: 'var(--coffee-badge-text)' }}>
              <span aria-hidden="true">🔒</span>{t('hero.badge', locale)}
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] [text-wrap:balance]" style={{ color: 'var(--coffee-text)' }}>
              {t('home.title', locale)}
            </h1>
            <p className="text-lg sm:text-xl leading-relaxed max-w-[34em]" style={{ color: 'var(--coffee-text-secondary)' }}>
              {t('hero.subtitle', locale)}
            </p>
            <div className="mt-1 p-4 sm:p-5 rounded-[22px] border-2 border-dashed flex flex-col sm:flex-row sm:items-center gap-4"
              style={{ borderColor: 'var(--coffee-accent)', backgroundColor: 'var(--coffee-surface-solid)', boxShadow: 'var(--coffee-shadow)' }}>
              <span aria-hidden="true" className="hidden sm:block text-4xl shrink-0"><PdfBadge /></span>
              <label htmlFor="tool-search" className="sr-only">{placeholder}</label>
              <input
                id="tool-search"
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={placeholder}
                className="flex-1 min-w-0 px-4 py-3 rounded-xl text-base outline-none transition-shadow"
                style={{
                  backgroundColor: 'var(--coffee-bg)',
                  border: '2px solid var(--coffee-border)',
                  color: 'var(--coffee-text)',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--coffee-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--coffee-accent-glow)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--coffee-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              <a href="#tools" className="btn-accent justify-center shrink-0 no-underline">{t('home.cta', locale)}</a>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold" style={{ color: 'var(--coffee-text-secondary)' }}>
              <li>✓ {tools.length} {t('stats.tools', locale)}</li>
              <li>✓ {t('stats.local', locale)} {t('stats.local_sub', locale)}<sup aria-hidden="true">*</sup></li>
              <li>✓ 100% {t('stats.free', locale)}</li>
            </ul>
            {/* The "local" claims carry an asterisk: the AI tools keep the file in the browser but send
                its extracted text to an external AI service. */}
            <p className="text-xs leading-relaxed max-w-[44em]" style={{ color: 'var(--coffee-text-secondary)' }}>
              * {t('home.ai_note', locale)} {t('feature.ai_file_local', locale)}
            </p>
          </div>

          {/* Decorative: the file types the tools handle, and what the tools do with them */}
          <div aria-hidden="true" className="relative hidden md:block h-[440px] select-none">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[330px] h-[330px] rounded-full" style={{ backgroundColor: 'var(--coffee-accent-soft)' }} />
            <span className="absolute left-[6%] top-[24%] text-[88px] -rotate-[14deg]"><PdfBadge type="DOC" /></span>
            <span className="absolute left-[30%] top-[12%] text-[124px] -rotate-2 z-[2]"><PdfBadge /></span>
            <span className="absolute right-[6%] top-[26%] text-[88px] rotate-12"><PdfBadge type="XLS" /></span>
            <span className="absolute left-[14%] bottom-[10%] text-[66px] rotate-[8deg]"><PdfBadge type="PPT" /></span>
            <span className="absolute right-[16%] bottom-[8%] text-[60px] -rotate-[9deg]"><PdfBadge type="ODT" /></span>
            <span dir="ltr" className="hero-chip absolute left-0 top-[6%] z-[3]">🗜️ 1155 kB → 416 kB</span>
            <span className="hero-chip absolute right-0 top-[64%] z-[3]">✍️ {t('tool.sign', locale)}</span>
            <span className="hero-chip absolute left-[18%] bottom-0 z-[3]">🔒 {t('feature.local_short', locale)}*</span>
          </div>
        </div>
      </section>

      {/* Live search results */}
      {search && (
        <div role="status" aria-live="polite" className="max-w-7xl mx-auto px-4 pb-6"
          style={{ minHeight: '280px', maxHeight: '70vh', overflowY: 'auto' }}>
          <ToolCatalog groups={filteredTools} locale={locale} />
          {filteredTools.length === 0 && (
            <div className="text-center py-10">
              <p className="text-base font-medium" style={{ color: 'var(--coffee-text-secondary)' }}>
                {t('home.search_no_results', locale, { query: search })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Popular tools */}
      <section id="popular" className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h2 className="text-3xl font-extrabold" style={{ color: 'var(--coffee-text)' }}>{t('home.popular_title', locale)}</h2>
            <p className="mt-1" style={{ color: 'var(--coffee-text-secondary)' }}>{t('home.popular_subtitle', locale)}</p>
          </div>
          <a href="#tools" className="font-bold link-accent no-underline">{t('home.cta', locale)}</a>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {['merge','compress','word','split','edit','sign','wordtopdf','protect'].map((key) => {
            const tool = tools.find(t => t.key === key);
            return tool ? (
              <a key={tool.key} href={toolPath(tool.key)} className="coffee-card flex flex-col gap-3 p-4 sm:p-5 no-underline">
                <span className="self-start text-3xl px-3 py-2.5 rounded-2xl" style={{ backgroundColor: catBg(tool.category) }}>{getToolIcon(tool.key)}</span>
                <h3 className="font-bold text-base sm:text-lg" style={{ color: 'var(--coffee-text)' }}>{t(`tool.${tool.key}`, locale)}</h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--coffee-text-tertiary)' }}>{t(`desc.${tool.key}`, locale)}</p>
              </a>
            ) : null;
          })}
        </div>
      </section>

      {/* How it works — a real sequence, so the steps are numbered */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="rounded-[26px] p-6 sm:p-9 grid gap-6 lg:grid-cols-[1.1fr_1fr_1fr_1fr] lg:items-center" style={{ backgroundColor: 'var(--coffee-bg-alt)' }}>
          <div>
            <h2 className="text-2xl sm:text-[28px] font-extrabold leading-tight" style={{ color: 'var(--coffee-text)' }}>{t('home.howto_title', locale)}</h2>
            <a href={toolPath('guide', locale)} className="inline-block mt-2 text-sm font-semibold link-accent no-underline">{t('home.howto_guide', locale)}</a>
          </div>
          {[
            { num: '1', title: t('home.howto_step1', locale), desc: t('home.howto_desc1', locale) },
            { num: '2', title: t('home.howto_step2', locale), desc: t('home.howto_desc2', locale) },
            { num: '3', title: t('home.howto_step3', locale), desc: t('home.howto_desc3', locale) },
          ].map((step) => (
            <div key={step.num} className="flex gap-3.5 items-start">
              <span className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-extrabold"
                style={{ backgroundColor: 'var(--coffee-accent-ink)', color: 'var(--coffee-on-accent)' }}>{step.num}</span>
              <div>
                <h3 className="font-bold" style={{ color: 'var(--coffee-text)' }}>{step.title}</h3>
                <p className="text-sm leading-relaxed mt-0.5" style={{ color: 'var(--coffee-text-secondary)' }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Scenarios */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-extrabold mb-6" style={{ color: 'var(--coffee-text)' }}>{t('home.scenarios_title', locale)}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { key: 'compress', href: '/compress' },
            { key: 'edit', href: '/edit-pdf' },
            { key: 'merge', href: '/merge' },
            { key: 'sign', href: '/sign-pdf' },
            { key: 'protect', href: '/protect-pdf' },
            { key: 'word', href: '/pdf-to-word' },
          ].map(s => (
            <a key={s.key} href={s.href} className="coffee-card flex items-start gap-3 p-5 no-underline">
              <span className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--coffee-text)' }}>
                {t(`home.scenarios_${s.key}`, locale)}
              </span>
            </a>
          ))}
        </div>
      </section>

      <InstallSection />

      {/* Cloud import and offline use */}
      <section className="max-w-7xl mx-auto px-4 py-4 grid gap-4 md:grid-cols-2">
        <p className="rounded-2xl p-5 text-sm leading-relaxed" style={{ ...cardStyle, color: 'var(--coffee-text-secondary)' }}>
          {t('cloud.feature', locale)}
        </p>
        <p className="rounded-2xl p-5 text-sm leading-relaxed" style={{ ...cardStyle, color: 'var(--coffee-text-secondary)' }}>
          {t('hero.offline_pitch', locale)}
        </p>
      </section>

      {/* Guides */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-extrabold mb-2" style={{ color: 'var(--coffee-text)' }}>📚 {t('nav.guides', locale)}</h2>
        <p className="mb-6" style={{ color: 'var(--coffee-text-secondary)' }}>{t('desc.guide', locale)}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {guides.slice(0, 4).map(article => {
            const title = (article.title as Record<string, string>)[locale] || article.title.en;
            const excerpt = (article.excerpt as Record<string, string>)[locale] || article.excerpt.en;
            return (
              <a key={article.slug} href={`/guides/${localeGuidesSlug[locale]}/${article.category}/${article.slug}`}
                className="coffee-card block p-5 no-underline">
                <h3 className="font-bold text-base mb-1.5" style={{ color: 'var(--coffee-text)' }}>{title}</h3>
                <p className="text-sm leading-relaxed line-clamp-3" style={{ color: 'var(--coffee-text-secondary)' }}>{excerpt}</p>
              </a>
            );
          })}
        </div>
        <a href={`/guides/${localeGuidesSlug[locale]}`} className="inline-flex items-center gap-1 font-bold link-accent no-underline">
          {t('guides.all_guides', locale)} →
        </a>
      </section>

      {/* Tools */}
      <section id="tools" className="max-w-7xl mx-auto px-4 py-14">
        {!search && (
          <>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-2" style={{ color: 'var(--coffee-text)' }}>{t('home.pdfTools', locale)}</h2>
            <p className="mb-3" style={{ color: 'var(--coffee-text-secondary)' }}>{t('home.subtitle2', locale)}</p>
            <p className="mb-10 text-xs leading-relaxed max-w-3xl" style={{ color: 'var(--coffee-text-secondary)' }}>
              {t('home.ai_note', locale)} {t('home.limit_note', locale)}
            </p>
            <ToolCatalog groups={filteredTools} locale={locale} />
          </>
        )}
      </section>
    </div>
  );
}
