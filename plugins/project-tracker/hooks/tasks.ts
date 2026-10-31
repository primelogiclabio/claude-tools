// The task file's format, kept free of the engine so tests read it directly.
//
//   # Tasks
//   ## In progress
//   - [ ] Wire token refresh <!-- id:a1b2 -->
//   ## Todo
//   - [ ] Add PKCE tests <!-- id:c3d4 -->
//     indented lines under an item are its notes
//   ## Done
//   - [x] Scaffold connector <!-- id:e5f6 done:2026-10-08 -->

import type { Task, TaskDoc, TaskStatus } from '../types'

export const STATUS_ORDER: readonly TaskStatus[] = ['doing', 'todo', 'done']

export const SECTION_TITLE: Record<TaskStatus, string> = {
  doing: 'In progress',
  todo: 'Todo',
  done: 'Done',
}

const ITEM = /^[-*+]\s+\[([ xX~/>])\]\s?(.*)$/
const META = /\s*<!--\s*(.*?)\s*-->\s*$/
const INDENTED = /^(\s{2,}|\t)\S/

function sectionStatus(heading: string): TaskStatus | null {
  const name = heading.trim().toLowerCase().replace(/[^a-z ]/g, '').trim()
  if (/^(in progress|doing|active|wip|now|current)/.test(name)) return 'doing'
  if (/^(done|completed?|finished|closed)/.test(name)) return 'done'
  if (/^(todo|to do|backlog|next|later|open|pending|tasks)/.test(name)) return 'todo'

  return null
}

function readMeta(raw: string): { text: string; id?: string; doneOn?: string } {
  const match = META.exec(raw)
  if (!match) return { text: raw.trim() }
  const fields: Record<string, string> = {}
  for (const pair of (match[1] ?? '').split(/\s+/)) {
    const at = pair.indexOf(':')
    if (at > 0) fields[pair.slice(0, at)] = pair.slice(at + 1)
  }

  return { text: raw.slice(0, match.index).trim(), id: fields.id, doneOn: fields.done }
}

// An item written without an id gets one from its text, so the same file
// read twice names its tasks the same until a change writes the ids down.
function stableId(text: string, taken: ReadonlySet<string>): string {
  let hash = 5381
  for (let i = 0; i < text.length; i += 1) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0
  for (let salt = 0; salt < 8; salt += 1) {
    const id = ((hash + salt * 7919) % 36 ** 4).toString(36).padStart(4, '0')
    if (!taken.has(id)) return id
  }

  return newId(taken)
}

export function newId(taken: ReadonlySet<string>): string {
  for (;;) {
    const bytes = new Uint8Array(3)
    crypto.getRandomValues(bytes)
    const id = Array.from(bytes, b => b.toString(36).padStart(2, '0'))
      .join('')
      .slice(0, 4)
    if (!taken.has(id)) return id
  }
}

/** Reads a task file; never throws, and gives every item an id. */
export function parse(source: string): TaskDoc {
  const doc: TaskDoc = { title: 'Tasks', preamble: [], tasks: [] }
  let section: TaskStatus | null | undefined
  let last: Task | undefined
  const taken = new Set<string>()

  for (const line of source.replace(/\r\n?/g, '\n').split('\n')) {
    const trimmed = line.trim()
    if (/^#\s/.test(trimmed) && section === undefined && doc.tasks.length === 0) {
      doc.title = trimmed.replace(/^#\s+/, '') || 'Tasks'
      continue
    }
    if (/^#{2,}\s/.test(trimmed)) {
      section = sectionStatus(trimmed.replace(/^#+\s+/, ''))
      last = undefined
      continue
    }
    const item = ITEM.exec(trimmed)
    if (item && !INDENTED.test(line)) {
      const mark = item[1] ?? ' '
      const meta = readMeta(item[2] ?? '')
      if (meta.text === '') continue
      const isChecked = mark === 'x' || mark === 'X'
      const status: TaskStatus = isChecked
        ? 'done'
        : mark === '~' || mark === '/' || mark === '>'
          ? 'doing'
          : section === 'done'
            ? 'todo'
            : (section ?? 'todo')
      const id = meta.id && !taken.has(meta.id) ? meta.id : stableId(meta.text, taken)
      taken.add(id)
      last = { id, text: meta.text, status, notes: [] }
      if (status === 'done' && meta.doneOn) last.doneOn = meta.doneOn
      doc.tasks.push(last)
      continue
    }
    if (last && INDENTED.test(line)) {
      last.notes.push(line.replace(/^(\s{2}|\t)/, ''))
      continue
    }
    if (trimmed === '') continue
    last = undefined
    doc.preamble.push(line)
  }

  return doc
}

function itemLine(task: Task): string {
  const meta = task.status === 'done' && task.doneOn ? ` done:${task.doneOn}` : ''
  const box = task.status === 'done' ? 'x' : ' '

  return `- [${box}] ${task.text} <!-- id:${task.id}${meta} -->`
}

/** Writes a doc back in the canonical layout, every section present. */
export function serialize(doc: TaskDoc): string {
  const out: string[] = [`# ${doc.title}`, '']
  if (doc.preamble.length > 0) out.push(...doc.preamble, '')
  for (const status of STATUS_ORDER) {
    out.push(`## ${SECTION_TITLE[status]}`, '')
    const items = doc.tasks.filter(t => t.status === status)
    for (const task of items) {
      out.push(itemLine(task))
      for (const note of task.notes) out.push(`  ${note}`)
    }
    if (items.length > 0) out.push('')
  }

  return out.join('\n').replace(/\n+$/, '\n')
}

/** Tasks in display order: in progress, todo, then done; numbered from 1. */
export function ordered(tasks: readonly Task[]): Task[] {
  return STATUS_ORDER.flatMap(status => tasks.filter(t => t.status === status))
}

/** Finds a task by its display number (`3`, `#3`) or its id. */
export function find(tasks: readonly Task[], ref: string): Task | undefined {
  const key = ref.trim().replace(/^#/, '')
  if (/^\d+$/.test(key)) return ordered(tasks)[Number(key) - 1]

  return tasks.find(t => t.id === key)
}

export type Change =
  | { kind: 'add'; text: string; status?: TaskStatus }
  | { kind: 'status'; id: string; status: TaskStatus; today: string }
  | { kind: 'edit'; id: string; text: string }
  | { kind: 'remove'; id: string }
  | { kind: 'move'; id: string; by: -1 | 1 }
  | { kind: 'clearDone' }

/** Applies one change; answers the new doc and a line saying what it did. */
export function apply(doc: TaskDoc, change: Change): { doc: TaskDoc; said: string; task?: Task } {
  const tasks = doc.tasks.map(t => ({ ...t, notes: [...t.notes] }))
  const next = (said: string, task?: Task) => ({ doc: { ...doc, tasks }, said, task })

  if (change.kind === 'add') {
    const text = change.text.replace(/\s+/g, ' ').trim()
    if (text === '') return next('Nothing to add: the task text is empty.')
    const task: Task = {
      id: newId(new Set(tasks.map(t => t.id))),
      text,
      status: change.status ?? 'todo',
      notes: [],
    }
    tasks.push(task)

    return next(`Added "${text}".`, task)
  }
  if (change.kind === 'clearDone') {
    const kept = tasks.filter(t => t.status !== 'done')
    const count = tasks.length - kept.length

    return { doc: { ...doc, tasks: kept }, said: `Cleared ${count} done task${count === 1 ? '' : 's'}.` }
  }

  const at = tasks.findIndex(t => t.id === change.id)
  const task = tasks[at]
  if (task === undefined) return next(`No task ${change.id}.`)

  switch (change.kind) {
    case 'status': {
      tasks.splice(at, 1)
      const moved: Task = { ...task, status: change.status }
      if (change.status === 'done') {
        moved.doneOn = change.today
        const firstDone = tasks.findIndex(t => t.status === 'done')
        tasks.splice(firstDone === -1 ? tasks.length : firstDone, 0, moved)
      } else {
        delete moved.doneOn
        tasks.push(moved)
      }
      const verb = { doing: 'Started', todo: 'Moved back to todo:', done: 'Done:' }[change.status]

      return next(`${verb} "${task.text}".`, moved)
    }
    case 'edit': {
      const text = change.text.replace(/\s+/g, ' ').trim()
      if (text === '') return next('Nothing changed: the new text is empty.', task)
      tasks[at] = { ...task, text }

      return next(`Renamed to "${text}".`, tasks[at])
    }
    case 'remove':
      tasks.splice(at, 1)

      return next(`Removed "${task.text}".`)
    case 'move': {
      const peers = tasks
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => t.status === task.status)
      const place = peers.findIndex(p => p.i === at)
      const other = peers[place + change.by]
      if (other === undefined) return next(`"${task.text}" is already at the ${change.by < 0 ? 'top' : 'bottom'}.`, task)
      tasks[at] = other.t
      tasks[other.i] = task

      return next(`Moved "${task.text}" ${change.by < 0 ? 'up' : 'down'}.`, task)
    }
  }
}

/** The list as plain text, numbered as the pane numbers it. */
export function describe(tasks: readonly Task[], options: { withDone?: boolean } = {}): string {
  const lines: string[] = []
  let n = 0
  for (const status of STATUS_ORDER) {
    const items = tasks.filter(t => t.status === status)
    if (status === 'done' && !options.withDone) {
      if (items.length > 0) lines.push(`${SECTION_TITLE.done}: ${items.length}`)
      continue
    }
    if (items.length === 0) continue
    lines.push(`${SECTION_TITLE[status]}:`)
    for (const task of items) {
      n += 1
      lines.push(`  ${n}. ${task.text}  [id:${task.id}]`)
    }
  }

  return lines.length === 0 ? 'No tasks.' : lines.join('\n')
}
