import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { Geist_700Bold } from '@expo-google-fonts/geist/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useCouleurs } from '@/ui/theme';

import { effacer } from '../modules/notifications-locales';

// Définit la tâche de synchro en arrière-plan avant tout réveil par le système.
import '@/sync/tache';

export default function RootLayout() {
  const c = useCouleurs();
  // Polices embarquées dans l'app (fichiers locaux, aucune requête réseau). Quatre graisses seulement.
  const [pret] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold });

  // Ouvrir l'app, même sans toucher la notification, vaut lecture : on retire les notifications de notes.
  useEffect(() => {
    void effacer();
    const abonnement = AppState.addEventListener('change', (e) => e === 'active' && void effacer());
    return () => abonnement.remove();
  }, []);

  if (!pret) return <View style={{ flex: 1, backgroundColor: c.fond }} />;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.fond }, animation: 'default' }}>
        <Stack.Screen name="simulateur" options={{ presentation: 'modal' }} />
        <Stack.Screen name="note/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="devoir/[id]" options={{ presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
