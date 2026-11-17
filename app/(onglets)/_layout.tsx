// Les quatre onglets de l'app, derrière la vérification de session (reprise sans mot de passe, ou connexion).
import { Redirect, router, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ReduceMotion, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { MODE_DEMO } from '@/demo';
import { useCompte } from '@/features/compte/store';
import { Presse } from '@/ui/composants';
import { police, useCouleurs } from '@/ui/theme';

type Nom = 'index' | 'notes' | 'agenda' | 'devoirs' | 'vie-scolaire';
const ONGLETS: { nom: Nom; titre: string }[] = [
  { nom: 'index', titre: 'Accueil' },
  { nom: 'notes', titre: 'Notes' },
  { nom: 'agenda', titre: 'Agenda' },
  { nom: 'devoirs', titre: 'Devoirs' },
  { nom: 'vie-scolaire', titre: 'Vie scolaire' },
];

export default function Onglets() {
  const c = useCouleurs();
  const { client, horsLigne, expiree, demarrer } = useCompte();
  const [etat, setEtat] = useState<'attente' | 'connexion' | 'pret'>(MODE_DEMO || client || horsLigne ? 'pret' : 'attente');

  // Avec un cache, les onglets s'ouvrent tout de suite et la reconnexion se fait en fond (aucune roue au lancement).
  useEffect(() => {
    if (etat !== 'attente') return;
    demarrer().then(
      (ok) => setEtat(ok ? 'pret' : 'connexion'),
      () => setEtat('connexion'), // session expirée ou refusée : on repasse par la connexion
    );
  }, [etat, demarrer]);

  if (etat === 'connexion' || expiree) return <Redirect href="/connexion" />;
  if (etat === 'attente') return <View style={{ flex: 1, backgroundColor: c.fond }} />; // quelques millisecondes : lecture du trousseau et de la base
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.fond } }}
      tabBar={(p) => <BarreOnglets courant={p.state.routes[p.state.index]!.name as Nom} aller={(n) => router.navigate(n === 'index' ? '/' : `/${n}`)} />}>
      {ONGLETS.map((o) => (
        <Tabs.Screen key={o.nom} name={o.nom} options={{ title: o.titre }} />
      ))}
    </Tabs>
  );
}

function BarreOnglets({ courant, aller }: { courant: Nom; aller: (n: Nom) => void }) {
  const c = useCouleurs();
  const bas = useSafeAreaInsets().bottom;
  return (
    <View accessibilityRole="tablist" style={[styles.barre, { backgroundColor: c.surface, borderTopColor: c.bord, paddingBottom: Math.max(bas, 8) }]}>
      {ONGLETS.map((o) => {
        const actif = o.nom === courant;
        return (
          <View key={o.nom} style={{ flex: 1 }}>
            <Presse role="tab" selectionne={actif} libelleAccessible={o.titre} onPress={() => aller(o.nom)} style={styles.onglet}>
              <View style={styles.icone}>
                {actif ? (
                  <Animated.View
                    entering={ZoomIn.duration(220).reduceMotion(ReduceMotion.System)}
                    style={[StyleSheet.absoluteFill, { borderRadius: 16, backgroundColor: c.teinte100 }]}
                  />
                ) : null}
                {/* Au-dessus de la pastille : son animation d'entrée la ferait passer devant. */}
                <View style={{ zIndex: 1 }}>
                  <Icone nom={o.nom} couleur={actif ? c.accentEncre : c.attenue} />
                </View>
              </View>
              <Text numberOfLines={1} style={{ fontFamily: actif ? police.fort : police.normal, fontSize: 11, color: actif ? c.accentEncre : c.attenue }}>
                {o.titre}
              </Text>
            </Presse>
          </View>
        );
      })}
    </View>
  );
}

function Icone({ nom, couleur }: { nom: Nom; couleur: string }) {
  const p = { fill: 'none', stroke: couleur, strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      {nom === 'index' ? (
        <>
          <Path {...p} d="M4 11l8-7 8 7v9H4z" />
          <Path {...p} d="M10 20v-5h4v5" />
        </>
      ) : nom === 'notes' ? (
        <>
          <Path {...p} d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
        </>
      ) : nom === 'agenda' ? (
        <>
          <Rect {...p} x={3} y={5} width={18} height={16} rx={3} />
          <Path {...p} d="M3 10h18M8 3v4M16 3v4" />
        </>
      ) : nom === 'devoirs' ? (
        <>
          <Path {...p} d="M5 4h11l3 3v13H5z" />
          <Path {...p} d="M9 12l2 2 4-4" />
        </>
      ) : (
        <>
          <Circle {...p} cx={12} cy={8} r={4} />
          <Path {...p} d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </>
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  barre: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6 },
  onglet: { alignItems: 'center', gap: 2, minHeight: 52 },
  icone: { width: 52, height: 32, alignItems: 'center', justifyContent: 'center' },
});
