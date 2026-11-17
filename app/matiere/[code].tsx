// Détail d'une matière. Sa question : « D'où vient cette moyenne ? » Chaque note, ce qu'elle pèse, et pourquoi
// certaines ne comptent pas.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { DetailNote, Exclusion, ResultatMatiere } from '@/domain/moyennes/moteur';
import type { Note } from '@/domain/types';
import { impactMatiere } from '@/domain/moyennes/impact';
import { useNotes } from '@/features/notes/store';
import { evolution, vueNotes } from '@/features/notes/vue';
import { Bouton, Chiffre, ChiffreAnime, Courbe, Ecart, Ecran, EnTete, Entree, Ligne, Panneau, Pastille, Section, Texte } from '@/ui/composants';
import { brute, coef, jour, moyenne } from '@/ui/format';
import { Regle } from '@/ui/graphiques';
import { espace, taille, useCouleurs } from '@/ui/theme';

const RAISON: Record<Exclusion, string> = {
  'non-significative': 'non significative',
  'non-numerique': 'pas une note chiffrée',
  'saisie-apres-calcul': 'saisie après le calcul ED',
};

export default function DetailMatiere() {
  const c = useCouleurs();
  const [survol, setSurvol] = useState<number>();
  const { code, periode, eleve } = useLocalSearchParams<{ code: string; periode: string; eleve: string }>();
  const instantane = useNotes((s) => s.eleves[eleve]?.instantane);
  const vue = instantane ? vueNotes(instantane, periode) : undefined;
  const m = vue?.matieres.find((x) => x.matiere.code === code);

  if (!instantane || !vue || !m) {
    return (
      <Ecran>
        <EnTete titre="Matière" retour />
        <Texte>Cette matière n’existe pas dans la période choisie.</Texte>
      </Ecran>
    );
  }

  const courbe = evolution(instantane.donnees, vue.periode, code);
  const poids = impactMatiere(vue.periode, instantane.donnees.notes, instantane.donnees.periodes, code, { parametrage: instantane.donnees.parametrage });
  const classe = m.matiere.classe;
  const parId = new Map(instantane.donnees.notes.map((n) => [n.id, n]));
  const lignes = [m.matiere, ...m.matiere.sousMatieres].flatMap((s) =>
    s.notes.map((d) => ({ d, n: parId.get(d.id)!, sous: s.sousCode ? s.libelle : undefined })),
  );
  lignes.sort((a, b) => b.n.date.localeCompare(a.n.date));

  return (
    <Ecran>
      <EnTete titre={m.matiere.libelle} retour />
      <Entree rang={1}>
        <Panneau teinte style={{ paddingVertical: espace.xl, gap: espace.m }}>
          <View style={styles.rangee}>
            <Texte variante="liste" style={{ flex: 1, color: c.accentEncre }}>
              Moyenne prévue · {vue.periode.libelle}
            </Texte>
            <Pastille texte={`coef ${coef(m.matiere.coef)}`} />
          </View>
          <View style={styles.phare}>
            <ChiffreAnime valeur={survol === undefined ? m.matiere.moyenne : courbe[survol]?.moyenne} taillePx={taille.phare} couleur={c.accent} />
            {m.matiere.moyenne !== undefined ? (
              <Texte variante="liste" attenue>
                /20{survol !== undefined && courbe[survol] ? ` au ${jour(courbe[survol].date)}` : ''}
              </Texte>
            ) : null}
          </View>
          {m.matiere.moyenne !== undefined ? (
            <Regle
              valeur={m.matiere.moyenne}
              classe={classe}
              libelle={`Ta moyenne ${moyenne(m.matiere.moyenne)} sur 20${classe?.moyenne !== undefined ? `, classe ${moyenne(classe.moyenne)}` : ''}${classe?.min !== undefined && classe.max !== undefined ? `, de ${moyenne(classe.min)} à ${moyenne(classe.max)}` : ''}`}
            />
          ) : null}
          {courbe.length > 1 ? (
            <Courbe points={courbe.map((x) => x.moyenne)} onSurvol={setSurvol} libelle={`Évolution de la moyenne de ${m.matiere.libelle}`} />
          ) : null}
          <Texte variante="petit" style={{ color: c.accentEncre }}>
            {m.matiere.officielle === undefined ? 'Pas encore de moyenne officielle ED' : `Officielle ED ${moyenne(m.matiere.officielle)}`}
          </Texte>
        </Panneau>
      </Entree>

      {classe || poids !== undefined ? (
        <Section titre="Face à la classe" rang={2}>
          <Panneau>
            {classe ? (
              <Ligne>
                <Texte variante="liste" style={{ flex: 1 }}>
                  Moyenne de la classe
                </Texte>
                <Texte variante="petit" attenue>
                  {classe.min !== undefined && classe.max !== undefined ? `de ${moyenne(classe.min)} à ${moyenne(classe.max)}  ` : ''}
                </Texte>
                <Chiffre valeur={classe.moyenne} />
              </Ligne>
            ) : null}
            {poids !== undefined ? (
              <Ligne dernier>
                <Texte variante="liste" style={{ flex: 1 }} numberOfLines={2}>
                  Ce que cette matière fait à ta générale
                </Texte>
                <Ecart valeur={poids} />
              </Ligne>
            ) : null}
          </Panneau>
        </Section>
      ) : null}

      {m.matiere.sousMatieres.length > 0 ? (
        <Section titre="Sous-matières" aide="La moyenne de la matière part de leurs moyennes arrondies, comme ED.">
          <Panneau>
            {m.matiere.sousMatieres.map((s: ResultatMatiere, i, l) => (
              <Ligne key={s.sousCode} dernier={i === l.length - 1}>
                <View style={{ flex: 1 }}>
                  <Texte variante="liste" moyen>
                    {s.libelle}
                  </Texte>
                  <Texte variante="petit" attenue>
                    coef {coef(s.coef)}
                  </Texte>
                </View>
                <Chiffre valeur={s.moyenne} />
              </Ligne>
            ))}
          </Panneau>
        </Section>
      ) : null}

      <Section titre="Notes" aide={lignes.length ? `${lignes.length} note${lignes.length > 1 ? 's' : ''}, de la plus récente à la plus ancienne` : undefined}>
        <Panneau>
          {lignes.length === 0 ? (
            <Ligne dernier>
              <Texte variante="liste" attenue>
                Aucune note pour l’instant dans cette période.
              </Texte>
            </Ligne>
          ) : (
            lignes.map(({ d, n, sous }, i) => (
              <LigneNote
                key={d.id}
                d={d}
                n={n}
                sous={sous}
                dernier={i === lignes.length - 1}
                onPress={() => router.push({ pathname: '/note/[id]', params: { id: n.id, periode, eleve } })}
              />
            ))
          )}
        </Panneau>
      </Section>

      <Bouton
        variante="secondaire"
        titre={`Simuler des notes en ${m.matiere.libelle}`}
        onPress={() => router.push({ pathname: '/simulateur', params: { periode, eleve, code } })}
      />
    </Ecran>
  );
}

function LigneNote({ d, n, sous, dernier, onPress }: { d: DetailNote; n: Note; sous?: string; dernier: boolean; onPress: () => void }) {
  const meta = [jour(n.date), sous, `coef ${coef(n.coef)}`].filter(Boolean).join(' · ');
  return (
    <Ligne dernier={dernier} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Texte variante="liste" numberOfLines={2}>
          {n.devoir || 'Devoir'}
        </Texte>
        <Texte variante="petit" attenue numberOfLines={1}>
          {d.exclue ? `${meta} · non comptée : ${RAISON[d.exclue]}` : meta}
        </Texte>
      </View>
      <View style={styles.valeur}>
        <Texte variante="liste" moyen attenue={!!d.exclue} style={styles.chiffres}>
          {brute(n.valeurBrute)}
          <Texte variante="liste" attenue>
            /{n.noteSur}
          </Texte>
        </Texte>
        {n.noteSur !== 20 && d.sur20 !== undefined && !d.exclue ? (
          <Texte variante="petit" attenue style={styles.chiffres}>
            soit {moyenne(d.sur20)}/20
          </Texte>
        ) : null}
      </View>
    </Ligne>
  );
}

const styles = StyleSheet.create({
  phare: { flexDirection: 'row', alignItems: 'baseline', gap: espace.xs },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
  valeur: { alignItems: 'flex-end' },
  chiffres: { fontVariant: ['tabular-nums'] },
});
