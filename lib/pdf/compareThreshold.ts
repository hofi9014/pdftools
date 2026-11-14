// Kept apart from lib/client-pdf.ts so the compare page can read it without loading the engine.

/** Below this, the two files are treated as unrelated documents rather than two versions. */
export const UNRELATED_DOCUMENTS_THRESHOLD = 0.2;
