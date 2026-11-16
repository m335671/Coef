// Composants du design system. Aucun kit UI : React Native nu, jetons de ./theme.
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ecart as formatEcart, moyenne as formatMoyenne } from './format';
import { CIBLE, espace, police, rayon, taille, useCouleurs } from './theme';

type Variante = 'titre' | 'section' | 'corps' | 'liste' | 'petit';

const TEXTE: Record<Variante, { fontSize: number; lineHeight: number; fontFamily: string }> = {
  titre: { fontSize: taille.titre, lineHeight: 30, fontFamily: police.moyen },
  section: { fontSize: taille.section, lineHeight: 22, fontFamily: police.moyen },
  corps: { fontSize: taille.corps, lineHeight: 24, fontFamily: police.normal },
  liste: { fontSize: taille.liste, lineHeight: 20, fontFamily: police.normal },
  petit: { fontSize: taille.petit, lineHeight: 16, fontFamily: police.normal },
};

export function Texte({
  variante = 'corps',
  attenue,
  moyen,
  style,
  ...props
}: TextProps & { variante?: Variante; attenue?: boolean; moyen?: boolean }) {
  const c = useCouleurs();
  return (
    <Text
      {...props}
      style={[TEXTE[variante], { color: attenue ? c.attenue : c.texte }, moyen && { fontFamily: police.moyen }, style]}
    />
  );
}

/** Une moyenne. Absente : un tiret gris, jamais un tiret en grand (il se lirait comme un chargement). */
export function Chiffre({
  valeur,
  taillePx = taille.liste,
  donnee,
  attenue,
}: {
  valeur?: number;
  taillePx?: number;
  donnee?: boolean;
  attenue?: boolean;
}) {
  const c = useCouleurs();
  if (valeur === undefined) {
    return (
      <Text accessibilityLabel="pas de moyenne" style={{ fontFamily: police.normal, fontSize: taille.liste, color: c.attenue }}>
        —
      </Text>
    );
  }
  return (
    <Text
      style={{
        fontFamily: taillePx >= taille.chiffre ? police.gras : police.moyen,
        fontSize: taillePx,
        lineHeight: Math.round(taillePx * 1.15),
        letterSpacing: taillePx >= taille.chiffre ? -0.02 * taillePx : 0,
        fontVariant: ['tabular-nums'],
        color: donnee ? c.donnee : attenue ? c.attenue : c.texte,
      }}>
      {formatMoyenne(valeur)}
    </Text>
  );
}

/** Le seul signal coloré : là où un chiffre a bougé. Zéro reste gris. */
export function Ecart({ valeur, suffixe }: { valeur: number; suffixe?: string }) {
  const c = useCouleurs();
  const nul = Math.abs(valeur) < 0.005;
  const couleur = nul ? c.attenue : valeur > 0 ? c.positif : c.negatif;
  const fleche = nul ? '' : valeur > 0 ? '▲ ' : '▼ ';
  return (
    <Text
      accessibilityLabel={`${nul ? 'inchangée' : valeur > 0 ? 'en hausse de' : 'en baisse de'} ${formatEcart(Math.abs(valeur))}${suffixe ? ` ${suffixe}` : ''}`}
      style={{ fontFamily: police.moyen, fontSize: taille.liste, lineHeight: 20, fontVariant: ['tabular-nums'], color: couleur }}>
      {fleche}
      {formatEcart(valeur)}
      {suffixe ? <Text style={{ color: c.attenue, fontFamily: police.normal }}> {suffixe}</Text> : null}
    </Text>
  );
}

export function Bouton({
  titre,
  onPress,
  variante = 'primaire',
  desactive,
  libelleAccessible,
}: {
  titre: string;
  onPress: () => void;
  variante?: 'primaire' | 'secondaire' | 'texte' | 'danger';
  desactive?: boolean;
  libelleAccessible?: string;
}) {
  const c = useCouleurs();
  const fond = { primaire: c.primaire, secondaire: c.secondaire, texte: 'transparent', danger: 'transparent' }[variante];
  const encre = { primaire: c.surPrimaire, secondaire: c.texte, texte: c.texte, danger: c.negatif }[variante];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={libelleAccessible}
      accessibilityState={{ disabled: desactive }}
      disabled={desactive}
      onPress={onPress}
      hitSlop={variante === 'texte' ? 8 : 0}
      style={({ pressed }) => [
        styles.bouton,
        variante === 'texte' || variante === 'danger' ? styles.boutonTexte : null,
        { backgroundColor: fond, opacity: desactive ? 0.45 : pressed ? 0.8 : 1 },
      ]}>
      <Text style={{ fontFamily: police.moyen, fontSize: taille.liste, color: encre }}>{titre}</Text>
    </Pressable>
  );
}

export function Panneau({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useCouleurs();
  return <View style={[styles.panneau, { backgroundColor: c.surface, borderColor: c.bord }, style]}>{children}</View>;
}

/** Une ligne de liste : 44 px au moins, un filet sous chaque ligne sauf la dernière, un cran de ton à la pression. */
export function Ligne({
  children,
  onPress,
  dernier,
  libelleAccessible,
}: {
  children: ReactNode;
  onPress?: () => void;
  dernier?: boolean;
  libelleAccessible?: string;
}) {
  const c = useCouleurs();
  const style = ({ pressed }: { pressed: boolean }) => [
    styles.ligne,
    { borderBottomColor: c.filet, borderBottomWidth: dernier ? 0 : StyleSheet.hairlineWidth, backgroundColor: pressed ? c.releve : 'transparent' },
  ];
  if (!onPress) return <View style={style({ pressed: false })}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={libelleAccessible} onPress={onPress} style={style}>
      {children}
    </Pressable>
  );
}

/** Choix exclusif sur une ligne qui défile : périodes, élèves, barème. L'actif est une pastille grise neutre. */
export function Segments<T extends string | number>({
  options,
  valeur,
  onChange,
  libelle,
}: {
  options: { cle: T; libelle: string }[];
  valeur: T;
  onChange: (v: T) => void;
  libelle: string;
}) {
  const c = useCouleurs();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityLabel={libelle} contentContainerStyle={styles.segments}>
      {options.map((o) => {
        const actif = o.cle === valeur;
        return (
          <Pressable
            key={String(o.cle)}
            accessibilityRole="radio"
            accessibilityState={{ selected: actif }}
            onPress={() => onChange(o.cle)}
            style={({ pressed }) => [styles.segment, { backgroundColor: actif ? c.secondaire : pressed ? c.releve : 'transparent' }]}>
            <Text style={{ fontFamily: actif ? police.moyen : police.normal, fontSize: taille.liste, color: actif ? c.texte : c.attenue }}>
              {o.libelle}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/**
 * La réglette 0–20 : chaque note est un trait gris à sa place, la moyenne prévue un repère dans la seule teinte.
 * L'élément propre à ED-Clone : on voit d'un coup d'œil d'où vient une moyenne.
 */
export function Reglette({ notes, moyenne }: { notes: number[]; moyenne?: number }) {
  const c = useCouleurs();
  const pos = (x: number) => `${(Math.min(Math.max(x, 0), 20) / 20) * 100}%` as const;
  return (
    <View
      accessible
      accessibilityLabel={`${notes.length} note${notes.length > 1 ? 's' : ''} sur 20${moyenne !== undefined ? `, moyenne ${formatMoyenne(moyenne)}` : ''}`}
      style={styles.reglette}>
      <View style={[styles.piste, { backgroundColor: c.releve }]} />
      <View style={[styles.milieu, { backgroundColor: c.controle }]} />
      {notes.map((n, i) => (
        <View key={i} style={[styles.trait, { left: pos(n), backgroundColor: c.attenue }]} />
      ))}
      {moyenne !== undefined ? <View style={[styles.repere, { left: pos(moyenne), backgroundColor: c.donnee }]} /> : null}
    </View>
  );
}

/** Barre de titre d'écran : retour éventuel, titre, une action à droite au plus. */
export function EnTete({ titre, retour, action }: { titre: string; retour?: boolean; action?: ReactNode }) {
  return (
    <View style={styles.entete}>
      {retour ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" hitSlop={12} onPress={() => router.back()} style={styles.retour}>
          <Texte variante="titre">‹</Texte>
        </Pressable>
      ) : null}
      <Texte variante="titre" role="heading" aria-level={1} numberOfLines={1} style={{ flex: 1 }}>
        {titre}
      </Texte>
      {action}
    </View>
  );
}

export function Ecran({ children, defile = true }: { children: ReactNode; defile?: boolean }) {
  const c = useCouleurs();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.fond }} edges={['top', 'left', 'right']}>
      {defile ? (
        <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.contenu, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Champ({ libelle, ...props }: TextInputProps & { libelle: string }) {
  const c = useCouleurs();
  return (
    <View style={{ gap: espace.s }}>
      <Texte variante="liste" moyen>
        {libelle}
      </Texte>
      <TextInput
        accessibilityLabel={libelle}
        placeholderTextColor={c.attenue}
        {...props}
        style={[styles.champ, { color: c.texte, borderColor: c.controle, backgroundColor: c.surface }, props.style]}
      />
    </View>
  );
}

/** Une section : titre, phrase d'aide, puis son contenu. */
export function Section({ titre, aide, children }: { titre: string; aide?: string; children: ReactNode }) {
  return (
    <View style={{ gap: espace.s }}>
      <View>
        <Texte variante="section" role="heading" aria-level={2}>
          {titre}
        </Texte>
        {aide ? (
          <Texte variante="liste" attenue>
            {aide}
          </Texte>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // 640 px au plus : sur tablette et dans l'aperçu web, la colonne reste celle d'un téléphone.
  contenu: { paddingHorizontal: espace.l, paddingBottom: espace.xxl, gap: espace.xl, width: '100%', maxWidth: 640, alignSelf: 'center' },
  entete: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: espace.s, paddingTop: espace.s },
  retour: { width: 32, height: CIBLE, justifyContent: 'center' },
  bouton: { minHeight: CIBLE, borderRadius: rayon.controle, paddingHorizontal: espace.l, alignItems: 'center', justifyContent: 'center' },
  boutonTexte: { paddingHorizontal: 0, alignItems: 'flex-start' },
  panneau: { borderWidth: 1, borderRadius: rayon.carte, paddingHorizontal: espace.l },
  ligne: { minHeight: CIBLE, paddingVertical: espace.m, flexDirection: 'row', alignItems: 'center', gap: espace.m },
  segments: { gap: espace.xs },
  segment: { minHeight: 36, paddingHorizontal: espace.m, borderRadius: rayon.controle, justifyContent: 'center' },
  reglette: { height: 16, justifyContent: 'center' },
  piste: { position: 'absolute', left: 0, right: 0, height: 2, borderRadius: 1 },
  milieu: { position: 'absolute', left: '50%', width: 1, height: 8 },
  trait: { position: 'absolute', width: 2, height: 10, marginLeft: -1, borderRadius: 1 },
  repere: { position: 'absolute', width: 3, height: 16, marginLeft: -1.5, borderRadius: 1.5 },
  champ: { minHeight: CIBLE, borderWidth: 1, borderRadius: rayon.controle, paddingHorizontal: espace.m, fontFamily: police.normal, fontSize: taille.corps },
});
