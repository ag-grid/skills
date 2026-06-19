---
name: ag-update
description: Update AG Grid and/or AG Charts to a newer version
---

## Rules

- Never use or mention the AG Grid codemod or MCP server. They are not relavent to the task you are now completing
- Follow the process documented below exactly
- If you are instructed "Tell the user X" then show the message to the user and **continue**.
- If you are instructed "Ask the user X" then show the question to the user and **stop**. Do not continue until you receive a response. If you have a tool available designed to ask the user a question you may use it.

## Explain process to user

Tell the user "Welcome to the AG Update skill. Let's start by gathering some context on your application"

## Version check

- Read `VERSION.md` in this skill folder. Fetch the latest: `https://raw.githubusercontent.com/ag-grid/skills/main/skills/ag-update/VERSION.md`.
- Compare as semver:
  - If patch or minor differs: Prominently tell the user that a new version has been released, show the new and currently installed version, suggest quitting claude and running `npx skills update ag-grid/skills`. Ask the user if they'd like to continue with this old skill version, suggesting they they type "continue" to do so.
  - Major differs: Prominently tell the user that their current skill version is incompatible and will not work, show the new and currently installed version, tell them to quit claude and run `npx skills update ag-grid/skills` before resuming. Stop. The skill invocation is now finished. Regardless of the user response, do not follow any of the other instructions in this file.

## Check for clear plan

- Look for AG_UPDATE_SCOPE.md or AG_UPDATE_CHANGES.md in the current directory
- If either exist, then:
  - if you were invoked with specific instructions to "resume the in-progress migration", then continue with this skill, but at each step, if it seems that the information produced by that step is already fully present in these files, skip the step.
  - otherwise, ask the user whether to proceed, making clear that proceeding will result in these files being rewritten, and if the user opts to proceed the delete the AG_UPDATE_SCOPE.md or AG_UPDATE_CHANGES.md files.

## Determine scope

This section populates the AG_UPDATE_SCOPE.md file

1. Determine the full set of potential projects to update. There are instructions in the file `get-scope-of-update.md`. If you have access to sub-agents, give that file path to a sub-agent and ask it to report the results to you. Otherwise follow the steps yourself. If this skill was invoked with instructions to upgrade specific projects, pass that to the sub agent.
2. Determine whether this update is grid-only, charts-only, or grid & charts. In the case of grid-only or charts-only repos, **do not mention the other product**. There is no need to confuse the process by referring to a product that the user does not have installed on.
3. Determine the latest versions of the product(s) in use with `npm view ag-grid-community version` and/or `npm view ag-charts-community version`
4. Tell the user which projects you found, what current versions they're on, and the latest version you propose updating to. Ask them if they'd like to continue, giving them the option to change the target version, or select a subset of projects if applicable.
5. Record the user's decisions in AG_UPDATE_SCOPE.md before continuing

## Determine the

This stage populates the AG_UPDATE_CHANGES.md file

!!!PROGRESS!!! same deal here, sub-agent, surface results, ask user

1. Determine projects
2. Determine products and versions
3. Bail if not a simple process
4. Propose version(s) to user and ask for confirmation
5. Extract full set of breaking changes and behaviour changes TODO split out into reference file
   - Launch one sub-agent each for for grid and charts as appropriate
   - Load grid.md or charts.md as appropriate
   - Establish full set of documentation URLs
   - TODO support multiple products
   - Pass full documena
   - Find them in the docs pages
   - Establish search term to work out if we're affected
   - Add 3 headings to the document, `## Applicable breaking changes`, `## Ignored breaking changes`, `## Behaviour changes` and `## Optional changes`

- Identify any legacy/removed packages in use and the migrations they force (see the product reference files).
- Gather changes: for each version step and each in-scope framework, load the correct upgrade page (URL patterns in the product reference files) and extract the relevant change categories. Charts pages classify changes as must-fix, sign-off, and advisory — see `references/charts.md`.

## 2. Build the upgrade plan

Write a plan file (e.g. `AG_UPDATE_PLAN.md`) with these sections:

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
