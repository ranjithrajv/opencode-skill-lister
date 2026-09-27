import solid from "vite-plugin-solid"
import { defineConfig } from "vitest/config"

export default defineConfig({
  server: { hmr: false },
  plugins: [
    solid({
      hot: false,
      // The kit ships TypeScript source; transform its .tsx too, and keep
      // every other node_modules package excluded.
      include: [/\.tsx$/, /opencode-plugin-kit\/src\/.+\.tsx$/],
      exclude: [/node_modules\/(?!opencode-plugin-kit)/],
    }),
  ],
  resolve: {
    alias: [
      { find: /^solid-js$/, replacement: "solid-js/dist/dev.js" },
      { find: /^solid-js\/web$/, replacement: "solid-js/web/dist/dev.js" },
    ],
    // The kit ships its own peer copies (solid-js, @opencode/plugin);
    // dedupe forces the consumer's copies so context/signals are shared.
    dedupe: ["solid-js", "@opencode/plugin", "@opencode/plugin/tui", "@opentui/solid"],
    conditions: ["browser", "development"],
  },
  test: {
    environment: "happy-dom",
    // The kit ships TypeScript source, so inline it or a registry install
    // would be externalized and fail to load.
    server: { deps: { inline: [/opencode-plugin-kit/] } },
    include: ["**/*.test.ts", "**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["index.ts", "tui.tsx"],
      thresholds: { lines: 100, functions: 100, statements: 100, branches: 100 },
    },
  },
})
