# git-repo-creator

A skill that puts a project on git and GitHub with the same setup every time,
or audits a repository that is already there and fixes the gaps. It works in
two modes:

- **Initialize**: the project isn't on GitHub yet. Claude settles the
  checklist, writes the files, creates the repository, pushes, and then applies
  the protections.
- **Correct**: the repository exists. Claude reads its settings and files,
  reports what is missing or inconsistent, and fixes what you approve.

The checklist:

- **name**, kept the same as the folder and the build identity;
- **description**, one sentence, also used in the README and build file;
- **public or private**, always your decision;
- **license**, with one copyright holder used across your repos;
- **`.gitignore`**, **`.gitattributes`** and **README**;
- **CI workflow** that builds and tests, with a read-only token and no
  `pull_request_target`;
- **lockdown for public repos**: rulesets that stop `main` and tags being
  deleted or force-pushed and require a pull request, approval before fork
  workflows run, wiki and Projects off, secret scanning, Dependabot and
  private vulnerability reporting.

It asks before it creates a repository, pushes or changes a remote setting,
checks for secrets before the first push, and reads the settings back
afterwards. The full instructions are in [`SKILL.md`](SKILL.md).

## When it runs

Claude picks it up when you ask to put a project on git or GitHub, create a
repo, publish or make a repo public, or check or tighten an existing repo's
setup: "put this on git", "make a repo for this", "is this repo set up
right?". To call it directly, type `/git-repo-creator` and choose it from the
list. When it's installed as a plugin, its full name is
`/git-repo-creator:git-repo-creator`.

## Where it works

It runs commands, so it needs a session with a shell that has `git` and the
GitHub CLI `gh`, signed in (`gh auth status`).

| Where | Works? |
| --- | --- |
| Claude Code CLI, desktop Code tab, VS Code | ✔ full skill, with `git` and `gh` on the machine |
| Claude Code cloud sessions (claude.ai/code) | ⚠ only if the skill is on your claude.ai account and the session has `gh` signed in |
| claude.ai web, desktop Chat, Cowork, mobile | ✘ no shell to run the commands, so there is no reason to add it there |

## Install

One line installs it, in either of two places:

- **Inside a Claude Code session** (CLI or desktop Code tab, 2.1.275+), type:
  ```
  /plugin install git-repo-creator --marketplace primelogiclabio/claude-tools
  ```
- **From a terminal** (PowerShell, bash; CLI 2.1.292+), run:
  ```
  claude plugin install git-repo-creator --marketplace primelogiclabio/claude-tools
  ```

Both add the `claude-tools` marketplace first if you haven't added it yet.

The step-by-step instructions are in the
[repo README](../../README.md#installing). Notes specific to this skill:

- **As a plain skill, without the plugin wrapper.** Link the folder into your
  skills directory:

  ```powershell
  New-Item -ItemType Junction -Path "$HOME\.claude\skills\git-repo-creator" -Target "F:\development\claude-tools\skills\git-repo-creator"
  ```

  Remove the link only with `cmd /c rmdir "$HOME\.claude\skills\git-repo-creator"`.
  Never use `Remove-Item -Recurse` on a junction.
- **Install it once.** The plugin and a plain-skill copy have different names
  (`git-repo-creator:git-repo-creator` and `git-repo-creator`), so both would
  load and compete. Keep one.
- **GitHub CLI.** Install `gh` and run `gh auth login` first. With several
  accounts, check which one is active with `gh auth status`.

## Developing

From this folder:

```sh
claude plugin validate .
```

It's a skill with no code, so there are no tests. To try a change, ask for a
repo audit in a new session, on a repository you can afford to change.

## Files

```
git-repo-creator/
├── .claude-plugin/plugin.json   lets this folder install as a plugin
├── SKILL.md                     the skill: frontmatter + instructions
└── README.md                    this file
```
