import { afterEach, expect, test, vi } from "vitest";
import { run } from "../src/run";
import { changelogUrl, downloadChangeRecords } from "../src/records";
import {
  changelog,
  expectExitWithError,
  globalTestStateReset,
  mockCurrentSkillVersion,
  mockHttpFailure,
  mockHttpResponse,
  mockHttpSequence,
  requestedUrls,
  serveChangelogs,
  writeChangelogsToDisk,
} from "./utils";
import { FIXTURE, gridChangelog } from "./fixture-tests/grid-app/fixture";

afterEach(() => {
  vi.useRealTimers();
  globalTestStateReset();
});

const PREFIX = "https://ag-grid.com/";
const GRID_URL = changelogUrl(PREFIX, "grid");

test("file:// url supported", async () => {
  const prefix = writeChangelogsToDisk({
    grid: changelog({ mostRecentVersion: "34.0.0" }),
  });
  const changelogs = await downloadChangeRecords(prefix, ["grid"]);
  expect(changelogs.get("grid")?.mostRecentVersion).toBe("34.0.0");
});

test("grid records fetched from prefix root, charts/studio from product subpath", async () => {
  serveChangelogs({
    grid: changelog(),
    charts: changelog(),
    studio: changelog(),
  });
  await downloadChangeRecords(PREFIX, ["grid", "charts", "studio"]);
  expect(requestedUrls()).toEqual([
    "https://ag-grid.com/version-change-records.json",
    "https://ag-grid.com/charts/version-change-records.json",
    "https://ag-grid.com/studio/version-change-records.json",
  ]);
});

test("bails with the download-failure error if a file is not valid JSON", async () => {
  mockHttpResponse(GRID_URL, "not json");
  const output = await expectExitWithError(
    downloadChangeRecords(PREFIX, ["grid"]),
  );
  expect(output.statusLine).toContain(`could not download ${GRID_URL}`);
});

test("bails with the newer-skill-version error if below minimumSkillVersion, even with --allow-old-version", async () => {
  mockCurrentSkillVersion("1.1.0");
  serveChangelogs({
    grid: { ...gridChangelog(), minimumSkillVersion: "99.0.0" },
  });
  const output = await expectExitWithError(
    run("--root", FIXTURE, "--allow-old-version"),
  );
  expect(output.statusLine).toContain(
    "a new version of this skill is available",
  );
});

test("a download that fails twice then succeeds produces a normal run", async () => {
  vi.useFakeTimers();
  mockHttpSequence(GRID_URL, [
    "FAIL",
    "FAIL",
    JSON.stringify(changelog({ mostRecentVersion: "34.0.0" })),
  ]);
  const pending = downloadChangeRecords(PREFIX, ["grid"]);
  await vi.runAllTimersAsync();
  const changelogs = await pending;
  expect(changelogs.get("grid")?.mostRecentVersion).toBe("34.0.0");
  expect(requestedUrls().filter((url) => url === GRID_URL)).toHaveLength(3);
});

test("a download that fails three times exits with the download-failure error", async () => {
  vi.useFakeTimers();
  mockHttpFailure(GRID_URL);
  const pending = expectExitWithError(downloadChangeRecords(PREFIX, ["grid"]));
  await vi.runAllTimersAsync();
  const output = await pending;
  expect(output.statusLine).toContain(`could not download ${GRID_URL}`);
  expect(requestedUrls().filter((url) => url === GRID_URL)).toHaveLength(3);
});
