// Tuile de l'Accueil et de Vie scolaire : grande carte arrondie, toute la surface se touche.
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Entree, Presse } from './composants';
import { espace, rayon } from './theme';

/** `large` : toute la largeur ; sinon moitié, à poser dans une rangée (pas de flexWrap : chevauchements sur Android). */
export function Tuile({
  children,
  rang,
  large,
  fond,
  bord,
  onPress,
  onLongPress,
  libelle,
}: {
  children: ReactNode;
  rang: number;
  large?: boolean;
  fond: string;
  bord?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  libelle: string;
}) {
  // Demi-tuiles côte à côte : chacune remplit la hauteur de la rangée, la plus haute donne la taille aux deux.
  const style = [styles.tuile, { backgroundColor: fond, borderColor: bord ?? fond, minHeight: large ? undefined : 132 }, large ? {} : { flex: 1 }];
  if (!onPress) {
    return (
      <Entree rang={rang} style={large ? styles.large : styles.demi}>
        <View style={style}>{children}</View>
      </Entree>
    );
  }
  return (
    <Entree rang={rang} style={large ? styles.large : styles.demi}>
      <Presse onPress={onPress} onLongPress={onLongPress} libelleAccessible={libelle} style={style} remplir={!large}>
        {children}
      </Presse>
    </Entree>
  );
}

const styles = StyleSheet.create({
  large: { alignSelf: 'stretch' },
  demi: { flex: 1 },
  tuile: { borderRadius: rayon.phare, borderWidth: 1, padding: espace.l, gap: espace.xs },
});
