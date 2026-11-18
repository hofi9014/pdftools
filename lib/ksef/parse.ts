// Reads a KSeF invoice XML file (structure FA(3), or the previous FA(2)) into a plain tree.
// Runs in the browser with the built-in DOMParser; nothing leaves the device.
//
// Every element with a value and every attribute becomes a "leaf". The preview marks each leaf it
// shows; whatever is left over is listed under "Pozostałe dane z pliku", so no value from the file
// is ever dropped silently.
import type { KsefSchema } from './schema-types';

export const FA3_NAMESPACE = 'http://crd.gov.pl/wzor/2025/06/25/13775/';
export const FA2_NAMESPACE = 'http://crd.gov.pl/wzor/2023/06/29/12648/';
const FA1_NAMESPACE = 'http://crd.gov.pl/wzor/2021/11/29/11089/';
const UPO_ROOTS = new Set(['Potwierdzenie', 'UPO']);

export type KsefVersion = 'FA(3)' | 'FA(2)';

export interface KsefNode {
  name: string;
  /** Path below the root element, e.g. "Fa/FaWiersz/P_7" (no indexes). */
  path: string;
  /** The element's own text, when it has no child elements. */
  value?: string;
  attrs: KsefLeaf[];
  children: KsefNode[];
  /** Set when the element has a value: the leaf that carries it. */
  leaf?: KsefLeaf;
}

export interface KsefLeaf {
  id: number;
  path: string;
  value: string;
}

export interface KsefInvoice {
  version: KsefVersion;
  root: KsefNode;
  leaves: KsefLeaf[];
  /** The KSeF number, only when the file name contains a valid one. */
  ksefNumber?: string;
}

export type KsefReadError =
  | { code: 'empty' }
  | { code: 'not-xml' }
  | { code: 'upo' }
  | { code: 'fa1' }
  | { code: 'unknown-version'; namespace: string }
  | { code: 'not-invoice'; root: string };

/** Values of the XSD types whose white space is collapsed (token); the rest keep their line breaks. */
const KEEP_LINE_BREAKS = new Set(['Stopka/Informacje/StopkaFaktury', 'Zalacznik/BlokDanych/Tekst/Akapit']);

function normalize(path: string, raw: string): string {
  if (KEEP_LINE_BREAKS.has(path)) {
    return raw.split(/\r?\n/).map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n');
  }
  return raw.replace(/\s+/g, ' ').trim();
}

/**
 * The KSeF number (e.g. 9999999999-20260714-D5FB0C9ED490-9A) from a file name, accepted only when
 * its checksum is right — CRC-8 (polynomial 0x07, initial value 0) of the first 32 characters,
 * as in the Ministry's own client (KSeFNumberValidator in CIRFMF/ksef-client-java).
 */
export function ksefNumberFromFileName(fileName: string): string | undefined {
  const m = /(\d{10}-\d{8}-[0-9A-F]{12}-[0-9A-F]{2})(?![0-9A-F])/i.exec(fileName);
  if (!m) return undefined;
  const candidate = m[1]!.toUpperCase();
  return ksefChecksum(candidate.slice(0, 32)) === candidate.slice(33) ? candidate : undefined;
}

export function ksefChecksum(data: string): string {
  let crc = 0;
  for (const byte of new TextEncoder().encode(data)) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
  }
  return crc.toString(16).toUpperCase().padStart(2, '0');
}

export function readKsefXml(text: string, fileName: string): { invoice: KsefInvoice } | { error: KsefReadError } {
  if (!text.trim()) return { error: { code: 'empty' } };
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(text.replace(/^﻿/, ''), 'application/xml');
  } catch {
    return { error: { code: 'not-xml' } }; // some parsers throw instead of returning <parsererror>
  }
  const root = doc.documentElement;
  // Browsers report a malformed file as a document whose root (or a child of it) is <parsererror>.
  if (!root || root.localName === 'parsererror' || doc.getElementsByTagName('parsererror').length > 0) return { error: { code: 'not-xml' } };
  const ns = root.namespaceURI ?? '';
  if (UPO_ROOTS.has(root.localName)) return { error: { code: 'upo' } };
  if (root.localName !== 'Faktura') return { error: { code: 'not-invoice', root: root.localName } };
  if (ns === FA1_NAMESPACE) return { error: { code: 'fa1' } };
  if (ns !== FA3_NAMESPACE && ns !== FA2_NAMESPACE) return { error: { code: 'unknown-version', namespace: ns } };

  const leaves: KsefLeaf[] = [];
  const addLeaf = (path: string, value: string): KsefLeaf => {
    const leaf = { id: leaves.length, path, value };
    leaves.push(leaf);
    return leaf;
  };
  const build = (el: Element, path: string): KsefNode => {
    const node: KsefNode = { name: el.localName, path, attrs: [], children: [] };
    for (let i = 0; i < el.attributes.length; i++) {
      const a = el.attributes[i]!;
      // Namespace declarations and xsi:* describe the file, not the invoice.
      if (a.name === 'xmlns' || a.name.startsWith('xmlns:') || a.namespaceURI === 'http://www.w3.org/2001/XMLSchema-instance') continue;
      node.attrs.push(addLeaf(`${path}/@${a.localName}`, normalize('', a.value)));
    }
    let hasChildElement = false;
    for (let c = el.firstChild; c; c = c.nextSibling) {
      if (c.nodeType !== 1) continue;
      hasChildElement = true;
      const child = c as Element;
      node.children.push(build(child, path ? `${path}/${child.localName}` : child.localName));
    }
    if (!hasChildElement) {
      const value = normalize(path, el.textContent ?? '');
      if (value) {
        node.value = value;
        node.leaf = addLeaf(path, value);
      }
    }
    return node;
  };

  const tree = build(root, '');
  return { invoice: { version: ns === FA3_NAMESPACE ? 'FA(3)' : 'FA(2)', root: tree, leaves, ksefNumber: ksefNumberFromFileName(fileName) } };
}

export type { KsefSchema };
