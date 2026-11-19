// Formats français. Arrondi au centième, demi vers le haut, comme ED et le moteur.
import { arrondi } from '@/domain/moyennes/moteur';

/** 12,5 → « 12,50 » : deux décimales fixes, pour que les colonnes s'alignent chiffre à chiffre. */
export const moyenne = (x: number) => arrondi(x).toFixed(2).replace('.', ',');

/** Valeur saisie par ED, nettoyée : « Abs  » → « Abs », « 12,5 » reste « 12,5 ». */
export const brute = (v: string) => v.trim();

/** Écart signé avec le vrai signe moins : « +0,35 », « −1,20 », « 0,00 ». */
export function ecart(x: number): string {
  const a = arrondi(Math.abs(x));
  const signe = a === 0 ? '' : x > 0 ? '+' : '−';
  return `${signe}${a.toFixed(2).replace('.', ',')}`;
}

/** « 2026-11-06 » → « 6 nov. ». */
export function jour(iso: string): string {
  const [, m, j] = iso.slice(0, 10).split('-').map(Number);
  const mois = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  return `${j} ${mois[(m ?? 1) - 1]}`;
}

/** Coefficient lisible : 0.5 → « 0,5 ». */
export const coef = (x: number) => String(x).replace('.', ',');

/** « 12,5 », « 12.5 », « 12 » → 12.5 ; texte invalide → undefined. */
export function lireNombre(s: string): number | undefined {
  const t = s.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return undefined;
  return Number(t);
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** Date locale à midi (pas de décalage de fuseau) depuis « AAAA-MM-JJ… ». */
export const dateDe = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`);

/** « AAAA-MM-JJ » d'une date locale. */
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const ajouterJours = (j: string, n: number) => {
  const d = dateDe(j);
  d.setDate(d.getDate() + n);
  return iso(d);
};

/** Le lundi de la semaine de `j`. */
export const lundiDe = (j: string) => ajouterJours(j, -((dateDe(j).getDay() + 6) % 7));

/** « jeudi 19 nov. » */
export const jourLong = (j: string) => `${JOURS[dateDe(j).getDay()]} ${jour(j)}`;

/** « lun. » */
export const jourCourt = (j: string) => `${JOURS[dateDe(j).getDay()]!.slice(0, 3)}.`;

/** « 08:00 » depuis « AAAA-MM-JJ HH:MM ». */
export const heure = (dt: string) =>
  dt
    .slice(11, 16)
    .replace(/^0/, '')
    .replace(':', ' h ')
    .replace(/ h 00$/, ' h');

/** Bornes et graduations de l'axe des moyennes : resserré autour des valeurs (dans 0–20), pas de 1, 2 ou 5. */
export function axeMoyennes(valeurs: number[]): { bas: number; haut: number; pas: number } {
  if (valeurs.length === 0) return { bas: 0, haut: 20, pas: 5 };
  let bas = Math.max(0, Math.floor(Math.min(...valeurs)) - 1);
  let haut = Math.min(20, Math.ceil(Math.max(...valeurs)) + 1);
  const pas = haut - bas <= 6 ? 1 : haut - bas <= 12 ? 2 : 5;
  bas = Math.max(0, Math.floor(bas / pas) * pas);
  haut = Math.min(20, Math.ceil(haut / pas) * pas);
  return { bas, haut, pas };
}

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/**
 * Repères de l'axe des dates, sur un pas régulier : le 1er de chaque mois (« oct. ») quand il y en a au moins
 * quatre, sinon le 1er et le 15 (« 15 oct. ») ; sur une plage trop courte, quatre dates à intervalles égaux.
 */
export function datesAxe(debut: string, fin: string): { date: string; libelle: string }[] {
  const jours: { date: string; mois: number; j: number }[] = [];
  let a = Number(debut.slice(0, 4));
  let m = Number(debut.slice(5, 7));
  for (;;) {
    for (const j of [1, 15]) {
      const date = `${a}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
      if (date > debut && date <= fin) jours.push({ date, mois: m, j });
    }
    if (`${a}-${String(m).padStart(2, '0')}-31` >= fin) break;
    if (m === 12) {
      m = 1;
      a++;
    } else m++;
  }
  const premiers = jours.filter((x) => x.j === 1);
  if (premiers.length >= 4) return premiers.map((x) => ({ date: x.date, libelle: MOIS[x.mois - 1]! }));
  if (jours.length >= 3) return jours.map((x) => ({ date: x.date, libelle: `${x.j} ${MOIS[x.mois - 1]}` }));
  const t0 = Date.parse(`${debut}T00:00:00Z`);
  const t1 = Date.parse(`${fin}T00:00:00Z`);
  return [0, 1, 2, 3].map((k) => {
    const date = new Date(t0 + ((t1 - t0) * k) / 3).toISOString().slice(0, 10);
    return { date, libelle: jour(date) };
  });
}

type Pt = { date: string; valeur: number };

/**
 * Points d'une courbe à partir de `debut` (AAAA-MM-JJ) : la valeur en cours à `debut` (dernier point avant) ouvre la
 * fenêtre, pour que la courbe parte du bord au lieu d'apparaître au milieu.
 */
export function fenetre(points: Pt[], debut: string): Pt[] {
  const avant = points.filter((p) => p.date < debut).at(-1);
  const dedans = points.filter((p) => p.date >= debut);
  return avant && dedans[0]?.date !== debut ? [{ date: debut, valeur: avant.valeur }, ...dedans] : dedans;
}

/** Valeur d'une courbe en escalier au jour `date` : celle du dernier point à cette date ou avant. */
export function valeurAu(points: Pt[], date: string): number | undefined {
  let v: number | undefined;
  for (const p of points) {
    if (p.date > date) break;
    v = p.valeur;
  }
  return v;
}
