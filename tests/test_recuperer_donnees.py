"""Tests du script de récupération, avec des données simulées (sans appel à Yahoo).

Lancement : python -m unittest discover -s tests
"""

import datetime as dt
import json
import sys
import tempfile
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import recuperer_donnees as rd  # noqa: E402

MAINTENANT = dt.datetime(2026, 11, 2, 23, 0, tzinfo=dt.timezone.utc)


def historique_simule(dernier_jour="2026-11-02", dividende=0.0, division=0.0):
    """Construit un faux historique Yahoo de 3 jours de cotation."""
    jours = pd.to_datetime(["2026-10-29", "2026-10-30", dernier_jour]).tz_localize("America/New_York")
    return pd.DataFrame(
        {
            "Close": [100.0, 101.123456, 102.5],
            "Dividends": [0.0, dividende, 0.0],
            "Stock Splits": [0.0, 0.0, division],
        },
        index=jours,
    )


def donnees_simulees(**options):
    historiques = {symbole: historique_simule(**options) for symbole in rd.ACTIONS}
    return rd.construire(historiques, historique_simule(), MAINTENANT)


class TestConstruire(unittest.TestCase):
    def test_cinq_actions_et_taux(self):
        donnees = donnees_simulees()
        self.assertEqual(list(donnees["actions"]), ["MSFT", "NVDA", "PG", "AAPL", "JNJ"])
        self.assertEqual(len(donnees["eurusd"]), 3)

    def test_cours_dates_et_arrondi(self):
        cours = donnees_simulees()["actions"]["AAPL"]["cours"]
        self.assertEqual(cours[1], ["2026-10-30", 101.1235])

    def test_dividendes_non_nuls_seulement(self):
        dividendes = donnees_simulees(dividende=0.26)["actions"]["JNJ"]["dividendes"]
        self.assertEqual(dividendes, [{"detachement": "2026-10-30", "montant": 0.26}])

    def test_divisions(self):
        divisions = donnees_simulees(division=10.0)["actions"]["NVDA"]["divisions"]
        self.assertEqual(divisions, [{"date": "2026-11-02", "ratio": 10.0}])

    def test_date_de_mise_a_jour(self):
        self.assertEqual(donnees_simulees()["miseAJour"], "2026-11-02T23:00:00Z")


class TestVerifier(unittest.TestCase):
    def test_donnees_fraiches_acceptees(self):
        rd.verifier(donnees_simulees(), MAINTENANT)

    def test_donnees_perimees_refusees(self):
        with self.assertRaises(ValueError):
            rd.verifier(donnees_simulees(dernier_jour="2026-10-31"), MAINTENANT + dt.timedelta(days=10))

    def test_serie_vide_refusee(self):
        donnees = donnees_simulees()
        donnees["actions"]["PG"]["cours"] = []
        with self.assertRaises(ValueError):
            rd.verifier(donnees, MAINTENANT)


class TestEcrire(unittest.TestCase):
    def test_json_et_js_identiques(self):
        donnees = donnees_simulees()
        with tempfile.TemporaryDirectory() as dossier:
            rd.ecrire(donnees, Path(dossier))
            depuis_json = json.loads((Path(dossier) / "marches.json").read_text(encoding="utf-8"))
            script = (Path(dossier) / "marches.js").read_text(encoding="utf-8")
            depuis_js = json.loads(script.split("window.MARCHES = ", 1)[1].rstrip().rstrip(";"))
        self.assertEqual(depuis_json, donnees)
        self.assertEqual(depuis_js, donnees)

    def test_aucune_donnee_personnelle(self):
        # EX-DON-06 : seules ces clés sont autorisées dans le fichier.
        self.assertEqual(
            set(donnees_simulees()),
            {"version", "miseAJour", "debut", "devise", "actions", "eurusd"},
        )


if __name__ == "__main__":
    unittest.main()
