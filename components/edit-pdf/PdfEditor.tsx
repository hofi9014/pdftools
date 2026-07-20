'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useHydrationSafeLocale } from '@/lib/locale-context';
import { t } from '@/lib/i18n';
import { initPdfjs, editPdfClient, type PdfEditElement } from '@/lib/client-pdf';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { extractTextBlocks } from '@/lib/pdf/extractTextBlocks';
import { exportEditedPdf, type TextEdit } from '@/lib/pdf/exportEditedPdf';
import { loadGoogleFontsCSS } from '@/lib/pdf/fonts';
import ThumbnailPanel from './ThumbnailPanel';
import PageRenderer, { type PageRendererHandle } from './PageRenderer';
import EditLayer, { type EditorElement } from './EditLayer';
import Toolbar from './Toolbar';
import TextEditPopup from './TextEditPopup';

interface TextBlockData {
  id: string; page: number; x: number; y: number;
  width: number; height: number; originalText: string;
  fontSize: number; fontName: string; rotation: number;
}

const FONTS = ['Arial', 'Arimo', 'Cousine', 'Georgia', 'Lato', 'Noto Sans', 'Open Sans', 'PT Sans', 'Roboto', 'Times New Roman', 'Tinos', 'Verdana'];
const COLORS = ['#000000','#ff0000','#0000ff','#00aa00','#ff8800','#8800ff','#ff00ff','#00aaaa'];

export default function PdfEditor({ file, onReset }: { file: File; onReset: () => void }) {
  const locale = useHydrationSafeLocale();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [pageCanvas, setPageCanvas] = useState<HTMLCanvasElement | null>(null);
  const [error, setError] = useState('');
  const [activeTool, setActiveTool] = useState('select');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [textEdits, setTextEdits] = useState<TextEdit[]>([]);
  const [textBlocks, setTextBlocks] = useState<TextBlockData[]>([]);
  const [hoveredTextBlock, setHoveredTextBlock] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<TextBlockData | null>(null);
  const [editPopupPos, setEditPopupPos] = useState({ top: 0, left: 0 });
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  // Tool form state
  const [toolText, setToolText] = useState('Text');
  const [toolFont, setToolFont] = useState('Arial');
  const [toolSize, setToolSize] = useState(16);
  const [toolColor, setToolColor] = useState('#C28F5B');
  const [toolBold, setToolBold] = useState(false);
  const [toolItalic, setToolItalic] = useState(false);
  const [toolOpacity, setToolOpacity] = useState(100);
  const [highlightColor, setHighlightColor] = useState('#ffff00');
  const [highlightOpacity, setHighlightOpacity] = useState(30);
  const [freehandColor, setFreehandColor] = useState('#000000');
  const [freehandSize, setFreehandSize] = useState(3);
  const [lineColor, setLineColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);

  const contRef = useRef<HTMLDivElement>(null);
  const pageRendererRef = useRef<PageRendererHandle>(null);
  const nidRef = useRef(1);
  const pdfjsDocRef = useRef<any>(null);
  const extractedRef = useRef(false);
  const elementsRef = useRef<EditorElement[]>([]);
  const renderScale = 1.5;

  const undoRedo = useUndoRedo<EditorElement[]>([], 50);
  const elements = undoRedo.state;
  elementsRef.current = elements;
  const selectedEl = elements.find(el => el.id === selectedId) ?? null;

  useEffect(() => { loadGoogleFontsCSS(); }, []);

  // Load PDF once
  useEffect(() => {
    if (extractedRef.current) return;
    let cancel = false;
    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        await initPdfjs();
        const buf = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        if (cancel) { doc.cleanup(); return; }
        pdfjsDocRef.current = doc;
        setPageCount(doc.numPages);

        const blocks: TextBlockData[] = [];
        for (let p = 1; p <= doc.numPages; p++) {
          const page = await doc.getPage(p);
          const vp = page.getViewport({ scale: renderScale, rotation: page.rotate });
          try {
            const pageBlocks = await extractTextBlocks(page, p, vp.height, renderScale, page.rotate);
            for (const b of pageBlocks) {
              blocks.push({
                id: b.id, page: b.page || p, x: b.x, y: b.y,
                width: b.width, height: b.height,
                originalText: b.text, fontSize: b.fontSize,
                fontName: b.fontName, rotation: b.rotation,
              });
            }
          } catch {}
        }
        if (cancel) { doc.cleanup(); return; }
        setTextBlocks(blocks);
        extractedRef.current = true;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => { cancel = true; };
  }, [file]);

  const handleRenderComplete = useCallback((w: number, h: number, canvas: HTMLCanvasElement) => {
    setCanvasWidth(w);
    setCanvasHeight(h);
    setPageCanvas(canvas);
  }, []);

  const handlePageSelect = useCallback((p: number) => {
    setCurrentPage(p);
    setSelectedId(null);
    undoRedo.reset([]);
  }, [undoRedo]);

  const handleElementsChange = useCallback((newElements: EditorElement[]) => {
    undoRedo.set(newElements);
  }, [undoRedo]);

  const handleSelect = useCallback((id: number | null) => {
    setSelectedId(id);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedId == null) return;
    const cur = elementsRef.current;
    undoRedo.set(cur.filter(el => el.id !== selectedId));
    setSelectedId(null);
  }, [selectedId, undoRedo]);

  const updateSelected = useCallback((partial: Partial<EditorElement>) => {
    if (selectedId == null) return;
    const cur = elementsRef.current;
    undoRedo.set(cur.map(el => el.id === selectedId ? { ...el, ...partial } : el));
  }, [selectedId, undoRedo]);

  // Add element from canvas click
  const handleAddElement = useCallback((x: number, y: number) => {
    const cur = elementsRef.current;
    const id = Date.now() + Math.random();
    let el: EditorElement;
    switch (activeTool) {
      case 'text':
        el = { id, type: 'text', x, y, w: 150, h: 30, text: toolText, size: toolSize, font: toolFont, color: toolColor, bold: toolBold, italic: toolItalic, opacity: toolOpacity / 100 };
        break;
      case 'rect':
        el = { id, type: 'rect', x, y, w: 100, h: 80, color: toolColor, opacity: toolOpacity / 100 };
        break;
      case 'circle':
        el = { id, type: 'circle', x, y, w: 80, h: 80, color: toolColor, opacity: toolOpacity / 100 };
        break;
      case 'highlight':
        el = { id, type: 'highlight', x, y, w: 200, h: 30, color: highlightColor, opacity: highlightOpacity / 100 };
        break;
      default:
        el = { id, type: 'rect', x, y, w: 100, h: 80, color: toolColor, opacity: toolOpacity / 100 };
    }
    undoRedo.set([...cur, el]);
    setSelectedId(id);
  }, [activeTool, undoRedo, toolText, toolFont, toolSize, toolColor, toolBold, toolItalic, toolOpacity, highlightColor, highlightOpacity]);

  // Add freehand point
  const handleFreehandStart = useCallback((x: number, y: number) => {
    const cur = elementsRef.current;
    const id = Date.now() + Math.random();
    const el: EditorElement = { id, type: 'freehand', x: 0, y: 0, w: 0, h: 0, points: [{ x, y }], color: freehandColor, size: freehandSize, opacity: 1 };
    undoRedo.set([...cur, el]);
    setSelectedId(id);
    return id;
  }, [undoRedo, freehandColor, freehandSize]);

  const handleFreehandAddPoint = useCallback((id: number, x: number, y: number) => {
    const cur = elementsRef.current;
    undoRedo.setWithoutHistory(cur.map(el => el.id === id ? { ...el, points: [...(el.points || []), { x, y }] } : el));
  }, [undoRedo]);

  // Line/arrow creation
  const handleLineStart = useCallback((x: number, y: number) => {
    const cur = elementsRef.current;
    const id = Date.now() + Math.random();
    const el: EditorElement = { id, type: activeTool === 'line' ? 'line' : 'arrow', x, y, w: 1, h: 1, x2: x + 1, y2: y + 1, color: lineColor, size: lineWidth, opacity: 1 };
    undoRedo.set([...cur, el]);
    setSelectedId(id);
    return id;
  }, [undoRedo, activeTool, lineColor, lineWidth]);

  const handleLineMove = useCallback((id: number, x: number, y: number) => {
    const cur = elementsRef.current;
    undoRedo.setWithoutHistory(cur.map(el => el.id === id ? { ...el, x2: x, y2: y, w: Math.abs(x - el.x), h: Math.abs(y - el.y) } : el));
  }, [undoRedo]);

  // Image upload
  const handleAddImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const imgFile = e.target?.files?.[0];
      if (!imgFile) return;
      const dataUrl = await new Promise<string>(resolve => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.readAsDataURL(imgFile); });
      const id = Date.now() + Math.random();
      const img = new Image();
      img.onload = () => {
        const cur = elementsRef.current;
        let w = img.width, h = img.height;
        if (w > 400) { h = (h / w) * 400; w = 400; }
        if (h > 400) { w = (w / h) * 400; h = 400; }
        undoRedo.set([...cur, { id, type: 'image', x: 50, y: 50, w, h, imageDataUrl: dataUrl, opacity: 1 }]);
        setSelectedId(id);
      };
      img.src = dataUrl;
    };
    input.click();
  }, [undoRedo]);

  // Signature
  const handleAddSignature = useCallback(() => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[300] flex items-center justify-center bg-black/40';
    modal.innerHTML = `<div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl">
      <h3 class="font-bold text-lg mb-3">${t('edit.sig_heading', locale)}</h3>
      <canvas id="sig-canvas" width="400" height="200" style="border:2px dashed #ccc;border-radius:8px;cursor:crosshair;touch-action:none;"></canvas>
      <div class="flex gap-2 mt-3 justify-end">
        <button id="sig-clear" class="px-4 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-700">${t('edit.sig_clear', locale)}</button>
        <button id="sig-save" class="px-4 py-2 rounded-lg text-sm bg-[var(--coffee-accent)] text-white">${t('edit.sig_save', locale)}</button>
        <button id="sig-cancel" class="px-4 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-700">${t('edit.btn_cancel', locale)}</button>
      </div></div>`;
    document.body.appendChild(modal);
    const canvas = modal.querySelector('#sig-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    let drawing = false;
    const getPos = (e: any) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    canvas.addEventListener('pointerdown', (e: any) => { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
    canvas.addEventListener('pointermove', (e: any) => { if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke(); });
    canvas.addEventListener('pointerup', () => { drawing = false; });
    modal.querySelector('#sig-clear')!.addEventListener('click', () => ctx.clearRect(0, 0, canvas.width, canvas.height));
    modal.querySelector('#sig-cancel')!.addEventListener('click', () => document.body.removeChild(modal));
    modal.querySelector('#sig-save')!.addEventListener('click', () => {
      const cur = elementsRef.current;
      const dataUrl = canvas.toDataURL('image/png');
      const id = Date.now() + Math.random();
      undoRedo.set([...cur, { id, type: 'image', x: 50, y: 50, w: 200, h: 100, imageDataUrl: dataUrl, opacity: 1 }]);
      setSelectedId(id);
      document.body.removeChild(modal);
    });
  }, [undoRedo, locale]);

  // Text block editing
  const handleTextBlockClick = useCallback((block: { id: string; page: number }) => {
    const tb = textBlocks.find(b => b.id === block.id);
    if (!tb) return;
    if (block.page !== currentPage) { setCurrentPage(block.page); setTimeout(() => showTextEditPopup(tb), 400); return; }
    showTextEditPopup(tb);
  }, [currentPage, textBlocks]);

  const showTextEditPopup = useCallback((block: TextBlockData) => {
    if (!contRef.current) return;
    const r = contRef.current.getBoundingClientRect();
    setEditPopupPos({ top: r.top + (block.y / canvasHeight) * r.height + 10, left: Math.min(r.left + (block.x / canvasWidth) * r.width, window.innerWidth - 300) });
    setEditingBlock(block);
  }, [canvasWidth, canvasHeight]);

  const handleTextEditSave = useCallback((edit: TextEdit) => {
    setTextEdits(prev => { const i = prev.findIndex(e => e.id === edit.id); return i >= 0 ? prev.map((e, idx) => idx === i ? edit : e) : [...prev, edit]; });
    setEditingBlock(null);
  }, []);

  // Export
  const handleExport = useCallback(async () => {
    setExporting(true); setError(''); setSuccess(false);
    try {
      if (textEdits.length > 0) {
        const cm = new Map<number, HTMLCanvasElement>();
        if (pageCanvas) cm.set(currentPage, pageCanvas);
        const blob = await exportEditedPdf(file, textEdits, cm);
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `edytowany-${file.name}`; a.click();
        setSuccess(true); setExportMsg(t('edit.success_text', locale));
      } else if (elements.length > 0) {
        const data: PdfEditElement[] = elements.map(el => ({
          type: el.type as any, x: el.x, y: el.y,
          text: el.text, size: el.size, color: el.color, width: el.w, height: el.h, opacity: el.opacity,
          font: (el.font || 'Arial') as any, bold: el.bold, italic: el.italic,
          x2: el.x2, y2: el.y2,
          imageDataUrl: el.imageDataUrl,
          points: el.points,
        }));
        const blob = await editPdfClient(file, currentPage - 1, data, canvasWidth, canvasHeight);
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `edytowany-${file.name}`; a.click();
        setSuccess(true); setExportMsg(t('edit.success_elements', locale));
      } else {
        setError(t('edit.msg_no_elements', locale));
      }
    } catch (err: unknown) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setExporting(false); }
  }, [elements, textEdits, file, currentPage, canvasWidth, canvasHeight, pageCanvas]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const c = e.ctrlKey || e.metaKey;
      switch (e.key.toLowerCase()) {
        case 'z': if (c && e.shiftKey) { e.preventDefault(); undoRedo.redo(); } else if (c) { e.preventDefault(); undoRedo.undo(); } break;
        case 'y': if (c) { e.preventDefault(); undoRedo.redo(); } break;
        case 'delete': case 'backspace': e.preventDefault(); handleDeleteSelected(); break;
        case 'v': setActiveTool('select'); break;
        case 't': setActiveTool('text'); break;
        case 'r': setActiveTool('rect'); break;
        case 'c': setActiveTool('circle'); break;
        case 'l': setActiveTool('line'); break;
        case 'a': setActiveTool('arrow'); break;
        case 'f': setActiveTool('freehand'); break;
        case 'h': setActiveTool('highlight'); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undoRedo, handleDeleteSelected]);

  return (
    <div className="space-y-4">
      <Toolbar activeTool={activeTool} onToolChange={setActiveTool}
        onUndo={undoRedo.undo} onRedo={undoRedo.redo} canUndo={undoRedo.canUndo} canRedo={undoRedo.canRedo}
        onAddImage={handleAddImage} onAddSignature={handleAddSignature} />

      <div className="flex flex-col lg:flex-row gap-4">
        {pageCount > 1 && (
          <div className="order-2 lg:order-1">
            <ThumbnailPanel pageCount={pageCount} currentPage={currentPage} onPageSelect={handlePageSelect}
              renderPageThumbnail={async (p) => {
                if (pdfjsDocRef.current) {
                  const page = await pdfjsDocRef.current.getPage(p);
                  const vp = page.getViewport({ scale: 0.3, rotation: page.rotate });
                  const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
                  await page.render({ canvas: c, canvasContext: c.getContext('2d')!, viewport: vp }).promise;
                  return { canvas: c, width: vp.width, height: vp.height };
                }
                return null;
              }} />
          </div>
        )}

        <div className="flex-1 min-w-0 order-1 lg:order-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
                className="px-2.5 py-1 rounded-lg text-sm bg-[var(--coffee-surface-solid)] border border-[var(--coffee-border)] disabled:opacity-30 hover:bg-[var(--coffee-surface-hover)]">←</button>
              <span className="text-sm font-medium">{t('edit.page_indicator', locale, { current: currentPage, total: pageCount })}</span>
              <button onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))} disabled={currentPage >= pageCount}
                className="px-2.5 py-1 rounded-lg text-sm bg-[var(--coffee-surface-solid)] border border-[var(--coffee-border)] disabled:opacity-30 hover:bg-[var(--coffee-surface-hover)]">→</button>
              <span className="text-[10px] text-[var(--coffee-text-tertiary)] ml-2">{t('edit.element_count', locale, { n: elements.length, e: textEdits.length })}</span>
            </div>
          </div>

          <div ref={contRef} className="relative border rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 shadow-inner select-none"
            style={{ maxWidth: '100%', display: 'inline-block', minWidth: 300, minHeight: 300 }}>
            <PageRenderer ref={pageRendererRef} pageNum={currentPage} file={file}
              onRenderComplete={handleRenderComplete} onError={setError} scale={renderScale} className="block" />
            {canvasWidth > 0 && (
              <EditLayer elements={elements} selectedId={selectedId} onSelect={handleSelect}
                onElementsChange={handleElementsChange} canvasWidth={canvasWidth} canvasHeight={canvasHeight}
                activeTool={activeTool}
                onAddElement={handleAddElement} onFreehandStart={handleFreehandStart} onFreehandAddPoint={handleFreehandAddPoint}
                onLineStart={handleLineStart} onLineMove={handleLineMove}
                textBlocks={textBlocks.filter(b => b.page === currentPage).map(b => ({ id: b.id, x: b.x, y: b.y, width: b.width, height: b.height, text: b.originalText, page: b.page }))}
                onTextBlockClick={handleTextBlockClick} hoveredTextBlock={hoveredTextBlock} onHoverTextBlock={setHoveredTextBlock} />
            )}
          </div>
        </div>

        {/* Properties panel */}
        <div className="order-3 w-full lg:w-64 shrink-0 space-y-3">
          {/* Tool settings */}
          <div className="bg-[var(--coffee-surface-solid)] dark:bg-gray-800 border border-[var(--coffee-border)] rounded-xl p-4 space-y-2.5">
            <h3 className="text-xs font-semibold text-[var(--coffee-text-secondary)] uppercase tracking-wide">
              {activeTool === 'select' ? t('edit.tool_select', locale) :
               activeTool === 'text' ? t('edit.tool_text', locale) :
               activeTool === 'rect' ? t('edit.tool_rect', locale) :
               activeTool === 'circle' ? t('edit.tool_circle', locale) :
               activeTool === 'highlight' ? t('edit.tool_highlight', locale) :
               activeTool === 'line' ? t('edit.tool_line', locale) :
               activeTool === 'arrow' ? t('edit.tool_arrow', locale) :
               activeTool === 'freehand' ? t('edit.tool_freehand', locale) :
               activeTool === 'image' ? t('edit.tool_image', locale) :
               activeTool === 'signature' ? t('edit.tool_signature', locale) : t('edit.tool_fallback', locale)}
            </h3>
            {activeTool === 'text' && (
              <>
                <div><label className="text-[10px] text-[var(--coffee-text-tertiary)]">{t('edit.label_content', locale)}</label>
                  <input value={toolText} onChange={e => setToolText(e.target.value)}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-700 mt-0.5" placeholder={t('edit.placeholder_text', locale)} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[10px] text-[var(--coffee-text-tertiary)]">{t('edit.label_font', locale)}</label>
                    <select value={toolFont} onChange={e => setToolFont(e.target.value)}
                      className="w-full px-2 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-700 mt-0.5">
                      {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select></div>
                  <div><label className="text-[10px] text-[var(--coffee-text-tertiary)]">{t('edit.label_size', locale)}</label>
                    <input type="number" value={toolSize} onChange={e => setToolSize(Number(e.target.value))}
                      className="w-full px-2 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-700 mt-0.5" min={6} max={200} /></div>
                </div>
                <div className="flex gap-1 items-center flex-wrap">
                  <label className="text-[10px] text-[var(--coffee-text-tertiary)] w-full">{t('edit.label_color', locale)}</label>
                  {COLORS.map(c => <button key={c} onClick={() => setToolColor(c)}
                    className={`w-5 h-5 rounded-full border-2 ${toolColor === c ? 'border-[var(--coffee-accent)]' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
                  <input type="color" value={toolColor} onChange={e => setToolColor(e.target.value)} className="w-5 h-5 rounded cursor-pointer p-0 border-0" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setToolBold(!toolBold)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${toolBold ? 'bg-[var(--coffee-accent)] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>B</button>
                  <button onClick={() => setToolItalic(!toolItalic)}
                    className={`px-3 py-1.5 rounded-lg text-xs italic ${toolItalic ? 'bg-[var(--coffee-accent)] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>I</button>
                  <div className="flex-1" />
                  <label className="text-[10px] text-[var(--coffee-text-tertiary)] self-center">{t('edit.label_opacity_abbr', locale, { n: toolOpacity })}</label>
                  <input type="range" min={0} max={100} value={toolOpacity} onChange={e => setToolOpacity(Number(e.target.value))} className="w-14 h-1.5 accent-[var(--coffee-accent)] mt-0.5" />
                </div>
              </>
            )}
            {(activeTool === 'rect' || activeTool === 'circle') && (
              <div>
                <label className="text-[10px] text-[var(--coffee-text-tertiary)]">{t('edit.label_fill', locale)}</label>
                <div className="flex gap-1 flex-wrap mt-0.5">
                  {COLORS.map(c => <button key={c} onClick={() => setToolColor(c)}
                    className={`w-5 h-5 rounded-full border-2 ${toolColor === c ? 'border-[var(--coffee-accent)]' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
                  <input type="color" value={toolColor} onChange={e => setToolColor(e.target.value)} className="w-5 h-5 rounded cursor-pointer p-0 border-0" />
                </div>
                <label className="text-[10px] text-[var(--coffee-text-tertiary)] mt-2 block">{t('edit.label_opacity', locale, { n: toolOpacity })}</label>
                <input type="range" min={0} max={100} value={toolOpacity} onChange={e => setToolOpacity(Number(e.target.value))} className="w-full h-1.5 accent-[var(--coffee-accent)]" />
              </div>
            )}
            {activeTool === 'highlight' && (
              <div>
                <label className="text-[10px] text-[var(--coffee-text-tertiary)]">{t('edit.label_highlight_color', locale)}</label>
                <div className="flex gap-1 flex-wrap mt-0.5">
                  {['#ffff00','#ff8800','#00ff88','#88ff00','#ff88ff','#88ccff'].map(c => <button key={c} onClick={() => setHighlightColor(c)}
                    className={`w-5 h-5 rounded-full border-2 ${highlightColor === c ? 'border-[var(--coffee-accent)]' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
                  <input type="color" value={highlightColor} onChange={e => setHighlightColor(e.target.value)} className="w-5 h-5 rounded cursor-pointer p-0 border-0" />
                </div>
                <label className="text-[10px] text-[var(--coffee-text-tertiary)] mt-2 block">{t('edit.label_highlight_opacity', locale, { n: highlightOpacity })}</label>
                <input type="range" min={5} max={80} value={highlightOpacity} onChange={e => setHighlightOpacity(Number(e.target.value))} className="w-full h-1.5 accent-[var(--coffee-accent)]" />
              </div>
            )}
            {(activeTool === 'line' || activeTool === 'arrow') && (
              <div>
                <label className="text-[10px] text-[var(--coffee-text-tertiary)]">{t('edit.label_color', locale)}</label>
                <div className="flex gap-1 flex-wrap mt-0.5">
                  {COLORS.map(c => <button key={c} onClick={() => setLineColor(c)}
                    className={`w-5 h-5 rounded-full border-2 ${lineColor === c ? 'border-[var(--coffee-accent)]' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
                  <input type="color" value={lineColor} onChange={e => setLineColor(e.target.value)} className="w-5 h-5 rounded cursor-pointer p-0 border-0" />
                </div>
                <label className="text-[10px] text-[var(--coffee-text-tertiary)] mt-2 block">{t('edit.label_line_width', locale, { n: lineWidth })}</label>
                <input type="range" min={1} max={20} value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} className="w-full h-1.5 accent-[var(--coffee-accent)]" />
                <p className="text-[10px] text-[var(--coffee-text-tertiary)] mt-1">{t('edit.hint_click_drag', locale)}</p>
              </div>
            )}
            {activeTool === 'freehand' && (
              <div>
                <label className="text-[10px] text-[var(--coffee-text-tertiary)]">{t('edit.label_color', locale)}</label>
                <div className="flex gap-1 flex-wrap mt-0.5">
                  {COLORS.map(c => <button key={c} onClick={() => setFreehandColor(c)}
                    className={`w-5 h-5 rounded-full border-2 ${freehandColor === c ? 'border-[var(--coffee-accent)]' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
                  <input type="color" value={freehandColor} onChange={e => setFreehandColor(e.target.value)} className="w-5 h-5 rounded cursor-pointer p-0 border-0" />
                </div>
                <label className="text-[10px] text-[var(--coffee-text-tertiary)] mt-2 block">{t('edit.label_line_width', locale, { n: freehandSize })}</label>
                <input type="range" min={1} max={20} value={freehandSize} onChange={e => setFreehandSize(Number(e.target.value))} className="w-full h-1.5 accent-[var(--coffee-accent)]" />
                <p className="text-[10px] text-[var(--coffee-text-tertiary)] mt-1">{t('edit.hint_freehand', locale)}</p>
              </div>
            )}
            {activeTool === 'select' && (
              <div>
                <p className="text-xs text-[var(--coffee-text-tertiary)]">{t('edit.hint_select', locale)}</p>
              </div>
            )}
          </div>

          {/* Selected element properties */}
          {selectedEl && (
            <div className="bg-[var(--coffee-surface-solid)] dark:bg-gray-800 border border-[var(--coffee-border)] rounded-xl p-4 space-y-2.5">
              <h3 className="text-xs font-semibold text-[var(--coffee-text-secondary)] uppercase tracking-wide">
                {selectedEl.type === 'text' ? t('edit.elem_text', locale) : selectedEl.type === 'rect' ? t('edit.elem_rect', locale) : selectedEl.type === 'circle' ? t('edit.elem_circle', locale) : selectedEl.type === 'highlight' ? t('edit.elem_highlight', locale) : selectedEl.type === 'image' ? t('edit.elem_image', locale) : selectedEl.type === 'freehand' ? t('edit.elem_freehand', locale) : selectedEl.type === 'line' ? t('edit.elem_line', locale) : t('edit.elem_arrow', locale)} #{Math.round(selectedEl.id)}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px]">{t('edit.label_coord_x', locale)}</label>
                  <input type="number" value={Math.round(selectedEl.x)} onChange={e => updateSelected({ x: Number(e.target.value) })}
                    className="w-full px-1.5 py-1 border rounded text-xs bg-white dark:bg-gray-700" /></div>
                <div><label className="text-[10px]">{t('edit.label_coord_y', locale)}</label>
                  <input type="number" value={Math.round(selectedEl.y)} onChange={e => updateSelected({ y: Number(e.target.value) })}
                    className="w-full px-1.5 py-1 border rounded text-xs bg-white dark:bg-gray-700" /></div>
                <div><label className="text-[10px]">{t('edit.label_width', locale)}</label>
                  <input type="number" value={Math.round(selectedEl.w)} onChange={e => updateSelected({ w: Number(e.target.value) })}
                    className="w-full px-1.5 py-1 border rounded text-xs bg-white dark:bg-gray-700" min={10} /></div>
                <div><label className="text-[10px]">{t('edit.label_height', locale)}</label>
                  <input type="number" value={Math.round(selectedEl.h)} onChange={e => updateSelected({ h: Number(e.target.value) })}
                    className="w-full px-1.5 py-1 border rounded text-xs bg-white dark:bg-gray-700" min={10} /></div>
              </div>
              <div>
                <label className="text-[10px]">{t('edit.label_opacity', locale, { n: Math.round((selectedEl.opacity ?? 1) * 100) })}</label>
                <input type="range" min={0} max={100} value={Math.round((selectedEl.opacity ?? 1) * 100)} onChange={e => updateSelected({ opacity: Number(e.target.value) / 100 })}
                  className="w-full h-1.5 accent-[var(--coffee-accent)]" />
              </div>
              {selectedEl.type === 'text' && (
                <>
                  <div><label className="text-[10px]">{t('edit.label_content', locale)}</label>
                    <textarea value={selectedEl.text ?? ''} onChange={e => updateSelected({ text: e.target.value })}
                      className="w-full px-1.5 py-1 border rounded text-xs bg-white dark:bg-gray-700 resize-none" rows={2} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[10px]">{t('edit.label_size', locale)}</label>
                      <input type="number" value={selectedEl.size ?? 16} onChange={e => updateSelected({ size: Number(e.target.value) })}
                        className="w-full px-1.5 py-1 border rounded text-xs bg-white dark:bg-gray-700" /></div>
                    <div><label className="text-[10px]">{t('edit.label_font', locale)}</label>
                      <select value={selectedEl.font || 'Arial'} onChange={e => updateSelected({ font: e.target.value })}
                        className="w-full px-1.5 py-1 border rounded text-xs bg-white dark:bg-gray-700">
                        {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select></div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <button onClick={() => updateSelected({ bold: !selectedEl.bold })}
                      className={`px-2.5 py-1 rounded text-xs font-bold ${selectedEl.bold ? 'bg-[var(--coffee-accent)] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>B</button>
                    <button onClick={() => updateSelected({ italic: !selectedEl.italic })}
                      className={`px-2.5 py-1 rounded text-xs italic ${selectedEl.italic ? 'bg-[var(--coffee-accent)] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>I</button>
                    <div className="flex gap-1 flex-1 justify-end">
                      {COLORS.map(c => <button key={c} onClick={() => updateSelected({ color: c })}
                        className={`w-4 h-4 rounded-full border ${(selectedEl.color || '#000') === c ? 'border-[var(--coffee-accent)]' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
                    </div>
                  </div>
                </>
              )}
              {(selectedEl.type === 'rect' || selectedEl.type === 'circle') && (
                <div className="flex gap-1 flex-wrap items-center">
                  <label className="text-[10px]">{t('edit.label_color', locale)}</label>
                  {COLORS.map(c => <button key={c} onClick={() => updateSelected({ color: c })}
                    className={`w-4 h-4 rounded-full border ${(selectedEl.color || '#C28F5B') === c ? 'border-[var(--coffee-accent)]' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
                  <input type="color" value={selectedEl.color || '#C28F5B'} onChange={e => updateSelected({ color: e.target.value })} className="w-5 h-5 rounded cursor-pointer p-0 border-0" />
                </div>
              )}
              {selectedEl.type === 'highlight' && (
                <div className="flex gap-1 flex-wrap items-center">
                  <label className="text-[10px]">{t('edit.label_color', locale)}</label>
                  {['#ffff00','#ff8800','#00ff88','#88ff00','#ff88ff','#88ccff'].map(c => <button key={c} onClick={() => updateSelected({ color: c })}
                    className={`w-4 h-4 rounded-full border ${(selectedEl.color || '#ffff00') === c ? 'border-[var(--coffee-accent)]' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
                </div>
              )}
              {(selectedEl.type === 'line' || selectedEl.type === 'arrow') && (
                <div className="flex gap-1 flex-wrap items-center">
                  <label className="text-[10px]">{t('edit.label_color', locale)}</label>
                  {COLORS.map(c => <button key={c} onClick={() => updateSelected({ color: c })}
                    className={`w-4 h-4 rounded-full border ${(selectedEl.color || '#000') === c ? 'border-[var(--coffee-accent)]' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
                </div>
              )}
              {selectedEl.type === 'freehand' && (
                <div className="flex gap-1 flex-wrap items-center">
                  <label className="text-[10px]">{t('edit.label_color', locale)}</label>
                  {COLORS.map(c => <button key={c} onClick={() => updateSelected({ color: c })}
                    className={`w-4 h-4 rounded-full border ${(selectedEl.color || '#000') === c ? 'border-[var(--coffee-accent)]' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { undoRedo.set(elements.filter(el => el.id !== selectedId)); setSelectedId(null); }}
                  className="flex-1 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition">
                   🗑️ {t('edit.btn_delete', locale)}
                </button>
                <button onClick={() => updateSelected({ ...selectedEl })}
                  className="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 text-[var(--coffee-text-secondary)] rounded-lg text-xs font-medium transition">
                   🔄 {t('edit.btn_apply', locale)}
                </button>
              </div>
            </div>
          )}

          {/* Text editing section */}
          <div className="bg-[var(--coffee-surface-solid)] dark:bg-gray-800 border border-[var(--coffee-border)] rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-[var(--coffee-text-secondary)] uppercase tracking-wide">{t('edit.section_text_edit', locale)}</h3>
            <p className="text-[10px] text-[var(--coffee-text-tertiary)]">{t('edit.hint_text_edit', locale)}</p>
            {textEdits.length > 0 && (
              <>
                <div className="max-h-24 overflow-y-auto space-y-0.5">
                  {textEdits.map(e => (
                    <div key={e.id} className="text-[10px] text-[var(--coffee-text-secondary)] truncate">{t('edit.text_edit_item', locale, { page: e.page, text: e.newText.substring(0, 18) })}</div>
                  ))}
                </div>
                <button onClick={() => setTextEdits([])} className="text-[10px] text-red-500 hover:text-red-700">{t('edit.btn_clear', locale)}</button>
              </>
            )}
          </div>

          {/* Export */}
          <button onClick={handleExport} disabled={exporting}
            className={`w-full py-3 rounded-xl font-bold text-sm transition shadow-sm flex items-center justify-center gap-2
              ${exporting ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-[var(--coffee-accent)] hover:bg-[var(--coffee-accent-hover)] text-white'}`}>
            {exporting ? `⏳ ${t('edit.btn_saving', locale)}` : `💾 ${t('edit.btn_download', locale)}`}
          </button>
          <button onClick={onReset}
            className="w-full py-2 rounded-xl text-sm font-medium text-[var(--coffee-text-secondary)] hover:bg-[var(--coffee-surface-hover)] transition border border-[var(--coffee-border)]">
            📂 {t('edit.btn_other_file', locale)}
          </button>
        </div>
      </div>

      {editingBlock && <TextEditPopup block={editingBlock} onSave={handleTextEditSave} onCancel={() => setEditingBlock(null)} position={editPopupPos} />}

      {success && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl p-4">✅ {exportMsg}</div>}
      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4">⚠️ {error}</div>}
    </div>
  );
}
