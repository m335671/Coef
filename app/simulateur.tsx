// Simulation. Un accueil (moyenne prévue, objectif, simulations actives) et trois actions : ajouter une note,
// modifier ses notes, calculer la note nécessaire. Tout part de la moyenne PRÉVUE (calcul officiel vérifié + notes
// qu'ED n'a pas encore comptées). Chaque changement est enregistré tout seul sur le téléphone.
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { Alert, BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { leviers } from '@/domain/moyennes/impact';
import { calculer, lireNote, notesDeLaPeriode } from '@/domain/moyennes/moteur';
import { avecHypotheses, noteNecessaire, type NoteHypothetique, type Retouche } from '@/domain/moyennes/simulateur';
import type { Note } from '@/domain/types';
import { cleSimulation, useSimulation } from '@/features/notes/simulation';
import { useNotes } from '@/features/notes/store';
import {
  Bouton,
  BoutonRond,
  Champ,
  ChiffreAnime,
  Coche,
  Curseur,
  Deroulant,
  Ecart,
  Ecran,
  EnTete,
  Entree,
  Feuille,
  Ligne,
  Panneau,
  Presse,
  Section,
  Segments,
  Texte,
} from '@/ui/composants';
import { brute, coef as formatCoef, jour, moyenne } from '@/ui/format';
import { espace, police, rayon, taille, useCouleurs } from '@/ui/theme';

const POIDS = [0.5, 1, 2, 3, 4];
const AUCUNE: NoteHypothetique[] = [];
const AUCUNE_RETOUCHE: Retouche[] = [];
const AUCUN_CODE: string[] = [];
type Vue = 'accueil' | 'ajouter' | 'modifier' | 'calcul';

/** Écart signé à deux décimales : « +0,21 », « −0,07 ». */
const signe = (v: number) => `${v < 0 ? '−' : '+'}${moyenne(Math.abs(v))}`;
/** Une valeur de note sans zéros inutiles : 16, 16,5, 16,25. */
const valeur = (v: number) => formatCoef(v);

export default function Simulation() {
  const c = useCouleurs();
  const params = useLocalSearchParams<{
    periode: string;
    eleve: string;
    code?: string;
    onglet?: string;
  }>();
  const d = useNotes((s) => s.eleves[params.eleve]?.instantane?.donnees);
  const p = d?.periodes.find((x) => x.code === params.periode);

  const [vue, setVue] = useState<Vue>(params.code ? 'ajouter' : 'accueil');
  const [detail, setDetail] = useState(false);
  const cle = cleSimulation(params.eleve, params.periode);
  const hypotheses = useSimulation((s) => s.notes[cle]) ?? AUCUNE;
  const retouches = useSimulation((s) => s.retouches?.[cle]) ?? AUCUNE_RETOUCHE;
  const ignorees = useSimulation((s) => s.matieresIgnorees?.[cle]) ?? AUCUN_CODE;
  const { definir, retoucher, ignorerMatieres, toutRetirer, charger, viser, activer, afficherObjectif, afficherExtremes, active } = useSimulation();
  const extremesAffiches = useSimulation((s) => s.extremesAffiches ?? false);
  const objectif = useSimulation((s) => s.objectif) ?? 14;
  const objectifAffiche = useSimulation((s) => s.objectifAffiche ?? s.objectif !== undefined);
  const arrivees = (useSimulation((s) => s.remplacees) ?? []).filter((r) => r.cle === cle);
  const setHypotheses = (h: NoteHypothetique[]) => definir(cle, h);
  useEffect(() => void charger(), [charger]);

  // Retour Android : d'une action vers l'accueil de la simulation, pas hors de l'écran.
  useEffect(() => {
    if (vue === 'accueil') return;
    const s = BackHandler.addEventListener('hardwareBackPress', () => {
      setVue('accueil');
      return true;
    });
    return () => s.remove();
  }, [vue]);

  const fermer = (
    <BoutonRond libelle="Fermer la simulation" onPress={() => router.back()}>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={2.2} strokeLinecap="round">
        <Path d="M6 6l12 12M18 6L6 18" />
      </Svg>
    </BoutonRond>
  );
  if (!d || !p) {
    return (
      <Ecran>
        <EnTete titre="Simulation" action={fermer} />
        <Texte>Synchronise d’abord tes notes.</Texte>
      </Ecran>
    );
  }

  const options = { parametrage: d.parametrage };
  const generaleAvec = (h: NoteHypothetique[], r: Retouche[], i: readonly string[]) => calculer(p, avecHypotheses(p, d.notes, h, r, i), d.periodes, options).generale;
  const avant = calculer(p, d.notes, d.periodes, options);
  const notesSimulees = avecHypotheses(p, d.notes, hypotheses, retouches, ignorees);
  const apres = calculer(p, notesSimulees, d.periodes, options);
  const libelle = (code: string) => p.matieres.find((m) => m.code === code && !m.sousCode)?.libelle ?? code;
  const actives = hypotheses.length + retouches.length + ignorees.length;
  /** Ce qu'un changement apporte à la générale : la générale avec tout, moins la générale sans lui. */
  const effet = (sans: number | undefined) => (apres.generale !== undefined && sans !== undefined ? apres.generale - sans : undefined);
  const ajouterPlusieurs = (h: NoteHypothetique[]) => {
    setHypotheses([...hypotheses, ...h]);
    setVue('accueil');
  };
  const ajouter = (h: NoteHypothetique) => ajouterPlusieurs([h]);

  const retour = (titre: string) => (
    <Entree style={styles.entete}>
      <BoutonRond libelle="Retour à la simulation" onPress={() => setVue('accueil')}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M15 18l-6-6 6-6" />
        </Svg>
      </BoutonRond>
      <Texte variante="titre" role="heading" aria-level={1} numberOfLines={1} style={{ flex: 1 }}>
        {titre}
      </Texte>
    </Entree>
  );

  if (vue === 'ajouter') {
    return (
      <Ecran>
        {retour('Ajouter une note')}
        <Ajouter
          matieres={apres.matieres.map((m) => ({
            code: m.code,
            libelle: m.libelle,
            moyenne: m.moyenne,
          }))}
          depart={params.code}
          generale={apres.generale}
          apresAjout={(h) => {
            const r = calculer(p, avecHypotheses(p, d.notes, [...hypotheses, h], retouches, ignorees), d.periodes, options);
            return {
              generale: r.generale,
              matiere: r.matieres.find((m) => m.code === h.matiereCode)?.moyenne,
            };
          }}
          onAjouter={ajouter}
        />
      </Ecran>
    );
  }
  if (vue === 'modifier') {
    return (
      <Ecran>
        {retour('Modifier mes notes')}
        <MesNotes
          notes={notesDeLaPeriode(p, d.notes, d.periodes)}
          libelle={libelle}
          retouches={retouches}
          onChange={(r) => retoucher(cle, r)}
          ignorees={ignorees}
          onIgnorer={(codes) => ignorerMatieres(cle, codes)}
        />
      </Ecran>
    );
  }
  if (vue === 'calcul') {
    return (
      <Ecran>
        {retour('Note nécessaire')}
        <Calcul
          objectif={objectif}
          onViser={viser}
          generale={apres.generale}
          matieres={apres.matieres
            .filter((m) => m.coef > 0)
            .map((m) => ({
              code: m.code,
              libelle: m.libelle,
              moyenne: m.moyenne,
            }))}
          depart={params.code}
          leviersPour={(sur, poids, nombre) =>
            leviers(p, notesSimulees, d.periodes, objectif, options, {
              noteSur: sur,
              coef: poids,
              nombre,
            })
          }
          notePourMatiere={(code, sur, poids, nombre, vise) =>
            noteNecessaire(p, notesSimulees, d.periodes, { matiereCode: code, noteSur: sur, coef: poids }, { portee: 'matiere', code }, vise, options, nombre)
          }
          onEssayer={(code, note, sur, poids, nombre) =>
            ajouterPlusieurs(
              Array.from({ length: nombre }, () => ({
                matiereCode: code,
                valeur: note,
                noteSur: sur,
                coef: poids,
              })),
            )
          }
        />
      </Ecran>
    );
  }

  return (
    <Ecran>
      <EnTete titre="Simulation" action={fermer} />
      <Entree rang={1}>
        <Panneau teinte style={{ paddingVertical: espace.l, gap: espace.s }}>
          <Texte variante="liste" style={{ color: c.accentEncre }}>
            Moyenne générale prévue
          </Texte>
          <View style={styles.phare}>
            {actives > 0 ? (
              <Texte variante="section" attenue style={{ fontVariant: ['tabular-nums'] }}>
                {avant.generale === undefined ? '—' : moyenne(avant.generale)} →
              </Texte>
            ) : null}
            <ChiffreAnime valeur={apres.generale} taillePx={taille.phare} couleur={c.accent} />
          </View>
          {actives > 0 && apres.generale !== undefined && avant.generale !== undefined ? (
            <Ecart valeur={apres.generale - avant.generale} suffixe="avec la simulation" />
          ) : null}
          <View style={[styles.objectif, { borderTopColor: c.teinte100 }]}>
            <ReglageObjectif objectif={objectif} generale={apres.generale} onViser={viser} />
          </View>
        </Panneau>
      </Entree>

      <Entree rang={2}>
        {actives > 0 ? (
          <Presse
            onPress={() => setDetail(true)}
            libelleAccessible={`${actives} simulation${actives > 1 ? 's' : ''} active${actives > 1 ? 's' : ''}. Afficher le détail`}
            style={[styles.bandeau, { backgroundColor: c.surface, borderColor: c.bord }]}>
            <View style={[styles.point, { backgroundColor: c.negatif }]} />
            <Texte variante="liste" moyen style={{ flex: 1 }}>
              {actives} simulation{actives > 1 ? 's' : ''} active
              {actives > 1 ? 's' : ''}
            </Texte>
            <Texte variante="petit" style={{ color: c.accent, fontFamily: police.fort }}>
              Afficher le détail ›
            </Texte>
          </Presse>
        ) : (
          <Texte variante="petit" attenue>
            Aucune simulation active : la moyenne affichée est celle de tes vraies notes.
          </Texte>
        )}
      </Entree>

      <Entree rang={3} style={{ gap: espace.s }}>
        <Action
          titre="Ajouter une note"
          description="Note hypothétique dans une matière, avec son barème, son poids et un titre facultatif. Elle entre dans les moyennes simulées."
          onPress={() => setVue('ajouter')}
          icone={<Path d="M12 5v14M5 12h14" stroke={c.negatif} />}
        />
        <Action
          titre="Modifier mes notes"
          description="Changer la valeur d’une note reçue, l’exclure du calcul, ou exclure une matière de la générale. Les notes EcoleDirecte ne changent pas."
          onPress={() => setVue('modifier')}
          icone={<Path d="M4 20h4L19 9l-4-4L4 16z" stroke={c.accent} strokeLinejoin="round" />}
        />
        <Action
          titre="Calculer la note nécessaire"
          description="Note à obtenir au prochain devoir pour atteindre l’objectif ou une moyenne de matière, selon le barème et le poids. Matières classées de la plus accessible à la moins accessible."
          onPress={() => setVue('calcul')}
          icone={
            <>
              <Circle cx={12} cy={12} r={8} stroke={c.objectif} />
              <Circle cx={12} cy={12} r={3.5} stroke={c.objectif} />
            </>
          }
        />
      </Entree>

      <Section
        titre="Afficher sur l’écran Notes"
        aide="Les notes simulées changent les moyennes affichées (en orange). L’objectif et la classe ne sont que des repères."
        rang={4}>
        <Panneau style={{ paddingVertical: espace.xs }}>
          <Coche libelle="Les notes simulées" coche={active} onChange={activer} couleur={c.negatif} />
          <Coche
            libelle={`L’objectif (${moyenne(objectif)})`}
            coche={objectifAffiche}
            onChange={(v) => {
              if (v && useSimulation.getState().objectif === undefined) viser(objectif);
              afficherObjectif(v);
            }}
            couleur={c.objectif}
          />
          <Coche libelle="La plus basse et la plus haute de la classe" coche={extremesAffiches} onChange={afficherExtremes} couleur={c.texte} />
        </Panneau>
      </Section>
      <Texte variante="petit" attenue>
        Enregistré sur ce téléphone, dans la base chiffrée, jamais envoyé à EcoleDirecte. Quand la vraie note arrive dans une matière, elle remplace la note ajoutée.
      </Texte>

      <Feuille visible={detail} onFermer={() => setDetail(false)} titre="Simulations actives">
        <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: espace.m }}>
          {hypotheses.length > 0 ? (
            <Groupe titre="Notes ajoutées">
              {hypotheses.map((h, j) => (
                <Changement
                  key={`h${j}`}
                  dernier={j === hypotheses.length - 1}
                  titre={h.titre?.trim() || 'Note sans titre'}
                  sous={`${libelle(h.matiereCode)} · ${valeur(h.valeur)}/${h.noteSur} · ×${formatCoef(h.coef)}`}
                  effet={effet(
                    generaleAvec(
                      hypotheses.filter((_, k) => k !== j),
                      retouches,
                      ignorees,
                    ),
                  )}
                  retirer={`Supprimer la note ${h.titre?.trim() || `de ${libelle(h.matiereCode)}`}`}
                  onRetirer={() => setHypotheses(hypotheses.filter((_, k) => k !== j))}
                />
              ))}
            </Groupe>
          ) : null}
          {retouches.length > 0 ? (
            <Groupe titre="Notes modifiées">
              {retouches.map((r, j) => {
                const n = d.notes.find((x) => x.id === r.noteId);
                const quoi = [
                  r.valeur !== undefined && n ? `${brute(n.valeurBrute)} → ${valeur(r.valeur)}/${n.noteSur}` : '',
                  r.compte === false ? 'ne compte pas' : r.compte ? 'comptée' : '',
                ].filter(Boolean);
                return (
                  <Changement
                    key={r.noteId}
                    dernier={j === retouches.length - 1}
                    titre={n?.devoir || 'Devoir'}
                    sous={[n ? libelle(n.matiereCode) : '', ...quoi].filter(Boolean).join(' · ')}
                    effet={effet(
                      generaleAvec(
                        hypotheses,
                        retouches.filter((x) => x !== r),
                        ignorees,
                      ),
                    )}
                    retirer="Rétablir la vraie note"
                    onRetirer={() =>
                      retoucher(
                        cle,
                        retouches.filter((x) => x !== r),
                      )
                    }
                  />
                );
              })}
            </Groupe>
          ) : null}
          {ignorees.length > 0 ? (
            <Groupe titre="Matières exclues">
              {ignorees.map((code, j) => (
                <Changement
                  key={code}
                  dernier={j === ignorees.length - 1}
                  titre={libelle(code)}
                  sous="exclue de la moyenne générale"
                  effet={effet(
                    generaleAvec(
                      hypotheses,
                      retouches,
                      ignorees.filter((x) => x !== code),
                    ),
                  )}
                  retirer={`Remettre ${libelle(code)} dans la générale`}
                  onRetirer={() =>
                    ignorerMatieres(
                      cle,
                      ignorees.filter((x) => x !== code),
                    )
                  }
                />
              ))}
            </Groupe>
          ) : null}
          {arrivees.length > 0 ? (
            <Groupe titre="Arrivées depuis">
              {arrivees.slice(0, 8).map((r, i, l) => {
                const n = d.notes.find((x) => x.id === r.noteId);
                return (
                  <Changement
                    key={`${r.noteId}-${i}`}
                    dernier={i === l.length - 1}
                    titre={`${libelle(r.hypothese.matiereCode)} : ${n ? `${brute(n.valeurBrute)}/${n.noteSur}` : 'reçue'}`}
                    sous={`simulée ${valeur(r.hypothese.valeur)}/${r.hypothese.noteSur}, remplacée par la vraie note`}
                  />
                );
              })}
            </Groupe>
          ) : null}
        </ScrollView>
        {actives > 0 ? (
          <Bouton
            variante="danger"
            titre="Tout supprimer"
            onPress={() =>
              Alert.alert('Tout supprimer ?', 'Les notes ajoutées, les notes modifiées et les matières exclues sont retirées. L’objectif est conservé.', [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Supprimer',
                  style: 'destructive',
                  onPress: () => {
                    toutRetirer(cle);
                    setDetail(false);
                  },
                },
              ])
            }
          />
        ) : null}
      </Feuille>
    </Ecran>
  );
}

/** Objectif de moyenne générale réglable : − et + d'un quart de point, d'un point à l'appui long. */
function ReglageObjectif({ objectif, generale, onViser }: { objectif: number; generale?: number; onViser: (v: number) => void }) {
  const c = useCouleurs();
  const manque = generale === undefined ? undefined : objectif - generale;
  const regler = (pas: number) => onViser(Math.min(20, Math.max(0, Math.round((objectif + pas) * 4) / 4)));
  const violetPale = `${c.objectif}1a`;
  return (
    <View style={styles.rangee}>
      <Presse
        libelleAccessible="Baisser l’objectif d’un quart de point (appui long : d’un point)"
        onPress={() => regler(-0.25)}
        onLongPress={() => regler(-1)}
        style={[styles.pas, { borderColor: violetPale, backgroundColor: c.surface }]}>
        <Svg width={18} height={18} viewBox="0 0 24 24" stroke={c.objectif} strokeWidth={2.4} strokeLinecap="round">
          <Path d="M5 12h14" />
        </Svg>
      </Presse>
      <View style={{ flex: 1, alignItems: 'center' }} accessible accessibilityLabel={`Objectif de moyenne générale : ${moyenne(objectif)}`}>
        <Texte variante="petit" style={{ color: c.objectif, fontFamily: police.moyen }}>
          Objectif de moyenne générale
        </Texte>
        <Texte
          style={{
            fontFamily: police.gras,
            fontSize: taille.titre,
            color: c.objectif,
            fontVariant: ['tabular-nums'],
          }}>
          {moyenne(objectif)}
        </Texte>
        {manque !== undefined ? (
          <Texte variante="petit" attenue>
            {manque > 0 ? `il manque ${moyenne(manque)} point${manque >= 2 ? 's' : ''}` : 'atteint'}
          </Texte>
        ) : null}
      </View>
      <Presse
        libelleAccessible="Monter l’objectif d’un quart de point (appui long : d’un point)"
        onPress={() => regler(0.25)}
        onLongPress={() => regler(1)}
        style={[styles.pas, { borderColor: violetPale, backgroundColor: c.surface }]}>
        <Svg width={18} height={18} viewBox="0 0 24 24" stroke={c.objectif} strokeWidth={2.4} strokeLinecap="round">
          <Path d="M12 5v14M5 12h14" />
        </Svg>
      </Presse>
    </View>
  );
}

/** Carte d'action de l'accueil : icône, titre, description de ce que fait l'action. */
function Action({ titre, description, icone, onPress }: { titre: string; description: string; icone: ReactNode; onPress: () => void }) {
  const c = useCouleurs();
  return (
    <Presse onPress={onPress} libelleAccessible={`${titre}. ${description}`} style={[styles.action, { borderColor: c.bord, backgroundColor: c.surface }]}>
      <View style={[styles.icone, { backgroundColor: c.teinte50 }]}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round">
          {icone}
        </Svg>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Texte variante="liste" style={{ fontFamily: police.fort }}>
          {titre}
        </Texte>
        <Texte variante="petit" attenue>
          {description}
        </Texte>
      </View>
    </Presse>
  );
}

function Groupe({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <View style={{ gap: espace.xs }}>
      <Texte variante="petit" attenue style={{ fontFamily: police.fort }}>
        {titre}
      </Texte>
      <Panneau>{children}</Panneau>
    </View>
  );
}

/** Une ligne du détail : ce qui est simulé, son effet sur la générale, et de quoi le retirer. */
function Changement({
  titre,
  sous,
  effet,
  retirer,
  onRetirer,
  dernier,
}: {
  titre: string;
  sous: string;
  effet?: number;
  retirer?: string;
  onRetirer?: () => void;
  dernier: boolean;
}) {
  const c = useCouleurs();
  return (
    <Ligne dernier={dernier}>
      <View style={{ flex: 1 }}>
        <Texte variante="liste" moyen numberOfLines={1}>
          {titre}
        </Texte>
        <Texte variante="petit" attenue numberOfLines={2}>
          {sous}
        </Texte>
      </View>
      {effet !== undefined && Math.abs(effet) >= 0.005 ? (
        <Texte
          variante="petit"
          style={{
            fontVariant: ['tabular-nums'],
            color: effet > 0 ? c.positif : c.negatif,
            fontFamily: police.fort,
          }}>
          {signe(effet)}
        </Texte>
      ) : null}
      {onRetirer ? (
        <Presse libelleAccessible={retirer} onPress={onRetirer} style={styles.croix}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={c.attenue} strokeWidth={2.2} strokeLinecap="round">
            <Path d="M6 6l12 12M18 6L6 18" />
          </Svg>
        </Presse>
      ) : null}
    </Ligne>
  );
}

type Matiere = { code: string; libelle: string; moyenne?: number };

/** Ajouter une note : matière, titre facultatif, note, barème, poids ; l'effet se voit avant de valider. */
function Ajouter({
  matieres,
  depart,
  generale,
  apresAjout,
  onAjouter,
}: {
  matieres: Matiere[];
  depart?: string;
  generale?: number;
  apresAjout: (h: NoteHypothetique) => { generale?: number; matiere?: number };
  onAjouter: (h: NoteHypothetique) => void;
}) {
  const c = useCouleurs();
  const [code, setCode] = useState(matieres.some((m) => m.code === depart) ? depart! : matieres[0]?.code);
  const [titre, setTitre] = useState('');
  const [note, setNote] = useState(14);
  const [sur, setSur] = useState(20);
  const [poids, setPoids] = useState(1);
  const m = matieres.find((x) => x.code === code);
  if (!m) return null;
  const h: NoteHypothetique = {
    matiereCode: m.code,
    valeur: Math.min(note, sur),
    noteSur: sur,
    coef: poids,
    ...(titre.trim() ? { titre: titre.trim() } : {}),
  };
  const ensuite = apresAjout(h);
  const fleche = (a?: number, b?: number) => `${a === undefined ? '—' : moyenne(a)} → ${b === undefined ? '—' : moyenne(b)}`;
  return (
    <>
      <Section titre="Matière" rang={1}>
        <Deroulant
          libelle="Matière"
          groupes={[
            {
              options: matieres.map((x) => ({
                cle: x.code,
                libelle: x.libelle,
                aide: x.moyenne === undefined ? 'pas encore de note' : `moyenne ${moyenne(x.moyenne)}`,
              })),
            },
          ]}
          valeur={m.code}
          onChange={setCode}
        />
      </Section>
      <Entree rang={2}>
        <Champ libelle="Titre (facultatif)" value={titre} onChangeText={setTitre} placeholder="Contrôle chapitre 5" maxLength={60} returnKeyType="done" />
        <Texte variante="petit" attenue style={{ marginTop: espace.xs }}>
          Affiché dans le détail des notes, marqué comme simulé.
        </Texte>
      </Entree>
      <Entree rang={3} style={{ gap: espace.s }}>
        <View style={styles.phare}>
          <Texte variante="liste" moyen style={{ flex: 1 }}>
            Note
          </Texte>
          <ChiffreAnime valeur={h.valeur} taillePx={taille.chiffre} couleur={c.accent} />
          <Texte variante="section" attenue>
            /{sur}
          </Texte>
        </View>
        <Curseur libelle="Note" texteValeur={`${moyenne(h.valeur)} sur ${sur}`} valeur={h.valeur} min={0} max={sur} pas={0.25} onChange={setNote} />
      </Entree>
      <Section titre="Barème et poids" rang={4}>
        <Segments libelle="Barème" options={[20, 10].map((v) => ({ cle: v, libelle: `sur ${v}` }))} valeur={sur} onChange={setSur} />
        <Segments libelle="Poids du devoir" plein options={POIDS.map((v) => ({ cle: v, libelle: `×${formatCoef(v)}` }))} valeur={poids} onChange={setPoids} />
      </Section>
      <Entree rang={5}>
        <Panneau teinte style={{ gap: espace.xs, paddingVertical: espace.m }}>
          <View style={styles.rangee}>
            <Texte variante="petit" attenue style={{ flex: 1 }}>
              {m.libelle}
            </Texte>
            <Texte
              variante="liste"
              style={{
                fontVariant: ['tabular-nums'],
                color: c.negatif,
                fontFamily: police.fort,
              }}>
              {fleche(m.moyenne, ensuite.matiere)}
            </Texte>
          </View>
          <View style={styles.rangee}>
            <Texte variante="petit" attenue style={{ flex: 1 }}>
              Moyenne générale
            </Texte>
            <Texte
              variante="liste"
              style={{
                fontVariant: ['tabular-nums'],
                color: c.accent,
                fontFamily: police.fort,
              }}>
              {fleche(generale, ensuite.generale)}
            </Texte>
          </View>
        </Panneau>
      </Entree>
      <Bouton titre="Ajouter la note" onPress={() => onAjouter(h)} />
    </>
  );
}

/**
 * Note nécessaire aux prochains devoirs. Cible : l'objectif de générale (réglable ici aussi) ou une moyenne de
 * matière. Les deux cibles donnent la même liste : chaque matière et la note qu'il y faut, en couleur quand elle
 * est atteignable. Part de la moyenne simulée.
 */
function Calcul({
  objectif,
  onViser,
  generale,
  matieres,
  depart,
  leviersPour,
  notePourMatiere,
  onEssayer,
}: {
  objectif: number;
  onViser: (v: number) => void;
  generale?: number;
  matieres: Matiere[];
  depart?: string;
  leviersPour: (sur: number, poids: number, nombre: number) => ReturnType<typeof leviers>;
  notePourMatiere: (code: string, sur: number, poids: number, nombre: number, vise: number) => number | undefined;
  onEssayer: (code: string, note: number, sur: number, poids: number, nombre: number) => void;
}) {
  const c = useCouleurs();
  const [cible, setCible] = useState<'generale' | 'matiere'>('generale');
  const [sur, setSur] = useState(20);
  const [poids, setPoids] = useState(1);
  const [nombre, setNombre] = useState(1);
  const [choisie, setChoisie] = useState(matieres.some((m) => m.code === depart) ? depart : undefined);
  const [vise, setVise] = useState(Math.min(20, Math.round(objectif * 4) / 4));
  const violetPale = `${c.objectif}1a`;
  const arrondi = (n: number) => Math.min(sur, Math.ceil(n * 4) / 4);

  // Une ligne par matière : la note qu'il faut (0 : déjà atteint ; undefined : hors d'atteinte).
  type Rangee = { code: string; libelle: string; sous: string; note?: number };
  const rangees: Rangee[] =
    cible === 'generale'
      ? leviersPour(sur, poids, nombre).map((l) => ({
          code: l.code,
          libelle: l.libelle,
          note: l.noteSeule,
          sous: `${l.parPoint > 0 ? `1 point ici = +${moyenne(l.parPoint)} sur la générale` : 'Pas encore de note : sa première comptera'} · coef ${formatCoef(l.coef)}`,
        }))
      : matieres
          .map((m) => ({
            code: m.code,
            libelle: m.libelle,
            note: notePourMatiere(m.code, sur, poids, nombre, vise),
            sous: m.moyenne === undefined ? 'pas encore de note' : `moyenne actuelle ${moyenne(m.moyenne)}`,
          }))
          .sort((a, b) => (a.note === undefined ? 1 : b.note === undefined ? -1 : a.note - b.note));
  const atteint = cible === 'generale' && generale !== undefined && generale >= objectif;
  const selection = rangees.find((r) => r.code === choisie) ?? rangees.find((r) => r.note !== undefined && r.note > 0) ?? rangees[0];
  const devoirs = nombre > 1 ? `aux ${nombre} prochains devoirs` : 'au prochain devoir';

  return (
    <>
      <Section titre="Cible" rang={1}>
        <Segments
          libelle="Cible"
          plein
          options={[
            { cle: 'generale' as const, libelle: 'Moyenne générale' },
            { cle: 'matiere' as const, libelle: 'Moyenne d’une matière' },
          ]}
          valeur={cible}
          onChange={setCible}
        />
        <Panneau teinte style={{ paddingVertical: espace.m }}>
          {cible === 'generale' ? (
            <ReglageObjectif objectif={objectif} generale={generale} onViser={onViser} />
          ) : (
            <View style={{ gap: espace.s }}>
              <View style={styles.phare}>
                <Texte variante="liste" moyen style={{ flex: 1, color: c.objectif }}>
                  Moyenne visée dans la matière
                </Texte>
                <Texte variante="section" style={{ color: c.objectif, fontVariant: ['tabular-nums'] }}>
                  {moyenne(vise)}
                </Texte>
              </View>
              <Curseur libelle="Moyenne visée dans la matière" texteValeur={`${moyenne(vise)} sur 20`} valeur={vise} min={0} max={20} pas={0.25} onChange={setVise} />
            </View>
          )}
        </Panneau>
      </Section>
      <Section titre="Prochains devoirs" rang={2}>
        <Segments
          libelle="Nombre de notes"
          options={[1, 2, 3, 4].map((v) => ({
            cle: v,
            libelle: v === 1 ? '1 note' : `${v} notes`,
          }))}
          valeur={nombre}
          onChange={setNombre}
        />
        <Segments libelle="Barème" options={[20, 10].map((v) => ({ cle: v, libelle: `sur ${v}` }))} valeur={sur} onChange={setSur} />
        <Segments libelle="Poids de chaque devoir" plein options={POIDS.map((v) => ({ cle: v, libelle: `×${formatCoef(v)}` }))} valeur={poids} onChange={setPoids} />
      </Section>

      <Entree rang={3}>
        <View style={[styles.resultat, { backgroundColor: violetPale }]}>
          {atteint ? (
            <Texte variante="section" style={{ color: c.objectif }}>
              Objectif déjà atteint avec la simulation actuelle.
            </Texte>
          ) : selection ? (
            <>
              <Texte variante="liste" style={{ color: c.objectif, fontFamily: police.fort }}>
                {selection.libelle}, {devoirs}
              </Texte>
              {selection.note === undefined ? (
                <Texte variante="liste">Hors d’atteinte, même avec {nombre > 1 ? `${nombre} fois ${sur}/${sur}` : `${sur}/${sur}`}.</Texte>
              ) : selection.note === 0 ? (
                <Texte variante="liste">Déjà atteint : n’importe quelle note suffit.</Texte>
              ) : (
                <>
                  <View style={styles.phare}>
                    <ChiffreAnime valeur={selection.note} taillePx={taille.geant} couleur={c.objectif} />
                    <Texte variante="section" style={{ color: c.objectif }}>
                      /{sur}
                      {nombre > 1 ? ' à chacun' : ''}
                    </Texte>
                  </View>
                  <Bouton
                    titre={`Essayer ${nombre > 1 ? `${nombre} × ` : ''}${valeur(arrondi(selection.note))}/${sur} en ${selection.libelle}`}
                    onPress={() => onEssayer(selection.code, arrondi(selection.note!), sur, poids, nombre)}
                  />
                </>
              )}
            </>
          ) : null}
        </View>
      </Entree>

      {!atteint ? (
        <Section
          titre="Par matière"
          aide="En couleur : les matières où c’est atteignable, de la plus facile à la plus difficile. Touche une matière pour voir sa note."
          rang={4}>
          <Panneau>
            {rangees.map((r, i) => {
              const possible = r.note !== undefined;
              return (
                <Ligne
                  key={r.code}
                  dernier={i === rangees.length - 1}
                  role="radio"
                  selectionne={r.code === selection?.code}
                  onPress={() => setChoisie(r.code)}
                  libelleAccessible={`${r.libelle} : ${!possible ? 'hors d’atteinte' : r.note === 0 ? 'déjà atteint' : `${moyenne(r.note!)} sur ${sur}`}`}>
                  <View
                    style={[
                      styles.repere,
                      {
                        backgroundColor: r.code === selection?.code ? c.objectif : possible ? violetPale : 'transparent',
                      },
                    ]}
                  />
                  <View style={{ flex: 1, opacity: possible ? 1 : 0.55 }}>
                    <Texte variante="liste" moyen numberOfLines={1}>
                      {r.libelle}
                    </Texte>
                    <Texte variante="petit" attenue>
                      {r.sous}
                    </Texte>
                  </View>
                  <Texte
                    variante="liste"
                    attenue={!possible}
                    style={{
                      fontVariant: ['tabular-nums'],
                      fontFamily: possible ? police.fort : police.normal,
                      color: possible ? c.objectif : undefined,
                    }}>
                    {!possible ? 'hors d’atteinte' : r.note === 0 ? 'atteint' : moyenne(r.note!)}
                  </Texte>
                </Ligne>
              );
            })}
          </Panneau>
        </Section>
      ) : null}
    </>
  );
}

/**
 * Modifier ses notes : changer la valeur d'une vraie note, décider qu'elle compte ou non (coefficient 0), ou exclure
 * une matière de la générale. Les vraies notes ne sont jamais modifiées : seule la simulation l'est.
 */
function MesNotes({
  notes,
  libelle,
  retouches,
  onChange,
  ignorees,
  onIgnorer,
}: {
  notes: Note[];
  libelle: (code: string) => string;
  retouches: Retouche[];
  onChange: (r: Retouche[]) => void;
  /** Matières exclues du calcul : leurs notes restent listées, la matière ne compte plus dans la générale. */
  ignorees: string[];
  onIgnorer: (codes: string[]) => void;
}) {
  const c = useCouleurs();
  const [ouverte, setOuverte] = useState<string>();
  const parNote = new Map(retouches.map((r) => [r.noteId, r]));
  const note = notes.find((n) => n.id === ouverte);
  const retouche = note ? parNote.get(note.id) : undefined;
  const compteParDefaut = (n: Note) => !n.nonSignificative && lireNote(n.valeurBrute) !== undefined;
  // Une retouche revenue à l'état réel disparaît : la simulation ne garde que de vrais changements.
  const modifier = (n: Note, champs: Partial<Retouche>) => {
    const suite = { ...parNote.get(n.id), ...champs, noteId: n.id };
    if (suite.valeur !== undefined && suite.valeur === lireNote(n.valeurBrute)) delete suite.valeur;
    if (suite.compte !== undefined && suite.compte === compteParDefaut(n)) delete suite.compte;
    const autres = retouches.filter((r) => r.noteId !== n.id);
    onChange(suite.valeur === undefined && suite.compte === undefined ? autres : [...autres, suite]);
  };
  const codes = [...new Set(notes.map((n) => n.matiereCode))].sort((a, b) => libelle(a).localeCompare(libelle(b), 'fr'));

  if (notes.length === 0) {
    return (
      <Texte variante="liste" attenue>
        Aucune note dans cette période.
      </Texte>
    );
  }
  return (
    <Section titre="Tes notes de la période" aide="Touche une note pour changer sa valeur ou l’exclure du calcul. Tes vraies notes ne changent pas." rang={1}>
      <View style={{ gap: espace.m }}>
        {codes.map((code) => (
          <View key={code} style={{ gap: espace.xs }}>
            <Texte variante="liste" moyen>
              {libelle(code)}
            </Texte>
            <Coche
              libelle="Compte dans la moyenne générale"
              coche={!ignorees.includes(code)}
              onChange={(v) => onIgnorer(v ? ignorees.filter((x) => x !== code) : [...ignorees, code])}
            />
            <Panneau>
              {notes
                .filter((n) => n.matiereCode === code)
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((n, i, l) => {
                  const r = parNote.get(n.id);
                  const compte = r?.compte ?? compteParDefaut(n);
                  return (
                    <Ligne
                      key={n.id}
                      dernier={i === l.length - 1}
                      onPress={() => setOuverte(n.id)}
                      libelleAccessible={`${n.devoir || 'Devoir'}, ${brute(n.valeurBrute)} sur ${n.noteSur}${r ? ', modifiée' : ''}. Modifier`}>
                      <View style={{ flex: 1 }}>
                        <Texte variante="liste" numberOfLines={1}>
                          {n.devoir || 'Devoir'}
                        </Texte>
                        <Texte variante="petit" attenue>
                          {jour(n.date)} · coef {formatCoef(n.coef)}
                          {compte ? '' : ' · ne compte pas'}
                        </Texte>
                      </View>
                      <Texte
                        variante="liste"
                        style={{
                          fontVariant: ['tabular-nums'],
                          color: r ? c.negatif : c.texte,
                        }}>
                        {r?.valeur !== undefined ? `${brute(n.valeurBrute)} → ${formatCoef(r.valeur)}` : brute(n.valeurBrute)}
                        <Texte variante="liste" attenue>
                          /{n.noteSur}
                        </Texte>
                      </Texte>
                    </Ligne>
                  );
                })}
            </Panneau>
          </View>
        ))}
      </View>
      <Feuille visible={!!note} onFermer={() => setOuverte(undefined)} titre={note ? note.devoir || 'Devoir' : ''}>
        {note ? (
          <View style={{ gap: espace.m }}>
            <Texte variante="petit" attenue>
              {libelle(note.matiereCode)} · {jour(note.date)} · vraie note {brute(note.valeurBrute)}/{note.noteSur}
            </Texte>
            <Curseur
              valeur={retouche?.valeur ?? lireNote(note.valeurBrute) ?? note.noteSur / 2}
              min={0}
              max={note.noteSur}
              pas={0.25}
              onChange={(v) => modifier(note, { valeur: v })}
              libelle="Note simulée"
              texteValeur={`${formatCoef(retouche?.valeur ?? lireNote(note.valeurBrute) ?? note.noteSur / 2)}/${note.noteSur}`}
            />
            <Coche libelle="Compte dans la moyenne" coche={retouche?.compte ?? compteParDefaut(note)} onChange={(v) => modifier(note, { compte: v })} />
            {retouche ? <Bouton variante="secondaire" titre="Revenir à la vraie note" onPress={() => modifier(note, { valeur: undefined, compte: undefined })} /> : null}
          </View>
        ) : null}
      </Feuille>
    </Section>
  );
}

const styles = StyleSheet.create({
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    minHeight: 48,
  },
  phare: { flexDirection: 'row', alignItems: 'baseline', gap: espace.s },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
  objectif: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: espace.m,
    marginTop: espace.xs,
  },
  pas: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bandeau: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.s,
    minHeight: 52,
    paddingHorizontal: espace.m,
    borderRadius: rayon.carte,
    borderWidth: 1,
  },
  point: { width: 8, height: 8, borderRadius: 4 },
  action: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espace.m,
    padding: espace.m,
    borderRadius: rayon.phare - 2,
    borderWidth: 1,
  },
  icone: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  croix: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultat: { borderRadius: rayon.phare, padding: espace.l, gap: espace.s },
  repere: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
});
