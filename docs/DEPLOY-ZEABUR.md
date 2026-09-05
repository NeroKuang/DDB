# DDB Zeabur 部署專案

掛在 **BeyRotate 正式／現役 Zeabur Project**（共用該 Project 的 PostgreSQL、MinIO 實例；獨立庫 `ddb`、bucket `ddb`）。  
**不要**使用已下線的 `beyrotate_dev` 環境。  
建置：**根目錄 Dockerfile**（Next.js standalone + Playwright Chromium）。  
第一版網域：Zeabur 自動網域（`${ZEABUR_WEB_URL}`）。  
排程：外部 cron（逾時 ≥10–15 分鐘）。  
詳見 ADR-0086；給平台 AI Agent 的可執行 Spec：[`ZEABUR-AGENT-SPEC.md`](./ZEABUR-AGENT-SPEC.md)。

正式取數**不依賴**本機手動 xlsx／repo 根目錄報表檔；容器內登入 iCHEF → 下載 → ingest → DB／MinIO。

本機開發基礎設施改由 **DDB 自己的 `docker-compose.yml`**（帳密 `ddb`／`ddb_dev`），不依賴 BeyRotate 本機 compose。

---

## 0. 前置

- [ ] GitHub 已推送含本 Dockerfile 的 DDB repo（乾淨：無 `.env`、無八月店家 xlsx、無 `prisma/*.db`）
- [ ] 選定 **現役** BeyRotate Zeabur Project（非 `beyrotate_dev`）
- [ ] 準備好 Admin 密碼、`CRON_SECRET`、iCHEF 三憑證（只放 Variables，不進 git）

---

## 1. PostgreSQL

1. 使用該 Project 內既有 Postgres（正式 BeyRotate 那台；若無則在同 Project 新建）。
2. 在該實例建立 database **`ddb`**（若尚無）：

```sql
CREATE DATABASE ddb;
```

3. DDB 服務的 `DATABASE_URL` 指向同一 host／user，路徑為 `/ddb`。

---

## 2. MinIO（必備）

1. 使用該 Project 內既有 **MinIO** 服務（若無則新建）。
2. Console 建立 bucket：**`ddb`**（**私有**；勿與 `listing-images`／`avatars` 混用）。
3. 記下內網連線（範例）：

| 用途               | 建議                                                                             |
| ------------------ | -------------------------------------------------------------------------------- |
| `MINIO_ENDPOINT`   | `http://<minio-service>.zeabur.internal:9000`（**內網**，勿用對外 Console 網域） |
| `MINIO_ACCESS_KEY` | MinIO ROOT USER（控制台可能顯示為 `MINIO_ROOT_USER`）                            |
| `MINIO_SECRET_KEY` | MinIO ROOT PASSWORD                                                              |
| `MINIO_BUCKET`     | `ddb`                                                                            |

部署完成定義：**網頁取數成功後，bucket 內可見 `raw/`（與 audit）前綴物件。**

---

## 3. 部署 DDB 服務

1. **Add Service → Git** → 選 DDB repo（建議 `main`）。
2. 建置方式選 **Dockerfile**（根目錄 `Dockerfile`；Zeabur 會自動偵測）。
3. **Variables**（Edit as Raw 可貼；`ZEABUR_WEB_URL` 由平台注入）：

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

4. Deploy。首次成功後：
   - 確認 Logs 有 `[start] prisma db push...` 且服務起來。
   - 將 **`RUN_DB_PUSH` 改為 `0`**（避免之後每次重啟改 schema）。
5. 開啟 `${ZEABUR_WEB_URL}`，用 Admin 帳密登入。

本機開發仍用 `npm run dev`（固定 **5003**）；生產由 Zeabur 注入 `PORT`，`scripts/start.sh` 執行 `node server.js`。

---

## 4. 外部 Cron

平台不內建等同 Vercel Cron 的排程；用 [cron-job.org](https://cron-job.org)（或同類）**HTTPS GET**。

| 排程     | URL                                                   | 建議時間                    | 逾時                                |
| -------- | ----------------------------------------------------- | --------------------------- | ----------------------------------- |
| 月結取數 | `https://<ZEABUR_WEB_URL>/api/cron/month-end-fetch`   | 每月 2 日 12:00 Asia/Taipei | **≥ 15 分鐘**（同步跑完整網頁取數） |
| raw 保留 | `https://<ZEABUR_WEB_URL>/api/cron/storage-retention` | 每月 1 次（如每月 3 日）    | ≥ 5 分鐘                            |

Header：

```http
Authorization: Bearer <CRON_SECRET>
```

手動驗證：

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  "https://<ZEABUR_WEB_URL>/api/cron/month-end-fetch"
```

---

## 5. 部署後驗收清單

- [ ] Admin 可登入（`${ZEABUR_WEB_URL}`）
- [ ] `/payroll` 可開；未鎖定期可按 **網頁取數**（或月結 cron）成功
- [ ] 取數後 `fetchStatus=SUCCEEDED`；`noteOuterComplete`／`requiredImportsComplete` 為真
- [ ] MinIO bucket `ddb` 有 `raw/`（與 audit）物件；畫面無「MinIO 未設定」
- [ ] 外部 cron 兩支 API 回 200（非 401）；月結 job 逾時夠長
- [ ] `RUN_DB_PUSH` 已改回 `0`

---

## 6. 常見問題

| 問題                          | 處理                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| 502／起不來                   | `DATABASE_URL` 是否指向同 Project Postgres 的 `/ddb`；Logs 是否 prisma／build 失敗 |
| 登入回跳錯網域                | `AUTH_URL`／`NEXTAUTH_URL`／`NEXT_PUBLIC_SITE_URL` 皆為 `${ZEABUR_WEB_URL}`        |
| 網頁取數失敗／無瀏覽器        | 確認服務用本 repo **Dockerfile**（Playwright 映像），非純 Node 自動建置            |
| 「MinIO 未設定」              | 三項 `MINIO_*` 非空且用**內網** endpoint；bucket `ddb` 已建立                      |
| cron 401                      | Bearer 與 `CRON_SECRET` 完全一致                                                   |
| cron 客戶端逾時但取數其實成功 | 把外部 job 逾時調到 ≥15 分；以 App／DB 的 `fetchStatus` 為準                       |
| 本機 port                     | 開發固定 **5003**；勿用 3000                                                       |
| 誤用 beyrotate_dev            | 該環境已下線；改掛現役正式 Project                                                 |

---

## 7. 本機對照

```bash
docker compose up -d   # 本 repo；自動建庫 ddb 與 bucket ddb
```

`.env` 對齊 `.env.example`（`ddb`／`ddb_dev`／`ddb_dev_minio`）。重啟 `npm run dev` 後取數，確認 MinIO 有物件。
