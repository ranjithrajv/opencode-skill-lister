// Server-side entrypoint. All behavior (the sidebar skills list) lives in the
// TUI entrypoint (tui.tsx), exposed via the "./tui" export. The server role
// must not import JSX — OpenCode's server transpiler resolves JSX with the
// default "react" runtime, which is not installed and fails the load.
import { Plugin } from "@opencode-ai/plugin"

const plugin = Plugin.define({
  id: "skill-lister.server",
  setup() {},
})

export { plugin }
export default plugin
