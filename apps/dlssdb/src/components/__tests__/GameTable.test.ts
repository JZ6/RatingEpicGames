import { describe, it, expect } from "vitest";
import { COLUMNS } from "../GameTable";
import { buildEmptyFilters } from "@shared/components/Column";
import type { DlssGame } from "../../types";

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

// ──────────────────────── column class method unit tests ────────────────────────

const g = (overrides: Partial<DlssGame> = {}): DlssGame => ({
  sno: 1, name: "Test", type: "Game",
  "dlss multi frame generation": "", "dlss frame generation": "",
  "dlss super resolution": "", "dlss ray reconstruction": "",
  dlaa: "", "ray tracing": "", ai: "",
  ...overrides,
});

describe("FrameGenColumn methods", () => {
  const col = COLUMNS.find(c => c.key === "framegen")!;

  it("filter('6x') passes only 6X games", () => {
    expect(col.filter(g({ "dlss multi frame generation": "NV, 6X" }), "6x", {})).toBe(true);
    expect(col.filter(g({ "dlss multi frame generation": "NV, 4X" }), "6x", {})).toBe(false);
    expect(col.filter(g(), "6x", {})).toBe(false);
  });

  it("filter('any') passes games with any FG", () => {
    expect(col.filter(g({ "dlss frame generation": "Yes" }), "any", {})).toBe(true);
    expect(col.filter(g(), "any", {})).toBe(false);
  });

  it("filter('') passes all", () => {
    expect(col.filter(g(), "", {})).toBe(true);
  });

  it("sortValue returns level or null for no FG", () => {
    expect(col.sortValue(g({ "dlss multi frame generation": "NV, 6X" }), {})).toBe(3);
    expect(col.sortValue(g({ "dlss multi frame generation": "NV, 4X" }), {})).toBe(2);
    expect(col.sortValue(g({ "dlss frame generation": "Yes" }), {})).toBe(1);
    expect(col.sortValue(g(), {})).toBeNull();
  });

  it("count tallies 6x/4x/2x/any/none buckets", () => {
    const games = [
      g({ "dlss multi frame generation": "NV, 6X" }),
      g({ "dlss multi frame generation": "NV, 4X" }),
      g({ "dlss frame generation": "Yes" }),
      g(),
    ];
    const c = col.count(games, {});
    expect(c["6x"]).toBe(1);
    expect(c["4x"]).toBe(1);
    expect(c["2x"]).toBe(1);
    expect(c.any).toBe(3);
    expect(c.none).toBe(1);
  });
});

describe("DlssVersionColumn methods", () => {
  const col = COLUMNS.find(c => c.key === "dlssver")!;

  it("filter('4.5+') passes only 4.5 games", () => {
    expect(col.filter(g({ "dlss multi frame generation": "NV, 6X" }), "4.5+", {})).toBe(true);
    expect(col.filter(g({ "dlss multi frame generation": "NV, 4X" }), "4.5+", {})).toBe(false);
  });

  it("filter('3+') passes FG, RR, MFG games", () => {
    expect(col.filter(g({ "dlss frame generation": "Yes" }), "3+", {})).toBe(true);
    expect(col.filter(g({ "dlss ray reconstruction": "Yes" }), "3+", {})).toBe(true);
    expect(col.filter(g({ "dlss super resolution": "Yes" }), "3+", {})).toBe(false);
  });

  it("count tallies 4.5+/4+/3+ buckets", () => {
    const games = [
      g({ "dlss multi frame generation": "NV, 6X" }),
      g({ "dlss frame generation": "Yes" }),
      g({ "dlss super resolution": "Yes" }),
    ];
    const c = col.count(games, {});
    expect(c["4.5+"]).toBe(1);
    expect(c["4+"]).toBe(1);
    expect(c["3+"]).toBe(2);
  });
});

describe("UpscalingColumn methods", () => {
  const col = COLUMNS.find(c => c.key === "upscaling")!;
  const deps = (u: Record<string, any>) => ({ upscaling: u });

  it("filter('fsr') passes game with fsr_version", () => {
    expect(col.filter(g(), "fsr", deps({ Test: { fsr_version: "3.1" } }))).toBe(true);
    expect(col.filter(g(), "fsr", deps({ Test: { xess_version: "1.3" } }))).toBe(false);
  });

  it("filter('both') requires both fsr and xess", () => {
    expect(col.filter(g(), "both", deps({ Test: { fsr_version: "3.1", xess_version: "1.3" } }))).toBe(true);
    expect(col.filter(g(), "both", deps({ Test: { fsr_version: "3.1" } }))).toBe(false);
  });

  it("filter('any') passes if either present", () => {
    expect(col.filter(g(), "any", deps({ Test: { xess_version: "1.3" } }))).toBe(true);
    expect(col.filter(g(), "any", deps({}))).toBe(false);
  });

  it("count tallies fsr/xess/both/any/none", () => {
    const games = [
      g({ name: "A" }),
      g({ name: "B" }),
      g({ name: "C" }),
    ];
    const upscaling = { A: { fsr_version: "3.1" }, B: { fsr_version: "3.1", xess_version: "1.3" } };
    const c = col.count(games, { upscaling });
    expect(c.fsr).toBe(2);
    expect(c.xess).toBe(1);
    expect(c.both).toBe(1);
    expect(c.any).toBe(2);
    expect(c.none).toBe(1);
  });
});

describe("RtColumn methods", () => {
  const col = COLUMNS.find(c => c.key === "rt")!;

  it("filter('Path Tracing') matches exactly", () => {
    expect(col.filter(g({ "ray tracing": "Path Tracing" }), "Path Tracing", {})).toBe(true);
    expect(col.filter(g({ "ray tracing": "Yes" }), "Path Tracing", {})).toBe(false);
  });

  it("filter('any') passes any RT game", () => {
    expect(col.filter(g({ "ray tracing": "Yes" }), "any", {})).toBe(true);
    expect(col.filter(g(), "any", {})).toBe(false);
  });

  it("count tallies Path Tracing / Yes / any", () => {
    const games = [
      g({ "ray tracing": "Path Tracing" }),
      g({ "ray tracing": "Yes" }),
      g(),
    ];
    const c = col.count(games, {});
    expect(c["Path Tracing"]).toBe(1);
    expect(c.Yes).toBe(1);
    expect(c.any).toBe(2);
  });
});

describe("SrColumn methods", () => {
  const col = COLUMNS.find(c => c.key === "sr")!;

  it("filter('NV, T') matches Transformer SR", () => {
    expect(col.filter(g({ "dlss super resolution": "NV, T" }), "NV, T", {})).toBe(true);
    expect(col.filter(g({ "dlss super resolution": "Yes" }), "NV, T", {})).toBe(false);
  });

  it("count tallies NV,T / Yes / any / none", () => {
    const games = [
      g({ "dlss super resolution": "NV, T" }),
      g({ "dlss super resolution": "Yes" }),
      g(),
    ];
    const c = col.count(games, {});
    expect(c["NV, T"]).toBe(1);
    expect(c.Yes).toBe(1);
    expect(c.any).toBe(2);
    expect(c.none).toBe(1);
  });
});

describe("DlaaColumn methods", () => {
  const col = COLUMNS.find(c => c.key === "dlaa")!;

  it("filter('any') passes games with DLAA", () => {
    expect(col.filter(g({ dlaa: "Yes" }), "any", {})).toBe(true);
    expect(col.filter(g(), "any", {})).toBe(false);
  });

  it("count tallies any / none", () => {
    const games = [g({ dlaa: "Yes" }), g(), g()];
    const c = col.count(games, {});
    expect(c.any).toBe(1);
    expect(c.none).toBe(2);
  });
});

describe("TagsColumn methods", () => {
  const col = COLUMNS.find(c => c.key === "tags")!;

  it("filter matches tag case-insensitively", () => {
    const steam = { Test: { tags: ["Action", "RPG", "Open World"] } };
    expect(col.filter(g(), "rpg", { steam })).toBe(true);
    expect(col.filter(g(), "RPG", { steam })).toBe(true);
    expect(col.filter(g(), "shooter", { steam })).toBe(false);
  });

  it("filter('') passes all", () => {
    expect(col.filter(g(), "", {})).toBe(true);
  });

  it("sortValue returns first tag or null", () => {
    const steam = { Test: { tags: ["Action", "RPG"] } };
    expect(col.sortValue(g(), { steam })).toBe("Action");
    expect(col.sortValue(g(), {})).toBeNull();
  });
});

describe("ReleaseDateColumn methods", () => {
  const col = COLUMNS.find(c => c.key === "release_date")!;

  it("filter('old') passes games released more than 1 year ago", () => {
    const steam = { Test: { release_date: "2010-01-01" } };
    expect(col.filter(g(), "old", { steam })).toBe(true);
  });

  it("filter('upcoming') passes TBA games", () => {
    const steam = { Test: { release_date: "TBA" } };
    expect(col.filter(g(), "upcoming", { steam })).toBe(true);
  });

  it("filter('upcoming') passes future dates", () => {
    const future = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];
    const steam = { Test: { release_date: future } };
    expect(col.filter(g(), "upcoming", { steam })).toBe(true);
  });

  it("filter('old') fails for game with no release date", () => {
    expect(col.filter(g(), "old", { steam: {} })).toBe(false);
  });

  it("sortValue returns timestamp for valid date", () => {
    const steam = { Test: { release_date: "2020-06-01" } };
    const v = col.sortValue(g(), { steam });
    expect(typeof v).toBe("number");
    expect(v).toBeGreaterThan(0);
  });

  it("sortValue returns null for missing or invalid date", () => {
    expect(col.sortValue(g(), { steam: {} })).toBeNull();
    const steam = { Test: { release_date: "TBA" } };
    expect(col.sortValue(g(), { steam })).toBeNull();
  });

  it("count includes upcoming bucket for TBA games", () => {
    const games = [g({ name: "A" }), g({ name: "B" })];
    const steam = { A: { release_date: "2010-01-01" }, B: { release_date: "TBA" } };
    const c = col.count(games, { steam });
    expect(c.old).toBe(1);
    expect(c.upcoming).toBe(1);
  });
});

describe("RrColumn methods", () => {
  const col = COLUMNS.find(c => c.key === "rr")!;

  it("filter('any') passes games with Ray Reconstruction", () => {
    expect(col.filter(g({ "dlss ray reconstruction": "Yes" }), "any", {})).toBe(true);
    expect(col.filter(g(), "any", {})).toBe(false);
  });

  it("count tallies any / none", () => {
    const games = [g({ "dlss ray reconstruction": "Yes" }), g()];
    const c = col.count(games, {});
    expect(c.any).toBe(1);
    expect(c.none).toBe(1);
  });
});
