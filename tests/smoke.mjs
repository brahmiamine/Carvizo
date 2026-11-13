import { test } from "node:test";
import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const origin = "http://127.0.0.1:3456";
async function request(
  path,
  { method = "GET", cookie = "", body, form, headers = {} } = {},
) {
  const options = { method, headers: { ...headers }, redirect: "manual" };
  if (cookie) options.headers.Cookie = cookie;
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  if (form) options.body = form;
  const response = await fetch(origin + path, options);
  let data;
  try {
    data = await response.clone().json();
  } catch {
    data = { text: await response.text() };
  }
  return { response, data };
}
test("Parcours public : compte, véhicules, incidents, photos privées, rappels", async () => {
  let logs = "";
  const server = spawn(process.execPath, [".next/standalone/server.js"], {
    env: {
      ...process.env,
      PORT: "3456",
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (d) => (logs += d.toString().slice(0, 2000)));
  server.stderr.on("data", (d) => (logs += d.toString().slice(0, 2000)));
  try {
    let ready = false;
    for (let i = 0; i < 75; i++) {
      try {
        const r = await fetch(origin + "/");
        if (r.status === 200) {
          ready = true;
          break;
        }
      } catch {}
      if (server.exitCode !== null) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    assert.ok(ready, "Next.js ne démarre pas : " + logs.slice(-1500));
    for (const path of [
      "/icon",
      "/icon-192",
      "/apple-icon",
      "/badge",
      "/splash",
    ]) {
      const image = await fetch(origin + path);
      assert.equal(image.status, 200, "Échec génération de " + path);
      assert.ok(
        (image.headers.get("content-type") || "").startsWith("image/png"),
        "Type d’image invalide : " + path,
      );
    }
    const emailA = "a-" + randomUUID() + "@example.test";
    const a = await request("/api/auth/signup", {
      method: "POST",
      body: { name: "Alice", email: emailA, password: "MotDePasseLong!2026" },
    });
    assert.equal(a.response.status, 201, JSON.stringify(a.data));
    const cookieA = a.response.headers.get("set-cookie")?.split(";")[0] || "";
    assert.ok(
      cookieA.startsWith("carvizo_session="),
      "cookie de session absent",
    );
    assert.equal(a.data.user.currency, "EUR");
    assert.match(a.data.recoveryCode, /^([a-f0-9]{8}-){5}[a-f0-9]{8}$/);
    const missing = await request("/api/vehicles");
    assert.equal(missing.response.status, 401);
    const vehicle = await request("/api/vehicles", {
      method: "POST",
      cookie: cookieA,
      body: {
        make: "Skoda",
        model: "Fabia",
        year: 2018,
        currentKm: 25000,
        frontPressureBar: 2.2,
        rearPressureBar: 2.1,
      },
    });
    assert.equal(vehicle.response.status, 201, JSON.stringify(vehicle.data));
    const vehicleId = vehicle.data.vehicle.id;
    const negative = await request("/api/entries", {
      method: "POST",
      cookie: cookieA,
      body: { vehicleId, kind: "ODOMETER", title: "Compteur", mileage: 24999 },
    });
    assert.equal(negative.response.status, 400);
    const issue = await request("/api/entries", {
      method: "POST",
      cookie: cookieA,
      body: {
        vehicleId,
        kind: "ISSUE",
        title: "Rayure sur portière",
        status: "OPEN",
        notes: "À réparer",
        mileage: 25000,
      },
    });
    assert.equal(issue.response.status, 201, JSON.stringify(issue.data));
    const issueId = issue.data.entry.id;
    const form = new FormData();
    form.set("vehicleId", vehicleId);
    form.set("eventId", issueId);
    form.set(
      "file",
      new Blob(
        [
          Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP+J5sVRAAAAABJRU5ErkJggg==",
            "base64",
          ),
        ],
        { type: "image/png" },
      ),
      "rayure.png",
    );
    const photo = await request("/api/photos", {
      method: "POST",
      cookie: cookieA,
      form,
    });
    assert.equal(photo.response.status, 201, JSON.stringify(photo.data));
    const photoId = photo.data.photo.id;
    const invoiceForm = new FormData();
    invoiceForm.set("vehicleId", vehicleId);
    invoiceForm.set("eventId", issueId);
    invoiceForm.set(
      "file",
      new Blob(["%PDF-1.7\n%%EOF"], { type: "application/pdf" }),
      "facture.pdf",
    );
    const invoice = await request("/api/photos", {
      method: "POST",
      cookie: cookieA,
      form: invoiceForm,
    });
    assert.equal(invoice.response.status, 201, JSON.stringify(invoice.data));
    const ownInvoice = await request("/api/photos/" + invoice.data.photo.id, {
      cookie: cookieA,
    });
    assert.equal(ownInvoice.response.status, 200);
    assert.equal(
      ownInvoice.response.headers.get("content-type"),
      "application/pdf",
    );
    assert.match(
      ownInvoice.response.headers.get("content-disposition"),
      /attachment/,
    );

    const vehicleImage = new FormData();
    vehicleImage.set("vehicleId", vehicleId);
    vehicleImage.set(
      "file",
      new Blob(
        [
          Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP+J5sVRAAAAABJRU5ErkJggg==",
            "base64",
          ),
        ],
        { type: "image/png" },
      ),
      "voiture.png",
    );
    const garagePhoto = await request("/api/photos", {
      method: "POST",
      cookie: cookieA,
      form: vehicleImage,
    });
    assert.equal(
      garagePhoto.response.status,
      201,
      JSON.stringify(garagePhoto.data),
    );
    const garage = await request("/api/vehicles", { cookie: cookieA });
    assert.equal(
      garage.data.vehicles.find((v) => v.id === vehicleId).photos?.[0]?.id,
      garagePhoto.data.photo.id,
      "photo principale perdue après rechargement du garage",
    );
    const ownPhoto = await request("/api/photos/" + photoId, {
      cookie: cookieA,
    });
    assert.equal(ownPhoto.response.status, 200);
    const emailB = "b-" + randomUUID() + "@example.test";
    const b = await request("/api/auth/signup", {
      method: "POST",
      body: { name: "Bob", email: emailB, password: "MotDePasseLong!2026" },
    });
    assert.equal(b.response.status, 201, JSON.stringify(b.data));
    const cookieB = b.response.headers.get("set-cookie")?.split(";")[0] || "";
    assert.equal(
      (await request("/api/vehicles/" + vehicleId, { cookie: cookieB }))
        .response.status,
      404,
    );
    assert.equal(
      (await request("/api/photos/" + photoId, { cookie: cookieB })).response
        .status,
      404,
    );
    assert.equal(
      (
        await request("/api/photos/" + invoice.data.photo.id, {
          cookie: cookieB,
        })
      ).response.status,
      404,
    );
    const patched = await request("/api/entries/" + issueId, {
      method: "PATCH",
      cookie: cookieA,
      body: { status: "IN_PROGRESS" },
    });
    assert.equal(patched.response.status, 200, JSON.stringify(patched.data));
    assert.equal(patched.data.entry.status, "IN_PROGRESS");
    const service = await request("/api/entries", {
      method: "POST",
      cookie: cookieA,
      body: {
        vehicleId,
        kind: "MAINTENANCE",
        title: "Vidange",
        status: "OPEN",
        mileage: 25000,
        nextDueKm: 25200,
      },
    });
    assert.equal(service.response.status, 201, JSON.stringify(service.data));
    const cron = await request("/api/jobs/reminders", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.CRON_SECRET },
    });
    assert.equal(cron.response.status, 200, JSON.stringify(cron.data));
    const alerts = await request("/api/notifications", { cookie: cookieA });
    assert.equal(alerts.response.status, 200, JSON.stringify(alerts.data));
    assert.ok(
      alerts.data.notifications.some((n) => n.title.includes("Vidange")),
      "rappel de vidange manquant",
    );
    const entries = await request("/api/entries?vehicleId=" + vehicleId, {
      cookie: cookieA,
    });
    assert.equal(entries.response.status, 200);
    assert.ok(entries.data.entries.length >= 2);
    const euro = await request("/api/entries", {
      method: "POST",
      cookie: cookieA,
      body: {
        vehicleId,
        kind: "EXPENSE",
        title: "Euro historique",
        amount: 12.34,
      },
    });
    assert.equal(euro.response.status, 201, JSON.stringify(euro.data));
    assert.equal(euro.data.entry.currency, "EUR");
    assert.equal(euro.data.entry.amountCents, 1234);
    assert.equal(
      (
        await request("/api/profile", {
          method: "PATCH",
          body: { currency: "TND" },
        })
      ).response.status,
      401,
    );
    assert.equal(
      (
        await request("/api/profile", {
          method: "PATCH",
          cookie: cookieA,
          body: { currency: "USD" },
        })
      ).response.status,
      400,
    );
    const preference = await request("/api/profile", {
      method: "PATCH",
      cookie: cookieA,
      body: { currency: "TND" },
    });
    assert.equal(
      preference.response.status,
      200,
      JSON.stringify(preference.data),
    );
    assert.equal(preference.data.user.currency, "TND");
    assert.equal(
      (await request("/api/auth/me", { cookie: cookieA })).data.user.currency,
      "TND",
    );
    const dinar = await request("/api/entries", {
      method: "POST",
      cookie: cookieA,
      body: {
        vehicleId,
        kind: "EXPENSE",
        title: "Dinar millimes",
        amount: 12.345,
      },
    });
    assert.equal(dinar.response.status, 201, JSON.stringify(dinar.data));
    assert.equal(dinar.data.entry.currency, "TND");
    assert.equal(dinar.data.entry.amountCents, 12345);
    const explicitEuro = await request("/api/entries", {
      method: "POST",
      cookie: cookieA,
      body: {
        vehicleId,
        kind: "EXPENSE",
        title: "Euro explicite",
        amount: 1.01,
        currency: "EUR",
      },
    });
    assert.equal(
      explicitEuro.response.status,
      201,
      JSON.stringify(explicitEuro.data),
    );
    assert.equal(explicitEuro.data.entry.amountCents, 101);
    const renamed = await request("/api/entries/" + euro.data.entry.id, {
      method: "PATCH",
      cookie: cookieA,
      body: { title: "Euro historique conservé" },
    });
    assert.equal(renamed.response.status, 200, JSON.stringify(renamed.data));
    assert.equal(renamed.data.entry.currency, "EUR");
    assert.equal(renamed.data.entry.amountCents, 1234);
    const relabel = await request("/api/entries/" + euro.data.entry.id, {
      method: "PATCH",
      cookie: cookieA,
      body: { currency: "TND" },
    });
    assert.equal(
      relabel.response.status,
      400,
      "currency-only edit reinterpreted history",
    );
    const malformedAmount = await request(
      "/api/entries/" + euro.data.entry.id,
      { method: "PATCH", cookie: cookieA, body: { amount: "12.34" } },
    );
    assert.equal(malformedAmount.response.status, 400);
    const unsupported = await request("/api/entries", {
      method: "POST",
      cookie: cookieA,
      body: {
        vehicleId,
        kind: "EXPENSE",
        title: "Devise invalide",
        amount: 10,
        currency: "USD",
      },
    });
    assert.equal(unsupported.response.status, 400);
    const exportData = await request("/api/profile", { cookie: cookieA });
    const history = exportData.data.vehicles.find(
      (v) => v.id === vehicleId,
    ).events;
    assert.equal(
      history.find((e) => e.id === euro.data.entry.id).currency,
      "EUR",
    );
    assert.equal(
      history.find((e) => e.id === dinar.data.entry.id).amountCents,
      12345,
    );
    assert.equal(
      (await request("/api/profile?format=csv")).response.status,
      401,
    );
    for (const format of ["csv", "print"]) {
      const exported = await request("/api/profile?format=" + format, {
        cookie: cookieA,
      });
      assert.equal(exported.response.status, 200);
      assert.ok(exported.data.text.includes("Vidange"));
      for (const expected of ["12.345", "TND", "12.34", "EUR"])
        assert.ok(
          exported.data.text.includes(expected),
          "export missing " + expected,
        );
    }
    const unsafePush = await request("/api/push", {
      method: "POST",
      cookie: cookieA,
      body: {
        endpoint: "https://127.0.0.1/admin",
        keys: { p256dh: "invalid", auth: "invalid" },
      },
    });
    assert.equal(unsafePush.response.status, 400);
    const publicPush = await request("/api/push");
    assert.equal(publicPush.response.status, 200);
    assert.equal(typeof publicPush.data.enabled, "boolean");
    const resetBody = {
      email: emailA,
      password: "NewPasswordForRecovery!2026",
    };
    const invalidReset = await request("/api/auth/reset-password", {
      method: "POST",
      body: { ...resetBody, recoveryCode: "wrong" },
    });
    assert.equal(invalidReset.response.status, 401);
    assert.equal(
      (await request("/api/auth/me", { cookie: cookieA })).response.status,
      200,
    );
    const reset = await request("/api/auth/reset-password", {
      method: "POST",
      body: { ...resetBody, recoveryCode: a.data.recoveryCode },
    });
    assert.equal(reset.response.status, 200, JSON.stringify(reset.data));
    assert.notEqual(reset.data.recoveryCode, a.data.recoveryCode);
    const resetCookie =
      reset.response.headers.get("set-cookie")?.split(";")[0] || "";
    assert.equal(
      (await request("/api/auth/me", { cookie: cookieA })).response.status,
      401,
      "old session survived recovery",
    );
    const reused = await request("/api/auth/reset-password", {
      method: "POST",
      body: { ...resetBody, recoveryCode: a.data.recoveryCode },
    });
    assert.equal(reused.response.status, 401, "recovery code was reusable");
    const oldLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: emailA, password: "MotDePasseLong!2026" },
    });
    assert.equal(oldLogin.response.status, 401);
    const login = await request("/api/auth/login", {
      method: "POST",
      body: resetBody,
    });
    assert.equal(login.response.status, 200);
    const loginCookie =
      login.response.headers.get("set-cookie")?.split(";")[0] || "";
    const newPassword = "ChangedPasswordForAccount!2026";
    const changed = await request("/api/auth/change-password", {
      method: "POST",
      cookie: resetCookie,
      body: { currentPassword: resetBody.password, password: newPassword },
    });
    assert.equal(changed.response.status, 200, JSON.stringify(changed.data));
    const changedCookie =
      changed.response.headers.get("set-cookie")?.split(";")[0] || "";
    for (const cookie of [resetCookie, loginCookie])
      assert.equal(
        (await request("/api/auth/me", { cookie })).response.status,
        401,
        "old session survived password change",
      );
    assert.equal(
      (await request("/api/auth/me", { cookie: changedCookie })).response
        .status,
      200,
    );
    const regenerated = await request("/api/auth/recovery-code", {
      method: "POST",
      cookie: changedCookie,
      body: { password: newPassword },
    });
    assert.equal(
      regenerated.response.status,
      200,
      JSON.stringify(regenerated.data),
    );
    assert.notEqual(regenerated.data.recoveryCode, reset.data.recoveryCode);
    assert.equal(
      (
        await request("/api/profile", {
          method: "DELETE",
          cookie: changedCookie,
          body: { password: newPassword },
        })
      ).response.status,
      200,
    );
    assert.equal(
      (
        await request("/api/profile", {
          method: "DELETE",
          cookie: cookieB,
          body: { password: "MotDePasseLong!2026" },
        })
      ).response.status,
      200,
    );
  } finally {
    server.kill("SIGTERM");
  }
});
