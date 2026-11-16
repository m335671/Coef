import { Platform } from 'react-native';

// Le web sert uniquement à l'aperçu visuel : l'API ED refuse les appels navigateur (CORS).
export const MODE_DEMO = Platform.OS === 'web' || process.env.EXPO_PUBLIC_DEMO === '1';
