import { describe, expect, test } from "vitest"
import plugin from "../tui.js"
import serverPlugin from "../index.js"

// Cold start: empty skill stores and a service that may not respond yet.
// setup() must complete, register the sidebar slot, and yield cleanup.
function emptyCtx() {
  const slots: Array<Record<string, unknown>> = []
  const ctx: any = {
    storage: {
      store: (_key: string, opts: { initial: unknown }) => [{ ...structuredClone(opts.initial) }],
    },
    ui: {
      slot: (o: Record<string, unknown>) => {
        slots.push(o)
        return () => {}
      },
      toast: { show: () => {} },
    },
    keymap: { layer: () => {} },
    location: { directory: "/nonexistent-project" },
    data: {
      location: {
        default: () => ({ directory: "/nonexistent-project" }),
        skill: {
          list: () => [],
          sync: () => Promise.resolve(),
        },
      },
    },
    theme: { text: { default: "#fff", subdued: "#888" } },
  }
  return { ctx, slots }
}

describe("cold start", () => {
  test("server entrypoint is a no-op that completes", async () => {
    await expect(Promise.resolve(serverPlugin.setup({} as any))).resolves.toBeUndefined()
  })

  test("setup completes with no skills and registers the sidebar slot", async () => {
    const { ctx, slots } = emptyCtx()
    const cleanup = await plugin.setup(ctx)
    expect(typeof cleanup).toBe("function")
    const targets = slots.map((s) => s.after ?? s.append ?? s.replace)
    expect(targets).toContain("sidebar.content")
    expect(() => cleanup()).not.toThrow()
  })

  test("repeated setup on empty stores is idempotent", async () => {
    const { ctx } = emptyCtx()
    await Promise.resolve(plugin.setup(ctx))
    await expect(Promise.resolve(plugin.setup(ctx))).resolves.toBeDefined()
  })
})
