# API EcoleDirecte : comportements constatés et hypothèses

API privée, sans documentation officielle. Chaque point porte un statut :
**confirmé** (vu sur une réponse réelle), **supposé** (lu dans une implémentation de référence, pas encore vu par nous), **inconnu**.

Confirmé le 16 novembre 2026 avec un identifiant inventé (aucun compte réel) : voir « Constaté sans compte » ci-dessous. Le reste attend l'essai avec un vrai compte.

## Constaté sans compte — confirmé
- `POST /v3/login.awp?v=8.0.0`, corps `data=<JSON>`, User-Agent `… EDMOBILE v8.0.0` : accepté (pas de 517), depuis l'APK Android et depuis curl.
- Mauvais identifiants : **HTTP 200**, en-tête `x-code: 505`, corps `{"code":505,"token":"","message":"Identifiant et/ou mot de passe invalide !","data":{"changementMDP":false,"nbJourMdpExire":0,"accounts":[]}}` (`fixtures/ed/login-505.json`).
- `access-control-expose-headers` liste `X-Token`, `X-Code`, `2FA-Token`, `X-GTK` : cohérent avec les en-têtes supposés (indice, pas preuve qu'ils sont envoyés).
- Pas de cookie `Set-Cookie` sur cette réponse.

## Essai avec un vrai compte (16 novembre 2026, Android) — confirmé
- **Le jeton GTK est obligatoire, même en parcours mobile `v=8.0.0`.** Sans lui, un compte valide reçoit **505** (« Identifiant et/ou mot de passe invalide ! »), indiscernable de mauvais identifiants. Avec lui : 250.
  - `GET /v3/login.awp?gtk=1&v=8.0.0` : HTTP 200, corps vide, deux `set-cookie` (`GTK=…` et un second cookie au nom hexadécimal), `domain=ecoledirecte.com`.
  - On renvoie la valeur de `GTK` dans `X-Gtk` ; les cookies suivent via le client HTTP natif. React Native Android expose bien `set-cookie` à JS.
  - User-Agent utilisé : celui de blocksdirecte (`Mozilla/5.0 (iPhone; …) Mobile/15E148 EDMOBILE v8.0.0`). **Non isolé** : on ne sait pas si l'ancien (`ED-Clone EDMOBILE …`) passerait avec le GTK.
- Réponse 250 : `{"code":250,"token":"<non vide>","message":"Identifiant et/ou mot de passe invalide !","data":{"totp":false}}`, en-têtes `2fa-token` et `x-token`. **Le message est trompeur** : ne jamais l'afficher, se fier au code.
- `POST /v3/connexion/doubleauth.awp?verbe=get` avec `2fa-token` : 200, `data.question` + `data.propositions` (15 propositions), **`message: null`**, `host`, pas de `token`.
- Mot de passe contenant `:` : passe tel quel.
- `POST doubleauth.awp?verbe=post` `{ choix: base64 }` avec `2fa-token` : 200, `data: { cn, cv }`, `message: null`. Propositions et réponse bien en base64 UTF-8 (l'app les a affichées et la bonne réponse est passée).
- Login final (GTK redemandé, `cn`/`cv` + `fa`) : 200, `token` dans le corps et `x-token`, `message: ""`, `data.accounts[]`. Forme réelle (valeurs inventées) : `fixtures/ed/login-eleve.json`.
  - Compte élève : `typeCompte: "E"`, `main: true`, `accessToken` présent, `profile.classe.libelle`, `nomEtablissement` en double (compte et profil). **Pas** d'`anneeScolaireCourante`.
  - `modules[]` : `{ code, enable, ordre, badge, params }` (NOTES, EDT, CAHIER_DE_TEXTES, MESSAGERIE, VIE_SCOLAIRE…). Certains `params` contiennent des données personnelles (badge de cantine, e-mails).
  - `parametresIndividuels.is2FATOTPActif`, et `data.totp` dans la réponse 250 : une double auth TOTP existe ; non gérée (pas de cas réel).
- `POST /v3/eleves/<id>/notes.awp?verbe=get` `{ anneeScolaire: "" }` avec `X-Token` : 200, `token` renouvelé dans le corps et `x-token`. Début vu : `data.foStat`, `data.periodes[]` (`idPeriode`, `codePeriode` `A001`…, `periode`, `annuel`, `dateDebut`/`dateFin`, `cloture`, `ensembleMatieres` avec `moyenneGenerale` « 13,5 » à virgule, et aussi `moyenneClasse`, `moyenneMin`, `moyenneMax` de la générale (**confirmé** le 17/11/2026, lus dans `Periode.classeGenerale`), `disciplines[]` avec `codeMatiere`, `discipline`, `moyenne`, `coef` numérique, `groupeMatiere`, `idGroupeMatiere`, `sousMatiere`, `professeurs[]`). Matière sans note : `moyenne: ""`. Le reste (liste `notes`, paramétrage) attend la capture complète.
- **Reconnexion par `accessToken` : confirmée** (APK réinstallé, app rouverte) : GTK, puis `login.awp` `isReLogin: true` → 200 direct, sans mot de passe ni QCM.
- **Pas encore vu** : compte parent, durée de vie de l'`accessToken`, double auth TOTP.

## notes.awp — confirmé (capture complète, fixture `fixtures/ed/notes-eleve.json`)
`data` = `{ foStat, periodes[], notes[], parametrage }`.
- `periodes[]` : trimestres (`A001`…), relevés (`A001R001`…, dates propres, `cloture`), année (`A999Z`, `annuel: true`, sans champs de moyenne), examens blancs (`H000X001`, `examenBlanc: true`, tous coefs 1, ordre des matières différent). Moyennes en chaînes à virgule, `""` si absentes ; `coef` de matière numérique.
- Sous-matières : ligne parente (`codeSousMatiere: ""`) puis lignes `sousMatiere: true` (`codeSousMatiere` `ETT`, `SIN`), coef 1 chacune.
- `notes[]` : `valeur` (« 12,5 », « Abs  » avec espace), `noteSur` (« 10 », « 20 »), `coef` **avec point** (« 0.5 », « 1.5 »), `moyenneClasse` **avec point** aussi, `enLettre`, `nonSignificatif`, `valeurisee`, `date`, `dateSaisie`. **Toutes les notes portent `codePeriode: "A001"`, même celles des relevés** : rattacher aux relevés par `date`.
- `parametrage` : drapeaux d'affichage et de calcul (`moyenneCoefMatiere`, `moyennePeriodeReleve`, `moyenneSur: 20`, `coefficientNote`…), libellés de compétences en base64.

### Règles de calcul vérifiées sur une classe réelle (22 moyennes de matière, 3 générales, 0 écart)
1. Note ramenée sur 20, moyenne pondérée par `coef` de la note ; « Abs » exclue.
2. **Instantané** : les moyennes ED datent de `ensembleMatieres.dateCalcul` (calcul nocturne). Les notes saisies après n'y sont pas. Comparer avec les seules notes saisies avant.
3. Arrondi au centième **demi vers le haut** (16,125 → 16,13).
4. **Matière à sous-matières = moyenne des moyennes de sous-matières arrondies**, pondérées par leur coef (15,5 et 16,13 → 15,82 ; sans arrondi 15,81). Hypothèse appuyée par un seul cas discriminant.
5. Générale = Σ(moyenne de matière × coef de matière) / Σ coefs, sous-matières non comptées à part, matières sans note exclues.

## Sources (lues en novembre 2026, aucun code copié)
- `@blockshub/blocksdirecte` 0.0.10-alpha (ISC), utilisé par Papillon 8.6.2 (GPL-3.0) : parcours « application mobile ».
- `hacf-fr/ecoledirecte_api` (Python, intégration Home Assistant, novembre 2026) : parcours « site web ».
- `LiterateInk/Pawdirecte` n'est plus accessible à son adresse d'origine.

## Deux parcours de connexion
| | Application mobile (retenu) | Site web |
|---|---|---|
| Jeton GTK préalable (`GET login.awp?gtk=1`, cookie `GTK` → en-tête `X-Gtk`) | **oui (confirmé, contrairement à blocksdirecte)** | oui |
| `v=` | `8.0.0` | `4.104.3` |
| User-Agent | contient `EDMOBILE v8.0.0` | navigateur |
| Reconnexion sans mot de passe | oui (`accessToken`) | non (mot de passe stocké) |

Choix : parcours mobile, car il évite de stocker le mot de passe (meilleur pour la vie privée) et c'est celui de Papillon en production.
**Si l'essai réel échoue**, le parcours web avec GTK est l'alternative documentée ci-dessus.

Constantes à corriger en un seul endroit : `src/api/ecoledirecte/client.ts` (`API`, `VERSION_API`, `USER_AGENT`).

## Format des requêtes — supposé
- `POST https://api.ecoledirecte.com/v3/<chemin>.awp?verbe=<get|post|put>&v=<version>`.
- Corps `application/x-www-form-urlencoded` : `data=<JSON encodé en URL>`.
- Authentification : en-tête `X-Token`. Le jeton est renouvelé dans chaque réponse (en-tête `x-token`, sinon champ `token` du corps).
- **Hypothèse à tester** : mot de passe avec `%`, `+` ou accents. On l'envoie tel quel dans le JSON (comme blocksdirecte) ; la lib Python le pré-encode en URL (comme le site web). Si la connexion échoue avec un tel mot de passe, c'est ce point.
- **Hypothèse** : les cookies ne sont pas nécessaires sur le parcours mobile. On laisse le comportement par défaut du fetch natif.

## Codes de réponse (champ `code`) — supposé
| Code | Sens | Erreur typée |
|---|---|---|
| 200 | OK | — |
| 210 | OK, pas de données | — |
| 250 | Double authentification requise | étape QCM |
| 505 | Identifiants invalides (**confirmé** ; mauvaise réponse au QCM : supposé) | `identifiants` / `qcm-echoue` |
| 517 | Version d'API (`v=`) refusée | `version-api` |
| 520 | Jeton invalide | reconnexion silencieuse, sinon `session-expiree` |
| 525 | Jeton expiré | idem |
| autre | inconnu | `serveur` |

## Connexion — supposé
`POST /v3/login.awp` avec `{ identifiant, motdepasse, isReLogin: false, sesouvenirdemoi: true, uuid }`.
- `uuid` : identifiant d'appareil, généré une fois et gardé dans SecureStore.
- Réponse 200 : `data.accounts[]`. Chaque compte a `idLogin`, `id`, `typeCompte`, `prenom`, `nom`, `nomEtablissement`, `accessToken`, `main`, `profile`.
- `typeCompte` : `E` élève, `1` ou `2` famille, `A` personnel, `P` enseignant.
- **Hypothèse** : un compte famille liste ses enfants dans `profile.eleves[]` (`id`, `prenom`, `nom`, `classe.libelle`), et leurs données se lisent via `/eleves/<idEnfant>/…` avec le jeton du parent.
- **Hypothèse** : un parent lié à plusieurs établissements a besoin de `POST /v3/renewtoken.awp?verbe=post` `{ idUser, uuid: "" }` pour changer de contexte (vu dans la lib Python). Non implémenté tant qu'on n'a pas de cas réel.

## Double authentification (QCM) — supposé
1. `login.awp` répond `code: 250` avec l'en-tête `2fa-token`.
2. `POST /v3/connexion/doubleauth.awp?verbe=get` `{}` avec l'en-tête `2fa-token` → `data.question` et `data.propositions[]`, en base64 UTF-8.
3. `POST /v3/connexion/doubleauth.awp?verbe=post` `{ choix: base64(réponse) }` avec l'en-tête `2fa-token` → `data.cn`, `data.cv`.
4. Nouveau `login.awp` avec `cn`, `cv` et `fa: [{ cn, cv }]` (on envoie les deux formes, chaque référence n'en envoie qu'une).
- `cn`/`cv` sont gardés dans SecureStore pour ne pas redemander le QCM.

## Reconnexion silencieuse — supposé
`POST /v3/login.awp` avec `{ identifiant, uuid, isReLogin: true, motdepasse: "???", typeCompte, accesstoken, fa: [{ cn, cv }] }`.
- Répond comme une connexion, avec un **nouvel** `accessToken`. L'ancien ne sert qu'une fois : le nouveau est sauvegardé aussitôt, et une seule reconnexion tourne à la fois.
- **Inconnu** : durée de vie de l'`accessToken`. S'il expire, l'app redemande le mot de passe.
- **Hypothèse** : Papillon envoie toujours `typeCompte: "E"`. Nous envoyons le vrai type du compte (`1` pour un parent).

## Notes — supposé
`POST /v3/eleves/<id>/notes.awp?verbe=get` `{ anneeScolaire: "" }`. Format à documenter à l'étape 3.

## Étape 6 : emploi du temps, devoirs, vie scolaire — SUPPOSÉ (rien vu sur une vraie réponse)
Écrit d'après les implémentations communautaires. Fixtures **fabriquées** dans ce format : `fixtures/ed/emploidutemps.json`, `cahierdetexte.json`, `cahierdetexte-jour.json`, `viescolaire.json`. La capture d'essai enregistre les vraies réponses (anonymisées) : les comparer avant de passer en « confirmé ».
- **Emploi du temps** : `POST /v3/E/<id>/emploidutemps.awp?verbe=get` `{ dateDebut, dateFin, avecTrous: false }` (AAAA-MM-JJ) → `data` = tableau de cours `{ id, text, matiere, codeMatiere, typeCours, start_date "AAAA-MM-JJ HH:MM", end_date, salle, prof, isAnnule, isModifie, … }`. **Incertain** : le chemin commence par `/E/` (et non `/eleves/`) ; heures locales sans fuseau.
- **Devoirs à faire** : `POST /v3/Eleves/<id>/cahierdetexte.awp?verbe=get` `{}` → `data` = objet `{ "AAAA-MM-JJ": [ { idDevoir, matiere, codeMatiere, donneLe, effectue, interrogation, … } ] }`.
- **Détail d'un jour** : `POST /v3/Eleves/<id>/cahierdetexte/<AAAA-MM-JJ>.awp?verbe=get` `{}` → `data` = `{ date, matieres: [ { matiere, codeMatiere, nomProf, aFaire: { idDevoir, contenu (HTML en base64), effectue, documents: [ { libelle, … } ], … }, contenuDeSeance: { contenu (HTML en base64) }, … } ] }`. L'écran de détail d'un devoir montre consigne, contenu de séance, professeur et noms des pièces jointes. **Confirmé (capture réelle)** : la liste contient aussi les jours passés (environ deux semaines). L'app charge donc le détail des 7 prochains jours à partir d'aujourd'hui, une requête à la fois.
- **Vie scolaire** : `POST /v3/eleves/<id>/viescolaire.awp?verbe=get` `{}` → `data` = `{ absencesRetards: [...], sanctionsEncouragements: [...], dispenses: [...] }`, chaque élément `{ id, typeElement ("Absence", "Retard", "Punition", "Sanction", "Encouragement"…), date, displayDate, libelle, motif, justifie, par, commentaire }`.
- **Cocher un devoir comme fait** (fait le 17/11/2026, **supposé**) : `POST /v3/Eleves/<id>/cahierdetexte.awp?verbe=put` `{ idDevoirsEffectues: [nombres], idDevoirsNonEffectues: [nombres] }`. Première écriture vers ED : l'app coche tout de suite, envoie, et remet comme avant si ED refuse (message à l'écran). À vérifier sur un vrai compte : la coche doit se retrouver dans ED après rechargement.
- Capture : `contenu`, `motif`, `commentaire`, `par`, `prof` sont masqués (texte libre ou noms).
