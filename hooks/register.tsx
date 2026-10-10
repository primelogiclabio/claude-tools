import type { EngineInterface, Register } from 'claude-code'

import type { Task, TaskStatus, TrackerView } from '../types'
import {
  SECTION_TITLE,
  STATUS_ORDER,
  apply,
  describe,
  find,
  ordered,
  parse,
  serialize,
} from './tasks'
import type { Change } from './tasks'

const PANE = 'tasks'
const TOOL = 'mcp__project-tracker__tasks'


const GLYPH: Record<TaskStatus, string> = { doing: '▶', todo: '○', done: '✓' }
const COLOR: Record<TaskStatus, 'warning' | 'text' | 'success'> = {
  doing: 'warning',
  todo: 'text',
  done: 'success',
}

const HELP = [
  '/tasks                 open the Tasks pane',
  '/tasks list [all]      print the list (all: include done)',
  '/tasks add <text>      add a todo (add! <text> adds it in progress)',
  '/tasks start <n>       move task n to in progress',
  '/tasks done <n>        mark task n done',
  '/tasks todo <n>        move task n back to todo',
  '/tasks edit <n> <text> rename task n',
  '/tasks up|down <n>     reorder task n within its section',
  '/tasks rm <n>          remove task n',
  '/tasks clear           remove every done task',
  '/tasks close           close the pane',
  'n is the number the pane shows, or the task id.',
].join('\n')

function sepOf(path: string): string {
  return path.includes('\\') ? '\\' : '/'
}

function join(root: string, rel: string): string {
  const sep = sepOf(root)

  return root.replace(/[\\/]+$/, '') + sep + rel.split(/[\\/]+/).filter(Boolean).join(sep)
}

function parent(path: string): string | null {
  const trimmed = path.replace(/[\\/]+$/, '')
  const at = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  if (at < 0) return null
  if (at === 0) return trimmed.length > 1 ? '/' : null
  const up = trimmed.slice(0, at)

  return /^[A-Za-z]:$/.test(up) ? `${up}\\` : up
}

function basename(path: string): string {
  const parts = path.split(/[\\/]+/).filter(Boolean)

  return parts[parts.length - 1] ?? path
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function today(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Module state: a reload runs register and session.start again, which set
// these anew. The pane draws from here and is redrawn by $.ui.invalidate
// rather than $.state, so the mod also runs on builds without $.state.
let view: TrackerView | null = null
let selected: string | null = null
let isDoneShown = false
let rel = '.claude/tasks.md'
let isStatusShown = true
let isAutoOpen = true
let root = ''
let file = ''
let mtime = -1
let chain: Promise<unknown> = Promise.resolve()

// The project is the nearest folder up from the session's that already
// holds a task file, else the nearest git root, else the session's own.
async function findRoot($: EngineInterface, cwd: string): Promise<string> {
  for (let dir: string | null = cwd; dir !== null; dir = parent(dir)) {
    if (await $.fs.exists(join(dir, rel))) return dir
    if (await $.fs.exists(join(dir, '.git'))) return dir
  }

  return cwd
}

function showStatus($: EngineInterface, tasks: readonly Task[]): void {
  if (!isStatusShown) return
  const open = tasks.filter(t => t.status !== 'done').length
  const doing = tasks.find(t => t.status === 'doing')
  $.ui.status(
    open === 0 && doing === undefined
      ? undefined
      : `☐ ${open} open${doing ? ` · ▶ ${clip(doing.text, 40)}` : ''}`,
  )
}

async function load($: EngineInterface): Promise<TrackerView> {
  const exists = await $.fs.exists(file)
  let tasks: Task[] = []
  let error: string | undefined
  if (exists) {
    try {
      mtime = (await $.fs.stat(file)).mtimeMs
      tasks = parse(await $.fs.read(file)).tasks
    } catch (err) {
      error = `Could not read ${rel}: ${err instanceof Error ? err.message : String(err)}`
    }
  } else {
    mtime = 0
  }
  const next: TrackerView = { root, project: basename(root), file, exists, tasks }
  if (error !== undefined) next.error = error
  view = next
  $.ui.invalidate('ui.render')
  showStatus($, tasks)

  return next
}

function select($: EngineInterface, id: string | null): void {
  selected = id
  $.ui.invalidate('ui.render')
}

function toggleDone($: EngineInterface): void {
  isDoneShown = !isDoneShown
  $.ui.invalidate('ui.render')
}

async function refreshIfChanged($: EngineInterface): Promise<void> {
  if (file === '') return
  const exists = await $.fs.exists(file)
  const now = exists ? (await $.fs.stat(file)).mtimeMs : 0
  if (now !== mtime) await load($)
}

// Every change reads the file fresh, so edits made by hand, by another
// session or by Claude's own Edit tool are never written over.
function mutate(
  $: EngineInterface,
  change: (tasks: readonly Task[]) => Promise<Change | string> | Change | string,
): Promise<{ said: string; task?: Task }> {
  const step = async () => {
    const source = (await $.fs.exists(file)) ? await $.fs.read(file) : ''
    const doc = parse(source)
    const asked = await change(doc.tasks)
    if (typeof asked === 'string') return { said: asked }
    const out = apply(doc, asked)
    const text = serialize(out.doc)
    if (text !== source && out.doc !== doc) await $.fs.write(file, text)
    await load($)

    return out.task ? { said: out.said, task: out.task } : { said: out.said }
  }
  const ran = chain.then(step, step)
  chain = ran.catch(() => undefined)

  return ran
}

async function setStatus($: EngineInterface, ref: string, status: TaskStatus) {
  const day = today(await $.clock.now())

  return mutate($, tasks => {
    const task = find(tasks, ref)

    return task ? { kind: 'status', id: task.id, status, today: day } : `No task ${ref}.`
  })
}

function byRef(ref: string, make: (task: Task) => Change) {
  return (tasks: readonly Task[]) => {
    const task = find(tasks, ref)

    return task ? make(task) : `No task ${ref}.`
  }
}

async function openPane($: EngineInterface, isAsked: boolean) {
  const title = root === '' ? 'Tasks' : `Tasks · ${basename(root)}`

  return $.ui.open(isAsked ? { id: PANE, title, focus: true } : { id: PANE, title })
}

// One verb set, shared by the slash command and the model's tool.
async function runVerb($: EngineInterface, verb: string, rest: string): Promise<string> {
  const [ref = '', ...words] = rest.split(/\s+/)
  const tail = words.join(' ')
  const listOf = async (withDone: boolean) => {
    const v = view

    return describe(v?.tasks ?? [], { withDone })
  }

  switch (verb) {
    case 'list':
    case 'ls':
      return listOf(rest.trim() === 'all')
    case 'add':
      return (await mutate($, () => ({ kind: 'add', text: rest }))).said
    case 'add!':
      return (await mutate($, () => ({ kind: 'add', text: rest, status: 'doing' }))).said
    case 'start':
    case 'doing':
      return (await setStatus($, ref, 'doing')).said
    case 'done':
    case 'check':
    case 'finish':
      return (await setStatus($, ref, 'done')).said
    case 'todo':
    case 'undo':
    case 'reopen':
    case 'pause':
      return (await setStatus($, ref, 'todo')).said
    case 'edit':
    case 'rename':
      return (await mutate($, byRef(ref, t => ({ kind: 'edit', id: t.id, text: tail })))).said
    case 'up':
      return (await mutate($, byRef(ref, t => ({ kind: 'move', id: t.id, by: -1 })))).said
    case 'down':
      return (await mutate($, byRef(ref, t => ({ kind: 'move', id: t.id, by: 1 })))).said
    case 'rm':
    case 'remove':
    case 'delete':
      return (await mutate($, byRef(ref, t => ({ kind: 'remove', id: t.id })))).said
    case 'clear':
      return (await mutate($, () => ({ kind: 'clearDone' }))).said
    default:
      return `Unknown action "${verb}".\n${HELP}`
  }
}

export const register: Register = (on, options) => {
  rel = typeof options.taskFile === 'string' && options.taskFile.trim() !== ''
    ? options.taskFile.trim()
    : '.claude/tasks.md'
  isStatusShown = options.statusLine !== false
  isAutoOpen = options.autoOpen !== false

  on('session.start', async ($, e, next) => {
    root = await findRoot($, e.cwd)
    file = join(root, rel)
    await load($)

    await $.command.register({
      name: 'tasks',
      description: "Show or change this project's task list (Tasks pane)",
      argumentHint: '[list|add|start|done|todo|edit|up|down|rm|clear|close|help] [n] [text]',
    })
    await $.tool.register({
      name: 'tasks',
      description:
        "Read or change this project's persistent task list: the list the user sees in their Tasks pane, " +
        `kept in ${rel} at the project root across sessions. Use it when the user asks you to track, add, ` +
        'start, finish, reorder or review project tasks, or asked you to keep the list current. ' +
        'Do not add tasks on your own initiative otherwise. Tasks are referred to by the number list shows or by id.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'add', 'start', 'done', 'todo', 'edit', 'up', 'down', 'remove', 'clear'],
            description:
              'list: show tasks; add: new todo (status "doing" via start after); start/done/todo: set status; ' +
              'edit: rename; up/down: reorder; remove: delete one; clear: delete every done task',
          },
          task: { type: 'string', description: 'The task number from list, or its id (start/done/todo/edit/up/down/remove)' },
          text: { type: 'string', description: 'The task text (add, edit)' },
          includeDone: { type: 'boolean', description: 'list: include done tasks' },
        },
        required: ['action'],
      },
      isDeferred: false,
    })

    if (isAutoOpen && e.isInteractive) void openPane($, false)
    $.clock.every(2000, () => {
      void refreshIfChanged($).catch(() => undefined)
    })

    return next(e)
  })

  on('command.run', { command: 'tasks' }, async ($, e) => {
    const trimmed = e.args.trim()
    const [verb = '', ...rest] = trimmed.split(/\s+/)
    await refreshIfChanged($)

    if (verb === '' || verb === 'open' || verb === 'show') {
      const opened = await openPane($, true)
      const v = view
      if (opened.isPlaced) {
        const open = (v?.tasks ?? []).filter(t => t.status !== 'done').length

        return { text: `Tasks pane open: ${open} open in ${v?.project ?? 'this project'}.` }
      }

      return { text: describe(v?.tasks ?? []) }
    }
    if (verb === 'close' || verb === 'hide') {
      await $.ui.close({ id: PANE })

      return { text: 'Tasks pane closed. /tasks opens it again.' }
    }
    if (verb === 'help' || verb === '?') return { text: HELP }

    return { text: await runVerb($, verb.toLowerCase(), rest.join(' ')) }
  }).catch(($, e, next) => ({
    text: `project-tracker: /tasks failed${next.error ? `: ${next.error.message}` : ''}.`,
  }))

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const input = e as unknown as {
      action?: string
      task?: string | number
      text?: string
      includeDone?: boolean
    }
    const action = String(input.action ?? 'list')
    const ref = input.task === undefined ? '' : String(input.task)
    await refreshIfChanged($)

    let said: string
    if (action === 'list') said = await runVerb($, 'list', input.includeDone ? 'all' : '')
    else if (action === 'add') said = await runVerb($, 'add', input.text ?? '')
    else if (action === 'edit') said = await runVerb($, 'edit', `${ref} ${input.text ?? ''}`)
    else if (action === 'clear') said = await runVerb($, 'clear', '')
    else said = await runVerb($, action, ref)

    if (action !== 'list') {
      const v = view
      said += `\n\n${describe(v?.tasks ?? [])}`
    }

    return { result: said }
  }).catch(($, e, next) => ({
    deny: `project-tracker: the tasks tool failed${next.error ? `: ${next.error.message}` : ''}.`,
  }))

  // Off by default. Attaches the open tasks beside a prompt, and again only
  // when they have changed since, so the model is not told the same twice.
  if (options.injectContext === true) {
    let lastSent = ''
    on('prompt.submit', async ($, e, next) => {
      const v = view
      const open = (v?.tasks ?? []).filter(t => t.status !== 'done')
      const text =
        open.length === 0
          ? ''
          : `The user tracks this project's tasks in ${rel} (shown in their Tasks pane; ` +
            `change it with the ${TOOL} tool, only when asked). Open tasks:
${describe(open)}`
      if (text === lastSent || text === '') return next(e)
      lastSent = text

      return next({ ...e, context: [...(e.context ?? []), text] })
    })
  }

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const v = view
    const width = Math.max(20, e.props.bodyColumns)

    if (v === null) return <Text dimColor>Loading tasks…</Text>

    const list = ordered(v.tasks)
    const open = list.filter(t => t.status !== 'done').length
    const doneCount = list.length - open
    const day = today(await $.clock.now())

    const act = (change: Change) => () => {
      void mutate($, () => change)
    }
    const field =
      e.surface === 'mobile'
        ? null
        : (props: { key: string; label?: string; placeholder?: string; value?: string; submitLabel?: string; autoFocus?: true; onSubmit: (text: string) => void }) => {
            const { Input } = $.ui.resolve(e)

            return <Input {...props} />
          }

    const row = (task: Task, n: number) => {
      const isPicked = selected === task.id
      const actions = (
        <Box key={`actions-${task.id}`} flexDirection="column" marginLeft={4}>
          <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
            {task.status === 'doing' ? (
              <Button key={`pause-${task.id}`} label="Pause" hotkey="s" onPress={act({ kind: 'status', id: task.id, status: 'todo', today: day })} />
            ) : task.status === 'todo' ? (
              <Button key={`start-${task.id}`} label="Start" hotkey="s" onPress={act({ kind: 'status', id: task.id, status: 'doing', today: day })} />
            ) : null}
            {task.status === 'done' ? (
              <Button key={`reopen-${task.id}`} label="Reopen" hotkey="d" onPress={act({ kind: 'status', id: task.id, status: 'todo', today: day })} />
            ) : (
              <Button key={`done-${task.id}`} variant="primary" label="Done" hotkey="d" onPress={act({ kind: 'status', id: task.id, status: 'done', today: day })} />
            )}
            <Button key={`up-${task.id}`} label="↑" hotkey="k" onPress={act({ kind: 'move', id: task.id, by: -1 })} />
            <Button key={`down-${task.id}`} label="↓" hotkey="j" onPress={act({ kind: 'move', id: task.id, by: 1 })} />
            <Button
              key={`rm-${task.id}`}
              label="Delete"
              hotkey="x"
              onPress={() => {
                select($, null)
                void mutate($, () => ({ kind: 'remove', id: task.id }))
              }}
            />
          </Box>
          {field?.({
            key: `edit-${task.id}`,
            label: 'Rename: ',
            value: task.text,
            submitLabel: 'rename',
            onSubmit: text => {
              void mutate($, () => ({ kind: 'edit', id: task.id, text }))
            },
          })}
          {task.notes.length > 0 && <Text dimColor>{task.notes.join('\n')}</Text>}
        </Box>
      )

      return (
        <Box key={`task-${task.id}`} flexDirection="column">
          <Box flexDirection="row">
            <Text dimColor>{String(n).padStart(2)} </Text>
            <Text color={COLOR[task.status]}>{GLYPH[task.status]} </Text>
            <Button
              key={`row-${task.id}`}
              plain
              dimColor={task.status === 'done'}
              label={clip(task.text, width * 3) + (task.notes.length > 0 && !isPicked ? ' …' : '')}
              onPress={() => select($, isPicked ? null : task.id)}
            />
          </Box>
          {isPicked && actions}
        </Box>
      )
    }

    let n = 0
    const sections = STATUS_ORDER.map(status => {
      const items = list.filter(t => t.status === status)
      const first = n
      n += items.length
      if (status === 'done') {
        if (items.length === 0) return null

        return (
          <Box key="section-done" flexDirection="column" marginTop={1}>
            <Box flexDirection="row" columnGap={1}>
              <Text bold color="success">
                {SECTION_TITLE.done.toUpperCase()} {items.length}
              </Text>
              <Button
                key="toggle-done"
                plain
                dimColor
                label={isDoneShown ? '▾ hide' : '▸ show'}
                onPress={() => toggleDone($)}
              />
              {isDoneShown && (
                <Button key="clear-done" label="Clear done" dimColor onPress={act({ kind: 'clearDone' })} />
              )}
            </Box>
            {isDoneShown && items.map((t, i) => row(t, first + i + 1))}
          </Box>
        )
      }
      if (status === 'doing' && items.length === 0) return null

      return (
        <Box key={`section-${status}`} flexDirection="column" marginTop={1}>
          <Text bold color={status === 'doing' ? 'warning' : 'claude'}>
            {SECTION_TITLE[status].toUpperCase()} {items.length}
          </Text>
          {items.length === 0 ? (
            <Text dimColor>  Nothing queued.</Text>
          ) : (
            items.map((t, i) => row(t, first + i + 1))
          )}
        </Box>
      )
    })

    return (
      <Box flexDirection="column" width={width}>
        <Box flexDirection="row" flexWrap="wrap">
          <Text bold>{v.project}</Text>
          <Text dimColor>
            {' '}· {open} open · {doneCount} done
          </Text>
        </Box>
        {v.error !== undefined && <Text color="error">{v.error}</Text>}
        {field?.({
          key: 'add',
          value: '',
          placeholder: 'Add a task…',
          submitLabel: 'add',
          autoFocus: true,
          onSubmit: text => {
            void mutate($, () => ({ kind: 'add', text }))
          },
        })}
        {list.length === 0 && (
          <Text dimColor>
            No tasks yet. Type one above, or {'/tasks add <text>'}. Saved to {rel}.
          </Text>
        )}
        {list.length > 0 && sections}
        <Box marginTop={1}>
          <Text dimColor>
            {v.exists ? rel : `${rel} (created on first change)`} · Enter on a task for actions
          </Text>
        </Box>
      </Box>
    )
  })
}
