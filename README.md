# DDB

店家在 iCHEF 之上的薪資報表編成與業績核對（中山門市第一期）。不取代 POS。

規格：`.scratch/month-end-salary-compile/spec.md`  
詞彙：`CONTEXT.md`　決策：`docs/adr/`

## 本機

Dev server **5003**（不要用 3000）。基礎設施用 **本 repo 的 `docker compose`**（Postgres **5432** 庫 **`ddb`**；MinIO **9000**／主控台 **9001** bucket **`ddb`**）。**不要**再依賴 BeyRotate 本機 compose（`beyrotate_dev` 已下線／不共用）。

```bash
# 若 5432／9000 已被其他容器佔用，先停掉（例如舊 BeyRotate compose）
docker compose up -d          # 或 npm run docker:up
cp .env.example .env
# 填 Auth、iCHEF、CRON_SECRET（DB／MinIO 本機預設已寫在 .env.example）
npm install
npm run db:push
npm run dev
```

本機預設連線（與 `docker-compose.yml` 一致）：

```env
DATABASE_URL=postgresql://ddb:ddb_dev@localhost:5432/ddb
MINIO_ENDPOINT=http://127.0.0.1:9000
MINIO_ACCESS_KEY=ddb
MINIO_SECRET_KEY=ddb_dev_minio
MINIO_BUCKET=ddb
```

`minio-init` 會自動建 bucket **`ddb`**。主控台：[http://127.0.0.1:9001](http://127.0.0.1:9001)。

**必填三項**：`MINIO_ENDPOINT`、`MINIO_ACCESS_KEY`、`MINIO_SECRET_KEY` 都有值才會上傳；缺任一項時匯入仍寫 DB，但 MinIO／保留策略／下載 tar.gz 會略過。

改 `.env` 後請**重啟** `npm run dev`。

開 [http://localhost:5003](http://localhost:5003)。空庫會用 `ADMIN_USERNAME`／`ADMIN_PASSWORD` 種子第一個 Admin。

```bash
npm run typecheck
npm test          # fixture 編成（不連 iCHEF）
npm run test:ichef  # 真實網頁取數（需 .env 憑證；不斷言密碼）
```

## 環境變數

完整範本：`.env.example`。`.env` / `.env.local` **不要 commit**。iCHEF 帳密只給網頁取數用，不要打進畫面或 log。

| 變數                   | 必填   | 說明                                             |
| ---------------------- | ------ | ------------------------------------------------ |
| `DATABASE_URL`         | ✓      | Postgres 連線；庫名建議 `ddb`                    |
| `AUTH_SECRET`          | ✓      | NextAuth 簽章用隨機字串                          |
| `AUTH_URL`             | ✓      | 本站 URL（本機 `http://localhost:5003`）         |
| `NEXTAUTH_SECRET`      | ✓      | 可與 `AUTH_SECRET` 相同                          |
| `NEXTAUTH_URL`         | ✓      | 可與 `AUTH_URL` 相同                             |
| `NEXT_PUBLIC_SITE_URL` | ✓      | 可與 `AUTH_URL` 相同                             |
| `ADMIN_USERNAME`       | ✓      | 首次 bootstrap 的 Admin 帳號                     |
| `ADMIN_PASSWORD`       | ✓      | 首次 bootstrap 的 Admin 密碼                     |
| `CRON_SECRET`          | 排程用 | 外部 cron 打 API 時的 `Authorization: Bearer …`  |
| `MINIO_ENDPOINT`       | 存證用 | S3 相容 endpoint（**內網 URL**，見 Zeabur 一節） |
| `MINIO_ACCESS_KEY`     | 存證用 | MinIO ROOT USER                                  |
| `MINIO_SECRET_KEY`     | 存證用 | MinIO ROOT PASSWORD                              |
| `MINIO_BUCKET`         | 選填   | 預設 `ddb`                                       |
| `STORE_ID`             | 取數用 | iCHEF 門市 ID                                    |
| `LOGIN_ID`             | 取數用 | iCHEF 登入帳號                                   |
| `LOGIN_PASSWORD`       | 取數用 | iCHEF 登入密碼                                   |

匯入成功後：結構化資料在 **Postgres**；iCHEF 原檔在 MinIO **`raw/`**；編成稽核在 **`audit/`**（見 ADR-0083）。

## 外部排程（Cron）

Zeabur 若無內建排程，可用 [cron-job.org](https://cron-job.org) 等以 **HTTPS GET** + Bearer 觸發。兩支 API 共用同一個 `CRON_SECRET`。

### 月結網頁取數

對齊 ADR-0061：建議 **每月 2 日 12:00（Asia/Taipei）** 執行，取「上一個日曆月」薪資期。

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  "https://你的-ddb-網域/api/cron/month-end-fetch"
```

成功時會建立上期 `PayPeriod` 並啟動 iCHEF 網頁取數（需已設定 `STORE_ID`／`LOGIN_ID`／`LOGIN_PASSWORD`）。

### raw 分級保留

建議 **每月 1 次**（例如每月 3 日），壓縮／清除 MinIO **`raw/`** 舊檔；**audit** 與 DB 不受影響。

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  "https://你的-ddb-網域/api/cron/storage-retention"
```

Admin 也可登入後到 [**raw 保留策略**](http://localhost:5003/storage-retention) 手動「立即執行保留策略」或「立即壓縮」；已壓縮期間可「下載 tar.gz」。

## Zeabur 部署

**完整步驟與驗收**：[`docs/DEPLOY-ZEABUR.md`](docs/DEPLOY-ZEABUR.md)（ADR-0086）。  
**給 Zeabur AI Agent 的可執行 Spec**：[`docs/ZEABUR-AGENT-SPEC.md`](docs/ZEABUR-AGENT-SPEC.md)。

摘要：掛在 **BeyRotate 正式／現役 Zeabur Project**（**不要**用已下線的 `beyrotate_dev`）；建置用根目錄 **Dockerfile**（含 Playwright）；MinIO bucket **`ddb` 必備**；首次 `RUN_DB_PUSH=1` 後改 `0`；網域用 `${ZEABUR_WEB_URL}`；月結／保留用**外部 cron**（月結逾時 ≥15 分）。本機基礎設施用本 repo `docker compose`，不共用 BeyRotate 本機帳密。

### 變數範本（Edit as Raw）

```env
DATABASE_URL=postgresql://<user>:<password>@<postgres-internal-host>:5432/ddb

AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=${ZEABUR_WEB_URL}
NEXTAUTH_SECRET=<與 AUTH_SECRET 相同>
NEXTAUTH_URL=${ZEABUR_WEB_URL}
NEXT_PUBLIC_SITE_URL=${ZEABUR_WEB_URL}

ADMIN_USERNAME=admin
ADMIN_PASSWORD=<強密碼>

CRON_SECRET=<隨機字串>
RUN_DB_PUSH=1

MINIO_ENDPOINT=http://<minio-internal-host>:9000
MINIO_ACCESS_KEY=<MinIO ROOT USER>
MINIO_SECRET_KEY=<MinIO ROOT PASSWORD>
MINIO_BUCKET=ddb

STORE_ID=<iCHEF 門市 ID>
LOGIN_ID=<iCHEF 登入帳號>
LOGIN_PASSWORD=<iCHEF 登入密碼>
```

### 排程

| 排程     | 路徑                              | 建議時間                    | 逾時      |
| -------- | --------------------------------- | --------------------------- | --------- |
| 月結取數 | `GET /api/cron/month-end-fetch`   | 每月 2 日 12:00 Asia/Taipei | ≥ 15 分鐘 |
| raw 保留 | `GET /api/cron/storage-retention` | 每月 1 次                   | ≥ 5 分鐘  |

Header：`Authorization: Bearer <CRON_SECRET>`

### 部署後檢查清單

- [ ] 能登入 Admin
- [ ] 網頁取數成功（`fetchStatus=SUCCEEDED`）
- [ ] MinIO `ddb` 可見 `raw/`／`audit/`
- [ ] 外部 cron 回 200；`RUN_DB_PUSH=0`

## 測試接縫

真實 iCHEF 網頁取數 → ingest（DB + MinIO）→ 編成 → 對上 `7月報表-中山 - 7月.csv` 已命名欄。CI 用 repo 內 xlsx fixture 不連網回歸。

## 常見問題

| 問題                  | 處理                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------ |
| 「MinIO 未設定」      | 確認 `.env` 三項 `MINIO_ENDPOINT`／`ACCESS_KEY`／`SECRET_KEY` 非空，且 bucket `ddb` 已建立 |
| 匯入成功但 MinIO 無檔 | 同上；或檢查 endpoint 是否用 **內網 URL**（Zeabur）                                        |
| port 被佔用           | 停掉 BeyRotate 或其他佔 5432／9000 的容器後再 `docker compose up -d`                       |
| cron 401              | `Authorization: Bearer` 與 `CRON_SECRET` 完全一致                                          |
| 本機 port 衝突        | DDB 固定 **5003**；勿用 3000                                                               |
