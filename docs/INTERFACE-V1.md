# Interface v1 (gardée pour un éventuel retour)

Tag git `interface-v1` (commit `5d543ab`). APK : `../apks/ed-clone-interface-v1.zip`, hors du dépôt.
Remplacée par une refonte plus vivante à la demande de l'utilisateur (17/11/2026) ; avis : « pas mal, mais trop vide, trop clean ; le simulateur fait cockpit d'avion ».

## Grandes lignes
- **Direction** : taste-skill, app, style `achromatic-ledger` (graine 721322393). Chrome à l'encre, une seule teinte (#1d5fbf, #6ea2f0 en sombre) sur la moyenne prévue, petit signal ▲/▼ vert ou rouge là où un chiffre a bougé. Fond bleu-gris de cahier #f2f4f7 ; cartes blanches, filet 1 px, rayon 8, aucune ombre.
- **Type** : Geist embarquée (400, 500, 700). Titre 24, section 16, liste 14, petit 12 ; moyenne phare 40 en gras.
- **Signature** : la réglette 0–20 par matière (traits gris pour les notes, repère bleu pour la moyenne).
- **Mouvement** : aucun à l'entrée ; transitions natives de la pile, pression = un cran de ton.
- **Écrans** : Notes (moyenne prévue + écart + état face à ED, nouvelles notes, matières), détail de matière (notes, exclusions et leur raison, sous-matières), simulateur en modal (segments matière / barème / coef, avant → après, « quelle note pour atteindre »), réglages (écran verrouillé, compte, confidentialité), connexion et QCM.

## Pour y revenir
`git checkout interface-v1 -- app src/ui src/features` restaure les écrans et le design system de cette version sur la branche courante ; le moteur, la synchro et le stockage n'ont pas besoin de revenir en arrière.
