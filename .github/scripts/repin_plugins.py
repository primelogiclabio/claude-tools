#!/usr/bin/env python3
"""Re-pin marketplace plugins to their repo's HEAD when the plugin version changes.

For each plugin in .claude-plugin/marketplace.json with a "url" source, read the
version in .claude-plugin/plugin.json at the pinned "sha" and at the repo's
HEAD. If they differ (or there is no pin yet), set "sha" to HEAD. Commits that
don't bump the version are left unpinned, so users only move on a release.

Only the sha strings are edited in place, so the file keeps its layout.

Usage: repin_plugins.py [path/to/marketplace.json]
Prints a Markdown summary of the changes; prints nothing if there are none.
"""

import json
import re
import subprocess
import sys
import tempfile

MANIFEST = sys.argv[1] if len(sys.argv) > 1 else ".claude-plugin/marketplace.json"
PLUGIN_JSON = ".claude-plugin/plugin.json"


def git(*args, cwd=None):
    return subprocess.run(
        ["git", *args], cwd=cwd, check=True, capture_output=True, text=True
    ).stdout


def head_sha(url):
    return git("ls-remote", url, "HEAD").split()[0]


def version_at(repo, url, sha):
    git("fetch", "-q", "--depth", "1", url, sha, cwd=repo)
    data = json.loads(git("show", f"{sha}:{PLUGIN_JSON}", cwd=repo))
    return data.get("version")


def main():
    with open(MANIFEST, encoding="utf-8") as f:
        text = f.read()
    plugins = json.loads(text)["plugins"]

    changes = []
    for plugin in plugins:
        name, source = plugin["name"], plugin.get("source")
        if not isinstance(source, dict) or source.get("source") != "url":
            continue
        url, pinned = source["url"], source.get("sha")
        head = head_sha(url)
        if head == pinned:
            continue

        with tempfile.TemporaryDirectory() as repo:
            git("init", "-q", "--bare", cwd=repo)
            new_version = version_at(repo, url, head)
            old_version = version_at(repo, url, pinned) if pinned else None

        if pinned and new_version == old_version:
            print(f"{name}: HEAD moved but version is still {new_version}; keeping pin",
                  file=sys.stderr)
            continue

        if pinned:
            if text.count(pinned) != 1:
                sys.exit(f"{name}: pinned sha {pinned} is not unique in {MANIFEST}")
            text = text.replace(pinned, head)
        else:
            # No pin yet: add "sha" right after this plugin's url.
            pattern = re.compile(r'("url"\s*:\s*"' + re.escape(url) + r'")')
            text, count = pattern.subn(r'\1, "sha": "' + head + '"', text)
            if count != 1:
                sys.exit(f"{name}: could not find a unique url entry for {url}")

        changes.append((name, old_version, new_version, pinned, head))

    if not changes:
        return

    json.loads(text)  # the edits must leave valid JSON
    with open(MANIFEST, "w", encoding="utf-8") as f:
        f.write(text)

    for name, old_v, new_v, old_sha, new_sha in changes:
        frm = f"{old_v} (`{old_sha[:7]}`)" if old_sha else "unpinned"
        print(f"- **{name}**: {frm} → {new_v} (`{new_sha[:7]}`)")


if __name__ == "__main__":
    main()
