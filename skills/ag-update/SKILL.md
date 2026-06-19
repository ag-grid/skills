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

- Look for AG_UPGRADE_INFO.md or AG_UPGRADE_PLAN.md in the current directory
- If either exist then ask the user whether to proceed, making clear that proceeding will result in these files being rewritten
  - If the user opts to proceed with these files in place, truncate them (replace with emptry text content)

## Validate scope of change

- Determine the projects to operate on. A "project" is a folder containing a package.json.
  - If this skill was invoked with instructions to upgrade specific projects, use them
  - Otherwise, recursively find all projects in the current directory that contain dependencies starting "ag-grid-" or "ag-charts-". Ignore projects that are not part of the software in this folder, e.g. inside node_modules and build artefacts. Show these projects to the user and ask them which they want to update.
- Determine the products, frameworks and library versions in use for each project
  - The product is "grid" or "charts" as indicated by the dependencies, and it is valid for a project to have both grid and charts products.
  - The version is determined by the library version in package.json
- If more than one framework or more than one version of the same ag dependency is in use across the projects, they can not be updated together. Tell this to the user, suggest that they run the skill on a smaller set of projects, and stop. The skill invocation is now finished. Do not follow any of the other instructions in this file.

## 1. Determine context

Draft process:

Context: keep log

1. If `AG_UPGRADE_PLAN.md` exists prompt to delete it
2. Determine projects
3. Determine products and versions
4. Bail if not a simple process
5. Propose version(s) to user and ask for confirmation
6. Extract full set of breaking changes and behaviour changes TODO split out into reference file
   - Launch one sub-agent each for for grid and charts as appropriate
   - Load grid.md or charts.md as appropriate
   - Establish full set of documentation URLs
   - TODO support multiple products
   - Pass full documena
   - Find them in the docs pages
   - Establish search term to work out if we're affected
   - Add 3 headings to the document, `## Applicable breaking changes`, `## Ignored breaking changes`, `## Behaviour changes` and `## Optional changes`

- Determine the latest available version with `npm view <package> version` for the `ag-grid-community` and `ag-charts-community` packages. Propose a target to the user.
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
