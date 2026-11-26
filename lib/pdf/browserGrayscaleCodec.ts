// The JPEG work of the grayscale tool done by the browser: decoding with createImageBitmap (the
// same decoder that shows the image on screen) and encoding with canvas.toBlob. Browsers only
// write 3-component JPEGs; the chroma channels of a gray image are flat, so they cost little.
import type { GrayscaleCodec } from './grayscale';

const QUALITY = 0.92;

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export const browserGrayscaleCodec: GrayscaleCodec = {
  async decodeJpeg(bytes) {
    const bmp = await createImageBitmap(new Blob([bytes as unknown as BlobPart], { type: 'image/jpeg' }));
    try {
      const c = canvas(bmp.width, bmp.height);
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(bmp, 0, 0);
      return { width: bmp.width, height: bmp.height, data: ctx.getImageData(0, 0, bmp.width, bmp.height).data };
    } finally {
      bmp.close();
    }
  },
  async encodeJpeg(gray, width, height) {
    const c = canvas(width, height);
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(width, height);
    for (let i = 0, j = 0; i < gray.length; i++, j += 4) {
      img.data[j] = img.data[j + 1] = img.data[j + 2] = gray[i]!;
      img.data[j + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, 'image/jpeg', QUALITY));
    if (!blob) throw new Error('JPEG encoding failed');
    return { bytes: new Uint8Array(await blob.arrayBuffer()), components: 3 };
  },
};
