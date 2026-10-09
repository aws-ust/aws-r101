import assert from "node:assert/strict";
import test from "node:test";
import { assertDeployableSiteUrl, isLoopbackUrl } from "./site-url";

test("a real website address can be deployed", () => {
  assert.equal(assertDeployableSiteUrl("https://aws-ust.org"), "https://aws-ust.org");
  assert.equal(assertDeployableSiteUrl("https://www.aws-ust.org/"), "https://www.aws-ust.org/");
});

test("an address that only works on one machine cannot be deployed", () => {
  for (const address of [
    "http://localhost:3000",
    "https://localhost",
    "http://127.0.0.1:3000",
    "http://0.0.0.0:3000",
    "http://[::1]:3000",
  ]) {
    assert.throws(() => assertDeployableSiteUrl(address), /every email link would point at localhost/, address);
  }
});

test("something that is not a website address cannot be deployed", () => {
  assert.throws(() => assertDeployableSiteUrl(""), /not a valid URL/);
  assert.throws(() => assertDeployableSiteUrl("aws-ust.org"), /not a valid URL/);
  assert.throws(() => assertDeployableSiteUrl("ftp://aws-ust.org"), /must start with https/);
});

test("loopback addresses are recognised, other hosts are not", () => {
  assert.equal(isLoopbackUrl("http://localhost:3000"), true);
  assert.equal(isLoopbackUrl("https://aws-ust.org"), false);
  assert.equal(isLoopbackUrl("not a url"), false);
});
