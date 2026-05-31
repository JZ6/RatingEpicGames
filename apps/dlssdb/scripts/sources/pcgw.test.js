import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseUpscaling, buildPcgwEntry } from "./pcgw.js";
import pcgw from "./pcgw.js";

// Make sleep a no-op so rate-limit delays don't slow tests
vi.mock("../lib/util.js", async (importOriginal) => {
  const mod = await importOriginal();
  return { ...mod, sleep: vi.fn().mockResolvedValue(undefined) };
});

describe("parseUpscaling", () => {
  it("parses FSR version", () => {
    expect(parseUpscaling("DLSS,FSR 2.1")).toEqual({ fsr_version: "FSR 2.1" });
  });

  it("parses XeSS version", () => {
    expect(parseUpscaling("DLSS,XeSS 1.3")).toEqual({ xess_version: "XeSS 1.3" });
  });

  it("parses both FSR and XeSS", () => {
    expect(parseUpscaling("DLSS,FSR 2.1,XeSS 1.1")).toEqual({
      fsr_version: "FSR 2.1",
      xess_version: "XeSS 1.1",
    });
  });

  it("takes last (highest) version when multiple listed", () => {
    expect(parseUpscaling("FSR 2.0,FSR 3.1")).toEqual({ fsr_version: "FSR 3.1" });
  });

  it("ignores DLSS entries", () => {
    const result = parseUpscaling("DLSS");
    expect(result.fsr_version).toBeUndefined();
    expect(result.xess_version).toBeUndefined();
  });

  it("returns empty object for empty string", () => {
    expect(parseUpscaling("")).toEqual({});
  });

  it("returns empty object for null/undefined", () => {
    expect(parseUpscaling(null)).toEqual({});
    expect(parseUpscaling(undefined)).toEqual({});
  });

  it("handles whitespace in values", () => {
    expect(parseUpscaling(" FSR 2.2 , XeSS 2 ")).toEqual({
      fsr_version: "FSR 2.2",
      xess_version: "XeSS 2",
    });
  });
});

describe("buildPcgwEntry", () => {
  it("builds entry with FSR and XeSS", () => {
    const entry = buildPcgwEntry("Cyberpunk_2077", { fsr_version: "FSR 2.1", xess_version: "XeSS 1.1" });
    expect(entry.found).toBe(true);
    expect(entry.page).toBe("Cyberpunk_2077");
    expect(entry.fsr_version).toBe("FSR 2.1");
    expect(entry.xess_version).toBe("XeSS 1.1");
    expect(entry.updated_at).toBeDefined();
  });

  it("builds entry with only FSR", () => {
    const entry = buildPcgwEntry("Elden_Ring", { fsr_version: "FSR 2.0" });
    expect(entry.fsr_version).toBe("FSR 2.0");
    expect(entry.xess_version).toBeUndefined();
  });

  it("builds entry with no upscaling", () => {
    const entry = buildPcgwEntry("Some_Game", {});
    expect(entry.found).toBe(true);
    expect(entry.page).toBe("Some_Game");
    expect(entry.fsr_version).toBeUndefined();
    expect(entry.xess_version).toBeUndefined();
  });
});

describe("PcgwUpdater.backfillFilter", () => {
  it("returns true when no FSR or XeSS", () => {
    expect(pcgw.backfillFilter({ found: true, page: "Some_Game" })).toBe(true);
  });

  it("returns false when FSR present", () => {
    expect(pcgw.backfillFilter({ found: true, fsr_version: "FSR 2.1" })).toBe(false);
  });

  it("returns false when XeSS present", () => {
    expect(pcgw.backfillFilter({ found: true, xess_version: "XeSS 1.1" })).toBe(false);
  });
});

describe("PcgwUpdater.processOne", () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function cargoResp(rows, ok = true) {
    const body = JSON.stringify({ cargoquery: rows.map((r) => ({ title: r })) });
    return { ok, status: ok ? 200 : 404, text: async () => body, json: async () => JSON.parse(body), headers: new Map() };
  }

  it("finds game by appid with upscaling", async () => {
    const gameData = { "Cyberpunk 2077": { steam: { appid: 1091500 } } };
    mockFetch.mockResolvedValueOnce(cargoResp([{
      pageTitle: "Cyberpunk 2077", "Steam AppID": "1091500", Upscaling: "FSR 2.1,XeSS 1.1",
    }]));

    const result = await pcgw.processOne(gameData, "Cyberpunk 2077");
    expect(result).toBe(true);
    expect(gameData["Cyberpunk 2077"].pcgw.found).toBe(true);
    expect(gameData["Cyberpunk 2077"].pcgw.fsr_version).toBe("FSR 2.1");
    expect(gameData["Cyberpunk 2077"].pcgw.xess_version).toBe("XeSS 1.1");
    expect(gameData["Cyberpunk 2077"].pcgw.page).toBe("Cyberpunk_2077");
  });

  it("falls back to infobox-only when no upscaling data", async () => {
    const gameData = { "Some Game": { steam: { appid: 999 } } };
    mockFetch.mockResolvedValueOnce(cargoResp([])); // video+infobox: no results
    mockFetch.mockResolvedValueOnce(cargoResp([{ pageTitle: "Some Game" }])); // infobox only

    const result = await pcgw.processOne(gameData, "Some Game");
    expect(result).toBe(true);
    expect(gameData["Some Game"].pcgw.found).toBe(true);
    expect(gameData["Some Game"].pcgw.fsr_version).toBeUndefined();
  });

  it("finds game by page name when no appid", async () => {
    const gameData = { "Fortnite": { steam: {} } };
    mockFetch.mockResolvedValueOnce(cargoResp([{ pageTitle: "Fortnite", Upscaling: "FSR 3.1" }]));

    const result = await pcgw.processOne(gameData, "Fortnite");
    expect(result).toBe(true);
    expect(gameData["Fortnite"].pcgw.fsr_version).toBe("FSR 3.1");
  });

  it("handles cargoQuery returning not-ok", async () => {
    const gameData = { "BadAPI": { steam: { appid: 42 } } };
    mockFetch.mockResolvedValue({ ok: false, status: 500, text: async () => "", headers: new Map() });
    const result = await pcgw.processOne(gameData, "BadAPI");
    expect(result).toBe(false);
  });

  it("handles Cloudflare block in cargoQuery", async () => {
    const gameData = { "Blocked": { steam: { appid: 42 } } };
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      text: async () => "<!doctype html><html>error code 1020</html>",
      headers: new Map(),
    });
    await expect(pcgw.processOne(gameData, "Blocked")).rejects.toThrow("Rate limited");
  });

  it("finds game by page name with variation (colon stripped)", async () => {
    const gameData = { "Game: Subtitle": { steam: {} } };
    // First variation "Game: Subtitle" fails, "Game" matches
    mockFetch.mockResolvedValueOnce(cargoResp([])); // full name with upscaling
    mockFetch.mockResolvedValueOnce(cargoResp([])); // full name infobox
    mockFetch.mockResolvedValueOnce(cargoResp([{ pageTitle: "Game", Upscaling: "FSR 2.0" }])); // variation
    const result = await pcgw.processOne(gameData, "Game: Subtitle");
    expect(result).toBe(true);
    expect(gameData["Game: Subtitle"].pcgw.fsr_version).toBe("FSR 2.0");
  });

  it("marks not found when all lookups fail", async () => {
    const gameData = { "Unknown": { steam: { appid: 1 } } };
    mockFetch.mockResolvedValue(cargoResp([])); // all queries return empty

    const result = await pcgw.processOne(gameData, "Unknown");
    expect(result).toBe(false);
    expect(gameData["Unknown"].pcgw.found).toBe(false);
  });
});

describe("PcgwUpdater.update (bulk mode)", () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function cargoResp(rows) {
    const body = JSON.stringify({ cargoquery: rows.map((r) => ({ title: r })) });
    return { ok: true, status: 200, text: async () => body, headers: new Map() };
  }

  it("uses bulk fetch for >3 games and matches by appid", async () => {
    const names = ["Game A", "Game B", "Game C", "Game D"];
    const gameData = {
      "Game A": { steam: { appid: 100 } },
      "Game B": { steam: { appid: 200 } },
      "Game C": { steam: { appid: 300 } },
      "Game D": { steam: { appid: 400 } },
    };

    // Bulk fetch returns games A and B only
    mockFetch.mockResolvedValueOnce(cargoResp([
      { pageTitle: "Game A", "Steam AppID": "100", Upscaling: "FSR 2.1" },
      { pageTitle: "Game B", "Steam AppID": "200", Upscaling: "XeSS 1.1" },
    ]));
    // Per-game fallback for C and D (unmatched) — all return empty
    mockFetch.mockResolvedValue(cargoResp([]));

    const result = await pcgw.update(gameData, names);
    expect(result).toBe(2); // A and B matched
    expect(gameData["Game A"].pcgw.fsr_version).toBe("FSR 2.1");
    expect(gameData["Game B"].pcgw.xess_version).toBe("XeSS 1.1");
  });

  it("falls back to per-game when bulk fetch throws", async () => {
    const names = ["Game A", "Game B", "Game C", "Game D"];
    const gameData = Object.fromEntries(names.map((n) => [n, { steam: { appid: 1 } }]));

    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      text: async () => "<!doctype html><html>Cloudflare error code 1020</html>",
      headers: new Map(),
    });
    // per-game fallback — all fail
    mockFetch.mockResolvedValue(cargoResp([]));

    const result = await pcgw.update(gameData, names);
    expect(result).toBe(0);
  });

  it("skips bulk entries with empty pageName", async () => {
    const names = ["Game A", "Game B", "Game C", "Game D"];
    const gameData = {
      "Game A": { steam: { appid: 100 } },
      "Game B": { steam: { appid: 200 } },
      "Game C": { steam: { appid: 300 } },
      "Game D": { steam: { appid: 400 } },
    };
    mockFetch.mockResolvedValueOnce(cargoResp([
      { pageTitle: "", "Steam AppID": "100", Upscaling: "FSR 2.0" }, // empty page — skipped
      { pageTitle: "Game B", "Steam AppID": "200", Upscaling: "XeSS 1.0" },
    ]));
    mockFetch.mockResolvedValue(cargoResp([])); // per-game fallback for A, C, D
    const result = await pcgw.update(gameData, names);
    expect(result).toBe(1); // only B matched
    expect(gameData["Game B"].pcgw.xess_version).toBe("XeSS 1.0");
  });

  it("pushes games with no appid to unmatched list", async () => {
    const names = ["With Appid", "No Appid", "Also No Appid", "Another"];
    const gameData = {
      "With Appid": { steam: { appid: 111 } },
      "No Appid": { steam: {} },
      "Also No Appid": {},
      "Another": { steam: { appid: 222 } },
    };
    mockFetch.mockResolvedValueOnce(cargoResp([
      { pageTitle: "With Appid", "Steam AppID": "111", Upscaling: "FSR 3.0" },
    ]));
    mockFetch.mockResolvedValue(cargoResp([])); // per-game for no-appid games
    const result = await pcgw.update(gameData, names);
    expect(result).toBeGreaterThanOrEqual(1);
    expect(gameData["With Appid"].pcgw.fsr_version).toBe("FSR 3.0");
  });

  it("uses per-game for <=3 games", async () => {
    const names = ["Game A", "Game B"];
    const gameData = {
      "Game A": { steam: { appid: 100 } },
      "Game B": { steam: { appid: 200 } },
    };
    mockFetch.mockResolvedValue(cargoResp([]));

    const result = await pcgw.update(gameData, names);
    expect(result).toBe(0);
    // Should NOT have made a bulk request (no "Upscaling HOLDS LIKE" in calls)
    const urls = mockFetch.mock.calls.map(([url]) => url);
    expect(urls.every((u) => !u.includes("Upscaling+HOLDS"))).toBe(true);
  });
});
