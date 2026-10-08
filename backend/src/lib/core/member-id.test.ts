import assert from "node:assert/strict";
import test from "node:test";
import {
  executiveOfficeCommittees,
  staffCommittees,
} from "../apply/committee-office-groups";
import {
  academicYearCode,
  buildMemberIdLayout,
  formatMemberId,
  pickMemberSequence,
} from "./member-id";

const offices = executiveOfficeCommittees();
const [ceo, coo, cro, corpSec, cto, cfo, chro, cco] = offices;

const directors = staffCommittees();

function layoutWith(eaSlots: Record<string, number>, staffHolds = 0) {
  return buildMemberIdLayout({
    executiveOffices: offices,
    eaSlotsByOffice: new Map(Object.entries(eaSlots)),
    directorCommittees: directors,
    staffHolds,
  });
}

test("member ID layout follows the hierarchy", async (t) => {
  await t.test("uses one board seat per office and one director per staff committee", () => {
    assert.equal(offices.length, 8);
    assert.equal(staffCommittees().length, 13);
  });

  await t.test("matches the sample: open slots per office, then directors, staff, general", () => {
    // Corp Sec, CTO and CHRO have no open EA slots.
    const layout = layoutWith(
      { [ceo]: 2, [coo]: 1, [cro]: 2, [corpSec]: 0, [cto]: 0, [cfo]: 1, [chro]: 0, [cco]: 1 },
      42,
    );
    assert.deepEqual(layout.eaRanges.get(ceo), { start: 9, end: 10 });
    assert.deepEqual(layout.eaRanges.get(coo), { start: 11, end: 11 });
    assert.deepEqual(layout.eaRanges.get(cro), { start: 12, end: 13 });
    assert.equal(layout.eaRanges.has(corpSec), false);
    assert.equal(layout.eaRanges.has(cto), false);
    assert.equal(layout.eaRanges.has(chro), false);
    assert.deepEqual(layout.eaRanges.get(cfo), { start: 14, end: 14 });
    assert.deepEqual(layout.eaRanges.get(cco), { start: 15, end: 15 });
    assert.deepEqual(layout.staffRange, { start: 29, end: 70 });
    assert.equal(layout.generalStart, 71);
  });

  await t.test("fixes a number for every board seat and director seat", () => {
    const layout = layoutWith({ [ceo]: 2, [coo]: 1, [cro]: 2, [cfo]: 1, [cco]: 1 }, 42);
    assert.equal(layout.ebSeats.get(ceo), 1);
    assert.equal(layout.ebSeats.get(cco), 8);
    assert.equal(layout.directorSeats.get(directors[0]), 16);
    assert.equal(layout.directorSeats.get(directors[12]), 28);
  });

  await t.test("shifts everything down when an office has fewer open slots", () => {
    const layout = layoutWith({ [ceo]: 1, [coo]: 1 });
    assert.deepEqual(layout.eaRanges.get(ceo), { start: 9, end: 9 });
    assert.deepEqual(layout.eaRanges.get(coo), { start: 10, end: 10 });
    assert.equal(layout.staffRange, null);
    assert.equal(layout.generalStart, 10 + 13 + 1);
  });
});

test("member ID picking", async (t) => {
  const layout = layoutWith({ [ceo]: 2, [cro]: 1 }, 3);
  // EB 1-8, CEO 9-10, CRO 11, directors 12-24, staff 25-27, general 28+

  await t.test("gives EAs consecutive numbers in their office block", () => {
    const used = new Set<number>();
    const first = pickMemberSequence(layout, used, { kind: "ea", officeCommittee: ceo });
    used.add(first);
    const second = pickMemberSequence(layout, used, { kind: "ea", officeCommittee: ceo });
    assert.deepEqual([first, second], [9, 10]);
  });

  await t.test("overflows a full office block, or an office with no block, to general", () => {
    assert.equal(pickMemberSequence(layout, new Set([11]), { kind: "ea", officeCommittee: cro }), 28);
    assert.equal(pickMemberSequence(layout, new Set(), { kind: "ea", officeCommittee: cto }), 28);
  });

  await t.test("numbers general members only after the whole staff block", () => {
    assert.equal(pickMemberSequence(layout, new Set(), { kind: "general" }), 28);
    assert.equal(pickMemberSequence(layout, new Set([28]), { kind: "staff" }), 25);
  });

  await t.test("gives the board, directors and advisers their fixed seat numbers", () => {
    assert.equal(pickMemberSequence(layout, new Set(), { kind: "eb", officeCommittee: ceo }), 1);
    assert.equal(pickMemberSequence(layout, new Set(), { kind: "eb", officeCommittee: cco }), 8);
    assert.equal(pickMemberSequence(layout, new Set(), { kind: "director", committee: directors[0] }), 12);
    assert.equal(pickMemberSequence(layout, new Set(), { kind: "director", committee: directors[12] }), 24);
    assert.equal(pickMemberSequence(layout, new Set(), { kind: "adviser", index: 0 }), 9001);
    assert.equal(pickMemberSequence(layout, new Set(), { kind: "adviser", index: 2 }), 9003);
  });

  await t.test("never hands a taken seat to someone else", () => {
    assert.throws(
      () => pickMemberSequence(layout, new Set([1]), { kind: "eb", officeCommittee: ceo }),
      /already taken/,
    );
    assert.throws(() => pickMemberSequence(layout, new Set(), { kind: "adviser", index: 3 }), /three adviser/);
  });

  await t.test("stops the general pool below the adviser block", () => {
    const used = new Set<number>();
    for (let i = layout.generalStart; i < 8999; i++) used.add(i);
    assert.equal(pickMemberSequence(layout, used, { kind: "general" }), 8999);
    used.add(8999);
    assert.throws(() => pickMemberSequence(layout, used, { kind: "general" }), /capacity/);
  });

  await t.test("skips used numbers and never returns board or director numbers", () => {
    const used = new Set([25, 26, 28]);
    assert.equal(pickMemberSequence(layout, used, { kind: "staff" }), 27);
    assert.equal(pickMemberSequence(layout, used, { kind: "general" }), 29);
    const all = new Set<number>();
    for (let i = 0; i < 20; i++) {
      all.add(pickMemberSequence(layout, all, { kind: "general" }));
    }
    for (const sequence of all) {
      assert.ok(sequence > 27, `general member got reserved number ${sequence}`);
    }
  });
});

test("Member IDs carry the academic-year code", () => {
  assert.equal(academicYearCode(2026), "2627");
  assert.equal(academicYearCode(2099), "9900");
  assert.equal(academicYearCode(2008), "0809");
  assert.equal(formatMemberId(2026, 189), "AWS-2627-0189");
  assert.equal(formatMemberId(2026, 1), "AWS-2627-0001");
  assert.throws(() => formatMemberId(2026, 10_000), /capacity/);
});
