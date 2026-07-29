import type { TestDefinition } from "../../types.ts";

const def: TestDefinition = {
  name: "skill-studio-1-to-2",
  skill: "skills/ag-update",
  // The skill produces a plan and stops, telling the user to apply it in a fresh session. The
  // apply step therefore has to come from the simulated user after the plan is reported (see the
  // last answer-map entry) — asking for it in the prompt does not work, because the agent follows
  // the skill's "start a new agent session" instruction over the prompt.
  prompt:
    "Use the ag-update skill to upgrade AG Studio in this project to the latest version.",
  answers: [
    { when: "asked to confirm the scope of the update", reply: "The whole app.", optional: true },
    { when: "asked which version to upgrade to", reply: "The latest version.", optional: true },
    {
      when: "asked which behaviour changes to accept and which to mitigate",
      reply: "Accept all the new behaviour, don't restore any old behaviour.",
      optional: true,
    },
    // Not optional: the skill always ends by reporting the plan, so this must always fire. If the
    // simulator returns `done` here instead, the run fails as `unanswered`, which distinguishes
    // "the conversation was never continued" from "the changes were applied badly".
    {
      when: "the agent reports that the update plan / AG_UPDATE_CHANGES.md is ready, and has not yet applied those changes to the code",
      reply:
        "Now apply the changes listed in AG_UPDATE_CHANGES.md to the code in this project, and update package.json.",
    },
  ],
  assertions: [
    { type: "command", run: "npm install --no-audit --no-fund && npm run typecheck" },
    {
      type: "check-diff",
      expected:
        "package.json moves ag-studio and ag-studio-react to the same latest 2.x version, and raises react/react-dom to >=17 and typescript to >=5.8.3. Format overrides rename `options` to `formatOptions` and `valueFormatter` to `createValueFormatter`. Filter operators are renamed: `on` becomes `equals`, `after` becomes `greaterThan`, `inRange` becomes `between`. The widget override drops the removed `toolbar` property, and `createWidgets` no longer uses the removed `overrides` property. The theme param `chartAxisColor` becomes `chartAxisLineColor` and `chartSeparationLinesColor` becomes `chartGroupedCategoryLineColor`. AG_UPDATE_SCOPE.md and AG_UPDATE_CHANGES.md are created. No ag-grid, ag-charts or ag-stack dependency is added to package.json. No unrelated source changes.",
    },
  ],
};

export default def;
