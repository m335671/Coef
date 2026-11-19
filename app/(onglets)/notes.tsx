// Écran des notes, la vitrine. Sa question : « Où en est ma moyenne ce trimestre, et qu'est-ce qui l'a fait bouger ? »
import { router } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { MODE_DEMO } from '@/demo';
import { avecHypotheses, type NoteHypothetique } from '@/domain/moyennes/simulateur';
import type { Note } from '@/domain/types';
import type { Famille } from '@/ui/theme';
import { useEleveActif, useEleves } from '@/features/compte/eleves';
import { familleDe, NOM_FAMILLE, ORDRE_FAMILLES, useCouleurMatiere } from '@/features/notes/familles';
import { ordonner, TRIS, type Tri, trierNotes } from '@/features/notes/ordre';
import { cleSimulation, useSimulation } from '@/features/notes/simulation';
import { useNotes } from '@/features/notes/store';
import { evolution, evolutionsMatieres, groupesPeriodes, type LigneMatiere, periodeParDefaut, periodesAffichees, type VueNotes, vueNotes } from '@/features/notes/vue';
import { ecrirePreference, lirePreference } from '@/storage/base';
import { libelleMatiere } from '@/sync/annonce';
import {
  Bouton,
  BoutonRond,
  Chiffre,
  ChiffreAnime,
  Courbe,
  Deroulant,
  Ecart,
  Ecran,
  EnTete,
  Feuille,
  Entree,
  IconeReglages,
  ListeSquelette,
  Panneau,
  Pastille,
  Presse,
  Pulsation,
  Section,
  Segments,
  Squelette,
  Texte,
} from '@/ui/composants';
import { brute, coef, jour, moyenne } from '@/ui/format';
import { Anneau, Echelle, Hachures, MiniCourbe } from '@/ui/graphiques';
import Svg, { Path } from 'react-native-svg';

import { ListeTriable } from '@/ui/ListeTriable';
import { espace, police, rayon, taille, useCouleurs, useFamilles } from '@/ui/theme';

type Affichage = 'liste' | 'familles' | 'notes';
const PREF_AFFICHAGE = 'notes.affichage';
const PREF_ORDRE_MATIERES = 'notes.ordre.matieres';
const PREF_ORDRE_FAMILLES = 'notes.ordre.familles';
const PREF_TRI = 'notes.tri';
const AUCUNE: NoteHypothetique[] = [];

export default function Notes() {
  const c = useCouleurs();
  const eleves = useEleves();
  const [eleve, setEleveId] = useEleveActif();
  const eleveId = eleve?.id ?? '';
  const etat = useNotes((s) => s.eleves[eleveId]);
  const charger = useNotes((s) => s.charger);
  const [periodeChoisie, setPeriode] = useState<string>();
  const [affichage, setAffichage] = useState<Affichage>('liste');

  useEffect(() => {
    if (eleveId) void charger(eleveId);
  }, [eleveId, charger]);
  const [ordreMatieres, setOrdreMatieres] = useState<string[]>([]);
  const [ordreFamilles, setOrdreFamilles] = useState<Famille[]>(ORDRE_FAMILLES);
  const [tri, setTri] = useState<Tri>('matiere');
  const [edition, setEdition] = useState(false);
  const [choixTri, setChoixTri] = useState(false);
  useEffect(() => {
    if (MODE_DEMO) return;
    void lirePreference<Affichage>(PREF_AFFICHAGE, 'liste').then(setAffichage, () => undefined);
    void lirePreference<string[]>(PREF_ORDRE_MATIERES, []).then(setOrdreMatieres, () => undefined);
    void lirePreference<Famille[]>(PREF_ORDRE_FAMILLES, ORDRE_FAMILLES).then(
      (o) => setOrdreFamilles(ordonner(ORDRE_FAMILLES, o, (f) => f)),
      () => undefined,
    );
    void lirePreference<Tri>(PREF_TRI, 'matiere').then(setTri, () => undefined);
  }, []);
  const garder = <T,>(cle: string, v: T) => {
    if (!MODE_DEMO) void ecrirePreference(cle, v);
  };
  const changerAffichage = (a: Affichage) => {
    setAffichage(a);
    setEdition(false);
    garder(PREF_AFFICHAGE, a);
  };
  const changerTri = (t: Tri) => {
    setTri(t);
    setChoixTri(false);
    garder(PREF_TRI, t);
  };

  const instantane = etat?.instantane;
  const periodes = instantane ? periodesAffichees(instantane.donnees) : [];
  const periode = periodeChoisie ?? (instantane && periodeParDefaut(instantane.donnees, new Date().toISOString().slice(0, 10))?.code);
  const simulation = useSimulation();
  useEffect(() => void simulation.charger(), [simulation.charger]); // eslint-disable-line react-hooks/exhaustive-deps
  const simulees = (periode && simulation.notes[cleSimulation(eleveId, periode)]) || AUCUNE;
  /** Notes réelles arrivées à la place d'une note simulée : id → note simulée. */
  const etaitSimulee = new Map(
    (simulation.remplacees ?? []).filter((r) => periode && r.cle === cleSimulation(eleveId, periode)).map((r) => [r.noteId, r.hypothese]),
  );
  const simule = simulation.active && simulees.length > 0;
  const reelle = useMemo(() => (instantane && periode ? vueNotes(instantane, periode) : undefined), [instantane, periode]);
  // Simulation active : les notes simulées rejoignent les vraies ; le reste (calibration, nouveautés) reste réel.
  const instantaneVu = useMemo(
    () =>
      instantane && reelle && simule
        ? {
            ...instantane,
            donnees: {
              ...instantane.donnees,
              notes: avecHypotheses(reelle.periode, instantane.donnees.notes, simulees),
            },
          }
        : instantane,
    [instantane, reelle, simule, simulees],
  );
  const vue = useMemo(() => {
    if (!reelle || !simule || !instantaneVu) return reelle;
    const v = vueNotes(instantaneVu, reelle.periode.code)!;
    return {
      ...v,
      calibration: reelle.calibration,
      nouvelles: reelle.nouvelles,
      enAvance: reelle.enAvance,
      ecart: undefined,
      depuis: undefined,
    };
  }, [reelle, simule, instantaneVu]);
  const courbe = useMemo(() => (instantaneVu && vue ? evolution(instantaneVu.donnees, vue.periode) : []), [instantaneVu, vue]);
  const tendances = useMemo(() => (instantaneVu && vue ? evolutionsMatieres(instantaneVu.donnees, vue.periode) : {}), [instantaneVu, vue]);
  /** Moyennes réelles par matière, quand la simulation est affichée (pour montrer « réelle » sous la simulée). */
  const reellesMatieres = simule && reelle ? new Map(reelle.matieres.map((l) => [l.matiere.code, l.matiere.moyenne])) : undefined;
  const matieres = vue ? ordonner(vue.matieres, ordreMatieres, (l) => l.matiere.code) : [];
  const ordonnerMatieres = (o: string[]) => {
    setOrdreMatieres(o);
    garder(PREF_ORDRE_MATIERES, o);
  };
  const deplacerFamille = (visibles: Famille[]) => {
    const o = ordonner(ORDRE_FAMILLES, visibles, (f) => f);
    setOrdreFamilles(o);
    garder(PREF_ORDRE_FAMILLES, o);
  };
  const ouvrirSimulation = () =>
    router.push({
      pathname: '/simulateur',
      params: { periode: vue!.periode.code, eleve: eleveId },
    });
  const ouvrir = (code: string) =>
    router.push({
      pathname: '/matiere/[code]',
      params: { code, periode: vue!.periode.code, eleve: eleveId },
    });
  const ouvrirNote = (id: string) =>
    router.push({
      pathname: '/note/[id]',
      params: { id, periode: vue!.periode.code, eleve: eleveId },
    });

  return (
    <Ecran actualiser={{ enCours: !!etat?.chargement && !!instantane, onActualiser: () => !etat?.chargement && charger(eleveId, true) }}>
      <EnTete
        titre="Notes"
        action={
          <View style={{ flexDirection: 'row', gap: espace.s }}>
            {vue ? (
              <BoutonRond libelle="Courbes des moyennes" onPress={() => router.push({ pathname: '/courbes', params: { periode: vue.periode.code, eleve: eleveId } })}>
                <IconeCourbes />
              </BoutonRond>
            ) : null}
            {vue ? (
              <Presse onPress={ouvrirSimulation} libelleAccessible="Simuler des notes" style={[styles.simuler, { backgroundColor: c.teinte100 }]}>
                <IconeSimulation />
                <Texte variante="petit" style={{ color: c.accentEncre, fontFamily: police.fort }}>
                  Simuler
                </Texte>
              </Presse>
            ) : null}
            <BoutonRond libelle="Réglages" onPress={() => router.push('/reglages')}>
              <IconeReglages />
            </BoutonRond>
          </View>
        }
      />
      {eleves.length > 1 ? (
        <Entree rang={1}>
          <Segments libelle="Élève" options={eleves.map((e) => ({ cle: e.id, libelle: e.prenom }))} valeur={eleveId} onChange={setEleveId} />
        </Entree>
      ) : null}
      {periodes.length > 0 && periode ? (
        <Entree rang={1}>
          <Deroulant libelle="Période" groupes={groupesPeriodes(periodes)} valeur={periode} onChange={setPeriode} />
        </Entree>
      ) : null}
      {simulees.length > 0 ? (
        <Entree rang={2}>
          <BandeauSimulation n={simulees.length} active={simulation.active} onActiver={simulation.activer} onModifier={ouvrirSimulation} />
        </Entree>
      ) : null}
      <Entree rang={2}>
        <Moyenne
          vue={vue}
          reelle={simule ? reelle?.resultat.generale : undefined}
          objectif={simulation.objectif}
          objectifAffiche={simulation.objectifAffiche ?? true}
          onModifierObjectif={() => router.push({ pathname: '/simulateur', params: { periode: vue!.periode.code, eleve: eleveId, onglet: 'objectif' } })}
          courbe={courbe}
          chargement={etat?.chargement ?? true}
          erreur={etat?.erreur}
          synchro={instantane?.synchro}
          onReessayer={() => charger(eleveId, true)}
        />
      </Entree>
      {!vue && etat?.chargement !== false ? (
        <Section titre="Matières" rang={3}>
          <ListeSquelette lignes={5} libelle="Chargement des matières" />
        </Section>
      ) : null}
      {vue && instantane ? (
        <>
          {vue.nouvelles.length > 0 ? (
            <Section
              titre={vue.nouvelles.length === 1 ? 'Nouvelle note' : `${vue.nouvelles.length} nouvelles notes`}
              aide={vue.depuis ? `Depuis la synchro du ${jour(vue.depuis)}` : undefined}
              rang={3}>
              <View style={{ gap: espace.s }}>
                {vue.nouvelles.slice(0, 5).map((n, i) => (
                  <Entree key={n.id} rang={4 + i}>
                    <Presse onPress={() => ouvrirNote(n.id)} style={[styles.carteNote, { borderColor: c.bord }]}>
                      <Pulsation />
                      <View style={{ flex: 1 }}>
                        <Texte variante="liste" moyen numberOfLines={1}>
                          {libelleMatiere(instantane.donnees, n)}
                        </Texte>
                        <Texte variante="petit" attenue numberOfLines={1}>
                          {n.devoir || n.matiereCode} · coef {coef(n.coef)}
                        </Texte>
                        {etaitSimulee.has(n.id) ? (
                          <Texte variante="petit" style={{ color: c.negatif }}>
                            Tu l’avais simulée : {coef(etaitSimulee.get(n.id)!.valeur)}/{etaitSimulee.get(n.id)!.noteSur}
                          </Texte>
                        ) : null}
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
          <Section
            titre="Matières"
            aide={
              edition
                ? 'Attrape ≡ et fais glisser. L’ordre est gardé sur ce téléphone.'
                : `${vue.periode.libelle} · moyennes ${simule ? 'simulées' : 'prévues'}`
            }
            rang={5}
            action={
              <Bascule key={affichage === 'notes' ? 'tri' : edition ? 'ok' : 'crayon'}>
                {affichage === 'notes' ? (
                  <BoutonRond libelle={`Trier les notes : ${TRIS[tri]}`} onPress={() => setChoixTri(true)}>
                    <IconeTri />
                  </BoutonRond>
                ) : edition ? (
                  <Presse
                    onPress={() => setEdition(false)}
                    libelleAccessible="Terminer la réorganisation"
                    style={[styles.simuler, { backgroundColor: c.accent }]}>
                    <Texte variante="petit" style={{ color: c.surAccent, fontFamily: police.fort }}>
                      OK
                    </Texte>
                  </Presse>
                ) : (
                  <BoutonRond libelle={affichage === 'familles' ? 'Réorganiser les familles' : 'Réorganiser les matières'} onPress={() => setEdition(true)}>
                    <IconeCrayon />
                  </BoutonRond>
                )}
              </Bascule>
            }>
            <Segments
              libelle="Affichage des matières"
              options={[
                { cle: 'liste' as const, libelle: 'Liste' },
                { cle: 'familles' as const, libelle: 'Par famille' },
                { cle: 'notes' as const, libelle: 'Par note' },
              ]}
              valeur={affichage}
              onChange={changerAffichage}
            />
            {/* Changer d'affichage ou de tri rejoue l'entrée : le contenu arrive en fondu. */}
            <Entree key={affichage === 'notes' ? `notes-${tri}` : affichage}>
              {affichage === 'liste' ? (
                edition ? (
                  <ListeTriable
                    items={matieres}
                    cle={(l) => l.matiere.code}
                    nom={(l) => l.matiere.libelle}
                    onOrdre={ordonnerMatieres}
                    rendu={(l, poignee) => (
                      <LigneMatiereListe l={l} rang={0} tendance={tendances[l.matiere.code] ?? []} dernier onPress={() => undefined} poignee={poignee} />
                    )}
                  />
                ) : (
                  <View>
                    {matieres.map((l, i) => (
                      <LigneMatiereListe
                        key={l.matiere.code}
                        l={l}
                        rang={i}
                        tendance={tendances[l.matiere.code] ?? []}
                        reelle={reellesMatieres ? { valeur: reellesMatieres.get(l.matiere.code) } : undefined}
                        dernier={i === matieres.length - 1}
                        onPress={() => ouvrir(l.matiere.code)}
                      />
                    ))}
                  </View>
                )
              ) : affichage === 'familles' ? (
                <ParFamille vue={vue} matieres={matieres} ordre={ordreFamilles} onPress={ouvrir} edition={edition} onDeplacer={deplacerFamille} />
              ) : (
                <ParNote
                  vue={vue}
                  matieres={matieres}
                  tri={tri}
                  notes={instantaneVu!.donnees.notes}
                  etaitSimulee={etaitSimulee}
                  onMatiere={ouvrir}
                  onNote={ouvrirNote}
                />
              )}
            </Entree>
            <Feuille visible={choixTri} onFermer={() => setChoixTri(false)} titre="Trier les notes">
              <View style={{ gap: 2 }}>
                {(Object.keys(TRIS) as Tri[]).map((t) => (
                  <Presse
                    key={t}
                    onPress={() => changerTri(t)}
                    role="radio"
                    selectionne={t === tri}
                    libelleAccessible={TRIS[t]}
                    style={[styles.optionTri, { backgroundColor: t === tri ? c.teinte100 : 'transparent' }]}>
                    <Texte variante="liste" style={{ color: t === tri ? c.accentEncre : c.texte, fontFamily: t === tri ? police.fort : undefined }}>
                      {TRIS[t]}
                    </Texte>
                  </Presse>
                ))}
              </View>
            </Feuille>
          </Section>
          <Texte variante="petit" attenue>
            Moyennes prévues par Coef à partir de tes notes. Client non officiel, non affilié à EcoleDirecte.
          </Texte>
        </>
      ) : null}
    </Ecran>
  );
}

/** Toutes les notes de la période, rangées par matière, de la plus récente à la plus ancienne. */
function ParNote({
  vue,
  matieres,
  tri,
  notes,
  etaitSimulee,
  onMatiere,
  onNote,
}: {
  vue: VueNotes;
  matieres: LigneMatiere[];
  tri: Tri;
  notes: Note[];
  etaitSimulee: Map<string, NoteHypothetique>;
  onMatiere: (code: string) => void;
  onNote: (id: string) => void;
}) {
  const c = useCouleurs();
  const parId = new Map(notes.map((n) => [n.id, n]));
  if (tri !== 'matiere') return <NotesTriees vue={vue} matieres={matieres} tri={tri} notes={notes} onNote={onNote} />;
  const groupes = matieres
    .map(({ matiere: m }) => ({
      m,
      lignes: [...m.notes, ...m.sousMatieres.flatMap((s) => s.notes)].map((d) => ({ d, n: parId.get(d.id)! })).sort((a, b) => b.n.date.localeCompare(a.n.date)),
    }))
    .filter((g) => g.lignes.length > 0);
  if (groupes.length === 0) {
    return (
      <Texte variante="liste" attenue>
        Aucune note pour l’instant dans cette période.
      </Texte>
    );
  }
  return (
    <View style={{ gap: espace.l }}>
      {groupes.map(({ m, lignes }, i) => (
        <Entree key={m.code} rang={i} style={{ gap: espace.xs }}>
          <Presse onPress={() => onMatiere(m.code)} libelleAccessible={`${m.libelle}, voir le détail`} style={styles.rangee}>
            <Texte variante="section" style={{ flex: 1 }} numberOfLines={1}>
              {m.libelle}
            </Texte>
            <Chiffre valeur={m.moyenne} couleur={c.accent} />
          </Presse>
          <Panneau>
            {lignes.map(({ d, n }, j) => {
              const simulee = n.id.startsWith('hypothese-');
              return (
                <Presse
                  key={n.id}
                  onPress={simulee ? undefined : () => onNote(n.id)}
                  style={[
                    styles.ligneNote,
                    {
                      borderBottomColor: c.filet,
                      borderBottomWidth: j === lignes.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    },
                    simulee ? { ...styles.simulee, borderColor: c.negatif } : {},
                  ]}>
                  {simulee ? <Hachures /> : null}
                  <View style={{ flex: 1 }}>
                    <Texte variante="liste" numberOfLines={1} style={simulee ? { color: c.negatif } : undefined}>
                      {simulee ? 'Note simulée' : n.devoir || 'Devoir'}
                    </Texte>
                    <Texte variante="petit" attenue numberOfLines={1}>
                      {jour(n.date)} · coef {coef(n.coef)}
                      {d.exclue ? ' · non comptée' : ''}
                      {etaitSimulee.has(n.id) ? ` · simulée ${coef(etaitSimulee.get(n.id)!.valeur)}/${etaitSimulee.get(n.id)!.noteSur}` : ''}
                    </Texte>
                  </View>
                  <Texte variante="liste" attenue={!!d.exclue} style={[styles.note, simulee ? { color: c.negatif } : undefined]}>
                    {brute(n.valeurBrute)}
                    <Texte variante="liste" attenue>
                      /{n.noteSur}
                    </Texte>
                  </Texte>
                </Presse>
              );
            })}
          </Panneau>
        </Entree>
      ))}
    </View>
  );
}

function IconeCourbes() {
  const c = useCouleurs();
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 4v16h16" />
      <Path d="M7 15l4-5 3 3 5-6" />
    </Svg>
  );
}

function IconeSimulation() {
  const c = useCouleurs();
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 20l5-6 4 3 7-9" />
      <Path d="M16 8h4v4" />
    </Svg>
  );
}

/** Une matière : bande de sa famille, mini-courbe de tendance ; simulée : sa moyenne réelle dessous. En réorganisation : la poignée. */
function LigneMatiereListe({
  l,
  rang,
  tendance,
  reelle,
  dernier,
  onPress,
  poignee,
}: {
  l: LigneMatiere;
  rang: number;
  tendance: number[];
  reelle?: { valeur?: number };
  dernier: boolean;
  onPress: () => void;
  /** En réorganisation : la ligne n'est plus un bouton, la poignée remplace la moyenne. */
  poignee?: ReactNode;
}) {
  const c = useCouleurs();
  const famille = useCouleurMatiere()(l.matiere.code, l.matiere.libelle);
  const m = l.matiere;
  const simulee = reelle !== undefined && reelle.valeur !== m.moyenne;
  const etat = m.moyenne === undefined ? 'pas de note' : `moyenne ${simulee ? 'simulée' : 'prévue'} ${moyenne(m.moyenne)}`;
  return (
    <Entree rang={rang}>
      {poignee ? (
        <View style={[styles.ligneMatiere, styles.ligneTenue, { backgroundColor: c.fond, borderBottomColor: c.filet }]}>
          <View style={[styles.bande, { backgroundColor: famille.trait }]} />
          <View style={{ flex: 1, gap: 2 }}>
            <Texte variante="liste" moyen numberOfLines={2}>
              {m.libelle}
            </Texte>
            <View style={styles.rangee}>
              <MiniCourbe points={tendance} couleur={famille.trait} />
              <Texte variante="petit" attenue>
                coef {coef(m.coef)}
              </Texte>
            </View>
          </View>
          {poignee}
        </View>
      ) : (
        <Presse
          onPress={onPress}
          libelleAccessible={`${m.libelle}, coefficient ${coef(m.coef)}, ${etat}${simulee && reelle.valeur !== undefined ? `, réelle ${moyenne(reelle.valeur)}` : ''}`}
          style={[styles.ligneMatiere, { borderBottomColor: c.filet, borderBottomWidth: dernier ? 0 : StyleSheet.hairlineWidth }]}>
          <View style={[styles.bande, { backgroundColor: famille.trait }]} />
          <View style={{ flex: 1, gap: 2 }}>
            <Texte variante="liste" moyen numberOfLines={2}>
              {m.libelle}
            </Texte>
            <View style={styles.rangee}>
              <MiniCourbe points={tendance} couleur={famille.trait} />
              <Texte variante="petit" attenue>
                coef {coef(m.coef)}
              </Texte>
            </View>
          </View>
          <View style={styles.colonne}>
            <Chiffre valeur={m.moyenne} couleur={simulee ? c.negatif : undefined} />
            {simulee ? (
              <Texte variante="petit" attenue style={{ fontVariant: ['tabular-nums'] }}>
                {reelle.valeur === undefined ? 'simulée' : `réelle ${moyenne(reelle.valeur)}`}
              </Texte>
            ) : null}
          </View>
        </Presse>
      )}
    </Entree>
  );
}

/** Affichage « par famille » (repris du style pastel) : une tuile teintée par famille, ses matières dedans. */
function ParFamille({
  vue,
  matieres,
  ordre,
  onPress,
  edition,
  onDeplacer,
}: {
  vue: VueNotes;
  matieres: LigneMatiere[];
  ordre: Famille[];
  onPress: (code: string) => void;
  edition: boolean;
  /** Nouvel ordre des familles visibles. */
  onDeplacer: (ordre: Famille[]) => void;
}) {
  const c = useCouleurs();
  const familles = useFamilles();
  const couleurMatiere = useCouleurMatiere();
  const nouvelles = new Set(vue.nouvelles.map((n) => n.matiereCode));
  const groupes = ordre
    .map((f) => ({
      f,
      lignes: matieres.filter((l) => familleDe(l.matiere.code, l.matiere.libelle) === f),
    }))
    .filter((g) => g.lignes.length > 0);
  if (edition) {
    // Repliées le temps de la réorganisation : des tuiles courtes se déplacent plus facilement.
    return (
      <ListeTriable
        items={groupes}
        cle={(g) => g.f}
        nom={(g) => NOM_FAMILLE[g.f]}
        gap={espace.s}
        onOrdre={(o) => onDeplacer(o as Famille[])}
        rendu={(g, poignee) => (
          <View style={[styles.famille, styles.rangee, { backgroundColor: familles[g.f].fond, paddingVertical: espace.s }]}>
            <Texte variante="section" style={{ flex: 1, color: familles[g.f].encre }}>
              {NOM_FAMILLE[g.f]}
            </Texte>
            <Texte variante="petit" style={{ color: familles[g.f].encre }}>
              {g.lignes.length} matière{g.lignes.length > 1 ? 's' : ''}
            </Texte>
            {poignee}
          </View>
        )}
      />
    );
  }
  return (
    <View style={{ gap: espace.m }}>
      {groupes.map(({ f, lignes }) => (
        <View key={f} style={[styles.famille, { backgroundColor: familles[f].fond }]}>
          <View style={styles.rangee}>
            <Texte variante="section" role="heading" aria-level={3} style={{ flex: 1, color: familles[f].encre }}>
              {NOM_FAMILLE[f]}
            </Texte>
          </View>
          {lignes.map(({ matiere: m }) => (
            <Presse
              key={m.code}
              onPress={() => onPress(m.code)}
              libelleAccessible={`${m.libelle}, ${m.moyenne === undefined ? 'pas de note' : `moyenne prévue ${moyenne(m.moyenne)}`}`}
              style={[styles.tuile, { backgroundColor: `${c.fond}b8` }]}>
              <Texte variante="liste" numberOfLines={2} style={{ flex: 1, color: couleurMatiere(m.code, m.libelle).encre }}>
                {m.libelle}
              </Texte>
              {nouvelles.has(m.code) ? <Pastille texte="nouvelle note" fond={c.fond} encre={couleurMatiere(m.code, m.libelle).encre} /> : null}
              <Chiffre valeur={m.moyenne} taillePx={16} couleur={couleurMatiere(m.code, m.libelle).encre} />
            </Presse>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Toutes les notes de la période en une liste, triées (récentes, meilleures, moins bonnes) ; la matière sous chaque note. */
function NotesTriees({
  vue,
  matieres,
  tri,
  notes,
  onNote,
}: {
  vue: VueNotes;
  matieres: LigneMatiere[];
  tri: Exclude<Tri, 'matiere'>;
  notes: Note[];
  onNote: (id: string) => void;
}) {
  const c = useCouleurs();
  const couleurMatiere = useCouleurMatiere();
  const ids = new Set(matieres.flatMap(({ matiere: m }) => [...m.notes, ...m.sousMatieres.flatMap((s) => s.notes)]).map((d) => d.id));
  const exclues = new Set(
    matieres
      .flatMap(({ matiere: m }) => [...m.notes, ...m.sousMatieres.flatMap((s) => s.notes)])
      .filter((d) => d.exclue)
      .map((d) => d.id),
  );
  const libelle = new Map(vue.matieres.map((l) => [l.matiere.code, l.matiere.libelle]));
  const liste = trierNotes(
    notes.filter((n) => ids.has(n.id)),
    tri,
  );
  if (liste.length === 0) {
    return (
      <Texte variante="liste" attenue>
        Aucune note pour l’instant dans cette période.
      </Texte>
    );
  }
  return (
    <Panneau>
      {liste.map((n, j) => {
        const simulee = n.id.startsWith('hypothese-');
        const nom = libelle.get(n.matiereCode) ?? n.matiereCode;
        return (
          <View key={n.id}>
            <Presse
              onPress={simulee ? undefined : () => onNote(n.id)}
              libelleAccessible={`${nom}, ${n.devoir || 'devoir'}, ${brute(n.valeurBrute)} sur ${n.noteSur}`}
              style={[styles.ligneNote, { borderBottomColor: c.filet, borderBottomWidth: j === liste.length - 1 ? 0 : StyleSheet.hairlineWidth }]}>
              <View style={[styles.bande, { backgroundColor: couleurMatiere(n.matiereCode, nom).trait }]} />
              <View style={{ flex: 1 }}>
                <Texte variante="liste" numberOfLines={1} style={simulee ? { color: c.negatif } : undefined}>
                  {simulee ? 'Note simulée' : n.devoir || 'Devoir'}
                </Texte>
                <Texte variante="petit" attenue numberOfLines={1}>
                  {nom} · {jour(n.date)} · coef {coef(n.coef)}
                  {exclues.has(n.id) ? ' · non comptée' : ''}
                </Texte>
              </View>
              <Texte variante="liste" attenue={exclues.has(n.id)} style={[styles.note, simulee ? { color: c.negatif } : undefined]}>
                {brute(n.valeurBrute)}
                <Texte variante="liste" attenue>
                  /{n.noteSur}
                </Texte>
              </Texte>
            </Presse>
          </View>
        );
      })}
    </Panneau>
  );
}

/** Le bouton à droite de « Matières » change (crayon, OK, tri) : bref fondu, à peine grossi. */
function Bascule({ children }: { children: ReactNode }) {
  const reduit = useReducedMotion();
  const p = useSharedValue(reduit ? 1 : 0);
  useEffect(() => {
    if (!reduit) p.set(withTiming(1, { duration: 160 }));
  }, [reduit, p]);
  const style = useAnimatedStyle(() => ({ opacity: p.get(), transform: [{ scale: 0.9 + 0.1 * p.get() }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function IconeCrayon() {
  const c = useCouleurs();
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" />
      <Path d="M13.5 6.5l4 4" />
    </Svg>
  );
}

function IconeTri() {
  const c = useCouleurs();
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7 4v16M3.5 16.5L7 20l3.5-3.5" />
      <Path d="M13 6h8M13 11h6M13 16h4" />
    </Svg>
  );
}

/** Rappel d'une simulation en cours : l'afficher ou non, la modifier. */
function BandeauSimulation({ n, active, onActiver, onModifier }: { n: number; active: boolean; onActiver: (v: boolean) => void; onModifier: () => void }) {
  const c = useCouleurs();
  return (
    <View
      style={[
        styles.bandeau,
        {
          borderColor: active ? c.negatif : c.bord,
          backgroundColor: c.surface,
        },
      ]}>
      <Presse onPress={onModifier} libelleAccessible={`${n} notes simulées. Modifier la simulation`} style={{ flex: 1 }}>
        <Texte variante="liste" moyen style={{ color: active ? c.negatif : c.texte }}>
          {n} note{n > 1 ? 's' : ''} simulée{n > 1 ? 's' : ''}
        </Texte>
        <Texte variante="petit" attenue>
          {active ? 'Moyennes simulées ci-dessous · modifier' : 'Masquée : moyennes réelles · modifier'}
        </Texte>
      </Presse>
      <Switch
        accessibilityLabel="Afficher la simulation"
        value={active}
        onValueChange={onActiver}
        trackColor={{ true: c.negatif, false: c.controle }}
        thumbColor={c.surface}
      />
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
  reelle,
  objectif,
  objectifAffiche,
  onModifierObjectif,
}: {
  vue?: VueNotes;
  /** Moyenne prévue sans la simulation, quand la simulation est affichée. */
  reelle?: number;
  /** Moyenne générale visée (simulateur, onglet Objectif). */
  objectif?: number;
  objectifAffiche: boolean;
  /** Toucher l'objectif : la simulation s'ouvre sur l'onglet Objectif. */
  onModifierObjectif: () => void;
  courbe: { date: string; moyenne: number }[];
  chargement: boolean;
  erreur?: unknown;
  synchro?: string;
  onReessayer: () => void;
}) {
  const c = useCouleurs();
  const [survol, setSurvol] = useState<number>();
  const [detailED, setDetailED] = useState(false);
  const pointSurvole = survol === undefined ? undefined : courbe[survol];
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

  const simule = reelle !== undefined;
  const classe = vue?.periode.classeGenerale?.moyenne;
  const reperes = [
    ...(classe !== undefined ? [{ valeur: classe, couleur: c.attenue, libelle: `classe ${moyenne(classe)}` }] : []),
    ...(objectif !== undefined && objectifAffiche ? [{ valeur: objectif, couleur: c.objectif, libelle: `objectif ${moyenne(objectif)}` }] : []),
  ];
  const teinte = simule ? c.negatif : c.accent;

  return (
    <Panneau
      teinte={!simule}
      style={{
        paddingVertical: espace.xl,
        gap: espace.m,
        overflow: 'hidden',
        ...(simule ? { borderColor: c.negatif, borderStyle: 'dashed', borderWidth: 1.5, borderRadius: rayon.phare } : {}),
      }}>
      {simule ? <Hachures opacite={0.08} /> : null}
      <View style={styles.rangee}>
        <Texte variante="liste" style={{ flex: 1, color: simule ? c.negatif : c.accentEncre }}>
          Moyenne générale {reelle !== undefined ? 'simulée' : 'prévue'}
        </Texte>
        {reelle !== undefined ? (
          <Pastille texte="Simulation" fond={c.surface} encre={c.negatif} />
        ) : cal && cal.comparees > 0 ? (
          <Presse
            onPress={() => setDetailED(true)}
            libelleAccessible={cal.verifie ? 'Calcul vérifié avec EcoleDirecte. Voir le détail' : 'Calcul différent d’EcoleDirecte. Voir le détail'}>
            <Pastille
              texte={
                cal.verifie
                  ? 'Calcul vérifié ›'
                  : `${cal.ecarts.filter((e) => e.ecart >= 0.005).length} écart${cal.ecarts.filter((e) => e.ecart >= 0.005).length > 1 ? 's' : ''} avec ED ›`
              }
              fond={cal.verifie ? undefined : c.surface}
              encre={cal.verifie ? undefined : c.negatif}
            />
          </Presse>
        ) : null}
      </View>
      {vue ? (
        <Anneau
          valeur={pointSurvole?.moyenne ?? g}
          couleur={teinte}
          fond={simule ? c.surface : c.teinte50}
          reperes={reperes}
          libelle={`Moyenne générale ${simule ? 'simulée' : 'prévue'} ${g === undefined ? 'absente' : `${moyenne(g)} sur 20`}${reperes.map((x) => `, ${x.libelle}`).join('')}`}>
          <ChiffreAnime valeur={pointSurvole?.moyenne ?? g} taillePx={taille.phare} couleur={teinte} />
          <Texte variante="petit" attenue style={{ fontVariant: ['tabular-nums'] }}>
            {pointSurvole ? `au ${jour(pointSurvole.date)}` : simule ? `réelle ${moyenne(reelle)}` : 'sur 20'}
          </Texte>
        </Anneau>
      ) : (
        <Squelette largeur={184} hauteur={184} style={{ alignSelf: 'center' }} />
      )}
      {g !== undefined ? (
        <Echelle
          min={0}
          max={20}
          pas={5}
          sousPas={1}
          marques={[
            { valeur: g, couleur: teinte, texte: `${simule ? 'simulée' : 'toi'} ${moyenne(g)}`, forme: 'point' },
            ...(simule && reelle !== g
              ? [{ valeur: reelle, couleur: c.attenue, texte: `réelle ${moyenne(reelle)}`, forme: 'trait' as const, cote: 'haut' as const }]
              : []),
            ...reperes.map((x) => ({ valeur: x.valeur, couleur: x.couleur, texte: x.libelle, forme: 'trait' as const })),
          ]}
          libelle={`Zoom : moyenne ${moyenne(g)}${reperes.map((x) => `, ${x.libelle}`).join('')}`}
        />
      ) : null}
      {/* L'objectif se règle et s'affiche ou se masque dans Simulation, onglet Objectif : masqué, il n'apparaît nulle part ici. */}
      {objectif !== undefined && objectifAffiche ? (
        <Presse
          onPress={onModifierObjectif}
          libelleAccessible={`Objectif ${moyenne(objectif)}. Modifier dans la simulation`}
          style={[styles.rangee, { minHeight: 44 }]}>
          <View style={[styles.pointObjectif, { backgroundColor: c.objectif }]} />
          <Texte variante="petit" style={{ flex: 1, color: c.objectif, fontFamily: police.fort, fontVariant: ['tabular-nums'] }}>
            Objectif {moyenne(objectif)}
            {g !== undefined ? ` · ${g >= objectif ? 'atteint' : `il manque ${moyenne(objectif - g)}`}` : ''}
          </Texte>
        </Presse>
      ) : null}
      {reelle !== undefined && g !== undefined ? <Ecart valeur={g - reelle} suffixe={`par rapport à ta moyenne prévue (${moyenne(reelle)})`} /> : null}
      {vue?.ecart !== undefined && vue.depuis ? <Ecart valeur={vue.ecart} suffixe={`depuis la synchro du ${jour(vue.depuis)}`} /> : null}
      {courbe.length > 1 ? (
        <View style={{ gap: espace.xs }}>
          <Courbe
            couleur={teinte}
            points={courbe.map((p) => p.moyenne)}
            onSurvol={setSurvol}
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
      {cal ? <ComparaisonED visible={detailED} onFermer={() => setDetailED(false)} vue={vue!} /> : null}
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

/** Le détail derrière « Calcul vérifié » : chaque moyenne ED comparée au calcul de Coef, les écarts d'abord. */
function ComparaisonED({ visible, onFermer, vue }: { visible: boolean; onFermer: () => void; vue: VueNotes }) {
  const c = useCouleurs();
  const cal = vue.calibration;
  const ecarts = [...cal.ecarts].sort((a, b) => b.ecart - a.ecart);
  const calcul = vue.periode.dateCalcul;
  return (
    <Feuille visible={visible} onFermer={onFermer} titre={cal.verifie ? 'Calcul vérifié' : 'Écarts avec EcoleDirecte'}>
      <Texte variante="petit" attenue>
        EcoleDirecte recalcule ses moyennes une fois par nuit{calcul ? ` (dernier calcul le ${jour(calcul)})` : ''}. Coef refait ce calcul avec les mêmes notes,
        sans celles saisies depuis, et compare au centième près.
        {cal.verifie
          ? ' Tout tombe juste : la moyenne prévue suit la règle de ton établissement.'
          : ' Une différence persistante veut dire qu’ED applique une règle que Coef ne connaît pas encore.'}
      </Texte>
      <View style={{ maxHeight: 380 }}>
        <Animated.ScrollView contentContainerStyle={{ paddingBottom: espace.m }}>
          {ecarts.map((e, i) => (
            <View key={i} style={[styles.ligneED, { borderBottomColor: c.filet, borderBottomWidth: i === ecarts.length - 1 ? 0 : StyleSheet.hairlineWidth }]}>
              <Texte variante="liste" numberOfLines={2} style={{ flex: 1 }}>
                {e.libelle}
              </Texte>
              <Texte variante="petit" attenue style={{ fontVariant: ['tabular-nums'] }}>
                Coef {e.prevue === undefined ? '—' : moyenne(e.prevue)} · ED {moyenne(e.officielle)}
              </Texte>
              <Pastille
                texte={e.ecart < 0.005 ? 'juste' : Number.isFinite(e.ecart) ? `écart ${moyenne(e.ecart)}` : 'absente'}
                fond={e.ecart < 0.005 ? undefined : c.surface}
                encre={e.ecart < 0.005 ? undefined : c.negatif}
              />
            </View>
          ))}
        </Animated.ScrollView>
      </View>
    </Feuille>
  );
}

const styles = StyleSheet.create({
  simuler: { minHeight: 44, borderRadius: 22, paddingHorizontal: espace.m, flexDirection: 'row', alignItems: 'center', gap: 6 },
  optionTri: { minHeight: 52, borderRadius: 14, paddingHorizontal: espace.m, justifyContent: 'center' },
  ligneTenue: { borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingRight: 0 },
  ligneED: { flexDirection: 'row', alignItems: 'center', gap: espace.s, minHeight: 52, paddingVertical: espace.s },
  bande: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  simulee: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, paddingHorizontal: espace.s, marginVertical: 2, overflow: 'hidden' },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
  pointObjectif: { width: 8, height: 8, borderRadius: 4 },
  attente: { width: 184, height: 184, borderRadius: 92, alignSelf: 'center' },
  colonne: { minWidth: 64, alignItems: 'flex-end', gap: 2 },
  note: { fontFamily: police.fort, fontVariant: ['tabular-nums'] },
  carteNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    paddingHorizontal: 14,
    paddingVertical: espace.m,
    borderRadius: 14,
    borderWidth: 1,
  },
  ligneMatiere: { flexDirection: 'row', alignItems: 'center', paddingVertical: espace.m, gap: espace.m },
  famille: { borderRadius: rayon.phare, padding: espace.l, gap: espace.s },
  ligneNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    minHeight: 52,
    paddingVertical: espace.s,
  },
  bandeau: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    paddingHorizontal: espace.m,
    paddingVertical: espace.s,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  tuile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    paddingHorizontal: espace.m,
    paddingVertical: 10,
    borderRadius: 12,
  },
});
