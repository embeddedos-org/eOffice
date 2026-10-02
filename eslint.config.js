import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

// Flat config for ESLint 9 (replaces the legacy .eslintrc.json, which
// ESLint 9 no longer loads). Keeps the previous rule set:
// eslint:recommended + @typescript-eslint/recommended, no-explicit-any off,
// unused-vars as warn with ^_ arg ignore, ban-ts-comment off — plus the
// react-hooks and react-refresh recommended sets for this React codebase.
export default tseslint.config(
  {
    ignores: ["dist", "node_modules", "*.html"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/ban-ts-comment": "off",
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  }
);
