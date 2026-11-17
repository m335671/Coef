// Unique point de sortie réseau de l'app (règle de confidentialité, vérifiée par tests/reseau.test.ts).

/** Hôtes EcoleDirecte autorisés. Toute autre destination est refusée avant envoi. */
export const HOTES_AUTORISES = ['api.ecoledirecte.com'] as const;

const DELAI_MAX_MS = 30_000;

export class ErreurReseau extends Error {
  constructor(
    message: string,
    readonly statut?: number,
  ) {
    super(message);
    this.name = 'ErreurReseau';
  }
}

export function verifierHote(url: string): URL {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new ErreurReseau('Adresse invalide.');
  }
  if (u.protocol !== 'https:' || !(HOTES_AUTORISES as readonly string[]).includes(u.hostname)) {
    throw new ErreurReseau(`Hôte refusé : ${u.hostname}`);
  }
  return u;
}

// Une requête à la fois : pas de rafales vers ED. Celles qui attendent partent de la plus récente à la plus
// ancienne : l'écran qu'on vient d'ouvrir passe devant le chargement de fond de l'Accueil.
const enAttente: (() => void)[] = [];
let occupe = false;

function suivante() {
  const t = enAttente.pop();
  if (t) t();
  else occupe = false;
}

export function requete(url: string, init: RequestInit): Promise<Response> {
  const cible = verifierHote(url);
  return new Promise<Response>((resoudre, rejeter) => {
    const lancer = async () => {
      const abandon = new AbortController();
      const minuteur = setTimeout(() => abandon.abort(), DELAI_MAX_MS);
      try {
        resoudre(await fetch(cible.toString(), { ...init, signal: abandon.signal }));
      } catch {
        // Message fixe : l'erreur d'origine peut contenir l'URL ou le corps.
        rejeter(new ErreurReseau('EcoleDirecte est injoignable.'));
      } finally {
        clearTimeout(minuteur);
        suivante();
      }
    };
    if (occupe) enAttente.push(lancer);
    else {
      occupe = true;
      void lancer();
    }
  });
}
