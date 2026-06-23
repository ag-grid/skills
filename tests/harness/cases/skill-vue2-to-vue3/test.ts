import type { TestDefinition } from "../../types.ts";

// The app uses ag-grid-vue (the Vue 2 wrapper), which has no v32+ release. Upgrading past v31
// would require moving the host app to Vue 3 (ag-grid-vue3) — a Vue framework migration the skill
// must not attempt. Correct behaviour: show a message that the project must migrate to Vue 3, and
// make no changes.
const def: TestDefinition = {
  name: "skill-vue2-to-vue3",
  skill: "skills/ag-update",
  prompt: "Use the ag-update skill to upgrade AG Grid in this project to the latest version.",
  answers: [
    { when: "asked to confirm the scope of the update", reply: "The whole app.", optional: true },
    { when: "asked which version to upgrade to", reply: "The latest version.", optional: true },
  ],
  assertions: [
    { type: "check-diff", expected: "No changes — the project is left exactly as it was." },
    { type: "transcript", includes: "Vue 3" },
  ],
};

export default def;
