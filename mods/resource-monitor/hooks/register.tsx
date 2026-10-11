import type { EngineInterface, Register } from 'claude-code'

import {
  FrameReader,
  LEVEL_COLOR,
  fmtMem,
  fmtPct,
  level,
  lines,
  measure,
  report,
  shortName,
  sparkline,
  type Frame,
  type Reading,
} from './sample'
import { posixArgv, windowsArgv } from './sampler'

const PANE = 'resources'
const COMMAND = 'resources'
const TOOL = 'mcp__resource-monitor__resources'
const HISTORY = 60
const MAX_ROWS = 15

const HELP = [
  '/resources          open the Resources pane (or print the figures where no pane is drawn)',
  '/resources text     print the figures here',
  '/resources close    close the pane',
].join('\n')

// Module state; a reload of the module starts the sampler and history over.
let reader = new FrameReader()
let prev: { frame: Frame; at: number } | null = null
let reading: Reading | null = null
let cpuHistory: number[] = []
let memHistory: number[] = []
let problem: string | undefined
let cpuWarn = 85
let memWarn = 85
let intervalSeconds = 5
let isStatusShown = true
let isAutoOpen = false

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function showStatus($: EngineInterface): void {
  if (!isStatusShown) return
  const r = reading
  if (r === null) {
    $.ui.status(undefined)

    return
  }
  const isHot = level(r.cpu, cpuWarn) === 'danger' || level(r.memPercent, memWarn) === 'danger'
  $.ui.status(`${isHot ? '⚠' : '⚙'} CPU ${fmtPct(r.cpu)} · ${fmtMem(r.memKb)}`)
}

async function take($: EngineInterface, frame: Frame): Promise<void> {
  const meta = reader.meta
  if (meta === null) return
  const at = frame.at ?? (await $.clock.now())
  const r = measure(frame, prev, at, meta)
  prev = { frame, at }
  if (r.procs.length === 0) {
    problem = "couldn't find Claude Code's own process in the sample"
  } else {
    problem = undefined
  }
  reading = r
  if (r.cpu !== undefined) cpuHistory = [...cpuHistory, r.cpu].slice(-HISTORY)
  memHistory = [...memHistory, r.memPercent].slice(-HISTORY)
  showStatus($)
  $.ui.invalidate('ui.render')
}

async function runSampler($: EngineInterface): Promise<void> {
  const isWindows = (await $.env.get('OS')) === 'Windows_NT'
  const argv = isWindows ? windowsArgv(intervalSeconds) : posixArgv(intervalSeconds)
  let rest = ''
  try {
    const stream = $.process.spawn({ argv })
    for await (const chunk of stream) {
      if (chunk.stream !== 'stdout') continue
      const split = lines(rest, chunk.text)
      rest = split.rest
      for (const line of split.lines) {
        const frame = reader.push(line)
        if (frame !== null) await take($, frame)
      }
    }
    problem = `the sampler stopped${reading === null ? ' before its first sample' : ''}; figures are from its last sample`
  } catch (err) {
    problem = `the sampler (${argv[0]}) could not run: ${err instanceof Error ? err.message : String(err)}`
  }
  $.ui.invalidate('ui.render')
}

function summaryKey(r: Reading): string {
  const kids = r.procs.slice(1).map(p => shortName(p.name)).sort().join(',')

  return `${kids}|${level(r.cpu, cpuWarn)}|${level(r.memPercent, memWarn)}`
}

export const register: Register = (on, options) => {
  cpuWarn = num(options.cpuWarn, 85)
  memWarn = num(options.memWarn, 85)
  intervalSeconds = Math.max(2, num(options.intervalSeconds, 5))
  isStatusShown = options.statusLine !== false
  isAutoOpen = options.autoOpen === true
  reader = new FrameReader()
  prev = null
  reading = null
  cpuHistory = []
  memHistory = []
  problem = undefined

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await $.command.register({
      name: COMMAND,
      description: "CPU and memory of Claude Code and the processes it started (Resources pane)",
      argumentHint: '[text|close|help]',
    })
    await $.tool.register({
      name: 'resources',
      description:
        "Current CPU and memory of this Claude Code session's own process and every process it started " +
        '(test runs, dev servers, builds), each with its pid and name. Use it when the user asks whether ' +
        'something is still running or how much CPU/memory Claude Code or its processes are using. ' +
        'It covers only Claude Code\'s process tree, not the rest of the machine.',
      inputSchema: { type: 'object', properties: {} },
      isDeferred: false,
    })
    void runSampler($)
    if (isAutoOpen && e.isInteractive) void $.ui.open({ id: PANE, title: 'Resources' })

    return started
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const verb = e.args.trim().toLowerCase()
    if (verb === 'help' || verb === '?') return { text: HELP }
    if (verb === 'close' || verb === 'hide') {
      await $.ui.close({ id: PANE })

      return { text: 'Resources pane closed. /resources opens it again.' }
    }
    if (verb === 'text') return { text: report(reading, reader.meta, cpuWarn, memWarn, problem) }
    if (verb !== '' && verb !== 'open' && verb !== 'show') return { text: `Unknown option "${verb}".\n${HELP}` }
    const opened = await $.ui.open({ id: PANE, title: 'Resources', focus: true })
    if (opened.isPlaced) return { text: 'Resources pane open.' }

    return { text: report(reading, reader.meta, cpuWarn, memWarn, problem) }
  }).catch(($, e, next) => ({
    text: `resource-monitor: /resources failed${next.error ? `: ${next.error.message}` : ''}.`,
  }))

  on('tool.call', { tool: TOOL }, async () => ({
    result: report(reading, reader.meta, cpuWarn, memWarn, problem),
  })).catch(($, e, next) => ({
    deny: `resource-monitor: the resources tool failed${next.error ? `: ${next.error.message}` : ''}.`,
  }))

  // On by default: beside a prompt, a one-line note of what Claude Code has
  // running, sent again only when the set of processes or a warning changes.
  if (options.injectContext !== false) {
    let lastKey = ''
    on('prompt.submit', async ($, e, next) => {
      const r = reading
      if (r === null) return next(e)
      const key = summaryKey(r)
      if (key === lastKey) return next(e)
      lastKey = key
      const kids = r.procs.slice(1)
      const running =
        kids.length === 0
          ? 'no child processes'
          : `running: ${kids.slice(0, 8).map(p => `${shortName(p.name)} (pid ${p.pid})`).join(', ')}${kids.length > 8 ? ', …' : ''}`
      const warn = [
        level(r.cpu, cpuWarn) === 'danger' ? `CPU is above ${cpuWarn}% of the machine` : '',
        level(r.memPercent, memWarn) === 'danger' ? `memory is above ${memWarn}% of RAM` : '',
      ].filter(s => s !== '')
      const text =
        `Claude Code's process tree right now: CPU ${fmtPct(r.cpu)} of the machine, memory ${fmtMem(r.memKb)}; ${running}.` +
        (warn.length > 0 ? ` Warning: ${warn.join('; ')}.` : '') +
        ` The ${TOOL} tool gives current figures.`

      return next({ ...e, context: [...(e.context ?? []), text] })
    })
  }

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const width = Math.max(24, e.props.bodyColumns)
    const r = reading
    const meta = reader.meta

    if (r === null || meta === null) {
      return (
        <Box flexDirection="column" width={width}>
          <Text dimColor>{problem !== undefined ? `Resource sampling is unavailable: ${problem}` : 'Taking the first sample…'}</Text>
        </Box>
      )
    }

    const cpuColor = LEVEL_COLOR[level(r.cpu, cpuWarn)]
    const memColor = LEVEL_COLOR[level(r.memPercent, memWarn)]
    const spark = Math.max(8, Math.min(HISTORY, width - 26))
    const shown = r.procs.slice(0, MAX_ROWS)
    const nameWidth = Math.max(8, width - 22)

    return (
      <Box flexDirection="column" width={width}>
        <Text dimColor>
          Claude Code + {r.procs.length - 1} child process{r.procs.length === 2 ? '' : 'es'} · every {intervalSeconds}s
        </Text>
        <Box flexDirection="row" marginTop={1}>
          <Text bold>CPU </Text>
          <Text key="cpu" color={cpuColor}>{fmtPct(r.cpu).padStart(5)}</Text>
          <Text> </Text>
          <Text color={cpuColor}>{sparkline(cpuHistory.slice(-spark), 10)}</Text>
        </Box>
        <Text dimColor>     {r.cores === undefined ? 'measuring…' : `${r.cores.toFixed(2)} of ${meta.cpus} cores`} · warn at {cpuWarn}%</Text>
        <Box flexDirection="row">
          <Text bold>RAM </Text>
          <Text key="mem" color={memColor}>{fmtMem(r.memKb).padStart(7)}</Text>
          <Text> </Text>
          <Text color={memColor}>{sparkline(memHistory.slice(-spark), 5)}</Text>
        </Box>
        <Text dimColor>     {fmtPct(r.memPercent)} of {fmtMem(meta.memKb)} · warn at {memWarn}%</Text>
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>{'  CPU      MEM  PROCESS'}</Text>
          {shown.map(p => (
            <Text key={`proc-${p.pid}`}>
              {fmtPct(p.cpu).padStart(5)} {fmtMem(p.memKb).padStart(8)}  {('  '.repeat(p.depth) + shortName(p.name)).slice(0, nameWidth)}
              <Text dimColor> {p.pid}</Text>
            </Text>
          ))}
          {r.procs.length > shown.length && <Text dimColor>  … {r.procs.length - shown.length} more</Text>}
        </Box>
        {problem !== undefined && (
          <Box marginTop={1}>
            <Text color="warning">{problem}</Text>
          </Box>
        )}
      </Box>
    )
  })
}
