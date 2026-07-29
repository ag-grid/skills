# skill-studio-1-to-2

## Purpose

The skill must plan and apply an AG Studio v1 → v2 upgrade. This is currently the only AG Studio
major version transition that exists, so it exercises the whole Studio branch of the skill:
detection, scope, the `upgrading-to-ag-studio-2` docs page, and the wrapper/core version pinning
rule.

## Framework & products

React + TypeScript (Vite). AG Studio only — no grid or charts dependency is declared, so the skill
must not mention or touch either product.

## Starting app (fixture/)

`ag-studio` + `ag-studio-react` @ 1.1.1, React 16.14, TypeScript 5.5.4. A small sales dashboard in
edit mode. Every v1 API below was verified against the real `ag-studio@1.1.1` type definitions and
the fixture typechecks and renders cleanly on v1.

Each file carries at least one thing v2 breaks:

- `src/formats.ts` — `createFormats` override using `options` and `valueFormatter` (renamed to
  `formatOptions` / `createValueFormatter` in v2).
- `src/initialState.ts` — saved page filters using the date operators `on`, `after` and `inRange`
  (replaced in v2 by `equals`, `greaterThan`, `between`; note `between` also flips from exclusive
  to inclusive, a BEHAVIOUR change).
- `src/widgets.ts` — `createWidgets` using the removed `overrides` property, a widget `toolbar`
  (removed in v2), and `featureConfig.crossFilter`.
- `src/theme.ts` — `chartAxisColor` and `chartSeparationLinesColor` theme params (both renamed in
  v2).
- `src/dashboard.css` — CSS targeting Studio's internal DOM, which v2 restructures. This has no API
  name to grep for, so it exercises the "Studio theming" special rule in `determine-changes.md`.
- `package.json` — React 16.14 and TypeScript 5.5.4 are both below v2's minimums (17 and 5.8.3).

## Upgrade scenario

Upgrade AG Studio 1.1.1 → latest 2.x, then apply the generated plan.

## Expected outcome

- `ag-studio` and `ag-studio-react` both move to the same 2.x version (the wrapper pins the core
  exactly, so a mismatch is a real failure mode).
- React and TypeScript are raised to meet v2's minimums.
- The renamed format, filter, widget and theme APIs are updated.
- No `ag-grid-*`, `ag-charts-*` or `ag-stack` dependency is added — those are transitive and adding
  them by hand is the failure this guards against.

## Protective assertions

- `command`: `npm install && npm run typecheck` must pass, which catches every renamed type.
- `check-diff`: the full expected change-set, including the negative "no grid/charts/ag-stack
  dependency added".

## Notes

The prompt asks for the plan **and** its application in one session. The skill itself stops after
writing `AG_UPDATE_CHANGES.md` and recommends a fresh session, so this case deliberately tests plan
content and correctness rather than the plan-then-handoff flow. The apply step is in the prompt
rather than the answer map because the simulator returns `done` when the agent stops without asking
a question — an answer-map entry keyed on the completion message would race that and flake.

No AG Studio licence key is needed. Studio runs unlicensed with all features unlocked for trial,
logging a "License Key Not Found" console error and showing a watermark (verified in a browser
against this fixture).
