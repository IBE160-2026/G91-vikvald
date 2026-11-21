import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Dates are shown in local time. Run the tests in Norway's time zone (with
// daylight saving time) on every machine and in CI, so date code such as the
// ISO week number is tested where the students are.
process.env.TZ = "Europe/Oslo";

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
