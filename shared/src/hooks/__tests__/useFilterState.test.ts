import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { sortComparator, useFilterState } from "../useFilterState";
import type { SortDir } from "../useFilterState";

// localStorage cleared by setup.ts beforeEach

// ──────────────────────── sortComparator ────────────────────────

describe("sortComparator", () => {
  it("sorts numbers ascending (dir=1)", () => {
    const items = [{ v: 3 }, { v: 1 }, { v: 2 }];
    items.sort((a, b) => sortComparator(a, b, 1, (x) => x.v));
    expect(items.map((x) => x.v)).toEqual([1, 2, 3]);
  });

  it("sorts numbers descending (dir=-1)", () => {
    const items = [{ v: 3 }, { v: 1 }, { v: 2 }];
    items.sort((a, b) => sortComparator(a, b, -1, (x) => x.v));
    expect(items.map((x) => x.v)).toEqual([3, 2, 1]);
  });

  it("sorts strings ascending", () => {
    const items = [{ v: "banana" }, { v: "apple" }, { v: "cherry" }];
    items.sort((a, b) => sortComparator(a, b, 1, (x) => x.v));
    expect(items.map((x) => x.v)).toEqual(["apple", "banana", "cherry"]);
  });

  it("sorts strings descending", () => {
    const items = [{ v: "banana" }, { v: "apple" }, { v: "cherry" }];
    items.sort((a, b) => sortComparator(a, b, -1, (x) => x.v));
    expect(items.map((x) => x.v)).toEqual(["cherry", "banana", "apple"]);
  });

  it("null values always sort to the end regardless of direction", () => {
    const items = [{ v: null }, { v: 5 }, { v: null }, { v: 2 }];
    items.sort((a, b) => sortComparator(a, b, 1, (x) => x.v));
    expect(items.map((x) => x.v)).toEqual([2, 5, null, null]);

    items.sort((a, b) => sortComparator(a, b, -1, (x) => x.v));
    expect(items.map((x) => x.v)).toEqual([5, 2, null, null]);
  });

  it("two nulls are equal", () => {
    expect(sortComparator({ v: null }, { v: null }, 1, (x) => x.v)).toBe(0);
  });

  it("handles mixed number and null", () => {
    const a = sortComparator({ v: 1 }, { v: null }, 1, (x) => x.v);
    expect(a).toBeLessThan(0); // non-null before null
    const b = sortComparator({ v: null }, { v: 1 }, 1, (x) => x.v);
    expect(b).toBeGreaterThan(0); // null after non-null
  });

  it("equal non-null values return 0", () => {
    expect(sortComparator({ v: 5 }, { v: 5 }, 1, (x) => x.v)).toBe(0);
    expect(sortComparator({ v: "a" }, { v: "a" }, 1, (x) => x.v)).toBe(0);
  });
});

// ──────────────────────── useFilterState ────────────────────────

const EMPTY = { search: "", status: "" };
const CONFIG = {
  emptyFilters: EMPTY,
  lsFiltersKey: "test-fs-filters",
  lsSortKey: "test-fs-sort",
  defaultSort: { col: "name", dir: 1 as SortDir },
};

describe("useFilterState", () => {
  it("initialises filters from emptyFilters", () => {
    const { result } = renderHook(() => useFilterState(CONFIG));
    expect(result.current.filters).toEqual(EMPTY);
  });

  it("initialises sortCol and sortDir from defaultSort", () => {
    const { result } = renderHook(() => useFilterState(CONFIG));
    expect(result.current.sortCol).toBe("name");
    expect(result.current.sortDir).toBe(1);
  });

  it("setFilter updates a single key", () => {
    const { result } = renderHook(() => useFilterState(CONFIG));
    act(() => result.current.setFilter("search", "hello"));
    expect(result.current.filters.search).toBe("hello");
    expect(result.current.filters.status).toBe("");
  });

  it("clearFilters resets to emptyFilters", () => {
    const { result } = renderHook(() => useFilterState(CONFIG));
    act(() => result.current.setFilter("search", "hello"));
    act(() => result.current.clearFilters());
    expect(result.current.filters).toEqual(EMPTY);
  });

  it("toggleSort same column flips direction", () => {
    const { result } = renderHook(() => useFilterState(CONFIG));
    act(() => result.current.toggleSort("name"));
    expect(result.current.sortCol).toBe("name");
    expect(result.current.sortDir).toBe(-1);
    act(() => result.current.toggleSort("name"));
    expect(result.current.sortDir).toBe(1);
  });

  it("toggleSort new column resets to ascending", () => {
    const { result } = renderHook(() => useFilterState(CONFIG));
    act(() => result.current.toggleSort("status"));
    expect(result.current.sortCol).toBe("status");
    expect(result.current.sortDir).toBe(1);
  });

  it("persists filters to localStorage on change", () => {
    const { result } = renderHook(() => useFilterState(CONFIG));
    act(() => result.current.setFilter("search", "saved"));
    const stored = JSON.parse(localStorage.getItem("test-fs-filters") ?? "{}");
    expect(stored.search).toBe("saved");
  });

  it("persists sort to localStorage on change", () => {
    const { result } = renderHook(() => useFilterState(CONFIG));
    act(() => result.current.toggleSort("status"));
    const stored = JSON.parse(localStorage.getItem("test-fs-sort") ?? "{}");
    expect(stored.col).toBe("status");
    expect(stored.dir).toBe(1);
  });

  it("restores filters from localStorage on mount", () => {
    window.history.replaceState(null, "", window.location.pathname);
    localStorage.setItem("test-fs-filters", JSON.stringify({ search: "restored", status: "" }));
    const { result } = renderHook(() => useFilterState(CONFIG));
    expect(result.current.filters.search).toBe("restored");
  });

  it("restores sort from localStorage on mount", () => {
    localStorage.setItem("test-fs-sort", JSON.stringify({ col: "status", dir: -1 }));
    const { result } = renderHook(() => useFilterState(CONFIG));
    expect(result.current.sortCol).toBe("status");
    expect(result.current.sortDir).toBe(-1);
  });
});
