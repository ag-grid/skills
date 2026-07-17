import { afterEach, expect, test } from "vitest";
import { parseArgs } from "../src/args";
import { ExitWithError } from "../src/output";
import { globalTestStateReset } from "./utils";

afterEach(globalTestStateReset);

test("target versions default to none", () => {
  expect(parseArgs([]).targetVersions).toEqual({});
});

test("per-product target-version flags are parsed", () => {
  expect(
    parseArgs([
      "--grid-target-version=34.2",
      "--charts-target-version=12.0",
      "--studio-target-version=2.1",
    ]).targetVersions,
  ).toEqual({ grid: "34.2", charts: "12.0", studio: "2.1" });
});

test("target-version accepts the --name value form", () => {
  expect(parseArgs(["--grid-target-version", "34.2"]).targetVersions).toEqual({
    grid: "34.2",
  });
});

test.each(["34", "34.2.1", "v34.2", "latest", "34."])(
  "target-version rejects a value that is not major.minor (%s)",
  (value) => {
    expect(() => parseArgs([`--grid-target-version=${value}`])).toThrow(
      ExitWithError,
    );
  },
);
