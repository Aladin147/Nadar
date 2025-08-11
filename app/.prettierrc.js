module.exports = {
  // Basic formatting
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'es5',

  // Indentation
  tabWidth: 2,
  useTabs: false,

  // Line length and wrapping
  printWidth: 100,
  proseWrap: 'preserve',

  // Brackets and spacing
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',

  // JSX specific
  jsxSingleQuote: false,

  // End of line
  endOfLine: 'lf',

  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',

  // React Native specific overrides
  overrides: [
    {
      files: '*.{js,jsx,ts,tsx}',
      options: {
        parser: 'typescript',
      },
    },
    {
      files: '*.json',
      options: {
        parser: 'json',
        printWidth: 80,
      },
    },
    {
      files: '*.md',
      options: {
        parser: 'markdown',
        proseWrap: 'always',
        printWidth: 80,
      },
    },
  ],
};
