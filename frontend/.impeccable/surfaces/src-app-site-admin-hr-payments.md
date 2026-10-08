---
version: 1
slug: "src-app-site-admin-hr-payments"
primary_target: "src/app/(site)/admin/hr/payments"
related_targets: ["src/components/hr"]
---

# Payments workspace (surface brief)

Mode: Operate. Established world: DESIGN.md palette and Poppins / JetBrains Mono, "Dashboard working surfaces" (solid panels, `// AREA` label, 12px floor, 44px coarse targets, one aquamarine job). Follows the Members page patterns (scope tabs, toolbar, dense table).

## Task and audience
- HR, EB and finance officers on the one shared sign-in, during the payment period.
- Main job: clear the receipt queue. Open the next pending receipt, check the GCash reference and the Drive screenshot, verify it or reject it with a reason, move to the next. Second job: see where everyone stands and run collection (release confirmations, retry emails, export).

## Structure (confirmed by the user)
- One Payments page replaces Payments + Verification. `/admin/hr/membership` redirects to the review tab; sidebar shows one "Payments".
- Header: `// MEMBERSHIP` / Payments, one factual line about the period (open or closed, amount, deadline; or not set up).
- Status strip: one compact row of counts in work order (Pending verification, Awaiting payment, Needs resubmission, Expired, Verified, Eligible last; work first, so the queue count leads). A count filters the list. Only Pending verification is aquamarine, and only when above zero.
- Tabs: To review (default when anything is pending; pending receipts oldest first) · All payments (search + status, applicant type, result, committee filters) · Setup (period, amount, the two GCash QRs, open/close).
- Collection actions beside the tabs: Export verified members, Retry emails menu (invitations, confirmations), Release membership confirmations behind a confirm dialog with the count.
- Review side panel: applicant, result, committee, amount, every submission (method, reference, attempt, submitted, reviewer note, View receipt), then Verify (aquamarine) or Reject with reason and resubmission deadline; verified receipts show Reverse verification. After a decision it advances to the next pending receipt. Previous / Next, ↑ / ↓ keys, Esc closes. Sticky beside the table on wide screens, a sheet below that.
- Rows: dense table, name + applicant code, committee or General member, status, reference, submitted, attempt. Columns drop by the table's own width (container queries).
- States: not set up, closed with nothing submitted, queue empty ("All caught up"), no match, receipt link failing, review error, loading, email retries running.

## Direction contract: Payments
THESIS: A receipt queue an officer can clear in one sitting: every pending receipt one click apart, every decision moving to the next.
OWN-WORLD: Existing palette and Poppins. Solid haiti panels and hairlines like Members and Applications. Aquamarine only for the pending count and the Verify action; rose-glow only for Needs resubmission, Expired and destructive actions.
STORY: An officer opens Payments, sees "12 pending", the To review tab is already open, clicks the first row, checks the receipt, presses Verify, and the panel shows the next one until the queue says all caught up.
FIRST VIEWPORT: Header with the period line, the status strip, the tabs with collection actions, and the first rows of the queue.
FORM: Tabs over a toolbar and a dense table with a docked review panel, following the Members pattern. No concept roll: the user chose the structure.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md.

## Untouched
Payment API calls and their rules; period, amount and QR form fields and logic; Community Links; the applicant side. No backend change.
