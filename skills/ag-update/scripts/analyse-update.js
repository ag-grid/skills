"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  formatCrashDetails: () => formatCrashDetails,
  runCli: () => runCli
});
module.exports = __toCommonJS(main_exports);

// src/version-check.ts
var nodeMajor = parseInt(process.versions.node.split(".")[0], 10);
if (nodeMajor < 20) {
  process.stderr.write(`ERROR: minimum Node.js 20 version required (current version = ${process.version})
`);
  process.exit(1);
}

// src/main.ts
var fs4 = __toESM(require("node:fs"), 1);
var os = __toESM(require("node:os"), 1);
var path4 = __toESM(require("node:path"), 1);
var import_node_url = require("node:url");

// src/output.ts
var notices = [];
function addNotice(message) {
  notices.push(message);
}
function succeed(statusLine, body, outputFolder, reportFiles) {
  return { status: "SUCCESS", statusLine, body, notices, outputFolder, reportFiles };
}
var ExitWithError = class extends Error {
  output;
  constructor(statusLine, body) {
    super(statusLine);
    this.name = "ExitWithError";
    this.output = { status: "ERROR", statusLine, body, notices, outputFolder: "", reportFiles: {} };
  }
};
function render(output) {
  const parts = [
    `${output.status}: ${output.statusLine}`,
    ...output.body,
    ...output.notices.map((notice) => `NOTICE: ${notice}`)
  ];
  return parts.join("\n\n") + "\n";
}

// src/args.ts
var DEFAULT_CHANGES_URL_PREFIX = "https://ag-grid.com/";
function parseArgs(argv) {
  const args = {
    root: void 0,
    outputFolder: void 0,
    allowOldVersion: false,
    changesUrlPrefix: DEFAULT_CHANGES_URL_PREFIX
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const [name, inlineValue] = splitArg(arg);
    const valueOf = () => inlineValue ?? requireNextValue(name, argv, ++i);
    switch (name) {
      case "--root":
        args.root = valueOf();
        break;
      case "--output-folder":
        args.outputFolder = valueOf();
        break;
      case "--changes-url-prefix":
        args.changesUrlPrefix = valueOf();
        break;
      case "--allow-old-version":
        args.allowOldVersion = true;
        break;
      default:
        throw new ExitWithError(`unknown argument ${arg}`, [
          "Supported arguments: --root=path, --output-folder=path, --allow-old-version, --changes-url-prefix=url.",
          "Invoke the command again using only supported arguments."
        ]);
    }
  }
  return args;
}
function splitArg(arg) {
  const eq = arg.indexOf("=");
  return eq === -1 ? [arg, void 0] : [arg.slice(0, eq), arg.slice(eq + 1)];
}
function requireNextValue(name, argv, index) {
  const value = argv[index];
  if (value === void 0 || value.startsWith("--")) {
    throw new ExitWithError(`argument ${name} requires a value`, [
      `Invoke the command again passing ${name}=value.`
    ]);
  }
  return value;
}

// src/git.ts
var import_node_child_process = require("node:child_process");
var EXEC_OPTIONS = {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  maxBuffer: 64 * 1024 * 1024
};
function gitRepoRoot(cwd) {
  try {
    return (0, import_node_child_process.execFileSync)("git", ["rev-parse", "--show-toplevel"], { ...EXEC_OPTIONS, cwd }).trim();
  } catch {
    throw new ExitWithError("not in a Git repo or Git is not installed", [
      "This script uses Git to search project files and determine which files to ignore.",
      "Ensure that the cwd is inside the source code Git repo and that Git is installed.",
      "To run the script on files not tracked by Git, create a temporary Git repo in an appropriate parent directory and commit the project source files to it. Use .gitignore files to declare which files are not source code files, including node_modules files and build output folders. If there is an alternative VCS in use, use its ignore files or other relavent project configuration to determine the apporpriate files to ignore.",
      "IMPORTANT: creating this temporary Git repo will affect the user's workspace, ask them for permission before going ahead and creating a temporary Git repo."
    ]);
  }
}
function lsPackageJsonFiles(rootPath) {
  const stdout = (0, import_node_child_process.execFileSync)("git", ["-C", rootPath, "ls-files", "**/package.json", "package.json"], EXEC_OPTIONS);
  return stdout.split("\n").filter((line) => line !== "");
}
function grepFixedStrings(dir, words) {
  if (words.length === 0) return [];
  const patternArgs = words.flatMap((word) => ["-e", word]);
  let stdout;
  try {
    stdout = (0, import_node_child_process.execFileSync)("git", ["-C", dir, "grep", "-n", "--fixed-strings", ...patternArgs, "--", "."], EXEC_OPTIONS);
  } catch (e) {
    if (e.status === 1) return [];
    throw e;
  }
  return stdout.split("\n").filter((line) => line !== "").map((line) => {
    const [file, lineNumber] = line.split(":", 2);
    const content = line.slice(file.length + lineNumber.length + 2);
    return { file, line: parseInt(lineNumber, 10), content };
  });
}

// src/types.ts
function compareVersions(a, b) {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// src/detect.ts
function detectChanges(project, changelogs) {
  const changes = [];
  const wordSearched = [];
  for (const dependency of project.dependencies) {
    const changelog = changelogs.get(dependency.product);
    if (!changelog) continue;
    for (const change of changelog.changes) {
      const candidate = classifyCandidate(change, dependency, changelog.mostRecentVersion);
      if (candidate === "excluded") continue;
      const detected = { product: dependency.product, change, occurrences: [] };
      (candidate === "search" ? wordSearched : changes).push(detected);
    }
  }
  changes.push(...matchDetectWords(project.projectPath, wordSearched));
  return { ...project, changes };
}
function classifyCandidate(change, dependency, mostRecentVersion) {
  if (change.type === "dependency") {
    const applies = change.dependency === "typescript" || dependency.frameworks.includes(change.dependency);
    return applies ? "included" : "excluded";
  }
  if (change.framework !== null && !dependency.frameworks.includes(change.framework)) return "excluded";
  const version = change.type === "transition" ? change.removedFrom : change.version;
  if (version === null) return "excluded";
  const inRange = compareVersions(version, dependency.currentVersion) > 0 && compareVersions(version, mostRecentVersion) <= 0;
  if (!inRange) return "excluded";
  return change.detectWords === null ? "included" : "search";
}
function matchDetectWords(projectPath, candidates) {
  const words = new Set(candidates.flatMap((candidate) => detectWordsOf(candidate.change)));
  const hits = grepFixedStrings(projectPath, [...words]);
  const occurrencesByWord = new Map([...words].map((word) => [word, []]));
  for (const hit of hits) {
    for (const word of words) {
      if (containsWholeWord(hit.content, word)) {
        occurrencesByWord.get(word).push({ file: hit.file, line: hit.line });
      }
    }
  }
  return candidates.filter((candidate) => {
    for (const word of detectWordsOf(candidate.change)) {
      for (const { file, line } of occurrencesByWord.get(word)) {
        candidate.occurrences.push({ file, line, word });
      }
    }
    return candidate.occurrences.length > 0;
  });
}
function detectWordsOf(change) {
  return change.type === "dependency" ? [] : change.detectWords ?? [];
}
var IDENTIFIER_CHAR = /[A-Za-z0-9_$]/;
function containsWholeWord(content, word) {
  for (let from = content.indexOf(word); from !== -1; from = content.indexOf(word, from + 1)) {
    const before = content[from - 1];
    const after = content[from + word.length];
    if ((before === void 0 || !IDENTIFIER_CHAR.test(before)) && (after === void 0 || !IDENTIFIER_CHAR.test(after))) {
      return true;
    }
  }
  return false;
}

// src/project-info.ts
var fs = __toESM(require("node:fs"), 1);
var path = __toESM(require("node:path"), 1);
var RECOGNISED_PACKAGES = {
  // Grid
  "ag-grid-community": { product: "grid" },
  "ag-grid-enterprise": { product: "grid" },
  "ag-grid-react": { product: "grid", framework: "react" },
  "ag-grid-angular": { product: "grid", framework: "angular" },
  "ag-grid-vue3": { product: "grid", framework: "vue" },
  "@ag-grid-community/locale": { product: "grid" },
  // Charts
  "ag-charts-community": { product: "charts" },
  "ag-charts-enterprise": { product: "charts" },
  "ag-charts-react": { product: "charts", framework: "react" },
  "ag-charts-angular": { product: "charts", framework: "angular" },
  "ag-charts-vue3": { product: "charts", framework: "vue" },
  "ag-charts-locale": { product: "charts" },
  "ag-charts-types": { product: "charts" },
  "ag-charts-server-side": { product: "charts" },
  // Studio
  "ag-studio": { product: "studio" },
  "ag-studio-react": { product: "studio", framework: "react" },
  "ag-studio-angular": { product: "studio", framework: "angular" },
  "ag-studio-vue3": { product: "studio", framework: "vue" },
  "ag-studio-locale": { product: "studio" }
};
var PRODUCT_ORDER = ["grid", "charts", "studio"];
function getProjectInfo(projectPath, gitRepoRoot2) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectPath, "package.json"), "utf8"));
  const specs = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const byProduct = /* @__PURE__ */ new Map();
  const blockers = [];
  for (const [packageName, spec] of Object.entries(specs)) {
    const recognition = RECOGNISED_PACKAGES[packageName];
    if (!recognition) continue;
    let entry = byProduct.get(recognition.product);
    if (!entry) {
      entry = { version: void 0, frameworks: /* @__PURE__ */ new Set() };
      byProduct.set(recognition.product, entry);
    }
    entry.version ??= parseConcreteVersion(spec);
    if (recognition.framework) entry.frameworks.add(recognition.framework);
  }
  const dependencies = [];
  for (const product of PRODUCT_ORDER) {
    const entry = byProduct.get(product);
    if (!entry) continue;
    if (entry.version === void 0) continue;
    dependencies.push({ product, currentVersion: entry.version, frameworks: [...entry.frameworks].sort() });
  }
  return {
    projectPath,
    relativeProjectPath: path.relative(gitRepoRoot2, projectPath) || ".",
    dependencies,
    blockers
  };
}
function parseConcreteVersion(spec) {
  return spec.match(/\d+\.\d+(?:\.\d+)?(?:[-+][\w.-]+)?/)?.[0];
}

// src/projects.ts
var path2 = __toESM(require("node:path"), 1);
function determineRoot(cwd, rootArg, gitRepoRoot2) {
  return rootArg !== void 0 ? path2.resolve(cwd, rootArg) : gitRepoRoot2;
}
function locateProjects(rootPath) {
  let packageJsonPaths;
  try {
    packageJsonPaths = lsPackageJsonFiles(rootPath);
  } catch (e) {
    throw couldNotLocateProjects(e.message);
  }
  if (packageJsonPaths.length === 0) {
    throw couldNotLocateProjects(`no package.json files found under ${rootPath}`);
  }
  return packageJsonPaths.map((packageJsonPath) => path2.join(rootPath, path2.dirname(packageJsonPath)));
}
function couldNotLocateProjects(detail) {
  return new ExitWithError(`could not find projects using \`git ls-files\` (${detail})`, [
    "A project is a folder containing a package.json file tracked by Git. Check that the root folder is inside the source code Git repo and that the projects' package.json files are committed (or at least staged).",
    'To scan a different folder, invoke the command again passing --root="path".'
  ]);
}

// src/records.ts
var fs3 = __toESM(require("node:fs/promises"), 1);

// src/skill-version.ts
var fs2 = __toESM(require("node:fs"), 1);
var path3 = __toESM(require("node:path"), 1);
var import_meta = {};
var RELEASED_VERSION_URL = "https://raw.githubusercontent.com/ag-grid/skills/main/skills/ag-update/VERSION.md";
function localSkillVersion() {
  let dir = typeof __dirname !== "undefined" ? __dirname : new URL(".", import_meta.url).pathname;
  for (let i = 0; i < 4; i++) {
    const candidate = path3.join(dir, "VERSION.md");
    if (fs2.existsSync(candidate)) {
      return fs2.readFileSync(candidate, "utf8").trim();
    }
    dir = path3.dirname(dir);
  }
  throw new Error(`VERSION.md not found in any folder above ${__dirname}`);
}
function newerSkillVersionError(current, newVersion) {
  return new ExitWithError(
    `a new version of this skill is available. Current version ${current}; new version ${newVersion}.`,
    [
      "Tell the user that they are recommended to update the skill by running `npx skills update ag-grid/skills`, but alternatively may choose to continue running this outdated version.",
      "Stop and wait for the user to respond. If they ask to continue using this version, invoke the script again adding the --allow-old-version argument."
    ]
  );
}
async function checkSkillVersion(allowOldVersion) {
  if (allowOldVersion) return;
  const local = localSkillVersion();
  let released;
  try {
    const response = await fetch(RELEASED_VERSION_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    released = (await response.text()).trim();
  } catch {
    addNotice(
      `currently using ag-update v${local}, could not fetch ${RELEASED_VERSION_URL} to check if a newer version exists`
    );
    return;
  }
  if (compareVersions(released, local) > 0) {
    throw newerSkillVersionError(local, released);
  }
}

// src/records.ts
var CHANGELOG_PATHS = {
  grid: "version-change-records.json",
  charts: "charts/version-change-records.json",
  studio: "studio/version-change-records.json"
};
function changelogUrl(prefix, product) {
  return `${prefix.replace(/\/$/, "")}/${CHANGELOG_PATHS[product]}`;
}
async function downloadChangeRecords(prefix, products) {
  const changelogs = /* @__PURE__ */ new Map();
  for (const product of products) {
    const url = changelogUrl(prefix, product);
    let changelog;
    try {
      changelog = JSON.parse(await downloadText(url));
    } catch {
      throw downloadFailure(url);
    }
    const local = localSkillVersion();
    if (compareVersions(local, changelog.minimumSkillVersion) < 0) {
      throw newerSkillVersionError(local, changelog.minimumSkillVersion);
    }
    changelogs.set(product, changelog);
  }
  return changelogs;
}
async function downloadText(url) {
  if (url.startsWith("file://")) {
    return fs3.readFile(url.slice("file://".length), "utf8");
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}
function downloadFailure(url) {
  return new ExitWithError(
    `could not download ${url}. Check if the Internet is enabled by loading a known-good URL, then try again.`,
    [
      "If the Internet is not available, ask the operator to fix the issue.",
      "If downloading fails persistently even though the Internet is available, there may be a bug in the ag-update skill, ask the user to report it as an issue on GitHub: https://github.com/ag-grid/skills/issues"
    ]
  );
}

// src/report.ts
var PREAMBLE = `# AG dependency update report

This file contains a list of changes to apply to the project described in the Scope section
below. Combine it with your knowledge of the coding conventions and verification tools
available for this project to plan and execute an update. After applying these changes use
the appropriate tools at your disposal to validate that the changes were successful, such as
running the build, typechecking, tests, and starting the dev server and accessing it with a
browser.`;
var OPTIONAL_INTRO = "The changes in this section are optional: the project will still work if they are accepted as-is. Resolve each decision below with the user while planning the update.";
var CANNOT_RULE_OUT = "Detected in: this change cannot be ruled out by searching the source code; check whether it applies to this project during planning.";
var PRODUCT_LABELS = { grid: "Grid", charts: "Charts", studio: "Studio" };
function reportFileName(projectPath) {
  return `${projectPath.split("/").filter(Boolean).pop()}-report.md`;
}
function renderReport(result, changelogs) {
  const scope = [
    "# Scope",
    [
      `- Project path: ${result.relativeProjectPath}`,
      ...result.dependencies.map(({ product, currentVersion, frameworks }) => {
        const via = frameworks.length > 0 ? frameworks.join(", ") : "the vanilla javascript API";
        const target = changelogs.get(product)?.mostRecentVersion;
        return `- ${PRODUCT_LABELS[product]}: current version ${currentVersion}, target version ${target}, used via ${via}`;
      })
    ].join("\n")
  ];
  const required = result.changes.filter((c) => c.change.type !== "behaviour" && c.change.type !== "style");
  const optional = result.changes.filter((c) => c.change.type === "behaviour" || c.change.type === "style");
  const sections = [
    PREAMBLE,
    ...scope,
    "# Required changes",
    ...required.length > 0 ? renderGroupedChanges(result, required) : ["No required changes were detected."],
    "# Optional changes",
    ...optional.length > 0 ? [OPTIONAL_INTRO, ...renderGroupedChanges(result, optional)] : ["No optional changes were detected."]
  ];
  return sections.join("\n\n") + "\n";
}
function renderGroupedChanges(result, changes) {
  const parts = [];
  for (const { product } of result.dependencies) {
    const productChanges = changes.filter((change) => change.product === product);
    if (productChanges.length === 0) continue;
    parts.push(`## ${PRODUCT_LABELS[product]}`);
    const majors = [...new Set(productChanges.map((change) => majorOf(changeVersion(change.change))))];
    majors.sort((a, b) => a - b);
    for (const major of majors) {
      parts.push(`### ${PRODUCT_LABELS[product]} v${major - 1}.x -> v${major}.x`);
      const inTransition = productChanges.filter((change) => majorOf(changeVersion(change.change)) === major).sort((a, b) => compareVersions(changeVersion(a.change), changeVersion(b.change)));
      for (const change of inTransition) {
        parts.push(...renderChange(result, change));
      }
    }
  }
  return parts;
}
function renderChange(result, detected) {
  const { change } = detected;
  const parts = [];
  switch (change.type) {
    case "transition": {
      parts.push(`#### REMOVED: ${change.oldApi}`);
      const sentences = [`As of v${change.removedFrom}, ${change.oldApi} has been removed.`];
      if (change.oldDescription) sentences.push(change.oldDescription);
      if (change.newApi !== null) {
        sentences.push(`Use ${change.newApi} instead.`);
        if (change.newDescription) sentences.push(change.newDescription);
      } else {
        sentences.push("It has no replacement.");
      }
      parts.push(sentences.join(" "));
      break;
    }
    case "requirement":
      parts.push(`#### REQUIRED: ${change.title}`);
      if (change.description) parts.push(change.description);
      break;
    case "behaviour":
    case "style":
      parts.push(`#### DECISION: ${change.title}`);
      if (change.description) parts.push(change.description);
      break;
    case "dependency":
      parts.push(`#### DEPENDENCY: ${change.dependency} >= ${change.minVersion}`);
      if (change.reason) parts.push(change.reason);
      break;
  }
  parts.push(...renderMitigation(result, detected), renderOccurrences(detected));
  return parts;
}
function renderMitigation(result, detected) {
  const { change } = detected;
  if (change.type === "dependency") return [];
  const frameworks = [
    "javascript",
    ...result.dependencies.find(({ product }) => product === detected.product)?.frameworks ?? []
  ];
  const applicable = change.mitigation.filter(
    (entry) => entry.frameworks.some((framework) => frameworks.includes(framework))
  );
  if (applicable.length === 0) {
    const acceptOnly = change.type === "behaviour" || change.type === "style";
    return acceptOnly ? ["Mitigation: none \u2014 this change can only be accepted."] : [];
  }
  return [`Mitigation: ${applicable.map((entry) => entry.content).join("\n\n")}`];
}
function renderOccurrences(detected) {
  if (detected.occurrences.length === 0) return CANNOT_RULE_OUT;
  const lines = detected.occurrences.map(({ file, line, word }) => `- ${file}:${line} (${word})`);
  return ["Detected in:", "", ...lines].join("\n");
}
function changeVersion(change) {
  return change.type === "transition" ? change.removedFrom : change.version;
}
function majorOf(version) {
  return parseInt(version.split(".")[0], 10);
}

// src/main.ts
var import_meta2 = {};
var PRODUCT_ORDER2 = ["grid", "charts", "studio"];
async function runCli(...argv) {
  try {
    return await run(argv);
  } catch (e) {
    throw e instanceof ExitWithError ? e : crashError(e);
  }
}
async function run(argv) {
  const args = parseArgs(argv);
  await checkSkillVersion(args.allowOldVersion);
  const cwd = process.cwd();
  const repoRoot = gitRepoRoot(cwd);
  const root = determineRoot(cwd, args.root, repoRoot);
  const projects = locateProjects(root).map((projectPath) => getProjectInfo(projectPath, repoRoot));
  const updatable = projects.filter((p) => p.dependencies.length > 0 && p.blockers.length === 0);
  const blocked = projects.filter((p) => p.blockers.length > 0);
  const noAgDependencies = projects.filter((p) => p.dependencies.length === 0 && p.blockers.length === 0);
  const productsInUse = PRODUCT_ORDER2.filter(
    (product) => updatable.some((p) => p.dependencies.some((d) => d.product === product))
  );
  const changelogs = productsInUse.length > 0 ? await downloadChangeRecords(args.changesUrlPrefix, productsInUse) : /* @__PURE__ */ new Map();
  const outputFolder = args.outputFolder ? path4.resolve(cwd, args.outputFolder) : fs4.mkdtempSync(path4.join(os.tmpdir(), "ag-update-"));
  const reportFiles = {};
  for (const project of updatable) {
    reportFiles[reportFileName(project.projectPath)] = renderReport(detectChanges(project, changelogs), changelogs);
  }
  const output = succeed(
    "report files produced",
    successBody(productsInUse, changelogs, updatable, blocked, noAgDependencies, outputFolder),
    outputFolder,
    reportFiles
  );
  output.reportFiles["summary.md"] = render(output);
  return output;
}
function successBody(productsInUse, changelogs, updatable, blocked, noAgDependencies, outputFolder) {
  const body = [];
  if (productsInUse.length > 0) {
    const latest = productsInUse.map(
      (product) => `${PRODUCT_LABELS[product]} v${changelogs.get(product).mostRecentVersion}`
    );
    body.push(`The latest versions are: ${latest.join(", ")}.`);
  }
  body.push(
    "Discovered the following projects and created update reports:",
    updatable.map((project) => {
      const using = project.dependencies.map((d) => `${PRODUCT_LABELS[d.product]} v${d.currentVersion}`).join(", ");
      return `- ${project.projectPath}: using ${using} -> ${path4.join(outputFolder, reportFileName(project.projectPath))}`;
    }).join("\n")
  );
  if (blocked.length > 0) {
    body.push(
      "The following projects cannot be updated by this skill and have no report. Tell the user about them and continue:",
      blocked.map((project) => `- ${project.projectPath}: ${project.blockers.map((b) => b.reason).join("; ")}`).join("\n")
    );
  }
  if (noAgDependencies.length > 0) {
    body.push(
      "The following projects contain no AG dependencies and were not analysed:",
      noAgDependencies.map((project) => `- ${project.projectPath}`).join("\n")
    );
  }
  body.push(
    "Confirm with the user that they want to update to the latest versions. If they choose an earlier version, disregard the report items introduced after the chosen version.",
    "Confirm with the user that this is the correct set of projects to update, and disregard the reports for any projects they do not want to update.",
    "Use your normal planning process and knowledge of the application's structure, coding standards, and development process to plan the change. Take into account the number of changes. If there are a very large number of changes across many files it may make sense to work with the user to plan a phased approach. If there are only a few changes it may be appropriate to apply them in a single phase. Work with the user to make an appropriate plan."
  );
  return body;
}
function crashError(e) {
  return new ExitWithError(
    "the script terminated because of an internal error, details below. This is a bug in the skill. Please report it as an issue on GitHub: https://github.com/ag-grid/skills/issues",
    [formatCrashDetails(e)]
  );
}
function formatCrashDetails(e) {
  if (!(e instanceof Error)) return String(e);
  const lines = [`${e.name}: ${e.message}`];
  for (const frame of (e.stack ?? "").split("\n").slice(1)) {
    const parsed = frame.match(/^\s*at\s+(?:(.+?)\s+\()?([^()]*?)(?::\d+:\d+)?\)?$/);
    if (!parsed) continue;
    const [, functionName, framePath] = parsed;
    const skillIndex = framePath.indexOf("/ag-update/scripts");
    if (skillIndex === -1) continue;
    const shortPath = framePath.slice(skillIndex);
    lines.push(functionName ? `  at ${functionName} (${shortPath})` : `  at ${shortPath}`);
  }
  return lines.join("\n");
}
function runAsBin() {
  process.on("uncaughtException", (e) => exitWith(crashError(e).output));
  process.on("unhandledRejection", (e) => exitWith(crashError(e).output));
  if (process.env.MOCK_EXCEPTION) throw new Error("MOCK_EXCEPTION");
  if (process.env.MOCK_UNHANDLED_REJECTION) void Promise.reject(new Error("MOCK_UNHANDLED_REJECTION"));
  void runCli(...process.argv.slice(2)).then(
    (output) => {
      writeReportFiles(output);
      exitWith(output);
    },
    (e) => exitWith(e instanceof ExitWithError ? e.output : crashError(e).output)
  );
}
function exitWith(output) {
  process.stderr.write(render(output));
  process.exit(output.status === "SUCCESS" ? 0 : 1);
}
function writeReportFiles(output) {
  try {
    fs4.mkdirSync(output.outputFolder, { recursive: true });
    for (const [name, content] of Object.entries(output.reportFiles)) {
      fs4.writeFileSync(path4.join(output.outputFolder, name), content);
    }
  } catch {
    exitWith(
      new ExitWithError(`could not write to ${output.outputFolder}`, [
        "Invoke the command again passing --output-folder=path and selecting a path that the script will be able to write to"
      ]).output
    );
  }
}
var isCjsEntry = typeof require !== "undefined" && typeof module !== "undefined" && require.main === module;
var isEsmEntry = typeof import_meta2 !== "undefined" && !!process.argv[1] && import_meta2.url === (0, import_node_url.pathToFileURL)(process.argv[1]).href;
if (isCjsEntry || isEsmEntry) {
  runAsBin();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  formatCrashDetails,
  runCli
});
