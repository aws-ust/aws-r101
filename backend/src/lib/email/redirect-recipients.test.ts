import assert from "node:assert/strict";
import test from "node:test";
import { redirectPlacementCcEmails } from "./redirect-recipients";

test("redirect CC uses office EB only for executive assistants", () => {
  const cc = redirectPlacementCcEmails({
    committee: "Office of the Chief Technology Officer",
    positionTitle: "Executive Assistant to the CTO",
  });
  assert.deepEqual(cc, ["neilalfonz.casas.cics@ust.edu.ph"]);
});

test("redirect CC uses office EB and committee director for staff", () => {
  const cc = redirectPlacementCcEmails({
    committee: "Development Committee",
    positionTitle: "Development Committee Staff",
  });
  assert.deepEqual(cc, [
    "neilalfonz.casas.cics@ust.edu.ph",
    "juanmarcus.ferrer.cics@ust.edu.ph",
  ]);
});

test("redirect CC deduplicates when EB and director share an address", () => {
  const cc = redirectPlacementCcEmails({
    committee: "Office of the Chief Relations Officer",
    positionTitle: "Executive Assistant to the CRO",
  });
  assert.equal(cc.length, 1);
  assert.equal(cc[0], "aldenalexander.olmedo.cics@ust.edu.ph");
});
