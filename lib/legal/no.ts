import type { LegalTexts } from './types';

const no: LegalTexts = {
  privacy: {
    title: 'Personvernerklæring',
    updated: 'Sist oppdatert: 14. oktober 2026',
    sections: [
      {
        h: '1. Det viktigste kort fortalt',
        p: 'Verktøyene i OptimaPDF kjører i nettleseren din: filene du jobber med, sendes ikke til serveren vår eller andre steder. Til serveren kommer bare det to funksjoner trenger — tekst for KI-funksjonene og en sideadresse for URL til PDF. Besøksstatistikk (Google Analytics) samles bare inn med ditt samtykke. Det finnes ingen brukerkontoer.',
      },
      {
        h: '2. Behandlingsansvarlig',
        p: 'Behandlingsansvarlig er Leszek Hofman, Dąbrówka Nowa, Polen. Kontakt: kontakt@optimapdf.com. Det er ikke utnevnt personvernombud — skriv til adressen ovenfor i alle spørsmål om opplysningene dine.',
      },
      {
        h: '3. Hvilke opplysninger vi behandler',
        sub: [
          {
            h: '3.1 Filene dine',
            p: 'Alle filverktøy — blant annet slå sammen, dele, komprimere, OCR, redigere, signere, sladde, passordbeskytte og alle filkonverteringer (PDF ↔ Word, Excel, PowerPoint, OpenOffice, bilder, HTML, EPUB, TXT, SVG) — kjører helt i nettleseren din (JavaScript og WebAssembly). Filen sendes ikke til serveren vår. Fra serveren lastes bare programfiler, skrifter og språkdata for OCR ned.',
          },
          {
            h: '3.2 KI-funksjoner (KI-chat, KI-sammendrag, KI-oversetter)',
            p: 'Når du bruker en KI-funksjon, sendes teksten som er hentet ut av filen (og i chatten spørsmålet ditt) via serveren vår til OpenRouter, Inc. (USA), som sender den videre til leverandøren av språkmodellen (for tiden OpenAI GPT-4o mini, levert av OpenAI eller Microsoft Azure). Verktøyet sier fra før noe sendes.',
            items: [
              'Hver forespørsel krever en leverandør som ifølge OpenRouter ikke lagrer opplysningene utover forespørselen og ikke trener modeller på dem. Er ingen slik leverandør tilgjengelig, mislykkes forespørselen — den sendes ikke til en annen.',
              'Forespørselen sendes av serveren vår med nettstedets felles API-nøkkel: OpenRouter får ikke IP-adressen din eller opplysninger om nettleseren, og du trenger ingen egen nøkkel.',
              'Vi lagrer ikke teksten som sendes eller svaret.',
              'Grensen er 15 forespørsler per dag per IP-adresse. Telleren (IP-adressen din og antall forespørsler) lagres i en Upstash-database i 24 timer fra første forespørsel og slettes deretter automatisk.',
            ],
          },
          {
            h: '3.3 URL til PDF',
            p: 'Sideadressen du skriver inn, kommer til serveren vår, som henter siden og lager en PDF av den. Vi lagrer verken adressen, siden eller PDF-en. Grensen er 30 konverteringer per 10 minutter per IP-adresse — telleren lagres i en Upstash-database i 10 minutter.',
          },
          {
            h: '3.4 Tekniske opplysninger',
            p: 'Driftsleverandøren vår (Vercel Inc.) behandler tekniske opplysninger når forespørsler besvares — IP-adresse, sideadresse, tidspunkt og nettlesertype — for å drive og beskytte nettstedet. Serveren vår logger bare avviste API-forespørsler (for eksempel en overskredet grense eller en forespørsel fra et annet nettsted), med IP-adressen forkortet til de tre første delene (f.eks. 203.0.113.0).',
          },
          {
            h: '3.5 Lagret i nettleseren din',
            p: 'Noen innstillinger lagres på enheten din. De sendes ikke til oss eller til tredjeparter:',
            items: [
              'localStorage: tema (lyst/mørkt), valgt språk, valget ditt om statistikk, verktøyinnstillinger og listen over nylig brukte verktøy.',
              'Informasjonskapselen «x-detected-locale» (opptil 12 måneder) med valgt språk, slik at nettstedet åpnes på ditt språk. Den er nødvendig for språkversjonene og krever ikke samtykke.',
              'Programbufferen (service worker): nettstedets filer og nedlastede språkdata for OCR, slik at verktøyene virker raskere og uten nett.',
              'Etter tilkobling til Google Drive: et tilgangstoken i sessionStorage, som fjernes når du lukker fanen eller når det utløper.',
            ],
          },
          {
            h: '3.6 Google Drive, Dropbox og OneDrive',
            p: 'Hvis du selv velger å åpne en fil fra skyen eller lagre dit, går filen direkte mellom nettleseren din og leverandøren du valgte (Google, Dropbox, Microsoft) — ikke via serveren vår. Du logger inn i leverandørens vindu, og leverandørens vilkår og personvernerklæring gjelder for denne handlingen. Google Drive gir oss bare tilgang til filer som er åpnet eller opprettet med OptimaPDF; Dropbox til å lagre filer; OneDrive og SharePoint til filene Microsoft-vinduet ber om.',
          },
        ],
      },
      {
        h: '4. Rettslig grunnlag',
        items: [
          'Art. 6 nr. 1 bokstav b GDPR — å levere tjenesten du ber om: KI-funksjonene og URL til PDF.',
          'Art. 6 nr. 1 bokstav f GDPR — den behandlingsansvarliges berettigede interesse: drift og sikkerhet, forespørselsgrenser, vern mot misbruk, tekniske logger.',
          'Art. 6 nr. 1 bokstav a GDPR — ditt samtykke: besøksstatistikk i Google Analytics. Du kan trekke det tilbake når som helst (punkt 10).',
        ],
      },
      {
        h: '5. Mottakere',
        p: 'Opplysningene behandles på våre vegne av, eller mottas av:',
        items: [
          'Vercel Inc. (USA) — drift av nettstedet og programserveren.',
          'Upstash, Inc. (USA) — databasen for grensetellerne (IP-adresse og antall forespørsler). Databasen ligger i Washington D.C.-området (USA, region iad1).',
          'OpenRouter, Inc. (USA) og modelleverandøren OpenRouter sender forespørselen til — bare når du bruker KI-funksjonene.',
          'Google LLC (USA) — Google Analytics, bare med ditt samtykke.',
          'Offentlige myndigheter — bare når loven krever det.',
        ],
      },
      {
        h: '6. Overføring utenfor EØS',
        p: 'Programserveren kjører i et datasenter hos Vercel i USA, og alle mottakerne i punkt 5 har hovedsete i USA. Opplysningene i punkt 3.2–3.4 og Google Analytics-opplysninger overføres derfor til USA. Vercel Inc. og Google LLC er sertifisert under EU-US Data Privacy Framework (Kommisjonens gjennomføringsbeslutning (EU) 2023/1795); Vercel bruker i tillegg standard personvernbestemmelser. For Upstash og OpenRouter skjer overføringen etter deres vilkår for databehandling. Filene dine overføres ingen steder (punkt 3.1).',
      },
      {
        h: '7. Hvor lenge vi lagrer opplysninger',
        items: [
          'Filene dine: de kommer aldri til oss. I nettleseren forsvinner de når du lukker eller laster siden på nytt.',
          'Tekst sendt til KI og sideadresser som skal konverteres: vi lagrer dem ikke.',
          'KI-grensetelleren (IP-adresse): 24 timer fra første forespørsel. Telleren for URL til PDF: 10 minutter.',
          'Serverlogger hos driftsleverandøren: 1 time med nåværende Vercel-abonnement.',
          'Google Analytics-opplysninger: etter lagringsinnstillingen i Google Analytics, høyst 14 måneder.',
          'Innstillinger i nettleseren: til du sletter dem; språkkapselen opptil 12 måneder.',
        ],
      },
      {
        h: '8. Dine rettigheter',
        p: 'Du har rett til innsyn (art. 15 GDPR), retting (art. 16), sletting (art. 17), begrensning av behandling (art. 18), dataportabilitet (art. 20), å protestere (art. 21) og til å trekke tilbake samtykke når som helst, uten at det påvirker lovligheten av tidligere behandling. Du kan også klage til en tilsynsmyndighet — i Polen presidenten for Kontoret for vern av personopplysninger (ul. Stawki 2, 00-193 Warszawa). Det finnes ingen kontoer, så tekniske opplysninger kan som regel ikke knyttes til en bestemt person (art. 11 GDPR) — skriv til oss, så ser vi hva vi kan gjøre.',
      },
      {
        h: '9. Sikkerhet',
        items: [
          'Kryptert HTTPS-tilkobling med HSTS.',
          'En Content Security Policy og overskrifter som hindrer at nettstedet bygges inn på andre nettsteder, og som blokkerer tilgang til kamera, mikrofon og posisjon.',
          'Kontroll av opprinnelsen til API-forespørsler (CSRF-vern), forespørselsgrenser og en størrelsesgrense for forespørsler (100 MB).',
          'URL til PDF henter ikke adresser i interne nettverk eller serverens skytjenester (SSRF-vern).',
          'Detaljer: siden «Sikkerhet».',
        ],
      },
      {
        h: '10. Google Analytics og samtykke',
        p: 'Med ditt samtykke bruker vi Google Analytics 4 (Google LLC) til å telle besøk og se hvilke verktøy som brukes. Google lagrer da informasjonskapsler med en identifikator i nettleseren din (_ga, _ga_*) og mottar opplysninger om besøket: viste sider, omtrentlig posisjon, enhets- og nettlesertype og hvor du kom fra.',
        items: [
          'Uten samtykke lastes Google Analytics-skriptet ikke i det hele tatt — nettstedet kontakter ikke Google.',
          'Du kan endre eller trekke tilbake samtykket når som helst med knappen «Innstillinger for informasjonskapsler» nederst på hver side. Tilbaketrekking slår av Google Analytics med en gang og sletter informasjonskapslene.',
          'Vi bruker ikke Google Analytics til reklame eller profilering. Filene du jobber med, kommer aldri til Google.',
        ],
      },
      {
        h: '11. Endringer',
        p: 'Vi kan endre erklæringen når nettstedets virkemåte endres; datoen for siste endring står øverst på siden. Spørsmål: kontakt@optimapdf.com.',
      },
    ],
  },

  rodo: {
    title: 'Informasjon om GDPR',
    updated: 'Sist oppdatert: 14. oktober 2026',
    sections: [
      {
        h: '1. Behandlingsansvarlig',
        p: 'Behandlingsansvarlig er Leszek Hofman, Dąbrówka Nowa, Polen (optimapdf.com). Kontakt i alle spørsmål om opplysningene dine: kontakt@optimapdf.com.',
      },
      {
        h: '2. Hvilke opplysninger vi behandler og hvorfor',
        items: [
          'Filene dine — vi behandler dem ikke på en server. Alle filverktøy kjører i nettleseren din, og filen forlater ikke enheten din.',
          'Tekst sendt til KI-funksjonene — vi sender den via serveren vår til OpenRouter og modelleverandøren for å utføre forespørselen din (sammendrag, oversettelse, svar). Vi lagrer den ikke.',
          'Sideadressen for URL til PDF — serveren vår henter siden og lager en PDF. Vi lagrer den ikke.',
          'IP-adresse — for å telle forespørselsgrenser (KI: 24 timer, URL til PDF: 10 minutter) og hindre misbruk; i serverloggen bare ved en avvist forespørsel og forkortet.',
          'Besøksopplysninger i Google Analytics — bare med ditt samtykke.',
          'Innstillinger (tema, språk, valg om statistikk) — lagret bare i nettleseren din.',
        ],
      },
      {
        h: '3. Rettslige grunnlag',
        items: [
          'Art. 6 nr. 1 bokstav b GDPR — å levere tjenesten du ber om (KI-funksjoner, URL til PDF).',
          'Art. 6 nr. 1 bokstav f GDPR — berettiget interesse: sikkerhet og forespørselsgrenser.',
          'Art. 6 nr. 1 bokstav a GDPR — samtykke til Google Analytics.',
        ],
      },
      {
        h: '4. Lagringstid',
        items: [
          'Filer, tekst sendt til KI og sideadresser som skal konverteres: lagres ikke.',
          'Grensetellere med IP-adresse: 24 timer (KI) og 10 minutter (URL til PDF).',
          'Serverlogger hos driftsleverandøren: 1 time (nåværende Vercel-abonnement).',
          'Google Analytics: høyst 14 måneder.',
          'Innstillinger i nettleseren: til du sletter dem; språkkapselen opptil 12 måneder.',
        ],
      },
      {
        h: '5. Mottakere',
        p: 'Vi selger ikke opplysninger og deler dem ikke for markedsføring. På våre vegne behandler Vercel Inc. (drift), Upstash, Inc. (grensetellere), OpenRouter, Inc. og modelleverandøren (bare KI-funksjoner) og — med ditt samtykke — Google LLC (Google Analytics) opplysninger. Alle har hovedsete i USA.',
      },
      {
        h: '6. Overføring til tredjeland',
        p: 'Programserveren kjører i USA, så opplysningene i punkt 2 (unntatt filer og nettleserinnstillinger) overføres til USA. Vercel og Google er sertifisert under EU-US Data Privacy Framework (Kommisjonens beslutning (EU) 2023/1795); Upstash og OpenRouter behandler opplysninger etter sine vilkår for databehandling.',
      },
      {
        h: '7. Dine rettigheter',
        items: [
          'Innsyn (art. 15) og retting (art. 16).',
          'Sletting (art. 17) og begrensning av behandling (art. 18).',
          'Dataportabilitet (art. 20) og protest (art. 21).',
          'Å trekke tilbake samtykke når som helst — for Google Analytics med knappen «Innstillinger for informasjonskapsler» nederst på siden.',
        ],
      },
      {
        h: '8. Slik bruker du rettighetene dine',
        p: 'Skriv til kontakt@optimapdf.com. Vi svarer innen 30 dager, kostnadsfritt (unntatt ved åpenbart grunnløse eller overdrevne forespørsler — art. 12 nr. 5 GDPR). Det finnes ingen kontoer, så tekniske opplysninger kan som regel ikke knyttes til en bestemt person (art. 11 GDPR).',
      },
      {
        h: '9. Klage',
        p: 'Mener du at vi behandler opplysningene dine i strid med GDPR, kan du klage til en tilsynsmyndighet — i Polen presidenten for Kontoret for vern av personopplysninger, ul. Stawki 2, 00-193 Warszawa.',
      },
      {
        h: '10. Informasjonskapsler og nettleserlagring',
        p: 'Vi bruker én nødvendig informasjonskapsel (x-detected-locale — nettstedets språk, opptil 12 måneder) og localStorage for innstillinger. Informasjonskapsler fra Google Analytics (_ga, _ga_*) opprettes bare etter ditt samtykke og fjernes når du trekker det tilbake. Vi bruker ingen reklamekapsler.',
      },
      {
        h: '11. Endringer',
        p: 'Vi oppdaterer denne informasjonen når nettstedets virkemåte endres; datoen for siste endring står øverst på siden.',
      },
    ],
  },

  security: {
    title: 'Sikkerhet',
    updated: 'Sist oppdatert: 14. oktober 2026',
    intro: 'Det viktigste vernet i OptimaPDF er noe vi ikke gjør: vi sender ikke filene dine til en server. Her forklarer vi hvordan det virker og hvilke andre tiltak som finnes — bare de vi faktisk bruker.',
    sections: [
      {
        h: '1. Filene blir på enheten din',
        p: 'Alle filverktøy, også komprimering, OCR og konverteringer, kjører i nettleseren din (JavaScript og WebAssembly). Filen sendes ikke til en server, så ingen hos oss har tilgang til den. Du kan sjekke det selv: åpne utviklerverktøyene i nettleseren (F12), fanen «Nettverk», og behandle en fil — du vil ikke se noen opplasting av filen. Til serveren kommer bare tekst for KI-funksjonene og en sideadresse for URL til PDF.',
      },
      {
        h: '2. Kryptert tilkobling',
        p: 'Nettstedet virker bare over HTTPS. HSTS-overskriften (med oppføring i nettlesernes preload-liste) gjør at nettleseren alltid kobler til sikkert, også ved første besøk.',
      },
      {
        h: '3. Vern i nettleseren',
        items: [
          'En Content Security Policy begrenser hvor nettstedet kan laste inn skript fra og hva det kan koble til: domenet vårt og tjenestene som er nevnt i den (Google-pålogging, Dropbox, Microsoft og etter samtykke Google Analytics).',
          'Nettstedet kan ikke bygges inn på andre nettsteder (X-Frame-Options: DENY, frame-ancestors) — det verner mot clickjacking.',
          'Permissions-Policy blokkerer tilgang til kamera, mikrofon, posisjon, USB og betalinger.',
          'X-Content-Type-Options og Referrer-Policy begrenser gjetting av filtyper og videreformidling av sideadresser.',
        ],
      },
      {
        h: '4. Vern av serveren',
        items: [
          'API-forespørsler godtas bare fra vårt eget nettsted (kontroll av overskriftene Origin og Referer — CSRF-vern).',
          'Forespørselsgrenser: 30 per minutt per IP-adresse for API-et, 15 per dag for KI-funksjonene, 30 per 10 minutter for URL til PDF; en størrelsesgrense for forespørsler på 100 MB.',
          'URL til PDF avviser adresser i private og lokale nettverk og serverens skytjenester, og adressen som kontrolleres, er den samme som serveren kobler til (vern mot SSRF og DNS-rebinding).',
          'API-inndata kontrolleres på serveren (tekstlengde, tillatte oversettelsesspråk).',
        ],
      },
      {
        h: '5. KI-funksjoner',
        p: 'Til KI sender vi bare teksten som er hentet ut av filen, og spørsmålet ditt — uten IP-adressen din eller nettleseropplysninger, via serveren vår og dens API-nøkkel (du trenger ingen egen). Hver forespørsel krever en leverandør som ifølge OpenRouter ikke lagrer opplysningene utover forespørselen og ikke trener modeller på dem; finnes ingen, utføres ikke forespørselen.',
      },
      {
        h: '6. Ingen kontoer eller profiler',
        p: 'Vi krever ingen registrering eller pålogging, lagrer ingen passord og lager ingen brukerprofiler. Passord for å beskytte og låse opp PDF-er og sertifikater for signering brukes bare i nettleseren din.',
      },
      {
        h: '7. Avhengigheter',
        p: 'Vi holder bibliotekene oppdatert og sjekker kjente sårbarheter med npm audit og en test som melder hvert nytt varsel på høyt eller kritisk nivå i avhengighetene nettstedet bruker.',
      },
      {
        h: '8. Melde fra om en sårbarhet',
        p: 'Hvis du finner en sikkerhetsfeil, skriv til kontakt@optimapdf.com. Vi forplikter oss til å:',
        items: [
          'bekrefte mottak innen 24 timer,',
          'analysere den og levere en retting innen 14 dager (avhengig av alvorlighet),',
          'fortelle deg hva vi har gjort,',
          'ikke gå rettslig til verks mot personer som melder fra om sårbarheter i god tro.',
        ],
      },
      {
        h: '9. Sertifiseringer',
        p: 'OptimaPDF har ingen egen ISO 27001- eller SOC 2-sertifisering. Driftsleverandøren vår, Vercel, er sertifisert etter ISO 27001:2022 og har en SOC 2 type 2-rapport. Siden filer aldri kommer til serveren vår, finnes det ingen filer «i ro» hos oss som skal krypteres.',
      },
      {
        h: '10. Digital signatur og eIDAS',
        p: 'Verktøyet «Signer PDF» lager en digital PAdES-signatur med ditt eget sertifikat (.p12/.pfx) — helt i nettleseren; verken filen eller sertifikatet sendes. Det er en ekte kryptografisk signatur, men ikke automatisk en kvalifisert elektronisk signatur (QES) etter eIDAS-forordningen (EU 910/2014): QES-status avhenger av om sertifikatet er utstedt av en kvalifisert tillitstjenesteleverandør og om nøkkelen ligger på en kvalifisert enhet.',
      },
    ],
  },

  principles: {
    security: 'Vi bruker en kryptert HTTPS-tilkobling, en Content Security Policy, vern av API-et mot misbruk og forespørselsgrenser. Viktigst av alt: filverktøyene kjører i nettleseren din, så filene dine kommer aldri til serveren vår.',
    tracking: 'Nettstedet viser for tiden ingen annonser. I fremtiden kan vi innføre diskrete annonser (f.eks. Google AdSense) for å dekke kostnader til drift og utvikling — skjer det, oppdaterer vi denne informasjonen. Uansett forblir alle PDF-verktøy gratis og ubegrensede. Google Analytics bruker vi bare med ditt samtykke, som du når som helst kan trekke tilbake med knappen «Innstillinger for informasjonskapsler». Vi bruker ingen remarketingpiksler eller atferdsprofilering.',
  },
};

export default no;
