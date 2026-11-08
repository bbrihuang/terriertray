// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { TargetCalculator } from "./features/TargetCalculator";
import { Settings } from "./features/Settings";
import { DEFAULT_PROFILE, type Profile } from "./lib/profile-storage";

afterEach(cleanup);

function fill(includeMacros = false) {
  fireEvent.click(screen.getByLabelText("cm and kg"));
  fireEvent.click(screen.getByRole("checkbox", { name: /I’m not pregnant/ }));
  fireEvent.change(screen.getByLabelText(/^Age/), { target: { value: "25" } });
  fireEvent.change(screen.getByLabelText(/^Height/), { target: { value: "175" } });
  fireEvent.change(screen.getByLabelText(/^Weight/), { target: { value: "70" } });
  fireEvent.change(screen.getByLabelText(/^Gender/), { target: { value: "Male" } });
  fireEvent.change(screen.getByLabelText(/^Activity level/), { target: { value: "2" } });
  if (!includeMacros) fireEvent.click(screen.getByRole("checkbox", { name: "Include suggested macros" }));
}

describe("model calculator interaction", () => {
  it("previews the model's prediction and applies only calories, only on click, without storing measurements", () => {
    const apply = vi.fn();
    const saved = vi.spyOn(Storage.prototype, "setItem");
    const fetched = vi.spyOn(globalThis, "fetch");
    render(<TargetCalculator currentKcal={null} onApply={apply} />);
    fill();
    expect(screen.getAllByText("2,718")).toHaveLength(2); // headline and breakdown: the trained pipeline's 2717.80 kcal, rounded for display
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Apply 2,718 kcal as my daily target" }));
    expect(apply).toHaveBeenCalledWith(2718);
    expect(saved).not.toHaveBeenCalled();
    expect(fetched).not.toHaveBeenCalled();
    saved.mockRestore();
    fetched.mockRestore();
  });

  it("shows estimate, signed adjustment and proposed target together, with goal setting the direction", () => {
    const apply = vi.fn();
    render(<TargetCalculator currentKcal={null} onApply={apply} />);
    fill();
    expect(screen.getByText(/Uses the model estimate unchanged/)).toBeTruthy();
    expect(screen.queryByLabelText(/^Your planning adjustment/)).toBeNull(); // no hidden adjustment while maintaining
    fireEvent.click(screen.getByLabelText("Cutting"));
    expect(screen.getByLabelText<HTMLInputElement>(/^Your planning adjustment/).value).toBe("272"); // the earlier 10% default
    expect(screen.getByRole("button", { name: "Apply 2,446 kcal as my daily target" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/^Your planning adjustment/), { target: { value: "400" } });
    expect(screen.getAllByText("2,718")).toHaveLength(2); // prediction itself unchanged
    expect(screen.getByText("−400")).toBeTruthy();
    expect(screen.getByText("2,318 kcal")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Bulking"));
    expect(screen.getByText("+400")).toBeTruthy(); // edited magnitude kept, direction flipped
    fireEvent.click(screen.getByLabelText("Maintaining"));
    expect(screen.getByRole("button", { name: "Apply 2,718 kcal as my daily target" })).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Cutting"));
    fireEvent.click(screen.getByRole("button", { name: "Apply 2,318 kcal as my daily target" }));
    expect(apply).toHaveBeenCalledWith(2318);
  });

  it("explains invalid adjustments, keeps what was typed and blocks Apply", () => {
    const apply = vi.fn();
    render(<TargetCalculator currentKcal={null} onApply={apply} />);
    fill();
    fireEvent.click(screen.getByLabelText("Cutting"));
    const input = screen.getByLabelText<HTMLInputElement>(/^Your planning adjustment/);
    for (const [typed, message] of [["", /Enter an adjustment/], ["-300", /minus sign/], ["12.5", /whole number/], ["abc", /whole number/], ["5000", /no calories/]] as const) {
      fireEvent.change(input, { target: { value: typed } });
      expect(input.value).toBe(typed);
      expect(input.getAttribute("aria-invalid")).toBe("true");
      const error = screen.getByText(message);
      expect(input.getAttribute("aria-describedby")?.split(" ")).toContain(error.id);
      expect(screen.queryByRole("button", { name: /^Apply/ })).toBeNull();
    }
    expect(apply).not.toHaveBeenCalled();
  });

  it.each([false, true])("blocks targets above the saved-profile maximum with macros included: %s", (includeMacros) => {
    const apply = vi.fn();
    render(<TargetCalculator currentKcal={null} onApply={apply} />);
    fill(includeMacros);
    fireEvent.click(screen.getByLabelText("Bulking"));
    fireEvent.change(screen.getByLabelText(/^Your planning adjustment/), { target: { value: "20000" } });
    expect(screen.getAllByText("2,718")).toHaveLength(2);
    expect(screen.getByText("22,718 kcal")).toBeTruthy();
    const button = screen.getByRole<HTMLButtonElement>("button", { name: /^Apply/ });
    expect(button.disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toMatch(/20,000 kcal/);
    fireEvent.click(button);
    expect(apply).not.toHaveBeenCalled();
  });

  it.each([false, true])("accepts the exact saved-profile maximum with macros included: %s", (includeMacros) => {
    const apply = vi.fn();
    render(<TargetCalculator currentKcal={null} onApply={apply} />);
    fill(includeMacros);
    fireEvent.click(screen.getByLabelText("Bulking"));
    fireEvent.change(screen.getByLabelText(/^Your planning adjustment/), { target: { value: "17282" } });
    const button = screen.getByRole<HTMLButtonElement>("button", { name: /^Apply 20,000 kcal/ });
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    if (includeMacros) expect(apply).toHaveBeenCalledWith(20000, { proteinG: 1000, carbsG: 2500, fatG: 666.7 });
    else expect(apply).toHaveBeenCalledWith(20000);
  });

  it("keeps model limitations available through a native labelled disclosure", () => {
    render(<TargetCalculator currentKcal={null} onApply={() => {}} />);
    const summary = screen.getByText("About this model", { selector: "summary" });
    const disclosure = summary.closest("details");
    expect(disclosure).toBeTruthy();
    expect(disclosure?.textContent).toContain("On held-out rows");
    expect(disclosure?.textContent).toContain("doesn’t mean it’s accurate for you");
  });

  it("recomputes the default with body changes, keeps an edited amount, and clears stale Applied feedback", () => {
    let current: number | null = null;
    const { rerender } = render(<TargetCalculator currentKcal={current} onApply={(k) => (current = k)} />);
    fill();
    fireEvent.click(screen.getByLabelText("Bulking"));
    fireEvent.click(screen.getByRole("button", { name: "Apply 2,990 kcal as my daily target" }));
    rerender(<TargetCalculator currentKcal={current} onApply={(k) => (current = k)} />);
    expect(screen.getByRole("status").textContent).toContain("2,990");
    fireEvent.change(screen.getByLabelText(/^Weight/), { target: { value: "80" } });
    expect(screen.queryByRole("status")).toBeNull();
    const auto = screen.getByLabelText<HTMLInputElement>(/^Your planning adjustment/).value;
    expect(auto).not.toBe("272"); // unedited default follows the new estimate
    fireEvent.change(screen.getByLabelText(/^Your planning adjustment/), { target: { value: "150" } });
    fireEvent.change(screen.getByLabelText(/^Weight/), { target: { value: "70" } });
    expect(screen.getByLabelText<HTMLInputElement>(/^Your planning adjustment/).value).toBe("150");
    expect(screen.getByRole("button", { name: "Apply 2,868 kcal as my daily target" })).toBeTruthy();
  });

  it("a remount (Settings' delete-and-reset) clears measurements, goal and adjustment", () => {
    const { unmount } = render(<TargetCalculator key={0} currentKcal={null} onApply={() => {}} />);
    fill();
    fireEvent.click(screen.getByLabelText("Cutting"));
    fireEvent.change(screen.getByLabelText(/^Your planning adjustment/), { target: { value: "400" } });
    unmount();
    render(<TargetCalculator key={1} currentKcal={null} onApply={() => {}} />);
    expect(screen.getByLabelText<HTMLInputElement>(/^Age/).value).toBe("");
    expect(screen.queryByLabelText(/^Your planning adjustment/)).toBeNull();
  });

  it("removes the preview and explains when an input is outside the dataset or scope is unconfirmed", () => {
    render(<TargetCalculator currentKcal={null} onApply={() => {}} />);
    fill();
    fireEvent.change(screen.getByLabelText(/^Age/), { target: { value: "17" } });
    expect(screen.queryByRole("button", { name: /^Apply/ })).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("ages in our dataset");
    fireEvent.change(screen.getByLabelText(/^Age/), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /I’m not pregnant/ }));
    expect(screen.queryByRole("button", { name: /^Apply/ })).toBeNull();
  });

  it("converts US units with the team's factors", () => {
    const apply = vi.fn();
    render(<TargetCalculator currentKcal={null} onApply={apply} />);
    expect(screen.getByLabelText<HTMLInputElement>("feet, inches and pounds").checked).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: /I’m not pregnant/ }));
    fireEvent.change(screen.getByLabelText(/^Age/), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Height, feet"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Height, inches"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText(/^Weight/), { target: { value: "154.3235835" } });
    fireEvent.change(screen.getByLabelText(/^Gender/), { target: { value: "Male" } });
    fireEvent.change(screen.getByLabelText(/^Activity level/), { target: { value: "2" } });
    // 5 ft 9 in = 175.26 cm, 154.32 lb = 70 kg: within a couple of kcal of the metric case.
    const button = screen.getByRole("button", { name: /^Apply/ });
    const kcal = Number(button.textContent!.match(/[\d,]+/)![0].replace(",", ""));
    expect(Math.abs(kcal - 2720)).toBeLessThan(5);
  });
});

describe("macro and measurement drafts", () => {
  it("previews automatic macros and applies all four targets only after review", () => {
    const apply = vi.fn();
    render(<TargetCalculator currentKcal={null} onApply={apply} />);
    fill(true);
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Include suggested macros" }).checked).toBe(true);
    expect(screen.getByRole<HTMLInputElement>("slider", { name: "Protein calorie share" }).value).toBe("20");
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Apply 2,718 kcal and macros as my daily targets" }));
    expect(apply).toHaveBeenCalledWith(2718, { proteinG: 135.9, carbsG: 339.8, fatG: 90.6 });
  });

  it("keeps the calorie budget fixed as macro shares change and prevents impossible splits", () => {
    const apply = vi.fn();
    render(<TargetCalculator currentKcal={null} onApply={apply} />);
    fill(true);
    fireEvent.change(screen.getByRole("slider", { name: "Protein calorie share" }), { target: { value: "30" } });
    expect(screen.getAllByText("2,718")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Apply 2,718 kcal and macros as my daily targets" }));
    expect(apply).toHaveBeenLastCalledWith(2718, { proteinG: 203.9, carbsG: 271.8, fatG: 90.6 });
    fireEvent.click(screen.getByRole("radio", { name: "Muscle-focused" }));
    fireEvent.click(screen.getByLabelText("Cutting"));
    fireEvent.change(screen.getByLabelText(/^Your planning adjustment/), { target: { value: "2600" } });
    const blocked = screen.getByRole<HTMLButtonElement>("button", { name: /^Apply/ });
    expect(blocked.disabled).toBe(true);
    fireEvent.click(blocked);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Uncheck.*calories only/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "Include suggested macros" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply 118 kcal as my daily target" }));
    expect(apply).toHaveBeenLastCalledWith(118);
  });

  it("blocks macros that round to zero while leaving calories-only Apply available", () => {
    const apply = vi.fn();
    render(<TargetCalculator currentKcal={null} onApply={apply} />);
    fill(true);
    fireEvent.click(screen.getByLabelText("Cutting"));
    fireEvent.change(screen.getByLabelText(/^Your planning adjustment/), { target: { value: "2717" } });
    expect(screen.getByRole<HTMLButtonElement>("button", { name: /^Apply/ }).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toMatch(/rounds.*0 g/);
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Include suggested macros" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply 1 kcal as my daily target" }));
    expect(apply).toHaveBeenCalledWith(1);
  });

  it("clears Applied feedback for preset, slider and inclusion changes", () => {
    function Harness() {
      const [kcal, setKcal] = useState<number | null>(null);
      return <TargetCalculator currentKcal={kcal} onApply={setKcal} />;
    }
    render(<Harness />);
    fill(true);
    for (const change of [
      () => fireEvent.click(screen.getByRole("radio", { name: "Muscle-focused" })),
      () => fireEvent.change(screen.getByRole("slider", { name: "Protein calorie share" }), { target: { value: "25" } }),
      () => fireEvent.click(screen.getByRole("checkbox", { name: "Include suggested macros" })),
    ]) {
      fireEvent.click(screen.getByRole("button", { name: /^Apply/ }));
      expect(screen.getByRole("status").textContent).toContain("Applied");
      change();
      expect(screen.queryByRole("status")).toBeNull();
    }
  });

  it("preserves manual macros on calories-only Apply and replaces them only when included", () => {
    function Harness() {
      const [profile, setProfile] = useState<Profile>({ ...DEFAULT_PROFILE, daily: { caloriesKcal: 1800, proteinG: 90, carbsG: 180, fatG: 60 } });
      return <Settings profile={profile} onChange={setProfile} remember={false} onRemember={() => {}} onDeleteSaved={() => {}} />;
    }
    render(<Harness />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Apply 2,718 kcal as my daily target" }));
    expect(screen.getByLabelText<HTMLInputElement>(/^Calories \(kcal per day\)/).value).toBe("2718");
    expect(screen.getByLabelText<HTMLInputElement>(/^Protein \(g per day\)/).value).toBe("90");
    expect(screen.getByLabelText<HTMLInputElement>(/^Carbohydrate \(g per day\)/).value).toBe("180");
    expect(screen.getByLabelText<HTMLInputElement>(/^Fat \(g per day\)/).value).toBe("60");
    fireEvent.click(screen.getByRole("checkbox", { name: "Include suggested macros" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply 2,718 kcal and macros as my daily targets" }));
    expect(screen.getByLabelText<HTMLInputElement>(/^Protein \(g per day\)/).value).toBe("135.9");
    expect(screen.getByLabelText<HTMLInputElement>(/^Carbohydrate \(g per day\)/).value).toBe("339.8");
    expect(screen.getByLabelText<HTMLInputElement>(/^Fat \(g per day\)/).value).toBe("90.6");
    expect(screen.getByLabelText<HTMLInputElement>(/^Protein \(g per day\)/).validity.stepMismatch).toBe(false);
    expect(screen.getByLabelText<HTMLInputElement>(/^Carbohydrate \(g per day\)/).validity.stepMismatch).toBe(false);
    expect(screen.getByLabelText<HTMLInputElement>(/^Fat \(g per day\)/).validity.stepMismatch).toBe(false);
  });

  it("delete-and-reset clears body and macro drafts and restores automatic Balanced macros", () => {
    function Harness() {
      const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
      return <Settings profile={profile} onChange={setProfile} remember={false} onRemember={() => {}} onDeleteSaved={() => setProfile(DEFAULT_PROFILE)} />;
    }
    render(<Harness />);
    fill(true);
    fireEvent.click(screen.getByRole("radio", { name: "Muscle-focused" }));
    fireEvent.change(screen.getByRole("slider", { name: "Protein calorie share" }), { target: { value: "35" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Include suggested macros" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete my saved settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete and reset" }));
    expect(screen.getByLabelText<HTMLInputElement>(/^Age/).value).toBe("");
    expect(screen.queryByRole("slider")).toBeNull();
    fill(true);
    expect(screen.getByRole<HTMLInputElement>("radio", { name: "Balanced" }).checked).toBe(true);
    expect(screen.getByRole<HTMLInputElement>("slider", { name: "Protein calorie share" }).value).toBe("20");
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Include suggested macros" }).checked).toBe(true);
  });

  it("converts measurements across unit changes without repeated-toggle drift", () => {
    render(<TargetCalculator currentKcal={null} onApply={() => {}} />);
    fireEvent.change(screen.getByLabelText("Height, feet"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Height, inches"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText(/^Weight/), { target: { value: "154.3235835" } });
    for (let i = 0; i < 8; i++) {
      fireEvent.click(screen.getByLabelText("cm and kg"));
      expect(Number(screen.getByLabelText<HTMLInputElement>(/^Height/).value)).toBeCloseTo(175.26, 5);
      expect(Number(screen.getByLabelText<HTMLInputElement>(/^Weight/).value)).toBeCloseTo(70, 5);
      expect(screen.getByLabelText<HTMLInputElement>(/^Height/).validity.valid).toBe(true);
      expect(screen.getByLabelText<HTMLInputElement>(/^Weight/).validity.valid).toBe(true);
      fireEvent.click(screen.getByLabelText("feet, inches and pounds"));
      expect(screen.getByLabelText<HTMLInputElement>("Height, feet").value).toBe("5");
      expect(screen.getByLabelText<HTMLInputElement>("Height, inches").value).toBe("9");
      expect(Number(screen.getByLabelText<HTMLInputElement>(/^Weight/).value)).toBeCloseTo(154.3235835, 6);
      expect(screen.getByLabelText<HTMLInputElement>("Height, inches").validity.valid).toBe(true);
      expect(screen.getByLabelText<HTMLInputElement>(/^Weight/).validity.valid).toBe(true);
    }
    fireEvent.click(screen.getByLabelText("cm and kg"));
    fireEvent.change(screen.getByLabelText(/^Height/), { target: { value: "180.25" } });
    fireEvent.change(screen.getByLabelText(/^Weight/), { target: { value: "72.35" } });
    fireEvent.click(screen.getByLabelText("feet, inches and pounds"));
    expect(screen.getByLabelText<HTMLInputElement>("Height, feet").value).toBe("5");
    expect(Number(screen.getByLabelText<HTMLInputElement>("Height, inches").value)).toBeCloseTo(10.964567, 5);
    expect(Number(screen.getByLabelText<HTMLInputElement>(/^Weight/).value)).toBeCloseTo(159.504445, 5);
    expect(screen.getByLabelText<HTMLInputElement>("Height, inches").validity.valid).toBe(true);
    expect(screen.getByLabelText<HTMLInputElement>(/^Weight/).validity.valid).toBe(true);
    fireEvent.click(screen.getByLabelText("cm and kg"));
    expect(screen.getByLabelText<HTMLInputElement>(/^Height/).value).toBe("180.25");
    expect(screen.getByLabelText<HTMLInputElement>(/^Weight/).value).toBe("72.35");
  });

  it("keeps blank and incomplete measurements empty when changing units", () => {
    render(<TargetCalculator currentKcal={null} onApply={() => {}} />);
    fireEvent.change(screen.getByLabelText("Height, feet"), { target: { value: "5" } });
    fireEvent.click(screen.getByLabelText("cm and kg"));
    expect(screen.getByLabelText<HTMLInputElement>(/^Height/).value).toBe("");
    expect(screen.getByLabelText<HTMLInputElement>(/^Weight/).value).toBe("");
    fireEvent.click(screen.getByLabelText("feet, inches and pounds"));
    expect(screen.getByLabelText<HTMLInputElement>("Height, feet").value).toBe("5");
    expect(screen.getByLabelText<HTMLInputElement>("Height, inches").value).toBe("");
    fireEvent.change(screen.getByLabelText(/^Weight/), { target: { value: "-5" } });
    fireEvent.click(screen.getByLabelText("cm and kg"));
    expect(screen.getByLabelText<HTMLInputElement>(/^Weight/).value).toBe("");
  });

  it("keeps the same calorie prediction when changing measurement display units", () => {
    render(<TargetCalculator currentKcal={null} onApply={() => {}} />);
    fill(true);
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByLabelText("feet, inches and pounds"));
      expect(screen.getByRole("button", { name: "Apply 2,718 kcal and macros as my daily targets" })).toBeTruthy();
      fireEvent.click(screen.getByLabelText("cm and kg"));
      expect(screen.getByRole("button", { name: "Apply 2,718 kcal and macros as my daily targets" })).toBeTruthy();
    }
  });

  it("accepts converted fractional inches below twelve and still rejects twelve inches", () => {
    render(<TargetCalculator currentKcal={null} onApply={() => {}} />);
    fill(true);
    fireEvent.change(screen.getByLabelText(/^Height/), { target: { value: "182.8546" } }); // 5 feet, 11.99 inches
    const metricProposal = screen.getByRole("button", { name: /^Apply/ }).textContent;
    fireEvent.click(screen.getByLabelText("feet, inches and pounds"));
    const inches = screen.getByLabelText<HTMLInputElement>("Height, inches");
    expect(Number(inches.value)).toBeCloseTo(11.99, 6);
    expect(inches.validity.valid).toBe(true);
    expect(screen.getByRole("button", { name: /^Apply/ }).textContent).toBe(metricProposal);
    fireEvent.change(inches, { target: { value: "12" } });
    expect(screen.queryByRole("button", { name: /^Apply/ })).toBeNull();
  });
});
