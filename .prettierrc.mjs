export default {
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  jsxSingleQuote: true,
  trailingComma: 'all',
  bracketSpacing: true,
  arrowParens: 'always',
  rangeStart: 0,
  rangeEnd: Infinity,
  requirePragma: false,
  insertPragma: false,
  proseWrap: 'preserve',
  htmlWhitespaceSensitivity: 'css',
  vueIndentScriptAndStyle: false,
  endOfLine: 'lf',
  embeddedLanguageFormatting: 'auto',
  htmlWhitespaceSensitivity: 'ignore',

  // Import sorting configuration
  importOrder: [
    '^(server-only|source-map-support|#/utils/formdata|reflect-metadata)$',
    '',
    '^.*\\.vue$',
    '',
    '^@core/(.*)$',
    '^@server/(.*)$',
    '^@ui/(.*)$',
    '',
    '^@/(.*)$',
    '',
    '^src/(.*)$',
    '',
    '<THIRD_PARTY_MODULES>',
    '',
    '^[.]',
  ],
  importOrderParserPlugins: ['typescript', 'decorators-legacy'],

  overrides: [
    {
      files: ['*.md'],
      options: {
        tabWidth: 1,
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      options: {
        parser: 'typescript',
      },
    },
  ],

  plugins: ['@ianvs/prettier-plugin-sort-imports'],
};
