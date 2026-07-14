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

The first operation of the script is to check the node version. To prevent static imports being imported above the version check, put it in its own file "version-check.ts" that is first in the import list with a comment explaining that it must be kept as the first import. If the node version is less than 20, we exit immediately with a process.stderr.write(`Minimum Node.js 20 version require (current version = ${version})\n`) message. DO NOT call any other files or use functions for outputting messages, since including files may fail due to unsupported node APIs.

Next we check the skill version

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

test: command exits early if newer skill available
test: --allow-old-version skips version check

### Checking Git state

This skill needs to be run in a Git repo, since it uses `git ls-files` and `git grep` to search.

Verify that we're in a Git repo.

Run `git rev-parse --show-toplevel` via `execFileSync` from cwd. A non-zero exit means we're not in a Git repo or git is not installed. On success, stdout is the absolute path of the repo root — keep it, it is the default root in "Determining the root folder" below, so no second git call is needed.

test: script exits with the not-in-a-Git-repo error outside a repo

#### Exception: not in a Git repo or Git is not installed

If not in a Git repo, exit with an error:

    ERROR: not in a Git repo or Git is not installed

    This script uses Git to search project files and determine which files to ignore.

    Ensure that the cwd is inside the source code Git repo and that Git is installed.

    To run the script on files not tracked by Git, create a temporary Git repo in an appropriate parent directory and commit the project source files to it. Use .gitignore files to declare which files are not source code files, including node_modules files and build output folders. If there is an alternative VCS in use, use its ignore files or other relavent project configuration to determine the apporpriate files to ignore.

    IMPORTANT: creating this temporary Git repo will affect the user's workspace, ask them for permission before going ahead and creating a temporary Git repo.

### Determining the root folder

1. If --root specified, resolve it relative to cwd and use it
2. Otherwise, use the root of the current Git repo

test: relative root is resolved relative to cwd
test: absolute root path is supported
test: Git repo root is used if no root provided

### Locating projects

A project is a folder containing a Git-tracked package.json file under the root.

Run (`execFileSync('git', ['-C', rootPath, 'ls-files', '**/package.json', 'package.json'])`)

test: tracked package.json files are located with Git
^^^ includes writing an ignored package.json and asserting that it doesn't show up

test: --root limits located projects to those under the root folder

#### Exception: could not locate projects

If ls-files fails or finds no package.json files, exit with a message like:

    ERROR: could not find projects using `git ls-files` ({e.message from thrown error, or "no package.json files found under $rootPath"})

    A project is a folder containing a package.json file tracked by Git. Check that the root folder is inside the source code Git repo and that the projects' package.json files are committed (or at least staged).

    To scan a different folder, invoke the command again passing --root="path".

### Determining dependencies


```ts
function discoverDependencies(projectPath: string): Dependencies {
  ...
}
DECISION: added Studio here, review for studio compatibility across project
type Product = 'grid' | 'charts' | 'studio';
type Framework = 'react' | 'angular' | 'vue' | 'javascript';

interface Dependencies {
  /** Products in use with their resolved current versions. Empty = project uses no AG products. */
  products: ProductUsage[];
  /** Every AG package found in dependencies + devDependencies, as written in package.json. */
  agPackages: PackageUsage[];
  /** Inferred from framework wrapper packages; 'javascript' if none. Used to build documentation URLs. */
  framework: Framework;
  /** Conditions from packages.md that make this project un-updatable by this skill (see below). */
  blockers: Blocker[];
}

interface PackageUsage {
  name: string;
  /** The version spec string as written, e.g. "^32.1.0" */
  versionSpec: string;
}

interface ProductUsage {
  product: Product;
  /** Resolved current version, e.g. "32.1.0" */
  currentVersion: string;
}

interface Blocker {
  packageName: string;
  /** Human-readable explanation, surfaced in the report/summary. */
  reason: string;
}
```

Encode the rules in packages.md to determine dependencies used:

- A project uses `grid` if it depends on any current or legacy grid package (`ag-grid-community`, `ag-grid-enterprise`, wrappers, `@ag-grid-community/*`, `@ag-grid-enterprise/*`, `ag-grid`, `ag-grid-vue`, `ag-grid-charts-enterprise`, ...)
- A project uses `charts` if it depends on any charts package (`ag-charts-community`, `ag-charts-enterprise`, wrappers, `ag-charts-locale`, ...)
- Projects with no AG packages are dropped from the project list and get no report (list them in a NOTICE so the agent knows they were seen and skipped)
- Current version is parsed from the version spec by stripping range operators (`^`, `~`, `>=` etc.)
  // REVIEW: version specs that don't contain a concrete version (e.g. "*", "latest", workspace protocols) are not handled — the old flow said "use the package manager to determine what actual version is installed" (references/determine-scope.md) but that isn't specified for this script. Decide: bail with ERROR, or NOTICE and skip the project? DECISION: add to blockers
- If the grid integrated charts feature is used (detected via enableCharts / integrated-charts module usage) and there is no explicit charts dependency, infer the charts version from the grid version using the constant major offset of 22 (same minor/patch)
- Blockers (from packages.md): bare `ag-grid` dependency (pre-v18, below the supported floor of grid major >= 25); any grid version below major 25; `ag-grid-vue` or `@ag-grid-community/vue` (Vue 2 wrappers, cannot move past v31 — and this script always targets $mostRecentVersion)

  // REVIEW: behaviour when a project has blockers is not specified elsewhere in this plan. Proposal: still write reports for the other projects; for a blocked project write no report, and include the blocker reason in the SUCCESS summary with an instruction to tell the user. Confirm. DECISION: confirm, add to appropriate section

test: products and versions detected when standard packages used
^^^ tests the current packages like ag-grid-community
test: charts version inferred when no charts dependency is specified
^^^ tests constant version offset and discovery of charts dependency via enableCharts (when using combined packages like @ag-grid-enterprise/all-modules charts is pulled in automatically so there will be no charts dependency)
test: framework detected from wrapper package, javascript when none
test: project with no AG dependencies is excluded and listed in a NOTICE
test: legacy `ag-grid` package yields a blocker
test: Vue 2 wrapper package yields a blocker
test: version spec range operators are stripped when resolving current version

Don't re-encode all the rules in the tests, test an example of each kind of thing.

### Downloading version change records

// REVIEW: the compiled change record format, and the URL path(s) requested under --changes-url-prefix, are not defined anywhere in this repo (`CompiledChange` and `detectWords` are referenced below but external/ag-website-shared is an empty/uninitialised submodule). This section can't be completed until that format and its hosting paths are specified. DECISION: external/ag-website-shared is a symlink to a repo containing the types, file is compiled-change-types.ts

// REVIEW: how $mostRecentVersion is determined is not specified anywhere in this plan, and it drives change detection, report content, and the SUCCESS message. Proposal: the change records include (or are accompanied by) an index file listing available versions, and $mostRecentVersion is the highest version present. Confirm or specify an alternative (e.g. npm registry query). DECISION: see the compiled type

Use `fetch()` to download the content of the relevant change files. Manually detect 'file://' prefix, strip it, and use fs.readFile assuming utf8.

Assume that if the file downloads, it matches the interfaces
// REVIEW: contradiction — the line above says to assume a downloaded file matches the interfaces, but the test below asserts bailing when files can't be "downloaded or parsed". Decide whether parse failures are handled (ERROR) or undefined behaviour. DECISION: by "parse" I mean "parse as JSON". If it parses, assume it matches the interfaces.

test: file:// url supported
test: http:// url supported
test: bails with error if the files can't be downloaded or parsed

#### Exception: downloading version change record files fails

We should try to download the files 3 times with a 500m then 2s delay.

If the download fails, exit with a message like:

    ERROR: could not download $URL. Check if the Internet is enabled by loading a known-good URL, then try again.

    If the Internet is not available, ask the operator to fix the issue.

    If downloading fails persistently even though the Internet is available, there may be a bug in the ag-update skill, ask the user to rport it as an issue on GitHub: https://github.com/ag-grid/skills/issues

### Change detection

Detection always targets the most recent available version ($mostRecentVersion): for each project, all changes between the project's current version and $mostRecentVersion are detected.

This stage is dumb: for each change record applicable to a project's version range, run `git grep` for its detectWords within the project's folder. Any match — even in a comment — means the change is included with its occurrences. No source analysis happens here; interpreting matches is the planning agent's job (mirrors the approach in references/determine-changes.md: "Do a dumb search... DO NOT read project source code"). DECISION: not once per change record, once per project. Search for the combined set of detectWords that potentially apply to that project based on the products it uses, since the version it depends on. When you find the matching files, you'll need to load them to find the actual matched words and line numbers.

// REVIEW: output format below filled in per "Note to plan agent". It assumes a `CompiledChange` shape (id, product, version introduced, type, change/mitigation text, detectWords) that is not yet defined — see the REVIEW note in "Downloading version change records". Adjust once the real interface is available. 

```ts
/** One change from the compiled records that may affect a project. */
interface DetectedChange {
  /** The compiled record verbatim (carries id, type BREAKING|BEHAVIOUR, change and
   *  mitigation text, and the version that introduced it). */
  change: CompiledChange;
  /** Where the change's detectWords matched in this project, from git grep. */
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
interface ProjectDetectionResult {
  projectPath: string;
  dependencies: Dependencies;
  /** Changes with at least one occurrence. Changes whose detectWords matched nothing are omitted. */
  changes: DetectedChange[];
}
```

// REVIEW: changes that apply unconditionally (e.g. "module registration required from v33", package renames from packages.md) have no detectWords to grep for — the detection model above only includes changes with occurrences. Decide how always-applicable changes are represented (e.g. a `alwaysApplies: true` flag on CompiledChange that includes the change with zero occurrences). DECISION: tell me if this is still relevant once you've seen the data model you're flying blind at the moment.

DECISION: it sounds like you haven't seen the compiled data model, the idea of this exercise was to base the results on it so I'm going to take everything below here as invalid. Look up the compiled format and rework this as required. You may also look at the authoring format in change-types.ts next to compiled-change-types.ts.

test: change with matching detectWords is included with file/line occurrences
test: change whose detectWords match nothing is omitted
test: changes outside the project's version range are not scanned for
test: matches outside a project's folder do not count toward that project

### Report generation

One report file is written per project to the output folder.

Requirements known so far:

- Each change must be attributed to the version that introduced it, so that if the user chooses to update to an earlier version than $mostRecentVersion, the agent can disregard the items introduced after the chosen version.
- Optional changes must be presented as decision items (id, summary, recommendation, detected occurrences) so the agent can resolve them with the user while planning the update.

// REVIEW: format below filled in per "Note to plan agent". It is based on the existing AG_UPDATE_CHANGES.md format in references/determine-changes.md (product -> major version transition -> change), extended with occurrences and decision items.

// REVIEW: "optional changes" are assumed to be exactly the BEHAVIOUR-type changes (the user decides whether to accept the new behaviour or restore the old), with BREAKING changes always required. Confirm this mapping — if "optional" is a separate concept in the compiled records, the format needs a third grouping.

The report is markdown, named `{projectFolderName}-report.md`. Structure:

- Preamble: the content of references/changes-file-preamble.md verbatim
  // REVIEW: changes-file-preamble.md references [./AG_UPDATE_SCOPE.md], which no longer exists in the single-report design — the preamble needs updating or replacing with report-specific text.
- `# Scope` — project path, framework, products with current versions (flagging inferred ones), target version $mostRecentVersion, and the AG packages found in package.json
- `# Required changes` — the BREAKING changes, grouped by product (`## Grid` / `## Charts`) then by major version transition (`### Grid v{FROM}.x -> v{TO}.x`), so items after a user-chosen earlier version can be disregarded wholesale by skipping later transition sections
  - each change: `#### BREAKING: {description}` followed by a "Change: " paragraph, a "Mitigation: " paragraph (both from the compiled record), and a "Detected in: " list of `{file}:{line} ({word})` occurrences
- `# Optional changes` — the BEHAVIOUR changes, grouped and formatted identically, each with heading `#### DECISION {id}: {description}` and an additional "Recommendation: " line from the compiled record. The section starts with a fixed sentence instructing the agent to resolve each decision with the user during planning.

test: report groups changes by product and version transition
test: BREAKING changes appear under Required changes, BEHAVIOUR under Optional changes
test: occurrences are listed with file and line
test: report written per project with expected filename

### Successful report message

// REVIEW: the per-project lines below only mention "Grid v..." — projects may use charts only, or both products. The message should render whichever products each project uses.

// REVIEW: the default for --output-folder when not passed is unspecified (SKILL.md documents the arg as optional). Proposal: create a temp folder via fs.mkdtemp and report its path in this message. Confirm.

Exit 0 with a message like:

  SUCCESS: report files produced

  The latest version is $mostRecentVersion.

  Discovered the following projects and created update reports:

  - /path/to/project1: using Grid v$currentVersionProject1 -> /path/to/output/folder/project1-report.md
  - /path/to/project2: using Grid v$currentVersionProject2 -> /path/to/output/folder/project2-report.md

  Confirm with the user that they want to update to v$mostRecentVersion. If they choose an earlier version, disregard the report items introduced after the chosen version.

  Confirm with the user that this is the correct set of projects to update, and disregard the reports for any projects they do not want to update.

  Use your normal planning process and knowledge of the application's structure, coding standards, and development process to plan the change. Take into account the number of changes. If there are a very large number of changes across many files it may make sense to work with the user to plan a phased approach. If there are only a few changes it may be appropriate to apply them in a single phase. Work with the user to make an appropriate plan.

## General exception handling

### writing file fails

If writing any file fails, exit with an error message:

    ERROR: could not write to $outputFolder

    Invoke the command again passing --output-folder=path and selecting a path that the script will be able to write to

### Crash

If there's an uncaught exception or unhandled promise rejection, exit with a stack trace and a message like:

    ERROR: the script terminated because of an internal error, details below. This is a bug in the skill. Please report it as an issue on GitHub: https://github.com/ag-grid/skills/issues

    {Details, includiong stack trace if available}

test: unhandled promise rejection yields crash report
test: unhandled exception yields crash report


## Build

We need to ship JS in the skill. We need a build process that converts TS to JS so we can commit the generated

test: compiled js is up to date
^^^ fail this test if the js file in ag-update/scripts/analyse-update.js is out of date from the .ts source

## Integration tests

At least one test should invoke the real compiled script and verify output as expected

We need a matrix of supported versions and invoke them via npx e.g.

// REVIEW: the example below references `skills/ag-update/updater/bin.mjs` but the Build section and SKILL.md say the compiled script is `skills/ag-update/scripts/analyse-update.js` — reconcile the path.

 import { spawnSync } from 'node:child_process';
  const r = spawnSync('npx', ['-y', 'node@20', 'skills/ag-update/updater/bin.mjs', '.'],
                      { stdio: 'inherit' });
  process.exit(r.status ?? 1);   // non-zero = it broke on Node 20

# Code layout and test strategy

// REVIEW: this whole section filled in per "Note to plan agent"

## Layout

Source in `skills/ag-update/scripts/src/`, compiled output committed at `skills/ag-update/scripts/analyse-update.js`:

    src/
      version-check.ts   # node version guard; MUST stay the first import of main.ts
      main.ts            # entry point: parses args, runs the stages in order, single place
                         # that renders output, writes to stderr and calls process.exit
      output.ts          # ScriptOutput type, succeed()/fail() constructors, addNotice(), render()
      args.ts            # argument parsing and validation -> Args type
      git.ts             # execFile wrappers: repoRoot(), lsFiles(), grep()
      projects.ts        # locate projects from git ls-files output
      dependencies.ts    # discoverDependencies() and packages.md rules
      records.ts         # fetch change records (http/https/file), parse, mostRecentVersion
      detect.ts          # run git grep for detectWords -> ProjectDetectionResult[]
      report.ts          # render report markdown from ProjectDetectionResult
      types.ts           # shared interfaces (Dependencies, DetectedChange, ...)

Each stage is a pure-ish function taking explicit inputs and returning a value (no globals except the notice collector); `main.ts` is the only file with side-effectful orchestration. Errors that should terminate with an ERROR output are thrown as `ExitWithError` (see Output format) and caught once in `main.ts`.

## Test strategy

- **Unit tests** (the bulk, including all "bails with message if ..." tests): call the stage functions — or `run(args)` in `main.ts`, which returns/throws `ScriptOutput` without touching `process.exit` — and assert on the structured `ScriptOutput` object. No process spawning, so they're fast and message assertions are exact.
- **Integration tests** (few): spawn the compiled `analyse-update.js` against a fixture repo and assert on exit code and stderr text. One happy-path run, one ERROR run, plus the node-version matrix via npx described under "Integration tests" above.
- **Filesystem**: real filesystem, no fs mocking — the script's core operations are `git ls-files`/`git grep`, which can't be meaningfully mocked. A test helper creates a fixture repo in a temp folder (write files, `git init`, `git add`) from a declarative spec: `makeFixtureRepo({ 'app/package.json': '...', 'app/src/main.ts': '...' })`. Fixtures are therefore defined inline in each test file next to the assertions that use them, not checked into the repo (committed `.git` folders don't survive cloning).
  // REVIEW: there is an existing checked-in fixture convention at tests/harness/cases/*/fixture/ in this repo (see tests/harness/cases/skill-already-latest/). Decide whether script tests should reuse that harness or use the inline temp-repo helper proposed here.
- **Network**: change-record fetching is tested with `file://` URLs pointing at fixture record files; the http path is covered by one unit test against a local `http.createServer` and by the version-check tests.

With this architecture every ERROR path is a value-returning branch, so testing is a plain function call plus an object assertion.

## Output format

There is a standard output format

- Each output starts ERROR: or SUCCESS: followed by a status line
- There's a body message
- ERROR messages have an instruction on how to resolve the issue and, where relevant, re-invoke the command with appropriate arguments
- Code can add NOTICE: messages to the current output that appears at the bottom of the response

// REVIEW: interfaces below filled in per "Note to agent"

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
}

/** Construct the single success outcome. */
function succeed(statusLine: string, body: string[]): ScriptOutput;

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

test: notices added during the run appear at the bottom of both success and error output
test: ExitWithError thrown from a stage renders as ERROR output with exit code 1

## Build process

Build with esbuild, use --format=cjs to use require() over import;

Create a file version-check.ts for checking the node version and import it first in the entry point before any other imports. --format=cjs ensures that this runs before any require() calls and checks the version before potentially failing on importing undefined modules.

// REVIEW: minor typos left unfixed per instructions: "Dependcencies" (fixed in the filled-in code block only), "rport" (download error message), "includiong" (crash message), "relavent"/"apporpriate" (not-in-a-Git-repo message), "one of more" — none survive into implemented behaviour except the ones inside quoted output messages, which will otherwise ship verbatim.

# Development process

Once this plan is complete and I have agreed it, we will operate a development process to turn it into a matching implementation

While planning: think through details carefully and write something that you think will work

While developing: DO NOT CHANGE THE PLAN. If you discover that the plan can't be implemented as specified because the BEHAVIOUR doesn't work, stop and ask for guidance. It's OK to make trivial changes e.g. if the names or paths specified in the plan aren't right. Changes of behaviour ALWAYS need human confirmation.
