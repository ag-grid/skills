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
- If a step tells you to execute the "roadblock process" that means briefly describe the issue to the user, then ask whether they would like to continue anyway or stop.
- If you hit a significant issue while trying to follow this process, for example: a file that the process asks you to read is not available, or the process is clearly making an assumption that is not met by your current codebase; then execute the roadblock process even if the current step does not explicitly tell you to.

## Roadblock process

If asked to execute the roadblock process

## 0. Version check

- Read `VERSION.md` in this skill folder. Fetch the latest: `https://raw.githubusercontent.com/ag-grid/skills/main/skills/ag-update/VERSION.md`.
- Compare as semver:
  - If patch or minor differs: Prominently tell the user that a new version has been released, show the new and currently installed version, suggest quitting claude and running `npx skills update ag-grid/skills` before resuming or typing "continue" to ignore and continue with the current version. Stop and wait for user response.
  - Major differs: Prominently tell the user that their current skill version is incompatible and will not work, show the new and currently installed version, tell them to quit claude and run `npx skills update ag-grid/skills` before resuming. Stop. The skill invocation is now finished. Regardless of the user response, do not follow any of the other instructions in this file.

## 1. Determine context

- Determine the projects to operate on
  - If you were invoked with instructions to upgrade specific projects, use them
  - Otherwise, recursively find all package.json files in the current directory that contain the strings "ag-grid-" or "ag-charts-". Show these to the user and ask them which they want to update.
- Determine the framework and library version in use for each project
  - The framework is "react", "vue", "angular" or "javascript" depending on the kind of application in the project
  - The version is determined by the library version in package.json
- If any projects use different frameworks, or have different versions of the same ag package, they can not be updated together. Explain this to the user, suggest that they run the skill on a smaller set of projects, and stop.
- Load references/grid.md if there are grid packages, and follow the rules within.
- Load references/charts.md if there are charts packages, and follow the rules within.
- Determine the latest available version with `npm view <package> version`. Propose a target to the user.
- Identify any legacy/removed packages in use and the migrations they force (see the product reference files).
- Gather changes: for each version step and each in-scope framework, load the correct upgrade page (URL patterns in the product reference files) and extract the relevant change categories. Charts pages classify changes as must-fix, sign-off, and advisory — see `references/charts.md`.

## 2. Build the upgrade plan

Write a plan file (e.g. `AG_UPGRADE_PLAN.md`) with these sections:

- Upgrade one major version at a time; commit after each successful step.

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

Once all steps have completed successfully, delete the plan file you created in step 2 (it is a
working artifact, not something to leave in the user's project).

Summarise versions moved, steps completed, mitigations applied, and anything left outstanding.
