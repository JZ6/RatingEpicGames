import { describe, it, expect } from "vitest";
import { COLUMNS } from "../GameTable";
import { buildEmptyFilters } from "@shared/components/Column";

const pinnedFirst = COLUMNS.filter((c) => c.pinned === "first");
const pinnedLast = COLUMNS.filter((c) => c.pinned === "last");
const middle = COLUMNS.filter((c) => !c.pinned);

describe("COLUMNS order", () => {
  it("should have middle columns sorted alphabetically by label", () => {
    const labels = middle.map((c) => c.label);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b));
    expect(labels).toEqual(sorted);
  });

  it("should have pinned-first columns at the start", () => {
    for (let i = 0; i < pinnedFirst.length; i++) {
      expect(COLUMNS[i].pinned).toBe("first");
    }
  });

  it("should have pinned-last columns at the end", () => {
    const lastN = COLUMNS.slice(-pinnedLast.length);
    for (const col of lastN) {
      expect(col.pinned).toBe("last");
    }
  });
});

describe("COLUMNS filterKey contract", () => {
  const EMPTY_FILTERS = buildEmptyFilters(COLUMNS);
  const validKeys = new Set(Object.keys(EMPTY_FILTERS));

  it("every column filterKey must exist in Filters type", () => {
    for (const col of COLUMNS) {
      const fk = col.filterKey || col.key;
      expect(validKeys.has(fk), `column "${col.key}" uses filterKey "${fk}" which is not in Filters`).toBe(true);
    }
  });

  it("name column must use filterKey 'search', not 'name'", () => {
    const nameCol = COLUMNS.find((c) => c.key === "name");
    expect(nameCol).toBeDefined();
    expect(nameCol!.filterKey).toBe("search");
  });
});

describe("COLUMNS required and pinned", () => {
  it("name column is required", () => {
    const col = COLUMNS.find((c) => c.key === "name");
    expect(col!.required).toBe(true);
  });

  it("name column is pinned first", () => {
    const col = COLUMNS.find((c) => c.key === "name");
    expect(col!.pinned).toBe("first");
  });

  it("hide column is pinned last", () => {
    const col = COLUMNS.find((c) => c.key === "hide");
    expect(col!.pinned).toBe("last");
  });

  it("owned column is pinned last", () => {
    const col = COLUMNS.find((c) => c.key === "owned");
    expect(col!.pinned).toBe("last");
  });

  it("name column has placeholder and ariaLabel", () => {
    const col = COLUMNS.find((c) => c.key === "name");
    expect(col!.placeholder).toBeDefined();
    expect(col!.ariaLabel).toBeDefined();
  });
});

describe("COLUMNS render coverage", () => {
  const SPECIAL_KEYS = new Set(["name", "tags"]);

  it("every non-special column must have a render function", () => {
    for (const col of COLUMNS) {
      if (SPECIAL_KEYS.has(col.key)) continue;
      expect(typeof col.render, `column "${col.key}" is missing a render function`).toBe("function");
    }
  });
});

describe("COLUMNS mobileWidth", () => {
  it("every column should have a mobileWidth", () => {
    for (const col of COLUMNS) {
      expect(col.mobileWidth, `column "${col.key}" is missing mobileWidth`).toBeDefined();
    }
  });
});
