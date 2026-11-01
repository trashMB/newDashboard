# Mon portefeuille — tableau de bord d'investissement

Application personnelle de suivi d'actions (MSFT, NVDA, PG, AAPL, JNJ), utilisable sur PC et sur Android.
Adresse du site : **https://trashmb.github.io/newDashboard/**

Ce guide est écrit pour être suivi sans connaissances en développement et **sans droits administrateur** sur le PC.

---

## Comment ça marche (en 3 lignes)

1. Chaque soir de semaine, un **robot GitHub** va chercher les cours, dividendes et taux EUR/USD sur Yahoo Finance.
2. Il range ces données dans le dossier `donnees/` du dépôt, puis **publie le site** sur GitHub Pages.
3. Vos données personnelles (achats, montants, code) ne passent **jamais** par GitHub : elles restent chiffrées sur vos appareils.

| Fichier ou dossier | Rôle |
| --- | --- |
| `index.html` | La page de l'application (écrans : création du code, saisie du code, accueil, paramètres) |
| `css/style.css` | L'apparence (couleurs, tailles, adaptation téléphone / PC, mode sombre) |
| `js/coffre.js` | Le coffre chiffré : enregistre vos données sur l'appareil, protégées par votre code |
| `js/app.js` | Le fonctionnement des écrans : code, verrouillage automatique, paramètres |
| `manifest.webmanifest`, `icones/` | Nom et icône de l'application, pour l'installer sur Android |
| `sw.js` | Garde une copie de l'application pour l'ouvrir sans connexion |
| `donnees/marches.json` et `donnees/marches.js` | Données de marché, écrites par le robot. Ne pas modifier à la main |
| `scripts/recuperer_donnees.py` | Le programme du robot qui interroge Yahoo Finance |
| `.github/workflows/publier.yml` | Le « mode d'emploi » du robot : quand il se lance et ce qu'il fait |
| `tests/` | Tests automatiques du programme du robot |

---

## Partie 1 — Activer la publication du site (une seule fois)

1. Ouvrez https://github.com/trashMB/newDashboard
2. Cliquez sur **Settings** (onglet avec un engrenage, en haut à droite).
3. Dans le menu de gauche, cliquez sur **Pages**.
4. Sous **Build and deployment**, champ **Source**, choisissez **GitHub Actions**.
   Il n'y a rien d'autre à remplir ; le réglage est enregistré immédiatement.

## Partie 2 — Lancer le robot une première fois

Le robot se lance seul chaque soir, mais la première fois on le déclenche à la main.

1. Sur la page du dépôt, cliquez sur l'onglet **Actions**.
2. Dans la liste de gauche, cliquez sur **Données et publication**.
3. À droite, cliquez sur **Run workflow**, puis sur le bouton vert **Run workflow**.
4. Une ligne apparaît avec un rond jaune (en cours). Attendez 2 à 3 minutes.
5. Résultat :
   - **coche verte** : tout a fonctionné ;
   - **croix rouge** : cliquez sur la ligne, puis sur l'étape en rouge pour lire le message d'erreur (il est en français), et transmettez-le.

## Partie 3 — Vérifier sur le téléphone et la tablette

1. Ouvrez **Chrome** sur le téléphone ou la tablette.
2. Allez à l'adresse **https://trashmb.github.io/newDashboard/**
3. Vous devez voir un bandeau vert « Données du JJ/MM/AAAA à HH:MM : à jour » et un tableau de 6 lignes.

## Partie 4 — Tester sur le PC, sans rien installer

**Option A, la plus simple** : ouvrez la même adresse dans Edge ou Chrome.

**Option B, fichiers sur le disque** (utile quand on modifiera l'application) :

1. Sur la page du dépôt, cliquez sur le bouton vert **Code**, puis **Download ZIP**.
2. Dans l'Explorateur Windows, clic droit sur le fichier ZIP → **Extraire tout**.
3. Double-cliquez sur `index.html` dans le dossier extrait : la page s'ouvre dans le navigateur.

**Simuler un téléphone sur le PC** : dans la page ouverte, appuyez sur **F12**, puis **Ctrl + Maj + M**.
En haut de la page, choisissez une largeur de 360 (téléphone) ou un modèle de tablette.

---

## Étape 1 — Exigences à vérifier

| Exigence | Comment vérifier | OK ? |
| --- | --- | --- |
| EX-DON-01 | Onglet Actions, après 10 jours ouvrés : 10 exécutions planifiées (« schedule ») réussies, après 22:00 UTC | |
| EX-DON-02 | Dans `donnees/marches.json`, chaque action a des cours depuis début janvier 2015 et jusqu'au dernier jour de cotation | |
| EX-DON-03 | Les dividendes figurent avec date de détachement et montant (voir la remarque ci-dessous) | |
| EX-DON-04 | NVDA contient une division du 10/06/2024 de ratio 10 | |
| EX-DON-05 | `eurusd` contient des taux depuis début janvier 2015 | |
| EX-DON-06 | Le fichier ne contient que des cours, dividendes, divisions, taux et la date de mise à jour | |

**Remarque :** Yahoo Finance ne fournit pas la **date de paiement** des dividendes, seulement la date de détachement.
Décision PO-8 : la date de détachement est utilisée par défaut, et la date de paiement réelle pourra être saisie (étape 5).

---

## Étape 2 — Code, verrouillage et installation sur Android

### Installer l'application sur le téléphone ou la tablette

1. Ouvrez **Chrome** et allez à **https://trashmb.github.io/newDashboard/**
2. Touchez le menu **⋮** (trois points, en haut à droite).
3. Touchez **Ajouter à l'écran d'accueil**, puis **Installer** (ou **Ajouter**).
4. L'icône bleue « Portefeuille » apparaît sur l'écran d'accueil. Lancez l'application depuis cette icône :
   elle s'ouvre en plein écran, sans barre d'adresse.

Les mises à jour sont automatiques : à chaque ouverture avec une connexion, l'application prend la dernière version.

### Premier lancement

Choisissez un code de 6 chiffres et **notez-le en lieu sûr** : sans lui, vos données sont perdues (il n'existe aucun moyen de les récupérer).
Chaque appareil (PC, téléphone, tablette) a son propre code et ses propres données ; le transfert entre appareils arrive à l'étape 7.

**Ce que protège le code :** il empêche une personne qui prend votre téléphone déverrouillé d'ouvrir l'application,
et il chiffre les données enregistrées. Un code à 6 chiffres ne résisterait pas à un spécialiste qui copierait les fichiers
de l'appareil et testerait tous les codes possibles : gardez aussi un verrouillage d'écran sur vos appareils.

### Exigences à vérifier

| Exigence | Comment vérifier | OK ? |
| --- | --- | --- |
| EX-SEC-01 | Premier lancement : seul l'écran « Bienvenue » est affiché | |
| EX-SEC-02 | Codes « 12345 » et « 12a456 » refusés ; « 123456 » accepté | |
| EX-SEC-03 | Deux codes différents à la création : refusés | |
| EX-SEC-04 | Fermer puis rouvrir l'application : le code est demandé avant tout affichage | |
| EX-SEC-05 | Code faux : message « Code incorrect » | |
| EX-SEC-06 | Inspection de `js/coffre.js` (AES-GCM 256 bits, PBKDF2-SHA-256, 600 000 itérations) | |
| EX-SEC-07 | Ne plus toucher l'écran pendant 5 minutes : l'écran du code réapparaît | |
| EX-SEC-08 | Paramètres → Changer le code avec un code actuel faux : refusé | |
| EX-SEC-09 | Changer le code, verrouiller, rouvrir avec le nouveau code : fonctionne | |
| EX-SEC-10 | Paramètres → Réinitialiser → taper EFFACER → retour à « Bienvenue » | |
| EX-SEC-11 | Inspection : aucune fonction de récupération dans le code | |
| EX-NF-04 | Téléphone (ou PC en simulation 360 px) : aucun défilement horizontal de la page | |
| EX-NF-05 | PC en plein écran (1920 px) : aucun défilement horizontal | |
| EX-NF-06 | L'icône apparaît sur l'écran d'accueil Android | |
| EX-NF-07 | Lancée depuis l'icône, l'application n'a pas de barre d'adresse | |
| EX-NF-11 | Fichiers téléchargés (Partie 4, option B) : double-clic sur `index.html`, tout fonctionne | |
| EX-NF-12 | PC : F12 puis Ctrl + Maj + M, largeur 360 : affichage téléphone | |
