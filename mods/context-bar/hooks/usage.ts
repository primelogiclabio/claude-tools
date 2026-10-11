// Pure figures and formatting for the context bar: no engine calls here, so
// the tests can check them directly.

export type Level = 'ok' | 'warn' | 'danger'

export type Tokens = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

export type Totals = {
  /** Turns of the main loop counted. */
  turns: number
  /** Subagent turns counted. */
  agentTurns: number
  main: Tokens
  agents: Tokens
}

export type RateLimit = { kind: string; percentUsed: number; resetsAt?: string }

/** One row of the engine's /context breakdown, as the bar draws it. */
export type Category = {
  name: string
  tokens: number
  /** A theme key (`promptBorder`, `permission`, …), the colour /context draws it in. */
  color: string
  kind: 'used' | 'free' | 'buffer' | 'deferred'
}

/** The window by category: the engine's local estimate, as /context counts it. */
export type Breakdown = {
  categories: Category[]
  /** The window the categories are measured against (may be a compaction window). */
  maxTokens: number
  /** Where auto-compaction runs; absent when it's off. */
  compactAt?: number
}

/** What the bar draws, as the engine last measured it. */
export type Snapshot = {
  window: number
  tokens?: number
  percent?: number
  rateLimits: RateLimit[]
  costUsd?: number
  breakdown?: Breakdown
}

const LABEL: Record<string, string> = {
  'system tools': 'tools',
  'custom agents': 'agents',
  'free space': 'free',
  'autocompact buffer': 'compact buffer',
}

/** /context's row name, lower-cased and shortened as the bar's legend shows it. */
export function categoryLabel(name: string): string {
  const lower = name.toLowerCase()

  return LABEL[lower] ?? lower
}

/** 0.3%, 1%, 19%: one decimal under 1%, whole numbers above. */
export function pctShort(p: number): string {
  if (p > 0 && p < 1) return `${p.toFixed(1)}%`

  return `${Math.round(p)}%`
}

/** The categories the bar draws: in the window (not deferred), with tokens, in /context's order. */
export function barCategories(b: Breakdown): Category[] {
  return b.categories.filter(c => c.kind !== 'deferred' && c.tokens > 0)
}

/**
 * Cells per category for a bar `width` wide, proportional to tokens: largest
 * remainders first, and every category that has tokens gets at least one cell
 * while the bar has room, taken from the widest segment.
 */
export function allocate(tokens: readonly number[], width: number): number[] {
  const total = tokens.reduce((a, b) => a + b, 0)
  if (total <= 0 || width <= 0) return tokens.map(() => 0)
  const exact = tokens.map(t => (t / total) * width)
  const cells = exact.map(Math.floor)
  let left = width - cells.reduce((a, b) => a + b, 0)
  const order = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r)
  for (const { i } of order) {
    if (left <= 0) break
    cells[i] = (cells[i] ?? 0) + 1
    left -= 1
  }
  const nonzero = tokens.filter(t => t > 0).length
  if (nonzero <= width) {
    for (let i = 0; i < tokens.length; i++) {
      if ((tokens[i] ?? 0) > 0 && cells[i] === 0) {
        let widest = 0
        for (let j = 1; j < cells.length; j++) if ((cells[j] ?? 0) > (cells[widest] ?? 0)) widest = j
        if ((cells[widest] ?? 0) <= 1) break
        cells[widest] = (cells[widest] ?? 0) - 1
        cells[i] = 1
      }
    }
  }

  return cells
}

export const NO_TOKENS: Tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

export function emptyTotals(): Totals {
  return { turns: 0, agentTurns: 0, main: { ...NO_TOKENS }, agents: { ...NO_TOKENS } }
}

export function addUsage(t: Tokens, u: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number }): Tokens {
  return {
    input: t.input + u.input_tokens,
    output: t.output + u.output_tokens,
    cacheRead: t.cacheRead + u.cache_read_input_tokens,
    cacheWrite: t.cacheWrite + u.cache_creation_input_tokens,
  }
}

export function sum(t: Tokens): number {
  return t.input + t.output + t.cacheRead + t.cacheWrite
}

export function sessionTokens(totals: Totals): number {
  return sum(totals.main) + sum(totals.agents)
}

export function level(percent: number | undefined, warnAt: number, dangerAt: number): Level {
  if (percent === undefined) return 'ok'
  if (percent >= dangerAt) return 'danger'
  if (percent >= warnAt) return 'warn'

  return 'ok'
}

export const LEVEL_COLOR: Record<Level, 'success' | 'warning' | 'error'> = {
  ok: 'success',
  warn: 'warning',
  danger: 'error',
}

/** 1234 → 1.2k, 124000 → 124k, 1240000 → 1.24M. */
export function fmtTokens(n: number): string {
  if (n < 1000) return String(Math.round(n))
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`
  const m = (n / 1_000_000).toFixed(n < 10_000_000 ? 2 : 1).replace(/\.?0+$/, '')

  return `${m}M`
}

export function fmtUsd(usd: number): string {
  return usd < 10 ? `$${usd.toFixed(2)}` : `$${usd.toFixed(1)}`
}

/** A bar `width` cells wide, filled to `percent`. */
export function bar(percent: number | undefined, width: number): { filled: string; empty: string } {
  const w = Math.max(4, Math.floor(width))
  const p = Math.min(100, Math.max(0, percent ?? 0))
  const n = Math.round((p / 100) * w)

  return { filled: '█'.repeat(n), empty: '░'.repeat(w - n) }
}

const LIMIT_LABEL: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' }

export function limitLabel(kind: string): string {
  return LIMIT_LABEL[kind] ?? kind.replace(/_/g, ' ')
}

export function fmtPercent(p: number): string {
  return Number.isInteger(p) ? `${p}%` : `${p.toFixed(1)}%`
}

/** "in 2h 14m" for a reset time, measured from `now`. */
export function fmtReset(resetsAt: string | undefined, now: number): string {
  if (resetsAt === undefined) return ''
  const at = Date.parse(resetsAt)
  if (Number.isNaN(at)) return ''
  const mins = Math.max(0, Math.round((at - now) / 60_000))
  if (mins < 60) return `resets in ${mins}m`
  const h = Math.floor(mins / 60)
  if (h < 48) return `resets in ${h}h ${mins % 60}m`

  return `resets in ${Math.round(h / 24)}d`
}

/** The text of the bar's figures after the bar itself, widest first. */
export function bandFigures(s: Snapshot, totals: Totals, showCost: boolean): string[] {
  const parts: string[] = []
  parts.push(
    s.tokens === undefined
      ? `—/${fmtTokens(s.window)}`
      : `${fmtPercent(s.percent ?? 0)} ${fmtTokens(s.tokens)}/${fmtTokens(s.window)}`,
  )
  parts.push(`session ${fmtTokens(sessionTokens(totals))} tok`)
  if (showCost && s.costUsd !== undefined) parts.push(fmtUsd(s.costUsd))
  for (const r of s.rateLimits) parts.push(`${limitLabel(r.kind)} ${fmtPercent(r.percentUsed)}`)

  return parts
}

/** The full text of `/context-bar`. */
export function describeUsage(
  s: Snapshot,
  totals: Totals,
  now: number,
  categories: { name: string; tokens: number; kind: string }[] | undefined,
): string {
  const lines: string[] = []
  lines.push('Context window')
  if (s.tokens === undefined) {
    lines.push(`  ${fmtTokens(s.window)} tokens; no response in this window yet (a new session, or just compacted).`)
  } else {
    lines.push(`  ${s.tokens.toLocaleString('en-US')} of ${s.window.toLocaleString('en-US')} tokens (${fmtPercent(s.percent ?? 0)})`)
  }
  if (s.breakdown?.compactAt !== undefined) {
    lines.push(`  Auto-compaction at ${s.breakdown.compactAt.toLocaleString('en-US')} tokens`)
  }
  if (categories !== undefined && categories.length > 0) {
    lines.push('  By category (local estimate):')
    for (const c of categories) {
      if (c.tokens <= 0) continue
      const note = c.kind === 'deferred' ? ' (loaded on demand, not in the window)' : c.kind === 'free' ? ' (free)' : c.kind === 'buffer' ? ' (compaction reserve)' : ''
      lines.push(`    ${c.name}: ${fmtTokens(c.tokens)}${note}`)
    }
  }

  lines.push('')
  lines.push('Tokens this session (counted by context-bar since it loaded)')
  const row = (label: string, t: Tokens, turns: number) =>
    `  ${label}: ${fmtTokens(sum(t))} in ${turns} turn${turns === 1 ? '' : 's'}  ` +
    `(input ${fmtTokens(t.input)}, output ${fmtTokens(t.output)}, cache read ${fmtTokens(t.cacheRead)}, cache write ${fmtTokens(t.cacheWrite)})`
  lines.push(row('Main conversation', totals.main, totals.turns))
  if (totals.agentTurns > 0) lines.push(row('Subagents', totals.agents, totals.agentTurns))
  lines.push(`  Total: ${fmtTokens(sessionTokens(totals))}`)

  lines.push('')
  lines.push('Cost')
  lines.push(
    s.costUsd === undefined
      ? '  Not available: this host keeps no cost ledger.'
      : `  ${fmtUsd(s.costUsd)} this session, as /cost totals it (an API-price estimate; on a subscription you are not billed this).`,
  )

  lines.push('')
  lines.push('Plan rate limits')
  if (s.rateLimits.length === 0) {
    lines.push('  None reported. They appear on a Claude subscription after the first response; API-key use has none.')
  } else {
    for (const r of s.rateLimits) {
      const reset = fmtReset(r.resetsAt, now)
      lines.push(`  ${limitLabel(r.kind)}: ${fmtPercent(r.percentUsed)} used${reset ? `, ${reset}` : ''}`)
    }
  }

  return lines.join('\n')
}
