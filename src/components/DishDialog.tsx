import { useEffect, useRef } from "react";
import { formatAmount } from "../lib/nutrition";
import { allergenHeadline, checkRestrictions, type Restrictions } from "../lib/restrictions";
import type { MenuItem } from "../lib/schema";
import { Button, Icon, IconButton } from "./ui";

type Props = {
  item: MenuItem | null;
  restrictions: Restrictions;
  meal: string;
  /** Omitted when the dish was opened outside the current plate (e.g. from the week view). */
  onAdd?: (item: MenuItem) => void;
  onClose: () => void;
};

const ROWS: [keyof MenuItem, string, string, boolean?][] = [
  ["caloriesKcal", "Calories", ""],
  ["fatG", "Total fat", "g"],
  ["saturatedFatG", "Saturated fat", "g", true],
  ["transFatG", "Trans fat", "g", true],
  ["cholesterolMg", "Cholesterol", "mg"],
  ["sodiumMg", "Sodium", "mg"],
  ["carbsG", "Total carbohydrate", "g"],
  ["fiberG", "Dietary fiber", "g", true],
  ["sugarsG", "Sugars", "g", true],
  ["proteinG", "Protein", "g"],
];

const DV: [keyof MenuItem["labelDvPercent"], string][] = [
  ["vitaminD", "Vitamin D"],
  ["calcium", "Calcium"],
  ["iron", "Iron"],
  ["potassium", "Potassium"],
];

export function DishDialog({ item, restrictions, meal, onAdd, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (item && !dialog.open) {
      returnTo.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      heading.current?.focus();
    } else if (!item && dialog.open) {
      dialog.close();
    }
  }, [item]);

  const handleClose = () => {
    onClose();
    returnTo.current?.focus();
  };

  const verdict = item ? checkRestrictions(item, restrictions) : null;
  // Facility / may-contain statements printed inside the ingredient text.
  const crossContact = [...new Set((item?.ingredients ?? "").match(/[^[(]*(?:processed in a facility|may contain|manufactured on)[^\])]*/gi) ?? [])]
    .map((s) => s.trim().replace(/^[,.\s]+/, ""))
    .filter(Boolean);

  return (
    <dialog
      ref={ref}
      onClose={handleClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-labelledby="dish-title"
      className="m-auto max-h-[90dvh] w-[min(36rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-[var(--radius-card)] border border-rim bg-surface-solid p-0 text-ink shadow-[0_24px_60px_rgb(30_20_60/0.18)]"
    >
      {item && verdict && (
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="dish-title" ref={heading} tabIndex={-1} className="text-xl font-semibold tracking-[-0.01em] text-balance break-words">
                {item.name}
              </h2>
              <p className="text-muted">
                {item.station ? `${item.station} · ` : ""}
                {meal}
              </p>
            </div>
            <IconButton label="Close dish details" icon="close" onClick={() => ref.current?.close()} />
          </div>

          <section aria-label="Restrictions" className={`mt-4 rounded-[var(--radius-inner)] border p-4 ${verdict.allowed ? "border-line bg-sunken" : "border-danger/30 bg-danger-soft"}`}>
            <p className="flex items-center gap-2 font-semibold">
              <Icon name={verdict.allowed ? "info" : "alert"} className={`size-5 ${verdict.allowed ? "" : "text-danger"}`} />
              {verdict.allowed ? allergenHeadline(verdict, restrictions) : "Doesn't fit your restrictions"}
            </p>
            {verdict.reasons.length > 0 && (
              <ul className="mt-2 list-disc pl-6">
                {verdict.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
            {crossContact.length > 0 && (
              <p className="mt-2 text-sm">
                <span className="font-semibold">Ingredient notes: </span>
                {crossContact.join("; ")}
              </p>
            )}
            <p className="mt-2 text-sm text-muted">
              Source allergens:{" "}
              {item.allergens === null ? "not provided for this dish" : item.allergens.length === 0 ? "none listed" : item.allergens.join(", ")}.
              {item.dietTags.length > 0 && ` Labels: ${item.dietTags.join(", ")}.`} Recipes can change and kitchens share equipment; confirm with dining staff if you have an allergy.
            </p>
          </section>

          {item.description && <p className="mt-4">{item.description}</p>}

          <section aria-labelledby="label-title" className="mt-5">
            <h3 id="label-title" className="font-bold">
              Nutrition per serving
            </h3>
            <p className="text-muted">Serving: {item.servingText ?? "not listed"}</p>
            {item.caloriesKcal === null ? (
              <p className="mt-2 rounded-[var(--radius-inner)] bg-sunken p-3">The source page has no nutrition label for this dish.</p>
            ) : (
              <table className="mt-2 w-full tnum">
                <caption className="sr-only">Nutrition facts as published</caption>
                <tbody>
                  {ROWS.map(([key, label, unit, sub]) => {
                    const v = item[key] as number | null;
                    return (
                      <tr key={key} className="border-b border-line last:border-0">
                        <th scope="row" className={`py-1.5 text-left font-normal ${sub ? "pl-4 text-muted" : ""}`}>
                          {label}
                        </th>
                        <td className="py-1.5 text-right font-semibold">{v === null ? "unknown" : formatAmount(v, unit ? ` ${unit}` : " kcal")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {DV.some(([k]) => item.labelDvPercent[k] !== null) && (
              <p className="mt-3 text-sm text-muted tnum">
                % Daily Value as printed on the label (general reference, not a personal target):{" "}
                {DV.map(([k, l]) => `${l} ${item.labelDvPercent[k] ?? "unknown"}${item.labelDvPercent[k] === null ? "" : "%"}`).join(", ")}
              </p>
            )}
          </section>

          {item.ingredients && (
            <details className="mt-4">
              <summary className="min-h-11 cursor-pointer py-2 font-semibold">Ingredients</summary>
              <p className="text-sm break-words text-muted">{item.ingredients}</p>
            </details>
          )}

          <p className="mt-3">
            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 underline">
              Check the official menu page
              <Icon name="external" className="size-4" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </p>

          <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-4">
            {onAdd && (
              <Button
                variant="primary"
                disabled={!verdict.allowed}
                onClick={() => {
                  onAdd(item);
                  ref.current?.close();
                }}
              >
                <Icon name="plus" /> Add to plate
              </Button>
            )}
            <Button onClick={() => ref.current?.close()}>Close</Button>
          </div>
          {onAdd && !verdict.allowed && <p className="mt-2 text-sm text-muted">Change your restrictions in Settings to add this dish.</p>}
        </div>
      )}
    </dialog>
  );
}
