---
name: workday-tracker
description: House rules for a personal daily task-tracker artifact on claude.ai (a simple Up Next / Waiting On / Done list) — task types, completion comments, ticket refs, status tracking. Use whenever the user asks to add, update, complete, or review items in their personal task tracker artifact, or asks to extend that artifact's own features.
---

# Workday tracker

Many people keep a personal, day-to-day task list as a claude.ai artifact — a simple list with sections like "Up Next," "Waiting On," and "Done." This skill defines house rules for working with that kind of artifact: richer task fields than the bare-bones default, enforced consistently whenever the user asks to add, complete, or review tasks in it.

This is about a personal task tracker, not a team/project tracker — don't apply these rules to a project-management tool or a separate project-tracking mod if the user has one of those too; ask which one they mean if it's ambiguous.

## Finding the tracker

The user's tracker is whichever artifact they're pointing at — by a link they share, by name ("my workday tracker," "my task list"), or by context if there's only one such artifact already in play in the conversation. If there's no existing tracker artifact and the user asks to start one, create a new artifact with the baseline shape below plus the enhanced fields from the start, rather than building a second, different tracker.

## Baseline shape to expect

A typical starting point looks like: a header (title + date), an add-task box (choose a status column at creation, e.g. "Up next" or "Waiting"), a few sections — Up Next, Waiting On, Done (with a "Clear done" action) — and each task row with a checkbox, a status tag, an "added X day" timestamp, and a Remove link. It won't have task types, comments, or a ticket field built in by default — those are what this skill adds.

## Rules to apply

1. Task type — every task is one of: `normal task`, `idea`, or `follow-up`. Ask which type if the user doesn't say, defaulting to `normal task` only for clearly actionable to-dos; ask rather than guess for anything that sounds like a stray thought (likely `idea`) or something waiting on another person/system (likely `follow-up`).
2. Completion requires a comment — a task cannot be marked done without a short comment describing what was actually done or decided. If the user says "mark X done" without one, ask for the comment before completing it rather than completing it blank.
3. Optional ticket reference — a task can have a ticket/issue reference (e.g. a Jira/Linear key or URL). It can be added at creation time or attached later to an existing task — never required.
4. Short status comment — tasks can carry a brief, ongoing status note (distinct from the completion comment) that gets updated over time to reflect current progress, e.g. "blocked on DNS change" or "waiting on review." This is freeform and optional, meant for anything that sits for more than a day.

## How to apply

- If the user asks to add/update/complete a task and the artifact's current code doesn't yet have a field this needs (type, ticket ref, status comment, completion-comment prompt), extend the artifact's own code to add it — don't just track the extra info in chat while leaving the artifact itself unchanged. The artifact should stay the single source of truth the user actually looks at.
- When extending the UI, keep it consistent with the existing look (plain, utilitarian, no heavy styling) rather than redesigning it wholesale unless asked.
- Use the artifact/update-artifact tooling available in the current session to make these edits live, rather than just describing changes.
- If asked to just "add a task" with no other detail, it's fine to create it as a `normal task` with no ticket ref or status comment — those stay optional until the user wants to add them.
