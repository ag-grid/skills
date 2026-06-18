import type { TestDefinition } from "../../types.ts";

const def: TestDefinition = {
  name: "skill-vanilla-creategrid",
  skill: "skills/ag-update",
  prompt: "Use the ag-update skill to upgrade AG Grid in this project to the latest version.",
  answers: [
    { when: "asked to confirm the scope of the update", reply: "The whole app.", optional: true },
    { when: "asked which version to upgrade to", reply: "The latest version.", optional: true },
    { when: "asked to review or approve the upgrade plan before changes are made", reply: "Approved, go ahead." },
    { when: "asked whether to send feedback to the AG team", reply: "No thanks, skip the feedback.", optional: true },
  ],
  assertions: [
    { type: "command", run: "npm install --no-audit --no-fund && npm run typecheck" },
    {
      type: "check-diff",
      expected:
        "ag-grid-community upgraded to the latest version in package.json. In src/main.ts, the removed `new Grid(element, gridOptions)` call is replaced by `createGrid(element, gridOptions)` (the vanilla-only API change), with the import updated accordingly. Module registration (ModuleRegistry with AllCommunityModule) added as required from v33. CSS/theming handled appropriately. No unrelated changes.",
    },
  ],
  expectOutcome: "pass",
};

export default def;
