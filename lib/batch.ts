// Runs one conversion per file and keeps going when a file fails. The batch loops in the tool
// pages ran every file under one shared try/catch, so one unconvertible file (e.g. a PDF with no
// table, for pdf-to-excel) aborted the whole batch and the user got no download at all — not
// even for the files that had already been converted.

export interface BatchResult<T, R> {
  ok: { item: T; result: R }[];
  failed: { item: T; message: string }[];
}

export async function runBatch<T, R>(
  items: readonly T[],
  convert: (item: T) => Promise<R>,
  onProgress?: (done: number) => void,
): Promise<BatchResult<T, R>> {
  const out: BatchResult<T, R> = { ok: [], failed: [] };
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    try {
      out.ok.push({ item, result: await convert(item) });
    } catch (err: unknown) {
      out.failed.push({ item, message: err instanceof Error ? err.message : String(err) });
    }
    onProgress?.(i + 1);
  }
  return out;
}
