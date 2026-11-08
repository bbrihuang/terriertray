import { useEffect, useState } from "react";
import { DayMenu, MenuIndex } from "./lib/schema";

export type Load<T> = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; data: T };

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** Small index first; revalidate on tab return. Day files still load lazily. */
export function useMenuIndex(): Load<MenuIndex> {
  const [load, setLoad] = useState<Load<MenuIndex>>({ state: "loading" });
  useEffect(() => {
    let live = true;
    let pending = false;
    const fail = (message: string) => {
      if (live) setLoad((current) => current.state === "ready" ? current : { state: "error", message });
    };
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const json = await getJson(`/menus/index.json?t=${Math.floor(Date.now() / 60_000)}`);
        const parsed = MenuIndex.safeParse(json);
        if (!live) return;
        if (parsed.success) setLoad({ state: "ready", data: parsed.data });
        else fail("The menu index has an unexpected format.");
      } catch {
        fail("Menus could not be loaded. Check your connection and reload.");
      } finally {
        pending = false;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    void refresh();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onVisibility);
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
  const requestKey = JSON.stringify([version, key]);
  const [batch, setBatch] = useState<{ requestKey: string; loads: Record<string, Load<DayMenu>> }>({ requestKey, loads: {} });
  useEffect(() => {
    if (!key || !version) {
      setBatch({ requestKey, loads: {} });
      return;
    }
    let live = true;
    const list = key.split("|");
    setBatch({ requestKey, loads: Object.fromEntries(list.map((f) => [f, { state: "loading" } as const])) });
    for (const file of list) {
      loadDay(file, version)
        .then((data) => live && setBatch((current) => current.requestKey !== requestKey ? current : {
          requestKey, loads: { ...current.loads, [file]: { state: "ready", data } },
        }))
        .catch((err) => live && setBatch((current) => current.requestKey !== requestKey ? current : {
          requestKey, loads: { ...current.loads, [file]: { state: "error", message: failure(err) } },
        }));
    }
    return () => {
      live = false;
    };
  }, [key, version, requestKey]);
  // The index can change before this effect runs, even when file paths stay the same.
  return batch.requestKey === requestKey ? batch.loads : {};
}
