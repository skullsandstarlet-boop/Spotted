// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const reactNative = require('eslint-plugin-react-native');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', '.expo/**', 'node_modules/**'],
    plugins: {
      'react-native': reactNative,
    },
    rules: {
      // Catch text nodes directly in View (must be wrapped in <Text>)
      // This catches errors like: <View>📚</View> instead of <View><Text>📚</Text></View>
      // Allow raw text in components that render text internally
      'react-native/no-raw-text': ['error', {
        skip: ['Button', 'Chip', 'DialogClose', 'CardTitle', 'CardDescription', 'DialogTitle', 'DialogDescription'],
      }],
      // Starter template has no node_modules — deps resolve at build time
      'import/no-unresolved': 'off',
    },
  },
]);
