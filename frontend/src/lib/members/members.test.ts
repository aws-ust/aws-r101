import assert from "node:assert/strict"
import test from "node:test"
import type { DirectoryMember, PaymentListItem } from "../api/payments"
import { membersToCsv, unpaidToCsv } from "./csv"
import { buildMemberEntries, filterMemberEntries, splitByMemberId } from "./directory"
import { buildCommitteeGroups, GENERAL_GROUP } from "./groups"
import { buildUnpaidEntries, countByUnpaidStatus, filterUnpaidEntries } from "./unpaid"

function member(patch: Partial<DirectoryMember>): DirectoryMember {
  return {
    memberId: "AWS-2627-0001",
    fullName: "Test Member",
    studentNumber: "2023100001",
    section: "3CSC",
    role: "general",
    position: "General Member",
    committee: null,
    verifiedAt: "2026-10-06T00:00:00.000Z",
    ...patch,
  }
}

function payment(patch: Partial<PaymentListItem>): PaymentListItem {
  return {
    paymentId: "p1",
    applicationId: "a1",
    applicationCode: "AP-2026-000001",
    applicationType: "position",
    applicationStatus: "approved",
    archivedAt: null,
    memberId: null,
    firstName: "Ana",
    lastName: "Cruz",
    email: "someone@ust.edu.ph",
    status: "awaiting_payment",
    membershipStatus: "inactive",
    confirmationStatus: "not_released",
    verifiedAt: null,
    resubmissionDeadlineAt: null,
    deadlineAt: "2026-10-20T00:00:00.000Z",
    finalPosition: "Finance Committee Staff",
    committee: "Finance Committee",
    latestSubmission: null,
    ...patch,
  }
}

test("paid members come first with their Member ID, then the officers with their office", () => {
  const entries = buildMemberEntries([
    member({ role: "staff", position: "Finance Committee Staff", committee: "Finance Committee" }),
  ])
  assert.equal(entries[0].memberId, "AWS-2627-0001")
  const first = entries[1]
  assert.equal(first.role, "eb")
  assert.equal(first.memberId, null)
  assert.match(first.committee ?? "", /^Office of the /)
  assert.ok(entries.some((entry) => entry.role === "director" && entry.committee?.endsWith("Committee")))
  const last = entries[0]
  assert.deepEqual(
    [last.memberId, last.committee, last.issuedAt],
    ["AWS-2627-0001", "Finance Committee", "2026-10-06T00:00:00.000Z"],
  )
  const split = splitByMemberId(entries)
  assert.equal(split.withId, 1)
  assert.equal(split.officers, entries.length - 1)
})

test("search matches name, Member ID, student number and committee", () => {
  const entries = buildMemberEntries([
    member({ fullName: "Dana Reyes", committee: "Media Committee", role: "staff" }),
  ])
  assert.equal(filterMemberEntries(entries, "all", "dana").length, 1)
  assert.equal(filterMemberEntries(entries, "all", "2627-0001").length, 1)
  assert.equal(filterMemberEntries(entries, "all", "2023100001").length, 1)
  assert.ok(filterMemberEntries(entries, "all", "media committee").some((entry) => entry.fullName === "Dana Reyes"))
  assert.equal(filterMemberEntries(entries, "director", "dana").length, 0)
})

test("committee groups follow the organisation order, lead first, general members last", () => {
  const entries = buildMemberEntries([
    member({ memberId: "AWS-2627-0002", fullName: "Zed Staff", role: "staff", committee: "Finance Committee" }),
    member({
      memberId: "AWS-2627-0003",
      fullName: "Amy Assistant",
      role: "ea",
      committee: "Office of the Chief Finance Officer",
    }),
    member({ memberId: "AWS-2627-0004", fullName: "Gil General" }),
  ])
  const groups = buildCommitteeGroups(entries)
  assert.equal(groups[groups.length - 1].name, GENERAL_GROUP)
  assert.equal(groups[0].name, "Office of the Chief Executive Officer")
  const office = groups.find((group) => group.name === "Office of the Chief Finance Officer")
  assert.deepEqual([office?.leads[0]?.role, office?.members.map((person) => person.fullName)], ["eb", ["Amy Assistant"]])
  const committee = groups.find((group) => group.name === "Finance Committee")
  assert.deepEqual(
    [committee?.leads[0]?.role, committee?.members.map((person) => person.fullName), committee?.total],
    ["director", ["Zed Staff"], 2],
  )
  const officeAt = groups.findIndex((group) => group.name === "Office of the Chief Finance Officer")
  const committeeAt = groups.findIndex((group) => group.name === "Finance Committee")
  assert.ok(officeAt < committeeAt)
  // Offices and General members are top level; a committee sits under its office.
  assert.deepEqual([office?.level, committee?.level, groups[groups.length - 1].level], [0, 1, 0])
})

test("not-paid entries leave out paid and archived people and put who to chase first", () => {
  const entries = buildUnpaidEntries([
    payment({ paymentId: "v", status: "verified" }),
    payment({ paymentId: "arch", archivedAt: "2026-10-01T00:00:00.000Z" }),
    payment({ paymentId: "e", firstName: "Eli", lastName: "Expired", status: "expired" }),
    payment({ paymentId: "p", firstName: "Pia", lastName: "Pending", status: "pending_verification" }),
    payment({
      paymentId: "r",
      firstName: "Rey",
      lastName: "Resend",
      status: "needs_resubmission",
      resubmissionDeadlineAt: "2026-10-25T00:00:00.000Z",
    }),
    payment({ paymentId: "a", firstName: "Ana", lastName: "Awaiting", email: "ana@ust.edu.ph", applicationType: "member", finalPosition: null }),
  ])
  assert.deepEqual(entries.map((entry) => entry.key), ["a", "r", "p", "e"])
  assert.equal(entries[0].position, "General Member")
  assert.equal(entries[1].dueAt, "2026-10-25T00:00:00.000Z")
  assert.equal(entries[2].dueAt, "2026-10-20T00:00:00.000Z")
  const counts = countByUnpaidStatus(entries)
  assert.deepEqual([counts.all, counts.awaiting_payment, counts.expired], [4, 1, 1])
  assert.deepEqual(filterUnpaidEntries(entries, "pending_verification", "").map((entry) => entry.key), ["p"])
  assert.deepEqual(filterUnpaidEntries(entries, "all", "ana@").map((entry) => entry.key), ["a"])
})

test("CSV exports quote cells and guard against spreadsheet formulas", () => {
  const entries = buildMemberEntries([member({ fullName: "=SUM(A1)", position: 'Says "hi", twice' })])
  const csv = membersToCsv(entries.slice(0, 1))
  const [header, row] = csv.split("\r\n")
  assert.equal(header, '"Full name","Position","Role","Committee","Member ID","Student number","Section","ID issued"')
  assert.ok(row.startsWith(`"'=SUM`))
  assert.ok(row.includes('"Says ""hi"", twice"'))
  const unpaid = unpaidToCsv(buildUnpaidEntries([payment({})]))
  assert.ok(unpaid.split("\r\n")[1].includes('"Awaiting payment"'))
})
