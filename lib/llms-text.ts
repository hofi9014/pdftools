// The text of /llms.txt (app/llms.txt/route.ts) — a plain description of the site for AI assistants and their crawlers
// (llmstxt.org format: title, one-line summary, facts, then lists of links).
//
// Built from the same code the pages use (tool list, which tools leave the browser, the AI limit,
// guide addresses), so it cannot drift from what the site actually does. Static: generated at
// build time like sitemap.xml.

import { t, locales, type Locale } from '@/lib/i18n';
import { tools, toolPath, homePath, NON_LOCAL_TOOLS } from '@/lib/tools';
import { KSEF_PATH, KSEF_TOOL_NAME, KSEF_GUIDE_PATH } from '@/lib/ksef/route';
import { KSEF_GUIDE_TITLE } from '@/content/pages/ksef-guide';
import { getAllArticles } from '@/lib/guides';
import { guideArticlePath, encodePath } from '@/lib/guide-urls';
import { DAILY_LIMIT } from '@/lib/ai-limit';
import { rows, MEASURED_ON } from '@/content/pages/upload-comparison';

const SITE = 'https://optimapdf.com';

export function llmsText(): string {
  const listed = tools.filter((x) => !x.disabled);
  const local = listed.filter((x) => !NON_LOCAL_TOOLS[x.key]);
  const ai = listed.filter((x) => NON_LOCAL_TOOLS[x.key] === 'ai').map((x) => t(`tool.${x.key}`, 'en'));
  const url = listed.filter((x) => NON_LOCAL_TOOLS[x.key] === 'url').map((x) => t(`tool.${x.key}`, 'en'));
  const names = new Intl.DisplayNames(['en'], { type: 'language' });
  const line = (name: string, path: string, desc: string) => `- [${name}](${SITE}${encodePath(path)}): ${desc}`;

  const out: string[] = [];
  out.push('# OptimaPDF', '');
  out.push(`> Free online PDF tools that run in the web browser. ${local.length} of ${listed.length} tools process the PDF on the visitor's own device — the file is not uploaded to a server. No account, no watermark, available in ${locales.length} languages.`, '');
  out.push('Facts about the service:', '');
  out.push(`- ${local.length} of ${listed.length} tools (merge, split, compress, convert, edit, sign, OCR and others) run entirely in the browser; the file never reaches the OptimaPDF server.`);
  out.push(`- ${listed.length - local.length} tools work outside the browser: ${ai.join(', ')} send only the text extracted from the PDF to an external AI service (the file itself stays on the device; ${DAILY_LIMIT} AI requests per day, no API key needed); ${url.join(', ')} has the OptimaPDF server fetch the web page entered (no user file is sent).`);
  out.push('- Free to use, no sign-up, no watermark added to results.');
  out.push('- Works on desktop and mobile browsers; can be installed as an app, and a local tool opened once also works without internet.');
  out.push('- Files can be opened from and saved to Google Drive, Dropbox and OneDrive.');
  out.push('- Anyone can check that files are not uploaded: open the browser developer tools (F12), Network tab, use a tool, and see that no request carries the file.');
  out.push(`- Comparison measured on ${MEASURED_ON}: the compress tools of ${rows.filter((r) => r.sent).map((r) => r.name).join(', ')} sent the test file to their servers; OptimaPDF did not. Method and public measurement code: ${SITE}/en/where-your-file-goes`);
  out.push(`- Languages: ${locales.map((l) => names.of(l) ?? l).join(', ')}.`);
  out.push(`- Run by Leszek Hofman (Poland). About the project: ${SITE}/en/about · Source code: https://github.com/hofi9014/pdftools`);
  out.push(`- Privacy policy: ${SITE}/en/privacy · Security: ${SITE}/en/security · Contact: kontakt@optimapdf.com`, '');

  out.push('## Tools', '');
  for (const x of listed) out.push(line(t(`tool.${x.key}`, 'en'), toolPath(x.key, 'en'), t(`desc.${x.key}`, 'en')));
  out.push('');

  out.push('## Polish only', '');
  out.push(line(`${KSEF_TOOL_NAME} (KSeF XML to PDF)`, KSEF_PATH, 'Opens an e-invoice XML file from the Polish National e-Invoicing System (KSeF, structures FA(3) and FA(2)) in the browser, shows every field of the invoice and saves it as PDF. The file is not uploaded.'));
  out.push(line(`${KSEF_GUIDE_TITLE} (guide, Polish)`, KSEF_GUIDE_PATH, 'Where a KSeF invoice XML file comes from, how to read it and save it as PDF without logging in, and when a visualization needs a QR verification code.'));
  out.push('');

  out.push('## Guides', '');
  for (const a of getAllArticles()) out.push(line(a.title.en, guideArticlePath('en', a.category, a.slug), a.excerpt.en));
  out.push('');

  out.push('## Optional', '');
  for (const l of locales) out.push(`- [OptimaPDF in ${names.of(l) ?? l}](${SITE}${homePath(l as Locale)})`);
  out.push('');
  return out.join('\n');
}

