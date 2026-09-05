# 第一期以本機開發為準，連線全走環境變數

本機 Next.js `:5003`，Postgres `5432` 庫 `ddb`，MinIO bucket `ddb`。連線與密鑰全部環境變數，之後上雲不必改架構。本機基礎設施用 **DDB 自己的 `docker-compose.yml`**（不依賴 BeyRotate 本機 compose／`beyrotate_dev`）。雲端掛現役 BeyRotate Zeabur Project 的 Postgres／MinIO，獨立庫與 bucket 仍為 `ddb`。
