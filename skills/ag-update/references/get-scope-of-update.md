Follow these steps to determine the full set of projects, products and AG dependency versions that can be updated in a repo.

## Steps

- Determine the projects to operate on. A "project" is a folder containing a package.json.
  - If this skill was invoked with instructions to upgrade specific projects, use them
  - Otherwise, recursively find all projects in the current directory that contain dependencies starting "ag-grid-" or "ag-charts-". Ignore projects that are not part of the software in this folder, e.g. inside node_modules and build artefacts. Show these projects to the user and ask them which they want to update.
- Determine the products, frameworks and library versions in use for each project
  - The product is "grid" or "charts" as indicated by the dependencies, and it is valid for a project to have both grid and charts products.
  - The version can be determined from package.json if a explicit version like "31.2.0" is used, otherwise use the package manager to determine what actual version is installed.
  - The framework is "react", "angular" or "vue" depending on the framework package in package.json on (e.g. ag-grid-react). Some applications may have more than one framework. If no framework package is present, use "javascript".
- Determine the latest versions of the product(s) in use with `npm view ag-grid-community version` and/or `npm view ag-charts-community version`
- Summarise the results as a bulleted list with entries like "- packages/my-app - angular application using grid 31.2.0 and charts 9.2.0" do not contain any other information or text
