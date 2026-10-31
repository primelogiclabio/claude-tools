import type { On, SessionUsage } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'

const PLUGIN = 'context-bar'

const START = { cwd: '/work/app', surface: 'terminal', isInteractive: true } as const
const RUN = { origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } } as const

const BAND_PROPS = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 12,
  bodyColumns: 120,
  scroll: { offset: 0, bodyRows: 12 },
  view: {},
} as const

type Usage = SessionUsage

// The /context categories of a 1M window, as the engine's local estimate
// returns them (the figures of the reference screenshot).
const CATEGORIES = [
  { name: 'System prompt', tokens: 3400, color: 'promptBorder', isDeferred: false, kind: 'used' },
  { name: 'System tools', tokens: 12000, color: 'suggestion', isDeferred: false, kind: 'used' },
  { name: 'MCP tools', tokens: 2600, color: 'planMode', isDeferred: false, kind: 'used' },
  { name: 'MCP tools (deferred)', tokens: 9000, color: 'inactive', isDeferred: true, kind: 'deferred' },
  { name: 'Custom agents', tokens: 1100, color: 'permission', isDeferred: false, kind: 'used' },
  { name: 'Memory files', tokens: 4900, color: 'remember', isDeferred: false, kind: 'used' },
  { name: 'Skills', tokens: 2200, color: 'warning', isDeferred: false, kind: 'used' },
  { name: 'Messages', tokens: 186000, color: 'claude', isDeferred: false, kind: 'used' },
  { name: 'Free space', tokens: 788000, color: 'inactive', isDeferred: false, kind: 'free' },
] as const

function breakdown() {
  return {
    categories: CATEGORIES,
    totalTokens: 212200,
    maxTokens: 1000000,
    rawMaxTokens: 1000000,
    autocompactSource: 'model-default',
    percentage: 21,
    gridRows: [],
    model: 'claude-opus-5-5',
    memoryFiles: [],
    mcpTools: [],
    agents: [],
    autoCompactThreshold: 950000,
    isAutoCompactEnabled: true,
    apiUsage: null,
  } as unknown as SessionUsage['context']['breakdown']
}

// The engine beneath the plugin: $.session.usage answers `usage`, with the
// breakdown when asked; the registered command is recorded.
function world(on: On, usage: Usage, opts: { hasBreakdown?: boolean } = {}) {
  const w = { usage, commands: [] as string[], breakdownCalls: 0 }
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.usage', ($, e) => {
    if (e.breakdown === undefined || opts.hasBreakdown === false) return { value: w.usage }
    w.breakdownCalls += 1

    return { value: { ...w.usage, context: { ...w.usage.context, breakdown: breakdown() } } }
  })
  on('command.register', ($, e) => {
    w.commands.push(e.name)

    return { value: { command: e.name } }
  })
  on('turn.complete', ($, e) => ({ text: e.answer, usage: e.usage }))
  on('session.measure', ($, e) => ({ changed: e.changed }))
  // The engine's own band, when the plugin hands it on: nothing to draw.
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box key="engine-band" />
  })

  return w
}

const FRESH: Usage = { startedAt: 1, context: { window: 1000000 }, rateLimits: [] }

const BUSY: Usage = {
  startedAt: 1,
  context: { window: 1000000, tokens: 212000, percent: 21 },
  rateLimits: [
    { kind: 'five_hour', percentUsed: 23.5, resetsAt: '2026-10-10T14:30:00Z' },
    { kind: 'seven_day', percentUsed: 91 },
  ],
  cost: { usd: 3.4123 },
}

const USAGE_1 = { input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 20000, cache_creation_input_tokens: 3000 }

function band(surface: 'terminal' | 'desktop', columns = 120, maxRows = 12) {
  return { plugin: PLUGIN, surface, component: 'AbovePrompt', props: { ...BAND_PROPS, bodyColumns: columns, maxRows } } as const
}

const settle = async () => {
  const { setTimeout: wait } = globalThis as unknown as { setTimeout: (fn: () => void, ms: number) => unknown }
  await new Promise<void>(resolve => wait(resolve, 20))
}

describe('context-bar', () => {
  test('registers /context-bar and reads the breakdown at start', async ($, on) => {
    const w = world(on, BUSY)
    mock.clock(on, { now: 0 })
    await $.session.start(START)
    expect(w.commands).toEqual(['context-bar'])
    expect(w.breakdownCalls).toBe(1)
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    test(`the card: header, a bar segmented by category, a legend (${surface})`, async ($, on) => {
      world(on, BUSY)
      mock.clock(on, { now: 0 })
      await $.session.start({ ...START, surface })
      const ui = await $.ui.mount(band(surface))
      expect(await ui.find({ type: 'Text', text: '◆ context' })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: '212k of 1M · compacts at 950k ' })).toBeDefined()
      const badge = await ui.find({ type: 'Text', text: ' 21% ' })
      expect(badge?.props.color).toBe('success')
      expect(badge?.props.inverse).toBe(true)

      // Segments are painted Boxes in /context's colours: messages is index 6
      // (deferred tools are left out), free space last, in the faint grey.
      const messages = await ui.find({ type: 'Box', key: 'seg-6' })
      expect(messages?.props.backgroundColor).toBe('claude')
      expect((await ui.find({ type: 'Box', key: 'seg-7' }))?.props.backgroundColor).toBe('subtle')
      expect(await ui.find({ type: 'Text', text: /█|░/ })).toBeUndefined()

      for (const label of ['system prompt 3.4k 0.3%', 'tools 12k 1%', 'mcp tools 2.6k 0.3%', 'agents 1.1k 0.1%', 'memory files 4.9k 0.5%', 'skills 2.2k 0.2%', 'messages 186k 19%', 'free 788k']) {
        expect(await ui.find({ type: 'Text', text: new RegExp(`^ ${label} *$`) })).toBeDefined()
      }
      expect(await ui.find({ type: 'Text', text: /deferred/ })).toBeUndefined()
      expect(await ui.find({ type: 'Text', text: ' · $3.41' })).toBeDefined()
      expect((await ui.find({ type: 'Text', text: ' · 7d 91%' }))?.props.color).toBe('error')
      await ui.unmount()
    })
  }

  test('every category in the window gets a segment, even a tiny one', async ($, on) => {
    world(on, BUSY)
    mock.clock(on, { now: 0 })
    await $.session.start(START)
    const ui = await $.ui.mount(band('terminal', 60))
    // The 8 categories in the window each draw: 7 coloured segments and the free one.
    const segs = []
    for (let i = 0; i < 8; i++) {
      const seg = await ui.find({ type: 'Box', key: `seg-${i}` })
      expect(seg).toBeDefined()
      segs.push(seg)
    }
    expect(segs.map(s => s?.props.backgroundColor)).toEqual(['promptBorder', 'suggestion', 'planMode', 'permission', 'remember', 'warning', 'claude', 'subtle'])
    // Their flex weights are the cells each would take, adding up to the row.
    expect(segs.reduce((n, s) => n + Number(s?.props.flexGrow ?? 0), 0)).toBe(60)
    await ui.unmount()
  })

  test('the badge colour follows the thresholds', { options: { warnAt: 15, dangerAt: 20 } }, async ($, on) => {
    world(on, BUSY)
    mock.clock(on, { now: 0 })
    await $.session.start(START)
    const ui = await $.ui.mount(band('terminal'))
    expect((await ui.find({ type: 'Text', text: ' 21% ' }))?.props.color).toBe('error')
    await ui.unmount()
  })

  test('without a breakdown it falls back to a single fill bar', async ($, on) => {
    world(on, BUSY, { hasBreakdown: false })
    mock.clock(on, { now: 0 })
    await $.session.start(START)
    const ui = await $.ui.mount(band('terminal'))
    expect(await ui.find({ type: 'Text', text: /messages/ })).toBeUndefined()
    expect((await ui.find({ type: 'Box', key: 'seg-fill' }))?.props.backgroundColor).toBe('success')
    expect((await ui.find({ type: 'Box', key: 'seg-free' }))?.props.flexGrow).toBe(95)
    await ui.unmount()
  })

  test('a fresh session shows the window with no fill yet', async ($, on) => {
    world(on, FRESH, { hasBreakdown: false })
    mock.clock(on, { now: 0 })
    await $.session.start(START)
    const ui = await $.ui.mount(band('terminal'))
    expect(await ui.find({ type: 'Text', text: '— of 1M ' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: ' — ' })).toBeDefined()
    await ui.unmount()
  })

  test('session.measure updates the badge and fetches a fresh breakdown', async ($, on) => {
    const w = world(on, FRESH)
    mock.clock(on, { now: 0 })
    await $.session.start(START)
    w.usage = { ...BUSY, context: { window: 1000000, tokens: 900000, percent: 90 } }
    await $.session.measure({ context: { window: 1000000, tokens: 900000, percent: 90 }, rateLimits: [], changed: ['context'] })
    await settle()
    expect(w.breakdownCalls).toBe(2)
    const ui = await $.ui.mount(band('terminal'))
    expect((await ui.find({ type: 'Text', text: ' 90% ' }))?.props.color).toBe('error')
    await ui.unmount()
  })

  test('a short band drops the usage line, then the legend', async ($, on) => {
    world(on, BUSY)
    mock.clock(on, { now: 0 })
    await $.session.start(START)
    let ui = await $.ui.mount(band('terminal', 120, 3))
    expect(await ui.find({ type: 'Text', text: /^ messages 186k/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /session .* tok/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: '◆ context' })).toBeDefined()
    await ui.unmount()
    ui = await $.ui.mount(band('terminal', 120, 4))
    expect(await ui.find({ type: 'Text', text: /^ messages 186k/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /session .* tok/ })).toBeUndefined()
    await ui.unmount()
  })

  test('/context-bar hide, show, compact and full', async ($, on) => {
    world(on, BUSY)
    mock.clock(on, { now: 0 })
    await $.session.start(START)
    expect((await $.command.run({ ...RUN, command: 'context-bar', args: 'hide' })).text).toMatch(/hidden/)
    let ui = await $.ui.mount(band('terminal'))
    expect(await ui.find({ type: 'Text', text: '◆ context' })).toBeUndefined()
    await ui.unmount()
    await $.command.run({ ...RUN, command: 'context-bar', args: 'show' })
    await $.command.run({ ...RUN, command: 'context-bar', args: 'compact' })
    ui = await $.ui.mount(band('terminal'))
    expect(await ui.find({ type: 'Text', text: '◆ context' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^ messages 186k/ })).toBeUndefined()
    await ui.unmount()
    await $.command.run({ ...RUN, command: 'context-bar', args: 'full' })
    ui = await $.ui.mount(band('terminal'))
    expect(await ui.find({ type: 'Text', text: /^ messages 186k/ })).toBeDefined()
    await ui.unmount()
  })

  test('/context-bar gives the full breakdown, subagents counted apart', async ($, on) => {
    world(on, BUSY)
    mock.clock(on, { now: Date.UTC(2026, 9, 10, 12) })
    await $.session.start(START)
    await $.turn.complete({ answer: 'a', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer', usage: { ...USAGE_1, model: 'm' } })
    await $.turn.complete({ answer: 'b', durationMs: 1, isAborted: false, turnId: 't2', reason: 'answer', agentId: 'agent-1', usage: { ...USAGE_1, model: 'm' } })
    const out = await $.command.run({ ...RUN, command: 'context-bar', args: '' })
    expect(out.text).toMatch(/212,000 of 1,000,000 tokens \(21%\)/)
    expect(out.text).toMatch(/Auto-compaction at 950,000 tokens/)
    expect(out.text).toMatch(/Messages: 186k/)
    expect(out.text).toMatch(/Free space: 788k \(free\)/)
    expect(out.text).toMatch(/MCP tools \(deferred\): 9\.0k \(loaded on demand, not in the window\)/)
    expect(out.text).toMatch(/Main conversation: 25k in 1 turn /)
    expect(out.text).toMatch(/Subagents: 25k in 1 turn /)
    expect(out.text).toMatch(/\$3\.41 this session/)
    expect(out.text).toMatch(/5h: 23\.5% used, resets in 2h 30m/)
  })

  test('off a subscription the rate limits say why they are missing', async ($, on) => {
    world(on, { ...BUSY, rateLimits: [], cost: undefined })
    mock.clock(on, { now: 0 })
    await $.session.start(START)
    const out = await $.command.run({ ...RUN, command: 'context-bar', args: '' })
    expect(out.text).toMatch(/None reported/)
    expect(out.text).toMatch(/no cost ledger/)
  })
})
