// The values context-bar keeps in the session's $.state, so a plugin reload
// (/reload-plugins, an update) doesn't start the session's token count over.

export type Tokens = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

export type Totals = {
  turns: number
  agentTurns: number
  main: Tokens
  agents: Tokens
}

declare module 'claude-code' {
  interface PluginState {
    'context-bar': { totals: Totals }
  }
}
