// Logique de l'interface : choix de l'écran, code, verrouillage automatique, paramètres.
(() => {
  // Verrouillage après 5 minutes sans interaction (EX-SEC-07).
  const DELAI_VERROUILLAGE_MS = 5 * 60 * 1000;
  let derniereActivite = Date.now();

  const $ = id => document.getElementById(id);
  const ECRANS = ["ecran-creation", "ecran-code", "ecran-principal"];

  // Formats français (EX-NF-15, EX-NF-16).
  const nombre = (valeur, decimales) =>
    valeur.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
  const dateFr = iso => iso.slice(0, 10).split("-").reverse().join("/");

  // Affiche un seul des trois écrans.
  function afficherEcran(id) {
    for (const ecran of ECRANS) $(ecran).hidden = ecran !== id;
    // Place le curseur dans le premier champ visible (code à saisir).
    const champ = [...document.querySelectorAll(`#${id} input`)].find(input => input.offsetParent !== null);
    if (champ) champ.focus();
  }

  // Dans l'écran principal, affiche l'accueil ou les paramètres.
  function afficherVue(vue) {
    $("vue-accueil").hidden = vue !== "accueil";
    $("vue-parametres").hidden = vue !== "parametres";
  }

  // Vide tous les champs et messages d'un formulaire.
  function viderFormulaire(formulaire) {
    formulaire.reset();
    for (const message of formulaire.querySelectorAll(".message")) message.textContent = "";
  }

  // Bloque un bouton pendant un calcul long (dérivation de clé) et affiche un texte d'attente.
  async function pendant(bouton, texte, action) {
    const texteInitial = bouton.textContent;
    bouton.disabled = true;
    bouton.textContent = texte;
    try {
      return await action();
    } finally {
      bouton.disabled = false;
      bouton.textContent = texteInitial;
    }
  }

  // Renvoie un message d'erreur si le code ou sa confirmation ne conviennent pas, sinon une chaîne vide.
  function erreurNouveauCode(code, confirmation) {
    if (!Coffre.codeValide(code)) return "Le code doit contenir exactement 6 chiffres.";
    if (code !== confirmation) return "Les deux codes ne sont pas identiques.";
    return "";
  }

  // Ouvre l'application une fois le coffre déverrouillé.
  function entrer() {
    derniereActivite = Date.now();
    afficherVue("accueil");
    afficherEcran("ecran-principal");
  }

  // Ferme le coffre, efface l'écran et redemande le code.
  function verrouiller() {
    Coffre.fermer();
    afficherVue("accueil");
    viderFormulaire($("form-changement"));
    viderFormulaire($("form-code"));
    afficherEcran("ecran-code");
  }

  // Affiche le résumé des données de marché en euros (étape 1) ; sera remplacé par le tableau de bord.
  function afficherMarches() {
    const etat = $("etat-marches");
    if (!Marches.disponibles()) {
      etat.className = "bandeau alerte";
      etat.textContent = "Données de marché indisponibles.";
      return;
    }
    const miseAJour = new Date(Marches.miseAJour());
    const ancien = (Date.now() - miseAJour) / 86400000 > 3;
    const heure = miseAJour.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    etat.className = "bandeau " + (ancien ? "alerte" : "ok");
    etat.textContent = `Données du ${dateFr(Marches.miseAJour())} à ${heure}` + (ancien ? " : plus de 3 jours." : " : à jour.");

    // Une ligne par action : cours en euros, avec le cours d'origine en dollars en petit dessous.
    const corps = document.querySelector("#table-marches tbody");
    corps.replaceChildren();
    for (const symbole of Marches.symboles()) {
      const cours = Marches.dernierCours(symbole);
      const ligne = corps.insertRow();
      ligne.insertCell().textContent = symbole;
      const cellule = ligne.insertCell();
      cellule.className = "nombre";
      cellule.append(nombre(cours.eur, 2) + " €");
      const dollars = document.createElement("small");
      dollars.className = "discret secondaire";
      dollars.textContent = nombre(cours.usd, 2) + " $";
      cellule.append(dollars);
      ligne.insertCell().textContent = dateFr(cours.date);
    }
    $("taux-marches").textContent =
      `Conversion au taux EUR/USD du jour de chaque cours. Dernier taux : 1 € = ${nombre(Marches.taux(), 4)} $ (${dateFr(Marches.dateDernierTaux())}).`;
    $("table-marches").hidden = false;
  }

  // Création du code au premier lancement.
  $("form-creation").addEventListener("submit", async evenement => {
    evenement.preventDefault();
    const code = $("creation-code").value;
    const erreur = erreurNouveauCode(code, $("creation-confirmation").value);
    $("creation-message").textContent = erreur;
    if (erreur) return;
    await pendant(evenement.submitter, "Création…", () => Coffre.creer(code));
    viderFormulaire($("form-creation"));
    entrer();
  });

  // Saisie du code à l'ouverture.
  $("form-code").addEventListener("submit", async evenement => {
    evenement.preventDefault();
    const code = $("code").value;
    const message = $("code-message");
    message.textContent = "";
    if (!Coffre.codeValide(code)) {
      message.textContent = "Le code doit contenir exactement 6 chiffres.";
      return;
    }
    const ouvert = await pendant(evenement.submitter, "Vérification…", () => Coffre.ouvrir(code));
    if (!ouvert) {
      message.textContent = "Code incorrect";
      $("code").select();
      return;
    }
    viderFormulaire($("form-code"));
    entrer();
  });

  // Changement de code depuis les paramètres.
  $("form-changement").addEventListener("submit", async evenement => {
    evenement.preventDefault();
    const message = $("changement-message");
    const nouveau = $("nouveau-code").value;
    const erreur = erreurNouveauCode(nouveau, $("nouveau-confirmation").value);
    message.textContent = erreur;
    if (erreur) return;
    const change = await pendant(evenement.submitter, "Modification…", () => Coffre.changerCode($("ancien-code").value, nouveau));
    viderFormulaire($("form-changement"));
    message.textContent = change ? "Code modifié." : "Code actuel incorrect : le code n'a pas été changé.";
  });

  // Réinitialisation : le bouton « Effacer » ne s'active qu'une fois EFFACER tapé.
  const dialogue = $("dialogue-reinitialisation");
  $("confirmation-effacer").addEventListener("input", evenement => {
    $("bouton-effacer").disabled = evenement.target.value.trim().toUpperCase() !== "EFFACER";
  });
  dialogue.addEventListener("close", async () => {
    if (dialogue.returnValue !== "effacer") return;
    await Coffre.reinitialiser();
    verrouiller();
    afficherEcran("ecran-creation");
  });

  // Boutons d'action (data-action) répartis dans la page.
  const actions = {
    verrouiller,
    parametres: () => afficherVue("parametres"),
    accueil: () => afficherVue("accueil"),
    reinitialiser: () => {
      $("form-reinitialisation").reset();
      $("bouton-effacer").disabled = true;
      dialogue.showModal();
    },
  };
  document.addEventListener("click", evenement => {
    const bouton = evenement.target.closest("[data-action]");
    if (bouton) actions[bouton.dataset.action]();
  });

  // Toute interaction repousse le verrouillage automatique.
  for (const type of ["pointerdown", "keydown", "wheel", "scroll", "touchstart"]) {
    addEventListener(type, () => { derniereActivite = Date.now(); }, { capture: true, passive: true });
  }
  function verifierInactivite() {
    if (Coffre.estOuvert() && Date.now() - derniereActivite >= DELAI_VERROUILLAGE_MS) verrouiller();
  }
  setInterval(verifierInactivite, 1000);
  // Au retour sur l'application (téléphone mis en veille), on vérifie aussitôt.
  document.addEventListener("visibilitychange", verifierInactivite);

  // Fonctionnement hors connexion et installation : uniquement sur le site en ligne (pas depuis le disque).
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js");
  }

  // Démarrage : premier lancement ou saisie du code. Aucune donnée personnelle n'est lue avant le code.
  afficherMarches();
  Coffre.existe().then(existe => afficherEcran(existe ? "ecran-code" : "ecran-creation"));
})();
