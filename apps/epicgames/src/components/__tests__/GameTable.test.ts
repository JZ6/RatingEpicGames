import { describe, it, expect } from "vitest";
import { COLUMNS, PINNED_FIRST, PINNED_LAST } from "../GameTable";
import type { Filters } from "../../types";

describe("COLUMNS order", () => {
  it("should have pinned-first columns at the start", () => {
    for (let i = 0; i < COLUMNS.length; i++) {
      if (PINNED_FIRST.has(COLUMNS[i].key)) {
        expect(i).toBeLessThan(PINNED_FIRST.size);
      }
    }
  });

  it("should have hide column at the end", () => {
    const last = COLUMNS[COLUMNS.length - 1];
    expect(last.key).toBe("hide");
  });
});

describe("COLUMNS filterKey contract", () => {
  const EMPTY_FILTERS: Filters = { search: "", steam: "", metacritic: "", userscore: "", hltb: "", year: "", epicrating: "", platform: "", hide: "visible", owned: "" };
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
