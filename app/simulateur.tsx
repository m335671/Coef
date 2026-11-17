// Simulation. Deux questions : « Si j'ajoute ces notes, où va ma moyenne ? » et « Pour viser X de générale, où agir ? »
// Tout part de la moyenne PRÉVUE (calcul officiel vérifié + notes qu'ED n'a pas encore comptées).
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { leviers } from '@/domain/moyennes/impact';
import { calculer } from '@/domain/moyennes/moteur';
import { avecHypotheses, type NoteHypothetique } from '@/domain/moyennes/simulateur';
import { cleSimulation, useSimulation } from '@/features/notes/simulation';
import { useNotes } from '@/features/notes/store';
import {
  Bouton,
  BoutonRond,
  Chiffre,
  ChiffreAnime,
  Curseur,
  Ecart,
  Ecran,
  EnTete,
  Entree,
  Feuille,
  Panneau,
  Pastille,
  Presse,
  Section,
  Segments,
  Texte,
} from '@/ui/composants';
import { coef as formatCoef, moyenne } from '@/ui/format';
import { espace, police, taille, useCouleurs } from '@/ui/theme';

const POIDS = [0.5, 1, 2, 3, 4];
const AUCUNE: NoteHypothetique[] = [];
type Onglet = 'ajouter' | 'objectif';
type Saisie = { code: string; valeur: number; sur: number; poids: number };

export default function Simulation() {
  const c = useCouleurs();
  const params = useLocalSearchParams<{
    periode: string;
    eleve: string;
    code?: string;
  }>();
  const d = useNotes((s) => s.eleves[params.eleve]?.instantane?.donnees);
  const p = d?.periodes.find((x) => x.code === params.periode);

  const [onglet, setOnglet] = useState<Onglet>('ajouter');
  const cle = cleSimulation(params.eleve, params.periode);
  const hypotheses = useSimulation((s) => s.notes[cle]) ?? AUCUNE;
  const { active, modifie, definir, activer, enregistrer, charger } = useSimulation();
  const setHypotheses = (h: NoteHypothetique[]) => definir(cle, h);
  useEffect(() => void charger(), [charger]);
  const [saisie, setSaisie] = useState<Saisie | undefined>(params.code ? { code: params.code, valeur: 14, sur: 20, poids: 1 } : undefined);
  const [objectif, setObjectif] = useState(14);

  const fermer = (
    <BoutonRond libelle="Fermer la simulation" onPress={() => router.back()}>
      <Texte variante="section" style={{ color: c.accent }}>
        ✕
      </Texte>
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
      <EnTete titre="Simulation" action={fermer} />
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
            { cle: 'ajouter' as const, libelle: 'Ajouter des notes' },
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
      ) : (
        <Objectif
          objectif={objectif}
          setObjectif={setObjectif}
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

      <Panneau style={{ paddingVertical: espace.m, gap: espace.m }}>
        <View style={styles.rangee}>
          <View style={{ flex: 1 }}>
            <Texte variante="liste" moyen>
              Afficher sur l’écran Notes
            </Texte>
            <Texte variante="petit" attenue>
              Les moyennes y deviennent « simulées », bien signalées.
            </Texte>
          </View>
          <Switch
            accessibilityLabel="Afficher la simulation sur l’écran Notes"
            value={active}
            onValueChange={activer}
            trackColor={{ true: c.accent, false: c.controle }}
            thumbColor={c.surface}
          />
        </View>
        <Bouton
          variante={modifie ? 'primaire' : 'texte'}
          desactive={!modifie}
          titre={modifie ? 'Enregistrer la simulation' : 'Simulation enregistrée'}
          onPress={() => void enregistrer()}
        />
      </Panneau>
      <Texte variante="petit" attenue>
        Notes hypothétiques : jamais envoyées à EcoleDirecte. Enregistrées seulement sur ce téléphone, dans la base chiffrée, si tu le demandes. Le calcul part
        de ta moyenne prévue.
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
