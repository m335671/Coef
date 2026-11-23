// Réglages. Sa question : « Qu'est-ce que l'app garde et montre de moi ? »
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';

import { CAPTURE } from '@/api/ecoledirecte/capture';
import { MODE_DEMO } from '@/demo';
import { reinitialiserApparence } from '@/features/apparence';
import { exporterCaptures, messageErreur } from '@/features/compte/essai';
import { useCompte } from '@/features/compte/store';
import { useSimulation } from '@/features/notes/simulation';
import { SectionsApparence } from '@/features/ReglagesApparence';
import { useNotes } from '@/features/notes/store';
import { annonce } from '@/sync/annonce';
import { depot, ecrirePreference, lirePreference } from '@/storage/base';
import { synchroniser } from '@/sync/synchro';
import { type BilanFond, decrireBilan, regularite } from '@/sync/historique';
import { ECRAN_VERROUILLE_DEFAUT, PREF_BILAN_FOND, PREF_ECRAN_VERROUILLE, PREF_HISTORIQUE_FOND } from '@/sync/tache';
import { Bouton, Choix, Ecran, EnTete, Ligne, Panneau, Presse, Section, Texte } from '@/ui/composants';
import { espace, useCouleurs } from '@/ui/theme';

import { afficher, batterieOptimisee, type EcranVerrouille, exempterBatterie } from '../modules/notifications-locales';

const CHOIX: { cle: EcranVerrouille; titre: string; aide: string }[] = [
  {
    cle: 'systeme',
    titre: 'Selon les réglages du téléphone',
    aide: 'Le téléphone décide : la note et la moyenne, ou seulement « Nouvelle note » s’il masque le contenu sensible.',
  },
  { cle: 'rien', titre: 'Rien', aide: "La notification n'apparaît qu'une fois le téléphone déverrouillé." },
];

export default function Reglages() {
  const { profils, deconnecter, toutEffacer, client } = useCompte();
  const vider = useNotes((s) => s.vider);
  const c = useCouleurs();
  const [ecran, setEcran] = useState<EcranVerrouille>(ECRAN_VERROUILLE_DEFAUT);
  const [info, setInfo] = useState('');

  const [bilanFond, setBilanFond] = useState<BilanFond>();
  const [historique, setHistorique] = useState<BilanFond[]>([]);
  const [optimisee, setOptimisee] = useState(batterieOptimisee);
  useEffect(() => {
    const relire = () => {
      setOptimisee(batterieOptimisee());
      if (MODE_DEMO) return;
      void lirePreference<BilanFond | undefined>(PREF_BILAN_FOND, undefined).then(setBilanFond, () => undefined);
      void lirePreference<BilanFond[]>(PREF_HISTORIQUE_FOND, []).then(setHistorique, () => undefined);
    };
    relire();
    if (!MODE_DEMO) void lirePreference<EcranVerrouille>(PREF_ECRAN_VERROUILLE, ECRAN_VERROUILLE_DEFAUT).then(setEcran, () => undefined);
    // Relu au retour dans l'app : fenêtre système de la batterie, vérification de test passée entre-temps.
    const abonnement = AppState.addEventListener('change', (e) => e === 'active' && relire());
    return () => abonnement.remove();
  }, []);
  const dernier = historique[0] ?? bilanFond;
  const rythme = regularite(historique, new Date());

  function choisir(v: EcranVerrouille) {
    setEcran(v);
    if (!MODE_DEMO) void ecrirePreference(PREF_ECRAN_VERROUILLE, v);
  }

  async function effacer() {
    await toutEffacer();
    vider();
    reinitialiserApparence();
    useSimulation.setState({
      notes: {},
      retouches: undefined,
      matieresIgnorees: undefined,
      objectif: undefined,
      objectifAffiche: undefined,
      remplacees: undefined,
      active: true,
      charge: false,
    });
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

      <SectionsApparence />
      <Section titre="Matières">
        <Panneau>
          <Ligne dernier onPress={() => router.push('/apparence')} libelleAccessible="Couleurs des matières">
            <Texte variante="liste" moyen style={{ flex: 1 }}>
              Couleurs des matières
            </Texte>
            <Texte variante="liste" attenue>
              ›
            </Texte>
          </Ligne>
        </Panneau>
      </Section>

      <Section
        titre="Notifications"
        aide="Une notification par nouvelle note, note modifiée ou nouveau message, vérifiés en arrière-plan au plus une fois par heure.">
        <Texte variante="liste" moyen>
          Sur l’écran verrouillé
        </Texte>
        <Panneau>
          {CHOIX.map((ch, i) => (
            <Choix key={ch.cle} {...ch} actif={ecran === ch.cle} dernier={i === CHOIX.length - 1} onPress={() => choisir(ch.cle)} />
          ))}
        </Panneau>
        <Presse onPress={() => router.push('/historique-synchro')} libelleAccessible="Historique des vérifications en arrière-plan">
          <Texte variante="petit" attenue>
            {!dernier
              ? 'Vérification en arrière-plan : pas encore passée. Android choisit le moment (batterie, réseau).'
              : `Dernière vérification en arrière-plan : ${new Date(dernier.date).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}, ${decrireBilan(dernier)}.`}{' '}
            <Texte variante="petit" style={{ color: c.accent }}>
              Historique ›
            </Texte>
          </Texte>
        </Presse>
        {rythme.irregulier ? (
          <Panneau style={{ gap: espace.s, paddingVertical: espace.m, borderColor: c.negatif }}>
            <Texte variante="liste" moyen style={{ color: c.negatif }}>
              Vérifications irrégulières : {rythme.raison}.
            </Texte>
            <Texte variante="petit" attenue>
              {optimisee
                ? 'Android économise la batterie de Coef : c’est la cause la plus probable. Retire Coef de l’optimisation pour que la vérification passe à l’heure.'
                : 'La batterie de Coef n’est pas optimisée : le fabricant (mise en veille des apps) ou l’économiseur de données peuvent aussi bloquer Coef en arrière-plan. Vérifie ses réglages d’arrière-plan.'}
            </Texte>
            {optimisee ? (
              <Bouton titre="Ne plus optimiser la batterie pour Coef" onPress={exempterBatterie} />
            ) : (
              <Bouton variante="secondaire" titre="Ouvrir les réglages de Coef" onPress={() => void Linking.openSettings()} />
            )}
          </Panneau>
        ) : optimisee ? (
          <>
            <Texte variante="petit" attenue>
              Android économise la batterie de Coef : la vérification peut être retardée de plusieurs heures, voire bloquée. Si les notifications arrivent tard
              ou jamais, retire Coef de l’optimisation.
            </Texte>
            <Bouton variante="secondaire" titre="Ne plus optimiser la batterie pour Coef" onPress={exempterBatterie} />
          </>
        ) : optimisee === false ? (
          <Texte variante="petit" attenue>
            Batterie : Coef n’est pas optimisé, la vérification en arrière-plan n’est pas freinée.
          </Texte>
        ) : null}
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
