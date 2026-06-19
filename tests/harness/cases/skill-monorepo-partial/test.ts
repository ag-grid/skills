import type { TestDefinition } from "../../types.ts";

const def: TestDefinition = {
  name: "skill-monorepo-partial",
  skill: "skills/ag-update",
  prompt: "Use the ag-update skill to upgrade AG Grid across this monorepo to the latest version.",
  answers: [
    { when: "asked to confirm the scope of the update (which packages/apps to upgrade)", reply: "The whole monorepo — upgrade every package that uses AG Grid.", optional: true },
    { when: "asked which version to upgrade to", reply: "The latest version.", optional: true },
    { when: "asked to review or approve the upgrade plan before changes are made", reply: "Approved, go ahead." },
  ],
  assertions: [
    { type: "command", run: "npm install --no-audit --no-fund && npm run typecheck" },
    {
      type: "check-diff",
      expected:
        "Only packages/grid-app is changed: its ag-grid-community and ag-grid-react dependencies bumped from 34 to the latest 35.x (plus the matching package-lock.json change). packages/util is completely unchanged. No unrelated source changes.",
    },
  ],
};

export default def;
