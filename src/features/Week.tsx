import { useEffect, useMemo, useState } from "react";
import { Button, Icon, Notice, type IconName } from "../components/ui";

const MEAL_ICONS: Record<string, IconName> = { Breakfast: "sunrise", Brunch: "cup", Lunch: "sun", Dinner: "moon" };
import { useDayMenus } from "../data";
import { eligibility } from "../lib/freshness";
import { formatAmount } from "../lib/nutrition";
import { mealShare, planMeal, type PlanOption, type PlanResult } from "../lib/planner";
import type { Profile } from "../lib/profile-storage";
import { allergyAnswered } from "../lib/restrictions";
import type { HallEntry, MenuIndex, MenuItem } from "../lib/schema";
import { formatDate, formatHours } from "../lib/time";
import { chooseMeals, dayTotals, weekDates } from "../lib/week";
import { portionLabel } from "../lib/portion";

type Props = {
  index: MenuIndex;
  hall: HallEntry;
  start: string;
  profile: Profile;
  now: Date;
  onUse: (date: string, meal: string, option: PlanOption) => void;
  onSetup: (destination: "daily-targets" | "food-allergies") => void;
  onOpen: (item: MenuItem, meal: string) => void;
};

type Job = { key: string; sig: string; items: MenuItem[]; exclude: string[] };

const versus = (actual: number, target: number | null, unit: string) =>
  target === null ? formatAmount(actual, unit) : `${formatAmount(actual, unit)} of ${formatAmount(target, unit)}`;

export function Week({ index, hall, start, profile, now, onUse, onSetup, onOpen }: Props) {
  // Stop at the last day BU has posted, instead of showing empty days beyond the collected menus.
  const lastPosted = hall.dates.map((d) => d.date).sort().at(-1) ?? start;
  const dates = useMemo(() => weekDates(start).filter((d, i) => i === 0 || d <= lastPosted), [start, lastPosted]);
  const fileByDate = new Map(hall.dates.map((d) => [d.date, d.file]));
  const loads = useDayMenus(dates.flatMap((d) => fileByDate.get(d) ?? []), index.dataVersion);
  const [excluded, setExcluded] = useState<Record<string, string[]>>({});
  const [pick, setPick] = useState<Record<string, number>>({});
  const [plans, setPlans] = useState<Record<string, { sig: string; result: PlanResult }>>({});

  const { daily, mealsPerDay, restrictions } = profile;
  const target = mealShare(daily, mealsPerDay);
  const hasTarget = daily.caloriesKcal !== null || daily.proteinG !== null;
  const ready = hasTarget && allergyAnswered(restrictions);
  const profileSig = JSON.stringify([restrictions, daily, mealsPerDay, hall.id, index.dataVersion]);

  const days = dates.map((date) => {
    const file = fileByDate.get(date);
    const load = file ? loads[file] : undefined;
    const elig = eligibility(index, hall.id, date, now);
    const meals = load?.state === "ready" ? chooseMeals(load.data.meals, mealsPerDay) : [];
    return { date, file, load, elig, meals };
  });

  const jobs: Job[] = ready
    ? days.flatMap(({ date, elig, meals }) =>
        elig.canRecommend
          ? meals.map((m) => {
              const key = `${date}|${m.name}`;
              const exclude = excluded[key] ?? [];
              return { key, sig: `${profileSig}|${exclude.join()}`, items: m.items, exclude };
            })
          : [],
      )
    : [];
  const pending = jobs.filter((j) => plans[j.key]?.sig !== j.sig);
  const pendingKey = pending.map((j) => `${j.key}#${j.sig}`).join("\n");

  // Plan one meal per tick so the page stays responsive; a newer input restarts and discards the old run.
  useEffect(() => {
    if (pending.length === 0) return;
    let cancelled = false;
    const job = pending[0]!;
    const timer = setTimeout(() => {
      if (cancelled) return;
      const result = planMeal(job.items, target, restrictions, { exclude: new Set(job.exclude) });
      setPlans((p) => ({ ...p, [job.key]: { sig: job.sig, result } }));
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // pendingKey captures every input the next job depends on
  }, [pendingKey]);

  // Every week action re-checks freshness at click time.
  const live = (date: string) => eligibility(index, hall.id, date, new Date()).canRecommend;
  const focusMeal = (key: string) => setTimeout(() => document.getElementById(`week-${key}`)?.focus(), 0);

  if (!hasTarget) return <Notice title="Add a target to plan a week"><p>Enter a daily calorie or protein target first.</p><Button className="mt-3" onClick={() => onSetup("daily-targets")}>Set daily targets</Button></Notice>;
  if (!allergyAnswered(restrictions)) return <Notice title="Set your allergies to plan a week"><p>Answer the allergy question, even if the answer is “none”.</p><Button className="mt-3" onClick={() => onSetup("food-allergies")}>Set allergy preferences</Button></Notice>;

  const done = jobs.length - pending.length;

  return (
    <div>
      <h3 className="text-lg font-semibold tracking-[-0.01em] text-balance">{dates.length === 7 ? `Seven days from ${formatDate(start, "short")}` : `${formatDate(start, "short")} to ${formatDate(dates.at(-1)!, "short")}, the days BU has posted`}</h3>
      <p className="mt-1 text-sm text-muted">
        Each suggestion aims for {mealsPerDay === 1 ? "your whole-day targets" : `1/${mealsPerDay} of your daily targets`}. Use a meal to add it to your plan.
      </p>
      <p className="mt-2 text-sm font-semibold" aria-live="polite">
        {pending.length > 0 ? `Finding meal suggestions… ${done} of ${jobs.length} ready` : jobs.length > 0 ? `${jobs.length} meal suggestions ready.` : ""}
      </p>

      <ol className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2 lg:items-start">
        {days.map(({ date, file, load, elig, meals }) => {
          const planned = meals.flatMap((m) => {
            const p = plans[`${date}|${m.name}`];
            const sig = jobs.find((j) => j.key === `${date}|${m.name}`)?.sig;
            if (!p || p.sig !== sig || p.result.kind !== "ok" || p.result.options.length === 0) return [];
            const options = p.result.options;
            return [options[(pick[`${date}|${m.name}`] ?? 0) % options.length]!.entries];
          });
          const day = dayTotals(planned, mealsPerDay);

          return (
            <li key={date} className="glass p-5">
              <section aria-labelledby={`day-${date}`}>
                <h4 id={`day-${date}`} className="font-semibold">
                  {formatDate(date)}
                </h4>

                {!file ? (
                  <p className="mt-1 text-muted">No menu posted for this day yet.</p>
                ) : !load || load.state === "loading" ? (
                  <div className="mt-2 h-16 motion-safe:animate-pulse rounded-[var(--radius-inner)] bg-sunken" aria-label="Loading this day…" />
                ) : load.state === "error" ? (
                  <p className="mt-1 text-danger">{load.message}</p>
                ) : !elig.canRecommend ? (
                  <p className="mt-1 text-muted">Suggestions are off for this day. {elig.message}</p>
                ) : meals.length === 0 ? (
                  <p className="mt-1 text-muted">No meals are posted for this day.</p>
                ) : (
                  <>
                    {meals.map((m) => {
                      const key = `${date}|${m.name}`;
                      const p = plans[key];
                      const current = p && p.sig === jobs.find((j) => j.key === key)?.sig ? p.result : null;
                      const options = current?.kind === "ok" ? current.options : [];
                      const option = options.length ? options[(pick[key] ?? 0) % options.length]! : null;
                      const kcal = option ? option.entries.reduce((n, e) => n + (e.item.caloriesKcal ?? 0) * e.servings, 0) : 0;
                      const protein = option ? option.entries.reduce((n, e) => n + (e.item.proteinG ?? 0) * e.servings, 0) : 0;
                      return (
                        <div key={key} className="mt-3 border-t border-line pt-3 first:border-0 first:pt-0">
                          <h5 id={`week-${key}`} tabIndex={-1} className="flex items-center gap-2.5 font-semibold">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sunken" aria-hidden="true">
                              <Icon name={MEAL_ICONS[m.name] ?? "sun"} className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">{m.name}</span>
                            <span className="text-sm font-normal text-muted tnum">{formatHours(m.hours) ?? ""}</span>
                          </h5>
                          {!current ? (
                            <p className="text-sm text-muted">Planning…</p>
                          ) : current.kind === "infeasible" ? (
                            <p className="text-sm">{current.reason}</p>
                          ) : option ? (
                            <>
                              <ul className="mt-1 space-y-1">
                                {option.entries.map(({ item, servings }) => (
                                  <li key={item.id} className="flex items-start justify-between gap-2">
                                    <span className="min-w-0">
                                      <span className="font-bold tnum">
                                        {portionLabel(item, servings)}
                                      </span>{" "}
                                      <button type="button" onClick={() => onOpen(item, m.name)} className="text-left break-words underline decoration-line underline-offset-4 hover:decoration-current">
                                        {item.name}
                                      </button>
                                    </span>
                                    <Button
                                      variant="quiet"
                                      className="shrink-0 px-2 text-sm"
                                      aria-label={`Not ${item.name}: plan ${m.name.toLowerCase()} on ${formatDate(date, "short")} without it`}
                                      onClick={() => {
                                        if (!live(date)) return;
                                        setExcluded((x) => ({ ...x, [key]: [...(x[key] ?? []), item.id] }));
                                        setPick((x) => ({ ...x, [key]: 0 }));
                                        focusMeal(key);
                                      }}
                                    >
                                      Not this
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                              <p className="mt-1 text-sm text-muted tnum">
                                {versus(kcal, target.caloriesKcal, " kcal")} · {versus(protein, target.proteinG, " g")} protein
                                {option.far ? " · still far from target" : ""}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {options.length > 1 && (
                                  <Button className="text-sm" aria-label={`Another option for ${m.name.toLowerCase()} on ${formatDate(date, "short")}`} onClick={() => live(date) && setPick((x) => ({ ...x, [key]: (x[key] ?? 0) + 1 }))}>
                                    Another option
                                  </Button>
                                )}
                                <Button className="text-sm" aria-label={`Use this ${m.name.toLowerCase()} on ${formatDate(date, "short")} as my plate`} onClick={() => live(date) && onUse(date, m.name, option)}>
                                  Use for this meal
                                </Button>
                              </div>
                            </>
                          ) : null}
                          {(excluded[key]?.length ?? 0) > 0 && (
                            <Button
                              variant="quiet"
                              className="mt-1 px-2 text-sm"
                              onClick={() => {
                                setExcluded((x) => ({ ...x, [key]: [] }));
                                focusMeal(key);
                              }}
                            >
                              Bring back {excluded[key]!.length} set-aside {excluded[key]!.length === 1 ? "dish" : "dishes"}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                    <p className="mt-3 border-t border-line pt-3 text-sm tnum">
                      <span className="font-semibold">Suggested day total: </span>
                      {versus(day.sum.caloriesKcal.value, daily.caloriesKcal, " kcal")} · {versus(day.sum.proteinG.value, daily.proteinG, " g")} protein
                      {!day.complete && (
                        <span className="block text-muted">
                          Incomplete: suggestions for {day.plannedMeals} of your {mealsPerDay} meals{meals.length < mealsPerDay ? ` (only ${meals.length} posted)` : ""}.
                        </span>
                      )}
                    </p>
                  </>
                )}
              </section>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
