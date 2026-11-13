"use client";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import type { Entry, EntryMeta, Vehicle, User, Notice, Kind } from "./types";
import type { Currency } from "@/lib/currency";
import { api, isProtectedOdometer } from "./helpers";
import { fuelConsumption } from "@/lib/metrics";
import { useLocationTab, useTheme } from "./use-preferences";
import { usePushNotifications } from "./use-push-notifications";
import { useDialogFocus } from "./use-dialog-focus";
export function useCarvizoController() {
  const [recovery, setRecovery] = useState(false),
    [recoveryCode, setRecoveryCode] = useState("");
  const [user, setUser] = useState<User | null>(null),
    [boot, setBoot] = useState(true),
    [authMode, setAuthMode] = useState<"login" | "signup">("signup"),
    [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState(""),
    [success, setSuccess] = useState("");
  const [entryMeta, setEntryMeta] = useState<EntryMeta>({
    nextCursor: null,
    totals: { spentCents: 0, monthlyCents: 0 },
    latestOil: null,
    fuelEntries: [],
    activePlans: [],
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]),
    [vehicleId, setVehicleId] = useState(""),
    [entries, setEntries] = useState<Entry[]>([]),
    [notices, setNotices] = useState<Notice[]>([]);
  const [tab, setTab] = useLocationTab();
  const [theme, setTheme] = useTheme();
  const [modal, setModal] = useState<"vehicle" | "entry" | null>(null),
    [kind, setKind] = useState<Kind>("MAINTENANCE"),
    [filter, setFilter] = useState<Kind | "TOUS">("TOUS"),
    [menu, setMenu] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null),
    [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const authOwner = useRef(user?.id);
  authOwner.current = user?.id;
  const requestVersion = useRef(0),
    activeVehicle = useRef(vehicleId);
  activeVehicle.current = vehicleId;
  const dialogRef = useDialogFocus(modal, setModal);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]),
    [uploading, setUploading] = useState(false);
  const switchVehicle = (id: string) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("vehicle", id);
    else url.searchParams.delete("vehicle");
    if (url.href !== window.location.href)
      window.history.pushState(null, "", url);
    requestVersion.current++;
    activeVehicle.current = id;
    setEntries([]);
    setEntryMeta({
      nextCursor: null,
      totals: { spentCents: 0, monthlyCents: 0 },
      latestOil: null,
      fuelEntries: [],
      activePlans: [],
    });
    setVehicleId(id);
  };
  const currency = user?.currency ?? "EUR";
  const selected = vehicles.find((v) => v.id === vehicleId) || vehicles[0];
  const electric =
    selected?.fuelType
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase() === "ELECTRIQUE";
  const clearMessages = () => {
    setErrorMessage("");
    setSuccess("");
  };
  const { pushEnabled, setPushEnabled, subscribe, unsubscribe } =
    usePushNotifications({
      userId: user?.id,
      clearMessages,
      setSuccess,
      setErrorMessage,
    });
  const loadVehicles = useCallback(async () => {
    const owner = authOwner.current;
    const d = await api<{ vehicles: Vehicle[] }>("/api/vehicles");
    if (owner !== authOwner.current) return;
    setVehicles(d.vehicles);
    setVehicleId((prev) => {
      const requested = new URLSearchParams(window.location.search).get(
        "vehicle",
      );
      return d.vehicles.some((v) => v.id === requested)
        ? requested!
        : d.vehicles.some((v) => v.id === prev)
          ? prev
          : d.vehicles[0]?.id || "";
    });
  }, []);
  useEffect(() => {
    const read = () => {
      const requested = new URLSearchParams(window.location.search).get(
          "vehicle",
        ),
        id = vehicles.some((v) => v.id === requested)
          ? requested!
          : vehicles[0]?.id || "";
      if (id !== activeVehicle.current) {
        requestVersion.current++;
        activeVehicle.current = id;
        setEntries([]);
        setEntryMeta({
          nextCursor: null,
          totals: { spentCents: 0, monthlyCents: 0 },
          latestOil: null,
          fuelEntries: [],
          activePlans: [],
        });
        setVehicleId(id);
      }
    };
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [vehicles]);
  const loadEntries = useCallback(async (id: string, cursor?: string) => {
    const version = ++requestVersion.current;
    if (!id) {
      setEntries([]);
      return;
    }
    const d = await api<EntryMeta & { entries: Entry[] }>(
      "/api/entries?vehicleId=" +
        encodeURIComponent(id) +
        (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
    );
    if (version === requestVersion.current && activeVehicle.current === id) {
      setEntries((prev) => (cursor ? [...prev, ...d.entries] : d.entries));
      setEntryMeta({
        nextCursor: d.nextCursor,
        totals: d.totals,
        latestOil: d.latestOil,
        fuelEntries: d.fuelEntries,
        activePlans: d.activePlans,
      });
    }
  }, []);
  const loadNotices = useCallback(async () => {
    const owner = authOwner.current;
    const d = await api<{ notifications: Notice[] }>("/api/notifications");
    if (owner === authOwner.current) setNotices(d.notifications);
  }, []);
  useEffect(() => {
    api<{ user: User }>("/api/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setBoot(false));
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => {
    if (user) {
      loadVehicles().catch((e) => setErrorMessage(e.message));
      loadNotices().catch(() => {});
    }
  }, [user, loadVehicles, loadNotices]);
  useEffect(() => {
    setEntries([]);
    setEntryMeta({
      nextCursor: null,
      totals: { spentCents: 0, monthlyCents: 0 },
      latestOil: null,
      fuelEntries: [],
      activePlans: [],
    });
    if (user)
      loadEntries(vehicleId).catch((e) => {
        if (activeVehicle.current === vehicleId) setErrorMessage(e.message);
      });
  }, [user, vehicleId, loadEntries]);
  const refresh = async () => {
    await Promise.all([loadVehicles(), loadEntries(vehicleId), loadNotices()]);
  };
  const spent = entryMeta.totals.spentCents,
    monthly = entryMeta.totals.monthlyCents;
  const consumption = useMemo(
    () =>
      fuelConsumption(
        [...entryMeta.fuelEntries]
          .sort(
            (a, b) =>
              new Date(a.occurredAt).getTime() -
              new Date(b.occurredAt).getTime(),
          )
          .map((e) => ({
            mileage: e.mileage,
            volumeMl: e.volumeMl,
            fullTank: e.fullTank,
          })),
      ),
    [entryMeta.fuelEntries],
  );
  const due = (e: Entry) =>
    Boolean(
      (e.nextDueKm !== null && selected && e.nextDueKm <= selected.currentKm) ||
      (e.nextDueAt &&
        e.nextDueAt.slice(0, 10) <= new Date().toISOString().slice(0, 10)),
    );
  const upcoming = [
    ...entryMeta.activePlans,
    ...(entryMeta.latestOil &&
    !entryMeta.activePlans.some((e) => e.id === entryMeta.latestOil?.id)
      ? [entryMeta.latestOil]
      : []),
  ]
    .filter(
      (e) =>
        (e.kind === "MAINTENANCE" || e.kind === "OIL_CHANGE") &&
        (e.nextDueAt || e.nextDueKm !== null),
    )
    .sort(
      (a, b) =>
        Number(due(b)) - Number(due(a)) ||
        (a.nextDueKm ?? Number.MAX_SAFE_INTEGER) -
          (b.nextDueKm ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, 4);
  const openEntry = (next: Kind) => {
    clearMessages();
    setEditingEntry(null);
    setPhotoFiles([]);
    setKind(next);
    setModal("entry");
  };
  const editEntry = (entry: Entry) => {
    clearMessages();
    setEditingEntry(entry);
    setKind(entry.kind);
    setPhotoFiles([]);
    setModal("entry");
  };
  const openVehicle = () => {
    setEditingVehicle(null);
    setModal("vehicle");
  };
  const submitAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearMessages();
    setBusy(true);
    const fd = new FormData(event.currentTarget);
    try {
      const d = await api<{ user: User; recoveryCode?: string }>(
        "/api/auth/" + authMode,
        {
          method: "POST",
          body: JSON.stringify({
            email: fd.get("email"),
            password: fd.get("password"),
            name: fd.get("name"),
          }),
        },
      );
      setUser(d.user);
      if (d.recoveryCode) setRecoveryCode(d.recoveryCode);
    } catch (e) {
      setErrorMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const submitVehicle = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearMessages();
    setBusy(true);
    const f = new FormData(event.currentTarget);
    const payload = {
      make: f.get("make"),
      model: f.get("model"),
      name: f.get("name"),
      year: f.get("year") ? Number(f.get("year")) : null,
      registration: f.get("registration"),
      fuelType: f.get("fuelType"),
      currentKm: Number(f.get("currentKm") || 0),
      frontPressureBar: f.get("frontPressureBar")
        ? Number(f.get("frontPressureBar"))
        : null,
      rearPressureBar: f.get("rearPressureBar")
        ? Number(f.get("rearPressureBar"))
        : null,
    };
    try {
      const result = await api<{ vehicle: Vehicle }>(
        editingVehicle ? "/api/vehicles/" + editingVehicle.id : "/api/vehicles",
        {
          method: editingVehicle ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      await loadVehicles();
      switchVehicle(result.vehicle.id);
      setModal(null);
      setTab("garage");
      setSuccess(
        editingVehicle ? "Véhicule modifié." : "Véhicule ajouté à ton garage.",
      );
    } catch (e) {
      setErrorMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const sendPhoto = async (file: File, id: string, eventId?: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("vehicleId", id);
    if (eventId) form.append("eventId", eventId);
    const response = await fetch("/api/photos", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Image non enregistrée");
  };
  const submitEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    clearMessages();
    setBusy(true);
    const f = new FormData(event.currentTarget),
      read = (key: string) => f.get(key)?.toString() || "";
    let notes = read("notes");
    if (kind === "TIRE" && (read("measuredFront") || read("measuredRear")))
      notes +=
        "\nPression mesurée — avant : " +
        (read("measuredFront") || "non mesurée") +
        " bar ; arrière : " +
        (read("measuredRear") || "non mesurée") +
        " bar";
    const payload = {
      vehicleId: selected.id,
      kind,
      currency: read("currency") || currency,
      title: read("title"),
      notes,
      occurredAt: new Date(read("occurredAt") + "T12:00:00").toISOString(),
      mileage: read("mileage") ? Number(read("mileage")) : null,
      amount: read("amount") ? Number(read("amount")) : null,
      liters: read("liters") ? Number(read("liters")) : null,
      fullTank: f.get("fullTank") === "on",
      status: read("status") || "RESOLVED",
      nextDueKm: read("nextDueKm")
        ? Number(read("nextDueKm"))
        : kind === "OIL_CHANGE"
          ? Number(read("mileage") || selected.currentKm) +
            Number(read("intervalKm") || 10000)
          : null,
      nextDueAt: read("nextDueAt")
        ? new Date(read("nextDueAt") + "T12:00:00").toISOString()
        : null,
    };
    try {
      const result = await api<{ entry: Entry }>(
        editingEntry ? "/api/entries/" + editingEntry.id : "/api/entries",
        {
          method: editingEntry ? "PATCH" : "POST",
          body: JSON.stringify(
            isProtectedOdometer(editingEntry)
              ? { mileage: payload.mileage, occurredAt: payload.occurredAt }
              : payload,
          ),
        },
      );
      let failed = 0;
      for (const file of photoFiles) {
        try {
          await sendPhoto(file, selected.id, result.entry.id);
        } catch {
          failed++;
        }
      }
      await refresh();
      setModal(null);
      setPhotoFiles([]);
      setSuccess(
        failed
          ? "Opération enregistrée, mais certaines photos n'ont pas été ajoutées."
          : "Opération enregistrée avec succès.",
      );
    } catch (e) {
      setErrorMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    authOwner.current = undefined;
    setNotices([]);
    setPushEnabled(false);
    setRecoveryCode("");
    setUser(null);
    switchVehicle("");
    setVehicles([]);
    setEntries([]);
    setTab("accueil");
    clearMessages();
  };
  const removeEntry = async (id: string) => {
    if (!window.confirm("Supprimer définitivement cette opération ?")) return;
    try {
      await api("/api/entries/" + id, { method: "DELETE" });
      await refresh();
      setSuccess("Opération supprimée.");
    } catch (e) {
      setErrorMessage((e as Error).message);
    }
  };
  const updateIssue = async (
    id: string,
    status: "OPEN" | "IN_PROGRESS" | "RESOLVED",
  ) => {
    try {
      await api("/api/entries/" + id, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await refresh();
    } catch (e) {
      setErrorMessage((e as Error).message);
    }
  };
  const deleteVehicle = async () => {
    if (
      !selected ||
      !window.confirm(
        "Supprimer ce véhicule et TOUT son historique, ses photos et ses dépenses ?",
      )
    )
      return;
    try {
      await api("/api/vehicles/" + selected.id, { method: "DELETE" });
      await loadVehicles();
      setEntries([]);
      setSuccess("Véhicule supprimé.");
    } catch (e) {
      setErrorMessage((e as Error).message);
    }
  };
  const deleteAccount = async () => {
    const password = window.prompt(
      "Pour supprimer définitivement le compte et toutes tes données, saisis ton mot de passe.",
    );
    if (!password) return;
    try {
      await api("/api/profile", {
        method: "DELETE",
        body: JSON.stringify({ password }),
      });
      authOwner.current = undefined;
      setNotices([]);
      setPushEnabled(false);
      setRecoveryCode("");
      setUser(null);
      switchVehicle("");
      setVehicles([]);
      setEntries([]);
    } catch (e) {
      setErrorMessage((e as Error).message);
    }
  };
  const markRead = async (id: string) => {
    try {
      await api("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ id }),
      });
      await loadNotices();
    } catch (e) {
      setErrorMessage((e as Error).message);
    }
  };
  const uploadVehiclePhoto = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!selected || !event.target.files?.[0]) return;
    setUploading(true);
    try {
      await sendPhoto(event.target.files[0], selected.id);
      const result = await api<{ vehicle: Vehicle }>(
        "/api/vehicles/" + selected.id,
      );
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === selected.id ? { ...v, photos: result.vehicle.photos } : v,
        ),
      );
      setSuccess("Photo du véhicule ajoutée.");
    } catch (e) {
      setErrorMessage((e as Error).message);
    } finally {
      setUploading(false);
    }
  };
  const updateCurrency = async (next: Currency) => {
    clearMessages();
    try {
      const result = await api<{ user: User }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ currency: next }),
      });
      setUser(result.user);
      setSuccess("Devise préférée enregistrée.");
    } catch (e) {
      setErrorMessage((e as Error).message);
    }
  };
  return {
    recovery,
    setRecovery,
    recoveryCode,
    setRecoveryCode,
    user,
    boot,
    authMode,
    setAuthMode,
    busy,
    errorMessage,
    setErrorMessage,
    success,
    setSuccess,
    entryMeta,
    vehicles,
    vehicleId,
    entries,
    notices,
    tab,
    setTab,
    modal,
    setModal,
    kind,
    setKind,
    filter,
    setFilter,
    menu,
    setMenu,
    editingEntry,
    editingVehicle,
    setEditingVehicle,
    dialogRef,
    setPhotoFiles,
    uploading,
    pushEnabled,
    switchVehicle,
    selected,
    electric,
    clearMessages,
    loadEntries,
    spent,
    monthly,
    consumption,
    due,
    upcoming,
    openEntry,
    editEntry,
    openVehicle,
    submitAuth,
    submitVehicle,
    submitEntry,
    logout,
    subscribe,
    unsubscribe,
    removeEntry,
    updateIssue,
    deleteVehicle,
    deleteAccount,
    markRead,
    uploadVehiclePhoto,
    currency,
    theme,
    setTheme,
    updateCurrency,
  };
}
export type CarvizoController = ReturnType<typeof useCarvizoController>;
