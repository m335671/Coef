// Détail d'une matière. Sa question : « D'où vient cette moyenne ? » Chaque note, ce qu'elle pèse, et pourquoi
// certaines ne comptent pas.
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { DetailNote, Exclusion, ResultatMatiere } from '@/domain/moyennes/moteur';
import type { Note } from '@/domain/types';
import { useNotes } from '@/features/notes/store';
import { vueNotes } from '@/features/notes/vue';
import { Bouton, Chiffre, Ecran, EnTete, Ligne, Panneau, Reglette, Section, Texte } from '@/ui/composants';
import { brute, coef, jour, moyenne } from '@/ui/format';
import { espace, taille } from '@/ui/theme';

const RAISON: Record<Exclusion, string> = {
  'non-significative': 'non significative',
  'non-numerique': 'pas une note chiffrée',
  'saisie-apres-calcul': 'saisie après le calcul ED',
};

export default function DetailMatiere() {
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

  const parId = new Map(instantane.donnees.notes.map((n) => [n.id, n]));
  const lignes = [m.matiere, ...m.matiere.sousMatieres].flatMap((s) =>
    s.notes.map((d) => ({ d, n: parId.get(d.id)!, sous: s.sousCode ? s.libelle : undefined })),
  );
  lignes.sort((a, b) => b.n.date.localeCompare(a.n.date));

  return (
    <Ecran>
      <EnTete titre={m.matiere.libelle} retour />
      <Panneau style={{ paddingVertical: espace.l, gap: espace.s }}>
        <Texte variante="liste" attenue>
          Moyenne prévue · {vue.periode.libelle} · coef {coef(m.matiere.coef)}
        </Texte>
        <View style={styles.phare}>
          <Chiffre valeur={m.matiere.moyenne} taillePx={taille.chiffre} donnee />
          {m.matiere.moyenne !== undefined ? (
            <Texte variante="liste" attenue>
              /20
            </Texte>
          ) : null}
        </View>
        <Texte variante="liste" attenue>
          {m.matiere.officielle === undefined ? 'Pas encore de moyenne officielle ED' : `Officielle ED ${moyenne(m.matiere.officielle)}`}
        </Texte>
        <Reglette notes={m.sur20} moyenne={m.matiere.moyenne} />
      </Panneau>

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
            lignes.map(({ d, n, sous }, i) => <LigneNote key={d.id} d={d} n={n} sous={sous} dernier={i === lignes.length - 1} />)
          )}
        </Panneau>
      </Section>

      <Bouton
        titre={`Simuler une note en ${m.matiere.libelle}`}
        onPress={() => router.push({ pathname: '/simulateur', params: { periode, eleve, code } })}
      />
    </Ecran>
  );
}

function LigneNote({ d, n, sous, dernier }: { d: DetailNote; n: Note; sous?: string; dernier: boolean }) {
  const meta = [jour(n.date), sous, `coef ${coef(n.coef)}`].filter(Boolean).join(' · ');
  return (
    <Ligne dernier={dernier}>
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
  valeur: { alignItems: 'flex-end' },
  chiffres: { fontVariant: ['tabular-nums'] },
});
