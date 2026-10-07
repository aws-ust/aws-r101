---
version: 1
slug: "src-app-site-admin-hr"
primary_target: "src/app/(site)/admin/hr"
related_targets: []
---

# HR and applicant dashboards (surface brief)

Mode: Operate. Established world (DESIGN.md palette and Poppins / JetBrains Mono stay). Redesign of structure and surface treatment only.

## Task and audience
- HR dashboard: HR officers, EB and directors on one shared sign-in; long laptop sessions, quick phone checks, seasonal bursts, up to ~600 applicants.
- Applicant dashboard: applicants (committee, EA, member-only), mostly phones; members keep their digital ID there.
- Success: from sign-in the next piece of work is one click away; Applications shows ~25 rows per laptop screen; every action works on a phone; an applicant sees status and next step first.

## Locked structure: Season Overview
- New page `/admin/hr/overview` is the first nav item and the post-login landing. Applications stays at `/admin/hr` (no URL moves).
- Overview: a stage line (Applied, Interview booked, Decided, Released, Payment sent, Member) where each station links to its list, plus a "needs you" list. Not big-number cards.
- Every count must equal what its linked list shows. Stage definitions live in ONE backend function and are reused for the applicant's own progress line.
- Applications: compact table on laptops (about 25 rows), two-line rows with 44px targets on touch.

## Surface treatment
- New dashboard-only surface classes; do not edit `glassPanelClasses` or ui primitives (shared with Payments and the public site). Glass only on dialogs and menus.
- No eyebrow labels above headings, no icon-heading-text card grids, no nested cards, no hero-metric tiles. Aquamarine only on the one main action of a screen.
- Text carrying data is at least 12px (same fonts).

## Scope
- Slice 1: navigation, Overview + endpoint, Applications table.
- Slice 2: applicant dashboard (status first, "Now" panel, member ID kept, "Your application" stays open while the edit window is open).
- Slice 3: application detail and Results.
- Pass 2: Members, Committees, Setup, Archive, Links; Previous/Next on detail.
- Untouched: Payments, Verification, member ID card design, public site, emails.

## Open
- Directors see everything (single account); per-committee views undecided.
- Stage counts are running totals ("has reached"), not "currently here".

## Direction contract: Overview (Briefing and Worklist, seed 077fb446)
THESIS: The Overview answers "where are we and what do I do next" in plain sentences and a worklist where every task has its own button. It refuses a wall of counts over an empty screen.
OWN-WORLD: Existing palette and Poppins. Solid haiti panels with hairlines. Aquamarine marks the single primary action and the lit stage; blocked and watch states use prelude and rose-glow. No eyebrows, no icon-heading cards, no gradients.
STORY: An officer opens the page and reads one large sentence on the state of the season, sees which task is ready, blocked (with the reason) or only worth watching, and acts from the row.
FIRST VIEWPORT: Left column: the briefing sentence at 28-32px with two supporting lines, then the worklist (up to four rows, one aquamarine button on the first ready row). Right rail (xl and up): season schedule in date order with Open, Closed or Opens-in states, and under it the compact vertical stage line. On smaller screens one column: briefing, worklist, schedule, stage line. Ready tasks come first, then blocked, then watching; the interview task only shows once interviews are open.
FORM: Briefing and Worklist, option 2 of the dealt hand (dealt 6, 3, 2); seed key 077fb446.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
