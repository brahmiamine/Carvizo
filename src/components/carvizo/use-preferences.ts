"use client";
import { useCallback, useEffect, useState } from "react";
import type { Tab } from "./types";
const tabs: Tab[] = [
  "accueil",
  "garage",
  "suivi",
  "vidange",
  "rappels",
  "profil",
];
export function useLocationTab() {
  const [tab, updateTab] = useState<Tab>("accueil");
  useEffect(() => {
    const read = () => {
      const value = new URLSearchParams(window.location.search).get(
        "tab",
      ) as Tab;
      updateTab(tabs.includes(value) ? value : "accueil");
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  const setTab = useCallback((next: Tab) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    if (url.href !== window.location.href)
      window.history.pushState(null, "", url);
    updateTab(next);
  }, []);
  return [tab, setTab] as const;
}
export type Theme = "light" | "dark" | "system";
export function useTheme() {
  const [theme, setValue] = useState<Theme>("system");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let saved: Theme = "system";
    try {
      const value = localStorage.getItem("carvizo-theme");
      if (value === "light" || value === "dark") saved = value;
    } catch {}
    setValue(saved);
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.style.colorScheme =
        document.documentElement.dataset.theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, ready]);
  const setTheme = (next: Theme) => {
    setValue(next);
    try {
      localStorage.setItem("carvizo-theme", next);
    } catch {}
  };
  return [theme, setTheme] as const;
}
