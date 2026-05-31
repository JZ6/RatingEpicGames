import { describe, it, expect } from "vitest";
import { COLUMNS, PINNED_FIRST, PINNED_LAST } from "../GameTable";

describe("COLUMNS order", () => {
  it("should have middle columns sorted alphabetically by label", () => {
    const middle = COLUMNS.filter(
      (c) => !PINNED_FIRST.has(c.key) && !PINNED_LAST.has(c.key)
    );
    const labels = middle.map((c) => c.label);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b));
    expect(labels).toEqual(sorted);
  });

  it("should have pinned-first columns at the start", () => {
    for (let i = 0; i < COLUMNS.length; i++) {
      if (PINNED_FIRST.has(COLUMNS[i].key)) {
        expect(i).toBeLessThan(PINNED_FIRST.size);
      }
    }
  });

  it("should have pinned-last columns at the end", () => {
    const lastN = COLUMNS.slice(-PINNED_LAST.size);
    for (const col of lastN) {
      expect(PINNED_LAST.has(col.key)).toBe(true);
    }
  });
});
