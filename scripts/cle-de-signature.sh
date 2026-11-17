#!/usr/bin/env bash
# Crée la clé de signature des APK publiés (une seule fois) et la confie aux secrets GitHub du dépôt.
# Usage : bash scripts/cle-de-signature.sh [dossier hors du dépôt]   (défaut : ../signature)
# La clé ne va jamais dans le dépôt. Si elle est perdue, plus aucune mise à jour ne s'installe par-dessus.
set -euo pipefail
DOSSIER="${1:-../signature}"
KEYTOOL="${KEYTOOL:-keytool}"
command -v "$KEYTOOL" >/dev/null || KEYTOOL="/c/Program Files/Android/Android Studio/jbr/bin/keytool"

mkdir -p "$DOSSIER"
JKS="$DOSSIER/coef-release.jks"
[ -e "$JKS" ] && { echo "$JKS existe déjà : rien à faire."; exit 1; }

MDP=$(node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))")
"$KEYTOOL" -genkeypair -keystore "$JKS" -storetype PKCS12 -alias coef -keyalg RSA -keysize 4096 -validity 36500 \
  -dname "CN=Coef" -storepass "$MDP" -keypass "$MDP" >/dev/null
printf '%s' "$MDP" > "$DOSSIER/mot-de-passe.txt"

base64 -w0 "$JKS" | gh secret set COEF_KEYSTORE
printf '%s' "$MDP" | gh secret set COEF_KEYSTORE_PASS
echo "Clé créée dans $DOSSIER et rangée dans les secrets GitHub. Sauvegarde ce dossier hors de ce PC."
