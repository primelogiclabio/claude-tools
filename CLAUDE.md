# claude-tools

This repo is the `claude-tools` plugin marketplace. Its plugins are moving out to repos of their own, one at a time. The marketplace stays here and keeps listing all of them, so install commands such as `claude plugin install daily-organizer --marketplace primelogiclabio/claude-tools` don't change.

## Layout

- `.claude-plugin/marketplace.json` lists every plugin. One that still lives here has `"source": "./plugins/<name>"`. One that has moved has `"source": {"source": "url", "url": "https://github.com/primelogiclabio/claude-<name>.git"}`. Don't use a `"github"` source: Claude Code clones it over SSH, which fails for anyone without a GitHub SSH key.
- `plugins/<name>/` holds the plugins that haven't moved yet. Start new plugins in their own repo, not here.
- `README.md` covers the marketplace as a whole: what's in it, where each plugin works, and how to install. A plugin's own README lives with the plugin.

## Plugin repos

- The repo and its folder are named `claude-<plugin name>`, such as `claude-daily-organizer`. The plugin and its skill keep their short name (`daily-organizer`), so installs and slash commands stay the same.
- Each repo has its own README, an MIT `LICENSE` held by `primelogiclabio`, its `plugin.json` and its version. Changes to a plugin, and its version bumps, happen in its repo.
- This repo changes only when a plugin is added, moved or renamed, or its description changes. Keep the marketplace entry's description the same as the one in the plugin's `plugin.json`.

## Moving a plugin out

1. Make sure its open pull requests here are merged first.
2. Split its folder's history into a branch (`git subtree split --prefix=plugins/<name> -b <name>-split`) and push that as the new repo's `main`, on top of anything the new repo already has.
3. In the new repo, add a `LICENSE`, and change links that pointed into this repo (`../../README.md`, `../<other plugin>/README.md`) to full GitHub URLs.
4. Here, in one pull request: point the plugin's marketplace entry at the new repo, delete `plugins/<name>`, and update this README's Contents table and any steps that name `plugins/<name>`.
5. After that merges, check that `claude plugin install <name> --marketplace primelogiclabio/claude-tools` installs it from the new repo.
