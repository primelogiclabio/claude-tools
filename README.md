# claude-tools

Home-made extensions for Claude Code, kept in one git repository that is also
a **plugin marketplace**: Claude Code can add the repo as a source and install
anything listed in it.

```
claude-tools/
├── .claude-plugin/
│   └── marketplace.json      the marketplace catalog (lists every installable item)
├── mods/                     mods: plugins that change Claude Code's interface or behaviour
│   └── project-tracker/
└── skills/                   skills: instructions Claude loads when a request matches
    └── reference-doc/
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
| [reference-doc](skills/reference-doc/README.md) | skill | Writes a self-contained HTML + Markdown technical reference/explainer doc (light/dark toggle, jump-to-section menu, works offline) |

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

## Installing

### Before you start

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

### Pick one install method

| | M. Marketplace (recommended) | B. `CLAUDE_CODE_PLUGIN_DIRS` | C. `--plugin-dir` |
| --- | --- | --- | --- |
| CLI | ✔ every session | ✔ every session | ✔ that one session |
| Desktop app | ✔ every session | ✔ every session | ✘ (the app can't pass flags) |
| Picks what to load | per plugin | per folder | per folder |
| Best for | everyday use, sharing | working on a plugin | a quick try |

**Use only one method per plugin.** If you use two, it loads twice.

---

### M. From the marketplace (recommended)

**From this folder, before it's on GitHub.** In PowerShell:

```powershell
claude plugin marketplace add F:\development\claude-tools
claude plugin install project-tracker@claude-tools
claude plugin install reference-doc@claude-tools
```

A marketplace added from a local folder is loaded in place. Edits here take
effect in the next session, or after `/reload-plugins`, with no reinstall.

**From GitHub** ([primelogiclabio/claude-tools](https://github.com/primelogiclabio/claude-tools)).
Use this on any other machine:

```powershell
claude plugin marketplace add primelogiclabio/claude-tools
claude plugin install project-tracker@claude-tools
```

or in one step (CLI 2.1.292+):

```powershell
claude plugin install project-tracker --marketplace primelogiclabio/claude-tools
```

Inside a session, the same thing is
`/plugin install project-tracker --marketplace primelogiclabio/claude-tools`
(2.1.275+), which asks for an install scope.

Use the local-folder form above only on the machine where you edit the repo.
Use the GitHub form everywhere else. Don't add both: they register under the
same marketplace name, so only one can be added at a time.

**Desktop app.** In a local Code session, click **+** next to the prompt box,
then **Plugins › Add plugin**, and pick from your marketplaces. Plugins
installed from the CLI at user scope are already there. Start a new session
after installing.

**Check it:** `claude plugin list` should show `project-tracker@claude-tools`
with `Status: ✔ enabled`.

**Uninstall:** `claude plugin uninstall project-tracker@claude-tools`.
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

### B. `CLAUDE_CODE_PLUGIN_DIRS` (load from this folder, every session)

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
       "CLAUDE_CODE_PLUGIN_DIRS": "F:\\development\\claude-tools\\mods\\project-tracker;F:\\development\\claude-tools\\skills\\reference-doc"
     }
   }
   ```
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

### C. `--plugin-dir` (CLI, one session)

```powershell
claude --plugin-dir F:\development\claude-tools\mods\project-tracker
```

The plugin is loaded for that session only, and edits reload while it runs.
Nothing is installed. Repeat the flag to load more than one plugin.

---

### First run: what to expect

1. **Trust prompt.** The first time Claude Code opens a folder it asks *"Is
   this a project you created or one you trust?"*. Choose **Yes, I trust this
   folder**. In the desktop app this is the access request when you pick the
   project folder for a Code session. Plugins don't run until the folder is
   trusted.
2. **project-tracker:** type `/tasks`. Where the pane appears depends on
   terminal width and layout; see its [README](mods/project-tracker/README.md).
   `/tasks add Try the tracker` creates `<project>/.claude/tasks.md`.
3. **reference-doc:** ask for a write-up, for example "write up an overview
   of how this repo is laid out", or type `/reference-doc` and pick it.

### Changing plugin options

project-tracker has options (`autoOpen`, `statusLine`, `injectContext`,
`taskFile`, `registerProject`), described in its README. Set them in `/config`
inside a session, or from the shell:

```powershell
claude plugin configure project-tracker@claude-tools
```

For a plugin loaded with method B or C, use `project-tracker` with no `@…`.
Start a new session after any change.

### Troubleshooting

| Symptom | Fix |
| --- | --- |
| `/tasks` or `/reference-doc` isn't in the command list | The folder isn't trusted, or the session started before you installed. Start a new session (the desktop app needs a full quit and reopen). Run `claude plugin list` (M) or `claude plugin validate <folder>` (B, C). |
| `Plugin "…" not found in marketplace "claude-tools"` | Use the name from the table above, with `@claude-tools`. Run `claude plugin marketplace update claude-tools` to refresh the catalog. |
| `Source path does not exist` on install | The catalog points at a folder that isn't in the copy you added. Make sure your clone or push includes `mods/` and `skills/`. |
| Duplicate `/tasks`, or changes that seem to come from an old copy | Two install methods are active. Keep only one, and check `~/.claude/skills/` for an old copy. |
| You need to see what went wrong | Run `claude --debug …`. Lines starting `project-tracker:` say why a hook was skipped. |

---

## Working on this repo

```powershell
claude plugin validate .                         # checks marketplace.json and every listed plugin
claude plugin validate .\mods\project-tracker
claude plugin test .\mods\project-tracker        # project-tracker's test suite
```

To add a mod or skill:

1. Create its folder under `mods/` or `skills/`, with a `README.md`.
2. Add an entry to `.claude-plugin/marketplace.json`. Keep the entry `name`
   the same as the `name` in the item's own `plugin.json`, and write `source`
   as `./mods/<name>` or `./skills/<name>`.
3. Add a row to the Contents table above.
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
