<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Agent skills

- Domain: read `CONTEXT.md` and relevant `docs/adr/` first (`docs/agents/domain.md`).
- Issue tracker: local markdown under `.scratch/` (`docs/agents/issue-tracker.md`). Spec: `.scratch/month-end-salary-compile/spec.md`.
- Frontend (this repo): `.cursor/skills/ddb-next-frontend/SKILL.md` + always-on `.cursor/rules/ddb-cathedral-ui.mdc`（ADR-0089 聖堂暗色）。Also follow the global frontend rule for RWD / a11y / no surprise npm packages.
- Tests: `/tdd` at the agreed compile seam (live iCHEF 網頁取數 + `7月報表-中山 - 7月.csv` named columns; fixture regression without network).
- Zeabur：讀 `docs/ZEABUR-OPS-RULES.md` 與 `.cursor/rules/ddb-zeabur-deploy.mdc`（禁 `zeabur deploy`／禁服務變數 `NODE_ENV`；`RUN_DB_PUSH=0`）。
