# Plan

- [x] **1. Squelette** — Expo, TS strict, lint, tests ; CI GitHub Actions ; mode démo.
  Fin : l'app démarre en web avec les données de démo et la CI est verte.
- [x] **2. Client ED** (validée le 16/11/2026 après essai réel sur Android) — connexion, double authentification ; multi-comptes, renouvellement de session ; tests sur réponses enregistrées.
  Fin : tests verts, puis essai réel sur téléphone via un APK construit en local.
- [x] **3. Moteur de moyenne** (validée le 16/11/2026 : calcul identique à ED sur téléphone), calibration et simulateur, entièrement testés.
  Fin : les fixtures dorées passent.
- [x] **4. Synchro et stockage** (validée le 17/11/2026 sur Android : base chiffrée, synchro, notification) — stockage chiffré ; synchro incrémentale ; notifications locales des nouvelles notes.
- [x] **5. Écrans** (validée le 17/11/2026 sur Android) notes, moyennes et simulateur, finition du design. Inclut le réglage de confidentialité des notifications (écran verrouillé : rien / « Nouvelle note » / détail ; défaut : rien).
- [x] **6. Autres données** (validée le 17/11/2026 sur Android, formats confirmés par une capture réelle) — emploi du temps, devoirs (coche « fait » comprise), vie scolaire.
- [x] **7. Messagerie et documents** (validée le 17/11/2026 sur Android, formats confirmés par une capture réelle). Lecture seule : messages reçus, pièces jointes, documents de l'élève ; accès depuis Vie scolaire, sans onglet de plus.
- [ ] **8. Stores** — icône et captures ; déclarations de confidentialité.
