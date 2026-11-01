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
| `index.html` | La page de l'application (pour l'instant : page de vérification des données) |
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
Une modification d'EX-DON-03 est proposée dans le cahier des charges.
