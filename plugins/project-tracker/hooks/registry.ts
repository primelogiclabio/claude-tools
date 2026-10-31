// The project index: which repos use the tracker, by name, so a chat that
// only knows "the oauth project" can find its tasks.md. A cache only: each
// repo's tasks.md stays the source of truth, and losing this file loses
// nothing but the names.
//
//   <CLAUDE_CONFIG_DIR or ~/.claude>/project-tracker/projects.json
//   {
//     "version": 1,
//     "projects": [
//       { "name": "oauth-connector-project", "root": "F:\\development\\oauth-connector-project",
//         "taskFile": ".claude/tasks.md", "firstSeen": "2026-10-10", "lastSeen": "2026-10-11" }
//     ]
//   }

import type { ProjectEntry, ProjectIndex } from '../types'

export const INDEX_VERSION = 1
export const INDEX_DIR = 'project-tracker'
export const INDEX_NAME = 'projects.json'

/** Reads the index; anything unreadable is an empty index, never a throw. */
export function parseIndex(text: string): ProjectIndex {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { version: INDEX_VERSION, projects: [] }
  }
  const list = (raw as { projects?: unknown } | null)?.projects
  const projects: ProjectEntry[] = []
  if (Array.isArray(list)) {
    for (const item of list) {
      const entry = item as Partial<ProjectEntry> | null
      if (typeof entry?.root !== 'string' || entry.root === '') continue
      projects.push({
        ...entry,
        name: typeof entry.name === 'string' && entry.name !== '' ? entry.name : baseName(entry.root),
        root: entry.root,
        taskFile: typeof entry.taskFile === 'string' && entry.taskFile !== '' ? entry.taskFile : '.claude/tasks.md',
        firstSeen: typeof entry.firstSeen === 'string' ? entry.firstSeen : '',
        lastSeen: typeof entry.lastSeen === 'string' ? entry.lastSeen : '',
      })
    }
  }

  return { version: INDEX_VERSION, projects }
}

export function serializeIndex(index: ProjectIndex): string {
  return `${JSON.stringify(index, null, 2)}\n`
}

export function baseName(path: string): string {
  const parts = path.split(/[\\/]+/).filter(Boolean)

  return parts[parts.length - 1] ?? path
}

/** One spelling per folder: forward slashes, no trailing slash, and case folded on drive-letter paths. */
export function rootKey(root: string): string {
  const key = root.replace(/\\/g, '/').replace(/\/+$/, '')

  return /^[A-Za-z]:/.test(key) ? key.toLowerCase() : key
}

/**
 * Records that a project uses the tracker. Answers whether anything changed,
 * so a caller writes the file only then; the list is kept sorted by name.
 */
export function upsert(
  index: ProjectIndex,
  seen: { root: string; taskFile: string },
  today: string,
): { index: ProjectIndex; isChanged: boolean } {
  const key = rootKey(seen.root)
  const name = baseName(seen.root)
  const at = index.projects.findIndex(p => rootKey(p.root) === key)
  const projects = [...index.projects]
  const old = projects[at]
  if (old === undefined) {
    projects.push({ name, root: seen.root, taskFile: seen.taskFile, firstSeen: today, lastSeen: today })
  } else {
    // the same folder spelled another way keeps the spelling first recorded
    if (old.taskFile === seen.taskFile && old.lastSeen === today) return { index, isChanged: false }
    projects[at] = { ...old, taskFile: seen.taskFile, lastSeen: today }
  }
  projects.sort((a, b) => a.name.localeCompare(b.name) || rootKey(a.root).localeCompare(rootKey(b.root)))

  return { index: { version: INDEX_VERSION, projects }, isChanged: true }
}

/**
 * Finds projects by what a person calls them: a root path, an exact name
 * (any case), or failing those every name containing the words.
 */
export function lookup(index: ProjectIndex, query: string): ProjectEntry[] {
  const q = query.trim()
  if (q === '') return []
  const byRoot = index.projects.filter(p => rootKey(p.root) === rootKey(q))
  if (byRoot.length > 0) return byRoot
  const lower = q.toLowerCase()
  const exact = index.projects.filter(p => p.name.toLowerCase() === lower)
  if (exact.length > 0) return exact
  const words = lower.split(/[\s_-]+/).filter(Boolean)

  return index.projects.filter(p => {
    const name = p.name.toLowerCase()

    return words.every(w => name.includes(w))
  })
}
