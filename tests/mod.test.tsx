import type { On } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'

const PLUGIN = 'project-tracker'
const TOOL = 'mcp__project-tracker__tasks'
const TASKS = '/work/oauth/.claude/tasks.md'

const PANE_PROPS = {
  title: 'Tasks · oauth',
  isFocused: true,
  bodyColumns: 48,
  placement: 'dock',
  scroll: { offset: 0, bodyRows: 40 },
  view: {},
} as const

type World = {
  files: Record<string, string>
  /** Writes a file as an editor would, outside the plugin. */
  edit: (path: string, text: string) => void
  status: (string | undefined)[]
  opened: string[]
  commands: string[]
  tools: string[]
}

// The engine hands fs hooks absolute paths in the host's spelling
// (C:\work\oauth on Windows); the world keys them POSIX-style.
function norm(path: string): string {
  return path.replace(/^[A-Za-z]:/, '').replace(/\\/g, '/')
}

// Everything beneath the plugin: a folder tree in memory with a git root at
// /work/oauth, and the engine's registrations recorded.
function world(on: On, files: Record<string, string> = {}): World {
  const mtimes: Record<string, number> = {}
  let tick = 1
  const write = (path: string, text: string) => {
    files[path] = text
    tick += 1
    mtimes[path] = tick
  }
  const w: World = { files, edit: write, status: [], opened: [], commands: [], tools: [] }
  const dirs = new Set(['/work', '/work/oauth', '/work/oauth/.git', '/work/oauth/src'])
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('fs.exists', ($, e) => ({ value: norm(e.path) in w.files || dirs.has(norm(e.path)) }))
  on('fs.read', ($, e) => {
    const text = w.files[norm(e.path)]
    if (text === undefined) throw new Error(`ENOENT: ${e.path}`)

    return { value: text }
  })
  on('fs.write', ($, e) => {
    write(norm(e.path), e.text)

    return { value: undefined }
  })
  on('fs.stat', ($, e) => ({
    value: {
      kind: 'file',
      size: (w.files[norm(e.path)] ?? '').length,
      mtimeMs: mtimes[norm(e.path)] ?? 1,
      isLink: false,
    },
  }))
  on('ui.status', ($, e) => {
    w.status.push(e.text)

    return { value: undefined }
  })
  on('ui.open', ($, e) => {
    w.opened.push(e.id)

    return { value: { isPlaced: true } }
  })
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

const START = { cwd: '/work/oauth/src', surface: 'terminal', isInteractive: true } as const

const RUN = { origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } } as const

function freshClock(on: On) {
  return mock.clock(on, { now: Date.UTC(2026, 9, 10, 12) })
}

describe('project-tracker', () => {
  test('finds the git root, registers /tasks and its tool, opens the pane', async ($, on) => {
    const w = world(on)
    freshClock(on)
    await $.session.start(START)
    expect(w.commands).toEqual(['tasks'])
    expect(w.tools).toEqual(['tasks'])
    expect(w.opened).toEqual(['tasks'])
    expect(w.files[TASKS]).toBeUndefined()
  })

  test('/tasks add writes the file at the project root and shows in the status line', async ($, on) => {
    const w = world(on)
    freshClock(on)
    await $.session.start(START)
    const added = await $.command.run({ ...RUN, command: 'tasks', args: 'add Wire token refresh' })
    expect(added.text).toBe('Added "Wire token refresh".')
    expect(w.files[TASKS]).toMatch(/## Todo\n\n- \[ \] Wire token refresh <!-- id:\w{4} -->/)
    expect(w.status[w.status.length - 1]).toBe('☐ 1 open')

    await $.command.run({ ...RUN, command: 'tasks', args: 'start 1' })
    expect(w.files[TASKS]).toMatch(/## In progress\n\n- \[ \] Wire token refresh/)
    expect(w.status[w.status.length - 1]).toBe('☐ 1 open · ▶ Wire token refresh')

    const done = await $.command.run({ ...RUN, command: 'tasks', args: 'done 1' })
    expect(done.text).toBe('Done: "Wire token refresh".')
    expect(w.files[TASKS]).toMatch(/- \[x\] Wire token refresh <!-- id:\w{4} done:2026-10-10 -->/)
    expect(w.status[w.status.length - 1]).toBeUndefined()

    const listed = await $.command.run({ ...RUN, command: 'tasks', args: 'list all' })
    expect(listed.text).toMatch(/Done:\n {2}1\. Wire token refresh/)
  })

  test('an unknown verb answers with the help', async ($, on) => {
    world(on)
    freshClock(on)
    await $.session.start(START)
    const out = await $.command.run({ ...RUN, command: 'tasks', args: 'frobnicate' })
    expect(out.text).toMatch(/^Unknown action "frobnicate"/)
  })

  test("the model's tool adds and completes tasks and answers with the list", async ($, on) => {
    const w = world(on, { [TASKS]: '# Tasks\n## Todo\n- [ ] Existing one\n' })
    freshClock(on)
    await $.session.start(START)
    const added = await $.tool.call({ tool: TOOL, action: 'add', text: 'Add PKCE tests' })
    expect(added.result).toMatch(/^Added "Add PKCE tests"\.\n\nTodo:\n {2}1\. Existing one/)
    const done = await $.tool.call({ tool: TOOL, action: 'done', task: '2' })
    expect(done.result).toMatch(/^Done: "Add PKCE tests"\./)
    expect(w.files[TASKS]).toMatch(/- \[ \] Existing one <!-- id:\w{4} -->/)
  })

  test('picks up edits made to the file by hand', async ($, on) => {
    const w = world(on, { [TASKS]: '# Tasks\n## Todo\n- [ ] First\n' })
    const clock = freshClock(on)
    await $.session.start(START)
    expect(w.status[w.status.length - 1]).toBe('☐ 1 open')
    w.edit(TASKS, '# Tasks\n## Todo\n- [ ] First\n- [ ] Second\n')
    await clock.advance(1000)
    expect(w.status[w.status.length - 1]).toBe('☐ 1 open')
    await clock.advance(2100)
    expect(w.status[w.status.length - 1]).toBe('☐ 2 open')
  })

  test('injectContext tells the model about open tasks once per change', { options: { injectContext: true } }, async ($, on) => {
    const w = world(on, { [TASKS]: '# Tasks\n## Todo\n- [ ] Ship v1\n' })
    freshClock(on)
    const sent: (readonly string[] | undefined)[] = []
    on('prompt.submit', ($, e) => {
      sent.push(e.context)

      return { text: e.text }
    })
    await $.session.start(START)
    await $.prompt.submit({ text: 'hi' })
    await $.prompt.submit({ text: 'again' })
    expect(sent[0]?.[0]).toMatch(/Open tasks:\nTodo:\n {2}1\. Ship v1/)
    expect(sent[1]?.length ?? 0).toBe(0)
    expect(w.files[TASKS]).toBe('# Tasks\n## Todo\n- [ ] Ship v1\n')
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    test(`the pane adds, selects and finishes a task (${surface})`, async ($, on) => {
      const w = world(on)
      freshClock(on)
      await $.session.start({ ...START, surface })
      const ui = await $.ui.mount({
        plugin: PLUGIN,
        surface,
        component: 'Pane',
        requestId: 'tasks',
        props: PANE_PROPS,
      })
      expect(await ui.find({ text: /No tasks yet/ })).toBeDefined()

      await ui.input({ key: 'add', text: 'Write the README' })
      expect(w.files[TASKS]).toMatch(/- \[ \] Write the README/)
      expect(await ui.find({ type: 'Button', text: 'Write the README' })).toBeDefined()

      const id = /id:(\w{4})/.exec(w.files[TASKS] ?? '')?.[1] ?? ''
      await ui.press({ key: `row-${id}` })
      expect(await ui.find({ key: `done-${id}` })).toBeDefined()
      await ui.press({ key: `done-${id}` })
      expect(w.files[TASKS]).toMatch(/- \[x\] Write the README/)
      expect(await ui.find({ key: 'toggle-done' })).toBeDefined()
      expect(await ui.find({ key: `row-${id}` })).toBeUndefined()

      await ui.press({ key: 'toggle-done' })
      expect(await ui.find({ key: `row-${id}` })).toBeDefined()
      await ui.unmount()
    })
  }

  test('the pane draws without an input on mobile', async ($, on) => {
    world(on, { [TASKS]: '# Tasks\n## Todo\n- [ ] Only task\n' })
    freshClock(on)
    await $.session.start({ ...START, surface: 'mobile' })
    const ui = await $.ui.mount({
      plugin: PLUGIN,
      surface: 'mobile',
      component: 'Pane',
      requestId: 'tasks',
      props: PANE_PROPS,
    })
    expect(await ui.find({ type: 'Button', text: 'Only task' })).toBeDefined()
    expect(await ui.find({ type: 'Input' })).toBeUndefined()
  })
})
