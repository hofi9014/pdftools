import type { GuideArticle } from '@/types/guide';
import compressPdfHowTo from './compress-pdf/how-to-compress-pdf-online';
import mergePdfHowTo from './merge-pdf/how-to-merge-pdf-online';
import splitPdfHowTo from './split-pdf/how-to-split-pdf-online';
import protectPdfHowTo from './protect-pdf/how-to-protect-pdf-online';
import unlockPdfHowTo from './unlock-pdf/how-to-unlock-pdf-online';
import pdfToWordHowTo from './pdf-to-word/how-to-convert-pdf-to-word';
import jpgToPdfHowTo from './jpg-to-pdf/how-to-convert-jpg-to-pdf';

const guides: GuideArticle[] = [
  compressPdfHowTo,
  mergePdfHowTo,
  splitPdfHowTo,
  protectPdfHowTo,
  unlockPdfHowTo,
  pdfToWordHowTo,
  jpgToPdfHowTo,
];

export default guides;
