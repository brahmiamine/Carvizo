import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  mileageFromHistory,
  BASELINE_NOTE,
  CORRECTION_NOTE,
} from "../src/lib/vehicle-events.ts";
const reading = (
  mileage: number,
  createdAt: string,
  notes: string | null = null,
) => ({
  mileage,
  createdAt: new Date(createdAt),
  occurredAt: new Date(createdAt),
  notes,
  kind: "ODOMETER",
});
test("history retains initial mileage after the last high reading is deleted", () => {
  assert.equal(
    mileageFromHistory([
      reading(12000, "2026-01-01", BASELINE_NOTE),
      reading(15000, "2026-02-01"),
    ]),
    15000,
  );
  assert.equal(
    mileageFromHistory([reading(12000, "2026-01-01", BASELINE_NOTE)]),
    12000,
  );
});
test("an explicit lower correction starts a new odometer baseline", () => {
  const before = [
    reading(12000, "2026-01-01", BASELINE_NOTE),
    reading(99000, "2026-02-01"),
  ];
  const correction = reading(13000, "2026-03-01", CORRECTION_NOTE);
  assert.equal(mileageFromHistory([...before, correction]), 13000);
  assert.equal(
    mileageFromHistory([...before, correction, reading(14000, "2026-04-01")]),
    14000,
  );
});
