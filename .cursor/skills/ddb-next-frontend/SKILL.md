---
name: ddb-next-frontend
description: >-
  DDB Next.js App Router frontend conventions. Use when editing UI, layout,
  Tailwind, routes, or client components in this repo.
---

# DDB Next.js frontend

This repo is **Next.js App Router** (`src/app`) + **Tailwind v4**. Dev server is **port 5003**.

## Visual system (read first)

Follow **ADR-0089** and always-on rule `.cursor/rules/ddb-cathedral-ui.mdc`:

- Always-dark cathedral shell: black / cold silver / wine red; nun–church as metaphor only.
- Shell ornaments: flat **brand-rule** hairlines + quiet corner ticks on dialogs; **no pointed arch SVG** / decorative PNGs; tables/forms stay rectangular.
- Type scale: page titles ~`1.25rem` (`.page-title`); avoid `text-3xl+` on tool pages; display serif + UI/table sans; sharp corners; restrained motion.
- Period switcher: thin 1px frame, single-line label; align period bar and main to the same `max-w-6xl` + horizontal padding.
- Chrome actions (個人檔案、登出、選單、關閉、分頁、換月、列編輯) use **icon buttons** (`IconButton` + `ui-icons.tsx`) with `aria-label`／`title`; keep text on primary form CTAs (儲存、認列…).
- Same skin for login, Admin, Supervisor, and personal (personal only sees less data).
- Settings edits: **dialog popout**, not long `<details>` expanders.

Do **not** reintroduce parchment light-theme as the primary brand.

## Before changing UI

1. Read `CONTEXT.md` and ADRs that touch the screen. Use glossary terms (薪資報表, 網頁取數, 薪資列) — not synonyms the glossary avoids.
2. Reuse tokens in `globals.css` / existing layout; mobile-first; semantic HTML; loading/empty/error states.
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
