// Builds lib/ksef/schema-fa3.ts and lib/ksef/schema-fa2.ts from the official XSD files in
// scripts/ksef-xsd/ (downloaded from crd.gov.pl, see the README there).
//
// For every element and attribute a FA(2)/FA(3) invoice can contain, keyed by its path below the
// root (e.g. "Fa/FaWiersz/P_12", "Naglowek/KodFormularza/@kodSystemowy"), it records:
//   - the description the Ministry of Finance wrote in the schema (xsd:documentation),
//   - the meaning of each allowed code, when the value is a code list (xsd:enumeration),
//   - whether the value is an amount, a quantity, a date or a date-time (from the type).
// The invoice preview takes every label and code meaning from here, so they are the Ministry's
// words, not ours. Run after replacing the XSD files: npx tsx scripts/build-ksef-schema.mts
import { readFileSync, writeFileSync } from 'node:fs';
import { DOMParser, type Element } from '@xmldom/xmldom';

const XSD = 'http://www.w3.org/2001/XMLSchema';
const DIR = 'scripts/ksef-xsd/';

type Kind = 'amount' | 'quantity' | 'date' | 'datetime' | 'text';
interface Field { doc: string; kind: Kind; enumOf?: string }

const docCache = new Map<string, Element>();
function loadSchema(file: string): Element {
  let el = docCache.get(file);
  if (!el) {
    el = new DOMParser().parseFromString(readFileSync(DIR + file, 'utf8'), 'text/xml').documentElement as unknown as Element;
    docCache.set(file, el);
  }
  return el;
}

function kids(el: Element, local?: string): Element[] {
  const out: Element[] = [];
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && (n as Element).namespaceURI === XSD && (!local || (n as Element).localName === local)) out.push(n as Element);
  }
  return out;
}

function documentation(el: Element): string {
  const ann = kids(el, 'annotation')[0];
  const doc = ann && kids(ann, 'documentation')[0];
  return (doc?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Named types of one schema file and of every file it imports or includes, by "{namespace}name". */
function collectTypes(file: string, simple: Map<string, Element>, complex: Map<string, Element>, seen = new Set<string>()): void {
  if (seen.has(file)) return;
  seen.add(file);
  const root = loadSchema(file);
  const ns = root.getAttribute('targetNamespace') ?? '';
  for (const t of kids(root, 'simpleType')) simple.set(`{${ns}}${t.getAttribute('name')}`, t);
  for (const t of kids(root, 'complexType')) complex.set(`{${ns}}${t.getAttribute('name')}`, t);
  for (const imp of [...kids(root, 'import'), ...kids(root, 'include')]) {
    const loc = imp.getAttribute('schemaLocation') ?? '';
    collectTypes(loc.slice(loc.lastIndexOf('/') + 1), simple, complex, seen);
  }
}

function build(mainFile: string): { fields: Record<string, Field>; enums: Record<string, Record<string, string>> } {
  const simple = new Map<string, Element>();
  const complex = new Map<string, Element>();
  collectTypes(mainFile, simple, complex);
  const fields: Record<string, Field> = {};
  const enums: Record<string, Record<string, string>> = {};

  // A prefixed type name ("tns:TAdres", "etd:TData") resolved against the declarations in scope.
  const qname = (ctx: Element, name: string): string => {
    const i = name.indexOf(':');
    const prefix = i < 0 ? null : name.slice(0, i);
    return `{${ctx.lookupNamespaceURI(prefix) ?? ''}}${i < 0 ? name : name.slice(i + 1)}`;
  };

  // The kind of a simple value, from the chain of named types it derives from.
  const kindOf = (ctx: Element, typeName: string | null, inline?: Element): Kind => {
    for (let depth = 0, cur = typeName, curCtx = ctx, el = inline; depth < 12; depth++) {
      if (!el) {
        if (!cur) return 'text';
        const q = qname(curCtx, cur);
        const local = q.slice(q.indexOf('}') + 1);
        if (/^TKwotowy/.test(local) || local === 'TKwotaZOpcjonalnymMinusem') return 'amount';
        if (/^TIlosci/.test(local)) return 'quantity';
        if (/^TDataCzas/.test(local) || local === 'dateTime') return 'datetime';
        if (/^TData/.test(local) || local === 'date') return 'date';
        if (q.startsWith(`{${XSD}}`)) return local === 'decimal' ? 'quantity' : 'text';
        el = simple.get(q);
        if (!el) return 'text';
      }
      const r = kids(el, 'restriction')[0];
      if (!r) return 'text';
      cur = r.getAttribute('base');
      curCtx = r;
      el = undefined;
    }
    return 'text';
  };

  // Enumerated values of a simple type (named or inline), keyed by the type's own name or the path.
  const enumKey = (ctx: Element, typeName: string | null, inline: Element | undefined, path: string): string | undefined => {
    let el = inline;
    let key = path;
    if (!el && typeName) {
      const q = qname(ctx, typeName);
      el = simple.get(q);
      key = q.slice(q.indexOf('}') + 1);
    }
    if (!el) return undefined;
    const r = kids(el, 'restriction')[0];
    const values = r ? kids(r, 'enumeration') : [];
    if (values.length === 0) {
      const base = r?.getAttribute('base');
      return base && !base.startsWith('xsd:') ? enumKey(r!, base, undefined, path) : undefined;
    }
    if (!enums[key]) {
      enums[key] = {};
      for (const v of values) enums[key][v.getAttribute('value') ?? ''] = documentation(v);
    }
    return key;
  };

  const walkContent = (el: Element, path: string, stack: string[]): void => {
    for (const c of kids(el)) {
      switch (c.localName) {
        case 'sequence': case 'choice': case 'all': walkContent(c, path, stack); break;
        case 'element': walkElement(c, path, stack); break;
        case 'attribute': {
          const p = `${path}/@${c.getAttribute('name')}`;
          fields[p] = { doc: documentation(c), kind: 'text' };
          const e = enumKey(c, c.getAttribute('type'), kids(c, 'simpleType')[0], p);
          if (e) fields[p].enumOf = e;
          break;
        }
        case 'complexContent': case 'simpleContent': {
          const ext = kids(c, 'extension')[0] ?? kids(c, 'restriction')[0];
          if (!ext) break;
          const base = ext.getAttribute('base');
          const baseType = base && complex.get(qname(ext, base));
          if (baseType && c.localName === 'complexContent') walkContent(baseType, path, stack);
          walkContent(ext, path, stack);
          break;
        }
        default: break;
      }
    }
  };

  const walkElement = (el: Element, parent: string, stack: string[]): void => {
    const name = el.getAttribute('name') ?? '';
    const path = parent ? `${parent}/${name}` : name;
    const typeName = el.getAttribute('type');
    const inlineComplex = kids(el, 'complexType')[0];
    const inlineSimple = kids(el, 'simpleType')[0];
    const named = typeName ? complex.get(qname(el, typeName)) : undefined;
    const doc = documentation(el) || (named ? documentation(named) : '');
    if (inlineComplex || named) {
      if (fields[path] === undefined) fields[path] = { doc, kind: 'text' };
      const q = typeName ? qname(el, typeName) : '';
      if (q && stack.includes(q)) return; // a type that contains itself
      walkContent(inlineComplex ?? named!, path, q ? [...stack, q] : stack);
      return;
    }
    fields[path] = { doc, kind: kindOf(el, typeName, inlineSimple) };
    const e = enumKey(el, typeName, inlineSimple, path);
    if (e) fields[path].enumOf = e;
  };

  const root = kids(loadSchema(mainFile), 'element').find((e) => e.getAttribute('name') === 'Faktura');
  if (!root) throw new Error(`${mainFile}: no Faktura element`);
  walkContent(kids(root, 'complexType')[0], '', []);
  return { fields, enums };
}

function write(file: string, constName: string, namespace: string, source: string, data: ReturnType<typeof build>): void {
  const body = `// GENERATED by scripts/build-ksef-schema.mts from ${source} — do not edit by hand.
// Descriptions and code meanings are the Ministry of Finance's own text from the official schema.
import type { KsefSchema } from './schema-types';

export const ${constName}: KsefSchema = ${JSON.stringify({ namespace, fields: data.fields, enums: data.enums }, null, 1)};
`;
  writeFileSync(file, body);
  console.log(`${file}: ${Object.keys(data.fields).length} fields, ${Object.keys(data.enums).length} code lists`);
}

write('lib/ksef/schema-fa3.ts', 'FA3_SCHEMA', 'http://crd.gov.pl/wzor/2025/06/25/13775/', 'http://crd.gov.pl/wzor/2025/06/25/13775/schemat.xsd', build('FA3-schemat.xsd'));
write('lib/ksef/schema-fa2.ts', 'FA2_SCHEMA', 'http://crd.gov.pl/wzor/2023/06/29/12648/', 'http://crd.gov.pl/wzor/2023/06/29/12648/schemat.xsd', build('FA2-schemat.xsd'));
