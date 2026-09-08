import { Plugin, usePlugin } from "@opencode-ai/plugin/tui"
import { createResource, For, Show } from "solid-js"
import { CollapsibleGroup, CollapsibleSection } from "opencode-plugin-kit/collapsible"
import { resolveLocation } from "opencode-plugin-kit"

// Skill info from the OpenCode API — kept minimal for the sidebar view.
// Entries carry id/name/slash (see the built-in Skills picker).
interface Skill {
  id: string
  name?: string
  slash?: boolean
  category?: string
}

// Category: frontmatter `category:` wins; else the source root — the
// directory above the generic "skills"/"skill" folder (e.g.
// ~/.claude/skills → "claude", project .opencode/skill → "opencode");
// else the skill's parent directory when meaningful; else "general".
function skillCategory(s: any): string | undefined {
  const fm = String(s?.content ?? "").match(/^---[\s\S]*?category:\s*([^\n]+)$/m)
  if (fm) return fm[1].trim().replace(/^["']|["']$/g, "")
  const loc = String(s?.location ?? "")
  const parts = loc.split("/").filter(Boolean)
  for (let i = parts.length - 1; i >= 0; i--) {
    const seg = parts[i].toLowerCase()
    if (seg === "skills" || seg === "skill") {
      const root = parts[i - 1]
      if (root && root.toLowerCase() !== "opencode") return root.replace(/^\.+/, "").toLowerCase()
      // ~/.config/opencode/skills → "opencode" is the product dir itself;
      // prefix the directory above it so global vs project stay distinct.
      if (root && i >= 2) return `${parts[i - 2].replace(/^\.+/, "")}/opencode`.toLowerCase()
    }
  }
  const parent = parts[parts.length - 2]?.toLowerCase()
  if (parent && parent !== "skills" && parent !== "skill") return parent
  return undefined
}

// Maps the raw skill entry (defensive — beta API) to our view shape.
export function normalize(s: any): Skill {
  return {
    id: String(s.id ?? ""),
    name: s.name ? String(s.name) : undefined,
    slash: s.slash === true,
    category: skillCategory(s),
  }
}

// Display label: fall back to the id when a skill has no friendly name.
export function skillLabel(s: Skill): string {
  return s.name && s.name !== s.id ? s.name : s.id
}

// Load skills the way the built-in Skills picker does:
// 1. read the cached store synchronously via list(location)
// 2. only sync (await) when the cache is empty, then read again
export async function loadSkills(ctx: any): Promise<Skill[]> {
  const location = resolveLocation(ctx)
  // Always re-sync before reading: the store may hold entries synced before
  // skill frontmatter changed on disk (e.g. newly added categories), and a
  // sync is a cheap local directory scan.
  await ctx.data.location.skill.sync(location).catch(() => {})
  const list = ctx.data.location.skill.list(location) ?? []
  // Filter before normalizing: a stale store can hold undefined entries.
  return (list as any[])
    .filter((s) => s && typeof s === "object")
    .map(normalize)
    .filter((s) => s.id)
}

// Collapsible list rendered through the kit's shared section/group
// components (same pattern as the built-in opencode.sidebar.mcp widget).
function SkillList(_props: { sessionID?: string }) {
  const ctx = usePlugin()
  const theme = ctx.theme

  const [skills] = createResource(loadSkills.bind(null, ctx))

  const sorted = () => [...(skills() ?? [])].sort((a, b) => skillLabel(a).localeCompare(skillLabel(b)))
  const count = () => sorted().length

  // Category sub-groups (general last), like the plugin manager's BUILT-IN
  // categories.
  const groups = () => {
    const map = new Map<string, Skill[]>()
    for (const s of sorted()) {
      const cat = s.category ?? "general"
      const list = map.get(cat) ?? []
      list.push(s)
      map.set(cat, list)
    }
    return [...map.entries()]
      .toSorted((a, b) => (a[0] === "general" ? 1 : b[0] === "general" ? -1 : a[0].localeCompare(b[0])))
      .map(([cat, items]) => ({ cat, items }))
  }
  const hasCategories = () => groups().some((g) => g.cat !== "general")

  const SkillRow = (p: { s: Skill }) => (
    <box flexDirection="row" gap={1} minWidth={0}>
      <text flexShrink={0}>•</text>
      <text fg={theme.text.default} wrapMode="none" truncate flexGrow={1} flexShrink={1} minWidth={0}>
        {skillLabel(p.s)}
        {p.s.slash ? "/" : ""}
      </text>
    </box>
  )

  return (
    <Show when={!skills.error} fallback={<text>⚠ skills unavailable</text>}>
      <Show when={count() > 0}>
        <CollapsibleSection title="SKILLS" count={count()}>
          <Show when={hasCategories()} fallback={<For each={sorted()}>{(s) => <SkillRow s={s} />}</For>}>
            <For each={groups()}>
              {(g) => (
                <CollapsibleGroup title={g.cat.toUpperCase()} count={g.items.length}>
                  <For each={g.items}>{(s) => <SkillRow s={s} />}</For>
                </CollapsibleGroup>
              )}
            </For>
          </Show>
        </CollapsibleSection>
      </Show>
    </Show>
  )
}

export default Plugin.define({
  id: "skill-lister.cli",
  setup(context: any) {
    // Warm the skill cache at startup, mirroring the built-in store sync.
    // Never await setup: slot renders must not block on this.
    loadSkills(context).catch(() => {})

    // Placed with `after` so it renders below the built-in sidebar.content
    // appends (Context, MCP). Multiple plugins using `after` on the same
    // slot render in opencode.json `plugins` order, so the skill list sits
    // directly under MCP, before later plugins (e.g. model recommender).
    return context.ui.slot({
      after: "sidebar.content",
      render: ({ sessionID }: { sessionID?: string }) => <SkillList sessionID={sessionID} />,
    })
  },
})
