# Réponses ED fabriquées

Réponses dont la **forme** vient de vraies réponses ED (essai du 16/11/2026, sauf `login-parent` et `doubleauth-post`, encore supposées) et dont **toutes les valeurs** sont inventées. Voir `docs/API-ED.md`.
Aucun nom, établissement ni identifiant réel. À remplacer par des réponses réelles anonymisées dès qu'il y en a.

## notes-eleve.json (fixture dorée du moteur de moyenne)
Forme d'une vraie réponse `notes.awp`, **toutes les notes inventées** (tirage aléatoire), noms, titres de devoirs, effectifs, rangs, statistiques de classe et dates de conseil remplacés. Les moyennes « officielles » ont été recalculées par un script indépendant du moteur (Python, `Decimal`) avec les règles vérifiées sur une classe réelle (`docs/API-ED.md`) ; le tirage est choisi pour que l'arrondi des sous-matières change le résultat (seule la variante `ed` tombe juste). La capture réelle anonymisée reste hors du dépôt (`fixtures/prive/`, ignoré par git) et sert au test de calibration réelle quand elle est présente.
