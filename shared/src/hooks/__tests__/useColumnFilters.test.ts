import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useColumnFilters } from "../useColumnFilters";
import { Column, NameColumn, SteamColumn, HideColumn } from "../../components/Column";

const COLUMNS = [new NameColumn(), new SteamColumn(), new HideColumn()];

const games = [
  { name: "Alpha" },
  { name: "Beta" },
  { name: "Gamma" },
];

const steam = {
  Alpha: { rating: "Very Positive" as const, pct: 85 },
  Beta: { rating: "Mixed" as const, pct: 50 },
};

const CONFIG = {
  lsFiltersKey: "cf-test-filters",
  lsSortKey: "cf-test-sort",
  defaultSort: { col: "name", dir: 1 as const },
};

const deps = { steam, hiddenGames: new Set<string>(), ownedGames: new Set<string>() };

describe("useColumnFilters", () => {
  it("returns all games unfiltered by default", () => {
    const { result } = renderHook(() => useColumnFilters(COLUMNS, games, deps, CONFIG));
    expect(result.current.filtered).toHaveLength(3);
  });

  it("setFilter narrows filtered results", () => {
    const { result } = renderHook(() => useColumnFilters(COLUMNS, games, deps, CONFIG));
    act(() => result.current.setFilter("search", "alpha"));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].name).toBe("Alpha");
  });

  it("clearFilters restores all games", () => {
    const { result } = renderHook(() => useColumnFilters(COLUMNS, games, deps, CONFIG));
    act(() => result.current.setFilter("search", "alpha"));
    act(() => result.current.clearFilters());
    expect(result.current.filtered).toHaveLength(3);
  });

  it("toggleSort changes sort column and direction", () => {
    const { result } = renderHook(() => useColumnFilters(COLUMNS, games, deps, CONFIG));
    expect(result.current.sortCol).toBe("name");
    expect(result.current.sortDir).toBe(1);
    act(() => result.current.toggleSort("name"));
    expect(result.current.sortDir).toBe(-1);
    act(() => result.current.toggleSort("steam"));
    expect(result.current.sortCol).toBe("steam");
    expect(result.current.sortDir).toBe(1);
  });

  it("sorts by name ascending by default", () => {
    const { result } = renderHook(() => useColumnFilters(COLUMNS, games, deps, CONFIG));
    const names = result.current.filtered.map((g) => g.name);
    expect(names).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("sorts by name descending after toggle", () => {
    const { result } = renderHook(() => useColumnFilters(COLUMNS, games, deps, CONFIG));
    act(() => result.current.toggleSort("name"));
    const names = result.current.filtered.map((g) => g.name);
    expect(names).toEqual(["Gamma", "Beta", "Alpha"]);
  });

  it("computes filterCounts from column count() methods", () => {
    const { result } = renderHook(() => useColumnFilters(COLUMNS, games, deps, CONFIG));
    expect(result.current.filterCounts.steam).toBeDefined();
    expect(result.current.filterCounts.steam["vp+"]).toBe(1);
    expect(result.current.filterCounts.steam.nos).toBe(1);
  });

  it("filters respect filterKey — HideColumn uses 'hide' not 'col.key'", () => {
    const { result } = renderHook(() => useColumnFilters(COLUMNS, games, deps, CONFIG));
    expect(result.current.filters.hide).toBe("visible");
  });

  it("initialises sortCol from defaultSort", () => {
    const config = { ...CONFIG, defaultSort: { col: "steam", dir: -1 as const } };
    const { result } = renderHook(() => useColumnFilters(COLUMNS, games, deps, config));
    expect(result.current.sortCol).toBe("steam");
    expect(result.current.sortDir).toBe(-1);
  });

  it("handles empty game list", () => {
    const { result } = renderHook(() => useColumnFilters(COLUMNS, [], deps, CONFIG));
    expect(result.current.filtered).toHaveLength(0);
  });

  it("works with custom column that has filterKey", () => {
    const col = new Column({ key: "epicdate", label: "Date", minWidth: "100px", tooltip: "", filterKey: "year" });
    const { result } = renderHook(() => useColumnFilters([col], games, deps, CONFIG));
    expect(result.current.filters.year).toBeDefined();
    expect(result.current.filters.epicdate).toBeUndefined();
  });
});
