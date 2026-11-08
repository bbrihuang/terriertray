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
    expect(screen.getByText("2,718")).toBeTruthy(); // the trained pipeline's 2717.80 kcal, rounded for display
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Apply 2,718 kcal as my daily target" }));
    expect(apply).toHaveBeenCalledWith(2718);
    expect(saved).not.toHaveBeenCalled();
    expect(fetched).not.toHaveBeenCalled();
    saved.mockRestore();
    fetched.mockRestore();
  });

  it("keeps a chosen adjustment separate and visible", () => {
    const apply = vi.fn();
    render(<TargetCalculator currentKcal={null} onApply={apply} />);
    fill();
    fireEvent.change(screen.getByLabelText(/^Your adjustment/), { target: { value: "-10" } });
    expect(screen.getByText("2,718")).toBeTruthy(); // prediction itself unchanged
    fireEvent.click(screen.getByRole("button", { name: "Apply 2,446 kcal as my daily target" }));
    expect(apply).toHaveBeenCalledWith(2446);
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
