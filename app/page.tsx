'use client';
import { useState } from 'react';
import { useLocale } from '@/lib/locale-context';
import { t, type Locale } from '@/lib/i18n';
import { getToolIcon } from '@/lib/icons';
import { localeGuidesSlug } from '@/lib/guides-slugs';
import guides from '@/content/guides';
import InstallSection from '@/components/InstallSection';
import { tools, toolPath, categories } from '@/lib/tools';

const aiTools = new Set(['aichat', 'aisummary', 'translate']);

export default function Home({ locale: forcedLocale }: { locale?: Locale } = {}) {
  const { locale: detectedLocale } = useLocale();
  const locale = forcedLocale || detectedLocale;
  const [search, setSearch] = useState('');
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

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-4 text-center">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 20%, var(--coffee-accent-glow) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 60%, var(--coffee-gold-glow) 0%, transparent 60%)'
        }} />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6 border" style={{
            backgroundColor: 'var(--coffee-badge-bg)',
            color: 'var(--coffee-badge-text)',
            borderColor: 'var(--coffee-border)'
          }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--coffee-accent)', boxShadow: '0 0 8px var(--coffee-accent)' }} />
            {t('hero.badge', locale)}
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4 leading-tight" style={{ color: 'var(--coffee-text)' }}>
            {t('home.title', locale)}
          </h2>
          <p className="text-lg sm:text-xl mb-10 max-w-xl mx-auto" style={{ color: 'var(--coffee-text-secondary)' }}>
            {t('home.subtitle', locale)}
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="#tools" className="btn-accent text-base">
              {t('home.cta', locale)} →
            </a>
            <a href="/privacy" className="btn-ghost text-base">
              {t('hero.privacy', locale)}
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="flex justify-center gap-12 sm:gap-16 py-8 px-4">
        <div className="text-center">
          <div className="text-4xl font-black gradient-text">40</div>
          <div className="text-sm mt-1" style={{ color: 'var(--coffee-text-tertiary)' }}>{t('stats.tools', locale)}</div>
        </div>
        <div className="w-px self-stretch" style={{ backgroundColor: 'var(--coffee-border-strong)' }} />
        <div className="text-center">
          <div className="text-4xl font-black gradient-text">{t('stats.local', locale)}</div>
          <div className="text-sm mt-1" style={{ color: 'var(--coffee-text-tertiary)' }}>{t('stats.local_sub', locale)}</div>
        </div>
        <div className="w-px self-stretch" style={{ backgroundColor: 'var(--coffee-border-strong)' }} />
        <div className="text-center">
          <div className="text-4xl font-black gradient-text">100%</div>
          <div className="text-sm mt-1" style={{ color: 'var(--coffee-text-tertiary)' }}>{t('stats.free', locale)}</div>
        </div>
      </div>

      {/* Limits note */}
      <div className="max-w-2xl mx-auto px-4 text-center">
        <p className="text-xs leading-relaxed" style={{ color: 'var(--coffee-text-tertiary)' }}>
          {t('home.limit_note', locale)}
        </p>
      </div>

      {/* Search bar */}
      <div className="max-w-md mx-auto px-4 py-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={searchPlaceholder[locale] || 'Search tools...'}
          className="w-full px-5 py-3 rounded-xl text-base outline-none transition-shadow"
          style={{
            backgroundColor: 'var(--coffee-surface-solid)',
            border: '2px solid var(--coffee-border)',
            color: 'var(--coffee-text)',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--coffee-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--coffee-accent-glow)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--coffee-border)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Popular tools */}
      <section id="popular" className="max-w-7xl mx-auto px-4 py-8">
        <h3 className="text-3xl font-bold text-center mb-3" style={{ color: 'var(--coffee-text)' }}>{t('home.popular_title', locale)}</h3>
        <p className="text-center mb-10" style={{ color: 'var(--coffee-text-secondary)' }}>
          {t('home.popular_subtitle', locale)}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {['merge','compress','word','split','edit','sign','wordtopdf','protect'].map((key) => {
            const tool = tools.find(t => t.key === key);
            return tool ? (
              <a key={tool.key} href={toolPath(tool.key)}
                className="coffee-card p-5 sm:p-6 group relative overflow-hidden"
                style={{ borderColor: 'var(--coffee-accent)', borderWidth: '1.5px' }}>
                <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'var(--coffee-accent)' }} />
                <div className="text-3xl sm:text-4xl mb-3">{getToolIcon(tool.key)}</div>
                <h4 className="font-bold mb-1 text-sm sm:text-base" style={{ color: 'var(--coffee-text)' }}>{t(`tool.${tool.key}`, locale)}</h4>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--coffee-text-tertiary)' }}>{t(`desc.${tool.key}`, locale)}</p>
              </a>
            ) : null;
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12" style={{ color: 'var(--coffee-text)' }}>{t('home.howto_title', locale)}</h3>
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
          {/* Connecting line on desktop */}
          <div className="hidden md:block absolute top-12 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px"
            style={{ background: 'repeating-linear-gradient(90deg, var(--coffee-border-strong) 0, var(--coffee-border-strong) 8px, transparent 8px, transparent 16px)' }} />
          {[
            { num: '1', title: t('home.howto_step1', locale), desc: t('home.howto_desc1', locale) },
            { num: '2', title: t('home.howto_step2', locale), desc: t('home.howto_desc2', locale) },
            { num: '3', title: t('home.howto_step3', locale), desc: t('home.howto_desc3', locale) },
          ].map((step, i) => (
            <div key={i} className="relative flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold mb-4"
                style={{ backgroundColor: 'var(--coffee-accent)', color: 'white' }}>
                {step.num}
              </div>
              <h4 className="font-bold text-lg mb-2" style={{ color: 'var(--coffee-text)' }}>{step.title}</h4>
              <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--coffee-text-secondary)' }}>{step.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <a href="/guide" className="inline-flex items-center gap-1 font-medium text-sm transition-opacity hover:opacity-80"
            style={{ color: 'var(--coffee-accent)' }}>
            {t('home.howto_guide', locale)}
          </a>
        </div>
      </section>

      <InstallSection />

      {/* AI disclaimer */}
      <section className="max-w-3xl mx-auto px-4 py-4">
        <div className="rounded-xl p-4 text-xs leading-relaxed" style={{
          backgroundColor: 'color-mix(in srgb, var(--coffee-accent) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--coffee-accent) 20%, transparent)',
          color: 'var(--coffee-text-secondary)'
        }}>
          {t('hero.ai_disclaimer', locale)}
        </div>
      </section>

      {/* Cloud feature */}
      <section className="max-w-3xl mx-auto px-4 py-4">
        <div className="rounded-xl p-4 text-xs leading-relaxed" style={{
          backgroundColor: 'color-mix(in srgb, var(--coffee-accent) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--coffee-accent) 20%, transparent)',
          color: 'var(--coffee-text-secondary)'
        }}>
          {t('cloud.feature', locale)}
        </div>
      </section>

      {/* Offline PWA pitch */}
      <section className="max-w-3xl mx-auto px-4 py-4">
        <div className="rounded-xl p-4 text-xs leading-relaxed" style={{
          backgroundColor: 'color-mix(in srgb, var(--coffee-accent) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--coffee-accent) 20%, transparent)',
          color: 'var(--coffee-text-secondary)'
        }}>
          {t('hero.offline_pitch', locale)}
        </div>
      </section>

      {/* Scenarios */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <h3 className="text-3xl font-bold text-center mb-10" style={{ color: 'var(--coffee-text)' }}>{t('home.scenarios_title', locale)}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'compress', href: '/compress' },
            { key: 'edit', href: '/edit-pdf' },
            { key: 'merge', href: '/merge' },
            { key: 'sign', href: '/sign-pdf' },
            { key: 'protect', href: '/protect-pdf' },
            { key: 'word', href: '/pdf-to-word' },
          ].map(s => (
            <a key={s.key} href={s.href}
              className="group flex items-start gap-3 p-4 rounded-xl transition-all"
              style={{
                backgroundColor: 'var(--coffee-surface-solid)',
                border: '1px solid var(--coffee-border)',
                textDecoration: 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--coffee-accent)';
                e.currentTarget.style.boxShadow = '0 4px 20px var(--coffee-accent-glow)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--coffee-border)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
              <span className="text-sm leading-relaxed" style={{ color: 'var(--coffee-text)' }}>
                {t(`home.scenarios_${s.key}`, locale)}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Guides */}
      <section className="max-w-5xl mx-auto px-4 py-4">
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--coffee-surface-solid)', border: '1px solid var(--coffee-border)' }}>
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--coffee-text)' }}>📚 {t('nav.guides', locale)}</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--coffee-text-secondary)' }}>
            {t('desc.guide', locale)}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {guides.slice(0, 4).map(article => {
              const title = (article.title as Record<string, string>)[locale] || article.title.en;
              const excerpt = (article.excerpt as Record<string, string>)[locale] || article.excerpt.en;
              return (
                <a key={article.slug} href={`/guides/${localeGuidesSlug[locale]}/${article.category}/${article.slug}`}
                  className="block p-4 rounded-xl transition"
                  style={{ backgroundColor: 'var(--coffee-surface)', border: '1px solid var(--coffee-border)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--coffee-accent)'; e.currentTarget.style.boxShadow = '0 4px 20px var(--coffee-accent-glow)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--coffee-border)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--coffee-text)' }}>{title}</h4>
                  <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--coffee-text-secondary)' }}>{excerpt}</p>
                </a>
              );
            })}
          </div>
          <a href={`/guides/${localeGuidesSlug[locale]}`}
            className="inline-flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: 'var(--coffee-accent)' }}>
            {t('guides.all_guides', locale)} →
          </a>
        </div>
      </section>

      {/* Tools */}
      <section id="tools" className="max-w-7xl mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-3" style={{ color: 'var(--coffee-text)' }}>{t('home.pdfTools', locale)}</h3>
        <p className="text-center mb-12" style={{ color: 'var(--coffee-text-secondary)' }}>
          {t('home.subtitle2', locale)}
        </p>

        {(function() {
          const catBorder = (k: string) => `var(--cat-${k}-border)`;
          const catBg = (k: string) => `var(--cat-${k}-bg)`;

          return categories.map(cat => {
            let filtered = tools.filter(t => t.category === cat.key);
            if (search) {
              const q = search.toLowerCase();
              filtered = filtered.filter(tt =>
                t(`tool.${tt.key}`, locale).toLowerCase().includes(q) ||
                t(`desc.${tt.key}`, locale).toLowerCase().includes(q)
              );
            }
            if (filtered.length === 0) return null;
            return (
              <div key={cat.key} className="mb-12 last:mb-0">
                <h4 className="text-xl font-bold mb-5 flex items-center gap-2"
                  style={{ color: `var(--cat-${cat.key})` }}>
                  <span>{cat.icon}</span>
                  <span>{t(`nav.category.${cat.key === 'more' ? 'more' : cat.key}`, locale)}</span>
                </h4>
                <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                  {filtered.map((tool) => (
                    <a key={tool.key} href={toolPath(tool.key)}
                      className="group"
                      style={{
                        display: 'flex', flexDirection: 'column' as const,
                        padding: '1.25rem 1.5rem', borderRadius: '16px',
                        backgroundColor: 'var(--coffee-surface-solid)',
                        border: `1px solid var(--coffee-border)`,
                        borderLeft: `3px solid ${catBorder(cat.key)}`,
                        transition: 'all 0.25s',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = catBorder(cat.key);
                        e.currentTarget.style.boxShadow = `0 4px 20px color-mix(in srgb, ${catBorder(cat.key)} 20%, transparent)`;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--coffee-border)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}>
                      <div className="text-3xl sm:text-4xl mb-3">{getToolIcon(tool.key)}</div>
                      <h4 className="font-bold mb-1 text-sm sm:text-base" style={{ color: 'var(--coffee-text)' }}>{t(`tool.${tool.key}`, locale)}</h4>
                      <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--coffee-text-tertiary)' }}>{t(`desc.${tool.key}`, locale)}</p>
                      {aiTools.has(tool.key) && (
                        <span className="inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--coffee-accent) 12%, transparent)',
                            color: 'var(--coffee-accent)',
                            border: '1px solid color-mix(in srgb, var(--coffee-accent) 25%, transparent)',
                            alignSelf: 'flex-start',
                          }}>
                          {t('hero.ai_badge', locale)}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            );
          });
        })()}
      </section>
    </main>
  );
}
