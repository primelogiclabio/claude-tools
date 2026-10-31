import type { EngineInterface, Register, UiPressArgument } from 'claude-code'

import type { ProgressView, SectionKey } from '../types'
import { SECTION_TITLE, empty, openNext, parse, summary } from './progress'

const PANE = 'progress'
const FILE = 'PROGRESS.md'
// The skill in this same plugin, by the name a plugin install gives it.
const SKILL = '/project-progress:project-progress'

const FOLDS: readonly Exclude<SectionKey, 'focus' | 'next'>[] = ['parked', 'done', 'decisions', 'gotchas']

const HELP = [
  '/progress          show or hide the Progress pane',
  '/progress show     show it',
  '/progress hide     hide it',
  '/progress text     print the summary here',
  `The pane only reads ${FILE}. Changes go through the skill: ${SKILL} next | add | park | done.`,
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

// Module state: a reload runs register and session.start again, which set
// these anew. The pane draws from here and is redrawn by $.ui.invalidate,
// as project-tracker's is.
let view: ProgressView | null = null
let unfolded = new Set<SectionKey>()
let isStatusShown = false
let isShowPane = true
let isShown = false
let root = ''
let file = ''
let mtime = -1

// PROGRESS.md sits at the repo root: the nearest folder up from the
// session's that holds one, else the nearest git root, else the session's own.
async function findRoot($: EngineInterface, cwd: string): Promise<string> {
  for (let dir: string | null = cwd; dir !== null; dir = parent(dir)) {
    if (await $.fs.exists(join(dir, FILE))) return dir
    if (await $.fs.exists(join(dir, '.git'))) return dir
  }

  return cwd
}

function showStatus($: EngineInterface, v: ProgressView): void {
  if (!isStatusShown) return
  if (!v.exists) {
    $.ui.status(undefined)

    return
  }
  const next = openNext(v.doc).length
  const focus = v.doc.focus[0]
  $.ui.status(focus === undefined ? `○ nothing in progress · ${next} next` : `▶ ${clip(focus, 40)} · ${next} next`)
}

async function load($: EngineInterface): Promise<ProgressView> {
  const exists = await $.fs.exists(file)
  let doc = empty()
  let error: string | undefined
  if (exists) {
    try {
      mtime = (await $.fs.stat(file)).mtimeMs
      doc = parse(await $.fs.read(file))
    } catch (err) {
      error = `Could not read ${FILE}: ${err instanceof Error ? err.message : String(err)}`
    }
  } else {
    mtime = 0
  }
  const next: ProgressView = { root, project: basename(root), file, exists, doc }
  if (error !== undefined) next.error = error
  view = next
  $.ui.invalidate('ui.render')
  showStatus($, next)

  return next
}

async function openPane($: EngineInterface) {
  const opened = await $.ui.open({ id: PANE, title: root === '' ? 'Progress' : `Progress · ${basename(root)}` })
  isShown = opened.isPlaced

  return opened
}

async function refreshIfChanged($: EngineInterface): Promise<void> {
  if (file === '') return
  const exists = await $.fs.exists(file)
  const now = exists ? (await $.fs.stat(file)).mtimeMs : 0
  if (now === mtime) return
  const wasThere = view?.exists === true
  await load($)
  // A file set up mid-session (init) shows the pane as one found at start would.
  if (!wasThere && exists && isShowPane && !isShown) void openPane($)
}

function toggleFold($: EngineInterface, key: SectionKey): void {
  const next = new Set(unfolded)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  unfolded = next
  $.ui.invalidate('ui.render')
}

// Puts a request in the prompt for the person to send, so the skill makes
// every change. Where no prompt box takes it, it goes on the clipboard.
async function suggest($: EngineInterface, press: UiPressArgument, text: string): Promise<void> {
  const filled = await $.prompt.fill({ text })
  if (filled.isFilled) return
  const copied = await $.ui.copy({ text: text.trim(), surface: press.surface })
  $.ui.toast(copied.isCopied ? `Copied "${text.trim()}": paste it in the prompt.` : `Type "${text.trim()}" in the prompt.`)
}

export const register: Register = (on, options) => {
  isStatusShown = options.statusLine === true
  isShowPane = options.showPane !== false

  on('session.start', async ($, e, next) => {
    root = await findRoot($, e.cwd)
    file = join(root, FILE)
    const v = await load($)

    await $.command.register({
      name: 'progress',
      description: `Show or hide this project's Progress pane (${FILE})`,
      argumentHint: '[show|hide|text|help]',
    })

    // Not gated on isInteractive: the desktop app hosts sessions through the
    // SDK, where it is false. With no surface yet the pane waits undrawn.
    if (isShowPane && v.exists) void openPane($)
    $.clock.every(2000, () => {
      void refreshIfChanged($).catch(() => undefined)
    })

    return next(e)
  })

  on('ui.close', async ($, e, next) => {
    if (e.id === PANE) isShown = false

    return next(e)
  })

  on('command.run', { command: 'progress' }, async ($, e) => {
    const verb = e.args.trim().toLowerCase()
    await refreshIfChanged($)
    const v = view

    if (verb === 'help' || verb === '?') return { text: HELP }
    if (verb === 'text' || verb === 'status') return { text: summary(v?.doc ?? empty(), v?.exists === true) }
    if (verb === 'hide' || verb === 'close' || (verb === '' && isShown)) {
      await $.ui.close({ id: PANE })
      isShown = false

      return { text: 'Progress pane hidden. /progress shows it again.' }
    }
    if (verb !== '' && verb !== 'show' && verb !== 'open') return { text: `Unknown option "${verb}".\n${HELP}` }

    const opened = await openPane($)
    if (!opened.isPlaced) return { text: summary(v?.doc ?? empty(), v?.exists === true) }

    return {
      text: v?.exists
        ? `Progress pane shown for ${v.project}.`
        : `Progress pane shown. No ${FILE} here yet: /project-progress init sets one up.`,
    }
  }).catch(($, e, next) => ({
    text: `project-progress: /progress failed${next.error ? `: ${next.error.message}` : ''}.`,
  }))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const v = view
    const width = Math.max(20, e.props.bodyColumns)

    if (v === null) return <Text dimColor>Loading {FILE}…</Text>

    const ask = (text: string) => (press: UiPressArgument) => {
      void suggest($, press, text)
    }

    if (!v.exists) {
      return (
        <Box flexDirection="column" width={width}>
          <Text bold>{v.project}</Text>
          <Text dimColor>No {FILE} in this project yet.</Text>
          <Box marginTop={1}>
            <Button key="init" variant="primary" label="Set up progress tracking" hotkey="i" onPress={ask(`${SKILL} init`)} />
          </Box>
        </Box>
      )
    }

    const { doc } = v
    const isFocused = doc.focus.length > 0

    return (
      <Box flexDirection="column" width={width}>
        <Box flexDirection="row" flexWrap="wrap">
          <Text bold>{v.project}</Text>
          <Text dimColor> · {FILE}</Text>
        </Box>
        {doc.goal !== '' && <Text dimColor>{doc.goal}</Text>}
        {v.error !== undefined && <Text color="error">{v.error}</Text>}

        <Box flexDirection="column" marginTop={1}>
          <Text bold color="warning">
            {SECTION_TITLE.focus.toUpperCase()}
          </Text>
          {isFocused ? (
            doc.focus.map(text => <Text>▶ {text}</Text>)
          ) : (
            <Text dimColor>  Nothing in progress.</Text>
          )}
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Text bold color="claude">
            {SECTION_TITLE.next.toUpperCase()} {openNext(doc).length}
          </Text>
          {doc.next.length === 0 ? (
            <Text dimColor>  Nothing queued.</Text>
          ) : (
            doc.next.map((item, i) => (
              <Box key={`next-${i}`} flexDirection="row">
                <Text dimColor>{String(i + 1).padStart(2)} </Text>
                <Text dimColor={item.isDone}>{item.isDone ? `✓ ${item.text}` : item.text}</Text>
              </Box>
            ))
          )}
        </Box>

        <Box flexDirection="row" flexWrap="wrap" columnGap={1} marginTop={1}>
          {isFocused ? (
            <Button key="done" variant="primary" label="Checkpoint" hotkey="d" onPress={ask(`${SKILL} done`)} />
          ) : (
            <Button key="next" variant="primary" label="Start next" hotkey="n" onPress={ask(`${SKILL} next`)} />
          )}
          <Button key="park" label="Park…" hotkey="p" onPress={ask(`${SKILL} park `)} />
          <Button key="add" label="Add…" hotkey="a" onPress={ask(`${SKILL} add `)} />
          <Button key="status" label="Status" hotkey="s" onPress={ask(`${SKILL} status`)} />
        </Box>

        {FOLDS.map(key => {
          const items = doc[key]
          const isOpen = unfolded.has(key)

          return (
            <Box key={`section-${key}`} flexDirection="column" marginTop={1}>
              <Button
                key={`fold-${key}`}
                plain
                dimColor={items.length === 0}
                label={`${isOpen ? '▾' : '▸'} ${SECTION_TITLE[key]} ${items.length}`}
                onPress={() => toggleFold($, key)}
              />
              {isOpen && items.map(text => <Text dimColor>  • {text}</Text>)}
            </Box>
          )
        })}

        <Box marginTop={1}>
          <Text dimColor>Read only · the buttons put a request in the prompt</Text>
        </Box>
      </Box>
    )
  })
}
