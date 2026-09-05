# Zeabur AI Agent — DDB 部署 Spec（可直接貼上執行）

> 複製下方「AGENT SPEC」整段給 Zeabur AI Agent。  
> 機密（Admin／CRON／iCHEF／DB／MinIO 密碼）由操作者在對話中提供或於 Variables 填入；**Spec 內不放真密碼**。  
> 詳細人讀文件：`docs/DEPLOY-ZEABUR.md`（ADR-0086）。

---

## AGENT SPEC

```text
# Goal
Deploy the DDB (payroll / iCHEF month-end) Next.js app into the EXISTING production / active BeyRotate Zeabur Project. Do NOT use any environment or project named beyrotate_dev (it is decommissioned).

# Hard constraints
1. Same Zeabur Project as the live BeyRotate app (reuse Project Postgres + MinIO).
2. DDB must use its OWN Postgres database name: `ddb` (do not put tables into the beyrotate database).
3. DDB must use its OWN MinIO bucket: `ddb` (private; do not reuse listing-images / avatars).
4. Build MUST use the repo root Dockerfile (Playwright Chromium image). Do NOT use auto Node build only — web fetch needs browsers.
5. App listens on Zeabur-injected PORT; start via scripts/start.sh (optional prisma db push then node server.js).
6. First deploy: RUN_DB_PUSH=1. After healthy boot, set RUN_DB_PUSH=0.
7. Public URL: use ${ZEABUR_WEB_URL} for AUTH_URL, NEXTAUTH_URL, NEXT_PUBLIC_SITE_URL.
8. Secrets only in Variables — never commit .env, never log iCHEF passwords.
9. Cron is EXTERNAL (HTTPS GET + Bearer). Month-end job timeout must be >= 15 minutes.

# Repo
- Git service from the DDB GitHub repository (branch: main unless operator says otherwise).
- Dockerfile at repository root.
- Do not bake shop xlsx / .env / prisma/*.db into the image (already .dockerignore).

# Infrastructure steps (in order)
A. PostgreSQL
   - Locate the Project’s Postgres service (BeyRotate’s).
   - Ensure database `ddb` exists: CREATE DATABASE ddb; (idempotent if already exists).
   - Compose DATABASE_URL = same credentials/host as BeyRotate Postgres, path `/ddb`.

B. MinIO
   - Locate the Project’s MinIO service (create in Project if missing).
   - Create private bucket `ddb`.
   - MINIO_ENDPOINT must be the INTERNAL host (e.g. http://<minio>.zeabur.internal:9000), NOT the public console domain.
   - MINIO_ACCESS_KEY / MINIO_SECRET_KEY = MinIO root user/password from that service.
   - MINIO_BUCKET=ddb

C. DDB web service
   - Add Git service → DDB repo → Dockerfile build.
   - Set Variables (operator supplies secret values):

DATABASE_URL=postgresql://<user>:<password>@<postgres-internal-host>:5432/ddb
AUTH_SECRET=<random>
AUTH_URL=${ZEABUR_WEB_URL}
NEXTAUTH_SECRET=<same as AUTH_SECRET>
NEXTAUTH_URL=${ZEABUR_WEB_URL}
NEXT_PUBLIC_SITE_URL=${ZEABUR_WEB_URL}
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong password from operator>
CRON_SECRET=<random from operator>
RUN_DB_PUSH=1
MINIO_ENDPOINT=http://<minio-internal-host>:9000
MINIO_ACCESS_KEY=<minio root user>
MINIO_SECRET_KEY=<minio root password>
MINIO_BUCKET=ddb
STORE_ID=<from operator>
LOGIN_ID=<from operator>
LOGIN_PASSWORD=<from operator>

   - Deploy. Confirm logs show prisma db push (first time) and server listening.
   - Then change RUN_DB_PUSH to 0 and redeploy/restart if required by platform.

# External cron (tell operator to configure if Agent cannot)
1) GET ${ZEABUR_WEB_URL}/api/cron/month-end-fetch
   - Schedule: day 2 of month 12:00 Asia/Taipei
   - Header: Authorization: Bearer <CRON_SECRET>
   - Timeout: >= 15 minutes
2) GET ${ZEABUR_WEB_URL}/api/cron/storage-retention
   - Schedule: monthly (e.g. day 3)
   - Same Bearer header
   - Timeout: >= 5 minutes

# Acceptance checklist (must all pass)
- [ ] Service healthy; Admin can sign in at ZEABUR_WEB_URL
- [ ] Dockerfile-based image (Playwright available); not plain Node-only
- [ ] DATABASE_URL ends with /ddb; schema applied
- [ ] MinIO bucket ddb exists; after a successful web-fetch, objects under raw/ (and audit/) appear
- [ ] No UI message「MinIO 未設定」when MINIO_* are set
- [ ] Cron endpoints return 200 with correct Bearer (not 401)
- [ ] RUN_DB_PUSH is 0 after first successful schema sync
- [ ] Confirmed NOT deployed under beyrotate_dev

# Out of scope
- Local docker-compose on developer machines
- Changing BeyRotate app code or its schema
- Committing secrets or shop payroll xlsx to git
- Approving shop business rules / salary discrepancies

# If blocked
Stop and report: missing operator secrets, missing Postgres/MinIO in Project, Dockerfile build failure, or inability to create database/bucket. Do not invent alternate ports or put DDB tables into the beyrotate database.
```

---

## 操作者需另外提供給 Agent 的密文（勿進 git）

| 項目                                     | 說明                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| 目標 Zeabur Project 名稱                 | 現役 BeyRotate 正式 Project（確認不是 `beyrotate_dev`）                     |
| GitHub repo URL／branch                  | DDB                                                                         |
| `ADMIN_PASSWORD`                         | 強密碼                                                                      |
| `CRON_SECRET`                            | 隨機字串                                                                    |
| `AUTH_SECRET`／`NEXTAUTH_SECRET`         | 可用 `openssl rand -base64 32`                                              |
| Postgres 連線                            | 或允許 Agent 讀 Project 內 `POSTGRES_CONNECTION_STRING` 後改 path 為 `/ddb` |
| MinIO root 帳密與內網 host               | Project MinIO Variables                                                     |
| `STORE_ID`／`LOGIN_ID`／`LOGIN_PASSWORD` | iCHEF 只讀營業報表                                                          |
