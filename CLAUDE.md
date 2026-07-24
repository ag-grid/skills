# ag-skills

Agent skills for AG Grid / AG Charts / AG Studio, published to users via `npx skills add ag-grid/skills`. Skills live in `skills/`; each has a `VERSION.md` (semver) that the skill checks at runtime against the copy on `main` to warn about being out of date — bump it when changing a skill's behaviour.

## Regenerating documentation indexes

`skills/ag-dev/references/<product>/documentation-index.md` is half-generated. The preamble (down to the first `---`) is hand-authored and preserved; everything below is regenerated from each product's docs nav.

```
node scripts/ag-dev/generate-documentation-index.mjs [grid|charts|studio|all]
```

Requires an authenticated `gh` (it reads nav.json from each product's latest tagged release, including the private ag-studio repo). Re-run after a product release to refresh the page list. The reduction rules and per-product drop/trim tuning live in the script; edit those constants there.

## Tests

Skill-behaviour tests run through the harness in `tests/harness/` are intended to be run by developers as part of the development process. They take a very long time to run, so typically one would select a single test case to run at a time. Do not run these automatically after making changes.
