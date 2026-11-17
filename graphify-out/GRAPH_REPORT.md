# Graph Report - coef  (2026-11-17)

## Corpus Check
- 112 files · ~57,720 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .xml 1, .podspec 1)

## Summary
- 771 nodes · 2391 edges · 34 communities (33 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Écrans de détail
- Écran Notes et simulateur
- Réglages et notifications
- Onglets principaux
- Mapping ED et fixtures
- Client ED : connexion
- Dépendances Expo
- Config app.json
- Client ED : endpoints
- package.json
- Module natif notifications
- Connexion et capture
- Protocole EcoleDirecte
- Erreurs et double auth
- Moteur de moyenne et calibration
- Docs et règles du projet
- Fichiers et documents
- Layout racine et polices
- CI, release et signature
- Outils de dev
- Garde réseau et R8
- Design system
- Plan et données ED
- Stockage chiffré
- Config TypeScript
- Mapping des notes
- File HTTP
- Scripts npm
- Noms de matières
- Vie privée
- Allègement APK
- Config ESLint
- Config Jest
- Clé de signature

## God Nodes (most connected - your core abstractions)
1. `useCouleurs()` - 73 edges
2. `ErreurED` - 31 edges
3. `calculer()` - 31 edges
4. `Accueil()` - 27 edges
5. `react-native` - 27 edges
6. `jour()` - 25 edges
7. `moyenne()` - 22 edges
8. `Notes()` - 20 edges
9. `react` - 20 edges
10. `useDonnee()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `Mode demo (web toujours demo, src/demo)` --conceptually_related_to--> `Codes de reponse ED (200, 250, 505, 517, 520, 525)`  [AMBIGUOUS]
  CLAUDE.md → docs/API-ED.md
- `Recette APK local sous Windows (worktree court)` --semantically_similar_to--> `Un APK par architecture (arm64, armv7, x86_64)`  [INFERRED] [semantically similar]
  docs/REPRISE.md → .github/workflows/release.yml
- `IconeSimulation()` --calls--> `useCouleurs()`  [EXTRACTED]
  app/(onglets)/notes.tsx → src/ui/theme.ts
- `BandeauSimulation()` --calls--> `useCouleurs()`  [EXTRACTED]
  app/(onglets)/notes.tsx → src/ui/theme.ts
- `Job apk (build, sign, publish)` --implements--> `typecheck + lint + test avant commit`  [INFERRED]
  .github/workflows/release.yml → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Garanties de vie privee sur l'appareil** — claude_vie_privee_totale, src_api_http, claude_secure_store_jetons, claude_sqlite_chiffree, claude_tout_effacer, docs_dependances_notifications_locales_module [INFERRED 0.85]
- **Flux de connexion ED (GTK, login, QCM, cn/cv, reconnexion)** — docs_api_ed_gtk, docs_api_ed_login, docs_api_ed_double_auth_qcm, docs_api_ed_cn_cv, docs_api_ed_reconnexion_access_token [EXTRACTED 1.00]
- **Chaine de calcul et verification des moyennes** — docs_api_ed_notes_awp, docs_api_ed_regles_calcul, src_domain_moyennes, claude_calibration, fixtures_ed_notes_eleve [INFERRED 0.85]

## Communities (34 total, 1 thin omitted)

### Community 0 - "Écrans de détail"
Cohesion: 0.06
Nodes (97): QCM, styles, Evenements(), RAISON, styles, RAISON, styles, styles (+89 more)

### Community 1 - "Écran Notes et simulateur"
Cohesion: 0.05
Nodes (87): DetailMatiere(), LigneNote(), DetailNote(), Stat(), Frise(), minutes(), Affichage, AUCUNE (+79 more)

### Community 2 - "Réglages et notifications"
Cohesion: 0.05
Nodes (73): Reglages(), choisir(), confirmerEffacement(), effacer(), simulerNouvelleNote(), afficher(), demanderAutorisation(), EcranVerrouille (+65 more)

### Community 3 - "Onglets principaux"
Cohesion: 0.12
Nodes (45): DetailDevoir(), Documents(), DetailMessage(), Messages(), Agenda(), styles, Devoirs(), Accueil() (+37 more)

### Community 4 - "Mapping ED et fixtures"
Cohesion: 0.13
Nodes (30): fixtures_ed_cahierdetexte, fixtures_ed_cahierdetexte_jour, fixtures_ed_documents, fixtures_ed_emploidutemps, fixtures_ed_message, fixtures_ed_messages, fixtures_ed_viescolaire, CATEGORIES (+22 more)

### Community 5 - "Client ED : connexion"
Cohesion: 0.08
Nodes (26): zod, Acces, API, CleAppareil, CODE, enteteGTK, Reponse, ResultatConnexion (+18 more)

### Community 6 - "Dépendances Expo"
Cohesion: 0.07
Nodes (27): dependencies, expo, expo-background-task, expo-constants, expo-crypto, expo-file-system, expo-font, @expo-google-fonts/geist (+19 more)

### Community 7 - "Config app.json"
Cohesion: 0.08
Nodes (25): backgroundColor, foregroundImage, monochromeImage, adaptiveIcon, allowBackup, blockedPermissions, package, permissions (+17 more)

### Community 8 - "Client ED : endpoints"
Cohesion: 0.21
Nodes (11): appel(), ClientED, connexion(), ouvrirSession(), preparerGTK(), reconnexion(), repondreQCM(), valider() (+3 more)

### Community 9 - "package.json"
Cohesion: 0.09
Nodes (22): license, main, name, private, version, eslint, eslint-config-expo, expo-constants (+14 more)

### Community 10 - "Module natif notifications"
Cohesion: 0.12
Nodes (14): Context, ExpoModulesCore, Module, ModuleDefinition, Module, NotificationsLocalesModule, NotificationsLocalesModule, notificationchannel (+6 more)

### Community 11 - "Connexion et capture"
Cohesion: 0.20
Nodes (15): Connexion(), lancer(), expo-file-system, expo-sharing, decoderBase64(), encoderBase64(), anonymiser(), Capture (+7 more)

### Community 12 - "Protocole EcoleDirecte"
Cohesion: 0.13
Nodes (18): Aucune copie de code GPL (reecriture du protocole), blocksdirecte, hacf-fr/ecoledirecte_api (Python), Papillon (reference parcours ED), cn/cv de double auth, Codes de reponse ED (200, 250, 505, 517, 520, 525), Double auth QCM (doubleauth.awp, base64, 2fa-token), Jeton GTK prealable (cookie GTK -> X-Gtk) (+10 more)

### Community 13 - "Erreurs et double auth"
Cohesion: 0.12
Nodes (12): fixtures_ed_doubleauth_get, fixtures_ed_doubleauth_post, fixtures_ed_login_parent, fixtures_ed_login_qcm, Session, MESSAGES, TypeErreurED, IDS (+4 more)

### Community 14 - "Moteur de moyenne et calibration"
Cohesion: 0.24
Nodes (13): Aucune donnee reelle dans le depot, Calibration contre moyennes officielles ED, Tests de proprietes fast-check, Instantane dateCalcul (calcul nocturne), notes.awp (periodes, notes, parametrage), parametrage d'etablissement (drapeaux de calcul), Regles de calcul verifiees (0 ecart), Matiere = moyenne des sous-matieres arrondies (+5 more)

### Community 15 - "Docs et règles du projet"
Cohesion: 0.23
Nodes (12): CLAUDE.md regles du projet, Builds sans EAS (APK local + workflow release), Validation Zod de chaque reponse ED, API EcoleDirecte : comportements et hypotheses, Statuts confirme / suppose / inconnu, Dependances justifiees, expo-background-task (WorkManager), Zustand au-dessus de la base (+4 more)

### Community 16 - "Fichiers et documents"
Cohesion: 0.29
Nodes (9): Fichier, dossier(), effacerFichiers(), EXTENSIONS, nomFichier(), ouvrirFichier(), typeAnnonce(), typeDe() (+1 more)

### Community 17 - "Layout racine et polices"
Cohesion: 0.22
Nodes (9): RootLayout(), effacer(), expo-font, ref_expo_google_fonts_geist_400regular, ref_expo_google_fonts_geist_500medium, ref_expo_google_fonts_geist_600semibold, ref_expo_google_fonts_geist_700bold, expo-status-bar (+1 more)

### Community 18 - "CI, release et signature"
Cohesion: 0.20
Nodes (10): typecheck + lint + test avant commit, Continuous Native Generation (pas d'ios/android a la main), Mode demo (web toujours demo, src/demo), Etape 1 : Squelette, CI workflow, Job verifs (typecheck, lint, test), Job apk (build, sign, publish), Re-signature APK avec la cle de Coef (+2 more)

### Community 19 - "Outils de dev"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-expo, fast-check, jest, jest-expo, @types/jest, @types/node (+2 more)

### Community 20 - "Garde réseau et R8"
Cohesion: 0.22
Nodes (8): fs, path, { withDangerousMod }, ref_fs, ref_path, fichiers(), INTERDITS, RACINE

### Community 21 - "Design system"
Cohesion: 0.25
Nodes (9): Design system maison (src/ui), Direction taste-skill, Police Geist embarquee, Interface v1 (archivee), Style achromatic-ledger, Reglette 0-20 par matiere, Tag git interface-v1, Piege animation entering (+1 more)

### Community 22 - "Plan et données ED"
Cohesion: 0.22
Nodes (9): Etapes validees une a une, Simulateur de notes hypothetiques, cahierdetexte.awp (devoirs, coche fait), emploidutemps.awp (suppose), viescolaire.awp, Plan en 8 etapes, Etape 5 : Ecrans, Etape 6 : Autres donnees (+1 more)

### Community 23 - "Stockage chiffré"
Cohesion: 0.28
Nodes (9): Jetons et cles dans SecureStore uniquement, SQLite chiffree (SQLCipher), Bouton Tout effacer, Compte parent multi-enfants (hypothese), elevesDocuments.awp, messages.awp (lecture seule), telechargement.awp, Etape 7 : Messagerie et documents (+1 more)

### Community 24 - "Config TypeScript"
Cohesion: 0.22
Nodes (8): expo/tsconfig.base, compilerOptions, noUncheckedIndexedAccess, paths, strict, types, extends, include

### Community 25 - "Mapping des notes"
Cohesion: 0.31
Nodes (8): nombre(), requis(), stats(), typePeriode(), versDonneesNotes(), donneesNotes, lire(), REELLE

### Community 26 - "File HTTP"
Cohesion: 0.42
Nodes (6): enAttente, ErreurReseau, HOTES_AUTORISES, requete(), suivante(), verifierHote()

### Community 27 - "Scripts npm"
Cohesion: 0.25
Nodes (8): scripts, android, ios, lint, start, test, typecheck, web

### Community 28 - "Noms de matières"
Cohesion: 0.43
Nodes (5): cle(), CONNUS, MOTS, nomMatiere(), RETIRES

### Community 29 - "Vie privée"
Cohesion: 0.33
Nodes (6): Aucun SDK tiers de collecte, Notifications locales sans jeton push, Vie privee totale (aucun serveur, aucun tiers), expo-notifications ecarte, Module maison modules/notifications-locales, Etape 4 : Synchro et stockage

### Community 30 - "Allègement APK"
Cohesion: 0.40
Nodes (5): Recette APK local sous Windows (worktree court), Un APK par architecture (arm64, armv7, x86_64), REGLAGES, { withAppBuildGradle, withGradleProperties }, ref_expo_config_plugins

### Community 31 - "Config ESLint"
Cohesion: 0.40
Nodes (4): { defineConfig }, expoConfig, ref_eslint_config, ref_eslint_config_expo_flat

### Community 32 - "Config Jest"
Cohesion: 0.67
Nodes (3): jest, preset, testPathIgnorePatterns

## Ambiguous Edges - Review These
- `Mode demo (web toujours demo, src/demo)` → `Codes de reponse ED (200, 250, 505, 517, 520, 525)`  [AMBIGUOUS]
  CLAUDE.md · relation: conceptually_related_to

## Knowledge Gaps
- **217 isolated node(s):** `name`, `slug`, `scheme`, `version`, `orientation` (+212 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 256 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Mode demo (web toujours demo, src/demo)` and `Codes de reponse ED (200, 250, 505, 517, 520, 525)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Reprise de session` connect `Docs et règles du projet` to `Écrans de détail`, `Mapping ED et fixtures`, `Client ED : connexion`, `Protocole EcoleDirecte`, `Fichiers et documents`, `Plan et données ED`, `File HTTP`, `Vie privée`, `Allègement APK`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Dépendances Expo` to `package.json`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `zod` connect `Client ED : connexion` to `package.json`, `Réglages et notifications`, `Mapping ED et fixtures`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Accueil()` (e.g. with `coursDemo()` and `devoirsDemo()`) actually correct?**
  _`Accueil()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `slug`, `scheme` to the rest of the system?**
  _217 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Écrans de détail` be split into smaller, more focused modules?**
  _Cohesion score 0.06316094451687672 - nodes in this community are weakly interconnected._