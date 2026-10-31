import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import {
  LEVEL_COLOR,
  addUsage,
  allocate,
  barCategories,
  categoryLabel,
  describeUsage,
  emptyTotals,
  fmtPercent,
  fmtTokens,
  fmtUsd,
  level,
  limitLabel,
  pctShort,
  sessionTokens,
  type Breakdown,
  type Category,
  type Snapshot,
  type Totals,
} from './usage'

const COMMAND = 'context-bar'

// The session's token totals live in $.state, so a plugin reload keeps them.
const totalsAtom = atom({ plugin: 'context-bar', key: 'totals' } as const, emptyTotals())

const HELP = [
  '/context-bar            the full breakdown as text: context by category, tokens this session, cost, rate limits',
  '/context-bar hide       hide the card above the prompt for this session',
  '/context-bar show       show it again',
  '/context-bar compact    header and bar only, no legend',
  '/context-bar full       header, bar and the legend',
].join('\n')

// Module state: the engine's latest figures, fetched again after a reload.
let snap: Snapshot = { window: 0, rateLimits: [] }
let isBandShown = true
let isLegendShown = true
let warnAt = 60
let dangerAt = 85
let isCostShown = true
let isBreaking = false

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

type UsageLike = {
  context: {
    window: number
    tokens?: number
    percent?: number
    breakdown?: {
      categories: readonly { name: string; tokens: number; color: string; kind: Category['kind'] }[]
      rawMaxTokens: number
      autoCompactThreshold?: number
      isAutoCompactEnabled: boolean
    }
  }
  rateLimits: readonly { kind: string; percentUsed: number; resetsAt?: string }[]
  cost?: { usd: number }
}

function toBreakdown(b: NonNullable<UsageLike['context']['breakdown']>): Breakdown {
  return {
    categories: b.categories.map(c => ({ name: c.name, tokens: c.tokens, color: c.color, kind: c.kind })),
    maxTokens: b.rawMaxTokens,
    compactAt: b.isAutoCompactEnabled ? b.autoCompactThreshold : undefined,
  }
}

function take(u: UsageLike): void {
  snap = {
    window: u.context.window,
    tokens: u.context.tokens,
    percent: u.context.percent,
    rateLimits: u.rateLimits.map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt })),
    costUsd: u.cost?.usd,
    // A measurement without a breakdown keeps the last one until the next.
    breakdown: u.context.breakdown !== undefined ? toBreakdown(u.context.breakdown) : snap.breakdown,
  }
}

// The /context categories, estimated locally ("summary": no API request).
async function refresh($: EngineInterface): Promise<void> {
  if (isBreaking) return
  isBreaking = true
  try {
    take(await $.session.usage({ breakdown: 'summary' }))
  } catch {
    take(await $.session.usage())
  } finally {
    isBreaking = false
  }
  $.ui.invalidate('ui.render')
}

// The free part of the bar: the theme's faint grey.
const FREE_FILL = 'subtle'

function pad(text: string, width: number): string {
  return text.length >= width ? text : text + ' '.repeat(width - text.length)
}

export const register: Register = (on, options) => {
  isBandShown = options.showBand !== false
  isLegendShown = options.showLegend !== false
  isCostShown = options.showCost !== false
  warnAt = num(options.warnAt, 60)
  dangerAt = Math.max(warnAt, num(options.dangerAt, 85))
  snap = { window: 0, rateLimits: [] }

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await $.command.register({
      name: COMMAND,
      description: 'Context window by category, tokens this session, cost and rate limits; hide, show or compact the card',
      argumentHint: '[hide|show|compact|full|help]',
    })
    await refresh($).catch(() => undefined)

    return started
  })

  // Pushed by the engine after each turn, and when a rate-limit window moves.
  on('session.measure', async ($, e, next) => {
    take(e)
    $.ui.invalidate('ui.render')
    if (e.changed.includes('context')) void refresh($).catch(() => undefined)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    const usage = e.usage
    if (usage !== undefined) {
      const isMain = e.agentId === undefined
      await update($, totalsAtom, (t: Totals) =>
        isMain
          ? { ...t, turns: t.turns + 1, main: addUsage(t.main, usage) }
          : { ...t, agentTurns: t.agentTurns + 1, agents: addUsage(t.agents, usage) },
      )
    }

    return result
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const verb = e.args.trim().toLowerCase()
    if (verb === 'help' || verb === '?') return { text: HELP }
    const toggles: Record<string, () => string> = {
      hide: () => ((isBandShown = false), 'Context card hidden for this session. /context-bar show brings it back.'),
      show: () => ((isBandShown = true), 'Context card shown.'),
      compact: () => ((isLegendShown = false), 'Context card: header and bar only. /context-bar full brings the legend back.'),
      full: () => ((isLegendShown = true), (isBandShown = true), 'Context card: header, bar and legend.'),
    }
    const toggle = toggles[verb]
    if (toggle !== undefined) {
      const said = toggle()
      $.ui.invalidate('ui.render')

      return { text: said }
    }
    if (verb !== '') return { text: `Unknown option "${verb}".\n${HELP}` }

    await refresh($)
    const categories = snap.breakdown?.categories.map(c => ({ name: c.name, tokens: c.tokens, kind: c.kind }))

    return { text: describeUsage(snap, await read($, totalsAtom), await $.clock.now(), categories) }
  }).catch(($, e, next) => ({
    text: `context-bar: /context-bar failed${next.error ? `: ${next.error.message}` : ''}.`,
  }))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!isBandShown || e.props.hasSurvey || snap.window <= 0) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const columns = Math.max(24, e.props.bodyColumns)
    const color = LEVEL_COLOR[level(snap.percent, warnAt, dangerAt)]
    const b = snap.breakdown
    const cats = b === undefined ? [] : barCategories(b)

    const totals = await read($, totalsAtom)

    // Header: "◆ context" left; "212k of 1M · compacts at 950k" and the badge
    // right, placed by flex so it lines up on any surface's font.
    const used = snap.tokens === undefined ? '—' : fmtTokens(snap.tokens)
    const right = `${used} of ${fmtTokens(snap.window)}${b?.compactAt !== undefined ? ` · compacts at ${fmtTokens(b.compactAt)}` : ''}`
    const badge = ` ${snap.percent === undefined ? '—' : `${snap.percent}%`} `
    const left = '◆ context'
    const rightFits = left.length + 2 + right.length + 1 + badge.length <= columns

    const header = (
      <Box key="header" flexDirection="row" justifyContent="space-between" width={columns}>
        <Text bold>{left}</Text>
        <Box flexDirection="row">
          {rightFits && <Text dimColor>{right + ' '}</Text>}
          <Text key="badge" color={color} inverse bold>{badge}</Text>
        </Box>
      </Box>
    )

    // The bar: one segment per category, proportional to its share of the window.
    // Each segment is a Box painted with its category's colour and sized by
    // flex, never a run of block characters: a proportional font (the desktop
    // app) would make those overflow the row and wrap.
    const segment = (key: string, cells: number, fill: string) => (
      <Box key={key} flexGrow={cells} flexShrink={1} minWidth={1} height={1} backgroundColor={fill}>
        <Text> </Text>
      </Box>
    )
    let barRow
    if (cats.length > 0) {
      const cells = allocate(cats.map(c => c.tokens), columns)
      barRow = (
        <Box key="bar" flexDirection="row" width={columns} height={1} overflow="hidden">
          {cats.map((c, i) => {
            const n = cells[i] ?? 0
            if (n === 0) return null

            return segment(`seg-${i}`, n, c.kind === 'free' ? FREE_FILL : c.color)
          })}
        </Box>
      )
    } else {
      // No breakdown yet (or the engine gave none): the fill alone, in the level's colour.
      const n = Math.round(((snap.percent ?? 0) / 100) * columns)
      barRow = (
        <Box key="bar" flexDirection="row" width={columns} height={1} overflow="hidden">
          {n > 0 && segment('seg-fill', n, color)}
          {columns - n > 0 && segment('seg-free', columns - n, FREE_FILL)}
        </Box>
      )
    }

    // Legend: a coloured square, the label, tokens and share, in columns.
    const items = cats.map(c => ({
      c,
      text: c.kind === 'free'
        ? `${categoryLabel(c.name)} ${fmtTokens(c.tokens)}`
        : `${categoryLabel(c.name)} ${fmtTokens(c.tokens)} ${pctShort((c.tokens / (b?.maxTokens || 1)) * 100)}`,
    }))
    const cellWidth = Math.max(0, ...items.map(it => it.text.length)) + 4
    const perRow = Math.max(1, Math.floor(columns / Math.max(1, cellWidth)))
    const legendRows: (typeof items)[] = []
    for (let i = 0; i < items.length; i += perRow) legendRows.push(items.slice(i, i + perRow))

    // Session tokens, cost and rate limits, dim, on one last line.
    const usage: { key: string; text: string; color?: string }[] = [{ key: 'session', text: `session ${fmtTokens(sessionTokens(totals))} tok` }]
    if (isCostShown && snap.costUsd !== undefined) usage.push({ key: 'cost', text: fmtUsd(snap.costUsd) })
    for (const r of snap.rateLimits) {
      usage.push({ key: `limit-${r.kind}`, text: `${limitLabel(r.kind)} ${fmtPercent(r.percentUsed)}`, color: LEVEL_COLOR[level(r.percentUsed, warnAt, dangerAt)] })
    }

    // Fit the rows the band has: drop the usage line first, then the legend.
    const room = e.props.maxRows
    let showLegend = isLegendShown && legendRows.length > 0
    let showUsage = true
    if (2 + (showLegend ? legendRows.length : 0) + 1 > room) showUsage = false
    if (2 + (showLegend ? legendRows.length : 0) > room) showLegend = false

    return (
      <Box flexDirection="column" width={columns}>
        {header}
        {barRow}
        {showLegend &&
          legendRows.map((row, r) => (
            <Box key={`legend-${r}`} flexDirection="row">
              {row.map(({ c, text }, i) => (
                <Box key={`item-${r}-${i}`} flexDirection="row">
                  <Text color={c.kind === 'free' ? FREE_FILL : c.color}>■</Text>
                  <Text dimColor={c.kind === 'free'}>{' ' + pad(text, cellWidth - 2)}</Text>
                </Box>
              ))}
            </Box>
          ))}
        {showUsage && (
          <Box key="usage" flexDirection="row">
            {usage.map((u, i) => (
              <Text key={u.key} color={u.color} dimColor={u.color === undefined}>
                {(i === 0 ? '' : ' · ') + u.text}
              </Text>
            ))}
          </Box>
        )}
      </Box>
    )
  })
}
