import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CAPTURE } from '@/api/ecoledirecte/capture';
import { calibrer } from '@/domain/moyennes/calibration';
import { calculer } from '@/domain/moyennes/moteur';
import { depot } from '@/storage/base';
import { annonce } from '@/sync/annonce';
import { synchroniser } from '@/sync/synchro';
import { MODE_DEMO } from '@/demo';
import { Bouton, exporterCaptures, messageErreur, T, useCouleurs } from '@/features/compte/brut';
import { useCompte } from '@/features/compte/store';
import { NotesDemo } from '@/features/notes/NotesDemo';

import { afficher } from '../modules/notifications-locales';

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
      const r = await synchroniser(eleveId, () => client!.notes(eleveId), depot);
      const d = r.instantane.donnees;
      // Écran brut d'essai : calcul vérifié contre ED pour chaque période qui a une moyenne officielle.
      const lignes = d.periodes
        .filter((p) => p.officielleGenerale !== undefined)
        .map((p) => {
          const { retenue } = calibrer(p, d.notes, d.periodes, d.parametrage);
          const prevue = calculer(p, d.notes, d.periodes, { parametrage: d.parametrage }).generale;
          const etat = retenue.verifie ? 'calcul vérifié' : `écart max ${retenue.ecartMax.toFixed(2)} (${retenue.variante})`;
          return `${p.libelle} : prévue ${prevue?.toFixed(2) ?? '–'}, officielle ED ${p.officielleGenerale}, ${etat}`;
        });
      const source = r.depuisCache
        ? `cache (synchro ${r.instantane.synchro.slice(11, 16)} UTC)`
        : r.premiere
          ? 'première synchro'
          : `${r.nouvelles.length} nouvelle(s), ${r.modifiees.length} modifiée(s)`;
      setResultat([`${d.notes.length} notes, ${d.periodes.length} périodes · ${source}.`, ...lignes].join('\n'));
    } catch (e) {
      setResultat(messageErreur(e, 'notes'));
    }
  }

  // Essai seulement (build de capture) : retire la note la plus récente du cache puis resynchronise ;
  // ED la renvoie, elle passe pour nouvelle et déclenche la vraie notification.
  async function simulerNouvelleNote(eleveId: string) {
    const i = await depot.lire(eleveId);
    const derniere = i && [...i.donnees.notes].sort((a, b) => (a.dateSaisie ?? a.date).localeCompare(b.dateSaisie ?? b.date)).pop();
    if (!i || !derniere) return setResultat('Synchronise d’abord avec « Notes de … ».');
    await depot.ecrire(eleveId, { ...i, donnees: { ...i.donnees, notes: i.donnees.notes.filter((n) => n.id !== derniere.id) }, synchro: new Date(0).toISOString() });
    const r = await synchroniser(eleveId, () => client!.notes(eleveId), depot);
    const a = annonce(r, r.instantane.donnees);
    const affichee = a ? await afficher(1, a.titre, a.texte) : false;
    setResultat(a ? `${a.titre} — ${a.texte}${affichee ? '' : ' (notifications refusées)'}` : 'Aucune nouvelle note détectée.');
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
            Alert.alert('Tout effacer ?', 'Notes, jetons et clés seront supprimés de cet appareil.', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Effacer', style: 'destructive', onPress: () => toutEffacer() },
            ])
          }
        />
        {CAPTURE ? <Bouton titre="Exporter les captures (fichier)" onPress={() => exporterCaptures()} /> : null}
        {CAPTURE
          ? profils.flatMap((p) => p.eleves).map((e) => <Bouton key={`sim-${e.id}`} titre={`Essai : simuler une nouvelle note (${e.prenom})`} onPress={() => simulerNouvelleNote(e.id)} />)
          : null}
        <T>Client non officiel, non affilié à EcoleDirecte.</T>
      </ScrollView>
    </SafeAreaView>
  );
}
