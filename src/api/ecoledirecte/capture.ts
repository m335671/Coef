// Capture des réponses ED pour l'essai réel (EXPO_PUBLIC_CAPTURE=1 au build, jamais en production).
// Seuls les corps de réponse sont gardés, anonymisés en mémoire ; jamais la requête (mot de passe)
// ni les valeurs d'en-têtes (jetons). Une relecture humaine reste obligatoire avant tout commit.
import { encoderBase64 } from './base64';

export const CAPTURE = process.env.EXPO_PUBLIC_CAPTURE === '1';

// Clés dont la valeur (et tout ce qu'elle contient) identifie une personne, un lieu ou une session.
// Sensible à la casse : « nombre… » ou « profile » ne doivent pas être effacés.
const SENSIBLE =
  /[tT]oken|^(cn|cv|uid|uuid|login|identifiant|sexe|civilite|photo|ville|question|propositions)$|^id|^(nom|prenom|particule|e?mail|tel|adresse|rne|ogec|codePostal)($|[A-Z])|Nom|Prenom|[eE]tablissement|Mail|Tel|Naissance|Adresse|[pP]rofesseur|auteur|Ogec|[nN]umero|^foStat$|^lastConnexion$|[aA]ppreciation|^unc|^logo/;
const BASE64 = /^(question|propositions)$/i;
// Valeurs qui trahissent un identifiant quelle que soit la clé : e-mail, suite de 6 chiffres ou plus (badge, UAI…).
const IDENTIFIANT = /[^\s@]+@[^\s@]+\.[^\s@]+|\d{6,}/;

/** Remplace chaque valeur sensible par une valeur fabriquée, la même pour une même valeur d'origine. */
export function anonymiser(valeur: unknown): unknown {
  const vus = new Map<string, string | number>();
  const faux = (cle: string, v: string | number): string | number => {
    const k = `${typeof v}:${v}`;
    if (!vus.has(k)) vus.set(k, typeof v === 'number' ? 1000 + vus.size : `${cle}-${vus.size}`);
    return vus.get(k)!;
  };
  const marche = (v: unknown, cle: string, sensible: boolean, b64: boolean): unknown => {
    if (Array.isArray(v)) return v.map((x) => marche(x, cle, sensible, b64));
    if (v && typeof v === 'object')
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, marche(x, k, sensible || SENSIBLE.test(k), b64 || BASE64.test(k))]));
    if (typeof v === 'string' && v !== '' && (sensible || IDENTIFIANT.test(v))) {
      const f = String(faux(cle, v));
      return b64 ? encoderBase64(f) : f;
    }
    if (typeof v === 'number' && sensible) return faux(cle, v);
    return v;
  };
  return marche(valeur, '', false, false);
}

export type Capture = { chemin: string; statut: number; entetes: string[]; corps: unknown };
const captures: Capture[] = [];

export function capturer(chemin: string, statut: number, entetes: Headers, corps: unknown): void {
  const noms: string[] = [];
  entetes.forEach((_, nom) => noms.push(nom));
  captures.push({ chemin: chemin.replace(/\/eleves\/\d+\//, '/eleves/<id>/'), statut, entetes: noms, corps: anonymiser(corps) });
}

// Un long message est coupé au collage : on partage en parts de 12 000 caractères, une par appui.
const TAILLE_PART = 12_000;
let instantane = '';
let part = 0;

export function partSuivanteCaptures(): string {
  if (part === 0) instantane = JSON.stringify(captures);
  const total = Math.max(1, Math.ceil(instantane.length / TAILLE_PART));
  const texte = `ED-Clone capture, partie ${part + 1}/${total}\n${instantane.slice(part * TAILLE_PART, (part + 1) * TAILLE_PART)}`;
  part = (part + 1) % total;
  return texte;
}
