import { Icon, type IconName } from "../components/ui";
import { formatAmount } from "../lib/nutrition";
import type { Meal } from "../lib/schema";
import { formatHours } from "../lib/time";

const ICONS: Record<string, IconName> = { Breakfast: "sunrise", Brunch: "cup", Lunch: "sun", Dinner: "moon" };

export type PlannedSummary = { dishes: number; kcal: number; complete: boolean };

type Props = {
  meals: Meal[];
  selected: Meal | null;
  /** Index of the meal being served now, or null. */
  liveIndex: number | null;
  /** Index of the next meal today, or null. */
  nextIndex: number | null;
  planned: (meal: Meal) => PlannedSummary;
  onSelect: (meal: Meal) => void;
};

/** The day's meals as a timeline: what's served when, and what you've planned for each. */
export function MealTimeline({ meals, selected, liveIndex, nextIndex, planned, onSelect }: Props) {
  return (
    <div className="glass overflow-hidden p-1.5" role="group" aria-label="Meal">
      <ul className="divide-y divide-line">
        {meals.map((m, i) => {
          const on = m === selected;
          const p = planned(m);
          const status = i === liveIndex ? "Serving now" : i === nextIndex ? "Next" : null;
          return (
            <li key={m.name}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onSelect(m)}
                className={`press flex min-h-16 w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius-inner)] px-3 py-2.5 text-left ${on ? "bg-brand-soft" : "hover:bg-sunken"}`}
              >
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${on ? "bg-action text-on-action" : "bg-sunken text-ink"}`}>
                  <Icon name={ICONS[m.name] ?? "sun"} />
                </span>
                <span className="min-w-[min(9rem,100%)] flex-1">
                  <span className="flex flex-wrap items-center gap-x-2">
                    <span className="font-semibold">{m.name}</span>
                    {status && <span className="text-sm font-semibold text-brand-ink">· {status}</span>}
                  </span>
                  <span className="block text-sm text-muted tnum">
                    {p.dishes === 0
                      ? "Nothing planned yet"
                      : `${p.dishes} ${p.dishes === 1 ? "dish" : "dishes"} planned · ${p.complete ? "" : "at least "}${formatAmount(p.kcal, " kcal")}`}
                  </span>
                </span>
                <span className="ml-auto text-right text-sm text-muted tnum">{formatHours(m.hours) ?? "Hours not listed"}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
