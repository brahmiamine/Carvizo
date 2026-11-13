import test from "node:test";
import assert from "node:assert/strict";
import {
  isCurrency,
  currencyDigits,
  toMinor,
  fromMinor,
  formatMoney,
  decimalMoney,
} from "../src/lib/currency.ts";
test("EUR uses cents and TND uses millimes", () => {
  assert.equal(currencyDigits("EUR"), 2);
  assert.equal(currencyDigits("TND"), 3);
  assert.equal(toMinor(12.345, "TND"), 12345);
  assert.equal(toMinor(12.345, "EUR"), 1235);
  assert.equal(fromMinor(12345, "TND"), 12.345);
  assert.equal(fromMinor(12345, "EUR"), 123.45);
  assert.equal(decimalMoney(1000, "TND"), "1.000");
  assert.equal(decimalMoney(100, "EUR"), "1.00");
});
test("money conversion handles decimal rounding and database range", () => {
  assert.equal(toMinor(1.005, "EUR"), 101);
  assert.equal(toMinor(10.075, "EUR"), 1008);
  assert.equal(toMinor(1e-7, "TND"), 0);
  assert.equal(toMinor(1.0005, "TND"), 1001);
  for (const amount of [-1, NaN, Infinity, 2147483.648])
    assert.equal(toMinor(amount, "TND"), null);
  assert.equal(toMinor(2147483.647, "TND"), 2147483647);
});
test("formatting keeps currencies explicit and unsupported currency fails", () => {
  assert.match(formatMoney(12345, "TND"), /12,345\s+TND/);
  assert.match(formatMoney(12345, "EUR"), /123,45\s+EUR/);
  assert.equal(isCurrency("USD"), false);
  assert.equal(isCurrency("EUR"), true);
  assert.throws(() => toMinor(10, "USD"), RangeError);
});
