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
export const heure = (dt: string) => dt.slice(11, 16).replace(':', ' h ').replace(/ h 00$/, ' h');
