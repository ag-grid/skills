# AG skills

Agent skills for working with [AG Grid](https://www.ag-grid.com/) and [AG Charts](https://www.ag-grid.com/charts/).

## Install

```
npx skills add ag-grid/ag-skills
```

Update to the latest version at any time:

```
npx skills update ag-grid/ag-skills
```

## ag-update skill

The skill produces a markdown file detailing all the changes that need to be applied to your project in order to update to a new version.

In your coding agent you can invoke the skill and it will analyse your codebase and propose what updates can be applied:

```
Use the ag-update skill
```

Alternatively, tell the skill exactly what you want to update:

```
Use the ag-update skill to update all projects in this monorepo except apps/demo-app to ag grid v36
```

The skill will analyse your repo and our breaking change documentation and produce a markdown file containing a list of changes to apply. In the case of optional changes you'll be asked whether you want to apply them.

You can then review the generated file and ask your agent to make an implementation plan based on it.
