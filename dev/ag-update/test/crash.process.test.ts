import { afterEach, expect, test } from "vitest";
import { globalTestStateReset, portable, runCompiled } from "./utils";

afterEach(globalTestStateReset);

test("ERROR output exits with code 1", () => {
  // An unknown argument fails in parseArgs, before any network, so this needs no mocking.
  expect(portable(runCompiled(["--nope"]))).toMatchInlineSnapshot(`
    "exitCode: 1
    stderr:
    ERROR: unknown argument --nope

    Supported arguments: --root=path, --output-folder=path, --allow-old-version, --changes-url-prefix=url, --source-glob=pattern, --grid-target-version=major.minor, --charts-target-version=major.minor, --studio-target-version=major.minor.

    Invoke the command again using only supported arguments.
    "
  `);
});

test("unhandled exception yields crash report (via MOCK_EXCEPTION)", () => {
  const result = runCompiled([], { env: { MOCK_EXCEPTION: "1" } });
  expect(result).toContain("exitCode: 1");
  expect(result).toContain(
    "ERROR: the script terminated because of an internal error",
  );
  expect(result).toContain("MOCK_EXCEPTION");
});

test("unhandled promise rejection yields crash report (via MOCK_UNHANDLED_REJECTION)", () => {
  const result = runCompiled(["--allow-old-version"], {
    env: { MOCK_UNHANDLED_REJECTION: "1" },
  });
  expect(result).toContain("exitCode: 1");
  expect(result).toContain(
    "ERROR: the script terminated because of an internal error",
  );
  expect(result).toContain("MOCK_UNHANDLED_REJECTION");
});
