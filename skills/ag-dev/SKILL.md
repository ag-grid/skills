---
name: ag-dev
description: Write, edit or plan code or features relating to AG Grid, AG Charts or AG Studio
---

## Be aware of the AG products in use, and their versions

## Before you start: is this an UPDATE task?

**If the task is a version UPDATE or MIGRATION — bumping the installed version, applying breaking-change migrations, or moving off a deprecated API as part of a version change — STOP and use the `ag-update` skill instead.** `ag-dev` builds/configures/debugs at the _current_ version. Hand it over and stop.

## Never fabricate

Do **not invent** option names, API shapes, module names, package names, version numbers, or error numbers — training data is saturated with old and hallucinated APIs. If a fact is not in the reference you opened, retrieve and verify it (official docs, the installed package's type definitions, or console output) or tell the user you are unsure. Do not guess a plausible-looking name.

## Detect the product first

Identify which product(s) the task uses — **AG Grid**, **AG Charts**, or **AG Studio** — from dependencies, imports, and the task text, then load references under `references/<product>/`. Integrated charts is a **Grid** feature → grid.

Only `references/grid/` exists so far. AG Charts and AG Studio references are not yet authored — for those, apply the same principles (never fabricate; verify names against docs/type defs) and retrieve specifics.

## Errors — read the console

If a grid misbehaves, watch the console for `AG Grid: error #<n>` / `warning #<n>`. In v33+ the full message text only prints when `ValidationModule` is registered (register it in dev); production shows just a bare number + doc link. Resolve **any** number by fetching `https://www.ag-grid.com/javascript-data-grid/errors/<n>/`. The dominant new-code error is **#200 — module not registered** (see `references/grid/versions.md`).

## Routing — AG Grid

Read the whole file you land on. A task can span rows (e.g. "why is my Enterprise feature blank" = capabilities + recommendations) — open both from here. Framework is handled _within_ `recommendations.md` (read General + your framework subsection); the router does not branch on framework.

| When the task is…                                                                                                                                                                                                                | Open                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Writing or debugging grid code — how to do X, why isn't this working, a blank/broken grid, state resetting on update, a cell/feature not showing, which feature to choose (row model, renderer vs formatter vs getter vs editor) | `references/grid/recommendations.md` |
| The model emitted a pre-v33 pattern — scoped `@ag-grid-*` packages, CSS-file themes, no module registration, a removed option name — and you need the current equivalent                                                         | `references/grid/versions.md`        |
| Is X Community or Enterprise; will it work without a licence                                                                                                                                                                     | `references/grid/capabilities.md`    |
