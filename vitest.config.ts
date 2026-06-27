import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    testTimeout: 15000,
    // O beforeAll dos testes de integração importa o grafo pesado do servidor
    // (better-sqlite3, firebase-admin, tensorflow, face-api) + faz seed do DB;
    // o default de 10s estoura na primeira carga. 30s evita falsos negativos.
    hookTimeout: 30000,
    // Integration tests share the better-sqlite3 singleton via NODE module cache;
    // run them sequentially to avoid env-var race + DB file contention.
    pool: "forks",
    forks: { singleFork: true },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
