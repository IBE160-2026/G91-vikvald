import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // The same "@/..." imports as in tsconfig.json.
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["lib/**/*.test.{ts,tsx}", "modules/**/*.test.{ts,tsx}", "components/**/*.test.{ts,tsx}"],
    // Component tests switch to jsdom with a "// @vitest-environment jsdom" comment.
    environment: "node",
  },
});
