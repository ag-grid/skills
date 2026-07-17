/** Downloads the compiled change records for the products in use. */
import * as fs from "node:fs/promises";
import * as https from "node:https";
import { ExitWithError, stringifyError } from "./output.ts";
import { localSkillVersion, newerSkillVersionError } from "./skill-version.ts";
import {
  compareVersions,
  type CompiledChangelog,
  type Product,
} from "./types.ts";

const CHANGELOG_PATHS: Record<Product, string> = {
  grid: "version-change-records.json",
  charts: "charts/version-change-records.json",
  studio: "studio/version-change-records.json",
};

/** The URL a product's changelog is downloaded from; exported so tests mock the exact same URLs. */
export function changelogUrl(prefix: string, product: Product): string {
  return `${prefix.replace(/\/$/, "")}/${CHANGELOG_PATHS[product]}`;
}

/** Delays before download retries: try, wait 500ms, retry, wait 2s, retry (3 attempts total). */
const RETRY_DELAYS_MS = [500, 2000];

/** Downloads one changelog per product in use; throws ExitWithError on download/JSON-parse failure
 *  or when a changelog's minimumSkillVersion exceeds the local skill version. */
export async function downloadChangeRecords(
  prefix: string,
  products: Product[],
): Promise<Map<Product, CompiledChangelog>> {
  const changelogs = new Map<Product, CompiledChangelog>();
  for (const product of products) {
    const url = changelogUrl(prefix, product);
    let changelog: CompiledChangelog;
    try {
      changelog = JSON.parse(await downloadWithRetries(url));
    } catch (e) {
      throw new ExitWithError(
        `could not download ${url} (${stringifyError(e)}). Check if the Internet is enabled by loading a known-good URL, then try again.`,
        [
          "If the Internet is not available, ask the operator to fix the issue.",
          "If downloading fails persistently even though the Internet is available, there may be a bug in the ag-update skill, ask the user to report it as an issue on GitHub: https://github.com/ag-grid/skills/issues",
        ],
      );
    }
    const local = localSkillVersion();
    if (compareVersions(local, changelog.minimumSkillVersion) < 0) {
      // This floor cannot be bypassed with --allow-old-version: the script cannot read the data.
      throw newerSkillVersionError(local, changelog.minimumSkillVersion);
    }
    changelogs.set(product, changelog);
  }
  return changelogs;
}

/** Downloads a URL, retrying transient network failures with the RETRY_DELAYS_MS backoff. Local
 *  file:// reads are not retried: a missing/unreadable file fails the same way every attempt. */
async function downloadWithRetries(url: string): Promise<string> {
  if (url.startsWith("file://")) return downloadText(url);
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt - 1]);
    try {
      return await downloadText(url);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadText(url: string): Promise<string> {
  if (url.startsWith("file://")) {
    return fs.readFile(url.slice("file://".length), "utf8");
  }
  // A localhost https server (the dev change-records server) uses a self-signed cert that the
  // system trust store doesn't know, so fetch's TLS verification fails. Skip verification for
  // localhost only — real downloads from ag-grid.com keep full cert validation via fetch.
  if (isLocalhostHttps(url)) {
    return getInsecure(url);
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function isLocalhostHttps(url: string): boolean {
  const { protocol, hostname } = new URL(url);
  return (
    protocol === "https:" &&
    (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1")
  );
}

/** GET a URL over https without TLS certificate verification; only used for localhost. */
function getInsecure(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      { rejectUnauthorized: false },
      (response) => {
        const status = response.statusCode ?? 0;
        if (status < 200 || status >= 300) {
          response.resume();
          reject(new Error(`HTTP ${status}`));
          return;
        }
        response.setEncoding("utf8");
        let body = "";
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () => resolve(body));
      },
    );
    request.on("error", reject);
  });
}
