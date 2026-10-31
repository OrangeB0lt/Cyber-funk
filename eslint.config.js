/* ESLint flat config. Layer boundaries and import cycles are enforced by dependency-cruiser
   (.dependency-cruiser.cjs), not here. This file covers code-level rules. */
import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';

/** Game logic must be reproducible from a seed, so it draws randomness from the injected Rng. */
const noMathRandom = {
  'no-restricted-properties': [
    'error',
    {
      object: 'Math',
      property: 'random',
      message:
        'Use the seeded Rng from core/rng. Math.random is allowed only for cosmetics in ui/ and app/audio.',
    },
  ],
};

export default defineConfig(
  {
    ignores: [
      'legacy/**',
      'dist/**',
      'dist-e2e/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '.playwright-mcp/**',
      '.claude/**',
      '.devcontainer/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['src/core/**', 'src/content/**', 'src/engine/**', 'src/narrative/**', 'src/app/**'],
    ignores: ['src/app/audio/**'],
    rules: noMathRandom,
  },
  {
    // A scene that forgets `await` races its own lines (and a dropped promise hides errors).
    // Type-aware, so it's scoped to the code that juggles scene promises.
    files: ['src/content/**/*.scene.ts', 'src/app/**/*.ts', 'src/narrative/**/*.ts'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: { '@typescript-eslint/no-floating-promises': 'error' },
  },
  {
    // The public contracts every team member codes against must explain themselves on hover.
    files: ['src/core/types/**/*.ts', 'src/narrative/**/*.ts'],
    ignores: ['**/*.test.ts'],
    plugins: { jsdoc },
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: { FunctionDeclaration: true, ClassDeclaration: true },
          contexts: [
            'TSInterfaceDeclaration',
            'TSTypeAliasDeclaration',
            'TSPropertySignature',
            'TSMethodSignature',
          ],
        },
      ],
    },
  },
);
