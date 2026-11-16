# Dépendances

Chaque dépendance a sa justification. Pas de kit UI, pas de SDK de collecte.

## Exécution
| Paquet | Pourquoi |
|---|---|
| expo, react, react-native | Socle imposé (SDK 58, nouvelle architecture). |
| expo-router | Navigation par fichiers, imposée. |
| expo-constants, expo-linking | Dépendances requises par expo-router. |
| react-native-screens, react-native-safe-area-context | Navigation native et zones sûres, requises par expo-router. |
| expo-status-bar | Couleur de la barre d'état selon le thème. |
| expo-font | Polices libres embarquées (aucun CDN). |
| react-native-reanimated (+ react-native-worklets) | Animations sur le thread UI. |
| react-native-gesture-handler | Gestes natifs (simulateur, glisser). |
| @shopify/flash-list | Listes virtualisées. |
| react-dom, react-native-web | Aperçu web en mode démo uniquement. |
| zod | Validation de chaque réponse ED (API non officielle, change sans prévenir). |
| expo-secure-store | Jetons et clés d'appareil dans le trousseau (iOS) / Keystore (Android), jamais ailleurs. |
| expo-crypto | UUID d'appareil aléatoire généré localement (et, à l'étape 4, clé SQLCipher). |
| zustand | Stores légers au-dessus de la base, source de vérité. |
| expo-sqlite (SQLCipher activé) | Base locale chiffrée des données scolaires ; l'ouverture échoue si SQLCipher manque. |
| expo-background-task, expo-task-manager | Synchro périodique en arrière-plan (WorkManager / BGTaskScheduler), sans serveur. |
| expo-file-system, expo-sharing | Export de fichiers via le menu de partage du système (captures d'essai aujourd'hui, documents à l'étape 7). Aucun réseau. |

**Écarté : expo-notifications.** Il compile Firebase Messaging dans l'app (impossible à retirer, seulement à désactiver). Remplacé par le module maison `modules/notifications-locales` (Kotlin + Swift, notifications locales seulement, aucun SDK tiers).

## Développement
| Paquet | Pourquoi |
|---|---|
| typescript, @types/react, @types/node, @types/jest | Typage strict. |
| jest, jest-expo | Tests. |
| fast-check | Tests de propriétés du moteur de moyenne. |
| eslint, eslint-config-expo | Lint, dont l'interdiction de `fetch` hors `src/api/http.ts`. |
