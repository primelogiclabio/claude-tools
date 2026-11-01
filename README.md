# claude-tools

Home-made extensions for Claude Code, listed in one **plugin marketplace**:
Claude Code can add this repo as a source and install anything listed in it.
Each plugin lives in a repo of its own, named `claude-<name>`; this repo holds
only the catalog, and the marketplace installs each plugin from its repo.

```
claude-tools/
├── .claude-plugin/
│   └── marketplace.json      the marketplace catalog (lists every installable item)
├── CLAUDE.md                 conventions for the catalog and the plugin repos
└── README.md                 this file
```

**Mods vs skills.**

- A **mod** is a plugin with code. It can add panes, slash commands, tools,
  hooks or status-line text. Each one has its own `.claude-plugin/plugin.json`
  and `hooks/`.
- A **skill** is a `SKILL.md`: a description that tells Claude when to use it,
  followed by instructions. It has no code. Each skill also carries a small
  `plugin.json`, so it installs through the marketplace the same way a mod does.
- A plugin can be **both**: project-progress is a skill that also ships a pane,
  so one install gets the two.

## Contents

| Name | Kind | What it does |
| --- | --- | --- |
| [context-bar](https://github.com/primelogiclabio/claude-context-bar) | mod | Context card above the prompt, off until `/context-bar show` or the `showBand` option: the window as one bar split by `/context` category, a legend with exact figures, a fill badge coloured by threshold, plus session tokens, cost and plan rate limits; `/context-bar` for the text breakdown |
| [resource-monitor](https://github.com/primelogiclabio/claude-resource-monitor) | mod | CPU and memory of Claude Code and the processes it started: **Resources** pane with sparklines, status-line readout, warning colours, and a `resources` tool for Claude |
| [generate-docs](https://github.com/primelogiclabio/claude-generate-docs) | skill | Generates project or research documentation, or step-by-step guides with fill-in fields, as a self-contained HTML file plus matching Markdown (light/dark toggle, jump-to-section menu, works offline) |
| [daily-organizer](https://github.com/primelogiclabio/claude-daily-organizer) | skill | A personal daily organizer on claude.ai: Today, Up Next, Waiting On and Done lists that you and Claude both update, with a morning plan and an end-of-day summary. Was workday-tracker |
| [git-repo-creator](https://github.com/primelogiclabio/claude-git-repo-creator) | skill | Puts a project on git and GitHub, or audits and fixes an existing repo: name, description, public or private, license, CI workflow, and a lockdown against outside contributors for public repos |
| [project-progress](https://github.com/primelogiclabio/claude-project-progress) | skill + mod | Tracks long project work in `PROGRESS.md` so context holds only the current task: one item at a time with a plan, side ideas parked instead of chased, a checkpoint before each `/clear`; a **Progress** pane shows where you are, with `/progress` |

---

## What the marketplace is for

A marketplace is a catalog file, [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json),
that lists plugins and where to fetch each one. Here each entry points at the
plugin's own GitHub repo. Once someone adds this repo as a marketplace, they
can:

- browse its plugins in `/plugin`, or with **+ › Plugins** in the desktop app;
- install one with a single command;
- get updates with `claude plugin update <name>@claude-tools`, or with
  **Update marketplace** in `/plugin`. Auto-update is off by default for
  marketplaces other than Anthropic's, and can be turned on in `/plugin` ›
  **Marketplaces**.

The marketplace's name is **`claude-tools`**, so install ids look like
`project-progress@claude-tools`.

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

| Where you use Claude | Skills: generate-docs, daily-organizer, git-repo-creator, project-progress | Mods: context-bar, resource-monitor, project-progress's pane |
| --- | --- | --- |
| **Claude Code CLI** (terminal, including IDE terminals and JetBrains) | ✔ (daily-organizer: needs the Artifact tools, see below; git-repo-creator: needs `git` and `gh`) | ✔ everything: panes, the bar above the prompt, commands, tools, status line |
| **Desktop app, Code tab** (local or SSH session) | ✔ (daily-organizer: needs the Artifact tools; git-repo-creator: needs `git` and `gh`) | ✔ panes show as panels. Not in a **WSL** session, where plugins aren't available. |
| **VS Code extension** chat panel | ✔ (daily-organizer: needs the Artifact tools; git-repo-creator: needs `git` and `gh`) | ⚠ partly. Hooks run, so the commands (`/context-bar`, `/resources text`, `/progress text`) and the tools work, but **panes and the bar aren't drawn**. |
| **Desktop app, Cowork** | ✔ from your claude.ai account (path 2 below), except git-repo-creator and project-progress | ✘ mods are Claude Code only |
| **Desktop app, Chat** | ✔ from your claude.ai account (path 2), except git-repo-creator and project-progress | ✘ |
| **claude.ai on the web** | ✔ from your claude.ai account (path 2), except git-repo-creator and project-progress | ✘ claude.ai doesn't run mods |
| **Claude mobile apps** | ✔ from your claude.ai account (path 2), except git-repo-creator and project-progress | ✘ |
| **Claude Code cloud sessions** (claude.ai/code, routines) | ✔ only if it's on your claude.ai account. Locally installed plugins don't reach the cloud. git-repo-creator also needs `gh` signed in there. | ✘ nothing a mod draws appears in a cloud session |

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

**What daily-organizer needs.** The organizer is a claude.ai artifact whose
tasks live in the artifact's own database. Claude creates it and changes its
tasks with the `Artifact` and `ArtifactData` tools, which Claude Code sessions
have (CLI, desktop Code tab, VS Code). The page itself works wherever you open
it, so you can add, finish and plan tasks there from any device. Chat
artifacts on claude.ai, desktop Chat, Cowork and mobile have no database: there
the skill keeps an older-style tracker whose tasks sit in the artifact's code,
with the same task rules. It holds no artifact link or data, so everyone who
installs it works on their own organizer.

**What git-repo-creator needs.** It runs `git` and the GitHub CLI `gh`,
signed in with `gh auth login`, so it works only in Claude Code (or a cloud
session that has `gh` signed in). Chat, Cowork, the web and mobile have no
shell for it, so don't add it to your claude.ai account.

**What project-progress needs.** It writes `PROGRESS.md` in your repo, imports
it from `CLAUDE.md`, and works with plan mode and `/clear`. Those are Claude
Code features, so it works only in Claude Code. Chat, Cowork, the web and
mobile have no repo or `CLAUDE.md` for it, so don't add it to your claude.ai
account. Run `/project-progress init` once in each repo you want to track.
Its **Progress** pane is the mod part of the same plugin: it reads
`PROGRESS.md` and draws beside the chat in the CLI and the desktop Code tab.

## Installing

There are **two separate install paths**, and they reach different places:

| | Path 1: Claude Code on this machine | Path 2: your claude.ai account |
| --- | --- | --- |
| Where you install | `claude plugin …` in a terminal, `/plugin` in a session, or **+ › Plugins** in the desktop Code tab | **Customize › Plugins** (or **Customize › Skills**) on claude.ai or in the desktop app |
| Install is tied to | this computer | your account |
| Reaches | the CLI, the desktop Code tab and VS Code on this computer | Chat (web, desktop, mobile) and Cowork. It also syncs into Claude Code terminal sessions where you're signed in with that account (CLI 2.1.273+). |
| Use it for | the mods, and the skills inside Claude Code | generate-docs and daily-organizer everywhere (git-repo-creator and project-progress are Claude Code only) |

Installs don't travel the other way. A plugin you install from the Claude Code
command line stays on that computer and is never added to your account
([Install and manage plugins](https://code.claude.com/docs/en/plugins/install#plugins-from-your-claude-ai-account)).

Path 2 is covered first because it's short. Path 1 has the full Claude Code
details.

### Path 2: on your claude.ai account (web, desktop Chat and Cowork, mobile)

This is the only way to get the skills, **generate-docs** and
**daily-organizer**, outside Claude Code. For daily-organizer, add it on
path 1 as well if you use Claude Code: that's where it builds and writes the
database-backed organizer. Choose one of:

- **Add the whole marketplace (recommended).**
  1. Open [Customize › Plugins](https://claude.ai/customize/plugins).
  2. Choose **Add › Add marketplace** and enter `primelogiclabio/claude-tools`.
  3. Find **generate-docs** or **daily-organizer** in the list and choose
     **Add**. Add each one you want.

  Updates come from GitHub. Use **Check for updates**, or turn on **Sync
  automatically** for the marketplace
  ([Plugins on claude.ai](https://claude.com/docs/plugins/overview)).
- **Upload just the skill.**
  1. Zip a clone of the skill's repo,
     [claude-generate-docs](https://github.com/primelogiclabio/claude-generate-docs)
     or [claude-daily-organizer](https://github.com/primelogiclabio/claude-daily-organizer),
     without its `.git` folder. Each already contains
     `.claude-plugin/plugin.json`.
  2. Use **Customize › Plugins › Add › Upload plugin**.

  Updates are manual: re-upload after each change.
- **Account skill, without a plugin.** If you already saved the skill under
  **Customize › Skills**, it's already on your account and you don't need
  either of the above. Don't add it twice, or two copies will answer the
  same requests. generate-docs used to be called `reference-doc`, and
  daily-organizer used to be called `workday-tracker`. If an old
  `reference-doc` or `workday-tracker` skill or plugin is still listed there,
  turn it off or delete it.

Then use it in a chat by typing `/` and choosing it, or just by asking: a
write-up for generate-docs; adding, finishing or reviewing tasks, or
planning or wrapping up your day, for daily-organizer. It shows up in **Customize › Skills**, labeled
with the plugin's name.

**How it reaches Claude Code.** Anything on your account also shows up in
Claude Code terminal sessions signed in with that account:

- plugins as `<name>@synced`;
- standalone account skills under `~/.claude/skills/synced/`, listed in
  `/skills` under `claude.ai sync`.

If the same plugin is also installed from path 1, Claude Code loads the
path-1 copy and skips the synced one. A standalone account skill and the
plugin version have different names (for example `daily-organizer` and
`daily-organizer:daily-organizer`), so **both** load. Pick one.

**The mods on path 2:** don't bother. Chat, Cowork, the web and mobile
skip a mod, so it would only reach Claude Code through sync, which path 1
already covers more directly.

### Path 1: Claude Code on this machine

#### Before you start

| Check | How |
| --- | --- |
| Git is installed | `git --version` |
| The GitHub CLI is installed and signed in (git-repo-creator only) | `gh auth status`. Sign in with `gh auth login`. |
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

**From a clone of this repo** (the machine where you edit the catalog). The
examples here and in methods B and C use clones under `C:\src\`; put your
clones' paths instead. In PowerShell:

```powershell
claude plugin marketplace add C:\src\claude-tools
claude plugin install generate-docs@claude-tools
claude plugin install daily-organizer@claude-tools
claude plugin install git-repo-creator@claude-tools
claude plugin install project-progress@claude-tools
claude plugin install context-bar@claude-tools
claude plugin install resource-monitor@claude-tools
```

A marketplace added from a local folder reads its catalog in place, but every
plugin in it still installs from its own repo on GitHub. To work on a plugin,
load a clone of its repo with method B or C.

**From GitHub** ([primelogiclabio/claude-tools](https://github.com/primelogiclabio/claude-tools)).
Use this on any other machine. One line installs a plugin and adds the
marketplace first if needed, in either of two places:

- **Inside a Claude Code session** (CLI or desktop Code tab, 2.1.275+), type
  the command below. It asks for an install scope.
  ```
  /plugin install project-progress --marketplace primelogiclabio/claude-tools
  ```
- **From a terminal** (PowerShell, bash; CLI 2.1.292+), run:
  ```
  claude plugin install project-progress --marketplace primelogiclabio/claude-tools
  ```

Swap `project-progress` for any name in the [Contents](#contents) table. On an
older CLI, add the marketplace first, then install by id:

```powershell
claude plugin marketplace add primelogiclabio/claude-tools
claude plugin install project-progress@claude-tools
```

Use the local-folder form above only on the machine where you edit the repo.
Use the GitHub form everywhere else. Don't add both: they register under the
same marketplace name, so only one can be added at a time.

**Desktop app.** In a local Code session, click **+** next to the prompt box,
then **Plugins › Add plugin**, and pick from your marketplaces. Plugins
installed from the CLI at user scope are already there. Start a new session
after installing.

**Check it:** `claude plugin list` should show each one you installed, for
example `project-progress@claude-tools`, with `Status: ✔ enabled`.

**Uninstall:** `claude plugin uninstall <name>@claude-tools`.
To remove the whole marketplace, run
`claude plugin marketplace remove claude-tools`. That also uninstalls every
plugin you installed from it.

> **project-tracker** is no longer in the marketplace; project-progress
> replaces it. If you still have it installed, run
> `claude plugin uninstall project-tracker@claude-tools`.

---

#### B. `CLAUDE_CODE_PLUGIN_DIRS` (load from your clones, every session)

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
       "CLAUDE_CODE_PLUGIN_DIRS": "C:\\src\\claude-project-progress;C:\\src\\claude-generate-docs"
     }
   }
   ```

   List only the clones you want: each plugin's repo is named after it, such
   as `claude-context-bar` or `claude-daily-organizer`, and lists in the
   [Contents](#contents) table.
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
claude --plugin-dir C:\src\claude-project-progress
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
2. **context-bar:** nothing shows until you ask. `/context-bar show` draws
   the card above the prompt for the session (the `showBand` option draws it
   in every session); the header and badge fill in after the first response.
   `/context-bar` prints the full breakdown.
3. **resource-monitor:** the status line shows a readout such as
   `⚙ CPU 12% · 2.1 GB`; CPU appears after the second sample (5 s apart); `/resources` opens the pane.
4. **generate-docs:** ask for a write-up, for example "write up an overview
   of how this repo is laid out", or type `/generate-docs` and pick it.
5. **daily-organizer:** ask to "start my daily organizer", then say "add a
   follow-up to check the DNS change" or "plan my day", or type
   `/daily-organizer` and pick it. Claude publishes the organizer and gives
   you its link. It needs the Artifact tools, which Claude Code sessions have.
6. **git-repo-creator:** ask to "put this project on GitHub" or "check this
   repo's setup", or type `/git-repo-creator` and pick it. `gh auth status`
   must show a signed-in account. It asks before it creates a repository,
   pushes or changes a setting.
7. **project-progress:** in a repo you want to track, type
   `/project-progress init` and pick it. It asks for your current goal and
   first few items, and whether to commit `PROGRESS.md` or keep it personal.
   Then use `/project-progress next` to start an item. The **Progress** pane
   opens in repos that have `PROGRESS.md`; `/progress` shows or hides it.

#### Changing plugin options

The mods have options, listed in each one's README:

| Mod | Options |
| --- | --- |
| context-bar | `showBand`, `showLegend`, `warnAt`, `dangerAt`, `showCost` |
| resource-monitor | `cpuWarn`, `memWarn`, `intervalSeconds`, `statusLine`, `autoOpen`, `injectContext` |
| project-progress (its pane) | `showPane`, `statusLine` |

Set them in `/config` inside a session, or from the shell:

```powershell
claude plugin configure <name>@claude-tools
```

For a plugin loaded with method B or C, use the bare name with no `@…`.
Start a new session after any change. The other skills have no options.

#### Troubleshooting

| Symptom | Fix |
| --- | --- |
| A command (`/context-bar`, `/resources`, `/generate-docs`, `/daily-organizer`, `/git-repo-creator`, `/project-progress`, `/progress`) isn't in the list | The folder isn't trusted, or the session started before you installed. Start a new session (the desktop app needs a full quit and reopen). Run `claude plugin list` (M) or `claude plugin validate <folder>` (B, C). |
| `Plugin "…" not found in marketplace "claude-tools"` | Use the name from the table above, with `@claude-tools`. Run `claude plugin marketplace update claude-tools` to refresh the catalog. |
| An install fails to clone the plugin | Each plugin installs from its own GitHub repo over HTTPS. Check that `git` works and the machine can reach github.com. |
| A duplicate command or skill, or changes that seem to come from an old copy | Two install methods are active, or the plugin and an account skill are both on. Keep only one, and check `~/.claude/skills/` for an old copy. |
| You need to see what went wrong | Run `claude --debug …`. Look for lines that start with the mod's name, such as `context-bar:`; they say why a hook was skipped. |

---

## Working on this repo

This repo holds only the catalog. Check it from the repo root:

```powershell
claude plugin validate .
```

Each plugin's own repo has its validate and test commands in its README's
**Developing** section.

To add a mod or skill:

1. Give it a repo of its own named `claude-<name>`, with a
   `.claude-plugin/plugin.json`, a `README.md` and an MIT `LICENSE`. The
   READMEs share one layout: what it does, when it runs, **Where it works**,
   **Options** (mods), **Install** with both one-line commands, and
   **Developing** with its validate (and test) commands.
2. Add an entry to `.claude-plugin/marketplace.json`. Keep the entry `name`
   the same as the `name` in the item's own `plugin.json`, write `source` as
   `{"source": "url", "url": "https://github.com/primelogiclabio/claude-<name>.git"}`,
   and use the same description. A `"github"` source clones over SSH and
   fails for anyone without a GitHub SSH key, so use the HTTPS URL.
3. Add it to the Contents table above.
4. Run `claude plugin validate .`.

[`CLAUDE.md`](CLAUDE.md) has the conventions for the plugin repos.

Bump `version` in a plugin's `plugin.json`, in its own repo, when you release a
change. Users stay on the version they have until it changes.

## Publishing

The repo is published at <https://github.com/primelogiclabio/claude-tools>
(`origin`, branch `main`). `main` is protected: it can't be deleted or
force-pushed, and a change reaches it only through a pull request. To release a
change:

```powershell
cd C:\src\claude-tools
claude plugin validate .
git switch -c <branch>
git push -u origin <branch>
gh pr create
```

Then squash-merge the pull request. GitHub deletes the branch on merge.

People who added the marketplace from GitHub get the change with
`claude plugin marketplace update claude-tools` followed by
`claude plugin update <name>@claude-tools`, or right away if they turned on
auto-update for the marketplace.

If the repository is made private, Claude Code clones it with the git
credentials already on the user's machine, such as `gh auth login` or SSH
keys, and never prompts.

## Licence

[MIT](LICENSE).
