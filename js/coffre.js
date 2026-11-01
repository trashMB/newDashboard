// Coffre chiffré : garde les données personnelles dans le navigateur (IndexedDB),
// chiffrées en AES-GCM 256 bits avec une clé dérivée du code par PBKDF2-SHA-256 (EX-SEC-06).
// Sans le code, le contenu est illisible et aucune récupération n'est possible (EX-SEC-11).
// Script classique (pas de module) pour fonctionner aussi en ouvrant index.html depuis le disque.
const Coffre = (() => {
  const BASE = "portefeuille";
  const MAGASIN = "coffre";
  const CLE_ENREGISTREMENT = "principal";
  const ITERATIONS = 600000;

  // Clé AES et données déchiffrées : en mémoire uniquement, et seulement tant que l'application est déverrouillée.
  let cle = null;
  let sel = null;
  let contenu = null;

  // Ouvre la base IndexedDB, en créant le magasin au premier lancement.
  function ouvrirBase() {
    return new Promise((reussite, echec) => {
      const requete = indexedDB.open(BASE, 1);
      requete.onupgradeneeded = () => requete.result.createObjectStore(MAGASIN);
      requete.onsuccess = () => reussite(requete.result);
      requete.onerror = () => echec(requete.error);
    });
  }

  // Exécute une opération sur le magasin et attend la fin de la transaction.
  async function operation(mode, action) {
    const base = await ouvrirBase();
    return new Promise((reussite, echec) => {
      const transaction = base.transaction(MAGASIN, mode);
      const requete = action(transaction.objectStore(MAGASIN));
      transaction.oncomplete = () => { base.close(); reussite(requete.result); };
      transaction.onerror = () => { base.close(); echec(transaction.error); };
    });
  }

  const lire = () => operation("readonly", magasin => magasin.get(CLE_ENREGISTREMENT));
  const ecrire = valeur => operation("readwrite", magasin => magasin.put(valeur, CLE_ENREGISTREMENT));
  const effacer = () => operation("readwrite", magasin => magasin.delete(CLE_ENREGISTREMENT));

  // Transforme le code à 6 chiffres en clé AES (opération volontairement lente : environ 1 seconde).
  async function deriverCle(code, selOctets, iterations) {
    const materiau = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: selOctets, iterations, hash: "SHA-256" },
      materiau,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }

  // Déchiffre un enregistrement ; échoue si la clé ne correspond pas (code erroné).
  async function dechiffrer(enregistrement, cleAes) {
    const clair = await crypto.subtle.decrypt({ name: "AES-GCM", iv: enregistrement.iv }, cleAes, enregistrement.chiffre);
    return JSON.parse(new TextDecoder().decode(clair));
  }

  // Vérifie un code contre l'enregistrement stocké et renvoie le contenu déchiffré, ou null si le code est faux.
  async function essayerCode(code) {
    const enregistrement = await lire();
    if (!enregistrement) return null;
    const cleAes = await deriverCle(code, enregistrement.sel, enregistrement.iterations);
    try {
      return { cleAes, sel: enregistrement.sel, contenu: await dechiffrer(enregistrement, cleAes) };
    } catch {
      return null;
    }
  }

  // Chiffre le contenu en mémoire avec un nouveau vecteur d'initialisation et l'enregistre.
  async function sauvegarder() {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const clair = new TextEncoder().encode(JSON.stringify(contenu));
    const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cle, clair));
    await ecrire({ version: 1, iterations: ITERATIONS, sel, iv, chiffre });
  }

  return {
    // Un code valide compte exactement 6 chiffres (EX-SEC-02).
    codeValide: code => /^\d{6}$/.test(code),

    // Indique si un coffre existe déjà sur cet appareil (sinon : premier lancement).
    async existe() {
      return (await lire()) !== undefined;
    },

    // Crée un coffre vide protégé par le code (EX-SEC-01).
    async creer(code) {
      sel = crypto.getRandomValues(new Uint8Array(16));
      cle = await deriverCle(code, sel, ITERATIONS);
      contenu = { version: 1, transactions: [], parametres: {} };
      await sauvegarder();
    },

    // Déverrouille le coffre ; renvoie false si le code est faux (EX-SEC-05).
    async ouvrir(code) {
      const resultat = await essayerCode(code);
      if (!resultat) return false;
      ({ cleAes: cle, sel, contenu } = resultat);
      return true;
    },

    // Oublie la clé et les données déchiffrées (verrouillage).
    fermer() {
      cle = null;
      sel = null;
      contenu = null;
    },

    estOuvert: () => cle !== null,
    donnees: () => contenu,
    sauvegarder,

    // Change le code après vérification de l'ancien, en conservant les données (EX-SEC-08, EX-SEC-09).
    async changerCode(ancien, nouveau) {
      const resultat = await essayerCode(ancien);
      if (!resultat) return false;
      contenu = resultat.contenu;
      sel = crypto.getRandomValues(new Uint8Array(16));
      cle = await deriverCle(nouveau, sel, ITERATIONS);
      await sauvegarder();
      return true;
    },

    // Efface définitivement toutes les données personnelles de cet appareil (EX-SEC-10).
    async reinitialiser() {
      this.fermer();
      await effacer();
    },
  };
})();
