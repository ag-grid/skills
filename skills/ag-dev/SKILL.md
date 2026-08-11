---
name: ag-dev
description: Use BEFORE writing or changing any code that touches AG Grid, AG Charts or AG Studio - including adding or configuring columns, themes, styling, cell rendering, data or any grid/chart feature, and when planning such work. Grounds the code in the APIs that exist in the version in use, instead of recalled ones.
---

## Be aware of the AG products in use, and their versions and wrapper framework

Products in use may be obvious from the context, if not it can be determined from the package that features are imported from:

- `grid` packages start @ag-grid- or ag-grid-
- `charts` packages start ag-charts-
- `studio` package is ag-studio or starts ag-studio-

{product} below refers to grid, charts or studio.

Versions can be determined from project's package.json or by reading the installed library's package.json inside node_modules

Framework is `react`, `vue`, `angular` if using those frameworks, `javascript` for Vanilla JS apps or for apps on any other framework (e.g. Svelte, Solid).

## For package version updates, use the ag-update skill

This skill ships with a sibling skill, "ag-update". Delegate to it when asked to update grid, charts or studio packages.

## Don't guess

Whenever writing code, you must have a clear source for the APIs you use, whether that's following existing patterns, instructions from the user or consulting our docs. If you're unsure, do research to ground your actions.

## Prefer the purpose-built feature over a general-purpose primitive

Where the product ships a dedicated feature for what you are building, use it — even when a lower-level primitive (a `valueGetter`, a custom cell renderer, hand-rolled state or your own event wiring) would produce the same visible result.

The dedicated feature is understood by the rest of the product: sorting, filtering, aggregation, export, the UI affordances and future versions all know what it is. A primitive is opaque application code that the product cannot reason about, so behaviour that should come for free has to be re-implemented and kept in step by hand.

"The primitive renders the right value" is therefore not a reason to reject the built-in feature, and neither is the built-in feature being newer. If it is an Enterprise feature and Enterprise is available to the project, that is not a reason to avoid it either — see the module-registration guidance in the product recommendations.

**Check before you implement, not after.** You cannot prefer a feature you do not know exists, and your training data lags the current version — so the fact that a capability is unfamiliar to you is not evidence that it is unsupported. Before implementing any requested capability with a primitive, scan `references/{product}/documentation-index.md` for a slug describing that capability (whatever it is — a filter type, an export format, a selection or layout behaviour, and so on). If a slug plausibly matches, read that page before writing the primitive.

## By default consult the docs

When writing code you will encounter two problems:

1. Your training data contains many deprecated and removed APIs and package names and may not have newer APIs.
2. APIs have non-obvious edge cases and interactions with other features.

The solution to both of these is to consult the documentation.

If it is clear exactly what API to use, eg you are following a detailed plan that names specific APIs, or there are other examples in the codebase to copy, you may write code directly.

Otherwise if there is uncertainty, check the docs. To find the correct docs URL for the version in use, load `references/{product}/documentation-index.md` and follow the instructions in that file.

Locate the feature you are working with in the docs and read surrounding paragraphs to get information on edge cases and interactions. If many docs pages seem potentially relevant, consider getting a sub-agent to read them all and extract information relevant to the task.

## Load product-specific recommendations

`references/{product}/recommendations.md` contains specific advice for each product including known LLM failure modes and key APIs that have changed between versions. Load it and take it into account when developing.
