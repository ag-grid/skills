import type { TestDefinition } from "../../types.ts";

const def: TestDefinition = {
  name: "skill-angular-standalone",
  skill: "skills/ag-update",
  prompt: "Use the ag-update skill to upgrade AG Grid in this Angular project to the latest version.",
  answers: [
    { when: "asked to confirm the scope of the update", reply: "The whole app.", optional: true },
    { when: "asked which version to upgrade to", reply: "The latest version.", optional: true },
    { when: "asked to choose a theming approach — migrate to the Theming API or keep legacy CSS themes", reply: "Migrate to the new Theming API.", optional: true },
    { when: "asked to review or approve the upgrade plan before changes are made", reply: "Approved, go ahead.", optional: true },
    { when: "asked whether to also upgrade Angular itself / about the required Angular version", reply: "Yes, bump Angular to the minimum version AG Grid requires.", optional: true },
    { when: "asked whether to send feedback to the AG team", reply: "No thanks, skip the feedback.", optional: true },
  ],
  assertions: [
    { type: "command", run: "npm install --no-audit --no-fund --legacy-peer-deps && npm run typecheck" },
    {
      type: "check-diff",
      expected:
        "ag-grid-angular and ag-grid-community upgraded from 32 to the latest 35.x, with the @angular/* packages bumped to the Angular version AG Grid v33+ requires. Module registration added as required from v33. Theming handled for v33+. Optionally the AgGridModule NgModule import may be modernized to the standalone AgGridAngular component — recommended but NOT required (AgGridModule still works), so its absence is acceptable. No unrelated source changes.",
    },
  ],
  expectOutcome: "pass",
};

export default def;
