/** The one test that exercises real http (not the fetch mock): downloadChangeRecords against a
 *  local http.createServer, confirming the fetch path works end to end. */
import * as http from "node:http";
import { afterEach, expect, test } from "vitest";
import { downloadChangeRecords } from "../src/records";
import { changelog, globalTestStateReset, realFetch } from "./utils";

// Restore the genuine fetch for this file; the utils import otherwise installs the URL mock.
globalThis.fetch = realFetch;

afterEach(globalTestStateReset);

test("http:// url supported (real fetch against a local http server)", async () => {
  const body = JSON.stringify(changelog({ mostRecentVersion: "34.0.0" }));
  const server = http.createServer((_req, res) => res.end(body));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const { port } = server.address() as { port: number };
    const changelogs = await downloadChangeRecords(`http://127.0.0.1:${port}`, [
      "grid",
    ]);
    expect(changelogs.get("grid")?.mostRecentVersion).toBe("34.0.0");
  } finally {
    server.close();
  }
});
