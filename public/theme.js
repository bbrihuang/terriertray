/* Resolve appearance before the app and styles paint. No personal profile data is read. */
(() => {
  const key = "terriertray-theme";
  const root = document.documentElement;
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  const valid = (value) => ["light", "dark", "system"].includes(value);
  let preference = "system";
  try {
    const saved = window.localStorage.getItem(key);
    if (valid(saved)) preference = saved;
  } catch { /* Appearance still works when browser storage is unavailable. */ }

  function apply() {
    const theme = preference === "system" ? (media?.matches ? "dark" : "light") : preference;
    root.classList.add("theme-changing");
    root.dataset.themePreference = preference;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#171619" : "#f7f7f9");
    window.dispatchEvent(new Event("terriertray:theme-applied"));
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => root.classList.remove("theme-changing")));
    } else root.classList.remove("theme-changing");
  }

  window.addEventListener("terriertray:theme-change", (event) => {
    if (!valid(event.detail)) return;
    preference = event.detail;
    try {
      if (preference === "system") window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, preference);
    } catch { /* Keep the in-memory choice for this page. */ }
    apply();
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== key && event.key !== null) return;
    preference = valid(event.newValue) ? event.newValue : "system";
    apply();
  });
  media?.addEventListener?.("change", () => { if (preference === "system") apply(); });
  apply();
})();
