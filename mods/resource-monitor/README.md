# resource-monitor

A Claude Code mod that shows how much CPU and memory **Claude Code itself and
the processes it started** are using. Those include test runs, dev servers,
builds and Bash commands. You get:

- a **Resources** pane with live figures, sparklines and the process tree;
- a compact readout in the status line;
- warning colours past a threshold;
- a `resources` tool, so Claude can answer "is the build still running?" or
  "why is the fan on?".

It deliberately covers only Claude Code's own process tree, not the whole
machine. Use a system monitor for that, or the separate process-monitor
project for servers.

```
Claude Code + 3 child processes · every 5s

CPU   12%  ▁▁▂▃▅▇▅▃▂▁▁▂
     1.92 of 16 cores · warn at 85%
RAM  2.1 GB ▂▂▂▃▃▃▃▄▄▄▄▄
     3.4% of 61.9 GB · warn at 85%

  CPU      MEM  PROCESS
 3.1%   412 MB  claude.exe 31704
 8.4%   960 MB    node.exe 4120
 0.6%   180 MB      esbuild.exe 4188
```

## How it measures, and its limits

A mod has no Node.js and no built-in process API, so the figures come from the
operating system's own tools. At session start the mod starts **one
long-lived sampler process** as a child of Claude Code:

| OS | Sampler | Reads |
| --- | --- | --- |
| Windows | `powershell.exe` (script passed with `-EncodedCommand`) | `Win32_Process`: parent pid, working set, kernel + user CPU time |
| Linux | `sh` with `cat` and `awk` | `/proc/<pid>/stat`: parent pid, resident memory, CPU ticks |
| macOS | `sh` with `ps` | `ps -A -o pid,ppid,rss,time,comm` |

Every interval (5 s by default) the sampler lists processes. The mod then:

- takes the sampler's **parent**, which is Claude Code's process, as the root
  of the tree;
- walks every descendant, leaving out the sampler and its own children;
- works out CPU as the growth in each process's CPU time over the interval,
  as a share of **all** logical CPUs. `100%` means every core is busy. The
  pane also shows the figure in cores.

What to know:

- **The first sample has no CPU figure.** It takes two samples, so 5 s by
  default.
- **Memory is resident or working-set memory.** Shared pages are counted in
  each process, so the total can read a little high.
- **Sampling has its own cost:** about 0.2 s of CPU per sample for
  PowerShell's process query on Windows, and less elsewhere. That's why the
  interval can't go below 2 s.
- **Testing so far:**
  - The Windows and Linux sampler scripts were run directly: Windows 11, and
    Linux under WSL.
  - The mod's logic is covered by its test suite.
  - The mod has not yet been run in a live session. Still to check: in a real
    session, the sampler's parent should be the Claude Code process. If the
    pane shows the wrong root, open an issue.
  - **macOS** hasn't been run at all yet. It uses only `ps` and `sysctl`.
- If the sampler can't start, the pane and the tool say why instead of
  showing numbers. For example, `powershell.exe` might be blocked by policy.

## Using it

| Where | How |
| --- | --- |
| Pane | `/resources` opens it. `/resources close` closes it. Set `autoOpen` to open it at every session start. |
| Status line | `⚙ CPU 12% · 2.1 GB`, which becomes `⚠ …` past a threshold |
| Command | `/resources text` prints the figures in the transcript |
| Claude | The `resources` tool (`mcp__resource-monitor__resources`) returns the same report. With `injectContext` on, Claude also gets a one-line note of what's running beside your prompt. The note is sent again only when the set of processes or a warning changes, not on every prompt. |

**Colours.** CPU turns yellow from 80% of `cpuWarn` and red at `cpuWarn` (85%
of the machine). Memory works the same way with `memWarn` (85% of RAM). There
are no pop-ups.

## Where it works

| Where | What works |
| --- | --- |
| Claude Code CLI | Everything |
| Desktop app, Code tab | Everything. Not in WSL sessions, where plugins aren't available. |
| VS Code extension chat panel | `/resources text` and the tool. The pane isn't drawn, and the status line may not be either. |
| claude.ai web, desktop Chat, Cowork, mobile, cloud sessions | Nothing. Mods run only inside Claude Code ([where mods run](https://code.claude.com/docs/en/plugins/mods/overview#where-mods-run)). |

## Options

Set these in `/config`, or with
`claude plugin configure resource-monitor@claude-tools`:

| Option | Default | |
| --- | --- | --- |
| `cpuWarn` | `85` | Red at this % of the whole machine's CPU |
| `memWarn` | `85` | Red at this % of RAM |
| `intervalSeconds` | `5` | Seconds between samples (2–120) |
| `statusLine` | `true` | Status-line readout |
| `autoOpen` | `false` | Open the pane at session start |
| `injectContext` | `true` | Tell Claude what's running when that changes |

## Install

See the [repo README](../../README.md#installing). In short:

```powershell
claude plugin install resource-monitor --marketplace primelogiclabio/claude-tools
```

## Developing

```sh
claude plugin validate .
claude plugin test .
```

- `hooks/sampler.ts` holds the per-OS sampler scripts.
- `hooks/sample.ts` holds the parsing, the tree walk, the CPU arithmetic and
  formatting, with no engine calls.
- `hooks/register.tsx` holds the pane, the status line, the command, the tool
  and the context note.
