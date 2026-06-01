import { describe, it, expect } from "vitest";
import { COLUMNS } from "../GameTable";
import { buildEmptyFilters } from "@shared/components/Column";

const pinnedFirst = COLUMNS.filter((c) => c.pinned === "first");
const pinnedLast = COLUMNS.filter((c) => c.pinned === "last");

describe("COLUMNS order", () => {
  it("should have pinned-first columns at the start", () => {
    for (let i = 0; i < pinnedFirst.length; i++) {
      expect(COLUMNS[i].pinned).toBe("first");
    }
  });

  it("should have hide column at the end", () => {
    const last = COLUMNS[COLUMNS.length - 1];
    expect(last.key).toBe("hide");
  });

  it("hide is the last column (always pinned last)", () => {
    expect(COLUMNS[COLUMNS.length - 1].key).toBe("hide");
    expect(COLUMNS[COLUMNS.length - 1].pinned).toBe("last");
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

  it("epicdate column must use filterKey 'year'", () => {
    const col = COLUMNS.find((c) => c.key === "epicdate");
    expect(col).toBeDefined();
    expect(col!.filterKey).toBe("year");
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

  it("name column has placeholder and ariaLabel", () => {
    const col = COLUMNS.find((c) => c.key === "name");
    expect(col!.placeholder).toBeDefined();
    expect(col!.ariaLabel).toBeDefined();
  });
});

describe("COLUMNS render coverage", () => {
  const SPECIAL_KEYS = new Set(["name"]);

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
