// @vitest-environment jsdom
import { useState } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { DishDialog } from "./components/DishDialog";
import { MenuList } from "./features/MenuList";
import { DEFAULT_RESTRICTIONS, type Restrictions } from "./lib/restrictions";
import type { MenuItem } from "./lib/schema";

const lentils: MenuItem = {
  id: "lentils",
  sourceRecipeId: null,
  name: "Lemon lentils",
  description: "Roasted tomato and parsley",
  station: "Plant kitchen",
  servingText: "1 bowl (220 g)",
  caloriesKcal: 350,
  proteinG: 18,
  carbsG: 42,
  fatG: 8,
  saturatedFatG: null,
  transFatG: null,
  fiberG: null,
  sugarsG: null,
  cholesterolMg: null,
  sodiumMg: null,
  labelDvPercent: { vitaminD: null, potassium: null, calcium: null, iron: null },
  dietTags: ["Vegan"],
  allergens: [],
  allergenStatus: "explicitly_none_listed",
  ingredients: "Lentils, lemon, tomato, parsley",
  sourceUrl: "https://www.bu.edu/dining/location/warren/",
  issues: [],
};
const none: Restrictions = { ...DEFAULT_RESTRICTIONS, allergyAnswer: "none" };

function Menu({ items = [lentils], restrictions = none }: { items?: MenuItem[]; restrictions?: Restrictions }) {
  const [opened, setOpened] = useState<MenuItem | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const add = (item: MenuItem) => setAdded((previous) => [...previous, item.id]);
  return (
    <>
      <MenuList items={items} restrictions={restrictions} onPlate={new Set(added)} onAdd={add} onOpen={setOpened} />
      <output aria-label="Servings on plate">{added.length}</output>
      <DishDialog item={opened} restrictions={restrictions} meal="Lunch" onAdd={add} onClose={() => setOpened(null)} />
    </>
  );
}

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");

beforeAll(() => {
  // jsdom has no native dialog lifecycle; keep the real component and model its browser boundary.
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) { this.setAttribute("open", ""); },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    },
  });
});

afterEach(cleanup);
afterAll(() => {
  for (const [name, descriptor] of [["showModal", originalShowModal], ["close", originalClose]] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
});

describe("compact menu interaction", () => {
  it("leads with the dish and calories while opening ordinary details in the existing dialog", () => {
    render(<Menu />);
    const row = screen.getByRole("listitem");
    expect(within(row).getByText("350 kcal per serving")).toBeTruthy();
    expect(row.textContent).not.toMatch(/Plant kitchen|1 bowl|18 g|No allergens selected/);
    fireEvent.click(within(row).getByRole("button", { name: /^Lemon lentils(?:$| \d)/ }));
    const dialog = screen.getByRole("dialog", { name: "Lemon lentils" });
    expect(within(dialog).getByText("Plant kitchen · Lunch")).toBeTruthy();
    expect(within(dialog).getByText("Serving: 1 bowl (220 g)")).toBeTruthy();
    expect(within(dialog).getByRole("row", { name: "Protein 18 g" })).toBeTruthy();
  });

  it("keeps the add action and visibly distinguishes a dish already on the plate", () => {
    render(<Menu />);
    fireEvent.click(screen.getByRole("button", { name: "Add Lemon lentils to plate" }));
    expect(screen.getByLabelText("Servings on plate").textContent).toBe("1");
    expect(within(screen.getByRole("listitem")).getByText("Added")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Lemon lentils is on your plate; add another serving" }));
    expect(screen.getByLabelText("Servings on plate").textContent).toBe("2");
  });

  it("keeps restriction reasons visible and blocks restricted adds in both row and details", () => {
    const restricted = { ...lentils, allergens: ["Milk"], allergenStatus: "allergens_listed" as const, dietTags: [] };
    const restrictions: Restrictions = { allergyAnswer: "some", avoidAllergens: ["Milk"], requireTags: ["Vegan"], strictUnknown: true };
    render(<Menu items={[restricted]} restrictions={restrictions} />);
    const row = screen.getByRole("listitem");
    expect(within(row).getByText("Contains Milk (source label)")).toBeTruthy();
    expect(within(row).getByText("Not labeled Vegan by the source")).toBeTruthy();
    const add = within(row).getByRole<HTMLButtonElement>("button", { name: /doesn't fit your restrictions/ });
    expect(add.disabled).toBe(true);
    fireEvent.click(add);
    fireEvent.click(within(row).getByRole("button", { name: /^Lemon lentils(?:$| \d)/ }));
    const detailAdd = within(screen.getByRole("dialog")).getByRole<HTMLButtonElement>("button", { name: "Add to plate" });
    expect(detailAdd.disabled).toBe(true);
    fireEvent.click(detailAdd);
    expect(screen.getByLabelText("Servings on plate").textContent).toBe("0");
  });

  it("preserves the unanswered allergy gate while allowing dish browsing", () => {
    render(<Menu items={[{ ...lentils, dietTags: [] }]} restrictions={{ ...DEFAULT_RESTRICTIONS, requireTags: ["Vegan"] }} />);
    expect(screen.getByText("Set your allergies to add dishes")).toBeTruthy();
    const row = screen.getByRole("listitem");
    expect(row.textContent).not.toMatch(/Answer the allergy question in Settings first|Allergies not set/);
    expect(within(row).getByText("Not labeled Vegan by the source")).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: /doesn't fit your restrictions/ }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /^Lemon lentils(?:$| \d)/ }));
    expect(screen.getByRole("dialog", { name: "Lemon lentils" })).toBeTruthy();
    expect(within(screen.getByRole("dialog")).getByRole<HTMLButtonElement>("button", { name: "Add to plate" }).disabled).toBe(true);
    expect(screen.getByLabelText("Servings on plate").textContent).toBe("0");
  });

  it("combines station and name or description search and retains the restriction filter", () => {
    const soup = { ...lentils, id: "soup", name: "Tomato soup", station: "Soup kitchen", description: "Basil broth", dietTags: [] };
    const rice = { ...lentils, id: "rice", name: "Brown rice", description: "Plain grains" };
    render(<Menu items={[lentils, soup, rice]} restrictions={{ ...none, requireTags: ["Vegan"] }} />);
    fireEvent.change(screen.getByLabelText("Search this meal"), { target: { value: "tomato" } });
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    fireEvent.change(screen.getByLabelText("Station"), { target: { value: "Plant kitchen" } });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /^Lemon lentils/ })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search this meal"), { target: { value: "rice" } });
    expect(screen.getByRole("button", { name: /^Brown rice/ })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Station"), { target: { value: "Soup kitchen" } });
    expect(screen.getByText(/No dishes match/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search this meal"), { target: { value: "basil" } });
    expect(screen.getByRole("button", { name: /^Tomato soup(?:$| \d)/ })).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Show only dishes that fit my restrictions"));
    expect(screen.queryByRole("listitem")).toBeNull();
    expect(screen.getByText("0 of 3 dishes shown, 3 hidden")).toBeTruthy();
  });

  it.each([true, false])("makes missing nutrition and unknown allergens explicit with strict unknown set to %s", (strictUnknown) => {
    const unknown = { ...lentils, caloriesKcal: null, proteinG: null, allergens: null, allergenStatus: "reason_not_recorded" as const };
    const restrictions: Restrictions = { allergyAnswer: "some", avoidAllergens: ["Milk"], requireTags: [], strictUnknown };
    render(<Menu items={[unknown]} restrictions={restrictions} />);
    const row = screen.getByRole("listitem");
    expect(within(row).getByText("Nutrition not listed")).toBeTruthy();
    expect(within(row).getByText("Allergen information unavailable")).toBeTruthy();
    expect(row.textContent).not.toContain("0 kcal");
    const add = within(row).getByRole<HTMLButtonElement>("button", { name: strictUnknown ? /doesn't fit your restrictions/ : "Add Lemon lentils to plate" });
    expect(add.disabled).toBe(strictUnknown);
    fireEvent.click(add);
    expect(screen.getByLabelText("Servings on plate").textContent).toBe(strictUnknown ? "0" : "1");
  });

  it("keeps an unknown-allergen warning visible alongside a separate diet conflict", () => {
    render(<Menu items={[{ ...lentils, allergens: null, allergenStatus: "reason_not_recorded", dietTags: [] }]} restrictions={{ allergyAnswer: "some", avoidAllergens: ["Milk"], requireTags: ["Vegan"], strictUnknown: false }} />);
    const row = screen.getByRole("listitem");
    expect(within(row).getByText("Allergen information unavailable")).toBeTruthy();
    expect(within(row).getByText("Not labeled Vegan by the source")).toBeTruthy();
  });

  it("treats hostile source strings as text through filtering and details", () => {
    const hostile = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    const item = { ...lentils, name: `Soup ${hostile}`, station: `Station ${hostile}`, servingText: hostile, description: hostile, ingredients: hostile };
    const { container } = render(<Menu items={[item]} />);
    fireEvent.change(screen.getByLabelText("Station"), { target: { value: item.station } });
    fireEvent.change(screen.getByLabelText("Search this meal"), { target: { value: "<script>" } });
    fireEvent.click(screen.getByRole("button", { name: /^Soup/ }));
    expect(screen.getByRole("dialog", { name: item.name })).toBeTruthy();
    expect(container.querySelector("img, script, [onerror]")).toBeNull();
    expect(container.textContent).toContain(hostile);
  });
});
