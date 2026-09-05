# 伺服器錯誤寫入 storage/logs（Asia/Taipei 日目錄）

`logServerError` 與網頁取數失敗會 append 到 `storage/logs/yyyy-mm-dd/errors.log`。內容含 context、message、stack、meta；已知密鑰會 redact。日誌不進 git。Zeabur 容器磁碟為暫時性，除錯時用 service exec 讀取後貼給 Agent。
