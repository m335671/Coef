// Notifications locales (module natif maison : expo-notifications embarque Firebase Messaging).
import { requireOptionalNativeModule } from 'expo';
import { PermissionsAndroid, Platform } from 'react-native';

type Natif = {
  demanderAutorisation?(): Promise<boolean>;
  autorisees(): Promise<boolean>;
  afficher(id: number, titre: string, texte: string): Promise<boolean>;
};

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

/** Affiche une notification ; la même id remplace la précédente. Faux si non autorisé. */
export async function afficher(id: number, titre: string, texte: string): Promise<boolean> {
  return natif ? natif.afficher(id, titre, texte) : false;
}
