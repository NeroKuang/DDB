# 注記外層只認 modifier-analysis，不認文字註記分析

iCHEF 的 `文字註記分析_*.xlsx` 是店員暱稱彙總；品項外層是 `modifier-analysis_*.xlsx`。上傳分類若把前者當外層，或明細「文字註記」下載檔名撞上前者而覆寫外層，會讓 `noteOuterComplete` 失敗、外層變成暱稱列表。分類與匯入只接受 `modifier-analysis` 當外層；若已有外層，撞名的 `文字註記分析` 當明細。網頁取數 ingest 前把明細檔名改成外層品項名（`/` → `∕` 可逆），品項對齊用正規化名稱，避免下載檔名與路徑字元弄丟對應。
