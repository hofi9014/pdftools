// PDF functions (ISO 32000-1 §7.10), evaluated in JavaScript: sampled (type 0), exponential
// (type 2), stitching (type 3) and PostScript calculator (type 4). The grayscale tool uses them to
// turn spot colours (Separation/DeviceN tint transforms) and gradients into gray.
import { PDFArray, PDFDict, PDFName, PDFNumber, PDFRawStream, PDFRef, PDFStream, decodePDFRawStream, type PDFContext, type PDFObject } from 'pdf-lib';

export type PdfFn = (input: number[]) => number[];

export function numbers(arr: PDFObject | undefined, ctx: PDFContext): number[] | undefined {
  const a = arr instanceof PDFRef ? ctx.lookup(arr) : arr;
  if (!(a instanceof PDFArray)) return undefined;
  return a.asArray().map((x) => {
    const v = x instanceof PDFRef ? ctx.lookup(x) : x;
    return v instanceof PDFNumber ? v.asNumber() : 0;
  });
}

export function streamBytes(s: PDFStream): Uint8Array {
  return s instanceof PDFRawStream ? decodePDFRawStream(s).decode() : s.getContents();
}

const clip = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const interp = (x: number, x0: number, x1: number, y0: number, y1: number) => (x1 === x0 ? y0 : y0 + ((x - x0) * (y1 - y0)) / (x1 - x0));

/** A function object (dict or stream, or an array of 1-output functions) → evaluator. Throws when unsupported. */
export function makeFunction(obj: PDFObject | undefined, ctx: PDFContext): PdfFn {
  const o = obj instanceof PDFRef ? ctx.lookup(obj) : obj;
  if (o instanceof PDFArray) {
    const fns = o.asArray().map((f) => makeFunction(f, ctx));
    return (x) => fns.map((f) => f(x)[0] ?? 0);
  }
  const dict = o instanceof PDFStream ? o.dict : o instanceof PDFDict ? o : undefined;
  if (!dict) throw new Error('Not a function');
  const type = (dict.lookup(PDFName.of('FunctionType')) as PDFNumber | undefined)?.asNumber();
  const domain = numbers(dict.get(PDFName.of('Domain')), ctx) ?? [0, 1];
  const range = numbers(dict.get(PDFName.of('Range')), ctx);
  const m = domain.length / 2;
  const clipIn = (x: number[]) => Array.from({ length: m }, (_, i) => clip(x[i] ?? 0, domain[2 * i]!, domain[2 * i + 1]!));
  const clipOut = (y: number[]) => (range ? y.map((v, j) => clip(v, range[2 * j]!, range[2 * j + 1]!)) : y);

  if (type === 2) {
    const c0 = numbers(dict.get(PDFName.of('C0')), ctx) ?? [0];
    const c1 = numbers(dict.get(PDFName.of('C1')), ctx) ?? [1];
    const n = (dict.lookup(PDFName.of('N')) as PDFNumber).asNumber();
    return (x) => {
      const t = Math.pow(clipIn(x)[0]!, n);
      return clipOut(c0.map((a, j) => a + t * ((c1[j] ?? 0) - a)));
    };
  }
  if (type === 3) {
    const fns = (dict.lookup(PDFName.of('Functions'), PDFArray)).asArray().map((f) => makeFunction(f, ctx));
    const bounds = numbers(dict.get(PDFName.of('Bounds')), ctx) ?? [];
    const encode = numbers(dict.get(PDFName.of('Encode')), ctx) ?? [];
    return (x) => {
      const v = clipIn(x)[0]!;
      let i = 0;
      while (i < bounds.length && v >= bounds[i]!) i++;
      const lo = i === 0 ? domain[0]! : bounds[i - 1]!;
      const hi = i === bounds.length ? domain[1]! : bounds[i]!;
      return clipOut(fns[i]!([interp(v, lo, hi, encode[2 * i] ?? 0, encode[2 * i + 1] ?? 1)]));
    };
  }
  if (type === 0 && o instanceof PDFStream) {
    const size = numbers(dict.get(PDFName.of('Size')), ctx)!;
    const bps = (dict.lookup(PDFName.of('BitsPerSample')) as PDFNumber).asNumber();
    const encode = numbers(dict.get(PDFName.of('Encode')), ctx) ?? size.flatMap((s) => [0, s - 1]);
    const decode = numbers(dict.get(PDFName.of('Decode')), ctx) ?? range!;
    const n = range!.length / 2;
    const data = streamBytes(o);
    const max = Math.pow(2, bps) - 1;
    const sample = (idx: number, j: number): number => {
      const bit = (idx * n + j) * bps;
      let v = 0;
      for (let b = 0; b < bps; b++) {
        const p = bit + b;
        v = v * 2 + (((data[p >> 3] ?? 0) >> (7 - (p & 7))) & 1);
      }
      return v;
    };
    return (x) => {
      const xin = clipIn(x);
      const e = xin.map((v, i) => clip(interp(v, domain[2 * i]!, domain[2 * i + 1]!, encode[2 * i]!, encode[2 * i + 1]!), 0, size[i]! - 1));
      // Multilinear interpolation over the 2^m corners of the sample cell.
      const out = new Array<number>(n).fill(0);
      for (let corner = 0; corner < 1 << m; corner++) {
        let w = 1, idx = 0, stride = 1;
        for (let i = 0; i < m; i++) {
          const lo = Math.floor(e[i]!), hi = Math.min(lo + 1, size[i]! - 1), f = e[i]! - lo;
          const up = (corner >> i) & 1;
          w *= up ? f : 1 - f;
          idx += (up ? hi : lo) * stride;
          stride *= size[i]!;
        }
        if (w) for (let j = 0; j < n; j++) out[j]! += w * sample(idx, j);
      }
      return clipOut(out.map((v, j) => interp(v, 0, max, decode[2 * j]!, decode[2 * j + 1]!)));
    };
  }
  if (type === 4 && o instanceof PDFStream) {
    const prog = parsePostScript(new TextDecoder('latin1').decode(streamBytes(o)));
    return (x) => {
      const stack: (number | boolean)[] = [...clipIn(x)];
      runPostScript(prog, stack);
      return clipOut(stack.map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v)));
    };
  }
  throw new Error(`Unsupported function type ${type}`);
}

type PsOp = string | number | boolean | PsOp[];

function parsePostScript(src: string): PsOp[] {
  const tokens = src.match(/[{}]|[^\s{}]+/g) ?? [];
  let i = 0;
  const block = (): PsOp[] => {
    const out: PsOp[] = [];
    while (i < tokens.length) {
      const t = tokens[i++]!;
      if (t === '{') out.push(block());
      else if (t === '}') return out;
      else if (t === 'true' || t === 'false') out.push(t === 'true');
      else if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) out.push(parseFloat(t));
      else out.push(t);
    }
    return out;
  };
  const top = block();
  // The program is one outer { ... }.
  return top.length === 1 && Array.isArray(top[0]) ? (top[0] as PsOp[]) : top;
}

function runPostScript(prog: PsOp[], s: (number | boolean)[]): void {
  const num = () => s.pop() as number;
  const val = () => s.pop()!;
  for (let i = 0; i < prog.length; i++) {
    const op = prog[i]!;
    if (typeof op === 'number' || typeof op === 'boolean') { s.push(op); continue; }
    if (Array.isArray(op)) {
      const next = prog[i + 1];
      if (next === 'if') { if (val()) runPostScript(op, s); i++; continue; }
      if (Array.isArray(next) && prog[i + 2] === 'ifelse') { runPostScript(val() ? op : next, s); i += 2; continue; }
      throw new Error('PostScript: unexpected procedure');
    }
    switch (op) {
      case 'add': { const b = num(); s.push(num() + b); break; }
      case 'sub': { const b = num(); s.push(num() - b); break; }
      case 'mul': { const b = num(); s.push(num() * b); break; }
      case 'div': { const b = num(); s.push(num() / b); break; }
      case 'idiv': { const b = num(); s.push(Math.trunc(num() / b)); break; }
      case 'mod': { const b = num(); s.push(num() % b); break; }
      case 'neg': s.push(-num()); break;
      case 'abs': s.push(Math.abs(num())); break;
      case 'ceiling': s.push(Math.ceil(num())); break;
      case 'floor': s.push(Math.floor(num())); break;
      case 'round': s.push(Math.round(num())); break;
      case 'truncate': case 'cvi': s.push(Math.trunc(num())); break;
      case 'cvr': break;
      case 'sqrt': s.push(Math.sqrt(num())); break;
      case 'sin': s.push(Math.sin((num() * Math.PI) / 180)); break;
      case 'cos': s.push(Math.cos((num() * Math.PI) / 180)); break;
      case 'atan': { const den = num(); const a = (Math.atan2(num(), den) * 180) / Math.PI; s.push(a < 0 ? a + 360 : a); break; }
      case 'exp': { const e = num(); s.push(Math.pow(num(), e)); break; }
      case 'ln': s.push(Math.log(num())); break;
      case 'log': s.push(Math.log10(num())); break;
      case 'eq': { const b = val(); s.push(val() === b); break; }
      case 'ne': { const b = val(); s.push(val() !== b); break; }
      case 'gt': { const b = num(); s.push(num() > b); break; }
      case 'ge': { const b = num(); s.push(num() >= b); break; }
      case 'lt': { const b = num(); s.push(num() < b); break; }
      case 'le': { const b = num(); s.push(num() <= b); break; }
      case 'and': { const b = val(); const a = val(); s.push(typeof a === 'boolean' ? a && (b as boolean) : (a as number) & (b as number)); break; }
      case 'or': { const b = val(); const a = val(); s.push(typeof a === 'boolean' ? a || (b as boolean) : (a as number) | (b as number)); break; }
      case 'xor': { const b = val(); const a = val(); s.push(typeof a === 'boolean' ? a !== b : (a as number) ^ (b as number)); break; }
      case 'not': { const a = val(); s.push(typeof a === 'boolean' ? !a : ~(a as number)); break; }
      case 'bitshift': { const sh = num(); const a = num(); s.push(sh >= 0 ? a << sh : a >> -sh); break; }
      case 'pop': s.pop(); break;
      case 'dup': s.push(s[s.length - 1]!); break;
      case 'exch': { const b = val(); const a = val(); s.push(b, a); break; }
      case 'copy': { const n = num(); s.push(...s.slice(s.length - n)); break; }
      case 'index': { const n = num(); s.push(s[s.length - 1 - n]!); break; }
      case 'roll': {
        const j = num(); const n = num();
        if (n > 0) {
          const part = s.splice(s.length - n, n);
          const k = ((j % n) + n) % n;
          s.push(...part.slice(n - k), ...part.slice(0, n - k));
        }
        break;
      }
      default: throw new Error(`PostScript: unsupported operator ${op}`);
    }
  }
}
