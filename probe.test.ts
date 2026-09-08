import { expect, test } from "vitest"
import { normalize } from "./tui.tsx"
test("probe", () => {
  expect(normalize({ id: "a", location: "/home/user/.config/opencode/skills/a" }).category).toBe("config/opencode")
  expect(normalize({ id: "a", location: "/x/y/a" }).category).toBe("y")
})
