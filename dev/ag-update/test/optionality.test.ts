import { afterEach, expect, test } from "vitest";
import { optionalityOf, relevantVersion } from "../src/optionality";
import {
  dependencyChange,
  globalTestStateReset,
  mitigation,
  simpleChange,
  transition,
} from "./utils";

afterEach(globalTestStateReset);

const TARGET = "36.0.0";

test("M1 — transition removed by target is MANDATORY", () => {
  expect(optionalityOf(transition({ removedFrom: "33.0.0" }), TARGET)).toEqual({
    level: "MANDATORY",
    statement: "old API removed",
  });
});

test("M1 boundary — removedFrom equal to target counts as removed", () => {
  expect(optionalityOf(transition({ removedFrom: TARGET }), TARGET).level).toBe(
    "MANDATORY",
  );
});

test("transition removed after the target is not yet removed (optional)", () => {
  expect(
    optionalityOf(transition({ removedFrom: "37.0.0" }), TARGET).level,
  ).toBe("MITIGATE_TO_ACCEPT");
});

test("O1 — deprecated, not removed by target is MITIGATE_TO_ACCEPT", () => {
  expect(
    optionalityOf(
      transition({
        removedFrom: null,
        deprecatedFrom: "35.0.0",
        isSoft: false,
      }),
      TARGET,
    ),
  ).toEqual({
    level: "MITIGATE_TO_ACCEPT",
    statement:
      "old API deprecated; applications will be required to update in a future major and may choose to update now",
  });
});

test("O2 — soft (not deprecated), not removed is MITIGATE_TO_ACCEPT", () => {
  expect(
    optionalityOf(
      transition({ removedFrom: null, deprecatedFrom: "35.0.0", isSoft: true }),
      TARGET,
    ),
  ).toEqual({
    level: "MITIGATE_TO_ACCEPT",
    statement:
      "old API is not deprecated and remains fully supported; applications should consider updating if it benefits them",
  });
});

test("M2 — requirement is MANDATORY", () => {
  expect(optionalityOf(simpleChange("requirement"), TARGET)).toEqual({
    level: "MANDATORY",
    statement: "new requirement; no option to restore old behaviour",
  });
});

test("O3 — behaviour with mitigation is DISCARD_TO_ACCEPT", () => {
  expect(
    optionalityOf(
      simpleChange("behaviour", { mitigation: [mitigation("set the flag")] }),
      TARGET,
    ),
  ).toEqual({
    level: "DISCARD_TO_ACCEPT",
    statement: "follow mitigation advice to restore old behaviour",
  });
});

test("M3 — behaviour with no mitigation is MANDATORY", () => {
  expect(
    optionalityOf(simpleChange("behaviour", { mitigation: [] }), TARGET),
  ).toEqual({
    level: "MANDATORY",
    statement: "there is no documented flag to restore the old behaviour",
  });
});

test("O3.1 — style with mitigation is DISCARD_TO_ACCEPT", () => {
  expect(
    optionalityOf(
      simpleChange("style", { mitigation: [mitigation("override the CSS")] }),
      TARGET,
    ),
  ).toEqual({
    level: "DISCARD_TO_ACCEPT",
    statement: "follow mitigation advice to restore the previous appearance",
  });
});

test("M3.1 — style with no mitigation is MANDATORY", () => {
  expect(
    optionalityOf(simpleChange("style", { mitigation: [] }), TARGET),
  ).toEqual({
    level: "MANDATORY",
    statement:
      "there is no single flag to revert the style changes, but the new appearance can be customised with CSS",
  });
});

test("M4 — dependency is MANDATORY", () => {
  expect(optionalityOf(dependencyChange(), TARGET)).toEqual({
    level: "MANDATORY",
    statement: "minimum supported version raised; verify the installed version",
  });
});

test("relevantVersion — removed by target is the removal version", () => {
  expect(relevantVersion(transition({ removedFrom: "33.0.0" }), TARGET)).toBe(
    "33.0.0",
  );
});

test("relevantVersion — removed after target falls back to the deprecation version", () => {
  expect(
    relevantVersion(
      transition({ removedFrom: "37.0.0", deprecatedFrom: "34.0.0" }),
      TARGET,
    ),
  ).toBe("34.0.0");
});

test("relevantVersion — removal-without-deprecation scheduled after target is null (not relevant)", () => {
  expect(
    relevantVersion(
      transition({ removedFrom: "37.0.0", deprecatedFrom: null }),
      TARGET,
    ),
  ).toBeNull();
});

test("relevantVersion — a simple change uses its own version", () => {
  expect(
    relevantVersion(simpleChange("requirement", { version: "34.0.0" }), TARGET),
  ).toBe("34.0.0");
});
