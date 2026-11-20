// Point d'entrée de l'app. La tâche de synchro en arrière-plan est définie ici, avant expo-router : quand Android
// réveille l'app pour elle (WorkManager, processus déjà tué), il la lance sans écran, et expo-router n'évalue alors
// aucun fichier de app/. Définie dans app/_layout, la tâche n'existait pas à ce moment-là et ne tournait jamais.
import './src/sync/tache';
import 'expo-router/entry';
