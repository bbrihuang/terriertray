import { useId, useSyncExternalStore } from "react";
import { IconButton } from "./ui";

const subscribe = (notify: () => void) => {
  window.addEventListener("terriertray:theme-applied", notify);
  return () => window.removeEventListener("terriertray:theme-applied", notify);
};
const snapshot = () => document.documentElement.dataset.theme ?? "light";
const preferenceSnapshot = () => document.documentElement.dataset.themePreference ?? "system";
type ThemePreference = "light" | "dark" | "system";
const chooseTheme = (preference: ThemePreference) => window.dispatchEvent(new CustomEvent("terriertray:theme-change", { detail: preference }));

/** Follows the system until clicked; then flips to an explicit light or dark choice. */
export function ThemeSwitcher() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "light");
  const next = theme === "dark" ? "light" : "dark";
  return <IconButton className="theme-control" icon={next === "dark" ? "moon" : "sun"} label={`Switch to ${next} theme`} onClick={() => chooseTheme(next)} />;
}

/** The stored preference is separate from the effective light/dark appearance. */
export function AppearanceControl() {
  const id = useId();
  const preference = useSyncExternalStore(subscribe, preferenceSnapshot, () => "system");
  return (
    <fieldset aria-describedby={`${id}-help`}>
      <legend className="sr-only">Appearance</legend>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {([["light", "Light"], ["dark", "Dark"], ["system", "System"]] as const).map(([value, label]) => (
          <label key={value} className="flex min-h-11 items-center gap-3">
            <input type="radio" name={`${id}-appearance`} value={value} checked={preference === value} onChange={() => chooseTheme(value)} className="size-5 shrink-0 accent-[var(--brand-ink)]" />
            {label}
          </label>
        ))}
      </div>
      <p id={`${id}-help`} className="mt-2 text-sm text-muted">System follows your device's light or dark appearance.</p>
    </fieldset>
  );
}
