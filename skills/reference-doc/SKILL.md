---
name: reference-doc
description: Build a standalone technical reference/explainer document — architecture overviews, stack comparisons, "how does X work" write-ups, decision docs, research summaries — as a self-contained HTML file (light/dark toggle, jump-to-section nav menu, no external network calls) plus a matching plain Markdown file. Use this whenever the user asks to document, write up, explain, or create an overview/comparison/decision doc for a technical topic, system, or architecture choice, even if they just say "write this up," "document this," or "create an overview of X" without naming a format. Especially relevant for cross-project research, architecture explainers, build-vs-buy comparisons, and anything meant to be read later by the user or a colleague rather than just answered in chat.
---

# Reference doc

Produces a two-file deliverable for a technical topic: one self-contained `.html` file people can just double-click open, and one `.md` file with the same content in plain Markdown (for pasting into a wiki, diffing in git, or reading in a terminal). Both come from the same source material — write the content once, then render it twice.

## Why this shape

The HTML version is the one people actually read: it's visual, it has a working light/dark toggle, and a jump-to-section menu so a 10-section doc doesn't turn into endless scrolling. The Markdown version exists because not every place a doc ends up (a git repo, a work wiki, a Slack paste) wants to run arbitrary HTML — Markdown travels better there. Neither replaces the other; ship both every time.

## Before writing: gather the real content first

Don't start from the template. Start from the actual facts, numbers, trade-offs, and sources for the topic — research it, read the relevant code, or use what's already been established in the conversation. The template below is just the container; a good-looking doc with thin or made-up content is worse than no doc. If the topic involves comparing options (stack choices, tools, architectures), verify claims rather than reciting priors — e.g. check an actual LICENSE file before stating a tool is free, or check version/config files before describing what's "currently installed."

## HTML structure

Build one `<html>` file, inline `<style>` and `<script>`, nothing loaded from a CDN or network — it has to open and work offline, forever, with no dependency rot. Rough shape, adapt section count/order to the topic:

1. **Header** — title, one-line description, maybe a short stats row if there are a few headline numbers worth surfacing immediately.
2. **Why this / the problem** — a short plain-language framing before diving into mechanics. If there's a real-world analogy that helps (e.g. "think of the broker as the front desk for a building with many tenant companies"), use it.
3. **Core explainer section(s)** — the main content: what the thing is, how it works, comparisons. Prefer:
   - **Real `<table>` markup** for comparisons, not prose trying to do a table's job.
   - **CSS-grid or flexbox diagrams** for architecture/flow — boxes and arrows built from styled `<div>`s, themed with the same CSS variables as the rest of the page, rather than an external image. Inline SVG is also fine. Avoid pasting in a screenshot or an image that won't theme or scale.
   - **Scenario walkthroughs** ("what happens when X fails," "one request step by step") when tracing a concrete path through the system clarifies it better than describing it abstractly.
4. **Decision framework / verdict**, if the doc is a comparison — be concrete about when each option actually wins, not just a feature list. A reader should be able to find themselves in it ("if you have fewer than N servers, do A; past that, B").
5. **Open questions / limits** — say plainly what isn't decided or what the doc doesn't cover. Don't paper over gaps.
6. **References** — this section is always included, not optional. Link to the primary sources actually used while researching (official docs, license files, RFCs, vendor pages), plus anything the reader would need to download or install to act on the doc. Group them if there are several categories (e.g. "official docs," "libraries mentioned," "alternatives considered"). If a tool has lookalike/scam/reseller domains that show up in search results, name the real official one explicitly and call out the lookalikes by domain so the reader doesn't land on the wrong site. Every factual claim or comparison point in the doc should trace back to something in this list — don't cite a source in the body and then leave it out of References, and don't put a link in References that nothing in the doc actually relied on.

### Light/dark theme

Use CSS custom properties on `:root`, overridden under a `[data-theme="dark"]` (or `.dark`) selector, flipped by a small toggle button. Persist the choice with `localStorage` — these are delivered as real files opened in a real browser, not in-conversation artifact previews, so `localStorage` is safe to use here (unlike chat-rendered artifacts, where it silently fails). Default to light (`color-scheme: light` on `:root`) unless the user asks otherwise.

### Jump-to-section menu

Every doc gets a navigation menu linking to each major section — a small floating button (bottom corner works well) that expands a list of section links, or a sticky sidebar/TOC for longer docs. Highlight whichever section is currently in view as the reader scrolls (an `IntersectionObserver` on each section heading is a clean way to do this). This is what "context menu" or "nav menu" requests are almost always asking for, as distinct from a literal right-click menu — check with the user once if a request is ambiguous, but default to this reading.

### Verify before delivering

Before calling it done:
- Open the file in a real browser (the built-in browser pane, or Claude in Chrome) — don't just eyeball the source.
- Check both light and dark mode actually render correctly.
- Check the jump-nav menu opens, links work, and current-section highlighting updates on scroll.
- Check the browser console for errors.
- If the page has a CSS-grid diagram, check it at a narrow width too — grids that assume desktop width should degrade to a stacked layout rather than breaking.
- Confirm there are no external network calls (no CDN `<script src>`, no remote fonts/images) — everything must be inline.

## Markdown version

Mirror the HTML's content and heading structure in plain Markdown: same sections, same tables (as Markdown tables), same scenario walkthroughs, same references list. Drop anything that's purely visual/interactive (the theme toggle, the nav menu, CSS-grid diagrams) — render a diagram as a simple ASCII/text sketch or just describe the flow in prose instead. The goal is that someone reading only the `.md` file gets the same information, just without the visual polish.

## Where to save and how to deliver

- If the topic is scoped to one project, save both files into that project's `docs/` folder (create it if it doesn't exist).
- If it's cross-project research with no obvious home, ask the user, or use a general documentation folder if one is already established in the conversation.
- Name both files the same way aside from extension (`topic-name.html`, `topic-name.md`).
- Deliver as files — most sessions can present files directly (`present_files` or similar); use that. If an Artifact-creation tool happens to be available and works in the current session, that's a fine alternative to offer, but don't depend on it — file delivery via the project folder is the dependable path and should be the default plan going in.

## A note on tone

These are explainer docs, often read by someone who isn't already deep in the topic. Write like you're teaching, not logging. Favor plain language over jargon where you can, and when you do use a technical term, it's fine to define it briefly in passing rather than assuming it's known.
