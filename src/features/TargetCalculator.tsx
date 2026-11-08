import { useId, useState } from "react";
import { Button, Notice } from "../components/ui";
import { ACTIVITIES, estimateTargets, inchesToCm, poundsToKg, type CalculatorInput } from "../lib/target-calculator";
import type { MealTargets } from "../lib/planner";
import model from "../lib/calorie-model.json";

const field = "mt-1 min-h-11 w-full rounded-[var(--radius-inner)] border border-control bg-field px-3 text-ink";

export function TargetCalculator({ onApply }: { onApply: (targets: MealTargets) => void }) {
  const id = useId();
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [category, setCategory] = useState<"" | "female" | "male">("");
  const [activity, setActivity] = useState("");
  const [goal, setGoal] = useState<CalculatorInput["goal"]>("maintain");
  const [method, setMethod] = useState<CalculatorInput["method"]>("standard");
  const [eligible, setEligible] = useState(false);
  const [applied, setApplied] = useState(false);
  let result: ReturnType<typeof estimateTargets> | null = null;
  let error = "";
  if (age && height && weight && category && activity && eligible) {
    try { result = estimateTargets({ age: Number(age), heightCm: units === "metric" ? Number(height) : inchesToCm(Number(height)), weightKg: units === "metric" ? Number(weight) : poundsToKg(Number(weight)), category, activity: Number(activity) - 1, goal, method }); }
    catch (err) { error = err instanceof Error ? err.message : "Check your inputs."; }
  }
  const change = () => setApplied(false);
  return <details className="mt-4 rounded-[var(--radius-inner)] border border-line bg-field p-4" onChange={change}>
    <summary className="min-h-11 cursor-pointer font-semibold text-brand-ink">Help me estimate my daily targets</summary>
    <p className="mt-2 text-sm text-muted">Optional starting estimates, not medical advice. Measurements stay in this panel and are not saved or sent anywhere. Manual targets are always available.</p>
    <label className="mt-3 flex min-h-11 items-start gap-3"><input type="checkbox" checked={eligible} onChange={(e) => setEligible(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[var(--brand-ink)]" /><span>I’m 18–78 and not pregnant or breastfeeding, and I don’t need a medically prescribed diet.</span></label>
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label htmlFor={`${id}-units`} className="font-semibold">Units<select aria-label="Units" id={`${id}-units`} value={units} className={field} onChange={(e) => { setUnits(e.target.value as typeof units); setHeight(""); setWeight(""); }}><option value="metric">Centimeters / kilograms</option><option value="imperial">Inches / pounds</option></select></label>
      <label htmlFor={`${id}-age`} className="font-semibold">Age (years)<input id={`${id}-age`} className={field} type="number" min="18" max="78" step="1" value={age} onChange={(e) => setAge(e.target.value)} autoComplete="off" /></label>
      <label htmlFor={`${id}-height`} className="font-semibold">Height ({units === "metric" ? "cm" : "total inches"})<input id={`${id}-height`} className={field} type="number" step="0.1" min="1" value={height} onChange={(e) => setHeight(e.target.value)} autoComplete="off" inputMode="decimal" /></label>
      <label htmlFor={`${id}-weight`} className="font-semibold">Weight ({units === "metric" ? "kg" : "lb"})<input id={`${id}-weight`} className={field} type="number" step="0.1" min="1" value={weight} onChange={(e) => setWeight(e.target.value)} autoComplete="off" inputMode="decimal" /></label>
      <label htmlFor={`${id}-category`} className="font-semibold">Equation category<select aria-label="Equation category" id={`${id}-category`} className={field} value={category} onChange={(e) => setCategory(e.target.value as typeof category)}><option value="">Choose a category</option><option value="female">Female equation/category</option><option value="male">Male equation/category</option></select></label>
      <label htmlFor={`${id}-activity`} className="font-semibold">Usual activity<select aria-label="Usual activity" id={`${id}-activity`} className={field} value={activity} onChange={(e) => setActivity(e.target.value)}><option value="">Choose activity</option>{ACTIVITIES.map((a, i) => <option key={a.label} value={i + 1}>{a.label}</option>)}</select></label>
      <label htmlFor={`${id}-goal`} className="font-semibold">Goal<select aria-label="Goal" id={`${id}-goal`} className={field} value={goal} onChange={(e) => setGoal(e.target.value as typeof goal)}><option value="maintain">Maintain weight</option><option value="lose">Gradual loss / cutting (−10%)</option><option value="gain">Gradual gain / bulking (+10%)</option></select></label>
      <label htmlFor={`${id}-method`} className="font-semibold">Estimate method<select aria-label="Estimate method" id={`${id}-method`} className={field} value={method} onChange={(e) => setMethod(e.target.value as typeof method)}><option value="standard">Standard equation</option><option value="dataset">Team dataset (experimental)</option></select></label>
    </div>
    <p className="mt-3 text-sm text-muted">The available equations/categories are limited and do not represent every person’s physiology or gender identity. If neither fits, use manual targets. Activity is already included; do not add exercise calories again.</p>
    {method === "dataset" && <div className="mt-3"><Notice tone="warn" title="Experimental research estimate">Uses the exported regression from the team’s {model.rowCount.toLocaleString()}-row dataset. Its source and clinical validity are unverified; there is no evidence it is more accurate for you. The dataset’s “Other” gender coefficient is not used as a physiological model.</Notice></div>}
    {error && <p role="alert" className="mt-3 text-danger">{error}</p>}
    {result && <div className="mt-4 border-t border-line pt-4" aria-live="polite">
      <p className="text-sm text-muted">Estimated maintenance: {result.maintenanceKcal.toLocaleString()} kcal/day. Goal adjustment: {result.adjustmentPercent > 0 ? "+" : ""}{result.adjustmentPercent}%.</p>
      <p className="mt-2 text-xl font-semibold tnum">{result.targets.caloriesKcal?.toLocaleString()} kcal per day</p>
      <p className="mt-1">Protein {result.targets.proteinG} g · Carbs {result.targets.carbsG} g · Fat {result.targets.fatG} g</p>
      <p className="mt-2 text-sm text-muted">Macros start at approximately 20% protein, 50% carbohydrate and 30% fat. This editable template and the ±10% goal adjustment are app defaults, not a personalized prescription.</p>
      <Button variant="primary" className="mt-3" onClick={() => { onApply(result.targets); setApplied(true); }}>{applied ? "Apply estimate again" : "Use these daily targets"}</Button>
      {applied && <p role="status" className="mt-2 text-sm">Daily targets updated below. You can edit every number.</p>}
    </div>}
    <p className="mt-4 text-sm text-muted">Standard method: <a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noopener noreferrer" className="underline">Mifflin–St Jeor</a> resting estimate with conventional activity factors. Research model revision: {model.sourceRevision.slice(0, 7)}. Estimates do not predict a guaranteed rate of weight change.</p>
  </details>;
}
