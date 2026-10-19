# 每營業日匯入 grain 與區間檢視；月期間仍為發薪單位

## 決策

新增 `ImportRunKind.BUSINESS_DAY` 與 `BusinessDayImport`：每日（或按需）只取結帳／打卡，供 `/range` 營業日區間檢視。月 `PayPeriod` 仍是唯一發薪、鎖定、注記／任務獎金、儲存值與 CSV 單位。

營業日切點維持 ADR-0001：`[D 12:00, D+1 12:00)` Asia/Taipei。

UI 必須明示「區間檢視＝原始數字，非發薪依據／不列入月結」。

## 後果

- 月匯入載入路徑只認 `kind=PAY_PERIOD`。
- 日 grain 掛在所屬日曆月 `PayPeriod` 下僅為儲存／索引，不觸發編成、不改 `activeImportRunId`。
- 月／日網頁取數共用 `Store.fetchLockToken` 原子鎖。
- 注記點選與任務獎金不進區間檢視（無可靠日時間戳／成本過高）。
