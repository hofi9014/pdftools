import type { LegalTexts } from './types';

const de: LegalTexts = {
  privacy: {
    title: 'Datenschutzerklärung',
    updated: 'Zuletzt aktualisiert: 14. Oktober 2026',
    sections: [
      {
        h: '1. Das Wichtigste in Kürze',
        p: 'Die Werkzeuge von OptimaPDF laufen in Ihrem Browser: Die Dateien, die Sie bearbeiten, werden weder an unseren Server noch anderswohin gesendet. Auf den Server gelangt nur, was zwei Funktionen benötigen — Text bei den KI-Funktionen und eine Seitenadresse bei URL zu PDF. Besuchsstatistiken (Google Analytics) erheben wir nur mit Ihrer Einwilligung. Es gibt keine Benutzerkonten.',
      },
      {
        h: '2. Verantwortlicher',
        p: 'Verantwortlicher für die personenbezogenen Daten ist Leszek Hofman, Dąbrówka Nowa, Polen. Kontakt: kontakt@optimapdf.com. Ein Datenschutzbeauftragter wurde nicht benannt — schreiben Sie in allen Datenschutzfragen an die genannte Adresse.',
      },
      {
        h: '3. Welche Daten wir verarbeiten',
        sub: [
          {
            h: '3.1 Ihre Dateien',
            p: 'Alle Dateiwerkzeuge — u. a. Zusammenführen, Teilen, Komprimieren, OCR, Bearbeiten, Signieren, Schwärzen, Passwortschutz und alle Dateikonvertierungen (PDF ↔ Word, Excel, PowerPoint, OpenOffice, Bilder, HTML, EPUB, TXT, SVG) — laufen vollständig in Ihrem Browser (JavaScript und WebAssembly). Die Datei wird nicht an unseren Server gesendet. Vom Server werden nur die Programmdateien, Schriften und OCR-Sprachdaten geladen.',
          },
          {
            h: '3.2 KI-Funktionen (KI-Chat, KI-Zusammenfassung, KI-Übersetzer)',
            p: 'Wenn Sie eine KI-Funktion nutzen, wird der aus Ihrer Datei extrahierte Text (im Chat auch Ihre Frage) über unseren Server an OpenRouter, Inc. (USA) gesendet, das ihn an den Anbieter des Sprachmodells weitergibt (derzeit OpenAI GPT-4o mini, bereitgestellt von OpenAI oder Microsoft Azure). Das Werkzeug weist Sie darauf hin, bevor etwas gesendet wird.',
            items: [
              'Jede Anfrage verlangt einen Anbieter, der laut OpenRouter Daten nicht über die Anfrage hinaus speichert und keine Modelle damit trainiert. Ist kein solcher Anbieter verfügbar, schlägt die Anfrage fehl — sie wird nicht an einen anderen gesendet.',
              'Die Anfrage sendet unser Server mit dem gemeinsamen API-Schlüssel der Website: OpenRouter erhält weder Ihre IP-Adresse noch Browserdaten, und Sie brauchen keinen eigenen Schlüssel.',
              'Wir speichern weder den gesendeten Text noch die Antwort.',
              'Das Limit beträgt 15 Anfragen pro Tag und IP-Adresse. Der Zähler (Ihre IP-Adresse und die Zahl der Anfragen) wird 24 Stunden ab der ersten Anfrage in einer Upstash-Datenbank gespeichert und dann automatisch gelöscht.',
            ],
          },
          {
            h: '3.3 URL zu PDF',
            p: 'Die eingegebene Seitenadresse gelangt an unseren Server, der die Seite abruft und daraus ein PDF erstellt. Wir speichern weder die Adresse noch die Seite noch das PDF. Das Limit beträgt 30 Umwandlungen pro 10 Minuten und IP-Adresse — der Zähler wird 10 Minuten in einer Upstash-Datenbank gespeichert.',
          },
          {
            h: '3.4 Technische Daten',
            p: 'Unser Hosting-Anbieter (Vercel Inc.) verarbeitet bei der Bearbeitung von Anfragen technische Daten — IP-Adresse, Seitenadresse, Zeitpunkt und Browsertyp —, um die Website zu betreiben und zu schützen. Unser Server protokolliert nur abgelehnte API-Anfragen (z. B. überschrittenes Limit oder Anfrage von einer fremden Website), mit auf die ersten drei Teile gekürzter IP-Adresse (z. B. 203.0.113.0).',
          },
          {
            h: '3.5 In Ihrem Browser gespeichert',
            p: 'Einige Einstellungen werden auf Ihrem Gerät gespeichert. Sie werden weder an uns noch an Dritte gesendet:',
            items: [
              'localStorage: Design (hell/dunkel), gewählte Sprache, Ihre Entscheidung zur Analyse, Werkzeugeinstellungen und die Liste zuletzt genutzter Werkzeuge.',
              'Das Cookie „x-detected-locale“ (bis zu 12 Monate) mit der gewählten Sprache, damit die Website in Ihrer Sprache öffnet. Es ist für die Sprachversionen erforderlich und benötigt keine Einwilligung.',
              'Der Anwendungscache (Service Worker): Website-Dateien und geladene OCR-Sprachdaten, damit die Werkzeuge schneller und offline funktionieren.',
              'Nach Verbindung mit Google Drive: ein Zugriffstoken im sessionStorage, das beim Schließen des Tabs oder bei Ablauf entfernt wird.',
            ],
          },
          {
            h: '3.6 Google Drive, Dropbox und OneDrive',
            p: 'Wenn Sie selbst eine Datei aus der Cloud öffnen oder dorthin speichern, wird die Datei direkt zwischen Ihrem Browser und dem gewählten Anbieter (Google, Dropbox, Microsoft) übertragen — nicht über unseren Server. Sie melden sich im Fenster dieses Anbieters an; für diesen Vorgang gelten dessen Bedingungen und Datenschutzerklärung. Google Drive gewährt uns nur Zugriff auf Dateien, die mit OptimaPDF geöffnet oder erstellt wurden; Dropbox auf das Speichern von Dateien; OneDrive und SharePoint auf die Dateien, die das Microsoft-Fenster anfordert.',
          },
        ],
      },
      {
        h: '4. Rechtsgrundlage',
        items: [
          'Art. 6 Abs. 1 lit. b DSGVO — Erbringung des von Ihnen angeforderten Dienstes: KI-Funktionen und URL zu PDF.',
          'Art. 6 Abs. 1 lit. f DSGVO — berechtigtes Interesse des Verantwortlichen: Betrieb und Sicherheit der Website, Anfragelimits, Missbrauchsschutz, technische Protokolle.',
          'Art. 6 Abs. 1 lit. a DSGVO — Ihre Einwilligung: Besuchsstatistiken in Google Analytics. Sie können sie jederzeit widerrufen (Abschnitt 10).',
        ],
      },
      {
        h: '5. Empfänger',
        p: 'Daten werden in unserem Auftrag verarbeitet von oder empfangen von:',
        items: [
          'Vercel Inc. (USA) — Hosting der Website und des Anwendungsservers.',
          'Upstash, Inc. (USA) — Datenbank der Anfragelimit-Zähler (IP-Adresse und Zahl der Anfragen).',
          'OpenRouter, Inc. (USA) und der Modellanbieter, an den OpenRouter die Anfrage weitergibt — nur wenn Sie KI-Funktionen nutzen.',
          'Google LLC (USA) — Google Analytics, nur mit Ihrer Einwilligung.',
          'Behörden — nur wenn das Gesetz es verlangt.',
        ],
      },
      {
        h: '6. Übermittlung außerhalb des EWR',
        p: 'Der Anwendungsserver läuft in einem Vercel-Rechenzentrum in den USA, und alle Empfänger aus Abschnitt 5 haben ihren Sitz in den USA. Die in den Abschnitten 3.2–3.4 beschriebenen Daten und die Daten von Google Analytics werden daher in die USA übermittelt. Vercel Inc. und Google LLC sind unter dem EU-US Data Privacy Framework zertifiziert (Durchführungsbeschluss (EU) 2023/1795 der Kommission); Vercel verwendet zusätzlich die Standardvertragsklauseln. Bei Upstash und OpenRouter erfolgt die Übermittlung nach deren Datenverarbeitungsbedingungen. Ihre Dateien werden nirgendwohin übermittelt (Abschnitt 3.1).',
      },
      {
        h: '7. Speicherdauer',
        items: [
          'Ihre Dateien: Sie erreichen uns nie. Im Browser verschwinden sie beim Schließen oder Neuladen der Seite.',
          'An die KI gesendeter Text und Seitenadressen zur Umwandlung: werden nicht gespeichert.',
          'KI-Limitzähler (IP-Adresse): 24 Stunden ab der ersten Anfrage. Zähler für URL zu PDF: 10 Minuten.',
          'Serverprotokolle beim Hosting-Anbieter: 1 Stunde im aktuellen Vercel-Tarif.',
          'Google-Analytics-Daten: gemäß der Aufbewahrungseinstellung in Google Analytics, höchstens 14 Monate.',
          'Einstellungen im Browser: bis Sie sie löschen; das Sprach-Cookie bis zu 12 Monate.',
        ],
      },
      {
        h: '8. Ihre Rechte',
        p: 'Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20), Widerspruch (Art. 21) und auf jederzeitigen Widerruf der Einwilligung, ohne dass die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung berührt wird. Sie können sich auch bei einer Aufsichtsbehörde beschweren — in Polen beim Präsidenten des Amtes für den Schutz personenbezogener Daten (ul. Stawki 2, 00-193 Warschau). Es gibt keine Konten, daher lassen sich technische Daten meist keiner bestimmten Person zuordnen (Art. 11 DSGVO) — schreiben Sie uns, und wir prüfen, was möglich ist.',
      },
      {
        h: '9. Sicherheit',
        items: [
          'Verschlüsselte HTTPS-Verbindung mit HSTS.',
          'Eine Content Security Policy und Header, die das Einbetten der Website in fremde Seiten sowie den Zugriff auf Kamera, Mikrofon und Standort verhindern.',
          'Herkunftsprüfung bei API-Anfragen (CSRF-Schutz), Anfragelimits und eine Größenbegrenzung für Anfragen (100 MB).',
          'URL zu PDF ruft keine Adressen interner Netze oder der Cloud-Dienste des Servers ab (SSRF-Schutz).',
          'Details: die Seite „Sicherheit“.',
        ],
      },
      {
        h: '10. Google Analytics und Einwilligung',
        p: 'Mit Ihrer Einwilligung verwenden wir Google Analytics 4 (Google LLC), um Besuche zu zählen und zu sehen, welche Werkzeuge genutzt werden. Google speichert dann Cookies mit einer Kennung in Ihrem Browser (_ga, _ga_*) und erhält Daten über den Besuch: aufgerufene Seiten, ungefährer Standort, Geräte- und Browsertyp sowie die Herkunft des Besuchs.',
        items: [
          'Ohne Einwilligung wird das Google-Analytics-Skript gar nicht geladen — die Website kontaktiert Google nicht.',
          'Sie können Ihre Einwilligung jederzeit über die Schaltfläche „Cookie-Einstellungen“ unten auf jeder Seite ändern oder widerrufen. Der Widerruf schaltet Google Analytics sofort ab und löscht seine Cookies.',
          'Wir nutzen Google Analytics nicht für Werbung oder Profilbildung. Die Dateien, die Sie bearbeiten, gelangen nie zu Google.',
        ],
      },
      {
        h: '11. Änderungen',
        p: 'Wir können diese Erklärung ändern, wenn sich die Funktionsweise der Website ändert; das Datum der letzten Änderung steht oben auf der Seite. Fragen: kontakt@optimapdf.com.',
      },
    ],
  },

  rodo: {
    title: 'DSGVO-Informationen',
    updated: 'Zuletzt aktualisiert: 14. Oktober 2026',
    sections: [
      {
        h: '1. Verantwortlicher',
        p: 'Verantwortlicher für die personenbezogenen Daten ist Leszek Hofman, Dąbrówka Nowa, Polen (optimapdf.com). Kontakt in allen Datenschutzfragen: kontakt@optimapdf.com.',
      },
      {
        h: '2. Welche Daten wir verarbeiten und wozu',
        items: [
          'Ihre Dateien — wir verarbeiten sie nicht auf einem Server. Alle Dateiwerkzeuge laufen in Ihrem Browser, die Datei verlässt Ihr Gerät nicht.',
          'An die KI-Funktionen gesendeter Text — wir leiten ihn über unseren Server an OpenRouter und den Modellanbieter weiter, um Ihren Auftrag auszuführen (Zusammenfassung, Übersetzung, Antwort). Wir speichern ihn nicht.',
          'Die Seitenadresse bei URL zu PDF — unser Server ruft die Seite ab und erstellt ein PDF. Wir speichern sie nicht.',
          'IP-Adresse — zum Zählen der Anfragelimits (KI: 24 Stunden, URL zu PDF: 10 Minuten) und zum Missbrauchsschutz; im Serverprotokoll nur bei einer abgelehnten Anfrage und gekürzt.',
          'Besuchsdaten in Google Analytics — nur mit Ihrer Einwilligung.',
          'Einstellungen (Design, Sprache, Entscheidung zur Analyse) — nur in Ihrem Browser gespeichert.',
        ],
      },
      {
        h: '3. Rechtsgrundlagen',
        items: [
          'Art. 6 Abs. 1 lit. b DSGVO — Erbringung des angeforderten Dienstes (KI-Funktionen, URL zu PDF).',
          'Art. 6 Abs. 1 lit. f DSGVO — berechtigtes Interesse: Sicherheit und Anfragelimits.',
          'Art. 6 Abs. 1 lit. a DSGVO — Einwilligung in Google Analytics.',
        ],
      },
      {
        h: '4. Speicherdauer',
        items: [
          'Dateien, an die KI gesendeter Text und Seitenadressen zur Umwandlung: werden nicht gespeichert.',
          'Anfragelimit-Zähler mit IP-Adresse: 24 Stunden (KI) und 10 Minuten (URL zu PDF).',
          'Serverprotokolle beim Hosting-Anbieter: 1 Stunde (aktueller Vercel-Tarif).',
          'Google Analytics: höchstens 14 Monate.',
          'Einstellungen im Browser: bis Sie sie löschen; das Sprach-Cookie bis zu 12 Monate.',
        ],
      },
      {
        h: '5. Empfänger',
        p: 'Wir verkaufen keine Daten und geben sie nicht zu Werbezwecken weiter. In unserem Auftrag verarbeiten Daten: Vercel Inc. (Hosting), Upstash, Inc. (Anfragelimit-Zähler), OpenRouter, Inc. und der Modellanbieter (nur KI-Funktionen) sowie — mit Ihrer Einwilligung — Google LLC (Google Analytics). Alle haben ihren Sitz in den USA.',
      },
      {
        h: '6. Übermittlung in Drittländer',
        p: 'Der Anwendungsserver läuft in den USA, daher werden die Daten aus Abschnitt 2 (außer Dateien und Browsereinstellungen) in die USA übermittelt. Vercel und Google sind unter dem EU-US Data Privacy Framework zertifiziert (Beschluss (EU) 2023/1795 der Kommission); Upstash und OpenRouter verarbeiten Daten nach ihren Datenverarbeitungsbedingungen.',
      },
      {
        h: '7. Ihre Rechte',
        items: [
          'Auskunft (Art. 15) und Berichtigung (Art. 16).',
          'Löschung (Art. 17) und Einschränkung der Verarbeitung (Art. 18).',
          'Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21).',
          'Jederzeitiger Widerruf der Einwilligung — für Google Analytics über die Schaltfläche „Cookie-Einstellungen“ unten auf der Seite.',
        ],
      },
      {
        h: '8. So üben Sie Ihre Rechte aus',
        p: 'Schreiben Sie an kontakt@optimapdf.com. Wir antworten innerhalb von 30 Tagen und kostenlos (außer bei offenkundig unbegründeten oder exzessiven Anträgen — Art. 12 Abs. 5 DSGVO). Es gibt keine Konten, daher lassen sich technische Daten meist keiner bestimmten Person zuordnen (Art. 11 DSGVO).',
      },
      {
        h: '9. Beschwerde',
        p: 'Wenn Sie meinen, dass wir Ihre Daten unter Verstoß gegen die DSGVO verarbeiten, können Sie sich bei einer Aufsichtsbehörde beschweren — in Polen beim Präsidenten des Amtes für den Schutz personenbezogener Daten, ul. Stawki 2, 00-193 Warschau.',
      },
      {
        h: '10. Cookies und Browserspeicher',
        p: 'Wir verwenden ein notwendiges Cookie (x-detected-locale — die Sprache der Website, bis zu 12 Monate) und localStorage für Einstellungen. Google-Analytics-Cookies (_ga, _ga_*) entstehen nur nach Ihrer Einwilligung und werden bei deren Widerruf entfernt. Wir verwenden keine Werbe-Cookies.',
      },
      {
        h: '11. Änderungen',
        p: 'Wir aktualisieren diese Informationen, wenn sich die Funktionsweise der Website ändert; das Datum der letzten Änderung steht oben auf der Seite.',
      },
    ],
  },

  security: {
    title: 'Sicherheit',
    updated: 'Zuletzt aktualisiert: 14. Oktober 2026',
    intro: 'Der wichtigste Schutz von OptimaPDF ist etwas, das wir nicht tun: Wir senden Ihre Dateien nicht an einen Server. Hier steht, wie das funktioniert und welche weiteren Schutzmaßnahmen es gibt — nur die, die wir tatsächlich einsetzen.',
    sections: [
      {
        h: '1. Dateien bleiben auf Ihrem Gerät',
        p: 'Alle Dateiwerkzeuge, auch Komprimierung, OCR und Konvertierungen, laufen in Ihrem Browser (JavaScript und WebAssembly). Die Datei wird nicht an einen Server gesendet, daher hat niemand auf unserer Seite Zugriff darauf. Sie können das selbst prüfen: Öffnen Sie die Entwicklertools Ihres Browsers (F12), den Reiter „Netzwerk“, und verarbeiten Sie eine Datei — Sie werden keinen Upload der Datei sehen. Auf den Server gelangen nur Text bei den KI-Funktionen und eine Seitenadresse bei URL zu PDF.',
      },
      {
        h: '2. Verschlüsselte Verbindung',
        p: 'Die Website funktioniert nur über HTTPS. Der HSTS-Header (mit Eintrag in der Preload-Liste der Browser) sorgt dafür, dass der Browser immer verschlüsselt verbindet, auch beim ersten Besuch.',
      },
      {
        h: '3. Schutz im Browser',
        items: [
          'Eine Content Security Policy begrenzt, woher die Website Skripte laden und womit sie sich verbinden darf: mit unserer Domain und den darin genannten Diensten (Google-Anmeldung, Dropbox, Microsoft und nach Einwilligung Google Analytics).',
          'Die Website kann nicht in fremde Seiten eingebettet werden (X-Frame-Options: DENY, frame-ancestors) — das schützt vor Clickjacking.',
          'Permissions-Policy sperrt den Zugriff auf Kamera, Mikrofon, Standort, USB und Zahlungen.',
          'X-Content-Type-Options und Referrer-Policy begrenzen das Erraten von Dateitypen und die Weitergabe von Seitenadressen.',
        ],
      },
      {
        h: '4. Schutz des Servers',
        items: [
          'API-Anfragen werden nur von unserer eigenen Website angenommen (Prüfung der Header Origin und Referer — CSRF-Schutz).',
          'Anfragelimits: 30 pro Minute und IP-Adresse für die API, 15 pro Tag für die KI-Funktionen, 30 pro 10 Minuten für URL zu PDF; eine Größenbegrenzung für Anfragen von 100 MB.',
          'URL zu PDF lehnt Adressen privater und lokaler Netze sowie der Cloud-Dienste des Servers ab, und die geprüfte Adresse ist dieselbe, mit der sich der Server verbindet (Schutz vor SSRF und DNS-Rebinding).',
          'API-Eingaben werden auf dem Server geprüft (Textlänge, erlaubte Übersetzungssprachen).',
        ],
      },
      {
        h: '5. KI-Funktionen',
        p: 'An die KI senden wir nur den aus der Datei extrahierten Text und Ihre Frage — ohne Ihre IP-Adresse oder Browserdaten, über unseren Server und dessen API-Schlüssel (Sie brauchen keinen eigenen). Jede Anfrage verlangt einen Anbieter, der laut OpenRouter Daten nicht über die Anfrage hinaus speichert und keine Modelle damit trainiert; ist keiner verfügbar, wird die Anfrage nicht ausgeführt.',
      },
      {
        h: '6. Keine Konten, keine Profile',
        p: 'Wir verlangen keine Registrierung oder Anmeldung, speichern keine Passwörter und erstellen keine Nutzerprofile. Passwörter zum Schützen und Entsperren von PDFs sowie Zertifikate zum Signieren werden nur in Ihrem Browser verwendet.',
      },
      {
        h: '7. Abhängigkeiten',
        p: 'Wir halten Bibliotheken aktuell und prüfen sie mit npm audit und einem Test, der jede neue Warnung der Stufe hoch oder kritisch in den von der Website genutzten Abhängigkeiten meldet, auf bekannte Schwachstellen.',
      },
      {
        h: '8. Schwachstellen melden',
        p: 'Wenn Sie eine Sicherheitslücke finden, schreiben Sie an kontakt@optimapdf.com. Wir verpflichten uns,',
        items: [
          'den Eingang innerhalb von 24 Stunden zu bestätigen,',
          'sie zu analysieren und innerhalb von 14 Tagen (je nach Schwere) eine Korrektur auszuliefern,',
          'Ihnen mitzuteilen, was wir getan haben,',
          'keine rechtlichen Schritte gegen Personen einzuleiten, die Schwachstellen in gutem Glauben melden.',
        ],
      },
      {
        h: '9. Zertifizierungen',
        p: 'OptimaPDF hat keine eigene ISO-27001- oder SOC-2-Zertifizierung. Unser Hosting-Anbieter Vercel ist nach ISO 27001:2022 zertifiziert und hat einen SOC-2-Typ-2-Bericht. Da Dateien unseren Server nie erreichen, gibt es auf unserer Seite keine „ruhenden“ Dateien zu verschlüsseln.',
      },
      {
        h: '10. Digitale Signaturen und eIDAS',
        p: 'Das Werkzeug „PDF signieren“ erstellt mit Ihrem eigenen Zertifikat (.p12/.pfx) eine digitale PAdES-Signatur — vollständig im Browser; weder Datei noch Zertifikat werden gesendet. Es ist eine echte kryptografische Signatur, aber nicht automatisch eine qualifizierte elektronische Signatur (QES) im Sinne der eIDAS-Verordnung (EU 910/2014): Der QES-Status hängt davon ab, ob das Zertifikat von einem qualifizierten Vertrauensdiensteanbieter ausgestellt wurde und der Schlüssel auf einem qualifizierten Gerät liegt.',
      },
    ],
  },

  principles: {
    security: 'Wir verwenden eine verschlüsselte HTTPS-Verbindung, eine Content Security Policy, Missbrauchsschutz für die API und Anfragelimits. Vor allem aber laufen die Dateiwerkzeuge in Ihrem Browser, sodass Ihre Dateien unseren Server gar nicht erreichen.',
    tracking: 'Die Website zeigt derzeit keine Werbung. Künftig könnten wir dezente Werbung (z. B. Google AdSense) einführen, um Hosting- und Entwicklungskosten zu decken — falls das geschieht, aktualisieren wir diese Information. In jedem Fall bleiben alle PDF-Werkzeuge kostenlos und unbegrenzt. Google Analytics verwenden wir nur mit Ihrer Einwilligung, die Sie jederzeit über die Schaltfläche „Cookie-Einstellungen“ widerrufen können. Wir verwenden keine Remarketing-Pixel und keine verhaltensbasierte Profilbildung.',
  },
};

export default de;
