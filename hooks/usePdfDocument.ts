'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { initPdfjs } from '@/lib/client-pdf';

export interface PdfPageInfo {
  pageNum: number
  width: number
  height: number
}

export function usePdfDocument() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pages, setPages] = useState<PdfPageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const docRef = useRef<any>(null);
  const pdfjsDocRef = useRef<any>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  const loadFile = useCallback(async (f: File) => {
    setLoading(true);
    setError('');
    setFile(f);
    setCurrentPage(1);
    canvasRefs.current = new Map();

    try {
      const pdfjsLib = await import('pdfjs-dist');
      await initPdfjs();
      const buf = await f.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
      pdfjsDocRef.current = doc;

      const pageInfo: PdfPageInfo[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 1 });
        pageInfo.push({ pageNum: i, width: vp.width, height: vp.height });
      }
      setPages(pageInfo);
      setPageCount(doc.numPages);
      docRef.current = pdfjsDocRef.current;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const renderPage = useCallback(async (pageNum: number, scale: number = 1.5): Promise<{ canvas: HTMLCanvasElement; width: number; height: number } | null> => {
    const doc = pdfjsDocRef.current;
    if (!doc) return null;
    try {
      const page = await doc.getPage(pageNum);
      const vp = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
      canvasRefs.current.set(pageNum, canvas);
      return { canvas, width: vp.width, height: vp.height };
    } catch {
      return null;
    }
  }, []);

  const getCanvas = useCallback((pageNum: number): HTMLCanvasElement | undefined => {
    return canvasRefs.current.get(pageNum);
  }, []);

  const cleanup = useCallback(() => {
    try { pdfjsDocRef.current?.cleanup(); } catch {}
    pdfjsDocRef.current = null;
    docRef.current = null;
    canvasRefs.current = new Map();
    setFile(null);
    setPageCount(0);
    setCurrentPage(1);
    setPages([]);
  }, []);

  useEffect(() => {
    return () => {
      try { pdfjsDocRef.current?.cleanup(); } catch {}
    };
  }, []);

  return {
    file, setFile: loadFile,
    pageCount, currentPage, setCurrentPage,
    pages,
    loading, error, setError,
    renderPage, getCanvas,
    pdfjsDoc: pdfjsDocRef,
    cleanup,
    hasDocument: pageCount > 0,
  };
}
