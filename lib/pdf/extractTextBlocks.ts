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

  const sorted = [...items].sort((a, b) => {
    const yDiff = Math.abs(a.y - b.y);
    if (yDiff < 3) return a.x - b.x;
    return b.y - a.y;
  });

  const blocks: TextBlock[] = [];
  let currentLine: typeof sorted = [];
  let lineY = sorted[0].y;

  for (const item of sorted) {
    if (Math.abs(item.y - lineY) > 3) {
      if (currentLine.length > 0) {
        blocks.push(mergeLine(currentLine, pageHeight));
      }
      currentLine = [item];
      lineY = item.y;
    } else {
      const lastOnLine = currentLine[currentLine.length - 1];
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
  const textContent = await page.getTextContent();
  const viewport = page.getViewport({ scale: renderScale, rotation });

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
      fontName: item.fontName || '',
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
