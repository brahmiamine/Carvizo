import { test } from "node:test";
import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const origin = "http://127.0.0.1:3457";
const password = "CarvizoIntegration!2026";
const database = new URL(process.env.DATABASE_URL);
const db = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: database.hostname,
    port: Number(database.port || 3306),
    user: decodeURIComponent(database.username),
    password: decodeURIComponent(database.password),
    database: database.pathname.slice(1),
    connectionLimit: 3,
  }),
});

test(
  "API: oil, reminders, corrections, concurrent mileage and complete paginated history",
  { timeout: 120000 },
  async () => {
    let logs = "",
      cookie = "",
      userId,
      vehicleId;
    const server = spawn(process.execPath, [".next/standalone/server.js"], {
      env: {
        ...process.env,
        PORT: "3457",
        HOSTNAME: "127.0.0.1",
        NODE_ENV: "production",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout.on("data", (d) => (logs += d.toString()));
    server.stderr.on("data", (d) => (logs += d.toString()));
    async function request(path, { method = "GET", body, status = 200 } = {}) {
      const response = await fetch(origin + path, {
        method,
        headers: {
          Cookie: cookie,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        assert.fail(
          `${method} ${path}: HTTP ${response.status} ${text}\n${logs.slice(-3500)}`,
        );
      }
      assert.equal(
        response.status,
        status,
        `${method} ${path}: ${JSON.stringify(data)}\n${logs.slice(-1500)}`,
      );
      return data;
    }
    const entry = (body) =>
      request("/api/entries", {
        method: "POST",
        body: { vehicleId, ...body },
        status: 201,
      });
    const vehicle = () => request(`/api/vehicles/${vehicleId}`);
    const history = (params = "") =>
      request(`/api/entries?vehicleId=${vehicleId}${params}`);
    const patch = (id, body) =>
      request(`/api/entries/${id}`, { method: "PATCH", body });
    try {
      let ready = false;
      for (let i = 0; i < 100; i++) {
        try {
          if ((await fetch(origin + "/")).ok) {
            ready = true;
            break;
          }
        } catch {}
        if (server.exitCode !== null) break;
        await new Promise((r) => setTimeout(r, 200));
      }
      assert.ok(ready, logs.slice(-2000));
      const signup = await fetch(origin + "/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "API fixture",
          email: `api-${randomUUID()}@example.test`,
          password,
        }),
      });
      const account = await signup.json();
      assert.equal(signup.status, 201, JSON.stringify(account));
      cookie = signup.headers.get("set-cookie").split(";")[0];
      userId = account.user.id;
      vehicleId = (
        await request("/api/vehicles", {
          method: "POST",
          body: {
            make: "Toyota",
            model: "Yaris",
            currentKm: 20000,
            year: 2020,
          },
          status: 201,
        })
      ).vehicle.id;
      const baseline = (await history()).entries.find((e) =>
        e.notes?.startsWith("[carvizo:baseline]"),
      );
      assert.ok(baseline);
      const correctedBaseline = await patch(baseline.id, {
        mileage: 19500,
        occurredAt: "2025-12-01T12:00:00Z",
      });
      assert.equal(correctedBaseline.entry.mileage, 19500);
      assert.equal(
        correctedBaseline.entry.occurredAt,
        "2025-12-01T12:00:00.000Z",
      );
      assert.ok(correctedBaseline.entry.notes.startsWith("[carvizo:baseline]"));
      assert.match(correctedBaseline.entry.notes, /Modification du relevé/);
      assert.equal((await vehicle()).vehicle.currentKm, 19500);
      await request(`/api/entries/${baseline.id}`, {
        method: "PATCH",
        body: { mileage: 19000, notes: "remove marker" },
        status: 400,
      });
      await request(`/api/entries/${baseline.id}`, {
        method: "PATCH",
        body: { kind: "EXPENSE" },
        status: 400,
      });
      await patch(baseline.id, { mileage: 20000 });
      const oil = (
        await entry({
          kind: "OIL_CHANGE",
          title: "Vidange moteur",
          mileage: 20000,
          occurredAt: "2026-01-10T12:00:00Z",
          amount: 75,
        })
      ).entry;
      assert.equal(oil.nextDueKm, 30000);
      assert.equal(oil.nextDueAt, "2027-01-10T12:00:00.000Z");
      const custom = (
        await entry({
          kind: "OIL_CHANGE",
          title: "Vidange spéciale",
          mileage: 20000,
          occurredAt: "2026-02-10T12:00:00Z",
          nextDueKm: 24000,
          nextDueAt: "2027-02-10T12:00:00Z",
        })
      ).entry;
      assert.equal(custom.nextDueKm, 24000);
      assert.equal((await history()).latestOil.id, custom.id);
      const ordinaryReading = (
        await entry({
          kind: "ODOMETER",
          title: "Compteur proche vidange",
          mileage: 23500,
        })
      ).entry;
      await patch(ordinaryReading.id, {
        mileage: 23000,
        occurredAt: "2026-03-01T12:00:00Z",
      });
      assert.equal(
        (await vehicle()).vehicle.currentKm,
        23000,
        "ordinary odometer readings must also be editable",
      );
      const notices = await request("/api/notifications");
      assert.ok(
        notices.notifications.some((n) => n.title.includes("Vidange bientôt")),
        "mileage update must immediately create oil reminder",
      );
      await Promise.all(
        [28000, 27000, 26000, 29000].map((mileage) =>
          entry({ kind: "EXPENSE", title: `Lecture ${mileage}`, mileage }),
        ),
      );
      assert.equal(
        (await vehicle()).vehicle.currentKm,
        29000,
        "parallel stale writes cannot decrease mileage",
      );
      await request(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        body: {
          currentKm: 21000,
          make: "Toyota",
          model: "Yaris II",
          year: 2021,
          fuelType: "HYBRIDE",
          frontPressureBar: 2.3,
        },
      });
      assert.equal((await vehicle()).vehicle.currentKm, 21000);
      assert.ok(
        (await history()).entries.some((e) =>
          e.notes?.startsWith("[carvizo:odometer-correction]"),
        ),
        "correction must leave an audit entry",
      );
      const correction = (await history()).entries.find((e) =>
        e.notes?.startsWith("[carvizo:odometer-correction]"),
      );
      await patch(correction.id, {
        mileage: 20500,
        occurredAt: "2026-03-01T12:00:00Z",
      });
      assert.equal(
        (await vehicle()).vehicle.currentKm,
        20500,
        "edited correction must retain its authoritative baseline",
      );
      await patch(correction.id, { mileage: 21000 });
      const persistedCorrection = (await history()).entries.find(
        (e) => e.id === correction.id,
      );
      assert.equal(persistedCorrection.mileage, 21000);
      assert.match(persistedCorrection.notes, /20500/);
      const spike = (
        await entry({
          kind: "EXPENSE",
          title: "Erreur de compteur",
          mileage: 90000,
          amount: 50,
        })
      ).entry;
      await patch(spike.id, {
        mileage: 22000,
        occurredAt: "2026-03-10T12:00:00Z",
        amount: 25,
        nextDueKm: 23000,
        nextDueAt: "2027-01-01T12:00:00Z",
      });
      assert.equal((await vehicle()).vehicle.currentKm, 22000);
      await request(`/api/entries/${spike.id}`, { method: "DELETE" });
      assert.equal(
        (await vehicle()).vehicle.currentKm,
        21000,
        "delete restores explicit corrected baseline",
      );
      const plan = (
        await entry({
          kind: "MAINTENANCE",
          title: "Courroie",
          status: "OPEN",
          mileage: 40000,
          nextDueKm: 21200,
          amount: 500,
        })
      ).entry;
      assert.equal(
        (await vehicle()).vehicle.currentKm,
        21000,
        "planned mileage must not move actual counter",
      );
      assert.ok((await history()).activePlans.some((e) => e.id === plan.id));
      await patch(plan.id, {
        status: "IN_PROGRESS",
        nextDueKm: 45000,
        nextDueAt: "2028-01-01T12:00:00Z",
      });
      assert.equal(
        (await history()).activePlans.find((e) => e.id === plan.id).status,
        "IN_PROGRESS",
      );
      await entry({
        kind: "MAINTENANCE",
        title: "Courroie",
        status: "RESOLVED",
        mileage: 21000,
      });
      assert.ok(
        !(await history()).activePlans.some((e) => e.id === plan.id),
        "completed matching work closes superseded plan",
      );
      const completed = (
        await entry({
          kind: "MAINTENANCE",
          title: "Entretien terminé sans rappel",
          status: "RESOLVED",
          nextDueKm: 21001,
        })
      ).entry;
      assert.ok(
        !(await history()).activePlans.some((e) => e.id === completed.id),
        "completed generic services are not active reminders",
      );
      const fuel1 = (
        await entry({
          kind: "FUEL",
          title: "Plein complet",
          mileage: 21000,
          liters: 40,
          fullTank: true,
          occurredAt: "2026-10-01T12:00:00Z",
        })
      ).entry;
      await patch(fuel1.id, { status: "RESOLVED", liters: 41.5, amount: 68 });
      await entry({
        kind: "FUEL",
        title: "Deuxième plein",
        mileage: 21500,
        liters: 35,
        fullTank: true,
        occurredAt: "2026-10-15T12:00:00Z",
      });
      const month = new Date();
      month.setUTCDate(10);
      month.setUTCHours(12, 0, 0, 0);
      await db.vehicleEvent.createMany({
        data: Array.from({ length: 510 }, (_, i) => ({
          vehicleId,
          kind: "EXPENSE",
          title: `Archive ${i}`,
          amountCents: 100,
          occurredAt: month,
        })),
      });
      const expected = await db.vehicleEvent.count({ where: { vehicleId } }),
        sum = await db.vehicleEvent.aggregate({
          where: { vehicleId },
          _sum: { amountCents: true },
        });
      let page = await history(),
        ids = new Set(page.entries.map((e) => e.id));
      assert.equal(page.entries.length, 100);
      assert.equal(page.hasMore, true);
      assert.equal(page.totals.spentCents, sum._sum.amountCents);
      assert.ok(page.totals.monthlyCents >= 51000);
      assert.equal(page.latestOil.id, custom.id);
      assert.equal(page.fuelEntries.length, 2);
      while (page.hasMore) {
        page = await history(`&cursor=${page.nextCursor}`);
        for (const e of page.entries) {
          assert.ok(!ids.has(e.id), "pagination repeated a row");
          ids.add(e.id);
        }
      }
      assert.equal(
        ids.size,
        expected,
        "pagination must include history beyond 500 records",
      );
      await request(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        body: { currentKm: 10.5 },
        status: 400,
      });
      await patch(custom.id, { nextDueKm: null, nextDueAt: null });
      assert.equal((await history()).latestOil.nextDueKm, null);
      const eur = (
        await entry({
          kind: "EXPENSE",
          title: "EUR précis",
          amount: 1.23,
          currency: "EUR",
        })
      ).entry;
      const tnd = (
        await entry({
          kind: "EXPENSE",
          title: "TND précis",
          amount: 1.234,
          currency: "TND",
        })
      ).entry;
      assert.equal(eur.amountCents, 123);
      assert.equal(eur.currency, "EUR");
      assert.equal(tnd.amountCents, 1234);
      assert.equal(tnd.currency, "TND");
      await request("/api/profile", {
        method: "PATCH",
        body: { currency: "TND" },
      });
      const newDefault = (
        await entry({ kind: "EXPENSE", title: "Préférence TND", amount: 1.234 })
      ).entry;
      assert.equal(newDefault.currency, "TND");
      assert.equal(newDefault.amountCents, 1234);
      const editedEUR = await patch(eur.id, { amount: 2.34 });
      assert.equal(editedEUR.entry.currency, "EUR");
      assert.equal(
        editedEUR.entry.amountCents,
        234,
        "editing must use the record's currency, not the new preference",
      );
      const editedTND = await patch(tnd.id, { amount: 2.345, currency: "TND" });
      assert.equal(editedTND.entry.amountCents, 2345);
      await request(`/api/entries/${eur.id}`, {
        method: "PATCH",
        body: { currency: "TND" },
        status: 400,
      });
      const unchanged = await db.vehicleEvent.findUnique({
        where: { id: eur.id },
      });
      assert.equal(unchanged.currency, "EUR");
      assert.equal(unchanged.amountCents, 234);
      const mixed = await history();
      assert.equal(mixed.totalsByCurrency.TND.spentCents, 3579);
      const euroTotal = await db.vehicleEvent.aggregate({
        where: { vehicleId, currency: "EUR" },
        _sum: { amountCents: true },
      });
      assert.equal(
        mixed.totalsByCurrency.EUR.spentCents,
        euroTotal._sum.amountCents,
      );
      assert.equal(
        mixed.totals.spentCents,
        3579,
        "legacy total stays in preferred currency without summing currencies",
      );
      assert.deepEqual(mixed.totals.byCurrency, mixed.totalsByCurrency);
      await request("/api/profile", {
        method: "PATCH",
        body: { currency: "EUR" },
      });
      assert.equal(
        (await history()).totalsByCurrency.TND.spentCents,
        3579,
        "changing preference must never reinterpret historic money",
      );
    } finally {
      if (userId) await db.user.deleteMany({ where: { id: userId } });
      await db.$disconnect();
      server.kill("SIGTERM");
    }
  },
);
