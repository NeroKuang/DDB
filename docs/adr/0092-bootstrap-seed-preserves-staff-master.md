# Bootstrap seed 不覆寫已存在的店員主檔

`ensureAppBootstrap`（shell layout 每次請求）會跑中山 fixture seed。若對已存在暱稱做 upsert update，會把 Admin 改的計薪方式／時薪／月薪等打回 July fixture（例如夏眠變回時薪）。改為只建立缺失店員與補別名；已存在列不動主檔欄位。
