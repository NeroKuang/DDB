# DDB 額外部署 Handoff（離開 Zeabur／多專案 SP 主機）

給下一位（人或 Agent）把 DDB 從現役 Zeabur（NeroSP → `ddb`）遷到自管主機，或在同一台 SP 主機上與其他專案共存。  
**不遷移現有 Zeabur Postgres／MinIO 資料**：上線後自 **2026-09-01** 起重新網頁取數／每日取數即可。

配套：[`DEPLOY-ZEABUR.md`](./DEPLOY-ZEABUR.md)、[`ZEABUR-OPS-RULES.md`](./ZEABUR-OPS-RULES.md)、[`adr/0086-zeabur-dockerfile-playwright.md`](./adr/0086-zeabur-dockerfile-playwright.md)。

---

## 1. 現行生產錨點（遷出前）

| 項             | 值                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------- |
| Zeabur Project | NeroSP（非 `beyrotate_dev`）                                                             |
| 服務           | `ddb`（Git `main` + 根目錄 Dockerfile）                                                  |
| 網域（現）     | `drunkdrinkbar.zeabur.app`（或你綁的自有網域）                                           |
| DB             | Postgres 庫名 **`ddb`**                                                                  |
| 物件儲存       | MinIO 私有 bucket **`ddb`**（內網）                                                      |
| `RUN_DB_PUSH`  | 常態 **`0`**；schema 變更時短暫 **`1`** → 確認 → 改回 **`0`**                            |
| 重建           | **禁止** `zeabur deploy`；只用 `git push`／Dashboard Redeploy／`zeabur service redeploy` |

App 特性：Next.js standalone + **Playwright Chromium**（網頁取數）。Image 約 **1.2GB**；滾動更新可能有短暫 502。

---

## 2. 目標架構（建議）

```text
[Cron / systemd timer] --CRON_SECRET--> https://<public>/api/cron/...
           |
           v
   [DDB app container]  --DATABASE_URL-->  [Postgres]
           |                              [MinIO :9000]
           +-- Playwright 打 iCHEF（出網）
```

- App：**單容器**用現有根目錄 `Dockerfile`（勿另寫「無 Playwright」替代檔當正式路徑）。
- Postgres + MinIO：可與 app 同機 Docker Compose，或託管 DB + 同機 MinIO。
- MinIO 映像：**勿**再用 `minio/minio`（Docker Hub 已撤）；正式／本機 compose 用 `cgr.dev/chainguard/minio` + `bitnamilegacy/minio-client`（見 `docker-compose.prod.yml`）。
- 本機 `docker-compose.yml` **只**含 db／minio（開發用）；正式環境用 `docker-compose.prod.yml`。

---

## 3. 環境變數清單（完整）

與 Zeabur 相同語意；新主機把內部 host 換成 compose 服務名或私網 IP。

```env
DATABASE_URL=postgresql://<user>:<password>@<pg-host>:5432/ddb

AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://<your-public-origin>
NEXTAUTH_SECRET=<與 AUTH_SECRET 相同>
NEXTAUTH_URL=https://<your-public-origin>
NEXT_PUBLIC_SITE_URL=https://<your-public-origin>

ADMIN_USERNAME=admin
ADMIN_PASSWORD=<強密碼>

CRON_SECRET=<隨機字串>
RUN_DB_PUSH=0

MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=<root user>
MINIO_SECRET_KEY=<root password>
MINIO_BUCKET=ddb

STORE_ID=<iCHEF 門市 ID>
LOGIN_ID=<iCHEF 登入帳號>
LOGIN_PASSWORD=<iCHEF 登入密碼>
```

硬性：

- **勿**設服務變數 `NODE_ENV=production`（若平台會注入進 docker build → `npm ci` 跳過 devDeps → husky/`prepare` 失敗）。
- iCHEF 三憑證只在 env，不進 git、畫面、log。
- Schema 變更部署：**短暫** `RUN_DB_PUSH=1` → 看 log 確認 `db push` 成功 → **改回 0** → Redeploy。

---

## 4. 排程（Compose `cron` sidecar）

正式路徑：`docker-compose.prod.yml` 的 **`cron` 服務**（`deploy/cron/`）在內網打 `http://app:8080/api/cron/*`，**不經 Caddy／公網**。時區 `Asia/Taipei`；`CRON_SECRET` 從 `.env.prod` 注入（勿寫進 host crontab）。

| 用途              | 路徑                          | 排程（容器內 Taipei） |
| ----------------- | ----------------------------- | --------------------- |
| 每日取數 catch-up | `/api/cron/daily-fetch`       | 每天 13:00            |
| 月結取數          | `/api/cron/month-end-fetch`   | 每月 2 日 12:00       |
| raw 保留          | `/api/cron/storage-retention` | 每週日 04:00          |

手動測（在 VPS）：

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec cron \
  /usr/local/bin/run-job.sh daily-fetch 900
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f cron
```

驗收：job log 有 `ok`／明確失敗；app log 有對應 cron 執行。不必再用 cron-job.org 或 host crontab（有的話請刪掉以免雙重觸發）。

### 手動：依薪資期間補月結網頁取數（不自動跑）

一次依序撈多個月份（整月注記分析；店鎖，逐月等待）。**未排進 crontab**，需人工執行：

```bash
cd /opt/ddb
# 重建 app（含 API）與 cron（含腳本）後再跑；不要自動執行
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build app cron

./scripts/vps-backfill-pay-periods.sh --from 2026-07 --to 2026-10
# 省略 --to = 做到當月（Asia/Taipei）
# --force = 已成功也重抓
# --continue-on-error = 某月失敗仍繼續後面
```

---

## 5. 遷出／新機上線步驟（無資料搬遷）

1. 新機：Docker + Compose；建 Postgres DB `ddb`、MinIO bucket `ddb`（私有）。
2. 建置並跑 app 容器（對齊現有 Dockerfile；binaryTargets 已含 `debian-openssl-3.0.x`）。
3. 首次 schema：短暫 `RUN_DB_PUSH=1`，確認後改 `0`。
4. 綁網域／TLS（Caddy／nginx／Cloudflare）；`AUTH_URL`／`NEXTAUTH_URL`／`NEXT_PUBLIC_SITE_URL` 對齊公開 origin。
5. 確認 Compose `cron` sidecar 在跑（見 §4）；勿與 host crontab 雙開。
6. Admin 登入 → 門市設定／店員確認 → 自 **2026-09-01** 起手動或排程補取數（月 grain + 每日 grain）。
7. 驗收：中控台取數狀態、薪資報表編成、MinIO `raw/` 物件、每日區間檢視有資料。
8. DNS 切換後再下線 Zeabur `ddb`（可先只關 public 流量）。

**不要**：從 Zeabur dump/restore 當必做項（產品決策：重拉即可）。

---

## 6. SP 主機方案評估（CP vs 方便）

前提：DDB 需要常駐記憶體（Next + Playwright）、東京／台灣延遲友善、你可能同機跑多個 SP 專案、可接受約 US$10–25／月級。

### 方案 A — Vultr Tokyo（或同等）單機 Docker Compose（**CP 最高推薦**）

|      |                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------ |
| 規格 | 建議至少 **2 vCPU / 4GB**（`vc2-2c-4gb` ≈ **US$20／月**）；再省可用 2GB 但 Playwright 取數時易抖 |
| 組成 | 一機：`ddb` app + Postgres + MinIO；（可選）Caddy                                                |
| 優點 | 月費可預期；多專案可共用 Postgres 多庫／多 bucket；不吃 PaaS 按量驚喜帳                          |
| 缺點 | 自己顧 TLS、備份、升級、監控；出問題要 SSH                                                       |
| 適合 | 你當 SP「主機主」；願意維一張 compose                                                            |

**CP 結論**：在「能跑 Playwright + DB + MinIO」的前提下，同預算效能／可控性通常最好。

### 方案 B — 略貴、方便度最高：維持 Zeabur（或同型 PaaS）+ 自有網域

|      |                                                                                         |
| ---- | --------------------------------------------------------------------------------------- |
| 成本 | 平台費 + Postgres + 大 image 建置時間；常比純 VPS **貴一截**，但換到「git push 即部署」 |
| 優點 | 已驗證路徑；Dashboard／Variables／Redeploy；少 SSH                                      |
| 缺點 | 大 Playwright image、誤設 `NODE_ENV`、誤用 `zeabur deploy` 的坑仍在；多專案費用疊加     |
| 適合 | 短期只顧產品、少碰 infra                                                                |

**方便度結論**：若「你的時間 > 機器費」，續用 Zeabur（或 Fly／Railway 同類）最省心；但 **CP 通常不如 Vultr 單機**。

### 方案 C — 混合（次佳平衡）

- **DB／MinIO**：託管或小 VPS 常駐
- **App**：仍用 Dockerfile 佈在 VPS 或 PaaS

多一層網路與備份設計，只在你已有共用 Postgres 時值得。

### 明確不建議當主路徑

- 無頭 Serverless（冷啟動 + Playwright 逾時）
- 為省錢拿掉 Playwright 改「只上傳 xlsx」（違反正式網頁取數北極星）
- 用 `zeabur deploy` 上傳本機目錄（PLANTYPE 變 static）

### 決策摘要

| 目標                                  | 選                                             |
| ------------------------------------- | ---------------------------------------------- |
| **CP 最高**（月費／效能／多專案密度） | **Vultr Tokyo 4GB + Compose（方案 A）**        |
| **方便度最高**（少運維）              | **續 Zeabur + 自有網域（方案 B）**；可接受略貴 |
| 折衷                                  | 方案 A 做主、Zeabur 當短暫 staging             |

---

## 7. 驗收檢查清單

- [ ] `GET /` 或登入頁 HTTP 200（非長期 502）
- [ ] Admin 登入成功
- [ ] 手動網頁取數：取數進度 SUCCEEDED；MinIO 有 `raw/`
- [ ] 薪資報表可編成；門市設定（單點／加總／自訂項／起訖）可存
- [ ] cron daily-fetch／month-end 各跑一次有 log
- [ ] `RUN_DB_PUSH=0`
- [ ] 無 `NODE_ENV=production` 服務變數

---

## 8. 線2 相關 schema（新機首次 push）

若部署含編成快取／門市設定欄位，需一次 `db push`：

- `stores.demerit_unit_amount`、`stores.rollups_json`
- `store_custom_salary_items`
- `pay_periods.compile_cache_json`、`compile_cache_at`
- `pay_periods.business_day_start_iso`、`business_day_end_iso`

流程：短暫 `RUN_DB_PUSH=1` → 確認 → `0`。
