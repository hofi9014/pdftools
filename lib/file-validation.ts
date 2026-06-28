const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46]; // %PDF
const ZIP_MAGIC_BYTES = [0x50, 0x4B, 0x03, 0x04]; // PK\x03\x04
const XLSX_MAGIC_BYTES = [0x50, 0x4B, 0x03, 0x04]; // PK\x03\x04 (same as ZIP/OOXML)
const PNG_MAGIC_BYTES = [0x89, 0x50, 0x4E, 0x47]; // PNG
const JPEG_MAGIC_BYTES = [0xFF, 0xD8, 0xFF];

function matchesMagic(buffer: Buffer, magic: number[]): boolean {
  if (buffer.length < magic.length) return false;
  return magic.every((byte, i) => buffer[i] === byte);
}

export function isPDF(buffer: Buffer): boolean {
  return matchesMagic(buffer, PDF_MAGIC_BYTES);
}

export function isZIP(buffer: Buffer): boolean {
  return matchesMagic(buffer, ZIP_MAGIC_BYTES);
}

export function isImage(buffer: Buffer): boolean {
  return matchesMagic(buffer, PNG_MAGIC_BYTES) || matchesMagic(buffer, JPEG_MAGIC_BYTES);
}

export function validatePDF(buffer: Buffer): void {
  if (!isPDF(buffer)) {
    throw new Error('Przesłany plik nie jest prawidłowym plikiem PDF.');
  }
}

export function validateImage(buffer: Buffer): void {
  if (!isImage(buffer)) {
    throw new Error('Przesłany plik nie jest prawidłowym plikiem obrazu.');
  }
}
