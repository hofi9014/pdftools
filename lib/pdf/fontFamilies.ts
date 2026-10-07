// Which font family a piece of text taken from a PDF is written in.
//
// A PDF names its fonts by resource ("PSWIZS+Gotham-Black", "SourceSans3-Regular"); most of them
// are not installed on the reader's computer. What a word processor does with a family it does
// not have (measured in Apache OpenOffice 4 with a made-up family name, reading the font of the
// PDF it exports):
//   - in a .docx it uses Times New Roman, whatever the font table says (w:altName, w:family and
//     w:panose1 were all tried) — sans-serif text turns serif;
//   - in an .odt it follows the font-face declaration: a list in svg:font-family
//     ("'Gotham', Arial") gives the next family of the list, and style:font-family-generic
//     gives a serif ("roman") or a fixed-pitch ("modern") face.
// So a .docx names a family every system has (the PDF's own if it is one of those, else the
// standard face of its class), and an .odt keeps the PDF's family and declares what to use
// instead.

export type FontClass = 'sans' | 'serif' | 'mono';

/**
 * Turns a PDF font resource name into a family name Word can resolve. PDFs carry subset tags
 * ("PSWIZS+Gotham-Book"), style/weight suffixes ("-Bold", "-Black"), PostScript suffixes
 * ("ArialMT", "TimesNewRomanPSMT") and generator-added numeric suffixes ("LiberationSans-2867"):
 * none of those are installed font names, so Word substituted a default face for every run.
 * Bold/italic are carried by their own run flags, so the style words are dropped here.
 */
const FONT_FAMILY_MAP: Record<string, string> = {
  arial: 'Arial', arialmt: 'Arial', helvetica: 'Arial', liberationsans: 'Arial', arimo: 'Arial',
  timesnewroman: 'Times New Roman', timesnewromanps: 'Times New Roman', timesnewromanpsmt: 'Times New Roman',
  times: 'Times New Roman', timesroman: 'Times New Roman', liberationserif: 'Times New Roman', tinos: 'Times New Roman',
  couriernew: 'Courier New', couriernewps: 'Courier New', courier: 'Courier New', liberationmono: 'Courier New', cousine: 'Courier New',
  carlito: 'Calibri', calibri: 'Calibri', caladea: 'Cambria', cambria: 'Cambria',
  symbol: 'Symbol', zapfdingbats: 'Wingdings',
};

export function docxFontFamily(raw: string): string | undefined {
  if (!raw) return undefined;
  let n = raw.replace(/^[A-Z]{6}\+/, '');
  n = n.replace(/[-_ ]?\d{2,}$/, '');
  const styleWords = /(?:[-,_ ]|(?<=[a-z]))(?:BoldItalic|BoldOblique|Bold|Italic|Oblique|Regular|Book|Medium|Light|Black|Heavy|Semibold|DemiBold|Demi|Thin|Ultra|ExtraBold|MT|PSMT|PS)+$/;
  for (let i = 0; i < 3; i++) { const m = n.replace(styleWords, ''); if (m === n || !m) break; n = m; }
  const key = n.toLowerCase().replace(/[^a-z]/g, '');
  const mapped = FONT_FAMILY_MAP[key];
  if (mapped) return mapped;
  const spaced = n.replace(/[-_]/g, ' ').replace(/(?<=[a-z])(?=[A-Z])/g, ' ').trim();
  return spaced || undefined;
}

/** Families that are safe to name in a document: present on Windows, macOS and (as twins) Linux. */
const SYSTEM_FAMILIES: Record<string, string> = {
  'arial': 'Arial', 'times new roman': 'Times New Roman', 'courier new': 'Courier New',
  'verdana': 'Verdana', 'georgia': 'Georgia', 'tahoma': 'Tahoma', 'trebuchet ms': 'Trebuchet MS',
  // (Verdana, Tahoma, Trebuchet, Calibri and Cambria have no metric twin among this site's
  // fonts, so the faithful layout writes their text at its natural width — see METRIC_SOURCE.)
  'calibri': 'Calibri', 'cambria': 'Cambria', 'symbol': 'Symbol', 'wingdings': 'Wingdings',
};

const MONO_NAMES = /mono|courier|consol|menlo|typewriter|inconsolata|\bcode\b/i;
const SERIF_NAMES = /times|georgia|garamond|minion|palatino|bookman|cambria|merriweather|playfair|baskerville|caslon|didot|bodoni|century|charter|tinos|antiqua|roman|lora|crimson|cormorant|spectral|slab|\bserif\b|serif$/i;
const SANS_NAMES = /sans|grotesk|grotesque|gothic|helvet|arial|arimo|roboto|lato|inter\b|montserrat|poppins|nunito|ubuntu|gotham|futura|avenir|\bdin\b|frutiger|univers|myriad|verdana|tahoma|calibri|carlito|segoe|raleway|oswald|barlow|rubik|manrope|quicksand|proxima/i;

/** Sans, serif or monospace — from the font's name, else from the PDF's own descriptor flags. */
export function classifyFont(rawName: string, hint?: FontClass): FontClass {
  const name = rawName.replace(/^[A-Z]{6}\+/, '');
  if (MONO_NAMES.test(name)) return 'mono';
  if (SANS_NAMES.test(name)) return 'sans';
  if (SERIF_NAMES.test(name)) return 'serif';
  return hint ?? 'sans';
}

const CLASS_FAMILY: Record<FontClass, string> = { sans: 'Arial', serif: 'Times New Roman', mono: 'Courier New' };

/** The family a run is written in: the PDF's own when every system has it, else its class's standard. */
export function fixedFontFamily(rawName: string, hint?: FontClass): string {
  const cleaned = (docxFontFamily(rawName) ?? '').toLowerCase();
  const system = SYSTEM_FAMILIES[cleaned];
  if (system) return system;
  return CLASS_FAMILY[classifyFont(rawName, hint)];
}

/** True for a family every system has (it needs no stand-in). */
export function isSystemFamily(family: string): boolean {
  return SYSTEM_FAMILIES[family.trim().toLowerCase()] !== undefined;
}

const ODF_GENERIC: Record<FontClass, string> = { sans: 'swiss', serif: 'roman', mono: 'modern' };
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const quoted = (family: string): string => (/[^A-Za-z0-9-]/.test(family) ? `'${family.replace(/'/g, '')}'` : family);

/**
 * The <style:font-face> declaration of a family written to an .odt. A family every system has is
 * declared as it is; any other keeps its name (a reader who has the font sees it) and gets the
 * standard face of its class as the next family of the list, and the class as the generic family.
 */
export function odfFontFace(family: string, cls: FontClass): string {
  if (isSystemFamily(family)) return `<style:font-face style:name="${esc(family)}" svg:font-family="${esc(quoted(family))}"/>`;
  return `<style:font-face style:name="${esc(family)}" svg:font-family="${esc(`${quoted(family)}, ${quoted(CLASS_FAMILY[cls])}`)}" style:font-family-generic="${ODF_GENERIC[cls]}" style:font-pitch="${cls === 'mono' ? 'fixed' : 'variable'}"/>`;
}
