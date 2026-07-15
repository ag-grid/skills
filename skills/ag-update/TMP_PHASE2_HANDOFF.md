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

## Not for this repo

Four rules for the changes-database authoring side (ag-website-shared), captured during planning:

1. Theming v33: mitigation is `theme: 'legacy'`, never a Theming API migration.
2. Module registration v33: mitigation must include registering modules + the `upgrading-to-ag-grid-33/#migrating-from-packages` link.
3. Every package removed must have a breaking change record.
4. Strip codemod mentions from mitigations.
