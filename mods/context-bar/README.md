# context-bar

A Claude Code mod that draws a thin bar above the prompt showing how full the
context window is, plus the session's tokens, cost and plan rate limits. It
changes colour as the window fills, and `/context-bar` prints the full
breakdown.

```
context ████████████░░░░░░░░ 62% 124k/200k · session 1.24M tok · $3.41 · 5h 23.5% · 7d 41%
```

## What it shows, and where each figure comes from

Every figure comes from Claude Code's own mods API. Nothing is estimated
except where noted.

| Figure | Source | Notes |
| --- | --- | --- |
| Context fill: `62% 124k/200k` | `$.session.usage()`, pushed after each turn by the `session.measure` event | The same figures as the status line's `context_window`. It reads `—/200k` until the first response in a new or just-compacted window. |
| Session tokens: `session 1.24M tok` | Summed by this mod from each turn's usage (`turn.complete`) | Input + output + cache read + cache write, main conversation and subagents together. **Counted from when the mod loaded**, so a `/reload-plugins` or a resumed session starts the count over. |
| Cost: `$3.41` | `$.session.usage().cost`, the figure `/cost` totals | On a Claude subscription this is an API-price estimate, not a bill. Shown only when Claude Code keeps a cost ledger; the CLI always does. |
| Rate limits: `5h 23.5%`, `7d 41%` | `$.session.usage().rateLimits` | Your plan's 5-hour and 7-day windows, as the last response reported them. **Subscription only.** With an API key there are none, so the bar leaves them out. |

**Colours.** The fill and the context figure are green below `warnAt` (60%),
yellow from `warnAt`, and red from `dangerAt` (85%). Each rate-limit figure
uses the same two thresholds.

On a narrow window the bar shortens first. Then it drops the rate limits,
then the cost and session tokens. The context figure always stays.

## `/context-bar`

| Command | Does |
| --- | --- |
| `/context-bar` | Prints the full breakdown: context by category (a free local estimate, like `/context`), tokens split into main and subagents, cost, and each rate limit with its reset time |
| `/context-bar hide` / `show` | Hides or shows the bar for this session |
| `/context-bar help` | Lists these |

It isn't called `/usage` because Claude Code already has a built-in `/usage`.

## Where it works

| Where | What works |
| --- | --- |
| Claude Code CLI | Everything |
| Desktop app, Code tab | Everything. Not in WSL sessions, where plugins aren't available. |
| VS Code extension chat panel | `/context-bar` prints the breakdown. The bar isn't drawn, because mods draw nothing there. |
| claude.ai web, desktop Chat, Cowork, mobile, cloud sessions | Nothing. Mods run only inside Claude Code ([where mods run](https://code.claude.com/docs/en/plugins/mods/overview#where-mods-run)). |

It needs Claude Code 2.1.287 or newer in the terminal, or 2.1.286 or newer in
the desktop app.

## Options

Set these in `/config`, or with
`claude plugin configure context-bar@claude-tools`:

| Option | Default | |
| --- | --- | --- |
| `showBand` | `true` | Draw the bar above the prompt |
| `warnAt` | `60` | Yellow from this % of the context window |
| `dangerAt` | `85` | Red from this % |
| `showCost` | `true` | Include the session cost |

## Install

See the [repo README](../../README.md#installing). In short:

```powershell
claude plugin install context-bar --marketplace primelogiclabio/claude-tools
```

## Developing

```sh
claude plugin validate .
claude plugin test .
```

`hooks/usage.ts` holds the figures and formatting, with no engine calls.
`hooks/register.tsx` holds the bar, the command and the event hooks.
