<p align="center"><img src="assets/icon.png" width="96" alt=""></p>

# Coef

Une app Android (et iOS, pas encore essayée) pour suivre sa scolarité sur EcoleDirecte : notes, moyennes prévues, agenda, devoirs, vie scolaire.

**Client non officiel, non affilié à EcoleDirecte ni à Aplim.**

## Ce qu'elle fait de différent

- **Elle prévoit ta moyenne** dès qu'une note arrive, matière par matière et générale, avec le même calcul qu'EcoleDirecte. Elle compare avec la moyenne officielle et affiche « calcul vérifié » quand les deux sont identiques.
- **Un simulateur** : ajoute des notes hypothétiques, vois l'effet tout de suite, demande quelle note il faut pour atteindre ton objectif.
- **Tout reste sur ton téléphone.** Aucun serveur à nous, aucune statistique d'usage, aucune pub, aucun SDK tiers. La seule connexion réseau va vers EcoleDirecte. Les données sont dans une base chiffrée, le mot de passe n'est jamais enregistré, et un bouton efface tout.
- **Notifications de nouvelles notes** produites sur le téléphone, sans service push. Par défaut, rien ne s'affiche sur l'écran verrouillé.

## Installer

Les APK signés sont publiés dans les [releases](../../releases).

Pour recevoir les mises à jour automatiquement, ajoute ce dépôt dans [Obtainium](https://github.com/ImranR98/Obtainium) : « Ajouter une app », puis colle l'adresse du dépôt.

## Développer

```sh
npm ci
npm run typecheck && npm run lint && npm test
npx expo start --web   # aperçu en mode démo, avec des données inventées
```

- Les règles du projet sont dans [`CLAUDE.md`](CLAUDE.md).
- Ce qu'on sait du protocole EcoleDirecte est dans [`docs/API-ED.md`](docs/API-ED.md).
- La recette pour construire un APK en local est dans [`docs/REPRISE.md`](docs/REPRISE.md).

### Publier une version

```sh
git tag v0.2.0 && git push origin v0.2.0
```

Le workflow `release` construit l'APK, le signe et crée la release. Le versionCode est calculé à partir du numéro de version : `1.2.3` donne `10203`.

La clé de signature se crée une seule fois, avec `bash scripts/cle-de-signature.sh`. Elle reste hors du dépôt, dans les secrets GitHub.

## Licence

[GPL-3.0](LICENSE). Tu peux reprendre le code, à condition que les versions que tu publies restent libres, elles aussi.
