// Réglages. Sa question : « Qu'est-ce que l'app garde et montre de moi ? »
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { CAPTURE } from '@/api/ecoledirecte/capture';
import { MODE_DEMO } from '@/demo';
import { reinitialiserApparence } from '@/features/apparence';
import { exporterCaptures, messageErreur } from '@/features/compte/essai';
import { useCompte } from '@/features/compte/store';
import { useSimulation } from '@/features/notes/simulation';
import { useNotes } from '@/features/notes/store';
import { annonce } from '@/sync/annonce';
import { depot, ecrirePreference, lirePreference } from '@/storage/base';
import { synchroniser } from '@/sync/synchro';
import { type BilanFond, PREF_BILAN_FOND, PREF_ECRAN_VERROUILLE } from '@/sync/tache';
import { Bouton, Choix, Ecran, EnTete, Ligne, Panneau, Section, Texte } from '@/ui/composants';

import { afficher, type EcranVerrouille } from '../modules/notifications-locales';

const CHOIX: { cle: EcranVerrouille; titre: string; aide: string }[] = [
  { cle: 'rien', titre: 'Rien', aide: "La notification n'apparaît qu'une fois le téléphone déverrouillé." },
  {
    cle: 'systeme',
    titre: 'Selon les réglages du téléphone',
    aide: 'Le téléphone décide : la note et la moyenne, ou seulement « Nouvelle note » s’il masque le contenu sensible.',
  },
];

export default function Reglages() {
  const { profils, deconnecter, toutEffacer, client } = useCompte();
  const vider = useNotes((s) => s.vider);
  const [ecran, setEcran] = useState<EcranVerrouille>('rien');
  const [info, setInfo] = useState('');

  const [bilanFond, setBilanFond] = useState<BilanFond>();
  useEffect(() => {
    if (MODE_DEMO) return;
    void lirePreference<EcranVerrouille>(PREF_ECRAN_VERROUILLE, 'rien').then(setEcran, () => undefined);
    void lirePreference<BilanFond | undefined>(PREF_BILAN_FOND, undefined).then(setBilanFond, () => undefined);
  }, []);

  function choisir(v: EcranVerrouille) {
    setEcran(v);
    if (!MODE_DEMO) void ecrirePreference(PREF_ECRAN_VERROUILLE, v);
  }

  async function effacer() {
    await toutEffacer();
    vider();
    reinitialiserApparence();
    useSimulation.setState({ notes: {}, objectif: undefined, objectifAffiche: undefined, remplacees: undefined, active: true, modifie: false, charge: false });
    router.replace('/connexion');
  }

  function confirmerEffacement() {
    const titre = 'Tout effacer ?';
    const texte = 'Notes, clés et jetons seront supprimés de ce téléphone. Il faudra te reconnecter et répondre à la question de sécurité.';
    if (Platform.OS === 'web') return; // aperçu web : démo, rien à effacer
    Alert.alert(titre, texte, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Effacer', style: 'destructive', onPress: () => void effacer() },
    ]);
  }

  // Essai seulement : retire la note la plus récente du cache puis resynchronise ; ED la renvoie, elle passe
  // pour nouvelle et déclenche la vraie notification.
  async function simulerNouvelleNote(eleveId: string) {
    try {
      const i = await depot.lire(eleveId);
      const derniere = i && [...i.donnees.notes].sort((a, b) => (a.dateSaisie ?? a.date).localeCompare(b.dateSaisie ?? b.date)).pop();
      if (!i || !derniere || !client) return setInfo('Synchronise d’abord tes notes.');
      await depot.ecrire(eleveId, {
        ...i,
        donnees: { ...i.donnees, notes: i.donnees.notes.filter((n) => n.id !== derniere.id) },
        synchro: new Date(0).toISOString(),
      });
      const r = await synchroniser(eleveId, () => client.notes(eleveId), depot);
      const a = annonce(r, r.instantane.donnees);
      const ok = a ? await afficher(1, a.titre, a.texte, ecran) : false;
      setInfo(a ? `${a.titre} — ${a.texte}${ok ? '' : ' (notifications refusées)'}` : 'Aucune nouvelle note détectée.');
    } catch (e) {
      setInfo(messageErreur(e, 'simulation'));
    }
  }

  const eleves = profils.flatMap((p) => p.eleves);

  return (
    <Ecran>
      <EnTete titre="Réglages" retour />

      <Section titre="Apparence">
        <Panneau>
          <Ligne dernier onPress={() => router.push('/apparence')} libelleAccessible="Apparence : mode, couleur du thème, couleurs des matières">
            <Texte variante="liste" moyen style={{ flex: 1 }}>
              Mode, couleurs, matières
            </Texte>
            <Texte variante="liste" attenue>
              ›
            </Texte>
          </Ligne>
        </Panneau>
      </Section>

      <Section titre="Notifications" aide="Une notification par nouvelle note, vérifiée en arrière-plan au plus une fois par heure.">
        <Texte variante="liste" moyen>
          Sur l’écran verrouillé
        </Texte>
        <Panneau>
          {CHOIX.map((ch, i) => (
            <Choix key={ch.cle} {...ch} actif={ecran === ch.cle} dernier={i === CHOIX.length - 1} onPress={() => choisir(ch.cle)} />
          ))}
        </Panneau>
        <Texte variante="petit" attenue>
          {!bilanFond
            ? 'Vérification en arrière-plan : pas encore passée. Android choisit le moment (batterie, réseau).'
            : `Dernière vérification en arrière-plan : ${new Date(bilanFond.date).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}, ${
                bilanFond.resultat === 'ok'
                  ? bilanFond.notifiees
                    ? `${bilanFond.notifiees} notification${bilanFond.notifiees > 1 ? 's' : ''}`
                    : 'rien de nouveau'
                  : bilanFond.resultat === 'premier-plan'
                    ? 'app ouverte, elle s’en est chargée'
                    : `échec (${bilanFond.erreur})`
              }.`}
        </Texte>
      </Section>

      {!MODE_DEMO ? (
        <Section titre="Compte" aide={eleves.map((e) => `${e.prenom} ${e.nom}${e.classe ? ` · ${e.classe}` : ''}`).join('\n')}>
          <Bouton
            variante="secondaire"
            titre="Se déconnecter"
            onPress={async () => {
              await deconnecter();
              vider();
              router.replace('/connexion');
            }}
          />
          <Bouton variante="danger" titre="Tout effacer de ce téléphone" onPress={confirmerEffacement} />
        </Section>
      ) : null}

      <Section titre="Confidentialité">
        <Texte variante="liste">
          Tes notes restent sur ce téléphone, dans une base chiffrée dont la clé ne le quitte jamais. Coef ne parle qu’à EcoleDirecte : aucun serveur à nous,
          aucune mesure d’audience, aucune publicité.
        </Texte>
      </Section>

      <Section titre="À propos">
        <Texte variante="liste">
          Coef est un client non officiel, non affilié à EcoleDirecte ni à Aplim. Les moyennes affichées sont prévues par l’app ; seule EcoleDirecte fait foi.
        </Texte>
      </Section>

      {CAPTURE && !MODE_DEMO ? (
        <Section titre="Essai" aide="Présent seulement dans les versions d'essai.">
          {eleves.map((e) => (
            <Bouton key={e.id} variante="secondaire" titre={`Simuler une nouvelle note (${e.prenom})`} onPress={() => simulerNouvelleNote(e.id)} />
          ))}
          <Bouton variante="secondaire" titre="Exporter les captures (fichier)" onPress={() => exporterCaptures()} />
          {info ? <Texte variante="liste">{info}</Texte> : null}
        </Section>
      ) : null}
    </Ecran>
  );
}
