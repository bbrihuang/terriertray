import { formatAmount, isComplete, macroEnergyShares, totals, type Total, type TrayEntry } from "../lib/nutrition";
import type { MealTargets } from "../lib/planner";
import type { MenuItem } from "../lib/schema";
import { IconButton } from "../components/ui";

export const MAX_SERVINGS = 6;

function TotalRow({ label, total, target, unit }: { label: string; total: Total; target: number | null; unit: string }) {
  const complete = isComplete(total);
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt>{label}</dt>
      <dd className="text-right tnum">
        <span className="font-bold">
          {complete ? "" : "at least "}
          {formatAmount(total.value, unit)}
        </span>
        {target !== null && <span className="text-muted"> / {formatAmount(target, unit)} target</span>}
        {!complete && (
          <span className="block text-sm text-muted">
            known for {total.known} of {total.entries} dishes
          </span>
        )}
      </dd>
    </div>
  );
}

/** Approximate energy split (4/4/9). Supplementary to the provider calorie totals above. */
function PlateBar({ entries }: { entries: TrayEntry[] }) {
  const shares = macroEnergyShares(totals(entries));
  if (!shares) return null;
  const parts = [
    { key: "protein", label: "Protein", share: shares.protein, fill: "var(--ink)" },
    { key: "carbs", label: "Carbs", share: shares.carbs, fill: "var(--brand)" },
    { key: "fat", label: "Fat", share: shares.fat, fill: "var(--muted)" },
  ];
  let x = 0;
  return (
    <figure className="mt-3">
      <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="h-3 w-full overflow-hidden rounded-full" aria-hidden="true">
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
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      {entries.length === 0 ? (
        <p className="text-muted">Nothing on your {meal.toLowerCase()} plate yet. Use a suggested plate below, or add dishes from the Menu tab.</p>
      ) : (
        <ul className="divide-y divide-line">
          {entries.map(({ item, servings }) => (
            <li key={item.id} className="fade-in flex items-center gap-3 py-3 first:pt-0">
              <div className="min-w-0 flex-1">
                <p className="font-bold tnum">
                  {servings} × {item.servingText ?? "serving"}
                </p>
                <button type="button" onClick={() => onOpen(item)} className="text-left break-words underline decoration-line underline-offset-4 hover:decoration-current">
                  {item.name}
                </button>
                <p className="text-sm text-muted tnum">
                  {item.station ?? "Station not listed"} ·{" "}
                  {item.caloriesKcal === null ? "calories unknown" : `${formatAmount(item.caloriesKcal * servings, " kcal")}`}
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

      <dl className="mt-3 border-t border-line pt-2">
        <TotalRow label="Calories" total={sum.caloriesKcal} target={target?.caloriesKcal ?? null} unit=" kcal" />
        <TotalRow label="Protein" total={sum.proteinG} target={target?.proteinG ?? null} unit=" g" />
        <TotalRow label="Carbohydrate" total={sum.carbsG} target={target?.carbsG ?? null} unit=" g" />
        <TotalRow label="Fat" total={sum.fatG} target={target?.fatG ?? null} unit=" g" />
        <TotalRow label="Fiber" total={sum.fiberG} target={null} unit=" g" />
        <TotalRow label="Sodium" total={sum.sodiumMg} target={null} unit=" mg" />
      </dl>
      {targetLabel && entries.length > 0 && <p className="text-sm text-muted">Planned, not eaten. Targets are {targetLabel}.</p>}
      {entries.length > 0 && <PlateBar entries={entries} />}
    </div>
  );
}
