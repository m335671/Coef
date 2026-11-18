// Banc d'essai des notifications : seulement si EXPO_PUBLIC_FAUX_ED est défini à la construction (APK d'essai,
// jamais publié), autorise le HTTP en clair vers le faux serveur ED local (scripts/faux-ed.mjs). Sinon : rien.
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = (config) =>
  process.env.EXPO_PUBLIC_FAUX_ED
    ? withAndroidManifest(config, (c) => {
        c.modResults.manifest.application[0].$['android:usesCleartextTraffic'] = 'true';
        return c;
      })
    : config;
