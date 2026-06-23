import type { TestDefinition } from "../../types.ts";

// Torture-test: an npm-workspaces MONOREPO that piles every gnarly upgrade concern into one repo.
//
// Packages:
//   grid-config  (shared lib)  — ag-grid-community@31; exports column/options used by BOTH apps,
//                                 incl. deprecated grid options that must migrate (ripples into all
//                                 consumers).
//   react-app    — AG 31 on the legacy scoped feature packages (modules layout) + enterprise +
//                  integrated charts (createRangeChart) + old-format sparkline + class cell renderer
//                  + deprecated columnApi + string rowSelection + custom-styled legacy CSS theme.
//   angular-app  — AG 32 (VERSION SKEW) via ag-grid-angular + AgGridModule (NgModule, Angular 16);
//                  consumes grid-config; depends on @ag-grid-community/locale (NOT legacy — must be
//                  bumped, not flagged).
//   legacy-grid  — AG 31, but the user DECIDES NOT to upgrade it (must be left untouched — see scope
//                  answer below).
//   no-grid      — depends on the unrelated npm package "grid" (a non-AG grid lib). DECOY: the skill
//                  must not touch it.
//
// Upgrading to latest crosses the v33 package-consolidation + Theming-API boundary in two different
// packaging styles (scoped modules vs umbrella packages) at two different start versions.
//
// NOTE: the Theming-API migration is intended to be an *optional change* the agent must ask about
// (required answer below). Until that "optional changes" feature exists in the skill, the agent
// won't ask and this run will (expectedly) fail with `unanswered`. Known and fine.
const def: TestDefinition = {
  name: "skill-kitchen-sink",
  skill: "skills/ag-update",
  prompt:
    "Use the ag-update skill to upgrade AG Grid and AG Charts across this monorepo to the latest version. It's an npm-workspaces repo with React and Angular apps, a shared config library, integrated charts, sparklines, and custom-styled legacy themes.",
  answers: [
    // Scope: confirm the AG packages, but EXCLUDE legacy-grid (and the non-AG no-grid is out of
    // scope by definition). This asserts the skill respects a per-package opt-out.
    {
      when: "asked to confirm which packages/workspaces are in scope for the upgrade",
      reply:
        "Upgrade react-app, angular-app and the shared grid-config library. Do NOT upgrade legacy-grid — leave it exactly as it is. (The no-grid package doesn't use AG Grid at all.)",
    },
    { when: "asked which version to upgrade to", reply: "The latest version.", optional: true },
    // Required (not optional): asserts the agent surfaces the Theming-API migration as an optional
    // change and asks whether to apply it. Answer yes.
    {
      when: "asked whether to apply the optional migration from the legacy CSS themes to the new Theming API",
      reply: "Yes, migrate to the Theming API and port the custom styling.",
    },
    { when: "asked to review or approve the upgrade plan before changes are made", reply: "Approved, go ahead.", optional: true },
    { when: "asked whether to send feedback to the AG team", reply: "No thanks, skip feedback.", optional: true },
  ],
  assertions: [
    // Whole-monorepo install + typecheck of every package (grid-config is built first by the root
    // script). Strong oracle: leftover scoped imports, missing module registration, the old
    // sparkline/selection/columnApi shapes, or a broken Angular standalone migration will not
    // type-check at v35.
    { type: "command", run: "npm install --no-audit --no-fund && npm run typecheck" },
    {
      type: "check-diff",
      expected:
        "A monorepo upgrade that touches only the in-scope AG packages. grid-config: ag-grid-community bumped to latest and its deprecated shared grid options migrated (string rowSelection:'multiple' + suppressRowClickSelection -> the object rowSelection form); its shared standalone AG Charts dependency (ag-charts-community) is also bumped to a grid-paired version. react-app: legacy scoped @ag-grid-community/* and @ag-grid-enterprise/* feature packages replaced by consolidated ag-grid-community + ag-grid-react + ag-grid-enterprise + ag-charts-enterprise at compatible latest versions, all imports updated, module registration updated for v33+ (IntegratedChartsModule.with(AgChartsEnterpriseModule), CellSelectionModule, sparklines, column/context menu modules), enableRangeSelection -> cellSelection and enableCharts handling updated, the old sparklineOptions block rewritten to the new AG Charts-based format, deprecated params.columnApi calls moved to the grid api, createRangeChart still compiles, and (because the user opted in) the legacy CSS theme plus its custom CSS-variable/class overrides migrated to the Theming API (themeAlpine.withParams(...)) with the legacy CSS imports removed; the class-based cell renderer is preserved; and the standalone AG Charts dependencies (ag-charts-react + ag-charts-community) are bumped to a grid-paired latest version. angular-app: ag-grid-angular + ag-grid-community bumped to latest, the standalone ag-charts-angular + ag-charts-community bumped to a paired latest version, @ag-grid-community/locale bumped too (NOT removed or flagged as legacy), Angular bumped to the new minimum, and AgGridModule replaced by the standalone AgGridAngular component with module registration added as required. legacy-grid is left COMPLETELY UNCHANGED (the user excluded it: still on ag-grid-community@31 with its original imports and options). no-grid is left COMPLETELY UNCHANGED (it depends on the unrelated npm 'grid' package, not AG). No unrelated changes.",
    },
  ],
};

export default def;
