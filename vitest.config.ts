import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The exhaustive transition matrix lives in *.slow.test.ts and runs
    // via `npm run test:slow`; both suites run before phase sign-off.
    exclude: ["**/node_modules/**", "tests/**/*.slow.test.ts"],
    // All integration suites share ONE Neon dev branch; running files in
    // parallel makes global-aggregate assertions race each other. Serial
    // files keep the suite deterministic (slower, but tests are sign-off
    // gates, not a dev-loop tool).
    fileParallelism: false,
    setupFiles: ["tests/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
