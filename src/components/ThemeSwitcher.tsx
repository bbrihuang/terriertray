import { useSyncExternalStore } from "react";
import { Icon } from "./ui";

const subscribe = (notify: () => void) => {
  window.addEventListener("terriertray:theme-applied", notify);
  return () => window.removeEventListener("terriertray:theme-applied", notify);
};
const snapshot = () => document.documentElement.dataset.themePreference ?? "system";

export function ThemeSwitcher() {
  const preference = useSyncExternalStore(subscribe, snapshot, () => "system");
  return (
    <label className="theme-control">
      <Icon name="moon" className="size-[18px]" />
      <span className="sr-only">Color theme</span>
      <select value={preference} onChange={(event) => window.dispatchEvent(new CustomEvent("terriertray:theme-change", { detail: event.target.value }))}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
