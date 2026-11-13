import { test } from "node:test";
import { strict as assert } from "node:assert";
import { entryMoney } from "../src/lib/entry-money.ts";
test("new money uses account default but explicit per-entry currency wins", () => {
  assert.deepEqual(entryMoney({ amount: 1.234 }, "TND"), {
    currency: "TND",
    amountCents: 1234,
  });
  assert.deepEqual(entryMoney({ amount: 1.23, currency: "EUR" }, "TND"), {
    currency: "EUR",
    amountCents: 123,
  });
});
test("money edits preserve historic currency, permit zero and clear amount", () => {
  assert.deepEqual(entryMoney({ amount: 1.23 }, "EUR"), {
    currency: "EUR",
    amountCents: 123,
  });
  assert.deepEqual(entryMoney({ amount: 0 }, "TND"), {
    currency: "TND",
    amountCents: 0,
  });
  assert.deepEqual(entryMoney({ amount: null }, "EUR"), {
    currency: "EUR",
    amountCents: null,
  });
  assert.deepEqual(entryMoney({ currency: "TND" }, "EUR"), { currency: "TND" });
});
test("money rejects unsupported currency, non-numeric and overflowing values", () => {
  for (const input of [
    { currency: "USD", amount: 2 },
    { amount: -1 },
    { amount: "1.23" },
    { amount: Infinity },
    { amount: 2147483.648, currency: "TND" },
  ])
    assert.ok("error" in entryMoney(input, "EUR"));
});
