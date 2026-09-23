export interface TextBlock {
  id: string
  page: number
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  fontName: string
  text: string
  rotation: number
}

function groupIntoLines(items: { text: string; x: number; y: number; width: number; height: number; fontSize: number; fontName: string; rotation: number }[], pageHeight: number): TextBlock[] {
  if (items.length === 0) return [];

  // FINDING (2026-09-23) — `items` arrive here already run through pdf.js's
  // viewport.convertToViewportPoint() (see extractTextBlocks() below), which is CANVAS/SCREEN
  // space: y=0 at the TOP of the (already-rotation-normalized) rendered page, increasing
  // DOWNWARD — confirmed directly against pdf.js's own PageViewport.transform (rotation=0 case:
  // [scale, 0, 0, -scale, e, f], i.e. viewportY = f - scale*pdfY, so a LARGER original PDF y —
  // higher up the page — maps to a SMALLER viewport y). Top-to-bottom reading order in THIS
  // space therefore means ASCENDING y (smallest/topmost first) — but this comparator sorted
  // DESCENDING (`b.y - a.y`), which is the correct direction only for PDF-native (bottom-up)
  // coordinates, not the viewport-space values actually passed in. The result: every document
  // whose text is classified as "structured" by pdfToEpub's hasStructure gate (any bold run,
  // any detected heading, or more than one paragraph break — plain, unstyled body text instead
  // takes a separate raw-pdf.js-order fallback that never calls this function, which is why this
  // wasn't visible on every PDF) had its lines emitted in REVERSED — bottom-to-top — order.
  // Reproduced with 3 lines at y=400/380/360 (PDF space) containing one bold word: the emitted
  // paragraph read "...italic. ...bold. ...regular." instead of "...regular. ...bold. ...italic.".
  const sorted = [...items].sort((a, b) => {
    const yDiff = Math.abs(a.y - b.y);
    if (yDiff < 3) return a.x - b.x;
    return a.y - b.y;
  });

  const blocks: TextBlock[] = [];
  // Seed with the first item directly (rather than starting currentLine empty and letting
  // the loop's "continue current line" branch run on it) — that branch reads
  // currentLine[currentLine.length - 1], which is undefined the very first time through and
  // crashes on `lastOnLine.x`. Every subsequent flush already re-seeds currentLine to
  // [item] before falling through, so this special case only matters once, up front.
  let currentLine: typeof sorted = [sorted[0]!];
  let lineY = sorted[0]!.y;

  for (const item of sorted.slice(1)) {
    if (Math.abs(item.y - lineY) > 3) {
      if (currentLine.length > 0) {
        blocks.push(mergeLine(currentLine, pageHeight));
      }
      currentLine = [item];
      lineY = item.y;
    } else {
      // Safe: currentLine is seeded with 1 element above and every branch that reassigns it
      // sets it to a new non-empty [item] array, so it's never empty here.
      const lastOnLine = currentLine[currentLine.length - 1]!;
      const spaceWidth = item.fontSize * 0.3;
      const gap = item.x - (lastOnLine.x + lastOnLine.width);
      if (gap > spaceWidth * 3) {
        if (currentLine.length > 0) {
          blocks.push(mergeLine(currentLine, pageHeight));
        }
        currentLine = [item];
      } else {
        currentLine.push(item);
      }
    }
  }
  if (currentLine.length > 0) {
    blocks.push(mergeLine(currentLine, pageHeight));
  }

  return blocks;
}

function mergeLine(items: { text: string; x: number; y: number; width: number; height: number; fontSize: number; fontName: string; rotation: number }[], pageHeight: number): TextBlock {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let fontSize = 12, fontName = '', rotation = 0;
  const texts: string[] = [];

  for (const item of items) {
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + item.width);
    maxY = Math.max(maxY, item.y + item.height);
    fontSize = Math.max(fontSize, item.fontSize);
    if (item.fontName) fontName = item.fontName;
    if (item.rotation) rotation = item.rotation;
    texts.push(item.text);
  }

  const id = `tb_${Math.random().toString(36).slice(2, 9)}`;

  return {
    id,
    page: 0,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    fontSize,
    fontName,
    text: texts.join(' '),
    rotation,
  };
}

export async function extractTextBlocks(
  pdfDoc: any,
  pageNum: number,
  pageHeight: number,
  renderScale: number = 1,
  rotation: number = 0
): Promise<TextBlock[]> {
  const page = typeof pdfDoc.getPage === 'function' ? await pdfDoc.getPage(pageNum) : pdfDoc;
  // FINDING (2026-09-22): pdf.js's TextItem.fontName is NOT the real font name — it's an
  // internal, sequentially-assigned object id ("g_d0_f1", "g_d0_f2", ...) that pdf.js hands out
  // while parsing, with zero relationship to the PDF's actual /BaseFont value. Every consumer of
  // TextBlock.fontName that tries substring-matching it for "bold"/"italic" (pdfToEpub's
  // isBoldFont/isItalicFont in lib/client-pdf.ts) silently never matches anything, since the
  // alias never contains those words — confirmed empirically: drawing text with
  // StandardFonts.HelveticaBold still reports fontName "g_d0_f1", not "Helvetica-Bold". The real
  // name IS resolvable, via page.commonObjs (populated once the operator list has been walked)
  // — commonObjs.get(alias).name gives the true BaseFont name ("Helvetica-Bold",
  // "Helvetica-Oblique", etc).
  await page.getOperatorList();
  const textContent = await page.getTextContent();
  const viewport = page.getViewport({ scale: renderScale, rotation });

  const resolveFontName = (alias: string): string => {
    if (!alias) return '';
    try {
      const obj = page.commonObjs.get(alias);
      return (obj && typeof obj.name === 'string' && obj.name) || alias;
    } catch {
      return alias;
    }
  };

  const items = textContent.items.map((item: any) => {
    const transform = item.transform || [1, 0, 0, 1, 0, 0];
    const fontSize = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]) || item.height || 12;
    const itemRotation = Math.atan2(transform[1], transform[0]) * (180 / Math.PI);

    let x = transform[4];
    let y = transform[5];
    let w = (item.width || 0) * renderScale;
    let h = (item.height || fontSize * 0.3) * renderScale;
    let fs = fontSize * renderScale;

    const [vx, vy] = viewport.convertToViewportPoint(x, y);
    x = vx;
    y = vy;

    return {
      text: item.str || '',
      x,
      y,
      width: w,
      height: h,
      fontSize: fs,
      fontName: resolveFontName(item.fontName),
      rotation: itemRotation,
    };
  }).filter((item: any) => item.text.trim().length > 0);

  return groupIntoLines(items, pageHeight);
}

export async function extractAllTextBlocks(pdfjsDoc: any, renderScale: number): Promise<TextBlock[]> {
  const allBlocks: TextBlock[] = [];
  for (let i = 1; i <= pdfjsDoc.numPages; i++) {
    const page = await pdfjsDoc.getPage(i);
    const viewport = page.getViewport({ scale: renderScale, rotation: page.rotate });
    const blocks = await extractTextBlocks(page, i, viewport.height, renderScale, page.rotate);
    blocks.forEach(b => { b.page = i; });
    allBlocks.push(...blocks);
  }
  return allBlocks;
}
