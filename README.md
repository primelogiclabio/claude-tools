# claude-tools

Home-made extensions for Claude Code, kept in one git repository that is also
a **plugin marketplace**: Claude Code can add the repo as a source and install
anything listed in it.

```
claude-tools/
├── .claude-plugin/
│   └── marketplace.json      the marketplace catalog (lists every installable item)
├── mods/                     mods: plugins that change Claude Code's interface or behaviour
│   ├── README.md             index of the mods and their layout
│   ├── project-tracker/
│   ├── context-bar/
│   └── resource-monitor/
└── skills/                   skills: instructions Claude loads when a request matches
    ├── README.md             index of the skills and their layout
    ├── generate-docs/
    └── workday-tracker/
```

**Mods vs skills.**

- A **mod** is a plugin with code. It can add panes, slash commands, tools,
  hooks or status-line text. Each one has its own `.claude-plugin/plugin.json`
  and `hooks/`.
- A **skill** is a `SKILL.md`: a description that tells Claude when to use it,
  followed by instructions. It has no code. Each skill here also carries a small
  `plugin.json`, so it installs through the marketplace the same way a mod does.

## Contents

| Name | Kind | What it does |
| --- | --- | --- |
| [project-tracker](mods/project-tracker/README.md) | mod | Per-project task list in a docked **Tasks** pane, with `/tasks` and a `tasks` tool, saved in `<project>/.claude/tasks.md` |
| [context-bar](mods/context-bar/README.md) | mod | Context card above the prompt: the window as one bar split by `/context` category, a legend with exact figures, a fill badge coloured by threshold, plus session tokens, cost and plan rate limits; `/context-bar` for the text breakdown |
| [resource-monitor](mods/resource-monitor/README.md) | mod | CPU and memory of Claude Code and the processes it started: **Resources** pane with sparklines, status-line readout, warning colours, and a `resources` tool for Claude |
| [generate-docs](skills/generate-docs/README.md) | skill | Generates project or research documentation as a self-contained HTML file plus matching Markdown (light/dark toggle, jump-to-section menu, works offline) |
| [workday-tracker](skills/workday-tracker/README.md) | skill | House rules for a personal Up Next / Waiting On / Done task-tracker artifact on claude.ai: task types, required completion comments, optional ticket refs and status notes |

---

## What the marketplace is for

A marketplace is a catalog file, [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json),
that lists plugins and where to fetch each one. Here every entry is a folder
in this repo. Once someone adds the repo as a marketplace, they can:

- browse its plugins in `/plugin`, or with **+ › Plugins** in the desktop app;
- install one with a single command;
- get updates with `claude plugin update <name>@claude-tools`, or with
  **Update marketplace** in `/plugin`. Auto-update is off by default for
  marketplaces other than Anthropic's, and can be turned on in `/plugin` ›
  **Marketplaces**.

The marketplace's name is **`claude-tools`**, so install ids look like
`project-tracker@claude-tools`.

Docs: [Create a marketplace](https://code.claude.com/docs/en/plugins/create-marketplace),
[Marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference),
[Install and manage plugins](https://code.claude.com/docs/en/plugins/install).

## Where each item works

"Claude Desktop" can mean three different things, because the desktop app has
three modes, and each behaves differently:

- **Desktop Chat**: ordinary conversations. Behaves like claude.ai on the web.
- **Desktop Cowork**: Cowork tasks.
- **Desktop Code tab**: Claude Code with a graphical interface. Behaves like the
  CLI.

| Where you use Claude | Skills: generate-docs, workday-tracker | Mods: project-tracker, context-bar, resource-monitor |
| --- | --- | --- |
| **Claude Code CLI** (terminal, including IDE terminals and JetBrains) | ✔ (workday-tracker: needs the Artifact tool, see below) | ✔ everything: panes, the bar above the prompt, commands, tools, status line |
| **Desktop app, Code tab** (local or SSH session) | ✔ (workday-tracker: needs the Artifact tool) | ✔ panes show as panels. Not in a **WSL** session, where plugins aren't available. |
| **VS Code extension** chat panel | ✔ (workday-tracker: needs the Artifact tool) | ⚠ partly. Hooks run, so the commands (`/tasks`, `/context-bar`, `/resources text`) and the tools work, but **panes and the bar aren't drawn**. |
| **Desktop app, Cowork** | ✔ from your claude.ai account (path 2 below) | ✘ mods are Claude Code only |
| **Desktop app, Chat** | ✔ from your claude.ai account (path 2) | ✘ |
| **claude.ai on the web** | ✔ from your claude.ai account (path 2) | ✘ claude.ai doesn't run mods |
| **Claude mobile apps** | ✔ from your claude.ai account (path 2) | ✘ |
| **Claude Code cloud sessions** (claude.ai/code, routines) | ✔ only if it's on your claude.ai account. Locally installed plugins don't reach the cloud. | ✘ nothing a mod draws appears in a cloud session |

Skills on claude.ai, the desktop app's Chat and Cowork, and mobile need a
**Pro, Max, Team or Enterprise** plan, with **Settings › Capabilities › Code
execution and file creation** turned on
([Skills overview](https://claude.com/docs/skills/overview)).

**Why the mods are Claude Code only.** A mod is code that runs *inside*
Claude Code and draws into its interface. Anthropic's own docs say mods work
in the Claude Code CLI and the desktop app's Code tab. Chat, Cowork and the
web load a plugin's skills, commands and connectors, and skip the rest
([Mods overview: where mods run](https://code.claude.com/docs/en/plugins/mods/overview#where-mods-run),
[Plugin feature support across platforms](https://claude.com/docs/plugins/platform-support)).
Adding a mod to your claude.ai account therefore does nothing in
Chat, Cowork, the web or mobile. That's a platform limit, not something to
fix here.

**What generate-docs can't do outside Claude Code.** In Chat or on the web,
Claude still writes both files and offers them as downloads. It can't open
them in a browser pane to check them, and it can't save them into a
project's `docs/` folder, so those steps of the skill are skipped.

**What workday-tracker needs.** It works on a task-tracker artifact on
claude.ai, and it edits the artifact's own code, so it runs only where Claude
can create and update artifacts. That's the usual case on claude.ai, desktop
Chat, Cowork and mobile, where it fits best. In Claude Code (CLI, desktop Code
tab, VS Code, cloud sessions) it needs a session that has the Artifact tool;
without it, Claude can't change the tracker, so use the skill from claude.ai
instead. It holds no artifact link or data, so everyone who installs it works
on their own tracker.

## Installing

There are **two separate install paths**, and they reach different places:

| | Path 1: Claude Code on this machine | Path 2: your claude.ai account |
| --- | --- | --- |
| Where you install | `claude plugin …` in a terminal, `/plugin` in a session, or **+ › Plugins** in the desktop Code tab | **Customize › Plugins** (or **Customize › Skills**) on claude.ai or in the desktop app |
| Install is tied to | this computer | your account |
| Reaches | the CLI, the desktop Code tab and VS Code on this computer | Chat (web, desktop, mobile) and Cowork. It also syncs into Claude Code terminal sessions where you're signed in with that account (CLI 2.1.273+). |
| Use it for | the mods, and the skills inside Claude Code | the skills (generate-docs, workday-tracker) everywhere |

Installs don't travel the other way. A plugin you install from the Claude Code
command line stays on that computer and is never added to your account
([Install and manage plugins](https://code.claude.com/docs/en/plugins/install#plugins-from-your-claude-ai-account)).

Path 2 is covered first because it's short. Path 1 has the full Claude Code
details.

### Path 2: on your claude.ai account (web, desktop Chat and Cowork, mobile)

This is the only way to get the skills, **generate-docs** and
**workday-tracker**, outside Claude Code. workday-tracker belongs here most of
all, since the task-tracker artifact it works on lives on claude.ai. Choose
one of:

- **Add the whole marketplace (recommended).**
  1. Open [Customize › Plugins](https://claude.ai/customize/plugins).
  2. Choose **Add › Add marketplace** and enter `primelogiclabio/claude-tools`.
  3. Find **generate-docs** or **workday-tracker** in the list and choose
     **Add**. Add each one you want.

  Updates come from GitHub. Use **Check for updates**, or turn on **Sync
  automatically** for the marketplace
  ([Plugins on claude.ai](https://claude.com/docs/plugins/overview)).- **Upload just the skill.**
  1. Zip the skill's folder, `skills/generate-docs` or
     `skills/workday-tracker`. Each already contains
     `.claude-plugin/plugin.json`.
  2. Use **Customize › Plugins › Add › Upload plugin**.

  Updates are manual: re-upload after each change.
- **Account skill, without a plugin.** If you already saved the skill under
  **Customize › Skills**, it's already on your account and you don't need
  either of the above. Don't add it twice, or two copies will answer the
  same requests. generate-docs used to be called `reference-doc`. If an old
  `reference-doc` account skill is still listed there, turn it off or delete
  it.

Then use it in a chat by typing `/` and choosing it, or just by asking: a
write-up for generate-docs; adding, finishing or reviewing tasks in your
tracker for workday-tracker. It shows up in **Customize › Skills**, labeled
with the plugin's name.

**How it reaches Claude Code.** Anything on your account also shows up in
Claude Code terminal sessions signed in with that account:

- plugins as `<name>@synced`;
- standalone account skills under `~/.claude/skills/synced/`, listed in
  `/skills` under `claude.ai sync`.

If the same plugin is also installed from path 1, Claude Code loads the
path-1 copy and skips the synced one. A standalone account skill and the
plugin version have different names (for example `workday-tracker` and
`workday-tracker:workday-tracker`), so **both** load. Pick one.

**The mods on path 2:** don't bother. Chat, Cowork, the web and mobile
skip a mod, so it would only reach Claude Code through sync, which path 1
already covers more directly.

### Path 1: Claude Code on this machine

#### Before you start

| Check | How |
| --- | --- |
| Git is installed | `git --version` |
| The CLI is 2.1.292 or newer, for the one-command install from your shell | `claude --version`. Update with `claude update`. |
| The CLI is signed in (CLI only) | `claude -p "hi"` should answer. If it says *OAuth session expired*, run `claude`, then type `/login`. |

The desktop app doesn't use the `claude` on your PATH. Its Code tab runs its
own bundled copy of Claude Code, which updates with the app. However, the
terminal, the desktop app's local sessions and VS Code all read the **same
settings files**, so a plugin installed at user scope in one appears in the
others.

#### Pick one install method

| | M. Marketplace (recommended) | B. `CLAUDE_CODE_PLUGIN_DIRS` | C. `--plugin-dir` |
| --- | --- | --- | --- |
| CLI | ✔ every session | ✔ every session | ✔ that one session |
| Desktop app, Code tab | ✔ every session | ✔ every session | ✘ (the app can't pass flags) |
| Picks what to load | per plugin | per folder | per folder |
| Best for | everyday use, sharing | working on a plugin | a quick try |

**Use only one method per plugin.** If you use two, the copy loaded from the
folder (B or C) silently replaces the installed one. `claude plugin list` then
still shows the installed copy as enabled, which is confusing when you
update one and nothing changes
([name conflicts](https://code.claude.com/docs/en/plugins/loading#name-conflicts)).

---

#### M. From the marketplace (recommended)

**From this folder** (the machine where you edit the repo). In PowerShell:

```powershell
claude plugin marketplace add F:\development\claude-tools
claude plugin install project-tracker@claude-tools
claude plugin install generate-docs@claude-tools
claude plugin install workday-tracker@claude-tools
claude plugin install context-bar@claude-tools
claude plugin install resource-monitor@claude-tools
```

A marketplace added from a local folder is loaded in place. Edits here take
effect in the next session, or after `/reload-plugins`, with no reinstall.

**From GitHub** ([primelogiclabio/claude-tools](https://github.com/primelogiclabio/claude-tools)).
Use this on any other machine. One line installs a plugin and adds the
marketplace first if needed, in either of two places:

- **Inside a Claude Code session** (CLI or desktop Code tab, 2.1.275+), type
  the command below. It asks for an install scope.
  ```
  /plugin install project-tracker --marketplace primelogiclabio/claude-tools
  ```
- **From a terminal** (PowerShell, bash; CLI 2.1.292+), run:
  ```
  claude plugin install project-tracker --marketplace primelogiclabio/claude-tools
  ```

Swap `project-tracker` for any name in the [Contents](#contents) table. On an
older CLI, add the marketplace first, then install by id:

```powershell
claude plugin marketplace add primelogiclabio/claude-tools
claude plugin install project-tracker@claude-tools
```

Use the local-folder form above only on the machine where you edit the repo.
Use the GitHub form everywhere else. Don't add both: they register under the
same marketplace name, so only one can be added at a time.

**Desktop app.** In a local Code session, click **+** next to the prompt box,
then **Plugins › Add plugin**, and pick from your marketplaces. Plugins
installed from the CLI at user scope are already there. Start a new session
after installing.

**Check it:** `claude plugin list` should show each one you installed, for
example `project-tracker@claude-tools`, with `Status: ✔ enabled`.

**Uninstall:** `claude plugin uninstall <name>@claude-tools`.
To remove the whole marketplace, run
`claude plugin marketplace remove claude-tools`. That also uninstalls every
plugin you installed from it.

> **Moving from the old install.** If you set project-tracker up earlier by
> cloning or linking it into `~/.claude/skills/project-tracker`, remove that
> first so it doesn't load twice:
> - for a clone: `Remove-Item -Recurse -Force "$HOME\.claude\skills\project-tracker"`
> - for a junction: `cmd /c rmdir "$HOME\.claude\skills\project-tracker"`
>
> Never use `Remove-Item -Recurse` on a junction. In Windows PowerShell 5.1 it
> can delete the files in the source folder the junction points to.

---

#### B. `CLAUDE_CODE_PLUGIN_DIRS` (load from this folder, every session)

This loads plugins straight from their folders, so there's nothing to install
or update.

1. Open `C:\Users\<you>\.claude\settings.json` in an editor. Create it with
   `{}` if it doesn't exist.
2. Add this entry inside the existing top-level `env` object, or add an `env`
   object if there isn't one. Keep everything else in the file. Backslashes
   must be doubled in JSON, and folders are separated with `;`.

   ```json
   {
     "env": {
       "CLAUDE_CODE_PLUGIN_DIRS": "F:\\development\\claude-tools\\mods\\project-tracker;F:\\development\\claude-tools\\skills\\generate-docs"
     }
   }
   ```

   List only the folders you want, from `mods\project-tracker`,
   `mods\context-bar`, `mods\resource-monitor`, `skills\generate-docs` and
   `skills\workday-tracker`.
3. **CLI:** start a new `claude` session.
   **Desktop app:** quit it completely (right-click the tray icon and choose
   Quit), reopen it, and start a new session in the Code tab.

This is read only from your user `settings.json`, never from a project's
`.claude/settings.json`.

**Optional, desktop app:** add `"CLAUDE_CODE_PLUGIN_DIR_WATCH": "1"` to the
same `env` object. Open desktop sessions then reload a plugin when you edit
it. Without it, edits take effect in the next session. CLI sessions always
watch.

**Check it:** `claude plugin validate <folder>` should end with
`✔ Validation passed`. `claude plugin list` doesn't show plugins loaded this
way.

**Uninstall:** delete the `CLAUDE_CODE_PLUGIN_DIRS` line and start a new
session.

---

#### C. `--plugin-dir` (CLI, one session)

```powershell
claude --plugin-dir F:\development\claude-tools\mods\project-tracker
```

The plugin is loaded for that session only, and edits reload while it runs.
Nothing is installed. Repeat the flag to load more than one plugin.

---

#### First run: what to expect

1. **Trust prompt.** The first time Claude Code opens a folder it asks *"Is
   this a project you created or one you trust?"*. Choose **Yes, I trust this
   folder**. In the desktop app this is the access request when you pick the
   project folder for a Code session. Plugins don't run until the folder is
   trusted.
2. **project-tracker:** type `/tasks`. Where the pane appears depends on
   terminal width and layout; see its [README](mods/project-tracker/README.md).
   `/tasks add Try the tracker` creates `<project>/.claude/tasks.md`.
3. **context-bar:** the card appears above the prompt. The header and badge
   fill in after the first response; `/context-bar` prints the full
   breakdown.
4. **resource-monitor:** the status line shows a readout such as
   `⚙ CPU 12% · 2.1 GB`; CPU appears after the second sample (5 s apart); `/resources` opens the pane.
5. **generate-docs:** ask for a write-up, for example "write up an overview
   of how this repo is laid out", or type `/generate-docs` and pick it.
6. **workday-tracker:** share the link to your task-tracker artifact (or ask
   to start one) and say "add a follow-up to check the DNS change", or type
   `/workday-tracker` and pick it. It edits the artifact itself, so the
   session needs the Artifact tool; without it, use the skill on claude.ai
   (path 2).

#### Changing plugin options

The three mods have options, listed in each one's README:

| Mod | Options |
| --- | --- |
| project-tracker | `autoOpen`, `statusLine`, `injectContext`, `taskFile`, `registerProject` |
| context-bar | `showBand`, `showLegend`, `warnAt`, `dangerAt`, `showCost` |
| resource-monitor | `cpuWarn`, `memWarn`, `intervalSeconds`, `statusLine`, `autoOpen`, `injectContext` |

Set them in `/config` inside a session, or from the shell:

```powershell
claude plugin configure <name>@claude-tools
```

For a plugin loaded with method B or C, use the bare name with no `@…`.
Start a new session after any change. The skills have no options.

#### Troubleshooting

| Symptom | Fix |
| --- | --- |
| A command (`/tasks`, `/context-bar`, `/resources`, `/generate-docs`, `/workday-tracker`) isn't in the list | The folder isn't trusted, or the session started before you installed. Start a new session (the desktop app needs a full quit and reopen). Run `claude plugin list` (M) or `claude plugin validate <folder>` (B, C). |
| `Plugin "…" not found in marketplace "claude-tools"` | Use the name from the table above, with `@claude-tools`. Run `claude plugin marketplace update claude-tools` to refresh the catalog. |
| `Source path does not exist` on install | The catalog points at a folder that isn't in the copy you added. Make sure your clone or push includes `mods/` and `skills/`. |
| A duplicate command or skill, or changes that seem to come from an old copy | Two install methods are active, or the plugin and an account skill are both on. Keep only one, and check `~/.claude/skills/` for an old copy. |
| You need to see what went wrong | Run `claude --debug …`. Look for lines that start with the mod's name, such as `project-tracker:`; they say why a hook was skipped. |

---

## Working on this repo

Run these from the repo root. Each item's README has the same commands, run
from its own folder.

```powershell
# Everything: marketplace.json and every plugin it lists
claude plugin validate .

# One item on its own
claude plugin validate .\mods\project-tracker
claude plugin validate .\mods\context-bar
claude plugin validate .\mods\resource-monitor
claude plugin validate .\skills\generate-docs
claude plugin validate .\skills\workday-tracker

# Test suites (mods only; skills have no code to test)
claude plugin test .\mods\project-tracker
claude plugin test .\mods\context-bar
claude plugin test .\mods\resource-monitor
```

To add a mod or skill:

1. Create its folder under `mods/` or `skills/`, with a
   `.claude-plugin/plugin.json` and a `README.md`. The READMEs share one
   layout: what it does, when it runs, **Where it works**, **Options** (mods),
   **Install** with both one-line commands, and **Developing** with the
   commands above.
2. Add an entry to `.claude-plugin/marketplace.json`. Keep the entry `name`
   the same as the `name` in the item's own `plugin.json`, and write `source`
   as `./mods/<name>` or `./skills/<name>`.
3. Add it to the folder tree and the Contents table above, to the table in
   [`mods/README.md`](mods/README.md) or [`skills/README.md`](skills/README.md),
   and to the validate (and, for a mod, test) lines above.
4. Run `claude plugin validate .`.

Bump `version` in an item's `plugin.json` when you release a change. Users who
installed from GitHub stay on the version they have until it changes.

## Publishing

The repo is published at <https://github.com/primelogiclabio/claude-tools>
(`origin`, branch `main`). To release a change:

```powershell
cd F:\development\claude-tools
claude plugin validate .
git push
```

People who added the marketplace from GitHub get the change with
`claude plugin marketplace update claude-tools` followed by
`claude plugin update <name>@claude-tools`, or right away if they turned on
auto-update for the marketplace.

If the repository is made private, Claude Code clones it with the git
credentials already on the user's machine, such as `gh auth login` or SSH
keys, and never prompts.

## Licence

[MIT](LICENSE).
