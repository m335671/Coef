# ED-Clone

Client mobile alternatif (Android, iOS) pour EcoleDirecte. Non officiel, non affilié à EcoleDirecte ni à Aplim.

## Objectifs, par priorité
1. **Prévoir la moyenne** sur l'appareil dès qu'une note arrive (matière, sous-matière, générale), au plus près du calcul officiel. Juste avant d'être beau.
2. **Vie privée totale** : tout reste sur l'appareil, aucun serveur à nous, aucun tiers. Seules requêtes réseau : EcoleDirecte.
3. **La plus belle app scolaire**, fluide et légère.

Références : Papillon (parcours ED, pièges de l'API ; ne pas reprendre son architecture), Moyennes ED (référence fonctionnelle du simulateur).

## Règles non négociables
- **Aucun SDK tiers de collecte** : ni analytics, crash reporting, pub, A/B, Firebase, Sentry, Expo Updates (OTA), ni police/image depuis un CDN.
- Notifications **locales** uniquement, sans jeton push.
- **Réseau** : tout passe par `src/api/http.ts`, liste blanche des domaines ED. Test (`tests/reseau.test.ts`) et lint échouent si `fetch(` ou un client HTTP apparaît ailleurs.
- Identifiants et jetons dans `expo-secure-store` seulement, jamais dans SQLite, AsyncStorage, logs ou messages d'erreur. Le mot de passe n'est jamais stocké : « rester connecté » garde l'`accessToken` de reconnexion (parcours mobile, voir `docs/API-ED.md`).
- Données scolaires en **SQLite chiffrée** (expo-sqlite + SQLCipher), clé générée sur l'appareil, rangée dans SecureStore.
- Android `allowBackup=false` ; iOS `PrivacyInfo.xcprivacy` exact.
- Bouton « Tout effacer » : base, clés, jetons.
- **Aucune donnée réelle dans le dépôt** : fixtures fabriquées ou anonymisées. Relire chaque diff avant commit.
- TypeScript `strict`, pas d'`any` non justifié. Chaque réponse ED validée par un schéma Zod : réponse inattendue = erreur claire, jamais crash ni moyenne fausse silencieuse.
- Avant chaque commit : `npm run typecheck`, `npm run lint`, `npm test`. Commits petits, en français, Conventional Commits, chacun avec le trailer `Co-Authored-By: m335671 <110462702+m335671@users.noreply.github.com>`.
- Chaque dépendance justifiée dans `docs/DEPENDANCES.md`. Pas de kit UI complet : design system maison.
- Perf : démarrage à froid rapide, FlashList, animations Reanimated sur le thread UI.

## Stack
Expo SDK 58 (nouvelle architecture), TypeScript, expo-router (routes dans `app/`). Reanimated, Gesture Handler, FlashList. expo-sqlite (SQLCipher), expo-secure-store, expo-local-authentication, expo-notifications (locales), expo-background-task. Zustand au-dessus de la base (source de vérité). Jest (jest-expo) + fast-check.
- Builds natifs : `npx eas-cli build` uniquement (pas de SDK Android ni Xcode ici). Profil `test` (APK interne) pour les essais sur téléphone.
- Web (`npx expo start --web`) : aperçu visuel en mode démo seulement (l'API ED refuse le navigateur, CORS). Le web est toujours en démo (`src/demo`). Sur mobile : `EXPO_PUBLIC_DEMO=1`.
- Toujours `npx expo install <paquet>` pour les modules Expo/RN. Ne jamais créer `ios/` ni `android/` à la main (CNG) : passer par `app.json` et des config plugins.
- Une brique pose problème : expliquer et proposer une alternative avant de changer.

## Architecture
```
app/                  routes expo-router
src/api/ecoledirecte/ client ED : http, auth, double auth, endpoints, schémas, mapping
src/domain/           types métier indépendants d'ED
src/domain/moyennes/  moteur de calcul pur, sans React Native : le cœur testé
src/storage/          SQLite chiffrée, migrations, dépôts
src/sync/             synchro incrémentale, nouvelles notes, notifications locales
src/features/         écrans par domaine
src/ui/               design system maison
fixtures/             réponses ED anonymisées (démo, tests)
```
Seul `api/ecoledirecte/mapping` connaît le format ED.

## Client EcoleDirecte
API privée : s'appuyer sur blocksdirecte (utilisé par Papillon), Papillon, hacf-fr/ecoledirecte_api (Python), docs communautaires (EduWireApps), pydirecte, versions récentes. Points à vérifier : GTK avant login, `X-Token` renouvelé à chaque réponse, double auth QCM base64 avec en-tête dédié, `cn`/`cv` à conserver, paramètre `v=`. Gérer mauvais identifiants, QCM, parent multi-enfants, session expirée (reconnexion silencieuse). Cache d'abord, pas de rafales, erreurs typées.
**Licence** : décision prise, **aucune copie** de code (Papillon et Pawdirecte sont GPL-3.0) : réécrire depuis la compréhension du protocole.
Tout comportement découvert ou supposé va dans `docs/API-ED.md`. Incertain : écrire l'hypothèse, la rendre facile à corriger, la signaler.

## Moteur de moyenne (priorité absolue)
Fonction pure : notes + structure des matières + paramétrage ED → moyennes par matière, sous-matière, groupe, générale, avec le détail.
- Valeurs françaises (`12,5`), ramenées sur 20. Coefficients 0 et décimaux.
- Exclure non significatives, lettres, mentions (Abs, Disp, NE, EA…).
- Sous-matières, matières regroupées, coef de matière, matières sans note exclues.
- Respecter les drapeaux du paramétrage d'établissement plutôt que supposer.
- Précision complète, arrondi à l'affichage seulement.
- **Calibration** : comparer aux moyennes officielles ED, stocker l'écart, « calcul vérifié » si nul ; proposer une variante (liste fermée et documentée) si elle colle mieux. Toujours étiqueter « prévue » ou « officielle ED ».
- **Simulateur** : notes hypothétiques, impact instantané, « quelle note pour atteindre X ? ».
- Tests : fixtures dorées, cas limites par règle, propriétés fast-check (permutation, coef 0, note = moyenne, monotonie), couverture de branches ≈ 100 %.

## Design
Direction via le plugin taste-skill (`design-taste-frontend`, partie écrans d'app), traduite en design system RN maison (tokens clair/sombre, typo, espacements, rayons, durées). Vérifier avec l'inspecteur taste-skill sur l'aperçu web démo à 390 px (Chromium : `/usr/local/bin/chromium`). Polices libres embarquées. Aucun logo ni élément graphique ED/Aplim ; mention « client non officiel, non affilié à EcoleDirecte ». Écran des notes = vitrine (moyenne générale prévue en grand + écart depuis la dernière synchro, nouvelles notes, détail par matière, transitions fluides). Accessibilité : AA, taille de police système, lecteurs d'écran.

## Méthode
Étapes dans `docs/PLAN.md`, dans l'ordre. À la fin de chacune : résumer le fait et l'incertain sur l'API, puis **attendre la validation** avant la suivante.
