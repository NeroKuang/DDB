# 第一個 Admin 由環境變數種子建立

空庫第一次啟動時，若尚無 Admin，用 `ADMIN_EMAIL` 與 `ADMIN_PASSWORD` 建一個。之後 personal／Supervisor 由 Admin 設帳密。不做公開註冊。第一期不用 Redis，登入狀態走資料庫或 JWT。
