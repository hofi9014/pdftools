// OpenDocument (.odt) writer for the fixed page layout. A 1 pt paragraph starts each page and
// anchors the page picture and the photos behind the text. The text itself is written in one of
// two ways:
//   - as text frames (the default): every block of text is a Writer frame of its own, anchored
//     at its place — it can be moved or deleted on its own and its text wraps inside it. Which
//     XML makes a real, see-through frame that survives OpenOffice's own "Save" was measured;
//     see fixedFrames.ts and the three styles it needs here ("Frame", "Standard",
//     "Frame contents" in styles.xml);
//   - as body paragraphs (textBoxes: false), the same construction as the Word writer
//     (fixedLayoutDocx.ts) in ODF terms: paragraphs with a fixed line height and top margin, tab
//     stops (never combined with an indent, so it does not matter whether a reader counts tab
//     positions from the indent or from the margin), and borderless tables for side-by-side
//     columns.

import type { FixedBlock, FixedColumnsBlock, FixedLine, FixedRun, FixedTextBlock, MeasureText } from './fixedLayout';
import { FIXED_AFTER_TABLE_PT, FIXED_PAGE_HEAD_PT } from './fixedLayout';
import type { FixedPage } from './fixedLayoutDocx';
import { buildPageFrames, softParagraphRuns, type FixedFrame } from './fixedFrames';

export interface FixedOdtOptions {
  /**
   * Text as frames anchored at their place (the default) instead of body paragraphs positioned
   * by spacing — see fixedFrames.ts for why, and for what was measured in OpenOffice.
   */
  textBoxes?: boolean;
  /** Text metrics of the written fonts; with them running text becomes real, wrapping paragraphs. */
  measure?: MeasureText;
}

const NS = {
  office: 'urn:oasis:names:tc:opendocument:xmlns:office:1.0',
  style: 'urn:oasis:names:tc:opendocument:xmlns:style:1.0',
  text: 'urn:oasis:names:tc:opendocument:xmlns:text:1.0',
  draw: 'urn:oasis:names:tc:opendocument:xmlns:drawing:1.0',
  svg: 'urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0',
  table: 'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
  fo: 'urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0',
  xlink: 'http://www.w3.org/1999/xlink',
  manifest: 'urn:oasis:names:tc:opendocument:xmlns:manifest:1.0',
  meta: 'urn:oasis:names:tc:opendocument:xmlns:meta:1.0',
};
const ODT_MIME = 'application/vnd.oasis.opendocument.text';

const pt = (v: number): string => `${Math.round(v * 100) / 100}pt`;
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Runs of two or more spaces collapse in ODF unless written as <text:s/>. */
function odtText(s: string): string {
  return esc(s.replace(/\t/g, ' ')).replace(/ {2,}/g, (m) => ` <text:s text:c="${m.length - 1}"/>`).replace(/^ /, '<text:s/>');
}

/** Names for automatic styles, one per distinct set of properties. */
class StyleBook {
  private readonly names = new Map<string, string>();
  private readonly xml: string[] = [];
  constructor(private readonly prefix: string) {}
  name(key: string, build: (name: string) => string): string {
    let n = this.names.get(key);
    if (!n) {
      n = `${this.prefix}${this.names.size + 1}`;
      this.names.set(key, n);
      this.xml.push(build(n));
    }
    return n;
  }
  toXml(): string { return this.xml.join('\n'); }
}

function fnv(bytes: Uint8Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]!; h = Math.imul(h, 0x01000193); }
  return `${bytes.length}-${(h >>> 0).toString(16)}`;
}

export async function renderFixedPagesToOdt(pages: FixedPage[], options: FixedOdtOptions = {}): Promise<Blob> {
  const textBoxes = options.textBoxes !== false;
  const paraStyles = new StyleBook('FP');
  const textStyles = new StyleBook('FT');
  const tableStyles: string[] = [];
  const fonts = new Set<string>(['Arial']);
  const pictures = new Map<string, { path: string; media: string; data: Uint8Array }>();
  let tableCount = 0;
  let frameCount = 0;

  const textStyle = (r: FixedRun): string => {
    fonts.add(r.font);
    // A link keeps the colour it has in the PDF, and its underline is part of the page picture.
    const color = r.color;
    const underline = !!r.underline;
    const raise = Math.abs(r.raise) >= 0.5 ? Math.round(r.raise / r.fontSize * 100) : 0;
    const key = [r.font, r.fontSize.toFixed(2), r.bold, r.italic, color, underline, r.scale, r.spacingTw, raise].join('|');
    return textStyles.name(key, (name) => {
      const props = [
        `style:font-name="${esc(r.font)}"`,
        `fo:font-size="${pt(Math.max(1, r.fontSize))}"`,
        `fo:color="#${color}"`,
        // The widths were fitted from plain glyph advances, so no pair kerning.
        'style:letter-kerning="false"',
      ];
      if (r.bold) props.push('fo:font-weight="bold"');
      if (r.italic) props.push('fo:font-style="italic"');
      if (underline) props.push('style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"');
      if (r.scale !== 100) props.push(`style:text-scale="${r.scale}%"`);
      if (r.spacingTw !== 0) props.push(`fo:letter-spacing="${pt(r.spacingTw / 20)}"`);
      if (raise !== 0) props.push(`style:text-position="${raise}% 100%"`);
      return `    <style:style style:name="${name}" style:family="text"><style:text-properties ${props.join(' ')}/></style:style>`;
    });
  };

  const runXml = (r: FixedRun): string => {
    const span = `<text:span text:style-name="${textStyle(r)}">${odtText(r.text)}</text:span>`;
    return r.link ? `<text:a xlink:type="simple" xlink:href="${esc(r.link)}">${span}</text:a>` : span;
  };

  const lineXml = (line: FixedLine, useTabs: boolean): string =>
    line.segments.map((seg) => (useTabs ? '<text:tab/>' : '') + seg.runs.map(runXml).join('')).join('');

  interface ParaProps { before: number; line: number; indent?: number; tabs?: number[]; master?: string; breakBefore?: boolean }
  const paraStyle = (p: ParaProps): string => {
    const key = [p.before.toFixed(2), p.line.toFixed(2), (p.indent ?? 0).toFixed(2), (p.tabs ?? []).map((t) => t.toFixed(2)).join(','), p.master ?? '', p.breakBefore ? 'b' : ''].join('|');
    return paraStyles.name(key, (name) => {
      const props = [
        `fo:margin-top="${pt(p.before)}"`, 'fo:margin-bottom="0pt"', `fo:margin-left="${pt(p.indent ?? 0)}"`, 'fo:margin-right="0pt"',
        'fo:text-indent="0pt"', `fo:line-height="${pt(Math.max(0.05, p.line))}"`, 'fo:orphans="0"', 'fo:widows="0"',
      ];
      if (p.breakBefore) props.push('fo:break-before="page"');
      const tabs = p.tabs && p.tabs.length > 0
        ? `<style:tab-stops>${p.tabs.map((t) => `<style:tab-stop style:position="${pt(Math.max(0.05, t))}"/>`).join('')}</style:tab-stops>`
        : '';
      const master = p.master ? ` style:master-page-name="${p.master}"` : '';
      return `    <style:style style:name="${name}" style:family="paragraph"${master}><style:paragraph-properties ${props.join(' ')}>${tabs}</style:paragraph-properties><style:text-properties fo:font-size="1pt" style:font-name="Arial"/></style:style>`;
    });
  };

  const tiny = (): string => `<text:p text:style-name="${paraStyle({ before: 0, line: FIXED_AFTER_TABLE_PT })}"/>`;

  // Paragraphs inside frames: an exact line height (its baseline lies four fifths of it below
  // the line's top — see fixedFrames.ts), no margins. Their parent is "Frame contents", a style
  // that has to exist in styles.xml: without the common paragraph styles OpenOffice drops the
  // whole paragraph format of every frame when it saves the document again (measured: the
  // paragraphs came back as bare <text:p>, without line height, font or size).
  const frameParaStyles = new StyleBook('FB');
  const frameParaStyle = (frame: FixedFrame): string =>
    frameParaStyles.name(`${frame.lineHeight.toFixed(2)}|${frame.align}`, (name) =>
      `    <style:style style:name="${name}" style:family="paragraph" style:parent-style-name="Frame_20_contents"><style:paragraph-properties fo:margin-top="0pt" fo:margin-bottom="0pt" fo:margin-left="0pt" fo:margin-right="0pt" fo:text-indent="0pt" fo:line-height="${pt(frame.lineHeight)}" fo:text-align="${frame.align}" fo:orphans="0" fo:widows="0"/><style:text-properties fo:font-size="1pt" style:font-name="Arial"/></style:style>`);
  const frameXml = (frame: FixedFrame, z: number): string => {
    const text = frame.wrap === 'soft'
      ? softParagraphRuns(frame.lines).map(runXml).join('')
      : frame.lines.map((runs) => runs.map(runXml).join('')).join('<text:line-break/>');
    return `<draw:frame draw:style-name="FxTx" draw:name="Text${++frameCount}" text:anchor-type="paragraph" svg:x="${pt(frame.x)}" svg:y="${pt(frame.y)}" svg:width="${pt(frame.width)}" draw:z-index="${z}"><draw:text-box fo:min-height="1pt"><text:p text:style-name="${frameParaStyle(frame)}">${text}</text:p></draw:text-box></draw:frame>`;
  };

  const emitBlocks = (blocks: FixedBlock[], originX: number, startY: number): string[] => {
    const out: string[] = [];
    let exact = startY;

    const emitText = (b: FixedTextBlock): void => {
      const single = b.lines.every((l) => l.segments.length === 1);
      if (single) {
        const style = paraStyle({ before: b.before, line: b.lineHeight, indent: Math.max(0, b.lines[0]!.segments[0]!.x - originX) });
        out.push(`<text:p text:style-name="${style}">${b.lines.map((l) => lineXml(l, false)).join('<text:line-break/>')}</text:p>`);
      } else {
        const line = b.lines[0]!;
        const style = paraStyle({ before: b.before, line: b.lineHeight, tabs: line.segments.map((s) => s.x - originX) });
        out.push(`<text:p text:style-name="${style}">${lineXml(line, true)}</text:p>`);
      }
      exact += b.before + b.lineHeight * b.lines.length;
    };

    const emitColumns = (b: FixedColumnsBlock): void => {
      const id = ++tableCount;
      const name = `FxT${id}`;
      const widths = b.columns.map((c) => Math.max(1, c.width));
      const height = Math.max(1, b.top + b.height - exact);
      tableStyles.push(
        `    <style:style style:name="${name}" style:family="table"><style:table-properties style:width="${pt(widths.reduce((a, w) => a + w, 0))}" table:align="left" fo:margin-left="${pt(Math.max(0, b.columns[0]!.x - originX))}" fo:margin-top="0pt" fo:margin-bottom="0pt"/></style:style>`,
        ...widths.map((w, i) => `    <style:style style:name="${name}.c${i + 1}" style:family="table-column"><style:table-column-properties style:column-width="${pt(w)}"/></style:style>`),
        `    <style:style style:name="${name}.r" style:family="table-row"><style:table-row-properties style:min-row-height="${pt(height)}" fo:keep-together="always"/></style:style>`,
      );
      const cells = b.columns.map((c) => {
        const inner = emitBlocks(c.blocks, c.x, b.top);
        const last = c.blocks[c.blocks.length - 1];
        if (!last || last.kind === 'columns') inner.push(tiny());
        return `<table:table-cell table:style-name="FxCell" office:value-type="string">${inner.join('')}</table:table-cell>`;
      });
      out.push(
        `<table:table table:name="${name}" table:style-name="${name}">` +
        widths.map((_w, i) => `<table:table-column table:style-name="${name}.c${i + 1}"/>`).join('') +
        `<table:table-row table:style-name="${name}.r">${cells.join('')}</table:table-row></table:table>`,
        tiny(),
      );
      exact = b.top + b.height + FIXED_AFTER_TABLE_PT;
    };

    for (const b of blocks) {
      if (b.kind === 'text') emitText(b);
      else emitColumns(b);
    }
    return out;
  };

  // One page layout (and master page) per page size.
  const masters = new Map<string, { name: string; width: number; height: number }>();
  const body: string[] = [];
  let currentMaster = '';
  pages.forEach((page, pageIdx) => {
    const { layout } = page;
    const sizeKey = `${layout.width.toFixed(1)}x${layout.height.toFixed(1)}`;
    let master = masters.get(sizeKey);
    if (!master) {
      master = { name: `Fx${masters.size + 1}`, width: layout.width, height: layout.height };
      masters.set(sizeKey, master);
    }
    const switchMaster = master.name !== currentMaster;
    currentMaster = master.name;
    // A paragraph that names a master page starts a new page with it; otherwise a plain break.
    const head = paraStyle({
      before: 0,
      line: FIXED_PAGE_HEAD_PT,
      ...(switchMaster ? { master: master.name } : pageIdx > 0 ? { breakBefore: true } : {}),
    });
    let frame = '';
    if (page.background) {
      const key = fnv(page.background.data);
      let pic = pictures.get(key);
      if (!pic) {
        const ext = page.background.mime === 'image/png' ? 'png' : 'jpg';
        pic = { path: `Pictures/page${pictures.size + 1}.${ext}`, media: page.background.mime, data: page.background.data };
        pictures.set(key, pic);
      }
      frame = `<draw:frame draw:style-name="FxBg" draw:name="Page${++frameCount}" text:anchor-type="paragraph" svg:x="0pt" svg:y="0pt" svg:width="${pt(layout.width)}" svg:height="${pt(layout.height)}" draw:z-index="0"><draw:image xlink:href="${pic.path}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame>`;
    }
    // The page's photos: pictures of their own above the page picture, still behind the text.
    (page.pictures ?? []).forEach((photo, i) => {
      const key = fnv(photo.data);
      let pic = pictures.get(key);
      if (!pic) {
        const ext = photo.mime === 'image/png' ? 'png' : 'jpg';
        pic = { path: `Pictures/photo${pictures.size + 1}.${ext}`, media: photo.mime, data: photo.data };
        pictures.set(key, pic);
      }
      frame += `<draw:frame draw:style-name="FxBg" draw:name="Photo${++frameCount}" text:anchor-type="paragraph" svg:x="${pt(photo.x)}" svg:y="${pt(photo.y)}" svg:width="${pt(photo.width)}" svg:height="${pt(photo.height)}" draw:z-index="${i + 1}"><draw:image xlink:href="${pic.path}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame>`;
    });
    if (textBoxes) {
      // Every block of text is a frame of its own, above the pictures; the body holds nothing
      // but the 1 pt paragraph that starts the page and anchors them all.
      const first = (page.pictures?.length ?? 0) + 1;
      frame += buildPageFrames(layout, options.measure).map((f, i) => frameXml(f, first + i)).join('');
      body.push(`<text:p text:style-name="${head}">${frame}</text:p>`);
    } else {
      body.push(`<text:p text:style-name="${head}">${frame}</text:p>`);
      body.push(...emitBlocks(layout.blocks, 0, FIXED_PAGE_HEAD_PT));
    }
  });

  const fontDecls = [...fonts].map((f) => `    <style:font-face style:name="${esc(f)}" svg:font-family="${esc(/\s/.test(f) ? `'${f}'` : f)}"/>`).join('\n');
  const content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="${NS.office}" xmlns:text="${NS.text}" xmlns:style="${NS.style}" xmlns:fo="${NS.fo}" xmlns:draw="${NS.draw}" xmlns:svg="${NS.svg}" xmlns:table="${NS.table}" xmlns:xlink="${NS.xlink}" office:version="1.2">
  <office:font-face-decls>
${fontDecls}
  </office:font-face-decls>
  <office:automatic-styles>
${textStyles.toXml()}
${paraStyles.toXml()}
${frameParaStyles.toXml()}
${tableStyles.join('\n')}
    <style:style style:name="FxTx" style:family="graphic" style:parent-style-name="Frame"><style:graphic-properties fo:padding="0pt" fo:border="none" fo:margin="0pt" style:wrap="run-through" style:run-through="foreground" style:horizontal-pos="from-left" style:horizontal-rel="page" style:vertical-pos="from-top" style:vertical-rel="page" fo:background-color="#ffffff" style:background-transparency="100%"/></style:style>
    <style:style style:name="FxCell" style:family="table-cell"><style:table-cell-properties fo:padding="0pt" fo:border="none"/></style:style>
    <style:style style:name="FxBg" style:family="graphic"><style:graphic-properties style:wrap="run-through" style:run-through="background" style:horizontal-pos="from-left" style:horizontal-rel="page" style:vertical-pos="from-top" style:vertical-rel="page" fo:border="none" fo:padding="0pt" fo:margin="0pt"/></style:style>
  </office:automatic-styles>
  <office:body>
    <office:text>
${body.join('\n')}
    </office:text>
  </office:body>
</office:document-content>`;

  const masterList = [...masters.values()];
  if (masterList.length === 0) masterList.push({ name: 'Fx1', width: 595, height: 842 });
  const styles = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="${NS.office}" xmlns:style="${NS.style}" xmlns:text="${NS.text}" xmlns:fo="${NS.fo}" xmlns:draw="${NS.draw}" xmlns:svg="${NS.svg}" office:version="1.2">
  <office:font-face-decls>
${fontDecls}
  </office:font-face-decls>
  <office:styles>
    <style:default-style style:family="paragraph"><style:paragraph-properties fo:margin-top="0pt" fo:margin-bottom="0pt"/><style:text-properties style:font-name="Arial" fo:font-size="10pt"/></style:default-style>
    <style:style style:name="Standard" style:family="paragraph" style:class="text"/>
    <style:style style:name="Frame_20_contents" style:display-name="Frame contents" style:family="paragraph" style:parent-style-name="Standard" style:class="extra"/>
    <style:style style:name="Frame" style:family="graphic"><style:graphic-properties text:anchor-type="paragraph" svg:x="0pt" svg:y="0pt" style:wrap="run-through" style:vertical-pos="from-top" style:vertical-rel="page" style:horizontal-pos="from-left" style:horizontal-rel="page" fo:padding="0pt" fo:border="none"/></style:style>
  </office:styles>
  <office:automatic-styles>
${masterList.map((m) => `    <style:page-layout style:name="pm${m.name}"><style:page-layout-properties fo:page-width="${pt(m.width)}" fo:page-height="${pt(m.height)}" style:print-orientation="${m.width > m.height ? 'landscape' : 'portrait'}" fo:margin-top="0pt" fo:margin-bottom="0pt" fo:margin-left="0pt" fo:margin-right="0pt"/></style:page-layout>`).join('\n')}
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="Standard" style:page-layout-name="pm${masterList[0]!.name}"/>
${masterList.map((m) => `    <style:master-page style:name="${m.name}" style:page-layout-name="pm${m.name}"/>`).join('\n')}
  </office:master-styles>
</office:document-styles>`;

  const pics = [...pictures.values()];
  const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="${NS.manifest}" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="${ODT_MIME}"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
${pics.map((p) => `  <manifest:file-entry manifest:full-path="${p.path}" manifest:media-type="${p.media}"/>`).join('\n')}
</manifest:manifest>`;

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  // The mimetype must be the first entry and stored uncompressed.
  zip.file('mimetype', ODT_MIME, { compression: 'STORE' });
  zip.file('content.xml', content);
  zip.file('styles.xml', styles);
  zip.file('meta.xml', `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="${NS.office}" xmlns:meta="${NS.meta}" office:version="1.2">
  <office:meta><meta:generator>OptimaPDF</meta:generator></office:meta>
</office:document-meta>`);
  zip.file('META-INF/manifest.xml', manifest);
  for (const p of pics) zip.file(p.path, p.data);
  return zip.generateAsync({ type: 'blob', mimeType: ODT_MIME, compression: 'DEFLATE' });
}
