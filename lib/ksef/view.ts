// Turns a parsed KSeF invoice into the blocks the preview and the PDF show.
//
// Each section reads the values it presents and marks them as shown. A section then lists every
// other value in its part of the file under its own labels, and whatever still has not been shown
// anywhere ends up in "Pozostałe dane z pliku". So the preview always contains every value from
// the file — tests/ksef-xml-to-pdf.mts checks it on every sample.
import type { KsefInvoice, KsefLeaf, KsefNode } from './parse';
import type { KsefSchema } from './schema-types';
import { FA3_SCHEMA } from './schema-fa3';
import { FA2_SCHEMA } from './schema-fa2';
import { formatDecimal, formatValue } from './format';
import { labelFor } from './labels';

export interface ViewRow { label: string; value: string }
export interface ViewColumn { label: string; width: number; align?: 'right' }
export type TableBlock = { t: 'table'; columns: ViewColumn[]; rows: string[][]; caption?: string };
export type ViewBlock =
  | { t: 'heading'; text: string }
  | { t: 'rows'; rows: ViewRow[] }
  | TableBlock
  | { t: 'total'; label: string; value: string };

export interface InvoiceView {
  title: string;
  number?: string;
  ksefNumber?: string;
  version: string;
  currency: string;
  blocks: ViewBlock[];
  /** Ids of the leaves the view shows (all of them, by construction). */
  shown: Set<number>;
}

export const KSEF_NOTICE = 'Podgląd/wizualizacja faktury. Dokumentem księgowym jest plik XML w KSeF. Plik nie opuszcza Twojego komputera.';

const TITLES: Record<string, string> = {
  VAT: 'Faktura VAT',
  KOR: 'Faktura korygująca',
  ZAL: 'Faktura zaliczkowa',
  ROZ: 'Faktura rozliczeniowa',
  UPR: 'Faktura uproszczona',
  KOR_ZAL: 'Faktura korygująca fakturę zaliczkową',
  KOR_ROZ: 'Faktura korygująca fakturę rozliczeniową',
};

// The VAT summary: which totals belong together, and how the schema describes the rate.
const VAT_GROUPS: { net: string; vat?: string; vatPln?: string; label: string }[] = [
  { net: 'P_13_1', vat: 'P_14_1', vatPln: 'P_14_1W', label: 'Stawka podstawowa (23% albo 22%)' },
  { net: 'P_13_2', vat: 'P_14_2', vatPln: 'P_14_2W', label: 'Stawka obniżona pierwsza (8% albo 7%)' },
  { net: 'P_13_3', vat: 'P_14_3', vatPln: 'P_14_3W', label: 'Stawka obniżona druga (5%)' },
  { net: 'P_13_4', vat: 'P_14_4', vatPln: 'P_14_4W', label: 'Ryczałt dla taksówek osobowych' },
  { net: 'P_13_5', vat: 'P_14_5', label: 'Procedura szczególna z działu XII rozdziału 6a ustawy' },
  { net: 'P_13_6_1', label: '0% (sprzedaż krajowa)' },
  { net: 'P_13_6_2', label: '0% (wewnątrzwspólnotowa dostawa towarów)' },
  { net: 'P_13_6_3', label: '0% (eksport)' },
  { net: 'P_13_7', label: 'Zwolnione od podatku' },
  { net: 'P_13_8', label: 'Dostawa towarów i usługi poza terytorium kraju' },
  { net: 'P_13_9', label: 'Usługi z art. 100 ust. 1 pkt 4 ustawy' },
  { net: 'P_13_10', label: 'Odwrotne obciążenie' },
  { net: 'P_13_11', label: 'Procedura marży' },
];

// Groups whose fields would be ambiguous on their own ("Adres" of whom?).
const GROUPS: Record<string, string> = {
  AdresKoresp: 'Adres korespondencyjny',
  Przewoznik: 'Przewoźnik',
  AdresPrzewoznika: 'Adres przewoźnika',
  WysylkaZ: 'Miejsce wysyłki',
  WysylkaPrzez: 'Wysyłka przez',
  WysylkaDo: 'Miejsce docelowe',
  RachunekBankowyFaktora: 'Rachunek faktora',
  NowySrodekTransportu: 'Nowy środek transportu',
  ZaplataCzesciowa: 'Zapłata częściowa',
  Skonto: 'Skonto',
};

class Builder {
  readonly shown = new Set<number>();
  readonly blocks: ViewBlock[] = [];
  constructor(readonly schema: KsefSchema) {}

  label(path: string): string { return labelFor(this.schema, path); }

  /** The formatted value of a leaf node, marking it shown. */
  take(node: KsefNode | undefined): string | undefined {
    if (!node?.leaf) return undefined;
    this.shown.add(node.leaf.id);
    return formatValue(this.schema, node.path, node.leaf.value);
  }

  takeLeaf(leaf: KsefLeaf): string {
    this.shown.add(leaf.id);
    return formatValue(this.schema, leaf.path, leaf.value);
  }

  /** Every value under `node` not shown yet, as label/value rows, in file order. Values inside a
   *  named group (the carrier, a shipping address…) say which group they belong to. */
  rest(node: KsefNode | undefined, rows: ViewRow[] = [], prefix = ''): ViewRow[] {
    if (!node) return rows;
    const lbl = (path: string) => `${prefix}${this.label(path)}`;
    for (const a of node.attrs) if (!this.shown.has(a.id)) rows.push({ label: lbl(a.path), value: this.takeLeaf(a) });
    if (node.leaf && !this.shown.has(node.leaf.id)) rows.push({ label: lbl(node.path), value: this.takeLeaf(node.leaf) });
    for (const c of node.children) this.rest(c, rows, GROUPS[c.name] ? `${GROUPS[c.name]} – ` : prefix);
    return rows;
  }

  /** The same as rest(), as "label: value" lines for a table cell. */
  restLines(node: KsefNode | undefined): string[] {
    return this.rest(node).map((r) => `${r.label}: ${r.value}`);
  }

  heading(text: string): void { this.blocks.push({ t: 'heading', text }); }
  rows(rows: ViewRow[]): void { if (rows.length) this.blocks.push({ t: 'rows', rows }); }
}

const kid = (n: KsefNode | undefined, name: string): KsefNode | undefined => n?.children.find((c) => c.name === name);
const kids = (n: KsefNode | undefined, name: string): KsefNode[] => n?.children.filter((c) => c.name === name) ?? [];
const raw = (n: KsefNode | undefined, name: string): string | undefined => kid(n, name)?.value;

/** A party (seller, buyer, third party…) as the lines of one table cell. */
function partyLines(b: Builder, p: KsefNode): string[] {
  const lines: string[] = [];
  const id = kid(p, 'DaneIdentyfikacyjne');
  const name = b.take(kid(id, 'Nazwa'));
  if (name) lines.push(name);
  const nip = b.take(kid(id, 'NIP'));
  if (nip) lines.push(`NIP: ${nip}`);
  const ue = kid(id, 'KodUE');
  const vatUe = kid(id, 'NrVatUE');
  if (ue?.leaf && vatUe?.leaf) {
    b.shown.add(ue.leaf.id);
    lines.push(`Numer VAT UE: ${ue.leaf.value}${b.take(vatUe)}`);
  }
  const country = kid(id, 'KodKraju');
  const otherId = kid(id, 'NrID');
  if (country?.leaf && otherId?.leaf) {
    b.shown.add(country.leaf.id);
    lines.push(`Identyfikator podatkowy: ${country.leaf.value} ${b.take(otherId)}`);
  }
  for (const [tag, title] of [['Adres', ''], ['AdresKoresp', 'Adres korespondencyjny: '], ['AdresPrzewoznika', '']] as const) {
    const a = kid(p, tag);
    if (!a) continue;
    const l1 = b.take(kid(a, 'AdresL1'));
    const l2 = b.take(kid(a, 'AdresL2'));
    const cc = kid(a, 'KodKraju');
    if (cc?.leaf) b.shown.add(cc.leaf.id);
    const where = [l1, l2].filter(Boolean).join(', ');
    lines.push(`${title}${where}${cc?.leaf ? `${where ? ', ' : ''}${cc.leaf.value}` : ''}`);
  }
  for (const c of kids(p, 'DaneKontaktowe')) {
    const mail = b.take(kid(c, 'Email') ?? kid(c, 'EmailPU'));
    const tel = b.take(kid(c, 'Telefon') ?? kid(c, 'TelefonPU'));
    if (mail) lines.push(`E-mail: ${mail}`);
    if (tel) lines.push(`Telefon: ${tel}`);
  }
  return [...lines, ...b.restLines(p)];
}

function partyTitle(b: Builder, p: KsefNode, fallback: string): string {
  const role = kid(p, 'Rola') ?? kid(p, 'RolaPU');
  if (role?.leaf) {
    b.shown.add(role.leaf.id);
    const doc = b.schema.enums[b.schema.fields[role.path]?.enumOf ?? '']?.[role.leaf.value];
    return doc ? doc.split(' - ')[0]!.trim() : `${fallback} (rola ${role.leaf.value})`;
  }
  if (kid(p, 'RolaInna')?.leaf) {
    b.shown.add(kid(p, 'RolaInna')!.leaf!.id);
    const desc = b.take(kid(p, 'OpisRoli'));
    return desc ? `Inny podmiot: ${desc}` : 'Inny podmiot';
  }
  return fallback;
}

/** A table of repeated rows (invoice lines, order lines): one column per field present in any row. */
function lineTable(b: Builder, rows: KsefNode[], columns: { name: string; width: number; align?: 'right' }[], nameField: string): TableBlock | undefined {
  if (!rows.length) return undefined;
  const present = columns.filter((c) => c.name === nameField || rows.some((r) => kid(r, c.name)?.leaf));
  const total = present.reduce((s, c) => s + c.width, 0);
  const cols: ViewColumn[] = present.map((c) => ({ label: b.label(`${rows[0]!.path}/${c.name}`), width: c.width / total, align: c.align }));
  const body = rows.map((r) => {
    // The columns first; then every other value of the line (index, GTU, procedure, "state
    // before correction"…) goes under the name, so a line is complete in its own row.
    const cells = present.map((c) => (c.name === nameField ? '' : b.take(kid(r, c.name)) ?? ''));
    const nameAt = present.findIndex((c) => c.name === nameField);
    const name = b.take(kid(r, nameField)) ?? '';
    cells[nameAt] = [name, ...b.restLines(r)].filter(Boolean).join('\n');
    return cells;
  });
  return { t: 'table', columns: cols, rows: body };
}

export function buildInvoiceView(inv: KsefInvoice): InvoiceView {
  const schema = inv.version === 'FA(3)' ? FA3_SCHEMA : FA2_SCHEMA;
  const b = new Builder(schema);
  const root = inv.root;
  const fa = kid(root, 'Fa');
  const kind = raw(fa, 'RodzajFaktury') ?? '';
  const currency = raw(fa, 'KodWaluty') ?? '';
  const number = raw(fa, 'P_2');
  const title = TITLES[kind] ?? 'Faktura';

  // ── Basic data ───────────────────────────────────────────────────────────────────────────
  const basic: ViewRow[] = [];
  const add = (path: string) => {
    const node = path.split('/').reduce<KsefNode | undefined>((n, part) => kid(n, part), root);
    const v = b.take(node);
    if (v !== undefined) basic.push({ label: b.label(path), value: v });
  };
  if (inv.ksefNumber) basic.push({ label: 'Numer KSeF (z nazwy pliku)', value: inv.ksefNumber });
  ['Fa/P_2', 'Fa/RodzajFaktury', 'Fa/P_1', 'Fa/P_1M', 'Fa/P_6', 'Fa/OkresFa/P_6_Od', 'Fa/OkresFa/P_6_Do', 'Fa/KodWaluty'].forEach(add);
  for (const wz of kids(fa, 'WZ')) basic.push({ label: b.label(wz.path), value: b.take(wz)! });
  b.heading('Dane faktury');
  b.rows(basic);

  // ── Parties ──────────────────────────────────────────────────────────────────────────────
  const seller = kid(root, 'Podmiot1');
  const buyer = kid(root, 'Podmiot2');
  if (seller || buyer) {
    b.heading('Sprzedawca i nabywca');
    b.blocks.push({
      t: 'table',
      columns: [{ label: 'Sprzedawca', width: 0.5 }, { label: 'Nabywca', width: 0.5 }],
      rows: [[seller ? partyLines(b, seller).join('\n') : '', buyer ? partyLines(b, buyer).join('\n') : '']],
    });
  }
  const others: { title: string; lines: string[] }[] = [];
  for (const p of kids(root, 'Podmiot3')) others.push({ title: partyTitle(b, p, 'Podmiot trzeci'), lines: partyLines(b, p) });
  for (const p of kids(root, 'PodmiotUpowazniony')) others.push({ title: partyTitle(b, p, 'Podmiot upoważniony'), lines: partyLines(b, p) });
  if (others.length) {
    b.heading('Inne podmioty');
    b.blocks.push({ t: 'table', columns: [{ label: 'Podmiot', width: 0.3 }, { label: 'Dane', width: 0.7 }], rows: others.map((o) => [o.title, o.lines.join('\n')]) });
  }

  // ── Correction ───────────────────────────────────────────────────────────────────────────
  const correction: ViewRow[] = [];
  for (const name of ['PrzyczynaKorekty', 'TypKorekty', 'DaneFaKorygowanej', 'OkresFaKorygowanej', 'NrFaKorygowany', 'P_15ZK', 'KursWalutyZK']) {
    for (const n of kids(fa, name)) b.rest(n, correction);
  }
  const corrected = [...kids(fa, 'Podmiot1K').map((p) => ['Sprzedawca na fakturze korygowanej', p] as const), ...kids(fa, 'Podmiot2K').map((p) => ['Nabywca na fakturze korygowanej', p] as const)];
  if (correction.length || corrected.length) {
    b.heading('Dane korekty');
    b.rows(correction);
    if (corrected.length) b.blocks.push({ t: 'table', columns: [{ label: 'Podmiot', width: 0.3 }, { label: 'Dane', width: 0.7 }], rows: corrected.map(([t, p]) => [t, partyLines(b, p).join('\n')]) });
  }

  // ── Lines ────────────────────────────────────────────────────────────────────────────────
  const lines = lineTable(b, kids(fa, 'FaWiersz'), [
    { name: 'NrWierszaFa', width: 5, align: 'right' },
    { name: 'P_7', width: 29 },
    { name: 'P_8A', width: 7 },
    { name: 'P_8B', width: 8, align: 'right' },
    { name: 'P_9A', width: 11, align: 'right' },
    { name: 'P_9B', width: 11, align: 'right' },
    { name: 'P_10', width: 9, align: 'right' },
    { name: 'P_11', width: 12, align: 'right' },
    { name: 'P_11A', width: 12, align: 'right' },
    { name: 'P_11Vat', width: 10, align: 'right' },
    { name: 'P_12', width: 12, align: 'right' },
  ], 'P_7');
  if (lines) {
    b.heading(`Pozycje faktury${currency ? ` (kwoty w ${currency})` : ''}`);
    b.blocks.push(lines);
  }

  // ── Advance payments, orders ─────────────────────────────────────────────────────────────
  const partial = kids(fa, 'ZaliczkaCzesciowa');
  const advances = kids(fa, 'FakturaZaliczkowa');
  const order = kid(fa, 'Zamowienie');
  if (partial.length || advances.length || order) {
    b.heading('Zaliczki i zamówienie');
    if (partial.length) {
      const t = lineTable(b, partial, [{ name: 'P_6Z', width: 30 }, { name: 'P_15Z', width: 35, align: 'right' }, { name: 'KursWalutyZW', width: 35, align: 'right' }], 'P_6Z');
      if (t) b.blocks.push({ ...t, caption: 'Otrzymane płatności' });
    }
    const adv: ViewRow[] = [];
    for (const a of advances) b.rest(a, adv);
    b.rows(adv);
    if (order) {
      const t = lineTable(b, kids(order, 'ZamowienieWiersz'), [
        { name: 'NrWierszaZam', width: 6, align: 'right' },
        { name: 'P_7Z', width: 34 },
        { name: 'P_8AZ', width: 8 },
        { name: 'P_8BZ', width: 9, align: 'right' },
        { name: 'P_9AZ', width: 12, align: 'right' },
        { name: 'P_11NettoZ', width: 13, align: 'right' },
        { name: 'P_11VatZ', width: 10, align: 'right' },
        { name: 'P_12Z', width: 8, align: 'right' },
      ], 'P_7Z');
      if (t) b.blocks.push({ ...t, caption: 'Pozycje zamówienia lub umowy' });
      b.rows(b.rest(order));
    }
  }

  // ── VAT summary and total ───────────────────────────────────────────────────────────────
  const vatRows = VAT_GROUPS.filter((g) => kid(fa, g.net)?.leaf || (g.vat && kid(fa, g.vat)?.leaf));
  const hasPln = vatRows.some((g) => g.vatPln && kid(fa, g.vatPln)?.leaf);
  if (vatRows.length) {
    b.heading('Podsumowanie według stawek VAT');
    const columns: ViewColumn[] = [{ label: 'Stawka', width: hasPln ? 0.4 : 0.5 }, { label: 'Wartość netto', width: hasPln ? 0.2 : 0.25, align: 'right' }, { label: 'Kwota VAT', width: hasPln ? 0.2 : 0.25, align: 'right' }];
    if (hasPln) columns.push({ label: 'Kwota VAT w PLN', width: 0.2, align: 'right' });
    b.blocks.push({
      t: 'table',
      columns,
      rows: vatRows.map((g) => {
        const r = [g.label, b.take(kid(fa, g.net)) ?? '', g.vat ? b.take(kid(fa, g.vat)) ?? '' : ''];
        if (hasPln) r.push(g.vatPln ? b.take(kid(fa, g.vatPln)) ?? '' : '');
        return r;
      }),
    });
  }
  const total = b.take(kid(fa, 'P_15'));
  if (total !== undefined) b.blocks.push({ t: 'total', label: b.label('Fa/P_15'), value: `${total}${currency ? ` ${currency}` : ''}` });
  const rate = b.take(kid(fa, 'KursWalutyZ'));
  if (rate !== undefined) b.rows([{ label: b.label('Fa/KursWalutyZ'), value: rate }]);

  // ── Annotations ─────────────────────────────────────────────────────────────────────────
  const notes = kid(fa, 'Adnotacje');
  if (notes) {
    b.heading('Adnotacje');
    const rows: ViewRow[] = [];
    for (const c of notes.children) {
      // P_19N, P_22N and P_PMarzyN mean "this does not apply": shown as "nie" next to the
      // label of what does not apply.
      const no = c.children.find((x) => /^(P_19N|P_22N|P_PMarzyN)$/.test(x.name) && x.leaf);
      if (no) {
        b.shown.add(no.leaf!.id);
        rows.push({ label: b.label(no.path), value: 'nie' });
      }
      b.rest(c, rows);
    }
    b.rows(rows);
  }

  // ── Additional description ──────────────────────────────────────────────────────────────
  const extra = kids(fa, 'DodatkowyOpis');
  if (extra.length) {
    b.heading('Dodatkowy opis');
    b.rows(extra.map((d) => {
      const line = b.take(kid(d, 'NrWiersza'));
      const key = b.take(kid(d, 'Klucz')) ?? '';
      const value = b.take(kid(d, 'Wartosc')) ?? '';
      const more = b.restLines(d);
      return { label: line ? `${key} (wiersz ${line})` : key, value: [value, ...more].join('\n') };
    }));
  }

  // ── Settlement, payment, terms ──────────────────────────────────────────────────────────
  for (const [tag, heading] of [['Rozliczenie', 'Rozliczenie'], ['Platnosc', 'Płatność'], ['WarunkiTransakcji', 'Warunki transakcji']] as const) {
    const n = kid(fa, tag);
    if (!n) continue;
    b.heading(heading);
    b.rows(b.rest(n));
  }

  // ── Anything else in Fa (FP, TP, ZwrotAkcyzy, future fields) ────────────────────────────
  const restFa = b.rest(fa);
  if (restFa.length) {
    b.heading('Inne dane faktury');
    b.rows(restFa);
  }

  // ── Footer and attachment ───────────────────────────────────────────────────────────────
  const footer = kid(root, 'Stopka');
  if (footer) {
    b.heading('Stopka faktury');
    b.rows(b.rest(footer));
  }
  const att = kid(root, 'Zalacznik');
  if (att) {
    b.heading('Załącznik do faktury');
    for (const block of kids(att, 'BlokDanych')) attachmentBlock(b, block);
    b.rows(b.rest(att));
  }

  // ── File header ─────────────────────────────────────────────────────────────────────────
  const header = kid(root, 'Naglowek');
  if (header) {
    b.heading('Dane techniczne pliku');
    b.rows(b.rest(header));
  }

  // ── Safety net: anything not shown by any section ───────────────────────────────────────
  const left = inv.leaves.filter((l) => !b.shown.has(l.id));
  if (left.length) {
    b.heading('Pozostałe dane z pliku');
    b.rows(left.map((l) => ({ label: `${b.label(l.path)} (${l.path})`, value: b.takeLeaf(l) })));
  }

  return { title, number, ksefNumber: inv.ksefNumber, version: inv.version, currency, blocks: b.blocks, shown: b.shown };
}

function attachmentBlock(b: Builder, block: KsefNode): void {
  const title = b.take(kid(block, 'ZNaglowek'));
  if (title) b.blocks.push({ t: 'heading', text: title });
  const meta = kids(block, 'MetaDane');
  if (meta.length) b.rows(meta.map((m) => ({ label: b.take(kid(m, 'ZKlucz')) ?? '', value: [b.take(kid(m, 'ZWartosc')) ?? '', ...b.restLines(m)].join('\n') })));
  for (const text of kids(block, 'Tekst')) {
    const paragraphs = kids(text, 'Akapit').map((a) => b.take(a) ?? '');
    if (paragraphs.length) b.rows([{ label: 'Tekst', value: paragraphs.join('\n') }]);
  }
  for (const table of kids(block, 'Tabela')) {
    const tMeta = kids(table, 'TMetaDane');
    if (tMeta.length) b.rows(tMeta.map((m) => ({ label: b.take(kid(m, 'TKlucz')) ?? '', value: b.take(kid(m, 'TWartosc')) ?? '' })));
    const caption = b.take(kid(table, 'Opis'));
    const head = kid(table, 'TNaglowek');
    const cols = kids(head, 'Kol');
    const types = cols.map((c) => c.attrs.find((a) => a.path.endsWith('/@Typ')));
    const numeric = types.map((type) => (type ? /^(dec|int)$/.test(type.value) : false));
    const headers = cols.map((c) => b.take(kid(c, 'NKom')) ?? '');
    const width = cols.length ? 1 / cols.length : 1;
    // Cells of a column typed "dec" or "int" are numbers: written with the Polish separators.
    const cell = (k: KsefNode, i: number) => {
      const v = b.take(k) ?? '';
      return numeric[i] ? formatDecimal(v) : v;
    };
    const body = kids(table, 'Wiersz').map((w) => kids(w, 'WKom').map(cell));
    const sum = kid(table, 'Suma');
    if (sum) body.push(kids(sum, 'SKom').map(cell));
    if (headers.length) b.blocks.push({ t: 'table', caption, columns: headers.map((h, i) => ({ label: h, width, align: numeric[i] ? 'right' : undefined })), rows: body });
    // The data type the file gives each column (txt, date, dec…) is data too: listed under the table.
    const typed = types.flatMap((type, i) => (type ? [`${headers[i] || `kolumna ${i + 1}`}: ${b.takeLeaf(type)}`] : []));
    if (typed.length) b.rows([{ label: 'Typy danych w kolumnach', value: typed.join('; ') }]);
    b.rows(b.rest(table));
  }
  b.rows(b.rest(block));
}

