import { describe, it, expect } from "vitest";
import { COLUMNS } from "../GameTable";
import { buildEmptyFilters } from "@shared/components/Column";
import type { EpicGame, EpicInfo } from "../../types";

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

// ──────────────────────── column class method unit tests ────────────────────────

const eg = (name = "Test"): EpicGame => ({ name, slug: name.toLowerCase() });

const epicInfo = (year: number, rating?: number, platforms?: string[]): EpicInfo => ({
  slug: "test",
  free_dates: [{ start: `${year}-06-15`, end: `${year}-06-22` }],
  epic_rating: rating,
  platforms,
});

describe("EpicDateColumn methods", () => {
  const col = COLUMNS.find(c => c.key === "epicdate")!;

  it("resolveFilters builds year options in reverse order", () => {
    const counts = { "2022": 3, "2024": 5, "2023": 2 };
    const opts = col.resolveFilters(counts);
    expect(opts[0]).toEqual({ value: "", label: "All Years" });
    expect(opts[1].value).toBe("2024");
    expect(opts[2].value).toBe("2023");
    expect(opts[3].value).toBe("2022");
  });

  it("resolveFilters with empty counts returns only All Years", () => {
    const opts = col.resolveFilters({});
    expect(opts).toHaveLength(1);
    expect(opts[0].value).toBe("");
  });

  it("filter matches year of last free_date", () => {
    const game = eg();
    const epic = { Test: epicInfo(2024) };
    expect(col.filter(game, "2024", { epic })).toBe(true);
    expect(col.filter(game, "2023", { epic })).toBe(false);
  });

  it("filter('') passes all", () => {
    expect(col.filter(eg(), "", {})).toBe(true);
  });

  it("filter returns false when no epic info", () => {
    expect(col.filter(eg(), "2024", { epic: {} })).toBe(false);
  });

  it("count groups games by year of last free_date", () => {
    const games = [eg("A"), eg("B"), eg("C")];
    const epic = { A: epicInfo(2024), B: epicInfo(2024), C: epicInfo(2023) };
    const c = col.count(games, { epic });
    expect(c["2024"]).toBe(2);
    expect(c["2023"]).toBe(1);
  });

  it("sortValue returns timestamp", () => {
    const game = eg();
    const epic = { Test: epicInfo(2024) };
    const v = col.sortValue(game, { epic });
    expect(typeof v).toBe("number");
  });
});

describe("UserScoreColumn methods", () => {
  const col = COLUMNS.find(c => c.key === "userscore")!;

  it("filter('8+') passes scores ≥ 8", () => {
    const deps = { metacritic: { Test: { user_score: 8.5 } } };
    expect(col.filter(eg(), "8+", deps)).toBe(true);
    expect(col.filter(eg(), "8+", { metacritic: { Test: { user_score: 7.9 } } })).toBe(false);
  });

  it("filter('4-') passes scores < 4", () => {
    expect(col.filter(eg(), "4-", { metacritic: { Test: { user_score: 3.5 } } })).toBe(true);
    expect(col.filter(eg(), "4-", { metacritic: { Test: { user_score: 4.0 } } })).toBe(false);
  });

  it("filter('') passes all", () => {
    expect(col.filter(eg(), "", {})).toBe(true);
  });

  it("sortValue returns user_score or null", () => {
    expect(col.sortValue(eg(), { metacritic: { Test: { user_score: 7.5 } } })).toBe(7.5);
    expect(col.sortValue(eg(), { metacritic: {} })).toBeNull();
  });

  it("count tallies 8+/6+/4- buckets", () => {
    const games = [eg("A"), eg("B"), eg("C")];
    const metacritic = { A: { user_score: 8.5 }, B: { user_score: 6.5 }, C: { user_score: 3.0 } };
    const c = col.count(games, { metacritic });
    expect(c["8+"]).toBe(1);
    expect(c["6+"]).toBe(2);
    expect(c["4-"]).toBe(1);
  });
});

describe("PlatformColumn methods", () => {
  const col = COLUMNS.find(c => c.key === "platform")!;

  it("filter('pc') passes PC games (default platform)", () => {
    expect(col.filter(eg(), "pc", { epic: {} })).toBe(true);
    expect(col.filter(eg(), "pc", { epic: { Test: epicInfo(2024, undefined, ["ios"]) } })).toBe(false);
  });

  it("filter('mobile') passes games with ios or android", () => {
    const deps = { epic: { Test: epicInfo(2024, undefined, ["pc", "ios"]) } };
    expect(col.filter(eg(), "mobile", deps)).toBe(true);
    expect(col.filter(eg(), "mobile", { epic: { Test: epicInfo(2024, undefined, ["pc"]) } })).toBe(false);
  });

  it("count tallies pc and mobile", () => {
    const games = [eg("A"), eg("B"), eg("C")];
    const epic = {
      A: epicInfo(2024, undefined, ["pc"]),
      B: epicInfo(2024, undefined, ["pc", "ios"]),
      C: epicInfo(2024, undefined, ["android"]),
    };
    const c = col.count(games, { epic });
    expect(c.pc).toBe(2);
    expect(c.mobile).toBe(2);
  });
});

describe("EpicRatingColumn methods", () => {
  const col = COLUMNS.find(c => c.key === "epicrating")!;

  it("filter('4.5+') passes ratings ≥ 4.5", () => {
    const deps = { epic: { Test: epicInfo(2024, 4.8) } };
    expect(col.filter(eg(), "4.5+", deps)).toBe(true);
    expect(col.filter(eg(), "4.5+", { epic: { Test: epicInfo(2024, 4.3) } })).toBe(false);
  });

  it("filter('3+') passes ratings ≥ 3", () => {
    expect(col.filter(eg(), "3+", { epic: { Test: epicInfo(2024, 3.5) } })).toBe(true);
    expect(col.filter(eg(), "3+", { epic: { Test: epicInfo(2024, 2.9) } })).toBe(false);
  });

  it("filter('') passes all", () => {
    expect(col.filter(eg(), "", {})).toBe(true);
  });

  it("sortValue returns rating or null", () => {
    expect(col.sortValue(eg(), { epic: { Test: epicInfo(2024, 4.2) } })).toBe(4.2);
    expect(col.sortValue(eg(), { epic: {} })).toBeNull();
  });
});
