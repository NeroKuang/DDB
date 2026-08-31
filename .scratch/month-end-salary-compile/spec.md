Status: ready-for-agent

# DDB 中山薪資期間編成（第一期）

## Problem Statement

店家每月用 iCHEF 匯出 Excel，再手編成一張人×欄的薪資總表（北極星：中山 7 月表）。花時間、容易對不齊暱稱與營業日，店員也無法自己核對業績。POS 不能取代；客座來店時仍看 iCHEF，不是這套系統。

## Solution

做一個本機優先的網站：用網頁取數（登入 iCHEF 後只讀營業報表）或上傳備援，編成該門市一期薪資報表。每一薪資項目都有原始數字與可編輯儲存值。Admin／Supervisor 看完整表並可匯出 CSV；一般店員用 personal 只看自己的業績面。每月 2 號 12:00（Asia/Taipei）自動拉前一個日曆月並編成。客座列給店家算帳，客座本人不進本系統。

## User Stories

1. As an Admin, I want to log in with a chosen username and password, so that I can compile pay without using email as the login id.
2. As the first operator, I want the first Admin seeded from environment variables when the database is empty, so that there is no public registration.
3. As an Admin, I want to create Supervisor accounts that can read everything and write nothing, so that a second person can check the 薪資報表 without editing it.
4. As an Admin, I want to create personal accounts for 一般店員 only, so that 客座 never log into DDB.
5. As a personal user, I want to change my own password, so that I do not share the password Admin first set.
6. As an Admin, I want to reset a personal or Supervisor password without email, so that a forgotten password does not block payroll.
7. As an Admin, I want 門市 in the data model with 中山 as the only UI store in v1, so that a second shop can be added later without rewriting keys.
8. As an Admin, I want every 店員 to belong to exactly one 門市, so that nicknames and pay stay scoped to that shop.
9. As an Admin, I want to record 本名, 主暱稱, 別名, 職稱, hourly or monthly 底薪, 業績成數, 達標額, 勞健保額, and 發薪備註 on each 店員, so that originals can be computed without retyping them every month.
10. As an Admin, I want 別名 to be exact strings (no fuzzy or simplified/traditional folding), so that 黒夢 and 黑夢 can be the same person only when I say so.
11. As an Admin, I want 職稱 to be a label list I maintain (店長、公關、不保、契約、排班, …), so that I can filter the 薪資報表 without a third pay-type engine.
12. As an Admin, I want 一般店員 vs 客座店員 as the only pay-type split, so that titles do not each get their own formula.
13. As an Admin, I want 發薪備註 as free text copied onto each 薪資列 (still editable per row), so that 「麻煩匯給叔叔」 stays a note and not a link to another 店員.
14. As an Admin, I want to add an 內場 薪資列 for a 店員 in a 薪資期間 even when 場別拆分 and 時數拆分 are zero, so that I can put 加給 or 記點 on 內場 only.
15. As an Admin, I want at most one 外場 and one 內場 薪資列 per 店員 per 薪資期間, so that 久橙 is two rows of the same person, not two 店員.
16. As an Admin, I want 場別拆分 so that the two rows' original 營業額 sum to that person's 個人業績, so that POS (one nickname) still ties out.
17. As an Admin, I want 時數拆分 independent of 場別拆分 so that the two rows' original 上班時數 sum to 原始時數, because 久橙's hour split is not the same ratio as sales.
18. As an Admin, I want 勞健保, 達標獎金, 月薪 底薪, and 任務獎金 each to land on one chosen 薪資列 (default 外場), so that those person-level amounts are never doubled.
19. As an Admin, I want 記點, 加班, 加給, 還款, 牆拍抽成, and 自訂薪資項目 filled per 薪資列, so that 7 月 overtime on 久橙's 60-hour row stays on that row.
20. As an Admin, I want 當月薪資 and 應領 computed per 薪資列 from 加總歸屬, so that two rows are two payable lines, not one merged net.
21. As an Admin, I want 加總歸屬 per 門市 (not per 店員), with defaults: 當月薪資 = 底薪 + 業績獎金 + 達標獎金 + 任務獎金 + 加給; 應領 = 當月薪資 − 應扣 − 勞健保, so that overtime/repayment/photo commission can be rolled in later without a code change.
22. As an Admin, I want 自訂薪資項目 named and rolled up per 門市, original 0 then stored value, so that a new column does not require a deploy.
23. As an Admin, I want a default 薪資期間 of calendar-month 營業日 (7 月 = 7/1 12:00–8/1 12:00 Asia/Taipei), so that night-shift checkouts on 8/1 morning still count as July.
24. As an Admin, I want to edit the two noon boundaries of a 薪資期間 before lock, so that a non-calendar close is possible.
25. As an Admin, I want 月結取數 on the 2nd at 12:00 Asia/Taipei to create the previous calendar month's 薪資期間 if missing, then 網頁取數 and compile, so that August compiles on 9/2 without me opening the app first.
26. As an Admin, I want 月結取數 to compile only that previous calendar month (fetch covering 營業日 ±1 day, e.g. 7/31–9/1 for August), so that a locked July is not rewritten.
27. As an Admin, I want to trigger the same 網頁取數 on any unlocked 薪資期間, so that a failed 2nd can be retried without uploading Excel.
28. As an Admin, I want 網頁取數 to log into iCHEF with 環境變數 憑證, read only 營業報表 pages, and pull 結帳／作廢, 打卡, and every 注記分析 item drill-down, so that I do not hand-download those files.
29. As an Admin, I want 注記分析 outer names all opened, so that 注記分析列表 can show every item even before I create a 模板任務.
30. As an Admin, I want 模板任務 created later (bind exact iCHEF item name and 單筆任務獎金), so that pulling all items does not auto-create bonuses.
31. As an Admin, I want a failed or partial 網頁取數 to leave the last successful 匯入 in place, so that a mid-run disconnect cannot compile a half period.
32. As an Admin, I want 取數進度 (in-flight and last failure, no secrets) on the 薪資期間, so that I can see a 2nd-of-month failure the next time I open the app.
33. As an Admin, I want a second 網頁取數 on the same 門市 rejected while one is running, so that two iCHEF sessions do not race.
34. As an Admin, I want to upload the same required files as fallback, so that I can still compile when iCHEF is down or I already have July exports.
35. As an Admin, I want a successful full 匯入 (fetch or upload) to replace that period's files and 重算 originals only, so that stored values I already saved are not wiped (Q3).
36. As an Admin, I want 未對上的暱稱 listed from 結帳 業績注記, blocking 鎖定本期, so that `DDB單點` money is not silently dropped and I am reminded to alias or file 店員.
37. As an Admin, I want 未對上的點選 listed from 注記分析, not blocking lock, so that non-person strings from full item pull do not freeze payroll.
38. As an Admin, I want creating a 店員 or 別名 to 重算 originals automatically, and a manual 重算本期 button, so that newly matched nicknames flow into 薪資列 without re-uploading.
39. As an Admin, I want 鎖定本期 only when 未對上的暱稱 is empty and required 匯入 are complete, so that personal cannot freeze a leaky period.
40. As an Admin, I want unlock before any further stored-value edit or 匯入, so that a frozen personal view is a deliberate freeze.
41. As a personal user, I want to see my 個人業績, 業績項, 客人分析, 注記分析列表, and 任務獎金 with both original and stored values (stored used), so that I can reconcile against what payroll will use.
42. As a personal user, I want not to see 底薪, 時數, 記點, 應扣, 勞健保, or 應領, so that I am not negotiating pay inside the app.
43. As a personal user, I want 注記分析列表 of every item I clicked (bonus 0 if no 模板任務), so that I can check clicks even before Admin sets Rooting.
44. As a personal user, I want 客人分析 only for 訂購人 strings on checks attributed to me, exact match, so that I do not see whole-check or shop-wide spend.
45. As a personal user, I want my view frozen after 鎖定本期, so that a late 匯入 cannot change numbers I already checked.
46. As a personal user, I want not to 薪資表匯出, so that the full payroll CSV stays with Admin／Supervisor.
47. As a Supervisor, I want to view all 中山 薪資報表, 未對上 lists, and 取數進度, so that I can audit without writing.
48. As an Admin, I want 原始數字 always visible next to stored values, so that an override never hides the formula.
49. As an Admin, I want 原始時數 from paired punches only, so that a missing clock-out does not invent hours.
50. As an Admin, I want 時薪 × 該列 上班時數 or 月薪 on the chosen row (other row original 底薪 0) as 原始底薪, so that 湯圓's monthly pay is not doubled on 內場.
51. As an Admin, I want 原始業績獎金 = that row's original 營業額 × 店員 業績成數 (default 20%), so that 久橙's two rows each get 20% of their split sales.
52. As an Admin, I want 達標獎金 toggled per 店員 per period (one payout, chosen row), so that 8000／3000／1000 stay presets I control, not an auto threshold.
53. As an Admin, I want 應扣 = that row's 記點 × shop 單點金額 (default 230), so that 久橙's 1 point on the 11.5-hour row deducts 230 only there.
54. As an Admin, I want 勞健保 original = the 店員's fixed amount (0 means no deduct), so that I do not maintain government insurance brackets.
55. As an Admin, I want 追加任務 as named amounts on a 店員, included in 任務獎金 that lands on one row, so that one-off bonuses are not stuffed into 加給.
56. As an Admin, I want voided iCHEF checks excluded from 個人業績, so that cancelled 暱稱 $金額 do not pay commission.
57. As an Admin, I want 薪資表匯出 as UTF-8 CSV with BOM, stored values, named columns only, so that Excel on Windows opens 中文 and matches the 7 月 sheet's titled columns.
58. As an Admin, I want not to export the untitled columns after 加班 on the 7 月 sheet, so that we do not reverse-engineer those intermediate formulas in v1.
59. As an Admin, I want imported xlsx kept in MinIO bucket `ddb` as evidence, so that a dispute can reopen the same 結帳／打卡／注記 files.
60. As a developer, I want a live 網頁取數 test against real iCHEF 營業報表 for the July 2026 營業日 window, so that selectors and login are proven, not only fixtures.
61. As a developer, I want that live fetch, after compile with the shop's 7 月 店員／拆分／勾發／手填, to match named columns of `7月報表-中山 - 7月.csv`, so that the north-star sheet is the acceptance test.
62. As a developer, I want the same compile function to run on checked-in July xlsx fixtures without hitting iCHEF, so that daily CI does not depend on POS uptime.
63. As an Admin, I want the web app usable on phone and desktop at local port 5003, so that I can check 取數進度 or 未對上 on a phone without using port 3000.
64. As an Admin, I want 客座 on the 薪資報表 for 算帳, so that 小楓／七津希 still appear, while their live performance is shown on iCHEF when they visit.

## Implementation Decisions

- Delivery is a Next.js + Prisma + auth web app, `next dev -p 5003`. Not a CLI and not a spreadsheet macro.
- Postgres database name `ddb` on 5432, not shared schema with BeyRotate. MinIO bucket `ddb` on existing 9000／9001. Local-first; connection strings and secrets only in env.
- DDB login is a chosen username + password. Roles: Admin, Supervisor, personal. Seed first Admin from env (that value is the first username). No public signup, no mail, no Redis required in v1.
- iCHEF 憑證 (store id, login, password) are env-only, never shown in UI, logs, or 取數進度. First period: 中山 maps to that one credential set. Login URL is iCHEF 2.0 (`https://login.ichefpos.com/`). After login, only 營業報表-type pages; no other back-office crawling.
- 網頁取數 is the primary 匯入 path; Admin upload of the same xlsx set is fallback. Required per period: 結帳／作廢, 打卡, 注記分析 drill-down for every outer item name. Missing template-bound item in the outer list → that 模板任務 clicks = 0; do not infer clicks from 結帳 lines.
- 注記分析: outer list is navigation only; staff click counts live after opening the item name. Pull every name. 模板任務 are Admin-created later (exact item string × 單筆任務獎金).
- xlsx read via `exceljs`. CSV export is UTF-8 with BOM, stored values, named columns; not xlsx write.
- Timezone Asia/Taipei. 營業日 cuts at noon. Default 薪資期間 is calendar month in 營業日. 月結取數: 2nd of month 12:00, previous calendar month only, create period if missing, fetch ±1 calendar day around that window.
- One 網頁取數 at a time per 門市. All-or-nothing replace. Failure keeps last successful 匯入. 取數進度 stays on the period; no push/email.
- 重算 updates originals only; saved stored values stay. Unedited stored values track the new originals.
- 鎖定本期 requires empty 未對上的暱稱 and complete required 匯入. 未對上的點選 do not block lock. Locked period: no 匯入, no stored edits, personal frozen until unlock.
- 個人業績 from non-voided 結帳 line items of form 暱稱 + amount (POS often `暱稱 $金額`), matched to 主暱稱 or 別名. 客人 is exact 訂購人 string; empty 訂購人 excluded from 客人分析.
- 場別／時數拆分, landing of person-level items, and per-row manuals as in ADR-0065–0076. 客座: on 薪資報表 only; no DDB account; live detail on iCHEF (ADR-0077).
- 加總歸屬 is per 門市. 達標 is preset amount + per-period pay/don't-pay, one row. 勞健保 original is fixed on 店員 (0 = none).
- UI v1: 中山 only, no store switcher. Admin／Supervisor not bound to a 門市.

## Testing Decisions

- Good tests assert observable compile and 匯入 results, not crawler selectors or ORM internals. One compile function: files-in → 薪資列 originals (and unmatched lists, lock eligibility).
- **Live iCHEF (required for 網頁取數):** actually log in and fetch 營業報表 for the July 2026 window (營業日 7/1 12:00–8/1 12:00, file range covering 6/30–8/1). Assert required files arrived (結帳／作廢, 打卡, every 注記分析 drill-down). Do not hit non-report pages. Skip or fail clearly if 憑證 env is missing; never print passwords.
- **North-star compare:** after that fetch (or equivalent July fixtures) plus the shop inputs that the 7 月 sheet already assumed (店員 master, 場別拆分 and 時數拆分 for 久橙, 達標 toggles, 記點, 加班, 加給, 勞健保額, 月薪, 客座 rows, 發薪備註, 單點金額, 業績成數, 模板任務), compiled **named columns** must match `7月報表-中山 - 7月.csv`. Identify rows by 本名／暱稱／場別, not by sheet row number. Do not assert untitled columns after 加班. Do not require footer totals or irregular guest-row layout quirks as a grid-identical file.
- **Fixture regression:** the same compile on the repo's July xlsx files without network, so CI can run when iCHEF is down. Live crawl and fixture compile must share the 匯入 shape.
- Also assert: unpaired punches excluded; voids excluded; 未對上的暱稱 vs 未對上的點選 lock rules; all-or-nothing replace; 重算 does not clobber saved stored values.
- Runner: Vitest. Not browser E2E as the primary suite. No prior app tests in this repo (greenfield).

## Out of Scope

- Official iCHEF API.
- Crawling anything outside 營業報表 after login.
- Guest-staff DDB login or DDB 當日業績明細 UI (they look at iCHEF).
- Email, password-reset mail, Redis, Zeabur／cloud deploy, extra Postgres/MinIO ports.
- Store switcher UI; staff belonging to two 門市; parsing 發薪備註 into a payee link.
- Auto overtime from punches; national-holiday calendar; photo commission from POS; government 勞健保 brackets.
- Exporting the 7 月 sheet's untitled intermediate columns.
- Merging two 薪資列 into one 應領 for bank transfer.
- Fuzzy nickname match; auto-create 店員 from unmatched strings.
- Public registration.

## Further Notes

- Glossary: repo-root `CONTEXT.md`. Architecture: `docs/adr/0001`–`0077`. Shop Q1–Q3 are answered (two 場別 rows; 勞健保 fixed on 店員; 重算 originals only).
- 7 月 CSV is the north star for named payroll columns, not pixel-identical spreadsheet archaeology (guest rows start in odd cells; trailing total rows).
- 場別拆分 may be entered as amounts or rates; they must sum to 個人業績 / 原始時數.
- iCHEF 憑證 and DDB seed Admin live in env; `.env` is not for git. Live crawl tests must use env and must not write secrets into snapshots.
- This repo had no git remote and no `docs/agents/` tracker setup at spec time; this file is the local-markdown issue (`.scratch/month-end-salary-compile/spec.md`).
- 2026-08-31 `/to-spec` 再跑一次：接縫維持「真實網頁取數 → 編成 → 對上 7 月中山表已命名欄」（另用 fixture 做不連網回歸）。無新領域決策，不另開 spec。

## Comments

- `/to-spec` republished against the same accepted seam. No interview; glossary ADR-0001–0077.
