import { useEffect, useMemo, useState } from "react";
import { DishDialog } from "./components/DishDialog";
import { Button, Notice, Section } from "./components/ui";
import { useDayMenu, useMenuIndex } from "./data";
import { MenuList } from "./features/MenuList";
import { MAX_SERVINGS, Plate } from "./features/Plate";
import { Settings } from "./features/Settings";
import { Suggestions } from "./features/Suggestions";
import type { TrayEntry } from "./lib/nutrition";
import { mealShare, planMeal, type PlanOption } from "./lib/planner";
import { clearProfile, DEFAULT_PROFILE, loadProfile, saveProfile, type Profile } from "./lib/profile-storage";
import { checkRestrictions, type Restrictions } from "./lib/restrictions";
import type { HallEntry, MenuIndex, MenuItem } from "./lib/schema";
import { formatDate, formatHours, formatTimestamp, nyDate, nyMinutes, parseHours, pickMealIndex } from "./lib/time";

type Tab = "plan" | "menu" | "settings";
type Picked = { id: string; servings: number };

const initialSaved = loadProfile();
const initialUrl = new URLSearchParams(window.location.search);

function pickDate(dates: string[], today: string): string | null {
  if (dates.includes(today)) return today;
  return dates.find((d) => d > today) ?? dates.at(-1) ?? null;
}

function restrictionSummary(r: Restrictions) {
  const parts: string[] = [];
  if (r.allergyAnswer === "unanswered") parts.push("Allergies not set");
  else if (r.allergyAnswer === "none" || r.avoidAllergens.length === 0) parts.push("No allergens filtered");
  else parts.push(`Avoiding ${r.avoidAllergens.join(", ")}`);
  if (r.requireTags.length) parts.push(r.requireTags.join(" + "));
  return parts.join(" · ");
}

function freshness(hall: HallEntry, date: string, today: string) {
  const when = hall.lastSuccessfulFetchAt ? `fetched ${formatTimestamp(hall.lastSuccessfulFetchAt)}` : "saved snapshot, fetch time not recorded";
  const day = date === today ? "today" : formatDate(date, "short");
  return `Menu for ${day} from the official BU Dining page (${when}).`;
}

export default function App() {
  const index = useMenuIndex();
  const [profile, setProfile] = useState<Profile>(initialSaved ?? DEFAULT_PROFILE);
  const [remember, setRemember] = useState(initialSaved !== null);
  // Hall/date/meal/view live in the URL (shareable, non-personal); the profile never does.
  const [tab, setTab] = useState<Tab>(() => (["plan", "menu", "settings"].includes(initialUrl.get("view") ?? "") ? (initialUrl.get("view") as Tab) : "plan"));
  const [hallId, setHallId] = useState<string | null>(initialUrl.get("hall"));
  const [date, setDate] = useState<string | null>(initialUrl.get("date"));
  const [mealName, setMealName] = useState<string | null>(initialUrl.get("meal"));
  const [trays, setTrays] = useState<Record<string, Picked[]>>({});
  const [excluded, setExcluded] = useState<Record<string, string[]>>({});
  const [openItem, setOpenItem] = useState<MenuItem | null>(null);
  const today = nyDate();

  useEffect(() => {
    if (remember) saveProfile(profile);
  }, [profile, remember]);

  const data: MenuIndex | null = index.state === "ready" ? index.data : null;
  const hall = data?.halls.find((h) => h.id === hallId) ?? data?.halls.find((h) => h.dates.length > 0) ?? null;
  const dates = hall?.dates.map((d) => d.date) ?? [];
  const activeDate = date && dates.includes(date) ? date : pickDate(dates, today);
  const file = hall?.dates.find((d) => d.date === activeDate)?.file ?? null;
  const day = useDayMenu(file, data?.dataVersion ?? null);

  const meals = day?.state === "ready" ? day.data.meals : [];
  const defaultMeal = activeDate === today ? pickMealIndex(meals, nyMinutes()) : 0;
  const meal = meals.find((m) => m.name === mealName) ?? meals[defaultMeal] ?? null;
  const ctx = `${hall?.id}/${activeDate}/${meal?.name}`;

  useEffect(() => {
    if (!hall) return;
    const q = new URLSearchParams({ hall: hall.id, view: tab });
    if (activeDate && date) q.set("date", activeDate);
    if (meal && mealName) q.set("meal", meal.name);
    history.replaceState(null, "", `?${q}`);
  }, [hall, activeDate, date, meal, mealName, tab]);

  const byId = useMemo(() => new Map((meal?.items ?? []).map((i) => [i.id, i])), [meal]);
  const entries: TrayEntry[] = (trays[ctx] ?? []).flatMap((p) => {
    const item = byId.get(p.id);
    return item ? [{ item, servings: p.servings }] : [];
  });
  const onPlate = new Set(entries.map((e) => e.item.id));
  const conflicts = entries.filter((e) => !checkRestrictions(e.item, profile.restrictions).allowed);

  const daily = profile.daily;
  const hasTarget = daily.caloriesKcal !== null || daily.proteinG !== null;
  const target = mealShare(daily, profile.mealsPerDay);
  const targetLabel = profile.mealsPerDay === 1 ? "your whole-day targets" : `1/${profile.mealsPerDay} of your daily targets, for this meal`;
  const exclude = useMemo(() => new Set(excluded[ctx] ?? []), [excluded, ctx]);
  const plan = useMemo(
    () => (meal && hasTarget ? planMeal(meal.items, target, profile.restrictions, { exclude }) : null),
    // target derives from profile
    [meal, hasTarget, profile, exclude],
  );

  const setTray = (next: Picked[]) => setTrays((t) => ({ ...t, [ctx]: next }));
  const addItem = (item: MenuItem) => {
    if (!checkRestrictions(item, profile.restrictions).allowed) return; // same gate as the planner
    const current = trays[ctx] ?? [];
    const found = current.find((p) => p.id === item.id);
    setTray(found ? current.map((p) => (p.id === item.id ? { ...p, servings: Math.min(MAX_SERVINGS, p.servings + 1) } : p)) : [...current, { id: item.id, servings: 1 }]);
  };
  const setServings = (id: string, servings: number) => {
    const current = trays[ctx] ?? [];
    setTray(servings <= 0 ? current.filter((p) => p.id !== id) : current.map((p) => (p.id === id ? { ...p, servings } : p)));
  };
  const applyOption = (option: PlanOption) => {
    setTray(option.entries.filter((e) => checkRestrictions(e.item, profile.restrictions).allowed).map((e) => ({ id: e.item.id, servings: e.servings })));
    document.getElementById("plate-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const header = (
    <header className="bg-brand text-on-brand">
      <div className="mx-auto max-w-xl px-4 py-4">
        <h1 className="text-2xl font-bold tracking-tight" translate="no">TerrierTray</h1>
        <p className="text-sm">Portion planner for BU dining halls · unofficial student project</p>
      </div>
    </header>
  );

  if (index.state !== "ready") {
    return (
      <>
        {header}
        <main className="mx-auto max-w-xl px-4 py-6">
          {index.state === "loading" ? (
            <div aria-busy="true" aria-label="Loading menus…" className="space-y-3">
              <div className="h-11 animate-pulse rounded-lg bg-sunken" />
              <div className="h-40 animate-pulse rounded-2xl bg-sunken" />
            </div>
          ) : (
            <Notice tone="danger" title="Menus unavailable">
              {index.message}
            </Notice>
          )}
        </main>
      </>
    );
  }

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-10 focus:rounded-lg focus:bg-surface focus:p-3">
        Skip to content
      </a>
      {header}

      <div className="mx-auto max-w-xl px-4">
        <div className="mt-4 grid grid-cols-1 gap-3 min-[26rem]:grid-cols-2">
          <div>
            <label htmlFor="hall" className="block font-semibold">
              Dining hall
            </label>
            <select
              id="hall"
              value={hall?.id ?? ""}
              onChange={(e) => {
                setHallId(e.target.value);
                setMealName(null);
              }}
              className="mt-1 min-h-11 w-full rounded-lg border border-control bg-surface px-3 text-ink"
            >
              {data!.halls.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                  {h.dates.length === 0 ? " (no menu yet)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="date" className="block font-semibold">
              Day
            </label>
            <select
              id="date"
              value={activeDate ?? ""}
              disabled={dates.length === 0}
              onChange={(e) => {
                setDate(e.target.value);
                setMealName(null);
              }}
              className="mt-1 min-h-11 w-full rounded-lg border border-control bg-surface px-3 text-ink disabled:opacity-60"
            >
              {dates.length === 0 && <option value="">No dates</option>}
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d === today ? `Today, ${formatDate(d, "short")}` : formatDate(d)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm">
          <span className="font-semibold">{restrictionSummary(profile.restrictions)}</span>
          <Button variant="quiet" className="min-h-11 px-2 text-sm" onClick={() => setTab("settings")}>
            Edit
          </Button>
        </p>

        {meals.length > 0 && (
          <div className="mt-2" role="group" aria-label="Meal">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(8.75rem,100%),1fr))] gap-2">
              {meals.map((m, i) => {
                const selected = m === meal;
                const range = parseHours(m.hours);
                const now = activeDate === today && range ? nyMinutes() : null;
                const live = now !== null && range && now >= range[0] && now < range[1];
                const next = activeDate === today && i === defaultMeal && !live;
                return (
                  <button
                    key={m.name}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setMealName(m.name)}
                    className={`min-h-11 rounded-xl border px-3 py-1.5 text-left ${selected ? "border-ink bg-ink text-page" : "border-control bg-surface text-ink hover:bg-sunken"}`}
                  >
                    <span className="block font-semibold">
                      {m.name}
                      {live ? " · now" : next ? " · next" : ""}
                    </span>
                    <span className={`block text-sm tnum ${selected ? "" : "text-muted"}`}>{formatHours(m.hours) ?? "Hours not listed"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <nav aria-label="Views" className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(5.5rem,100%),1fr))] gap-1 rounded-xl bg-sunken p-1">
          {(
            [
              ["plan", "Plan"],
              ["menu", "Menu"],
              ["settings", "Settings"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id)}
              className={`min-h-11 rounded-lg font-semibold ${tab === id ? "bg-brand text-on-brand shadow-[0_1px_3px_rgb(23_18_11/0.15)]" : "text-muted hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <main id="main" className="mx-auto max-w-xl px-4 pt-5 pb-16">
        {tab === "settings" ? (
          <Settings
            profile={profile}
            onChange={setProfile}
            remember={remember}
            onRemember={(on) => {
              setRemember(on);
              if (!on) clearProfile();
            }}
            onDeleteSaved={() => {
              clearProfile();
              setRemember(false);
              setProfile(DEFAULT_PROFILE);
            }}
          />
        ) : !hall || hall.dates.length === 0 ? (
          <Notice tone="warn" title={hall ? `${hall.name}: no menu yet` : "No menus collected"}>
            {hall?.note ?? "Menus have not been collected yet."} Check the{" "}
            <a href={hall?.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              official menu page
            </a>
            .
          </Notice>
        ) : !day || day.state === "loading" ? (
          <div aria-busy="true" aria-label="Loading this day’s menu…" className="space-y-3">
            <div className="h-24 animate-pulse rounded-2xl bg-sunken" />
            <div className="h-48 animate-pulse rounded-2xl bg-sunken" />
          </div>
        ) : day.state === "error" ? (
          <Notice tone="danger" title="This menu didn't load">
            {day.message}
          </Notice>
        ) : !meal ? (
          <Notice title="Nothing posted for this day">The dining hall page lists no meals for {formatDate(activeDate!)}. It may be closed or the menu isn't posted.</Notice>
        ) : (
          <>
            <div className="mb-5 space-y-3">
              {hall.status === "stale_after_failure" && (
                <Notice tone="warn" title="Showing an older snapshot">
                  The last refresh{hall.lastAttemptAt ? ` (${formatTimestamp(hall.lastAttemptAt)})` : ""} failed. These dishes may have changed.
                </Notice>
              )}
              {activeDate! < today && (
                <Notice tone="warn" title={`This is ${formatDate(activeDate!)}'s menu`}>
                  No newer menu has been collected for this hall yet. Check the official page for today.
                </Notice>
              )}
              <p className="text-sm text-muted">
                {freshness(hall, activeDate!, today)} Availability can change during service.
              </p>
            </div>

            {tab === "plan" ? (
              <>
                <section aria-labelledby="plate-heading">
                  <h2 id="plate-heading" className="mb-3 scroll-mt-4 text-lg font-bold">
                    Your {meal.name.toLowerCase()} plate
                  </h2>
                  {conflicts.length > 0 && (
                    <div className="mb-3">
                      <Notice tone="danger" title="Something on your plate no longer fits your restrictions">
                        <p>{conflicts.map((c) => c.item.name).join(", ")}</p>
                        <Button className="mt-2" onClick={() => setTray((trays[ctx] ?? []).filter((p) => !conflicts.some((c) => c.item.id === p.id)))}>
                          Remove {conflicts.length === 1 ? "it" : "them"}
                        </Button>
                      </Notice>
                    </div>
                  )}
                  <Plate meal={meal.name} entries={entries} target={hasTarget ? target : null} targetLabel={hasTarget ? targetLabel : null} onServings={setServings} onOpen={setOpenItem} />
                </section>

                <Section title="Suggested plates" id="suggest-heading">
                  {!hasTarget ? (
                    <Notice title="Add a target to get suggestions">
                      <p>Enter a daily calorie or protein target in Settings. TerrierTray splits it across your meals and finds dishes that fit.</p>
                      <Button variant="primary" className="mt-3" onClick={() => setTab("settings")}>
                        Set my targets
                      </Button>
                    </Notice>
                  ) : (
                    plan && (
                      <Suggestions
                        result={plan}
                        target={target}
                        targetLabel={targetLabel}
                        restrictions={profile.restrictions}
                        freshness={freshness(hall, activeDate!, today)}
                        excludedCount={exclude.size}
                        onUse={applyOption}
                        onNotThis={(item) => setExcluded((x) => ({ ...x, [ctx]: [...(x[ctx] ?? []), item.id] }))}
                        onResetExcluded={() => setExcluded((x) => ({ ...x, [ctx]: [] }))}
                        onOpen={setOpenItem}
                      />
                    )
                  )}
                </Section>
              </>
            ) : (
              <MenuList items={meal.items} restrictions={profile.restrictions} onPlate={onPlate} onAdd={addItem} onOpen={setOpenItem} />
            )}
          </>
        )}

        <footer className="mt-12 border-t border-line pt-4 text-sm text-muted">
          <p>{data!.allergyNotice}</p>
          <p className="mt-2">Not affiliated with or endorsed by Boston University. Menu facts come from BU Dining; suggestions are estimates, not medical or dietary advice.</p>
        </footer>
      </main>

      <DishDialog item={openItem} restrictions={profile.restrictions} meal={meal?.name ?? ""} onAdd={addItem} onClose={() => setOpenItem(null)} />
    </>
  );
}
