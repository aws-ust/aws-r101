---
version: 1
slug: "src-app-site-apply-dashboard"
primary_target: "src/app/(site)/apply/dashboard"
related_targets: ["src/components/apply"]
---

# Applicant dashboard (surface brief)

Mode: Operate. Established world: DESIGN.md palette and Poppins / JetBrains Mono, "Dashboard working surfaces" conventions (solid panels, 12px floor, 44px touch targets, eyebrow names the area, one aquamarine job per screen).

## Task and audience
- Applicants (UST students), mostly on phones, some on laptops during recruitment week. Anxious while waiting, acting when there is something to do (book interview, answer a redirect, pay), proud once they hold their ID.
- Job: know where they stand in seconds, then do the one thing in front of them.

## Structure (confirmed by the user)
- Order kept: header, identity, result or application, groups, payment, membership ID.
- Header: `// APPLICANT DASHBOARD`, title "Your application" or "Your results", one factual subtitle per state built from existing data.
- Identity: name, applicant code, and a state chip (Applied, In review, Member-only application, Member, Accepted, Reply needed, Not selected; "Reply needed" replaces "Redirected" so the chip names the applicant's job, and is the only aquamarine chip). Everything else in a collapsible "Your application" (contact facts, links, motivation, CV and RegForm), open while the edit window is open.
- Every section: `// AREA` eyebrow, short title, one status line, then detail. Result titled with the committee. Payment titled with its status, amount and deadline as facts.
- Group links: compact rows (icon, name, purpose, arrow), not tiles.
- Payment steps stay numbered (the order carries information).
- Personality (user chose "R101 trail + milestone sky"): an R101 trail of stations under the name, filled to "you are here" on load, aquamarine only when the applicant must act; the newest milestone (acceptance, or the ID once issued) opens on the ID card's night sky with Espi rising. One milestone section per page.
- Member-only applicants use the same frame with a "Member-only application" chip ("Member" once accepted).
- States: pre-results (edit open / locked), member-only (registered / accepted), accepted, redirect pending, not selected / declined, payment (awaiting, pending verification, needs resubmission, expired, verified with ID), loading, load error, expired session.

## Direction contract: Applicant dashboard
THESIS: One honest status at a time: every section says where the applicant stands before it shows detail.
OWN-WORLD: Existing palette and Poppins. Solid haiti panels and hairlines like the HR dashboard. Aquamarine only for the one action or state that needs the applicant; rose-glow only for problems (needs resubmission, expired, not selected stays neutral).
STORY: An applicant opens the page, reads the chip and subtitle, scans the section that needs them, acts, and leaves; members come back for their ID and groups.
FIRST VIEWPORT: Eyebrow and dashboard-scale title, state subtitle, identity row with chip, then the first section's title and status line.
FORM: A single column of solid sections in the existing order. No concept roll: the user kept the order.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md.

## Untouched
Member ID card artwork and its actions; logic inside the interview scheduler, choice and document editors, redirect answers and payment form; all API calls; HR dashboard; public site.
