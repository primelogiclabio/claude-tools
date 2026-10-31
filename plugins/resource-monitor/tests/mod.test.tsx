import type { On } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'

const PLUGIN = 'resource-monitor'
const TOOL = 'mcp__resource-monitor__resources'

const START = { cwd: '/work/app', surface: 'terminal', isInteractive: true } as const
const RUN = { origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } } as const

const PANE_PROPS = {
  title: 'Resources',
  isFocused: true,
  bodyColumns: 60,
  placement: 'dock',
  scroll: { offset: 0, bodyRows: 40 },
  view: {},
} as const

// Two samples, 5 s apart, 4 CPUs and 16 GB: claude.exe used 1 s of CPU in
// the interval and node.exe (a dev server it started) 3 s, so 4 s of 20 s.
const SAMPLES = [
  'meta 4 16777216 Windows\n',
  'begin 900 100 10000\np 4 0 1000 50 System\np 100 50 400000 5000 claude.exe\n',
  'p 200 100 300000 1000 node.exe\np 900 100 60000 300 powershell.exe\nend\n',
  'begin 900 100 15000\np 4 0 1000 60 System\np 100 50 410000 6000 claude.exe\np 200 100 12000000 4000 node.exe\n',
  'p 900 100 60000 400 powershell.exe\nend\n',
]

type World = { status: (string | undefined)[]; commands: string[]; tools: string[]; argv: readonly string[][] }

function world(on: On, chunks: readonly string[] = SAMPLES, os = 'Windows_NT'): World {
  const w: World = { status: [], commands: [], tools: [], argv: [] }
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  mock.env(on, { OS: os })
  on('process.spawn', async function* ($, e) {
    ;(w.argv as string[][]).push([...e.argv])
    for (const text of chunks) yield { stream: 'stdout' as const, text }

    return { value: { code: 0, signal: null } }
  })
  on('ui.status', ($, e) => {
    w.status.push(e.text)

    return { value: undefined }
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => ({ value: undefined }))
  on('command.register', ($, e) => {
    w.commands.push(e.name)

    return { value: { command: e.name } }
  })
  on('tool.register', ($, e) => {
    w.tools.push(e.name)

    return { value: { tool: `mcp__${PLUGIN}__${e.name}` } }
  })

  return w
}

async function started($: { session: { start: (s: typeof START) => Promise<unknown> } }, on: On) {
  mock.clock(on, { now: 0 })
  await $.session.start(START)
  // The sampler loop runs on after session.start; give it a moment to drain.
  const { setTimeout: wait } = globalThis as unknown as { setTimeout: (fn: () => void, ms: number) => unknown }
  await new Promise<void>(resolve => wait(resolve, 100))
}

describe('resource-monitor', () => {
  test('starts PowerShell on Windows and a POSIX shell elsewhere', async ($, on) => {
    const w = world(on)
    await started($, on)
    expect(w.argv[0]?.[0]).toBe('powershell.exe')
    expect(w.argv[0]).toContain('-EncodedCommand')
    expect(w.commands).toEqual(['resources'])
    expect(w.tools).toEqual(['resources'])
  })

  test('on macOS and Linux the sampler is sh', async ($, on) => {
    const w = world(on, SAMPLES, '')
    await started($, on)
    expect(w.argv[0]?.slice(0, 2)).toEqual(['sh', '-c'])
  })

  test('the status line reads CPU and memory of the tree, warning when hot', async ($, on) => {
    const w = world(on)
    await started($, on)
    // 4 s of CPU over 5 s on 4 CPUs = 20%; memory 410 MB + 12 GB = 11.8 GB (74% of 16 GB).
    expect(w.status[w.status.length - 1]).toBe('⚙ CPU 20% · 11.8 GB')
  })

  test('crossing a threshold turns the status line into a warning', { options: { memWarn: 50 } }, async ($, on) => {
    const w = world(on)
    await started($, on)
    expect(w.status[w.status.length - 1]).toBe('⚠ CPU 20% · 11.8 GB')
  })

  test("the tool reports the tree for Claude, without the sampler's own process", async ($, on) => {
    world(on)
    await started($, on)
    const out = await $.tool.call({ tool: TOOL })
    expect(out.result).toMatch(/Claude Code and 1 process it started \(Windows, 4 logical CPUs, 16\.0 GB RAM\)/)
    expect(out.result).toMatch(/CPU: 20% of the machine \(0\.80 cores\)/)
    expect(out.result).toMatch(/node\.exe \(pid 200\): CPU 15%, 11\.4 GB/)
    expect(out.result).not.toMatch(/powershell/)
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    test(`the pane shows totals, sparklines and the process list (${surface})`, async ($, on) => {
      world(on)
      await started($, on)
      const ui = await $.ui.mount({ plugin: PLUGIN, surface, component: 'Pane', requestId: 'resources', props: PANE_PROPS })
      expect((await ui.find({ type: 'Text', text: '  20%' }))?.props.color).toBe('success')
      expect((await ui.find({ type: 'Text', text: '11.8 GB' }))?.props.color).toBe('warning')
      expect(await ui.find({ type: 'Text', text: /node\.exe/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /claude\.exe/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /powershell/ })).toBeUndefined()
      expect(await ui.find({ type: 'Text', text: /1 child process ·/ })).toBeDefined()
      await ui.unmount()
    })
  }

  test('injectContext tells Claude what is running, once per change', async ($, on) => {
    world(on)
    const sent: (readonly string[] | undefined)[] = []
    on('prompt.submit', ($, e) => {
      sent.push(e.context)

      return { text: e.text }
    })
    await started($, on)
    await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } })
    await $.prompt.submit({ text: 'again', wait: false, origin: { kind: 'composer' } })
    expect(sent[0]?.[0]).toMatch(/running: node\.exe \(pid 200\)/)
    expect(sent[1]?.length ?? 0).toBe(0)
  })

  test('injectContext off sends nothing', { options: { injectContext: false } }, async ($, on) => {
    world(on)
    const sent: (readonly string[] | undefined)[] = []
    on('prompt.submit', ($, e) => {
      sent.push(e.context)

      return { text: e.text }
    })
    await started($, on)
    await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } })
    expect(sent[0]?.length ?? 0).toBe(0)
  })

  test('/resources text reports, and says when the sampler has stopped', async ($, on) => {
    world(on)
    await started($, on)
    const out = await $.command.run({ ...RUN, command: 'resources', args: 'text' })
    expect(out.text).toMatch(/Memory: 11.8 GB/)
    expect(out.text).toMatch(/the sampler stopped/)
  })
})
