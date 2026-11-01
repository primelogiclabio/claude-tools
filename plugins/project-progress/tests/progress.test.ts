import { describe, expect, test } from 'claude-code/testing'

import { openNext, parse, summary } from '../hooks/progress'

const FILE = [
  '# Progress',
  '',
  'Goal: ship the pane.',
  '',
  '## Current focus',
  '- Build the pane',
  '',
  '## Next',
  '- [ ] Write the README',
  '- [x] Ticked, not yet moved',
  '- [ ] Re-test in a real session',
  '',
  '## Done (last 10)',
  '- Decided the split',
  '',
  '## Decisions',
  '- Pane ships in the plugin because one install gets both',
  '',
  '## Parking lot',
  '- (none)',
  '',
  '## Gotchas',
  '- The parser must not write',
  '',
].join('\n')

describe('parse', () => {
  test('reads every section the skill writes', () => {
    const doc = parse(FILE)
    expect(doc.goal).toBe('ship the pane.')
    expect(doc.focus).toEqual(['Build the pane'])
    expect(doc.next).toEqual([
      { text: 'Write the README', isDone: false },
      { text: 'Ticked, not yet moved', isDone: true },
      { text: 'Re-test in a real session', isDone: false },
    ])
    expect(doc.done).toEqual(['Decided the split'])
    expect(doc.decisions).toEqual(['Pane ships in the plugin because one install gets both'])
    expect(doc.parked).toEqual([])
    expect(doc.gotchas).toEqual(['The parser must not write'])
    expect(openNext(doc).map(item => item.text)).toEqual(['Write the README', 'Re-test in a real session'])
  })

  test('(none), CRLF, missing and unknown sections', () => {
    const doc = parse('# Progress\r\nGoal: x\r\n## Current focus\r\n- (none)\r\n## Notes\r\n- not a section\r\n## Next\r\n- plain item\r\n')
    expect(doc.goal).toBe('x')
    expect(doc.focus).toEqual([])
    expect(doc.next).toEqual([{ text: 'plain item', isDone: false }])
    expect(doc.done).toEqual([])
    expect(doc.parked).toEqual([])
  })

  test('an indented line joins the entry above it', () => {
    const doc = parse('## Parking lot\n- First idea\n  with more words\n- Second\n')
    expect(doc.parked).toEqual(['First idea with more words', 'Second'])
  })

  test('an empty file reads as empty sections', () => {
    const doc = parse('')
    expect(doc.goal).toBe('')
    expect(doc.next).toEqual([])
  })
})

describe('summary', () => {
  test('says what is in progress, the next three and the counts', () => {
    const text = summary(parse(FILE), true)
    expect(text).toBe(
      [
        'Goal: ship the pane.',
        'Now: Build the pane',
        'Next:',
        '  1. Write the README',
        '  2. Re-test in a real session',
        'Parked: 0 · Done: 1',
      ].join('\n'),
    )
  })

  test('points at init when there is no file', () => {
    expect(summary(parse(''), false)).toMatch(/No PROGRESS\.md .* init/)
  })
})
