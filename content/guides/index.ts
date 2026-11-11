import type { GuideArticle } from '@/types/guide';
import compressPdfHowTo from './compress-pdf/how-to-compress-pdf-online';
import mergePdfHowTo from './merge-pdf/how-to-merge-pdf-online';
import splitPdfHowTo from './split-pdf/how-to-split-pdf-online';
import protectPdfHowTo from './protect-pdf/how-to-protect-pdf-online';
import unlockPdfHowTo from './unlock-pdf/how-to-unlock-pdf-online';
import pdfToWordHowTo from './pdf-to-word/how-to-convert-pdf-to-word';
import jpgToPdfHowTo from './jpg-to-pdf/how-to-convert-jpg-to-pdf';
import pdfToJpgHowTo from './pdf-to-jpg/how-to-convert-pdf-to-jpg';
import wordToPdfHowTo from './word-to-pdf/how-to-convert-word-to-pdf';
import signPdfHowTo from './sign-pdf/how-to-sign-pdf-online';
import ocrPdfHowTo from './ocr-pdf/how-to-ocr-pdf';
import editPdfHowTo from './edit-pdf/how-to-edit-pdf-online';
import rotatePdfHowTo from './rotate-pdf/how-to-rotate-pdf';
import deletePagesHowTo from './delete-pages/how-to-delete-pages-from-pdf';
import pdfToExcelHowTo from './pdf-to-excel/how-to-convert-pdf-to-excel';
import reorderPagesHowTo from './reorder-pages/how-to-reorder-pdf-pages';
import flattenPdfHowTo from './flatten-pdf/how-to-flatten-pdf';
import pdfToOdtHowTo from './pdf-to-openoffice/how-to-convert-pdf-to-odt';
import pdfToSvgHowTo from './pdf-to-svg/how-to-convert-pdf-to-svg';

const guides: GuideArticle[] = [
  compressPdfHowTo,
  mergePdfHowTo,
  splitPdfHowTo,
  protectPdfHowTo,
  unlockPdfHowTo,
  pdfToWordHowTo,
  jpgToPdfHowTo,
  pdfToJpgHowTo,
  wordToPdfHowTo,
  signPdfHowTo,
  ocrPdfHowTo,
  editPdfHowTo,
  rotatePdfHowTo,
  deletePagesHowTo,
  pdfToExcelHowTo,
  reorderPagesHowTo,
  flattenPdfHowTo,
  pdfToOdtHowTo,
  pdfToSvgHowTo,
];

export default guides;
