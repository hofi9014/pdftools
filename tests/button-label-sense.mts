// Buttons translated word for word from English into something else (2026-11-11).
//
// "Save New Order" was translated as the band's name („New Order“ speichern, Guardar «New Order»,
// ニュー・オーダーを救え = "rescue New Order") or as a purchase order (Guardar Nova Encomenda,
// Yeni Siparişi Kaydet, Vista nýja pöntun…); "Extract" became the noun "an extract / excerpt"
// (Auszug, Extracto, 抜粋, and in Hindi "squeezed juice"); the Icelandic unlock button said
// "Lock PDF". This test keeps every one of those wordings out and forbids quoted English phrases
// inside other languages, which is how most of them showed up.
const { all } = await import('../lib/translations/all.ts');

let fails = 0;
const check = (ok: boolean, msg: string) => { if (!ok) { console.log(`FAIL: ${msg}`); fails++; } };

const OLD: Record<string, Record<string, string>> = {
  'page.reorder.btn': {
    de: '„New Order“ speichern', es: 'Guardar «New Order»', fr: 'Enregistrer « New Order »', it: 'Salva "New Order"',
    pt: 'Guardar Nova Encomenda', tr: 'Yeni Siparişi Kaydet', ja: 'ニュー・オーダーを救え', hi: 'नया ऑर्डर सहेजें',
    is: 'Vista nýja pöntun', no: 'Lagre ny ordre', sv: 'Spara New Order', en: 'Save New Order',
  },
  'page.extract.button': {
    de: 'Auszug', es: 'Extracto', fr: 'Extrait', it: 'Estratto', pt: 'Extrato', tr: 'Alıntı', ja: '抜粋',
    hi: 'निचोड़', is: 'Útdráttur', no: 'Utdrag', sv: 'Utdrag', en: 'Extract',
  },
  'page.unlock.button': { is: 'Læsa PDF' },
  'page.delete.btn': { is: 'Eyða valin bls.' },
  'page.flatten.btn': { pt: 'Simplificar PDF' },
  'page.compress.button': { pl: 'Kompresja plików PDF' },
};
for (const [key, byLocale] of Object.entries(OLD)) {
  for (const [l, old] of Object.entries(byLocale)) {
    const now = all[l]![key];
    check(typeof now === 'string' && now.length > 0, `${l}/${key}: present`);
    check(now !== old, `${l}/${key}: no longer "${old}"`);
  }
}

// No quoted English phrase (two or more words) inside another language.
for (const [l, dict] of Object.entries(all)) {
  if (l === 'en') continue;
  for (const [k, v] of Object.entries(dict)) {
    const m = typeof v === 'string' && v.match(/[„«"“]\s?([A-Z][a-z]+(?: [A-Z]?[a-z]+)+)\s?[“»"”]/);
    check(!m, `${l}/${k}: quoted English "${m && m[1]}"`);
  }
}

// The page order and extract buttons say what they do on the page.
check(/order/i.test(all.en!['page.reorder.btn']!) && /page/i.test(all.en!['page.reorder.btn']!), 'en: reorder button mentions the page order');
check(/strony/.test(all.pl!['page.extract.button']!), 'pl: extract button names the pages');

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
