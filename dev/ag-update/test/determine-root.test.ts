import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, expect, test } from "vitest";
import { findGitRoot } from "../src/files";
import { determineRoot } from "../src/projects";
import { globalTestStateReset, tempDir } from "./utils";

afterEach(globalTestStateReset);

test("relative root is resolved relative to cwd", () => {
  expect(determineRoot("/work/dir", "sub/project", "/repo")).toBe(
    "/work/dir/sub/project",
  );
});

test("absolute root path is supported", () => {
  expect(determineRoot("/work/dir", "/elsewhere/project", "/repo")).toBe(
    "/elsewhere/project",
  );
});

test("Git repo root is used if no root provided", () => {
  expect(determineRoot("/work/dir", undefined, "/repo")).toBe("/repo");
});

test("cwd is used when neither a root nor a Git root is available", () => {
  expect(determineRoot("/work/dir", undefined, undefined)).toBe("/work/dir");
});

test("findGitRoot walks up to the folder containing .git", () => {
  const root = tempDir();
  fs.mkdirSync(path.join(root, ".git"));
  const nested = path.join(root, "a", "b");
  fs.mkdirSync(nested, { recursive: true });
  expect(findGitRoot(nested)).toBe(root);
});

test("findGitRoot returns undefined outside any Git repo", () => {
  expect(findGitRoot(tempDir())).toBeUndefined();
});
