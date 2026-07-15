import { afterEach, expect, test } from "vitest";
import { run } from "../src/run";
import { render } from "../src/output";
import {
  assertOutsideGitRepo,
  expectExitWithError,
  globalTestStateReset,
  inDirectory,
  portable,
  tempDir,
} from "./utils";

afterEach(globalTestStateReset);

test("script exits with the not-in-a-Git-repo error outside a repo", async () => {
  const dir = tempDir();
  assertOutsideGitRepo(dir);
  const output = await inDirectory(dir, () => expectExitWithError(run("--allow-old-version")));
  expect(portable(render(output))).toMatchInlineSnapshot(`
      "ERROR: not in a Git repo or Git is not installed

      This script uses Git to search project files and determine which files to ignore.

      Ensure that the cwd is inside the source code Git repo and that Git is installed.

      To run the script on files not tracked by Git, create a temporary Git repo in an appropriate parent directory and commit the project source files to it. Use .gitignore files to declare which files are not source code files, including node_modules files and build output folders. If there is an alternative VCS in use, use its ignore files or other relavent project configuration to determine the apporpriate files to ignore.

      IMPORTANT: creating this temporary Git repo will affect the user's workspace, ask them for permission before going ahead and creating a temporary Git repo.
      "
    `);
});
