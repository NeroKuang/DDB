# 第一期以本機開發為準，上雲稍後

本機 Next.js `:5003`，Postgres `5432` 庫 `ddb`，MinIO bucket `ddb`。連線與密鑰全部環境變數，之後上雲不必改架構。現在不開 Zeabur、不把系統只鎖在店內一台無備份的電腦。若本機已有 BeyRotate 的 Postgres／MinIO，共用實例、建獨立庫與 bucket，不另占 5432／9000。
