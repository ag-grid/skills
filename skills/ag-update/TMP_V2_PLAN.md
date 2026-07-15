# Script specification

The script runs once. It scans the repo widely, finds all projects, writes one update report per project, prints a summary for the agent, and exits. There is no back-and-forth refinement, no state carried between invocations, and no caching of results.

## Arguments

See SKILL.md for description of arguments

## Happy path

The script follows the following steps

- Version check passes
- Locates projects
- Determines project dependencies
- Downloads version change records for projects in use
- Scans source for detectWords markers
- Produces one report per project
- Exits with a summary message describing how to use the reports

### Version check

The first operation of the script is to check the node version. To prevent static imports being imported above the version check, put it in its own file "version-check.ts" that is first in the import list with a comment explaining that it must be kept as the first import. If the node version is less than 20, we exit immediately with a process.stderr.write(`ERROR: minimum Node.js 20 version required (current version = ${version})\n`) message. DO NOT call any other files or use functions for outputting messages, since including files may fail due to unsupported node APIs.

Next we check the skill version

```ts
/** Resolves normally when OK to continue; throws ExitWithError when a newer skill version is available. */
function checkSkillVersion(allowOldVersion: boolean): Promise<void>
```

Skip the skill version check if --allow-old-version is passed

Use `fetch()` to load the current skill version from "https://raw.githubusercontent.com/ag-grid/skills/main/skills/ag-update/VERSION.md".

Also load local version from VERSION.md in skill folder

If the released version is not greater than the local version, or --allow-old-version is passed, continue

If fetch fails, add a note to the output "NOTICE: currently using ag-update v$local, could not fetch $URL to check if a newer version exists" and continue (see note in "Output format" below about function to add notices)

#### Exception: newer skill version available

If the released version is greater than the local version, and no --allow-old-version is passed:

Exit with error:

      ERROR: a new version of this skill is available. Current version $current; new version $new.

      Tell the user that they are recommended to update the skill by running `npx skills update ag-grid/skills`, but alternatively may choose to continue running this outdated version.

      Stop and wait for the user to respond. If they ask to continue using this version, invoke the script again adding the --allow-old-version argument.

integration-test: command exits early if newer skill available
integration-test: --allow-old-version skips version check
integration-test: version fetch failure yields the NOTICE and the run continues
^^^ NOTE implement these with a function mockHttpResponse(url: string, response: string | Response)
process-test: under npx node@18, the script exits immediately with the minimum-Node message

### Checking Git state

This skill needs to be run in a Git repo, since it uses `git ls-files` and `git grep` to search.

Verify that we're in a Git repo.

```ts
/** Returns the absolute path of the Git repo root; throws ExitWithError when not in a repo / git missing. */
function gitRepoRoot(cwd: string): string
```

Run `git rev-parse --show-toplevel` via `execFileSync` from cwd. A non-zero exit means we're not in a Git repo or git is not installed. On success, stdout is the absolute path of the repo root — keep it, it is the default root in "Determining the root folder" below, so no second git call is needed.

integration-test: script exits with the not-in-a-Git-repo error outside a repo

#### Exception: not in a Git repo or Git is not installed

If not in a Git repo, exit with an error:

    ERROR: not in a Git repo or Git is not installed

    This script uses Git to search project files and determine which files to ignore.

    Ensure that the cwd is inside the source code Git repo and that Git is installed.

    To run the script on files not tracked by Git, create a temporary Git repo in an appropriate parent directory and commit the project source files to it. Use .gitignore files to declare which files are not source code files, including node_modules files and build output folders. If there is an alternative VCS in use, use its ignore files or other relavent project configuration to determine the apporpriate files to ignore.

    IMPORTANT: creating this temporary Git repo will affect the user's workspace, ask them for permission before going ahead and creating a temporary Git repo.

### Determining the root folder

```ts
/** Returns the absolute root folder to scan for projects. */
function determineRoot(cwd: string, rootArg: string | undefined, gitRepoRoot: string): string
```

1. If --root specified, resolve it relative to cwd and use it
2. Otherwise, use the root of the current Git repo

unit-test: relative root is resolved relative to cwd
unit-test: absolute root path is supported
unit-test: Git repo root is used if no root provided

### Locating projects

A project is a folder containing a Git-tracked package.json file under the root.

```ts
/** Returns absolute paths of project folders; throws ExitWithError when none are found or ls-files fails. */
function locateProjects(rootPath: string): string[]
```

Run (`execFileSync('git', ['-C', rootPath, 'ls-files', '**/package.json', 'package.json'])`)

unit-test: tracked package.json files are located with Git
^^^ includes writing an ignored package.json and asserting that it doesn't show up

integration-test: --root limits located projects to those under the root folder
integration-test: exits with the could-not-locate-projects error when the root contains no package.json files

#### Exception: could not locate projects

If ls-files fails or finds no package.json files, exit with a message like:

    ERROR: could not find projects using `git ls-files` ({e.message from thrown error, or "no package.json files found under $rootPath"})

    A project is a folder containing a package.json file tracked by Git. Check that the root folder is inside the source code Git repo and that the projects' package.json files are committed (or at least staged).

    To scan a different folder, invoke the command again passing --root="path".

### Determining project dependencies

```ts
function getProjectInfo(projectPath: string): ProjectInfo {
  ...
}
type Product = 'grid' | 'charts' | 'studio';

/** Framework wrappers. There is no 'javascript' value: the framework-agnostic core API
 *  applies to every project regardless of wrappers. */
type WrapperFramework = 'react' | 'angular' | 'vue';

/** One AG product in use by a project (a product may be evidenced by several npm packages). */
interface Dependency {
  product: Product;
  /** Resolved current version, e.g. "32.1.0" */
  currentVersion: string;
  /** Frameworks this product is used through, evidenced by the product's framework wrapper
   *  packages (ag-grid-react -> 'react', @ag-grid-community/vue3 -> 'vue', ...). A product can
   *  be used through several frameworks; empty = used via the vanilla javascript API only.
   *  Per product, since e.g. studio might be used via React while grid is used vanilla. */
  frameworks: WrapperFramework[];
}

interface Blocker {
  packageName: string;
  /** Human-readable explanation, surfaced in the report/summary. */
  reason: string;
}

/** Everything discovery knows about one located project. Downstream stages and the SUCCESS
 *  summary derive the three groups from it: `dependencies` empty = no AG dependencies
 *  (no report); `blockers` non-empty = blocked (no report); otherwise updatable (gets a report). */
interface ProjectInfo {
  projectPath: string;
  dependencies: Dependency[];
  /** Conditions that make this project un-updatable by this skill (see blocker rules below). */
  blockers: Blocker[];
}
```

The script recognises product use, framework use and versions from the AG packages in a project's package.json (dependencies + devDependencies). Package migrations (e.g. the v33 move from scoped module packages to top-level packages) are NOT the script's concern — they arrive as change records from the changes database. The full recognition table:

#### Grid packages

Depending on any of these means the project uses `grid`:

| Package | Notes |
|---|---|
| `ag-grid-community`, `ag-grid-enterprise` | current |
| `ag-grid-react` / `ag-grid-angular` / `ag-grid-vue3` | current framework wrappers -> react / angular / vue |
| `@ag-grid-community/locale` | current (locale data) |
| `@ag-grid-community/*`, `@ag-grid-enterprise/*` (all others) | legacy scoped module packages, published 22.0.0 -> 32.3.9. The scoped wrappers `@ag-grid-community/react` / `/angular` / `/vue3` (vue3 from 24.1.1) count as framework wrappers -> react / angular / vue |
| `ag-grid-charts-enterprise` | legacy (existed until v32) |
| `ag-grid` | legacy monolithic package, published 2.0.0 -> 18.1.2 — always a blocker, see below |
| `ag-grid-vue`, `@ag-grid-community/vue` | legacy Vue 2 wrappers, last release 31.3.4 — always a blocker, see below |

#### Charts packages

Depending on any of these means the project uses `charts`:

| Package | Notes |
|---|---|
| `ag-charts-community`, `ag-charts-enterprise` | current standalone charts |
| `ag-charts-react` / `ag-charts-angular` / `ag-charts-vue3` | current framework wrappers -> react / angular / vue |
| `ag-charts-locale` | current (locale data) |
| `ag-charts-types` | transitive dependency, not normally installed directly; still counts as charts usage if present |
| `ag-charts-server-side` | server-side rendering |

#### Studio packages

Depending on any of these means the project uses `studio`:

| Package | Notes |
|---|---|
| `ag-studio` | current core (bundles grid and charts enterprise as its own dependencies) |
| `ag-studio-react` / `ag-studio-angular` / `ag-studio-vue3` | current framework wrappers -> react / angular / vue |
| `ag-studio-locale` | current (locale data) |

Studio's first release is v1; there are no legacy studio packages and no version floor concerns.

#### Rules

- Projects with no AG packages get no report; they are recorded and listed in the SUCCESS summary so the agent knows they were seen and skipped
- Current version is parsed from the version spec by stripping range operators (`^`, `~`, `>=` etc.). A version spec that doesn't contain a concrete version (e.g. "*", "latest", workspace protocols) yields a blocker for that project.
- If the grid integrated charts feature is used (detected via enableCharts / integrated-charts module usage) and there is no explicit charts dependency, infer the charts version from the grid version: AG Grid and AG Charts are released in lockstep with a constant major-version offset of 22 and the same minor and patch, so grid v34.2.1 implies charts v12.2.1.

#### Blocker rules

Each blocker's `reason` carries the explanation below, which is surfaced to the user via the SUCCESS message:

- **Bare `ag-grid` dependency**: the project is pre-v18 (the package was renamed `ag-grid-community` at 18.1.2), far below the supported floor — reason: the project predates the supported upgrade path.
- **Any grid version below major 25**: below the supported source floor (grid major >= 25) — reason: the current version is older than the oldest version this skill can update from.
- **`ag-grid-vue` or `@ag-grid-community/vue`**: Vue 2 wrappers whose last release is v31, and this script always targets the latest version. Moving past v31 requires migrating the host application from Vue 2 to Vue 3 and switching to `ag-grid-vue3`, which is outside this skill's scope — reason: the user must first migrate their application to Vue 3 and switch to `ag-grid-vue3`, then re-run this skill.

A project with blockers gets no report. The run still succeeds for the other projects; blocked projects are listed with their blocker reasons in the SUCCESS message with an instruction to tell the user (see "Successful report message").

unit-test: products and versions detected when standard packages used
^^^ tests the current packages like ag-grid-community
unit-test: charts version inferred when no charts dependency is specified
^^^ tests constant version offset and discovery of charts dependency via enableCharts (when using combined packages like @ag-grid-enterprise/all-modules charts is pulled in automatically so there will be no charts dependency)
unit-test: per-product frameworks detected from that product's wrapper packages
unit-test: product with wrappers for two frameworks lists both
unit-test: product with no wrapper has empty frameworks (vanilla javascript API)
integration-test: project with no AG dependencies gets no report and is listed in the SUCCESS summary
unit-test: legacy `ag-grid` package yields a blocker
unit-test: Vue 2 wrapper package yields a blocker
unit-test: non-concrete version spec (e.g. "latest") yields a blocker
integration-test: blocked project gets no report and is listed with its reason in the SUCCESS message
unit-test: version spec range operators are stripped when resolving current version

Don't re-encode all the rules in the tests, test an example of each kind of thing.

### Downloading version change records

```ts
/** Downloads one changelog per product in use; throws ExitWithError on download/JSON-parse failure
 *  or when a changelog's minimumSkillVersion exceeds the local skill version. */
function downloadChangeRecords(prefix: string, products: Product[]): Promise<Map<Product, CompiledChangelog>>
```

The change record format is `CompiledChangelog` defined in external/ag-website-shared/src/changes/compiled-change-types.ts (the authoring format it is compiled from is in change-types.ts alongside). One changelog JSON file is downloaded per product in use, from these paths under --changes-url-prefix:

- grid: `{prefix}/version-change-records.json`
- charts: `{prefix}/charts/version-change-records.json`
- studio: `{prefix}/studio/version-change-records.json`

Each changelog carries its own `mostRecentVersion` — so "the latest version" is per product (grid and charts latest differ by the constant major offset of 22).

Each changelog also carries `minimumSkillVersion`: the minimum skill version able to read this compiled format. If the local skill version is below it, exit with the "newer skill version available" ERROR from the version check section (this floor cannot be bypassed with --allow-old-version — the script cannot read the data).

Use `fetch()` to download the content of the relevant change files. Manually detect 'file://' prefix, strip it, and use fs.readFile assuming utf8.

If a file downloads but is not valid JSON, exit with the download-failure error below. If it parses as JSON, assume it matches the `CompiledChangelog` interface.

unit-test: file:// url supported
unit-test: http:// url supported (real fetch against a local http.createServer, not the fetch mock)
integration-test: grid records fetched from prefix root, charts/studio from product subpath
integration-test: bails with error if the files can't be downloaded or parsed as JSON
integration-test: bails with newer-skill-version error if local version is below minimumSkillVersion, even with --allow-old-version
integration-test: changelogs are fetched only for products in use across the projects

#### Exception: downloading version change record files fails

We should try to download the files 3 times with a 500m then 2s delay.

integration-test: a download that fails twice then succeeds produces a normal run
integration-test: a download that fails three times exits with the download-failure error
^^^ use vitest mock timers to avoid actually waiting

If the download fails, exit with a message like:

    ERROR: could not download $URL. Check if the Internet is enabled by loading a known-good URL, then try again.

    If the Internet is not available, ask the operator to fix the issue.

    If downloading fails persistently even though the Internet is available, there may be a bug in the ag-update skill, ask the user to report it as an issue on GitHub: https://github.com/ag-grid/skills/issues

### Change detection

Detection always targets each product's most recent available version (`CompiledChangelog.mostRecentVersion`): for each project, all changes between the project's current version and the latest version are detected.

This stage is dumb: any detectWords match — even in a comment — means the change is included with its occurrences. No source analysis happens here; interpreting matches is the planning agent's job.

```ts
/** Runs detection for one project against the downloaded changelogs. */
function detectChanges(
  project: ProjectInfo,
  changelogs: Map<Product, CompiledChangelog>,
): ProjectDetectionResult
```

For each project:

1. **Collect candidate changes**: for each product the project uses, take the changes from that product's changelog that fall in the version range (currentVersion, mostRecentVersion], filtered by framework: include changes whose `framework` is null ("potentially anything") or is in that product's `frameworks`. The version a change belongs to is `removedFrom` for transitions, `version` for simple and dependency changes.
2. **Dependency changes** (`type: 'dependency'`) have no detectWords and there is no version check: include the change unconditionally when its `dependency` is `'typescript'` or is in that product's `frameworks` (dependency minimums are constraints of the framework wrappers, so a product used via the vanilla API is unaffected). Like detectWords-null changes, they carry empty occurrences and are verified during planning.
3. **Changes with `detectWords: null`** cannot be ruled out by searching (per the interface contract): include them unconditionally, with empty occurrences. This also covers always-applicable changes such as "module registration required from v33".
4. **Remaining changes**: run one `git grep -n --fixed-strings` per project (not per change record) over the combined set of detectWords from all the project's candidate changes, scoped to the project's folder. Post-process each matched `file:line:content` result to determine which detectWords actually match the line, applying the whole-word rule from the interface contract: a word matches only when not embedded in a larger identifier (`Bar` matches `Foo-Bar` but not `FooBar`), case-sensitively. Map words back to their changes: a change is included iff at least one of its detectWords has at least one occurrence.

```ts
/** One compiled change that may affect a project. */
interface DetectedChange {
  product: Product;
  /** The CompiledChange record verbatim (see compiled-change-types.ts: a transition,
   *  simple (requirement | behaviour | style) or dependency change). */
  change: CompiledChange;
  /** Where the change's detectWords matched, from git grep. Empty for dependency changes
   *  and for changes with detectWords: null, which are included without occurrences. */
  occurrences: Occurrence[];
}

interface Occurrence {
  /** Path relative to the project folder. */
  file: string;
  /** 1-based line number. */
  line: number;
  /** Which of the change's detectWords matched. */
  word: string;
}

/** The full result of the detection stage, input to report generation. */
interface ProjectDetectionResult extends ProjectInfo {
  changes: DetectedChange[];
}
```

unit-test: change with matching detectWords is included with file/line occurrences
unit-test: change whose detectWords match nothing is omitted
unit-test: change with detectWords null is included with empty occurrences
unit-test: whole-word matching — word embedded in a larger identifier does not match
unit-test: dependency change included when its dependency is typescript or in the product's frameworks, excluded otherwise
unit-test: changes outside the project's version range are not included
unit-test: framework-scoped change excluded when the framework is not in the product's frameworks
unit-test: framework-scoped change included when the product is used through multiple frameworks including it
unit-test: transition deprecated but not removed by the target version is excluded
unit-test: matches outside a project's folder do not count toward that project
unit-test: detectWords containing special characters are matched literally

### Report generation

```ts
/** Renders one project's report as markdown; the caller writes it to the output folder. */
function renderReport(result: ProjectDetectionResult, changelogs: Map<Product, CompiledChangelog>): string
```

One report file is written per project to the output folder. Like the stderr message, files are not written by the stages: `runCli` returns them in `ScriptOutput.reportFiles` (see Output format), a map of file *name* -> content, and the outer bin wrapper joins each name to `ScriptOutput.outputFolder` and writes — so integration tests assert file names and content on the return value, never the filesystem.

On SUCCESS the output folder also gets a `summary.md` containing the verbatim rendered LLM output (starting "SUCCESS:"), saved for inspection. It is included in `reportFiles` like any other file, and never written on ERROR.

Requirements known so far:

- Each change must be attributed to the version that introduced it, so that if the user chooses to update to an earlier version than the latest, the agent can disregard the items introduced after the chosen version.
- Optional changes must be presented as decision items (summary, mitigation, detected occurrences) so the agent can resolve them with the user while planning the update.

The report is markdown, named `{projectFolderName}-report.md`. Structure:

- Preamble: this fixed text (adapted from the old skill's changes-file preamble, which is now deleted):

      # AG dependency update report

      This file contains a list of changes to apply to the project described in the Scope section
      below. Combine it with your knowledge of the coding conventions and verification tools
      available for this project to plan and execute an update. After applying these changes use
      the appropriate tools at your disposal to validate that the changes were successful, such as
      running the build, typechecking, tests, and starting the dev server and accessing it with a
      browser.
- `# Scope` — project path, and per product: current version, target (most recent) version, and the frameworks it is used through
- Paths in report files are never absolute: the Scope project path is relative to the repo root, occurrence paths are relative to the project folder. Better DX, and report content is machine-independent (snapshot-friendly).
- `# Required changes` — grouped by product (`## Grid` / `## Charts` / `## Studio`) then by major version transition (`### Grid v{FROM}.x -> v{TO}.x`), so items after a user-chosen earlier version can be disregarded wholesale by skipping later transition sections. Contains, rendered per type:
  - transitions removed by the target version: `#### REMOVED: {oldApi}` — a paragraph generated from the record ("As of v{removedFrom}, {oldApi} has been removed." plus oldDescription; "Use {newApi} instead." plus newDescription, or "It has no replacement." when newApi is null)
  - `requirement` changes: `#### REQUIRED: {title}` with the description paragraph
  - `dependency` changes: `#### DEPENDENCY: {dependency} >= {minVersion}` with the reason
  - each followed by "Mitigation: " (the record's mitigation entries whose frameworks intersect the product's frameworks plus 'javascript'; omit the line if none apply) and "Detected in: " — a list of `{file}:{line} ({word})` occurrences, or a fixed sentence stating the change cannot be ruled out by search and must be checked during planning (detectWords null / dependency changes)
- `# Optional changes` — the `behaviour` and `style` changes, grouped and formatted the same way with heading `#### DECISION: {title}`. Mitigation here is the way to restore the old behaviour; no mitigation entries = accept-only (the report says so). The section starts with a fixed sentence instructing the agent to resolve each decision with the user during planning.

unit-test: report groups changes by product and version transition
unit-test: requirement/removal/dependency changes appear under Required changes; behaviour/style under Optional changes
unit-test: mitigation entries are filtered to the product's frameworks plus javascript
unit-test: occurrences are listed with file and line; detectWords-null changes get the cannot-rule-out sentence
integration-test: report written per project with expected filename (asserted via reportFiles)
integration-test: project with no detected changes still gets a report stating no changes were detected
integration-test: on SUCCESS, reportFiles contains summary.md holding the rendered SUCCESS output; on ERROR there is no summary.md

### Successful report message

The per-project lines below only mention "Grid v..." — There are 3 products and projects may use any combination of them. The message should render whichever products each project uses.

Reports are written to the output folder: the --output-folder argument if passed, otherwise a new temporary folder created via fs.mkdtemp under os.tmpdir(). Either way its path is reported in this message.

Exit 0 with a message like:

  SUCCESS: report files produced

  The latest versions are: Grid v$gridMostRecentVersion, Charts v$chartsMostRecentVersion (only listing products in use across the projects).

  Discovered the following projects and created update reports:

  - /path/to/project1: using Grid v$currentVersionProject1 -> /path/to/output/folder/project1-report.md
  - /path/to/project2: using Grid v$currentVersionProject2 -> /path/to/output/folder/project2-report.md

  The following projects cannot be updated by this skill and have no report. Tell the user about them and continue:

  - /path/to/project3: $blockerReason

  (omit this section when no projects are blocked)

  The following projects contain no AG dependencies and were not analysed:

  - /path/to/project4

  (omit this section when every project has AG dependencies)

  Confirm with the user that they want to update to the latest versions. If they choose an earlier version, disregard the report items introduced after the chosen version.

  Confirm with the user that this is the correct set of projects to update, and disregard the reports for any projects they do not want to update.

  Use your normal planning process and knowledge of the application's structure, coding standards, and development process to plan the change. Take into account the number of changes. If there are a very large number of changes across many files it may make sense to work with the user to plan a phased approach. If there are only a few changes it may be appropriate to apply them in a single phase. Work with the user to make an appropriate plan.

## General exception handling

### writing file fails

If writing any file fails, exit with an error message:

    ERROR: could not write to $outputFolder

    Invoke the command again passing --output-folder=path and selecting a path that the script will be able to write to

integration-test: unwritable output folder exits with the could-not-write error
integration-test: --output-folder pointing at a non-empty directory exits with an error

### Crash

If there's an uncaught exception or unhandled promise rejection, exit with a stack trace and a message like:

    ERROR: the script terminated because of an internal error, details below. This is a bug in the skill. Please report it as an issue on GitHub: https://github.com/ag-grid/skills/issues

    {Details, including stack trace if available, Custom stack trace formatting to include function names but not line and column numbers, and strip path before /ag-update/scripts so that snapshot tests work}

To let the process tests trigger these handlers in the real compiled script, main.ts checks two undocumented environment variables at startup: `MOCK_EXCEPTION` throws an uncaught exception and `MOCK_UNHANDLED_REJECTION` creates an unhandled promise rejection.

integration-test: an unexpected (non-ExitWithError) exception thrown from a stage yields the crash report output
process-test: unhandled promise rejection yields crash report (via MOCK_UNHANDLED_REJECTION)
process-test: unhandled exception yields crash report (via MOCK_EXCEPTION)
^^^ the process-level handlers (process.on('uncaughtException'/'unhandledRejection')) only exist in the real process; the integration-test covers the crash formatting for errors thrown through run()


## Build

We need to ship JS in the skill. We need a build process that converts TS to JS so we can commit the generated

unit-test: compiled js is up to date
^^^ fail this test if the js file in ag-update/scripts/analyse-update.js is out of date from the .ts source

## Process tests

At least one test should invoke the real compiled script as a separate process and verify output as expected

process-test: happy path — fixture repo in, reports out, SUCCESS on stderr, exit code 0

We need a matrix of supported versions and invoke them via npx e.g.

 import { spawnSync } from 'node:child_process';
  const r = spawnSync('npx', ['-y', 'node@20', 'skills/ag-update/scripts/analyse-update.js', '.'],
                      { stdio: 'inherit' });
  process.exit(r.status ?? 1);   // non-zero = it broke on Node 20

# Code layout and test strategy

## Layout

Source in `skills/ag-update/scripts/src/`, compiled output committed at `skills/ag-update/scripts/analyse-update.js`:

    src/
      version-check.ts   # node version guard; MUST stay the first import of main.ts
      main.ts            # entry point: exports runCli(...args) (parse args + run all stages,
                         # returns ScriptOutput / throws ExitWithError, no stderr/process.exit —
                         # this is what integration tests call); the thin bin wrapper renders
                         # output, writes to stderr and calls process.exit
      output.ts          # ScriptOutput type, succeed()/fail() constructors, addNotice(), render()
      args.ts            # argument parsing and validation -> Args type
      git.ts             # execFile wrappers: repoRoot(), lsFiles(), grep()
      projects.ts        # locate projects from git ls-files output
      project-info.ts    # getProjectInfo() and the package recognition table
      records.ts         # fetch change records (http/https/file), parse, mostRecentVersion
      detect.ts          # run git grep for detectWords -> ProjectDetectionResult[]
      report.ts          # render report markdown from ProjectDetectionResult
      types.ts           # shared interfaces (ProjectInfo, DetectedChange, ...)

Each stage is a pure-ish function taking explicit inputs and returning a value (no globals except the notice collector); `main.ts` is the only file with side-effectful orchestration. Errors that should terminate with an ERROR output are thrown as `ExitWithError` (see Output format) and caught once in `main.ts`.

## Test strategy

Each test in this plan is tagged with one of three tiers:

- **unit-test**: calls a single stage function directly with explicit inputs and asserts on its return value. For the mechanics of one stage (parsing, matching, rendering).
- **integration-test** (the preferred tier for anything of the form "under this condition, the app should do this", including every "bails with message if ..." case): calls `runCli(...args)` — a function close to the real entry point that runs argument parsing and all stages, but does NOT write to stderr or call `process.exit`. It returns the `ScriptOutput` on success and throws `ExitWithError` on error paths; tests assert on those. External services are mocked at the service boundary before the call:

      mockHttpResponse('https://raw.githubusercontent.com/.../VERSION.md', '1.2.0')
      mockHttpFailure('https://ag-grid.com/version-change-records.json')  // for retry/error tests
      await expect(runCli('--root', fixtureRepo)).rejects.toThrow(ExitWithError)

  `fetch` is mocked as a whole (the harness intercepts by URL), so even the hardcoded VERSION.md URL is controllable without any test-only argument. Git and the filesystem are NOT mocked — integration tests run against committed fixture folders.
- **process-test** (few, slow): spawns the compiled `analyse-update.js` as a separate process and asserts on exit code and stderr text. Only for behaviour that doesn't exist in-process: exit codes, the `process.on('uncaughtException'/'unhandledRejection')` handlers, the node-version floor (via `npx node@18`/`node@20`), real http fetching, and one end-to-end happy path. The stderr-writing/exit glue in main.ts is deliberately thin because it is only covered here.
- **Filesystem fixtures**: real filesystem, no fs mocking — the script's core operations are `git ls-files`/`git grep`, which can't be meaningfully mocked. Fixtures are committed to this repo, and this repo itself is the Git repo the script sees when tests run with `--root={fixture path}`. This means fixtures can be edited and run like real projects. There are no temp repos and no `git init` in tests. Consequences:
  - Fixture files must be committed (or at least staged) or `git ls-files`/`git grep` won't see them — an uncommitted new fixture silently fails its test.
  - The test suite only works in a real Git checkout of this repo, not in an exported copy without `.git`.
  - Tests treat fixtures as read-only: never modify tracked fixture files, and write report output to temp folders, never into the fixture.
  - The few tests needing filesystem state that can't be committed use small setup helpers with cleanup: a plain temp *directory* (no repo) for the not-in-a-Git-repo test; a runtime-written ignored file (its `.gitignore` is committed in the fixture) for ignore-behaviour tests; a permissions-restricted temp dir for unwritable-output tests. A fixture folder with no package.json needs a committed dummy file, since Git cannot track an empty folder.
- **Network**: integration tests mock `fetch` by URL as above; change-record fixtures can also be served via `file://` URLs. Real http is exercised once at each of the unit tier (`downloadChangeRecords` against a local `http.createServer`) and the process tier.
- **Test runner**: vitest.
- **Snapshots**: use inline snapshot testing (`toMatchInlineSnapshot`) wherever a test asserts on message output. Structure these tests so there is one good snapshot test for each key message variation; other tests of the same message assert on the specific detail they cover rather than re-snapshotting the whole message. Report files contain no machine-varying content by design (paths are repo-root- or project-relative — see Report generation). Console output (and summary.md, its verbatim copy) does, so a shared helper patches snapshotted text to make it portable — the end result must contain no paths only valid on one machine:
  - common Mac/Linux temp folder path prefixes -> a `$TMPDIR$` token via regex replacement, preserving the rest of the path so the important part (e.g. report file names) stays asserted
  - the known absolute root path -> `$ABSOLUTE_ROOT_PATH$`, verifying it appears where expected
  - the local skill version from VERSION.md and the node version in the minimum-Node message -> tokens, same deal
  - (crash stack traces are handled in production code — see the Crash section)
- **Test state resets**: shared mutable state (the fetch mock, the module-level notice collector in output.ts, ...) is reset by a single `globalTestStateReset()` helper, called from an `afterEach` in every test file.
- **Process tests are all snapshot tests**, snapshotting the whole process result in this format (omit the stderr/stdout section when its content is empty):

      exitCode: 0
      stderr:
      ... content ...
      stdout:
      ... content ...


With this architecture every ERROR path is a value-returning branch (or a typed throw), so most testing is a function call plus an object assertion.

## Linking test fixtures and tests

For tests that use a filesystem fixture, colocate each committed fixture with the test(s) that use it:

fixture-tests/test-name/test-name.test.ts # can have one or more tests
fixture-tests/test-name/files/...fixture-files

Then inside test-name.test.ts have the tests that use the fixture, and use import.meta.dirname or __dirname or whatever the API is to build the path to the files.

## Output format

There is a standard output format

- Each output starts ERROR: or SUCCESS: followed by a status line
- There's a body message
- ERROR messages have an instruction on how to resolve the issue and, where relevant, re-invoke the command with appropriate arguments
- Code can add NOTICE: messages to the current output that appears at the bottom of the response


```ts
type Status = 'SUCCESS' | 'ERROR';

interface ScriptOutput {
  status: Status;
  /** Rendered as the first line: "{status}: {statusLine}" */
  statusLine: string;
  /** Body paragraphs, rendered separated by blank lines */
  body: string[];
  /** Collected NOTICE messages, rendered last, each prefixed "NOTICE: " */
  notices: string[];
  /** Resolved output folder (--output-folder or the mkdtemp default); the wrapper joins
   *  reportFiles names to this when writing. */
  outputFolder: string;
  /** Files to write, file name -> content (names, not paths, so tests can assert them
   *  directly): the per-project reports plus, on SUCCESS, summary.md (the verbatim rendered
   *  output). Like stderr, the stages don't write — the outer bin wrapper joins each name to
   *  outputFolder and writes; integration tests assert on this value. Empty on ERROR. */
  reportFiles: Record<string, string>;
}

/** Construct the single success outcome. */
function succeed(statusLine: string, body: string[], outputFolder: string, reportFiles: Record<string, string>): ScriptOutput;

/** Thrown from any stage to terminate with an ERROR output; caught once in main.ts. */
class ExitWithError extends Error {
  constructor(statusLine: string, body: string[]);
  readonly output: ScriptOutput;
}

/** Append a NOTICE to whatever output the run eventually produces (success or error).
 *  Backed by a module-level collector in output.ts. */
function addNotice(message: string): void;

/** Render to the standard format. Called exactly once, in main.ts, which writes the
 *  result to stderr and exits (SUCCESS -> 0, ERROR -> 1). */
function render(output: ScriptOutput): string;
```

The crash handler ("General exception handling") wraps `run()` in main.ts: any thrown value that is not an `ExitWithError` is converted to the internal-error ERROR output with stack trace.

integration-test: notices added during the run appear at the bottom of both success and error output
integration-test: ExitWithError thrown from a stage renders as ERROR output
process-test: ERROR output exits with code 1, SUCCESS with code 0
^^^ exit codes only exist at the process level; the rendering is asserted in-process

## Build process

Build with esbuild, use --format=cjs to use require() over import;

Create a file version-check.ts for checking the node version and import it first in the entry point before any other imports. --format=cjs ensures that this runs before any require() calls and checks the version before potentially failing on importing undefined modules.


# Development process

Once this plan is complete and I have agreed it, we will operate a development process to turn it into a matching implementation

While planning: think through details carefully and write something that you think will work

While developing: DO NOT CHANGE THE PLAN. If you discover that the plan can't be implemented as specified because the BEHAVIOUR doesn't work, stop and ask for guidance. It's OK to make trivial changes e.g. if the names or paths specified in the plan aren't right. Changes of behaviour ALWAYS need human confirmation.

## Phasing

Implementation happens in two phases, with a human review between them. The split is approximate — the guiding principles matter, not the exact contents of each phase.

**Phase 1 — a reviewable slice that fixes every architectural and technical decision.** A thin-but-complete vertical slice rather than a full implementation of the first few stages:

- All structural code final: build setup, entry point / `runCli` orchestration, output handling, argument parsing.
- Every stage implemented to happy-path depth, so a real fixture repo goes in and a real report comes out end to end.
- The complete test utility library (fetch mocking, filesystem setup helpers, change-record builders, process-test runner).
- A representative subset of the plan's tests (roughly a third), chosen so that every test utility and every test tier is exercised at least two or three times — an abstraction with one usage can't be judged. Include some error-path and process tests, not just happy paths.

The review focuses on code layout and especially on the test abstractions: tests should be minimal, elegant and easy to read.

**Phase 2 — fill-in.** Everything repetitive or edge-case: remaining recognition rules and blockers, detection/report refinements, retries, remaining error paths, and the rest of the tests. No new files, helpers or test styles — everything slots into patterns approved in phase 1. Deviations from that expectation are a signal to stop and ask.

# Post-implementation review

Items to check after implementation, not to be acted on during it. These are tests flagged as needing special attention in a git-repo-hosted test suite; review how each turned out.

1. **`integration-test: script exits with the not-in-a-Git-repo error outside a repo`** — how did the test control cwd? `runCli` using `process.cwd()` means the test either calls `process.chdir()` (global state, hostile to parallel tests in the same worker) or `runCli` grew cwd injection. Also check the temp dir used is genuinely outside any git repo (a defensive assertion in the helper is cheap).

2. **Git not installed — untested gap.** The error message claims to cover "not a repo *or* Git is not installed", but those fail differently: a non-zero exit vs `execFileSync` throwing ENOENT. The code must handle both shapes; only one is tested. Testable as a process-test spawning the script with a PATH containing no `git`. Decide: add the test or explicitly accept the gap.

3. **Default-root behaviour is only testable at unit level.** Every integration and process test must pass `--root={fixture}` — without it the script scans the entire ag-skills repo (every fixture plus the repo's own package.json). So the unit test of `determineRoot` is the only coverage the default path can get, and the happy-path process test exercises `--root`, not the no-args invocation SKILL.md calls the normal case. Confirm this held and nothing "fixed" it.

4. **Ignored-package.json test** — confirm the runtime-written ignored file is cleaned up even when the test fails (its `.gitignore` is committed, the file itself is written at runtime).

5. **No-package.json-under-root fixture** — confirm the fixture uses a committed dummy file (git can't track an empty folder) and the test still expresses its intent clearly.
