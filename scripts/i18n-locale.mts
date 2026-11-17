// Adding a language (plan item 6): pulls every text that needs translating out of the code, and
// puts the translations back in — by the syntax tree, never by searching text.
//
//   npx tsx scripts/i18n-locale.mts extract id   → test-output/i18n/id/{ui,content,legal}.source.json
//   (translate: write ui.json, content.json and legal.json in the same folder, { key: text })
//   npx tsx scripts/i18n-locale.mts apply id     → lib/translations/id.ts, lib/legal/id.ts, and an
//                                                 `id` entry in every localized object of content/
//
// Two shapes of localized text exist in content/ and lib/guide-categories.ts: one string per
// language ({ pl: '…', en: '…', … }) and a whole page per language ({ pl: { … }, en: { … } }).
// Both are found the same way: an object literal with an `en` property and at least 8 other
// language properties. The source file records the English text; `apply` refuses if it no
// longer matches (the code changed in between), if a translation is missing, if its {placeholders}
// differ from the English, or if the language is already there. The registries (lists of
// languages, flags, fonts) are edited by hand — see AGENTS.md.
import ts from 'typescript';
import { readFileSync, writeFileSync, mkdirSync, existsSync, globSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { locales } from '../lib/i18n';

const [mode, locale] = process.argv.slice(2);
if (!['extract', 'apply'].includes(mode ?? '') || !/^[a-z]{2}$/.test(locale ?? '')) {
  console.error('usage: npx tsx scripts/i18n-locale.mts extract|apply <locale>');
  process.exit(2);
}
const LOC = locale!;
const DIR = join('test-output', 'i18n', LOC);
// The languages the site already has (lib/i18n.ts) plus the one being added.
const KNOWN = new Set<string>([...locales, LOC]);
const CONTENT_FILES = [...globSync('content/**/*.ts'), 'lib/guide-categories.ts'].map((f) => f.replace(/\\/g, '/')).sort();

type Entry = { en: string; pl?: string };
const placeholders = (s: string) => [...s.matchAll(/\{[a-zA-Z_]+\}/g)].map((m) => m[0]).sort().join(' ');

/** The name of a property ('pl', "pl" or pl). */
const propName = (p: ts.ObjectLiteralElementLike, sf: ts.SourceFile) => (p.name ? p.name.getText(sf).replace(/^['"]|['"]$/g, '') : '');

/** Localized objects of a file, in source order, with where each language value sits. */
function localizedObjects(sf: ts.SourceFile) {
  const out: { obj: ts.ObjectLiteralExpression; props: Map<string, ts.PropertyAssignment> }[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isObjectLiteralExpression(n)) {
      const props = new Map<string, ts.PropertyAssignment>();
      for (const p of n.properties) if (ts.isPropertyAssignment(p) && KNOWN.has(propName(p, sf))) props.set(propName(p, sf), p);
      if (props.has('en') && props.size >= 9) { out.push({ obj: n, props }); return; }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/** String leaves under a node, with a path made of property names and array indexes. */
function stringLeaves(n: ts.Expression, sf: ts.SourceFile, path = ''): { path: string; node: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral }[] {
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return [{ path, node: n }];
  if (ts.isObjectLiteralExpression(n)) return n.properties.flatMap((p) => {
    if (!ts.isPropertyAssignment(p)) throw new Error(`${sf.fileName}: unsupported property at ${path}`);
    return stringLeaves(p.initializer, sf, `${path}.${propName(p, sf)}`);
  });
  if (ts.isArrayLiteralExpression(n)) return n.elements.flatMap((e, i) => stringLeaves(e as ts.Expression, sf, `${path}[${i}]`));
  if (ts.isAsExpression(n) || ts.isSatisfiesExpression(n) || ts.isParenthesizedExpression(n)) return stringLeaves(n.expression, sf, path);
  if (ts.isNumericLiteral(n) || n.kind === ts.SyntaxKind.TrueKeyword || n.kind === ts.SyntaxKind.FalseKeyword) return [];
  throw new Error(`${sf.fileName}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}: ${ts.SyntaxKind[n.kind]} at ${path || '(value)'} is not a plain string`);
}

const parse = (f: string) => ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true);
const quote = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;

/** Every text of content/: key → English (and Polish, where the same place has it). */
function contentSource(): Record<string, Entry> {
  const out: Record<string, Entry> = {};
  for (const f of CONTENT_FILES) {
    const sf = parse(f);
    localizedObjects(sf).forEach(({ props }, i) => {
      if (props.has(LOC)) throw new Error(`${f}: "${LOC}" is already there`);
      const en = props.get('en')!.initializer;
      const plLeaves = props.has('pl') ? new Map(stringLeaves(props.get('pl')!.initializer, sf).map((l) => [l.path, l.node.text])) : new Map();
      for (const leaf of stringLeaves(en, sf)) out[`${f}#${i}${leaf.path}`] = { en: leaf.node.text, pl: plLeaves.get(leaf.path) };
    });
  }
  return out;
}

async function moduleDefault<T>(file: string): Promise<T> {
  return (await import(pathToFileURL(file).href)).default as T;
}

function flatten(o: unknown, path = '', out: Record<string, string> = {}): Record<string, string> {
  if (typeof o === 'string') out[path] = o;
  else if (Array.isArray(o)) o.forEach((v, i) => flatten(v, `${path}[${i}]`, out));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) flatten(v, `${path}.${k}`, out);
  return out;
}

if (mode === 'extract') {
  mkdirSync(DIR, { recursive: true });
  const enUi = await moduleDefault<Record<string, string>>('lib/translations/en.ts');
  const plUi = await moduleDefault<Record<string, string>>('lib/translations/pl.ts');
  const ui = Object.fromEntries(Object.entries(enUi).map(([k, en]) => [k, { en, pl: plUi[k] }]));
  const enLegal = flatten(await moduleDefault('lib/legal/en.ts'));
  const plLegal = flatten(await moduleDefault('lib/legal/pl.ts'));
  const legal = Object.fromEntries(Object.entries(enLegal).map(([k, en]) => [k, { en, pl: plLegal[k] }]));
  const content = contentSource();
  for (const [name, data] of [['ui', ui], ['content', content], ['legal', legal]] as const) {
    writeFileSync(join(DIR, `${name}.source.json`), JSON.stringify(data, null, 1));
    const chars = Object.values(data).reduce((n, e) => n + e.en.length, 0);
    console.log(`${name}: ${Object.keys(data).length} texts, ${chars} characters → ${join(DIR, `${name}.source.json`)}`);
  }
} else {
  const load = (name: string) => {
    const src = JSON.parse(readFileSync(join(DIR, `${name}.source.json`), 'utf8')) as Record<string, Entry>;
    const tr = JSON.parse(readFileSync(join(DIR, `${name}.json`), 'utf8')) as Record<string, string>;
    const problems: string[] = [];
    for (const [k, e] of Object.entries(src)) {
      const t = tr[k];
      if (typeof t !== 'string' || !t.trim()) problems.push(`${name} ${k}: missing`);
      else if (placeholders(t) !== placeholders(e.en)) problems.push(`${name} ${k}: placeholders ${placeholders(t)} ≠ ${placeholders(e.en)}`);
    }
    for (const k of Object.keys(tr)) if (!(k in src)) problems.push(`${name} ${k}: not in the source`);
    return { src, tr, problems };
  };
  const ui = load('ui'), content = load('content'), legal = load('legal');
  const current = contentSource();
  for (const [k, e] of Object.entries(content.src)) if (current[k]?.en !== e.en) content.problems.push(`content ${k}: the code changed since extract`);
  const problems = [...ui.problems, ...content.problems, ...legal.problems];
  if (problems.length) { console.error(problems.slice(0, 40).join('\n')); console.error(`${problems.length} problem(s); nothing written`); process.exit(1); }

  // lib/translations/<loc>.ts — same keys and order as en.
  const enUi = await moduleDefault<Record<string, string>>('lib/translations/en.ts');
  const uiOut = `// ${LOC} translations. A key missing here falls back to en (lib/i18n.ts).\nconst ${LOC}: Record<string, string> = {\n${Object.keys(enUi).map((k) => `  ${quote(k)}: ${quote(ui.tr[k]!)},`).join('\n')}\n};\n\nexport default ${LOC};\n`;
  if (existsSync(`lib/translations/${LOC}.ts`)) throw new Error(`lib/translations/${LOC}.ts exists`);
  writeFileSync(`lib/translations/${LOC}.ts`, uiOut);

  // lib/legal/<loc>.ts — the English file with every string replaced.
  const enLegalFile = 'lib/legal/en.ts';
  const lsf = parse(enLegalFile);
  let legalText = lsf.getFullText();
  const decl = lsf.statements.find(ts.isVariableStatement)!.declarationList.declarations[0]!;
  const leaves = stringLeaves(decl.initializer!, lsf).sort((a, b) => b.node.getStart(lsf) - a.node.getStart(lsf));
  for (const l of leaves) legalText = legalText.slice(0, l.node.getStart(lsf)) + quote(legal.tr[l.path]!) + legalText.slice(l.node.getEnd());
  legalText = legalText.replace(/\bconst en: LegalTexts\b/, `const ${LOC}: LegalTexts`).replace(/export default en;/, `export default ${LOC};`);
  if (existsSync(`lib/legal/${LOC}.ts`)) throw new Error(`lib/legal/${LOC}.ts exists`);
  writeFileSync(`lib/legal/${LOC}.ts`, legalText);

  // content/: insert `<loc>: …` after the last language property of every localized object.
  let inserted = 0;
  for (const f of CONTENT_FILES) {
    const sf = parse(f);
    let text = sf.getFullText();
    const objs = localizedObjects(sf).map((o, i) => ({ ...o, i })).reverse();
    for (const { props, i } of objs) {
      const en = props.get('en')!.initializer;
      let value: string;
      if (ts.isObjectLiteralExpression(en) || ts.isArrayLiteralExpression(en)) {
        let v = en.getText(sf); const base = en.getStart(sf);
        for (const l of stringLeaves(en, sf).sort((a, b) => b.node.getStart(sf) - a.node.getStart(sf))) {
          v = v.slice(0, l.node.getStart(sf) - base) + quote(content.tr[`${f}#${i}${l.path}`]!) + v.slice(l.node.getEnd() - base);
        }
        value = v;
      } else value = quote(content.tr[`${f}#${i}`]!);
      const last = [...props.values()].sort((a, b) => b.getEnd() - a.getEnd())[0]!;
      const prevLine = sf.getLineAndCharacterOfPosition(last.getStart(sf)).line;
      const others = [...props.values()].filter((p) => p !== last);
      const inline = others.some((p) => sf.getLineAndCharacterOfPosition(p.getStart(sf)).line === prevLine);
      let at = last.getEnd();
      const after = text.slice(at).match(/^\s*,/);
      if (after) at += after[0].length; else { text = text.slice(0, at) + ',' + text.slice(at); at += 1; }
      const indent = text.slice(text.lastIndexOf('\n', last.getStart(sf)) + 1, last.getStart(sf)).match(/^\s*/)![0];
      const nl = text.includes('\r\n') ? '\r\n' : '\n'; // the file's own line ending
      const ins = inline ? ` ${LOC}: ${value},` : `${nl}${indent}${LOC}: ${value.replace(/\r?\n/g, nl)},`;
      text = text.slice(0, at) + ins + text.slice(at);
      inserted++;
    }
    if (objs.length) writeFileSync(f, text);
  }
  console.log(`lib/translations/${LOC}.ts (${Object.keys(enUi).length} keys), lib/legal/${LOC}.ts, ${inserted} localized objects in content/`);
}
