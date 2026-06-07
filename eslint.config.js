const typescript = require("@typescript-eslint/eslint-plugin");
const typescriptParser = require("@typescript-eslint/parser");
const reactHooks = require("eslint-plugin-react-hooks");

module.exports = [
  {
    ignores: [
      "out/",
      "dist/",
      "node_modules/",
      "*.config.js",
      "eslint.config.js",
      ".vscode-test/",
      ".git/",
      ".github/",
      ".cursor/",
      ".claude/",
      ".vscode/",
      "resources/",
      "tmp/",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        console: "readonly",
        acquireVsCodeApi: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        __dirname: "readonly",
        NodeJS: "readonly",
        window: "readonly",
        document: "readonly",
        MessageEvent: "readonly",
        ErrorEvent: "readonly",
        PromiseRejectionEvent: "readonly",
        ResizeObserver: "readonly",
        HTMLElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLButtonElement: "readonly",
        requestAnimationFrame: "readonly",
        React: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
      "react-hooks": reactHooks,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "off",
      "no-console": ["warn", { allow: ["error"] }],
      "no-debugger": "warn",
      "no-unused-vars": "off",
    },
  },
];
