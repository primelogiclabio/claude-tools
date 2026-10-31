---
name: generate-docs
description: Generate project documentation or research documentation as a self-contained HTML file (light/dark toggle, jump-to-section nav menu, no external network calls) plus a matching plain Markdown file. Use this whenever the user asks to document, write up, explain, or create project documentation, research documentation, an overview/comparison/decision doc for a technical topic, system, or architecture choice — even if they just say "write this up," "document this," or "create an overview of X" without naming a format. Especially relevant for cross-project research, architecture explainers, build-vs-buy comparisons, and anything meant to be read later by the user or a colleague rather than just answered in chat.
---

# Generate docs

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

Every doc gets a navigation menu linking to each major section. This is what "context menu" or "nav menu" requests are almost always asking for, as distinct from a literal right-click menu — check with the user once if a request is ambiguous, but default to this reading.

- **Wide screens (≥ 1024px): a left pane, always open.** The page is a two-column grid: a sticky section list on the left, the doc on the right. Desktop readers have the width, so don't hide the sections behind a button — a collapsed floating button in a corner is the wrong default here.
- **Narrow screens (< 1024px): the same list collapses** into a sticky bar at the top with a "Sections" button that drops the list down. It's one `<nav>` restyled by a media query, not two copies of the list.
- **Highlight the section in view** as the reader scrolls (an `IntersectionObserver` on each section), and keep the highlighted link visible if the pane has to scroll.
- **One nav only.** Don't also put a row of section links in the header; the pane replaces it.

A starting point that meets all of this (adapt the colors to the page's own variables, keep the behavior):

```html
<div class="layout">
  <nav class="sidenav" id="sidenav" aria-label="On this page">
    <button type="button" class="sidenav-btn" aria-expanded="false" aria-controls="sidenav-list">Sections</button>
    <p class="sidenav-title">On this page</p>
    <ol id="sidenav-list">
      <li><a href="#problem">The problem</a></li>
      <!-- one <li> per section -->
    </ol>
  </nav>
  <div class="content"><!-- header, main, footer --></div>
</div>
```

```css
.sidenav ol{list-style:none; margin:0; padding:0}
.sidenav a{display:block; padding:5px 12px; border-left:2px solid transparent; color:var(--muted); text-decoration:none; font-size:.9rem; line-height:1.35}
.sidenav a:hover{color:var(--fg)}
.sidenav a[aria-current="true"]{color:var(--accent); border-left-color:var(--accent); font-weight:650}
/* narrow: sticky top bar + drop-down */
.sidenav{position:sticky; top:0; z-index:20; margin:-32px -16px 24px; padding:8px 16px; background:var(--bg); border-bottom:1px solid var(--line)}
.sidenav-title{display:none}
.sidenav-btn{font:inherit; font-size:.9rem; font-weight:650; padding:6px 14px; border-radius:999px; border:1px solid var(--line-strong); background:var(--surface); color:var(--fg); cursor:pointer}
.sidenav ol{display:none; position:absolute; left:16px; right:16px; top:100%; max-height:70vh; overflow:auto; padding:8px; background:var(--surface); border:1px solid var(--line-strong); border-radius:12px; box-shadow:0 8px 24px var(--shadow)}
.sidenav.open ol{display:block}
section{scroll-margin-top:64px}
/* wide: left pane, always open */
@media (min-width:1024px){
  .layout{display:grid; grid-template-columns:220px minmax(0, 1fr); gap:48px; max-width:1320px; margin:0 auto}
  .content{min-width:0; margin:0} /* no auto margins: they size the column to its widest table and the page scrolls sideways */
  .sidenav{top:32px; align-self:start; max-height:calc(100vh - 64px); overflow-y:auto; margin:0; padding:0; background:none; border:0}
  .sidenav-btn{display:none}
  .sidenav-title{display:block; margin:0 0 8px 14px; font-size:.75rem; letter-spacing:.08em; text-transform:uppercase; color:var(--muted)}
  .sidenav ol{display:block; position:static; max-height:none; overflow:visible; padding:0; background:none; border:0; border-left:1px solid var(--line); border-radius:0; box-shadow:none}
  .sidenav a{margin-left:-1px}
  section{scroll-margin-top:16px}
}
```

The negative top margin and `top:32px` assume `body` has 32px of top padding and 16px side padding; match them to the page's actual padding.

```js
var nav = document.getElementById('sidenav');
var navBtn = nav.querySelector('.sidenav-btn');
function setOpen(open) { nav.classList.toggle('open', open); navBtn.setAttribute('aria-expanded', String(open)); }
navBtn.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
document.addEventListener('click', function (e) { if (!nav.contains(e.target)) setOpen(false); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); navBtn.focus(); } });

var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
function setActive(id) {
  links.forEach(function (a) {
    var on = a.getAttribute('href') === '#' + id;
    a.setAttribute('aria-current', String(on));
    // keep the active link in view when the pane itself scrolls (wide layout only)
    if (on && nav.scrollHeight > nav.clientHeight && (a.offsetTop < nav.scrollTop || a.offsetTop + a.offsetHeight > nav.scrollTop + nav.clientHeight)) {
      nav.scrollTop = a.offsetTop - nav.clientHeight / 2;
    }
  });
}
if ('IntersectionObserver' in window) {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id); });
  }, { rootMargin: '-30% 0px -65% 0px' });
  document.querySelectorAll('main section[id]').forEach(function (s) { io.observe(s); });
}
```

### Verify before delivering

Before calling it done:
- Open the file in a real browser (the built-in browser pane, or Claude in Chrome) — don't just eyeball the source.
- Check both light and dark mode actually render correctly.
- Check the nav at a wide width (the left pane is visible without clicking anything and stays put while the page scrolls) and at a narrow width (it becomes the top bar, the "Sections" button opens and closes the list, and a jumped-to heading isn't hidden under the bar). In both, links work and the current-section highlight updates on scroll.
- Check the browser console for errors.
- If the page has a CSS-grid diagram, check it at a narrow width too — grids that assume desktop width should degrade to a stacked layout rather than breaking.
- Confirm there are no external network calls (no CDN `<script src>`, no remote fonts/images) — everything must be inline.

## Markdown version

Mirror the HTML's content and heading structure in plain Markdown: same sections, same tables (as Markdown tables), same scenario walkthroughs, same references list. Drop anything that's purely visual/interactive (the theme toggle, the nav menu, CSS-grid diagrams) — render a diagram as a simple ASCII/text sketch or just describe the flow in prose instead. The goal is that someone reading only the `.md` file gets the same information, just without the visual polish.

## Where to save and how to deliver

- **Project documentation** (about one project: its architecture, setup, stack, a decision made for it): save both files into that project's `docs/` folder, creating it if it doesn't exist.
- **Research documentation** (cross-project research, tool or vendor comparisons, build-vs-buy studies with no single project as its home): ask the user where it goes, or use a general documentation folder if one is already established in the conversation.
- Name both files the same way aside from extension (`topic-name.html`, `topic-name.md`).
- Deliver as files — most sessions can present files directly (`present_files` or similar); use that. If an Artifact-creation tool happens to be available and works in the current session, that's a fine alternative to offer, but don't depend on it — file delivery via the project folder is the dependable path and should be the default plan going in.

## A note on tone

These are explainer docs, often read by someone who isn't already deep in the topic. Write like you're teaching, not logging. Favor plain language over jargon where you can, and when you do use a technical term, it's fine to define it briefly in passing rather than assuming it's known.
