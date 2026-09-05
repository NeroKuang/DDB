# DDB Zeabur 部署專案

掛在 **NeroSP**（BeyRotate 生產／現役 Project；共用 PostgreSQL、MinIO；獨立庫 `ddb`、bucket `ddb`）。  
**不要**使用已下線的 `beyrotate_dev`。  
建置：**根目錄 Dockerfile**（Next.js standalone + Playwright Chromium）。  
第一版網域：Zeabur 自動網域（`${ZEABUR_WEB_URL}`）。  
排程：外部 cron（逾時 ≥10–15 分鐘）。

- 作業／平台實測規則（必讀）：[`ZEABUR-OPS-RULES.md`](./ZEABUR-OPS-RULES.md)
- ADR：[`adr/0086-zeabur-dockerfile-playwright.md`](./adr/0086-zeabur-dockerfile-playwright.md)
- Agent Spec：[`ZEABUR-AGENT-SPEC.md`](./ZEABUR-AGENT-SPEC.md)

正式取數**不依賴**本機手動 xlsx／repo 根目錄報表檔；容器內登入 iCHEF → 下載 → ingest → DB／MinIO。

本機開發基礎設施改由 **DDB 自己的 `docker-compose.yml`**（帳密 `ddb`／`ddb_dev`），不依賴 BeyRotate 本機 compose。

### 現況（2026-09-06 初部完成）

| 項目            | 狀態                                                                                   |
| --------------- | -------------------------------------------------------------------------------------- |
| Project／服務   | NeroSP → `ddb`（Git `main` + Dockerfile）                                              |
| Postgres／MinIO | 庫 `ddb`、私有 bucket `ddb`（僅內網）                                                  |
| `RUN_DB_PUSH`   | **`0`**（schema 已同步；維持關閉）                                                     |
| 重建方式        | 僅 `git push`／Dashboard Redeploy／`zeabur service redeploy`；**禁用** `zeabur deploy` |

---

## 0. 前置

- [x] GitHub 已推送含本 Dockerfile 的 DDB repo（乾淨：無 `.env`、無八月店家 xlsx、無 `prisma/*.db`）
- [x] 選定 **現役** BeyRotate Zeabur Project（NeroSP；非 `beyrotate_dev`）
- [x] Admin／`CRON_SECRET`／iCHEF 三憑證已在 Variables（不進 git）
- [x] 首次 `RUN_DB_PUSH=1` 完成後已改 **`0`**

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

| 用途               | 建議                                                                   |
| ------------------ | ---------------------------------------------------------------------- |
| `MINIO_ENDPOINT`   | `http://minio.zeabur.internal:9000`（**內網**，勿用對外 Console 網域） |
| `MINIO_ACCESS_KEY` | MinIO ROOT USER（控制台可能顯示為 `MINIO_ROOT_USER`）                  |
| `MINIO_SECRET_KEY` | MinIO ROOT PASSWORD                                                    |
| `MINIO_BUCKET`     | `ddb`                                                                  |

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
RUN_DB_PUSH=0

MINIO_ENDPOINT=http://minio.zeabur.internal:9000
MINIO_ACCESS_KEY=<MinIO ROOT USER>
MINIO_SECRET_KEY=<MinIO ROOT PASSWORD>
MINIO_BUCKET=ddb

STORE_ID=<iCHEF 門市 ID>
LOGIN_ID=<iCHEF 登入帳號>
LOGIN_PASSWORD=<iCHEF 登入密碼>
```

> **勿新增 `NODE_ENV=production`。** 詳見 [`ZEABUR-OPS-RULES.md`](./ZEABUR-OPS-RULES.md)。

4. Deploy（僅 Git push／Dashboard Redeploy／`zeabur service redeploy`）。
   - **僅在**刻意套用新 schema 時暫設 `RUN_DB_PUSH=1`；成功後**立刻改回 `0`**。
   - 初部已完成：線上維持 **`RUN_DB_PUSH=0`**。
5. 開啟 `${ZEABUR_WEB_URL}`，用 Admin 帳密登入。

本機開發仍用 `npm run dev`（固定 **5003**）；生產由 Zeabur 注入 `PORT`，`scripts/start.sh` 執行 `node server.js`。

---

## 4. 外部 Cron

平台不內建等同 Vercel Cron 的排程；用 [cron-job.org](https://cron-job.org)（或同類）**HTTPS GET**。

| 排程     | URL                                                   | 建議時間                    | 逾時          |
| -------- | ----------------------------------------------------- | --------------------------- | ------------- |
| 月結取數 | `https://<ZEABUR_WEB_URL>/api/cron/month-end-fetch`   | 每月 2 日 12:00 Asia/Taipei | **≥ 15 分鐘** |
| raw 保留 | `https://<ZEABUR_WEB_URL>/api/cron/storage-retention` | 每月 1 次（如每月 3 日）    | ≥ 5 分鐘      |

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

- [x] Admin 可登入（`${ZEABUR_WEB_URL}`）
- [ ] `/payroll` 可開；未鎖定期可按 **網頁取數**（或月結 cron）成功
- [ ] 取數後 `fetchStatus=SUCCEEDED`；`noteOuterComplete`／`requiredImportsComplete` 為真
- [ ] MinIO bucket `ddb` 有 `raw/`（與 audit）物件；畫面無「MinIO 未設定」
- [ ] 外部 cron 兩支 API 回 200（非 401）；月結 job 逾時夠長
- [x] `RUN_DB_PUSH` 已為 `0`
- [x] 空庫中控台不出現「薪資編成失敗／File not found」（僅「尚未有成功匯入」）

驗收**必須**附 HTTP／日誌證據；不以部署狀態 `RUNNING` 代替。

---

## 6. 常見問題

| 問題                       | 處理                                                                    |
| -------------------------- | ----------------------------------------------------------------------- |
| 502／起不來                | 先排除滾動部署空窗；再查 `DATABASE_URL`→`/ddb`、Logs                    |
| 登入回跳錯網域             | `AUTH_*`／`NEXTAUTH_*`／`NEXT_PUBLIC_SITE_URL` 皆為 `${ZEABUR_WEB_URL}` |
| 網頁取數失敗／無瀏覽器     | 確認 **Dockerfile** Playwright 映像，非誤上傳 static                    |
| 「MinIO 未設定」           | 三項 `MINIO_*` 非空且**內網** endpoint；bucket `ddb`                    |
| cron 401                   | Bearer 與 `CRON_SECRET` 一致                                            |
| 誤用 beyrotate_dev         | 改掛 NeroSP                                                             |
| openssl／effect／fail-fast | 見 ADR-0086 與 `ZEABUR-OPS-RULES.md`                                    |
| husky exit 127             | **勿**設服務變數 `NODE_ENV=production`                                  |
| PLANTYPE=static            | 曾誤用 `zeabur deploy`；改回 Git 並 Redeploy                            |

平台行為與診斷細節 → [`ZEABUR-OPS-RULES.md`](./ZEABUR-OPS-RULES.md)。

---

## 7. 本機對照

```bash
docker compose up -d   # 本 repo；自動建庫 ddb 與 bucket ddb
```

`.env` 對齊 `.env.example`（`ddb`／`ddb_dev`／`ddb_dev_minio`）。重啟 `npm run dev` 後取數，確認 MinIO 有物件。
