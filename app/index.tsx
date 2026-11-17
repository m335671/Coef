// Écran des notes, la vitrine. Sa question : « Où en est ma moyenne ce trimestre, et qu'est-ce qui l'a fait bouger ? »
import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { MODE_DEMO } from '@/demo';
import { ELEVE_DEMO } from '@/demo/notes';
import type { Eleve } from '@/domain/types';
import { useCompte } from '@/features/compte/store';
import { familleDe, NOM_FAMILLE, ORDRE_FAMILLES } from '@/features/notes/familles';
import { useNotes } from '@/features/notes/store';
import { evolution, type LigneMatiere, periodeParDefaut, periodesAffichees, type VueNotes, vueNotes } from '@/features/notes/vue';
import { ecrirePreference, lirePreference } from '@/storage/base';
import { libelleMatiere } from '@/sync/annonce';
import {
  Barre,
  Bouton,
  BoutonRond,
  Chiffre,
  ChiffreAnime,
  Courbe,
  Ecart,
  Ecran,
  EnTete,
  Entree,
  IconeReglages,
  Panneau,
  Pastille,
  Presse,
  Pulsation,
  Section,
  Segments,
  Texte,
} from '@/ui/composants';
import { brute, coef, jour, moyenne } from '@/ui/format';
import { espace, police, rayon, taille, useCouleurs, useFamilles } from '@/ui/theme';

type Affichage = 'liste' | 'familles';
const PREF_AFFICHAGE = 'notes.affichage';

export default function Accueil() {
  const { client, profils, horsLigne, restaurer } = useCompte();
  const [etat, setEtat] = useState<'attente' | 'connexion' | 'pret'>(MODE_DEMO || client || horsLigne ? 'pret' : 'attente');

  useEffect(() => {
    if (etat !== 'attente') return;
    restaurer().then(
      (ok) => setEtat(ok ? 'pret' : 'connexion'),
      () => setEtat('connexion'), // session expirée ou refusée : on repasse par la connexion
    );
  }, [etat, restaurer]);

  if (etat === 'connexion') return <Redirect href="/connexion" />;
  if (etat === 'attente') return <Attente />;
  const eleves = MODE_DEMO ? [ELEVE_DEMO] : profils.flatMap((p) => p.eleves);
  return <Notes eleves={eleves} />;
}

function Attente() {
  const c = useCouleurs();
  return <ActivityIndicator color={c.accent} accessibilityLabel="Reconnexion à EcoleDirecte" style={{ flex: 1, backgroundColor: c.fond }} />;
}

function Notes({ eleves }: { eleves: Eleve[] }) {
  const c = useCouleurs();
  const [eleveId, setEleveId] = useState(eleves[0]?.id ?? '');
  const etat = useNotes((s) => s.eleves[eleveId]);
  const charger = useNotes((s) => s.charger);
  const [periodeChoisie, setPeriode] = useState<string>();
  const [affichage, setAffichage] = useState<Affichage>('liste');

  useEffect(() => {
    if (eleveId) void charger(eleveId);
  }, [eleveId, charger]);
  useEffect(() => {
    if (!MODE_DEMO) void lirePreference<Affichage>(PREF_AFFICHAGE, 'liste').then(setAffichage, () => undefined);
  }, []);
  const changerAffichage = (a: Affichage) => {
    setAffichage(a);
    if (!MODE_DEMO) void ecrirePreference(PREF_AFFICHAGE, a);
  };

  const instantane = etat?.instantane;
  const periodes = instantane ? periodesAffichees(instantane.donnees) : [];
  const periode = periodeChoisie ?? (instantane && periodeParDefaut(instantane.donnees, new Date().toISOString().slice(0, 10))?.code);
  const vue = useMemo(() => (instantane && periode ? vueNotes(instantane, periode) : undefined), [instantane, periode]);
  const courbe = useMemo(() => (instantane && vue ? evolution(instantane.donnees, vue.periode) : []), [instantane, vue]);
  const ouvrir = (code: string) => router.push({ pathname: '/matiere/[code]', params: { code, periode: vue!.periode.code, eleve: eleveId } });

  return (
    <Ecran>
      <EnTete
        titre="Notes"
        action={
          <BoutonRond libelle="Réglages" onPress={() => router.push('/reglages')}>
            <IconeReglages />
          </BoutonRond>
        }
      />
      {eleves.length > 1 ? (
        <Entree rang={1}>
          <Segments libelle="Élève" options={eleves.map((e) => ({ cle: e.id, libelle: e.prenom }))} valeur={eleveId} onChange={setEleveId} />
        </Entree>
      ) : null}
      {periodes.length > 0 && periode ? (
        <Entree rang={1}>
          <Segments libelle="Période" options={periodes.map((p) => ({ cle: p.code, libelle: p.libelle }))} valeur={periode} onChange={setPeriode} />
        </Entree>
      ) : null}
      <Entree rang={2}>
        <Moyenne vue={vue} courbe={courbe} chargement={etat?.chargement ?? true} erreur={etat?.erreur} synchro={instantane?.synchro} onReessayer={() => charger(eleveId, true)} />
      </Entree>
      {vue && instantane ? (
        <>
          {vue.nouvelles.length > 0 ? (
            <Section titre={vue.nouvelles.length === 1 ? 'Nouvelle note' : `${vue.nouvelles.length} nouvelles notes`} aide={vue.depuis ? `Depuis la synchro du ${jour(vue.depuis)}` : undefined} rang={3}>
              <View style={{ gap: espace.s }}>
                {vue.nouvelles.slice(0, 5).map((n, i) => (
                  <Entree key={n.id} rang={4 + i}>
                    <Presse onPress={() => ouvrir(n.matiereCode)} style={[styles.carteNote, { borderColor: c.bord }]}>
                      <Pulsation />
                      <View style={{ flex: 1 }}>
                        <Texte variante="liste" moyen numberOfLines={1}>
                          {libelleMatiere(instantane.donnees, n)}
                        </Texte>
                        <Texte variante="petit" attenue numberOfLines={1}>
                          {n.devoir || n.matiereCode} · coef {coef(n.coef)}
                        </Texte>
                      </View>
                      <Texte variante="liste" style={styles.note}>
                        {brute(n.valeurBrute)}
                        <Texte variante="liste" attenue>
                          /{n.noteSur}
                        </Texte>
                      </Texte>
                    </Presse>
                  </Entree>
                ))}
              </View>
            </Section>
          ) : null}
          <Section titre="Matières" aide={`${vue.periode.libelle} · moyennes prévues`} rang={5}>
            <Segments
              libelle="Affichage des matières"
              options={[
                { cle: 'liste' as const, libelle: 'Liste' },
                { cle: 'familles' as const, libelle: 'Par famille' },
              ]}
              valeur={affichage}
              onChange={changerAffichage}
            />
            {affichage === 'liste' ? (
              <View>
                {vue.matieres.map((l, i) => (
                  <LigneMatiereListe key={l.matiere.code} l={l} rang={6 + i} onPress={() => ouvrir(l.matiere.code)} />
                ))}
              </View>
            ) : (
              <ParFamille vue={vue} onPress={ouvrir} />
            )}
          </Section>
          <Entree rang={8}>
            <Bouton titre="Simuler une note" onPress={() => router.push({ pathname: '/simulateur', params: { periode: vue.periode.code, eleve: eleveId } })} />
          </Entree>
          <Texte variante="petit" attenue>
            Moyennes prévues par ED-Clone à partir de tes notes. Client non officiel, non affilié à EcoleDirecte.
          </Texte>
        </>
      ) : null}
    </Ecran>
  );
}

function LigneMatiereListe({ l, rang, onPress }: { l: LigneMatiere; rang: number; onPress: () => void }) {
  const m = l.matiere;
  return (
    <Entree rang={rang}>
      <Presse
        onPress={onPress}
        libelleAccessible={`${m.libelle}, coefficient ${coef(m.coef)}, ${m.moyenne === undefined ? 'pas de note' : `moyenne prévue ${moyenne(m.moyenne)}`}`}
        style={styles.ligneMatiere}>
        <View style={styles.rangee}>
          <Texte variante="liste" moyen numberOfLines={2} style={{ flex: 1 }}>
            {m.libelle}
          </Texte>
          <Texte variante="petit" attenue>
            coef {coef(m.coef)}
          </Texte>
          <View style={styles.colonne}>
            <Chiffre valeur={m.moyenne} />
          </View>
        </View>
        <Barre ratio={(m.moyenne ?? 0) / 20} delai={(rang + 2) * 50} />
      </Presse>
    </Entree>
  );
}

/** Affichage « par famille » (repris du style pastel) : une tuile teintée par famille, ses matières dedans. */
function ParFamille({ vue, onPress }: { vue: VueNotes; onPress: (code: string) => void }) {
  const c = useCouleurs();
  const familles = useFamilles();
  const nouvelles = new Set(vue.nouvelles.map((n) => n.matiereCode));
  const groupes = ORDRE_FAMILLES.map((f) => ({ f, lignes: vue.matieres.filter((l) => familleDe(l.matiere.code, l.matiere.libelle) === f) })).filter(
    (g) => g.lignes.length > 0,
  );
  return (
    <View style={{ gap: espace.m }}>
      {groupes.map(({ f, lignes }, i) => (
        <Entree key={f} rang={6 + i} style={[styles.famille, { backgroundColor: familles[f].fond }]}>
          <Texte variante="section" role="heading" aria-level={3} style={{ color: familles[f].encre }}>
            {NOM_FAMILLE[f]}
          </Texte>
          {lignes.map(({ matiere: m }) => (
            <Presse
              key={m.code}
              onPress={() => onPress(m.code)}
              libelleAccessible={`${m.libelle}, ${m.moyenne === undefined ? 'pas de note' : `moyenne prévue ${moyenne(m.moyenne)}`}`}
              style={[styles.tuile, { backgroundColor: `${c.fond}b8` }]}>
              <Texte variante="liste" numberOfLines={2} style={{ flex: 1, color: familles[f].encre }}>
                {m.libelle}
              </Texte>
              {nouvelles.has(m.code) ? <Pastille texte="nouvelle note" fond={c.fond} encre={familles[f].encre} /> : null}
              <Chiffre valeur={m.moyenne} taillePx={16} couleur={familles[f].encre} />
            </Presse>
          ))}
        </Entree>
      ))}
    </View>
  );
}

/** Le bloc qui répond à la question de l'écran : moyenne prévue, ce qui a bougé, sa courbe, son état face à ED. */
function Moyenne({
  vue,
  courbe,
  chargement,
  erreur,
  synchro,
  onReessayer,
}: {
  vue?: VueNotes;
  courbe: { date: string; moyenne: number }[];
  chargement: boolean;
  erreur?: unknown;
  synchro?: string;
  onReessayer: () => void;
}) {
  const c = useCouleurs();
  const g = vue?.resultat.generale;
  const officielle = vue?.resultat.officielleGenerale;
  const cal = vue?.calibration;
  const etatED =
    officielle === undefined
      ? 'Pas encore de moyenne officielle ED pour cette période'
      : `Officielle ED ${moyenne(officielle)}${vue?.enAvance ? `, sans ${vue.enAvance === 1 ? 'la dernière note' : `les ${vue.enAvance} dernières notes`}` : ''}`;
  const fraicheur = chargement
    ? 'Synchronisation avec EcoleDirecte…'
    : synchro
      ? `Synchro ${jour(synchro)} à ${new Date(synchro).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
      : undefined;

  return (
    <Panneau teinte style={{ paddingVertical: espace.xl, gap: espace.m }}>
      <View style={styles.rangee}>
        <Texte variante="liste" style={{ flex: 1, color: c.accentEncre }}>
          Moyenne générale prévue
        </Texte>
        {cal?.verifie ? <Pastille texte="Calcul vérifié" /> : cal && cal.comparees > 0 ? <Pastille texte={`Écart ${moyenne(cal.ecartMax)} avec ED`} /> : null}
      </View>
      <View style={styles.phare}>
        {vue ? <ChiffreAnime valeur={g} taillePx={taille.phare} couleur={c.accent} /> : <View style={[styles.attente, { backgroundColor: c.teinte100 }]} />}
        {vue && g !== undefined ? (
          <Texte variante="liste" attenue>
            /20
          </Texte>
        ) : null}
      </View>
      {vue?.ecart !== undefined && vue.depuis ? <Ecart valeur={vue.ecart} suffixe={`depuis la synchro du ${jour(vue.depuis)}`} /> : null}
      {g !== undefined ? <Barre ratio={g / 20} hauteur={10} delai={150} /> : null}
      {courbe.length > 1 ? (
        <View style={{ gap: espace.xs }}>
          <Courbe
            points={courbe.map((p) => p.moyenne)}
            libelle={`Évolution de la moyenne prévue, de ${moyenne(courbe[0]!.moyenne)} le ${jour(courbe[0]!.date)} à ${moyenne(courbe.at(-1)!.moyenne)} le ${jour(courbe.at(-1)!.date)}`}
          />
          <View style={styles.rangee}>
            <Texte variante="petit" attenue style={{ flex: 1 }}>
              {jour(courbe[0]!.date)}
            </Texte>
            <Texte variante="petit" attenue>
              {jour(courbe.at(-1)!.date)}
            </Texte>
          </View>
        </View>
      ) : null}
      {vue ? (
        <Texte variante="petit" style={{ color: c.accentEncre }}>
          {etatED}
        </Texte>
      ) : null}
      {erreur ? (
        <View style={{ gap: espace.xs }}>
          <Texte variante="liste">
            {erreur instanceof ErreurED ? erreur.message : 'La synchronisation a échoué.'}
            {vue ? ' Notes affichées : dernière synchro réussie.' : ''}
          </Texte>
          <Bouton variante="texte" titre="Réessayer" onPress={onReessayer} />
        </View>
      ) : fraicheur ? (
        <Texte variante="petit" attenue>
          {fraicheur}
        </Texte>
      ) : null}
    </Panneau>
  );
}

const styles = StyleSheet.create({
  phare: { flexDirection: 'row', alignItems: 'baseline', gap: espace.xs, minHeight: 56 },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
  attente: { width: 140, height: 48, borderRadius: 8 },
  colonne: { width: 52, alignItems: 'flex-end' },
  note: { fontFamily: police.fort, fontVariant: ['tabular-nums'] },
  carteNote: { flexDirection: 'row', alignItems: 'center', gap: espace.m, paddingHorizontal: 14, paddingVertical: espace.m, borderRadius: 14, borderWidth: 1 },
  ligneMatiere: { paddingVertical: espace.m, gap: espace.s },
  famille: { borderRadius: rayon.phare, padding: espace.l, gap: espace.s },
  tuile: { flexDirection: 'row', alignItems: 'center', gap: espace.s, paddingHorizontal: espace.m, paddingVertical: 10, borderRadius: 12 },
});
