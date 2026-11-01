# claude-tools

This repo is the `claude-tools` plugin marketplace. Every plugin lives in a repo of its own; this repo only lists them, so install commands such as `claude plugin install daily-organizer --marketplace primelogiclabio/claude-tools` stay the same wherever the code lives.

## Layout

- `.claude-plugin/marketplace.json` lists every plugin, each with `"source": {"source": "url", "url": "https://github.com/primelogiclabio/claude-<name>.git"}`. Don't use a `"github"` source: Claude Code clones it over SSH, which fails for anyone without a GitHub SSH key.
- There is no `plugins/` folder any more. New plugins start in a repo of their own.
- `README.md` covers the marketplace as a whole: what's in it, where each plugin works, and how to install. A plugin's own README lives in its repo.

## Plugin repos

- The repo and its folder are named `claude-<plugin name>`, such as `claude-daily-organizer`. The plugin and its skill keep their short name (`daily-organizer`), so installs and slash commands stay the same.
- Each repo has its own README, an MIT `LICENSE` held by `primelogiclabio`, its `plugin.json` (with `homepage` and `repository` set to the repo) and its version. Changes to a plugin, its tests and its version bumps happen in its repo.
- Plugin repos are public and locked down like the rest (a protected `main` and tags, fork workflow approval, no wiki or projects), so the work GitHub account, which can only read public repos, can still see them.
- This repo changes only when a plugin is added, removed or renamed, or its description changes. Keep the marketplace entry's description the same as the one in the plugin's `plugin.json`.

## Adding a plugin

1. Create its repo, `claude-<name>`, with the files above.
2. Here, in one pull request: add its marketplace entry and a row in the README's Contents table, and mention it wherever the README lists plugins by kind.
3. After that merges, check that `claude plugin install <name> --marketplace primelogiclabio/claude-tools` installs it.

## How the plugins moved out

They used to live in `plugins/<name>/`. Each was moved with its history: `git subtree split --prefix=plugins/<name> -b <name>-split` (run where the folder is checked out), pushed as the new repo's `main`, with links that pointed into this repo changed to full GitHub URLs. Then one pull request here pointed the marketplace entries at the new repos and deleted the folders. project-tracker, deprecated in favour of project-progress, was dropped instead of moved.
