/** Derives a change's optionality classification and a version-free explanatory statement from the
 *  compiled fields. Optionality is a function of (change, targetVersion) only — never the project.
 *
 *  Three classifications:
 *  - MANDATORY: no choice; the change must be applied, or (for accept-only changes) simply happens.
 *  - MITIGATE_TO_ACCEPT: optional; the old API still works, so applying the mitigation (the steps to
 *    update) is how you accept the change. Do nothing to keep the old API.
 *  - DISCARD_TO_ACCEPT: optional; the new behaviour is already the default, so discarding the
 *    mitigation (doing nothing) accepts the change. Apply the mitigation to restore the old behaviour.
 *
 *  Optional classifications are flagged DECISION_REQUIRED in the report (rendered there, not here).
 *
 *  targetVersion is the version the report is generated for; until --target-version lands it is
 *  always the changelog's mostRecentVersion. */
import { compareVersions, type CompiledChange } from "./types.ts";

export type Optionality =
  "MANDATORY" | "MITIGATE_TO_ACCEPT" | "DISCARD_TO_ACCEPT";

export interface OptionalityResult {
  level: Optionality;
  /** Version-free explanation shown after the classification on the Optionality line. */
  statement: string;
}

function assertNever(value: never): never {
  throw new Error(`unhandled change type: ${JSON.stringify(value)}`);
}

/** The version at which a change becomes relevant, given the target the report is generated for.
 *  For a transition it is the removal version if the removal has occurred by the target, else the
 *  deprecation version — which is null for a removal-without-deprecation scheduled after the target,
 *  meaning the change is not yet relevant and should be excluded. For every other change it is the
 *  change's own version. Shared by detection (range/exclusion) and the report (grouping/sorting). */
export function relevantVersion(
  change: CompiledChange,
  target: string,
): string | null {
  if (change.type === "transition") {
    return change.removedFrom !== null &&
      compareVersions(change.removedFrom, target) <= 0
      ? change.removedFrom
      : change.deprecatedFrom;
  }
  return change.version;
}

export function optionalityOf(
  change: CompiledChange,
  targetVersion: string,
): OptionalityResult {
  switch (change.type) {
    case "transition": {
      const removedByTarget =
        change.removedFrom !== null &&
        compareVersions(change.removedFrom, targetVersion) <= 0;
      if (removedByTarget) {
        return { level: "MANDATORY", statement: "old API removed" };
      }
      // Not removed by the target: the old API is still available, so the agent must decide
      // whether to migrate now. Applying the mitigation (steps to update) accepts the change.
      return {
        level: "MITIGATE_TO_ACCEPT",
        statement: change.isSoft
          ? "old API is not deprecated and remains fully supported; applications should consider updating if it benefits them"
          : "old API deprecated; applications will be required to update in a future major and may choose to update now",
      };
    }
    case "requirement":
      return {
        level: "MANDATORY",
        statement: "new requirement; no option to restore old behaviour",
      };
    case "behaviour":
      return change.mitigation.length > 0
        ? {
            level: "DISCARD_TO_ACCEPT",
            statement: "follow mitigation advice to restore old behaviour",
          }
        : {
            level: "MANDATORY",
            statement:
              "there is no documented flag to restore the old behaviour",
          };
    case "style":
      return change.mitigation.length > 0
        ? {
            level: "DISCARD_TO_ACCEPT",
            statement:
              "follow mitigation advice to restore the previous appearance",
          }
        : {
            level: "MANDATORY",
            statement:
              "there is no single flag to revert the style changes, but the new appearance can be customised with CSS",
          };
    case "dependency":
      return {
        level: "MANDATORY",
        statement:
          "minimum supported version raised; verify the installed version",
      };
    default:
      return assertNever(change);
  }
}
