// Détail d'une note. Sa question : « Que vaut cette note, face à la classe, et qu'a-t-elle changé à mes moyennes ? »
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { impactNote } from '@/domain/moyennes/impact';
import { calculer, type Exclusion, lireNote } from '@/domain/moyennes/moteur';
import type { StatsClasse } from '@/domain/types';
import { useNotes } from '@/features/notes/store';
import { libelleMatiere } from '@/sync/annonce';
import { Bouton, Ecart, Ecran, EnTete, Entree, Ligne, Panneau, Pastille, Section, Texte } from '@/ui/composants';
import { brute, coef, jour, moyenne } from '@/ui/format';
import { espace, police, taille, useCouleurs } from '@/ui/theme';

const RAISON: Record<Exclusion, string> = {
  'non-significative': 'Note non significative : elle ne compte pas dans la moyenne.',
  'non-numerique': 'Pas une note chiffrée : elle ne compte pas dans la moyenne.',
  'saisie-apres-calcul': 'Saisie après le dernier calcul ED : comptée dans la moyenne prévue, pas encore dans l’officielle.',
};

export default function DetailNote() {
  const c = useCouleurs();
  const { id, periode, eleve } = useLocalSearchParams<{ id: string; periode: string; eleve: string }>();
  const d = useNotes((s) => s.eleves[eleve]?.instantane?.donnees);
  const p = d?.periodes.find((x) => x.code === periode);
  const n = d?.notes.find((x) => x.id === id);

  if (!d || !p || !n) {
    return (
      <Ecran>
        <EnTete titre="Note" retour />
        <Texte>Cette note n’existe plus dans tes données.</Texte>
      </Ecran>
    );
  }

  const options = { parametrage: d.parametrage };
  const detail = calculer(p, d.notes, d.periodes, options)
    .matieres.flatMap((m) => [m, ...m.sousMatieres])
    .flatMap((m) => m.notes)
    .find((x) => x.id === id);
  const impact = detail && !detail.exclue ? impactNote(p, d.notes, d.periodes, id, options) : {};
  const valeur = lireNote(n.valeurBrute);
  const matiere = libelleMatiere(d, n);

  return (
    <Ecran>
      <EnTete titre={n.devoir || 'Note'} retour />
      <Entree rang={1}>
        <Panneau teinte style={{ paddingVertical: espace.xl, gap: espace.m }}>
          <View style={styles.rangee}>
            <Texte variante="liste" style={{ flex: 1, color: c.accentEncre }} numberOfLines={1}>
              {matiere}
            </Texte>
            <Pastille texte={`coef ${coef(n.coef)}`} />
          </View>
          <View style={styles.phare}>
            <Texte style={{ fontFamily: police.gras, fontSize: taille.phare, lineHeight: taille.phare * 1.15, color: c.accent, fontVariant: ['tabular-nums'] }}>{brute(n.valeurBrute)}</Texte>
            <Texte variante="section" attenue>
              /{n.noteSur}
            </Texte>
          </View>
          <Texte variante="petit" style={{ color: c.accentEncre }}>
            {[jour(n.date), n.typeDevoir, valeur !== undefined && n.noteSur !== 20 ? `soit ${moyenne((valeur * 20) / n.noteSur)}/20` : undefined].filter(Boolean).join(' · ')}
          </Texte>
        </Panneau>
      </Entree>

      {detail?.exclue ? (
        <Entree rang={2}>
          <Texte variante="liste">{RAISON[detail.exclue]}</Texte>
        </Entree>
      ) : null}

      {n.classe ? (
        <Section titre="Face à la classe" rang={2}>
          <Panneau style={{ paddingVertical: espace.l, gap: espace.m }}>
            <Position classe={n.classe} valeur={valeur} sur={n.noteSur} />
            <View style={styles.rangee}>
              <Stat libelle="Moyenne de la classe" valeur={n.classe.moyenne} />
              <Stat libelle="Plus basse" valeur={n.classe.min} />
              <Stat libelle="Plus haute" valeur={n.classe.max} />
            </View>
          </Panneau>
        </Section>
      ) : null}

      {impact.generale !== undefined || impact.matiere !== undefined ? (
        <Section titre="Ce qu’elle a changé" aide="Tes moyennes prévues avec cette note, comparées à sans elle." rang={3}>
          <Panneau>
            <Ligne dernier={impact.generale === undefined}>
              <Texte variante="liste" style={{ flex: 1 }} numberOfLines={2}>
                Moyenne de {matiere}
              </Texte>
              {impact.matiere !== undefined ? (
                <Ecart valeur={impact.matiere} />
              ) : (
                <Texte variante="petit" attenue>
                  première note
                </Texte>
              )}
            </Ligne>
            {impact.generale !== undefined ? (
              <Ligne dernier>
                <Texte variante="liste" style={{ flex: 1 }}>
                  Moyenne générale
                </Texte>
                <Ecart valeur={impact.generale} />
              </Ligne>
            ) : null}
          </Panneau>
        </Section>
      ) : null}

      <Entree rang={4}>
        <Bouton variante="secondaire" titre={`Voir ${matiere}`} onPress={() => router.push({ pathname: '/matiere/[code]', params: { code: n.matiereCode, periode, eleve } })} />
      </Entree>
    </Ecran>
  );
}

function Stat({ libelle, valeur }: { libelle: string; valeur?: number }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Texte variante="petit" attenue>
        {libelle}
      </Texte>
      <Texte variante="liste" style={{ fontFamily: police.fort, fontVariant: ['tabular-nums'] }}>
        {valeur === undefined ? '—' : moyenne(valeur).replace(/,00$/, '')}
      </Texte>
    </View>
  );
}

/** Bande de la classe (du plus bas au plus haut), trait de la moyenne de classe, point de l'élève. */
function Position({ classe, valeur, sur }: { classe: StatsClasse; valeur?: number; sur: number }) {
  const c = useCouleurs();
  const pct = (x: number) => `${(Math.min(Math.max(x, 0), sur) / sur) * 100}%` as const;
  const debut = classe.min ?? 0;
  const fin = classe.max ?? sur;
  return (
    <View
      accessible
      accessibilityLabel={`Ta note ${valeur ?? '—'} sur ${sur}, moyenne de la classe ${classe.moyenne ?? '—'}, de ${debut} à ${fin}`}
      style={styles.position}>
      <View style={[styles.piste, { backgroundColor: c.teinte50 }]} />
      <View style={[styles.bande, { left: pct(debut), width: `${((fin - debut) / sur) * 100}%`, backgroundColor: c.teinte100 }]} />
      {classe.moyenne !== undefined ? <View style={[styles.trait, { left: pct(classe.moyenne), backgroundColor: c.accentEncre }]} /> : null}
      {valeur !== undefined ? <View style={[styles.eleve, { left: pct(valeur), backgroundColor: c.accent, borderColor: c.surface }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rangee: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
  phare: { flexDirection: 'row', alignItems: 'baseline', gap: espace.xs },
  position: { height: 28, justifyContent: 'center' },
  piste: { position: 'absolute', left: 0, right: 0, height: 8, borderRadius: 4 },
  bande: { position: 'absolute', height: 8, borderRadius: 4 },
  trait: { position: 'absolute', width: 2, height: 20, marginLeft: -1, borderRadius: 1 },
  eleve: { position: 'absolute', width: 20, height: 20, marginLeft: -10, borderRadius: 10, borderWidth: 3 },
});
