import type { TestDefinition } from "../../types.ts";

const def: TestDefinition = {
  name: "skill-theming-api-v33",
  skill: "skills/ag-update",
  prompt: "Use the ag-update skill to upgrade AG Grid in this project to the latest version.",
  answers: [
    { when: "asked to confirm the scope of the update", reply: "The whole app.", optional: true },
    { when: "asked which version to upgrade to", reply: "The latest version.", optional: true },
    { when: "asked to choose a theming approach — migrate to the Theming API or keep the legacy CSS themes", reply: "Migrate to the new Theming API.", optional: true },
    { when: "asked to review or approve the upgrade plan before changes are made", reply: "Approved, go ahead.", optional: true },
    { when: "asked whether to send feedback to the AG team", reply: "No thanks, skip the feedback.", optional: true },
  ],
  assertions: [
    { type: "command", run: "npm install --no-audit --no-fund && npm run typecheck" },
    {
      type: "check-diff",
      expected:
        "ag-grid-community and ag-grid-react upgraded from 32 to the latest 35.x. The legacy CSS theming (the ag-grid.css / ag-theme-quartz.css imports and the className=\"ag-theme-quartz\" wrapper) is correctly handled for v33+ — EITHER migrated to the Theming API (a theme object such as themeQuartz passed via the grid's theme option, with the CSS imports and className removed) OR explicitly kept as legacy via the theme=\"legacy\" option. Module registration (ModuleRegistry with AllCommunityModule) added as required from v33. No unrelated source changes.",
    },
  ],
};

export default def;
