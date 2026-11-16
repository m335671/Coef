// Erreurs typées du client ED. Les messages sont fixes : jamais d'identifiant, de mot de passe ni de jeton.

export type TypeErreurED =
  | 'identifiants' // code 505
  | 'qcm-echoue' // mauvaise réponse au QCM de double authentification
  | 'session-expiree' // codes 520 / 525, reconnexion silencieuse impossible
  | 'version-api' // code 517 : le paramètre v= n'est plus accepté
  | 'reponse-inattendue' // réponse qui ne passe pas le schéma
  | 'serveur' // HTTP 5xx ou code ED inconnu
  | 'reseau';

const MESSAGES: Record<TypeErreurED, string> = {
  identifiants: 'Identifiant ou mot de passe incorrect.',
  'qcm-echoue': 'Réponse incorrecte à la question de sécurité.',
  'session-expiree': 'Session expirée : reconnecte-toi.',
  'version-api': "EcoleDirecte a changé de version d'API : une mise à jour de l'app est nécessaire.",
  'reponse-inattendue': "EcoleDirecte a renvoyé une réponse inattendue : l'app doit être mise à jour.",
  serveur: 'EcoleDirecte rencontre un problème. Réessaie plus tard.',
  reseau: 'EcoleDirecte est injoignable.',
};

export class ErreurED extends Error {
  constructor(
    readonly type: TypeErreurED,
    /** Détail technique sans donnée personnelle (code ED, chemin du champ invalide…). */
    readonly detail?: string,
  ) {
    super(MESSAGES[type]);
    this.name = 'ErreurED';
  }
}
