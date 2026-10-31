import { describe, expect, test } from 'claude-code/testing'

import { lookup, parseIndex, rootKey, serializeIndex, upsert } from '../hooks/registry'

const EMPTY = parseIndex('')

describe('the project index', () => {
  test('anything unreadable is an empty index', () => {
    expect(parseIndex('')).toEqual({ version: 1, projects: [] })
    expect(parseIndex('{"projects": 3}').projects).toEqual([])
    expect(parseIndex('{"projects": [{"name": "x"}]}').projects).toEqual([])
  })

  test('adds a project once, then only moves lastSeen', () => {
    const first = upsert(EMPTY, { root: 'F:\\dev\\oauth', taskFile: '.claude/tasks.md' }, '2026-10-10')
    expect(first.isChanged).toBe(true)
    expect(first.index.projects).toEqual([
      { name: 'oauth', root: 'F:\\dev\\oauth', taskFile: '.claude/tasks.md', firstSeen: '2026-10-10', lastSeen: '2026-10-10' },
    ])

    const same = upsert(first.index, { root: 'f:/dev/oauth/', taskFile: '.claude/tasks.md' }, '2026-10-10')
    expect(same.isChanged).toBe(false)

    const later = upsert(first.index, { root: 'F:\\dev\\oauth', taskFile: '.claude/tasks.md' }, '2026-10-12')
    expect(later.index.projects).toHaveLength(1)
    expect(later.index.projects[0]?.firstSeen).toBe('2026-10-10')
    expect(later.index.projects[0]?.lastSeen).toBe('2026-10-12')
  })

  test('keeps fields it does not know and sorts by name', () => {
    const text = JSON.stringify({
      version: 1,
      projects: [{ name: 'zeta', root: '/w/zeta', taskFile: '.claude/tasks.md', firstSeen: 'a', lastSeen: 'a', aliases: ['z'] }],
    })
    const out = upsert(parseIndex(text), { root: '/w/alpha', taskFile: '.claude/tasks.md' }, 'b')
    expect(out.index.projects.map(p => p.name)).toEqual(['alpha', 'zeta'])
    expect(out.index.projects[1]?.aliases).toEqual(['z'])
    expect(parseIndex(serializeIndex(out.index))).toEqual(out.index)
  })

  test('drive-letter roots compare without case; POSIX roots with it', () => {
    expect(rootKey('F:\\Dev\\X\\')).toBe(rootKey('f:/dev/x'))
    expect(rootKey('/w/X')).not.toBe(rootKey('/w/x'))
  })

  test('finds projects by root, exact name, then words', () => {
    let index = EMPTY
    for (const root of ['F:\\dev\\oauth-connector-project', 'F:\\dev\\otp-authentication', 'F:\\dev\\golf-app']) {
      index = upsert(index, { root, taskFile: '.claude/tasks.md' }, 'd').index
    }
    expect(lookup(index, 'f:/dev/golf-app').map(p => p.name)).toEqual(['golf-app'])
    expect(lookup(index, 'OTP-Authentication').map(p => p.name)).toEqual(['otp-authentication'])
    expect(lookup(index, 'oauth connector').map(p => p.name)).toEqual(['oauth-connector-project'])
    expect(lookup(index, 'o').length).toBe(3)
    expect(lookup(index, 'nothing here')).toEqual([])
  })
})
