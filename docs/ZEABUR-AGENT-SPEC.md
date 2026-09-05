# Zeabur AI Agent — DDB 部署 Spec（可直接貼上執行）

> 複製下方「AGENT SPEC」整段給 Zeabur AI Agent。  
> 機密由操作者提供；**Spec 內不放真密碼**。  
> 人讀：`docs/DEPLOY-ZEABUR.md`、`docs/ZEABUR-OPS-RULES.md`（ADR-0086）。  
> **初部已完成**：維持 `RUN_DB_PUSH=0`；勿設 `NODE_ENV`；勿用 `zeabur deploy`。

---

## AGENT SPEC

```text
# Goal
Operate / redeploy DDB on Zeabur Project NeroSP (live BeyRotate production). Do NOT use beyrotate_dev.

# Hard constraints
1. Project NeroSP; reuse Postgres + MinIO; database name `ddb`; private bucket `ddb` (no public MinIO domain required).
2. Build MUST use repo root Dockerfile (Playwright jammy). Never run `zeabur deploy` (uploads local dir, can turn PLANTYPE static and ignore Dockerfile).
3. NEVER set service variable NODE_ENV=production (injected into docker build → npm ci skips devDeps → husky prepare exit 127).
4. RUN_DB_PUSH must stay 0 unless operator explicitly requests a schema sync; then set 1 once, confirm db push, immediately set back to 0.
5. AUTH_URL / NEXTAUTH_URL / NEXT_PUBLIC_SITE_URL = ${ZEABUR_WEB_URL}.
6. MinIO endpoint = internal only (http://minio.zeabur.internal:9000).
7. Acceptance = real HTTP + runtime logs, NOT deployment status RUNNING alone.
8. After redeploy, brief 502 may be rolling window on ~1.2GB image — check window before diagnosing outage.
9. Cron is EXTERNAL (HTTPS GET + Bearer). Month-end timeout >= 15 minutes.
10. Secrets only in Variables — never commit .env, never log iCHEF passwords.

# Do not
- Invent a new Dockerfile without reading the repo file first
- Treat Prisma openssl warn spam as the build failure cause; find the non-zero exit line
- Declare success without pasteable evidence
- Put DDB tables into the beyrotate database

# Redeploy
- Prefer: git push to main, or Dashboard Redeploy, or `zeabur service redeploy --id <id>`
- CLI variable changes do NOT auto-rebuild; restart or redeploy after variable edits

# Variables (stable baseline; RUN_DB_PUSH=0)
DATABASE_URL=postgresql://<user>:<password>@<postgres-internal-host>:5432/ddb
AUTH_SECRET=<random>
AUTH_URL=${ZEABUR_WEB_URL}
NEXTAUTH_SECRET=<same as AUTH_SECRET>
NEXTAUTH_URL=${ZEABUR_WEB_URL}
NEXT_PUBLIC_SITE_URL=${ZEABUR_WEB_URL}
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<from operator>
CRON_SECRET=<from operator>
RUN_DB_PUSH=0
MINIO_ENDPOINT=http://minio.zeabur.internal:9000
MINIO_ACCESS_KEY=<minio root user>
MINIO_SECRET_KEY=<minio root password>
MINIO_BUCKET=ddb
STORE_ID=<from operator>
LOGIN_ID=<from operator>
LOGIN_PASSWORD=<from operator>

# External cron
1) GET ${ZEABUR_WEB_URL}/api/cron/month-end-fetch — day 2 12:00 Asia/Taipei — Bearer CRON_SECRET — timeout >= 15m
2) GET ${ZEABUR_WEB_URL}/api/cron/storage-retention — monthly — same Bearer — timeout >= 5m

# Acceptance
- [ ] Admin can sign in (HTTP evidence)
- [ ] Empty period shows soft「尚未有成功匯入」, not File not found compile failure
- [ ] After web-fetch: fetchStatus SUCCEEDED; MinIO ddb has raw/ (and audit/)
- [ ] Cron 200 with Bearer, 401 without
- [ ] RUN_DB_PUSH is 0
- [ ] Confirmed Dockerfile/Git source (not accidental static upload)
```

---

## 操作者需另外提供給 Agent 的密文（勿進 git）

| 項目                                          | 說明                                       |
| --------------------------------------------- | ------------------------------------------ |
| 目標 Zeabur Project                           | **NeroSP**（確認不是 `beyrotate_dev`）     |
| GitHub repo／branch                           | `NeroKuang/DDB` · `main`                   |
| `ADMIN_PASSWORD`／`CRON_SECRET`／Auth secrets | 強隨機                                     |
| Postgres／MinIO                               | Project 內既有連線；庫與 bucket 皆為 `ddb` |
| iCHEF 三憑證                                  | `STORE_ID`／`LOGIN_ID`／`LOGIN_PASSWORD`   |
