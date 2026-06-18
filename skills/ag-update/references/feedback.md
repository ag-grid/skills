# Feedback

When the user accepts the offer to send feedback, assemble a sanitised file and have them email it to skill-feedback@ag-grid.com.

## 1. Ask

- How well did the process work?
- What went well?
- What went badly?

## 2. Assemble `feedback.md`

- Free-text answers from step 1.
- Run summary:
  - skill version (from `VERSION.md`)
  - agent and harness identity — which agent/model and which harness ran this upgrade, if known
  - products and from→to versions
  - framework(s)
  - single project or monorepo, plus a count of in-scope packages
  - legacy migrations triggered
  - per-step test pass/fail
  - whether the run completed or aborted, and where
- Skill-friction log: any doc URL that 404'd or did not match the expected pattern; pages missing the expected breaking-changes section; breaking changes hit in practice that the docs or skill did not warn about; skill instructions that were ambiguous or needed deviation.

## 3. Sanitise

Include only: AG version numbers, framework names, aggregate counts, and AG-public breaking-change identifiers. Never include file paths, code, customer package or repo names, or any project-identifying string. **Pause: show the file to the user and get confirmation before sending.**

## 4. Send

Ask the user to email `feedback.md` to skill-feedback@ag-grid.com.
