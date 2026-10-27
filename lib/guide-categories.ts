import type { Locale } from '@/lib/i18n';

/** The name of each guide category in every language — shared by the guides hub and the category pages. */
export const categoryLabels: Record<string, Record<Locale, string>> = {
  'compress-pdf': {
    pl: 'Kompresja PDF', en: 'Compress PDF', de: 'PDF-Komprimierung',
    es: 'Comprimir PDF', fr: 'Compresser PDF', it: 'Comprimere PDF',
    pt: 'Comprimir PDF', sv: 'Komprimera PDF', no: 'Komprimere PDF',
    is: 'Þjappa PDF', tr: 'PDF Sıkıştırma', ar: 'ضغط PDF',
    fa: 'فشرده‌سازی PDF', hi: 'PDF संपीड़न', ja: 'PDF圧縮', zh: '压缩PDF',
  },
  'merge-pdf': {
    pl: 'Łączenie PDF', en: 'Merge PDF', de: 'PDF-Zusammenfügung',
    es: 'Combinar PDF', fr: 'Fusionner PDF', it: 'Unire PDF',
    pt: 'Unir PDF', sv: 'Slå ihop PDF', no: 'Slå sammen PDF',
    is: 'Sameina PDF', tr: 'PDF Birleştirme', ar: 'دمج PDF',
    fa: 'ادغام PDF', hi: 'PDF मर्ज करें', ja: 'PDF結合', zh: '合并PDF',
  },
  'split-pdf': {
    pl: 'Dzielenie PDF', en: 'Split PDF', de: 'PDF-Teilung',
    es: 'Dividir PDF', fr: 'Diviser PDF', it: 'Dividere PDF',
    pt: 'Dividir PDF', sv: 'Dela PDF', no: 'Dele PDF',
    is: 'Skipta PDF', tr: 'PDF Bölme', ar: 'تقسيم PDF',
    fa: 'تقسیم PDF', hi: 'PDF विभाजित करें', ja: 'PDF分割', zh: '拆分PDF',
  },
  'protect-pdf': {
    pl: 'Zabezpieczanie PDF', en: 'Protect PDF', de: 'PDF-Schutz',
    es: 'Proteger PDF', fr: 'Protéger PDF', it: 'Proteggere PDF',
    pt: 'Proteger PDF', sv: 'Skydda PDF', no: 'Beskytt PDF',
    is: 'Vernda PDF', tr: 'PDF Koruma', ar: 'حماية PDF',
    fa: 'محافظت از PDF', hi: 'PDF सुरक्षित करें', ja: 'PDF保護', zh: '保护PDF',
  },
  'unlock-pdf': {
    pl: 'Odblokowywanie PDF', en: 'Unlock PDF', de: 'PDF-Entsperrung',
    es: 'Desbloquear PDF', fr: 'Déverrouiller PDF', it: 'Sbloccare PDF',
    pt: 'Desbloquear PDF', sv: 'Lås upp PDF', no: 'Lås opp PDF',
    is: 'Opna PDF', tr: 'PDF Kilidini Aç', ar: 'فتح قفل PDF',
    fa: 'باز کردن قفل PDF', hi: 'PDF अनलॉक करें', ja: 'PDFロック解除', zh: '解锁PDF',
  },
  'pdf-to-word': {
    pl: 'PDF do Worda', en: 'PDF to Word', de: 'PDF zu Word',
    es: 'PDF a Word', fr: 'PDF vers Word', it: 'PDF in Word',
    pt: 'PDF para Word', sv: 'PDF till Word', no: 'PDF til Word',
    is: 'PDF í Word', tr: 'PDF\'den Word\'e', ar: 'PDF إلى Word',
    fa: 'PDF به Word', hi: 'PDF से Word', ja: 'PDFからWordへ', zh: 'PDF转Word',
  },
  'jpg-to-pdf': {
    pl: 'JPG do PDF', en: 'JPG to PDF', de: 'JPG zu PDF',
    es: 'JPG a PDF', fr: 'JPG en PDF', it: 'JPG in PDF',
    pt: 'JPG para PDF', sv: 'JPG till PDF', no: 'JPG til PDF',
    is: 'JPG í PDF', tr: 'JPG\'den PDF\'ye', ar: 'JPG إلى PDF',
    fa: 'JPG به PDF', hi: 'JPG से PDF', ja: 'JPGからPDFへ', zh: 'JPG转PDF',
  },
  'pdf-to-jpg': {
    pl: 'PDF do JPG', en: 'PDF to JPG', de: 'PDF zu JPG',
    es: 'PDF a JPG', fr: 'PDF en JPG', it: 'PDF in JPG',
    pt: 'PDF para JPG', sv: 'PDF till JPG', no: 'PDF til JPG',
    is: 'PDF í JPG', tr: "PDF'den JPG'ye", ar: 'PDF إلى JPG',
    fa: 'PDF به JPG', hi: 'PDF से JPG', ja: 'PDFからJPGへ', zh: 'PDF转JPG',
  },
  'word-to-pdf': {
    pl: 'Word do PDF', en: 'Word to PDF', de: 'Word zu PDF',
    es: 'Word a PDF', fr: 'Word en PDF', it: 'Word in PDF',
    pt: 'Word para PDF', sv: 'Word till PDF', no: 'Word til PDF',
    is: 'Word í PDF', tr: "Word'den PDF'ye", ar: 'Word إلى PDF',
    fa: 'Word به PDF', hi: 'Word से PDF', ja: 'WordからPDFへ', zh: 'Word转PDF',
  },
  'sign-pdf': {
    pl: 'Podpisywanie PDF', en: 'Sign PDF', de: 'PDF unterschreiben',
    es: 'Firmar PDF', fr: 'Signer un PDF', it: 'Firmare PDF',
    pt: 'Assinar PDF', sv: 'Signera PDF', no: 'Signere PDF',
    is: 'Undirrita PDF', tr: 'PDF İmzalama', ar: 'توقيع PDF',
    fa: 'امضای PDF', hi: 'PDF पर हस्ताक्षर', ja: 'PDF署名', zh: '签署PDF',
  },
  'ocr-pdf': {
    pl: 'OCR PDF', en: 'OCR PDF', de: 'OCR für PDF',
    es: 'OCR de PDF', fr: 'OCR de PDF', it: 'OCR PDF',
    pt: 'OCR de PDF', sv: 'OCR för PDF', no: 'OCR for PDF',
    is: 'OCR fyrir PDF', tr: 'PDF OCR', ar: 'التعرف الضوئي على PDF',
    fa: 'OCR برای PDF', hi: 'PDF OCR', ja: 'PDF OCR', zh: 'PDF文字识别',
  },
  'edit-pdf': {
    pl: 'Edycja PDF', en: 'Edit PDF', de: 'PDF bearbeiten',
    es: 'Editar PDF', fr: 'Modifier un PDF', it: 'Modificare PDF',
    pt: 'Editar PDF', sv: 'Redigera PDF', no: 'Redigere PDF',
    is: 'Breyta PDF', tr: 'PDF Düzenleme', ar: 'تحرير PDF',
    fa: 'ویرایش PDF', hi: 'PDF संपादन', ja: 'PDF編集', zh: '编辑PDF',
  },
};

export { categoryTool } from '@/lib/guide-category-tools';

export function getCategoryLabel(category: string, locale: Locale): string {
  return categoryLabels[category]?.[locale] || category;
}
