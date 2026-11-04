import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const FORBIDDEN_MODULE_PATTERNS = [
  '**/utils',
  '**/utils/*',
  '**/helpers',
  '**/helpers/*',
  '**/common',
  '**/misc',
];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'data/**',
      'tools/**',
      '.claude/**',
      '.agent-skills-source/**',
      '.venv/**',
      'public-data/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { parserOptions: { projectService: false } },
    rules: {
      'id-length': ['error', { min: 2, exceptions: ['id', 'x', 'y'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': 'allow-with-description' }],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: { regex: '^I[A-Z]', match: false },
        },
        { selector: 'typeAlias', format: ['PascalCase'] },
        {
          selector: 'class',
          format: ['PascalCase'],
          custom: { regex: '^(Base|Abstract)|Manager$', match: false },
        },
      ],
      'no-restricted-imports': ['error', { patterns: FORBIDDEN_MODULE_PATTERNS }],
      'max-depth': ['error', 3],
    },
  },
);
