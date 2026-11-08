import { useId, useSyncExternalStore, type MouseEvent } from "react";
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
  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // The icon spins in as it swaps; the new theme spreads out in a circle from the button.
    button.querySelector("svg")?.animate?.(
      [{ transform: "rotate(-150deg) scale(.3)", opacity: 0 }, { transform: "rotate(0) scale(1)", opacity: 1 }],
      { duration: still ? 0 : 560, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
    );
    const { left, top, width, height } = button.getBoundingClientRect();
    const root = document.documentElement;
    root.style.setProperty("--theme-x", `${left + width / 2}px`);
    root.style.setProperty("--theme-y", `${top + height / 2}px`);
    if (!still && document.startViewTransition) document.startViewTransition(() => chooseTheme(next));
    else chooseTheme(next);
  };
  return <IconButton className="theme-control" icon={next === "dark" ? "moon" : "sun"} label={`Switch to ${next} theme`} onClick={toggle} />;
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
