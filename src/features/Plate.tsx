import { formatAmount, isComplete, macroEnergyShares, totals, type Total, type TrayEntry } from "../lib/nutrition";
import type { MealTargets } from "../lib/planner";
import type { MenuItem } from "../lib/schema";
import { IconButton } from "../components/ui";

export const MAX_SERVINGS = 6;

const R = 54;
const CIRC = 2 * Math.PI * R;

/** The signature: planned calories as a pastel ring around the plate. Planned, never eaten. */
function PlateRing({ total, target }: { total: Total; target: number | null }) {
  const complete = isComplete(total);
  const share = target ? Math.min(1, total.value / target) : 0;
  const over = target !== null && total.value > target ? Math.round(total.value - target) : 0;
  const label =
    target === null
      ? `${complete ? "" : "At least "}${Math.round(total.value)} calories planned; no calorie target set`
      : `${complete ? "" : "At least "}${Math.round(total.value)} of ${target} calories planned`;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative aspect-square w-36 max-w-full shrink-0" role="img" aria-label={label}>
        <svg viewBox="0 0 128 128" className="size-full -rotate-90" aria-hidden="true">
          <defs>
            <linearGradient id="plate-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--blob-peach)" />
              <stop offset="0.5" stopColor="var(--blob-pink)" />
              <stop offset="1" stopColor="var(--blob-lavender)" />
            </linearGradient>
          </defs>
          <circle cx="64" cy="64" r={R} fill="none" stroke="var(--line)" strokeWidth="11" />
          {target !== null && (
            <circle
              className="ring-progress"
              cx="64"
              cy="64"
              r={R}
              fill="none"
              stroke="url(#plate-ring)"
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - share)}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden="true">
          {!complete && <span className="text-xs font-semibold text-muted">at least</span>}
          <span className="text-[2.125rem] leading-none font-semibold tracking-[-0.03em] tnum">{Math.round(total.value).toLocaleString("en-US")}</span>
          <span className="mt-0.5 text-xs font-semibold text-muted">kcal planned</span>
        </div>
      </div>
      <div className="min-w-0 text-sm">
        {target === null ? (
          <p className="text-muted">No calorie target set.</p>
        ) : (
          <p className="tnum">
            <span className="font-semibold">of {target.toLocaleString("en-US")} kcal</span>
            <span className="block text-muted">{over > 0 ? `${over} over this meal’s share` : `${Math.max(0, Math.round(target - total.value))} left in this meal’s share`}</span>
          </p>
        )}
        {!complete && <p className="mt-1 text-muted">Calories known for {total.known} of {total.entries} dishes.</p>}
      </div>
    </div>
  );
}

/** Big number, small unit, then the target in quiet type. */
function MacroCell({ label, total, target }: { label: string; total: Total; target: number | null }) {
  const complete = isComplete(total);
  return (
    <div className="rounded-[var(--radius-inner)] bg-sunken px-3 py-2.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="tnum">
        {!complete && <span className="text-xs font-semibold text-muted">at least </span>}
        <span className="text-xl font-semibold tracking-[-0.02em]">{formatAmount(total.value, "")}</span>
        <span className="text-sm text-muted"> g</span>
        {target !== null && <span className="block text-sm text-muted">of {formatAmount(target, " g")}</span>}
        {!complete && (
          <span className="block text-xs text-muted">
            known for {total.known} of {total.entries}
          </span>
        )}
      </dd>
    </div>
  );
}

/** Approximate energy split (4/4/9). Supplementary to the provider calorie totals. */
function PlateBar({ entries }: { entries: TrayEntry[] }) {
  const shares = macroEnergyShares(totals(entries));
  if (!shares) return null;
  const parts = [
    { key: "protein", label: "Protein", share: shares.protein, fill: "var(--ink)" },
    { key: "carbs", label: "Carbs", share: shares.carbs, fill: "var(--blob-lavender)" },
    { key: "fat", label: "Fat", share: shares.fat, fill: "var(--blob-peach)" },
  ];
  let x = 0;
  return (
    <figure className="mt-4">
      <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="h-2 w-full overflow-hidden rounded-full" aria-hidden="true">
        {parts.map((p) => {
          const rect = <rect key={p.key} x={x} y={0} width={p.share * 100} height={6} fill={p.fill} />;
          x += p.share * 100;
          return rect;
        })}
      </svg>
      <figcaption className="mt-1.5 flex flex-wrap gap-x-4 text-sm text-muted tnum">
        {parts.map((p) => (
          <span key={p.key}>
            {p.label} {Math.round(p.share * 100)}%
          </span>
        ))}
        <span>of energy from macros, approx.</span>
      </figcaption>
    </figure>
  );
}

type Props = {
  meal: string;
  entries: TrayEntry[];
  target: MealTargets | null;
  targetLabel: string | null;
  onServings: (id: string, servings: number) => void;
  onOpen: (item: MenuItem) => void;
};

export function Plate({ meal, entries, target, targetLabel, onServings, onOpen }: Props) {
  const sum = totals(entries);
  const announce =
    entries.length === 0
      ? `${meal} plate is empty`
      : `${meal} plate: ${entries.length} dishes, ${isComplete(sum.caloriesKcal) ? "" : "at least "}${Math.round(sum.caloriesKcal.value)} calories, ${Math.round(sum.proteinG.value)} grams protein`;

  return (
    <div className="glass p-5">
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <PlateRing total={sum.caloriesKcal} target={target?.caloriesKcal ?? null} />

      <dl className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(5.25rem,100%),1fr))] gap-2">
        <MacroCell label="Protein" total={sum.proteinG} target={target?.proteinG ?? null} />
        <MacroCell label="Carbs" total={sum.carbsG} target={target?.carbsG ?? null} />
        <MacroCell label="Fat" total={sum.fatG} target={target?.fatG ?? null} />
      </dl>

      {entries.length === 0 ? (
        <p className="mt-4 text-muted">Nothing on your {meal.toLowerCase()} plate yet. Use a suggested plate, or add dishes from the Menu tab.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-t border-line">
          {entries.map(({ item, servings }) => (
            <li key={item.id} className="fade-in flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold tnum">
                  {servings} × {item.servingText ?? "serving"}
                </p>
                <button type="button" onClick={() => onOpen(item)} className="text-left break-words underline decoration-control/50 underline-offset-4 hover:decoration-current">
                  {item.name}
                </button>
                <p className="text-sm text-muted tnum">
                  {item.station ?? "Station not listed"} · {item.caloriesKcal === null ? "calories unknown" : formatAmount(item.caloriesKcal * servings, " kcal")}
                </p>
              </div>
              <div className="flex items-center gap-1.5" role="group" aria-label={`Servings of ${item.name}`}>
                <IconButton label={servings === 1 ? `Remove ${item.name}` : `One less serving of ${item.name}`} icon={servings === 1 ? "close" : "minus"} onClick={() => onServings(item.id, servings - 1)} />
                <IconButton label={`One more serving of ${item.name}`} icon="plus" disabled={servings >= MAX_SERVINGS} onClick={() => onServings(item.id, servings + 1)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {entries.length > 0 && (
        <>
          <dl className="mt-1 flex flex-wrap gap-x-6 border-t border-line pt-3 text-sm tnum">
            {(
              [
                ["Fiber", sum.fiberG, " g"],
                ["Sodium", sum.sodiumMg, " mg"],
              ] as const
            ).map(([label, t, unit]) => (
              <div key={label} className="flex gap-1.5">
                <dt className="text-muted">{label}</dt>
                <dd className="font-semibold">
                  {isComplete(t) ? "" : "at least "}
                  {formatAmount(t.value, unit)}
                </dd>
              </div>
            ))}
          </dl>
          <PlateBar entries={entries} />
          {targetLabel && <p className="mt-3 text-sm text-muted">Planned, not eaten. Targets are {targetLabel}.</p>}
        </>
      )}
    </div>
  );
}
