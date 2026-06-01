import { describe, it, expect } from "vitest";
import {
  filterBySteam, filterByMetacritic, filterByHltb, filterByHide, filterByOwned,
  steamSortVal, metacriticSortVal, hltbSortVal, hideSortVal, ownedSortVal,
  countSteam, countMetacritic, countHltb, countHideOwned,
} from "../filters";
import type { SteamInfo, HltbInfo, MetacriticInfo } from "../types";

// ──────────────────────── filterBySteam ────────────────────────

describe("filterBySteam", () => {
  const si = (rating: SteamInfo["rating"], pct = 80): SteamInfo => ({ rating, pct });

  it("passes all when filter empty", () => {
    expect(filterBySteam(undefined, "")).toBe(true);
    expect(filterBySteam(si("Very Positive"), "")).toBe(true);
  });

  it("op+: passes Overwhelmingly Positive only", () => {
    expect(filterBySteam(si("Overwhelmingly Positive"), "op+")).toBe(true);
    expect(filterBySteam(si("Very Positive"), "op+")).toBe(false);
    expect(filterBySteam(undefined, "op+")).toBe(false);
  });

  it("vp+: passes Very Positive and above", () => {
    expect(filterBySteam(si("Overwhelmingly Positive"), "vp+")).toBe(true);
    expect(filterBySteam(si("Very Positive"), "vp+")).toBe(true);
    expect(filterBySteam(si("Positive"), "vp+")).toBe(false);
  });

  it("mp+: passes Mostly Positive and above", () => {
    expect(filterBySteam(si("Mostly Positive"), "mp+")).toBe(true);
    expect(filterBySteam(si("Mixed"), "mp+")).toBe(false);
  });

  it("neg: passes Negative and Mixed ratings (0-3 range)", () => {
    expect(filterBySteam(si("Negative"), "neg")).toBe(true);
    expect(filterBySteam(si("Very Negative"), "neg")).toBe(true);
    expect(filterBySteam(si("Mixed"), "neg")).toBe(true); // Mixed = order 3, within 0-3
    expect(filterBySteam(si("Positive"), "neg")).toBe(false);
    expect(filterBySteam(undefined, "neg")).toBe(false);
  });

  it("nos: passes games not on Steam", () => {
    expect(filterBySteam(undefined, "nos")).toBe(true);
    expect(filterBySteam(si("Very Positive"), "nos")).toBe(false);
  });

  it("unk: passes games on Steam with no valid rating", () => {
    expect(filterBySteam({ appid: 123 }, "unk")).toBe(true);      // on Steam but no rating
    expect(filterBySteam(undefined, "unk")).toBe(false);           // not on Steam — use "nos" instead
    expect(filterBySteam(si("Very Positive"), "unk")).toBe(false); // has rating, filtered out
  });
});

// ──────────────────────── filterByMetacritic ────────────────────────

describe("filterByMetacritic", () => {
  it("passes all when filter empty", () => {
    expect(filterByMetacritic(undefined, "")).toBe(true);
    expect(filterByMetacritic(85, "")).toBe(true);
  });

  it("90+: passes scores >= 90 only", () => {
    expect(filterByMetacritic(90, "90+")).toBe(true);
    expect(filterByMetacritic(95, "90+")).toBe(true);
    expect(filterByMetacritic(89, "90+")).toBe(false);
    expect(filterByMetacritic(undefined, "90+")).toBe(false);
  });

  it("75+: passes scores >= 75", () => {
    expect(filterByMetacritic(75, "75+")).toBe(true);
    expect(filterByMetacritic(74, "75+")).toBe(false);
  });

  it("50-: passes scores below 50", () => {
    expect(filterByMetacritic(49, "50-")).toBe(true);
    expect(filterByMetacritic(50, "50-")).toBe(false);
    expect(filterByMetacritic(undefined, "50-")).toBe(false);
  });

  it("unk: passes games with no metacritic score", () => {
    expect(filterByMetacritic(undefined, "unk")).toBe(true);
    expect(filterByMetacritic(75, "unk")).toBe(false);
  });
});

// ──────────────────────── filterByHltb ────────────────────────

describe("filterByHltb", () => {
  it("passes all when filter empty", () => {
    expect(filterByHltb(undefined, "")).toBe(true);
    expect(filterByHltb(50, "")).toBe(true);
  });

  it("u10: passes games under 10 hours", () => {
    expect(filterByHltb(9, "u10")).toBe(true);
    expect(filterByHltb(10, "u10")).toBe(false);
    expect(filterByHltb(undefined, "u10")).toBe(false);
  });

  it("u60: passes games under 60 hours", () => {
    expect(filterByHltb(59, "u60")).toBe(true);
    expect(filterByHltb(60, "u60")).toBe(false);
  });

  it("u100: passes games under 100 hours", () => {
    expect(filterByHltb(99, "u100")).toBe(true);
    expect(filterByHltb(100, "u100")).toBe(false);
  });

  it("100+: passes games 100+ hours", () => {
    expect(filterByHltb(100, "100+")).toBe(true);
    expect(filterByHltb(99, "100+")).toBe(false);
    expect(filterByHltb(undefined, "100+")).toBe(false);
  });

  it("unk: passes games with no HLTB data", () => {
    expect(filterByHltb(undefined, "unk")).toBe(true);
    expect(filterByHltb(10, "unk")).toBe(false);
  });
});

// ──────────────────────── filterByHide / filterByOwned ────────────────────────

describe("filterByHide", () => {
  it("visible: hides hidden games", () => {
    expect(filterByHide(false, "visible")).toBe(true);
    expect(filterByHide(true, "visible")).toBe(false);
  });

  it("hidden: shows only hidden games", () => {
    expect(filterByHide(true, "hidden")).toBe(true);
    expect(filterByHide(false, "hidden")).toBe(false);
  });

  it("empty filter passes all", () => {
    expect(filterByHide(true, "")).toBe(true);
    expect(filterByHide(false, "")).toBe(true);
  });
});

describe("filterByOwned", () => {
  it("empty filter passes all", () => {
    expect(filterByOwned(false, "")).toBe(true);
    expect(filterByOwned(true, "")).toBe(true);
  });

  it("owned: shows only owned games", () => {
    expect(filterByOwned(true, "owned")).toBe(true);
    expect(filterByOwned(false, "owned")).toBe(false);
  });

  it("not: shows only unowned games", () => {
    expect(filterByOwned(false, "not")).toBe(true);
    expect(filterByOwned(true, "not")).toBe(false);
  });
});

// ──────────────────────── sort value functions ────────────────────────

describe("steamSortVal", () => {
  it("returns null when no steam data", () => {
    expect(steamSortVal(undefined)).toBeNull();
    expect(steamSortVal({})).toBeNull();
  });

  it("overwhelmingly positive sorts higher than very positive", () => {
    const op = steamSortVal({ rating: "Overwhelmingly Positive", pct: 98 })!;
    const vp = steamSortVal({ rating: "Very Positive", pct: 90 })!;
    expect(op).toBeGreaterThan(vp);
  });

  it("same tier: higher pct sorts higher", () => {
    const hi = steamSortVal({ rating: "Very Positive", pct: 95 })!;
    const lo = steamSortVal({ rating: "Very Positive", pct: 80 })!;
    expect(hi).toBeGreaterThan(lo);
  });
});

describe("metacriticSortVal", () => {
  it("returns null when no data", () => {
    expect(metacriticSortVal(undefined)).toBeNull();
    expect(metacriticSortVal({})).toBeNull();
  });

  it("returns numeric score", () => {
    expect(metacriticSortVal({ score: 85 })).toBe(85);
  });
});

describe("hltbSortVal", () => {
  it("returns null when no data", () => {
    expect(hltbSortVal(undefined)).toBeNull();
    expect(hltbSortVal({})).toBeNull();
  });

  it("returns averaged hours", () => {
    const val = hltbSortVal({ main: 10, extra: 20 });
    expect(val).toBe(15);
  });
});

describe("hideSortVal", () => {
  it("returns 1 for hidden games", () => {
    expect(hideSortVal("Game A", new Set(["Game A"]))).toBe(1);
  });

  it("returns 0 for visible games", () => {
    expect(hideSortVal("Game A", new Set(["Game B"]))).toBe(0);
  });

  it("returns 0 when no hidden set", () => {
    expect(hideSortVal("Game A", undefined)).toBe(0);
  });
});

describe("ownedSortVal", () => {
  it("returns 1 for owned games", () => {
    expect(ownedSortVal("Game A", new Set(["Game A"]))).toBe(1);
  });

  it("returns 0 for unowned games", () => {
    expect(ownedSortVal("Game A", new Set())).toBe(0);
  });
});

// ──────────────────────── count functions ────────────────────────

describe("countSteam", () => {
  const games = [
    { name: "A" }, { name: "B" }, { name: "C" }, { name: "D" },
  ];
  const steam: Record<string, SteamInfo> = {
    A: { rating: "Overwhelmingly Positive", pct: 98 },
    B: { rating: "Mostly Positive", pct: 72 },
    C: { rating: "Very Negative", pct: 20 },
    // D: not on Steam
  };

  it("counts op+ correctly", () => {
    expect(countSteam(games, steam)["op+"]).toBe(1);
  });

  it("counts vp+ (includes op+) correctly", () => {
    expect(countSteam(games, steam)["vp+"]).toBe(1);
  });

  it("counts mp+ (includes vp+ and op+) correctly", () => {
    expect(countSteam(games, steam)["mp+"]).toBe(2);
  });

  it("counts neg correctly", () => {
    expect(countSteam(games, steam).neg).toBe(1);
  });

  it("counts not on steam", () => {
    expect(countSteam(games, steam).nos).toBe(1);
  });
});

describe("countMetacritic", () => {
  const games = [{ name: "A" }, { name: "B" }, { name: "C" }];
  const mc: Record<string, MetacriticInfo> = {
    A: { score: 92 },
    B: { score: 78 },
    C: { score: 40 },
  };

  it("counts 90+ correctly", () => {
    expect(countMetacritic(games, mc)["90+"]).toBe(1);
  });

  it("counts 75+ correctly", () => {
    expect(countMetacritic(games, mc)["75+"]).toBe(2);
  });

  it("counts below 50 correctly", () => {
    expect(countMetacritic(games, mc)["50-"]).toBe(1);
  });

  it("counts unknown correctly", () => {
    const withUnknown = [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }];
    expect(countMetacritic(withUnknown, mc).unk).toBe(1); // D has no metacritic
  });
});

describe("countHltb", () => {
  const games = [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }];
  const hltb: Record<string, HltbInfo> = {
    A: { main: 5 },
    B: { main: 30 },
    C: { main: 120 },
    // D: no data
  };

  it("counts under 10h correctly", () => {
    expect(countHltb(games, hltb).u10).toBe(1);
  });

  it("counts under 60h correctly", () => {
    expect(countHltb(games, hltb).u60).toBe(2);
  });

  it("counts 100+ correctly", () => {
    expect(countHltb(games, hltb)["100+"]).toBe(1);
  });

  it("counts unknown correctly", () => {
    expect(countHltb(games, hltb).unk).toBe(1);
  });
});

describe("countHideOwned", () => {
  const games = [{ name: "A" }, { name: "B" }, { name: "C" }];

  it("counts hidden games", () => {
    const { hide } = countHideOwned(games, new Set(["A", "B"]), new Set());
    expect(hide.hidden).toBe(2);
    expect(hide.all).toBe(3);
  });

  it("counts owned games", () => {
    const { owned } = countHideOwned(games, new Set(), new Set(["C"]));
    expect(owned.owned).toBe(1);
    expect(owned.not).toBe(2);
  });
});

// ──────────────────────── additional edge cases ────────────────────────

describe("countSteam — unk bucket", () => {
  it("counts games on Steam with no valid rating as unk", () => {
    const games = [{ name: "A" }, { name: "B" }, { name: "C" }];
    const steam: Record<string, any> = {
      A: { appid: 12345 },
      B: { appid: 67890, rating: "Positive", pct: 80 },
    };
    const c = countSteam(games, steam);
    expect(c.unk).toBe(1);
    expect(c.nos).toBe(1);
    expect(c["mp+"]).toBe(1);
  });
});

describe("countHltb — u100 bucket", () => {
  it("counts games under 100 hours", () => {
    const games = [{ name: "Short" }, { name: "Med" }, { name: "Long" }];
    const hltb: Record<string, any> = {
      Short: { main: 5 },
      Med: { main: 50 },
      Long: { main: 120 },
    };
    const c = countHltb(games, hltb);
    expect(c.u100).toBe(2);
    expect(c.u60).toBe(2);
    expect(c["100+"]).toBe(1);
  });
});

describe("filterByMetacritic — boundary values", () => {
  it("score 74 fails 75+ filter", () => {
    expect(filterByMetacritic(74, "75+")).toBe(false);
  });

  it("score 75 passes 75+ filter", () => {
    expect(filterByMetacritic(75, "75+")).toBe(true);
  });

  it("score 50 fails 50- filter (boundary exclusive)", () => {
    expect(filterByMetacritic(50, "50-")).toBe(false);
  });

  it("score 49 passes 50- filter", () => {
    expect(filterByMetacritic(49, "50-")).toBe(true);
  });

  it("score 89 fails 90+ but passes 75+", () => {
    expect(filterByMetacritic(89, "90+")).toBe(false);
    expect(filterByMetacritic(89, "75+")).toBe(true);
  });
});

describe("filterBySteam — neg filter edge cases", () => {
  it("Mostly Negative passes neg filter", () => {
    expect(filterBySteam({ rating: "Mostly Negative", pct: 30 }, "neg")).toBe(true);
  });

  it("Mixed passes neg filter", () => {
    expect(filterBySteam({ rating: "Mixed", pct: 45 }, "neg")).toBe(true);
  });

  it("Mostly Positive fails neg filter", () => {
    expect(filterBySteam({ rating: "Mostly Positive", pct: 65 }, "neg")).toBe(false);
  });

  it("no rating on Steam fails neg filter", () => {
    expect(filterBySteam({ appid: 12345 }, "neg")).toBe(false);
  });
});
