import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const bootstrap = () => readFileSync(new URL("../public/theme.js", import.meta.url), "utf8");
const KEY = "terriertray-theme";

function page({ saved, dark = false, blocked = false }: { saved?: string; dark?: boolean; blocked?: boolean } = {}) {
  const dom = new JSDOM('<html><head><meta name="theme-color"></head><body></body></html>', { url: "https://terriertray.test", runScripts: "outside-only" });
  const w = dom.window;
  const media = new w.EventTarget() as EventTarget & { matches: boolean };
  media.matches = dark;
  Object.defineProperty(w, "matchMedia", { value: () => media });
  if (saved !== undefined) w.localStorage.setItem(KEY, saved);
  if (blocked) Object.defineProperty(w, "localStorage", { get() { throw new Error("Storage blocked"); } });
  w.eval(bootstrap());
  const choose = (preference: string) => w.dispatchEvent(new w.CustomEvent("terriertray:theme-change", { detail: preference }));
  return { w, media, choose, root: w.document.documentElement, close: () => w.close() };
}

describe("theme initialization and preferences", () => {
  it("resolves System before React renders and follows OS changes", () => {
    const p = page({ dark: true });
    expect(p.root.dataset.theme).toBe("dark");
    expect(p.root.dataset.themePreference).toBe("system");
    expect(p.root.style.colorScheme).toBe("dark");
    expect(p.w.document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#171619");
    p.media.matches = false;
    p.media.dispatchEvent(new p.w.Event("change"));
    expect(p.root.dataset.theme).toBe("light");
    expect(p.w.localStorage.getItem(KEY)).toBeNull();
    p.close();
  });

  it("honors an explicit choice and stores only the nonpersonal preference", () => {
    const p = page({ saved: "light", dark: true });
    expect(p.root.dataset.theme).toBe("light");
    p.choose("dark");
    expect(p.root.dataset.theme).toBe("dark");
    expect(p.w.localStorage.getItem(KEY)).toBe("dark");
    expect(p.w.localStorage.length).toBe(1);
    p.media.matches = false;
    p.media.dispatchEvent(new p.w.Event("change"));
    expect(p.root.dataset.theme).toBe("dark");
    p.close();
  });

  it("returns to System without storing a redundant preference", () => {
    const p = page({ saved: "dark" });
    p.choose("system");
    expect(p.root.dataset.theme).toBe("light");
    expect(p.w.localStorage.getItem(KEY)).toBeNull();
    p.close();
  });

  it("handles blocked storage, corrupt values, and invalid requests", () => {
    const p = page({ blocked: true, dark: true });
    p.choose("light");
    expect(p.root.dataset.theme).toBe("light");
    p.choose("invalid");
    expect(p.root.dataset.themePreference).toBe("light");
    p.close();
    const q = page({ saved: "corrupt", dark: true });
    expect(q.root.dataset.themePreference).toBe("system");
    expect(q.root.dataset.theme).toBe("dark");
    q.close();
  });

  it("syncs another tab's choice and storage clearing", () => {
    const p = page({ saved: "light", dark: true });
    p.w.dispatchEvent(new p.w.StorageEvent("storage", { key: KEY, newValue: "dark" }));
    expect(p.root.dataset.theme).toBe("dark");
    expect(p.root.dataset.themePreference).toBe("dark");
    p.w.dispatchEvent(new p.w.StorageEvent("storage", { key: null }));
    expect(p.root.dataset.themePreference).toBe("system");
    p.close();
  });
});
