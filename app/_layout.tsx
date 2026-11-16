import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_700Bold } from '@expo-google-fonts/geist/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { useCouleurs } from '@/ui/theme';

// Définit la tâche de synchro en arrière-plan avant tout réveil par le système.
import '@/sync/tache';

export default function RootLayout() {
  const c = useCouleurs();
  // Polices embarquées dans l'app (fichiers locaux, aucune requête réseau). Trois graisses seulement.
  const [pret] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_700Bold });
  if (!pret) return <View style={{ flex: 1, backgroundColor: c.fond }} />;
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.fond }, animation: 'default' }}>
        <Stack.Screen name="simulateur" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
