// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TargetCalculator } from "./features/TargetCalculator";

afterEach(cleanup);
function fill() {
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.change(screen.getByLabelText("Age (years)"), { target: { value: "25" } });
  fireEvent.change(screen.getByLabelText("Height (cm)"), { target: { value: "175" } });
  fireEvent.change(screen.getByLabelText("Weight (kg)"), { target: { value: "70" } });
  fireEvent.change(screen.getByLabelText("Equation category"), { target: { value: "male" } });
  fireEvent.change(screen.getByLabelText("Usual activity"), { target: { value: "3" } });
}
describe("target calculator interaction", () => {
  it("only applies estimates explicitly and does not persist measurements", () => {
    const apply = vi.fn();
    const saved = vi.spyOn(Storage.prototype, "setItem");
    render(<TargetCalculator onApply={apply} />);
    fireEvent.click(screen.getByText("Help me estimate my daily targets"));
    fill();
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Use these daily targets" }));
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({ caloriesKcal: 2590 }));
    expect(Object.keys(apply.mock.calls[0]![0]).sort()).toEqual(["caloriesKcal", "carbsG", "fatG", "proteinG"]);
    expect(saved).not.toHaveBeenCalled();
    saved.mockRestore();
  });
  it("removes preview when an input becomes invalid or eligibility is unchecked", () => {
    render(<TargetCalculator onApply={() => {}} />);
    fireEvent.click(screen.getByText("Help me estimate my daily targets"));
    fill();
    fireEvent.change(screen.getByLabelText("Age (years)"), { target: { value: "17" } });
    expect(screen.queryByRole("button", { name: "Use these daily targets" })).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("supported range");
    fireEvent.change(screen.getByLabelText("Age (years)"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.queryByRole("button", { name: "Use these daily targets" })).toBeNull();
  });
});
