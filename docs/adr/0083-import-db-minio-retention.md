# 匯入寫 DB、MinIO 分 raw／audit，raw 分級保留

**狀態**：已核准（2026-09-01）  
**修訂**：ADR-0041（證據改存 MinIO 並分級，不再長期占用 App 磁碟）、ADR-0049（測試 seam 改為 DB seed + ingest pipeline）

## 決策

1. **運算真相在 Postgres**  
   iCHEF 取數或上傳成功後，parse **一次** 寫入結構化表（結帳列、打卡對、注記點擊等）。編成、業績面、重算 originals **只讀 DB**，不再每次重開 xlsx。

2. **App Server 不長留 xlsx**  
   本機僅作匯入暫存；MinIO 上傳 + DB transaction 成功後 **立刻刪除** 暫存檔。線上硬碟不因每月 drill-down 膨脹。

3. **MinIO bucket `ddb` 分兩 prefix**
   - `raw/{storeCode}/{periodKey}/` — iCHEF 原始 xlsx（結帳、打卡、注記外層、各品項明細）
   - `audit/{storeCode}/{periodKey}/` — 每次成功匯入＋編成產生的 **稽核 xlsx**（多 sheet 大表，含薪資列、未對上清單、run metadata）

4. **保留策略只套用在 raw**（audit 與 DB **長期保留**）

   | raw 年齡   | 動作                              |
   | ---------- | --------------------------------- |
   | ≤ 3 個月   | 保留原始 xlsx 資料夾              |
   | 3～12 個月 | 壓成 `{periodKey}.tar.gz`，刪散檔 |
   | > 12 個月  | 刪除 `.tar.gz`                    |

   **audit xlsx** 與 DB 內 `ImportRun`／`CompileRun`／鎖定 snapshot **不** 套用上述刪除；作為長期回查入口。

5. **排程**  
   每月 cron（如 `/api/cron/storage-retention`）掃 MinIO `raw/` prefix 執行分級；與月結取數分開。

6. **失敗語意不變**  
   匯入未全到齊：不取代上一批成功資料（DB + 上一版 raw／audit 維持）。對齊 ADR-0059。

7. **periodKey**  
   由日曆月＋`PayPeriod` 驅動；不再以 `JULY_2026_*` 硬編為運算前提（七月 fixture 僅測試／北極星回歸）。

## 稽核 xlsx 內容（最低要求）

- Sheet：薪資報表（原始＋儲存值並列，內部用）
- Sheet：未對上的暱稱、未對上的點選
- Sheet：匯入中繼（ImportRun id、時間、來源 web-fetch／upload、檔名列表）
- 檔名：`audit/{store}/{periodKey}/compile-{runId}.xlsx`；DB 存 path、sha256、列數

## 實作順序（建議）

1. Prisma schema（見 `.scratch/import-pipeline/schema-draft.prisma`）
2. Ingest module：temp → parse → DB → MinIO raw → compile → audit xlsx → 刪 temp
3. 編成改讀 DB；泛化 periodKey
4. Retention cron（僅 raw）
5. 遷移：現有 `storage/ichef/` 可一次性 backfill 至 MinIO + DB（一次性腳本）

## 為何 audit 長留、raw 可刪

- raw（尤其全品項 drill-down）佔空間最大，是硬碟風險來源。
- audit 單檔、已聚合，是人眼對帳與爭議時最常用入口；DB 內數字可重算，audit 保留「當次算完長什麼樣」。
- raw 超過 12 個月刪除後，仍可用 DB + audit xlsx 還原絕大多數爭議；若需逐筆對 iCHEF 原檔，須在 12 個月內從 tar.gz 還原。
