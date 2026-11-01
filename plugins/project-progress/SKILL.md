---
name: project-progress
description: Track long project work in PROGRESS.md so the context window only holds the current task. Sets the file up, adds items to its Next list, starts the next item with a plan, parks side ideas instead of chasing them, and checkpoints a finished item before a /clear. Use whenever the user runs /project-progress, wants to set up progress tracking for a project, asks to add an item to PROGRESS.md, asks what's next or what the next item or task is, says to move on or start the next item, asks where they are, says "park this" about a side idea, or says an item is done or asks to checkpoint. In a repo with PROGRESS.md, "task" and "item" mean its entries.
---

# Project progress

Keeps long-running project work organized in `PROGRESS.md` at the project's root (see Where PROGRESS.md lives), so the context window only has to hold the current task. The core rules: one item at a time, and side ideas get parked, not chased.

The commands below are written as `/project-progress <mode>`. When the skill is installed as a plugin its full name is `/project-progress:project-progress`. Whenever you tell the user what to type, including the closing suggestions in `init`, `done` and `status`, write the command in the form they typed, or by whichever name the session lists if they haven't typed one: after `/project-progress:project-progress init`, suggest `/project-progress:project-progress next`, not `/project-progress next`.

## Modes

Pick the mode from the argument.

| Argument | Mode |
|---|---|
| `init` | Set up |
| `add <item>` | Add an item to Next |
| `next [item]` | Start the next item |
| `park <idea>` | Park a side idea |
| `done` or `checkpoint` | Checkpoint a finished item |
| none or `status` | Show status |

The user usually won't name a mode. Map plain words like this:

| The user says | Do |
|---|---|
| "what's next?", "what's the next item?", "what's the next task?" | Show Current focus and the top Next item, and offer to start it. Don't start it. |
| "move on", "start the next item", "let's do the next one" | `next` |
| "done", "that's finished", "checkpoint" | `done` |
| "park this", "add X to next", "where are we" | `park`, `add`, `status` |

If PROGRESS.md doesn't exist and the mode isn't `init`, say so and offer `init`.

Direct edits the user asks for in plain words, such as reordering Next, dropping a Next item or a parked idea, adding or dropping a Related entry, or rewording an entry, don't need a mode: make exactly that change and confirm in one line.

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

## Related
- `path`: what to update there, and when
```

Rules for the file:

- It is current state, not a log. Overwrite sections; never append a running history.
- Keep the whole file under about 60 lines. It loads into every session.
- Done keeps only the last 10 items. Drop older ones; git history has them.
- One line per entry. No code snippets, file dumps or stack traces.
- Decisions are one line each, with the reason.
- An empty section holds `- (none)`.
- Related lists folders or repos outside PROGRESS.md's own that items also change, such as a docs site or a shared library. Give each one's path, relative to PROGRESS.md's folder when it sits nearby so it works on another machine with the same layout, and what to update there and when: `` `../site`: the plugins page; update it when a plugin is added or renamed``. A file without the section has none; add the section with its first entry.

Trimming: Done is trimmed automatically, but the other sections only grow. When the file is still over about 60 lines, propose specific cuts in one message: merge related Decisions into one line, drop Gotchas that no longer apply, and point out Parking lot entries that look stale or already handled and Related entries no longer used. Apply only the cuts the user approves. Next isn't trimmed: if it's what makes the file long, say so and leave it to the user. `done` and `status` both check for this.

## Where PROGRESS.md lives

- The project's PROGRESS.md is the nearest one from the session's folder upward, stopping at the git root. Every mode reads and writes that one, and the Progress pane shows it.
- When there's none, `init` creates it. In a git repo it goes at the git root, unless the session started in a subfolder (such as a package in a monorepo) and the user picks that folder. Outside git it goes in the session's folder.
- Never nest them. Before creating one, look for another PROGRESS.md in the same repo, skipping dependency and build folders such as `node_modules`. If one sits above or below the new spot, say where and ask before going ahead: a session started below both would load both.
- The `CLAUDE.md` or `CLAUDE.local.md` that imports it sits in the same folder as PROGRESS.md.

## init

1. If a PROGRESS.md already applies (see Where PROGRESS.md lives), never overwrite it. Show its Current focus and Next, do only the workflow-block check at the end of step 4, and stop.
2. Ask the user in one message for the current goal plus the first few Next items, and whether PROGRESS.md should be committed or kept personal. If the session started in a subfolder of a git repo, also ask whether to track the whole repo or just this folder. Outside git, don't ask about committing: there's nothing to commit to. Also ask whether work here changes other folders or repos too, such as a docs site or a shared library, and what to update there; most projects have none.
3. Create PROGRESS.md from the template with their answers, in the folder Where PROGRESS.md lives gives. List any other places under Related, or write `- (none)`.
4. Wire it in, in the same folder. If committed, edit `CLAUDE.md`. If personal, use `CLAUDE.local.md` and add its folder's `PROGRESS.md` and `CLAUDE.local.md` to the repo's local exclude file (its path comes from `git rev-parse --git-path info/exclude`), skipping either one if the file already lists it. Write the entries as paths from the git root: `/PROGRESS.md` at the root, `/packages/api/PROGRESS.md` in a subfolder (`git rev-parse --show-prefix` gives the prefix). Don't use `.gitignore` for this: it is committed, so the personal choice would end up in everyone's copy. Outside git, use `CLAUDE.md` and skip the exclude. Create `CLAUDE.md` or `CLAUDE.local.md` if it is missing. Add this block once:

   ```markdown
   @PROGRESS.md

   ## Workflow
   - In this repo, "task", "item" and "next" mean entries in PROGRESS.md unless I name another list.
   - Work on one item from Next at a time.
   - Side issues or ideas noticed mid-task go in the Parking lot (project-progress skill, park). Don't act on them unless I say so.
   - When the current item looks finished, offer to checkpoint it (project-progress skill, done). When I say it's done, checkpoint it.
   - When I say to move on or start the next item, start it with the project-progress skill (next). When I only ask what's next, show it and offer to start it.
   ```

   The `@PROGRESS.md` import is what makes the file load in every session and come back after `/compact`, and the Workflow rules are what let the user speak plainly instead of naming modes.

   Workflow-block check: if `CLAUDE.md` or `CLAUDE.local.md` already has the `@PROGRESS.md` import, don't add the block again. Compare its `## Workflow` section with the one above. If they differ, show the difference and offer to replace it. On a yes, replace only that section, keep everything else in the file, and say the new rules apply from the next session or after `/clear`. Repos set up with an older version of this skill get the current rules this way.
5. Confirm in one line and suggest the `next` command, in the form the user typed (see the top).

## add

1. Add the item to Next as one unchecked line, at the bottom unless the user says where ("at the top", "after X").
2. Confirm in one line. Don't start the item; that is `next`.

`add` is for planned work. An idea that comes up mid-task and isn't planned yet goes to `park` instead.

## next

1. Read PROGRESS.md.
2. If Current focus already has an item, ask whether to keep going with it or switch. On a switch, move the current item back to the top of Next with a short note on where it stopped.
3. Take the named item, or the top unchecked item in Next, and move it to Current focus, without its checkbox. If Next has no unchecked items, say so: list any Parking lot entries and ask which to promote, or ask what to work on next if the Parking lot is empty too. Move a promoted entry out of the Parking lot, put the answer in Current focus, and continue from here.
4. Enter plan mode and write a plan scoped to that item only. If the item affects a place listed under Related, include the changes there as steps that name the place. If the session can't reach that folder, ask the user to add it (`/add-dir <path>` in the CLI). If you can't enter plan mode yourself, ask the user to switch to it.
5. Don't implement anything until the user approves the plan.

## park

1. Add the idea to Parking lot as one line, noting where it came up if that helps later.
2. Don't investigate, fix or discuss it further.
3. Confirm in a few words and go back to the current item.

Also do this unprompted during any work: when you notice an unrelated bug, refactor or improvement, park it and tell the user in one line, rather than fixing it.

## done / checkpoint

1. Offer to run the tests. Find the project's test command: what `CLAUDE.md` or the README says first, else the usual places (`package.json` scripts, `Makefile`, `pyproject.toml`, `Cargo.toml`, `go.mod`, the runner for a `tests/` folder). In a monorepo, offer the test command of the package or packages the item changed, not the whole repo's, unless the repo's docs say to run one command for everything. If the item changed a Related repo that has its own tests, offer those in the same question.
   - If the tests already ran and passed in this session after the last change, skip the offer and say so in a few words.
   - If you found a command, ask in one line, naming it: "Run `npm test` before checkpointing?" On a yes, run it, in the background if it's likely to take more than about 2 minutes. Don't run it without a yes.
   - If you found none, or the item changed nothing testable (only docs or PROGRESS.md), skip the offer without mentioning it.
2. If the tests fail, or you know of a broken build or unfinished steps for the current item, including a Related place it should have changed but didn't or that you can't reach to check, say so and ask whether to checkpoint anyway. Don't fix failures inside `done`: if the user wants them fixed first, leave the item in Current focus.
3. Update PROGRESS.md:
   - Move the item from Current focus to the top of Done as one line with its outcome, noting "tests pass" only if they ran in step 1. Set Current focus to (none).
   - Add any decisions made during the item to Decisions.
   - Add anything surprising that would trip up future work to Gotchas.
   - Trim Done to 10 entries.
   - If the file is still over about 60 lines, propose cuts (see Trimming).
4. If Parking lot has entries, list them briefly and ask which, if any, to promote to Next, leaving out any you just proposed cutting. Move only what the user picks.
5. Once any questions from steps 3 and 4 are answered, suggest committing in a git repo, and in each Related repo the item changed (don't commit unless asked). Then tell the user to run `/clear` and then the `next` command, in the form they typed (see the top), to start the next item with a fresh context. You can't run `/clear` yourself.

Also offer this unprompted: when the current item's work looks finished, such as its plan's steps being done and its checks passing, say so in one line and offer to checkpoint it. Don't checkpoint without a yes.

## status

Read PROGRESS.md and report in a few lines: the current focus, the next three items, and how many items are parked. If the file is over about 60 lines, say so and offer to trim it (see Trimming). If the session has covered a lot of ground, suggest `/context` to check usage, and the `done` command (in the form the user typed, see the top) then `/clear` if the current item is finished.

## Guardrails

- Never remove Parking lot, Next or Related entries, or change Decisions, without the user's say.
- Never start a second item while one is in Current focus.
- PROGRESS.md stays where `init` created it. Never move it, or create a second one in the same folder tree, without asking.
- In a repo with PROGRESS.md, "task" and "item" mean its entries unless the user names another list, such as the project-tracker mod's `.claude/tasks.md` or a personal tracker.
