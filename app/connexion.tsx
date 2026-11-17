// Connexion EcoleDirecte et question de sécurité (double authentification).
import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { CAPTURE } from '@/api/ecoledirecte/capture';
import { type CleAppareil, connexion, repondreQCM } from '@/api/ecoledirecte/client';
import { exporterCaptures, messageErreur } from '@/features/compte/essai';
import { useCompte } from '@/features/compte/store';
import { diagnosticBase } from '@/storage/base';
import { uuidAppareil } from '@/storage/secrets';
import { Bouton, Champ, Ecran, EnTete, Ligne, Panneau, Section, Texte } from '@/ui/composants';
import { espace, useCouleurs } from '@/ui/theme';

type QCM = { jeton2fa: string; question: string; propositions: string[] };

export default function Connexion() {
  const c = useCouleurs();
  const ouvrir = useCompte((s) => s.ouvrir);
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [resterConnecte, setResterConnecte] = useState(true);
  const [qcm, setQcm] = useState<QCM>();
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');

  async function lancer(action: () => Promise<void>) {
    setOccupe(true);
    setErreur('');
    try {
      await action();
    } catch (e) {
      setErreur(messageErreur(e, 'connexion'));
    } finally {
      setOccupe(false);
    }
  }

  const seConnecter = (appareil?: CleAppareil) =>
    lancer(async () => {
      const r = await connexion({ identifiant: identifiant.trim(), motDePasse, uuid: await uuidAppareil(), appareil });
      if (r.etape === 'qcm') return setQcm(r);
      setMotDePasse(''); // le mot de passe ne survit pas à la connexion
      await ouvrir(r.session, resterConnecte);
      router.replace('/');
    });

  const repondre = (choix: string) =>
    lancer(async () => {
      const appareil = await repondreQCM(qcm!.jeton2fa, choix);
      setQcm(undefined);
      await seConnecter(appareil);
    });

  const message = erreur ? (
    <Texte accessibilityLiveRegion="polite" style={{ color: c.negatif }}>
      {erreur}
    </Texte>
  ) : null;

  if (qcm) {
    return (
      <Ecran>
        <EnTete titre="Question de sécurité" />
        <Texte>{qcm.question}</Texte>
        <Texte variante="liste" attenue>
          EcoleDirecte la pose une fois par appareil. Coef garde ensuite la clé de cet appareil.
        </Texte>
        {message}
        <Panneau>
          {qcm.propositions.map((p, i) => (
            <Ligne key={p} dernier={i === qcm.propositions.length - 1} onPress={occupe ? undefined : () => repondre(p)}>
              <Texte variante="liste">{p}</Texte>
            </Ligne>
          ))}
        </Panneau>
      </Ecran>
    );
  }

  return (
    <Ecran>
      <EnTete titre="Connexion" />
      <Texte variante="liste" attenue>
        Avec tes identifiants EcoleDirecte.
      </Texte>
      <View style={{ gap: espace.l }}>
        <Champ
          libelle="Identifiant"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          value={identifiant}
          onChangeText={setIdentifiant}
        />
        <Champ
          libelle="Mot de passe"
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          value={motDePasse}
          onChangeText={setMotDePasse}
          onSubmitEditing={() => identifiant && motDePasse && seConnecter()}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: espace.m }}>
          <View style={{ flex: 1 }}>
            <Texte variante="liste" moyen>
              Rester connecté
            </Texte>
            <Texte variante="petit" attenue>
              Garde une clé de reconnexion sur ce téléphone, jamais ton mot de passe. Nécessaire aux notifications.
            </Texte>
          </View>
          <Switch value={resterConnecte} onValueChange={setResterConnecte} accessibilityLabel="Rester connecté" />
        </View>
        {message}
        <Bouton titre={occupe ? 'Connexion…' : 'Se connecter'} desactive={occupe || !identifiant || !motDePasse} onPress={() => seConnecter()} />
      </View>
      <Texte variante="petit" attenue>
        Tes identifiants ne vont qu’à EcoleDirecte. Coef n’a aucun serveur : tes notes restent sur ce téléphone, chiffrées. Client
        non officiel, non affilié à EcoleDirecte.
      </Texte>
      {CAPTURE ? (
        <Section titre="Essai">
          <Bouton variante="secondaire" titre="Exporter les captures (fichier)" onPress={() => exporterCaptures()} />
          <Bouton
            variante="secondaire"
            titre="Essai : base chiffrée"
            onPress={() => diagnosticBase().then(setErreur, (e: unknown) => setErreur(messageErreur(e, 'base')))}
          />
        </Section>
      ) : null}
    </Ecran>
  );
}
