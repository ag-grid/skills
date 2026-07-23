# D10 — Cross-skill description proposal (ag-dev vs ag-update)

Status: PROPOSAL ONLY. Do not copy into SKILL.md here — the later synthesis
step (D1/D3/D6) owns writing `skills/ag-dev/SKILL.md`, and `ag-update/SKILL.md`
is edited separately. This file records the two proposed `description:` values
and the reasoning.

## Current state

`skills/ag-update/SKILL.md` currently ships:

```
description: Update AG Grid and/or AG Charts to a newer version
```

How it triggers today: the model matches on "Update … to a newer version".
It is narrow and clean *in isolation*, but it leans on a single verb ("Update")
and one noun phrase ("newer version"). Real update requests are phrased many
other ways ("migrate to v33", "bump AG Grid", "move off the legacy theme API",
"we're on v28, get us current"). Once a deliberately broad `ag-dev` exists,
those under-specified phrasings are exactly what a greedy generalist would grab.
So `ag-update` needs sharpening at the same time `ag-dev` is introduced.

## Reference format

Repo house style (README + `ag-update`) favours a short imperative line. The
Anthropic Agent Skills / marketplace convention — visible across the skills
listed in this environment (e.g. `ag-update`, `plunker`, `dataviz`) — is:

> `<one-line what it does>. Use when <situations>. Trigger phrases: "…", "…".`

The description is always in context and the model decides routing from it, so
the winning descriptions (a) state scope, (b) enumerate trigger phrases, and
(c) name the boundary explicitly ("not for X — use Y"). We use that shape here.

---

## (a) Proposed `ag-dev` description

```
description: >-
  Help build, configure, debug, or choose features for anything using AG Grid
  or AG Charts — writing new grid/chart code, wiring up column definitions, row
  models, cell renderers, series, and options, fixing a blank/broken grid or
  chart, picking the right feature or approach, and answering "how do I…" and
  "why isn't this working" questions. Covers all frameworks (React, Angular,
  Vue, vanilla JS/TS). Use for any AG Grid / AG Charts development task. Do NOT
  use for upgrading or migrating between versions — hand version updates and
  breaking-change migrations to the ag-update skill.
```

## (b) Proposed `ag-update` description (revised)

```
description: >-
  Upgrade or migrate an existing AG Grid and/or AG Charts project from one
  version to another — bumping the installed version, applying breaking-change
  migrations, and moving off deprecated/legacy APIs as part of a version change.
  Use ONLY for version-to-version update/migration work. Trigger phrases:
  "update AG Grid to v33", "upgrade AG Charts", "migrate to the latest version",
  "bump our AG Grid version", "we're on v28, get us to current", "fix breaking
  changes from the upgrade". For building, configuring, or debugging AG Grid /
  AG Charts at the current version, use the ag-dev skill instead.
```

---

## (c) Rationale — how the pair avoids trigger competition

1. **One shared subject, two disjoint verbs.** Both skills own "AG Grid / AG
   Charts", so routing turns entirely on the *action*. `ag-dev` claims the
   build/configure/debug/choose verbs; `ag-update` claims exactly one action —
   moving between versions. The verbs do not overlap, so a correctly-phrased
   request has only one strong match.

2. **Explicit mutual exclusion, stated from both sides.** `ag-dev` says "Do NOT
   use for upgrading or migrating … hand to ag-update"; `ag-update` says "For
   building/configuring/debugging … use ag-dev instead." Each description names
   the *other* skill and the boundary. A cross-reference on both sides is far
   more reliable than a carve-out on only one, because whichever description the
   model weighs first still sees the hand-off.

3. **The broad skill carves out, the narrow skill fences in.** `ag-dev` is
   intentionally greedy ("any AG Grid / AG Charts development task") with a
   single explicit exception. `ag-update` is intentionally narrow ("ONLY for
   version-to-version work") and spends its trigger-phrase budget on the many
   ways people ask for an upgrade — the phrasings most at risk of being
   swallowed. This asymmetry is deliberate: the exception in the broad skill and
   the specificity in the narrow skill reinforce the same boundary.

4. **The genuinely ambiguous case resolves correctly.** "Move off the legacy
   theme API" reads as deprecation work. If it is part of a version bump, it is
   an `ag-update` job — hence `ag-update` explicitly claims "moving off
   deprecated/legacy APIs *as part of a version change*", while `ag-dev` keeps
   general "which API should I use" feature-choice questions. The qualifier
   ("as part of a version change") is what keeps `ag-update` from over-claiming
   every deprecation question.

5. **Belt-and-braces with the body.** Per D1/D3, `ag-dev`'s SKILL.md router will
   also carry a line: "if this is a version update/migration task, delegate to
   the ag-update skill." So even if `ag-dev` fires on a borderline update
   request, the body redirects it. The description does the routing; the body is
   the safety net.

## (d) Residual risk

- **Routing is probabilistic, not deterministic.** The model chooses from the
  always-in-context descriptions; there is no hard precedence rule. A vague
  prompt ("help me with my AG Grid v33 stuff") can plausibly match either skill.
  The body-level delegation line (point 5) is the mitigation, not a guarantee.
- **Update-during-development bleed.** A user mid-build who hits a breaking
  change may get `ag-dev` (they framed it as debugging), or a user who says
  "update my grid config" may wrongly trigger `ag-update` on the word "update".
  The trigger phrases bias `ag-update` toward *version* language specifically to
  reduce this, but the verb "update" is inherently overloaded.
- **Longer descriptions cost context and can dilute.** Packing trigger phrases
  improves recall but a very long `description` is weighed against every other
  skill in context; if these grow further they may need trimming.
- **Maintenance coupling.** The two descriptions now reference each other by
  name. If either skill is renamed or its scope shifts, both descriptions (and
  the router line) must be updated together or the hand-off breaks.
