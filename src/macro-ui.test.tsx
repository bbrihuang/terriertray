// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MacroTargets } from "./features/MacroTargets";
import { DEFAULT_MACRO_PREFERENCES, type MacroPreferences } from "./lib/macro-targets";

afterEach(cleanup);

function Draft({ calories = 2400, weightKg = 90.718474, initial = DEFAULT_MACRO_PREFERENCES }: { calories?: number; weightKg?: number; initial?: MacroPreferences }) {
  const [preferences, setPreferences] = useState(initial);
  return <MacroTargets calories={calories} weightKg={weightKg} preferences={preferences} onChange={setPreferences} />;
}

describe("macro draft controls", () => {
  it("shows all nutrients with grams, energy and shares for the final calorie budget", () => {
    render(<Draft />);
    for (const [name, grams, energy, share] of [["Protein", "120 g", "480 kcal", "20%"], ["Carbohydrates", "300 g", "1,200 kcal", "50%"], ["Fat", "80 g", "720 kcal", "30%"]]) {
      const row = screen.getByText(name!).closest("div");
      expect(row).toBeTruthy();
      expect(within(row!).getByText(grams!)).toBeTruthy();
      expect(within(row!).getByText(new RegExp(energy!))).toBeTruthy();
      expect(row!.textContent).toContain(share);
    }
    expect(screen.getByRole("radio", { name: "Balanced" }).getAttribute("checked")).not.toBeNull();
    const protein = screen.getByRole<HTMLInputElement>("slider", { name: "Protein calorie share" });
    expect(protein.type).toBe("range");
    expect(protein.min).toBe("1");
    expect(protein.max).toBe("69");
    expect(screen.getByRole<HTMLInputElement>("slider", { name: "Fat calorie share" }).max).toBe("79");
  });

  it("keeps an edited split across body and calorie changes until explicit reset", () => {
    const { rerender } = render(<Draft />);
    fireEvent.change(screen.getByRole("slider", { name: "Protein calorie share" }), { target: { value: "25" } });
    expect(screen.getByRole<HTMLInputElement>("slider", { name: "Protein calorie share" }).value).toBe("25");
    expect(screen.getByText("270 g")).toBeTruthy();
    rerender(<Draft calories={2800} weightKg={100} />);
    expect(screen.getByRole<HTMLInputElement>("slider", { name: "Protein calorie share" }).value).toBe("25");
    expect(screen.getByRole<HTMLInputElement>("slider", { name: "Fat calorie share" }).value).toBe("30");
    expect(screen.getByText("175 g")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reset split" }));
    expect(screen.getByText("140 g")).toBeTruthy();
  });

  it("applies a newly selected preset immediately after a custom edit", () => {
    render(<Draft />);
    fireEvent.change(screen.getByRole("slider", { name: "Protein calorie share" }), { target: { value: "25" } });
    expect(screen.getByText(/Custom split/)).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Muscle-focused" }));
    expect(screen.getByText("160 g")).toBeTruthy();
    expect(screen.queryByText(/Custom split/)).toBeNull();
  });

  it("edits fat while leaving protein allocation and total calories intact", () => {
    render(<Draft />);
    fireEvent.change(screen.getByRole("slider", { name: "Fat calorie share" }), { target: { value: "35" } });
    expect(screen.getByText("120 g")).toBeTruthy();
    expect(screen.getByText("270 g")).toBeTruthy();
    expect(screen.getByText("93.3 g")).toBeTruthy();
    expect(screen.getByText(/2,400 kcal budget/)).toBeTruthy();
  });

  it("explains an impossible muscle split and leaves preset selection available", () => {
    render(<Draft calories={800} initial={{ preset: "muscle", proteinPercent: null, fatPercent: null }} />);
    expect(screen.getByRole("alert").textContent).toMatch(/protein.*fit|fit.*protein/i);
    expect(screen.queryByRole("slider")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Balanced" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getAllByRole("slider")).toHaveLength(2);
    expect(screen.getByText("40 g")).toBeTruthy();
  });

  it("keeps starting-point context and linked references in an expandable explanation", () => {
    render(<Draft />);
    expect(screen.getByText(/starting points/)).toBeTruthy();
    const details = screen.getByText("How these splits work", { selector: "summary" }).closest("details");
    expect(details).toBeTruthy();
    expect(within(details!).getByRole("link", { name: /NIH Office of Dietary Supplements/ }).getAttribute("href")).toBe("https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/");
    expect(within(details!).getByRole("link", { name: /National Academies/ }).getAttribute("href")).toBe("https://www.nationalacademies.org/read/27957/chapter/5");
  });
});
