const globals = require('globals');
const { FlatCompat } = require('@eslint/eslintrc');
const { configs: jsConfigs } = require('@eslint/js/src');

const ignorePatterns = ['node_modules', 'dist', 'pkg', 'target', 'src', 'tests', 'static', 'eslint.config.cjs'];

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: jsConfigs.recommended,
  allConfig: jsConfigs.all,
});

module.exports = [
  {
    ignores: ignorePatterns,
  },
  ...compat.extends('eslint:recommended', 'plugin:react/recommended', 'plugin:react/jsx-runtime'),
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      globals: {
        ...globals.browser,
        webglUtils: 'readonly',
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];
