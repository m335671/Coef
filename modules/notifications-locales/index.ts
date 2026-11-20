// Notifications locales (module natif maison : expo-notifications embarque Firebase Messaging).
import { requireOptionalNativeModule } from 'expo';
import { PermissionsAndroid, Platform } from 'react-native';

type Natif = {
  demanderAutorisation?(): Promise<boolean>;
  autorisees(): Promise<boolean>;
  batterieOptimisee?(): boolean;
  exempterBatterie?(): void;
  effacer(): Promise<void>;
  afficher(id: number, titre: string, texte: string, ecranVerrouille: EcranVerrouille): Promise<boolean>;
};

/**
 * Sur l'écran verrouillé : « rien » (la notification n'apparaît qu'après déverrouillage) ou « systeme »
 * (le réglage « contenu sensible » du téléphone décide). Android ne permet pas d'imposer une version courte.
 * iOS : l'aperçu des notifications se règle dans les réglages du système.
 */
export type EcranVerrouille = 'rien' | 'systeme';

// Absent sur le web et dans les tests : tout devient sans effet.
const natif = requireOptionalNativeModule<Natif>('NotificationsLocales');

export async function demanderAutorisation(): Promise<boolean> {
  if (!natif) return false;
  if (Platform.OS === 'android') {
    if (Platform.Version < 33) return natif.autorisees();
    return (await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)) === 'granted';
  }
  return natif.demanderAutorisation!();
}

/** Retire les notifications déjà affichées par l'app (à l'ouverture). */
export async function effacer(): Promise<void> {
  await natif?.effacer();
}

/** Affiche une notification ; la même id remplace la précédente. Faux si non autorisé. */
export async function afficher(id: number, titre: string, texte: string, ecranVerrouille: EcranVerrouille = 'rien'): Promise<boolean> {
  return natif ? natif.afficher(id, titre, texte, ecranVerrouille) : false;
}

/** Vrai si Android optimise la batterie de Coef (synchro de fond retardée) ; undefined hors Android. */
export function batterieOptimisee(): boolean | undefined {
  return natif?.batterieOptimisee?.();
}

/** Ouvre la fenêtre système qui exempte Coef de l'optimisation de la batterie. */
export function exempterBatterie(): void {
  natif?.exempterBatterie?.();
}

