// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { Settings } from "./features/Settings";
import { DEFAULT_PROFILE } from "./lib/profile-storage";
import bootstrap from "../public/theme.js?raw";

const themeKey = "terriertray-theme";
const media = Object.assign(new EventTarget(), { matches: false });

beforeAll(() => {
  vi.stubGlobal("matchMedia", () => media);
  window.eval(bootstrap);
});

beforeEach(() => {
  window.localStorage.clear();
  media.matches = false;
  window.dispatchEvent(new StorageEvent("storage", { key: null }));
});

afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());

function settings() {
  const onChange = vi.fn();
  const onRemember = vi.fn();
  const onDeleteSaved = vi.fn();
  render(<><ThemeSwitcher /><Settings profile={DEFAULT_PROFILE} onChange={onChange} remember={false} onRemember={onRemember} onDeleteSaved={onDeleteSaved} /></>);
  return { onChange, onRemember, onDeleteSaved };
}

function selected(name: string) {
  return screen.getByRole<HTMLInputElement>("radio", { name }).checked;
}

describe("appearance controls", () => {
  it("exposes System as the selected preference even when the OS applies dark", () => {
    media.matches = true;
    media.dispatchEvent(new Event("change"));
    settings();
    expect(screen.getByRole("group", { name: "Appearance" })).toBeTruthy();
    expect(selected("System")).toBe(true);
    expect(selected("Light")).toBe(false);
    expect(selected("Dark")).toBe(false);
    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeTruthy();
  });

  it("applies explicit choices and returns to OS following without saving a profile", () => {
    const callbacks = settings();
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(selected("Dark")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(themeKey)).toBe("dark");

    fireEvent.click(screen.getByRole("radio", { name: "Light" }));
    expect(selected("Light")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem(themeKey)).toBe("light");
    act(() => {
      media.matches = true;
      media.dispatchEvent(new Event("change"));
    });
    expect(document.documentElement.dataset.theme).toBe("light");

    fireEvent.click(screen.getByRole("radio", { name: "System" }));
    expect(selected("System")).toBe(true);
    expect(window.localStorage.getItem(themeKey)).toBeNull();
    expect(document.documentElement.dataset.theme).toBe("dark");
    act(() => {
      media.matches = false;
      media.dispatchEvent(new Event("change"));
    });
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(selected("System")).toBe(true);
    expect(window.localStorage.length).toBe(0);
    expect(callbacks.onChange).not.toHaveBeenCalled();
    expect(callbacks.onRemember).not.toHaveBeenCalled();
    expect(callbacks.onDeleteSaved).not.toHaveBeenCalled();
  });

  it("keeps the header toggle labelled with its next action and synchronizes Settings", () => {
    settings();
    fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(selected("Dark")).toBe(true);
    expect(window.localStorage.getItem(themeKey)).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: "Switch to light theme" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(selected("Light")).toBe(true);
    expect(window.localStorage.getItem(themeKey)).toBe("light");
  });

  it("synchronizes both controls after an external preference change or storage clearing", () => {
    settings();
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: themeKey, newValue: "dark" }));
    });
    expect(selected("Dark")).toBe(true);
    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeTruthy();
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });
    expect(selected("System")).toBe(true);
    expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeTruthy();
  });
});
