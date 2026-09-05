# 伺服器錯誤：stdout 為主，檔案日誌選用

`logServerError`（`src/lib/log-server-error.ts`，`server-only`）把錯誤以 JSON 打到 **stdout**，Zeabur runtime 日誌可查。  
`toUserFacingMessage` 留在 `user-facing-error.ts`，可給 Client Component，**不可** import `fs`／`error-log`。  
僅當 `ERROR_LOG_TO_FILE=1` 時才寫 `storage/logs/yyyy-mm-dd/errors.log`（本機除錯）；Zeabur 容器磁碟暫時性，預設不寫檔。
