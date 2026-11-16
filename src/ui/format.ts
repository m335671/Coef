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
