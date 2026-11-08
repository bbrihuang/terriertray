import { useId } from "react";
import type { DailySummaryData } from "../lib/daily-totals";
import { formatAmount, isComplete, type Total } from "../lib/nutrition";
import type { MealTargets } from "../lib/planner";
import { formatDate } from "../lib/time";

type Props = { date: string; summary: DailySummaryData; targets: MealTargets };

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function DailyStat({ nutrient, label, total, target, unit }: { nutrient: string; label: string; total: Total; target: number | null; unit: string }) {
  const maskId = useId();
  const complete = isComplete(total);
  const known = total.known > 0;
  const hasTarget = target !== null && target > 0;
  const progress = known && hasTarget ? Math.min(1, Math.max(0, total.value / target)) : 0;
  const state = !known ? "unknown" : !hasTarget ? "no-target" : complete ? "complete" : "partial";
  const value = known ? `${complete ? "" : "at least "}${formatAmount(total.value, "")}` : "unknown";
  const targetLabel = hasTarget ? `of ${formatAmount(target, "")} ${unit}` : `${unit}; no daily target set`;
  const coverage = `Known for ${total.known} of ${total.entries} dishes`;
  const above = complete && hasTarget && total.value > target ? `${formatAmount(total.value - target, ` ${unit}`)} above target` : null;
  const labelText = `${label}: ${value} ${targetLabel} planned${complete ? "" : `; ${coverage.toLowerCase()}`}${above ? `; ${above}` : ""}`;
  return (
    <div className="daily-summary-stat" data-nutrient={nutrient} data-state={state}>
      <dt className="daily-stat-label">{label}</dt>
      <dd className="tnum">
        <div className="daily-target-ring">
          <svg viewBox="0 0 108 108" role="img" aria-label={labelText}>
            {!complete && known && hasTarget && (
              <defs>
                <mask id={maskId}>
                  <circle cx="54" cy="54" r={RADIUS} fill="none" stroke="white" strokeWidth="9" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - progress)} />
                </mask>
              </defs>
            )}
            <circle className="daily-ring-track" cx="54" cy="54" r={RADIUS} fill="none" strokeWidth="7" strokeDasharray={!known || !hasTarget ? "4 4" : undefined} />
            {known && hasTarget && (
              <circle className="daily-ring-progress" cx="54" cy="54" r={RADIUS} fill="none" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={complete ? CIRCUMFERENCE : "4 4"}
                strokeDashoffset={complete ? CIRCUMFERENCE * (1 - progress) : 0}
                transform="rotate(-90 54 54)" mask={complete ? undefined : `url(#${maskId})`} />
            )}
          </svg>
          <div className="daily-ring-center" aria-hidden="true">
            <span className="daily-ring-value">{known ? `${complete ? "" : "≥ "}${formatAmount(total.value, "")}` : "Unknown"}</span>
            <span className="daily-stat-target">{hasTarget ? `/ ${formatAmount(target, "")}` : "No target"}</span>
            <span className="daily-ring-unit">{unit}</span>
          </div>
        </div>
        {!complete && <p className="daily-stat-note">{coverage}</p>}
        {above && <p className="daily-stat-note">{above}</p>}
      </dd>
    </div>
  );
}

/** Whole-day planned totals against the user's own targets; incomplete nutrition stays explicit. */
export function DailySummary({ date, summary, targets }: Props) {
  const { sum, selectedDishes, resolvedDishes, pendingDishes, unavailableDishes } = summary;
  const dishLabel = (count: number) => `${count} ${count === 1 ? "dish" : "dishes"}`;

  return (
    <section className="daily-summary" aria-labelledby="daily-summary-heading">
      <div className="daily-summary-heading">
        <h3 id="daily-summary-heading" className="text-xl font-semibold">Your daily totals</h3>
        <p className="mt-1 text-sm text-muted">
          <time dateTime={date}>{formatDate(date, "short")}</time> · All BU dining halls · Planned, not eaten
        </p>
      </div>

      {selectedDishes === 0 ? (
        <div className="daily-summary-note mt-5">
          <p className="font-medium">Nothing planned for this day yet</p>
          <p className="mt-1 text-sm text-muted">Add dishes to your plates to see how the day adds up.</p>
        </div>
      ) : resolvedDishes === 0 ? (
        <div className="daily-summary-note mt-5" role="status">
          <p className="font-medium">{pendingDishes > 0 ? "Loading totals…" : "Totals unavailable"}</p>
          <p className="mt-1 text-sm text-muted">
            {pendingDishes > 0 ? `Loading menu nutrition for ${dishLabel(pendingDishes)}.` : `Menu nutrition could not be found for ${dishLabel(unavailableDishes)}.`}
            {pendingDishes > 0 && unavailableDishes > 0 && ` Another ${dishLabel(unavailableDishes)} could not be loaded.`}
          </p>
        </div>
      ) : (
        <>
          {(pendingDishes > 0 || unavailableDishes > 0) && <p className="daily-summary-note mt-3 text-sm text-muted" role="status">
            {pendingDishes > 0 && `Nutrition for ${dishLabel(pendingDishes)} is still loading. `}
            {unavailableDishes > 0 && `Nutrition for ${dishLabel(unavailableDishes)} could not be found.`}
          </p>}
          <dl className="daily-summary-stats">
            <DailyStat nutrient="calories" label="Calories" total={sum.caloriesKcal} target={targets.caloriesKcal} unit="kcal" />
            <DailyStat nutrient="protein" label="Protein" total={sum.proteinG} target={targets.proteinG} unit="g" />
            <DailyStat nutrient="carbs" label="Carbs" total={sum.carbsG} target={targets.carbsG} unit="g" />
            <DailyStat nutrient="fat" label="Fat" total={sum.fatG} target={targets.fatG} unit="g" />
          </dl>
        </>
      )}
    </section>
  );
}
