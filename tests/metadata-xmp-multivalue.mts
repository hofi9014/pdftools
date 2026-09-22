// Audit finding (Medium, privacy area) — editMetadata()'s XMP-updating helper (updateXmpField
// in lib/client-pdf.ts) only ever rewrote ONE <rdf:li> inside a multi-value container — the
// x-default entry, or the first — leaving every OTHER <li> completely untouched. dc:creator
// (rdf:Seq) carries one <li> per author; dc:title/dc:description (rdf:Alt) carry one <li> per
// language variant. A PDF whose existing XMP already has several — a multi-author document, or
// Adobe/InDesign-authored output with language variants, both realistic — kept every untouched
// author/variant fully embedded in the saved file even after the user replaced or CLEARED that
// field in this tool's UI. For a privacy-oriented tool whose own docs frame it around GDPR/RODO
// scrubbing, that's exactly the metadata a user would expect removed.
//
// Fixed by treating a plain-text UI field as a full replacement: on save, every existing <li> in
// the container is dropped and exactly one new <li> is written with the new value — there is no
// way for a single text input to express "keep entry 2, only change entry 1".
//
// Proven end-to-end: build a real PDF carrying a hand-crafted XMP stream with a two-author
// dc:creator (rdf:Seq), run it through the real editMetadata(), then re-parse the SAVED PDF's own
// XMP metadata stream and confirm only the new, single author remains — the original second
// author is nowhere in the file, not just hidden from the UI's Info-dict text field.

import { DOMParser, XMLSerializer, Document as XmldomDocument } from '@xmldom/xmldom';
// lib/client-pdf.ts's applyMetadataToXmp/updateXmpField call `new DOMParser()`/`new
// XMLSerializer()` against whatever globals exist — Node has neither natively, so without these
// polyfills those calls throw, silently caught by editMetadata's `catch { xmpXml = ''; }`, which
// falls through to building a BRAND NEW xmp from scratch (trivially "fixing" the multi-<li>
// problem by sidestepping the buggy function entirely, rather than exercising it) — this must be
// installed before importing lib/client-pdf.ts, or this test would not actually test the code
// under test. (Confirmed by direct debugging: the first version of this test polyfilled
// DOMParser but forgot XMLSerializer, and every assertion passed anyway — on BOTH the fixed and
// the pre-fix code — because applyMetadataToXmp threw "XMLSerializer is not defined" every time
// and editMetadata's fallback path happened to also satisfy the same assertions.)
(globalThis as Record<string, unknown>).DOMParser = DOMParser;
(globalThis as Record<string, unknown>).XMLSerializer = XMLSerializer;
// applyMetadataToXmp also calls doc.querySelector('parsererror') to detect a failed parse —
// @xmldom/xmldom (a lightweight XML DOM, not a full browser DOM) doesn't implement
// querySelector at all, unlike a real browser's DOMParser result. Without this shim the call
// throws immediately, hitting the SAME catch-and-fallback-to-buildNewXmp path as the missing
// global above, for an unrelated reason. xmldom never produces a <parsererror>-tagged element
// (it reports parse failures via a thrown ParseError instead), so "always report no parse
// error" is a faithful shim for any well-formed fixture this test feeds in.
(XmldomDocument.prototype as unknown as { querySelector: (sel: string) => null }).querySelector = () => null;

import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import { editMetadata } from '../lib/client-pdf';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function toFile(bytes: Uint8Array, name: string): File {
  const blob = new Blob([bytes as BlobPart]);
  return Object.assign(blob, { name }) as unknown as File;
}

async function readXmpFromPdf(bytes: Uint8Array): Promise<string> {
  const pdf = await PDFDocument.load(bytes);
  const metaRef = pdf.catalog.get(PDFName.of('Metadata'));
  if (!metaRef) return '';
  const metaObj = pdf.context.lookup(metaRef as never);
  if (!(metaObj instanceof PDFRawStream)) return '';
  return new TextDecoder('utf-8').decode(metaObj.contents);
}

console.log('=== editMetadata: replacing dc:creator drops ALL prior <li> entries, not just the first ===');
{
  const pdf = await PDFDocument.create();
  pdf.addPage([400, 400]);

  const xmp = `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:creator><rdf:Seq><rdf:li>Jan Kowalski</rdf:li><rdf:li>Anna Nowak</rdf:li></rdf:Seq></dc:creator>
</rdf:Description>
</rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
  const xmpBytes = new TextEncoder().encode(xmp);
  const xmpStream = pdf.context.stream(xmpBytes, { Type: 'Metadata', Subtype: 'XML' });
  const xmpRef = pdf.context.register(xmpStream);
  pdf.catalog.set(PDFName.of('Metadata'), xmpRef);

  const sourceBytes = await pdf.save();
  const sourceXmp = await readXmpFromPdf(sourceBytes);
  const preCount = (sourceXmp.match(/<rdf:li>/g) || []).length;
  check(preCount === 2, `sanity: source fixture really has 2 authors in its XMP (found ${preCount})`);

  const file = toFile(sourceBytes, 'multi-author.pdf');
  const outBytes = await editMetadata(file, { title: 'x', author: 'Nowy Autor', subject: 'x', keywords: 'x' });
  const outXmp = await readXmpFromPdf(outBytes);

  const parser = new DOMParser();
  const doc = parser.parseFromString(outXmp, 'application/xml');
  const creatorLis = Array.from(doc.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'creator')[0]?.getElementsByTagNameNS('http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'li') || []);

  check(creatorLis.length === 1, `saved XMP has exactly 1 <li> in dc:creator, not 2 (got ${creatorLis.length})`);
  check(creatorLis[0]?.textContent === 'Nowy Autor', `the single remaining author is the NEW value (got: ${JSON.stringify(creatorLis[0]?.textContent)})`);
  check(!outXmp.includes('Anna Nowak'), 'the original second author "Anna Nowak" is NOT anywhere in the saved file\'s XMP');
  check(!outXmp.includes('Jan Kowalski'), 'the original first author "Jan Kowalski" is NOT anywhere in the saved file\'s XMP either (fully replaced, not patched)');
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
