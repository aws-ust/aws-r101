import assert from "node:assert/strict";
import test from "node:test";
import { lookupOfficerRecipient } from "./officer-recipients";

test("officer recipient lookup uses first-choice committee names from seeds", () => {
  const ceo = lookupOfficerRecipient("Office of the Chief Executive Officer");
  assert.ok(ceo);
  assert.equal(ceo.lastName, "Padua");
  assert.equal(ceo.email, "sydneyalison.padua.cics@ust.edu.ph");

  const logistics = lookupOfficerRecipient("Logistics Committee");
  assert.ok(logistics);
  assert.equal(logistics.lastName, "Ladia");
  assert.equal(logistics.email, "jarenmaxene.ladia@ust.edu.ph");

  assert.equal(lookupOfficerRecipient("Unknown Committee"), null);
});
