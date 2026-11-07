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

const dayCache = new Map<string, Promise<DayMenu>>();

/** Fetch and validate one published day file; cached per data version, failures are not cached. */
export function loadDay(file: string, version: string): Promise<DayMenu> {
  const key = `${file}?v=${version}`;
  let pending = dayCache.get(key);
  if (!pending) {
    pending = getJson(`/menus/${key}`).then((json) => {
      const parsed = DayMenu.safeParse(json);
      if (!parsed.success) throw new Error("format");
      return parsed.data;
    });
    pending.catch(() => dayCache.delete(key));
    dayCache.set(key, pending);
  }
  return pending;
}

const failure = (err: unknown) =>
  err instanceof Error && err.message === "format" ? "This day's menu file has an unexpected format." : "This day's menu could not be loaded.";

export function useDayMenu(file: string | null, version: string | null): Load<DayMenu> | null {
  const loads = useDayMenus(file ? [file] : [], version);
  return file ? (loads[file] ?? { state: "loading" }) : null;
}

/** Several day files at once (the week view). Keys are the file paths. */
export function useDayMenus(files: string[], version: string | null): Record<string, Load<DayMenu>> {
  const key = version ? files.join("|") : "";
  const [loads, setLoads] = useState<Record<string, Load<DayMenu>>>({});
  useEffect(() => {
    if (!key || !version) {
      setLoads({});
      return;
    }
    let live = true;
    const list = key.split("|");
    setLoads(Object.fromEntries(list.map((f) => [f, { state: "loading" } as const])));
    for (const file of list) {
      loadDay(file, version)
        .then((data) => live && setLoads((l) => ({ ...l, [file]: { state: "ready", data } })))
        .catch((err) => live && setLoads((l) => ({ ...l, [file]: { state: "error", message: failure(err) } })));
    }
    return () => {
      live = false;
    };
  }, [key, version]);
  return loads;
}
