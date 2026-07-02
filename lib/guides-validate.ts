import type { Locale } from '@/lib/i18n';
import { locales } from '@/lib/i18n';
import type { GuideArticle, ToolSlug } from '@/types/guide';
import guides from '@/content/guides';

const toolSlugs = new Set<ToolSlug>([
  'merge', 'split', 'compress', 'word', 'wordtopdf',
  'jpg', 'jpgTopdf', 'protect', 'unlock', 'rotate',
  'pagenumbers', 'watermark', 'ocr', 'extract', 'delete',
  'reorder', 'crop', 'addpage', 'metadata', 'edit', 'sign',
  'excel', 'excel2pdf', 'txt', 'svg', 'redact', 'epub',
  'aichat', 'aisummary', 'translate', 'ppt', 'compare',
  'html', 'url', 'html2pdf', 'flatten', 'openoffice',
  'pdf2openoffice', 'fillform', 'images', 'pdfa',
]);

let errors = 0;
let warnings = 0;

function err(msg: string) {
  console.error(`  ❌ ${msg}`);
  errors++;
}

function warn(msg: string) {
  console.warn(`  ⚠️  ${msg}`);
  warnings++;
}

function checkLocalizedString(
  obj: Record<string, unknown>,
  path: string,
  articleSlug: string,
): void {
  for (const locale of locales) {
    if (!obj[locale] || typeof obj[locale] !== 'string' || !(obj[locale] as string).trim()) {
      err(`[${articleSlug}] ${path} — brak tłumaczenia dla locale "${locale}"`);
    }
  }
}

function checkLocalizedStringArr(
  arr: Record<string, unknown>[],
  path: string,
  articleSlug: string,
): void {
  arr.forEach((item, i) => {
    checkLocalizedString(item, `${path}[${i}]`, articleSlug);
  });
}

function checkExcerptLength(article: GuideArticle) {
  const lengths = new Map<string, number>();
  for (const locale of locales) {
    const text = article.excerpt[locale as Locale];
    if (text) lengths.set(locale, text.length);
  }
  const avg = [...lengths.values()].reduce((a, b) => a + b, 0) / lengths.size;
  for (const [locale, len] of lengths) {
    if (len < 80) {
      warn(`[${article.slug}] excerpt[${locale}] ma ${len} znaków — krótkie (< 80)`);
    } else if (len > 170) {
      warn(`[${article.slug}] excerpt[${locale}] ma ${len} znaków — długie (> 170)`);
    }
    if (Math.abs(len - avg) > 40) {
      warn(`[${article.slug}] excerpt[${locale}] (${len} zn.) odbiega o ${Math.round(Math.abs(len - avg))} od średniej ${Math.round(avg)}`);
    }
  }
}

export function validateGuides(): { errors: number; warnings: number } {
  errors = 0;
  warnings = 0;

  console.log(`\n=== Walidacja przewodników (${guides.length} artykułów) ===\n`);

  for (const article of guides) {
    checkLocalizedString(article.title as unknown as Record<string, unknown>, 'title', article.slug);
    checkLocalizedString(article.excerpt as unknown as Record<string, unknown>, 'excerpt', article.slug);
    checkExcerptLength(article);

    article.body.forEach((block, i) => {
      const prefix = `body[${i}]`;
      switch (block.type) {
        case 'paragraph':
        case 'heading':
          checkLocalizedString(block.text as unknown as Record<string, unknown>, `${prefix}.text`, article.slug);
          break;
        case 'step':
          checkLocalizedString(block.title as unknown as Record<string, unknown>, `${prefix}.title`, article.slug);
          checkLocalizedString(block.text as unknown as Record<string, unknown>, `${prefix}.text`, article.slug);
          break;
        case 'list':
          checkLocalizedStringArr(block.items as unknown as Record<string, unknown>[], `${prefix}.items`, article.slug);
          break;
        case 'cta':
          if (!toolSlugs.has(block.tool)) {
            err(`[${article.slug}] ${prefix}.tool = "${block.tool}" — nie istnieje w ToolSlug`);
          }
          break;
      }
    });

    if (!toolSlugs.has(article.relatedTool)) {
      err(`[${article.slug}] relatedTool = "${article.relatedTool}" — nie istnieje w ToolSlug`);
    }

    article.faq.forEach((faq, i) => {
      checkLocalizedString(faq.q as unknown as Record<string, unknown>, `faq[${i}].q`, article.slug);
      checkLocalizedString(faq.a as unknown as Record<string, unknown>, `faq[${i}].a`, article.slug);
    });
  }

  console.log(`\n=== Podsumowanie: ${guides.length} artykułów, ${errors} błędów, ${warnings} ostrzeżeń ===\n`);
  return { errors, warnings };
}
