Follow these steps to determine the full set of changes that may potentially be applied when updating a set of projects between two grid versions

## Input

The file AG_UPDATE_SCOPE.md in the current directory contains a list of ag package dependencies organised by project, as well as the target versions of grid and charts dependencies

## Output

The output is a file AG_UPDATE_CHANGES.md written beside AG_UPDATE_SCOPE.md.

The file starts with a verbatim copy of the content in [./changes-file-preamble.md]

Following the preamble there is a list of all changes that must be applied, grouped using markdown headings first by product (`# Grid` and `# Charts`) then by MAJOR version transition (`## Grid v{FROM}.x -> v{TO}.x`) then by change type and description (eg `### {TYPE}: {DESCRIPTION}`).

The content of each change section is two paragraphs. The first starts "Change: " and describes the change made in the ag dependency that may require the project to be updated. Prefer copying the description from the update documentation page verbatim if appropriate. The purpose is for a human to be able to understand the change and decide whether to apply it. The second paragraph starts "Mitigation: " and describes the update required in the application to mitigate the change IN GENERAL TERMS. DO NOT include any analysis specific to the projects being migrated, that is a job for a later agent.

### Change type

Each change has one of these types:

- BREAKING: code written for the old version of the library will fail on the new version unless code changes are made. The mitigation describes the change to make to allow the project to function after updating the library dependency.
- BEHAVIOUR: the default behaviour changed and the user must decide whether to accept this new behaviour or restore the old behaviour. The mitigation describes the steps required to restore the old behaviour.

### Example

An example file with a single change record:

> (... content of changes-file-preamble.md goes here ...)
>
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
    - read the page at the documentation URL using your standard tool for fetching web content (avoid using a real browser or tool like playwright or curl / raw HTTP if possible) and extract a full list of changes. For each change:
      - Do a dumb search through the source code of the projects to determine if this change MIGHT apply. DO NOT read project source code or analyse whether this change in fact does apply. Doing so will overflow the context and lead to unreliable results. For example, if the change is a removal of the "fooBarBaz" grid option, simply include the change if any project contains the string "fooBarBaz", even if in a comment.
        - If a change does not affect any project, skip it and continue to the next change.
      - classify the changes according to these rules:
        - BREAKING if code written for the older version will no longer work unless updated. Backwards-incompatible API type changes, removals of deprecated APIs, and increases in the minimum versions of angular, react, vue or typescript required, all count as breaking changes.
        - BEHAVIOUR if the same code is valid, but produces different results (on some documentation pages, changes that are clearly behavioural are wrongly flagged as breaking, look at each change to classify it)
        - Ignore deprecations and additions of new APIs
      - Create a Mitigation section. If the docs has precise mitigation instructions, copy it verbatim. If the instructions are long, replace them with a URL and indication of where in the page to find the content. This should be GENERIC mitigation advice DO NOT read the project source code to create specific mitigation steps, that is a job for a later agent.
    - add the changes to the appropriate level-2 heading in the output file

## Special rules

After generating the structured list of changes, validate it against these rules

### Package-related changes

[./packages.md], contains a list of packages that have been removed in a specific version. Cross-reference the list of changes against this file. If a package in use is no longer available in the target version, ensure that there is a BREAKING entry in the list of changes. If there is not, add one.

### Module registration

If the list of upgrade versions includes v33, this is the version at which module registration becomes required. Application projects (those that create grids) must have a `ModuleRegistry.registerModules` call activating the modules they require does not already contain `ModuleRegistry.registerModules` is migrating to modules, ensure that the mitigation steps include both a requirement to register the correct modules, and a link to the migration guide `https://www.ag-grid.com/{framework}-data-grid/upgrading-to-ag-grid-33/#migrating-from-packages`

### Theming

v33 introduced the Theming API. Legacy themes are deprecated but not removed. This skill should not attempt to migrate applications from legacy themes to the Theming API. If a project is being updated across v33, ensure that there is a BREAKING record stating that it is necessary to pass the string "legacy" to the `theme` grid option. Ensure that there are NO instructions to perform a migration to Theming API.

### Check preamble

Check that the file starts with the content of [./changes-file-preamble.md]

## Reporting format

Write the result of this process to the file `AG_UPDATE_CHANGES.md`. If this process was invoked as a sub-agent, DO NOT return the text of this file to the parent agent, write the file and return a short message indicating success.
