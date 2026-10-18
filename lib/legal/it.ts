import type { LegalTexts } from './types';

const it: LegalTexts = {
  privacy: {
    title: 'Informativa sulla privacy',
    updated: 'Ultimo aggiornamento: 14 ottobre 2026',
    sections: [
      {
        h: '1. In breve',
        p: 'Gli strumenti di OptimaPDF funzionano nel tuo browser: i file su cui lavori non vengono inviati al nostro server né altrove. Al server arriva solo ciò che serve a due funzioni: il testo per le funzioni di IA e l’indirizzo di una pagina per URL in PDF. Le statistiche delle visite (Google Analytics) vengono raccolte solo con il tuo consenso. Non esistono account utente.',
      },
      {
        h: '2. Titolare del trattamento',
        p: 'Il titolare dei dati personali è Leszek Hofman, Dąbrówka Nowa, Polonia. Contatto: kontakt@optimapdf.com. Non è stato nominato un Responsabile della protezione dei dati: scrivi all’indirizzo indicato per qualsiasi questione relativa ai tuoi dati.',
      },
      {
        h: '3. Quali dati trattiamo',
        sub: [
          {
            h: '3.1 I tuoi file',
            p: 'Tutti gli strumenti per i file — tra cui unire, dividere, comprimere, OCR, modificare, firmare, oscurare, proteggere con password e tutte le conversioni (PDF ↔ Word, Excel, PowerPoint, OpenOffice, immagini, HTML, EPUB, TXT, SVG) — funzionano interamente nel tuo browser (JavaScript e WebAssembly). Il file non viene inviato al nostro server. Dal server vengono scaricati solo i file dell’applicazione, i caratteri e i dati linguistici per l’OCR.',
          },
          {
            h: '3.2 Funzioni di IA (Chat IA, Riassunto IA, Traduttore IA)',
            p: 'Quando usi una funzione di IA, il testo estratto dal file (e, nella chat, la tua domanda) viene inviato tramite il nostro server a OpenRouter, Inc. (USA), che lo passa al fornitore del modello linguistico (attualmente OpenAI GPT-4o mini, fornito da OpenAI o Microsoft Azure). Lo strumento te lo segnala prima di inviare qualsiasi cosa.',
            items: [
              'Ogni richiesta richiede un fornitore che, secondo OpenRouter, non conservi i dati oltre la richiesta e non li usi per addestrare modelli. Se nessuno è disponibile, la richiesta non va a buon fine: non viene inviata a un altro.',
              'La richiesta è inviata dal nostro server con la chiave API comune del sito: OpenRouter non riceve il tuo indirizzo IP né i dati del browser e non ti serve una chiave tua.',
              'Non conserviamo il testo inviato né la risposta.',
              'Il limite è di 15 richieste al giorno per indirizzo IP. Il contatore (il tuo indirizzo IP e il numero di richieste) è conservato in un database Upstash per 24 ore dalla prima richiesta e poi eliminato automaticamente.',
            ],
          },
          {
            h: '3.3 URL in PDF',
            p: 'L’indirizzo della pagina che inserisci arriva al nostro server, che scarica la pagina e ne crea un PDF. Non conserviamo né l’indirizzo, né la pagina, né il PDF. Il limite è di 30 conversioni ogni 10 minuti per indirizzo IP; il contatore è conservato in un database Upstash per 10 minuti.',
          },
          {
            h: '3.4 Dati tecnici',
            p: 'Il nostro fornitore di hosting (Vercel Inc.) tratta dati tecnici nel gestire le richieste — indirizzo IP, indirizzo della pagina, orario e tipo di browser — per far funzionare e proteggere il sito. Il nostro server registra solo le richieste all’API rifiutate (ad esempio un limite superato o una richiesta da un altro sito), con l’indirizzo IP abbreviato alle prime tre parti (es. 203.0.113.0).',
          },
          {
            h: '3.5 Salvato nel tuo browser',
            p: 'Alcune impostazioni sono salvate sul tuo dispositivo. Non vengono inviate né a noi né a terzi:',
            items: [
              'localStorage: tema (chiaro/scuro), lingua scelta, la tua scelta sull’analisi delle visite, impostazioni degli strumenti ed elenco degli strumenti usati di recente.',
              'Il cookie «x-detected-locale» (fino a 12 mesi) con la lingua scelta, perché il sito si apra nella tua lingua. È necessario al funzionamento delle versioni linguistiche e non richiede consenso.',
              'La cache dell’applicazione (service worker): file del sito e dati linguistici OCR scaricati, perché gli strumenti funzionino più velocemente e offline.',
              'Dopo il collegamento a Google Drive: un token di accesso in sessionStorage, rimosso alla chiusura della scheda o alla scadenza.',
            ],
          },
          {
            h: '3.6 Google Drive, Dropbox e OneDrive',
            p: 'Se scegli di aprire un file dal cloud o di salvarlo lì, il file passa direttamente tra il tuo browser e il fornitore scelto (Google, Dropbox, Microsoft), non attraverso il nostro server. Accedi nella finestra di quel fornitore, le cui condizioni e informativa sulla privacy si applicano a tale operazione. Google Drive ci dà accesso solo ai file aperti o creati con OptimaPDF; Dropbox al salvataggio dei file; OneDrive e SharePoint ai file richiesti dalla finestra Microsoft.',
          },
        ],
      },
      {
        h: '4. Base giuridica',
        items: [
          'Art. 6, par. 1, lett. b) GDPR — erogazione del servizio che richiedi: funzioni di IA e URL in PDF.',
          'Art. 6, par. 1, lett. f) GDPR — legittimo interesse del titolare: funzionamento e sicurezza del sito, limiti di richieste, prevenzione degli abusi, registri tecnici.',
          'Art. 6, par. 1, lett. a) GDPR — il tuo consenso alle statistiche delle visite di Google Analytics. Puoi revocarlo in qualsiasi momento (sezione 10).',
        ],
      },
      {
        h: '5. Destinatari',
        p: 'I dati sono trattati per nostro conto da, o ricevuti da:',
        items: [
          'Vercel Inc. (USA) — hosting del sito e del server dell’applicazione.',
          'Upstash, Inc. (USA) — database dei contatori dei limiti (indirizzo IP e numero di richieste). Il database si trova nell’area di Washington D.C. (USA, regione iad1).',
          'OpenRouter, Inc. (USA) e il fornitore del modello a cui OpenRouter passa la richiesta — solo quando usi le funzioni di IA.',
          'Google LLC (USA) — Google Analytics, solo con il tuo consenso.',
          'Autorità pubbliche — solo quando la legge lo richiede.',
        ],
      },
      {
        h: '6. Trasferimenti al di fuori del SEE',
        p: 'Il server dell’applicazione funziona in un data center Vercel negli USA e tutti i destinatari della sezione 5 hanno sede negli USA. I dati descritti nelle sezioni 3.2–3.4 e quelli di Google Analytics sono quindi trasferiti negli USA. Vercel Inc. e Google LLC sono certificate nell’ambito del Data Privacy Framework UE-USA (decisione di esecuzione (UE) 2023/1795 della Commissione); Vercel applica inoltre le clausole contrattuali tipo. Per Upstash e OpenRouter il trasferimento avviene secondo le loro condizioni di trattamento dei dati. I tuoi file non vengono trasferiti da nessuna parte (sezione 3.1).',
      },
      {
        h: '7. Per quanto tempo conserviamo i dati',
        items: [
          'I tuoi file: non ci arrivano mai. Nel browser scompaiono alla chiusura o al ricaricamento della pagina.',
          'Testo inviato all’IA e indirizzi di pagine da convertire: non li conserviamo.',
          'Contatore del limite di IA (indirizzo IP): 24 ore dalla prima richiesta. Contatore URL in PDF: 10 minuti.',
          'Registri del server presso il fornitore di hosting: 1 ora con l’attuale piano Vercel.',
          'Dati di Google Analytics: secondo l’impostazione di conservazione di Google Analytics, al massimo 14 mesi.',
          'Impostazioni nel browser: finché non le elimini; il cookie della lingua fino a 12 mesi.',
        ],
      },
      {
        h: '8. I tuoi diritti',
        p: 'Hai diritto di accesso (art. 15 GDPR), rettifica (art. 16), cancellazione (art. 17), limitazione del trattamento (art. 18), portabilità (art. 20), opposizione (art. 21) e di revocare il consenso in qualsiasi momento, senza pregiudicare la liceità del trattamento precedente. Puoi anche proporre reclamo a un’autorità di controllo; in Polonia, il Presidente dell’Ufficio per la protezione dei dati personali (ul. Stawki 2, 00-193 Varsavia). Non esistono account, quindi i dati tecnici di solito non possono essere collegati a una persona specifica (art. 11 GDPR): scrivici e vedremo cosa possiamo fare.',
      },
      {
        h: '9. Sicurezza',
        items: [
          'Connessione HTTPS cifrata con HSTS.',
          'Una Content Security Policy e intestazioni che impediscono l’incorporamento del sito in altri siti e bloccano l’accesso a fotocamera, microfono e posizione.',
          'Verifica dell’origine delle richieste all’API (protezione CSRF), limiti di richieste e limite di dimensione delle richieste (100 MB).',
          'URL in PDF non scarica indirizzi di reti interne né dei servizi cloud del server (protezione SSRF).',
          'Dettagli: la pagina «Sicurezza».',
        ],
      },
      {
        h: '10. Google Analytics e consenso',
        p: 'Con il tuo consenso usiamo Google Analytics 4 (Google LLC) per contare le visite e vedere quali strumenti vengono usati. Google salva allora nel tuo browser cookie con un identificatore (_ga, _ga_*) e riceve dati sulla visita: pagine visualizzate, posizione approssimativa, tipo di dispositivo e browser e provenienza.',
        items: [
          'Senza consenso lo script di Google Analytics non viene caricato affatto: il sito non contatta Google.',
          'Puoi modificare o revocare il consenso in qualsiasi momento con il pulsante «Impostazioni cookie» in fondo a ogni pagina. La revoca disattiva subito Google Analytics ed elimina i suoi cookie.',
          'Non usiamo Google Analytics per pubblicità o profilazione. I file che elabori non arrivano mai a Google.',
        ],
      },
      {
        h: '11. Modifiche',
        p: 'Possiamo modificare questa informativa quando cambia il funzionamento del sito; la data dell’ultima modifica è in cima alla pagina. Domande: kontakt@optimapdf.com.',
      },
    ],
  },

  rodo: {
    title: 'Informazioni sul GDPR',
    updated: 'Ultimo aggiornamento: 14 ottobre 2026',
    sections: [
      {
        h: '1. Titolare del trattamento',
        p: 'Il titolare dei dati personali è Leszek Hofman, Dąbrówka Nowa, Polonia (optimapdf.com). Contatto per qualsiasi questione relativa ai tuoi dati: kontakt@optimapdf.com.',
      },
      {
        h: '2. Quali dati trattiamo e perché',
        items: [
          'I tuoi file — non li trattiamo su un server. Tutti gli strumenti per i file funzionano nel tuo browser e il file non lascia il tuo dispositivo.',
          'Testo inviato alle funzioni di IA — lo passiamo tramite il nostro server a OpenRouter e al fornitore del modello per eseguire la tua richiesta (riassunto, traduzione, risposta). Non lo conserviamo.',
          'L’indirizzo della pagina per URL in PDF — il nostro server scarica la pagina e crea un PDF. Non lo conserviamo.',
          'Indirizzo IP — per contare i limiti di richieste (IA: 24 ore, URL in PDF: 10 minuti) e prevenire abusi; nel registro del server solo per una richiesta rifiutata e abbreviato.',
          'Dati delle visite in Google Analytics — solo con il tuo consenso.',
          'Impostazioni (tema, lingua, scelta sull’analisi delle visite) — salvate solo nel tuo browser.',
        ],
      },
      {
        h: '3. Basi giuridiche',
        items: [
          'Art. 6, par. 1, lett. b) GDPR — erogazione del servizio richiesto (funzioni di IA, URL in PDF).',
          'Art. 6, par. 1, lett. f) GDPR — legittimo interesse: sicurezza e limiti di richieste.',
          'Art. 6, par. 1, lett. a) GDPR — consenso a Google Analytics.',
        ],
      },
      {
        h: '4. Periodi di conservazione',
        items: [
          'File, testo inviato all’IA e indirizzi di pagine da convertire: non conservati.',
          'Contatori dei limiti con indirizzo IP: 24 ore (IA) e 10 minuti (URL in PDF).',
          'Registri del server presso il fornitore di hosting: 1 ora (attuale piano Vercel).',
          'Google Analytics: al massimo 14 mesi.',
          'Impostazioni nel browser: finché non le elimini; il cookie della lingua fino a 12 mesi.',
        ],
      },
      {
        h: '5. Destinatari',
        p: 'Non vendiamo dati né li condividiamo per finalità di marketing. Trattano dati per nostro conto: Vercel Inc. (hosting), Upstash, Inc. (contatori dei limiti), OpenRouter, Inc. e il fornitore del modello (solo funzioni di IA) e, con il tuo consenso, Google LLC (Google Analytics). Tutti hanno sede negli USA.',
      },
      {
        h: '6. Trasferimenti verso paesi terzi',
        p: 'Il server dell’applicazione funziona negli USA, quindi i dati della sezione 2 (esclusi file e impostazioni del browser) sono trasferiti negli USA. Vercel e Google sono certificate nell’ambito del Data Privacy Framework UE-USA (decisione (UE) 2023/1795 della Commissione); Upstash e OpenRouter trattano i dati secondo le loro condizioni di trattamento dei dati.',
      },
      {
        h: '7. I tuoi diritti',
        items: [
          'Accesso (art. 15) e rettifica (art. 16).',
          'Cancellazione (art. 17) e limitazione del trattamento (art. 18).',
          'Portabilità (art. 20) e opposizione (art. 21).',
          'Revoca del consenso in qualsiasi momento — per Google Analytics con il pulsante «Impostazioni cookie» in fondo alla pagina.',
        ],
      },
      {
        h: '8. Come esercitare i tuoi diritti',
        p: 'Scrivi a kontakt@optimapdf.com. Rispondiamo entro 30 giorni, gratuitamente (salvo richieste manifestamente infondate o eccessive — art. 12, par. 5 GDPR). Non esistono account, quindi i dati tecnici di solito non possono essere collegati a una persona specifica (art. 11 GDPR).',
      },
      {
        h: '9. Reclamo',
        p: 'Se ritieni che trattiamo i tuoi dati in violazione del GDPR, puoi proporre reclamo a un’autorità di controllo; in Polonia, il Presidente dell’Ufficio per la protezione dei dati personali, ul. Stawki 2, 00-193 Varsavia.',
      },
      {
        h: '10. Cookie e memoria del browser',
        p: 'Usiamo un cookie necessario (x-detected-locale — la lingua del sito, fino a 12 mesi) e localStorage per le impostazioni. I cookie di Google Analytics (_ga, _ga_*) compaiono solo dopo il tuo consenso e vengono rimossi quando lo revochi. Non usiamo cookie pubblicitari.',
      },
      {
        h: '11. Modifiche',
        p: 'Aggiorniamo queste informazioni quando cambia il funzionamento del sito; la data dell’ultima modifica è in cima alla pagina.',
      },
    ],
  },

  security: {
    title: 'Sicurezza',
    updated: 'Ultimo aggiornamento: 14 ottobre 2026',
    intro: 'La protezione più importante di OptimaPDF è qualcosa che non facciamo: non inviamo i tuoi file a un server. Qui spieghiamo come funziona e quali sono le altre protezioni — solo quelle che applichiamo davvero.',
    sections: [
      {
        h: '1. I file restano sul tuo dispositivo',
        p: 'Tutti gli strumenti per i file, compresi compressione, OCR e conversioni, funzionano nel tuo browser (JavaScript e WebAssembly). Il file non viene inviato a un server, quindi nessuno da parte nostra può accedervi. Puoi verificarlo da solo: apri gli strumenti per sviluppatori del browser (F12), la scheda «Rete», ed elabora un file — non vedrai alcun caricamento del file. Al server arrivano solo il testo per le funzioni di IA e l’indirizzo di una pagina per URL in PDF.',
      },
      {
        h: '2. Connessione cifrata',
        p: 'Il sito funziona solo tramite HTTPS. L’intestazione HSTS (con inserimento nell’elenco di precaricamento dei browser) fa sì che il browser si connetta sempre in modo sicuro, anche alla prima visita.',
      },
      {
        h: '3. Protezione nel browser',
        items: [
          'Una Content Security Policy limita da dove il sito può caricare script e con cosa può connettersi: il nostro dominio e i servizi indicati (accesso Google, Dropbox, Microsoft e, dopo il consenso, Google Analytics).',
          'Il sito non può essere incorporato in altri siti (X-Frame-Options: DENY, frame-ancestors), il che protegge dal clickjacking.',
          'Permissions-Policy blocca l’accesso a fotocamera, microfono, posizione, USB e pagamenti.',
          'X-Content-Type-Options e Referrer-Policy limitano l’indovinare dei tipi di file e la trasmissione degli indirizzi delle pagine.',
        ],
      },
      {
        h: '4. Protezione del server',
        items: [
          'Le richieste all’API sono accettate solo dal nostro sito (verifica delle intestazioni Origin e Referer — protezione CSRF).',
          'Limiti di richieste: 30 al minuto per indirizzo IP per l’API, 15 al giorno per le funzioni di IA, 30 ogni 10 minuti per URL in PDF; limite di dimensione delle richieste di 100 MB.',
          'URL in PDF rifiuta gli indirizzi di reti private e locali e dei servizi cloud del server, e l’indirizzo verificato è lo stesso a cui si connette il server (protezione da SSRF e DNS rebinding).',
          'Gli input dell’API sono verificati sul server (lunghezza del testo, lingue di traduzione consentite).',
        ],
      },
      {
        h: '5. Funzioni di IA',
        p: 'All’IA inviamo solo il testo estratto dal file e la tua domanda — senza il tuo indirizzo IP né i dati del browser, tramite il nostro server e la sua chiave API (non te ne serve una tua). Ogni richiesta richiede un fornitore che, secondo OpenRouter, non conservi i dati oltre la richiesta e non li usi per addestrare modelli; se non ce n’è nessuno, la richiesta non viene eseguita.',
      },
      {
        h: '6. Niente account né profili',
        p: 'Non richiediamo registrazione né accesso, non conserviamo password e non creiamo profili utente. Le password per proteggere e sbloccare i PDF e i certificati per firmare sono usati solo nel tuo browser.',
      },
      {
        h: '7. Dipendenze',
        p: 'Manteniamo aggiornate le librerie e ne verifichiamo le vulnerabilità note con npm audit e un test che segnala ogni nuovo avviso di livello alto o critico nelle dipendenze usate dal sito.',
      },
      {
        h: '8. Segnalare una vulnerabilità',
        p: 'Se trovi una falla di sicurezza, scrivi a kontakt@optimapdf.com. Ci impegniamo a:',
        items: [
          'confermare la ricezione entro 24 ore,',
          'analizzarla e pubblicare una correzione entro 14 giorni (secondo la gravità),',
          'informarti su ciò che abbiamo fatto,',
          'non intraprendere azioni legali contro chi segnala vulnerabilità in buona fede.',
        ],
      },
      {
        h: '9. Certificazioni',
        p: 'OptimaPDF non ha una propria certificazione ISO 27001 né SOC 2. Il nostro fornitore di hosting, Vercel, è certificato ISO 27001:2022 e dispone di un rapporto SOC 2 Tipo 2. Poiché i file non arrivano mai al nostro server, da parte nostra non ci sono file «a riposo» da cifrare.',
      },
      {
        h: '10. Firma digitale ed eIDAS',
        p: 'Lo strumento «Firma PDF» crea una firma digitale PAdES con il tuo certificato (.p12/.pfx), interamente nel browser; né il file né il certificato vengono inviati. È una vera firma crittografica, ma non automaticamente una firma elettronica qualificata (QES) ai sensi del regolamento eIDAS (UE 910/2014): lo status QES dipende dal fatto che il certificato sia stato rilasciato da un prestatore di servizi fiduciari qualificato e che la chiave si trovi su un dispositivo qualificato.',
      },
    ],
  },

  principles: {
    security: 'Usiamo una connessione HTTPS cifrata, una Content Security Policy, protezione dell’API dagli abusi e limiti di richieste. Soprattutto, gli strumenti per i file funzionano nel tuo browser, quindi i tuoi file non arrivano mai al nostro server.',
    tracking: 'Al momento il sito non mostra pubblicità. In futuro potremmo introdurre annunci discreti (ad es. Google AdSense) per coprire i costi di hosting e sviluppo; se accadrà, aggiorneremo questa informazione. In ogni caso tutti gli strumenti PDF resteranno gratuiti e senza limiti. Usiamo Google Analytics solo con il tuo consenso, che puoi revocare in qualsiasi momento con il pulsante «Impostazioni cookie». Non usiamo pixel di remarketing né profilazione comportamentale.',
  },
};

export default it;
