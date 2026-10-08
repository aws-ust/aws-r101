---
version: 1
slug: "src-app-site-admin-hr-members"
primary_target: "src/app/(site)/admin/hr/members"
related_targets: []
---

# Members (surface brief)

Mode: Operate. Established world: DESIGN.md palette and Poppins / JetBrains Mono, "Dashboard working surfaces" conventions (solid panels, 12px floor, 44px touch targets, eyebrow names the area).

## Task and audience
- HR officers, EB and directors on one shared sign-in.
- Jobs: look up one member fast; see who is in each committee; export the list; check a Member ID; see who has not paid yet.
- The page is the membership roster: people whose payment is verified and who have a Member ID. EB and directors stay mixed in until they pay, shown with the Member ID reserved for their seat and counted apart from paid members. Advisers are listed as active members.

## Structure (confirmed by the user, plus "not paid yet")
- Header: `// MEMBERSHIP` / Members, subtitle gives the honest split (paid members, officers, not paid yet).
- Scope tabs: Paid members | Not paid yet (count each).
- Toolbar: search (`/` focuses it), one dropdown (role on Paid, payment status on Not paid yet), List / By committee switch (Paid only), Export CSV of what is shown.
- Paid, List: table, 25 per page: Member ID, Name, Position, Role, Student No., Section, ID status (Active · issued date, or No ID yet). Two-line rows below 1280px.
- Paid, By committee: collapsible groups in organisation order; lead (EB or director) first, then EAs, staff, and a General members group.
- Not paid yet: Name, Position, payment status (Awaiting payment, Waiting for verification, Needs resubmission, Expired), deadline ("Pay by" or "Expired"), last submission, and one "Open payments" link beside the filter instead of a link on every row. Data from the existing payments dashboard; no backend change.
- States: loading, none paid yet, everyone paid, no match, error with retry.

## Direction contract: Members
THESIS: The roster you can trust at a glance: who is a member, in which team, and who still owes a payment, one search away.
OWN-WORLD: Existing palette and Poppins. Solid haiti panels and hairlines like the Applications table. Aquamarine only for the active tab marker and a primary action; payment statuses use words plus a quiet pill (rose-glow only for Expired and Needs resubmission).
STORY: An officer types a name or ID and finds the member; switches to By committee to check team sizes; opens Not paid yet to chase payments; exports what they see.
FIRST VIEWPORT: Eyebrow and title at the dashboard scale, subtitle with counts, tabs, one toolbar row (search, role dropdown, view switch, Export), then the table with about 10 rows visible on a laptop. One column on phones with the filters behind a Filters button.
FORM: Scope tabs over a toolbar and a dense table, following the Applications pattern. No concept roll: the four jobs and the existing table pattern decide the structure.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Untouched
Payments and Verification pages (only linked), member ID card, public site, emails. Backend: no change.
