import { readFileSync, writeFileSync, existsSync } from 'fs';

const API_KEY = process.env.OPENROUTER_API_KEY || 'sk-or-v1-...';

const keys = JSON.parse(readFileSync('edit-keys.json', 'utf-8'));
const enKeys = keys.en;
const plKeys = keys.pl;

let src = readFileSync('lib/i18n.ts', 'utf-8');

const LANG_CODES = ['ar', 'de', 'en', 'es', 'fa', 'fr', 'hi', 'is', 'it', 'ja', 'no', 'pl', 'pt', 'sv', 'tr', 'zh'];

function getExistingKeys(langCode) {
  const re = new RegExp(`const ${langCode}: Record<string, string> = \\{([\\s\\S]*?)\\};`);
  const m = src.match(re);
  if (!m) return new Set();
  const block = m[1];
  const keyRe = /^\s+'([^']+)':/gm;
  const keys = new Set();
  let km;
  while ((km = keyRe.exec(block)) !== null) keys.add(km[1]);
  return keys;
}

function insertKeys(langCode, valueMap) {
  const re = new RegExp(`(const ${langCode}: Record<string, string> = \\{[\\s\\S]*?)(\\};)`);
  const m = src.match(re);
  if (!m) { console.error(`Cannot find ${langCode} block`); return false; }
  
  const existing = getExistingKeys(langCode);
  const newLines = [];
  
  // Sort keys for consistent order
  const sortedKeys = Object.keys(valueMap).sort();
  for (const k of sortedKeys) {
    if (existing.has(k)) continue;
    const v = valueMap[k].replace(/'/g, "\\'");
    newLines.push(`  '${k}': '${v}',`);
  }
  
  if (newLines.length === 0) { console.log(`  ${langCode}: no new keys to add`); return true; }
  
  const insertion = '\n' + newLines.join('\n') + '\n';
  // Insert before }; on its own line
  // Find the last }; in the match
  const blockEnd = m[0].lastIndexOf('};');
  const before = m[0].substring(0, blockEnd);
  const after = m[0].substring(blockEnd);
  const newBlock = before + insertion + after;
  
  src = src.replace(m[0], newBlock);
  console.log(`  ${langCode}: added ${newLines.length} keys`);
  return true;
}

// Insert Polish keys
console.log('Inserting Polish keys...');
insertKeys('pl', plKeys);

// Insert English keys
console.log('Inserting English keys...');
insertKeys('en', enKeys);

// Save intermediate
writeFileSync('lib/i18n.ts', src, 'utf-8');
console.log('Intermediate save done (pl + en)');

async function translateAndInsert(langCode, langName) {
  const existing = getExistingKeys(langCode);
  const needKeys = Object.keys(enKeys).filter(k => !existing.has(k));
  if (needKeys.length === 0) { console.log(`  ${langCode}: all keys already exist, skipping`); return; }

  console.log(`Translating ${needKeys.length} keys to ${langName} (${langCode})...`);
  
  const result = {};
  
  // Batch into groups of 50
  for (let i = 0; i < needKeys.length; i += 50) {
    const batch = needKeys.slice(i, i + 50);
    const pairsStr = batch.map(k => `${k}: ${enKeys[k]}`).join('\n');
    
    const prompt = `Translate the following English website UI strings to ${langName} (${langCode}). Keep placeholders like {n}, {current}, {total}, {page}, {text} unchanged. Keep emojis. Return ONLY a valid JSON object mapping each key to its translation.

${pairsStr}`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.05,
        max_tokens: 8000,
      }),
    });

    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const jm = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/{[\s\S]*?}/);
    const parsed = JSON.parse((jm ? (jm[1] || jm[0]) : content).trim());
    Object.assign(result, parsed);
    console.log(`    batch ${i/50 + 1}/${Math.ceil(needKeys.length/50)}: ${Object.keys(result).length}/${needKeys.length}`);
  }
  
  // Verify all keys present
  const missing = needKeys.filter(k => !(k in result));
  if (missing.length > 0) {
    console.warn(`    Missing ${missing.length} keys for ${langCode}, filling with English`);
    for (const k of missing) result[k] = enKeys[k];
  }
  
  // Insert into file
  insertKeys(langCode, result);
  writeFileSync('lib/i18n.ts', src, 'utf-8');
  console.log(`  ${langCode} done`);
}

// Process all non-pl/non-en languages
for (const [lc, ln] of [['ar','Arabic'],['de','German'],['es','Spanish'],['fa','Persian'],['fr','French'],['hi','Hindi'],['is','Icelandic'],['it','Italian'],['ja','Japanese'],['no','Norwegian'],['pt','Portuguese'],['sv','Swedish'],['tr','Turkish'],['zh','Chinese']]) {
  await translateAndInsert(lc, ln);
}

console.log('All done!');
