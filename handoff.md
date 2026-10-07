# Handoff: HR and applicant dashboard redesign

Written 2026-10-08 on branch `alden/application-feature`. `[confirmed]` = checked this session. `[assumed]` = inferred or recalled, verify before relying on it.

## 1. Goal and current state

AWS Builders – UST recruitment and membership app (Next.js 16 frontend, Hono + Drizzle + Postgres backend). The current effort is a redesign of the **HR dashboard** and the **applicant dashboard** with the Impeccable skill, code-led, keeping DESIGN.md's palette and fonts.

- **Done and committed** `[confirmed]`: Overview redesign (briefing + worklist + schedule + stage line), Applications table, `/admin/hr/overview` as login landing, sidebar scroll fix, schedule data on `GET /season-overview`, `// LABEL` headers on Overview and Members, fix for the broken `outboxStatus` query (commit d0502d2). `origin/alden/application-feature` equals HEAD `36f1c27` by the local tracking ref (not re-fetched), so nothing committed is unpushed.
- **Done, finish-reviewed, NOT committed** `[confirmed]`: the **Members page redesign**. The independent reviewer scored all fixes resolved. `pnpm test:members-ui` (5 pass), tsc and eslint were clean at the last run.
  - Files: `frontend/src/components/hr/` (`hr-members-page.tsx`, `use-members-data.ts`, `use-members-view.ts`, `members-tabs.tsx`, `members-toolbar.tsx`, `members-filter-select.tsx`, `members-states.tsx`, `member-table.tsx`, `member-table-row.tsx`, `member-committee-groups.tsx`, `member-role-pill.tsx`, `unpaid-table.tsx`; `hr-member-list.tsx` deleted), `frontend/src/components/ui/tabs.tsx` (shadcn, restyled), `frontend/src/lib/members/` (`directory.ts`, `groups.ts`, `unpaid.ts`, `csv.ts`, `download.ts`, `format.ts`, `members.test.ts`), plus small edits to `application-pagination.tsx` (nowrap label), `lib/hr/applications-csv.ts` (exports `escapeCell`), `package.json` (script `test:members-ui`), `DESIGN.md` (Members bullet), `frontend/.impeccable/surfaces/src-app-site-admin-hr-members.md`. Also untracked: `.claude/skills/handoff/` and this file.
- **Not started**: applicant dashboard (slice 2), application detail and Results (slice 3), pass-2 pages (Committees, Recruitment Setup, Archive, Community Links), Previous/Next on application detail.

## 2. Next step

Commit the Members work as focused commits (suggested: logic + tests; components + tabs primitive; docs and brief), after the user says to commit. Then start slice 2 with `/impeccable shape` on the applicant dashboard.

## 3. Decisions made and why

- **Palette and fonts stay as DESIGN.md.** The user rerolled the direction round twice to get there. Rejected: any new palette or type.
- **Overview structure**: user first locked "Season Overview", then asked for a major redesign and locked **Briefing and Worklist**. Not chosen: Intake and Milestones, Committee Board, Ticket Wallet, Terminal Yellow, Split-Flap.
- **Applications stays at `/admin/hr`.** Moving it to `/admin/hr/applications` was rejected because it breaks the `returnTo` allowlist, login redirects, back links and docs. Overview lives at `/admin/hr/overview` and is where login lands.
- **No glass on dashboard working surfaces.** Use `frontend/src/lib/site/dashboard-surface.ts`. Do not edit `glassPanelClasses` or the shared UI primitives: Payments and the public site use them.
- **Members**: EB and directors stay mixed into the list (user chose this over "paid members only" and a separate leadership group). Rejected: a member detail page. Paid members are listed first, officers after them. First tab is "Members", not "Paid members", because it also holds officers. One "Open payments" link beside the filter instead of one per row. "Not paid yet" is a second tab, requested by the user.
- **Eyebrows**: user wants `// AREA` labels that name the area, never just the title. This overrides Impeccable's craft-floor ban on eyebrows. The Applications page currently has none.
- **One shared HR sign-in for now** (HR, EB, directors). No per-role or per-person views. Finance sign-in is not built.
- **Payments and Verification pages are out of scope** for this redesign (user will optimise them later). Members only links to them.
- **Type**: 12px floor for data text. The user asked that Overview type be scaled back down after the "bolder" pass.
- Deferred: Previous/Next on application detail (needs list order context).

## 4. Constraints and requirements

- Frontend rules (`frontend/AGENTS.md`): no long Tailwind strings inline (use named consts), components well under 150 lines, shadcn on **Base UI, never Radix** (`npx shadcn@latest add <x>`), read `DESIGN.md` first. Next.js 16 has breaking changes: read `node_modules/next/dist/docs/` before using Next APIs.
- Windows + Git Bash. Many files are **CRLF**: scripted edits must handle `\r\n`. Long shell commands with heredocs, backticks or quotes fail to parse: write files with the editor tool and keep shell commands short.
- Local `db:push` stops on an unrelated "truncate applications" prompt: never accept it.
- Do not commit or push unless asked. Commits are "micro commits": one per related change, not per file. Use the attribution line from the session's system reminder.
- Backend tests need a database named `*_test`.

## 5. Key artifacts

- Product truth: `frontend/PRODUCT.md`. Visual truth: root `DESIGN.md` (section "Dashboard working surfaces"). Surface briefs with direction contracts: `frontend/.impeccable/surfaces/src-app-site-admin-hr.md` (HR dashboard, Overview) and `...-hr-members.md`.
- Overview logic: `frontend/src/lib/hr/overview*.ts` (tests `pnpm test:overview-ui`); backend `backend/src/lib/hr/season-overview.ts`.
- Test commands from repo root: `pnpm test:overview-ui`, `pnpm test:members-ui`. Backend: `cd backend`, then `DATABASE_URL=postgres://postgres:postgres@localhost:5434/aws_ust_recruitment_test npx tsx --env-file-if-exists=../.env --test --test-concurrency=1 src/season-overview.test.ts src/email-outbox.test.ts`.
- Running now `[confirmed]`: frontend `localhost:3000`, API `localhost:8787`, containers postgres (port 5434) and localstack. Local databases: `aws_ust_recruitment` (5 applications, 4 payments, no dummy rows) and `aws_ust_recruitment_test`.
- Local HR login: `hr@aws-ust.org`; the password is the seed default in `backend/src/db/seed.ts` (`DEV_PASSWORD`). The `HR_PASSWORD` in `.env` does **not** match the seeded hash.
- Impeccable: `.claude/skills/impeccable`, hooks in `.claude/settings.json`, agent `impeccable-finish-reviewer`. Flow used: shape, structure round on the decision page, build, one to two screenshot rounds, finish reviewer, fix, verdict pass.
- Screenshot method (scripts were in the session scratchpad, not the repo): headless Chrome via `puppeteer-core`. The page scrolls inside the sidebar inset, so grow the viewport to the content height for full-page shots. Real mouse clicks never reach the page in headless here, so use programmatic `.click()`. Hide `nextjs-portal` (dev badge). Temporary dummy data used `last_name = 'ZZVisual'`, removed by cascade.

## 6. Open questions and known issues

- Pre-commit hook (React Doctor) prints `Cannot find module '...@sentry\conventions\dist\attributes.mjs'` and "found staged regressions" on every commit, but does not block. Likely a broken install; `pnpm install` should fix it `[assumed]`.
- Not visually checked: Members and Overview empty, loading and error states; real phone or Safari.
- The Members "Members" tab count includes officers, not only paid people. `[confirmed]` by design.
- "Interview booked" counts bookings; there is no interview-completed marker `[confirmed]`.
- Directors: per-committee views undecided.
- Applicant dashboard direction (from the brief, not yet shaped with the user): status and next step first, a "Now" panel, keep the member ID card, keep "Your application" open while the edit window is open, EA applicants see the Core Team chat link.
- **Prod rollout still pending** `[confirmed]` that it was not done: run the outbox migration, deploy, Retry Failed Emails and handle "Uncertain" ones; add `core_team_chat_link` and `gcash_core_qr_*` columns to prod. The SQL (`prod-0-diagnose-readonly.sql`, `prod-1-outbox-migration.sql`) is only in the old session scratchpad `[assumed]` still on disk: `C:\Users\ALDENO~1\AppData\Local\Temp\claude\c--Users-Alden-Olmedo-Documents-VSCode-aws-recruitment-2026\8d6fccec-ac63-4ac6-bcf2-6e8c392e8c56\scratchpad\`. Prod DB URL is needed from the user. Existing prod `AWS-2026-…` member IDs were not converted (user has not asked).
- No PR has been opened for this branch `[assumed]`; it is 216 commits ahead of `main`.

## 7. Preferences for this task

- Terse, lowercase requests. Wants a plan for big redesigns before building, and wants Impeccable used for design.
- Say plainly what was and was not verified. Report outcomes at their real scope.
- Keep dashboard type modest; the user pushed back when it got too big.
- Likes seeing screenshots checked and an independent review before a redesign is called done.

## 8. Verbatim essentials

- "this tab is only for those have paid and they're now a member of the org"
- "i think there's an option as well where the hr can see those who hasnt paid yet"
- "in code we put // as comments similar in the ss, put something like that as well in the overview but dont say just overview"
- "keep the payments part still inside the hr dashboard and we'll fix and optimize it on a later date"
- "for now, it should only have one account for now for signing in"
- Resume phrase for a fresh session: `read handoff.md and continue`.
