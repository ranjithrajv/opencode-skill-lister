import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { render } from "solid-js/web"
import { PluginContextProvider } from "@opencode-ai/plugin/tui"

// -- fixtures ---------------------------------------------------------------

interface FakeCtxOptions {
  location?: any
  /** results returned by successive skill.list() calls */
  lists?: Array<any[] | undefined>
  listThrows?: Error
  syncThrows?: Error
}

interface Harness {
  ctx: any
  calls: { list: number; sync: number; listLocations: any[]; syncLocations: any[] }
  slot: { after: string; render: (p: { sessionID?: string }) => any }
}

function makeCtx(opts: FakeCtxOptions = {}): Harness {
  const calls = { list: 0, sync: 0, listLocations: [] as any[], syncLocations: [] as any[] }
  const fallbackLocation = { directory: "/fallback/project" }
  const lists = [...(opts.lists ?? [])]
  const ctx: any = {
    theme: { text: { default: "#ffffff", subdued: "#888888" } },
    ui: { slot: (def: any) => def },
    location: opts.location,
    data: {
      location: {
        default: () => fallbackLocation,
        skill: {
          list: (location: any) => {
            calls.list++
            calls.listLocations.push(location)
            if (opts.listThrows) throw opts.listThrows
            return lists.shift()
          },
          sync: async (location: any) => {
            calls.sync++
            calls.syncLocations.push(location)
            if (opts.syncThrows) throw opts.syncThrows
            lists.push(...(opts.lists ?? []))
          },
        },
      },
    },
  }
  return { ctx, calls, slot: undefined as never }
}

let mounted: Array<() => void> = []

function mount(value: any, el: () => any) {
  const dispose = render(() => <PluginContextProvider value={value}>{el()}</PluginContextProvider>, document.body)
  mounted.push(dispose)
}

beforeEach(() => {
  document.body.innerHTML = ""
})

afterEach(() => {
  for (const d of mounted) d()
  mounted = []
})

// -- normalize ---------------------------------------------------------------

describe("normalize", () => {
  test("stringifies the id", () => {
    expect(normalize({ id: 42 }).id).toBe("42")
  })

  test("missing id becomes empty string", () => {
    expect(normalize({}).id).toBe("")
    expect(normalize({ id: undefined }).id).toBe("")
  })

  test("name passes through", () => {
    expect(normalize({ id: "a", name: "Alpha" }).name).toBe("Alpha")
    expect(normalize({ id: "a", name: 7 }).name).toBe("7")
  })

  test("missing name becomes undefined", () => {
    expect(normalize({ id: "a" }).name).toBeUndefined()
    expect(normalize({ id: "a", name: "" }).name).toBeUndefined()
  })

  test("slash is exactly true or false", () => {
    expect(normalize({ id: "a", slash: true }).slash).toBe(true)
    expect(normalize({ id: "a", slash: false }).slash).toBe(false)
    expect(normalize({ id: "a", slash: "yes" }).slash).toBe(false)
    expect(normalize({ id: "a" }).slash).toBe(false)
  })

  test("extracts category from frontmatter", () => {
    expect(normalize({ id: "a", content: "---\ncategory: foo\n---\n" }).category).toBe("foo")
  })

  test("strips quotes from frontmatter category", () => {
    expect(normalize({ id: "a", content: '---\ncategory: "bar"\n---\n' }).category).toBe("bar")
  })

  test("extracts category from parent directory", () => {
    expect(normalize({ id: "a", location: "/plugins/myplugin/skills/a" }).category).toBe("myplugin")
  })

  test("returns source root for skills folder", () => {
    expect(normalize({ id: "a", location: "/foo/skills/a" }).category).toBe("foo")
    expect(normalize({ id: "a", location: "/foo/skill/a" }).category).toBe("foo")
  })

  test("returns undefined when no meaningful category", () => {
    expect(normalize({ id: "a", location: "/a" }).category).toBeUndefined()
  })

  test("prefixes opencode global skills with parent dir", () => {
    // ~/.config/opencode/skills → "config/opencode"
    expect(normalize({ id: "a", location: "/home/user/.config/opencode/skills/a" }).category).toBe("config/opencode")
  })

  test("returns source root when opencode is not the product dir", () => {
    // project .opencode/skills → "opencode" (the parent of skills)
    expect(normalize({ id: "a", location: "/project/.opencode/skills/a" }).category).toBe("opencode")
  })

  test("returns undefined when opencode/skills has no directory above it", () => {
    // "opencode/skills" at depth < 2 — there is no parent to prefix, and the
    // parent segment is "skills" itself, so no category resolves.
    expect(normalize({ id: "a", location: "opencode/skills/a" }).category).toBeUndefined()
  })

  test("returns undefined when no category info", () => {
    expect(normalize({ id: "a" }).category).toBeUndefined()
  })
})

// -- skillLabel --------------------------------------------------------------

describe("skillLabel", () => {
  test("uses the name when different from the id", () => {
    expect(skillLabel({ id: "a", name: "Alpha" })).toBe("Alpha")
  })

  test("falls back to the id when name equals the id", () => {
    expect(skillLabel({ id: "same", name: "same" })).toBe("same")
  })

  test("falls back to the id when there is no name", () => {
    expect(skillLabel({ id: "only" })).toBe("only")
  })
})

// -- loadSkills --------------------------------------------------------------

describe("loadSkills", () => {
  test("uses ctx.location directly when present", async () => {
    const h = makeCtx({ location: { directory: "/explicit" }, lists: [[{ id: "a" }]] })
    const skills = await loadSkills(h.ctx)
    expect(h.calls.listLocations).toEqual([{ directory: "/explicit" }])
    expect(skills).toEqual([{ id: "a", name: undefined, slash: false }])
    // The store may hold stale frontmatter, so loadSkills always re-syncs.
    expect(h.calls.sync).toBe(1)
  })

  test("falls back to ctx.data.location.default() when ctx.location is missing", async () => {
    const h = makeCtx({ lists: [[{ id: "a" }]] })
    await loadSkills(h.ctx)
    expect(h.calls.listLocations).toEqual([{ directory: "/fallback/project" }])
  })

  test("always syncs before reading, then returns the synced list", async () => {
    const h = makeCtx({ lists: [[{ id: "a" }, { id: "b", name: "Bee" }]] })
    const skills = await loadSkills(h.ctx)
    expect(h.calls.sync).toBe(1)
    expect(h.calls.list).toBe(1)
    expect(skills).toEqual([
      { id: "a", name: undefined, slash: false },
      { id: "b", name: "Bee", slash: false },
    ])
  })

  test("an empty post-sync list yields no skills", async () => {
    const h = makeCtx({ lists: [[]] })
    const skills = await loadSkills(h.ctx)
    expect(h.calls.sync).toBe(1)
    expect(skills).toEqual([])
  })

  test("a still-undefined post-sync list is treated as empty", async () => {
    const h = makeCtx({ lists: [[undefined]] })
    await loadSkills(h.ctx)
    expect(h.calls.sync).toBe(1)
    expect(h.calls.list).toBe(1)
  })

  test("treats a still-undefined post-sync list as empty", async () => {
    const h = makeCtx({ lists: [undefined, undefined] })
    const skills = await loadSkills(h.ctx)
    expect(h.calls.sync).toBe(1)
    expect(skills).toEqual([])
  })

  test("a throwing sync is swallowed and the cached list is still read", async () => {
    const h = makeCtx({ syncThrows: new Error("no sync"), lists: [[{ id: "a" }]] })
    const skills = await loadSkills(h.ctx)
    expect(h.calls.sync).toBe(1)
    expect(skills).toEqual([{ id: "a", name: undefined, slash: false, category: undefined }])
  })

  test("normalizes entries and drops empty ids", async () => {
    const h = makeCtx({
      lists: [[{ id: "keep", name: "Keep", slash: true }, { name: "NoId" }, { id: null }]],
    })
    const skills = await loadSkills(h.ctx)
    expect(skills).toEqual([{ id: "keep", name: "Keep", slash: true }])
  })
})

// -- plugin setup + rendered SkillList ----------------------------------------

// Static import: a dynamic `await import()` here creates a second module
// instance whose v8 coverage blocks get misattributed, breaking 100%.
import plugin from "../tui.tsx"
import { loadSkills, normalize, skillLabel } from "../tui.tsx"

async function boot(opts: FakeCtxOptions = {}): Promise<Harness> {
  const h = makeCtx(opts)
  const slot = plugin.setup(h.ctx)
  h.slot = slot
  // give the fire-and-forget cache warm-up a tick
  await new Promise((r) => setTimeout(r, 0))
  return h
}

function text(): string {
  return document.body.textContent ?? ""
}

describe("plugin setup", () => {
  test("registers a sidebar slot before sidebar.footer", async () => {
    const h = await boot({ lists: [[{ id: "a" }]] })
    expect(h.slot.before).toBe("sidebar.footer")
    expect(typeof h.slot.render).toBe("function")
  })

  test("warms the skill cache at setup (sync runs once)", async () => {
    const h = await boot({ lists: [[{ id: "a" }]] })
    expect(h.calls.sync).toBe(1)
    expect(h.calls.list).toBeGreaterThanOrEqual(1)
  })

  test("a throwing loadSkills does not break setup", async () => {
    const h = await boot({ listThrows: new Error("boom") })
    expect(h.slot.before).toBe("sidebar.footer")
  })

  test("renders the error fallback when the skill list throws", async () => {
    const h = await boot({ listThrows: new Error("boom") })
    mount(h.ctx, () => h.slot.render({}))
    await vi.waitFor(() => expect(text()).toContain("⚠ skills unavailable"), { timeout: 1000, interval: 20 })
  })

  test("renders nothing when there are no skills", async () => {
    const h = await boot({ lists: [[], []] })
    mount(h.ctx, () => h.slot.render({ sessionID: "s1" }))
    await vi.waitFor(() => expect(h.calls.sync).toBeGreaterThanOrEqual(1), { timeout: 1000, interval: 20 })
    expect(text()).not.toContain("SKILLS")
  })

  test("renders rows without an arrow when there are at most 2 skills", async () => {
    const h = await boot({
      lists: [
        [
          { id: "b", name: "Bravo" },
          { id: "a", name: "Alpha", slash: true },
        ],
      ],
    })
    mount(h.ctx, () => h.slot.render({ sessionID: "s1" }))
    await vi.waitFor(() => expect(text()).toContain("SKILLS"), { timeout: 1000, interval: 20 })
    expect(text()).toContain("(2)")
    expect(text()).toContain("•")
    expect(text()).toContain("Alpha/")
    expect(text()).toContain("Bravo")
    // alphabetical sort
    const body = text()
    expect(body.indexOf("Alpha/")).toBeLessThan(body.indexOf("Bravo"))
    expect(text()).not.toContain("▶")
    expect(text()).not.toContain("▼")
  })

  test("collapses to a header with ▶ and a count when there are more than 2 skills", async () => {
    const h = await boot({
      lists: [[{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]],
    })
    mount(h.ctx, () => h.slot.render({ sessionID: "s1" }))
    await vi.waitFor(() => expect(text()).toContain("▶"), { timeout: 1000, interval: 20 })
    expect(text()).toContain("(4)")
    expect(text()).not.toContain("•")
    expect(text()).not.toContain("▼")
  })

  test("mousedown does not expand when there are at most 2 skills", async () => {
    const h = await boot({ lists: [[{ id: "a" }, { id: "b" }]] })
    mount(h.ctx, () => h.slot.render({ sessionID: "s1" }))
    await vi.waitFor(() => expect(text()).toContain("SKILLS"), { timeout: 1000, interval: 20 })
    const boxes = document.body.querySelectorAll("box")
    const header = boxes[boxes.length - 1]
    header.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
    await new Promise((r) => setTimeout(r, 0))
    expect(text()).not.toContain("▼")
    expect(text()).toContain("(2)")
  })

  test("mousedown toggles expansion when there are more than 2 skills", async () => {
    const h = await boot({
      lists: [[{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d", slash: true }]],
    })
    mount(h.ctx, () => h.slot.render({ sessionID: "s1" }))
    await vi.waitFor(() => expect(text()).toContain("▶"), { timeout: 1000, interval: 20 })

    // the header is the innermost box (outer box is the container)
    const header = document.body.querySelectorAll("box")[1]
    header.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
    await vi.waitFor(() => expect(text()).toContain("▼"), { timeout: 1000, interval: 20 })
    // expanded: all rows visible, slash suffix rendered, no count suffix
    expect(text()).toContain("d/")
    expect(text()).not.toContain("(4)")

    // collapse again
    header.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
    await vi.waitFor(() => expect(text()).toContain("▶"), { timeout: 1000, interval: 20 })
    expect(text()).toContain("(4)")
    expect(text()).not.toContain("•")
  })

  test("renders skills grouped by category when categories are present", async () => {
    const h = await boot({
      lists: [
        [
          { id: "a", name: "Alpha", content: "---\ncategory: tools\n---\n" },
          { id: "m", name: "Misc" },
          { id: "z", name: "Zulu", content: "---\ncategory: coding\n---\n" },
        ],
      ],
    })
    mount(h.ctx, () => h.slot.render({ sessionID: "s1" }))
    await vi.waitFor(() => expect(text()).toContain("SKILLS"), { timeout: 1000, interval: 20 })
    // 3 skills start collapsed; expand the section.
    const header = document.body.querySelectorAll("box")[1]
    header.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
    await vi.waitFor(() => expect(text()).toContain("TOOLS"), { timeout: 1000, interval: 20 })
    expect(text()).toContain("CODING")
    // The uncategorized skill lands in a GENERAL group sorted last.
    expect(text()).toContain("GENERAL (1)")
    expect(text()).toContain("Misc")
  })

  test("renders category header with expand/collapse indicator", async () => {
    const h = await boot({
      lists: [
        [
          { id: "a", name: "Alpha", content: "---\ncategory: tools\n---\n" },
          { id: "b", name: "Bravo", content: "---\ncategory: tools\n---\n" },
        ],
      ],
    })
    mount(h.ctx, () => h.slot.render({ sessionID: "s1" }))
    await vi.waitFor(() => expect(text()).toContain("TOOLS"), { timeout: 1000, interval: 20 })
    // expanded by default - items visible, shows ▾ indicator
    expect(text()).toContain("Alpha")
    expect(text()).toContain("Bravo")
    expect(text()).toContain("▾")
  })
})
