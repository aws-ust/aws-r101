import assert from "node:assert/strict";
import test from "node:test";
import { app } from "./app";

process.env.CORS_ORIGIN = "http://localhost:3000";
process.env.JWT_SECRET = "trusted-origin-test-secret";

test("mutating requests without trusted Origin are rejected", async () => {
  const response = await app.request("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "a@b.com", password: "x" }),
  });
  assert.equal(response.status, 403);
});

test("mutating requests with matching Origin are allowed through origin gate", async () => {
  const response = await app.request("/auth/logout", {
    method: "POST",
    headers: { Origin: "http://localhost:3000" },
  });
  assert.equal(response.status, 204);
});

test("mutating requests with hostile Origin are rejected", async () => {
  const response = await app.request("/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Origin: "https://evil.example",
    },
    body: JSON.stringify({ email: "a@b.com", password: "x" }),
  });
  assert.equal(response.status, 403);
});
