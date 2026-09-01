# DDB

店家在 iCHEF 之上的薪資報表編成與業績核對（中山門市第一期）。不取代 POS。

規格：`.scratch/month-end-salary-compile/spec.md`  
詞彙：`CONTEXT.md`　決策：`docs/adr/`

## 本機

Dev server **5003**（不要用 3000）。Postgres **5432** 庫名 **`ddb`**；MinIO **9000**（主控台 **9001**）bucket **`ddb`**（可與 BeyRotate 共用同一 MinIO／Postgres 實例，不共 schema）。

```bash
cp .env.example .env
# 依下方「環境變數」填齊 DATABASE_URL、Auth、MinIO、iCHEF、CRON_SECRET
npm install
npm run db:push
npm run dev
```

### Postgres（與 BeyRotate 共用 Docker 時）

在 BeyRotate 的 Postgres 容器裡建 **`ddb`** 庫（只需一次）：

```bash
docker exec -e PGPASSWORD=beyrotate_dev beyrotate-db-1 \
  psql -U beyrotate -d postgres -c 'CREATE DATABASE ddb;'
```

`.env` 範例：

```env
DATABASE_URL=postgresql://beyrotate:beyrotate_dev@localhost:5432/ddb
```

### MinIO（與 BeyRotate 共用 Docker 時）

BeyRotate `docker-compose` 預設 MinIO 帳密見該 repo；DDB 需 **另外建 bucket `ddb`**（compose 只會建 `listing-images`、`avatars`）。

1. 確認 MinIO 在跑：`curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:9000/minio/health/live` → 應為 `200`
2. 開主控台 [http://127.0.0.1:9001](http://127.0.0.1:9001)，登入後 **Create Bucket** → 名稱 **`ddb`**（私有即可，不必 public read）
3. `.env` 填入（與 BeyRotate 本機 MinIO 對齊）：

```env
MINIO_ENDPOINT=http://127.0.0.1:9000
MINIO_ACCESS_KEY=beyrotate
MINIO_SECRET_KEY=beyrotate_dev_minio
MINIO_BUCKET=ddb
```

或用 `mc` 建 bucket：

```bash
docker run --rm --network host minio/mc:latest \
  sh -c 'mc alias set local http://127.0.0.1:9000 beyrotate beyrotate_dev_minio && mc mb local/ddb --ignore-existing'
```

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

可與 BeyRotate 放在**同一 Zeabur Project**（共用 PostgreSQL、MinIO），或獨立 Project。以下假設同一 Project 已有 Postgres + MinIO。

### 1. PostgreSQL

- 若共用 BeyRotate 的 Postgres：在該庫建立 **`ddb`** database（與本機相同概念），`DATABASE_URL` 指向 `…/ddb`。
- 或另加一個 Postgres 服務，庫名設為 `ddb`。

### 2. MinIO

1. 使用 Project 內既有的 **MinIO** 服務（或新增 Template → MinIO）。
2. 在 MinIO **Console** 建立 bucket：**`ddb`**（**私有**即可；與 BeyRotate 的 `listing-images` 分開）。
3. 記下 MinIO 服務 Variables／Networking：
   - **App 連線**請用 **內網 endpoint**（例 `http://<minio-service>.zeabur.internal:9000`），不要用對外 Console 網域當 `MINIO_ENDPOINT`。
   - **ROOT USER / PASSWORD** 對應 `MINIO_ACCESS_KEY`／`MINIO_SECRET_KEY`（Zeabur 注入名稱可能是 `MINIO_ROOT_USER`、`MINIO_ROOT_PASSWORD`，請以控制台顯示為準）。

### 3. 部署 DDB 服務

1. Add Service → **Git** → 選 **DDB** repo。
2. 建置：Zeabur 偵測 **Next.js** 即可（或自訂 Dockerfile，與 BeyRotate 類似）。
3. **Variables**（可用 Edit as Raw；`ZEABUR_WEB_URL` 為 Zeabur 自動注入）：

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

MINIO_ENDPOINT=http://<minio-internal-host>:9000
MINIO_ACCESS_KEY=<MinIO ROOT USER>
MINIO_SECRET_KEY=<MinIO ROOT PASSWORD>
MINIO_BUCKET=ddb

STORE_ID=<iCHEF 門市 ID>
LOGIN_ID=<iCHEF 登入帳號>
LOGIN_PASSWORD=<iCHEF 登入密碼>
```

4. **首次部署**後在容器或本機對**同一** `DATABASE_URL` 執行 schema：

```bash
npm run db:push
```

5. 開啟 `${ZEABUR_WEB_URL}`，以 `ADMIN_USERNAME`／`ADMIN_PASSWORD` 登入。

### 4. Zeabur 排程

在 Zeabur **Scheduled Job** 或外部 cron 設定（皆需 `CRON_SECRET`）：

| 排程     | 路徑                              | 建議時間                    |
| -------- | --------------------------------- | --------------------------- |
| 月結取數 | `GET /api/cron/month-end-fetch`   | 每月 2 日 12:00 Asia/Taipei |
| raw 保留 | `GET /api/cron/storage-retention` | 每月 1 次                   |

Header：

```http
Authorization: Bearer <CRON_SECRET>
```

### 5. 部署後檢查清單

- [ ] 能登入 Admin
- [ ] 薪資報表 → 上傳 xlsx 或網頁取數成功（無 MinIO 時仍寫 DB，但無 raw 存證）
- [ ] MinIO bucket `ddb` 內可見 `raw/`、`audit/` 前綴（有設定 MinIO 時）
- [ ] `/storage-retention` 未顯示「MinIO 未設定」
- [ ] 外部 cron 打兩支 API 回 200（非 401）

## 測試接縫

真實 iCHEF 網頁取數 → ingest（DB + MinIO）→ 編成 → 對上 `7月報表-中山 - 7月.csv` 已命名欄。CI 用 repo 內 xlsx fixture 不連網回歸。

## 常見問題

| 問題                  | 處理                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------ |
| 「MinIO 未設定」      | 確認 `.env` 三項 `MINIO_ENDPOINT`／`ACCESS_KEY`／`SECRET_KEY` 非空，且 bucket `ddb` 已建立 |
| 匯入成功但 MinIO 無檔 | 同上；或檢查 endpoint 是否用 **內網 URL**（Zeabur）                                        |
| cron 401              | `Authorization: Bearer` 與 `CRON_SECRET` 完全一致                                          |
| 本機 port 衝突        | DDB 固定 **5003**；勿用 3000                                                               |
