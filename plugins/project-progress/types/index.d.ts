/** A PROGRESS.md section the pane draws, by the skill's headings. */
export type SectionKey = 'focus' | 'next' | 'done' | 'decisions' | 'parked' | 'gotchas'

export type NextItem = {
  text: string
  /** `- [x]`: ticked but not yet moved to Done. */
  isDone: boolean
}

/** What the pane reads from PROGRESS.md. `- (none)` reads as an empty list. */
export type ProgressDoc = {
  goal: string
  focus: string[]
  next: NextItem[]
  done: string[]
  decisions: string[]
  parked: string[]
  gotchas: string[]
}

/** What the pane draws: where the file lives and what it holds. */
export type ProgressView = {
  root: string
  project: string
  file: string
  exists: boolean
  doc: ProgressDoc
  error?: string
}
