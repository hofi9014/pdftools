// Analyzes translations in nasze-zasady/page.tsx
// Checks each locale for real translation vs English placeholder

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'nasze-zasady', 'page.tsx'), 'utf8');

// Extract all locale blocks by finding the locale key pattern
const lines = src.split('\n');

const locales = ['ar', 'de', 'en', 'es', 'fa', 'fr', 'hi', 'is', 'it', 'ja', 'no', 'pl', 'pt', 'sv', 'tr', 'zh'];

// Find the start line of each locale block
let currentLocale: string | null = null;
const localeBlocks: Record<string, { start: number; end: number; content: string[] }> = {};

lines.forEach((line: string, i: number) => {
  const match = line.match(/^\s{2}(\w{2}):\s*\{$/);
  if (match && locales.includes(match[1])) {
    currentLocale = match[1];
    localeBlocks[currentLocale] = { start: i, end: i, content: [line] };
  } else if (currentLocale && localeBlocks[currentLocale]) {
    localeBlocks[currentLocale].content.push(line);
    localeBlocks[currentLocale].end = i;
    if (line.trim() === '},' || line.trim() === '};') {
      // Check if next non-empty line is another locale or end
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      const nextLine = lines[j];
      if (nextLine && locales.some(l => nextLine.match(new RegExp(`^\\s{2}${l}:\\s*\\{`)))) {
        currentLocale = null; // will be set on next locale match
      } else if (nextLine && nextLine.includes('export default')) {
        currentLocale = null;
      }
    }
  }
});

// Extract key sections from each locale
interface SecInfo {
  h: string;
  pStart: string;
  hasLink: boolean;
  langSpecific: boolean; // has language-specific characters
}

interface LocaleInfo {
  title: string;
  sections: SecInfo[];
}

const result: Record<string, LocaleInfo> = {};

// Simpler approach: extract sections by regex from each locale block
function extractSections(text: string) {
  const secs: SecInfo[] = [];
  // Find all {h: ..., p: ...} pairs
  const sectionRegex = /h:\s*'([^']*)',\s*\n\s*p:\s*'([^']*)'/g;
  let m;
  while ((m = sectionRegex.exec(text)) !== null) {
    const h = m[1];
    const p = m[2].substring(0, 100);
    secs.push({
      h,
      pStart: p,
      hasLink: m[2].includes('<a '),
      langSpecific: true
    });
  }
  return secs;
}

// Read all locale content by joining lines
const fullText = lines.join('\n');

// Split by locale key pattern - more robust
const localeRegex = /^  (\w{2}): \{$/gm;
let curLocale: string | null = null;
let curStart = 0;
const localeTexts: Record<string, string> = {};

for (let i = 0; i < lines.length; i++) {
  const match = lines[i].match(/^  (\w{2}): \{$/);
  if (match && locales.includes(match[1])) {
    if (curLocale) {
      localeTexts[curLocale] = lines.slice(curStart, i).join('\n');
    }
    curLocale = match[1];
    curStart = i;
  }
}
if (curLocale) {
  // Find end of last block
  let endIdx = lines.length;
  for (let i = curStart; i < lines.length; i++) {
    if (lines[i].includes('export default')) {
      endIdx = i;
      break;
    }
  }
  localeTexts[curLocale] = lines.slice(curStart, endIdx).join('\n');
}

// Analyze each locale
const enText = localeTexts['en'] || '';
const enSections = extractSections(enText);

for (const loc of locales) {
  const lt = localeTexts[loc] || '';
  if (!lt) {
    result[loc] = { title: 'MISSING', sections: [] };
    continue;
  }

  const sections = extractSections(lt);

  // Check if sections match English exactly (untranslated)
  const enSectionCount = enSections.length;
  const isEnPlaceholder = sections.length === enSectionCount &&
    sections.every((s: SecInfo, i: number) => s.h === enSections[i]?.h);

  // Check specific language indicators
  let hasLangChars = false;
  const langIndicators: Record<string, string[]> = {
    ar: ['العربية', 'مبادئ', 'خصوصية', 'أمان', 'مجاني', 'دعم', 'إعلانات'],
    de: ['kostenlos', 'Datenschutz', 'Sicherheit', 'Werbung', 'Unterstützung', 'Feedback', 'Prinzipien', 'Transparenz'],
    es: ['gratuito', 'privacidad', 'seguridad', 'anuncios', 'apoyo', 'comentarios', 'principios', 'transparencia'],
    fa: ['رایگان', 'حریم خصوصی', 'امنیت', 'تبلیغات', 'حمایت', 'بازخورد', 'اصول', 'شفاف'],
    fr: ['gratuit', 'confidentialité', 'sécurité', 'publicités', 'soutien', 'retours', 'principes', 'transparence'],
    hi: ['मुफ्त', 'गोपनीयता', 'सुरक्षा', 'विज्ञापन', 'समर्थन', 'प्रतिक्रिया', 'सिद्धांत', 'पारदर्शिता'],
    is: ['ókeypis', 'næði', 'öryggi', 'auglýsingar', 'stuðningur', 'endurgjöf', 'meginreglur', 'gagnsæi'],
    it: ['gratuito', 'privacy', 'sicurezza', 'pubblicità', 'supporto', 'feedback', 'principi', 'trasparenza'],
    ja: ['無料', 'プライバシー', 'セキュリティ', '広告', 'サポート', 'フィードバック', '理念', '透明'],
    no: ['gratis', 'personvern', 'sikkerhet', 'annonser', 'støtte', 'tilbakemelding', 'prinsipper', 'transparens'],
    pl: ['darmowe', 'prywatność', 'bezpieczeństwo', 'reklamy', 'wsparcie', 'feedback', 'zasady', 'przejrzystość'],
    pt: ['gratuito', 'privacidade', 'segurança', 'anúncios', 'apoio', 'feedback', 'princípios', 'transparência'],
    sv: ['gratis', 'integritet', 'säkerhet', 'annonser', 'stöd', 'feedback', 'principer', 'transparens'],
    tr: ['ücretsiz', 'gizlilik', 'güvenlik', 'reklamlar', 'destek', 'geri bildirim', 'ilkeler', 'şeffaf'],
    zh: ['免费', '隐私', '安全', '广告', '支持', '反馈', '原则', '透明'],
    en: ['free', 'privacy', 'security', 'ads', 'support', 'feedback', 'principles', 'transparent'],
  };

  const indicators = langIndicators[loc] || [];
  for (const ind of indicators) {
    if (sections.some((s: SecInfo) => s.h.includes(ind) || s.pStart.includes(ind))) {
      hasLangChars = true;
      break;
    }
  }

  // Check if section 1, 6, and "Voluntary support" are different from English
  const enSec1 = enSections[0];
  const enSec6 = enSections[5];
  const enVoluntary = enSections[6];

  const sec1Differs = sections[0] && enSec1 && sections[0].h !== enSec1.h;
  const sec6Differs = sections[5] && enSec6 && sections[5].h !== enSec6.h;
  const voluntaryDiffers = sections[6] && enVoluntary && sections[6].h !== enVoluntary.h;

  result[loc] = {
    title: lt.match(/title:\s*'([^']+)'/)?.[1] || '?',
    sections,
    present: sections.length === enSectionCount,
    isEnPlaceholder,
    hasLangChars,
    sec1Translated: sec1Differs || loc === 'en',
    sec6Translated: sec6Differs || loc === 'en',
    voluntaryTranslated: voluntaryDiffers || loc === 'en',
  } as any;
}

// Print table
console.log('='.repeat(100));
console.log('LOCALE TRANSLATION VERIFICATION — nasze-zasady/page.tsx'.padStart(55));
console.log('='.repeat(100));
console.log('');
console.log('Locale  Title                                      Sec#   Sec1(§1)      Sec6(§6)      Voluntary   RealLang?');
console.log('──────  ─────────────────────────────────────────  ────  ─────────────  ─────────────  ───────────  ────────');

for (const loc of locales) {
  const r = result[loc] as any;
  const title = (r.title || 'MISSING').padEnd(45).substring(0, 45);
  const secCount = r.sections?.length?.toString() || '0';
  const sec1 = r.sec1Translated ? '✓' : '✗ EN';
  const sec6 = r.sec6Translated ? '✓' : '✗ EN';
  const vol = r.voluntaryTranslated ? '✓' : '✗ EN';
  const real = r.hasLangChars ? (r.isEnPlaceholder ? '⚠ EN-ish' : '✓ OK') : (r.present ? '✗ EN-pasted' : '✗ MISSING');
  console.log(` ${loc.padEnd(5)}  ${title}  ${secCount.padStart(2)}    ${sec1.padEnd(14)} ${sec6.padEnd(14)} ${vol.padEnd(12)}  ${real}`);
}

console.log('');
console.log('Legend: ✓ = translated, ✗ EN = English placeholder, ⚠ = partial, ✗ MISSING = locale block absent');

// Detail: print headers for points 1, 6, and voluntary support for each locale
console.log('');
console.log('='.repeat(100));
console.log('DETAIL: Section headers (points 1, 6, Voluntary support) per locale');
console.log('='.repeat(100));
for (const loc of locales) {
  const r = result[loc] as any;
  if (!r.sections || r.sections.length === 0) {
    console.log(`\n${loc}: MISSING`);
    continue;
  }
  console.log(`\n${loc}: "${r.title}"`);
  console.log(`  §1: ${r.sections[0]?.h || 'MISSING'}`);
  console.log(`  §6: ${r.sections[5]?.h || 'MISSING'}`);
  console.log(`  Vol: ${r.sections[6]?.h || 'MISSING'}`);
}
