import type { TestDefinition } from "../../types.ts";

const def: TestDefinition = {
  name: "skill-trivial-delta",
  skill: "skills/ag-update",
  prompt: "Use the ag-update skill to upgrade AG Grid in this project to the latest version.",
  answers: [
    { when: "asked to confirm the scope of the update (which packages/apps to upgrade)", reply: "The whole app — upgrade everything in scope.", optional: true },
    { when: "asked which version to upgrade to / to confirm the target version", reply: "The latest version.", optional: true },
    { when: "asked to review or approve the upgrade plan before changes are made", reply: "Approved, go ahead." },
  ],
  assertions: [
    { type: "command", run: "npm install --no-audit --no-fund && npm run typecheck" },
    {
      type: "check-diff",
      expected:
        "ag-grid-community and ag-grid-react upgraded from 34.x to the latest 35.x in package.json (and the matching change in package-lock.json). No application source code changes. .gitignore unchanged.",
    },
  ],
};

export default def;
