// Markdown and plain text → the HTML document that lib/pdf/htmlToTaggedPdf.ts turns into a
// tagged PDF (the "Markdown to PDF" tool). Pure: no DOM, so it runs in Node tests too.
//
// Markdown goes through `marked` (GitHub-flavoured: tables, strikethrough, task lists). Raw HTML in
// the Markdown is kept — the PDF writer parses it with DOMParser, which runs no scripts, and keeps
// only the tags it knows. Images: only ones embedded in the file (data: URIs) can be drawn; an
// image given by a web address or a path on the author's disk is not fetched (nothing leaves the
// browser) — its alt text is kept in its place and the page says how many were left out.
import { Marked, type Token } from 'marked';

export type TextMode = 'markdown' | 'text';

export interface TextDocument {
  /** A full HTML document with <html lang> and <title>. */
  html: string;
  title: string;
  /** Images given by a web address or a file path, not embedded — not drawn. */
  skippedImages: number;
}

/** The mode a file's extension implies; null when the file is neither Markdown nor text. */
export function modeForFileName(name: string): TextMode | null {
  const ext = /\.([^./\\]+)$/.exec(name.toLowerCase())?.[1] ?? '';
  if (ext === 'md' || ext === 'markdown' || ext === 'mdown' || ext === 'mkd') return 'markdown';
  if (ext === 'txt' || ext === 'text') return 'text';
  return null;
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The 8-bit code page a text file from this language's Windows is most likely saved in. Read as
 * UTF-8, such a file has no Polish letters (each becomes "�"), so it is read again in this one.
 */
const LEGACY_ENCODING: Record<string, string> = { pl: 'windows-1250', cs: 'windows-1250', ro: 'windows-1250', ru: 'windows-1251', uk: 'windows-1251' };

/** A text file's bytes as text: UTF-8 (with or without BOM, or UTF-16 with BOM), else the code page of `locale`. */
export function decodeTextFile(bytes: Uint8Array, locale: string): { text: string; encoding: string } {
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) return { text: new TextDecoder('utf-16le').decode(bytes.subarray(2)), encoding: 'UTF-16' };
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) return { text: new TextDecoder('utf-16be').decode(bytes.subarray(2)), encoding: 'UTF-16' };
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, ''), encoding: 'UTF-8' };
  } catch {
    const enc = LEGACY_ENCODING[locale] ?? 'windows-1252';
    return { text: new TextDecoder(enc).decode(bytes), encoding: enc.replace('windows-', 'Windows-') };
  }
}

/** The file name without its extension, used as the title when the text has none. */
export function baseName(name: string): string {
  return name.replace(/\.[^./\\]+$/, '').trim();
}

const isEmbedded = (href: string) => /^data:image\//i.test(href.trim());

function plainText(tokens: Token[] | undefined): string {
  if (!tokens) return '';
  return tokens.map((t) => {
    const nested = (t as { tokens?: Token[] }).tokens;
    if (nested) return plainText(nested);
    return 'text' in t && typeof t.text === 'string' ? t.text : '';
  }).join('');
}

function wrap(body: string, title: string, lang: string): string {
  return `<!DOCTYPE html><html lang="${escapeHtml(lang)}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body>${body}</body></html>`;
}

export function markdownToDocument(src: string, opts: { lang: string; fallbackTitle: string }): TextDocument {
  let skippedImages = 0;
  const md = new Marked({
    gfm: true,
    async: false,
    renderer: {
      image({ href, title, text }) {
        if (isEmbedded(href)) {
          return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${title ? ` title="${escapeHtml(title)}"` : ''}>`;
        }
        skippedImages++;
        return text ? `<em>[${escapeHtml(text)}]</em>` : '';
      },
    },
  });
  const tokens = md.lexer(src);
  const heading = tokens.find((t): t is Extract<Token, { type: 'heading' }> => t.type === 'heading');
  const firstHeading = heading ? plainText(heading.tokens).replace(/\s+/g, ' ').trim() : '';
  let body = md.parser(tokens) as string;
  // <img> written as raw HTML in the Markdown: the PDF writer drops any that is not embedded.
  skippedImages += (body.match(/<img\b(?![^>]*\bsrc\s*=\s*["']?\s*data:image\/)[^>]*>/gi) ?? []).length;
  body = body.replace(/<img\b(?![^>]*\bsrc\s*=\s*["']?\s*data:image\/)[^>]*>/gi, '');
  const title = firstHeading || opts.fallbackTitle;
  return { html: wrap(body, title, opts.lang), title, skippedImages };
}

/**
 * Plain text: a blank line starts a new paragraph and a line break is kept as one, so a text that
 * was wrapped by hand looks as it was written. `keepLayout` sets it all in the monospace font with
 * every space kept (tables drawn with spaces, ASCII diagrams, logs).
 */
export function plainTextToDocument(src: string, opts: { lang: string; fallbackTitle: string; keepLayout?: boolean }): TextDocument {
  const text = src.replace(/\r\n?/g, '\n').replace(/^﻿/, '');
  const firstLine = text.split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  const title = opts.fallbackTitle || firstLine.slice(0, 80);
  const body = opts.keepLayout
    ? `<pre>${escapeHtml(text)}</pre>`
    : text.split(/\n[ \t]*\n+/).map((p) => p.replace(/^\n+|\n+$/g, '')).filter((p) => p.trim())
      .map((p) => `<p>${p.split('\n').map(escapeHtml).join('<br>')}</p>`).join('\n');
  return { html: wrap(body, title, opts.lang), title, skippedImages: 0 };
}
