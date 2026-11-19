// Enregistrement de l'apparence (base chiffrée, comme les autres préférences) et lecture de la couleur Material You.
import { Appearance, Platform } from 'react-native';
import { z } from 'zod';

import { MODE_DEMO } from '@/demo';
import { ecrirePreference, lirePreference } from '@/storage/base';
import { type Apparence, APPARENCE_DEFAUT, useApparence } from '@/ui/apparence';

import { accentSysteme } from '../../modules/couleurs-systeme';

export const PREF_APPARENCE = 'apparence';

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const schema = z.object({
  mode: z.enum(['systeme', 'clair', 'sombre']),
  couleur: z.union([z.literal('coef'), z.literal('systeme'), hex]),
  matieres: z.record(z.string(), hex),
});

function appliquer(a: Apparence) {
  // Pour les composants natifs (interrupteurs, alertes) ; les couleurs de l'app suivent useSombre. Absent sur le web.
  if (Platform.OS !== 'web') Appearance.setColorScheme(a.mode === 'systeme' ? 'auto' : a.mode === 'clair' ? 'light' : 'dark');
}

/** Au démarrage et au retour dans l'app (le fond d'écran, donc Material You, a pu changer). */
export function lireCouleurSysteme(): void {
  useApparence.setState({ accentSysteme: accentSysteme() });
}

export async function chargerApparence(): Promise<void> {
  lireCouleurSysteme();
  if (MODE_DEMO) return;
  // Valeur illisible (ancienne version, base abîmée) : apparence par défaut plutôt qu'un plantage.
  const r = schema.safeParse(await lirePreference<unknown>(PREF_APPARENCE, null).catch(() => null));
  if (!r.success) return;
  useApparence.setState(r.data);
  appliquer(r.data);
}

export function changerApparence(p: Partial<Apparence>): void {
  useApparence.setState(p);
  const { mode, couleur, matieres } = useApparence.getState();
  appliquer({ mode, couleur, matieres });
  if (!MODE_DEMO) void ecrirePreference(PREF_APPARENCE, { mode, couleur, matieres }).catch(() => undefined);
}

/** « Tout effacer » : la base est supprimée, l'apparence revient à celle d'origine. */
export function reinitialiserApparence(): void {
  useApparence.setState({ ...APPARENCE_DEFAUT });
  appliquer(APPARENCE_DEFAUT);
}
