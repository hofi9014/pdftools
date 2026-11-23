// "Make PDF fillable" (plan 2.2, 2026-11-23): adds AcroForm fields to an existing PDF, where the
// user drew them on the page preview. Pure pdf-lib, no DOM: runs in the browser and in Node tests.
//
// Positions arrive as the user saw them: fractions of the page preview, origin top-left, y down —
// the preview is pdf.js's viewport, which shows the crop box turned by /Rotate. They are turned
// back into the page's own coordinates here, and the field's appearance is turned with the page
// (/MK /R) so a typed value reads upright on a rotated page.
import { PDFDocument, PDFName, PDFHexString, PDFString, PDFArray, PDFDict, rgb, degrees, type PDFPage, type PDFFont, type PDFField, type PDFTextField, type PDFDropdown } from 'pdf-lib';

export type FieldKind = 'text' | 'multiline' | 'checkbox' | 'dropdown' | 'signature';

export interface FieldSpec {
  kind: FieldKind;
  /** 0-based page index. */
  page: number;
  /** Fractions of the page as displayed (0..1), top-left origin. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Field name shown to people filling the form and used by programs reading it. */
  name: string;
  /** Choices of a dropdown, in order. */
  options?: string[];
  required?: boolean;
}

export interface Rect { x: number; y: number; width: number; height: number }

/** The page's rotation, 0/90/180/270. */
function pageRotation(page: PDFPage): number {
  return ((page.getRotation().angle % 360) + 360) % 360;
}

/**
 * Turns a rectangle drawn on the page as displayed (fractions, top-left origin) into the page's
 * own coordinates (points, bottom-left origin, before /Rotate), inside the crop box.
 */
export function displayRectToPage(page: PDFPage, r: Pick<FieldSpec, 'x' | 'y' | 'width' | 'height'>): Rect {
  const crop = page.getCropBox();
  const rot = pageRotation(page);
  const vw = rot % 180 === 0 ? crop.width : crop.height;
  const vh = rot % 180 === 0 ? crop.height : crop.width;
  const x0 = crop.x, y0 = crop.y, x1 = crop.x + crop.width, y1 = crop.y + crop.height;
  const toPage = (vx: number, vy: number) => {
    if (rot === 90) return { x: x0 + vy, y: y0 + vx };
    if (rot === 180) return { x: x1 - vx, y: y0 + vy };
    if (rot === 270) return { x: x1 - vy, y: y1 - vx };
    return { x: x0 + vx, y: y1 - vy };
  };
  const a = toPage(r.x * vw, r.y * vh);
  const b = toPage((r.x + r.width) * vw, (r.y + r.height) * vh);
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) };
}

/** Every field name already in the document (a new field must not repeat one). */
export function existingFieldNames(pdf: PDFDocument): Set<string> {
  return new Set(pdf.getForm().getFields().map((f) => f.getName()));
}

/** `base`, or `base_2`, `base_3`… — the first one not taken. Dots would make a field hierarchy. */
export function uniqueFieldName(base: string, taken: Set<string>): string {
  const clean = base.trim().replace(/\./g, '_') || 'field';
  if (!taken.has(clean)) return clean;
  for (let i = 2; ; i++) if (!taken.has(`${clean}_${i}`)) return `${clean}_${i}`;
}

const BORDER = rgb(0.55, 0.6, 0.68);

/**
 * A signature field (/FT /Sig), which pdf-lib cannot create: a merged field and widget with a
 * plain bordered appearance. Acrobat and other viewers show it as "click to sign".
 */
function addSignatureField(pdf: PDFDocument, page: PDFPage, name: string, rect: Rect, rot: number, required: boolean): void {
  const ctx = pdf.context;
  // A plain bordered box; a rectangle looks the same however the page is turned.
  const ap = ctx.stream(`q 0.55 0.6 0.68 RG 1 w 0.5 0.5 ${rect.width - 1} ${rect.height - 1} re S Q`,
    { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, rect.width, rect.height] });
  const widget = ctx.register(ctx.obj({
    Type: 'Annot', Subtype: 'Widget', FT: 'Sig', T: PDFHexString.fromText(name),
    Rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height],
    F: 4, P: page.ref, ...(required ? { Ff: 2 } : {}),
    MK: { R: rot },
    AP: { N: ctx.register(ap) },
  }));
  const annots = page.node.lookup(PDFName.of('Annots'));
  if (annots instanceof PDFArray) annots.push(widget);
  else page.node.set(PDFName.of('Annots'), ctx.obj([widget]));
  const acro = pdf.getForm().acroForm.dict;
  const fields = acro.lookup(PDFName.of('Fields'));
  if (fields instanceof PDFArray) fields.push(widget);
  else acro.set(PDFName.of('Fields'), ctx.obj([widget]));
}

/**
 * pdf-lib's addToPage grows the box by half the border and swaps width and height on turned
 * pages; the widget's rectangle is set back to exactly what was drawn. The appearance stream
 * (sized and turned by pdf-lib from the same numbers) is fitted to it by the viewer.
 */
function placeExactly(field: PDFField, rect: Rect): void {
  const widgets = field.acroField.getWidgets();
  widgets[widgets.length - 1]?.setRectangle(rect);
}

export interface FillableOptions {
  /**
   * The TrueType font the fields use (the page passes Liberation Sans, which it already serves
   * for pdf.js). It goes into the form's resources whole, not as a subset: people type any
   * letter later. Measured in Edge (whose viewer is Acrobat's): with Helvetica as the fields'
   * font, typing Polish letters into a multi-line field drew one huge line instead of wrapped
   * 11 pt text; with this font it wraps normally.
   */
  unicodeFont: Uint8Array;
}

/** The fields' font: the Liberation Sans the site already serves for pdf.js. */
export async function loadFieldFont(): Promise<Uint8Array> {
  const res = await fetch('/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf');
  if (!res.ok) throw new Error('Font fetch failed: LiberationSans-Regular.ttf');
  return new Uint8Array(await res.arrayBuffer());
}

/** Name of the fields' font in the form's resources (/DR). */
export const FIELD_FONT = 'LiSa';

async function embedUnicode(pdf: PDFDocument, font: Uint8Array): Promise<PDFFont> {
  pdf.registerFontkit((await import('@pdf-lib/fontkit')).default);
  return pdf.embedFont(font, { subset: false });
}

/** Adds the fields and returns the saved file. Existing fields and content are kept. */
export async function makePdfFillable(bytes: Uint8Array | ArrayBuffer, fields: FieldSpec[], opts: FillableOptions): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  if (pdf.isEncrypted) throw new Error('PDF jest zabezpieczony hasłem. Najpierw odblokuj dokument.');
  const form = pdf.getForm();
  const taken = existingFieldNames(pdf);
  const font = await embedUnicode(pdf, opts.unicodeFont);
  /** New fields and the default appearance (font and size) viewers use when someone types. */
  const created: { field: PDFField; da: string }[] = [];
  const pages = pdf.getPages();
  for (const spec of fields) {
    const page = pages[spec.page];
    if (!page) continue;
    const rect = displayRectToPage(page, spec);
    const rot = pageRotation(page);
    const name = uniqueFieldName(spec.name, taken);
    taken.add(name);
    // pdf-lib takes the size of the field's own (unturned) appearance.
    const look = { x: rect.x, y: rect.y, width: rot % 180 === 0 ? rect.width : rect.height, height: rot % 180 === 0 ? rect.height : rect.width,
      borderColor: BORDER, borderWidth: 1, rotate: degrees(rot) };
    if (spec.kind === 'text' || spec.kind === 'multiline') {
      const f = form.createTextField(name);
      if (spec.kind === 'multiline') f.enableMultiline();
      f.addToPage(page, look);
      placeExactly(f, rect);
      // One line: size 0 = automatic, the text shrinks to fit however much is typed. Several
      // lines: automatic size made Edge (whose viewer is Acrobat's) fill the box with one huge
      // line — a fixed 11 pt wraps like a normal form.
      created.push({ field: f, da: `/${FIELD_FONT} ${spec.kind === 'multiline' ? 11 : 0} Tf 0 g` });
      if (spec.required) f.enableRequired();
    } else if (spec.kind === 'checkbox') {
      const f = form.createCheckBox(name);
      f.addToPage(page, look);
      placeExactly(f, rect);
      if (spec.required) f.enableRequired();
    } else if (spec.kind === 'dropdown') {
      const f = form.createDropdown(name);
      const options = (spec.options ?? []).map((o) => o.trim()).filter(Boolean);
      if (options.length) f.addOptions(options);
      f.addToPage(page, look);
      placeExactly(f, rect);
      created.push({ field: f, da: `/${FIELD_FONT} 0 Tf 0 g` });
      if (spec.required) f.enableRequired();
    } else if (spec.kind === 'signature') {
      addSignatureField(pdf, page, name, rect, rot, !!spec.required);
    }
  }
  // Appearances are drawn now with the same font, then the default appearance is set the way
  // Acrobat writes it: the form's own font from /DR, size 0 = automatic. pdf-lib would otherwise
  // write the size it chose (22 pt, 34 pt…) and a font name the form's resources do not have.
  // Saved without redrawing, so these stay; NeedAppearances is not set (Acrobat would then ask
  // to save changes on every close).
  for (const { field } of created) (field as PDFTextField | PDFDropdown).updateAppearances(font);
  for (const { field, da } of created) field.acroField.setDefaultAppearance(da);
  addFontResource(pdf, font);
  return pdf.save({ updateFieldAppearances: false });
}

/** The fields' font in the form's resources (/DR /Font), and the form's default appearance. */
function addFontResource(pdf: PDFDocument, font: PDFFont): void {
  const ctx = pdf.context;
  const acro = pdf.getForm().acroForm.dict;
  let dr = acro.lookup(PDFName.of('DR'));
  if (!(dr instanceof PDFDict)) { dr = ctx.obj({}); acro.set(PDFName.of('DR'), dr); }
  const drDict = dr as PDFDict;
  let fonts = drDict.lookup(PDFName.of('Font'));
  if (!(fonts instanceof PDFDict)) { fonts = ctx.obj({}); drDict.set(PDFName.of('Font'), fonts); }
  (fonts as PDFDict).set(PDFName.of(FIELD_FONT), font.ref);
  if (!acro.get(PDFName.of('DA'))) acro.set(PDFName.of('DA'), PDFString.of(`/${FIELD_FONT} 0 Tf 0 g`));
}

/** How many form fields the file already has (shown before fields are added). */
export async function countFormFields(bytes: Uint8Array | ArrayBuffer): Promise<{ fields: number; pages: number }> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  if (pdf.isEncrypted) throw new Error('PDF jest zabezpieczony hasłem. Najpierw odblokuj dokument.');
  return { fields: pdf.getForm().getFields().length, pages: pdf.getPageCount() };
}
