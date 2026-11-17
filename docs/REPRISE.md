# Reprise de session

Ce fichier dit **où on en est** ; les règles du projet sont dans `CLAUDE.md`, l'avancement dans `docs/PLAN.md`.

## Où on en est (17/11/2026)
- Étapes 1 à 7 validées sur Android (essais réels, formats ED confirmés par des captures). Reste l'étape 8 (stores). iOS écrit, jamais essayé.
- Écrans : onglets `app/(onglets)/` (Accueil, Notes, Agenda, Devoirs, Vie scolaire) ; messages, documents et réglages rangés dans Vie scolaire ; simulateur en modal (`app/simulateur.tsx`).
- Design system maison dans `src/ui/` (thème clair/sombre, composants, graphiques). Animations Reanimated, coupées si le système réduit les animations.
- Démarrage : l'app s'ouvre tout de suite sur le cache chiffré et se reconnecte en fond (`src/features/compte/store.ts`, `demarrer`).
- Réseau : `src/api/http.ts`, une requête à la fois, la plus récente servie d'abord (l'écran qu'on vient d'ouvrir passe devant).
- Notifications : module maison `modules/notifications-locales` (expo-notifications écarté : Firebase). Synchro en arrière-plan par WorkManager (expo-background-task), au plus une fois par heure.
- Captures réelles anonymisées : `fixtures/prive/`, **ignoré par git**, sur la machine de dev seulement. Le test de calibration réelle est sauté si le dossier est absent.

## Pièges connus
- `withExclusiveTransactionAsync` d'expo-sqlite ouvre une connexion sans la clé SQLCipher : ne pas l'utiliser.
- Android (Yoga) : pas de `flexWrap` avec des largeurs en % et `gap` (tuiles qui se chevauchent) ; des rangées explicites.
- Pas d'animation de mise en page (`entering`) sur des vues dont les voisines changent de taille : elles gardent leur ancienne position. `Entree` anime opacité et translation.
- ED envoie les documents en `application/octet-stream` : le type se lit dans les premiers octets (`src/features/vie/fichiers.ts`).

## Construire l'APK sous Windows
Les chemins CMake dépassent 260 caractères : `subst` ne suffit pas (Node résout les vrais chemins).
1. Worktree à chemin court : `git worktree add --detach C:/edw HEAD`, puis `npm ci` dedans.
2. `npx expo prebuild -p android --no-install` (annuler la modif de `package.json` qu'il fait). À refaire après chaque changement de config native (`app.json`, `plugins/`).
3. Dans `android/local.properties` : `sdk.dir=C:/Users/<toi>/AppData/Local/Android/Sdk` et `cmake.dir=C:/Users/<toi>/AppData/Local/Android/Sdk/cmake/3.31.6` (la 3.22.1 par défaut échoue).
4. `JAVA_HOME` = JBR d'Android Studio, `NODE_ENV=production` (et `EXPO_PUBLIC_CAPTURE=1` pour l'export de captures), puis
   `./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a`.
APK : `C:/edw/android/app/build/outputs/apk/release/app-release.apk` (clé de debug : essais seulement).

## En cas d'échec avec EcoleDirecte
| Symptôme | Piste |
|---|---|
| Erreur « version d'API » (code 517) | Corriger `VERSION_API` dans `src/api/ecoledirecte/client.ts`. |
| Identifiants refusés alors qu'ils sont bons | Encodage du mot de passe (voir `docs/API-ED.md`), ou User-Agent. |
| Réponse inattendue | Le schéma Zod la refuse avec une erreur claire : comparer à une capture (Réglages > Essai), corriger `schemas.ts` et `mapping.ts`. |

## Points ouverts
- Raccourcis assumés dans le code : `grep -rn "ponytail:\|shortcut:" src app`.
- Synchro en arrière-plan : le moment dépend d'Android (Doze), à surveiller.
- Design : plugin taste-skill, déclaré dans `.claude/settings.json`.
