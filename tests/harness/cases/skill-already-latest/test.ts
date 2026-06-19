import type { TestDefinition } from "../../types.ts";

const def: TestDefinition = {
  name: "skill-already-latest",
  skill: "skills/ag-update",
  prompt: "Use the ag-update skill to upgrade AG Grid in this project to the latest version.",
  answers: [
    { when: "asked to confirm the scope of the update", reply: "The whole app.", optional: true },
  ],
  assertions: [
    { type: "check-diff", expected: "No changes — the project is already on the latest version." },
    { type: "transcript", includes: "latest" },
  ],
};

export default def;
