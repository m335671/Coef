# Reprise de session

État au 16 novembre 2026, branche `claude/sleepy-pasteur-aayww4`. Les règles du projet sont dans `CLAUDE.md` ; ce fichier ne dit que **où on en est**.

## Où on en est
- **Étape 1 (squelette)** : validée. Expo SDK 58, TS strict, lint, Jest, CI GitHub Actions verte, mode démo web.
- **Étape 2 (client ED)** : code et 34 tests faits, CI verte. **Reste : l'essai réel**, puis la validation de l'utilisateur. Ne pas commencer l'étape 3 avant.
- Décision : **aucune copie** de code GPL (Papillon, Pawdirecte) : on réécrit à partir du protocole.
- Décision : le mot de passe n'est **jamais** stocké ; « rester connecté » garde l'`accessToken` de reconnexion dans SecureStore.
- L'historique de la branche a été réécrit une fois (ajout du co-auteur) : repartir de `origin`, pas d'une ancienne copie.

## Fichiers clés de l'étape 2
- `src/api/http.ts` : seule sortie réseau, liste blanche `api.ecoledirecte.com`, une requête à la fois.
- `src/api/ecoledirecte/client.ts` : connexion, QCM, reconnexion silencieuse, `ClientED`. Constantes `API`, `VERSION_API` et `USER_AGENT` en haut du fichier.
- `src/api/ecoledirecte/{schemas,mapping,erreurs,base64}.ts`, `src/storage/secrets.ts`, `src/features/compte/store.ts`.
- `app/connexion.tsx`, `app/index.tsx` : écrans **bruts** pour l'essai (le design viendra à l'étape 5).
- `docs/API-ED.md` : tout le protocole supposé, avec ses hypothèses.
- `fixtures/ed/` : réponses **inventées**.

## Sources étudiées (lecture seule)
- `@blockshub/blocksdirecte` 0.0.10-alpha (npm, ISC) : la bibliothèque qu'utilise Papillon 8.6.2 ; parcours « app mobile ».
- `github.com/hacf-fr/ecoledirecte_api` (Python) : parcours « site web » avec jeton GTK.
- `LiterateInk/Pawdirecte` n'existe plus à cette adresse.

## Prochaine action : essai réel de l'étape 2
1. `npm ci`, puis `npm run typecheck && npm run lint && npm test` (34 tests attendus).
2. Faire tourner l'app sur un vrai appareil ou un émulateur :
   - **build EAS** : `npx eas-cli init` (une fois), puis `npx eas-cli build -p android --profile test` (APK interne) ;
   - **ou en local**, si l'utilisateur accepte d'installer le SDK Android ou Xcode sur cette machine : `npx expo run:android` ou `npx expo run:ios` dans un émulateur. Ne jamais commiter `android/` ni `ios/` (déjà dans `.gitignore`, CNG).
3. **C'est l'utilisateur qui tape ses identifiants dans l'app.** Ne jamais lui demander son mot de passe, ne jamais l'écrire dans un fichier, une commande, un log ou un prompt.
4. Scénarios à tester :
   - connexion ;
   - question de sécurité (QCM) ;
   - bouton « Notes de … » ;
   - fermer et rouvrir l'app (reconnexion sans mot de passe) ;
   - « Tout effacer » ;
   - compte parent s'il y en a un ;
   - mot de passe contenant `%`, `+` ou des accents, si possible.
5. Capturer de vraies réponses pour remplacer les fixtures inventées, **anonymisées avant tout commit** (noms, établissements, identifiants, jetons) : la connexion, et surtout `notes.awp`, indispensable à l'étape 3.
6. Mettre `docs/API-ED.md` à jour : passer chaque point vérifié de « supposé » à « confirmé ».

## En cas d'échec de l'essai
| Symptôme | Piste |
|---|---|
| Erreur « version d'API » (code 517) | Corriger `VERSION_API` dans `client.ts`. |
| Identifiants refusés alors qu'ils sont bons | Encodage du mot de passe (voir `docs/API-ED.md`), ou User-Agent. |
| Le parcours mobile ne fonctionne pas du tout | Passer au parcours web avec jeton GTK, décrit dans `docs/API-ED.md`. Demander à l'utilisateur avant de changer. |
| Compte parent sans enfants listés | Vérifier le chemin `profile.eleves` dans la vraie réponse. |

## Points ouverts pour plus tard
- **Étape 4** : `expo-notifications` embarque Firebase Messaging sur Android. Inspecter le manifeste fusionné d'un vrai build ; retirer les composants FCM par config plugin, sinon proposer une alternative purement locale.
- **Raccourcis notés dans le code** (`grep -rn "shortcut:" src app`) :
  - au démarrage, l'app reprend le premier compte enregistré ;
  - une panne réseau au démarrage renvoie vers l'écran de connexion.
- Pas encore de `LICENSE` : le choix de licence est libre, puisqu'on ne copie aucun code.
- Design (étape 5) : plugin taste-skill, déclaré dans `.claude/settings.json`. L'installer s'il manque :
  `claude plugin marketplace add Leonxlnx/taste-skill && claude plugin install taste-skill@taste-skill`.
