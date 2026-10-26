import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["**/node_modules/**", "**/dist/**", "**/build/**", "**/coverage/**"]),

  // Rules for every JavaScript file in the project
  {
    files: ["**/*.{js,jsx}"],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]", argsIgnorePattern: "^_" }],
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
      "prefer-arrow-callback": "error",
      "func-style": ["error", "expression"],
      "arrow-body-style": ["error", "always"],
    },
  },

  // Frontend: browser code and React hooks rules
  {
    files: ["frontend/src/**/*.{js,jsx}"],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },

  // Backend and config files: Node.js code
  {
    files: ["backend/**/*.js", "frontend/vite.config.js", "eslint.config.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
