import { test } from "node:test";
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
const origin = "http://127.0.0.1:3459";
test(
  "mobile and desktop: navigation, reload, theme, currencies, editable odometer and every screen",
  { timeout: 120000 },
  async () => {
    const server = spawn(process.execPath, [".next/standalone/server.js"], {
      env: { ...process.env, PORT: "3459", HOSTNAME: "127.0.0.1" },
      stdio: "ignore",
    });
    let browser,
      context,
      registered = false;
    const password = "CarvizoBrowser!2026";
    try {
      let ready = false;
      for (let i = 0; i < 100; i++) {
        try {
          if ((await fetch(origin)).ok) {
            ready = true;
            break;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 200));
      }
      assert.ok(ready);
      browser = await chromium.launch({
        headless: true,
        ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
          : {}),
        args: ["--no-sandbox"],
      });
      context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        serviceWorkers: "block",
      });
      const signup = await context.request.post(origin + "/api/auth/signup", {
        data: {
          name: "Navigateur",
          email: `browser-${randomUUID()}@example.test`,
          password,
        },
      });
      assert.equal(signup.status(), 201);
      registered = true;
      const vehicle = await context.request.post(origin + "/api/vehicles", {
        data: { make: "Toyota", model: "Yaris", currentKm: 25000 },
      });
      assert.equal(vehicle.status(), 201);
      const vehicleId = (await vehicle.json()).vehicle.id;
      for (const data of [
        {
          kind: "EXPENSE",
          title: "Facture EUR",
          amount: 12.34,
          currency: "EUR",
        },
        {
          kind: "EXPENSE",
          title: "Facture TND",
          amount: 12.345,
          currency: "TND",
        },
        { kind: "ODOMETER", title: "Relevé à modifier", mileage: 27000 },
        {
          kind: "OIL_CHANGE",
          title: "Vidange moteur",
          mileage: 25000,
          nextDueKm: 35000,
        },
      ]) {
        const r = await context.request.post(origin + "/api/entries", {
          data: { vehicleId, ...data },
        });
        assert.equal(r.status(), 201, await r.text());
      }
      const page = await context.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin + "/?tab=suivi");
      await page.getByRole("heading", { name: "Historique & suivi" }).waitFor();
      assert.equal(
        await page
          .locator(".bottom-nav")
          .getByRole("button", { name: /^Rappels/ })
          .count(),
        0,
      );
      await page.getByText("Facture TND", { exact: true }).first().waitFor();
      assert.match(await page.locator(".entries-panel").innerText(), /12,345/);
      assert.match(await page.locator(".entries-panel").innerText(), /12,34/);
      await page
        .getByRole("button", {
          name: "Modifier Relevé à modifier",
          exact: true,
        })
        .click();
      await page.locator("[role=dialog] input[name=mileage]").fill("28000");
      await page
        .locator("[role=dialog]")
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await page.locator("[role=dialog]").waitFor({ state: "hidden" });
      const result = await context.request.get(
        origin + "/api/vehicles/" + vehicleId,
      );
      assert.equal((await result.json()).vehicle.currentKm, 28000);
      await page
        .getByRole("button", {
          name: "Modifier Kilométrage initial",
          exact: true,
        })
        .click();
      await page.locator("[role=dialog] input[name=mileage]").fill("24000");
      await page
        .locator("[role=dialog]")
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await page.locator("[role=dialog]").waitFor({ state: "hidden" });
      await page.reload();
      await page.getByRole("heading", { name: "Historique & suivi" }).waitFor();
      await page
        .locator(".topbar")
        .getByRole("button", { name: "Voir les rappels" })
        .click();
      await page
        .getByRole("heading", { name: "Mes rappels", exact: true })
        .waitFor();
      await page.reload();
      await page
        .getByRole("heading", { name: "Mes rappels", exact: true })
        .waitFor();
      await page
        .locator(".bottom-nav")
        .getByRole("button", { name: "Profil", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Mon compte", exact: true })
        .waitFor();
      await page.emulateMedia({ colorScheme: "light" });
      await page.getByLabel("Thème").selectOption("system");
      await page.waitForFunction(
        () => document.documentElement.dataset.theme === "light",
      );
      await page.emulateMedia({ colorScheme: "dark" });
      await page.waitForFunction(
        () => document.documentElement.dataset.theme === "dark",
      );
      await page.getByLabel("Thème").selectOption("dark");
      assert.equal(
        await page.locator("html").getAttribute("data-theme"),
        "dark",
      );
      await page.reload();
      await page
        .getByRole("heading", { name: "Mon compte", exact: true })
        .waitFor();
      assert.equal(
        await page.locator("html").getAttribute("data-theme"),
        "dark",
      );
      await page.screenshot({
        path: "/tmp/carvizo-dark-mobile.png",
        fullPage: true,
      });
      await page.getByLabel("Devise préférée").selectOption("TND");
      await page.waitForFunction(async () => {
        const r = await fetch("/api/auth/me");
        return (await r.json()).user.currency === "TND";
      });
      for (const [currency, amount, title] of [
        ["TND", "1.234", "Saisie TND"],
        ["EUR", "1.23", "Saisie EUR"],
      ]) {
        await page.locator(".mobile-add").click();
        await page.getByLabel("Catégorie").selectOption("EXPENSE");
        await page.locator("[role=dialog] input[name=title]").fill(title);
        await page
          .locator("[role=dialog] select[name=currency]")
          .selectOption(currency);
        await page.locator("[role=dialog] input[name=amount]").fill(amount);
        await page
          .locator("[role=dialog]")
          .getByRole("button", { name: "Enregistrer", exact: true })
          .click();
        await page.locator("[role=dialog]").waitFor({ state: "hidden" });
      }
      const savedHistory = await context.request.get(
        origin + "/api/entries?vehicleId=" + vehicleId,
      );
      const savedEntries = (await savedHistory.json()).entries;
      assert.equal(
        savedEntries.find((e) => e.title === "Saisie TND").amountCents,
        1234,
      );
      assert.equal(
        savedEntries.find((e) => e.title === "Saisie TND").currency,
        "TND",
      );
      assert.equal(
        savedEntries.find((e) => e.title === "Saisie EUR").amountCents,
        123,
      );
      await page.setViewportSize({ width: 1440, height: 1000 });
      assert.equal(
        await page
          .locator(".sidebar")
          .getByRole("button", { name: /^Rappels/ })
          .isVisible(),
        true,
      );
      await page
        .locator(".sidebar")
        .getByRole("button", { name: "Mon garage", exact: true })
        .click();
      await page
        .locator(".sidebar")
        .getByRole("button", { name: "Historique", exact: true })
        .click();
      await page.goBack();
      await page
        .getByRole("heading", { name: "Mon garage", exact: true })
        .waitFor();
      await page.goForward();
      await page
        .getByRole("heading", { name: "Historique & suivi", exact: true })
        .waitFor();
      const screens = [
        ["Accueil", /Bonjour/],
        ["Mon garage", /^Mon garage$/],
        ["Historique", /^Historique & suivi$/],
        ["Vidange", /^Suivi des vidanges$/],
        ["Rappels", /^Mes rappels$/],
        ["Mon compte", /^Mon compte$/],
      ];
      for (const [name, heading] of screens) {
        await page
          .locator(".sidebar")
          .getByRole("button", {
            name: name === "Rappels" ? /^Rappels/ : name,
            exact: true,
          })
          .click();
        await page.getByRole("heading", { name: heading }).waitFor();
        await page.reload();
        await page.getByRole("heading", { name: heading }).waitFor();
        assert.equal(
          await page.locator("html").getAttribute("data-theme"),
          "dark",
        );
      }
      await page.screenshot({
        path: "/tmp/carvizo-dark-desktop.png",
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      for (const name of ["Accueil", "Garage", "Suivi", "Vidange", "Profil"]) {
        await page
          .locator(".bottom-nav")
          .getByRole("button", {
            name: name === "Rappels" ? /^Rappels/ : name,
            exact: true,
          })
          .click();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "horizontal overflow on " + name,
        );
      }
      assert.deepEqual(errors, []);
    } finally {
      if (registered && context)
        await context.request
          .delete(origin + "/api/profile", { data: { password } })
          .catch(() => {});
      await browser?.close();
      server.kill("SIGTERM");
    }
  },
);
