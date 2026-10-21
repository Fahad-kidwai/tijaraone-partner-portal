import { defineConfig } from "vitest/config";
import path from "node:path";

/** Slow suites only (e.g. the 6x6 transition matrix). Run: npm run test:slow */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.slow.test.ts"],
    setupFiles: ["tests/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
