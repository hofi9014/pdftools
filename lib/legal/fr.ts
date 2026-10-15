import type { LegalTexts } from './types';

const fr: LegalTexts = {
  privacy: {
    title: 'Politique de confidentialité',
    updated: 'Dernière mise à jour : 14 octobre 2026',
    sections: [
      {
        h: '1. L’essentiel',
        p: 'Les outils d’OptimaPDF fonctionnent dans votre navigateur : les fichiers que vous traitez ne sont envoyés ni à notre serveur ni ailleurs. Seul ce dont deux fonctions ont besoin parvient au serveur : du texte pour les fonctions d’IA et l’adresse d’une page pour URL vers PDF. Les statistiques de visite (Google Analytics) ne sont collectées qu’avec votre consentement. Il n’y a pas de comptes utilisateurs.',
      },
      {
        h: '2. Responsable du traitement',
        p: 'Le responsable des données personnelles est Leszek Hofman, Dąbrówka Nowa, Pologne. Contact : kontakt@optimapdf.com. Aucun délégué à la protection des données n’a été désigné : écrivez à l’adresse ci-dessus pour toute question relative à vos données.',
      },
      {
        h: '3. Données traitées',
        sub: [
          {
            h: '3.1 Vos fichiers',
            p: 'Tous les outils de fichiers — notamment fusionner, diviser, compresser, OCR, modifier, signer, caviarder, protéger par mot de passe et toutes les conversions (PDF ↔ Word, Excel, PowerPoint, OpenOffice, images, HTML, EPUB, TXT, SVG) — fonctionnent entièrement dans votre navigateur (JavaScript et WebAssembly). Le fichier n’est pas envoyé à notre serveur. Seuls les fichiers de l’application, les polices et les données linguistiques de l’OCR en sont téléchargés.',
          },
          {
            h: '3.2 Fonctions d’IA (Chat IA, Résumé IA, Traducteur IA)',
            p: 'Lorsque vous utilisez une fonction d’IA, le texte extrait de votre fichier (et, dans le chat, votre question) est envoyé via notre serveur à OpenRouter, Inc. (États-Unis), qui le transmet au fournisseur du modèle de langage (actuellement OpenAI GPT-4o mini, servi par OpenAI ou Microsoft Azure). L’outil vous en informe avant tout envoi.',
            items: [
              'Chaque requête exige un fournisseur qui, selon OpenRouter, ne conserve pas les données au-delà de la requête et n’entraîne pas de modèles avec elles. Si aucun n’est disponible, la requête échoue : elle n’est pas envoyée à un autre.',
              'La requête est envoyée par notre serveur avec la clé API commune du site : OpenRouter ne reçoit ni votre adresse IP ni les informations de votre navigateur, et vous n’avez pas besoin de votre propre clé.',
              'Nous ne conservons ni le texte envoyé ni la réponse.',
              'La limite est de 15 requêtes par jour et par adresse IP. Le compteur (votre adresse IP et le nombre de requêtes) est conservé dans une base de données Upstash pendant 24 heures à partir de la première requête, puis supprimé automatiquement.',
            ],
          },
          {
            h: '3.3 URL vers PDF',
            p: 'L’adresse de page que vous saisissez parvient à notre serveur, qui télécharge cette page et en fait un PDF. Nous ne conservons ni l’adresse, ni la page, ni le PDF. La limite est de 30 conversions par 10 minutes et par adresse IP ; le compteur est conservé 10 minutes dans une base de données Upstash.',
          },
          {
            h: '3.4 Données techniques',
            p: 'Notre hébergeur (Vercel Inc.) traite des données techniques en servant les requêtes — adresse IP, adresse de la page, heure et type de navigateur — pour faire fonctionner et protéger le site. Notre serveur n’enregistre que les requêtes à l’API rejetées (par exemple une limite dépassée ou une requête provenant d’un autre site), avec l’adresse IP réduite à ses trois premières parties (p. ex. 203.0.113.0).',
          },
          {
            h: '3.5 Stocké dans votre navigateur',
            p: 'Certains réglages sont stockés sur votre appareil. Ils ne sont envoyés ni à nous ni à des tiers :',
            items: [
              'localStorage : thème (clair/sombre), langue choisie, votre choix concernant l’analyse d’audience, réglages des outils et liste des outils récemment utilisés.',
              'Le cookie « x-detected-locale » (jusqu’à 12 mois) avec la langue choisie, pour que le site s’ouvre dans votre langue. Il est nécessaire au fonctionnement des versions linguistiques et ne requiert pas de consentement.',
              'Le cache de l’application (service worker) : fichiers du site et données linguistiques de l’OCR téléchargées, pour que les outils soient plus rapides et fonctionnent hors ligne.',
              'Après connexion à Google Drive : un jeton d’accès dans sessionStorage, supprimé à la fermeture de l’onglet ou à son expiration.',
            ],
          },
          {
            h: '3.6 Google Drive, Dropbox et OneDrive',
            p: 'Si vous choisissez d’ouvrir un fichier depuis le cloud ou d’y enregistrer, le fichier circule directement entre votre navigateur et le fournisseur choisi (Google, Dropbox, Microsoft), sans passer par notre serveur. Vous vous connectez dans la fenêtre de ce fournisseur, dont les conditions et la politique de confidentialité s’appliquent à cette opération. Google Drive ne nous donne accès qu’aux fichiers ouverts ou créés avec OptimaPDF ; Dropbox, à l’enregistrement de fichiers ; OneDrive et SharePoint, aux fichiers que demande la fenêtre Microsoft.',
          },
        ],
      },
      {
        h: '4. Base juridique',
        items: [
          'Art. 6, paragraphe 1, point b) du RGPD : fourniture du service que vous demandez, à savoir les fonctions d’IA et URL vers PDF.',
          'Art. 6, paragraphe 1, point f) du RGPD : intérêt légitime du responsable : fonctionnement et sécurité du site, limites de requêtes, prévention des abus, journaux techniques.',
          'Art. 6, paragraphe 1, point a) du RGPD : votre consentement aux statistiques de visite de Google Analytics. Vous pouvez le retirer à tout moment (section 10).',
        ],
      },
      {
        h: '5. Destinataires',
        p: 'Les données sont traitées pour notre compte par, ou reçues par :',
        items: [
          'Vercel Inc. (États-Unis) : hébergement du site et du serveur de l’application.',
          'Upstash, Inc. (États-Unis) : base de données des compteurs de limites (adresse IP et nombre de requêtes).',
          'OpenRouter, Inc. (États-Unis) et le fournisseur du modèle auquel OpenRouter transmet la requête : uniquement lorsque vous utilisez les fonctions d’IA.',
          'Google LLC (États-Unis) : Google Analytics, uniquement avec votre consentement.',
          'Autorités publiques : uniquement lorsque la loi l’exige.',
        ],
      },
      {
        h: '6. Transferts hors de l’EEE',
        p: 'Le serveur de l’application fonctionne dans un centre de données Vercel aux États-Unis, et tous les destinataires de la section 5 sont établis aux États-Unis. Les données décrites aux sections 3.2 à 3.4 et celles de Google Analytics sont donc transférées aux États-Unis. Vercel Inc. et Google LLC sont certifiées dans le cadre du Data Privacy Framework UE-États-Unis (décision d’exécution (UE) 2023/1795 de la Commission) ; Vercel applique en outre les clauses contractuelles types. Pour Upstash et OpenRouter, le transfert s’effectue selon leurs conditions de traitement des données. Vos fichiers ne sont transférés nulle part (section 3.1).',
      },
      {
        h: '7. Durées de conservation',
        items: [
          'Vos fichiers : ils ne nous parviennent jamais. Dans le navigateur, ils disparaissent à la fermeture ou au rechargement de la page.',
          'Texte envoyé à l’IA et adresses de pages à convertir : nous ne les conservons pas.',
          'Compteur de limite de l’IA (adresse IP) : 24 heures à partir de la première requête. Compteur URL vers PDF : 10 minutes.',
          'Journaux du serveur chez l’hébergeur : 1 heure avec l’offre Vercel actuelle.',
          'Données Google Analytics : selon le réglage de conservation de Google Analytics, 14 mois au maximum.',
          'Réglages dans votre navigateur : jusqu’à ce que vous les supprimiez ; le cookie de langue, jusqu’à 12 mois.',
        ],
      },
      {
        h: '8. Vos droits',
        p: 'Vous disposez d’un droit d’accès (art. 15 RGPD), de rectification (art. 16), d’effacement (art. 17), de limitation du traitement (art. 18), de portabilité (art. 20), d’opposition (art. 21) et du droit de retirer votre consentement à tout moment, sans que cela affecte la licéité du traitement antérieur. Vous pouvez également introduire une réclamation auprès d’une autorité de contrôle ; en Pologne, le Président de l’Office de protection des données personnelles (ul. Stawki 2, 00-193 Varsovie). Il n’y a pas de comptes : les données techniques ne peuvent généralement pas être rattachées à une personne précise (art. 11 RGPD). Écrivez-nous et nous verrons ce qu’il est possible de faire.',
      },
      {
        h: '9. Sécurité',
        items: [
          'Connexion HTTPS chiffrée avec HSTS.',
          'Une Content Security Policy et des en-têtes qui empêchent l’intégration du site dans d’autres sites et bloquent l’accès à la caméra, au micro et à la localisation.',
          'Vérification de l’origine des requêtes à l’API (protection CSRF), limites de requêtes et limite de taille des requêtes (100 Mo).',
          'URL vers PDF ne télécharge pas d’adresses de réseaux internes ni des services cloud du serveur (protection SSRF).',
          'Détails : la page « Sécurité ».',
        ],
      },
      {
        h: '10. Google Analytics et consentement',
        p: 'Avec votre consentement, nous utilisons Google Analytics 4 (Google LLC) pour compter les visites et voir quels outils sont utilisés. Google enregistre alors des cookies contenant un identifiant dans votre navigateur (_ga, _ga_*) et reçoit des données sur la visite : pages consultées, localisation approximative, type d’appareil et de navigateur, provenance.',
        items: [
          'Sans consentement, le script Google Analytics n’est pas chargé du tout : le site ne contacte pas Google.',
          'Vous pouvez modifier ou retirer votre consentement à tout moment avec le bouton « Paramètres des cookies » en bas de chaque page. Le retrait désactive immédiatement Google Analytics et supprime ses cookies.',
          'Nous n’utilisons pas Google Analytics à des fins publicitaires ni de profilage. Les fichiers que vous traitez ne parviennent jamais à Google.',
        ],
      },
      {
        h: '11. Modifications',
        p: 'Nous pouvons modifier cette politique lorsque le fonctionnement du site change ; la date de la dernière modification figure en haut de la page. Questions : kontakt@optimapdf.com.',
      },
    ],
  },

  rodo: {
    title: 'Informations RGPD',
    updated: 'Dernière mise à jour : 14 octobre 2026',
    sections: [
      {
        h: '1. Responsable du traitement',
        p: 'Le responsable des données personnelles est Leszek Hofman, Dąbrówka Nowa, Pologne (optimapdf.com). Contact pour toute question relative à vos données : kontakt@optimapdf.com.',
      },
      {
        h: '2. Données traitées et finalités',
        items: [
          'Vos fichiers : nous ne les traitons pas sur un serveur. Tous les outils de fichiers fonctionnent dans votre navigateur et le fichier ne quitte pas votre appareil.',
          'Texte envoyé aux fonctions d’IA : nous le transmettons via notre serveur à OpenRouter et au fournisseur du modèle pour exécuter votre demande (résumé, traduction, réponse). Nous ne le conservons pas.',
          'L’adresse de page pour URL vers PDF : notre serveur télécharge cette page et en fait un PDF. Nous ne la conservons pas.',
          'Adresse IP : pour compter les limites de requêtes (IA : 24 heures ; URL vers PDF : 10 minutes) et prévenir les abus ; dans le journal du serveur uniquement pour une requête rejetée, et tronquée.',
          'Données de visite dans Google Analytics : uniquement avec votre consentement.',
          'Réglages (thème, langue, choix concernant l’analyse d’audience) : stockés uniquement dans votre navigateur.',
        ],
      },
      {
        h: '3. Bases juridiques',
        items: [
          'Art. 6, paragraphe 1, point b) du RGPD : fourniture du service demandé (fonctions d’IA, URL vers PDF).',
          'Art. 6, paragraphe 1, point f) du RGPD : intérêt légitime : sécurité et limites de requêtes.',
          'Art. 6, paragraphe 1, point a) du RGPD : consentement à Google Analytics.',
        ],
      },
      {
        h: '4. Durées de conservation',
        items: [
          'Fichiers, texte envoyé à l’IA et adresses de pages à convertir : non conservés.',
          'Compteurs de limites avec l’adresse IP : 24 heures (IA) et 10 minutes (URL vers PDF).',
          'Journaux du serveur chez l’hébergeur : 1 heure (offre Vercel actuelle).',
          'Google Analytics : 14 mois au maximum.',
          'Réglages dans votre navigateur : jusqu’à ce que vous les supprimiez ; le cookie de langue, jusqu’à 12 mois.',
        ],
      },
      {
        h: '5. Destinataires',
        p: 'Nous ne vendons pas de données et ne les partageons pas à des fins marketing. Traitent des données pour notre compte : Vercel Inc. (hébergement), Upstash, Inc. (compteurs de limites), OpenRouter, Inc. et le fournisseur du modèle (fonctions d’IA uniquement) et, avec votre consentement, Google LLC (Google Analytics). Tous sont établis aux États-Unis.',
      },
      {
        h: '6. Transferts vers des pays tiers',
        p: 'Le serveur de l’application fonctionne aux États-Unis : les données de la section 2 (hors fichiers et réglages du navigateur) sont donc transférées aux États-Unis. Vercel et Google sont certifiées dans le cadre du Data Privacy Framework UE-États-Unis (décision (UE) 2023/1795 de la Commission) ; Upstash et OpenRouter traitent les données selon leurs conditions de traitement des données.',
      },
      {
        h: '7. Vos droits',
        items: [
          'Accès (art. 15) et rectification (art. 16).',
          'Effacement (art. 17) et limitation du traitement (art. 18).',
          'Portabilité (art. 20) et opposition (art. 21).',
          'Retrait du consentement à tout moment ; pour Google Analytics, avec le bouton « Paramètres des cookies » en bas de la page.',
        ],
      },
      {
        h: '8. Exercer vos droits',
        p: 'Écrivez à kontakt@optimapdf.com. Nous répondons dans un délai de 30 jours, gratuitement (sauf demande manifestement infondée ou excessive, art. 12, paragraphe 5 du RGPD). Il n’y a pas de comptes : les données techniques ne peuvent généralement pas être rattachées à une personne précise (art. 11 RGPD).',
      },
      {
        h: '9. Réclamation',
        p: 'Si vous estimez que nous traitons vos données en violation du RGPD, vous pouvez introduire une réclamation auprès d’une autorité de contrôle ; en Pologne, le Président de l’Office de protection des données personnelles, ul. Stawki 2, 00-193 Varsovie.',
      },
      {
        h: '10. Cookies et stockage du navigateur',
        p: 'Nous utilisons un cookie nécessaire (x-detected-locale, la langue du site, jusqu’à 12 mois) et le localStorage pour les réglages. Les cookies de Google Analytics (_ga, _ga_*) n’apparaissent qu’après votre consentement et sont supprimés lorsque vous le retirez. Nous n’utilisons aucun cookie publicitaire.',
      },
      {
        h: '11. Modifications',
        p: 'Nous mettons à jour ces informations lorsque le fonctionnement du site change ; la date de la dernière modification figure en haut de la page.',
      },
    ],
  },

  security: {
    title: 'Sécurité',
    updated: 'Dernière mise à jour : 14 octobre 2026',
    intro: 'La protection la plus importante d’OptimaPDF tient à ce que nous ne faisons pas : nous n’envoyons pas vos fichiers à un serveur. Voici comment cela fonctionne et quelles sont les autres protections — uniquement celles que nous appliquons réellement.',
    sections: [
      {
        h: '1. Les fichiers restent sur votre appareil',
        p: 'Tous les outils de fichiers, y compris la compression, l’OCR et les conversions, fonctionnent dans votre navigateur (JavaScript et WebAssembly). Le fichier n’est pas envoyé à un serveur : personne de notre côté ne peut y accéder. Vous pouvez le vérifier vous-même : ouvrez les outils de développement du navigateur (F12), l’onglet « Réseau », et traitez un fichier — vous ne verrez aucun envoi du fichier. Seuls le texte des fonctions d’IA et l’adresse d’une page pour URL vers PDF parviennent au serveur.',
      },
      {
        h: '2. Connexion chiffrée',
        p: 'Le site fonctionne uniquement en HTTPS. L’en-tête HSTS (avec inscription sur la liste de préchargement des navigateurs) impose au navigateur une connexion sécurisée, même lors de la première visite.',
      },
      {
        h: '3. Protection dans le navigateur',
        items: [
          'Une Content Security Policy limite d’où le site peut charger des scripts et à quoi il peut se connecter : notre domaine et les services qu’elle nomme (connexion Google, Dropbox, Microsoft et, après consentement, Google Analytics).',
          'Le site ne peut pas être intégré dans un autre site (X-Frame-Options: DENY, frame-ancestors), ce qui protège contre le détournement de clic.',
          'Permissions-Policy bloque l’accès à la caméra, au micro, à la localisation, à l’USB et aux paiements.',
          'X-Content-Type-Options et Referrer-Policy limitent la devinette des types de fichiers et la transmission des adresses de pages.',
        ],
      },
      {
        h: '4. Protection du serveur',
        items: [
          'Les requêtes à l’API ne sont acceptées que depuis notre propre site (vérification des en-têtes Origin et Referer : protection CSRF).',
          'Limites de requêtes : 30 par minute et par adresse IP pour l’API, 15 par jour pour les fonctions d’IA, 30 par 10 minutes pour URL vers PDF ; limite de taille des requêtes de 100 Mo.',
          'URL vers PDF refuse les adresses des réseaux privés et locaux et des services cloud du serveur, et l’adresse vérifiée est celle à laquelle le serveur se connecte (protection contre SSRF et DNS rebinding).',
          'Les entrées de l’API sont vérifiées sur le serveur (longueur du texte, langues de traduction autorisées).',
        ],
      },
      {
        h: '5. Fonctions d’IA',
        p: 'Nous n’envoyons à l’IA que le texte extrait du fichier et votre question — sans votre adresse IP ni les informations du navigateur, via notre serveur et sa clé API (vous n’avez pas besoin de la vôtre). Chaque requête exige un fournisseur qui, selon OpenRouter, ne conserve pas les données au-delà de la requête et n’entraîne pas de modèles avec elles ; s’il n’y en a aucun, la requête n’est pas exécutée.',
      },
      {
        h: '6. Ni comptes ni profils',
        p: 'Nous n’exigeons ni inscription ni connexion, ne conservons aucun mot de passe et ne créons aucun profil utilisateur. Les mots de passe pour protéger et déverrouiller les PDF et les certificats de signature ne sont utilisés que dans votre navigateur.',
      },
      {
        h: '7. Dépendances',
        p: 'Nous maintenons les bibliothèques à jour et vérifions leurs vulnérabilités connues avec npm audit et un test qui signale toute nouvelle alerte de niveau élevé ou critique dans les dépendances utilisées par le site.',
      },
      {
        h: '8. Signaler une vulnérabilité',
        p: 'Si vous trouvez une faille de sécurité, écrivez à kontakt@optimapdf.com. Nous nous engageons à :',
        items: [
          'accuser réception sous 24 heures,',
          'l’analyser et publier un correctif sous 14 jours (selon la gravité),',
          'vous informer de ce que nous avons fait,',
          'n’engager aucune poursuite contre les personnes qui signalent des vulnérabilités de bonne foi.',
        ],
      },
      {
        h: '9. Certifications',
        p: 'OptimaPDF ne détient pas de certification ISO 27001 ni SOC 2 propre. Notre hébergeur, Vercel, est certifié ISO 27001:2022 et dispose d’un rapport SOC 2 Type 2. Comme les fichiers n’atteignent jamais notre serveur, il n’y a de notre côté aucun fichier « au repos » à chiffrer.',
      },
      {
        h: '10. Signature numérique et eIDAS',
        p: 'L’outil « Signer un PDF » crée une signature numérique PAdES avec votre propre certificat (.p12/.pfx), entièrement dans le navigateur ; ni le fichier ni le certificat ne sont envoyés. C’est une véritable signature cryptographique, mais pas automatiquement une signature électronique qualifiée (QES) au sens du règlement eIDAS (UE 910/2014) : le statut QES dépend de la délivrance du certificat par un prestataire de services de confiance qualifié et de la présence de la clé sur un dispositif qualifié.',
      },
    ],
  },

  principles: {
    security: 'Nous utilisons une connexion HTTPS chiffrée, une Content Security Policy, une protection de l’API contre les abus et des limites de requêtes. Surtout, les outils de fichiers fonctionnent dans votre navigateur : vos fichiers n’atteignent jamais notre serveur.',
    tracking: 'Le site n’affiche actuellement aucune publicité. À l’avenir, nous pourrions introduire des publicités discrètes (p. ex. Google AdSense) pour couvrir les frais d’hébergement et de développement ; le cas échéant, nous mettrons cette information à jour. Dans tous les cas, tous les outils PDF resteront gratuits et illimités. Nous utilisons Google Analytics uniquement avec votre consentement, que vous pouvez retirer à tout moment avec le bouton « Paramètres des cookies ». Nous n’utilisons ni pixels de remarketing ni profilage comportemental.',
  },
};

export default fr;
