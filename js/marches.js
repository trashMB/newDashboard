// Accès aux données de marché (window.MARCHES, en dollars) et conversion en euros.
// Les données restent en USD dans le fichier, comme Yahoo les publie ; la conversion se fait ici,
// au taux EUR/USD du jour concerné (EX-VAL-01, EX-VAL-02).
const Marches = (() => {
  const donnees = () => window.MARCHES;

  // Renvoie l'élément [date, valeur] de la série à la date demandée,
  // ou au dernier jour de cotation précédent (week-end, jour férié). Recherche par dichotomie.
  function aLaDate(serie, date) {
    let bas = 0;
    let haut = serie.length - 1;
    if (haut < 0 || serie[0][0] > date) return null;
    while (bas < haut) {
      const milieu = Math.ceil((bas + haut) / 2);
      if (serie[milieu][0] <= date) bas = milieu;
      else haut = milieu - 1;
    }
    return serie[bas];
  }

  return {
    disponibles: () => Boolean(donnees()),
    miseAJour: () => donnees().miseAJour,
    symboles: () => Object.keys(donnees().actions),
    nombreDividendes: symbole => donnees().actions[symbole].dividendes.length,

    // Taux EUR/USD (dollars pour 1 euro) à une date ; sans date, le dernier connu.
    taux(date) {
      const serie = donnees().eurusd;
      return date ? aLaDate(serie, date)?.[1] ?? null : serie.at(-1)[1];
    },
    dateDernierTaux: () => donnees().eurusd.at(-1)[0],

    // Convertit un montant en dollars en euros au taux de la date indiquée (EX-VAL-01).
    enEuros(montantUsd, date) {
      const taux = this.taux(date);
      return taux ? montantUsd / taux : null;
    },

    // Dernier cours connu d'une action : date, cours en dollars et cours en euros au taux du même jour.
    dernierCours(symbole) {
      const [date, usd] = donnees().actions[symbole].cours.at(-1);
      return { date, usd, eur: this.enEuros(usd, date) };
    },
  };
})();
