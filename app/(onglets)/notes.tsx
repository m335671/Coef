// Écran des notes, la vitrine. Sa question : « Où en est ma moyenne ce trimestre, et qu'est-ce qui l'a fait bouger ? »
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { ErreurED } from '@/api/ecoledirecte/erreurs';
import { MODE_DEMO } from '@/demo';
import { avecHypotheses, type NoteHypothetique } from '@/domain/moyennes/simulateur';
import type { Note, Periode } from '@/domain/types';
import { useEleveActif, useEleves } from '@/features/compte/eleves';
import { familleDe, NOM_FAMILLE, ORDRE_FAMILLES } from '@/features/notes/familles';
import { cleSimulation, useSimulation } from '@/features/notes/simulation';
import { useNotes } from '@/features/notes/store';
import { evolution, evolutionsMatieres, type LigneMatiere, periodeParDefaut, periodesAffichees, type VueNotes, vueNotes } from '@/features/notes/vue';
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
import { Anneau, Hachures, MiniCourbe } from '@/ui/graphiques';
import Svg, { Path } from 'react-native-svg';

import { espace, police, rayon, taille, useCouleurs, useFamilles } from '@/ui/theme';

type Affichage = 'liste' | 'familles' | 'notes';
const PREF_AFFICHAGE = 'notes.affichage';
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
  const simulation = useSimulation();
  useEffect(() => void simulation.charger(), [simulation.charger]); // eslint-disable-line react-hooks/exhaustive-deps
  const simulees = (periode && simulation.notes[cleSimulation(eleveId, periode)]) || AUCUNE;
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
    <Ecran>
      <EnTete
        titre="Notes"
        action={
          <View style={{ flexDirection: 'row', gap: espace.s }}>
            {vue ? (
              <BoutonRond libelle="Simulation" onPress={ouvrirSimulation}>
                <IconeSimulation />
              </BoutonRond>
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
          courbe={courbe}
          chargement={etat?.chargement ?? true}
          erreur={etat?.erreur}
          synchro={instantane?.synchro}
          onReessayer={() => charger(eleveId, true)}
        />
      </Entree>
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
          <Section titre="Matières" aide={`${vue.periode.libelle} · moyennes ${simule ? 'simulées' : 'prévues'}`} rang={5}>
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
            {affichage === 'liste' ? (
              <View>
                {vue.matieres.map((l, i) => (
                  <LigneMatiereListe
                    key={l.matiere.code}
                    l={l}
                    rang={6 + i}
                    tendance={tendances[l.matiere.code] ?? []}
                    reelle={reellesMatieres ? { valeur: reellesMatieres.get(l.matiere.code) } : undefined}
                    dernier={i === vue.matieres.length - 1}
                    onPress={() => ouvrir(l.matiere.code)}
                  />
                ))}
              </View>
            ) : affichage === 'familles' ? (
              <ParFamille vue={vue} onPress={ouvrir} />
            ) : (
              <ParNote vue={vue} notes={instantaneVu!.donnees.notes} onMatiere={ouvrir} onNote={ouvrirNote} />
            )}
          </Section>
          <Texte variante="petit" attenue>
            Moyennes prévues par Coef à partir de tes notes. Client non officiel, non affilié à EcoleDirecte.
          </Texte>
        </>
      ) : null}
    </Ecran>
  );
}

/** Périodes du menu, regroupées : trimestres et année, relevés, examens blancs. */
function groupesPeriodes(periodes: Periode[]) {
  const de = (types: Periode['type'][]) =>
    periodes
      .filter((p) => types.includes(p.type))
      .map((p) => ({
        cle: p.code,
        libelle: p.libelle,
        aide: `${jour(p.debut)} – ${jour(p.fin)}`,
      }));
  return [
    { titre: 'Trimestres', options: de(['trimestre', 'annee']) },
    { titre: 'Relevés', options: de(['releve']) },
    { titre: 'Examens blancs', options: de(['examen']) },
  ].filter((g) => g.options.length > 0);
}

/** Toutes les notes de la période, rangées par matière, de la plus récente à la plus ancienne. */
function ParNote({ vue, notes, onMatiere, onNote }: { vue: VueNotes; notes: Note[]; onMatiere: (code: string) => void; onNote: (id: string) => void }) {
  const c = useCouleurs();
  const parId = new Map(notes.map((n) => [n.id, n]));
  const groupes = vue.matieres
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
        <Entree key={m.code} rang={6 + i} style={{ gap: espace.xs }}>
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

function IconeSimulation() {
  const c = useCouleurs();
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 20l5-6 4 3 7-9" />
      <Path d="M16 8h4v4" />
    </Svg>
  );
}

/** Une matière : bande de sa famille, mini-courbe de tendance, variation à sa dernière note ; simulée : sa moyenne réelle dessous. */
function LigneMatiereListe({
  l,
  rang,
  tendance,
  reelle,
  dernier,
  onPress,
}: {
  l: LigneMatiere;
  rang: number;
  tendance: number[];
  reelle?: { valeur?: number };
  dernier: boolean;
  onPress: () => void;
}) {
  const c = useCouleurs();
  const famille = useFamilles()[familleDe(l.matiere.code, l.matiere.libelle)];
  const m = l.matiere;
  const simulee = reelle !== undefined && reelle.valeur !== m.moyenne;
  const variation = tendance.length > 1 ? tendance.at(-1)! - tendance.at(-2)! : undefined;
  const etat = m.moyenne === undefined ? 'pas de note' : `moyenne ${simulee ? 'simulée' : 'prévue'} ${moyenne(m.moyenne)}`;
  return (
    <Entree rang={rang}>
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
          ) : variation !== undefined ? (
            <Ecart valeur={variation} />
          ) : null}
        </View>
      </Presse>
    </Entree>
  );
}

/** Affichage « par famille » (repris du style pastel) : une tuile teintée par famille, ses matières dedans. */
function ParFamille({ vue, onPress }: { vue: VueNotes; onPress: (code: string) => void }) {
  const c = useCouleurs();
  const familles = useFamilles();
  const nouvelles = new Set(vue.nouvelles.map((n) => n.matiereCode));
  const groupes = ORDRE_FAMILLES.map((f) => ({
    f,
    lignes: vue.matieres.filter((l) => familleDe(l.matiere.code, l.matiere.libelle) === f),
  })).filter((g) => g.lignes.length > 0);
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
}: {
  vue?: VueNotes;
  /** Moyenne prévue sans la simulation, quand la simulation est affichée. */
  reelle?: number;
  /** Moyenne générale visée (simulateur, onglet Objectif). */
  objectif?: number;
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

  const simule = reelle !== undefined;
  const classe = vue?.periode.classeGenerale?.moyenne;
  const reperes = [
    ...(classe !== undefined ? [{ valeur: classe, couleur: c.attenue, libelle: `classe ${moyenne(classe)}` }] : []),
    ...(objectif !== undefined ? [{ valeur: objectif, couleur: c.texte, libelle: `objectif ${moyenne(objectif)}` }] : []),
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
        ) : cal?.verifie ? (
          <Pastille texte="Calcul vérifié" />
        ) : cal && cal.comparees > 0 ? (
          <Pastille texte={`Écart ${moyenne(cal.ecartMax)} avec ED`} />
        ) : null}
      </View>
      {vue ? (
        <Anneau
          valeur={g}
          couleur={teinte}
          fond={simule ? c.surface : c.teinte50}
          reperes={reperes}
          libelle={`Moyenne générale ${simule ? 'simulée' : 'prévue'} ${g === undefined ? 'absente' : `${moyenne(g)} sur 20`}${reperes.map((x) => `, ${x.libelle}`).join('')}`}>
          <ChiffreAnime valeur={g} taillePx={taille.phare} couleur={teinte} />
          <Texte variante="petit" attenue style={{ fontVariant: ['tabular-nums'] }}>
            {simule ? `réelle ${moyenne(reelle)}` : 'sur 20'}
          </Texte>
        </Anneau>
      ) : (
        <View style={[styles.attente, { backgroundColor: c.teinte100 }]} />
      )}
      {reperes.length > 0 ? (
        <View style={styles.legende} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {reperes.map((x) => (
            <View key={x.libelle} style={styles.rangee}>
              <View style={[styles.marque, { backgroundColor: x.couleur }]} />
              <Texte variante="petit" attenue style={{ fontVariant: ['tabular-nums'] }}>
                {x.libelle}
              </Texte>
            </View>
          ))}
        </View>
      ) : null}
      {reelle !== undefined && g !== undefined ? <Ecart valeur={g - reelle} suffixe={`par rapport à ta moyenne prévue (${moyenne(reelle)})`} /> : null}
      {vue?.ecart !== undefined && vue.depuis ? <Ecart valeur={vue.ecart} suffixe={`depuis la synchro du ${jour(vue.depuis)}`} /> : null}
      {courbe.length > 1 ? (
        <View style={{ gap: espace.xs }}>
          <Courbe
            couleur={teinte}
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
  legende: { flexDirection: 'row', justifyContent: 'center', gap: espace.l },
  marque: { width: 4, height: 12, borderRadius: 2 },
  bande: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  simulee: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, paddingHorizontal: espace.s, marginVertical: 2, overflow: 'hidden' },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
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
