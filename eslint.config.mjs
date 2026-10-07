import js from '@eslint/js';
import tsEslint from 'typescript-eslint';
import perfectionist from 'eslint-plugin-perfectionist';

const ladder = { type: 'line-length', order: 'asc', partitionByNewLine: true };

export default tsEslint.config({
  files: ['**/*.ts'],
  ignores: ['auth/**'],
  extends: [
    js.configs.recommended,
    ...tsEslint.configs.recommended
  ],
  languageOptions: {
    parserOptions: { project: './tsconfig.json' }
  },
  plugins: { perfectionist },
  rules: {
    semi: [2, 'always'],
    '@typescript-eslint/ban-ts-comment': 0,
    '@typescript-eslint/no-explicit-any': 0,
    'perfectionist/sort-objects': ['error', ladder],
    'perfectionist/sort-interfaces': ['error', ladder],
    'perfectionist/sort-union-types': ['error', ladder],
    'perfectionist/sort-object-types': ['error', ladder],
    'perfectionist/sort-intersection-types': ['error', ladder],
    '@typescript-eslint/no-unused-expressions': ['error', { allowTernary: true }]
  }
});
