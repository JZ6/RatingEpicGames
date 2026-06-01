import { describe, it, expect } from "vitest";
import { Column, NameColumn, SteamColumn, MetacriticColumn, HltbColumn, OwnedColumn, HideColumn, buildEmptyFilters, computeColWidths, computePinnedSets } from "../GameTableBase";

describe("Column constructor", () => {
  it("defaults filterType to 'select'", () => {
    const col = new Column({ key: "test", label: "Test", minWidth: "90px", tooltip: "tip" });
    expect(col.filterType).toBe("select");
  });

  it("defaults mobileWidth to minWidth", () => {
    const col = new Column({ key: "test", label: "Test", minWidth: "120px", tooltip: "tip" });
    expect(col.mobileWidth).toBe("120px");
  });

  it("allows overriding filterType", () => {
    const col = new Column({ key: "test", label: "Test", minWidth: "90px", tooltip: "tip", filterType: "input" });
    expect(col.filterType).toBe("input");
  });

  it("allows overriding mobileWidth", () => {
    const col = new Column({ key: "test", label: "Test", minWidth: "200px", mobileWidth: "100px", tooltip: "tip" });
    expect(col.mobileWidth).toBe("100px");
  });

  it("defaults defaultFilter to empty string", () => {
    const col = new Column({ key: "test", label: "Test", minWidth: "90px", tooltip: "tip" });
    expect(col.defaultFilter).toBe("");
  });

  it("base filter() returns true", () => {
    const col = new Column({ key: "test", label: "Test", minWidth: "90px", tooltip: "tip" });
    expect(col.filter({}, "any", {})).toBe(true);
  });

  it("base sortValue() returns null", () => {
    const col = new Column({ key: "test", label: "Test", minWidth: "90px", tooltip: "tip" });
    expect(col.sortValue({}, {})).toBeNull();
  });

  it("base count() returns empty object", () => {
    const col = new Column({ key: "test", label: "Test", minWidth: "90px", tooltip: "tip" });
    expect(col.count([], {})).toEqual({});
  });

  it("resolveFilters returns filters by default", () => {
    const filters = [{ value: "", label: "All" }];
    const col = new Column({ key: "test", label: "Test", minWidth: "90px", tooltip: "tip", filters });
    expect(col.resolveFilters({})).toBe(filters);
  });
});

describe("computeColWidths", () => {
  const makeCols = (...specs: [string, string][]) =>
    specs.map(([minWidth, mobileWidth], i) => new Column({
      key: `col${i}`, label: `Col ${i}`, minWidth, mobileWidth, tooltip: "",
    }));

  it("uses minWidth on desktop (container > 800px)", () => {
    const cols = makeCols(["360px", "140px"], ["240px", "120px"]);
    const widths = computeColWidths(cols, 1200);
    expect(widths[0]).toBeGreaterThanOrEqual(360);
    expect(widths[1]).toBeGreaterThanOrEqual(240);
  });

  it("uses mobileWidth when container <= 800px", () => {
    const cols = makeCols(["360px", "140px"], ["240px", "120px"]);
    const widths = computeColWidths(cols, 400);
    expect(widths[0]).toBeLessThan(360);
    expect(widths[1]).toBeLessThan(240);
  });

  it("does not use mobileWidth when container is 0 (initial render)", () => {
    const cols = makeCols(["360px", "140px"], ["240px", "120px"]);
    const widths = computeColWidths(cols, 0);
    expect(widths[0]).toBe(360);
    expect(widths[1]).toBe(240);
  });

  it("distributes extra space evenly", () => {
    const cols = makeCols(["100px", "100px"], ["100px", "100px"]);
    const widths = computeColWidths(cols, 400);
    expect(widths[0]).toBe(200);
    expect(widths[1]).toBe(200);
  });

  it("does not add negative space when mobile widths overflow container", () => {
    const cols = makeCols(["300px", "200px"], ["300px", "150px"]);
    const widths = computeColWidths(cols, 100);
    expect(widths[0]).toBe(200);
    expect(widths[1]).toBe(150);
  });
});

describe("column subclasses", () => {
  it("NameColumn has filterKey 'search' and filterType 'input'", () => {
    const col = new NameColumn();
    expect(col.filterKey).toBe("search");
    expect(col.filterType).toBe("input");
  });

  it("NameColumn has mobileWidth smaller than minWidth", () => {
    const col = new NameColumn();
    expect(parseInt(col.mobileWidth)).toBeLessThan(parseInt(col.minWidth));
  });

  it("NameColumn filter matches by name substring", () => {
    const col = new NameColumn();
    expect(col.filter({ name: "Cyberpunk 2077" }, "cyber", {})).toBe(true);
    expect(col.filter({ name: "Cyberpunk 2077" }, "halo", {})).toBe(false);
    expect(col.filter({ name: "Cyberpunk 2077" }, "", {})).toBe(true);
  });

  it("NameColumn sortValue returns lowercase name", () => {
    const col = new NameColumn();
    expect(col.sortValue({ name: "Cyberpunk 2077" }, {})).toBe("cyberpunk 2077");
  });

  it("SteamColumn has render and filters", () => {
    const col = new SteamColumn();
    expect(col.render).toBeDefined();
    expect(col.filters).toBeDefined();
    expect(col.filters.length).toBeGreaterThan(0);
  });

  it("MetacriticColumn has render and filters", () => {
    const col = new MetacriticColumn();
    expect(col.render).toBeDefined();
    expect(col.filters).toBeDefined();
  });

  it("HltbColumn has render and filters", () => {
    const col = new HltbColumn();
    expect(col.render).toBeDefined();
    expect(col.filters).toBeDefined();
  });

  it("OwnedColumn has render and filters", () => {
    const col = new OwnedColumn();
    expect(col.render).toBeDefined();
    expect(col.filters).toBeDefined();
  });

  it("HideColumn has render and filters", () => {
    const col = new HideColumn();
    expect(col.render).toBeDefined();
    expect(col.filters).toBeDefined();
  });

  it("HideColumn defaults to 'visible' filter", () => {
    const col = new HideColumn();
    expect(col.defaultFilter).toBe("visible");
  });

  it("constructor overrides take precedence", () => {
    const col = new SteamColumn({ minWidth: "300px", tooltip: "custom" });
    expect(col.minWidth).toBe("300px");
    expect(col.tooltip).toBe("custom");
    expect(col.render).toBeDefined();
  });
});

describe("buildEmptyFilters", () => {
  it("builds filters from column defaults", () => {
    const cols = [new NameColumn(), new SteamColumn(), new HideColumn()];
    const filters = buildEmptyFilters(cols);
    expect(filters).toEqual({ search: "", steam: "", hide: "visible" });
  });

  it("uses filterKey when present", () => {
    const col = new Column({ key: "epicdate", label: "Date", minWidth: "100px", tooltip: "", filterKey: "year" });
    expect(buildEmptyFilters([col])).toEqual({ year: "" });
  });
});

// ──────────────────────── computePinnedSets ────────────────────────

describe("computePinnedSets", () => {
  it("returns empty sets for columns with no pinned value", () => {
    const cols = [new Column({ key: "a", label: "A", minWidth: "90px", tooltip: "" })];
    const { pinnedFirst, pinnedLast } = computePinnedSets(cols);
    expect(pinnedFirst.size).toBe(0);
    expect(pinnedLast.size).toBe(0);
  });

  it("puts pinned=first columns into pinnedFirst", () => {
    const cols = [new NameColumn(), new SteamColumn(), new HideColumn()];
    const { pinnedFirst, pinnedLast } = computePinnedSets(cols);
    expect(pinnedFirst.has("name")).toBe(true);
    expect(pinnedFirst.has("steam")).toBe(false);
    expect(pinnedLast.has("hide")).toBe(true);
  });

  it("puts pinned=last columns into pinnedLast", () => {
    const cols = [new OwnedColumn(), new HideColumn()];
    const { pinnedFirst, pinnedLast } = computePinnedSets(cols);
    expect(pinnedLast.has("owned")).toBe(true);
    expect(pinnedLast.has("hide")).toBe(true);
  });

  it("handles empty array", () => {
    const { pinnedFirst, pinnedLast } = computePinnedSets([]);
    expect(pinnedFirst.size).toBe(0);
    expect(pinnedLast.size).toBe(0);
  });
});

// ──────────────────────── column subclass methods ────────────────────────

describe("column subclass count()", () => {
  const games = [{ name: "A" }, { name: "B" }, { name: "C" }];

  it("SteamColumn.count delegates to countSteam", () => {
    const col = new SteamColumn();
    const steam = {
      A: { rating: "Very Positive" as const, pct: 90 },
      B: { rating: "Mixed" as const, pct: 50 },
    };
    const c = col.count(games, { steam });
    expect(c["vp+"]).toBe(1);
    expect(c.neg).toBe(1);
    expect(c.nos).toBe(1);
  });

  it("MetacriticColumn.count delegates to countMetacritic", () => {
    const col = new MetacriticColumn();
    const metacritic = { A: { score: 92 }, B: { score: 40 } };
    const c = col.count(games, { metacritic });
    expect(c["90+"]).toBe(1);
    expect(c["75+"]).toBe(1);
    expect(c["50-"]).toBe(1);
    expect(c.unk).toBe(1);
  });

  it("HltbColumn.count delegates to countHltb", () => {
    const col = new HltbColumn();
    const hltb = { A: { main: 5 }, B: { main: 120 } };
    const c = col.count(games, { hltb });
    expect(c.u10).toBe(1);
    expect(c["100+"]).toBe(1);
    expect(c.unk).toBe(1);
  });

  it("OwnedColumn.count delegates to countHideOwned", () => {
    const col = new OwnedColumn();
    const c = col.count(games, { ownedGames: new Set(["A"]) });
    expect(c.owned).toBe(1);
    expect(c.not).toBe(2);
  });

  it("HideColumn.count delegates to countHideOwned", () => {
    const col = new HideColumn();
    const c = col.count(games, { hiddenGames: new Set(["B"]) });
    expect(c.hidden).toBe(1);
    expect(c.all).toBe(3);
  });
});

describe("column subclass filter()", () => {
  it("SteamColumn.filter delegates to filterBySteam", () => {
    const col = new SteamColumn();
    expect(col.filter({ name: "A" }, "vp+", { steam: { A: { rating: "Very Positive" as const, pct: 90 } } })).toBe(true);
    expect(col.filter({ name: "A" }, "vp+", { steam: { A: { rating: "Mixed" as const, pct: 50 } } })).toBe(false);
  });

  it("HideColumn.filter delegates to filterByHide", () => {
    const col = new HideColumn();
    expect(col.filter({ name: "A" }, "visible", { hiddenGames: new Set() })).toBe(true);
    expect(col.filter({ name: "A" }, "visible", { hiddenGames: new Set(["A"]) })).toBe(false);
  });

  it("OwnedColumn.filter delegates to filterByOwned", () => {
    const col = new OwnedColumn();
    expect(col.filter({ name: "A" }, "owned", { ownedGames: new Set(["A"]) })).toBe(true);
    expect(col.filter({ name: "A" }, "owned", { ownedGames: new Set() })).toBe(false);
  });
});

describe("column subclass sortValue()", () => {
  it("SteamColumn.sortValue uses tier*1000 + pct", () => {
    const col = new SteamColumn();
    const v = col.sortValue({ name: "A" }, { steam: { A: { rating: "Very Positive" as const, pct: 85 } } });
    expect(v).toBe(6085);
  });

  it("MetacriticColumn.sortValue returns score", () => {
    const col = new MetacriticColumn();
    expect(col.sortValue({ name: "A" }, { metacritic: { A: { score: 92 } } })).toBe(92);
    expect(col.sortValue({ name: "A" }, { metacritic: {} })).toBeNull();
  });

  it("HltbColumn.sortValue returns averaged hours", () => {
    const col = new HltbColumn();
    const v = col.sortValue({ name: "A" }, { hltb: { A: { main: 10, extra: 20 } } });
    expect(v).toBe(15);
  });

  it("HideColumn.sortValue returns 0 or 1", () => {
    const col = new HideColumn();
    expect(col.sortValue({ name: "A" }, { hiddenGames: new Set(["A"]) })).toBe(1);
    expect(col.sortValue({ name: "A" }, { hiddenGames: new Set() })).toBe(0);
  });
});
