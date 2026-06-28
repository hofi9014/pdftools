import { readFileSync, writeFileSync } from 'fs';

const DEEPL_KEY = '0c895a6b-e154-4f71-b9e1-4b2af2c156d0:fx';
const FILE = 'C:\\Users\\Leszek\\Desktop\\pdftools\\lib\\i18n.ts';

const DEEPL_URL = 'https://api-free.deepl.com/v2/translate';

async function deeplTranslate(texts, targetLang) {
  const results = [];
  // Batch in groups of 50 (DeepL max)
  for (let i = 0; i < texts.length; i += 50) {
    const batch = texts.slice(i, i + 50);
    const body = { text: batch, target_lang: targetLang, source_lang: 'EN' };
    const res = await fetch(DEEPL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`DeepL error (${res.status}): ${err}`);
    }
    const data = await res.json();
    for (const t of data.translations) {
      results.push(t.text);
    }
    console.log(`  Translated ${results.length}/${texts.length}...`);
  }
  return results;
}

function parseLanguageSection(content, langName) {
  // Find const langName: Record<string, string> = { ... };
  const regex = new RegExp(`const ${langName}: Record<string, string> = \\{([\\s\\S]*?)\\n\\};`);
  const match = content.match(regex);
  if (!match) throw new Error(`Cannot find section for ${langName}`);
  
  const body = match[1];
  const entries = {};
  const entryRegex = /'([^']+)'\s*:\s*'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = entryRegex.exec(body)) !== null) {
    entries[m[1]] = m[2];
  }
  return { fullMatch: match[0], body, entries, startIndex: match.index, endIndex: match.index + match[0].length };
}

function escapeValue(val) {
  return val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function main() {
  let content = readFileSync(FILE, 'utf-8');
  
  // Parse English
  const en = parseLanguageSection(content, 'en');
  const enKeys = Object.keys(en.entries);
  console.log(`English keys: ${enKeys.length}`);
  
  // Target languages
  for (const lang of ['is', 'hi']) {
    console.log(`\n=== Processing ${lang} ===`);
    const target = parseLanguageSection(content, lang);
    const existingKeys = Object.keys(target.entries);
    
    const missingKeys = enKeys.filter(k => !existingKeys.includes(k));
    console.log(`Existing: ${existingKeys.length}, Missing: ${missingKeys.length}`);
    
    if (missingKeys.length === 0) {
      console.log(`${lang} is complete, skipping.`);
      continue;
    }
    
    // Get English source texts for missing keys
    const sourceTexts = missingKeys.map(k => en.entries[k]);
    
    // Translate via DeepL
    const targetLang = lang === 'is' ? 'IS' : 'HI';
    const translated = await deeplTranslate(sourceTexts, targetLang);
    
    // Build new entries block
    const newEntries = missingKeys.map((key, i) => {
      const val = escapeValue(translated[i]);
      return `  '${key}': '${val}'`;
    });
    
    const newBlock = '\n' + newEntries.join(',\n') + ',\n';
    
    // Insert before the closing }; of the target language
    // Find the last } of the target section
    const closingMatch = content.lastIndexOf(`\n};`, target.startIndex + target.fullMatch.length);
    const insertPos = target.startIndex + target.fullMatch.length - 2; // before };
    
    const newContent = content.slice(0, insertPos) + newBlock + content.slice(insertPos);
    
    writeFileSync(FILE, newContent, 'utf-8');
    console.log(`Inserted ${missingKeys.length} translations for ${lang}`);
    content = readFileSync(FILE, 'utf-8'); // Re-read for next iteration
  }
  
  console.log('\nDone! All translations inserted.');
}

main().catch(err => { console.error(err); process.exit(1); });
