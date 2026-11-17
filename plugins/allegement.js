// Allège l'APK (CNG : réglages posés dans android/gradle.properties au prebuild, jamais à la main).
// - Pas de décodeurs GIF ni WebP (Fresco) : Coef n'affiche aucune image de ce format (~1,4 Mo de .so en moins).
// - Ressources inutilisées retirées en release (R8 est déjà actif).
const { withGradleProperties } = require('expo/config-plugins');

const REGLAGES = {
  'expo.gif.enabled': 'false',
  'expo.webp.enabled': 'false',
  'expo.webp.animated': 'false',
  'android.enableShrinkResourcesInReleaseBuilds': 'true',
};

module.exports = (config) =>
  withGradleProperties(config, (c) => {
    for (const [key, value] of Object.entries(REGLAGES)) {
      const ligne = c.modResults.find((x) => x.type === 'property' && x.key === key);
      if (ligne) ligne.value = value;
      else c.modResults.push({ type: 'property', key, value });
    }
    return c;
  });
