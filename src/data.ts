import { useEffect, useState } from "react";
import { DayMenu, MenuIndex } from "./lib/schema";

export type Load<T> = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; data: T };

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** Small index first; day files load lazily. Only public menu files are ever requested. */
export function useMenuIndex(): Load<MenuIndex> {
  const [load, setLoad] = useState<Load<MenuIndex>>({ state: "loading" });
  useEffect(() => {
    let live = true;
    getJson(`/menus/index.json?t=${Math.floor(Date.now() / 60_000)}`)
      .then((json) => {
        const parsed = MenuIndex.safeParse(json);
        if (!live) return;
        setLoad(parsed.success ? { state: "ready", data: parsed.data } : { state: "error", message: "The menu index has an unexpected format." });
      })
      .catch(() => live && setLoad({ state: "error", message: "Menus could not be loaded. Check your connection and reload." }));
    return () => {
      live = false;
    };
  }, []);
  return load;
}

/** Current time, refreshed every minute and when the tab becomes visible, so freshness re-ages in open tabs. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs]);
  return now;
}

const dayCache = new Map<string, DayMenu>();

export function useDayMenu(file: string | null, version: string | null): Load<DayMenu> | null {
  const key = file && version ? `${file}?v=${version}` : null;
  const [load, setLoad] = useState<Load<DayMenu> | null>(null);
  useEffect(() => {
    if (!key) {
      setLoad(null);
      return;
    }
    const cached = dayCache.get(key);
    if (cached) {
      setLoad({ state: "ready", data: cached });
      return;
    }
    let live = true;
    setLoad({ state: "loading" });
    getJson(`/menus/${key}`)
      .then((json) => {
        const parsed = DayMenu.safeParse(json);
        if (!live) return;
        if (parsed.success) {
          dayCache.set(key, parsed.data);
          setLoad({ state: "ready", data: parsed.data });
        } else setLoad({ state: "error", message: "This day's menu file has an unexpected format." });
      })
      .catch(() => live && setLoad({ state: "error", message: "This day's menu could not be loaded." }));
    return () => {
      live = false;
    };
  }, [key]);
  return load;
}
