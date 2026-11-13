import test from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
  newRecoveryCode,
  recoveryHash,
} from "../src/lib/password.ts";
import { allowAttempt } from "../src/lib/rate-limit.ts";
import { validPushEndpoint, validPushKey } from "../src/lib/push-validation.ts";
import { csvCell, escapeHtml } from "../src/lib/export.ts";
test("async password hashes verify and reject malformed records", async () => {
  const hash = await hashPassword("a long secure password");
  assert.equal(await verifyPassword("a long secure password", hash), true);
  assert.equal(await verifyPassword("wrong password", hash), false);
  assert.equal(await verifyPassword("password", "scrypt$bad$bad"), false);
  assert.notEqual(hash, await hashPassword("a long secure password"));
});
test("recovery codes have 192 bits and normalize grouping", () => {
  const code = newRecoveryCode();
  assert.match(code, /^([a-f0-9]{8}-){5}[a-f0-9]{8}$/);
  assert.equal(
    recoveryHash(code),
    recoveryHash(code.replaceAll("-", "").toUpperCase()),
  );
  assert.notEqual(recoveryHash(code), recoveryHash(newRecoveryCode()));
});
test("rate limits deny excess attempts and expire", () => {
  assert.equal(allowAttempt("test", 2, 100, 1000), true);
  assert.equal(allowAttempt("test", 2, 100, 1001), true);
  assert.equal(allowAttempt("test", 2, 100, 1002), false);
  assert.equal(allowAttempt("test", 2, 100, 1100), true);
});
test("push endpoints reject internal hosts and lookalike providers", () => {
  for (const endpoint of [
    "https://localhost/a",
    "https://127.0.0.1/a",
    "https://fcm.googleapis.com.evil.com/a",
    "http://fcm.googleapis.com/a",
    "https://fcm.googleapis.com:8443/a",
    "https://u:p@fcm.googleapis.com/a",
  ])
    assert.equal(validPushEndpoint(endpoint), false);
  assert.equal(
    validPushEndpoint("https://fcm.googleapis.com/fcm/send/token"),
    true,
  );
  assert.equal(
    validPushEndpoint("https://updates.push.services.mozilla.com/wpush/token"),
    true,
  );
  assert.equal(validPushKey(Buffer.alloc(65).toString("base64url"), 65), true);
  assert.equal(validPushKey("", 65), false);
});
test("exports escape spreadsheet formulas and HTML", () => {
  assert.equal(csvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
  assert.equal(escapeHtml('<script>"&'), "&lt;script&gt;&quot;&amp;");
});
