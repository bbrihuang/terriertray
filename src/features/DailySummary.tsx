import type { DailySummaryData } from "../lib/daily-totals";
import { formatAmount, isComplete, type Total } from "../lib/nutrition";
import type { MealTargets } from "../lib/planner";
import { formatDate } from "../lib/time";

type Props = { date: string; summary: DailySummaryData; targets: MealTargets };

function DailyStat({ label, total, target, unit }: { label: string; total: Total; target: number | null; unit: string }) {
  const complete = isComplete(total);
  const known = total.known > 0;
  const difference = target === null ? null : target - total.value;
  return (
    <div className="daily-summary-stat min-w-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 tnum">
        <span className="daily-summary-number block text-3xl font-medium tracking-[-0.02em]">
          {known ? `${complete ? "" : "at least "}${formatAmount(total.value, "")}` : "Unknown"}
          {known && <span className="ml-1 text-base font-normal text-muted">{unit}</span>}
        </span>
        <span className="daily-summary-target mt-1 block text-sm text-muted">
          {target === null ? "No daily target set" : `of ${formatAmount(target, ` ${unit}`)} daily target`}
        </span>
        {complete && difference !== null && (
          <span className="mt-1 block text-sm">
            {difference === 0 ? "Daily target met" : difference > 0 ? `${formatAmount(difference, ` ${unit}`)} left` : `${formatAmount(-difference, ` ${unit}`)} above target`}
          </span>
        )}
        {!complete && <span className="mt-1 block text-sm text-muted">Known for {total.known} of {total.entries} dishes</span>}
      </dd>
    </div>
  );
}

/** Provider calories and approximate macro energy are separate, explicitly labelled quantities. */
export function DailySummary({ date, summary, targets }: Props) {
  const { sum, selectedDishes, resolvedDishes, pendingDishes, unavailableDishes } = summary;
  const parts = [
    { key: "protein", label: "Protein", energy: sum.proteinG.value * 4 },
    { key: "carbs", label: "Carbs", energy: sum.carbsG.value * 4 },
    { key: "fat", label: "Fat", energy: sum.fatG.value * 9 },
  ];
  const macroCalories = parts.reduce((total, part) => total + part.energy, 0);
  const partialMacros = ![sum.proteinG, sum.carbsG, sum.fatG].every(isComplete);
  const dishLabel = (count: number) => `${count} ${count === 1 ? "dish" : "dishes"}`;

  return (
    <section className="daily-summary" aria-labelledby="daily-summary-heading">
      <div className="daily-summary-heading">
        <h3 id="daily-summary-heading" className="text-xl font-semibold">Your daily totals</h3>
        <p className="mt-1 text-sm text-muted">
          <time dateTime={date}>{formatDate(date)}</time> · All BU dining halls · Planned, not eaten
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
          <p className="daily-summary-note mt-4 text-sm text-muted" role="status">
            {dishLabel(selectedDishes)} planned.
            {pendingDishes > 0 && ` Nutrition for ${dishLabel(pendingDishes)} is still loading.`}
            {unavailableDishes > 0 && ` Nutrition for ${dishLabel(unavailableDishes)} could not be found.`}
          </p>
          <dl className="daily-summary-stats mt-5">
            <DailyStat label="Menu calories" total={sum.caloriesKcal} target={targets.caloriesKcal} unit="kcal" />
            <DailyStat label="Protein" total={sum.proteinG} target={targets.proteinG} unit="g" />
            <DailyStat label="Carbs" total={sum.carbsG} target={targets.carbsG} unit="g" />
            <DailyStat label="Fat" total={sum.fatG} target={targets.fatG} unit="g" />
          </dl>

          {macroCalories > 0 ? (
            <figure className="daily-macro-breakdown mt-6" aria-label="Calories from known macros">
              <figcaption className="text-sm">
                <span className="font-medium">Calories from known macros</span>
                <span className="ml-2 tnum">{formatAmount(macroCalories, " kcal")}</span>
                {partialMacros && <span className="ml-2 text-muted">· Partial</span>}
              </figcaption>
              <div className="daily-macro-bar mt-3" aria-hidden="true">
                {parts.map((part) => <span key={part.key} className={`macro-segment-${part.key}`} style={{ width: `${part.energy / macroCalories * 100}%` }} />)}
              </div>
              <ul className="daily-macro-legend mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted tnum">
                {parts.map((part) => <li key={part.key}>{part.label} {Math.round(part.energy / macroCalories * 100)}%</li>)}
              </ul>
              <p className="mt-2 max-w-[70ch] text-sm text-muted">
                Approximate energy: 4 kcal per gram of protein and carbs, 9 per gram of fat. This may differ from the published menu calories.
                {partialMacros && " Based only on known macro amounts."}
              </p>
            </figure>
          ) : (
            <p className="mt-5 text-sm text-muted">{partialMacros ? "Macro energy is unavailable until nutrition is known." : "No macro energy in the planned dishes."}</p>
          )}
        </>
      )}
    </section>
  );
}
