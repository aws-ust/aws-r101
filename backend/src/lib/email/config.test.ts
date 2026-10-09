import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { appBaseUrl } from "./config";

const keys = ["APP_BASE_URL", "CORS_ORIGIN", "AWS_LAMBDA_FUNCTION_NAME"] as const;
const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

function setEnvironment(values: Partial<Record<(typeof keys)[number], string>>) {
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, values);
}

test("email links use the configured website address", () => {
  setEnvironment({ APP_BASE_URL: "https://aws-ust.org/" });
  assert.equal(appBaseUrl(), "https://aws-ust.org");
});

test("the site's CORS origin stands in when APP_BASE_URL is not set", () => {
  setEnvironment({ CORS_ORIGIN: "https://aws-ust.org" });
  assert.equal(appBaseUrl(), "https://aws-ust.org");
});

test("a local run falls back to localhost", () => {
  setEnvironment({});
  assert.equal(appBaseUrl(), "http://localhost:3000");
});

test("a deployed function never sends links to localhost", () => {
  setEnvironment({ AWS_LAMBDA_FUNCTION_NAME: "ApiFunction" });
  assert.throws(() => appBaseUrl(), /APP_BASE_URL is not set/);
});
