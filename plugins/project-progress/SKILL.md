---
name: project-progress
description: Track long project work in PROGRESS.md so the context window only holds the current task. Sets the file up, adds items to its Next list, starts the next item with a plan, parks side ideas instead of chasing them, and checkpoints a finished item before a /clear. Use whenever the user runs /project-progress, wants to set up progress tracking for a project, asks to add an item to PROGRESS.md, asks what's next or where they are, says "park this" about a side idea, or says an item is done or asks to checkpoint.
---

# Project progress

Keeps long-running project work organized in `PROGRESS.md` at the repo root, so the context window only has to hold the current task. The core rules: one item at a time, and side ideas get parked, not chased.

The commands below are written as `/project-progress <mode>`. When the skill is installed as a plugin its full name is `/project-progress:project-progress`. When you tell the user what to type, use the form they typed, or whichever name the session lists if they haven't typed one.

## Modes

Pick the mode from the argument. Also apply the matching mode when the user says it in plain words ("add X to next", "park this", "checkpoint", "what's next", "where are we").

| Argument | Mode |
|---|---|
| `init` | Set up |
| `add <item>` | Add an item to Next |
| `next [item]` | Start the next item |
| `park <idea>` | Park a side idea |
| `done` or `checkpoint` | Checkpoint a finished item |
| none or `status` | Show status |

If PROGRESS.md doesn't exist and the mode isn't `init`, say so and offer `init`.

Direct edits the user asks for in plain words, such as reordering Next, dropping a Next item or a parked idea, or rewording an entry, don't need a mode: make exactly that change and confirm in one line.

## PROGRESS.md format

Use exactly these sections:

```markdown
# Progress

Goal: ...

## Current focus
- (none)

## Next
- [ ] ...

## Done (last 10)
- ...

## Decisions
- X because Y

## Parking lot
- ...

## Gotchas
- ...
```

Rules for the file:

- It is current state, not a log. Overwrite sections; never append a running history.
- Keep the whole file under about 60 lines. It loads into every session.
- Done keeps only the last 10 items. Drop older ones; git history has them.
- One line per entry. No code snippets, file dumps or stack traces.
- Decisions are one line each, with the reason.
- An empty section holds `- (none)`.

Trimming: Done is trimmed automatically, but the other sections only grow. When the file is still over about 60 lines, propose specific cuts in one message: merge related Decisions into one line, drop Gotchas that no longer apply, and point out Parking lot entries that look stale or already handled. Apply only the cuts the user approves. Next isn't trimmed: if it's what makes the file long, say so and leave it to the user. `done` and `status` both check for this.

## init

1. If PROGRESS.md already exists, show its Current focus and Next, and stop. Never overwrite it.
2. Ask the user two things in one message: the current goal plus the first few Next items, and whether PROGRESS.md should be committed or kept personal.
3. Create PROGRESS.md from the template with their answers.
4. Wire it in. If committed, edit the project-root `CLAUDE.md`. If personal, use `CLAUDE.local.md` and add `/PROGRESS.md` and `/CLAUDE.local.md` to the repo's local exclude file (its path comes from `git rev-parse --git-path info/exclude`), skipping either one if the file already lists it. Don't use `.gitignore` for this: it is committed, so the personal choice would end up in everyone's copy. If the folder isn't a git repo, skip the exclude. Create `CLAUDE.md` or `CLAUDE.local.md` if it is missing. Add this block once, skipping it if the `@PROGRESS.md` import is already there:

   ```markdown
   @PROGRESS.md

   ## Workflow
   - Work on one item from Next at a time.
   - Side issues or ideas noticed mid-task go in the Parking lot (project-progress skill, park). Don't act on them unless I say so.
   - After finishing an item, checkpoint it with the project-progress skill (done).
   ```

   The `@PROGRESS.md` import is what makes the file load in every session and come back after `/compact`.
5. Confirm in one line and suggest `/project-progress next`.

## add

1. Add the item to Next as one unchecked line, at the bottom unless the user says where ("at the top", "after X").
2. Confirm in one line. Don't start the item; that is `next`.

`add` is for planned work. An idea that comes up mid-task and isn't planned yet goes to `park` instead.

## next

1. Read PROGRESS.md.
2. If Current focus already has an item, ask whether to keep going with it or switch. On a switch, move the current item back to the top of Next with a short note on where it stopped.
3. Take the named item, or the top unchecked item in Next, and move it to Current focus. If Next has no unchecked items, say so: list any Parking lot entries and ask which to promote, or ask what to work on next if the Parking lot is empty too. Move a promoted entry out of the Parking lot, put the answer in Current focus, and continue from here.
4. Enter plan mode and write a plan scoped to that item only. If you can't enter plan mode yourself, ask the user to switch to it.
5. Don't implement anything until the user approves the plan.

## park

1. Add the idea to Parking lot as one line, noting where it came up if that helps later.
2. Don't investigate, fix or discuss it further.
3. Confirm in a few words and go back to the current item.

Also do this unprompted during any work: when you notice an unrelated bug, refactor or improvement, park it and tell the user in one line, rather than fixing it.

## done / checkpoint

1. If you know of failing tests, a broken build or unfinished steps for the current item, say so and ask whether to checkpoint anyway.
2. Update PROGRESS.md:
   - Move the item from Current focus to the top of Done as one line with its outcome. Set Current focus to (none).
   - Add any decisions made during the item to Decisions.
   - Add anything surprising that would trip up future work to Gotchas.
   - Trim Done to 10 entries.
   - If the file is still over about 60 lines, propose cuts (see Trimming).
3. If Parking lot has entries, list them briefly and ask which, if any, to promote to Next, leaving out any you just proposed cutting. Move only what the user picks.
4. Once any questions from steps 2 and 3 are answered, suggest committing (don't commit unless asked). Then tell the user to run `/clear` and `/project-progress next` to start the next item with a fresh context. You can't run `/clear` yourself.

## status

Read PROGRESS.md and report in a few lines: the current focus, the next three items, and how many items are parked. If the file is over about 60 lines, say so and offer to trim it (see Trimming). If the session has covered a lot of ground, suggest `/context` to check usage, and `/project-progress done` then `/clear` if the current item is finished.

## Guardrails

- Never remove Parking lot or Next items, or change Decisions, without the user's say.
- Never start a second item while one is in Current focus.
- PROGRESS.md always stays at the repo root.
- This skill doesn't replace a task list kept elsewhere, such as the project-tracker mod's `.claude/tasks.md`. If the user asks about "tasks" and both exist, ask which one they mean.
