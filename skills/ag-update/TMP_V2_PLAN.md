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

The first operation of the script is to check the node version. To prevent static imports being imported above the version check, put it in its own file "version-check.ts" that is first in the import list with a comment explaining that it must be kept as the first import.

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

Note to agent: how?

#### Exception: not in a Git repo

If not in a Git repo, exit with an error:

    ERROR: not in a Git repo

    This script uses Git to search project files and determine which files to ignore.

    Ensure that the cwd is inside the source code Git repo.

    To run the script on files not tracked by Git, create a temporary Git repo in an appropriate parent directory and commit the project source files to it. Use .gitignore files to declare which files are not source code files, including node_modules files and build output folders. If there is an alternative VCS in use, use its ignore files or other relavent project configuration to determine the apporpriate files to ignore.

    IMPORTANT: creating this temporary Git repo will affect the user's workspace, ask them for permission before going ahead and creating a temporary Git repo.

### Determining the root folder

1. If --root specified, resolve it relative to cwd and use it
2. Otherwise, use the root of the current Git repo

test: relative root is resolved relative to cwd
test: absolute root path is supported

### Locating projects

Projects are located with Git only. A project is a folder containing a Git-tracked package.json file under the root.

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
function discoverDependencies(projectPath: string): Dependcencies {
  ...
}

type Dependencies {
  // Note to plan agent, fill in this type and related types as required
}
```

Encode the rules in packages.md to determine dependencies used.

test: products and versions detected when standard packages used
^^^ tests the current packages like ag-grid-community
test: charts version inferred when no charts dependency is specified
^^^ tests constant version offset and discovery of charts dependency via enableCharts (when using combined packages like @ag-grid-enterprise/all-modules charts is pulled in automatically so there will be no charts dependency)
test:

Note to plan agent: look at packages.md and propose full set of rules, plus tests. But don't re-encode all the rules in the tests, test an example of each kind of thing.

### Downloading version change records

Use `fetch()` to download the content of the relevant change files. Manually detect 'file://' prefix, strip it, and use fs.readFile assuming utf8.

Assume that if the file downloads, it matches the interfaces

test: file:// url supported
test: http:// url supported
test: bails with error if the files can't be downloaded or parsed

#### Exception: downloading version change record files fails

If the download fails, exit with a message like:

    ERROR: could not download $URL. Check if the Internet is enabled by loading a known-good URL, then try again.

    If the Internet is not available, ask the operator to fix the issue.

    If downloading fails persistently even though the Internet is available, there may be a bug in the ag-update skill, ask the user to rport it as an issue on GitHub: https://github.com/ag-grid/skills/issues

### Change detection

Note to plan agent: the compiled data format is designed to support detection. Comments on the interfaces should make clear how it is anticipated that records are used. The general idea is that you use git grep

Detection always targets the most recent available version ($mostRecentVersion): for each project, all changes between the project's current version and $mostRecentVersion are detected.

Propose a sample output format. The idea is that this stage is dumb, we're just scanning for changes that affect any project.

The format can be based on `CompiledChange`, but a this point we have file and line metadata for where we found the detectWords so should include that.

### Report generation

One report file is written per project to the output folder.

Note to plan agent: propose the report format here. Requirements known so far:

- Each change must be attributed to the version that introduced it, so that if the user chooses to update to an earlier version than $mostRecentVersion, the agent can disregard the items introduced after the chosen version.
- Optional changes must be presented as decision items (id, summary, recommendation, detected occurrences) so the agent can resolve them with the user while planning the update.

### Successful report message

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

 import { spawnSync } from 'node:child_process';
  const r = spawnSync('npx', ['-y', 'node@20', 'skills/ag-update/updater/bin.mjs', '.'],
                      { stdio: 'inherit' });
  process.exit(r.status ?? 1);   // non-zero = it broke on Node 20

# Code layout and test strategy

Note to plan agent, propose a full layout, types, functions corresponding to the stages below

Reason carefully about how to lay this out

Think how to test it.

What do we test as integration type tests, and what as unit tests?

Do we create fixtures with filesystems, or mock the filesystem?

If we create fixtures, how do we tie them to tests? foo.test.ts file in 

We have lots of tests for "bails with message if ..." how are we going to test that, invoking a process or calling a function?

With the right architecture, testing should be easy

## Output format

There is a standard output format

- Each output starts ERROR: or SUCCESS: followed by a status line
- There's a body message
- ERROR messages have an instruction on how to resolve the issue and, where relevant, re-invoke the command with appropriate arguments
- Code can add NOTICE: messages to the current output that appears at the bottom of the response

Note to agent: define interfaces / API mechanism for achieving this. I want to see something structured, not just a command returning a response string and assembling this manually with concatenation.

## Build process

Build with esbuild, use --format=cjs to use require() over import;

Create a file version-check.ts for checking the node version and import it first in the entry point before any other imports. --format=cjs ensures that this runs before any require() calls and checks the version before potentially failing on importing undefined modules.

# Development process

Once this plan is complete and I have agreed it, we will operate a development process to turn it into a matching implementation

While planning: think through details carefully and write something that you think will work

While developing: DO NOT CHANGE THE PLAN. If you discover that the plan can't be implemented as specified because the BEHAVIOUR doesn't work, stop and ask for guidance. It's OK to make trivial changes e.g. if the names or paths specified in the plan aren't right. Changes of behaviour ALWAYS need human confirmation.
