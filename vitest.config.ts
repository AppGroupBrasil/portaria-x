import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    testTimeout: 15000,
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
