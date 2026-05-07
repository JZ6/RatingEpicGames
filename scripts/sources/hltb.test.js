import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseHltbTimes, buildHltbEntry } from "./hltb.js";
import hltb from "./hltb.js";

describe("parseHltbTimes", () => {
  it("converts seconds to hours", () => {
    const result = parseHltbTimes({
      game_id: 123,
      comp_main: 36000,  // 10 hours
      comp_plus: 72000,  // 20 hours
      comp_100: 108000,  // 30 hours
    });
    expect(result.hltb_id).toBe(123);
    expect(result.main).toBe(10);
    expect(result.extra).toBe(20);
    expect(result.complete).toBe(30);
  });

  it("rounds to 2 decimal places", () => {
    const result = parseHltbTimes({
      game_id: 1,
      comp_main: 58399, // 16.2219... hours → 16.22
    });
    expect(result.main).toBe(16.22);
  });

  it("includes optional fields when present", () => {
    const result = parseHltbTimes({
      game_id: 1,
      comp_main: 36000,
      invested_co: 18000,  // coop: 5h
      invested_mp: 7200,   // pvp: 2h
      comp_speed: 14400,   // speed: 4h
      comp_all: 25200,     // all_styles: 7h
    });
    expect(result.coop).toBe(5);
    expect(result.pvp).toBe(2);
    expect(result.speed).toBe(4);
    expect(result.all_styles).toBe(7);
  });

  it("skips zero values", () => {
    const result = parseHltbTimes({
      game_id: 1,
      comp_main: 36000,
      comp_plus: 0,
      comp_100: 0,
    });
    expect(result.main).toBe(10);
    expect(result.extra).toBeUndefined();
    expect(result.complete).toBeUndefined();
  });

  it("returns null when only game_id (no playtime data)", () => {
    expect(parseHltbTimes({ game_id: 999 })).toBeNull();
  });

  it("returns null when all times are zero", () => {
    expect(parseHltbTimes({
      game_id: 1, comp_main: 0, comp_plus: 0, comp_100: 0,
    })).toBeNull();
  });
});

describe("buildHltbEntry", () => {
  it("builds entry with all fields", () => {
    const data = { hltb_id: 123, main: 10, extra: 20, complete: 30, coop: 5, pvp: 2, speed: 4, all_styles: 15 };
    const entry = buildHltbEntry(data);
    expect(entry.found).toBe(true);
    expect(entry.hltb_id).toBe(123);
    expect(entry.main).toBe(10);
    expect(entry.extra).toBe(20);
    expect(entry.complete).toBe(30);
    expect(entry.coop).toBe(5);
    expect(entry.pvp).toBe(2);
    expect(entry.speed).toBe(4);
    expect(entry.all_styles).toBe(15);
    expect(entry.updated_at).toBeDefined();
  });

  it("omits missing fields", () => {
    const entry = buildHltbEntry({ hltb_id: 1, main: 10 });
    expect(entry.main).toBe(10);
    expect(entry.extra).toBeUndefined();
    expect(entry.complete).toBeUndefined();
  });

  it("always includes found and updated_at", () => {
    const entry = buildHltbEntry({ hltb_id: 1 });
    expect(entry.found).toBe(true);
    expect(entry.updated_at).toBeDefined();
  });
});

describe("HltbUpdater.backfillFilter", () => {
  it("returns true when no hltb_id", () => {
    expect(hltb.backfillFilter({ found: true })).toBe(true);
  });

  it("returns false when hltb_id present", () => {
    expect(hltb.backfillFilter({ found: true, hltb_id: 123 })).toBe(false);
  });
});

describe("HltbUpdater.processOne", () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockResponse(body, ok = true) {
    return { ok, status: ok ? 200 : 404, text: async () => body, json: async () => JSON.parse(body), headers: new Map() };
  }

  it("fetches by hltb_id and writes entry", async () => {
    const nextData = JSON.stringify({
      props: { pageProps: { game: { data: { game: [{ game_id: 42, comp_main: 36000, comp_plus: 72000 }] } } } },
    });
    const html = `<html><script id="__NEXT_DATA__" type="application/json">${nextData}</script></html>`;
    const gameData = { "Test Game": { hltb: { hltb_id: 42 } } };

    mockFetch.mockResolvedValueOnce(mockResponse(html));

    const result = await hltb.processOne(gameData, "Test Game");
    expect(result).toBe(true);
    expect(gameData["Test Game"].hltb.found).toBe(true);
    expect(gameData["Test Game"].hltb.main).toBe(10);
    expect(gameData["Test Game"].hltb.extra).toBe(20);
  });

  it("marks game not found when fetch fails", async () => {
    const gameData = { "Missing": { hltb: { hltb_id: 99 } } };
    mockFetch.mockResolvedValueOnce(mockResponse("", false));
    // Falls through to fetchByName which needs API discovery
    // Homepage
    mockFetch.mockResolvedValueOnce(mockResponse('<html><script src="/_app-abc.js"></script></html>'));
    // App script
    mockFetch.mockResolvedValueOnce(mockResponse('fetch("/api/s/init", {method:"POST"})'));
    // Init endpoint
    mockFetch.mockResolvedValueOnce(mockResponse(JSON.stringify({ token: "t", key: "k", val: "v" })));
    // Search returns no results
    mockFetch.mockResolvedValueOnce(mockResponse(JSON.stringify({ data: [] })));

    const result = await hltb.processOne(gameData, "Missing");
    expect(result).toBe(false);
    expect(gameData["Missing"].hltb.found).toBe(false);
    expect(gameData["Missing"].hltb.hltb_id).toBe(99);
  });
});
