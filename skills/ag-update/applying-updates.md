# Applying an AG update

This guide explains how to apply the update reports produced by the ag-update skill.

Reports are created by the `analyse-update.js` NodeJS script. When the script runs successfully the stderr will contain a path to a folder.

## The update process

The command output walks you through verifying that the reports are correct (checking the scan
and the target version, re-running if needed). Once the reports are correct, apply them by
following the steps below.

### Step 1 — Remove OPTIONAL changes that the user does not want to apply

Each change has an optionality section, which will initially have one of three values:

- `MANDATORY` changes can not be rejected
- `DECISION_REQUIRED MITIGATE_TO_ACCEPT` changes are optional; to reject the change delete it from the plan; to accept the change apply the steps in the mitigation section.
- `DECISION_REQUIRED DISCARD_TO_ACCEPT` are optional; to reject the change apply the steps in the mitigation section; to accept the change delete it from the plan.

1. Search for DECISION_REQUIRED in the report files to get a list of optional changes
2. If there are a very large number of results, you may batch them into smaller groups to make it easier
3. Present the decision required changes to the user and obtain a decision about whether to accept or reject the change
4. Based on the answers from the user:
   - Delete changes that should not be applied. These are either MITIGATE_TO_ACCEPT that the user rejected, or DISCARD_TO_ACCEPT that the user accepted
   - Update changes that should be applied, replacing DECISION_REQUIRED with `DECIDED (**should** apply mitigation below)`

### Step 2 — Plan the implementation

Each project report lists changes that MIGHT be required, based on the products in use and (where possible) detecting what features are in use by searching the codebase for specific strings. For each change you need to:

1. Determine whether the change actually affects the application. In order to do this you will need to read the change, understand the application structure, and determine whether the application is affected. For example a change might read "When using feature X, process Y must be carried out before performing action Z". If the application does not in fact use feature X, or already carries out process Y before performing action Z, the change does not apply.
2. Carry out the steps in the mitigation section of the change record.

Decide whether there are so many changes that it's necessary to split the work into phases. The changes are organised by major version, allowing you to upgrade one major at a time in the case of large upgrades. Remember however: AG products depend on each other, so it's usually best to upgrade all projects in the workspace and all ag dependencies (grid, charts, studio) in lockstep incrementing one major at a time. Only introduce a phased migration if the set of changes are genuinely too big to do in one go for the current class of model. False-positive changes that are listed in the report but do not apply to the application are common. Before introducing a phased migration, consider researching each change to determine if it applies, this may make the list of real work substantially smaller.

### Step 3 — Execute

Apply the surviving changes, handling each according to its Type (see "How to handle each type").
Use your knowledge of the application's coding conventions and structure as you go.

### Step 4 — Review style changes and QA

Collect the STYLE changes from the reports and present them to the user so they can confirm they
are happy with the new appearance. Fold this into a wider manual QA pass that flags the parts of
the grid/chart that have changed, so the user can review them in the running application.

### Step 5 — Verify

Use the project's own tooling to validate the result: build, typecheck, tests, and running the
dev server / application in a browser.

## Understanding a change

Every change in a report is presented in this format:

    Type: TRANSITION | REQUIREMENT | BEHAVIOUR | STYLE | DEPENDENCY
    Optionality: MANDATORY | OPTIONAL (explanation)

### Type

- **TRANSITION** — an old API is being removed and replaced with a new one. Once the removal is
  complete, code written against the old API will fail to work.
- **REQUIREMENT** — a new requirement on how to use the APIs correctly. Code that does not meet
  the requirement may continue to work but behave incorrectly.
- **BEHAVIOUR** — the default behaviour of the product is changing.
- **STYLE** — the default visual appearance of the product is changing.
- **DEPENDENCY** — there is a new minimum version of a dependency such as TypeScript or React.

### Optionality

- **MANDATORY** — must be applied for the updated project to work correctly.
- **OPTIONAL** — the project still works if the new default is accepted as-is. The parenthesised
  explanation says what accepting-as-is means, and why you might still choose to act.

### How to handle each type

- **TRANSITION** — Apply the mitigation to replace every use of the old API with the new one. The
  "Detected in" occurrences are a starting point, not a guarantee of completeness.
- **REQUIREMENT** — Adjust the code to satisfy the new requirement. Because the old code may not
  fail loudly, verify behaviour after applying.
- **BEHAVIOUR** — Decide whether the new default is acceptable. If so, no change is needed; if
  not, apply the mitigation to restore the previous behaviour.
- **STYLE** — Handle as a visual review item (Step 4): accept the new appearance, or apply the
  mitigation (usually a theme parameter) to restore the old one.
- **DEPENDENCY** — Ensure the named dependency meets the new minimum version. Only relevant if the
  project actually uses that dependency or framework wrapper.
