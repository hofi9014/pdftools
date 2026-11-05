// Data of the /guide page (rebuilt 2026-11-05). The page used to carry its own copy of every
// tool's description, steps and tips in 16 languages — 328 kB in a client component — and that
// copy had drifted from the tools: it told people to configure an OpenRouter API key for the AI
// tools, offered a split mode "every N pages", said files are reordered by dragging where there
// are arrow buttons, and so on. It is now built from the sources the tool pages themselves use:
// the tool registry, the tool names and card descriptions in the translations, the steps in
// content/tool-howto.ts (shown on every tool page and checked by tests/tool-page-seo.mts) and the
// cloud answers of the FAQ. Server only: t() has no dictionaries in the browser.
import { locales, t, type Locale } from '@/lib/i18n';
import { categories, tools, slugByKey } from '@/lib/tools';
import { toolHowToSteps } from '@/content/tool-howto';
import { faqData, type LocaleContent } from '@/content/pages/faq';

export type { LocaleContent };

export interface GuideTool {
  key: string;
  name: LocaleContent;
  desc: LocaleContent;
  steps: LocaleContent[];
}

export interface GuideCategory {
  key: string;
  label: LocaleContent;
  tools: GuideTool[];
}

export interface GuideData {
  categories: GuideCategory[];
  cloud: { label: LocaleContent; items: { key: string; q: LocaleContent; a: LocaleContent }[] };
}

const perLocale = (text: (l: Locale) => string): LocaleContent =>
  Object.fromEntries(locales.map((l) => [l, text(l)]));

function toolSteps(key: string): LocaleContent[] {
  const slug = slugByKey[key]!;
  const byLocale = new Map(locales.map((l) => [l, toolHowToSteps(slug, l)]));
  const count = byLocale.get('en')?.length ?? 0;
  if (count === 0) throw new Error(`/guide: no steps for ${key}`);
  for (const [l, steps] of byLocale) {
    if (steps?.length !== count) throw new Error(`/guide: ${key} has ${steps?.length} steps in ${l}, ${count} in en`);
  }
  return Array.from({ length: count }, (_, i) => perLocale((l) => byLocale.get(l)![i]!));
}

function buildGuideData(): GuideData {
  const cloud = faqData.find((c) => c.key === 'cloud');
  if (!cloud) throw new Error('/guide: the FAQ has no cloud category');
  return {
    categories: categories.map((cat) => ({
      key: cat.key,
      label: perLocale((l) => t(`nav.category.${cat.key}`, l)),
      tools: tools
        .filter((tool) => tool.category === cat.key && !tool.disabled)
        .map((tool) => ({
          key: tool.key,
          name: perLocale((l) => t(`tool.${tool.key}`, l)),
          desc: perLocale((l) => t(`desc.${tool.key}`, l)),
          steps: toolSteps(tool.key),
        })),
    })),
    cloud: { label: cloud.label, items: cloud.items.map(({ key, q, a }) => ({ key, q, a })) },
  };
}

export const guideData: GuideData = buildGuideData();
