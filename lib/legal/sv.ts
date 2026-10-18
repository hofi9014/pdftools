import type { LegalTexts } from './types';

const sv: LegalTexts = {
  privacy: {
    title: 'Integritetspolicy',
    updated: 'Senast uppdaterad: 14 oktober 2026',
    sections: [
      {
        h: '1. Det viktigaste i korthet',
        p: 'OptimaPDF:s verktyg körs i din webbläsare: filerna du arbetar med skickas inte till vår server eller någon annanstans. Till servern når bara det två funktioner behöver — text för AI-funktionerna och en sidadress för URL till PDF. Besöksstatistik (Google Analytics) samlas bara in med ditt samtycke. Det finns inga användarkonton.',
      },
      {
        h: '2. Personuppgiftsansvarig',
        p: 'Personuppgiftsansvarig är Leszek Hofman, Dąbrówka Nowa, Polen. Kontakt: kontakt@optimapdf.com. Något dataskyddsombud har inte utsetts — skriv till adressen ovan i alla frågor om dina uppgifter.',
      },
      {
        h: '3. Vilka uppgifter vi behandlar',
        sub: [
          {
            h: '3.1 Dina filer',
            p: 'Alla filverktyg — bland annat sammanfoga, dela, komprimera, OCR, redigera, signera, maskera, lösenordsskydda och alla filkonverteringar (PDF ↔ Word, Excel, PowerPoint, OpenOffice, bilder, HTML, EPUB, TXT, SVG) — körs helt i din webbläsare (JavaScript och WebAssembly). Filen skickas inte till vår server. Från servern hämtas bara programfiler, typsnitt och språkdata för OCR.',
          },
          {
            h: '3.2 AI-funktioner (AI-chatt, AI-sammanfattning, AI-översättare)',
            p: 'När du använder en AI-funktion skickas texten som extraherats ur filen (och i chatten din fråga) via vår server till OpenRouter, Inc. (USA), som skickar den vidare till leverantören av språkmodellen (för närvarande OpenAI GPT-4o mini, levererad av OpenAI eller Microsoft Azure). Verktyget talar om det innan något skickas.',
            items: [
              'Varje förfrågan kräver en leverantör som enligt OpenRouter inte lagrar uppgifterna efter förfrågan och inte tränar modeller på dem. Finns ingen sådan leverantör tillgänglig misslyckas förfrågan — den skickas inte till någon annan.',
              'Förfrågan skickas av vår server med webbplatsens gemensamma API-nyckel: OpenRouter får inte din IP-adress eller uppgifter om webbläsaren, och du behöver ingen egen nyckel.',
              'Vi sparar inte den skickade texten eller svaret.',
              'Gränsen är 15 förfrågningar per dag och IP-adress. Räknaren (din IP-adress och antalet förfrågningar) lagras i en Upstash-databas i 24 timmar från den första förfrågan och raderas sedan automatiskt.',
            ],
          },
          {
            h: '3.3 URL till PDF',
            p: 'Sidadressen du anger når vår server, som hämtar sidan och gör en PDF av den. Vi sparar varken adressen, sidan eller PDF:en. Gränsen är 30 konverteringar per 10 minuter och IP-adress — räknaren lagras i en Upstash-databas i 10 minuter.',
          },
          {
            h: '3.4 Tekniska uppgifter',
            p: 'Vår webbhotelleverantör (Vercel Inc.) behandlar tekniska uppgifter när förfrågningar besvaras — IP-adress, sidadress, tid och webbläsartyp — för att driva och skydda webbplatsen. Vår server loggar bara avvisade API-förfrågningar (till exempel en överskriden gräns eller en förfrågan från en annan webbplats), med IP-adressen förkortad till de tre första delarna (t.ex. 203.0.113.0).',
          },
          {
            h: '3.5 Sparat i din webbläsare',
            p: 'Vissa inställningar sparas på din enhet. De skickas inte till oss eller till tredje part:',
            items: [
              'localStorage: tema (ljust/mörkt), valt språk, ditt val om statistik, verktygsinställningar och listan över nyligen använda verktyg.',
              'Kakan ”x-detected-locale” (upp till 12 månader) med valt språk, så att webbplatsen öppnas på ditt språk. Den behövs för språkversionerna och kräver inget samtycke.',
              'Programcachen (service worker): webbplatsens filer och nedladdade språkdata för OCR, så att verktygen fungerar snabbare och offline.',
              'Efter anslutning till Google Drive: en åtkomsttoken i sessionStorage, som tas bort när du stänger fliken eller när den löper ut.',
            ],
          },
          {
            h: '3.6 Google Drive, Dropbox och OneDrive',
            p: 'Om du själv väljer att öppna en fil från molnet eller spara dit går filen direkt mellan din webbläsare och den valda leverantören (Google, Dropbox, Microsoft) — inte via vår server. Du loggar in i den leverantörens fönster, och dess villkor och integritetspolicy gäller för åtgärden. Google Drive ger oss bara åtkomst till filer som öppnats eller skapats med OptimaPDF; Dropbox till att spara filer; OneDrive och SharePoint till de filer som Microsoft-fönstret begär.',
          },
        ],
      },
      {
        h: '4. Rättslig grund',
        items: [
          'Art. 6.1 b GDPR — att tillhandahålla tjänsten du begär: AI-funktionerna och URL till PDF.',
          'Art. 6.1 f GDPR — den personuppgiftsansvariges berättigade intresse: drift och säkerhet, förfrågningsgränser, skydd mot missbruk, tekniska loggar.',
          'Art. 6.1 a GDPR — ditt samtycke: besöksstatistik i Google Analytics. Du kan återkalla det när som helst (avsnitt 10).',
        ],
      },
      {
        h: '5. Mottagare',
        p: 'Uppgifterna behandlas för vår räkning av, eller tas emot av:',
        items: [
          'Vercel Inc. (USA) — drift av webbplatsen och programservern.',
          'Upstash, Inc. (USA) — databasen för gränsräknarna (IP-adress och antal förfrågningar). Databasen finns i Washington D.C.-området (USA, region iad1).',
          'OpenRouter, Inc. (USA) och modelleverantören som OpenRouter skickar förfrågan till — bara när du använder AI-funktionerna.',
          'Google LLC (USA) — Google Analytics, bara med ditt samtycke.',
          'Myndigheter — bara när lagen kräver det.',
        ],
      },
      {
        h: '6. Överföring utanför EES',
        p: 'Programservern körs i ett datacenter hos Vercel i USA, och alla mottagare i avsnitt 5 har säte i USA. Uppgifterna i avsnitt 3.2–3.4 och Google Analytics-uppgifter överförs därför till USA. Vercel Inc. och Google LLC är certifierade enligt EU-US Data Privacy Framework (kommissionens genomförandebeslut (EU) 2023/1795); Vercel använder även standardavtalsklausuler. För Upstash och OpenRouter sker överföringen enligt deras villkor för databehandling. Dina filer överförs ingenstans (avsnitt 3.1).',
      },
      {
        h: '7. Hur länge vi sparar uppgifter',
        items: [
          'Dina filer: de når oss aldrig. I webbläsaren försvinner de när du stänger eller laddar om sidan.',
          'Text som skickats till AI och sidadresser att konvertera: vi sparar dem inte.',
          'AI-gränsräknaren (IP-adress): 24 timmar från första förfrågan. Räknaren för URL till PDF: 10 minuter.',
          'Serverloggar hos webbhotelleverantören: 1 timme med nuvarande Vercel-plan.',
          'Google Analytics-uppgifter: enligt lagringsinställningen i Google Analytics, högst 14 månader.',
          'Inställningar i webbläsaren: tills du raderar dem; språkkakan upp till 12 månader.',
        ],
      },
      {
        h: '8. Dina rättigheter',
        p: 'Du har rätt till tillgång (art. 15 GDPR), rättelse (art. 16), radering (art. 17), begränsning av behandling (art. 18), dataportabilitet (art. 20), att invända (art. 21) och att när som helst återkalla samtycke, utan att det påverkar lagligheten i tidigare behandling. Du kan också lämna klagomål till en tillsynsmyndighet — i Polen ordföranden för Myndigheten för skydd av personuppgifter (ul. Stawki 2, 00-193 Warszawa). Det finns inga konton, så tekniska uppgifter kan oftast inte kopplas till en viss person (art. 11 GDPR) — skriv till oss så ser vi vad vi kan göra.',
      },
      {
        h: '9. Säkerhet',
        items: [
          'Krypterad HTTPS-anslutning med HSTS.',
          'En Content Security Policy och rubriker som hindrar att webbplatsen bäddas in på andra webbplatser och blockerar åtkomst till kamera, mikrofon och plats.',
          'Kontroll av ursprung för API-förfrågningar (CSRF-skydd), förfrågningsgränser och en storleksgräns för förfrågningar (100 MB).',
          'URL till PDF hämtar inte adresser i interna nätverk eller serverns molntjänster (SSRF-skydd).',
          'Detaljer: sidan ”Säkerhet”.',
        ],
      },
      {
        h: '10. Google Analytics och samtycke',
        p: 'Med ditt samtycke använder vi Google Analytics 4 (Google LLC) för att räkna besök och se vilka verktyg som används. Google sparar då kakor med en identifierare i din webbläsare (_ga, _ga_*) och tar emot uppgifter om besöket: visade sidor, ungefärlig plats, typ av enhet och webbläsare samt varifrån du kom.',
        items: [
          'Utan samtycke laddas Google Analytics-skriptet inte alls — webbplatsen kontaktar inte Google.',
          'Du kan ändra eller återkalla ditt samtycke när som helst med knappen ”Cookie-inställningar” längst ned på varje sida. Återkallandet stänger av Google Analytics direkt och raderar dess kakor.',
          'Vi använder inte Google Analytics för reklam eller profilering. Filerna du arbetar med når aldrig Google.',
        ],
      },
      {
        h: '11. Ändringar',
        p: 'Vi kan ändra policyn när webbplatsens funktion ändras; datumet för den senaste ändringen står överst på sidan. Frågor: kontakt@optimapdf.com.',
      },
    ],
  },

  rodo: {
    title: 'Information om GDPR',
    updated: 'Senast uppdaterad: 14 oktober 2026',
    sections: [
      {
        h: '1. Personuppgiftsansvarig',
        p: 'Personuppgiftsansvarig är Leszek Hofman, Dąbrówka Nowa, Polen (optimapdf.com). Kontakt i alla frågor om dina uppgifter: kontakt@optimapdf.com.',
      },
      {
        h: '2. Vilka uppgifter vi behandlar och varför',
        items: [
          'Dina filer — vi behandlar dem inte på en server. Alla filverktyg körs i din webbläsare och filen lämnar inte din enhet.',
          'Text som skickas till AI-funktionerna — vi skickar den via vår server till OpenRouter och modelleverantören för att utföra din begäran (sammanfattning, översättning, svar). Vi sparar den inte.',
          'Sidadressen för URL till PDF — vår server hämtar sidan och gör en PDF. Vi sparar den inte.',
          'IP-adress — för att räkna förfrågningsgränser (AI: 24 timmar, URL till PDF: 10 minuter) och förhindra missbruk; i serverloggen bara vid en avvisad förfrågan och förkortad.',
          'Besöksuppgifter i Google Analytics — bara med ditt samtycke.',
          'Inställningar (tema, språk, val om statistik) — sparas bara i din webbläsare.',
        ],
      },
      {
        h: '3. Rättsliga grunder',
        items: [
          'Art. 6.1 b GDPR — att tillhandahålla tjänsten du begär (AI-funktioner, URL till PDF).',
          'Art. 6.1 f GDPR — berättigat intresse: säkerhet och förfrågningsgränser.',
          'Art. 6.1 a GDPR — samtycke till Google Analytics.',
        ],
      },
      {
        h: '4. Lagringstider',
        items: [
          'Filer, text som skickats till AI och sidadresser att konvertera: lagras inte.',
          'Gränsräknare med IP-adress: 24 timmar (AI) och 10 minuter (URL till PDF).',
          'Serverloggar hos webbhotelleverantören: 1 timme (nuvarande Vercel-plan).',
          'Google Analytics: högst 14 månader.',
          'Inställningar i webbläsaren: tills du raderar dem; språkkakan upp till 12 månader.',
        ],
      },
      {
        h: '5. Mottagare',
        p: 'Vi säljer inga uppgifter och delar dem inte i marknadsföringssyfte. För vår räkning behandlar Vercel Inc. (drift), Upstash, Inc. (gränsräknare), OpenRouter, Inc. och modelleverantören (bara AI-funktioner) samt — med ditt samtycke — Google LLC (Google Analytics) uppgifter. Alla har säte i USA.',
      },
      {
        h: '6. Överföring till tredjeland',
        p: 'Programservern körs i USA, så uppgifterna i avsnitt 2 (utom filer och webbläsarinställningar) överförs till USA. Vercel och Google är certifierade enligt EU-US Data Privacy Framework (kommissionens beslut (EU) 2023/1795); Upstash och OpenRouter behandlar uppgifter enligt sina villkor för databehandling.',
      },
      {
        h: '7. Dina rättigheter',
        items: [
          'Tillgång (art. 15) och rättelse (art. 16).',
          'Radering (art. 17) och begränsning av behandling (art. 18).',
          'Dataportabilitet (art. 20) och invändning (art. 21).',
          'Att när som helst återkalla samtycke — för Google Analytics med knappen ”Cookie-inställningar” längst ned på sidan.',
        ],
      },
      {
        h: '8. Så utövar du dina rättigheter',
        p: 'Skriv till kontakt@optimapdf.com. Vi svarar inom 30 dagar, utan kostnad (utom vid uppenbart ogrundade eller orimliga begäranden — art. 12.5 GDPR). Det finns inga konton, så tekniska uppgifter kan oftast inte kopplas till en viss person (art. 11 GDPR).',
      },
      {
        h: '9. Klagomål',
        p: 'Om du anser att vi behandlar dina uppgifter i strid med GDPR kan du lämna klagomål till en tillsynsmyndighet — i Polen ordföranden för Myndigheten för skydd av personuppgifter, ul. Stawki 2, 00-193 Warszawa.',
      },
      {
        h: '10. Kakor och webbläsarlagring',
        p: 'Vi använder en nödvändig kaka (x-detected-locale — webbplatsens språk, upp till 12 månader) och localStorage för inställningar. Google Analytics-kakor (_ga, _ga_*) skapas bara efter ditt samtycke och tas bort när du återkallar det. Vi använder inga reklamkakor.',
      },
      {
        h: '11. Ändringar',
        p: 'Vi uppdaterar denna information när webbplatsens funktion ändras; datumet för den senaste ändringen står överst på sidan.',
      },
    ],
  },

  security: {
    title: 'Säkerhet',
    updated: 'Senast uppdaterad: 14 oktober 2026',
    intro: 'Det viktigaste skyddet i OptimaPDF är något vi inte gör: vi skickar inte dina filer till en server. Här beskriver vi hur det fungerar och vilka andra skydd som finns — bara de vi faktiskt använder.',
    sections: [
      {
        h: '1. Filerna stannar på din enhet',
        p: 'Alla filverktyg, även komprimering, OCR och konverteringar, körs i din webbläsare (JavaScript och WebAssembly). Filen skickas inte till en server, så ingen hos oss kan komma åt den. Du kan kontrollera det själv: öppna webbläsarens utvecklarverktyg (F12), fliken ”Nätverk”, och bearbeta en fil — du ser ingen uppladdning av filen. Till servern når bara text för AI-funktionerna och en sidadress för URL till PDF.',
      },
      {
        h: '2. Krypterad anslutning',
        p: 'Webbplatsen fungerar bara via HTTPS. HSTS-rubriken (med post i webbläsarnas preload-lista) gör att webbläsaren alltid ansluter säkert, även vid första besöket.',
      },
      {
        h: '3. Skydd i webbläsaren',
        items: [
          'En Content Security Policy begränsar varifrån webbplatsen får läsa in skript och vad den får ansluta till: vår domän och de tjänster som nämns i den (Google-inloggning, Dropbox, Microsoft och efter samtycke Google Analytics).',
          'Webbplatsen kan inte bäddas in på andra webbplatser (X-Frame-Options: DENY, frame-ancestors) — det skyddar mot clickjacking.',
          'Permissions-Policy blockerar åtkomst till kamera, mikrofon, plats, USB och betalningar.',
          'X-Content-Type-Options och Referrer-Policy begränsar gissning av filtyper och vidarebefordran av sidadresser.',
        ],
      },
      {
        h: '4. Skydd av servern',
        items: [
          'API-förfrågningar tas bara emot från vår egen webbplats (kontroll av rubrikerna Origin och Referer — CSRF-skydd).',
          'Förfrågningsgränser: 30 per minut och IP-adress för API:t, 15 per dag för AI-funktionerna, 30 per 10 minuter för URL till PDF; en storleksgräns för förfrågningar på 100 MB.',
          'URL till PDF avvisar adresser i privata och lokala nätverk och serverns molntjänster, och den kontrollerade adressen är samma som servern ansluter till (skydd mot SSRF och DNS-rebinding).',
          'API-indata kontrolleras på servern (textlängd, tillåtna översättningsspråk).',
        ],
      },
      {
        h: '5. AI-funktioner',
        p: 'Till AI skickar vi bara texten som extraherats ur filen och din fråga — utan din IP-adress eller webbläsaruppgifter, via vår server och dess API-nyckel (du behöver ingen egen). Varje förfrågan kräver en leverantör som enligt OpenRouter inte lagrar uppgifterna efter förfrågan och inte tränar modeller på dem; finns ingen sådan utförs förfrågan inte.',
      },
      {
        h: '6. Inga konton eller profiler',
        p: 'Vi kräver ingen registrering eller inloggning, sparar inga lösenord och skapar inga användarprofiler. Lösenord för att skydda och låsa upp PDF och certifikat för signering används bara i din webbläsare.',
      },
      {
        h: '7. Beroenden',
        p: 'Vi håller bibliotek uppdaterade och kontrollerar kända sårbarheter med npm audit och ett test som rapporterar varje ny varning på hög eller kritisk nivå i de beroenden webbplatsen använder.',
      },
      {
        h: '8. Rapportera en sårbarhet',
        p: 'Om du hittar en säkerhetsbrist, skriv till kontakt@optimapdf.com. Vi förbinder oss att:',
        items: [
          'bekräfta mottagandet inom 24 timmar,',
          'analysera den och släppa en rättelse inom 14 dagar (beroende på allvarlighet),',
          'berätta för dig vad vi har gjort,',
          'inte vidta rättsliga åtgärder mot den som rapporterar sårbarheter i god tro.',
        ],
      },
      {
        h: '9. Certifieringar',
        p: 'OptimaPDF har ingen egen ISO 27001- eller SOC 2-certifiering. Vår webbhotelleverantör Vercel är certifierad enligt ISO 27001:2022 och har en SOC 2 typ 2-rapport. Eftersom filer aldrig når vår server finns det hos oss inga filer ”i vila” att kryptera.',
      },
      {
        h: '10. Digitala signaturer och eIDAS',
        p: 'Verktyget ”Signera PDF” skapar en digital PAdES-signatur med ditt eget certifikat (.p12/.pfx) — helt i webbläsaren; varken filen eller certifikatet skickas. Det är en riktig kryptografisk signatur men inte automatiskt en kvalificerad elektronisk underskrift (QES) enligt eIDAS-förordningen (EU 910/2014): QES-status beror på om certifikatet har utfärdats av en kvalificerad tillhandahållare av betrodda tjänster och om nyckeln finns på en kvalificerad enhet.',
      },
    ],
  },

  principles: {
    security: 'Vi använder en krypterad HTTPS-anslutning, en Content Security Policy, missbruksskydd för API:t och förfrågningsgränser. Viktigast av allt: filverktygen körs i din webbläsare, så dina filer når aldrig vår server.',
    tracking: 'Webbplatsen visar för närvarande inga annonser. I framtiden kan vi införa diskreta annonser (t.ex. Google AdSense) för att täcka kostnader för drift och utveckling — om det sker uppdaterar vi denna information. Oavsett detta förblir alla PDF-verktyg gratis och obegränsade. Google Analytics använder vi bara med ditt samtycke, som du när som helst kan återkalla med knappen ”Cookie-inställningar”. Vi använder inga remarketingpixlar eller beteendeprofilering.',
  },
};

export default sv;
