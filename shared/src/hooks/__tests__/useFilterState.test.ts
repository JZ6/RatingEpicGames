import { describe, it, expect, beforeEach } from "vitest";
import { sortComparator } from "../useFilterState";

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
});
