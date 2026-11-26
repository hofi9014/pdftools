// Colour → gray for the grayscale tool (plan 2.6). Gray is the luminance of the colour as a viewer
// shows it on screen (sRGB values, ITU-R BT.601 weights — the usual grayscale conversion), so the
// converted page has the same light and dark as the original.

/** Luminance of an sRGB colour, components 0..1 → 0..1. */
export function rgbToGray(r: number, g: number, b: number): number {
  return clamp01(0.299 * r + 0.587 * g + 0.114 * b);
}

/**
 * DeviceCMYK → sRGB the way pdf.js draws it (a polynomial fit of a coated-paper profile), so the
 * gray matches what the reader saw. Coefficients from pdf.js src/core/colorspace.js
 * (DeviceCmykCS), Copyright Mozilla Foundation, Apache License 2.0.
 */
export function cmykToRgb(c: number, m: number, y: number, k: number): [number, number, number] {
  const r = 255 + c * (-4.387332384609988 * c + 54.48615194189176 * m + 18.82290502165302 * y + 212.25662451639585 * k + -285.2331026137004) + m * (1.7149763477362134 * m - 5.6096736904047315 * y + -17.873870861415444 * k - 5.497006427196366) + y * (-2.5217340131683033 * y - 21.248923337353073 * k + 17.5119270841813) + k * (-21.86122147463605 * k - 189.48180835922747);
  const g = 255 + c * (8.841041422036149 * c + 60.118027045597366 * m + 6.871425592049007 * y + 31.159100130055922 * k + -79.2970844816548) + m * (-15.310361306967817 * m + 17.575251261109482 * y + 131.35250912493976 * k - 190.9453302588951) + y * (4.444339102852739 * y + 9.8632861493405 * k - 24.86741582555878) + k * (-20.737325471181034 * k - 187.80453709719578);
  const b = 255 + c * (0.8842522430003296 * c + 8.078677503112928 * m + 30.89978309703729 * y - 0.23883238689178934 * k + -14.183576799673286) + m * (10.49593273432072 * m + 63.02378494754052 * y + 50.606957656360734 * k - 112.23884253719248) + y * (0.03296041114873217 * y + 115.60384449646641 * k + -193.58209356861505) + k * (-22.33816807309886 * k - 180.12613974708367);
  return [clamp01(r / 255), clamp01(g / 255), clamp01(b / 255)];
}

export function cmykToGray(c: number, m: number, y: number, k: number): number {
  const [r, g, b] = cmykToRgb(c, m, y, k);
  return rgbToGray(r, g, b);
}

/** CIE L* (0..100) → sRGB gray of the same lightness. */
export function labToGray(l: number): number {
  const fy = (l + 16) / 116;
  const yLin = l > 8 ? fy * fy * fy : l / 903.3;
  const v = yLin <= 0.0031308 ? 12.92 * yLin : 1.055 * Math.pow(yLin, 1 / 2.4) - 0.055;
  return clamp01(v);
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** A number written compactly for a content stream (at most 4 decimals). */
export function fmt(v: number): string {
  const s = (Math.round(v * 10000) / 10000).toString();
  return s === '-0' ? '0' : s;
}
