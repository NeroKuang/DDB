# 匯入檔存在同一 MinIO，bucket 為 ddb

Admin 上傳的結帳、打卡、注記分析原檔是對帳證據，要留。用 SP 既有 MinIO（9000／9001），獨立 bucket `ddb`，不另開 port、不把檔只放在應用程式磁碟、不解析完就丟。
