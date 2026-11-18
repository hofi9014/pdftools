/** What the invoice preview knows about one element or attribute of a KSeF invoice. */
export interface KsefField {
  /** The Ministry of Finance's description of the field (xsd:documentation). */
  doc: string;
  /** How the value is written: amounts and quantities are decimals, dates are ISO dates. */
  kind: 'amount' | 'quantity' | 'date' | 'datetime' | 'text';
  /** The code list the value comes from (a key of KsefSchema.enums). */
  enumOf?: string;
}

export interface KsefSchema {
  namespace: string;
  /** Keyed by the path below the root element, e.g. "Fa/FaWiersz/P_12" or "Naglowek/KodFormularza/@kodSystemowy". */
  fields: Record<string, KsefField>;
  /** Code list → code → its meaning. */
  enums: Record<string, Record<string, string>>;
}
