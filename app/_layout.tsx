import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// Définit la tâche de synchro en arrière-plan avant tout réveil par le système.
import '@/sync/tache';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
