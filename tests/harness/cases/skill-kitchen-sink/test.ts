import type { TestDefinition } from "../../types.ts";

// Torture-test fixture: a v31 React app on the legacy scoped feature packages, with integrated
// charts, an API-created range chart, a class cell renderer, an OLD-format sparkline column, the
// deprecated string rowSelection + suppressRowClickSelection, deprecated columnApi usage, and a
// custom-styled legacy CSS theme. Upgrading to latest crosses the v33 package-consolidation +
// Theming-API boundary and forces every one of those to migrate. If the skill can do this, it can
// do anything.
//
// NOTE: the Theming-API migration is intended to be an *optional change* the agent must ask about
// (see the required theming answer below). Until that "optional changes" feature is added to the
// skill, the agent won't ask and this run will (expectedly) fail with `unanswered` — that's known
// and fine.
const def: TestDefinition = {
  name: "skill-kitchen-sink",
  skill: "skills/ag-update",
  prompt:
    "Use the ag-update skill to upgrade AG Grid and AG Charts in this project to the latest version. It uses the legacy modules/feature packages, integrated charts, sparklines, and a custom-styled legacy theme.",
  answers: [
    { when: "asked to confirm the scope of the update", reply: "The whole app.", optional: true },
    { when: "asked which version to upgrade to", reply: "The latest version.", optional: true },
    // Required (not optional): the test asserts the agent surfaces the Theming-API migration as an
    // optional change and asks whether to apply it. Answer yes.
    {
      when: "asked whether to apply the optional migration from the legacy CSS theme to the new Theming API",
      reply: "Yes, migrate to the Theming API and port the custom styling.",
    },
    { when: "asked to review or approve the upgrade plan before changes are made", reply: "Approved, go ahead.", optional: true },
    { when: "asked whether to send feedback to the AG team", reply: "No thanks, skip feedback.", optional: true },
  ],
  assertions: [
    { type: "command", run: "npm install --no-audit --no-fund && npm run typecheck" },
    {
      type: "check-diff",
      expected:
        "All legacy scoped @ag-grid-community/* and @ag-grid-enterprise/* feature packages in package.json are replaced by the consolidated packages ag-grid-community, ag-grid-react, ag-grid-enterprise, and ag-charts-enterprise at compatible latest versions, and every import is updated accordingly. Module registration is updated for v33+: integrated charts via IntegratedChartsModule.with(AgChartsEnterpriseModule), cell selection via CellSelectionModule (was RangeSelectionModule), sparklines, and the column/context menu modules. Renamed grid options are migrated: enableRangeSelection/enableCharts replaced by the cellSelection setup; the string rowSelection='multiple' plus suppressRowClickSelection replaced by the object rowSelection form; deprecated params.columnApi calls (e.g. autoSizeAllColumns) moved to the grid api. The old sparklineOptions block is rewritten to the new AG Charts-based sparkline format. The createRangeChart call still compiles against the new types. Because the user opted in, the legacy CSS theme plus its custom CSS-variable/class overrides are migrated to the Theming API (e.g. themeAlpine.withParams(...)) and the legacy CSS imports are removed. The class-based cell renderer is preserved. No unrelated changes.",
    },
  ],
};

export default def;
