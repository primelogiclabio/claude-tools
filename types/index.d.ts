export type TaskStatus = 'doing' | 'todo' | 'done'

export type Task = {
  id: string
  text: string
  status: TaskStatus
  /** The day it was marked done, `YYYY-MM-DD`. */
  doneOn?: string
  /** Indented lines under the item, kept verbatim. */
  notes: string[]
}

export type TaskDoc = {
  title: string
  /** Free text between the title and the first section, kept verbatim. */
  preamble: string[]
  tasks: Task[]
}

/** What the pane draws: where the list lives and what it holds. */
export type TrackerView = {
  root: string
  project: string
  file: string
  exists: boolean
  tasks: Task[]
  error?: string
}
