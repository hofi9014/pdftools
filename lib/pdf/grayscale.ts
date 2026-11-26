// "PDF to grayscale" (plan 2.6, 2026-11-24). The colours are converted, not the pages turned into
// pictures: text stays text and vector graphics stay vector graphics.
//
// Every colour is replaced by the gray of the same lightness (lib/pdf/colorMath.ts):
//  - colour operators in the content of pages, forms, tiling patterns, Type 3 glyphs and the
//    appearance streams of annotations (rg/RG, k/K, cs/CS + sc/scn), inline images included;
//  - colour spaces: Device/Cal/ICC-based RGB and CMYK, Lab, Indexed (the palette is converted),
//    Separation/DeviceN spot colours (their tint transform function is evaluated);
//  - images: JPEG (decoded and re-encoded by the browser through `codec`) and Flate/LZW/RunLength
//    images with 8 bits per component, palettes of indexed images;
//  - gradients (shadings of types 1-3): the function is sampled into a gray one;
//  - annotation colours (/C, /IC, /MK) and default appearances (/DA).
// What cannot be converted (e.g. JPEG 2000 or CMYK JPEG images, mesh gradients) is counted, and
// the pages that show it get a full-page overlay in the "Saturation" blend mode with a white
// source: it removes the remaining colour where it is drawn (the file keeps that colour data).
import {
  PDFArray, PDFContext, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber, PDFRawStream, PDFRef,
  PDFStream, PDFString, decodePDFRawStream, type PDFObject, type PDFPage,
} from 'pdf-lib';
import { applyEdits, fromLatin1, latin1, parseOps, type Edit, type Op, type Operand } from './contentStream';
import { clamp01, cmykToGray, fmt, labToGray, rgbToGray } from './colorMath';
import { makeFunction, numbers, streamBytes, type PdfFn } from './pdfFunction';
import { unfilterPng } from './pngPredictor';

export interface GrayscaleCodec {
  /** A JPEG file → RGBA pixels (as a browser decodes it). */
  decodeJpeg(bytes: Uint8Array): Promise<{ width: number; height: number; data: Uint8ClampedArray }>;
  /** Gray pixels (one byte each) → a JPEG file, and how many components it stores (1 or 3). */
  encodeJpeg(gray: Uint8Array, width: number, height: number): Promise<{ bytes: Uint8Array; components: 1 | 3 }>;
}

export interface GrayscaleReport {
  pages: number;
  /** Colour operators and colour values rewritten. */
  colours: number;
  images: number;
  gradients: number;
  spotColours: number;
  /** Things that could not be converted, by kind → count. */
  leftovers: Record<string, number>;
  /** 1-based numbers of the pages that got the overlay. */
  overlayPages: number[];
}

type CS =
  | { kind: 'gray' } | { kind: 'rgb' } | { kind: 'cmyk' }
  | { kind: 'lab'; range: number[] }
  | { kind: 'indexed'; base: CS; hival: number; lookup: Uint8Array }
  | { kind: 'tint'; n: number; fn: PdfFn; alt: CS }
  | { kind: 'pattern'; base?: CS }
  | { kind: 'unknown' };

const GRAY: CS = { kind: 'gray' };
const N = (s: string) => PDFName.of(s);

function components(cs: CS): number {
  switch (cs.kind) {
    case 'gray': case 'indexed': return 1;
    case 'rgb': case 'lab': return 3;
    case 'cmyk': return 4;
    case 'tint': return cs.n;
    default: return 0;
  }
}

/** Gray (0..1) of a colour given in the components of `cs`; null when it cannot be computed. */
function toGray(cs: CS, v: number[]): number | null {
  switch (cs.kind) {
    case 'gray': return clamp01(v[0] ?? 0);
    case 'rgb': return rgbToGray(clamp01(v[0] ?? 0), clamp01(v[1] ?? 0), clamp01(v[2] ?? 0));
    case 'cmyk': return cmykToGray(clamp01(v[0] ?? 0), clamp01(v[1] ?? 0), clamp01(v[2] ?? 0), clamp01(v[3] ?? 0));
    case 'lab': return labToGray(v[0] ?? 0);
    case 'indexed': {
      const i = Math.max(0, Math.min(cs.hival, Math.round(v[0] ?? 0)));
      const n = components(cs.base);
      return toGray(cs.base, Array.from({ length: n }, (_, j) => (cs.lookup[i * n + j] ?? 0) / 255));
    }
    case 'tint': {
      try { return toGray(cs.alt, cs.fn(v)); } catch { return null; }
    }
    default: return null;
  }
}

function initialColour(cs: CS): number[] {
  switch (cs.kind) {
    case 'cmyk': return [0, 0, 0, 1];
    case 'tint': return new Array<number>(cs.n).fill(1);
    case 'lab': return [0, 0, 0];
    default: return new Array<number>(components(cs)).fill(0);
  }
}

class Converter {
  report: GrayscaleReport = { pages: 0, colours: 0, images: 0, gradients: 0, spotColours: 0, leftovers: {}, overlayPages: [] };
  private csCache = new Map<PDFObject, CS>();
  /** Resource dicts, forms, images, shadings, patterns already handled → had leftovers. */
  private done = new Map<PDFObject, boolean>();
  private ctx: PDFContext;
  constructor(private doc: PDFDocument, private codec: GrayscaleCodec) { this.ctx = doc.context; }

  private leftover(kind: string) { this.report.leftovers[kind] = (this.report.leftovers[kind] ?? 0) + 1; }
  private look(o: PDFObject | undefined): PDFObject | undefined { return o instanceof PDFRef ? this.ctx.lookup(o) : o; }

  // ---- colour spaces ----
  resolveCs(obj: PDFObject | undefined, resources?: PDFDict): CS {
    const o = this.look(obj);
    if (!o) return { kind: 'unknown' };
    const cached = this.csCache.get(o);
    if (cached) return cached;
    const cs = this.resolveCsUncached(o, resources);
    if (!(o instanceof PDFName)) this.csCache.set(o, cs);
    return cs;
  }

  private resolveCsUncached(o: PDFObject, resources?: PDFDict): CS {
    if (o instanceof PDFName) {
      const name = o.decodeText();
      if (name === 'DeviceGray' || name === 'G' || name === 'CalGray') return GRAY;
      if (name === 'DeviceRGB' || name === 'RGB' || name === 'CalRGB') return { kind: 'rgb' };
      if (name === 'DeviceCMYK' || name === 'CMYK') return { kind: 'cmyk' };
      if (name === 'Pattern') return { kind: 'pattern' };
      const named = resources?.lookup(N('ColorSpace'));
      if (named instanceof PDFDict && named.get(o)) return this.resolveCs(named.get(o), resources);
      return { kind: 'unknown' };
    }
    if (!(o instanceof PDFArray)) return { kind: 'unknown' };
    const head = this.look(o.get(0));
    const family = head instanceof PDFName ? head.decodeText() : '';
    try {
      if (family === 'ICCBased') {
        const s = this.look(o.get(1));
        const n = s instanceof PDFStream ? (s.dict.lookup(N('N')) as PDFNumber | undefined)?.asNumber() : undefined;
        return n === 1 ? GRAY : n === 3 ? { kind: 'rgb' } : n === 4 ? { kind: 'cmyk' } : { kind: 'unknown' };
      }
      if (family === 'CalGray') return GRAY;
      if (family === 'CalRGB') return { kind: 'rgb' };
      if (family === 'Lab') {
        const d = this.look(o.get(1));
        const range = (d instanceof PDFDict && numbers(d.get(N('Range')), this.ctx)) || [-100, 100, -100, 100];
        return { kind: 'lab', range };
      }
      if (family === 'Indexed' || family === 'I') {
        const base = this.resolveCs(o.get(1), resources);
        const hival = (this.look(o.get(2)) as PDFNumber).asNumber();
        const l = this.look(o.get(3));
        const lookup = l instanceof PDFStream ? streamBytes(l) : l instanceof PDFHexString ? l.asBytes() : l instanceof PDFString ? l.asBytes() : new Uint8Array();
        return { kind: 'indexed', base, hival, lookup };
      }
      if (family === 'Separation' || family === 'DeviceN') {
        const n = family === 'Separation' ? 1 : (this.look(o.get(1)) as PDFArray).size();
        const alt = this.resolveCs(o.get(2), resources);
        const fn = makeFunction(o.get(3), this.ctx);
        return { kind: 'tint', n, fn, alt };
      }
      if (family === 'Pattern') return { kind: 'pattern', base: o.size() > 1 ? this.resolveCs(o.get(1), resources) : undefined };
    } catch {
      return { kind: 'unknown' };
    }
    return { kind: 'unknown' };
  }

  // ---- content streams ----
  /** Rewrites colour operators; returns the new text and whether something could not be converted. */
  rewriteContent(src: string, resources: PDFDict | undefined, inherits = false): { text: string; changed: boolean; leftover: boolean } {
    const ops = parseOps(src);
    const edits: Edit[] = [];
    let leftover = false;
    // null: a colour space left as it is (unknown) — its colours are left too. 'inherit': a form
    // or a glyph drawn with the colour space of the place where it is used.
    type Cur = CS | null | 'inherit';
    type St = { fill: Cur; stroke: Cur };
    let st: St = inherits ? { fill: 'inherit', stroke: 'inherit' } : { fill: GRAY, stroke: GRAY };
    const stack: St[] = [];
    const nums = (o: Operand[]) => o.filter((x): x is { kind: 'num'; value: number } => x.kind === 'num').map((x) => x.value);
    const put = (op: Op, text: string) => { edits.push({ start: op.start, end: op.end, text }); this.report.colours++; };
    // In a form the colour space is inherited from where it is drawn; colours set without a
    // colour space are told apart by their number of components.
    const guess = (k: number): CS | null => (k === 1 ? GRAY : k === 3 ? { kind: 'rgb' } : k === 4 ? { kind: 'cmyk' } : null);

    for (const op of ops) {
      switch (op.op) {
        case 'q': stack.push({ ...st }); break;
        case 'Q': st = stack.pop() ?? st; break;
        case 'g': st.fill = GRAY; break;
        case 'G': st.stroke = GRAY; break;
        case 'rg': case 'RG': case 'k': case 'K': {
          const v = nums(op.operands);
          const cs: CS = op.op.toLowerCase() === 'rg' ? { kind: 'rgb' } : { kind: 'cmyk' };
          const g = toGray(cs, v);
          const fill = op.op === 'rg' || op.op === 'k';
          if (g !== null) put(op, `${fmt(g)} ${fill ? 'g' : 'G'}`);
          if (fill) st.fill = GRAY; else st.stroke = GRAY;
          break;
        }
        case 'cs': case 'CS': {
          const fill = op.op === 'cs';
          const name = op.operands.find((x) => x.kind === 'name');
          const cs = name ? this.resolveCs(N(name.value), resources) : { kind: 'unknown' as const };
          if (cs.kind === 'pattern' || cs.kind === 'gray') { if (fill) st.fill = cs; else st.stroke = cs; break; }
          if (cs.kind === 'unknown') { leftover = true; this.leftover('colour space'); if (fill) st.fill = null; else st.stroke = null; break; }
          const g = toGray(cs, initialColour(cs));
          if (cs.kind === 'tint') this.report.spotColours++;
          put(op, `/DeviceGray ${fill ? 'cs' : 'CS'}${g ? ` ${fmt(g)} ${fill ? 'sc' : 'SC'}` : ''}`);
          if (fill) st.fill = cs; else st.stroke = cs;
          break;
        }
        case 'sc': case 'scn': case 'SC': case 'SCN': {
          const fill = op.op === 'sc' || op.op === 'scn';
          const cur = fill ? st.fill : st.stroke;
          const v = nums(op.operands);
          const pattern = op.operands[op.operands.length - 1];
          if (cur && cur !== 'inherit' && cur.kind === 'pattern') {
            // A pattern by name; the colour of an uncoloured pattern comes before it.
            if (cur.base && v.length && pattern?.kind === 'name') {
              const g = toGray(cur.base, v);
              if (g !== null) put(op, `${fmt(g)} /${pattern.value} ${op.op}`);
            }
            break;
          }
          if (cur === 'inherit' && pattern?.kind === 'name') break; // a pattern of the caller's space
          const cs = cur === 'inherit' ? guess(v.length) : cur;
          if (!cs) { leftover = true; this.leftover('colour'); break; }
          if (cs.kind === 'gray') break;
          const g = toGray(cs, v);
          if (g === null) { leftover = true; this.leftover('colour'); break; }
          put(op, `${fmt(g)} ${fill ? 'sc' : 'SC'}`);
          break;
        }
        case 'BI': {
          const r = this.convertInlineImage(op, resources);
          if (r === null) { leftover = true; this.leftover('inline image'); } else if (r) edits.push({ start: op.start, end: op.end, text: r });
          break;
        }
        default: break;
      }
    }
    return { text: edits.length ? applyEdits(src, edits) : src, changed: edits.length > 0, leftover };
  }

  /** null: cannot convert; '': nothing to do; else the new BI…EI text. */
  private convertInlineImage(op: Op, resources: PDFDict | undefined): string | null | '' {
    const d = op.inline!.dict;
    const get = (...keys: string[]) => { for (const k of keys) if (d.has(k)) return d.get(k); return undefined; };
    const im = get('IM', 'ImageMask');
    if (im && !Array.isArray(im) && im.kind === 'other') return ''; // a stencil mask (true) has no colour
    const csv = get('CS', 'ColorSpace');
    if (!csv || Array.isArray(csv)) return csv ? null : '';
    if (csv.kind !== 'name') return null;
    const cs = this.resolveCs(N(csv.value), resources);
    if (cs.kind === 'gray') return '';
    if (cs.kind !== 'rgb' && cs.kind !== 'cmyk') return null;
    const num = (...k: string[]) => { const v = get(...k); return v && !Array.isArray(v) && v.kind === 'num' ? v.value : undefined; };
    const w = num('W', 'Width'), h = num('H', 'Height'), bpc = num('BPC', 'BitsPerComponent');
    const f = get('F', 'Filter');
    if (!w || !h || bpc !== 8 || get('D', 'Decode') || get('DP', 'DecodeParms')) return null;
    let data = fromLatin1(op.inline!.data);
    if (f) {
      // Inline images use abbreviated filter names (ISO 32000-1 Table 94).
      const full: Record<string, string> = { Fl: 'FlateDecode', FlateDecode: 'FlateDecode', AHx: 'ASCIIHexDecode', ASCIIHexDecode: 'ASCIIHexDecode', A85: 'ASCII85Decode', ASCII85Decode: 'ASCII85Decode', LZW: 'LZWDecode', LZWDecode: 'LZWDecode', RL: 'RunLengthDecode', RunLengthDecode: 'RunLengthDecode' };
      const names = (Array.isArray(f) ? f : [f]).map((x) => (x.kind === 'name' ? full[x.value] : undefined));
      if (!names.length || names.some((x) => !x)) return null;
      try {
        data = decodePDFRawStream(this.ctx.stream(data, { Filter: names.length === 1 ? names[0]! : names as string[] })).decode();
      } catch { return null; }
    }
    const gray = this.pixelsToGray(data, w * h, cs);
    if (!gray) return null;
    this.report.images++;
    const hex = Array.from(gray, (b) => b.toString(16).padStart(2, '0')).join('');
    const interp = get('I', 'Interpolate');
    return `BI /W ${w} /H ${h} /CS /G /BPC 8 /F /AHx${interp ? ' /I true' : ''} ID ${hex}> EI`;
  }

  private pixelsToGray(data: Uint8Array, count: number, cs: CS): Uint8Array | null {
    const n = components(cs);
    if (data.length < count * n) return null;
    const out = new Uint8Array(count);
    const cache = new Map<number, number>();
    for (let p = 0, s = 0; p < count; p++, s += n) {
      let g: number | null;
      if (cs.kind === 'rgb') g = rgbToGray(data[s]! / 255, data[s + 1]! / 255, data[s + 2]! / 255);
      else {
        let key = 0;
        for (let j = 0; j < n; j++) key = key * 256 + data[s + j]!;
        const hit = cache.get(key);
        if (hit !== undefined) { out[p] = hit; continue; }
        const v = Array.from({ length: n }, (_, j) => data[s + j]! / 255);
        g = cs.kind === 'lab' ? toGray(cs, [v[0]! * 100]) : toGray(cs, v);
        if (g === null) return null;
        const b = Math.round(g * 255);
        cache.set(key, b);
        out[p] = b;
        continue;
      }
      out[p] = Math.round(g * 255);
    }
    return out;
  }

  /** A stream with new (unencoded) content, keeping the other dictionary entries. */
  private newStream(old: PDFStream, content: Uint8Array): PDFRawStream {
    const s = this.ctx.flateStream(content);
    for (const [k, v] of old.dict.entries()) {
      const key = k.decodeText();
      if (key !== 'Filter' && key !== 'DecodeParms' && key !== 'Length') s.dict.set(k, v);
    }
    return s;
  }

  /** A form-like stream (form XObject, tiling pattern, glyph, appearance). Returns leftover. */
  processStream(ref: PDFObject | undefined, inherited: PDFDict | undefined, replace?: (s: PDFRawStream) => void, inheritsColour = false): boolean {
    const s = this.look(ref);
    if (!(s instanceof PDFStream)) return false;
    if (this.done.has(s)) return this.done.get(s)!;
    this.done.set(s, false);
    const own = s.dict.lookup(N('Resources'));
    const resources = own instanceof PDFDict ? own : inherited;
    let leftover = resources ? this.processResources(resources) : false;
    let text: string;
    try { text = latin1(streamBytes(s)); } catch { this.leftover('unreadable stream'); this.done.set(s, true); return true; }
    const r = this.rewriteContent(text, resources, inheritsColour);
    leftover ||= r.leftover;
    if (r.changed) {
      const ns = this.newStream(s, fromLatin1(r.text));
      if (ref instanceof PDFRef) this.ctx.assign(ref, ns);
      else replace?.(ns);
      this.done.set(ns, leftover);
    }
    this.done.set(s, leftover);
    return leftover;
  }

  // ---- resources ----
  processResources(res: PDFDict): boolean {
    if (this.done.has(res)) return this.done.get(res)!;
    this.done.set(res, false);
    let leftover = false;
    const each = (key: string, fn: (v: PDFObject, name: PDFName, d: PDFDict) => void) => {
      const d = res.lookup(N(key));
      if (d instanceof PDFDict) for (const [name, v] of d.entries()) fn(v, name, d);
    };
    // Uncoloured patterns keep their colour in the colour space: [/Pattern base] → [/Pattern /DeviceGray].
    each('ColorSpace', (v, name, d) => {
      const o = this.look(v);
      if (o instanceof PDFArray && (this.look(o.get(0)) as PDFName | undefined)?.decodeText?.() === 'Pattern' && o.size() > 1) {
        const base = this.resolveCs(o.get(1), res);
        if (base.kind !== 'gray' && base.kind !== 'unknown') d.set(name, this.ctx.obj([N('Pattern'), N('DeviceGray')]));
      }
    });
    each('XObject', (v) => {
      const o = this.look(v);
      if (!(o instanceof PDFStream)) return;
      const sub = (o.dict.lookup(N('Subtype')) as PDFName | undefined)?.decodeText();
      if (sub === 'Form') leftover = this.processStream(v, res, undefined, true) || leftover;
      else if (sub === 'Image') leftover = this.processImageLater(v) || leftover;
    });
    each('Pattern', (v) => {
      const o = this.look(v);
      const dict = o instanceof PDFStream ? o.dict : o instanceof PDFDict ? o : undefined;
      if (!dict) return;
      const type = (dict.lookup(N('PatternType')) as PDFNumber | undefined)?.asNumber();
      if (type === 1) leftover = this.processStream(v, res) || leftover;
      else if (type === 2) leftover = this.processShading(dict.get(N('Shading')), (ns) => dict.set(N('Shading'), ns)) || leftover;
    });
    each('Shading', (v, name, d) => { leftover = this.processShading(v, (ns) => d.set(name, ns)) || leftover; });
    each('Font', (v) => {
      const f = this.look(v);
      if (!(f instanceof PDFDict) || (f.lookup(N('Subtype')) as PDFName | undefined)?.decodeText() !== 'Type3') return;
      const procs = f.lookup(N('CharProcs'));
      const fres = f.lookup(N('Resources'));
      if (procs instanceof PDFDict) for (const [k, p] of procs.entries()) leftover = this.processStream(p, fres instanceof PDFDict ? fres : res, (ns) => procs.set(k, ns), true) || leftover;
    });
    each('ExtGState', (v) => {
      const gs = this.look(v);
      const sm = gs instanceof PDFDict ? this.look(gs.get(N('SMask'))) : undefined;
      if (sm instanceof PDFDict) leftover = this.processStream(sm.get(N('G')), res, undefined, true) || leftover;
    });
    this.done.set(res, leftover);
    return leftover;
  }

  // Images are converted after the content (JPEG decoding is asynchronous).
  private imageQueue: PDFRef[] = [];
  /** Images that turned out not to be convertible only when converted (e.g. a JPEG that did not decode). */
  failedImages = new Set<PDFRef>();
  private processImageLater(v: PDFObject): boolean {
    if (v instanceof PDFRef && !this.imageQueue.includes(v)) this.imageQueue.push(v);
    return this.imageLeftover(v);
  }
  /** Whether an image cannot be converted (checked synchronously, before converting). */
  private imageLeftover(v: PDFObject): boolean {
    const s = this.look(v);
    if (!(s instanceof PDFRawStream)) return false;
    return this.planImage(s) === 'leftover';
  }

  private filters(d: PDFDict): string[] {
    const f = d.lookup(N('Filter'));
    if (f instanceof PDFName) return [f.decodeText()];
    if (f instanceof PDFArray) return f.asArray().map((x) => (this.look(x) as PDFName).decodeText());
    return [];
  }

  private planImage(s: PDFRawStream): 'none' | 'indexed' | 'jpeg' | 'pixels' | 'leftover' {
    const d = s.dict;
    if ((d.lookup(N('ImageMask')) as { asBoolean?: () => boolean } | undefined)?.asBoolean?.()) return 'none';
    const filters = this.filters(d);
    if (!d.get(N('ColorSpace'))) return filters.includes('JPXDecode') ? 'leftover' : 'none';
    const cs = this.resolveCs(d.get(N('ColorSpace')));
    if (cs.kind === 'gray') return 'none';
    if (cs.kind === 'unknown' || cs.kind === 'pattern') return 'leftover';
    if (cs.kind === 'indexed') return cs.base.kind === 'gray' ? 'none' : cs.base.kind === 'unknown' ? 'leftover' : 'indexed';
    if (d.get(N('Decode')) || this.look(d.get(N('Mask'))) instanceof PDFArray) return 'leftover';
    if (filters.length === 1 && filters[0] === 'DCTDecode') return cs.kind === 'rgb' ? 'jpeg' : 'leftover';
    const bpc = (d.lookup(N('BitsPerComponent')) as PDFNumber | undefined)?.asNumber();
    const ok = new Set(['FlateDecode', 'Fl', 'LZWDecode', 'LZW', 'ASCII85Decode', 'A85', 'ASCIIHexDecode', 'AHx', 'RunLengthDecode', 'RL']);
    if (bpc !== 8 || !filters.every((f) => ok.has(f))) return 'leftover';
    const dp = this.look(d.get(N('DecodeParms')));
    const lastDp = dp instanceof PDFArray ? this.look(dp.get(dp.size() - 1)) : dp;
    const pred = lastDp instanceof PDFDict ? (lastDp.lookup(N('Predictor')) as PDFNumber | undefined)?.asNumber() ?? 1 : 1;
    if (pred !== 1 && pred < 10) return 'leftover';
    return 'pixels';
  }

  async convertImages(): Promise<void> {
    for (const ref of this.imageQueue) {
      const s = this.look(ref);
      if (!(s instanceof PDFRawStream) || this.done.has(s)) continue;
      this.done.set(s, false);
      const plan = this.planImage(s);
      if (plan === 'none') continue;
      if (plan === 'leftover') { this.leftover('image'); continue; }
      const d = s.dict;
      const cs = this.resolveCs(d.get(N('ColorSpace')));
      try {
        if (plan === 'indexed' && cs.kind === 'indexed') {
          const lookup = new Uint8Array(cs.hival + 1);
          for (let i = 0; i <= cs.hival; i++) lookup[i] = Math.round((toGray(cs, [i]) ?? 0) * 255);
          d.set(N('ColorSpace'), this.ctx.obj([N('Indexed'), N('DeviceGray'), cs.hival, PDFHexString.of(Array.from(lookup, (b) => b.toString(16).padStart(2, '0')).join(''))]));
          if (cs.base.kind === 'tint') this.report.spotColours++;
          this.report.images++;
          continue;
        }
        const w = (d.lookup(N('Width')) as PDFNumber).asNumber();
        const h = (d.lookup(N('Height')) as PDFNumber).asNumber();
        let gray: Uint8Array | null;
        if (plan === 'jpeg') {
          const img = await this.codec.decodeJpeg(s.getContents());
          if (img.width !== w || img.height !== h) { this.leftover('image'); this.failedImages.add(ref); continue; }
          gray = new Uint8Array(w * h);
          for (let p = 0; p < w * h; p++) gray[p] = Math.round(rgbToGray(img.data[p * 4]! / 255, img.data[p * 4 + 1]! / 255, img.data[p * 4 + 2]! / 255) * 255);
          const enc = await this.codec.encodeJpeg(gray, w, h);
          const ns = this.ctx.stream(enc.bytes, {});
          for (const [k, v] of d.entries()) { const key = k.decodeText(); if (!['Filter', 'DecodeParms', 'Length', 'ColorSpace'].includes(key)) ns.dict.set(k, v); }
          ns.dict.set(N('Filter'), N('DCTDecode'));
          ns.dict.set(N('ColorSpace'), N(enc.components === 1 ? 'DeviceGray' : 'DeviceRGB'));
          this.ctx.assign(ref, ns);
          this.report.images++;
          continue;
        }
        let data = decodePDFRawStream(s).decode();
        const dp = this.look(d.get(N('DecodeParms')));
        const lastDp = dp instanceof PDFArray ? this.look(dp.get(dp.size() - 1)) : dp;
        const pred = lastDp instanceof PDFDict ? (lastDp.lookup(N('Predictor')) as PDFNumber | undefined)?.asNumber() ?? 1 : 1;
        if (pred >= 10) data = unfilterPng(data, w, h, components(cs));
        gray = this.pixelsToGray(data, w * h, cs);
        if (!gray) { this.leftover('image'); this.failedImages.add(ref); continue; }
        const ns = this.ctx.flateStream(gray);
        for (const [k, v] of d.entries()) { const key = k.decodeText(); if (!['Filter', 'DecodeParms', 'Length', 'ColorSpace', 'BitsPerComponent'].includes(key)) ns.dict.set(k, v); }
        ns.dict.set(N('ColorSpace'), N('DeviceGray'));
        ns.dict.set(N('BitsPerComponent'), PDFNumber.of(8));
        this.ctx.assign(ref, ns);
        if (cs.kind === 'tint') this.report.spotColours++;
        this.report.images++;
      } catch {
        this.leftover('image');
        this.failedImages.add(ref);
      }
    }
  }

  /** Whether these resources (or forms inside them) draw one of `refs`. */
  uses(res: PDFDict | undefined, refs: Set<PDFRef>, seen = new Set<PDFObject>()): boolean {
    if (!res || seen.has(res)) return false;
    seen.add(res);
    const xo = res.lookup(N('XObject'));
    if (!(xo instanceof PDFDict)) return false;
    for (const [, v] of xo.entries()) {
      if (v instanceof PDFRef && refs.has(v)) return true;
      const o = this.look(v);
      const r = o instanceof PDFStream ? o.dict.lookup(N('Resources')) : undefined;
      if (r instanceof PDFDict && this.uses(r, refs, seen)) return true;
    }
    return false;
  }

  // ---- shadings ----
  /** Gradients of types 1-3: the colour function becomes a sampled gray function. */
  processShading(v: PDFObject | undefined, replace: (ns: PDFObject) => void): boolean {
    const o = this.look(v);
    const dict = o instanceof PDFStream ? o.dict : o instanceof PDFDict ? o : undefined;
    if (!dict || !o) return false;
    if (this.done.has(o)) return this.done.get(o)!;
    this.done.set(o, false);
    const cs = this.resolveCs(dict.get(N('ColorSpace')));
    if (cs.kind === 'gray') return false;
    const type = (dict.lookup(N('ShadingType')) as PDFNumber | undefined)?.asNumber() ?? 0;
    if (type < 1 || type > 3 || cs.kind === 'unknown') { this.leftover('gradient'); this.done.set(o, true); return true; }
    try {
      const fn = dict.get(N('Function')) ? makeFunction(dict.get(N('Function')), this.ctx) : null;
      if (!fn) throw new Error('no function');
      const gray = (x: number[]) => toGray(cs, fn(x)) ?? (() => { throw new Error('gray'); })();
      let sampled: PDFRawStream;
      if (type === 1) {
        const dom = numbers(dict.get(N('Domain')), this.ctx) ?? [0, 1, 0, 1];
        const size = 64;
        const data = new Uint8Array(size * size);
        for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
          data[j * size + i] = Math.round(gray([dom[0]! + ((dom[1]! - dom[0]!) * i) / (size - 1), dom[2]! + ((dom[3]! - dom[2]!) * j) / (size - 1)]) * 255);
        }
        sampled = this.ctx.flateStream(data, { FunctionType: 0, Domain: dom, Range: [0, 1], Size: [size, size], BitsPerSample: 8 });
      } else {
        const dom = numbers(dict.get(N('Domain')), this.ctx) ?? [0, 1];
        const size = 256;
        const data = new Uint8Array(size);
        for (let i = 0; i < size; i++) data[i] = Math.round(gray([dom[0]! + ((dom[1]! - dom[0]!) * i) / (size - 1)]) * 255);
        sampled = this.ctx.flateStream(data, { FunctionType: 0, Domain: dom, Range: [0, 1], Size: [size], BitsPerSample: 8 });
      }
      const nd = o instanceof PDFStream ? this.ctx.obj({}) : dict;
      if (o instanceof PDFStream) for (const [k, val] of dict.entries()) nd.set(k, val);
      nd.set(N('ColorSpace'), N('DeviceGray'));
      nd.set(N('Function'), this.ctx.register(sampled));
      const bg = numbers(nd.get(N('Background')), this.ctx);
      if (bg) nd.set(N('Background'), this.ctx.obj([toGray(cs, bg) ?? 0]));
      if (o instanceof PDFStream) { if (v instanceof PDFRef) this.ctx.assign(v, nd); else replace(nd); }
      if (cs.kind === 'tint') this.report.spotColours++;
      this.report.gradients++;
      return false;
    } catch {
      this.leftover('gradient');
      this.done.set(o, true);
      return true;
    }
  }

  // ---- annotations ----
  processAnnotations(page: PDFPage, res: PDFDict | undefined): boolean {
    let leftover = false;
    const annots = page.node.Annots();
    if (!annots) return false;
    for (let i = 0; i < annots.size(); i++) {
      const a = this.look(annots.get(i));
      if (!(a instanceof PDFDict)) continue;
      for (const key of ['C', 'IC']) this.grayArray(a, key);
      const mk = this.look(a.get(N('MK')));
      if (mk instanceof PDFDict) for (const key of ['BG', 'BC']) this.grayArray(mk, key);
      this.grayDa(a);
      const ap = this.look(a.get(N('AP')));
      if (ap instanceof PDFDict) {
        for (const kind of ['N', 'R', 'D']) {
          const e = ap.get(N(kind));
          const eo = this.look(e);
          if (eo instanceof PDFStream) leftover = this.processStream(e, res, (ns) => ap.set(N(kind), ns)) || leftover;
          else if (eo instanceof PDFDict) for (const [state, sv] of eo.entries()) leftover = this.processStream(sv, res, (ns) => eo.set(state, ns)) || leftover;
        }
      }
    }
    return leftover;
  }

  /** An annotation colour array (1, 3 or 4 numbers) → one gray number. */
  grayArray(d: PDFDict, key: string) {
    const v = numbers(d.get(N(key)), this.ctx);
    if (!v || (v.length !== 3 && v.length !== 4)) return;
    const g = v.length === 3 ? rgbToGray(v[0]!, v[1]!, v[2]!) : cmykToGray(v[0]!, v[1]!, v[2]!, v[3]!);
    d.set(N(key), this.ctx.obj([Number(fmt(g))]));
    this.report.colours++;
  }

  /** A default appearance string ("/Helv 10 Tf 1 0 0 rg") with its colour in gray. */
  grayDa(d: PDFDict) {
    const da = this.look(d.get(N('DA')));
    if (!(da instanceof PDFString) && !(da instanceof PDFHexString)) return;
    const r = this.rewriteContent(da.decodeText(), undefined);
    if (r.changed) d.set(N('DA'), PDFString.of(r.text));
  }
}

/** Converts every colour of the PDF to gray. */
export async function convertToGrayscale(bytes: Uint8Array | ArrayBuffer, codec: GrayscaleCodec): Promise<{ bytes: Uint8Array; report: GrayscaleReport }> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  if (doc.isEncrypted) throw new Error('PDF jest zabezpieczony hasłem. Najpierw odblokuj dokument.');
  const c = new Converter(doc, codec);
  const ctx = doc.context;
  const pages = doc.getPages();
  c.report.pages = pages.length;
  const pageLeftover: boolean[] = [];

  const acro = doc.catalog.lookup(N('AcroForm'));
  if (acro instanceof PDFDict) {
    c.grayDa(acro);
    const dr = acro.lookup(N('DR'));
    if (dr instanceof PDFDict) c.processResources(dr);
  }

  for (const page of pages) {
    const res = page.node.Resources();
    let leftover = res ? c.processResources(res) : false;
    const contents = page.node.Contents();
    const parts = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    let text = '';
    for (const p of parts) {
      const s = p instanceof PDFRef ? ctx.lookup(p) : p;
      if (s instanceof PDFStream) text += latin1(streamBytes(s)) + '\n';
    }
    const r = c.rewriteContent(text, res);
    leftover ||= r.leftover;
    if (r.changed) page.node.set(N('Contents'), ctx.register(ctx.flateStream(fromLatin1(r.text))));
    leftover = c.processAnnotations(page, res) || leftover;
    pageLeftover.push(leftover);
  }

  await c.convertImages();
  if (c.failedImages.size) pages.forEach((p, i) => { if (c.uses(p.node.Resources(), c.failedImages)) pageLeftover[i] = true; });

  // Pages with something left in colour: a gray overlay in the Saturation blend mode keeps the
  // lightness of what is under it and removes its colour (ISO 32000-1 §11.3.5.3). The source is
  // white: where nothing is painted (a transparent backdrop in pdf.js) the result is the source
  // itself, so the paper stays white; a 0.5 gray source turned blank paper mid-gray there.
  pages.forEach((page, i) => {
    if (!pageLeftover[i]) return;
    const res = page.node.Resources() ?? ctx.obj({});
    if (!page.node.Resources()) page.node.set(N('Resources'), res);
    let gs = res.lookup(N('ExtGState'));
    if (!(gs instanceof PDFDict)) { gs = ctx.obj({}); res.set(N('ExtGState'), gs); }
    (gs as PDFDict).set(N('OptimaGray'), ctx.obj({ Type: 'ExtGState', BM: 'Saturation', ca: 1, CA: 1 }));
    const box = page.getMediaBox();
    const contents = page.node.Contents();
    const parts = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    const before = ctx.register(ctx.flateStream('q\n'));
    const after = ctx.register(ctx.flateStream(`\nQ\nq /OptimaGray gs 1 g ${fmt(box.x)} ${fmt(box.y)} ${fmt(box.width)} ${fmt(box.height)} re f Q\n`));
    page.node.set(N('Contents'), ctx.obj([before, ...parts, after]));
    c.report.overlayPages.push(i + 1);
  });

  return { bytes: await doc.save(), report: c.report };
}
