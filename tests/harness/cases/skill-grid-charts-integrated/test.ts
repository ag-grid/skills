import type { TestDefinition } from "../../types.ts";

const def: TestDefinition = {
  name: "skill-grid-charts-integrated",
  skill: "skills/ag-update",
  prompt:
    "Use the ag-update skill to upgrade AG Grid (which uses integrated charts) in this project to the latest version.",
  answers: [
    { when: "asked to confirm the scope of the update", reply: "The whole app.", optional: true },
    { when: "asked which version to upgrade to", reply: "The latest version.", optional: true },
    { when: "asked to choose a theming approach — migrate to the Theming API or keep legacy CSS themes", reply: "Migrate to the new Theming API.", optional: true },
    { when: "asked to review or approve the upgrade plan before changes are made", reply: "Approved, go ahead.", optional: true },
    { when: "asked whether to send feedback to the AG team", reply: "No thanks, skip the feedback.", optional: true },
  ],
  assertions: [
    { type: "command", run: "npm install --no-audit --no-fund && npm run typecheck" },
    {
      type: "check-diff",
      expected:
        "The removed ag-grid-charts-enterprise package is replaced by ag-grid-enterprise plus ag-charts-enterprise at compatible latest versions in package.json. Integrated charts are registered via modules (e.g. IntegratedChartsModule.with(AgChartsEnterpriseModule)) along with the required grid module registration. Any renamed grid options (e.g. enableRangeSelection became cellSelection) are updated. Legacy CSS theming handled for v33+. No unrelated source changes.",
    },
  ],
};

export default def;
