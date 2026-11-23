// "Remove metadata" (plan 2.1, 2026-11-20). Pure pdf-lib, no DOM: runs in the browser and in
// Node tests alike. What real files carry (measured on test-real-pdfs/ before writing this):
// the Info dictionary (author's full name, creating program, dates), and in files from Adobe
// tools a large XMP packet with a page thumbnail, the edit history, document IDs that link
// versions of a file and even a path on the author's computer (/var/folders/... on a Mac).
// Photos inside a PDF may also carry EXIF (camera, GPS), XMP or IPTC in their JPEG segments.
//
// cleanPdfMetadata() removes all of that, keeps everything that is content (text, images,
// fonts, links, bookmarks, form fields, structure for screen readers) and rewrites the file
// without objects that nothing in the document refers to any more — leftovers of earlier saves.
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRawStream, PDFStream, PDFRef, PDFString, PDFHexString, PDFNumber, type PDFObject } from 'pdf-lib';

export interface MetadataReport {
  /** Info dictionary entries (key without the slash → readable value). */
  info: { key: string; value: string }[];
  /** The document has an XMP packet (catalog /Metadata). */
  xmp: boolean;
  xmpBytes: number;
  /** Things worth naming that were found inside the XMP packet. */
  xmpHistory: number;
  xmpThumbnail: boolean;
  xmpPaths: string[];
  xmpIds: boolean;
  /** XMP packets on pages, images or other objects. */
  objectXmp: number;
  /** JPEG images carrying EXIF/XMP (APP1), IPTC/Photoshop (APP13) or comments. */
  jpegWithMetadata: number;
  pageThumbnails: number;
  pieceInfo: number;
  /** Distinct names of comment/annotation authors. */
  annotationAuthors: string[];
  attachments: number;
  /** The file declares PDF/A conformance (which needs XMP). */
  pdfA: boolean;
  /** Objects no part of the document refers to (leftovers of earlier saves). */
  unreferenced: number;
  /** A filled digital signature field: rewriting the file makes that signature invalid. */
  signed: boolean;
}

export interface CleanOptions {
  /** Remove the names of the people who wrote comments (default true). */
  annotationAuthors?: boolean;
  /** Remove attached files (default false: attachments are content). */
  attachments?: boolean;
}

const decode = (v: PDFObject | undefined): string =>
  v instanceof PDFString || v instanceof PDFHexString ? v.decodeText() : v === undefined ? '' : String(v).replace(/^\//, '');

function forEachRef(value: unknown, visit: (ref: PDFRef) => void): void {
  if (value instanceof PDFRef) visit(value);
  else if (value instanceof PDFArray) value.asArray().forEach((v) => forEachRef(v, visit));
  else if (value instanceof PDFStream) forEachRef(value.dict, visit);
  else if (value instanceof PDFDict) for (const [, v] of value.entries()) forEachRef(v, visit);
}

/** Every object a reader can reach from the document root: the rest is leftover. */
function reachable(pdf: PDFDocument): Set<string> {
  const seen = new Set<string>();
  const trailer = pdf.context.trailerInfo as Record<string, unknown>;
  const stack: PDFRef[] = [];
  forEachRef(trailer.Root, (r) => stack.push(r));
  while (stack.length) {
    const ref = stack.pop()!;
    const key = ref.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    forEachRef(pdf.context.lookup(ref), (r) => stack.push(r));
  }
  return seen;
}

function streamText(s: PDFRawStream, inflate: (b: Uint8Array) => Uint8Array): string {
  const filter = String(s.dict.get(PDFName.of('Filter')) ?? '');
  let bytes = s.contents;
  if (filter === '/FlateDecode') {
    try { bytes = inflate(bytes); } catch { return ''; }
  } else if (filter) return '';
  return new TextDecoder().decode(bytes);
}

/** JPEG segments that carry metadata rather than the picture. Kept: APP0 (JFIF), APP2 (ICC
 *  colour profile) and APP14 (Adobe colour transform) — they change how the picture looks. */
const isMetadataSegment = (marker: number) => marker === 0xe1 || marker === 0xed || marker === 0xfe || (marker >= 0xe3 && marker <= 0xec) || marker === 0xef;

/** Removes metadata segments from a JPEG without re-encoding it (the picture is unchanged). */
export function stripJpegMetadata(b: Uint8Array): { bytes: Uint8Array; removed: number } {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return { bytes: b, removed: 0 };
  const keep: Uint8Array[] = [b.subarray(0, 2)];
  let i = 2;
  let removed = 0;
  while (i + 4 <= b.length && b[i] === 0xff) {
    const marker = b[i + 1]!;
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { keep.push(b.subarray(i, i + 2)); i += 2; continue; }
    if (marker === 0xda || marker === 0xd9) break; // start of the picture data: copy the rest as is
    const len = (b[i + 2]! << 8) | b[i + 3]!;
    if (len < 2 || i + 2 + len > b.length) break;
    if (isMetadataSegment(marker)) removed++;
    else keep.push(b.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  if (!removed) return { bytes: b, removed: 0 };
  keep.push(b.subarray(i));
  const out = new Uint8Array(keep.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of keep) { out.set(p, o); o += p.length; }
  return { bytes: out, removed };
}

/** A comment (markup annotation) with its author's name in /T. Form fields use /T for the
 *  field name: a merged field+widget has /FT, a widget under a field has /Parent — both kept. */
const isCommentWithAuthor = (d: PDFDict) =>
  !!d.get(PDFName.of('Subtype')) && !!d.get(PDFName.of('Rect')) && !!d.get(PDFName.of('T')) && !d.get(PDFName.of('FT')) && !d.get(PDFName.of('Parent'));

const isJpeg = (s: PDFRawStream) => String(s.dict.get(PDFName.of('Filter')) ?? '') === '/DCTDecode';

async function load(bytes: Uint8Array | ArrayBuffer): Promise<PDFDocument> {
  // updateMetadata: false — otherwise pdf-lib itself writes Producer "pdf-lib" and new dates.
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  if (pdf.isEncrypted) throw new Error('PDF jest zabezpieczony hasłem. Najpierw odblokuj dokument.');
  return pdf;
}

export async function analyzePdfMetadata(bytes: Uint8Array | ArrayBuffer): Promise<MetadataReport> {
  const pdf = await load(bytes);
  const ctx = pdf.context;
  const inflate = (await import('pako')).inflate;
  const report: MetadataReport = {
    info: [], xmp: false, xmpBytes: 0, xmpHistory: 0, xmpThumbnail: false, xmpPaths: [], xmpIds: false,
    objectXmp: 0, jpegWithMetadata: 0, pageThumbnails: 0, pieceInfo: 0, annotationAuthors: [], attachments: 0, pdfA: false, unreferenced: 0, signed: false,
  };

  const infoRef = (ctx.trailerInfo as Record<string, unknown>).Info;
  const info = infoRef instanceof PDFRef ? ctx.lookup(infoRef) : infoRef;
  if (info instanceof PDFDict) {
    for (const [k, v] of info.entries()) report.info.push({ key: k.asString().replace(/^\//, ''), value: decode(v) });
  }

  const xmpObj = pdf.catalog.lookup(PDFName.of('Metadata'));
  if (xmpObj instanceof PDFRawStream) {
    const text = streamText(xmpObj, inflate);
    report.xmp = true;
    report.xmpBytes = xmpObj.contents.length;
    report.xmpHistory = (text.match(/<stEvt:action>|stEvt:action="/g) ?? []).length;
    report.xmpThumbnail = /xmpGImg:image|xmp:Thumbnails/.test(text);
    report.xmpPaths = [...new Set([...text.matchAll(/stRef:filePath[>="]+([^<"]+)/g)].map((m) => m[1]!.trim()))];
    report.xmpIds = /xmpMM:(DocumentID|InstanceID|OriginalDocumentID)/.test(text);
    report.pdfA = /pdfaid:part/.test(text);
  }

  const authors = new Set<string>();
  for (const [, obj] of ctx.enumerateIndirectObjects()) {
    const dict = obj instanceof PDFRawStream ? obj.dict : obj instanceof PDFDict ? obj : null;
    if (!dict) continue;
    if (dict !== pdf.catalog && dict.get(PDFName.of('Metadata'))) report.objectXmp++;
    if (dict.get(PDFName.of('Thumb'))) report.pageThumbnails++;
    if (dict.get(PDFName.of('PieceInfo'))) report.pieceInfo++;
    if (String(dict.get(PDFName.of('FT'))) === '/Sig' && dict.get(PDFName.of('V'))) report.signed = true;
    if (isCommentWithAuthor(dict)) {
      const name = decode(dict.get(PDFName.of('T'))).trim();
      if (name) authors.add(name);
    }
    if (obj instanceof PDFRawStream && isJpeg(obj) && stripJpegMetadata(obj.contents).removed > 0) report.jpegWithMetadata++;
  }
  report.annotationAuthors = [...authors];

  const names = pdf.catalog.lookup(PDFName.of('Names'));
  if (names instanceof PDFDict) {
    const ef = names.lookup(PDFName.of('EmbeddedFiles'));
    if (ef instanceof PDFDict) {
      const count = (node: PDFDict): number => {
        const arr = node.lookup(PDFName.of('Names'));
        let n = arr instanceof PDFArray ? Math.floor(arr.size() / 2) : 0;
        const kids = node.lookup(PDFName.of('Kids'));
        if (kids instanceof PDFArray) for (let i = 0; i < kids.size(); i++) { const k = kids.lookup(i); if (k instanceof PDFDict) n += count(k); }
        return n;
      };
      report.attachments = count(ef);
    }
  }

  const live = reachable(pdf);
  for (const [ref] of ctx.enumerateIndirectObjects()) if (!live.has(ref.toString())) report.unreferenced++;
  return report;
}

/** Nothing personal is left: used to show the result and by the tests. */
export function reportIsClean(r: MetadataReport, opts: CleanOptions = {}): boolean {
  return r.info.length === 0 && !r.xmp && r.objectXmp === 0 && r.jpegWithMetadata === 0 && r.pageThumbnails === 0
    && r.pieceInfo === 0 && r.unreferenced === 0 && (opts.annotationAuthors === false || r.annotationAuthors.length === 0)
    && (!opts.attachments || r.attachments === 0);
}

export async function cleanPdfMetadata(bytes: Uint8Array | ArrayBuffer, opts: CleanOptions = {}): Promise<Uint8Array> {
  const removeAuthors = opts.annotationAuthors !== false;
  const pdf = await load(bytes);
  const ctx = pdf.context;
  const trailer = ctx.trailerInfo as Record<string, unknown>;

  // Info dictionary and the document's XMP packet.
  trailer.Info = undefined;
  pdf.catalog.delete(PDFName.of('Metadata'));
  pdf.catalog.delete(PDFName.of('PieceInfo'));

  if (opts.attachments) {
    const names = pdf.catalog.lookup(PDFName.of('Names'));
    if (names instanceof PDFDict) names.delete(PDFName.of('EmbeddedFiles'));
    pdf.catalog.delete(PDFName.of('AF'));
  }

  for (const [, obj] of ctx.enumerateIndirectObjects()) {
    const dict = obj instanceof PDFRawStream ? obj.dict : obj instanceof PDFDict ? obj : null;
    if (!dict) continue;
    // XMP on pages, images and fonts; page thumbnails (they can show an older version of the
    // page); applications' private data; the date a page was last changed.
    dict.delete(PDFName.of('Metadata'));
    dict.delete(PDFName.of('Thumb'));
    dict.delete(PDFName.of('PieceInfo'));
    dict.delete(PDFName.of('LastModified'));
    // Comments: who wrote them and when. Form fields also use /T (the field name) — kept.
    if (removeAuthors && isCommentWithAuthor(dict)) {
      dict.delete(PDFName.of('T'));
      dict.delete(PDFName.of('M'));
      dict.delete(PDFName.of('CreationDate'));
    }
    // A stream's /Length kept as a separate object: pdf-lib writes the length directly on save,
    // which would leave that number object behind, unreferenced. Write it directly now.
    if (obj instanceof PDFRawStream && obj.dict.get(PDFName.Length) instanceof PDFRef) {
      obj.dict.set(PDFName.Length, PDFNumber.of(obj.contents.length));
    }
    if (obj instanceof PDFRawStream && isJpeg(obj)) {
      const { bytes: stripped, removed } = stripJpegMetadata(obj.contents);
      if (removed) {
        (obj as unknown as { contents: Uint8Array }).contents = stripped;
        obj.dict.set(PDFName.Length, PDFNumber.of(stripped.length));
      }
    }
  }

  // A fresh document ID: the old one ties this copy to every other copy of the file.
  const id = new Uint8Array(16);
  crypto.getRandomValues(id);
  const hex = PDFHexString.of([...id].map((b) => b.toString(16).padStart(2, '0')).join(''));
  trailer.ID = ctx.obj([hex, hex]);

  // Objects nothing refers to any more (earlier saves, the removed XMP and Info).
  const live = reachable(pdf);
  for (const [ref] of [...ctx.enumerateIndirectObjects()]) if (!live.has(ref.toString())) ctx.delete(ref);

  return pdf.save({ useObjectStreams: false, updateFieldAppearances: false });
}
