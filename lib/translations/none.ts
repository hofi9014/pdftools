// Browser stand-in for ./all.ts (the "browser" condition of '#translations' in package.json): none in
// the client bundle. A page registers its own language through components/Translations.tsx.
export const all: Record<string, Record<string, string>> = {};
