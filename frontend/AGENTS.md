# Frontend rules

- **No long Tailwind strings inline in JSX.** Anything past a few utilities
  goes in a descriptive `const` above the component (e.g. `const
  navLinkClasses = "..."`) or into a cva variant. JSX should read as
  structure, not styling — see `src/components/navbar.tsx` and
  `src/components/ui/button.tsx` for the pattern.
- **Keep components small** — aim for well under 150 lines each. Reach for
  an existing primitive in `src/components/ui/` or `@base-ui/react` before
  writing a new one.
- This repo is shadcn v4 on **Base UI** (`components.json` → `"base-nova"`),
  not Radix — never add `@radix-ui/*`. Add primitives with `npx shadcn@latest
  add <component>` and extend the generated source directly for one-off
  variants instead of wrapping it.
- `cn` (clsx + tailwind-merge) lives at `@/lib/utils` — reuse it for
  conditional classes.
- Read [`../DESIGN.md`](../DESIGN.md) before styling or adding a component —
  colors, type scale, spacing/radius, and page section list all live there.
- Use the `glass` utility (`src/app/globals.css`) for translucent surfaces —
  don't hand-roll `backdrop-filter`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
