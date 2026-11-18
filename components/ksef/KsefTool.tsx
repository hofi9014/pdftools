'use client';
// KSeF XML to PDF: reads e-invoice XML files in the browser, shows each one and saves it as PDF.
// Nothing is sent anywhere — the reading code (lib/ksef) is loaded on demand when files are added.
import { useRef, useState } from 'react';
import ToolGlyph from '@/components/ToolGlyph';
import type { KsefFileResult } from '@/lib/ksef/client';
import { KSEF_NOTICE } from '@/lib/ksef/view';

type Item = KsefFileResult & { id: number };

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let nextId = 1;

export default function KsefTool({ title, lead }: { title: string; lead: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const valid = items.filter((i): i is Item & { ok: true } => i.ok);
  const current = valid.find((i) => i.id === selected) ?? valid[0];

  const addFiles = async (list: FileList | File[] | null) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    setReading(true);
    setError('');
    try {
      const { readInvoiceFile } = await import('@/lib/ksef/client');
      const read: Item[] = [];
      for (const f of files) read.push({ ...(await readInvoiceFile(f)), id: nextId++ });
      setItems((prev) => [...prev, ...read]);
      const firstOk = read.find((r) => r.ok);
      if (firstOk) setSelected(firstOk.id);
    } catch {
      setError('Nie udało się wczytać narzędzia. Odśwież stronę i spróbuj ponownie.');
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const savePdf = async (which: (Item & { ok: true })[], name: string) => {
    setBusy(name);
    setError('');
    try {
      const { invoicesToPdf } = await import('@/lib/ksef/client');
      download(await invoicesToPdf(which.map((i) => ({ view: i.view, fileName: i.fileName }))), name);
    } catch {
      setError('Nie udało się utworzyć pliku PDF.');
    } finally {
      setBusy(null);
    }
  };

  const saveZip = async () => {
    setBusy('zip');
    setError('');
    try {
      const [{ invoicesToPdf, pdfName }, { default: JSZip }] = await Promise.all([import('@/lib/ksef/client'), import('jszip')]);
      const zip = new JSZip();
      const used = new Set<string>();
      for (const i of valid) {
        let name = pdfName(i.fileName);
        for (let n = 2; used.has(name); n++) name = pdfName(i.fileName).replace(/\.pdf$/, `-${n}.pdf`);
        used.add(name);
        zip.file(name, await invoicesToPdf([{ view: i.view, fileName: i.fileName }]));
      }
      download(await zip.generateAsync({ type: 'blob' }), 'faktury-ksef.zip');
    } catch {
      setError('Nie udało się utworzyć archiwum ZIP.');
    } finally {
      setBusy(null);
    }
  };

  const show = (id: number) => {
    setSelected(id);
    requestAnimationFrame(() => previewRef.current?.focus());
  };

  const remove = (id: number) => setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4" aria-hidden="true"><ToolGlyph name="receipt" /></div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tool-heading mb-3">{title}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">{lead}</p>
      </div>

      <p className="ksef-notice rounded-xl p-4 mb-6 text-sm" role="note">
        <ToolGlyph name="info" /> {KSEF_NOTICE}
      </p>

      <div
        onDrop={(e) => { e.preventDefault(); setDragOver(false); void addFiles(e.dataTransfer.files); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-describedby="ksef-drop-hint"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition mb-6
          ${dragOver ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
      >
        <div className="text-5xl mb-3" aria-hidden="true"><ToolGlyph name="folderOpen" /></div>
        <p className="text-gray-600 dark:text-gray-300 font-medium">{reading ? 'Wczytywanie…' : 'Przeciągnij tutaj pliki XML faktur'}</p>
        <p id="ksef-drop-hint" className="text-gray-400 dark:text-gray-500 text-sm mt-1">albo kliknij, aby wybrać pliki .xml (możesz wybrać kilka)</p>
        <input
          ref={inputRef}
          id="ksefFileInput"
          type="file"
          accept=".xml,text/xml,application/xml"
          multiple
          className="hidden"
          aria-label="Wybierz pliki XML faktur"
          onChange={(e) => void addFiles(e.target.files)}
        />
      </div>

      {error && <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 mb-6"><ToolGlyph name="warning" /> {error}</div>}

      {items.length > 0 && (
        <section aria-labelledby="ksef-files" className="mb-8">
          <h2 id="ksef-files" className="text-lg font-bold tool-heading mb-3">Pliki ({items.length})</h2>
          <ul role="list" className="space-y-2">
            {items.map((i) => (
              <li key={i.id} className={`ksef-file rounded-xl border p-3 flex flex-wrap items-center gap-x-3 gap-y-2 ${i.ok && current?.id === i.id ? 'ksef-file-current' : ''}`}>
                <span className="ksef-file-name min-w-0 flex-1 basis-56">
                  <span className="block font-medium tool-heading break-words">{i.fileName}</span>
                  {i.ok
                    ? <span className="block text-sm text-gray-600 dark:text-gray-300">{i.title} · {i.view.version}{i.view.ksefNumber ? ` · KSeF ${i.view.ksefNumber}` : ''}</span>
                    : <span role="alert" className="block text-sm text-red-700 dark:text-red-400"><ToolGlyph name="warning" /> {i.message}</span>}
                </span>
                {i.ok && (
                  <span className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => show(i.id)} aria-pressed={current?.id === i.id} className="ksef-btn-secondary rounded-lg px-3 py-2 text-sm font-medium">Podgląd</button>
                    <button type="button" disabled={busy !== null} onClick={() => void savePdf([i], pdfNameLocal(i.fileName))} className="btn-accent rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60">
                      {busy === pdfNameLocal(i.fileName) ? 'Tworzenie PDF…' : 'Pobierz PDF'}
                    </button>
                  </span>
                )}
                <button type="button" onClick={() => remove(i.id)} className="ksef-btn-secondary rounded-lg px-3 py-2 text-sm" aria-label={`Usuń ${i.fileName} z listy`}>Usuń</button>
              </li>
            ))}
          </ul>
          {valid.length > 1 && (
            <div className="flex flex-wrap gap-3 mt-4">
              <button type="button" disabled={busy !== null} onClick={() => void savePdf(valid, 'faktury-ksef.pdf')} className="btn-accent rounded-xl px-4 py-3 font-semibold disabled:opacity-60">
                {busy === 'faktury-ksef.pdf' ? 'Tworzenie PDF…' : `Pobierz wszystkie (${valid.length}) jako jeden PDF`}
              </button>
              <button type="button" disabled={busy !== null} onClick={() => void saveZip()} className="ksef-btn-secondary rounded-xl px-4 py-3 font-semibold disabled:opacity-60">
                {busy === 'zip' ? 'Tworzenie ZIP…' : 'Pobierz ZIP z osobnymi plikami PDF'}
              </button>
            </div>
          )}
        </section>
      )}

      {current && (
        <section aria-labelledby="ksef-preview-heading">
          <h2 id="ksef-preview-heading" className="text-lg font-bold tool-heading mb-3">Podgląd: {current.fileName}</h2>
          <div
            ref={previewRef}
            tabIndex={-1}
            className="ksef-preview rounded-2xl border p-4 sm:p-6"
            // The HTML comes from lib/ksef/html.ts, which escapes every value from the file.
            dangerouslySetInnerHTML={{ __html: current.previewHtml }}
          />
        </section>
      )}
    </div>
  );
}

function pdfNameLocal(fileName: string): string {
  return `${fileName.replace(/\.xml$/i, '') || 'faktura'}.pdf`;
}
