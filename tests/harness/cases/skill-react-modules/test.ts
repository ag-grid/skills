import type { TestDefinition } from "../../types.ts";

const def: TestDefinition = {
  name: "skill-react-modules",
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
        "The legacy @ag-grid-community/* feature packages (core, client-side-row-model, react, styles) are removed and replaced by the consolidated ag-grid-community and ag-grid-react packages at the latest version in package.json. Imports in src updated to import from ag-grid-community / ag-grid-react instead of the @ag-grid-community/* packages. Module registration still present and valid for the new packages. CSS theme handling migrated appropriately for v33+. No unrelated source changes.",
    },
  ],
  expectOutcome: "pass",
};

export default def;
