<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Design basis

[`DESIGN.md`](../DESIGN.md) at the repo root is the design basis for every
frontend component — colors, typography, spacing, page sections, and the
component inventory. Read it before building or styling any component, and
keep new components consistent with its tokens and conventions rather than
introducing new ones ad hoc.

# Database (Drizzle)

`backend/src/db/schema.ts` is the source of truth — never hand-write SQL for
schema changes.

- `pnpm db:up` — start Postgres (docker compose).
- `pnpm db:push` — push the current schema to the running database
  (`drizzle-kit push`, for local dev; no migration files).
- `pnpm db:seed` — apply dev fixtures (`backend/src/db/seed.ts`), idempotent —
  safe to re-run.

Typical local setup: `pnpm db:up && pnpm db:push && pnpm db:seed`.

