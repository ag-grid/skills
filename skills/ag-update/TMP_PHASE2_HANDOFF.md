# Phase 2 handoff notes

Context that lived only in the phase-1 planning session. The spec is TMP_V2_PLAN.md; phase 1 (complete, 22 tests green) is at `scripts/analyse-update.js` + `scripts/dev/`.

## Process

- Phase 2 per the plan's "Phasing" section: fill-in only, no new files/helpers/test styles; the approved phase-1 code is the style reference. Sequential, fresh context.
- Before final human review: a plan-conformance pass — walk TMP_V2_PLAN.md section by section, checking every specified behaviour and tagged test exists and matches. Then work through the plan's "Post-implementation review" section.

## Phase-1 interpretations awaiting human ruling

Made without changing plan behaviour; nothing was built on top of them.

1. SUCCESS template's "(only listing products in use across the projects)" treated as an authoring note, not emitted; the latest-versions sentence is omitted when no project has AG deps.
2. Crash stack traces: frames outside `/ag-update/scripts` are dropped entirely (node-internal frames vary by Node version and would break snapshots), not just path-stripped.
3. Authored unspecified report sentences: the Optional-section intro, the cannot-rule-out sentence, the accept-only "Mitigation: none" line. Multiple applicable mitigation entries join as one paragraph.
4. Report transition headings computed per change as `(major-1).x -> major.x` of the change's version (a 34.x change shows under "v33.x -> v34.x" even when updating from 32.1.0).
5. Non-concrete version specs (e.g. "latest") currently make the package invisible to version resolution — phase 2 must replace this with the specified blocker.

## Environment facts

- `external/ag-website-shared` is an untracked symlink into a local ag-grid checkout; typecheck imports its type files. Needs committing or vendoring at some point.
- Repo root package.json was an empty (invalid) file; replaced with `{"private": true}` because it crashed esbuild's resolution walk.
- Integration runs leave empty mkdtemp folders under os.tmpdir (only the bin wrapper writes files); harmless — phase 2 could lazify the default output folder.

## Phase 1 review plan (do this before Phase 2)

Priorities: (1) results — does the script do the right thing and produce good output; (2) test
readability and structure. Utils and implementation details are lowest priority. Work top to bottom.
State at handoff: build up to date, typecheck clean, 22 tests green, live run verified.

Remember what Phase 1 deliberately does NOT do yet, so absences aren't flagged as bugs: only the
CURRENT package table (no legacy/scoped/Vue2 packages), NO blockers (non-concrete specs silently drop
the package — item 5 above), only ~1/3 of the plan's tests. The blocked-projects branch in the SUCCESS
message exists in code but is never exercised in Phase 1.

### Part A — Run it yourself and read the output (highest value)

Happy path (verified working). From the repo root:

    SP=$(mktemp -d)
    cat > "$SP/version-change-records.json" <<'JSON'
    {"mostRecentVersion":"34.0.0","minimumSkillVersion":"1.0.0","changes":[
      {"type":"transition","id":null,"framework":null,"detectWords":["oldGridApi"],"mitigation":[{"frameworks":["react","angular","vue","javascript"],"content":"Replace calls to `oldGridApi()` with `api.newGridApi()`."}],"oldApi":"oldGridApi","oldDescription":null,"newApi":"api.newGridApi","newDescription":null,"isSoft":false,"deprecatedFrom":null,"removedFrom":"33.0.0"},
      {"type":"behaviour","framework":null,"detectWords":null,"mitigation":[],"version":"34.0.0","title":"rows are now sorted stably by default","description":null}]}
    JSON
    node skills/ag-update/scripts/analyse-update.js \
      --root skills/ag-update/scripts/dev/fixture-tests/grid-app/files \
      --allow-old-version --changes-url-prefix="file://$SP/" --output-folder="$SP/out"
    cat "$SP/out/app-report.md"

Then judge the artifacts as a consumer (this is the core "good output" check):
- The SUCCESS message on stderr — is the guidance to the planning agent clear and correctly scoped?
- `app-report.md` — preamble, Scope, Required vs Optional grouping, the transition prose, the
  Mitigation line, the "Detected in:" occurrence list and the cannot-rule-out sentence. Is this a
  document you'd want an agent to plan an update from?
- `summary.md` — verbatim copy of the SUCCESS message.
- The `lib` project correctly appears under "no AG dependencies" and gets no report.
- For richer output shapes without hand-crafting fixtures, read the inline snapshots in
  `report.test.ts` (grid+charts, requirement, dependency, decision) — they are the fastest way to see
  every rendered variation in one place.

Error paths worth a live look (each is a distinct message you should sanity-check):
- Not in a Git repo: `(cd "$(mktemp -d)" && node <abs path>/analyse-update.js --allow-old-version)`
- Download failure: pass `--changes-url-prefix="file:///nonexistent/"` with the happy-path fixture.
- Node floor: `npx -y node@18 skills/ag-update/scripts/analyse-update.js` → minimum-Node message.

### Part B — Review the code that generates output (results correctness)

- `src/report.ts` — the heart of the output. Check: grouping by product then by major transition;
  transition heading computed as `(major-1).x -> major.x` of the change's version (interpretation 4 —
  confirm you're happy with it); version attribution/sort within a transition; Required vs Optional
  split; mitigation filtering to the product's frameworks + 'javascript' and the accept-only line;
  occurrence rendering vs the cannot-rule-out sentence; report filename derivation; relative paths only.
- `src/main.ts` `successBody()` + `run()` — project partitioning (updatable/blocked/noAgDependencies),
  the latest-versions sentence, section-omission rules, output-folder resolution, summary.md injection.
- `src/output.ts` — the ScriptOutput shape, `render()` ordering, the by-reference notices collector.

### Part C — Skim the other key paths (lower priority)

- `src/detect.ts` — `classifyCandidate` (version range, framework filter, dependency/typescript rule,
  detectWords-null → included) and `containsWholeWord`. Confirm the "dumb detection" contract holds.
- `src/project-info.ts` — recognition table completeness for CURRENT packages, `parseConcreteVersion`,
  charts-version-inference is NOT here yet (Phase 2).
- `src/records.ts`, `src/skill-version.ts`, `src/git.ts` — glance only; confirm boundaries match spec.

### Part D — Test readability and structure (top priority alongside A)

The Phase 1 gate is really the test abstractions — Phase 2 must slot into these patterns. Review for
"minimal, elegant, easy to read":
- `test/report.test.ts` and `fixture-tests/grid-app/grid-app.test.ts` — read as the reference for the
  unit and integration tiers. Are the inline snapshots the right granularity? Does the suite follow the
  plan's rule: ONE canonical whole-message snapshot per message variation, other tests asserting only
  their specific detail (see the second report test)?
- `test/utils/` — `changelog-builders.ts` (builder ergonomics/defaults), `index.ts`
  (`globalTestStateReset`, `expectExitWithError`), `fetch-mock.ts`, `fs-helpers.ts`, `snapshot.ts`
  (`portable()` tokenising), `run-compiled.ts`. Judge: is each abstraction pulling its weight, and is
  it used enough (2–3×) to be judgeable?
- `fixture-tests/` layout — colocated `files/` + `*.test.ts`, `fixture.ts` sharing. Is intent clear?
- Confirm each tier (unit / integration / process) is exercised and readable, and that
  `afterEach(globalTestStateReset)` is present in every file.

### Part E — Cross off the plan's own review items

Walk the five "Phase-1 interpretations awaiting human ruling" above and the six items in the plan's
"Post-implementation review" section (TMP_V2_PLAN.md) — several (cwd control for the not-in-repo test,
default-root only unit-tested, ignored-package.json cleanup) are things to eyeball during this review.

## Phase 1 architectural review — the one-way doors

A separate, higher-stakes pass from the "results/output" review above. Phase 1's job (per the plan)
is to fix every architectural and technical decision; Phase 2 is fill-in that slots into these
patterns. So review the things that are *expensive to change once committed* — they'll be load-bearing
under ~3× more code and tests. Wording, message text, and individual rules are NOT here (cheap to
change in Phase 2). Ranked roughly by blast radius. Paths are repo-relative; the source tree lives
under `skills/ag-update/scripts/dev/`.

### A. Core seams (changing these touches every stage and/or every test)

1. **The `runCli` boundary.** `runCli(...argv) -> ScriptOutput | throw ExitWithError`, with a thin
   `runAsBin` wrapper as the *only* code that writes files/stderr and calls `process.exit`. Every
   integration test depends on this line being drawn correctly. Confirm nothing side-effectful leaks
   into the testable core (writes, exit, stderr all live in the wrapper — check this holds) and that
   returning-output-vs-throwing is the right split.
   — `skills/ag-update/scripts/dev/src/main.ts`
2. **The error model.** One thrown type (`ExitWithError`, carrying a full `ScriptOutput`) for every
   terminating error, caught once in `runCli`; unexpected throws become the crash output. Decide now
   whether a single error class is enough or whether error codes / differentiated exit codes will be
   wanted later — retrofitting a taxonomy across every `throw` site is costly.
   — `skills/ag-update/scripts/dev/src/output.ts` (`ExitWithError`),
   `skills/ag-update/scripts/dev/src/main.ts` (`runCli` catch, `crashError`)
3. **The module-level notice collector**: `ScriptOutput.notices` holds a shared mutable module array
   by reference, requiring `globalTestStateReset` between tests. This is the one piece of global
   mutable state. Bless it or reject it now — every test file and any future concurrency depends on
   the choice.
   — `skills/ag-update/scripts/dev/src/output.ts` (`notices`, `addNotice`, `resetNotices`)
4. **`ScriptOutput` shape**: `reportFiles` as a name→content map (stages never touch the filesystem;
   the wrapper writes), `outputFolder` resolved in the core. This is what makes report content
   snapshot-testable. Confirm the shape carries everything Phase 2 needs (no report will want to write
   outside this map).
   — `skills/ag-update/scripts/dev/src/output.ts`

### B. Data contracts & the type pipeline

5. **Dependence on `CompiledChangelog`/`CompiledChange` from `external/ag-website-shared`.** The entire
   detect + report layer keys off this discriminated union (transition / simple / dependency). It is
   the contract with the changes-authoring side. Two decisions: (a) is the union the right shape to
   build against, and (b) the vendoring/symlink question (currently an untracked symlink — see Env
   facts) needs resolving before commit.
   — `external/ag-website-shared/src/changes/compiled-change-types.ts` (and `change-types.ts`
   alongside), re-exported via `skills/ag-update/scripts/dev/src/types.ts`
6. **The internal type flow**: `ProjectInfo -> ProjectDetectionResult (extends ProjectInfo) -> report`,
   plus `DetectedChange`/`Occurrence`. These interfaces are threaded through every stage and every test
   builder; reshaping them later is a wide ripple. Review the field set now.
   — `skills/ag-update/scripts/dev/src/types.ts`
7. **Product/framework modelling**: `Product = grid|charts|studio`, per-product `frameworks[]`, charts
   inferred from grid by the constant offset. This shapes detection and reporting throughout.
   — `skills/ag-update/scripts/dev/src/types.ts`,
   `skills/ag-update/scripts/dev/src/project-info.ts`

### C. Build & shipping (hard to change; couples to the process tests)

8. **esbuild → single committed CJS bundle**, `version-check` as the mandatory first import,
   `--format=cjs`, `--target=node18`, and the dual CJS/ESM entry guard. Plus the committed-bundle +
   staleness gate. This is the shipping contract and underpins the node-floor and happy-path process
   tests.
   — `skills/ag-update/scripts/dev/build.mjs`,
   `skills/ag-update/scripts/dev/src/version-check.ts`,
   `skills/ag-update/scripts/dev/src/main.ts` (entry guard),
   `skills/ag-update/scripts/analyse-update.js` (committed bundle),
   `skills/ag-update/scripts/dev/test/build.test.ts` (staleness gate)
9. **`.ts`-extension relative imports + `npm run cli` native-run convention.** Now a source-wide rule
   every new file must follow. Cheap to keep, tedious to reverse once Phase 2 adds files.
   — `skills/ag-update/scripts/dev/package.json` (`cli` script, `"type": "module"`),
   `skills/ag-update/scripts/dev/tsconfig.json` (`allowImportingTsExtensions`),
   `skills/ag-update/scripts/dev/src/*.ts`
10. **git as the discovery/search engine** (`git ls-files` / `git grep`), never fs walking. Everything
    downstream assumes git-tracked files; the whole test suite runs against *this* repo's real git.
    Fundamental — confirm it's the right foundation.
    — `skills/ag-update/scripts/dev/src/git.ts`,
    `skills/ag-update/scripts/dev/src/projects.ts`,
    `skills/ag-update/scripts/dev/src/detect.ts`
11. **Argument surface**: the `--name=value` / `--name value` parser and the four args. Adding args
    later is easy; changing the parsing model or validation contract is not.
    — `skills/ag-update/scripts/dev/src/args.ts`

### D. Test tiers & fixture strategy (the explicit phase-1 gate)

12. **The three-tier split** (unit → `runCli` integration → compiled-bundle process) and where the
    boundaries sit. Once Phase 2 writes ~2/3 more tests to these tiers, re-tiering is expensive. Judge
    the boundaries are drawn so each behaviour lands in the cheapest tier that can cover it.
    — `skills/ag-update/scripts/dev/test/` (unit + process),
    `skills/ag-update/scripts/dev/test/fixture-tests/` (integration),
    `skills/ag-update/scripts/dev/vitest.config.ts`
13. **Fixtures = committed folders in this repo, driven by `--root`, no `git init` / temp repos.** The
    whole consequence chain (fixtures must be committed to be seen; suite only works in a real checkout;
    fixtures are read-only; empty dirs need a dummy file). This is baked into every Phase 2 fixture —
    review the ergonomics and the escape hatches (runtime-written ignored file, permissions temp dir,
    non-repo temp dir) now.
    — `skills/ag-update/scripts/dev/test/fixture-tests/*/files/`,
    `skills/ag-update/scripts/dev/test/utils/fs-helpers.ts`
14. **Service-boundary mocking of `fetch` by URL**, git and fs left real. Confirm the seam is right
    (vs injecting a fetcher) — every download test is built on it.
    — `skills/ag-update/scripts/dev/test/utils/fetch-mock.ts` (`mockHttpResponse`),
    `skills/ag-update/scripts/dev/test/utils/changelog-builders.ts` (`serveChangelogs`,
    `writeChangelogsToDisk`)

### E. Test helpers (most-used surface; ergonomics lock in early)

15. **The changelog builder library** (`changelog`, `transition`, `requirement`, `behaviourChange`,
    `styleChange`, `dependencyChange`, `mitigation`) with `Partial` overrides + defaults. This is the
    single most-called test surface in Phase 2. Scrutinise: sensible defaults, overrides compose,
    the builder set matches every `CompiledChange` variant.
    — `skills/ag-update/scripts/dev/test/utils/changelog-builders.ts`
16. **`globalTestStateReset`** — the reset surface must cover *all* shared mutable state (fetch mock,
    notices, temp dirs). A missed reset = cross-test flake. Confirm it's complete and that every file's
    `afterEach` calls it.
    — `skills/ag-update/scripts/dev/test/utils/index.ts`
17. **Snapshot strategy**: inline snapshots + `portable()` tokenisation (`$REPO_ROOT$`, `$TMPDIR$`,
    version/node tokens) for machine-independence, and the "one canonical whole-message snapshot per
    variation, detail-asserts elsewhere" rule. The tokeniser is load-bearing for portability — check
    it's robust and the rule is actually followed.
    — `skills/ag-update/scripts/dev/test/utils/snapshot.ts` (`portable`, `REPO_ROOT`)
18. **`runCompiled` + the process-result snapshot format**, and `fixtureFiles(import.meta.url)` /
    `expectExitWithError`. Small but every process/fixture test uses them.
    — `skills/ag-update/scripts/dev/test/utils/run-compiled.ts` (`runCompiled`),
    `skills/ag-update/scripts/dev/test/utils/fs-helpers.ts` (`fixtureFiles`),
    `skills/ag-update/scripts/dev/test/utils/index.ts` (`expectExitWithError`)

## Not for this repo

Four rules for the changes-database authoring side (ag-website-shared), captured during planning:

1. Theming v33: mitigation is `theme: 'legacy'`, never a Theming API migration.
2. Module registration v33: mitigation must include registering modules + the `upgrading-to-ag-grid-33/#migrating-from-packages` link.
3. Every package removed must have a breaking change record.
4. Strip codemod mentions from mitigations.
