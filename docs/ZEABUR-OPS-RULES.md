# DDB Zeabur 部署方案與作業規則（實測）

> 來源：2026-09-06 NeroSP 上線實測。Agent／人類改部署前必讀。  
> 步驟手冊：`DEPLOY-ZEABUR.md`　ADR：`adr/0086-zeabur-dockerfile-playwright.md`

---

## 一、最終架構（已上線）

```text
Zeabur Project: NeroSP (BeyRotate 生產專案)
│
├── postgresql (既有)     資料庫 ddb ✅ 獨立於 beyrotate
├── redis (既有)
├── minio      (本次新增) 私有 bucket ddb ✅ 僅內網 :9000
└── ddb        (本次部署) Git · main · Dockerfile · Playwright runner
                          監聽 8080 ← Zeabur 注入 PORT
```

| 項目          | 值                                                                              |
| ------------- | ------------------------------------------------------------------------------- |
| 建置          | repo 根 Dockerfile；多階段 `node:20-bookworm-slim` → `playwright:v1.62.1-jammy` |
| DB            | `postgresql://…@service-<pg-id>:5432/ddb`                                       |
| MinIO         | `http://minio.zeabur.internal:9000`，bucket `ddb`，**無對外網域**               |
| 變數          | 共識欄位 + 服務內建；**勿額外加 `NODE_ENV`**                                    |
| `RUN_DB_PUSH` | **`0`**（初始 schema 已同步完成；穩定後維持 0）                                 |

---

## 二、Zeabur 平台行為（實測 → 規則）

1. **服務環境變數會注入 Docker build，不只是執行期。**  
   因此 `NODE_ENV=production` 會讓 `npm ci` 跳過 devDependencies；若有 `"prepare": "husky"` → exit 127。  
   **規則：非規格明列的環境變數一律不新增。特別是 `NODE_ENV`。**

2. **`zeabur deploy` 會上傳本機目錄，覆蓋 Git 來源。**  
   對 Git-backed 服務執行後，PLANTYPE 可能變 static，Dockerfile 被忽略。  
   **規則：Git 服務重建只用 `git push`、Dashboard Redeploy，或 `zeabur service redeploy --id <id>`。禁用 `zeabur deploy`。**

3. **CLI 變數異動不會自動觸發重建。** Dashboard 存檔會。  
   **規則：CLI 改完變數 → `service restart`（僅執行期）或 `service redeploy`（影響建置的變數）。**

4. **`domain create` 無法指定 port。** 多 HTTP port（如 MinIO 9000／9090）只綁第一個。  
   **規則：多 port 服務的網域綁定走 Dashboard。**（本案 MinIO 刻意無對外網域。）

5. **滾動部署有 502 空窗。** Image 越大越久（本案約 1.2 GB → 拉取約 20 秒 + 啟動）。  
   **規則：部署後 502，先確認是否落在部署窗口，別急著當故障查。**

6. **部署狀態 `RUNNING` ≠ 服務正常。** 曾出現 RUNNING 但實際在提供錯誤內容。  
   **規則：驗收一律以「實際 HTTP 回應 + 執行期日誌」為準，不採信部署狀態 alone。**

---

## 三、Dockerfile／Prisma 規則

1. **建置階段禁止連線資料庫。** Next.js build 會預渲染；layout／page 上的 DB 查詢會讓 `docker build` 失敗。  
   → 需 DB 的路由：`export const dynamic = "force-dynamic"`；bootstrap 在 `NEXT_PHASE=phase-production-build` 跳過。

2. **`binaryTargets` 對齊 runtime image，不是 build image。**

   | 階段    | Image                              | OpenSSL                 | Prisma                          |
   | ------- | ---------------------------------- | ----------------------- | ------------------------------- |
   | builder | `node:20-bookworm-slim`            | 常偵測失敗 → 預設 1.1.x | `debian-openssl-1.1.x`          |
   | runner  | `playwright:jammy`（Ubuntu 22.04） | 3.0.x                   | 需要 **`debian-openssl-3.0.x`** |

   → `binaryTargets = ["native", "debian-openssl-3.0.x"]`。跨 image 只靠 `native` 必錯。

3. **若啟動腳本跑 `prisma db push`，runner 需保留 CLI 完整相依樹。**  
   只拷 `prisma`／`@prisma` 會缺 `@prisma/config` 傳遞相依 `effect` → `MODULE_NOT_FOUND`。  
   → 本案用獨立 `prisma-cli` 階段裝到 `/opt/prisma-cli`。

4. **啟動腳本必須 fail-fast。**  
   `db push` 崩潰後若仍 `node server.js`，服務顯示 Ready、DB 卻是空的——靜默失敗最難查。  
   → `RUN_DB_PUSH=1` 時不可 `|| true`。**目前線上應為 `RUN_DB_PUSH=0`。**

---

## 四、診斷流程規則（本次教訓）

1. **先確認建置來源，再診斷建置內容。** 看 deployment list 的 `PLANTYPE`／`REPONAME`／`COMMITSHA`。誤上傳造成的 static 部署，不要誤判成「Zeabur 把 Next.js 當靜態站」而亂改 `next.config`。
2. **沒讀過的檔案不要假設其內容。** 勿在沒看過 repo Dockerfile 時自行產生「替代品」。
3. **區分 warning 與 error。** 建置日誌裡 Prisma OpenSSL warn 洗版 ≠ 建置主因；要找造成**非零退出碼**的那一行（例如預渲染連 DB）。
4. **錯誤訊息裡的具體數值就是線索。** 例如 `Can't reach database server at 127.0.0.1:5432` 直接證明建置期不是執行期 `DATABASE_URL`（Dockerfile 佔位 ARG）。
5. **同一手法失敗兩次就換路。** 例如 `service exec` 進 Postgres 連續網路中斷，改用其他驗證。
6. **不要提前宣告成功。** 每一項驗收都要有可貼出的證據（HTTP／日誌／DB／MinIO），不以 `RUNNING` 慶祝。

---

## 五、與空庫 UI

- Docker 映像**不帶**本機 July fixture xlsx；無匯入時不得回退假路徑造成「薪資編成失敗」。
- 空庫只應顯示「尚未有成功匯入」類警告；見 `src/compile/empty-import-error.ts`。
