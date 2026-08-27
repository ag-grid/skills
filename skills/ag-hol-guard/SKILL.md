---
name: ag-hol-guard
description: Protect local coding-agent implementation sessions for AG Grid, AG Charts and AG Studio with HOL Guard before tools run
---

# HOL Guard for AG Implementation Sessions

Use this skill when a coding agent is about to apply an AG Grid, AG Charts, or AG Studio implementation plan and the user wants an additional local approval boundary before state-changing tools run.

## Rules

- HOL Guard is a local agent-harness boundary. It is not an AG Grid, AG Charts, or AG Studio runtime feature.
- Keep the project's normal tests, type checks, build checks, source control review, and user decisions authoritative.
- Do not mark a workspace protected until a HOL Guard command proves status.
- Never bypass a Guard approval to finish an AG update.
- Preserve user changes and inspect repository state before edits.

## Install Check

Check whether HOL Guard is already available:

```bash
command -v hol-guard
```

If it is missing and `pipx` is available, install the isolated runtime CLI:

```bash
pipx install hol-guard
```

Inspect the current environment:

```bash
hol-guard status
hol-guard detect --json
```

Use the exact supported harness identifier returned by detection. Do not keep a separate hard-coded harness list in this skill.

## Protect the Implementation Harness

Before asking the coding agent to apply an `AG_UPDATE_CHANGES.md` plan or make other state-changing AG implementation edits, run:

```bash
hol-guard bootstrap
hol-guard install <harness>
hol-guard run <harness> --dry-run
hol-guard run <harness>
hol-guard status
```

The dry run lets the user inspect Guard-owned harness changes before activation. Continue only after `hol-guard status` confirms the installed state.

If Guard blocks or queues work:

```bash
hol-guard approvals
hol-guard receipts
hol-guard diff <harness>
```

Do not approve automatically. Read the risk reason and command scope first.

## Apply the AG Plan Normally

Once the harness is protected, use the existing AG update workflow and repository checks unchanged. HOL Guard does not decide which AG behaviour changes to accept, choose target versions, validate an AG migration, or replace tests. It only adds the local agent execution boundary around the supported harness.

For HOL Guard command semantics, use the maintained project documentation at https://github.com/hashgraph-online/hol-guard.
