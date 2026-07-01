import sharp from "sharp";
import fs from "fs";
import path from "path";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  const logoBuffer = await sharp(logoPath).resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return new Response(new Uint8Array(logoBuffer), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
  });
}
