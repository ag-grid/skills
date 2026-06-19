Follow these steps to determine the full set of projects, products and AG dependency versions that can be updated in a repo.

## Output

The goal of this process is to produce a comprehensive list of changes involved in updating a set of libraries between two versions.

You will be provided with a list of packages to update, with dependencies and current versions, as well as the target versions of grid and charts to update to.

Example of expected output format:

- path/to/project/a
  - ag-dependency-name@current-version
  - ag-dependency-name@current-version
- path/to/project/b
  - ag-dependency-name@current-version
-

## Steps

NOTE record package changes as breaking changes

NOTE include docs URLs where aporpriate

NOTE: for behaviour changes, include details on how to restore the old behaviour

- Launch one sub-agent each for for grid and charts as appropriate
- Load grid.md or charts.md as appropriate
- Establish full set of documentation URLs
- TODO support multiple products
- Pass full documena
- Find them in the docs pages
- Establish search term to work out if we're affected
- Add 3 headings to the document, `## Applicable breaking changes`, `## Ignored breaking changes`, `## Behaviour changes` and `## Optional changes`
