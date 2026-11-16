import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CAPTURE, partSuivanteCaptures } from '@/api/ecoledirecte/capture';
import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { MODE_DEMO } from '@/demo';
import { Bouton, T, useCouleurs } from '@/features/compte/brut';
import { useCompte } from '@/features/compte/store';
import { NotesDemo } from '@/features/notes/NotesDemo';

export default function Accueil() {
  return MODE_DEMO ? <NotesDemo /> : <Compte />;
}

function Compte() {
  const c = useCouleurs();
  const { client, profils, restaurer, deconnecter, toutEffacer } = useCompte();
  const [sansSession, setSansSession] = useState(false);
  const [resultat, setResultat] = useState('');

  useEffect(() => {
    if (client) return;
    // shortcut: une panne réseau au démarrage renvoie aussi vers la connexion ; à affiner avec le cache (étape 4).
    restaurer()
      .then((ok) => setSansSession(!ok))
      .catch(() => setSansSession(true));
  }, [client, restaurer]);

  if (!client && sansSession) return <Redirect href="/connexion" />;
  if (!client) return <ActivityIndicator style={{ flex: 1, backgroundColor: c.fond }} />;

  async function essayerNotes(eleveId: string) {
    setResultat('…');
    try {
      const data = (await client!.notesBrutes(eleveId)) as { notes?: unknown[]; periodes?: unknown[] } | undefined;
      setResultat(`Reçu : ${data?.notes?.length ?? '?'} notes, ${data?.periodes?.length ?? '?'} périodes.`);
    } catch (e) {
      setResultat(e instanceof ErreurED ? `${e.message} (${e.detail ?? e.type})` : 'Erreur inattendue.');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.fond }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {profils.map((p) => (
          <T key={p.id} gras>
            {p.prenom} {p.nom} · compte {p.type}
          </T>
        ))}
        {profils.flatMap((p) => p.eleves).map((e) => (
          <Bouton key={e.id} titre={`Notes de ${e.prenom}${e.classe ? ` (${e.classe})` : ''}`} onPress={() => essayerNotes(e.id)} />
        ))}
        {resultat ? <T>{resultat}</T> : null}
        <Bouton titre="Se déconnecter" onPress={() => deconnecter()} />
        <Bouton
          titre="Tout effacer"
          onPress={() =>
            Alert.alert('Tout effacer ?', 'Jetons et clés seront supprimés de cet appareil.', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Effacer', style: 'destructive', onPress: () => toutEffacer() },
            ])
          }
        />
        {CAPTURE ? <Bouton titre="Partager la partie suivante des captures" onPress={() => Share.share({ message: partSuivanteCaptures() })} /> : null}
        <T>Client non officiel, non affilié à EcoleDirecte.</T>
      </ScrollView>
    </SafeAreaView>
  );
}
