// Builds src/main.ts to the committed analyse-update.js bundle.
//
// might use Node APIs unsupported by old Node versions. --target=node18 keeps the emitted
// *syntax* parseable by Node 18 so that the guard's minimum-Node message is reachable there.
//
// Usage: node build.mjs [outfile]   (outfile defaults to the shipped bundle at
// ../../skills/ag-update/scripts/analyse-update.js; the compiled-js-up-to-date test builds to a
// temp file and compares.)
import { buildSync } from "esbuild";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outfile =
  process.argv[2] ??
  path.join(here, "../../skills/ag-update/scripts/analyse-update.js");

buildSync({
  entryPoints: [path.join(here, "src/main.ts")],
  bundle: true,
  // IMPORTANT --format=cjs allows code execution before require(), ESM would break the version
  // check by hoisting import statement above the code that checks for a supported node version
  format: "cjs",
  platform: "node",
  target: "node18",
  outfile,
  // import.meta appears only in a vitest-only fallback branch, unreachable in the CJS bundle
  logOverride: { "empty-import-meta": "silent" },
});
