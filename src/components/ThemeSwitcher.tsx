import { useSyncExternalStore } from "react";
import { IconButton } from "./ui";

const subscribe = (notify: () => void) => {
  window.addEventListener("terriertray:theme-applied", notify);
  return () => window.removeEventListener("terriertray:theme-applied", notify);
};
const snapshot = () => document.documentElement.dataset.theme ?? "light";

/** Follows the system until clicked; then flips to an explicit light or dark choice. */
export function ThemeSwitcher() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "light");
  const next = theme === "dark" ? "light" : "dark";
  return <IconButton className="theme-control" icon={next === "dark" ? "moon" : "sun"} label={`Switch to ${next} theme`} onClick={() => window.dispatchEvent(new CustomEvent("terriertray:theme-change", { detail: next }))} />;
}
