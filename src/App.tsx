import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DishDialog } from "./components/DishDialog";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { Button, Headline, Icon, Notice, Pill, Section } from "./components/ui";
import { useDayMenu, useDayMenus, useMenuIndex, useNow, type Load } from "./data";
import { DailySummary } from "./features/DailySummary";
import { aggregateDailyTrays } from "./lib/daily-totals";
import { MenuList } from "./features/MenuList";
import { MAX_SERVINGS, Plate } from "./features/Plate";
import { Settings } from "./features/Settings";
import { Suggestions } from "./features/Suggestions";
import { MealTimeline, type PlannedSummary } from "./features/MealTimeline";
import { Week } from "./features/Week";
import { eligibility } from "./lib/freshness";
import type { TrayEntry } from "./lib/nutrition";
import { mealShare, planMeal, type PlanOption } from "./lib/planner";
import { clearProfile, DEFAULT_PROFILE, loadProfile, saveProfile, type Profile } from "./lib/profile-storage";
import { checkRestrictions, type Restrictions } from "./lib/restrictions";
import type { DayMenu, HallEntry, Meal, MenuIndex, MenuItem } from "./lib/schema";
import { formatDate, formatTimestamp, nyDate, nyMinutes, parseHours, pickMealIndex } from "./lib/time";

type Tab = "plan" | "week" | "menu" | "settings";
type Picked = { id: string; servings: number };

const VIEWS = [
  ["plan", "Plan", "plate"],
  ["week", "Week", "calendar"],
  ["menu", "Menu", "menu"],
  ["settings", "Settings", "settings"],
] as const;

/** Capture the arrival choice once; ordinary form updates never restart motion. */
function ViewContent({ children, animate, className }: { children: ReactNode; animate: boolean; className: string }) {
  const [arrive] = useState(animate);
  return <main id="main" className={`${className}${arrive ? " view-enter" : ""}`}>{children}</main>;
}

const initialSaved = loadProfile();
const initialUrl = new URLSearchParams(window.location.search);

function pickDate(dates: string[], today: string): string | null {
  if (dates.includes(today)) return today;
  return dates.find((d) => d > today) ?? dates.at(-1) ?? null;
}

function restrictionSummary(r: Restrictions) {
  const parts: string[] = [];
  if (r.allergyAnswer === "unanswered") parts.push("Allergies not set");
  else if (r.allergyAnswer === "none") parts.push("No allergens filtered");
  else if (r.avoidAllergens.length === 0) parts.push("Allergens not chosen");
  else parts.push(`Avoiding ${r.avoidAllergens.join(", ")}`);
  if (r.requireTags.length) parts.push(r.requireTags.join(" + "));
  return parts.join(" · ");
}

function freshness(hall: HallEntry) {
  return hall.lastSuccessfulFetchAt ? `From BU Dining, fetched ${formatTimestamp(hall.lastSuccessfulFetchAt)}` : "From a saved BU Dining snapshot; fetch time not recorded";
}

export default function App() {
  const index = useMenuIndex();
  const [profile, setProfile] = useState<Profile>(initialSaved ?? DEFAULT_PROFILE);
  const [remember, setRemember] = useState(initialSaved !== null);
  // Hall/date/meal/view live in the URL (shareable, non-personal); the profile never does.
  const [tab, setTab] = useState<Tab>(() => (["plan", "week", "menu", "settings"].includes(initialUrl.get("view") ?? "") ? (initialUrl.get("view") as Tab) : "plan"));
  const [hallId, setHallId] = useState<string | null>(initialUrl.get("hall"));
  const [date, setDate] = useState<string | null>(initialUrl.get("date"));
  const [mealName, setMealName] = useState<string | null>(initialUrl.get("meal"));
  const [trays, setTrays] = useState<Record<string, Picked[]>>({});
  const [excluded, setExcluded] = useState<Record<string, string[]>>({});
  const [openItem, setOpenItem] = useState<MenuItem | null>(null);
  /** Set when a dish is opened from the week view (another day or meal than the plate). */
  const [openFromWeek, setOpenFromWeek] = useState<string | null>(null);
  const [focusPlateAfterWeek, setFocusPlateAfterWeek] = useState(false);
  const [focusHome, setFocusHome] = useState(false);
  const [navigationMotion, setNavigationMotion] = useState(true);
  const today = nyDate();

  useEffect(() => {
    if (remember) saveProfile(profile);
  }, [profile, remember]);

  const data: MenuIndex | null = index.state === "ready" ? index.data : null;
  // Fenway (Sodexo API) is deferred: its code and index entry remain, but it is not offered as a choice.
  const halls = data?.halls.filter((h) => h.source === "bu-html") ?? [];
  const hall = halls.find((h) => h.id === hallId) ?? halls.find((h) => h.dates.length > 0) ?? null;
  const dates = hall?.dates.map((d) => d.date) ?? [];
  const activeDate = date && dates.includes(date) ? date : pickDate(dates, today);
  const file = hall?.dates.find((d) => d.date === activeDate)?.file ?? null;
  const day = useDayMenu(file, data?.dataVersion ?? null);
  const dailyReferences = useMemo(() => {
    if (tab !== "plan" || !activeDate || !data) return [];
    const plannedHalls = new Set(Object.entries(trays).flatMap(([context, picks]) => {
      const [id, date] = context.split("/");
      return date === activeDate && picks.length > 0 ? [id] : [];
    }));
    return data.halls.filter((h) => h.source === "bu-html" && plannedHalls.has(h.id)).flatMap((h) => {
      const entry = h.dates.find((d) => d.date === activeDate);
      return entry ? [{ hallId: h.id, file: entry.file }] : [];
    });
  }, [tab, activeDate, data, trays]);
  const dailyLoads = useDayMenus(dailyReferences.map((entry) => entry.file), data?.dataVersion ?? null);
  const dailyMenus: Record<string, Load<DayMenu> | undefined> = Object.fromEntries(dailyReferences.map((entry) => [
    entry.hallId, entry.file === file && day ? day : dailyLoads[entry.file] ?? { state: "loading" },
  ]));
  const dailySummary = aggregateDailyTrays(trays, activeDate ?? "", dailyMenus);

  const meals = day?.state === "ready" ? day.data.meals : [];
  const defaultMeal = activeDate === today ? pickMealIndex(meals, nyMinutes()) : 0;
  const meal = meals.find((m) => m.name === mealName) ?? meals[defaultMeal] ?? null;
  const ctx = `${hall?.id}/${activeDate}/${meal?.name}`;

  useEffect(() => {
    if (!focusHome || tab !== "plan" || day?.state === "loading") return;
    const heading = document.getElementById("page-title");
    if (!heading) return;
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ behavior: "instant", block: "start" });
    setFocusHome(false);
  }, [focusHome, tab, ctx, day?.state, index.state]);

  useEffect(() => {
    if (!focusPlateAfterWeek) return;
    if (tab !== "plan" || day?.state === "error") {
      setFocusPlateAfterWeek(false);
      return;
    }
    const heading = document.getElementById("plate-heading");
    if (!heading) return; // Another day's menu may still be loading.
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ behavior: "instant", block: "start" });
    setFocusPlateAfterWeek(false);
  }, [focusPlateAfterWeek, tab, ctx, day?.state]);

  useEffect(() => {
    if (!hall) return;
    const q = new URLSearchParams({ hall: hall.id, view: tab });
    if (activeDate && date) q.set("date", activeDate);
    if (meal && mealName) q.set("meal", meal.name);
    history.replaceState(null, "", `?${q}`);
  }, [hall, activeDate, date, meal, mealName, tab]);

  const nowMinutes = nyMinutes();
  const liveIndex = (() => {
    if (activeDate !== today) return null;
    const i = meals.findIndex((m) => {
      const r = parseHours(m.hours);
      return r !== null && nowMinutes >= r[0] && nowMinutes < r[1];
    });
    return i === -1 ? null : i;
  })();
  const plannedFor = (m: Meal): PlannedSummary => {
    const picks = trays[`${hall?.id}/${activeDate}/${m.name}`] ?? [];
    const items = new Map(m.items.map((i) => [i.id, i]));
    let kcal = 0;
    let complete = true;
    let dishes = 0;
    for (const p of picks) {
      const item = items.get(p.id);
      if (!item) continue;
      dishes++;
      if (item.caloriesKcal === null) complete = false;
      else kcal += item.caloriesKcal * p.servings;
    }
    return { dishes, kcal, complete };
  };
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
  const now = useNow();
  const elig = data && hall && activeDate ? eligibility(data, hall.id, activeDate, now) : null;
  const canSuggest = elig?.canRecommend ?? false;
  // Checked again at click time, since a tab can sit open past the freshness limit.
  const stillEligible = () => !!(data && hall && activeDate && eligibility(data, hall.id, activeDate, new Date()).canRecommend);
  const plan = useMemo(
    () => (tab === "plan" && meal && hasTarget && canSuggest ? planMeal(meal.items, target, profile.restrictions, { exclude }) : null),
    // target derives from profile
    [tab, meal, hasTarget, canSuggest, profile, exclude],
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
    if (!stillEligible()) return;
    setTray(option.entries.filter((e) => checkRestrictions(e.item, profile.restrictions).allowed).map((e) => ({ id: e.item.id, servings: e.servings })));
    document.getElementById("plate-heading")?.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  };
  /** Put a week-view meal on that day's own plate and open it in the Plan tab. */
  const applyWeekMeal = (day: string, mealName: string, option: PlanOption) => {
    if (!data || !hall || !eligibility(data, hall.id, day, new Date()).canRecommend) return;
    const picked = option.entries.filter((e) => checkRestrictions(e.item, profile.restrictions).allowed).map((e) => ({ id: e.item.id, servings: e.servings }));
    setTrays((t) => ({ ...t, [`${hall.id}/${day}/${mealName}`]: picked }));
    setDate(day);
    setMealName(mealName);
    setFocusPlateAfterWeek(true);
    setTab("plan");
  };

  /** Jump to the model calculator in Settings and move focus to its heading. */
  const openCalculator = () => {
    setTab("settings");
    setTimeout(() => {
      const heading = document.getElementById("calorie-model");
      heading?.setAttribute("tabindex", "-1");
      heading?.scrollIntoView({ block: "start" });
      heading?.focus();
    }, 50);
  };

  const brand = (
      <header key="brand" className="app-header app-width intro-header">
        <a href="?view=plan" aria-label="TerrierTrays home" className="brand-lockup" onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
          event.preventDefault();
          setNavigationMotion(event.detail > 0);
          setTab("plan");
          setFocusHome(true);
        }}>
          <img src="/brand/terriertrays-logo.png" width="64" height="64" alt="" className="brand-mark" />
          <h1 className="brand-name" translate="no">
            TerrierTrays
          </h1>
        </a>
        <nav aria-label="Views" className="view-nav" data-motion={navigationMotion}>
          <div className="view-highlight" aria-hidden="true" style={{ transform: `translateX(${VIEWS.findIndex(([id]) => id === tab) * 100}%)` }}>
            <div className="view-highlight-labels" style={{ transform: `translateX(${-VIEWS.findIndex(([id]) => id === tab) * 25}%)` }}>
              {VIEWS.map(([id, label, icon]) => <span key={id} className="view-highlight-label"><Icon name={icon} className="size-[18px]" />{label}</span>)}
            </div>
          </div>
          {VIEWS.map(([id, label, icon]) => (
            <button key={id} type="button" aria-current={tab === id ? "page" : undefined} onClick={(event) => {
              setNavigationMotion(event.detail > 0);
              setTab(id);
            }} className="view-link">
              <Icon name={icon} className="size-[18px]" />
              {label}
            </button>
          ))}
        </nav>
        <ThemeSwitcher />
      </header>
  );

  if (index.state !== "ready") {
    return (
      <>
        {brand}
        <main className="app-width py-8">
          {index.state === "loading" ? (
            <div aria-busy="true" aria-label="Loading menus…" className="max-w-xl space-y-3">
              <div className="h-16 motion-safe:animate-pulse rounded-[var(--radius-card)] bg-sunken" />
              <div className="h-48 motion-safe:animate-pulse rounded-[var(--radius-card)] bg-sunken" />
            </div>
          ) : (
            <div className="max-w-xl">
              <Notice tone="danger" title="Menus unavailable">
                {index.message}
              </Notice>
            </div>
          )}
        </main>
      </>
    );
  }

  const dishCount = meal?.items.length ?? 0;
  const headline: [string, string] =
    tab === "settings"
      ? ["Your preferences,", "on your terms."]
      : tab === "week"
        ? ["A week of BU meals,", "one plate at a time."]
        : tab === "menu"
          ? ["On the menu at", `${hall?.name ?? "BU"}.`]
          : meal
            ? [`${meal.name} at`, `${hall?.name}.`]
            : ["Your next BU meal,", "a little more you."];

  const heroLoading = tab === "plan" && day?.state === "loading";

  const freshTone = !elig ? "neutral" : elig.canRecommend ? "ok" : elig.status === "not_validated" ? "neutral" : "warn";
  const freshLabel = !elig ? "Not checked" : elig.canRecommend ? "Fresh" : elig.status === "missing_date" ? "Not all halls posted" : elig.status === "not_validated" ? "Not checked" : "Older than 24 hours";

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-10 focus:rounded-full focus:bg-surface-solid focus:px-4 focus:py-3">
        Skip to content
      </a>
      {brand}

      <div className="app-width">
        <div className="planner-hero intro-hero">
          <div className="hero-copy">
            <p className="hero-date">{activeDate ? formatDate(activeDate) : "Boston University dining"}</p>
            {/* Hidden (space kept) until the day menu loads, so the fallback headline doesn't flash before the real one. */}
            <div className={heroLoading ? "invisible" : undefined} aria-hidden={heroLoading || undefined}>
              <Headline id="page-title" statement={headline[0]} feeling={headline[1]} />
            </div>
            {tab === "menu" && <p className="hero-description">{meal ? `${meal.name} · ${dishCount} ${dishCount === 1 ? "dish" : "dishes"}` : "Choose a day and meal"}</p>}
            {tab === "plan" && <div className="hero-actions">
              <Button variant="primary" onClick={openCalculator}>{daily.caloriesKcal !== null ? "Adjust my calorie target" : "Estimate my calories"}<Icon name="arrow" className="size-[18px]" /></Button>
              <Button variant="quiet" onClick={() => setTab("menu")}>Browse the menu</Button>
            </div>}
          </div>

          <div className="context-card">
            <div className="context-heading"><span>Your dining hall</span><Icon name="pin" className="size-5 text-brand-ink" /></div>
            <div className="context-fields">
              <div>
                <label htmlFor="hall" className="block text-sm font-semibold">
                  Dining hall
                </label>
                <select
                  id="hall"
                  value={hall?.id ?? ""}
                  onChange={(e) => {
                    setHallId(e.target.value);
                    setMealName(null);
                  }}
                  className="mt-1 min-h-11 w-full rounded-[var(--radius-inner)] border border-control bg-field px-3 text-ink"
                >
                  {halls.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name.replace(" Towers", "").replace(" Commons", "")}
                      {h.dates.length === 0 ? " (no menu yet)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="date" className="block text-sm font-semibold">
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
                  className="mt-1 min-h-11 w-full rounded-[var(--radius-inner)] border border-control bg-field px-3 text-ink disabled:opacity-60"
                >
                  {dates.length === 0 && <option value="">No dates</option>}
                  {dates.map((d) => (
                    <option key={d} value={d}>
                      {d === today ? "Today" : formatDate(d, "short").replace(/^[^,]+, /, "")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {tab !== "settings" && <div className="restriction-summary">
              <span className="text-sm text-muted">{restrictionSummary(profile.restrictions)}</span>
              <Button variant="quiet" className="min-h-11 px-3 text-sm" onClick={() => setTab("settings")}>
                Edit
              </Button>
            </div>}
          </div>
        </div>

        {meals.length > 0 && tab !== "settings" && (
          <div className="meal-schedule intro-meals">
            <MealTimeline
              meals={meals}
              selected={meal}
              liveIndex={liveIndex}
              nextIndex={liveIndex === null && activeDate === today ? defaultMeal : null}
              planned={plannedFor}
              onSelect={(m) => setMealName(m.name)}
            />
          </div>
        )}

      </div>

      <ViewContent key={tab === "plan" ? `${tab}/${ctx}` : tab} animate={navigationMotion} className={`app-width app-main view-${tab}`}>
        {tab === "plan" && activeDate && <DailySummary date={activeDate} summary={dailySummary} targets={profile.daily} />}
        {tab === "settings" ? (
          <div className="rise max-w-2xl">
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
          </div>
        ) : !hall || hall.dates.length === 0 ? (
          <div className="max-w-xl">
            <Notice tone="warn" title={hall ? `${hall.name}: no menu yet` : "No menus collected"}>
              {hall?.note ?? "Menus have not been collected yet."} Check the{" "}
              <a href={hall?.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                official menu page
              </a>
              .
            </Notice>
          </div>
        ) : !day || day.state === "loading" ? (
          <div aria-busy="true" aria-label="Loading this day’s menu…" className="max-w-xl space-y-3">
            <div className="h-28 motion-safe:animate-pulse rounded-[var(--radius-card)] bg-sunken" />
            <div className="h-56 motion-safe:animate-pulse rounded-[var(--radius-card)] bg-sunken" />
          </div>
        ) : day.state === "error" ? (
          <div className="max-w-xl">
            <Notice tone="danger" title="This menu didn't load">
              {day.message}
            </Notice>
          </div>
        ) : !meal ? (
          <div className="max-w-xl">
            <Notice title="Nothing posted for this day">The dining hall page lists no meals for {formatDate(activeDate!)}. It may be closed or the menu isn't posted.</Notice>
          </div>
        ) : (
          <>
            <div className="rise mb-6 space-y-3">
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
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                <Pill tone={freshTone}>{freshLabel}</Pill>
                <span>
                  {freshness(hall)}
                </span>
              </p>
            </div>

            {tab === "week" ? (
              <div className="rise [--i:1]">
                <Week
                  index={data!}
                  hall={hall}
                  start={activeDate!}
                  profile={profile}
                  now={now}
                  onUse={applyWeekMeal}
                  onOpen={(item, mealName) => {
                    setOpenFromWeek(mealName);
                    setOpenItem(item);
                  }}
                />
              </div>
            ) : tab === "plan" ? (
              <div className="plan-workspace">
                <section aria-labelledby="plate-heading" className="plate-column">
                  <h3 id="plate-heading" tabIndex={-1} className="mb-3 scroll-mt-4 text-lg font-semibold tracking-[-0.01em]">
                    Your {meal.name.toLowerCase()} plate
                  </h3>
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

                <div className="suggestions-column">
                  <Section title="Suggested plates" id="suggest-heading">
                    {!hasTarget ? (
                      <div className="target-onboarding">
                        <div className="target-symbol" aria-hidden="true"><Icon name="sliders" className="size-7" /></div>
                        <h4 className="text-xl font-medium">A starting point for your plate</h4>
                        <p className="mt-2 text-muted">Set a daily calorie target to get suggested plates.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button variant="primary" onClick={openCalculator}>
                            Estimate my calories
                          </Button>
                          <Button onClick={() => setTab("settings")}>Type my own targets</Button>
                        </div>
                      </div>
                    ) : !canSuggest ? (
                      <Notice tone="warn" title="Suggestions are off for this day">
                        <p>{elig?.message}</p>
                        <p className="mt-1">You can still add dishes from the Menu tab.</p>
                      </Notice>
                    ) : (
                      plan && (
                        <Suggestions
                          result={plan}
                          target={target}
                          targetLabel={targetLabel}
                          restrictions={profile.restrictions}
                          freshness={freshness(hall)}
                          excludedCount={exclude.size}
                          onUse={applyOption}
                          onNotThis={(item) => stillEligible() && setExcluded((x) => ({ ...x, [ctx]: [...(x[ctx] ?? []), item.id] }))}
                          onResetExcluded={() => setExcluded((x) => ({ ...x, [ctx]: [] }))}
                          onOpen={setOpenItem}
                        />
                      )
                    )}
                  </Section>
                </div>
              </div>
            ) : (
              <div className="menu-content">
                <MenuList items={meal.items} restrictions={profile.restrictions} onPlate={onPlate} onAdd={addItem} onOpen={setOpenItem} />
              </div>
            )}
          </>
        )}

        <footer className="mt-14 max-w-[70ch] border-t border-line pt-4 text-sm text-muted">
          <p>{data!.allergyNotice} Not affiliated with Boston University. Suggestions are estimates, not medical or dietary advice.</p>
        </footer>
      </ViewContent>

      <DishDialog
        item={openItem}
        restrictions={profile.restrictions}
        meal={openFromWeek ?? meal?.name ?? ""}
        onAdd={openFromWeek ? undefined : addItem}
        onClose={() => {
          setOpenItem(null);
          setOpenFromWeek(null);
        }}
      />
    </>
  );
}
