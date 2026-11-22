// Détail d'une note. Sa question : « Que vaut cette note, face à la classe, et qu'a-t-elle changé à mes moyennes ? »
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { impactNote } from '@/domain/moyennes/impact';
import { calculer, type Exclusion, lireNote } from '@/domain/moyennes/moteur';
import { useSimulation } from '@/features/notes/simulation';
import { useNotes } from '@/features/notes/store';
import { libelleMatiere } from '@/sync/annonce';
import { Bouton, Ecran, EnTete, Entree, Ligne, Panneau, Pastille, Section, Texte } from '@/ui/composants';
import { brute, coef, ecart, jour, moyenne } from '@/ui/format';
import { Regle } from '@/ui/graphiques';
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

  const simulee = useSimulation((x) => x.remplacees)?.find((r) => r.noteId === id)?.hypothese;

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
      {n.dateSaisie ? (
        <Texte variante="petit" attenue style={{ marginTop: -espace.s }}>
          Ajoutée le {jour(n.dateSaisie)}
        </Texte>
      ) : null}
      <Entree rang={1}>
        <Panneau teinte style={{ paddingVertical: espace.xl, gap: espace.m }}>
          <View style={styles.rangee}>
            <Texte variante="liste" style={{ flex: 1, color: c.accentEncre }} numberOfLines={1}>
              {matiere}
            </Texte>
            <Pastille texte={`coef ${coef(n.coef)}`} />
          </View>
          <View style={styles.phare}>
            <Texte style={{ fontFamily: police.gras, fontSize: taille.phare, lineHeight: taille.phare * 1.15, color: c.accent, fontVariant: ['tabular-nums'] }}>
              {brute(n.valeurBrute)}
            </Texte>
            <Texte variante="section" attenue style={{ flex: 1 }}>
              /{n.noteSur}
            </Texte>
            {valeur !== undefined && n.classe?.moyenne !== undefined ? (
              <Pastille
                texte={`${ecart(valeur - n.classe.moyenne)} sur la classe`}
                fond={c.surface}
                encre={valeur >= n.classe.moyenne ? c.accentEncre : c.negatif}
              />
            ) : null}
          </View>
          {n.classe ? (
            <Regle
              valeur={valeur}
              sur={n.noteSur}
              classe={n.classe}
              libelle={`Ta note ${valeur ?? '—'} sur ${n.noteSur}, moyenne de la classe ${n.classe.moyenne ?? '—'}, de ${n.classe.min ?? 0} à ${n.classe.max ?? n.noteSur}`}
            />
          ) : null}
          <Texte variante="petit" style={{ color: c.accentEncre }}>
            {[`devoir du ${jour(n.date)}`, n.typeDevoir, valeur !== undefined && n.noteSur !== 20 ? `soit ${moyenne((valeur * 20) / n.noteSur)}/20` : undefined]
              .filter(Boolean)
              .join(' · ')}
          </Texte>
          {simulee ? <Pastille texte={`Tu l’avais simulée : ${coef(simulee.valeur)}/${simulee.noteSur}`} fond={c.surface} encre={c.negatif} /> : null}
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
            <View style={styles.rangee}>
              <Stat libelle="Moyenne de la classe" valeur={n.classe.moyenne} />
              <Stat libelle="Plus basse" valeur={n.classe.min} />
              <Stat libelle="Plus haute" valeur={n.classe.max} />
            </View>
          </Panneau>
        </Section>
      ) : null}

      {impact.valeurs && (impact.generale !== undefined || impact.matiere !== undefined) ? (
        <Section titre="Ce qu’elle a changé" aide="Tes moyennes prévues sans cette note, puis avec." rang={3}>
          <Panneau>
            <AvantApres libelle={`Moyenne de ${matiere}`} valeurs={impact.valeurs.matiere} dernier={impact.generale === undefined} />
            {impact.generale !== undefined ? <AvantApres libelle="Moyenne générale" valeurs={impact.valeurs.generale} dernier /> : null}
          </Panneau>
        </Section>
      ) : null}

      <Entree rang={4}>
        <Bouton
          variante="secondaire"
          titre={`Voir ${matiere}`}
          onPress={() => router.push({ pathname: '/matiere/[code]', params: { code: n.matiereCode, periode, eleve } })}
        />
      </Entree>
    </Ecran>
  );
}

/** « 13,57 → 13,91 » puis l'écart en clair ; sans valeur avant : c'est la première note. */
function AvantApres({ libelle, valeurs, dernier }: { libelle: string; valeurs: { sans?: number; avec?: number }; dernier?: boolean }) {
  const c = useCouleurs();
  const { sans, avec } = valeurs;
  if (avec === undefined) return null;
  const d = sans !== undefined && avec !== undefined ? avec - sans : undefined;
  const sens =
    d === undefined || Math.abs(d) < 0.005
      ? 'ne change pas'
      : d > 0
        ? `gagne ${moyenne(d)} point${Math.abs(d) >= 2 ? 's' : ''}`
        : `perd ${moyenne(-d)} point${Math.abs(d) >= 2 ? 's' : ''}`;
  return (
    <Ligne
      dernier={dernier}
      libelleAccessible={`${libelle} : ${sans === undefined ? `première note, ${moyenne(avec)}` : `${moyenne(sans)} sans elle, ${moyenne(avec)} avec, elle ${sens}`}`}>
      <View style={{ flex: 1, gap: 2 }}>
        <Texte variante="liste" numberOfLines={2}>
          {libelle}
        </Texte>
        <Texte variante="petit" style={{ color: d === undefined || Math.abs(d) < 0.005 ? c.attenue : d > 0 ? c.positif : c.negatif }}>
          {sans === undefined ? 'Première note de la matière' : `Elle ${sens}`}
        </Texte>
      </View>
      <Texte variante="liste" style={{ fontVariant: ['tabular-nums'] }}>
        <Texte variante="liste" attenue>
          {sans === undefined ? '' : `${moyenne(sans)} → `}
        </Texte>
        <Texte variante="liste" style={{ fontFamily: police.fort }}>
          {moyenne(avec)}
        </Texte>
      </Texte>
    </Ligne>
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

const styles = StyleSheet.create({
  rangee: { flexDirection: 'row', alignItems: 'center', gap: espace.s },
  phare: { flexDirection: 'row', alignItems: 'baseline', gap: espace.xs },
});
