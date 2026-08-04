import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "dist-server", "android", "node_modules", "coverage"] },

  // Cliente (React + browser)
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Regras do React Compiler (react-hooks v7): úteis como alerta, mas
      // acusam padrões válidos aqui (ex.: `location.href = ...`, setState em
      // efeito após fetch). Ficam como warn para não travar o lint.
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      // O código usa `any` em respostas de API e handlers; sinalizar sem quebrar o build.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // `catch {}` intencional é o padrão do projeto (fetch best-effort).
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },

  // Servidor e testes (Node)
  {
    files: ["server/**/*.ts", "tests/**/*.ts", "*.config.{js,ts}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // `catch {}` intencional é o padrão do projeto (fetch best-effort).
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
);
