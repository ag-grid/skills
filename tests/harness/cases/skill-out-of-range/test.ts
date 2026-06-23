import type { TestDefinition } from "../../types.ts";

const def: TestDefinition = {
  name: "skill-out-of-range",
  skill: "skills/ag-update",
  prompt: "Use the ag-update skill to upgrade AG Grid in this project to the latest version.",
  answers: [
    { when: "asked to confirm the scope of the update", reply: "The whole app.", optional: true },
  ],
  assertions: [
    { type: "check-diff", expected: "No changes at all — the project is left exactly as it was." },
    { type: "transcript", includes: "25" },
  ],
};

export default def;
