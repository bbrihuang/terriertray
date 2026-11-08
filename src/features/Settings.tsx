import { useId, useState } from "react";
import type { MealTargets } from "../lib/planner";
import { MAX_DAILY_TARGET, type Profile } from "../lib/profile-storage";
import { ALLERGENS, DIET_TAGS, type Restrictions } from "../lib/restrictions";
import { TargetCalculator } from "./TargetCalculator";
import { Button, Section } from "../components/ui";
import { AppearanceControl } from "../components/ThemeSwitcher";

type Props = {
  profile: Profile;
  onChange: (p: Profile) => void;
  remember: boolean;
  onRemember: (on: boolean) => void;
  onDeleteSaved: () => void;
};

const TARGETS: [keyof MealTargets, string, string][] = [
  ["caloriesKcal", "Calories", "kcal"],
  ["proteinG", "Protein", "g"],
  ["carbsG", "Carbohydrate", "g"],
  ["fatG", "Fat", "g"],
];

const box = "size-5 shrink-0 accent-[var(--brand-ink)]";

export function Settings({ profile, onChange, remember, onRemember, onDeleteSaved }: Props) {
  const id = useId();
  const r = profile.restrictions;
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [calculatorKey, setCalculatorKey] = useState(0);

  const setR = (patch: Partial<Restrictions>) => onChange({ ...profile, restrictions: { ...r, ...patch } });

  const toggleAllergen = (a: string, on: boolean) => {
    if (on) setR({ avoidAllergens: [...r.avoidAllergens, a] });
    else setConfirmRemove(a); // removing a filter is deliberate
  };

  const setTarget = (key: keyof MealTargets, raw: string) => {
    const n = raw.trim() === "" ? null : Number(raw);
    const value = n !== null && Number.isFinite(n) && n > 0 ? Math.min(n, MAX_DAILY_TARGET) : null;
    onChange({ ...profile, daily: { ...profile.daily, [key]: value } });
  };

  return (
    <div>
      <Section card title="Appearance" id={`${id}-appearance`}>
        <AppearanceControl />
      </Section>

      <Section card title="Food allergies" id="food-allergies">
        <fieldset>
          <legend className="sr-only">Do you need to avoid any allergens?</legend>
          <div className="space-y-1">
            {(
              [
                ["some", "Yes, I want to avoid some allergens"],
                ["none", "No allergens to filter"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex min-h-11 items-center gap-3">
                <input type="radio" name={`${id}-answer`} checked={r.allergyAnswer === value} onChange={() => setR({ allergyAnswer: value })} className={box} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {r.allergyAnswer === "some" && (
          <fieldset className="mt-4 border-t border-line pt-4">
            <legend className="font-semibold">Avoid dishes whose label or ingredients list</legend>
            <div className="grid grid-cols-1 gap-x-4 min-[22rem]:grid-cols-2">
              {ALLERGENS.map((a) => (
                <label key={a} className="flex min-h-11 items-center gap-3">
                  <input type="checkbox" checked={r.avoidAllergens.includes(a)} onChange={(e) => toggleAllergen(a, e.target.checked)} className={box} />
                  {a}
                </label>
              ))}
            </div>
            {confirmRemove && (
              <div className="mt-3 rounded-[var(--radius-inner)] border border-brand bg-brand-soft p-3" role="group" aria-label="Confirm removing an allergen filter">
                <p className="font-semibold">Stop filtering {confirmRemove}?</p>
                <p className="text-sm text-muted">Dishes listing {confirmRemove} will appear in suggestions again.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      setR({ avoidAllergens: r.avoidAllergens.filter((x) => x !== confirmRemove) });
                      setConfirmRemove(null);
                    }}
                  >
                    Stop filtering {confirmRemove}
                  </Button>
                  <Button variant="quiet" onClick={() => setConfirmRemove(null)}>
                    Keep filtering
                  </Button>
                </div>
              </div>
            )}
            <label className="mt-3 flex min-h-11 items-start gap-3 border-t border-line pt-3">
              <input type="checkbox" checked={r.strictUnknown} onChange={(e) => setR({ strictUnknown: e.target.checked })} className={`${box} mt-0.5`} />
              <span>
                Hide dishes with missing allergen information
                <span className="block text-sm text-muted">BU leaves the allergen list empty for many dishes; empty does not mean allergen-free.</span>
              </span>
            </label>
          </fieldset>
        )}
        <p className="mt-3 text-sm text-muted">
          Kitchens share equipment and recipes change. If you have an allergy, confirm with dining staff.
        </p>
      </Section>

      <Section card title="Diet labels" id={`${id}-diet`}>
        <fieldset>
          <legend className="text-muted">Only include dishes the dining hall labels as:</legend>
          <div className="mt-1 grid grid-cols-1 gap-x-4 min-[22rem]:grid-cols-2">
            {DIET_TAGS.map((t) => (
              <label key={t} className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={r.requireTags.includes(t)}
                  onChange={(e) => setR({ requireTags: e.target.checked ? [...r.requireTags, t] : r.requireTags.filter((x) => x !== t) })}
                  className={box}
                />
                {t}
              </label>
            ))}
          </div>
        </fieldset>
      </Section>

      <Section card title="Estimate calories with our model" id="calorie-model">
        <TargetCalculator key={calculatorKey} currentKcal={profile.daily.caloriesKcal} onApply={(kcal, macros) => onChange({ ...profile, daily: { ...profile.daily, ...macros, caloriesKcal: kcal } })} />
      </Section>

      <Section card title="Daily targets" id="daily-targets">
        <p className="text-muted">Leave blank anything you don't track.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 min-[22rem]:grid-cols-2">
          {TARGETS.map(([key, label, unit]) => (
            <div key={key}>
              <label htmlFor={`${id}-${key}`} className="block font-semibold">
                {label} <span className="font-normal text-muted">({unit} per day)</span>
              </label>
              <input
                id={`${id}-${key}`}
                type="number"
                name={`daily-${key}`}
                autoComplete="off"
                inputMode={key === "caloriesKcal" ? "numeric" : "decimal"}
                min={key === "caloriesKcal" ? 1 : 0.1}
                max={MAX_DAILY_TARGET}
                step={key === "caloriesKcal" ? 1 : 0.1}
                value={profile.daily[key] ?? ""}
                onChange={(e) => setTarget(key, e.target.value)}
                className="mt-1 min-h-11 w-full rounded-[var(--radius-inner)] border border-control bg-field px-3 text-ink tnum"
              />
            </div>
          ))}
        </div>
        <label htmlFor={`${id}-meals`} className="mt-4 block font-semibold">
          Dining-hall meals per day
        </label>
        <select
          id={`${id}-meals`}
          value={profile.mealsPerDay}
          onChange={(e) => onChange({ ...profile, mealsPerDay: Number(e.target.value) })}
          className="mt-1 min-h-11 w-full rounded-[var(--radius-inner)] border border-control bg-field px-3 text-ink"
        >
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "meal" : "meals"}: each plate aims for {n === 1 ? "the whole day" : `1/${n} of the day`}
            </option>
          ))}
        </select>
      </Section>

      <Section card title="Privacy on this device" id={`${id}-privacy`}>
        <p className="text-muted">Nothing you enter is sent anywhere.</p>
        <label className="mt-3 flex min-h-11 items-start gap-3">
          <input type="checkbox" checked={remember} onChange={(e) => onRemember(e.target.checked)} className={`${box} mt-0.5`} />
          <span>
            Remember my settings on this device
            <span className="block text-sm text-muted">Stored unencrypted; anyone using this browser could see them.</span>
          </span>
        </label>
        <div className="mt-3">
          {confirmDelete ? (
            <div className="rounded-[var(--radius-inner)] border border-danger/30 bg-danger-soft p-3" role="group" aria-label="Confirm deleting saved settings">
              <p className="font-semibold">Delete saved settings and reset this page?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    onDeleteSaved();
                    setCalculatorKey((key) => key + 1);
                    setConfirmDelete(false);
                  }}
                >
                  Delete and reset
                </Button>
                <Button variant="quiet" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setConfirmDelete(true)}>Delete my saved settings</Button>
          )}
        </div>
      </Section>
    </div>
  );
}
