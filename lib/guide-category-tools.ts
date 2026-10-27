import type { ToolSlug } from '@/types/guide';

/** The tool each guide category is about (the category page's call to action, the breadcrumb label).
    Kept apart from the 16-language category names so the breadcrumbs can use it in the browser
    without carrying them. */
export const categoryTool: Record<string, ToolSlug> = {
  'compress-pdf': 'compress',
  'merge-pdf': 'merge',
  'split-pdf': 'split',
  'protect-pdf': 'protect',
  'unlock-pdf': 'unlock',
  'pdf-to-word': 'word',
  'jpg-to-pdf': 'jpgTopdf',
  'pdf-to-jpg': 'images',
  'word-to-pdf': 'wordtopdf',
  'sign-pdf': 'sign',
  'ocr-pdf': 'ocr',
  'edit-pdf': 'edit',
  'rotate-pdf': 'rotate',
  'delete-pages': 'delete',
  'pdf-to-excel': 'excel',
};
