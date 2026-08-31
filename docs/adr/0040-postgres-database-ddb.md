# 資料庫用 Postgres，庫名 ddb，不與 BeyRotate 共 schema

本機仍用 5432。BeyRotate 的 Postgres 若已在跑，在同一實例建立 `ddb` 庫；不另開 port、不把表塞進 beyrotate 庫。SQLite 不夠撐鎖定、重算與多人。
