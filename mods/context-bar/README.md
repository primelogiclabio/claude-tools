# context-bar

A Claude Code mod that draws a context card above the prompt. It shows the
context window as **one bar split by category**, the same categories
`/context` lists, with a legend of exact figures underneath and a fill badge
that turns green, yellow or red as the window fills.

```
◆ context                                              212k of 1M · compacts at 950k  21%
█▌▌▏▏▏████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
■ system prompt 3.4k 0.3%  ■ tools 12k 1%  ■ mcp tools 2.6k 0.3%  ■ agents 1.1k 0.1%
■ memory files 4.9k 0.5%   ■ skills 2.2k 0.2%  ■ messages 186k 19%  □ free 788k
session 1.24M tok · $3.41 · 5h 23.5% · 7d 41%
```

Each segment and its legend square use the colour `/context` uses for that
category, so they follow your theme. The segments are painted boxes sized by
flex layout, not runs of block characters, so the bar stays on one row in the
desktop app's proportional font as well as in a terminal. Free space is the
theme's faint grey.

## Where each figure comes from

Everything comes from Claude Code's own mods API. Nothing is invented.

| Part | Source | Notes |
| --- | --- | --- |
| Header `212k of 1M` and the badge `21%` | `$.session.usage()`, pushed after each turn by `session.measure` | The live window as the status line reads it: the last response's input against the model's window. It reads `—` until the first response in a new or just-compacted window. |
| `compacts at 950k` | The breakdown's `autoCompactThreshold` | Shown only when auto-compaction is on |
| Segments and legend | `$.session.usage({ breakdown: 'summary' })`: the categories `/context` shows, each with its tokens and colour | A **local estimate** that makes no API request. It's fetched again whenever the context changes. Because it's an estimate measured against the compaction window, the categories can add up to a little more or less than the header figure, as in `/context` itself. Tool schemas loaded on demand ("deferred") take no room in the window, so the bar leaves them out. `/context-bar` lists them. |
| `session 1.24M tok` | Summed by this mod from each turn's usage (`turn.complete`), main conversation and subagents | Kept in the session's `$.state`, so `/reload-plugins` and plugin updates don't reset it. It's **counted from when the mod first loaded in the session**: turns before that, such as those of a resumed session, aren't included. |
| `$3.41` | `$.session.usage().cost`, the figure `/cost` totals | On a subscription this is an API-price estimate, not a bill |
| `5h 23.5%`, `7d 41%` | `$.session.usage().rateLimits` | **Subscription only.** They appear after the first response; with an API key there are none. |

**About "agents".** In `/context`, "Custom agents" means the *definitions* of
your custom subagents that the Agent tool describes to Claude. It does not
mean tokens your subagents used: each subagent runs in its own separate
context window. That subagent usage is counted in `session … tok`, and
`/context-bar` lists it separately.

**Colours.** The badge is green below `warnAt` (60%), yellow from `warnAt`,
and red from `dangerAt` (85%). The rate-limit figures use the same thresholds.

**Fitting the space.**
- Legend items go in as many columns as fit the width.
- When the band has few rows, the usage line goes first, then the legend.
  The header and bar always show.
- If the engine can't give a breakdown, the bar falls back to a single fill
  in the badge's colour.

## `/context-bar`

| Command | Does |
| --- | --- |
| `/context-bar` | Prints the full breakdown as text: every category (deferred ones included), the compaction point, tokens split into main and subagents, cost, and each rate limit with its reset time |
| `/context-bar hide` / `show` | Hides or shows the card for this session |
| `/context-bar compact` / `full` | Header and bar only, or with the legend |
| `/context-bar help` | Lists these |

It isn't called `/usage` because Claude Code already has a built-in `/usage`.

## Where it works

| Where | What works |
| --- | --- |
| Claude Code CLI | Everything |
| Desktop app, Code tab | Everything. Not in WSL sessions, where plugins aren't available. |
| VS Code extension chat panel | `/context-bar` prints the breakdown. The card isn't drawn, because mods draw nothing there. |
| claude.ai web, desktop Chat, Cowork, mobile, cloud sessions | Nothing. Mods run only inside Claude Code ([where mods run](https://code.claude.com/docs/en/plugins/mods/overview#where-mods-run)). |

It needs Claude Code 2.1.287 or newer in the terminal, or 2.1.286 or newer in
the desktop app.

## Options

Set these in `/config`, or with
`claude plugin configure context-bar@claude-tools`:

| Option | Default | |
| --- | --- | --- |
| `showBand` | `true` | Draw the card above the prompt |
| `showLegend` | `true` | Show the legend under the bar |
| `warnAt` | `60` | Badge yellow from this % of the context window |
| `dangerAt` | `85` | Badge red from this % |
| `showCost` | `true` | Include the session cost |

## Install

One line installs it, in either of two places:

- **Inside a Claude Code session** (CLI or desktop Code tab, 2.1.275+), type:
  ```
  /plugin install context-bar --marketplace primelogiclabio/claude-tools
  ```
- **From a terminal** (PowerShell, bash; CLI 2.1.292+), run:
  ```
  claude plugin install context-bar --marketplace primelogiclabio/claude-tools
  ```

Both add the `claude-tools` marketplace first if you haven't added it yet.
The [repo README](../../README.md#installing) has the full steps.

## Developing

```sh
claude plugin validate .
claude plugin test .
```

- `hooks/usage.ts` holds the figures, segment widths (`allocate`) and
  formatting, with no engine calls.
- `hooks/register.tsx` holds the card, the command and the event hooks.
