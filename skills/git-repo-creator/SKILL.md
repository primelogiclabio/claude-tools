---
name: git-repo-creator
description: Put a project on git and GitHub the right way, or audit and fix an existing repository. Covers the repository name, one-line description, public or private, license, .gitignore, README, CI workflow, and, for public repos, the lockdown against outside contributors. Use whenever the user wants to create, initialize, publish or push a new project to git or GitHub, make a repo public, or check, correct or tighten an existing repo's setup, even if they only say "put this on git", "make a repo for this" or "is this repo set up right".
---

# Git repo creator

Two modes, one checklist:

- **Initialize**: the project isn't on GitHub yet. Decide the checklist items, write the files, create the repository, push, then apply protections.
- **Correct**: the repository exists. Read its current state, report the gaps, and fix the ones the user approves.

## Ground rules

- **Tools.** It needs a shell with `git` and the GitHub CLI `gh`, signed in. Run `gh auth status`. If more than one account is listed, confirm the active one is the owner the repo belongs under (`gh auth switch` changes it). Without a shell, give the checklist and say what could not be run.
- **Ask before anything outward-facing.** Creating a repository, pushing, and changing remote settings are visible to others. Show the decisions as a short table and wait for a clear yes before the first command that creates or changes the remote. Editing local files needs no ask.
- **Never push secrets.** Before the first commit and push, list what would go in (`git status`, `git ls-files`) and look for `*.pem`, `*.key`, keystores, `.env`, credentials and tokens. Make sure `.gitignore` covers them. If one is already staged or committed, stop and tell the user.
- **Don't push to a protected `main`.** In Correct mode, file changes go on a branch and a pull request.

## The checklist

| Item | How to decide it |
| --- | --- |
| **Name** | Lowercase kebab-case. Make it the same as the project folder and as the build identity (Maven `artifactId`, jar and launcher names, package name, npm `name`), so a later rename doesn't touch every file. Check it's free: `gh repo view <owner>/<name>` should fail. |
| **Description** | One sentence, at most 350 characters: what it does and for whom. Use the same wording in the README's first line and the build file's description. Add topics with `gh repo edit --add-topic`. |
| **Visibility** | Ask, with no silent default. Public means a license and the lockdown below are required. Private is the safer place to start if the project isn't ready to be read. |
| **License** | Ask; a public repo needs one. Offer MIT (short, permissive) or Apache-2.0 (permissive, with a patent grant). Get the text from `gh api licenses/<key> --jq .body` (`mit`, `apache-2.0`) and fill in the year and holder. Ask for the copyright holder once and use the same name in every repo the owner has. Make the build metadata agree (Maven `<licenses>`, npm `license`). |
| **.gitignore** | The stack's usual build output and IDE folders, plus always: generated keys and secrets (`*.pem`, `keys/`, `.env`) and the names of the artifacts this build produces. Run `git status` after a build to make sure nothing generated shows up. |
| **.gitattributes** | When the repo has launcher scripts: `* text=auto`, `*.sh text eol=lf`, `*.cmd text eol=crlf`, so a `.sh` file never gets CRLF on Linux. |
| **README** | Name, the description, requirements, how to build, how to use, a license line. |
| **CI workflow** | `.github/workflows/build.yml`, see below. |
| **Protection** | See the lockdown below. Always for public repos. |

### CI workflow

- Build and test on `ubuntu-latest` and `windows-latest` when the project is meant to be cross-platform. Pin the language to the oldest version the project supports.
- Triggers: `push` to `main`, `pull_request`, and `workflow_dispatch`. Never `pull_request_target`, which runs fork code with the repo's secrets.
- Set `permissions: contents: read` and grant more per job only when needed.
- Use GitHub-owned actions at their current major version. Look it up, don't recite it: `gh api repos/actions/checkout/releases/latest --jq .tag_name`.
- If `paths:` filters are used, keep the `push` and `pull_request` lists identical, and **do not make the check required**. A filtered check that doesn't run on a docs-only PR leaves the merge waiting forever.

## Initialize mode

Order matters, because the protections below block direct pushes to `main`.

1. Settle the checklist. Ask only for the real choices (visibility, license and holder, anything the project doesn't already imply); decide the rest and say what you decided.
2. `git init -b main` if needed, write the files, run the project's own build and tests.
3. Scan for secrets, then commit.
4. Show the plan, get the yes, then create and push in one step:
   ```
   gh repo create <owner>/<name> --public|--private --description "<text>" --source . --remote origin --push
   ```
5. Only now apply the protections.
6. Verify (below) and report the URL.

## Correct mode

1. **Read.** `gh repo view <owner>/<name> --json name,description,visibility,licenseInfo,defaultBranchRef,hasWikiEnabled,hasProjectsEnabled`; the rulesets (`repos/{o}/{r}/rulesets`); `repos/{o}/{r}/actions/permissions/workflow` and `.../fork-pr-contributor-approval`; the repository's `security_and_analysis`; the collaborators; and the files in the tree.
2. **Report** a table: item, current state, proposed fix. Also flag disagreements: names that differ between repo, folder, build file and README; a license holder that differs from the owner's other repos; a README that no longer matches the code.
3. **Ask** which fixes to apply. Settings go through the API once approved. File changes go on a branch, then a pull request and a squash merge.
4. **Clean up.** With delete-on-merge on, GitHub removes the remote branch itself. Delete the local one with `git branch -D`, because a squash merge leaves it looking unmerged. Switch back to `main` and pull.

## Lockdown for public repos

Outsiders can't push to a public repo unless they have write access. The risks left are your own mistakes or a stolen token, and anything that runs from a fork's pull request. Write the JSON to a scratch file and pass it with `--input`, which works the same in bash and PowerShell.

**Branch ruleset** (`gh api -X POST repos/{o}/{r}/rulesets --input main.json`). No bypass actors. No required approvals, because a sole maintainer can't approve their own PR:

```json
{"name":"protect-main","target":"branch","enforcement":"active",
 "conditions":{"ref_name":{"include":["~DEFAULT_BRANCH"],"exclude":[]}},
 "rules":[{"type":"deletion"},{"type":"non_fast_forward"},
  {"type":"pull_request","parameters":{"required_approving_review_count":0,
   "dismiss_stale_reviews_on_push":true,"require_code_owner_review":false,
   "require_last_push_approval":false,"required_review_thread_resolution":true}}],
 "bypass_actors":[]}
```

**Tag ruleset**: stops releases being deleted or moved, but still lets new tags be created:

```json
{"name":"protect-tags","target":"tag","enforcement":"active",
 "conditions":{"ref_name":{"include":["~ALL"],"exclude":[]}},
 "rules":[{"type":"deletion"},{"type":"update"},{"type":"non_fast_forward"}],
 "bypass_actors":[]}
```

**Settings**, each a `gh api` call on `repos/{o}/{r}`:

| Setting | Call |
| --- | --- |
| Approve fork workflow runs for every outside contributor | `PUT .../actions/permissions/fork-pr-contributor-approval -f approval_policy=all_external_contributors` |
| Wiki and Projects off (a public wiki can be edited by outsiders); delete branches on merge | `PATCH repos/{o}/{r} -F has_wiki=false -F has_projects=false -F delete_branch_on_merge=true` |
| Vulnerability alerts and Dependabot security updates | `PUT .../vulnerability-alerts`, `PUT .../automated-security-fixes` |
| Private vulnerability reporting | `PUT .../private-vulnerability-reporting` |
| Secret scanning and push protection | already on for public repos; confirm in `security_and_analysis` |

Also confirm the workflow token is read-only and can't approve PRs (`.../actions/permissions/workflow`: `default_workflow_permissions` is `read`, `can_approve_pull_request_reviews` is `false`) and that the owner is the only collaborator. Leave Issues on; they can't change the code.

**Private repos.** Rulesets and some security features need a paid plan. If the API refuses with an upgrade message, skip the item and say so in the report.

## Verify and report

Read the settings back instead of assuming the calls worked: `repos/{o}/{r}/rulesets`, `repos/{o}/{r}/rules/branches/main`, the fork approval policy, and the repository flags. Then report briefly: the URL, what is set, what was skipped and why, and anything left for the user to decide.
