import type { LegalTexts } from './types';

const en: LegalTexts = {
  privacy: {
    title: 'Privacy Policy',
    updated: 'Last updated: October 14, 2026',
    sections: [
      {
        h: '1. The short version',
        p: 'OptimaPDF tools run in your browser: the files you work on are not sent to our server or anywhere else. Only what two features need reaches the server — text for the AI features and a page address for URL to PDF. We collect visit statistics (Google Analytics) only with your consent. There are no user accounts.',
      },
      {
        h: '2. Data controller',
        p: 'The controller of personal data is Leszek Hofman, Dąbrówka Nowa, Poland. Contact: kontakt@optimapdf.com. No Data Protection Officer has been appointed — write to the address above about anything concerning your data.',
      },
      {
        h: '3. What data we process',
        sub: [
          {
            h: '3.1 Your files',
            p: 'All file tools — including merge, split, compress, OCR, edit, sign, redact, password protection and every file conversion (PDF ↔ Word, Excel, PowerPoint, OpenOffice, images, HTML, EPUB, TXT, SVG) — run entirely in your browser (JavaScript and WebAssembly). The file is not sent to our server. Only the application files, fonts and OCR language data are downloaded from it.',
          },
          {
            h: '3.2 AI features (AI Chat, AI Summary, AI Translate)',
            p: 'When you use an AI feature, the text extracted from your file (and, in the chat, your question) is sent through our server to OpenRouter, Inc. (USA), which passes it to the provider of the language model (currently OpenAI GPT-4o mini, served by OpenAI or Microsoft Azure). The tool tells you so before anything is sent.',
            items: [
              'Every request requires a provider that, according to OpenRouter, does not store data beyond the request and does not train models on it. If no such provider is available, the request fails — it is not sent to another one.',
              'The request is sent by our server with the site\'s shared API key: OpenRouter does not receive your IP address or browser details, and you do not need a key of your own.',
              'We do not store the text sent or the answer.',
              'The limit is 15 requests a day per IP address. The counter (your IP address and the number of requests) is kept in an Upstash database for 24 hours from the first request and then deleted automatically.',
            ],
          },
          {
            h: '3.3 URL to PDF',
            p: 'The page address you enter reaches our server, which downloads that page and makes a PDF of it. We store neither the address, nor the page, nor the PDF. The limit is 30 conversions per 10 minutes per IP address — the counter is kept in an Upstash database for 10 minutes.',
          },
          {
            h: '3.4 Technical data',
            p: 'Our hosting provider (Vercel Inc.) processes technical data when serving requests — IP address, page address, time and browser type — to run and protect the site. Our server logs only rejected API requests (for example an exceeded limit or a request from another site), with the IP address shortened to its first three parts (e.g. 203.0.113.0).',
          },
          {
            h: '3.5 Stored in your browser',
            p: 'Some settings are stored on your device. They are not sent to us or to third parties:',
            items: [
              'localStorage: theme (light/dark), chosen language, your choice about analytics, tool settings and the list of recently used tools.',
              'The "x-detected-locale" cookie (up to 12 months) with the chosen language, so the site opens in your language. It is necessary for the language versions to work and needs no consent.',
              'The application cache (service worker): site files and downloaded OCR language data, so the tools work faster and offline.',
              'After connecting Google Drive: an access token in sessionStorage, removed when you close the tab or when it expires.',
            ],
          },
          {
            h: '3.6 Google Drive, Dropbox and OneDrive',
            p: 'If you choose to open a file from the cloud or save to it, the file travels directly between your browser and the provider you chose (Google, Dropbox, Microsoft) — not through our server. You sign in in that provider\'s window, and its terms and privacy policy apply to that operation. Google Drive gives us access only to files opened or created by OptimaPDF; Dropbox to saving files; OneDrive and SharePoint to the files the Microsoft window asks for.',
          },
        ],
      },
      {
        h: '4. Legal basis',
        items: [
          'Art. 6(1)(b) GDPR — providing the service you request: the AI features and URL to PDF.',
          'Art. 6(1)(f) GDPR — the controller\'s legitimate interest: running and securing the site, request limits, abuse prevention, technical logs.',
          'Art. 6(1)(a) GDPR — your consent: visit statistics in Google Analytics. You can withdraw it at any time (section 10).',
        ],
      },
      {
        h: '5. Recipients',
        p: 'Data is processed on our behalf by, or received by:',
        items: [
          'Vercel Inc. (USA) — hosting of the site and the application server.',
          'Upstash, Inc. (USA) — the database of request-limit counters (IP address and number of requests).',
          'OpenRouter, Inc. (USA) and the model provider OpenRouter passes the request to — only when you use the AI features.',
          'Google LLC (USA) — Google Analytics, only with your consent.',
          'Public authorities — only where the law requires it.',
        ],
      },
      {
        h: '6. Transfers outside the EEA',
        p: 'The application server runs in a Vercel data centre in the USA, and all recipients in section 5 are based in the USA. The data described in sections 3.2–3.4 and Google Analytics data are therefore transferred to the USA. Vercel Inc. and Google LLC are certified under the EU-US Data Privacy Framework (Commission Implementing Decision (EU) 2023/1795); Vercel also uses the Standard Contractual Clauses. For Upstash and OpenRouter the transfer takes place under their data processing terms. Your files are not transferred anywhere (section 3.1).',
      },
      {
        h: '7. How long we keep data',
        items: [
          'Your files: they never reach us. In the browser they are gone when you close or reload the page.',
          'Text sent to the AI and page addresses for conversion: we do not store them.',
          'AI limit counter (IP address): 24 hours from the first request. URL to PDF counter: 10 minutes.',
          'Server logs at the hosting provider: 1 hour on the current Vercel plan.',
          'Google Analytics data: according to the data retention setting in Google Analytics, at most 14 months.',
          'Settings in your browser: until you delete them; the language cookie up to 12 months.',
        ],
      },
      {
        h: '8. Your rights',
        p: 'You have the right of access (Art. 15 GDPR), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18), data portability (Art. 20), to object (Art. 21), and to withdraw consent at any time without affecting the lawfulness of processing before the withdrawal. You may also lodge a complaint with a supervisory authority — in Poland the President of the Personal Data Protection Office (ul. Stawki 2, 00-193 Warsaw). There are no accounts, so technical data usually cannot be linked to a particular person (Art. 11 GDPR) — write to us and we will see what we can do.',
      },
      {
        h: '9. Security',
        items: [
          'Encrypted HTTPS connection with HSTS.',
          'A Content Security Policy and headers that prevent the site from being embedded in other sites and block access to the camera, microphone and location.',
          'Origin checks on API requests (CSRF protection), request limits and a request size limit (100 MB).',
          'URL to PDF does not fetch internal network addresses or the server\'s cloud services (SSRF protection).',
          'Details: the "Security" page.',
        ],
      },
      {
        h: '10. Google Analytics and consent',
        p: 'With your consent we use Google Analytics 4 (Google LLC) to count visits and see which tools are used. Google then stores cookies with an identifier in your browser (_ga, _ga_*) and receives data about the visit: pages viewed, approximate location, device and browser type, and where you came from.',
        items: [
          'Without consent the Google Analytics script is not loaded at all — the site does not contact Google.',
          'You can change or withdraw your consent at any time with the "Cookie settings" button at the bottom of every page. Withdrawing turns Google Analytics off at once and deletes its cookies.',
          'We do not use Google Analytics for advertising or profiling. The files you work on never reach Google.',
        ],
      },
      {
        h: '11. Changes',
        p: 'We may change this policy when the way the site works changes; the date of the last change is at the top of the page. Questions: kontakt@optimapdf.com.',
      },
    ],
  },

  rodo: {
    title: 'GDPR Information',
    updated: 'Last updated: October 14, 2026',
    sections: [
      {
        h: '1. Data controller',
        p: 'The controller of personal data is Leszek Hofman, Dąbrówka Nowa, Poland (optimapdf.com). Contact for anything concerning your data: kontakt@optimapdf.com.',
      },
      {
        h: '2. What data we process and why',
        items: [
          'Your files — we do not process them on a server. All file tools run in your browser and the file does not leave your device.',
          'Text sent to the AI features — we pass it through our server to OpenRouter and the model provider to carry out your request (summary, translation, answer). We do not store it.',
          'The page address for URL to PDF — our server downloads that page and makes a PDF. We do not store it.',
          'IP address — to count request limits (AI: 24 hours, URL to PDF: 10 minutes) and prevent abuse; in the server log only for a rejected request, and shortened.',
          'Visit data in Google Analytics — only with your consent.',
          'Settings (theme, language, analytics choice) — stored only in your browser.',
        ],
      },
      {
        h: '3. Legal bases',
        items: [
          'Art. 6(1)(b) GDPR — providing the service you request (AI features, URL to PDF).',
          'Art. 6(1)(f) GDPR — legitimate interest: security and request limits.',
          'Art. 6(1)(a) GDPR — consent to Google Analytics.',
        ],
      },
      {
        h: '4. Retention',
        items: [
          'Files, text sent to the AI and page addresses for conversion: not stored.',
          'Request-limit counters with the IP address: 24 hours (AI) and 10 minutes (URL to PDF).',
          'Server logs at the hosting provider: 1 hour (current Vercel plan).',
          'Google Analytics: at most 14 months.',
          'Settings in your browser: until you delete them; the language cookie up to 12 months.',
        ],
      },
      {
        h: '5. Recipients',
        p: 'We do not sell data or share it for marketing. Data is processed on our behalf by Vercel Inc. (hosting), Upstash, Inc. (request-limit counters), OpenRouter, Inc. and the model provider (AI features only), and — with your consent — Google LLC (Google Analytics). All are based in the USA.',
      },
      {
        h: '6. Transfers to third countries',
        p: 'The application server runs in the USA, so the data in section 2 (other than files and browser settings) is transferred to the USA. Vercel and Google are certified under the EU-US Data Privacy Framework (Commission Decision (EU) 2023/1795); Upstash and OpenRouter process data under their data processing terms.',
      },
      {
        h: '7. Your rights',
        items: [
          'Access (Art. 15) and rectification (Art. 16).',
          'Erasure (Art. 17) and restriction of processing (Art. 18).',
          'Data portability (Art. 20) and objection (Art. 21).',
          'Withdrawing consent at any time — for Google Analytics with the "Cookie settings" button at the bottom of the page.',
        ],
      },
      {
        h: '8. How to exercise your rights',
        p: 'Write to kontakt@optimapdf.com. We reply within 30 days, free of charge (unless a request is manifestly unfounded or excessive — Art. 12(5) GDPR). There are no accounts, so technical data usually cannot be linked to a particular person (Art. 11 GDPR).',
      },
      {
        h: '9. Complaints',
        p: 'If you believe we process your data in breach of the GDPR, you may lodge a complaint with a supervisory authority — in Poland the President of the Personal Data Protection Office, ul. Stawki 2, 00-193 Warsaw.',
      },
      {
        h: '10. Cookies and browser storage',
        p: 'We use one necessary cookie (x-detected-locale — the site language, up to 12 months) and localStorage for settings. Google Analytics cookies (_ga, _ga_*) appear only after your consent and are removed when you withdraw it. We use no advertising cookies.',
      },
      {
        h: '11. Changes',
        p: 'We update this information when the way the site works changes; the date of the last change is at the top of the page.',
      },
    ],
  },

  security: {
    title: 'Security',
    updated: 'Last updated: October 14, 2026',
    intro: 'The most important safeguard of OptimaPDF is something we do not do: we do not send your files to a server. Below is how that works and what the other safeguards are — only the ones we actually use.',
    sections: [
      {
        h: '1. Files stay on your device',
        p: 'All file tools, including compression, OCR and conversions, run in your browser (JavaScript and WebAssembly). The file is not sent to a server, so no one on our side can access it. You can check this yourself: open your browser\'s developer tools (F12), the "Network" tab, and process a file — you will not see the file being uploaded. Only text for the AI features and a page address for URL to PDF reach the server.',
      },
      {
        h: '2. Encrypted connection',
        p: 'The site works only over HTTPS. The HSTS header (with an entry on the browsers\' preload list) makes the browser always connect securely, even on the first visit.',
      },
      {
        h: '3. Protection in the browser',
        items: [
          'A Content Security Policy limits where the site may load scripts from and what it may connect to: our domain and the services named in it (Google sign-in, Dropbox, Microsoft and, after consent, Google Analytics).',
          'The site cannot be embedded in another site (X-Frame-Options: DENY, frame-ancestors) — protecting you from clickjacking.',
          'Permissions-Policy blocks access to the camera, microphone, location, USB and payments.',
          'X-Content-Type-Options and Referrer-Policy limit file-type guessing and the passing on of page addresses.',
        ],
      },
      {
        h: '4. Server protection',
        items: [
          'API requests are accepted only from our own site (Origin and Referer checks — CSRF protection).',
          'Request limits: 30 a minute per IP address for the API, 15 a day for the AI features, 30 per 10 minutes for URL to PDF; a request size limit of 100 MB.',
          'URL to PDF rejects addresses of private and local networks and of the server\'s cloud services, and the address checked is the same one the server connects to (protection against SSRF and DNS rebinding).',
          'API input is checked on the server (text length, allowed translation languages).',
        ],
      },
      {
        h: '5. AI features',
        p: 'We send the AI only the text extracted from the file and your question — without your IP address or browser details, through our server and its API key (you need no key of your own). Every request requires a provider that, according to OpenRouter, does not store data beyond the request and does not train models on it; if none is available, the request is not carried out.',
      },
      {
        h: '6. No accounts or profiles',
        p: 'We require no registration or sign-in, store no passwords and build no user profiles. Passwords for protecting and unlocking PDFs and certificates for signing are used only in your browser.',
      },
      {
        h: '7. Dependencies',
        p: 'We keep libraries up to date and check them for known vulnerabilities with npm audit and a test that reports every new high or critical advisory in the dependencies the site uses.',
      },
      {
        h: '8. Reporting a vulnerability',
        p: 'If you find a security flaw, write to kontakt@optimapdf.com. We commit to:',
        items: [
          'confirm receipt within 24 hours,',
          'analyse it and ship a fix within 14 days (depending on severity),',
          'tell you what we did,',
          'take no legal action against people who report vulnerabilities in good faith.',
        ],
      },
      {
        h: '9. Certifications',
        p: 'OptimaPDF holds no ISO 27001 or SOC 2 certification of its own. Our hosting provider, Vercel, is ISO 27001:2022 certified and has a SOC 2 Type 2 report. Since files never reach our server, there are no files "at rest" on our side to encrypt.',
      },
      {
        h: '10. Digital signatures and eIDAS',
        p: 'The "Sign PDF" tool creates a PAdES digital signature with your own certificate (.p12/.pfx) — entirely in the browser; neither the file nor the certificate is sent anywhere. It is a real cryptographic signature, but not automatically a qualified electronic signature (QES) under the eIDAS Regulation (EU 910/2014): QES status depends on whether the certificate was issued by a qualified trust service provider and the key is on a qualified device.',
      },
    ],
  },

  principles: {
    security: 'We use an encrypted HTTPS connection, a Content Security Policy, API abuse protection and request limits. Most importantly, the file tools run in your browser, so your files never reach our server at all.',
    tracking: 'The site currently shows no ads. In the future we may introduce discreet ads (e.g. Google AdSense) to cover hosting and development costs — if that happens, we will update this information. Either way, all PDF tools will stay free and unlimited. We use Google Analytics only with your consent, which you can withdraw at any time with the "Cookie settings" button. We use no remarketing pixels or behavioural profiling.',
  },
};

export default en;
