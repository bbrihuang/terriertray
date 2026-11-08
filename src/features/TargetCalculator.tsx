import { useId, useState } from "react";
import { Button } from "../components/ui";
import model from "../lib/calorie-model.json";
import { ACTIVITY_LEVELS, defaultAdjustmentKcal, feetAndInchesToCm, GENDERS, GOALS, planTarget, poundsToKg, predictCalories, RANGES, type Gender, type Goal } from "../lib/target-calculator";

const field = "mt-1 min-h-11 w-full rounded-[var(--radius-inner)] border border-control bg-field px-3 text-ink tnum";

/**
 * Measurements -> our model's prediction -> review -> explicit Apply.
 * Measurements live only in this component's state: never saved, never sent.
 */
export function TargetCalculator({ currentKcal, onApply }: { currentKcal: number | null; onApply: (kcal: number) => void }) {
  const id = useId();
  const [units, setUnits] = useState<"metric" | "us">("metric");
  const [age, setAge] = useState("");
  const [cm, setCm] = useState("");
  const [feet, setFeet] = useState("");
  const [inches, setInches] = useState("");
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState<"" | Gender>("");
  const [activity, setActivity] = useState("");
  const [goal, setGoal] = useState<Goal>("maintain");
  const [amount, setAmount] = useState<string | null>(null);
  const [scope, setScope] = useState(false);
  const [applied, setApplied] = useState<number | null>(null);

  const heightCm = units === "metric" ? Number(cm) : feetAndInchesToCm(Number(feet), Number(inches || 0));
  const weightKg = units === "metric" ? Number(weight) : poundsToKg(Number(weight));
  const complete = age && (units === "metric" ? cm : feet) && weight && gender && activity !== "";

  let prediction: number | null = null;
  let problem = "";
  if (complete) {
    try {
      prediction = predictCalories({ age: Number(age), gender: gender as Gender, heightCm, weightKg, activity: Number(activity) });
    } catch (err) {
      problem = err instanceof Error ? err.message : "Check your inputs.";
    }
  }
  // An unedited amount (null) follows the current estimate; an edited one is kept across goal and body changes.
  const amountText = amount ?? (prediction === null ? "" : String(defaultAdjustmentKcal(prediction)));
  const plan = prediction === null ? null : planTarget(prediction, goal, amountText);
  const amountError = plan && "error" in plan ? plan.error : null;
  const signed = (n: number) => `${n < 0 ? "−" : n > 0 ? "+" : ""}${Math.abs(n).toLocaleString("en-US")}`;
  const edit = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setApplied(null);
  };

  return (
    <div>
      <p>
        Our team’s model predicts daily calories from five inputs. Your measurements aren’t saved or sent anywhere.
      </p>

      <label className="mt-4 flex min-h-11 items-start gap-3">
        <input type="checkbox" checked={scope} onChange={(e) => edit(setScope)(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]" />
        <span className="min-w-0 [overflow-wrap:anywhere]">I’m not pregnant or breastfeeding, and I don’t need a medically prescribed diet.</span>
      </label>

      <fieldset className="mt-4">
        <legend className="font-semibold">Units</legend>
        <div className="mt-1 flex flex-wrap gap-x-6">
          {(
            [
              ["metric", "cm and kg"],
              ["us", "feet, inches and pounds"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex min-h-11 items-center gap-3">
              <input type="radio" name={`${id}-units`} checked={units === value} onChange={() => edit(setUnits)(value)} className="size-5 accent-[var(--brand)]" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-3 grid grid-cols-1 gap-3 min-[26rem]:grid-cols-2">
        <div>
          <label htmlFor={`${id}-age`} className="block font-semibold">Age <span className="font-normal text-muted">(years)</span></label>
          <input id={`${id}-age`} className={field} type="number" inputMode="numeric" min={RANGES.age[0]} max={RANGES.age[1]} step={1} value={age} onChange={(e) => edit(setAge)(e.target.value)} autoComplete="off" />
        </div>
        {units === "metric" ? (
          <div>
            <label htmlFor={`${id}-cm`} className="block font-semibold">Height <span className="font-normal text-muted">(cm)</span></label>
            <input id={`${id}-cm`} className={field} type="number" inputMode="decimal" step="0.1" value={cm} onChange={(e) => edit(setCm)(e.target.value)} autoComplete="off" />
          </div>
        ) : (
          <fieldset>
            <legend className="font-semibold">Height</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm text-muted">
                feet
                <input aria-label="Height, feet" className={field} type="number" inputMode="numeric" min={4} max={7} step={1} value={feet} onChange={(e) => edit(setFeet)(e.target.value)} autoComplete="off" />
              </label>
              <label className="text-sm text-muted">
                inches
                <input aria-label="Height, inches" className={field} type="number" inputMode="decimal" min={0} max={11.9} step="0.1" value={inches} onChange={(e) => edit(setInches)(e.target.value)} autoComplete="off" />
              </label>
            </div>
          </fieldset>
        )}
        <div>
          <label htmlFor={`${id}-weight`} className="block font-semibold">Weight <span className="font-normal text-muted">({units === "metric" ? "kg" : "lb"})</span></label>
          <input id={`${id}-weight`} className={field} type="number" inputMode="decimal" step="0.1" value={weight} onChange={(e) => edit(setWeight)(e.target.value)} autoComplete="off" />
        </div>
        <div>
          <label htmlFor={`${id}-activity`} className="block font-semibold">Activity level</label>
          <select id={`${id}-activity`} className={field} value={activity} onChange={(e) => edit(setActivity)(e.target.value)}>
            <option value="">Choose…</option>
            {ACTIVITY_LEVELS.map((label, i) => (
              <option key={label} value={i}>{label}</option>
            ))}
          </select>
        </div>
        <div className="min-[26rem]:col-span-2">
          <label htmlFor={`${id}-gender`} className="block font-semibold">Gender</label>
          <select id={`${id}-gender`} className={field} value={gender} onChange={(e) => edit(setGender)(e.target.value as Gender)}>
            <option value="">Choose…</option>
            {GENDERS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <p className="mt-1 text-sm text-muted">
            Options don’t fit? Enter calories yourself below.
          </p>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">
        Activity is already counted, so don’t add exercise calories on top.
      </p>

      <div className="mt-5 rounded-[var(--radius-inner)] bg-sunken p-4" aria-live="polite">
        {!scope ? (
          <p className="text-muted">Confirm the statement above to see a prediction.</p>
        ) : problem ? (
          <p role="alert" className="font-semibold text-danger">{problem} You can still enter calories yourself below.</p>
        ) : prediction === null ? (
          <p className="text-muted">Fill in all five inputs to see the model’s prediction.</p>
        ) : (
          <>
            <p className="text-sm text-muted">Our model predicts</p>
            <p className="tnum">
              <span className="text-[2.125rem] leading-none font-semibold tracking-[-0.03em]">{Math.round(prediction).toLocaleString("en-US")}</span>
              <span className="text-sm text-muted"> kcal per day</span>
            </p>
            <fieldset className="mt-4">
              <legend className="font-semibold">Planning goal</legend>
              <div className="mt-1 flex flex-wrap gap-x-6">
                {GOALS.map(({ value, label }) => (
                  <label key={value} className="flex min-h-11 items-center gap-3">
                    <input type="radio" name={`${id}-goal`} checked={goal === value} onChange={() => edit(setGoal)(value)} className="size-5 accent-[var(--brand)]" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            {goal === "maintain" ? (
              <p className="mt-1 text-sm text-muted">Uses the model estimate unchanged.</p>
            ) : (
              <div className="mt-2">
                <label htmlFor={`${id}-amount`} className="block font-semibold">
                  Your planning adjustment <span className="font-normal text-muted">(kcal/day {goal === "cut" ? "fewer" : "more"})</span>
                </label>
                <input
                  id={`${id}-amount`}
                  className={`${field} max-w-40`}
                  type="text"
                  inputMode="numeric"
                  value={amountText}
                  onChange={(e) => edit(setAmount)(e.target.value)}
                  aria-invalid={amountError !== null || undefined}
                  aria-describedby={`${id}-amount-help`}
                  autoComplete="off"
                />
                <p id={`${id}-amount-help`} className={`mt-1 text-sm ${amountError ? "font-semibold text-danger" : "text-muted"}`}>
                  {amountError ?? `${amount === null ? "Starts at 10% of the estimate. " : ""}Doesn’t predict weight change.`}
                </p>
              </div>
            )}
            {plan && "target" in plan && (
              <>
                <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 tnum">
                  <dt className="text-muted">Model estimate</dt>
                  <dd className="text-right">{plan.estimate.toLocaleString("en-US")}</dd>
                  <dt className="text-muted">Your planning adjustment</dt>
                  <dd className="text-right">{signed(plan.adjustment)}</dd>
                  <dt className="border-t border-control pt-1 font-semibold">Proposed daily target</dt>
                  <dd className="border-t border-control pt-1 text-right font-semibold">{plan.target.toLocaleString("en-US")} kcal</dd>
                </dl>
                <Button
                  variant="primary"
                  className="mt-3"
                  onClick={() => {
                    onApply(plan.target);
                    setApplied(plan.target);
                  }}
                >
                  Apply {plan.target.toLocaleString("en-US")} kcal as my daily target
                </Button>
              </>
            )}
            <p className="mt-2 text-sm text-muted">Only your calorie target changes.</p>
            {applied !== null && applied === currentKcal && (
              <p role="status" className="mt-2 font-semibold text-ok">Applied. Plan and Week now aim for {applied.toLocaleString("en-US")} kcal a day.</p>
            )}
          </>
        )}
      </div>

      <p className="mt-4 text-sm text-muted">Typically off by about 111 kcal. Not medical advice.</p>
      <details className="mt-2 text-sm text-muted">
        <summary className="min-h-11 cursor-pointer content-center font-semibold text-ink">About this model</summary>
        <ul className="list-disc space-y-1 pl-5">
          <li>A regression trained on a {(6000).toLocaleString("en-US")}-row dataset. On held-out rows it was off by about 111 kcal on average; that doesn’t mean it’s accurate for you.</li>
          <li>The dataset doesn’t define its activity levels; pick the closest.</li>
          <li>The dataset also records “Other” gender, but the team chose not to apply that category’s coefficient.</li>
          <li>Your protein, carb and fat targets aren’t predicted and stay as you set them.</li>
          <li className="tnum">Model {model.modelSha256.slice(0, 8)}, data revision {model.sourceRevision.slice(0, 7)}.</li>
        </ul>
      </details>
    </div>
  );
}
