// How values from a KSeF invoice are written in the preview. Amounts keep every digit from the
// file (no floating-point arithmetic); only the separators change to the Polish convention.
import type { KsefSchema } from './schema-types';

const NBSP = ' ';

/** "27292.28" → "27 292,28" (non-breaking space between thousands). Anything else is returned as is. */
export function formatDecimal(raw: string): string {
  const m = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(raw.trim());
  if (!m) return raw;
  const int = m[2]!.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${m[1] === '-' ? '-' : ''}${int}${m[3] !== undefined ? `,${m[3]}` : ''}`;
}

/** "2025-10-31" → "31.10.2025". */
export function formatDate(raw: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  return m ? `${m[3]}.${m[2]}.${m[1]}` : raw;
}

/** "2026-03-22T03:27:54.0792168Z" → "22.03.2026, 03:27:54 UTC" — the time as written, never converted. */
export function formatDateTime(raw: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.exec(raw.trim());
  if (!m) return raw;
  const zone = m[7] === 'Z' ? ' UTC' : m[7] ? ` (UTC${m[7]})` : '';
  return `${m[3]}.${m[2]}.${m[1]}, ${m[4]}:${m[5]}${m[6] ? `:${m[6]}` : ''}${zone}`;
}

/** A Polish 26-digit account number in groups ("73 1111 1111 …"), an IBAN in groups of four. */
export function formatAccount(raw: string): string {
  const v = raw.replace(/\s+/g, '');
  if (/^\d{26}$/.test(v)) return `${v.slice(0, 2)} ${v.slice(2).replace(/(\d{4})(?=\d)/g, '$1 ')}`;
  if (/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(v)) return v.replace(/(.{4})(?=.)/g, '$1 ');
  return raw;
}

/** The first clause of a long description, cut at a word boundary. */
export function shortDoc(doc: string, max = 90): string {
  const d = doc.trim();
  if (d.length <= max) return d;
  const cut = d.slice(0, max);
  for (const sep of [' - ', '. ', '; ', ', ']) {
    const i = cut.indexOf(sep);
    if (i >= 20) return d.slice(0, i);
  }
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

// Fields with two values whose meaning is "1 = yes, 2 = no" according to their description in
// the schema ("należy podać wartość 1, w przeciwnym przypadku - wartość 2").
const YES_NO_12 = /\/(P_16|P_17|P_18|P_18A|P_23|P_42_5|JST|GV)$/;

/** A value as the preview shows it, decided by the field's type and code list in the schema. */
export function formatValue(schema: KsefSchema, path: string, value: string): string {
  const field = schema.fields[path];
  if (!field) return value;
  if (path.endsWith('/NrRB')) return formatAccount(value);
  if (field.kind === 'amount' || field.kind === 'quantity') return formatDecimal(value);
  if (field.kind === 'date') return formatDate(value);
  if (field.kind === 'datetime') return formatDateTime(value);
  if (!field.enumOf) return value;
  const list = field.enumOf;
  if (list === 'TWybor1') return value === '1' ? 'tak' : value;
  if (path.endsWith('/ZnacznikZaplatyCzesciowej')) return value === '1' ? 'zapłacono w części' : value === '2' ? 'zapłacono w całości' : value;
  if (YES_NO_12.test(`/${path}`)) return value === '1' ? 'tak' : value === '2' ? 'nie' : value;
  if (list === 'TStawkaPodatku' && /^\d+$/.test(value)) return `${value}%`;
  if (list === 'TKodWaluty') return value;
  const doc = schema.enums[list]?.[value] ?? '';
  if (!doc) return value;
  if (/^\d+$/.test(value)) return doc;
  return doc.length <= 120 ? `${value} – ${doc}` : value;
}
