import type { LegalTexts } from './types';

const is: LegalTexts = {
  privacy: {
    title: 'Persónuverndarstefna',
    updated: 'Síðast uppfært: 14. október 2026',
    sections: [
      {
        h: '1. Það helsta í stuttu máli',
        p: 'Verkfæri OptimaPDF keyra í vafranum þínum: skrárnar sem þú vinnur með eru hvorki sendar á netþjóninn okkar né annað. Á netþjóninn berst aðeins það sem tveir eiginleikar þurfa — texti fyrir gervigreindareiginleikana og vefslóð fyrir URL í PDF. Heimsóknatölfræði (Google Analytics) er aðeins safnað með samþykki þínu. Engir notendareikningar eru til.',
      },
      {
        h: '2. Ábyrgðaraðili',
        p: 'Ábyrgðaraðili persónuupplýsinga er Leszek Hofman, Dąbrówka Nowa, Póllandi. Netfang: kontakt@optimapdf.com. Enginn persónuverndarfulltrúi hefur verið skipaður — skrifaðu á netfangið hér að ofan um allt sem varðar upplýsingarnar þínar.',
      },
      {
        h: '3. Hvaða upplýsingar við vinnum með',
        sub: [
          {
            h: '3.1 Skrárnar þínar',
            p: 'Öll skráaverkfæri — meðal annars sameina, skipta, þjappa, OCR, breyta, undirrita, myrkva, verja með lykilorði og allar umbreytingar (PDF ↔ Word, Excel, PowerPoint, OpenOffice, myndir, HTML, EPUB, TXT, SVG) — keyra alfarið í vafranum þínum (JavaScript og WebAssembly). Skráin er ekki send á netþjóninn okkar. Af netþjóninum eru aðeins sóttar forritsskrár, letur og tungumálagögn fyrir OCR.',
          },
          {
            h: '3.2 Gervigreindareiginleikar (gervigreindarspjall, samantekt, þýðandi)',
            p: 'Þegar þú notar gervigreindareiginleika er textinn sem dreginn er úr skránni (og í spjallinu spurningin þín) sendur í gegnum netþjóninn okkar til OpenRouter, Inc. (Bandaríkjunum), sem sendir hann áfram til veitanda mállíkansins (nú OpenAI GPT-4o mini, frá OpenAI eða Microsoft Azure). Verkfærið segir frá því áður en nokkuð er sent.',
            items: [
              'Hver beiðni krefst veitanda sem samkvæmt OpenRouter geymir ekki gögnin lengur en beiðnin varir og þjálfar ekki líkön á þeim. Ef enginn slíkur veitandi er tiltækur mistekst beiðnin — hún er ekki send til annars.',
              'Netþjónninn okkar sendir beiðnina með sameiginlegum API-lykli vefsins: OpenRouter fær hvorki IP-tölu þína né upplýsingar um vafrann og þú þarft engan eigin lykil.',
              'Við geymum hvorki sendan texta né svarið.',
              'Hámarkið er 15 beiðnir á dag á hverja IP-tölu. Teljarinn (IP-talan þín og fjöldi beiðna) er geymdur í Upstash-gagnagrunni í 24 klukkustundir frá fyrstu beiðni og eytt sjálfkrafa eftir það.',
            ],
          },
          {
            h: '3.3 URL í PDF',
            p: 'Vefslóðin sem þú slærð inn berst netþjóninum okkar, sem sækir síðuna og býr til PDF úr henni. Við geymum hvorki slóðina, síðuna né PDF-skrána. Hámarkið er 30 umbreytingar á hverjum 10 mínútum á hverja IP-tölu — teljarinn er geymdur í Upstash-gagnagrunni í 10 mínútur.',
          },
          {
            h: '3.4 Tæknilegar upplýsingar',
            p: 'Hýsingaraðilinn okkar (Vercel Inc.) vinnur með tæknilegar upplýsingar þegar beiðnum er svarað — IP-tölu, vefslóð, tíma og gerð vafra — til að reka og verja vefinn. Netþjónninn okkar skráir aðeins hafnaðar API-beiðnir (t.d. ef hámarki er náð eða beiðni kemur frá öðrum vef), með IP-töluna stytta í fyrstu þrjá hlutana (t.d. 203.0.113.0).',
          },
          {
            h: '3.5 Vistað í vafranum þínum',
            p: 'Sumar stillingar eru vistaðar á tækinu þínu. Þær eru hvorki sendar til okkar né þriðju aðila:',
            items: [
              'localStorage: útlit (ljóst/dökkt), valið tungumál, val þitt um tölfræði, stillingar verkfæra og listi yfir nýlega notuð verkfæri.',
              'Vafrakakan „x-detected-locale“ (allt að 12 mánuði) með völdu tungumáli, svo vefurinn opnist á þínu tungumáli. Hún er nauðsynleg fyrir tungumálaútgáfurnar og krefst ekki samþykkis.',
              'Skyndiminni forritsins (service worker): skrár vefsins og sótt tungumálagögn fyrir OCR, svo verkfærin virki hraðar og án nettengingar.',
              'Eftir tengingu við Google Drive: aðgangslykill í sessionStorage, sem er fjarlægður þegar þú lokar flipanum eða hann rennur út.',
            ],
          },
          {
            h: '3.6 Google Drive, Dropbox og OneDrive',
            p: 'Ef þú velur sjálf(ur) að opna skrá úr skýinu eða vista þangað fer skráin beint á milli vafrans þíns og valins veitanda (Google, Dropbox, Microsoft) — ekki í gegnum netþjóninn okkar. Þú skráir þig inn í glugga þess veitanda og skilmálar hans og persónuverndarstefna gilda um aðgerðina. Google Drive veitir okkur aðeins aðgang að skrám sem opnaðar eru eða búnar til með OptimaPDF; Dropbox að vistun skráa; OneDrive og SharePoint að þeim skrám sem gluggi Microsoft biður um.',
          },
        ],
      },
      {
        h: '4. Lagagrundvöllur',
        items: [
          '6. gr. 1. mgr. b-liður GDPR — að veita þjónustuna sem þú biður um: gervigreindareiginleika og URL í PDF.',
          '6. gr. 1. mgr. f-liður GDPR — lögmætir hagsmunir ábyrgðaraðila: rekstur og öryggi vefsins, hámörk beiðna, varnir gegn misnotkun, tæknilegar skrár.',
          '6. gr. 1. mgr. a-liður GDPR — samþykki þitt: heimsóknatölfræði í Google Analytics. Þú getur dregið það til baka hvenær sem er (10. liður).',
        ],
      },
      {
        h: '5. Viðtakendur',
        p: 'Eftirtaldir vinna með upplýsingarnar fyrir okkar hönd eða fá þær:',
        items: [
          'Vercel Inc. (Bandaríkjunum) — hýsing vefsins og forritsþjónsins.',
          'Upstash, Inc. (Bandaríkjunum) — gagnagrunnur hámarksteljara (IP-tala og fjöldi beiðna). Gagnagrunnurinn er á Washington D.C.-svæðinu (Bandaríkjunum, svæði iad1).',
          'OpenRouter, Inc. (Bandaríkjunum) og veitandi líkansins sem OpenRouter sendir beiðnina til — aðeins þegar þú notar gervigreindareiginleika.',
          'Google LLC (Bandaríkjunum) — Google Analytics, aðeins með samþykki þínu.',
          'Opinber yfirvöld — aðeins þegar lög krefjast þess.',
        ],
      },
      {
        h: '6. Miðlun út fyrir EES',
        p: 'Forritsþjónninn keyrir í gagnaveri Vercel í Bandaríkjunum og allir viðtakendur í 5. lið hafa aðsetur í Bandaríkjunum. Upplýsingarnar í liðum 3.2–3.4 og gögn Google Analytics eru því flutt til Bandaríkjanna. Vercel Inc. og Google LLC eru vottuð samkvæmt EU-US Data Privacy Framework (framkvæmdarákvörðun framkvæmdastjórnarinnar (ESB) 2023/1795); Vercel notar auk þess staðlaða samningsskilmála. Hjá Upstash og OpenRouter fer flutningurinn fram samkvæmt skilmálum þeirra um gagnavinnslu. Skrárnar þínar eru hvergi fluttar (liður 3.1).',
      },
      {
        h: '7. Hversu lengi við geymum upplýsingar',
        items: [
          'Skrárnar þínar: þær berast okkur aldrei. Í vafranum hverfa þær þegar þú lokar eða endurhleður síðunni.',
          'Texti sendur til gervigreindar og vefslóðir til umbreytingar: við geymum þær ekki.',
          'Hámarksteljari gervigreindar (IP-tala): 24 klukkustundir frá fyrstu beiðni. Teljari fyrir URL í PDF: 10 mínútur.',
          'Skrár netþjóns hjá hýsingaraðila: 1 klukkustund með núverandi áskrift hjá Vercel.',
          'Gögn Google Analytics: samkvæmt geymslustillingu í Google Analytics, að hámarki 14 mánuði.',
          'Stillingar í vafranum: þar til þú eyðir þeim; tungumálakakan allt að 12 mánuði.',
        ],
      },
      {
        h: '8. Réttindi þín',
        p: 'Þú átt rétt á aðgangi (15. gr. GDPR), leiðréttingu (16. gr.), eyðingu (17. gr.), takmörkun vinnslu (18. gr.), flutningi gagna (20. gr.), andmælum (21. gr.) og á því að draga samþykki til baka hvenær sem er án þess að það hafi áhrif á lögmæti fyrri vinnslu. Þú getur einnig kvartað til eftirlitsyfirvalds — í Póllandi til forseta Persónuverndarstofnunarinnar (ul. Stawki 2, 00-193 Varsjá). Engir reikningar eru til, svo yfirleitt er ekki hægt að tengja tæknilegar upplýsingar við tiltekinn einstakling (11. gr. GDPR) — skrifaðu okkur og við athugum hvað hægt er að gera.',
      },
      {
        h: '9. Öryggi',
        items: [
          'Dulkóðuð HTTPS-tenging með HSTS.',
          'Content Security Policy og hausar sem koma í veg fyrir að vefurinn sé felldur inn í aðra vefi og loka fyrir aðgang að myndavél, hljóðnema og staðsetningu.',
          'Athugun á uppruna API-beiðna (CSRF-vörn), hámörk beiðna og stærðarmörk beiðna (100 MB).',
          'URL í PDF sækir ekki slóðir innri neta eða skýjaþjónustu netþjónsins (SSRF-vörn).',
          'Nánar: síðan „Öryggi“.',
        ],
      },
      {
        h: '10. Google Analytics og samþykki',
        p: 'Með samþykki þínu notum við Google Analytics 4 (Google LLC) til að telja heimsóknir og sjá hvaða verkfæri eru notuð. Google vistar þá vafrakökur með auðkenni í vafranum þínum (_ga, _ga_*) og fær upplýsingar um heimsóknina: skoðaðar síður, áætlaða staðsetningu, gerð tækis og vafra og hvaðan þú komst.',
        items: [
          'Án samþykkis er Google Analytics-skriftan alls ekki hlaðin — vefurinn hefur ekki samband við Google.',
          'Þú getur breytt samþykkinu eða dregið það til baka hvenær sem er með hnappinum „Stillingar vafrakaka“ neðst á hverri síðu. Afturköllun slekkur strax á Google Analytics og eyðir vafrakökum þess.',
          'Við notum Google Analytics hvorki til auglýsinga né persónusniðs. Skrárnar sem þú vinnur með berast aldrei til Google.',
        ],
      },
      {
        h: '11. Breytingar',
        p: 'Við getum breytt stefnunni þegar virkni vefsins breytist; dagsetning síðustu breytingar er efst á síðunni. Spurningar: kontakt@optimapdf.com.',
      },
    ],
  },

  rodo: {
    title: 'Upplýsingar um GDPR',
    updated: 'Síðast uppfært: 14. október 2026',
    sections: [
      {
        h: '1. Ábyrgðaraðili',
        p: 'Ábyrgðaraðili persónuupplýsinga er Leszek Hofman, Dąbrówka Nowa, Póllandi (optimapdf.com). Netfang um allt sem varðar upplýsingarnar þínar: kontakt@optimapdf.com.',
      },
      {
        h: '2. Hvaða upplýsingar við vinnum með og hvers vegna',
        items: [
          'Skrárnar þínar — við vinnum ekki með þær á netþjóni. Öll skráaverkfæri keyra í vafranum þínum og skráin fer ekki af tækinu þínu.',
          'Texti sendur til gervigreindareiginleika — við sendum hann í gegnum netþjóninn okkar til OpenRouter og veitanda líkansins til að framkvæma beiðnina (samantekt, þýðingu, svar). Við geymum hann ekki.',
          'Vefslóðin fyrir URL í PDF — netþjónninn okkar sækir síðuna og býr til PDF. Við geymum hana ekki.',
          'IP-tala — til að telja hámörk beiðna (gervigreind: 24 klukkustundir, URL í PDF: 10 mínútur) og koma í veg fyrir misnotkun; í skrá netþjónsins aðeins við hafnaða beiðni og stytt.',
          'Heimsóknagögn í Google Analytics — aðeins með samþykki þínu.',
          'Stillingar (útlit, tungumál, val um tölfræði) — aðeins vistaðar í vafranum þínum.',
        ],
      },
      {
        h: '3. Lagagrundvöllur',
        items: [
          '6. gr. 1. mgr. b-liður GDPR — að veita þjónustuna sem þú biður um (gervigreindareiginleikar, URL í PDF).',
          '6. gr. 1. mgr. f-liður GDPR — lögmætir hagsmunir: öryggi og hámörk beiðna.',
          '6. gr. 1. mgr. a-liður GDPR — samþykki fyrir Google Analytics.',
        ],
      },
      {
        h: '4. Geymslutími',
        items: [
          'Skrár, texti sendur til gervigreindar og vefslóðir til umbreytingar: ekki geymd.',
          'Hámarksteljarar með IP-tölu: 24 klukkustundir (gervigreind) og 10 mínútur (URL í PDF).',
          'Skrár netþjóns hjá hýsingaraðila: 1 klukkustund (núverandi áskrift hjá Vercel).',
          'Google Analytics: að hámarki 14 mánuði.',
          'Stillingar í vafranum: þar til þú eyðir þeim; tungumálakakan allt að 12 mánuði.',
        ],
      },
      {
        h: '5. Viðtakendur',
        p: 'Við seljum ekki upplýsingar og deilum þeim ekki í markaðsskyni. Fyrir okkar hönd vinna Vercel Inc. (hýsing), Upstash, Inc. (hámarksteljarar), OpenRouter, Inc. og veitandi líkansins (aðeins gervigreindareiginleikar) og — með samþykki þínu — Google LLC (Google Analytics) með upplýsingar. Allir hafa aðsetur í Bandaríkjunum.',
      },
      {
        h: '6. Miðlun til þriðju landa',
        p: 'Forritsþjónninn keyrir í Bandaríkjunum, svo upplýsingarnar í 2. lið (aðrar en skrár og vafrastillingar) eru fluttar til Bandaríkjanna. Vercel og Google eru vottuð samkvæmt EU-US Data Privacy Framework (ákvörðun framkvæmdastjórnarinnar (ESB) 2023/1795); Upstash og OpenRouter vinna með upplýsingar samkvæmt skilmálum sínum um gagnavinnslu.',
      },
      {
        h: '7. Réttindi þín',
        items: [
          'Aðgangur (15. gr.) og leiðrétting (16. gr.).',
          'Eyðing (17. gr.) og takmörkun vinnslu (18. gr.).',
          'Flutningur gagna (20. gr.) og andmæli (21. gr.).',
          'Að draga samþykki til baka hvenær sem er — fyrir Google Analytics með hnappinum „Stillingar vafrakaka“ neðst á síðunni.',
        ],
      },
      {
        h: '8. Hvernig þú nýtir réttindin',
        p: 'Skrifaðu á kontakt@optimapdf.com. Við svörum innan 30 daga, án endurgjalds (nema beiðni sé augljóslega tilefnislaus eða óhófleg — 5. mgr. 12. gr. GDPR). Engir reikningar eru til, svo yfirleitt er ekki hægt að tengja tæknilegar upplýsingar við tiltekinn einstakling (11. gr. GDPR).',
      },
      {
        h: '9. Kvörtun',
        p: 'Ef þú telur að við vinnum með upplýsingarnar þínar í bága við GDPR getur þú kvartað til eftirlitsyfirvalds — í Póllandi til forseta Persónuverndarstofnunarinnar, ul. Stawki 2, 00-193 Varsjá.',
      },
      {
        h: '10. Vafrakökur og vafrageymsla',
        p: 'Við notum eina nauðsynlega vafraköku (x-detected-locale — tungumál vefsins, allt að 12 mánuði) og localStorage fyrir stillingar. Vafrakökur Google Analytics (_ga, _ga_*) verða aðeins til eftir samþykki þitt og eru fjarlægðar þegar þú dregur það til baka. Við notum engar auglýsingakökur.',
      },
      {
        h: '11. Breytingar',
        p: 'Við uppfærum þessar upplýsingar þegar virkni vefsins breytist; dagsetning síðustu breytingar er efst á síðunni.',
      },
    ],
  },

  security: {
    title: 'Öryggi',
    updated: 'Síðast uppfært: 14. október 2026',
    intro: 'Mikilvægasta vörn OptimaPDF er nokkuð sem við gerum ekki: við sendum skrárnar þínar ekki á netþjón. Hér útskýrum við hvernig það virkar og hvaða aðrar varnir eru til staðar — aðeins þær sem við notum í raun.',
    sections: [
      {
        h: '1. Skrárnar haldast á tækinu þínu',
        p: 'Öll skráaverkfæri, líka þjöppun, OCR og umbreytingar, keyra í vafranum þínum (JavaScript og WebAssembly). Skráin er ekki send á netþjón, svo enginn hjá okkur hefur aðgang að henni. Þú getur athugað það sjálf(ur): opnaðu þróunartól vafrans (F12), flipann „Netkerfi“, og vinndu skrá — þú sérð enga upphleðslu skrárinnar. Á netþjóninn berst aðeins texti fyrir gervigreindareiginleika og vefslóð fyrir URL í PDF.',
      },
      {
        h: '2. Dulkóðuð tenging',
        p: 'Vefurinn virkar aðeins yfir HTTPS. HSTS-hausinn (skráður á preload-lista vafra) lætur vafrann alltaf tengjast á öruggan hátt, líka í fyrstu heimsókn.',
      },
      {
        h: '3. Vörn í vafranum',
        items: [
          'Content Security Policy takmarkar hvaðan vefurinn má hlaða skriftum og við hvað hann má tengjast: lénið okkar og þjónustur sem þar eru nefndar (innskráning Google, Dropbox, Microsoft og eftir samþykki Google Analytics).',
          'Ekki er hægt að fella vefinn inn í aðra vefi (X-Frame-Options: DENY, frame-ancestors) — það ver gegn smellfölsun.',
          'Permissions-Policy lokar fyrir aðgang að myndavél, hljóðnema, staðsetningu, USB og greiðslum.',
          'X-Content-Type-Options og Referrer-Policy takmarka ágiskun skráargerða og áframsendingu vefslóða.',
        ],
      },
      {
        h: '4. Vörn netþjónsins',
        items: [
          'API-beiðnir eru aðeins teknar gildar frá okkar eigin vef (athugun á hausunum Origin og Referer — CSRF-vörn).',
          'Hámörk beiðna: 30 á mínútu á hverja IP-tölu fyrir API, 15 á dag fyrir gervigreindareiginleika, 30 á hverjum 10 mínútum fyrir URL í PDF; stærðarmörk beiðna 100 MB.',
          'URL í PDF hafnar slóðum einka- og staðarneta og skýjaþjónustu netþjónsins, og slóðin sem athuguð er, er sú sama og netþjónninn tengist (vörn gegn SSRF og DNS-endurbindingu).',
          'Inntak API er athugað á netþjóninum (lengd texta, leyfð þýðingartungumál).',
        ],
      },
      {
        h: '5. Gervigreindareiginleikar',
        p: 'Til gervigreindarinnar sendum við aðeins textann sem dreginn er úr skránni og spurninguna þína — án IP-tölu þinnar eða upplýsinga um vafrann, í gegnum netþjóninn okkar og API-lykil hans (þú þarft engan eigin). Hver beiðni krefst veitanda sem samkvæmt OpenRouter geymir ekki gögnin lengur en beiðnin varir og þjálfar ekki líkön á þeim; ef enginn er til er beiðnin ekki framkvæmd.',
      },
      {
        h: '6. Engir reikningar eða snið',
        p: 'Við krefjumst hvorki skráningar né innskráningar, geymum engin lykilorð og búum ekki til notendasnið. Lykilorð til að verja og opna PDF og skilríki til undirritunar eru aðeins notuð í vafranum þínum.',
      },
      {
        h: '7. Ósjálfstæði',
        p: 'Við höldum söfnum uppfærðum og athugum þekkta veikleika með npm audit og prófi sem tilkynnir hverja nýja viðvörun á háu eða alvarlegu stigi í ósjálfstæðum sem vefurinn notar.',
      },
      {
        h: '8. Tilkynna veikleika',
        p: 'Ef þú finnur öryggisgalla, skrifaðu á kontakt@optimapdf.com. Við skuldbindum okkur til að:',
        items: [
          'staðfesta móttöku innan 24 klukkustunda,',
          'greina hann og gefa út lagfæringu innan 14 daga (eftir alvarleika),',
          'segja þér hvað við gerðum,',
          'grípa ekki til lagalegra aðgerða gegn þeim sem tilkynna veikleika í góðri trú.',
        ],
      },
      {
        h: '9. Vottanir',
        p: 'OptimaPDF hefur enga eigin ISO 27001- eða SOC 2-vottun. Hýsingaraðilinn okkar, Vercel, er vottaður samkvæmt ISO 27001:2022 og hefur SOC 2 tegund 2-skýrslu. Þar sem skrár berast aldrei á netþjóninn okkar eru hjá okkur engar „kyrrstæðar“ skrár til að dulkóða.',
      },
      {
        h: '10. Stafræn undirritun og eIDAS',
        p: 'Verkfærið „Undirrita PDF“ býr til stafræna PAdES-undirritun með þínu eigin skilríki (.p12/.pfx) — alfarið í vafranum; hvorki skráin né skilríkið eru send. Þetta er raunveruleg dulritunarundirritun en ekki sjálfkrafa fullgild rafræn undirskrift (QES) samkvæmt eIDAS-reglugerðinni (ESB 910/2014): staða QES ræðst af því hvort skilríkið var gefið út af fullgildum traustþjónustuveitanda og hvort lykillinn er á fullgildu tæki.',
      },
    ],
  },

  principles: {
    security: 'Við notum dulkóðaða HTTPS-tengingu, Content Security Policy, varnir API gegn misnotkun og hámörk beiðna. Mikilvægast er að skráaverkfærin keyra í vafranum þínum, svo skrárnar þínar berast aldrei á netþjóninn okkar.',
    tracking: 'Vefurinn birtir sem stendur engar auglýsingar. Í framtíðinni gætum við tekið upp hógværar auglýsingar (t.d. Google AdSense) til að standa undir kostnaði við rekstur og þróun — gerist það uppfærum við þessar upplýsingar. Hvað sem því líður verða öll PDF-verkfæri áfram ókeypis og án takmarkana. Google Analytics notum við aðeins með samþykki þínu, sem þú getur dregið til baka hvenær sem er með hnappinum „Stillingar vafrakaka“. Við notum engar endurmarkaðssetningarpixla eða hegðunarsnið.',
  },
};

export default is;
