import type { On, SessionUsage } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'

const PLUGIN = 'context-bar'

const START = { cwd: '/work/app', surface: 'terminal', isInteractive: true } as const
const RUN = { origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } } as const

const BAND_PROPS = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 120,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
} as const

type Usage = SessionUsage

// The engine beneath the plugin: $.session.usage answers `usage`, and the
// registered command is recorded.
function world(on: On, usage: Usage) {
  const w = { usage, commands: [] as string[] }
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.usage', ($, e) => ({
    value:
      e.breakdown === undefined
        ? w.usage
        : {
            ...w.usage,
            context: {
              ...w.usage.context,
              breakdown: {
                categories: [
                  { name: 'System prompt', tokens: 3000, color: 'promptBorder', isDeferred: false, kind: 'used' },
                  { name: 'Messages', tokens: 120000, color: 'permission', isDeferred: false, kind: 'used' },
                  { name: 'Free space', tokens: 77000, color: 'inactive', isDeferred: false, kind: 'free' },
                ],
              } as unknown as SessionUsage['context']['breakdown'],
            },
          },
  }))
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

const FRESH: Usage = { startedAt: 1, context: { window: 200000 }, rateLimits: [] }

const BUSY: Usage = {
  startedAt: 1,
  context: { window: 200000, tokens: 124000, percent: 62 },
  rateLimits: [
    { kind: 'five_hour', percentUsed: 23.5, resetsAt: '2026-10-10T14:30:00Z' },
    { kind: 'seven_day', percentUsed: 91 },
  ],
  cost: { usd: 3.4123 },
}

const USAGE_1 = { input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 20000, cache_creation_input_tokens: 3000 }

function band(surface: 'terminal' | 'desktop', columns = 120) {
  return { plugin: PLUGIN, surface, component: 'AbovePrompt', props: { ...BAND_PROPS, bodyColumns: columns } } as const
}

describe('context-bar', () => {
  test('registers /context-bar and reads the usage at start', async ($, on) => {
    const w = world(on, BUSY)
    mock.clock(on, { now: Date.UTC(2026, 9, 10, 12) })
    await $.session.start(START)
    expect(w.commands).toEqual(['context-bar'])
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    test(`the bar shows fill, tokens, cost and limits, coloured by threshold (${surface})`, async ($, on) => {
      world(on, BUSY)
      mock.clock(on, { now: Date.UTC(2026, 9, 10, 12) })
      await $.session.start({ ...START, surface })
      await $.turn.complete({ answer: 'ok', durationMs: 10, isAborted: false, turnId: 't1', reason: 'answer', usage: { ...USAGE_1, model: 'claude-opus-5-5' } })
      const ui = await $.ui.mount(band(surface))
      expect(await ui.find({ type: 'Text', text: '62% 124k/200k' })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: / · session 25k tok · \$3\.41/ })).toBeDefined()
      const fiveHour = await ui.find({ type: 'Text', text: ' · 5h 23.5%' })
      expect(fiveHour).toBeDefined()
      expect(fiveHour?.props.color).toBe('success')
      expect((await ui.find({ type: 'Text', text: ' · 7d 91%' }))?.props.color).toBe('error')
      expect((await ui.find({ type: 'Text', text: '62% 124k/200k' }))?.props.color).toBe('warning')
      await ui.unmount()
    })
  }

  test('a fresh session shows the window with no fill yet', async ($, on) => {
    world(on, FRESH)
    mock.clock(on, { now: 0 })
    await $.session.start(START)
    const ui = await $.ui.mount(band('terminal'))
    expect(await ui.find({ type: 'Text', text: '—/200k' })).toBeDefined()
    await ui.unmount()
  })

  test('session.measure updates the bar without a call', async ($, on) => {
    const w = world(on, FRESH)
    mock.clock(on, { now: 0 })
    await $.session.start(START)
    w.usage = BUSY
    await $.session.measure({ context: { window: 200000, tokens: 190000, percent: 95 }, rateLimits: [], changed: ['context'] })
    const ui = await $.ui.mount(band('terminal'))
    const fill = await ui.find({ type: 'Text', text: '95% 190k/200k' })
    expect(fill?.props.color).toBe('error')
    await ui.unmount()
  })

  test('a narrow band drops the rate limits before the context figure', async ($, on) => {
    world(on, BUSY)
    mock.clock(on, { now: 0 })
    await $.session.start(START)
    const ui = await $.ui.mount(band('terminal', 40))
    expect(await ui.find({ type: 'Text', text: '62% 124k/200k' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: ' · 7d 91%' })).toBeUndefined()
    await ui.unmount()
  })

  test('/context-bar hide and show toggle the bar', async ($, on) => {
    world(on, BUSY)
    mock.clock(on, { now: 0 })
    await $.session.start(START)
    const hidden = await $.command.run({ ...RUN, command: 'context-bar', args: 'hide' })
    expect(hidden.text).toMatch(/hidden/)
    let ui = await $.ui.mount(band('terminal'))
    expect(await ui.find({ type: 'Text', text: '62% 124k/200k' })).toBeUndefined()
    await ui.unmount()
    await $.command.run({ ...RUN, command: 'context-bar', args: 'show' })
    ui = await $.ui.mount(band('terminal'))
    expect(await ui.find({ type: 'Text', text: '62% 124k/200k' })).toBeDefined()
    await ui.unmount()
  })

  test('/context-bar gives the full breakdown, subagents counted apart', async ($, on) => {
    world(on, BUSY)
    mock.clock(on, { now: Date.UTC(2026, 9, 10, 12) })
    await $.session.start(START)
    await $.turn.complete({ answer: 'a', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer', usage: { ...USAGE_1, model: 'm' } })
    await $.turn.complete({ answer: 'b', durationMs: 1, isAborted: false, turnId: 't2', reason: 'answer', agentId: 'agent-1', usage: { ...USAGE_1, model: 'm' } })
    const out = await $.command.run({ ...RUN, command: 'context-bar', args: '' })
    expect(out.text).toMatch(/124,000 of 200,000 tokens \(62%\)/)
    expect(out.text).toMatch(/Messages: 120k/)
    expect(out.text).toMatch(/Free space: 77k \(free\)/)
    expect(out.text).toMatch(/Main conversation: 25k in 1 turn /)
    expect(out.text).toMatch(/Subagents: 25k in 1 turn /)
    expect(out.text).toMatch(/Total: 49k/)
    expect(out.text).toMatch(/\$3\.41 this session/)
    expect(out.text).toMatch(/5h: 23\.5% used, resets in 2h 30m/)
    expect(out.text).toMatch(/7d: 91% used/)
  })

  test('off a subscription the rate limits say why they are missing', async ($, on) => {
    world(on, { ...BUSY, rateLimits: [], cost: undefined })
    mock.clock(on, { now: 0 })
    await $.session.start(START)
    const out = await $.command.run({ ...RUN, command: 'context-bar', args: '' })
    expect(out.text).toMatch(/None reported/)
    expect(out.text).toMatch(/no cost ledger/)
  })

  test('thresholds come from the options', { options: { warnAt: 50, dangerAt: 60, showCost: false } }, async ($, on) => {
    world(on, BUSY)
    mock.clock(on, { now: 0 })
    await $.session.start(START)
    const ui = await $.ui.mount(band('terminal'))
    expect((await ui.find({ type: 'Text', text: '62% 124k/200k' }))?.props.color).toBe('error')
    expect(await ui.find({ type: 'Text', text: /\$3\.41/ })).toBeUndefined()
    await ui.unmount()
  })
})
