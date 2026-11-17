// Allège l'APK (CNG : réglages posés dans android/ au prebuild, jamais à la main).
// - Pas de décodeurs GIF ni WebP (Fresco) : Coef n'affiche aucune image de ce format (~1,4 Mo de .so en moins).
// - Ressources inutilisées retirées en release (R8 est déjà actif).
// - Un APK par architecture (splits ABI) : chaque téléphone ne télécharge que son code natif.
//   Les architectures sont celles de -PreactNativeArchitectures (sinon gradle.properties).
const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

const REGLAGES = {
  'expo.gif.enabled': 'false',
  'expo.webp.enabled': 'false',
  'expo.webp.animated': 'false',
  'android.enableShrinkResourcesInReleaseBuilds': 'true',
};

const SPLITS = `
    // plugins/allegement.js : un APK par architecture.
    splits {
        abi {
            enable true
            reset()
            include(*findProperty('reactNativeArchitectures').split(',').collect { it.trim() })
            universalApk false
        }
    }
`;

module.exports = (config) => {
  config = withGradleProperties(config, (c) => {
    for (const [key, value] of Object.entries(REGLAGES)) {
      const ligne = c.modResults.find((x) => x.type === 'property' && x.key === key);
      if (ligne) ligne.value = value;
      else c.modResults.push({ type: 'property', key, value });
    }
    return c;
  });
  return withAppBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes('plugins/allegement.js'))
      c.modResults.contents = c.modResults.contents.replace(/\nandroid \{\n/, `\nandroid {${SPLITS}`);
    return c;
  });
};
