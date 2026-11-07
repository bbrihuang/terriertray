import { useId, useMemo, useState } from "react";
import { formatAmount } from "../lib/nutrition";
import { allergenHeadline, allergyAnswered, checkRestrictions, type Restrictions } from "../lib/restrictions";
import type { MenuItem } from "../lib/schema";
import { Icon, IconButton, Notice } from "../components/ui";

type Props = {
  items: MenuItem[];
  restrictions: Restrictions;
  onPlate: Set<string>;
  onAdd: (item: MenuItem) => void;
  onOpen: (item: MenuItem) => void;
};

export function MenuList({ items, restrictions, onPlate, onAdd, onOpen }: Props) {
  const [query, setQuery] = useState("");
  const [station, setStation] = useState("");
  const [onlyFits, setOnlyFits] = useState(false);
  const ids = useId();

  const stations = useMemo(() => [...new Set(items.map((i) => i.station ?? "Other"))].sort(), [items]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .map((item) => ({ item, verdict: checkRestrictions(item, restrictions) }))
      .filter(({ item, verdict }) => {
        if (station && (item.station ?? "Other") !== station) return false;
        if (onlyFits && !verdict.allowed) return false;
        return !q || item.name.toLowerCase().includes(q) || (item.description ?? "").toLowerCase().includes(q);
      });
  }, [items, restrictions, query, station, onlyFits]);

  const hidden = items.length - rows.length;
  const answered = allergyAnswered(restrictions);

  return (
    <div>
      {!answered && (
        <div className="mb-4">
          <Notice tone="warn" title="Set your allergies to add dishes">
            You can browse everything, but adding and suggestions stay off until you answer the allergy question in Settings, even if the answer is “none”.
          </Notice>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor={`${ids}-q`} className="block font-semibold">
            Search this meal
          </label>
          <input
            id={`${ids}-q`}
            type="search"
            name="dish-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. chicken, tofu, rice…"
            autoComplete="off"
            className="mt-1 min-h-11 w-full rounded-lg border border-control bg-surface px-3 text-ink placeholder:text-muted"
          />
        </div>
        <div>
          <label htmlFor={`${ids}-s`} className="block font-semibold">
            Station
          </label>
          <select id={`${ids}-s`} value={station} onChange={(e) => setStation(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-control bg-surface px-3 text-ink">
            <option value="">All stations</option>
            {stations.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <label className="mt-3 flex min-h-11 items-center gap-3">
        <input type="checkbox" checked={onlyFits} onChange={(e) => setOnlyFits(e.target.checked)} className="size-5 accent-[var(--brand-ink)]" />
        Show only dishes that fit my restrictions
      </label>

      <p className="mt-2 text-sm text-muted" aria-live="polite">
        {rows.length} of {items.length} dishes shown{hidden > 0 && onlyFits ? `, ${hidden} hidden` : ""}
      </p>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-xl border border-line bg-surface p-4">No dishes match. Try a shorter search or another station.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
          {rows.map(({ item, verdict }) => {
            const added = onPlate.has(item.id);
            return (
              <li key={item.id} className="flex items-start gap-3 p-4 [contain-intrinsic-size:auto_6rem] [content-visibility:auto]">
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => onOpen(item)} className="text-left font-semibold break-words underline decoration-line underline-offset-4 hover:decoration-current">
                    {item.name}
                  </button>
                  <p className="text-sm text-muted tnum">
                    {item.station ?? "Other"} · {item.servingText ?? "serving not listed"} ·{" "}
                    {item.caloriesKcal === null ? "no nutrition label" : `${formatAmount(item.caloriesKcal, " kcal")}, ${item.proteinG === null ? "protein unknown" : `${formatAmount(item.proteinG, " g")} protein`}`}
                  </p>
                  {!answered && verdict.reasons.length === 1 ? (
                    <p className="mt-1 text-sm text-muted">Allergies not set</p>
                  ) : (
                    <p className={`mt-1 flex items-center gap-1.5 text-sm ${verdict.allowed ? "text-muted" : "font-semibold text-danger"}`}>
                      {!verdict.allowed && <Icon name="alert" className="size-4 shrink-0" />}
                      {verdict.allowed ? allergenHeadline(verdict, restrictions) : verdict.reasons[0]}
                    </p>
                  )}
                </div>
                <IconButton
                  label={added ? `${item.name} is on your plate; add another serving` : verdict.allowed ? `Add ${item.name} to plate` : `${item.name} doesn't fit your restrictions`}
                  icon="plus"
                  disabled={!verdict.allowed}
                  onClick={() => onAdd(item)}
                  className={added ? "border-brand bg-brand-soft" : ""}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
