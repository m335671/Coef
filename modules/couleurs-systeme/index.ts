// Couleur Material You du téléphone (module natif maison, Android 12+ seulement).
import { requireOptionalNativeModule } from 'expo';

// Absent sur iOS, le web, les tests et avant Android 12 : pas de couleur système.
const natif = requireOptionalNativeModule<{ accent(): string | null }>('CouleursSysteme');

export function accentSysteme(): string | undefined {
  try {
    return natif?.accent() ?? undefined;
  } catch {
    return undefined;
  }
}
