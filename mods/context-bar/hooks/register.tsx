import type { EngineInterface, Register } from 'claude-code'

import {
  LEVEL_COLOR,
  addUsage,
  bandFigures,
  bar,
  describeUsage,
  emptyTotals,
  level,
  limitLabel,
  fmtPercent,
  type Snapshot,
  type Totals,
} from './usage'

const COMMAND = 'context-bar'

const HELP = [
  '/context-bar            the full breakdown: context by category, tokens this session, cost, rate limits',
  '/context-bar hide       hide the bar above the prompt for this session',
  '/context-bar show       show it again',
].join('\n')

// Module state. A reload of the module (a plugin update, /reload-plugins)
// starts the token totals over; the context, cost and rate-limit figures come
// from the engine each time and are always whole.
let snap: Snapshot = { window: 0, rateLimits: [] }
let totals: Totals = emptyTotals()
let isBandShown = true
let warnAt = 60
let dangerAt = 85
let isCostShown = true

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function take(u: {
  context: { window: number; tokens?: number; percent?: number }
  rateLimits: readonly { kind: string; percentUsed: number; resetsAt?: string }[]
  cost?: { usd: number }
}): void {
  snap = {
    window: u.context.window,
    tokens: u.context.tokens,
    percent: u.context.percent,
    rateLimits: u.rateLimits.map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt })),
    costUsd: u.cost?.usd,
  }
}

async function refresh($: EngineInterface): Promise<void> {
  take(await $.session.usage())
  $.ui.invalidate('ui.render')
}

export const register: Register = (on, options) => {
  isBandShown = options.showBand !== false
  isCostShown = options.showCost !== false
  warnAt = num(options.warnAt, 60)
  dangerAt = Math.max(warnAt, num(options.dangerAt, 85))
  totals = emptyTotals()

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await $.command.register({
      name: COMMAND,
      description: 'Context window, tokens this session, cost and rate limits in full; hide or show the bar',
      argumentHint: '[hide|show|help]',
    })
    await refresh($).catch(() => undefined)

    return started
  })

  // Pushed by the engine after each turn, and when a rate-limit window moves.
  on('session.measure', async ($, e, next) => {
    take(e)
    $.ui.invalidate('ui.render')

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.usage !== undefined) {
      if (e.agentId === undefined) {
        totals = { ...totals, turns: totals.turns + 1, main: addUsage(totals.main, e.usage) }
      } else {
        totals = { ...totals, agentTurns: totals.agentTurns + 1, agents: addUsage(totals.agents, e.usage) }
      }
      $.ui.invalidate('ui.render')
    }

    return result
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const verb = e.args.trim().toLowerCase()
    if (verb === 'help' || verb === '?') return { text: HELP }
    if (verb === 'hide') {
      isBandShown = false
      $.ui.invalidate('ui.render')

      return { text: 'Context bar hidden for this session. /context-bar show brings it back.' }
    }
    if (verb === 'show') {
      isBandShown = true
      $.ui.invalidate('ui.render')

      return { text: 'Context bar shown.' }
    }
    if (verb !== '') return { text: `Unknown option "${verb}".\n${HELP}` }

    const usage = await $.session.usage({ breakdown: 'summary' })
    take(usage)
    const categories = usage.context.breakdown?.categories.map(c => ({ name: c.name, tokens: c.tokens, kind: c.kind }))

    return { text: describeUsage(snap, totals, await $.clock.now(), categories) }
  }).catch(($, e, next) => ({
    text: `context-bar: /context-bar failed${next.error ? `: ${next.error.message}` : ''}.`,
  }))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!isBandShown || e.props.hasSurvey || snap.window <= 0) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const columns = Math.max(20, e.props.bodyColumns)
    const figures = bandFigures(snap, totals, isCostShown)
    const limits = figures.slice(figures.length - snap.rateLimits.length)
    let lead = figures.slice(0, figures.length - snap.rateLimits.length)
    let shownLimits = snap.rateLimits.slice()

    // Fit the row: drop rate limits from the end, then cost and session tokens,
    // keeping a bar of at least 8 cells and the context figure.
    const label = 'context '
    const width = () => label.length + 1 + [...lead, ...shownLimits.map((_, i) => limits[i] ?? '')].join(' · ').length + 3
    while (columns - width() < 8 && shownLimits.length > 0) shownLimits = shownLimits.slice(0, -1)
    while (columns - width() < 8 && lead.length > 1) lead = lead.slice(0, -1)
    const barWidth = Math.min(30, Math.max(8, columns - width()))
    const b = bar(snap.percent, barWidth)
    const color = LEVEL_COLOR[level(snap.percent, warnAt, dangerAt)]

    return (
      <Box flexDirection="row">
        <Text dimColor>{label}</Text>
        <Text color={color}>{b.filled}</Text>
        <Text dimColor>{b.empty}</Text>
        <Text> </Text>
        <Text color={color}>{lead[0]}</Text>
        {lead.length > 1 && <Text dimColor>{' · ' + lead.slice(1).join(' · ')}</Text>}
        {shownLimits.map(r => (
          <Text key={`limit-${r.kind}`} color={LEVEL_COLOR[level(r.percentUsed, warnAt, dangerAt)]}>
            {' · ' + limitLabel(r.kind) + ' ' + fmtPercent(r.percentUsed)}
          </Text>
        ))}
      </Box>
    )
  })
}
