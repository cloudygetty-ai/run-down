/**
 * Lint rules.
 *
 * The layering rule is the one that matters most: the engine must never import
 * from the renderer, the UI or the network. That boundary is what keeps the
 * simulation deterministic and portable, and a lint rule enforces it far more
 * reliably than a convention nobody remembers at 2am.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { browser: true, es2022: true, node: true },
  ignorePatterns: ['dist', 'node_modules', '*.cjs'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['error', { allow: ['warn', 'error'] }],
    eqeqeq: ['error', 'always'],
    'prefer-const': 'error',
  },
  overrides: [
    {
      files: ['src/engine/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/render/**', '**/ui/**', '**/net/**', '**/client/**', 'three'],
                message:
                  'The engine must stay free of presentation and transport. Dependencies flow one way.',
              },
            ],
          },
        ],
        // Math.random and Date.now would both break rollback determinism.
        'no-restricted-globals': ['error', { name: 'Date', message: 'The simulation must not read a clock.' }],
      },
    },
  ],
};
