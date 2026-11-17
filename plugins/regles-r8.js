// Règles R8 ajoutées à android/app/proguard-rules.pro au prebuild (CNG : jamais d'édition à la main).
// WorkManager (via expo-background-task) instancie sa base Room par réflexion : R8 retirait le constructeur
// de WorkDatabase_Impl et l'app plantait au démarrage en release.
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const REGLES = `
# Coef : bases Room (WorkManager) créées par réflexion
-keep class * extends androidx.room.RoomDatabase { <init>(); }
`;

module.exports = (config) =>
  withDangerousMod(config, [
    'android',
    (c) => {
      const fichier = path.join(c.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
      const actuel = fs.readFileSync(fichier, 'utf8');
      if (!actuel.includes('Coef : bases Room')) fs.writeFileSync(fichier, actuel + REGLES);
      return c;
    },
  ]);
