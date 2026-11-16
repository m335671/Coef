import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Share, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type CleAppareil, connexion, repondreQCM } from '@/api/ecoledirecte/client';
import { CAPTURE, texteCaptures } from '@/api/ecoledirecte/capture';
import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { Bouton, T, useCouleurs } from '@/features/compte/brut';
import { useCompte } from '@/features/compte/store';
import { uuidAppareil } from '@/storage/secrets';

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
      setErreur(e instanceof ErreurED ? e.message : 'Erreur inattendue.');
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

  const champ = [styles.champ, { color: c.texte, borderColor: c.bord }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.fond }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <T gras>Connexion EcoleDirecte</T>
        {qcm ? (
          <>
            <T>{qcm.question}</T>
            {qcm.propositions.map((p) => (
              <Bouton key={p} titre={p} desactive={occupe} onPress={() => repondre(p)} />
            ))}
          </>
        ) : (
          <>
            <TextInput
              style={champ}
              placeholder="Identifiant"
              accessibilityLabel="Identifiant"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              value={identifiant}
              onChangeText={setIdentifiant}
            />
            <TextInput
              style={champ}
              placeholder="Mot de passe"
              accessibilityLabel="Mot de passe"
              secureTextEntry
              autoComplete="current-password"
              value={motDePasse}
              onChangeText={setMotDePasse}
            />
            <View style={styles.ligne}>
              <T>Rester connecté</T>
              <Switch value={resterConnecte} onValueChange={setResterConnecte} accessibilityLabel="Rester connecté" />
            </View>
            <Bouton titre={occupe ? 'Connexion…' : 'Se connecter'} desactive={occupe || !identifiant || !motDePasse} onPress={() => seConnecter()} />
          </>
        )}
        {erreur ? <T>{erreur}</T> : null}
        <T>Tes identifiants ne sont envoyés qu’à EcoleDirecte. Le mot de passe n’est jamais enregistré.</T>
        {CAPTURE ? <Bouton titre="Partager les captures (anonymisées)" onPress={() => Share.share({ message: texteCaptures() })} /> : null}
        <T>Client non officiel, non affilié à EcoleDirecte.</T>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  champ: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, marginVertical: 6 },
  ligne: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 6 },
});
