"""Récupère les données de marché sur Yahoo Finance et les écrit dans le dossier donnees/.

Ce script est lancé chaque jour ouvré par le robot GitHub Actions
(fichier .github/workflows/publier.yml). Il produit deux fichiers au contenu identique :
- donnees/marches.json : lisible par l'application une fois en ligne ;
- donnees/marches.js : même contenu, chargeable quand on ouvre index.html depuis le disque du PC
  (le navigateur interdit de lire un .json en local, mais accepte un script).

Il ne contient et ne reçoit AUCUNE donnée personnelle (exigence EX-DON-06).

Remarque sur les prix : Yahoo fournit des cours et dividendes « ajustés des divisions »
(ex. : avant la division Nvidia 10 pour 1 de juin 2024, les cours sont divisés par 10).
L'application devra donc convertir les quantités achetées avant une division (EX-TRX-14).
"""

import datetime as dt
import json
import sys
import time
from pathlib import Path

# Actions suivies en version 1 (CDC-2.1) et taux de change EUR/USD (dollars pour 1 euro).
ACTIONS = ["MSFT", "NVDA", "PG", "AAPL", "JNJ"]
SYMBOLE_TAUX = "EURUSD=X"
# Début de l'historique (EX-DON-02, EX-DON-03, EX-DON-04, EX-DON-05).
DEBUT = "2015-01-01"
# Au-delà de ce nombre de jours sans cotation, on considère que Yahoo a renvoyé des données périmées.
FRAICHEUR_MAX_JOURS = 7
DOSSIER_DONNEES = Path(__file__).resolve().parent.parent / "donnees"


def telecharger(symbole, essais=3):
    """Télécharge l'historique quotidien d'un symbole, avec plusieurs essais en cas d'erreur réseau."""
    import yfinance as yf

    for essai in range(1, essais + 1):
        try:
            historique = yf.Ticker(symbole).history(start=DEBUT, auto_adjust=False, actions=True)
            if not historique.empty:
                return historique
            print(f"{symbole} : réponse vide (essai {essai}/{essais})")
        except Exception as erreur:
            print(f"{symbole} : erreur « {erreur} » (essai {essai}/{essais})")
        time.sleep(10 * essai)
    raise RuntimeError(f"Impossible de récupérer {symbole} sur Yahoo Finance")


def serie_cours(historique):
    """Transforme la colonne des cours de clôture en liste [[date, cours], ...]."""
    cours = historique["Close"].dropna()
    return [[jour.strftime("%Y-%m-%d"), round(float(valeur), 4)] for jour, valeur in cours.items()]


def serie_evenements(historique, colonne):
    """Extrait les jours où la colonne (Dividends ou Stock Splits) est non nulle : [[date, valeur], ...]."""
    if colonne not in historique.columns:
        return []
    valeurs = historique[colonne].fillna(0)
    return [[jour.strftime("%Y-%m-%d"), round(float(v), 6)] for jour, v in valeurs.items() if v != 0]


def construire(historiques, historique_taux, maintenant):
    """Assemble le contenu du fichier de données de marché."""
    actions = {}
    for symbole in ACTIONS:
        historique = historiques[symbole]
        actions[symbole] = {
            "cours": serie_cours(historique),
            # Date = date de détachement ; Yahoo ne fournit pas la date de paiement.
            "dividendes": [
                {"detachement": jour, "montant": montant}
                for jour, montant in serie_evenements(historique, "Dividends")
            ],
            "divisions": [
                {"date": jour, "ratio": ratio}
                for jour, ratio in serie_evenements(historique, "Stock Splits")
            ],
        }
    return {
        "version": 1,
        "miseAJour": maintenant.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "debut": DEBUT,
        "devise": "USD",
        "actions": actions,
        "eurusd": serie_cours(historique_taux),
    }


def verifier(donnees, maintenant):
    """Refuse d'écrire des données vides ou périmées : le robot s'arrête en erreur (croix rouge sur GitHub)."""
    limite = (maintenant - dt.timedelta(days=FRAICHEUR_MAX_JOURS)).strftime("%Y-%m-%d")
    series = {symbole: contenu["cours"] for symbole, contenu in donnees["actions"].items()}
    series[SYMBOLE_TAUX] = donnees["eurusd"]
    for nom, serie in series.items():
        if not serie:
            raise ValueError(f"{nom} : aucune cotation reçue")
        if serie[-1][0] < limite:
            raise ValueError(f"{nom} : dernière cotation trop ancienne ({serie[-1][0]})")


def ecrire(donnees, dossier=DOSSIER_DONNEES):
    """Écrit marches.json et marches.js dans le dossier indiqué."""
    dossier.mkdir(parents=True, exist_ok=True)
    texte = json.dumps(donnees, ensure_ascii=False, separators=(",", ":"))
    (dossier / "marches.json").write_text(texte + "\n", encoding="utf-8")
    (dossier / "marches.js").write_text(
        "// Fichier généré automatiquement par scripts/recuperer_donnees.py : ne pas modifier.\n"
        f"window.MARCHES = {texte};\n",
        encoding="utf-8",
    )


def main():
    maintenant = dt.datetime.now(dt.timezone.utc)
    historiques = {symbole: telecharger(symbole) for symbole in ACTIONS}
    historique_taux = telecharger(SYMBOLE_TAUX)
    donnees = construire(historiques, historique_taux, maintenant)
    verifier(donnees, maintenant)
    ecrire(donnees)
    for symbole, contenu in donnees["actions"].items():
        print(
            f"{symbole} : {len(contenu['cours'])} cotations, "
            f"{len(contenu['dividendes'])} dividendes, {len(contenu['divisions'])} divisions, "
            f"dernier cours {contenu['cours'][-1]}"
        )
    print(f"EUR/USD : {len(donnees['eurusd'])} cotations, dernier taux {donnees['eurusd'][-1]}")


if __name__ == "__main__":
    try:
        main()
    except Exception as erreur:
        print(f"ÉCHEC : {erreur}")
        sys.exit(1)
