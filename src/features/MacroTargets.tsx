import { useId } from "react";
import { Button } from "../components/ui";
import { macroTargets, type MacroPreferences } from "../lib/macro-targets";

const format = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 1 });

export function MacroTargets({ calories, weightKg, preferences, onChange }: {
  calories: number;
  weightKg: number;
  preferences: MacroPreferences;
  onChange: (preferences: MacroPreferences) => void;
}) {
  const id = useId();
  const result = macroTargets(calories, weightKg, preferences);
  const custom = preferences.proteinPercent !== null || preferences.fatPercent !== null;

  const editShare = (nutrient: "protein" | "fat", value: string) => {
    if (!result.ok) return;
    onChange({
      ...preferences,
      proteinPercent: nutrient === "protein" ? Number(value) : result.percent.protein,
      fatPercent: nutrient === "fat" ? Number(value) : result.percent.fat,
    });
  };

  return (
    <section className="macro-split mt-5 border-t border-control pt-4" aria-labelledby={`${id}-title`}>
      <h4 id={`${id}-title`} className="font-semibold">Daily macro targets</h4>
      <p className="mt-1 text-sm text-muted">
        Planning starting points for your {format(calories)} kcal budget. These aren’t model predictions or guarantees of weight change or muscle gain.
      </p>
      <fieldset className="mt-3">
        <legend className="font-semibold">Starting split</legend>
        <div className="flex flex-wrap gap-x-5">
          {([["balanced", "Balanced"], ["muscle", "Muscle-focused"]] as const).map(([value, label]) => (
            <label key={value} className="flex min-h-11 items-center gap-3">
              <input
                type="radio"
                name={`${id}-preset`}
                value={value}
                checked={preferences.preset === value}
                onChange={() => onChange({ preset: value, proteinPercent: null, fatPercent: null })}
                className="size-5 accent-[var(--brand)]"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {result.ok ? (
        <>
          <p className="mt-1 text-sm text-muted">
            {custom ? "Custom split. " : preferences.preset === "balanced" ? "20% protein, 30% fat and the rest carbs. " : "Starts at 0.8 g of protein per pound, 30% fat and the rest carbs. "}
            Current protein: {format(result.proteinPerLb)} g/lb.
          </p>
          <div
            className="macro-split-bar mt-3"
            role="img"
            aria-label={`Calorie allocation: protein ${format(result.percent.protein)}%, carbohydrates ${format(result.percent.carbs)}%, fat ${format(result.percent.fat)}%`}
          >
            {(["protein", "carbs", "fat"] as const).map((nutrient) => (
              <span key={nutrient} className={`macro-segment macro-segment-${nutrient}`} style={{
                transform: `translateX(${nutrient === "protein" ? 0 : nutrient === "carbs" ? result.percent.protein : result.percent.protein + result.percent.carbs}%) scaleX(${result.percent[nutrient] / 100})`,
              }} />
            ))}
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-3 min-[26rem]:grid-cols-3 tnum">
            {([
              ["Protein", "protein", "proteinG"],
              ["Carbohydrates", "carbs", "carbsG"],
              ["Fat", "fat", "fatG"],
            ] as const).map(([label, nutrient, grams]) => (
              <div key={nutrient} className="min-w-0">
                <dt className="text-sm font-semibold">{label}</dt>
                <dd className="text-lg font-semibold">{format(result.grams[grams])} g</dd>
                <dd className="text-sm text-muted">{format(result.kcal[nutrient])} kcal · {format(result.percent[nutrient])}%</dd>
              </div>
            ))}
          </dl>
          <div className="macro-controls mt-4 space-y-3" aria-describedby={`${id}-allocation-help`}>
            {(["protein", "fat"] as const).map((nutrient) => {
              const other = nutrient === "protein" ? "fat" : "protein";
              const value = result.percent[nutrient];
              // Include the current preset value even when its carb remainder is below 1%.
              const min = Math.min(1, value);
              const max = Math.max(value, 99 - result.percent[other]);
              return (
                <div key={nutrient}>
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor={`${id}-${nutrient}`} className="font-semibold">{nutrient === "protein" ? "Protein" : "Fat"} calorie share</label>
                    <span className="tnum" aria-hidden="true">{format(value)}%</span>
                  </div>
                  <input
                    id={`${id}-${nutrient}`}
                    type="range"
                    min={min}
                    max={max}
                    step="any"
                    value={value}
                    onChange={(event) => editShare(nutrient, event.target.value)}
                    aria-valuetext={`${format(value)}% of calories`}
                    aria-describedby={`${id}-allocation-help`}
                    className="min-h-11 w-full accent-[var(--brand)]"
                  />
                </div>
              );
            })}
            <p id={`${id}-allocation-help`} className="text-sm text-muted">
              Allocation controls keep a positive share for each macro; their limits aren’t clinical ranges. Carbs take the remainder. Calories stay the same.
            </p>
          </div>
        </>
      ) : (
        <p role="alert" className="mt-3 font-semibold text-danger">{result.message}</p>
      )}

      <Button className="mt-2" variant="quiet" disabled={!custom} onClick={() => onChange({ ...preferences, proteinPercent: null, fatPercent: null })}>
        Reset split
      </Button>
      <details className="mt-1 text-sm text-muted">
        <summary className="min-h-11 cursor-pointer content-center font-semibold text-ink">How these splits work</summary>
        <div className="space-y-2 pb-2">
          <p>Protein and carbs use 4 kcal per gram; fat uses 9. Displayed and applied gram targets are rounded to 0.1 g. Edited percentages stay in place as your measurements or calorie budget change. Choosing a starting split or Reset split restores its defaults.</p>
          <p>
            The <a className="underline" href="https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/" target="_blank" rel="noreferrer">NIH Office of Dietary Supplements</a> describes athlete protein needs around 0.55–0.9 g/lb and fat around 20–35% of calories.
          </p>
          <p>
            <a className="underline" href="https://www.nationalacademies.org/read/27957/chapter/5" target="_blank" rel="noreferrer">National Academies adult reference ranges</a> are 10–35% protein, 20–35% fat and 45–65% carbohydrate. These are context for planning, not personalized limits for these controls.
          </p>
        </div>
      </details>
    </section>
  );
}
