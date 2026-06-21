Follow these steps to determine the full set of changes that may potentially be applied when updating a set of projects between two grid versions

## Input

The file AG_UPDATE_SCOPE.md in the current directory contains a list of ag package dependencies organised by project, as well as the target versions of grid and charts dependencies

## Output

The output is a file AG_UPDATE_CHANGES_RAW.md written beside AG_UPDATE_SCOPE.md. It lists all changes that must be applied, grouped using markdown headings first by product (`# Grid` and `# Charts`) then by MAJOR version transition (`## Grid v{FROM}.x -> v{TO}.x`) then by change type and description (eg `### {TYPE}: {DESCRIPTION}`).

The content of each change section is two paragraphs. The first starts "Change: " and describes the change made in the ag dependency that may require the project to be updated. Prefer copying the description from the update documentation page verbatim if appropriate. The purpose is for a human to be able to understand the change and decide whether to apply it. The second paragraph starts "Mitigation: " and describes the update required in the application to mitigate the change.

### Change type

Each change has one of these types:

- BREAKING: code written for the old version of the library will fail on the new version unless code changes are made. The mitigation describes the change to make to allow the project to function after updating the library dependency.
- BEHAVIOUR: the default behaviour changed and the user must decide whether to accept this new behaviour or restore the old behaviour. The mitigation describes the steps required to restore the old behaviour.
- DEPENDENCY BLOCKER: as a precondition of migrating to this version, a framework (React, Vue, Angular or Typescript) must be updated to a new version.

### Example

An example file with a single change record:

> # Grid
>
> ## Grid v31.x -> v32.x
>
> ### BEHAVIOUR: New column menu now enabled by default
>
> Change: The new (flat) format column menu is now enabled by default.
> Mitigation: The legacy tabbed column menu can be enabled via columnMenu = 'legacy'. If providing a column header component template (colDef.headerComponentParams.template), this now requires an eFilterButton element

## Documentation URLs

Documentation URLs include the framework. Frameworks are `react`, `angular`, `vue`. You can determine the framework in use by checking the framerwork wrapper dependency. If no framework is in use, use `javascript`.

Grid documentation URLs are `https://www.ag-grid.com/{framework}-data-grid/upgrading-to-ag-grid-{version}/` where version is a major version from 26 to 36 inclusive.

Charts documentation URLs are `https://www.ag-grid.com/charts/{framework}/upgrade-to-ag-charts-{version}/` where version is a major version from 9 to 14 inclusive.

## Extracting changes from the documentation website

- for each product in use (grid and/or charts):
  - for each major version greater than the earliest current dependency version and less than or equal to the target version:
    - read the page at the documentation URL and extract a full list of changes. For each change:
      - Determine whether the change applies to any project. False positives are acceptable, false negatives are not. Some documented changes may specify a process for determining if a project is affected. Otherwise, search for usage of the affected APIs. If in doubt, assume that a project IS affected and include the change.
        - If a change does not affect any project, skip it and continue to the next change.
      - classify the changes according to these rules:
        - BREAKING if an API or package is no longer available and updating is mandatory. Removals of deprecated APIs count as breaking changes.
        - BEHAVIOUR if the same code is valid, but produces different results (on some documentation pages, changes that are clearly behavioural are wrongly flagged as breaking, look at each change to classify it)
        - DEPENDENCY BLOCKER if the page indicates an increase in the minimum required version of angular, react, vue or typescript is needed
        - Ignore deprecations and additions of new APIs
      - Create a Mitigation section. If the docs has precise mitigation instructions, copy it verbatim. If the instructions are long, replace them with a URL and indication of where in the page to find the content.
    - add the changes to the appropriate level-2 heading in the output file

## Special rules

After generating the structured list of changes, validate it against these rules

### Package-related changes

[./packages.md], contains a list of packages that have been removed in a specific version. Cross-reference the list of changes against this file. If a package in use is no longer available in the target version, ensure that there is a BREAKING entry in the list of changes. If there is not, add one.

### Module registration

If the list of upgrade versions includes v33, this is the version at which module registration becomes required. Application projects (those that create grids) must have a `ModuleRegistry.registerModules` call activating the modules they require does not already contain `ModuleRegistry.registerModules` is migrating to modules, ensure that the mitigation steps include both a requirement to register the correct modules, and a link to the migration guide `https://www.ag-grid.com/{framework}-data-grid/upgrading-to-ag-grid-33/#migrating-from-packages`

### Theming

v33 introduced the Theming API. Legacy themes are deprecated but not removed. This skill should not attempt to migrate applications from legacy themes to the Theming API. If a project is being updated across v33, ensure that there is a BREAKING record stating that it is necessary to pass the string "legacy" to the `theme` grid option.

## Reporting format

Write the result of this process to the file `AG_UPDATE_CHANGES_RAW.md`.
