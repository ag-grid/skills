/** Argument parsing and validation. See SKILL.md for the documented arguments. */
import { DEFAULT_SOURCE_GLOB } from "./files.ts";
import { ExitWithError } from "./output.ts";
import type { Product } from "./types.ts";

export interface Args {
  /** Folder to scan for projects; optional, resolved later by determineRoot(). */
  root: string | undefined;
  /** Folder to write output files to; optional, defaults to a new temp folder. */
  outputFolder: string | undefined;
  /** Skip the skill version check, allowing an old version of the skill to be used. */
  allowOldVersion: boolean;
  /** Base URL for change record downloads; file: URLs supported. */
  changesUrlPrefix: string;
  /** Glob(s) selecting which source files are content-searched; defaults to DEFAULT_SOURCE_GLOB. */
  sourceGlob: string[];
  /** True when sourceGlob is the built-in default (no --source-glob supplied); the summary only
   *  prompts the agent to verify the glob when it was defaulted. */
  sourceGlobIsDefault: boolean;
  /** Explicit per-product target versions ("major.minor") from --<product>-target-version. A
   *  product absent here defaults to that product's latest; see run.ts for the compatibility rules. */
  targetVersions: Partial<Record<Product, string>>;
}

const DEFAULT_CHANGES_URL_PREFIX = "https://ag-grid.com/";

/** Target versions are given as major.minor (a minor is required; no patch or pre-release suffix). */
const TARGET_VERSION_PATTERN = /^\d+\.\d+$/;

/** The --<product>-target-version flag name per product. */
const TARGET_VERSION_FLAGS: Record<Product, string> = {
  grid: "--grid-target-version",
  charts: "--charts-target-version",
  studio: "--studio-target-version",
};

function parseTargetVersion(name: string, value: string): string {
  if (!TARGET_VERSION_PATTERN.test(value)) {
    throw new ExitWithError(`invalid ${name} value "${value}"`, [
      "Target versions must be given as major.minor (e.g. 34.2): a minor is required, and no patch or pre-release suffix is allowed.",
      `Invoke the command again passing ${name}=major.minor.`,
    ]);
  }
  return value;
}

/** Parses argv-style arguments; supports both --name=value and --name value forms. */
export function parseArgs(argv: string[]): Args {
  const args: Args = {
    root: undefined,
    outputFolder: undefined,
    allowOldVersion: false,
    changesUrlPrefix: DEFAULT_CHANGES_URL_PREFIX,
    sourceGlob: DEFAULT_SOURCE_GLOB,
    sourceGlobIsDefault: true,
    targetVersions: {},
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
      case "--source-glob":
        args.sourceGlob = [valueOf()];
        args.sourceGlobIsDefault = false;
        break;
      case TARGET_VERSION_FLAGS.grid:
        args.targetVersions.grid = parseTargetVersion(name, valueOf());
        break;
      case TARGET_VERSION_FLAGS.charts:
        args.targetVersions.charts = parseTargetVersion(name, valueOf());
        break;
      case TARGET_VERSION_FLAGS.studio:
        args.targetVersions.studio = parseTargetVersion(name, valueOf());
        break;
      case "--allow-old-version":
        args.allowOldVersion = true;
        break;
      default:
        throw new ExitWithError(`unknown argument ${arg}`, [
          "Supported arguments: --root=path, --output-folder=path, --allow-old-version, --changes-url-prefix=url, --source-glob=pattern, --grid-target-version=major.minor, --charts-target-version=major.minor, --studio-target-version=major.minor.",
          "Invoke the command again using only supported arguments.",
        ]);
    }
  }
  return args;
}

function splitArg(
  arg: string,
): [name: string, inlineValue: string | undefined] {
  const eq = arg.indexOf("=");
  return eq === -1 ? [arg, undefined] : [arg.slice(0, eq), arg.slice(eq + 1)];
}

function requireNextValue(name: string, argv: string[], index: number): string {
  const value = argv[index];
  if (value === undefined || value.startsWith("--")) {
    throw new ExitWithError(`argument ${name} requires a value`, [
      `Invoke the command again passing ${name}=value.`,
    ]);
  }
  return value;
}
