# DDB

店家在 iCHEF 之上的薪資報表編成與業績核對（中山門市第一期）。不取代 POS。

規格：`.scratch/month-end-salary-compile/spec.md`  
詞彙：`CONTEXT.md`　決策：`docs/adr/`

## 本機

Dev server **5003**（不要用 3000）。Postgres `5432` 庫名 `ddb`，MinIO bucket `ddb`（可與 BeyRotate 共用實例、不共 schema）。

本機不必另裝 Postgres：與 BeyRotate 共用 Docker 的 `5432`，在該實例建 `ddb` 庫。

```bash
cp .env.example .env
# 填 DATABASE_URL、AUTH_SECRET、ADMIN_*、iCHEF 憑證、MinIO
docker exec -e PGPASSWORD=beyrotate_dev beyrotate-db-1 \
  psql -U beyrotate -d postgres -c 'CREATE DATABASE ddb;'
npm install
npm run db:push
npm run dev
```

開 [http://localhost:5003](http://localhost:5003)。

```bash
npm run typecheck
npm test
```

## 環境變數

見 `.env.example`。`.env` / `.env.local` 不要 commit。iCHEF 帳密只給網頁取數用，不要打進畫面或 log。

## 測試接縫

真實 iCHEF 網頁取數 → 編成 → 對上 `7月報表-中山 - 7月.csv` 已命名欄。CI 用同一套 xlsx fixture 不連網回歸。
