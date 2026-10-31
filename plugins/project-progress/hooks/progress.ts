// PROGRESS.md as the skill writes it, read only: the pane never writes the
// file, so every change goes through the skill.
//
//   # Progress
//   Goal: ...
//   ## Current focus
//   - (none)
//   ## Next
//   - [ ] ...
//   ## Done (last 10) / ## Decisions / ## Parking lot / ## Gotchas
//   - ...
//
// Unknown headings and the lines under them are skipped, not dropped from
// anywhere, since nothing is written back.

import type { NextItem, ProgressDoc, SectionKey } from '../types'

export const SECTION_TITLE: Record<SectionKey, string> = {
  focus: 'Now',
  next: 'Next',
  done: 'Done',
  decisions: 'Decisions',
  parked: 'Parked',
  gotchas: 'Gotchas',
}

const HEADING = /^#{2,}\s+(.*)$/
const ITEM = /^[-*+]\s+(.*)$/
const BOX = /^\[([ xX])\]\s?(.*)$/
const GOAL = /^goal:\s*(.*)$/i
const NONE = /^\(none\)$/i

function sectionOf(heading: string): SectionKey | null {
  const name = heading.trim().toLowerCase()
  if (name.startsWith('current focus') || name.startsWith('focus')) return 'focus'
  if (name.startsWith('next')) return 'next'
  if (name.startsWith('done')) return 'done'
  if (name.startsWith('decisions')) return 'decisions'
  if (name.startsWith('parking lot') || name.startsWith('parked')) return 'parked'
  if (name.startsWith('gotchas')) return 'gotchas'

  return null
}

export function empty(): ProgressDoc {
  return { goal: '', focus: [], next: [], done: [], decisions: [], parked: [], gotchas: [] }
}

export function parse(source: string): ProgressDoc {
  const doc = empty()
  let section: SectionKey | null = null
  let isBeforeSections = true
  // The last entry read, so an indented line can join it.
  let last: { key: SectionKey; at: number } | null = null

  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trimEnd()
    if (line.trim() === '') continue

    const heading = HEADING.exec(line)
    if (heading) {
      section = sectionOf(heading[1] ?? '')
      isBeforeSections = false
      last = null
      continue
    }
    if (isBeforeSections) {
      const goal = GOAL.exec(line.trim())
      if (goal) doc.goal = (goal[1] ?? '').trim()
      continue
    }
    if (section === null) continue

    const item = ITEM.exec(line)
    if (item === null || /^\s/.test(line)) {
      if (last === null) continue
      if (last.key === 'next') {
        const entry = doc.next[last.at]
        if (entry) entry.text = `${entry.text} ${line.trim()}`
      } else {
        const list = doc[last.key]
        list[last.at] = `${list[last.at] ?? ''} ${line.trim()}`
      }
      continue
    }

    const text = (item[1] ?? '').trim()
    if (NONE.test(text)) {
      last = null
      continue
    }
    if (section === 'next') {
      const box = BOX.exec(text)
      const entry: NextItem = box
        ? { text: (box[2] ?? '').trim(), isDone: (box[1] ?? ' ') !== ' ' }
        : { text, isDone: false }
      if (entry.text === '') continue
      doc.next.push(entry)
      last = { key: 'next', at: doc.next.length - 1 }
    } else {
      const box = BOX.exec(text)
      const plain = box ? (box[2] ?? '').trim() : text
      if (plain === '') continue
      doc[section].push(plain)
      last = { key: section, at: doc[section].length - 1 }
    }
  }

  return doc
}

export function openNext(doc: ProgressDoc): NextItem[] {
  return doc.next.filter(item => !item.isDone)
}

/** The plain-text form `/progress text` prints, and where no pane is drawn. */
export function summary(doc: ProgressDoc, exists: boolean, fileName = 'PROGRESS.md'): string {
  if (!exists) return `No ${fileName} in this project yet. /project-progress init sets one up.`
  const lines: string[] = []
  if (doc.goal !== '') lines.push(`Goal: ${doc.goal}`)
  lines.push(doc.focus.length === 0 ? 'Now: nothing in progress' : `Now: ${doc.focus.join('; ')}`)
  const next = openNext(doc)
  if (next.length === 0) {
    lines.push('Next: empty')
  } else {
    lines.push('Next:')
    next.slice(0, 3).forEach((item, i) => lines.push(`  ${i + 1}. ${item.text}`))
    if (next.length > 3) lines.push(`  …and ${next.length - 3} more`)
  }
  lines.push(`Parked: ${doc.parked.length} · Done: ${doc.done.length}`)

  return lines.join('\n')
}
