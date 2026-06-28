# PDFTools

Darmowe internetowe narzędzia do edycji plików PDF. Scalaj, dziel, kompresuj, konwertuj i edytuj PDFy online.

## Wymagania

- Node.js 18+
- npm

## Instalacja

```bash
npm install
```

## Konfiguracja

Skopiuj `.env.local` i ustaw klucze API:

```
ILOVEPDF_PUBLIC_KEY=...
ILOVEPDF_SECRET_KEY=...
```

## Uruchomienie

```bash
npm run dev
```

## Budowa

```bash
npm run build
```

## Narzędzia

- Połącz PDF (`/merge`)
- Podziel PDF (`/split`)
- Kompresuj PDF (`/compress`)
- PDF do Word (`/pdf-to-word`)
- Word do PDF (`/word-to-pdf`)
- JPG do PDF (`/jpg-to-pdf`)
- PDF do JPG (`/pdf-to-jpg`)
- Chroń PDF (`/protect-pdf`)
- Odblokuj PDF (`/unlock-pdf`)
- Obróć PDF (`/rotate-pdf`)
- Znak wodny (`/watermark-pdf`)
- Numery stron (`/page-numbers`)
- OCR PDF (`/ocr-pdf`)

## Technologie

- Next.js 16
- React 19
- Tailwind CSS 4
- TypeScript
- iLovePDF API

## Deploy na Vercel

1. **Utwórz konto** na [github.com](https://github.com/signup)
2. **Utwórz repozytorium** na GitHub i wypchnij kod:
   ```bash
   echo "# pdftools" >> README.md
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TWOJA_NAZWA/pdftools.git
   git push -u origin main
   ```
3. **Wejdź na** [vercel.com](https://vercel.com) i zaloguj przez GitHub
4. **Kliknij "Add New → Project"**, wybierz repozytorium `pdftools`
5. **Dodaj zmienne środowiskowe** w Vercel (Settings → Environment Variables):
   - Wartości z pliku `.env.local` (klucze iLovePDF i OpenRouter)
6. **Kliknij "Deploy"** – Vercel zbuduje i uruchomi stronę
7. Vercel da Ci domenę tymczasową (`pdftools.vercel.app`)

## Podpięcie domeny optimapdf.com (Hostinger)

1. W panelu Vercel: **Your Project → Settings → Domains → Add** → wpisz `optimapdf.com`
2. Vercel pokaże Ci rekordy DNS do dodania (zwykle `A` na `76.76.21.21` i `CNAME` dla `www`)
3. W panelu Hostinger (hPanel): **DNS Zone / DNS Manager**
4. Dodaj wskazane rekordy:
   - Typ: `A`, Nazwa: `@`, Wartość: `76.76.21.21`
   - Typ: `CNAME`, Nazwa: `www`, Wartość: `cname.vercel-dns.com`
5. Odczekaj kilka minut (propagacja DNS) – strona będzie dostępna pod optimapdf.com
