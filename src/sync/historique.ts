// Historique des vérifications en arrière-plan (Réglages › Notifications) et détection d'un rythme anormal.
// Pur : testé sans React Native.

export type BilanFond = {
  date: string;
  resultat: 'ok' | 'premier-plan' | 'echec';
  notifiees?: number;
  erreur?: string;
  /** Lancée par le bouton « Tester » de Réglages, pas par Android. */
  test?: boolean;
};

export const MAX_HISTORIQUE = 60;

export const ajouterBilan = (h: readonly BilanFond[], b: BilanFond): BilanFond[] => [b, ...h].slice(0, MAX_HISTORIQUE);

/** « 2 notifications », « rien de nouveau », « échec (…) ». */
export function decrireBilan(b: Omit<BilanFond, 'date'>): string {
  if (b.resultat === 'premier-plan') return 'app ouverte, elle s’en est chargée';
  if (b.resultat === 'echec') return `échec (${b.erreur ?? 'erreur inconnue'})`;
  return b.notifiees ? `${b.notifiees} notification${b.notifiees > 1 ? 's' : ''}` : 'rien de nouveau';
}

const HEURE = 3_600_000;
const heures = (ms: number) => `${Math.round(ms / HEURE)} h`;

/**
 * Rythme des vérifications lancées par Android (les tests ne comptent pas). Prévues toutes les heures ; Android
 * peut les espacer la nuit, d'où des seuils larges : anormal si la dernière date de plus de 6 h, ou si l'écart
 * médian des dernières 48 h dépasse 3 h. Sans aucune vérification encore, rien à dire.
 */
export function regularite(h: readonly BilanFond[], maintenant: Date): { irregulier: false } | { irregulier: true; raison: string } {
  const dates = h
    .filter((b) => !b.test)
    .map((b) => Date.parse(b.date))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => b - a);
  const [derniere] = dates;
  if (derniere === undefined) return { irregulier: false };
  const age = maintenant.getTime() - derniere;
  if (age > 6 * HEURE) return { irregulier: true, raison: `aucune vérification depuis ${heures(age)}` };
  const recentes = dates.filter((t) => maintenant.getTime() - t <= 48 * HEURE);
  const ecarts = recentes
    .slice(1)
    .map((t, i) => recentes[i]! - t)
    .sort((a, b) => a - b);
  const mediane = ecarts[Math.floor(ecarts.length / 2)];
  if (ecarts.length >= 3 && mediane !== undefined && mediane > 3 * HEURE)
    return { irregulier: true, raison: `une vérification toutes les ${heures(mediane)} environ, au lieu d’une par heure` };
  return { irregulier: false };
}
