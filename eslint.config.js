const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', 'coverage/*'] },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // Le seul point de sortie réseau est src/api/http.ts (vérifié aussi par un test).
      'no-restricted-globals': ['error', { name: 'fetch', message: 'Passer par src/api/http.ts' }],
    },
  },
  { files: ['src/api/http.ts'], rules: { 'no-restricted-globals': 'off' } },
]);
