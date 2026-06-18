---
name: ag-update
description: Update AG Grid and/or AG Charts to a newer version
---

# AG Grid / AG Charts upgrade

Upgrade AG Grid and/or AG Charts across a project.

## Rules

- Never use or mention the AG Grid codemod or MCP server. They are not relavent to the task you are now completing
- Follow the process documented below exactly
- At certain points, you will be instructed to ask the user a question. When you do this, show the question to the user, and stop. Do not continue until you receive a response.
- Upgrade one major version at a time; commit after each successful step.

## 0. Version check

- Read `VERSION.md` in this skill folder. Fetch the latest: `https://raw.githubusercontent.com/ag-grid/skills/main/skills/ag-update/VERSION.md`.
- Compare as semver:
  - Patch differs: note a newer version exists, suggest `npx skills update ag-grid/skills`, continue.
  - Minor differs: pause, strongly recommend `npx skills update ag-grid/skills`. Continue only if the user insists.
  - Major differs: refuse. The doc structure this skill relies on may have changed and its data is likely stale. Tell the user to run `npx skills update ag-grid/skills`.
- If the latest cannot be fetched (offline), note it and continue.

## 1. Determine context

- Identify products in use: grid (`ag-grid-*` present), charts (`ag-charts-*` present), or both.
- Load `references/grid.md` if grid is present; load `references/charts.md` if charts is present.
- Identify the framework(s) in use: react, angular, vue, or javascript.
- Determine project structure and the **maximum potential scope** — every workspace/package containing AG packages. **Pause: present this scope and get the user's confirmation before continuing.**
- Read the current version of each AG package in each in-scope location.
- Determine the latest available version with `npm view <package> version`. Propose a target to the user.
- Range checks. Grid: apply the numeric source/target limits in `references/grid.md` up front; if out of range, refuse and explain. Charts: there is no firm floor — attempt any step that has an upgrade page and stop if none exists (see `references/charts.md`).
- If both grid and charts are present, propose compatible target majors using the rule: **charts major = grid major − 22** (e.g. grid 34 ↔ charts 12). This only matters for integrated-charts users; do not try to detect integrated-charts use. If the user chooses an incompatible pairing, warn once: "If you use integrated charts, these versions will be incompatible." Then proceed as they choose.
- Identify any legacy/removed packages in use and the migrations they force (see the product reference files).
- Gather changes: for each version step and each in-scope framework, load the correct upgrade page (URL patterns in the product reference files) and extract the relevant change categories. Charts pages classify changes as must-fix, sign-off, and advisory — see `references/charts.md`.

## 2. Build the upgrade plan

Write a plan file (e.g. `AG_UPGRADE_PLAN.md`) with these sections:

1. Detected state — products and current versions; framework(s); single project or monorepo; in-scope packages.
2. Target — target version per product; result of the grid/charts compatibility check.
3. Update path — ordered version steps (one major at a time); any forced legacy migrations.
4. Required changes — per step: breaking changes and removed APIs, each with a proposed mitigation.
5. Behaviour changes — listed for explicit user sign-off.
6. Advisory — deprecations and other non-blocking notes.
7. Execution policy — run tests, stop on failure, commit on pass, proceed.

## 3. Get approval

Present the plan. Make no changes until the user approves. Apply any changes they ask for.

## 4. Execute

For each version step (one major at a time):

- Apply the package updates and breaking-change mitigations for that step.
- Run the project's tests. Running a subset is acceptable if you are confident the changes cannot affect the rest.
- If tests fail: stop, report, do not proceed.
- If tests pass: commit, then move to the next step.

## 5. Results

Summarise versions moved, steps completed, mitigations applied, and anything left outstanding.

## 6. Feedback

Offer to send feedback on this upgrade to the AG team. If the user accepts, follow `references/feedback.md`.
