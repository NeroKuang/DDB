# Zeabur：Dockerfile + Playwright；掛現役 Project

DDB 上 Zeabur 掛 **BeyRotate 正式／現役 Project**（非已下線的 `beyrotate_dev`）：共用該 Project 的 Postgres／MinIO，獨立庫 `ddb`、bucket `ddb`。根目錄 Dockerfile（standalone + Playwright Chromium）；聽 `PORT`；首次 `RUN_DB_PUSH=1`。MinIO 存證第一版必備。外部 HTTP cron（月結逾時 ≥15 分）。本機基礎設施用 DDB 自己的 `docker-compose.yml`，不依賴 BeyRotate 本機 compose。步驟見 `docs/DEPLOY-ZEABUR.md`；Agent Spec 見 `docs/ZEABUR-AGENT-SPEC.md`。
