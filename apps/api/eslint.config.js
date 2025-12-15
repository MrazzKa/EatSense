const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const prettier = require('eslint-config-prettier');

module.exports = [
  js.configs.recommended,
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.js',
      'prisma/**',
      'scripts/**',
      'food/food-health-score.util.ts', // временно игнорируем бинарный файл
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // Убираем project для избежания ошибок "TSConfig does not include this file"
        // Type-check делает tsc/nest build, type-aware lint не критичен
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
      globals: {
        // Node globals
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        clearTimeout: 'readonly',
        fetch: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        globalThis: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  // Override для ETL скриптов (CLI/импорты)
  {
    files: ['src/fdc/etl/**/*.ts'],
    rules: {
      'no-undef': 'off', // Node globals уже добавлены выше, но на всякий случай отключаем
      '@typescript-eslint/no-var-requires': 'off', // Разрешены require для stream-chain и т.п.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  prettier,
];

