import { defineConfig } from "vite"
import solid from "vite-plugin-solid"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

// Build config for publishing: compiles the Solid JSX in index.ts/tui.tsx to
// plain ESM JS under dist/ so OpenCode's loader (Bun, which defaults to the
// React JSX runtime for raw .tsx) never sees Solid JSX source.
const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [solid()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    lib: {
      entry: {
        index: resolve(root, "index.ts"),
        tui: resolve(root, "tui.tsx"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "solid-js",
        "solid-js/web",
        "@opentui/core",
        "@opentui/solid",
        "@opencode-ai/plugin",
        "@opencode-ai/plugin/tui",
        "opencode-plugin-kit",
        "opencode-plugin-kit/collapsible",
      ],
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
})
