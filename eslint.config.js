import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**',
      'dist-electron/**',
      'node_modules/**',
      '.temp/**',
      'supabase/.temp/**',
      'scripts/**',
      'tests/**',
      'android/**',
      'android-clipad/**',
      'api/**',
      'artifacts/**',
      'assets/**',
      'dev-dist/**',
      'dist_electron_output/**',
      'docs/**',
      'icons/**',
      'ingest-server/**',
      'migrations/**',
      'packages/**',
      'public/**',
      'resources/**',
      'scratch/**',
      'supabase/**',
      'supabase296/**',
      'temp_migrations/**',
      '*.config.js',
      '*.config.cjs',
      '*.cjs',
      '*.mjs',
    ],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-case-declarations': 'warn',
      'no-useless-escape': 'warn',
      'no-control-regex': 'warn',
      'no-prototype-builtins': 'warn',
      'no-empty-pattern': 'warn',
      'no-unreachable': 'warn',
      'no-dupe-keys': 'warn',
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
