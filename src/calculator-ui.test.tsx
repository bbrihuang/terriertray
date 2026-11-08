// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TargetCalculator } from "./features/TargetCalculator";

afterEach(cleanup);

function fill() {
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.change(screen.getByLabelText(/^Age/), { target: { value: "25" } });
  fireEvent.change(screen.getByLabelText(/^Height/), { target: { value: "175" } });
  fireEvent.change(screen.getByLabelText(/^Weight/), { target: { value: "70" } });
  fireEvent.change(screen.getByLabelText(/^Gender/), { target: { value: "Male" } });
  fireEvent.change(screen.getByLabelText(/^Activity level/), { target: { value: "2" } });
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
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.queryByRole("button", { name: /^Apply/ })).toBeNull();
  });

  it("converts US units with the team's factors", () => {
    const apply = vi.fn();
    render(<TargetCalculator currentKcal={null} onApply={apply} />);
    fireEvent.click(screen.getByLabelText("feet, inches and pounds"));
    fireEvent.click(screen.getByRole("checkbox"));
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
