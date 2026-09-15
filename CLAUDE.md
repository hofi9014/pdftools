# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev              # dev server
npm run build            # copies tesseract/pdfjs static assets, then next build (also runs guide validation at build time)
npm run lint             # eslint
npm run validate:guides  # validates content/guides/*.ts: translations, excerpt length, ToolSlug correctness
npm run test:regression  # pdf-to-excel round-trip regression harness (tests/pdf-excel-regression.mts)
npm run test:pptx        # PDF→PPTX orchestrator regression test (tests/pptx-orchestrator-c3.mts)
```

There is no unit-test framework (no Jest/Vitest). Correctness is checked by the standalone
regression scripts above plus one-off scripts under `tests/*.mts` and `scripts/verify_pptx_*.py`,
each runnable individually and CI-ready (exit 0/1):

```bash
npx tsx tests/pdf-images-c1.mts     # example: run a single regression script directly
```

`tests/` and `scripts/` are excluded from `tsconfig.json` — they're type-checked/run via `tsx`,
not by `next build`. `e2e/*.spec.ts` are Playwright specs (playwright is a devDependency).

## Architecture

**Read `AGENTS.md` first (imported above) — it is the primary architecture reference**
(client-side PDF engine, page inventory, cloud integrations, backend endpoints, guides
system, WinAnsi/font findings, and an ongoing log of FINDINGs from prior sessions that are
easy to rediscover the hard way). The notes below cover structure AGENTS.md doesn't spell out.

### This is a customized Next.js — read `node_modules/next/dist/docs/` before assuming conventions

Confirmed non-standard convention in this repo: **`middleware.ts` does not exist — its
replacement is `proxy.ts`** at the repo root, exporting a `proxy()` function (not
`middleware()`) with the usual `config.matcher`. It handles, for every `/api/*` request:
request logging, in-memory per-IP rate limiting (30 req/60s), CSRF origin/referer checks on
state-changing methods, and upload size rejection — and for page routes, legacy
(non-locale-prefixed) URL redirects to `/{locale}/{slug}`. Don't assume other APIs match
your training data either — check the local docs when something looks off.

### Tool pages: two files per tool, not one

Every tool lives as **two page files**:
- `app/{tool}/page.tsx` — the actual `'use client'` component with all logic. Takes an
  optional `locale` prop; falls back to the `useLocale()` context hook when not given (this
  is what legacy non-prefixed routes render).
- `app/[locale]/{tool}/page.tsx` — a thin async server component: resolves `params.locale`,
  builds `generateMetadata` via `lib/metadata.ts`, and renders the sibling component with
  `locale` forced. No client logic belongs here.

Adding a new tool means creating both files; the locale list (`LOCALES`) is currently
duplicated between `proxy.ts` and `lib/i18n.ts` — keep them in sync.

### API surface is intentionally tiny

Only three server routes exist (`app/api/ai`, `app/api/exports`, `app/api/url-to-pdf`) —
every other tool runs entirely client-side against `lib/client-pdf.ts` and its siblings
(`lib/client-pdf-docx.ts`, `lib/client-pptx.ts`, `lib/client-ocr.ts`, `lib/client-ai.ts`).
When adding a feature, default to client-side; a new server route is the exception.

## Security audit reference

`AUDYT-BEZPIECZENSTWA.md` records the 2026-09-15 security-audit session and its follow-ups:
closed items (SEC-001 AI rate-limit persistence moved to Upstash Redis; SEC-004/006/007/012;
the Google Drive/Dropbox/OneDrive cloud-picker bugs SEC-011/013/014/015/016; **SEC-003b** —
`url-to-pdf` DNS-rebinding TOCTOU, fixed by freezing a validated address list into a custom
`http(s).request` `lookup` instead of letting `fetch()` re-resolve, see
[app/api/url-to-pdf/route.ts](app/api/url-to-pdf/route.ts) and
[tests/url-to-pdf-ssrf.mts](tests/url-to-pdf-ssrf.mts); A4 unused-dependency removal), open
items (**Etap 2** — decide whether `lib/exports.ts`'s in-memory file store should exist at
all, since it contradicts the "files never leave the browser" claim for the Dropbox Saver
path; SEC-005 OneDrive/SharePoint OAuth scope review; QA-001 AI rate limit shouldn't be
spent on provider errors), and verified infra facts (Vercel Hobby/`iad1`, Upstash env var
names carry an unexpected `KV` segment — `Redis.fromEnv()` will not find them, exact OAuth
redirect URIs).

Verification principles from that session, worth reapplying to any future security or
correctness work here:
1. Review the actual diff, not a description of it.
2. Compare `tsc`/lint output against a `git stash` baseline, not in isolation.
3. A convincing test exercises something other than compilation — `tsc`/lint/build all
   pass even when the logic under test is dead.
4. Verify with an independent tool where one exists (`curl` against prod, `openpyxl`/
   `python-docx`/Pillow for file-format claims).
5. Don't guess library APIs or platform-injected env var names — confirm them before
   relying on them (this session's false assumptions: `gapi.picker` instead of
   `google.picker`; `Redis.fromEnv()` instead of the Vercel-injected `*_KV_*` names).
