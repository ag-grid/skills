/** Test hooks for the two version sources that would otherwise vary by machine or release, so
 *  snapshots stay stable without post-processing the output. */
import { mockCurrentSkillVersion } from "../../src/skill-version";

export { mockCurrentSkillVersion };

const NODE_VERSION_ENV = "MOCK_NODE_VERSION";

/** Fixes the Node version string shown in the minimum-Node message. Read by version-check.ts in
 *  the child process; runCompiled forwards it via process.env. */
export function mockCurrentNodeVersion(version: string): void {
  process.env[NODE_VERSION_ENV] = version;
}

export function resetVersionMocks(): void {
  mockCurrentSkillVersion(undefined);
  delete process.env[NODE_VERSION_ENV];
}
