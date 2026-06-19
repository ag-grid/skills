---
name: ag-update
description: Update AG Grid and/or AG Charts to a newer version
---

## Rules

- Never use or mention the AG Grid codemod or MCP server. They are not relavent to the task you are now completing
- Follow the process documented below exactly
- If you are instructed "Tell the user X" then show the message to the user and **continue**.
- If you are instructed "Ask the user X" then show the question to the user and **stop**. Do not continue until you receive a response. If you have a tool available designed to ask the user a question you may use it.
- This skill consistes of a set of sequential steps, each of which writes a file with results. Ensure that the file is written before moving on to the next step. DO NOT combine steps, or refer to information in future steps while handling a previous step.

## Explain process to user

Tell the user "Welcome to the AG Update skill. Let's start by gathering some context on your application"

## Version check

- Read `VERSION.md` in this skill folder. Fetch the latest: `https://raw.githubusercontent.com/ag-grid/skills/main/skills/ag-update/VERSION.md`.
- Compare as semver:
  - If patch or minor differs: Prominently tell the user that a new version has been released, show the new and currently installed version, suggest quitting claude and running `npx skills update ag-grid/skills`. Ask the user if they'd like to continue with this old skill version, suggesting they they type "continue" to do so.
  - Major differs: Prominently tell the user that their current skill version is incompatible and will not work, show the new and currently installed version, tell them to quit claude and run `npx skills update ag-grid/skills` before resuming. Stop. The skill invocation is now finished. Regardless of the user response, do not follow any of the other instructions in this file.

## Check for clear plan

- Look for files matching `AG_UPDATE_*.md` in the current directory
- If any exist, then ask the user whether they'd like to start fresh and delete these files or resume.
  - If they select start fresh, delete the `AG_UPDATE_*.md` files
  - If they select resume, continue with the skill and skip the stages for which the files have already been generated

## Determine scope

This section populates the AG_UPDATE_SCOPE.md file

1. Determine the full set of potential projects to update. There are instructions in the file `determine-scope.md`. If you have access to sub-agents, give that file path to a sub-agent and ask it to report the results to you. Otherwise follow the steps yourself. If this skill was invoked with instructions to upgrade specific projects, pass that to the sub agent.
2. Determine whether this update is grid-only, charts-only, or grid & charts. In the case of grid-only or charts-only repos, **do not mention the other product**. There is no need to confuse the process by referring to a product that the user does not have installed on.
3. Determine the latest versions of the product(s) in use with `npm view ag-grid-community version` and/or `npm view ag-charts-community version`
4. Tell the user which projects you found, what current versions they're on, and the latest version you propose updating to. Ask them if they'd like to continue, giving them the option to change the target version, or select a subset of projects if applicable.
5. Record the user's decisions in AG_UPDATE_SCOPE.md before continuing. Under `## Projects to update` record the projects and dependencies in exactly the same 2-level markdown list format as it was generated in, removing any projects that the user indicated that they did not want to update. Under `## Target versions` record the target version of grid and/or charts to update to.

## Determine the full set of changes

This stage populates the AG_UPDATE_CHANGES_RAW.md file

1. Determine the full set of potential changes to make. There are instructions in the file `determine-changes.md`. If you have access to sub-agents, give that file path to a sub-agent and ask it to report the results to you. Otherwise follow the steps yourself. Pass the sub-agent the data recorded in AG_UPDATE_SCOPE.md
2. Write the results verbatim to AG_UPDATE_CHANGES_RAW.md before continuing to the next step.

## Make an update plan

This stage populates the AG_UPDATE_CHANGES_APPROVED.md file

1. Summarise the changes in AG_UPDATE_CHANGES_RAW.md to the user. Surface the information most important for a senior engineer to make a decision. If there is a large amount of detail, refer the user to regions in the AG_UPDATE_CHANGES_RAW.md file rather than printing large amounts of text to the chat. For the summary:
   - Breaking changes: these can be summarised as a sentence or paragraph. Since they are non-optional, details aren't important, just note the names of APIs affected e.g. "Update 3 grid options to new versions: optionA, optionB, optionC"
   - Ignored breaking changes: very low priority just say e.g. "Ignoring 28 breaking changes on APIs not in use, see AG_UPDATE_CHANGES_RAW.md for details"
   - Optional changes: for changes involving deprecated APIs, the user has the choice of updating now or continuing to use the deprecated API. This is an important choice and needs enough context to make the decision, including old API, new api, and a link to the migration guide or documentation covering the change if one exists.
   - Behaviour changes: these are instances where the grid's default behaviour has changed. The user must decide whether the new behaviour is desirable.
2. Ask the user which changes to apply. Make clear that breaking changes are always applied, and a decision must be made on whether to apply optional changes, and whether to revert to the old behaviour in the case of behaviour changes.
3. Write a file AG_UPDATE_CHANGES_APPROVED.md that contains all the changes that the user has decided to make and OMITS anything that is not being done, so no "Ignored breaking changes" section, and no mention of any optional changes or behaviour changes that the user has decided not to act on for now.

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
