// ESM loader: remap the browser build specifier to the legacy build so the
// library's dynamic `import('pdfjs-dist')` works under Node/tsx for testing.
// Test-only; not part of the app.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'pdfjs-dist') {
    return nextResolve('pdfjs-dist/legacy/build/pdf.mjs', context);
  }
  return nextResolve(specifier, context);
}