import { formatAmount, totals } from "../lib/nutrition";
import type { MealTargets, PlanOption, PlanResult } from "../lib/planner";
import type { Restrictions } from "../lib/restrictions";
import type { MenuItem } from "../lib/schema";
import { Button, Notice } from "../components/ui";

type Props = {
  result: PlanResult;
  target: MealTargets;
  targetLabel: string;
  restrictions: Restrictions;
  freshness: string;
  excludedCount: number;
  onUse: (option: PlanOption) => void;
  onNotThis: (item: MenuItem) => void;
  onResetExcluded: () => void;
  onOpen: (item: MenuItem) => void;
};

function fit(actual: number, target: number | null, unit: string) {
  if (target === null) return `${formatAmount(actual, unit)} (no target)`;
  const diff = actual - target;
  const pct = Math.round((Math.abs(diff) / target) * 100);
  return `${formatAmount(actual, unit)} vs ${formatAmount(target, unit)} (${pct === 0 ? "on target" : `${pct}% ${diff > 0 ? "over" : "under"}`})`;
}

function restrictionLine(r: Restrictions) {
  const parts: string[] = [];
  if (r.allergyAnswer === "some" && r.avoidAllergens.length > 0) {
    parts.push(`no dish lists ${r.avoidAllergens.join(", ")} on its label or in its ingredient text`);
    parts.push(r.strictUnknown ? "dishes with missing allergen info were left out" : "dishes with missing allergen info were allowed, as you chose");
  }
  if (r.requireTags.length > 0) parts.push(`every dish is labeled ${r.requireTags.join(" and ")} by the source`);
  return parts.length ? parts.join("; ") : "no restrictions selected";
}

export function Suggestions({ result, target, targetLabel, restrictions, freshness, excludedCount, onUse, onNotThis, onResetExcluded, onOpen }: Props) {
  const ex = result.excluded;
  const left = [
    ex.restricted && `${ex.restricted} that don't fit your restrictions`,
    ex.incompleteNutrition && `${ex.incompleteNutrition} with missing or inconsistent nutrition`,
    ex.buildYourOwn && `${ex.buildYourOwn} build-your-own stations`,
    ex.tooSmall && `${ex.tooSmall} condiments or drinks under 40 kcal`,
    ex.userExcluded && `${ex.userExcluded} you set aside`,
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      {result.notes.map((n) => (
        <Notice key={n} tone="warn" title="Your targets don't quite add up">
          {n}
        </Notice>
      ))}

      {result.kind === "infeasible" ? (
        <Notice title="No plate to suggest">
          <p>{result.reason}</p>
          {left.length > 0 && <p className="mt-1">Left out: {left.join(", ")}.</p>}
        </Notice>
      ) : (
        result.options.map((option, n) => {
          const t = totals(option.entries);
          return (
            <article key={option.entries.map((e) => e.item.id).join()} className="fade-in rounded-2xl border border-line bg-surface p-4" aria-labelledby={`opt-${n}`}>
              <h3 id={`opt-${n}`} className="font-bold">
                {n === 0 ? "Closest match" : `Option ${n + 1}`}
                <span className="font-normal text-muted tnum">
                  {" "}
                  · {formatAmount(t.caloriesKcal.value, " kcal")}, {formatAmount(t.proteinG.value, " g")} protein
                </span>
              </h3>
              {option.far && <p className="mt-1 font-semibold text-danger">Still far from your targets; this is the nearest available.</p>}
              <ul className="mt-2 space-y-2">
                {option.entries.map(({ item, servings }) => (
                  <li key={item.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold tnum">
                        {servings} × {item.servingText ?? "serving"}
                      </p>
                      <button type="button" onClick={() => onOpen(item)} className="text-left break-words underline decoration-line underline-offset-4 hover:decoration-current">
                        {item.name}
                      </button>
                      <span className="text-sm text-muted"> · {item.station}</span>
                    </div>
                    <Button variant="quiet" className="shrink-0 px-2 text-sm" onClick={() => onNotThis(item)} aria-label={`Not ${item.name}: suggest without it`}>
                      Not this
                    </Button>
                  </li>
                ))}
              </ul>
              <details className="mt-3 rounded-lg bg-sunken px-3">
                <summary className="min-h-11 cursor-pointer py-2.5 font-semibold">Why this plan?</summary>
                <ul className="list-disc space-y-1 pb-3 pl-5 text-sm tnum">
                  <li>Calories: {fit(t.caloriesKcal.value, target.caloriesKcal, " kcal")}</li>
                  <li>Protein: {fit(t.proteinG.value, target.proteinG, " g")}</li>
                  <li>Carbohydrate: {fit(t.carbsG.value, target.carbsG, " g")}</li>
                  <li>Fat: {fit(t.fatG.value, target.fatG, " g")}</li>
                  <li>Targets are {targetLabel}.</li>
                  <li>Portions are whole servings as the dining hall defines them; no gram weights are assumed.</li>
                  <li>Restrictions: {restrictionLine(restrictions)}.</li>
                  <li>Considered {result.considered} dishes with complete labels{left.length ? `; left out ${left.join(", ")}` : ""}.</li>
                  <li>{freshness}</li>
                  <li>This is the best match among what's listed, not advice for your body.</li>
                </ul>
              </details>
              <Button variant={n === 0 ? "primary" : "secondary"} className="mt-3 w-full" onClick={() => onUse(option)}>
                Use this plate
              </Button>
            </article>
          );
        })
      )}

      {excludedCount > 0 && (
        <Button variant="quiet" onClick={onResetExcluded}>
          Bring back {excludedCount} set-aside {excludedCount === 1 ? "dish" : "dishes"}
        </Button>
      )}
    </div>
  );
}
