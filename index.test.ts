import { describe, expect, test } from "vitest"
import plugin from "./index.ts"

describe("server entrypoint", () => {
  test("exposes a plugin with a no-op setup", () => {
    expect(plugin.id).toBe("skill-lister.server")
    expect(plugin.setup({} as never)).toBeUndefined()
  })
})
