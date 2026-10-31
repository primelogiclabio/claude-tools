// Pure parsing and arithmetic for the resource monitor: no engine calls here,
// so the tests can check them directly.
//
// The sampler (a long-lived PowerShell or sh child of Claude Code) prints:
//   meta <logical cpus> <total memory KB> <os>
//   begin <sampler pid> <claude pid> [<timestamp ms>]
//   p <pid> <ppid> <memory KB> <cpu ms> <name...>      cumulative CPU in ms
//   q <pid> <ppid> <memory KB> <cpu clock> <name...>   cumulative CPU as ps prints it
//   end

export type Level = 'ok' | 'warn' | 'danger'

export type Proc = { pid: number; ppid: number; memKb: number; cpuMs: number; name: string }

export type Frame = { self: number; root: number; at?: number; procs: Proc[] }

export type Meta = { cpus: number; memKb: number; os: string }

/** One process of Claude Code's tree, measured over the last interval. */
export type ProcView = {
  pid: number
  name: string
  depth: number
  memKb: number
  /** Percent of the whole machine's CPU; undefined on the first sample. */
  cpu?: number
}

export type Reading = {
  at: number
  /** Percent of the whole machine's CPU over the interval; undefined at first. */
  cpu?: number
  /** CPU in cores (1.0 = one core busy). */
  cores?: number
  memKb: number
  memPercent: number
  procs: ProcView[]
}

/** "1:23.45", "12:03.10", "1:02:03", "2-01:02:03" (ps `time`) → milliseconds. */
export function parseClock(text: string): number {
  let days = 0
  let rest = text
  const dash = rest.indexOf('-')
  if (dash > 0) {
    days = Number(rest.slice(0, dash))
    rest = rest.slice(dash + 1)
  }
  const parts = rest.split(':').map(Number)
  if (parts.some(n => Number.isNaN(n))) return 0
  let secs = 0
  for (const p of parts) secs = secs * 60 + p

  return Math.round((days * 86400 + secs) * 1000)
}

/** Splits streamed text into whole lines, keeping a partial last line. */
export function lines(buffer: string, text: string): { lines: string[]; rest: string } {
  const all = (buffer + text).split(/\r?\n/)
  const rest = all.pop() ?? ''

  return { lines: all, rest }
}

/** Folds sampler lines into frames; returns finished frames and parser state. */
export class FrameReader {
  meta: Meta | null = null
  private current: Frame | null = null

  push(line: string): Frame | null {
    const t = line.trim()
    if (t === '') return null
    const [tag, ...f] = t.split(/\s+/)
    if (tag === 'meta') {
      this.meta = { cpus: Math.max(1, Number(f[0]) || 1), memKb: Number(f[1]) || 0, os: f[2] ?? '' }
    } else if (tag === 'begin') {
      const at = Number(f[2])
      this.current = { self: Number(f[0]), root: Number(f[1]), at: Number.isFinite(at) && at > 0 ? at : undefined, procs: [] }
    } else if ((tag === 'p' || tag === 'q') && this.current !== null && f.length >= 4) {
      const pid = Number(f[0])
      const ppid = Number(f[1])
      if (!Number.isFinite(pid) || !Number.isFinite(ppid)) return null
      this.current.procs.push({
        pid,
        ppid,
        memKb: Number(f[2]) || 0,
        cpuMs: tag === 'p' ? Number(f[3]) || 0 : parseClock(f[3] ?? ''),
        name: f.slice(4).join(' ') || '?',
      })
    } else if (tag === 'end' && this.current !== null) {
      const done = this.current
      this.current = null

      return done
    }

    return null
  }
}

/** The root and every descendant, the sampler's own subtree left out, depth-first. */
export function tree(frame: Frame): { proc: Proc; depth: number }[] {
  const byPid = new Map(frame.procs.map(p => [p.pid, p]))
  const kids = new Map<number, Proc[]>()
  for (const p of frame.procs) {
    if (p.pid === p.ppid) continue
    const list = kids.get(p.ppid) ?? []
    list.push(p)
    kids.set(p.ppid, list)
  }
  const out: { proc: Proc; depth: number }[] = []
  const seen = new Set<number>()
  const walk = (pid: number, depth: number) => {
    const p = byPid.get(pid)
    if (p === undefined || seen.has(pid) || pid === frame.self) return
    seen.add(pid)
    out.push({ proc: p, depth })
    for (const k of kids.get(pid) ?? []) walk(k.pid, depth + 1)
  }
  walk(frame.root, 0)

  return out
}

/**
 * One reading from this frame against the previous one: CPU is the growth of
 * each process's cumulative CPU time over the elapsed wall time, as a share
 * of every logical CPU. A process new since the last frame counts all of its
 * CPU time, since it started inside the interval.
 */
export function measure(frame: Frame, prev: { frame: Frame; at: number } | null, at: number, meta: Meta): Reading {
  const members = tree(frame)
  const elapsed = prev === null ? 0 : at - prev.at
  const before = new Map(prev?.frame.procs.map(p => [p.pid, p.cpuMs]) ?? [])
  const canTime = prev !== null && elapsed > 0
  let cpuMs = 0
  let memKb = 0
  const procs: ProcView[] = members.map(({ proc, depth }) => {
    memKb += proc.memKb
    let cpu: number | undefined
    if (canTime) {
      const d = Math.max(0, proc.cpuMs - (before.get(proc.pid) ?? 0))
      cpuMs += d
      cpu = (d / (elapsed * meta.cpus)) * 100
    }

    return { pid: proc.pid, name: proc.name, depth, memKb: proc.memKb, cpu }
  })

  return {
    at,
    cpu: canTime ? Math.min(100, (cpuMs / (elapsed * meta.cpus)) * 100) : undefined,
    cores: canTime ? cpuMs / elapsed : undefined,
    memKb,
    memPercent: meta.memKb > 0 ? (memKb / meta.memKb) * 100 : 0,
    procs,
  }
}

export function level(value: number | undefined, threshold: number): Level {
  if (value === undefined) return 'ok'
  if (value >= threshold) return 'danger'
  if (value >= threshold * 0.8) return 'warn'

  return 'ok'
}

export const LEVEL_COLOR: Record<Level, 'success' | 'warning' | 'error'> = {
  ok: 'success',
  warn: 'warning',
  danger: 'error',
}

export function fmtMem(kb: number): string {
  const mb = kb / 1024
  if (mb < 1000) return `${Math.round(mb)} MB`

  return `${(mb / 1024).toFixed(1)} GB`
}

export function fmtPct(p: number | undefined): string {
  if (p === undefined) return '…'
  if (p < 10) return `${p.toFixed(1)}%`

  return `${Math.round(p)}%`
}

const BARS = '▁▂▃▄▅▆▇█'

/** A sparkline of `values`, scaled to the larger of their maximum and `floor`. */
export function sparkline(values: readonly number[], floor: number): string {
  const top = Math.max(floor, ...values)
  if (top <= 0) return ''

  return values
    .map(v => BARS[Math.min(BARS.length - 1, Math.max(0, Math.round((v / top) * (BARS.length - 1))))])
    .join('')
}

/** The name without its folder, for ps's full paths on macOS. */
export function shortName(name: string): string {
  const cut = name.split(/[\\/]/).pop() ?? name

  return cut === '' ? name : cut
}

/** A plain-text report: what the model and /resources print. */
export function report(r: Reading | null, meta: Meta | null, cpuWarn: number, memWarn: number, problem?: string): string {
  if (r === null || meta === null) {
    return problem !== undefined
      ? `Resource sampling is unavailable: ${problem}`
      : 'No sample yet: the first reading arrives within a few seconds.'
  }
  const lines: string[] = []
  const kids = r.procs.length - 1
  lines.push(`Claude Code and ${kids} process${kids === 1 ? '' : 'es'} it started (${meta.os}, ${meta.cpus} logical CPUs, ${fmtMem(meta.memKb)} RAM):`)
  lines.push(
    `  CPU: ${r.cpu === undefined ? 'measuring (needs two samples)' : `${fmtPct(r.cpu)} of the machine (${(r.cores ?? 0).toFixed(2)} cores)`}` +
      (r.cpu !== undefined && r.cpu >= cpuWarn ? `  ⚠ above the ${cpuWarn}% threshold` : ''),
  )
  lines.push(
    `  Memory: ${fmtMem(r.memKb)} (${fmtPct(r.memPercent)} of RAM)` +
      (r.memPercent >= memWarn ? `  ⚠ above the ${memWarn}% threshold` : ''),
  )
  lines.push('  Processes:')
  for (const p of r.procs) {
    lines.push(`  ${'  '.repeat(p.depth)}${shortName(p.name)} (pid ${p.pid}): CPU ${fmtPct(p.cpu)}, ${fmtMem(p.memKb)}`)
  }
  if (problem !== undefined) lines.push(`  Note: ${problem}`)

  return lines.join('\n')
}
