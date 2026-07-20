import sharp from "sharp";
import { readFileSync, statSync } from "fs";
import { createHash } from "crypto";
import path from "path";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  const { mtime } = statSync(logoPath);
  const logoData = readFileSync(logoPath);
  const etag = `"${createHash("md5").update(logoData).digest("hex")}"`;
  const logoBuffer = await sharp(logoData).resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return new Response(new Uint8Array(logoBuffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, must-revalidate",
      "ETag": etag,
      "Last-Modified": mtime.toUTCString(),
    },
  });
}
