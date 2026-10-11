import { describe, expect, test } from 'claude-code/testing'

import { apply, describe as list, find, ordered, parse, serialize } from '../hooks/tasks'

const FILE = [
  '# Tasks',
  '',
  'Notes for the OAuth connector.',
  '',
  '## In progress',
  '',
  '- [ ] Wire token refresh <!-- id:a1b2 -->',
  '',
  '## Todo',
  '',
  '- [ ] Add PKCE tests <!-- id:c3d4 -->',
  '  check the S256 path too',
  '',
  '## Done',
  '',
  '- [x] Scaffold connector <!-- id:e5f6 done:2026-10-08 -->',
  '',
].join('\n')

describe('the task file', () => {
  test('reads sections, ids, notes and done dates', () => {
    const doc = parse(FILE)
    expect(doc.title).toBe('Tasks')
    expect(doc.preamble).toEqual(['Notes for the OAuth connector.'])
    expect(doc.tasks.map(t => [t.id, t.status, t.text])).toEqual([
      ['a1b2', 'doing', 'Wire token refresh'],
      ['c3d4', 'todo', 'Add PKCE tests'],
      ['e5f6', 'done', 'Scaffold connector'],
    ])
    expect(doc.tasks[1]?.notes).toEqual(['check the S256 path too'])
    expect(doc.tasks[2]?.doneOn).toBe('2026-10-08')
  })

  test('writes back exactly what it read', () => {
    expect(serialize(parse(FILE))).toBe(FILE)
  })

  test('takes hand-written lists with no ids, CRLF and loose headings', () => {
    const hand = '# Backlog\r\n## Doing\r\n* [ ] one\r\n## Later\r\n- [ ] two\r\n- [x] three\r\n'
    const first = parse(hand)
    expect(first.title).toBe('Backlog')
    expect(first.tasks.map(t => [t.status, t.text])).toEqual([
      ['doing', 'one'],
      ['todo', 'two'],
      ['done', 'three'],
    ])
    // ids for id-less items come from the text, so two reads agree
    expect(parse(hand).tasks.map(t => t.id)).toEqual(first.tasks.map(t => t.id))
    expect(new Set(first.tasks.map(t => t.id)).size).toBe(3)
  })

  test('an empty or missing file is an empty list', () => {
    expect(parse('').tasks).toEqual([])
    expect(serialize(parse(''))).toBe('# Tasks\n\n## In progress\n\n## Todo\n\n## Done\n')
  })
})

describe('changes', () => {
  test('add, start, finish, reopen, rename, move and remove', () => {
    let doc = parse(FILE)
    const added = apply(doc, { kind: 'add', text: '  Rotate   secrets ' })
    expect(added.said).toBe('Added "Rotate secrets".')
    doc = added.doc
    const id = added.task?.id ?? ''
    expect(find(doc.tasks, '3')?.text).toBe('Rotate secrets')

    doc = apply(doc, { kind: 'move', id, by: -1 }).doc
    expect(ordered(doc.tasks).map(t => t.text)).toEqual([
      'Wire token refresh',
      'Rotate secrets',
      'Add PKCE tests',
      'Scaffold connector',
    ])

    doc = apply(doc, { kind: 'status', id: 'a1b2', status: 'done', today: '2026-10-10' }).doc
    const done = doc.tasks.filter(t => t.status === 'done')
    expect(done.map(t => [t.text, t.doneOn])).toEqual([
      ['Wire token refresh', '2026-10-10'],
      ['Scaffold connector', '2026-10-08'],
    ])

    doc = apply(doc, { kind: 'status', id: 'e5f6', status: 'todo', today: '2026-10-10' }).doc
    expect(doc.tasks.find(t => t.id === 'e5f6')?.doneOn).toBeUndefined()

    doc = apply(doc, { kind: 'edit', id, text: 'Rotate client secrets' }).doc
    expect(find(doc.tasks, id)?.text).toBe('Rotate client secrets')

    const removed = apply(doc, { kind: 'remove', id: 'c3d4' })
    expect(removed.said).toBe('Removed "Add PKCE tests".')
    expect(find(removed.doc.tasks, 'c3d4')).toBeUndefined()
  })

  test('refuses empty text and unknown ids without changing anything', () => {
    const doc = parse(FILE)
    expect(apply(doc, { kind: 'add', text: '   ' }).doc.tasks).toHaveLength(3)
    expect(apply(doc, { kind: 'remove', id: 'zzzz' }).said).toBe('No task zzzz.')
  })

  test('clear removes only done tasks', () => {
    const out = apply(parse(FILE), { kind: 'clearDone' })
    expect(out.said).toBe('Cleared 1 done task.')
    expect(out.doc.tasks.map(t => t.status)).toEqual(['doing', 'todo'])
  })

  test('the plain-text list numbers as the pane does', () => {
    expect(list(parse(FILE).tasks)).toBe(
      'In progress:\n  1. Wire token refresh  [id:a1b2]\nTodo:\n  2. Add PKCE tests  [id:c3d4]\nDone: 1',
    )
  })
})
