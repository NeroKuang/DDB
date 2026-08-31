---
name: ddb-next-frontend
description: >-
  DDB Next.js App Router frontend conventions. Use when editing UI, layout,
  Tailwind, routes, or client components in this repo.
---

# DDB Next.js frontend

This repo is **Next.js App Router** (`src/app`) + **Tailwind v4**, aligned with BeyRotate. Dev server is **port 5003**.

## Before changing UI

1. Read `CONTEXT.md` and ADRs that touch the screen. Use glossary terms (薪資報表, 網頁取數, 薪資列) — not synonyms the glossary avoids.
2. Follow the global frontend rule: reuse existing layout/tokens; mobile-first; semantic HTML; loading/empty/error states.
3. User-visible copy is **Traditional Chinese**. Code identifiers stay English.

## Stack

- Routes and layouts live under `src/app`. Shared UI under `src/components` when a second use appears — do not invent a design system.
- Do not add npm packages without saying why first.
- Do not use port `3000`. Scripts already pass `-p 5003`.
- Auth, 匯入, and 薪資報表 are the same site (no separate frontend SPA).
- personal must not see 底薪／應領／薪資表匯出. Admin／Supervisor see the full 薪資報表.
- 取數進度 and errors must never include iCHEF passwords.

## Verification

If the change is user-visible, exercise the flow (or say browser tools were unavailable). Phone and desktop both matter for 薪資報表 and 取數進度.
