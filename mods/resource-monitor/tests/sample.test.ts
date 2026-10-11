import { describe, expect, test } from 'claude-code/testing'

import { FrameReader, lines, measure, parseClock, sparkline, tree, type Frame } from '../hooks/sample'
import { utf16Base64 } from '../hooks/sampler'

const META = { cpus: 4, memKb: 16 * 1024 * 1024, os: 'Linux' }

function frame(at: number, cpu: Record<number, number>): Frame {
  return {
    self: 50,
    root: 10,
    at,
    procs: [
      { pid: 1, ppid: 0, memKb: 1000, cpuMs: 99999, name: 'init' },
      { pid: 10, ppid: 1, memKb: 400_000, cpuMs: cpu[10] ?? 0, name: 'claude' },
      { pid: 20, ppid: 10, memKb: 200_000, cpuMs: cpu[20] ?? 0, name: 'node' },
      { pid: 21, ppid: 20, memKb: 100_000, cpuMs: cpu[21] ?? 0, name: 'esbuild' },
      { pid: 50, ppid: 10, memKb: 50_000, cpuMs: cpu[50] ?? 0, name: 'sh' },
      { pid: 51, ppid: 50, memKb: 2_000, cpuMs: 5, name: 'ps' },
      { pid: 30, ppid: 1, memKb: 900_000, cpuMs: 123456, name: 'chrome' },
    ],
  }
}

describe('sampling', () => {
  test('ps clock times parse to milliseconds', () => {
    expect(parseClock('0:01.23')).toBe(1230)
    expect(parseClock('12:03.50')).toBe(723500)
    expect(parseClock('1:02:03')).toBe(3723000)
    expect(parseClock('2-01:00:00')).toBe(176400000)
  })

  test('streamed text splits into whole lines', () => {
    const a = lines('', 'meta 4 100 Linux\nbeg')
    expect(a.lines).toEqual(['meta 4 100 Linux'])
    const b = lines(a.rest, 'in 50 10\r\nend\n')
    expect(b.lines).toEqual(['begin 50 10', 'end'])
    expect(b.rest).toBe('')
  })

  test('the reader folds lines into frames, names with spaces kept', () => {
    const r = new FrameReader()
    expect(r.push('meta 8 1048576 Darwin')).toBeNull()
    expect(r.meta).toEqual({ cpus: 8, memKb: 1048576, os: 'Darwin' })
    r.push('begin 50 10')
    r.push('q 10 1 2048 1:02.50 /Applications/Claude Code.app/claude')
    const f = r.push('end')
    expect(f?.procs[0]).toEqual({ pid: 10, ppid: 1, memKb: 2048, cpuMs: 62500, name: '/Applications/Claude Code.app/claude' })
    expect(f?.at).toBeUndefined()
  })

  test("the tree is Claude Code and its descendants, without the sampler's own", () => {
    const t = tree(frame(0, {}))
    expect(t.map(x => [x.proc.name, x.depth])).toEqual([
      ['claude', 0],
      ['node', 1],
      ['esbuild', 2],
    ])
  })

  test('CPU is the growth over the interval, as a share of every CPU', () => {
    const first = measure(frame(1000, { 10: 1000, 20: 500 }), null, 1000, META)
    expect(first.cpu).toBeUndefined()
    expect(first.memKb).toBe(700_000)
    // 2 s later: claude used 1 s, node 2 s, esbuild (new) 1 s → 4 s of 8 s capacity.
    const second = measure(frame(3000, { 10: 2000, 20: 2500, 21: 1000 }), { frame: frame(1000, { 10: 1000, 20: 500 }), at: 1000 }, 3000, META)
    expect(second.cores).toBe(2)
    expect(second.cpu).toBe(50)
    expect(second.procs.map(p => p.cpu)).toEqual([12.5, 25, 12.5])
  })

  test('sparklines scale to a floor', () => {
    expect(sparkline([0, 5, 10], 10)).toBe('▁▅█')
    expect(sparkline([1, 1], 100)).toBe('▁▁')
  })

  test('PowerShell -EncodedCommand text is UTF-16LE base64', () => {
    expect(utf16Base64('ab')).toBe('YQBiAA==')
    expect(utf16Base64('"x"')).toBe('IgB4ACIA')
  })
})
