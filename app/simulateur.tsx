// Simulation. Deux questions : « Si j'ajoute ces notes, où va ma moyenne ? » et « Pour viser X de générale, où agir ? »
// Tout part de la moyenne PRÉVUE (calcul officiel vérifié + notes qu'ED n'a pas encore comptées).
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { leviers } from '@/domain/moyennes/impact';
import { calculer } from '@/domain/moyennes/moteur';
import { avecHypotheses, noteNecessaire, type NoteHypothetique } from '@/domain/moyennes/simulateur';
import type { Note, Periode } from '@/domain/types';
import { cleSimulation, useSimulation } from '@/features/notes/simulation';
import { useNotes } from '@/features/notes/store';
import {
  Bouton,
  Coche,
  BoutonRond,
  Chiffre,
  ChiffreAnime,
  Curseur,
  Ecart,
  Ecran,
  EnTete,
  Entree,
  Feuille,
  Ligne,
  Panneau,
  Pastille,
  Presse,
  Section,
  Segments,
  Texte,
} from '@/ui/composants';
import { coef as formatCoef, moyenne } from '@/ui/format';
import { espace, police, taille, useCouleurs } from '@/ui/theme';
import Svg, { Path } from 'react-native-svg';

const POIDS = [0.5, 1, 2, 3, 4];
const AUCUNE: NoteHypothetique[] = [];
type Onglet = 'ajouter' | 'calcul' | 'objectif';
type Saisie = { code: string; valeur: number; sur: number; poids: number };

export default function Simulation() {
  const c = useCouleurs();
  const params = useLocalSearchParams<{
    periode: string;
    eleve: string;
    code?: string;
    onglet?: Onglet;
  }>();
  const d = useNotes((s) => s.eleves[params.eleve]?.instantane?.donnees);
  const p = d?.periodes.find((x) => x.code === params.periode);

  const [onglet, setOnglet] = useState<Onglet>(params.onglet === 'objectif' ? 'objectif' : 'ajouter');
  const cle = cleSimulation(params.eleve, params.periode);
  const hypotheses = useSimulation((s) => s.notes[cle]) ?? AUCUNE;
  const { active, modifie, definir, activer, enregistrer, charger, viser, afficherObjectif } = useSimulation();
  const objectif = useSimulation((s) => s.objectif) ?? 14;
  const objectifAffiche = useSimulation((s) => s.objectifAffiche ?? s.objectif !== undefined);
  const arrivees = (useSimulation((s) => s.remplacees) ?? []).filter((r) => r.cle === cle);
  const setHypotheses = (h: NoteHypothetique[]) => definir(cle, h);
  useEffect(() => void charger(), [charger]);
  const [saisie, setSaisie] = useState<Saisie | undefined>(params.code ? { code: params.code, valeur: 14, sur: 20, poids: 1 } : undefined);

  const fermer = (
    <BoutonRond libelle="Fermer la simulation" onPress={() => router.back()}>
      <Texte variante="section" style={{ color: c.accent }}>
        ✕
      </Texte>
    </BoutonRond>
  );
  // Sauvegarde : bouton rond plein (avec un point) tant qu'il y a du nouveau, coche discrète une fois enregistré.
  const sauver = (
    <Presse
      libelleAccessible={modifie ? 'Enregistrer la simulation' : 'Simulation enregistrée'}
      desactive={!modifie}
      onPress={() => void enregistrer()}
      style={[styles.sauver, { backgroundColor: modifie ? c.accent : c.teinte50 }]}>
      <Svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="none"
        stroke={modifie ? c.surAccent : c.accent}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round">
        {modifie ? (
          <>
            <Path d="M5 4h11l3 3v13H5z" />
            <Path d="M8 4v5h7V4M8 20v-6h8v6" />
          </>
        ) : (
          <Path d="M5 12.5l4.5 4.5L19 7.5" />
        )}
      </Svg>
      {modifie ? <View style={[styles.pointSauver, { backgroundColor: c.negatif, borderColor: c.fond }]} /> : null}
    </Presse>
  );
  const actions = (
    <View style={styles.rangee}>
      {sauver}
      {fermer}
    </View>
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
  const avant = calculer(p, d.notes, d.periodes, options);
  const notesSimulees = avecHypotheses(p, d.notes, hypotheses);
  const apres = calculer(p, notesSimulees, d.periodes, options);
  const libelle = (code: string) => p.matieres.find((m) => m.code === code && !m.sousCode)?.libelle ?? code;
  const ajouter = (s: Saisie) =>
    setHypotheses([
      ...hypotheses,
      {
        matiereCode: s.code,
        valeur: Math.min(s.valeur, s.sur),
        noteSur: s.sur,
        coef: s.poids,
      },
    ]);

  return (
    <Ecran>
      <EnTete titre="Simulation" action={actions} />
      <Entree rang={1}>
        <Panneau teinte style={{ paddingVertical: espace.l, gap: espace.s }}>
          <Texte variante="liste" style={{ color: c.accentEncre }}>
            Moyenne générale prévue
          </Texte>
          <View style={styles.phare}>
            <Texte variante="section" attenue style={{ fontVariant: ['tabular-nums'] }}>
              {avant.generale === undefined ? '—' : moyenne(avant.generale)} →
            </Texte>
            <ChiffreAnime valeur={apres.generale} taillePx={taille.phare} couleur={c.accent} />
          </View>
          <View style={styles.rangee}>
            {apres.generale !== undefined && avant.generale !== undefined ? (
              <View style={{ flex: 1 }}>
                <Ecart
                  valeur={apres.generale - avant.generale}
                  suffixe={`avec ${hypotheses.length} note${hypotheses.length > 1 ? 's' : ''} ajoutée${hypotheses.length > 1 ? 's' : ''}`}
                />
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            {hypotheses.length > 0 ? <Bouton variante="texte" titre="Tout retirer" onPress={() => setHypotheses([])} /> : null}
          </View>
        </Panneau>
      </Entree>

      <Entree rang={2}>
        <Segments
          libelle="Mode de simulation"
          options={[
            { cle: 'ajouter' as const, libelle: 'Ajouter' },
            { cle: 'calcul' as const, libelle: 'Calculateur' },
            { cle: 'objectif' as const, libelle: 'Objectif' },
          ]}
          valeur={onglet}
          onChange={setOnglet}
        />
      </Entree>

      {onglet === 'ajouter' ? (
        <Section titre="Par matière" aide="Touche + pour ajouter une note hypothétique." rang={3}>
          <View style={{ gap: espace.s }}>
            {apres.matieres.map((m, i) => {
              const m0 = avant.matieres.find((x) => x.code === m.code)?.moyenne;
              const siennes = hypotheses.map((h, j) => ({ h, j })).filter(({ h }) => h.matiereCode === m.code);
              return (
                <Entree key={m.code} rang={4 + i}>
                  <Panneau style={{ paddingVertical: espace.m, gap: espace.s }}>
                    <View style={styles.rangee}>
                      <View style={{ flex: 1 }}>
                        <Texte variante="liste" moyen numberOfLines={2}>
                          {m.libelle}
                        </Texte>
                        <Texte variante="petit" attenue>
                          coef {formatCoef(m.coef)}
                        </Texte>
                      </View>
                      {siennes.length > 0 ? (
                        <Texte variante="petit" attenue style={{ fontVariant: ['tabular-nums'] }}>
                          {m0 === undefined ? '—' : moyenne(m0)} →
                        </Texte>
                      ) : null}
                      <Chiffre valeur={m.moyenne} couleur={siennes.length > 0 ? c.accent : undefined} />
                      <BoutonRond
                        libelle={`Ajouter une note en ${m.libelle}`}
                        onPress={() =>
                          setSaisie({
                            code: m.code,
                            valeur: 14,
                            sur: 20,
                            poids: 1,
                          })
                        }>
                        <Texte variante="section" style={{ color: c.accent }}>
                          +
                        </Texte>
                      </BoutonRond>
                    </View>
                    {siennes.length > 0 ? (
                      <View style={styles.puces}>
                        {siennes.map(({ h, j }) => (
                          <Presse
                            key={j}
                            libelleAccessible={`Retirer la note ${moyenne(h.valeur)} sur ${h.noteSur}`}
                            onPress={() => setHypotheses(hypotheses.filter((_, k) => k !== j))}
                            style={[styles.puce, { backgroundColor: c.teinte100 }]}>
                            <Texte
                              variante="petit"
                              style={{
                                color: c.accentEncre,
                                fontFamily: police.fort,
                              }}>
                              {moyenne(h.valeur).replace(/,00$/, '')}/{h.noteSur} ×{formatCoef(h.coef)} ✕
                            </Texte>
                          </Presse>
                        ))}
                      </View>
                    ) : null}
                  </Panneau>
                </Entree>
              );
            })}
          </View>
        </Section>
      ) : onglet === 'calcul' ? (
        <Calculateur
          p={p}
          notes={notesSimulees}
          periodes={d.periodes}
          options={options}
          matieres={apres.matieres.filter((m) => m.coef > 0).map((m) => ({ code: m.code, libelle: m.libelle, moyenne: m.moyenne }))}
          generale={apres.generale}
          depart={{ code: params.code, objectif }}
          onAjouter={(code, valeur, sur, poids) => {
            ajouter({ code, valeur, sur, poids });
            setOnglet('ajouter');
          }}
        />
      ) : (
        <Objectif
          objectif={objectif}
          setObjectif={viser}
          generale={apres.generale}
          liste={leviers(p, notesSimulees, d.periodes, objectif, options)}
          onChoisir={(code, note) => {
            setOnglet('ajouter');
            setSaisie({
              code,
              valeur: Math.min(20, Math.ceil(note * 4) / 4),
              sur: 20,
              poids: 1,
            });
          }}
        />
      )}

      {arrivees.length > 0 ? (
        <Section titre="Arrivées pour de vrai" aide="Ces notes simulées ont été remplacées par la vraie note dès qu’elle est arrivée.">
          <Panneau>
            {arrivees.slice(0, 8).map((r, i, l) => {
              const n = d.notes.find((x) => x.id === r.noteId);
              return (
                <Ligne key={`${r.noteId}-${i}`} dernier={i === l.length - 1}>
                  <View style={{ flex: 1 }}>
                    <Texte variante="liste" numberOfLines={1}>
                      {libelle(r.hypothese.matiereCode)}
                    </Texte>
                    <Texte variante="petit" attenue>
                      simulée {formatCoef(r.hypothese.valeur)}/{r.hypothese.noteSur}
                    </Texte>
                  </View>
                  <Texte variante="liste" style={{ fontFamily: police.fort, fontVariant: ['tabular-nums'] }}>
                    {n ? `${n.valeurBrute.trim()}/${n.noteSur}` : 'reçue'}
                  </Texte>
                </Ligne>
              );
            })}
          </Panneau>
        </Section>
      ) : null}
      <Panneau style={{ paddingVertical: espace.m, gap: espace.m }}>
        <View>
          <Texte variante="liste" moyen>
            Afficher sur l’écran Notes
          </Texte>
          <Texte variante="petit" attenue>
            Chacun séparément : les notes simulées changent les moyennes (en orange), l’objectif n’est qu’un repère (en violet).
          </Texte>
        </View>
        <View>
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
        </View>
      </Panneau>
      <Texte variante="petit" attenue>
        Notes hypothétiques : jamais envoyées à EcoleDirecte. Enregistrées seulement sur ce téléphone, dans la base chiffrée, avec le bouton rond en haut. Quand
        la vraie note arrive dans la matière, elle remplace la simulée. Le calcul part de ta moyenne prévue.
      </Texte>

      <Feuille visible={!!saisie} onFermer={() => setSaisie(undefined)} titre={saisie ? `Une note en ${libelle(saisie.code)}` : ''}>
        {saisie ? (
          <View style={{ gap: espace.m }}>
            <View style={styles.phare}>
              <ChiffreAnime valeur={Math.min(saisie.valeur, saisie.sur)} taillePx={taille.geant} couleur={c.accent} />
              <Texte variante="section" attenue>
                /{saisie.sur}
              </Texte>
              <View style={{ flex: 1 }} />
              <Segments
                libelle="Barème"
                options={[20, 10].map((v) => ({ cle: v, libelle: `sur ${v}` }))}
                valeur={saisie.sur}
                onChange={(sur) =>
                  setSaisie({
                    ...saisie,
                    sur,
                    valeur: Math.min(saisie.valeur, sur),
                  })
                }
              />
            </View>
            <Curseur
              libelle="Note simulée"
              texteValeur={`${moyenne(Math.min(saisie.valeur, saisie.sur))} sur ${saisie.sur}`}
              valeur={Math.min(saisie.valeur, saisie.sur)}
              min={0}
              max={saisie.sur}
              pas={0.25}
              onChange={(valeur) => setSaisie({ ...saisie, valeur })}
            />
            <Texte variante="liste" moyen>
              Poids du devoir
            </Texte>
            <Segments
              libelle="Poids du devoir"
              plein
              options={POIDS.map((v) => ({
                cle: v,
                libelle: `×${formatCoef(v)}`,
              }))}
              valeur={saisie.poids}
              onChange={(poids) => setSaisie({ ...saisie, poids })}
            />
            <Bouton
              titre="Ajouter cette note"
              onPress={() => {
                ajouter(saisie);
                setSaisie(undefined);
              }}
            />
          </View>
        ) : null}
      </Feuille>
    </Ecran>
  );
}

/**
 * Onglet Calculateur : une matière, une moyenne visée (générale ou de la matière), le barème et le poids de la
 * prochaine évaluation → la note qu'il y faut. Part de la moyenne prévue, notes simulées comprises.
 */
function Calculateur({
  p,
  notes,
  periodes,
  options,
  matieres,
  generale,
  depart,
  onAjouter,
}: {
  p: Periode;
  notes: Note[];
  periodes: Periode[];
  options: Parameters<typeof noteNecessaire>[6];
  matieres: { code: string; libelle: string; moyenne?: number }[];
  generale?: number;
  depart: { code?: string; objectif: number };
  onAjouter: (code: string, valeur: number, sur: number, poids: number) => void;
}) {
  const c = useCouleurs();
  const [code, setCode] = useState(matieres.some((m) => m.code === depart.code) ? depart.code! : matieres[0]?.code);
  const [portee, setPortee] = useState<'generale' | 'matiere'>('generale');
  const [vise, setVise] = useState(Math.min(20, Math.round(depart.objectif * 4) / 4));
  const [sur, setSur] = useState(20);
  const [poids, setPoids] = useState(1);
  const m = matieres.find((x) => x.code === code);
  if (!m) return null;
  const actuelle = portee === 'generale' ? generale : m.moyenne;
  const note = noteNecessaire(
    p,
    notes,
    periodes,
    { matiereCode: m.code, noteSur: sur, coef: poids },
    portee === 'generale' ? { portee: 'generale' } : { portee: 'matiere', code: m.code },
    vise,
    options,
  );
  const quart = note === undefined ? undefined : Math.min(sur, Math.ceil(note * 4) / 4);
  return (
    <Section titre="Combien me faut-il ?" aide="À la prochaine évaluation, dans la matière choisie." rang={3}>
      <View style={styles.puces}>
        {matieres.map((x) => (
          <Presse
            key={x.code}
            role="radio"
            selectionne={x.code === code}
            libelleAccessible={x.libelle}
            onPress={() => setCode(x.code)}
            style={[styles.puce, { backgroundColor: x.code === code ? c.accent : c.teinte50 }]}>
            <Texte variante="petit" numberOfLines={1} style={{ color: x.code === code ? c.surAccent : c.accentEncre, fontFamily: police.fort }}>
              {x.libelle}
            </Texte>
          </Presse>
        ))}
      </View>
      <Segments
        libelle="Moyenne visée"
        plein
        options={[
          { cle: 'generale' as const, libelle: 'Générale' },
          { cle: 'matiere' as const, libelle: 'De la matière' },
        ]}
        valeur={portee}
        onChange={setPortee}
      />
      <Curseur
        libelle={portee === 'generale' ? 'Moyenne générale visée' : `Moyenne visée en ${m.libelle}`}
        texteValeur={`${moyenne(vise)} sur 20`}
        valeur={vise}
        min={0}
        max={20}
        pas={0.25}
        onChange={setVise}
      />
      <View style={styles.rangee}>
        <Texte variante="liste" moyen style={{ flex: 1 }}>
          Viser {moyenne(vise)}
        </Texte>
        <Segments libelle="Barème" options={[20, 10].map((v) => ({ cle: v, libelle: `sur ${v}` }))} valeur={sur} onChange={setSur} />
      </View>
      <Segments
        libelle="Poids de l’évaluation"
        plein
        options={POIDS.map((v) => ({ cle: v, libelle: `×${formatCoef(v)}` }))}
        valeur={poids}
        onChange={setPoids}
      />
      <Panneau teinte style={{ paddingVertical: espace.l, gap: espace.s }}>
        <Texte variante="liste" style={{ color: c.accentEncre }}>
          {portee === 'generale' ? 'Générale' : m.libelle} : {actuelle === undefined ? '—' : moyenne(actuelle)} aujourd’hui
        </Texte>
        {note === undefined ? (
          <Texte variante="section">
            Même {sur}/{sur} n’y suffit pas avec un poids ×{formatCoef(poids)}.
          </Texte>
        ) : note === 0 ? (
          <Texte variante="section">Déjà acquis : n’importe quelle note suffit.</Texte>
        ) : (
          <>
            <View style={styles.phare}>
              <Texte variante="liste" attenue>
                il te faut
              </Texte>
              <ChiffreAnime valeur={note} taillePx={taille.geant} couleur={c.accent} />
              <Texte variante="section" attenue>
                /{sur}
              </Texte>
            </View>
            <Bouton
              variante="texte"
              titre={`Simuler ${moyenne(quart!).replace(/,00$/, '')}/${sur} en ${m.libelle}`}
              onPress={() => onAjouter(m.code, quart!, sur, poids)}
            />
          </>
        )}
      </Panneau>
    </Section>
  );
}

/** Onglet Objectif : une générale visée, et les matières classées de la plus accessible à la moins accessible. */
function Objectif({
  objectif,
  setObjectif,
  generale,
  liste,
  onChoisir,
}: {
  objectif: number;
  setObjectif: (v: number) => void;
  generale?: number;
  liste: ReturnType<typeof leviers>;
  onChoisir: (code: string, note: number) => void;
}) {
  const c = useCouleurs();
  const atteint = generale !== undefined && generale >= objectif;
  return (
    <Section
      titre={`Viser ${moyenne(objectif)} de générale`}
      aide={generale === undefined ? undefined : atteint ? 'Déjà atteint avec tes notes actuelles.' : `Il manque ${moyenne(objectif - generale)} point.`}
      rang={3}>
      <Curseur
        libelle="Moyenne générale visée"
        texteValeur={`${moyenne(objectif)} sur 20`}
        valeur={objectif}
        min={8}
        max={20}
        pas={0.25}
        onChange={setObjectif}
      />
      <Texte variante="petit" attenue>
        Pour chaque matière : ce qu’un point de plus y rapporte, puis la note (sur 20, poids ×1) qui suffirait seule, ou à défaut la moyenne qu’il y faudrait.
        Touche une matière pour l’essayer.
      </Texte>
      <View style={{ gap: espace.s }}>
        {liste.map((l, i) => (
          <Entree key={l.code} rang={4 + i}>
            <Presse
              onPress={l.noteSeule !== undefined && l.noteSeule > 0 ? () => onChoisir(l.code, l.noteSeule!) : undefined}
              libelleAccessible={`${l.libelle} : ${l.noteSeule === undefined ? 'impossible avec une seule note' : l.noteSeule === 0 ? 'déjà atteint' : `une note de ${moyenne(l.noteSeule)} suffirait`}`}
              style={[styles.levier, { borderColor: c.bord, backgroundColor: c.surface }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Texte variante="liste" moyen numberOfLines={2}>
                  {l.libelle}
                </Texte>
                <Texte variante="petit" attenue>
                  {l.parPoint > 0 ? `1 point ici = +${moyenne(l.parPoint)} sur la générale` : 'Pas encore de note : sa première comptera'} · coef{' '}
                  {formatCoef(l.coef)}
                </Texte>
              </View>
              {l.noteSeule === undefined ? (
                l.moyenneVisee !== undefined && l.moyenneVisee <= 20 ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Texte variante="petit" attenue>
                      une moyenne de
                    </Texte>
                    <Chiffre valeur={l.moyenneVisee} taillePx={18} couleur={c.accentEncre} />
                  </View>
                ) : (
                  <Texte variante="petit" attenue style={{ textAlign: 'right', width: 88 }}>
                    hors d’atteinte ici seule
                  </Texte>
                )
              ) : l.noteSeule === 0 ? (
                <Pastille texte="atteint" />
              ) : (
                <View style={{ alignItems: 'flex-end' }}>
                  <Texte variante="petit" attenue>
                    une note de
                  </Texte>
                  <Chiffre valeur={l.noteSeule} taillePx={18} couleur={c.accent} />
                </View>
              )}
            </Presse>
          </Entree>
        ))}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  sauver: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pointSauver: { position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  phare: { flexDirection: 'row', alignItems: 'baseline', gap: espace.s },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
  puces: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  puce: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  levier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espace.m,
    padding: espace.m,
    borderRadius: 14,
    borderWidth: 1,
  },
});
