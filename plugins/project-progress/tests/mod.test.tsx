import type { On } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'

const PLUGIN = 'project-progress'
const PROGRESS = '/work/app/PROGRESS.md'
const SKILL = '/project-progress:project-progress'

const PANE = {
  plugin: PLUGIN,
  component: 'Pane',
  requestId: 'progress',
  props: {
    title: 'Progress · app',
    isFocused: true,
    bodyColumns: 48,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

const FILE = [
  '# Progress',
  '',
  'Goal: ship the app.',
  '',
  '## Current focus',
  '- (none)',
  '',
  '## Next',
  '- [ ] Wire login',
  '- [ ] Write docs',
  '',
  '## Done (last 10)',
  '- (none)',
  '',
  '## Decisions',
  '- (none)',
  '',
  '## Parking lot',
  '- Try dark mode',
  '',
  '## Gotchas',
  '- (none)',
  '',
].join('\n')

type World = {
  files: Record<string, string>
  /** Writes a file as an editor would, outside the plugin. */
  edit: (path: string, text: string) => void
  writes: string[]
  status: (string | undefined)[]
  opened: string[]
  closed: string[]
  filled: string[]
  commands: string[]
}

// The engine hands fs hooks absolute paths in the host's spelling
// (C:\work\app on Windows); the world keys them POSIX-style.
function norm(path: string): string {
  return path.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/')
}

// Everything beneath the plugin: a folder tree in memory with a git root at
// /work/app, and the engine's answers recorded.
function world(on: On, files: Record<string, string> = {}, isPlaced = true): World {
  const mtimes: Record<string, number> = {}
  let tick = 1
  const w: World = {
    files,
    edit: (path, text) => {
      files[path] = text
      tick += 1
      mtimes[path] = tick
    },
    writes: [],
    status: [],
    opened: [],
    closed: [],
    filled: [],
    commands: [],
  }
  const dirs = new Set(['/work', '/work/app', '/work/app/.git', '/work/app/src'])
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('fs.exists', ($, e) => ({ value: norm(e.path) in w.files || dirs.has(norm(e.path)) }))
  on('fs.read', ($, e) => {
    const text = w.files[norm(e.path)]
    if (text === undefined) throw new Error(`ENOENT: ${e.path}`)

    return { value: text }
  })
  on('fs.write', ($, e) => {
    w.writes.push(norm(e.path))

    return { value: undefined }
  })
  on('fs.stat', ($, e) => ({
    value: { kind: 'file', size: (w.files[norm(e.path)] ?? '').length, mtimeMs: mtimes[norm(e.path)] ?? 1, isLink: false },
  }))
  on('ui.status', ($, e) => {
    w.status.push(e.text)

    return { value: undefined }
  })
  on('ui.open', ($, e) => {
    w.opened.push(e.id)

    return { value: isPlaced ? { isPlaced: true } : { isPlaced: false, reason: 'no-surface' } }
  })
  on('ui.close', ($, e) => {
    w.closed.push(e.id)

    return { value: undefined }
  })
  on('prompt.fill', ($, e) => {
    w.filled.push(e.text)

    return { isFilled: true, text: e.text, cursor: e.text.length }
  })
  on('command.register', ($, e) => {
    w.commands.push(e.name)

    return { value: { command: e.name } }
  })

  return w
}

const START = { cwd: '/work/app/src', surface: 'terminal', isInteractive: true } as const

const RUN = { origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } } as const

function freshClock(on: On) {
  return mock.clock(on, { now: Date.UTC(2026, 9, 31, 12) })
}

describe('project-progress pane', () => {
  test('finds PROGRESS.md at the git root, registers /progress and shows the pane', async ($, on) => {
    const w = world(on, { [PROGRESS]: FILE })
    freshClock(on)
    await $.session.start(START)
    expect(w.commands).toEqual(['progress'])
    expect(w.opened).toEqual(['progress'])
    expect(w.status).toEqual([])
  })

  test('statusLine: true shows the focus and Next count', { options: { statusLine: true } }, async ($, on) => {
    const w = world(on, { [PROGRESS]: FILE })
    freshClock(on)
    await $.session.start(START)
    expect(w.status[w.status.length - 1]).toBe('○ nothing in progress · 2 next')
  })

  test('opens in a session the desktop app hosts through the SDK', async ($, on) => {
    const w = world(on, { [PROGRESS]: FILE })
    freshClock(on)
    await $.session.start({ cwd: '/work/app', surface: null, isInteractive: false })
    expect(w.opened).toEqual(['progress'])
  })

  test('stays hidden in a project without PROGRESS.md', async ($, on) => {
    const w = world(on)
    freshClock(on)
    await $.session.start(START)
    expect(w.opened).toEqual([])
    expect(w.status[w.status.length - 1]).toBeUndefined()
  })

  test('showPane: false keeps it hidden until /progress', { options: { showPane: false } }, async ($, on) => {
    const w = world(on, { [PROGRESS]: FILE })
    freshClock(on)
    await $.session.start(START)
    expect(w.opened).toEqual([])
    const shown = await $.command.run({ ...RUN, command: 'progress', args: '' })
    expect(shown.text).toBe('Progress pane shown for app.')
    expect(w.opened).toEqual(['progress'])
  })

  test('/progress toggles the pane', async ($, on) => {
    const w = world(on, { [PROGRESS]: FILE })
    freshClock(on)
    await $.session.start(START)
    const hidden = await $.command.run({ ...RUN, command: 'progress', args: '' })
    expect(hidden.text).toMatch(/^Progress pane hidden/)
    expect(w.closed).toEqual(['progress'])
    await $.command.run({ ...RUN, command: 'progress', args: '' })
    expect(w.opened).toEqual(['progress', 'progress'])
  })

  test('/progress text prints the summary, and so does a pane nothing places', async ($, on) => {
    world(on, { [PROGRESS]: FILE }, false)
    freshClock(on)
    await $.session.start(START)
    const text = await $.command.run({ ...RUN, command: 'progress', args: 'text' })
    expect(text.text).toMatch(/^Goal: ship the app\.\nNow: nothing in progress\nNext:\n {2}1\. Wire login/)
    const shown = await $.command.run({ ...RUN, command: 'progress', args: 'show' })
    expect(shown.text).toBe(text.text)
  })

  test('picks up edits made to the file by hand', { options: { statusLine: true } }, async ($, on) => {
    const w = world(on, { [PROGRESS]: FILE })
    const clock = freshClock(on)
    await $.session.start(START)
    w.edit(PROGRESS, FILE.replace('## Current focus\n- (none)', '## Current focus\n- Wire login'))
    await clock.advance(2100)
    expect(w.status[w.status.length - 1]).toBe('▶ Wire login · 2 next')
  })

  test('a PROGRESS.md set up mid-session opens the pane', async ($, on) => {
    const w = world(on)
    const clock = freshClock(on)
    await $.session.start(START)
    w.edit(PROGRESS, FILE)
    await clock.advance(2100)
    expect(w.opened).toEqual(['progress'])
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    test(`the pane shows the file and its buttons fill the prompt (${surface})`, async ($, on) => {
      const w = world(on, { [PROGRESS]: FILE })
      freshClock(on)
      await $.session.start({ ...START, surface })
      const ui = await $.ui.mount({ ...PANE, surface })
      expect(await ui.find({ text: /Nothing in progress/ })).toBeDefined()
      expect(await ui.find({ text: /Wire login/ })).toBeDefined()
      expect(await ui.find({ text: /Try dark mode/ })).toBeUndefined()

      await ui.press({ key: 'fold-parked' })
      expect(await ui.find({ text: /Try dark mode/ })).toBeDefined()

      await ui.press({ key: 'next' })
      await ui.press({ key: 'park' })
      expect(w.filled).toEqual([`${SKILL} next`, `${SKILL} park `])
      expect(await ui.find({ key: 'done' })).toBeUndefined()
      expect(w.writes).toEqual([])
      await ui.unmount()
    })
  }

  test('Checkpoint replaces Start next while an item is in focus', async ($, on) => {
    const w = world(on, { [PROGRESS]: FILE.replace('## Current focus\n- (none)', '## Current focus\n- Wire login') })
    freshClock(on)
    await $.session.start(START)
    const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
    expect(await ui.find({ text: /▶ Wire login/ })).toBeDefined()
    expect(await ui.find({ key: 'next' })).toBeUndefined()
    await ui.press({ key: 'done' })
    expect(w.filled).toEqual([`${SKILL} done`])
    await ui.unmount()
  })

  test('without PROGRESS.md the pane offers to set it up', async ($, on) => {
    const w = world(on)
    freshClock(on)
    await $.session.start(START)
    const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
    expect(await ui.find({ text: /No PROGRESS\.md/ })).toBeDefined()
    await ui.press({ key: 'init' })
    expect(w.filled).toEqual([`${SKILL} init`])
    await ui.unmount()
  })
})
