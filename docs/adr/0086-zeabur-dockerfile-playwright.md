# Zeabur：Dockerfile + Playwright；NeroSP 生產

DDB 掛 **NeroSP**（BeyRotate 生產 Project；非 `beyrotate_dev`）：庫 `ddb`、bucket `ddb`。根目錄 Dockerfile（standalone + Playwright jammy）；`binaryTargets` 含 `debian-openssl-3.0.x`；`db push` 用 `/opt/prisma-cli` 且 fail-fast。建置期禁連 DB（`force-dynamic` + bootstrap 跳過 production-build）。**勿**設 `NODE_ENV=production`；**勿**用 `zeabur deploy` 覆蓋 Git。初部完成後 **`RUN_DB_PUSH=0`**。平台實測規則：`docs/ZEABUR-OPS-RULES.md`；步驟：`docs/DEPLOY-ZEABUR.md`；Agent Spec：`docs/ZEABUR-AGENT-SPEC.md`。
