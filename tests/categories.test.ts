import { describe, expect, test } from "vitest"
import { normalize } from "../tui.tsx"

// Category derivation is the only branchy logic in the widget; these cases
// close the uncovered fallback paths (parent-directory fallback, rootless
// paths, and general).
describe("normalize: category derivation", () => {
  const skill = (overrides: Record<string, unknown>) => ({
    id: "test-skill",
    ...overrides,
  })

  test("frontmatter category wins (quoted or bare)", () => {
    const q = normalize(skill({ content: '---\ncategory: "cloud"\n---\nbody' }))
    expect(q.category).toBe("cloud")
    const bare = normalize(skill({ content: "---\ncategory: workflows\n---\nbody" }))
    expect(bare.category).toBe("workflows")
  })

  test("source root above the generic skills folder", () => {
    const s = normalize(skill({ location: "/home/x/.claude/skills/foo/SKILL.md" }))
    expect(s.category).toBe("claude")
    const global = normalize(skill({ location: "/home/x/.config/opencode/skill/foo/SKILL.md" }))
    expect(global.category).toBe("config/opencode")
  })

  test("parent-directory fallback for non-skills folders", () => {
    const s = normalize(skill({ location: "/data/custom/myskill/SKILL.md" }))
    expect(s.category).toBe("myskill")
  })

  test("rootless path: skills folder at the top level falls back to parent", () => {
    const s = normalize(skill({ location: "skills/foo/SKILL.md" }))
    expect(s.category).toBe("foo")
  })

  test("unrecognized shapes fall back to general", () => {
    expect(normalize(skill({ location: "SKILL.md" })).category).toBeUndefined()
    expect(normalize(skill({})).category).toBeUndefined()
  })
})
