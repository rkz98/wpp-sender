import js from '@eslint/js';
import tsEslint from 'typescript-eslint';
import perfectionist from 'eslint-plugin-perfectionist';

const ladder = { type: 'line-length', order: 'asc', partitionByNewLine: true };

export default tsEslint.config({
  files: ['**/*.ts'],
  extends: [
    js.configs.recommended,
    ...tsEslint.configs.recommended
  ],
  plugins: { perfectionist },
  rules: {
    semi: [2, 'always'],
    'perfectionist/sort-objects': ['error', ladder],
    'perfectionist/sort-interfaces': ['error', ladder],
    'perfectionist/sort-union-types': ['error', ladder],
    'perfectionist/sort-object-types': ['error', ladder],
    'perfectionist/sort-intersection-types': ['error', ladder],
    '@typescript-eslint/no-unused-expressions': ['error', { allowTernary: true }]
  }
});
