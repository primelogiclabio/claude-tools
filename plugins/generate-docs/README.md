# generate-docs

A skill that generates **project documentation** and **research
documentation**, such as architecture overviews, stack and tool comparisons,
decision docs and research write-ups, plus step-by-step **guides** (how-tos,
setup steps, runbooks). Each doc is two files that share one name:

- **`topic.html`**: self-contained, with inline CSS and JS and no network
  calls, so it opens offline by double-clicking. It has a light/dark toggle and
  a section menu that highlights the section you're reading: a left pane on
  wide screens, a drop-down from a top bar on narrow ones. Sections with
  several parts get nested links to each part.

  Guides can have **fill-in fields** for values only you know, such as a
  version, port or host name. You type each value once, in the step that
  first needs it, and every command and paste-ready block that uses it updates.
  Every code block has a Copy button, which sends you to the right field if a
  value is missing or in the wrong format. A choice field (Windows or Linux,
  say) shows only the matching commands. Values are remembered in your browser
  unless you turn that off, and Reset clears them. Passwords and keys are
  never fields.
- **`topic.md`**: the same content in plain Markdown, for git, a wiki or a
  chat paste.

The skill tells Claude to:

- gather and check the real facts first, for example by reading a tool's
  LICENSE file before calling it free;
- use real tables, CSS-grid diagrams and "what happens when…" walkthroughs;
- always end with a **References** section, including official links and any
  known lookalike domains;
- open the result in a browser before handing it over.

The full instructions are in [`SKILL.md`](SKILL.md).

## When it runs

Claude picks it up when you ask to document, write up or explain something,
or to create project documentation, research documentation, or an overview,
comparison or decision doc for a technical topic. "Write this up",
"document this" or "create an overview of X" is enough; you don't need to name
a format. It's aimed at architecture explainers, build-vs-buy comparisons and
cross-project research, not quick answers in chat.

To call it directly, type `/generate-docs` and choose it from the list, then
add the topic. When it's installed as a plugin, its full name is
`/generate-docs:generate-docs`.

## Where it saves

- **Project documentation** (about one project) goes in that project's
  `docs/` folder, which is created if needed.
- **Research documentation** (cross-project research, tool comparisons,
  build-vs-buy studies) goes in a documentation folder you name. If you
  haven't named one, Claude asks.

## Where it works

| Where | Works? | How to get it there |
| --- | --- | --- |
| Claude Code CLI, desktop Code tab, VS Code | ✔ full skill | Install from the marketplace on this computer (path 1), or sync it from your claude.ai account |
| claude.ai web, desktop Chat, Cowork, mobile | ✔ but the browser check and saving to `docs/` are skipped; the files come back as downloads | On your claude.ai account (path 2): add the `primelogiclabio/claude-tools` marketplace under **Customize › Plugins**, upload the folder as a zip, or keep it as an account skill |
| Claude Code cloud sessions (claude.ai/code) | ✔ only if it's on your claude.ai account | Path 2 |

Outside Claude Code, skills need a Pro, Max, Team or Enterprise plan, with
**Code execution and file creation** turned on in **Settings › Capabilities**.

## Install

One line installs it, in either of two places:

- **Inside a Claude Code session** (CLI or desktop Code tab, 2.1.275+), type:
  ```
  /plugin install generate-docs --marketplace primelogiclabio/claude-tools
  ```
- **From a terminal** (PowerShell, bash; CLI 2.1.292+), run:
  ```
  claude plugin install generate-docs --marketplace primelogiclabio/claude-tools
  ```

Both add the `claude-tools` marketplace first if you haven't added it yet.

The step-by-step instructions for both paths are in the
[repo README](../../README.md#installing). Notes specific to this skill:

- **As a plain skill, without the plugin wrapper.** Link the folder into your
  skills directory. Put your clone's path in place of `C:\src\claude-tools`:

  ```powershell
  New-Item -ItemType Junction -Path "$HOME\.claude\skills\generate-docs" -Target "C:\src\claude-tools\plugins\generate-docs"
  ```

  Remove the link only with `cmd /c rmdir "$HOME\.claude\skills\generate-docs"`.
  Never use `Remove-Item -Recurse` on a junction.
- **Avoid loading it twice.** If this skill is already saved to your claude.ai
  account under **Customize › Skills**, it already reaches Chat, Cowork and
  mobile, and it syncs into signed-in Claude Code sessions as `generate-docs`.
  Installing the plugin as well adds a second copy, `generate-docs:generate-docs`,
  and the two then compete to answer the same requests. Keep one.
- **Renamed from `reference-doc`.** Earlier copies used that name. Remove any
  old one so it doesn't compete with this one:
  - an old `~/.claude/skills/reference-doc` junction: remove it with
    `cmd /c rmdir`;
  - an old `reference-doc@claude-tools` install: run
    `claude plugin uninstall reference-doc@claude-tools`;
  - an old `reference-doc` account skill: turn it off.
- **It needs a browser.** It has no runtime dependencies, but its check step
  expects one: the desktop app's built-in browser pane, or Claude in Chrome.

## Developing

From this folder:

```sh
claude plugin validate .
```

It's a skill with no code, so there are no tests. To try a change, ask for a
write-up in a new session.

## Files

```
generate-docs/
├── .claude-plugin/plugin.json   lets this folder install as a plugin
├── SKILL.md                     the skill: frontmatter + instructions
├── guide-fields.md              starting code for fill-in fields, read only when a doc has them
└── README.md                    this file
```
