#!/usr/bin/env node
// Generates references/<product>/documentation-index.md for AG Grid / AG Charts /
// AG Studio from each product's docs nav (docs-nav/nav.json).
//
// The nav is fetched from the LATEST TAGGED GITHUB RELEASE via `gh` (so it works
// for private repos like ag-studio, and always tracks the current release).
//
// Output: one flat bullet list, no headings. Hierarchy is encoded in each leaf's
// colon-delimited path; only nodes with a slug are emitted. Reduction rules:
//   - DROP: a category/section title (hides its whole subtree) or a leaf slug (per product).
//   - TRIM: category titles kept but not added to the path prefix (per product).
//   - Path segments: exact-literal parent prefix trimmed off a child title.
//   - A segment is dropped if the slug already spells it out (every significant
//     word — >=4 letters or an all-caps acronym — appears as a substring).
//
// The preamble (through the first `---`) is HAND-AUTHORED and preserved; only the
// list below is regenerated. A new product file is bootstrapped with a stub
// preamble for you to fill in.
//
// Usage: node scripts/ag-dev/generate-documentation-index.mjs [grid|charts|studio|all]

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname } from "node:path";

const GRID_DROP = [
  "Tutorials",
  "AI Features",
  "server-side-operations-nodejs",
  "server-side-operations-graphql",
  "server-side-operations-oracle",
  "server-side-operations-spark",
];
const GRID_TRIM = [
  "Setup",
  "Compatibility & Security",
  "Rows",
  "Columns",
  "Selection",
  "Filtering",
  "Interactivity",
  "Accessories",
  "State & Lifecycle",
  "Performance",
  "Import & Export",
  "Server-Side Data",
];

const CHARTS_DROP = ["Tutorials"];
// note: charts uses "Security & Compatibility" (reversed vs grid's order)
const CHARTS_TRIM = [
  "Setup",
  "Security & Compatibility",
  "Interactivity",
  "Data Elements",
  "Layout & Styling",
];

// Studio: "Getting Around" is pure end-user UI (no value for an embedding dev).
// The "Working with …" sections are left KEEP pending a dev/end-user boundary call.
const STUDIO_DROP = ["Getting Around"];
const STUDIO_TRIM = ["Setup", "Compatibility & Security"];

const PRODUCTS = {
  grid: {
    label: "AG Grid",
    repo: "ag-grid/ag-grid",
    navPath: "documentation/ag-grid-docs/src/content/docs-nav/nav.json",
    out: "skills/ag-dev/references/grid/documentation-index.md",
    drop: GRID_DROP,
    trim: GRID_TRIM,
  },
  charts: {
    label: "AG Charts",
    repo: "ag-grid/ag-charts",
    navPath: "packages/ag-charts-website/src/content/docs-nav/nav.json",
    out: "skills/ag-dev/references/charts/documentation-index.md",
    drop: CHARTS_DROP,
    trim: CHARTS_TRIM,
  },
  studio: {
    label: "AG Studio",
    repo: "ag-grid/ag-studio",
    navPath: "packages/ag-studio-docs/src/content/docs-nav/nav.json",
    out: "skills/ag-dev/references/studio/documentation-index.md",
    drop: STUDIO_DROP,
    trim: STUDIO_TRIM,
  },
};

// ---- generic, product-agnostic rules ----

const fw = (node) => {
  const f = node?.frameworks;
  if (!f || !Array.isArray(f) || f.length === 0 || f.length === 4) return "";
  return ` (${f.join(",")} only)`;
};

const sigWords = (seg) =>
  (seg.match(/[A-Za-z0-9]+/g) || []).filter(
    (t) =>
      t.length >= 4 ||
      (t.length >= 2 && /[A-Z]/.test(t) && t === t.toUpperCase()),
  );

const recapitulated = (seg, slug) => {
  if (!slug) return false;
  const s = slug.toLowerCase().replace(/-/g, "");
  const w = sigWords(seg);
  return w.length > 0 && w.every((x) => s.includes(x.toLowerCase()));
};

const exactTrim = (title, parentRaw) => {
  if (parentRaw && title.toLowerCase().startsWith(parentRaw.toLowerCase())) {
    const t = title.slice(parentRaw.length).replace(/^[\s:–—-]+/, "");
    if (t) return t;
  }
  return title;
};

function buildTree(nav, dropSet, trimSet) {
  const lines = [];
  function walk(node, ancestors) {
    const title = node.title ?? "(untitled)";
    const slug = node.path || null;
    if (dropSet.has(title) || (slug && dropSet.has(slug))) return;
    const parentRaw = ancestors.length ? ancestors.at(-1).raw : null;
    if (slug) {
      const segs = [
        ...ancestors.map((a) => a.seg),
        exactTrim(title, parentRaw),
      ];
      const label = segs.filter((s) => !recapitulated(s, slug)).join(": ");
      const tail = `\`${slug}\`${fw(node)}`;
      lines.push(label ? `- ${label} ${tail}` : `- ${tail}`);
    }
    if (Array.isArray(node.children) && node.children.length) {
      const seg = exactTrim(title, parentRaw);
      const next = trimSet.has(title)
        ? ancestors
        : [...ancestors, { raw: title, seg }];
      for (const c of node.children) walk(c, next);
    }
  }
  for (const section of nav.sections) {
    if (dropSet.has(section.title)) continue;
    for (const child of section.children ?? []) walk(child, []);
  }
  return lines;
}

// ---- fetch nav.json from the latest tagged release (via gh, auth-aware) ----

function fetchNav(repo, navPath) {
  const tag = execSync(`gh api repos/${repo}/releases/latest --jq .tag_name`, {
    encoding: "utf8",
  }).trim();
  const raw = execSync(
    `gh api "repos/${repo}/contents/${navPath}?ref=${tag}" -H "Accept: application/vnd.github.raw"`,
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  return { tag, nav: JSON.parse(raw) };
}

// preserve the hand-authored preamble; bootstrap a stub for a new product file
function preambleFor(out, label, repo) {
  if (existsSync(out)) {
    const ex = readFileSync(out, "utf8").split("\n");
    const sep = ex.findIndex((l) => l.trim() === "---");
    if (sep !== -1) return ex.slice(0, sep + 1).join("\n");
  }
  return (
    `# ${label} documentation index\n\n` +
    `<!-- TODO: hand-author this preamble (docs URL template + usage). Everything below the '---' is generated -->\n\n` +
    `---`
  );
}

function generate(key) {
  const p = PRODUCTS[key];
  const { tag, nav } = fetchNav(p.repo, p.navPath);
  const lines = buildTree(nav, new Set(p.drop), new Set(p.trim));
  const out =
    preambleFor(p.out, p.label, p.repo) + "\n\n" + lines.join("\n") + "\n";
  mkdirSync(dirname(p.out), { recursive: true });
  writeFileSync(p.out, out);
  process.stderr.write(
    `[${key}] ${p.repo}@${tag}\n  -> ${p.out}\n  ~${Math.round(out.length / 4)} tokens, ${lines.length} bullets\n`,
  );
}

const which = process.argv[2] ?? "all";
const keys = which === "all" ? Object.keys(PRODUCTS) : [which];
for (const k of keys) {
  if (!PRODUCTS[k]) {
    process.stderr.write(`unknown product: ${k}\n`);
    continue;
  }
  try {
    generate(k);
  } catch (e) {
    process.stderr.write(`[${k}] FAILED: ${e.message}\n`);
  }
}
