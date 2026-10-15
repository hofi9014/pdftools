// The privacy policy, the GDPR information and the security page, one file per language
// (lib/legal/<locale>.ts). They used to live inline in each page, written once and not kept up
// with the code: they promised server-side RAM processing, magic-byte checks and anti-CSRF tokens
// that did not exist, an OpenRouter key kept in localStorage that the AI tools never used, and
// said no data left the EEA while the server runs in the USA. Every statement here must match
// the code and the hosting as they are; tests/legal-texts-accuracy.mts checks the facts that can
// drift (limits, retention, recipients, the data policy of the AI requests).

export interface LegalSub {
  h: string;
  p: string;
  items?: string[];
}

export interface LegalSection {
  h: string;
  p?: string;
  items?: string[];
  sub?: LegalSub[];
}

export interface LegalDoc {
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
}

export interface LegalTexts {
  privacy: LegalDoc;
  rodo: LegalDoc;
  security: LegalDoc;
  /** Two paragraphs of the "Our principles" page that describe security and tracking. */
  principles: { security: string; tracking: string };
}
