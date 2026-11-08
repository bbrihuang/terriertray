import { useEffect, useMemo, useState } from "react";
import { DishDialog } from "./components/DishDialog";
import { Button, Headline, Notice, Pill, Section } from "./components/ui";
import { useDayMenu, useMenuIndex, useNow } from "./data";
import { MenuList } from "./features/MenuList";
import { MAX_SERVINGS, Plate } from "./features/Plate";
import { Settings } from "./features/Settings";
import { Suggestions } from "./features/Suggestions";
import { Week } from "./features/Week";
import { eligibility } from "./lib/freshness";
import type { TrayEntry } from "./lib/nutrition";
import { mealShare, planMeal, type PlanOption } from "./lib/planner";
import { clearProfile, DEFAULT_PROFILE, loadProfile, saveProfile, type Profile } from "./lib/profile-storage";
import { checkRestrictions, type Restrictions } from "./lib/restrictions";
import type { HallEntry, MenuIndex, MenuItem } from "./lib/schema";
import { formatDate, formatHours, formatTimestamp, nyDate, nyMinutes, parseHours, pickMealIndex } from "./lib/time";

type Tab = "plan" | "week" | "menu" | "settings";
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
  else if (r.allergyAnswer === "none") parts.push("No allergens filtered");
  else if (r.avoidAllergens.length === 0) parts.push("Allergens not chosen");
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
  const [tab, setTab] = useState<Tab>(() => (["plan", "week", "menu", "settings"].includes(initialUrl.get("view") ?? "") ? (initialUrl.get("view") as Tab) : "plan"));
  const [hallId, setHallId] = useState<string | null>(initialUrl.get("hall"));
  const [date, setDate] = useState<string | null>(initialUrl.get("date"));
  const [mealName, setMealName] = useState<string | null>(initialUrl.get("meal"));
  const [trays, setTrays] = useState<Record<string, Picked[]>>({});
  const [excluded, setExcluded] = useState<Record<string, string[]>>({});
  const [openItem, setOpenItem] = useState<MenuItem | null>(null);
  /** Set when a dish is opened from the week view (another day or meal than the plate). */
  const [openFromWeek, setOpenFromWeek] = useState<string | null>(null);
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
  const now = useNow();
  const elig = data && hall && activeDate ? eligibility(data, hall.id, activeDate, now) : null;
  const canSuggest = elig?.canRecommend ?? false;
  // Checked again at click time, since a tab can sit open past the freshness limit.
  const stillEligible = () => !!(data && hall && activeDate && eligibility(data, hall.id, activeDate, new Date()).canRecommend);
  const plan = useMemo(
    () => (meal && hasTarget && canSuggest ? planMeal(meal.items, target, profile.restrictions, { exclude }) : null),
    // target derives from profile
    [meal, hasTarget, canSuggest, profile, exclude],
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
    document.getElementById("plate-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  /** Put a week-view meal on that day's own plate and open it in the Plan tab. */
  const applyWeekMeal = (day: string, mealName: string, option: PlanOption) => {
    if (!data || !hall || !eligibility(data, hall.id, day, new Date()).canRecommend) return;
    const picked = option.entries.filter((e) => checkRestrictions(e.item, profile.restrictions).allowed).map((e) => ({ id: e.item.id, servings: e.servings }));
    setTrays((t) => ({ ...t, [`${hall.id}/${day}/${mealName}`]: picked }));
    setDate(day);
    setMealName(mealName);
    setTab("plan");
  };

  const brand = (
    <>
      <div className="blobs" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 pt-5">
        <div className="flex items-center gap-2.5">
          <PlateMark />
          <h1 className="text-xl font-semibold tracking-[-0.02em]" translate="no">
            TerrierTray
          </h1>
        </div>
        <p className="text-sm text-muted">Portion planner for BU dining halls · unofficial</p>
      </header>
    </>
  );

  if (index.state !== "ready") {
    return (
      <>
        {brand}
        <main className="mx-auto max-w-5xl px-5 py-8">
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
      ? ["Your settings.", "They stay on this device."]
      : tab === "week"
        ? [`Your week at ${hall?.name ?? "BU"}.`, "Planned meals, not eaten ones."]
        : tab === "menu"
          ? [`What’s on at ${hall?.name ?? "BU"}.`, meal ? `${meal.name}, ${dishCount} ${dishCount === 1 ? "dish" : "dishes"}.` : "Pick a day and meal."]
          : meal
            ? [`${meal.name} at ${hall?.name}.`, "Build a plate that fits your day."]
            : [`${hall?.name ?? "BU dining"}.`, "Pick a day and meal."];

  const freshTone = !elig ? "neutral" : elig.canRecommend ? "ok" : elig.status === "not_validated" ? "neutral" : "warn";
  const freshLabel = !elig ? "Not checked" : elig.canRecommend ? "Fresh" : elig.status === "missing_date" ? "Not all halls posted" : elig.status === "not_validated" ? "Not checked" : "Older than 24 hours";

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-10 focus:rounded-full focus:bg-surface-solid focus:px-4 focus:py-3">
        Skip to content
      </a>
      {brand}

      <div className="mx-auto max-w-5xl px-5">
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end lg:gap-10">
          <Headline statement={headline[0]} feeling={headline[1]} />

          <div className="glass p-4">
            <div className="grid grid-cols-1 gap-3 min-[26rem]:grid-cols-2">
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
                      {h.name}
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
                      {d === today ? `Today, ${formatDate(d, "short")}` : formatDate(d)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm">
              <span className="font-semibold">{restrictionSummary(profile.restrictions)}</span>
              <Button variant="quiet" className="min-h-11 px-3 text-sm" onClick={() => setTab("settings")}>
                Edit
              </Button>
            </p>
          </div>
        </div>

        {meals.length > 0 && tab !== "settings" && (
          <div className="mt-5" role="group" aria-label="Meal">
            <div className="flex flex-wrap gap-2">
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
                    className={`press min-h-11 min-w-[7.5rem] rounded-[18px] px-4 py-2 text-left ${selected ? "bg-action text-on-action" : "border border-rim bg-field text-ink shadow-[var(--shadow)] hover:bg-surface-solid"}`}
                  >
                    <span className="block font-semibold">
                      {m.name}
                      {live ? " · now" : next ? " · next" : ""}
                    </span>
                    <span className={`block text-sm tnum ${selected ? "opacity-85" : "text-muted"}`}>{formatHours(m.hours) ?? "Hours not listed"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <nav aria-label="Views" className="glass mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(4.25rem,100%),1fr))] gap-0.5 !rounded-full p-1 lg:max-w-md">
          {(
            [
              ["plan", "Plan"],
              ["week", "Week"],
              ["menu", "Menu"],
              ["settings", "Settings"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id)}
              className={`press min-h-11 rounded-full font-semibold ${tab === id ? "bg-tab-selected text-ink shadow-[0_2px_8px_rgb(30_20_60/0.12)]" : "text-muted hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <main id="main" key={tab} className="mx-auto max-w-5xl px-5 pt-6 pb-16">
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
                  {freshness(hall, activeDate!, today)} Availability can change during service.
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
              <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
                <section aria-labelledby="plate-heading" className="rise [--i:1] lg:sticky lg:top-5">
                  <h3 id="plate-heading" className="mb-3 scroll-mt-4 text-lg font-semibold tracking-[-0.01em]">
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

                <div className="rise [--i:2]">
                  <Section title="Suggested plates" id="suggest-heading">
                    {!hasTarget ? (
                      <Notice title="Add a target to get suggestions">
                        <p>Enter a daily calorie or protein target in Settings. TerrierTray splits it across your meals and finds dishes that fit.</p>
                        <Button variant="primary" className="mt-3" onClick={() => setTab("settings")}>
                          Set my targets
                        </Button>
                      </Notice>
                    ) : !canSuggest ? (
                      <Notice tone="warn" title="Suggestions are off for this day">
                        <p>{elig?.message}</p>
                        <p className="mt-1">You can still build a plate yourself from the Menu tab; check dishes against the official page.</p>
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
              <div className="rise [--i:1] max-w-2xl">
                <MenuList items={meal.items} restrictions={profile.restrictions} onPlate={onPlate} onAdd={addItem} onOpen={setOpenItem} />
              </div>
            )}
          </>
        )}

        <footer className="mt-14 max-w-2xl border-t border-line pt-4 text-sm text-muted">
          <p>{data!.allergyNotice}</p>
          <p className="mt-2">Not affiliated with or endorsed by Boston University. Menu facts come from BU Dining; suggestions are estimates, not medical or dietary advice.</p>
        </footer>
      </main>

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

/** Brand mark: a plate drawn as a pastel ring (not an assistant avatar). */
function PlateMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
      <defs>
        <linearGradient id="plate-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--blob-peach)" />
          <stop offset="0.5" stopColor="var(--blob-pink)" />
          <stop offset="1" stopColor="var(--blob-lavender)" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="12" fill="none" stroke="url(#plate-mark)" strokeWidth="5" />
      <circle cx="16" cy="16" r="5.5" fill="var(--ink)" opacity="0.9" />
    </svg>
  );
}
