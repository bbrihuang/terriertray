// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDayMenus, useMenuIndex, type Load } from "./data";
import type { DayMenu, MenuIndex } from "./lib/schema";

const firstIndex: MenuIndex = {
  schemaVersion: 1,
  dataVersion: "first-version",
  generatedAt: "2026-11-07T22:00:00Z",
  timezone: "America/New_York",
  allergyNotice: "Confirm allergies with dining staff.",
  freshness: null,
  halls: [{
    id: "west", name: "West Campus", source: "bu-html",
    sourceUrl: "https://www.bu.edu/dining/location/west/", status: "ok",
    lastAttemptAt: null, lastSuccessfulFetchAt: null, note: null,
    dates: [{ date: "2026-11-08", file: "west/2026-11-08.json", itemCount: 0, meals: ["Brunch"] }],
  }],
};
const nextIndex: MenuIndex = { ...firstIndex, dataVersion: "next-version", generatedAt: "2026-11-08T12:00:00Z" };
const response = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const fetchIndex = vi.fn<typeof fetch>();
let visibility: DocumentVisibilityState = "visible";

function become(state: DocumentVisibilityState) {
  visibility = state;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
}

beforeEach(() => {
  fetchIndex.mockReset();
  vi.stubGlobal("fetch", fetchIndex);
  visibility = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("menu index revalidation", () => {
  it("loads the new published version when an open tab becomes visible", async () => {
    fetchIndex.mockResolvedValueOnce(response(firstIndex)).mockResolvedValueOnce(response(nextIndex));
    const { result } = renderHook(useMenuIndex);
    await waitFor(() => expect(result.current).toEqual({ state: "ready", data: firstIndex }));

    become("visible");

    await waitFor(() => expect(result.current).toEqual({ state: "ready", data: nextIndex }));
    expect(fetchIndex).toHaveBeenCalledTimes(2);
    expect(fetchIndex.mock.calls.every(([url]) => typeof url === "string" && /^\/menus\/index\.json\?t=\d+$/.test(url))).toBe(true);
  });

  it.each(["network", "invalid format"])("keeps the last validated index when a refresh fails (%s) and can recover later", async (failure) => {
    fetchIndex.mockResolvedValueOnce(response(firstIndex));
    if (failure === "network") fetchIndex.mockRejectedValueOnce(new Error("offline"));
    else fetchIndex.mockResolvedValueOnce(response({ ...nextIndex, schemaVersion: 99 }));
    fetchIndex.mockResolvedValueOnce(response(nextIndex));
    const { result } = renderHook(useMenuIndex);
    await waitFor(() => expect(result.current).toEqual({ state: "ready", data: firstIndex }));

    await act(async () => become("visible"));

    expect(fetchIndex).toHaveBeenCalledTimes(2);
    expect(result.current).toEqual({ state: "ready", data: firstIndex });
    become("visible");
    await waitFor(() => expect(result.current).toEqual({ state: "ready", data: nextIndex }));
  });

  it("shows an initial request error and recovers when the tab becomes visible", async () => {
    fetchIndex.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(response(nextIndex));
    const { result } = renderHook(useMenuIndex);
    await waitFor(() => expect(result.current.state).toBe("error"));
    if (result.current.state === "error") expect(result.current.message).not.toBe("");

    become("visible");

    await waitFor(() => expect(result.current).toEqual({ state: "ready", data: nextIndex }));
  });

  it("does not request another index when the tab becomes hidden", async () => {
    fetchIndex.mockResolvedValueOnce(response(firstIndex));
    const { result } = renderHook(useMenuIndex);
    await waitFor(() => expect(result.current).toEqual({ state: "ready", data: firstIndex }));

    await act(async () => become("hidden"));

    expect(fetchIndex).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({ state: "ready", data: firstIndex });
  });

  it("does not overlap index requests during initial load or revalidation", async () => {
    let resolveInitial!: (response: Response) => void;
    let resolveRefresh!: (response: Response) => void;
    fetchIndex
      .mockReturnValueOnce(new Promise<Response>((resolve) => { resolveInitial = resolve; }))
      .mockReturnValueOnce(new Promise<Response>((resolve) => { resolveRefresh = resolve; }));
    const { result } = renderHook(useMenuIndex);
    become("visible");
    become("visible");
    expect(fetchIndex).toHaveBeenCalledTimes(1);
    await act(async () => resolveInitial(response(firstIndex)));
    await waitFor(() => expect(result.current).toEqual({ state: "ready", data: firstIndex }));

    become("visible");
    become("visible");
    become("visible");

    expect(fetchIndex).toHaveBeenCalledTimes(2);
    expect(result.current).toEqual({ state: "ready", data: firstIndex });
    await act(async () => resolveRefresh(response(nextIndex)));
    await waitFor(() => expect(result.current).toEqual({ state: "ready", data: nextIndex }));
  });

  it("stops listening for tab returns after unmount", async () => {
    fetchIndex.mockResolvedValueOnce(response(firstIndex));
    const { result, unmount } = renderHook(useMenuIndex);
    await waitFor(() => expect(result.current).toEqual({ state: "ready", data: firstIndex }));
    unmount();

    await act(async () => become("visible"));

    expect(fetchIndex).toHaveBeenCalledTimes(1);
  });
});


describe("day menus after index revalidation", () => {
  it("hides the previous version of a same-path menu on the first render", async () => {
    const file = "west/same-path-version-test.json";
    const firstDay: DayMenu = {
      schemaVersion: 1, hallId: "west", date: "2026-11-08",
      meals: [{ name: "Brunch", hours: "10 AM–4 PM", items: [] }],
    };
    const nextDay: DayMenu = {
      schemaVersion: 1, hallId: "west", date: "2026-11-08",
      meals: [{ name: "Brunch", hours: "10 AM–3 PM", items: [] }],
    };
    let resolveRefresh!: (response: Response) => void;
    fetchIndex.mockResolvedValueOnce(response(firstDay))
      .mockReturnValueOnce(new Promise<Response>((resolve) => { resolveRefresh = resolve; }));
    const nextVersionRenders: Array<Load<DayMenu> | undefined> = [];
    const { result, rerender } = renderHook(({ version }) => {
      const loads = useDayMenus([file], version);
      // Capture the consumer-visible return before effects can replace old local state.
      if (version === "published-v2") nextVersionRenders.push(loads[file]);
      return loads;
    }, { initialProps: { version: "published-v1" } });
    await waitFor(() => expect(result.current[file]).toEqual({ state: "ready", data: firstDay }));

    rerender({ version: "published-v2" });

    expect(nextVersionRenders[0]?.state ?? "loading").toBe("loading");
    expect(result.current[file]?.state ?? "loading").toBe("loading");
    expect(fetchIndex).toHaveBeenLastCalledWith(`/menus/${file}?v=published-v2`, { headers: { Accept: "application/json" } });
    await act(async () => resolveRefresh(response(nextDay)));
    await waitFor(() => expect(result.current[file]).toEqual({ state: "ready", data: nextDay }));
  });
});
