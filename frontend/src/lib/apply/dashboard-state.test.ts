import assert from "node:assert/strict"
import test from "node:test"
import type { ApplicantPayment, ApplicantResult } from "../api/applicant"
import { applicantDashboardState, isAccepted, resolvePlacement } from "./dashboard-state"
import { r101Trail } from "./r101-trail"

const placement = (committee: string, title = committee) => ({ positionId: "p", committeeId: "c", committee, title })

function result(patch: Partial<ApplicantResult>): ApplicantResult {
  return {
    status: "approved",
    releasedAt: "2026-10-06T02:00:00.000Z",
    memberId: null,
    redirectPlacement: null,
    redirectResponse: null,
    groupLinks: null,
    finalPlacement: placement("Office of the Chief Relations Officer", "Executive Assistant to the CRO"),
    choices: [],
    ...patch,
  }
}

const base = { applicationType: "position" as const, canEdit: false, editDeadline: null, result: null }

test("before results: open edit window names the deadline, locked says it is in review", () => {
  const open = applicantDashboardState({ ...base, canEdit: true, editDeadline: "2026-09-20T15:59:00.000Z" })
  assert.equal(open.chip.label, "Applied")
  assert.match(open.subtitle, /until Sep 20, 2026/)
  assert.equal(applicantDashboardState(base).chip.label, "In review")
})

test("released results map to accepted, reply needed and not selected", () => {
  const accepted = applicantDashboardState({ ...base, result: result({}) })
  assert.deepEqual(accepted.chip, { label: "Accepted", tone: "positive" })
  assert.match(accepted.subtitle, /Office of the Chief Relations Officer/)

  const offer = result({ status: "rejected", redirectPlacement: placement("Creatives"), finalPlacement: null })
  assert.deepEqual(applicantDashboardState({ ...base, result: offer }).chip, { label: "Reply needed", tone: "action" })
  assert.equal(resolvePlacement(offer)?.committee, "Creatives")

  const declined = { ...offer, redirectResponse: "declined" as const }
  assert.equal(isAccepted(declined), false)
  assert.match(applicantDashboardState({ ...base, result: declined }).subtitle, /declined/)
})

test("the R101 trail puts 'you are here' on the station that matters now", () => {
  const editing = r101Trail({ ...base, canEdit: true }, null)
  assert.deepEqual([editing.stations[editing.current], editing.mood], ["Interview", "waiting"])
  assert.deepEqual([r101Trail(base, null).current, r101Trail(base, null).mood], [2, "waiting"])

  const accepted = { ...base, result: result({}) }
  const due = { paymentStatus: "awaiting_payment", canSubmit: true, memberCard: null } as ApplicantPayment
  assert.deepEqual([r101Trail(accepted, due).current, r101Trail(accepted, due).mood], [3, "action"])
  const member = { ...due, paymentStatus: "verified", memberCard: { memberId: "AWS-2627-0001" } } as ApplicantPayment
  assert.deepEqual([r101Trail(accepted, member).current, r101Trail(accepted, member).mood], [4, "complete"])

  const memberOnly = r101Trail({ ...base, applicationType: "member" }, null)
  assert.deepEqual([memberOnly.stations[1], memberOnly.current], ["R101", 1])

  const expired = { ...due, paymentStatus: "expired", canSubmit: false } as ApplicantPayment
  assert.equal(r101Trail(accepted, expired).mood, "problem")
})

test("member-only applicants get their own chip before and after acceptance", () => {
  const member = { ...base, applicationType: "member" as const }
  assert.equal(applicantDashboardState(member).chip.label, "Member-only application")
  assert.equal(applicantDashboardState({ ...member, result: result({ finalPlacement: null }) }).chip.label, "Member")
})
