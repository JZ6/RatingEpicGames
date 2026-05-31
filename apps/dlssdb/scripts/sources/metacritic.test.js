import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nameToSlug, slugFromUrl, slugVariations, buildMetacriticEntry } from "./metacritic.js";
import metacritic from "./metacritic.js";

describe("nameToSlug", () => {
  it("converts to lowercase with dashes", () => {
    expect(nameToSlug("Cyberpunk 2077")).toBe("cyberpunk-2077");
  });

  it("strips trademark symbols", () => {
    expect(nameToSlug("Game\u2122 Name\u00AE")).toBe("game-name");
  });

  it("strips punctuation", () => {
    expect(nameToSlug("Baldur's Gate 3")).toBe("baldurs-gate-3");
  });

  it("collapses multiple dashes", () => {
    expect(nameToSlug("Game - Subtitle")).toBe("game-subtitle");
  });

  it("trims leading/trailing dashes", () => {
    expect(nameToSlug("-Game Name-")).toBe("game-name");
  });

  it("handles colons and slashes", () => {
    expect(nameToSlug("The Witcher 3: Wild Hunt")).toBe("the-witcher-3-wild-hunt");
  });

  it("handles exclamation marks and ampersands", () => {
    expect(nameToSlug("Ratchet & Clank: Rift Apart!")).toBe("ratchet-clank-rift-apart");
  });

  it("strips non-alphanumeric unicode", () => {
    expect(nameToSlug("DEADCAM | ANALOG • SURVIVAL")).toBe("deadcam-analog-survival");
  });
});

describe("slugFromUrl", () => {
  it("extracts slug from full Metacritic URL", () => {
    expect(slugFromUrl("https://www.metacritic.com/game/pc/cyberpunk-2077?ftag=foo")).toBe("cyberpunk-2077");
  });

  it("extracts slug from new-style URL (no platform)", () => {
    expect(slugFromUrl("https://www.metacritic.com/game/elden-ring")).toBe("elden-ring");
  });

  it("returns null for invalid URL", () => {
    expect(slugFromUrl("https://www.metacritic.com/")).toBeNull();
    expect(slugFromUrl("https://example.com")).toBeNull();
  });
});

describe("slugVariations", () => {
  it("returns original slug", () => {
    expect(slugVariations("cyberpunk-2077")).toContain("cyberpunk-2077");
  });

  it("generates Roman numeral variations", () => {
    const result = slugVariations("fallout-4");
    expect(result).toContain("fallout-4");
    expect(result).toContain("fallout-iv");
  });

  it("lowercases all variations", () => {
    const result = slugVariations("Game-IV");
    result.forEach((s) => expect(s).toBe(s.toLowerCase()));
  });
});

describe("buildMetacriticEntry", () => {
  it("builds entry with all fields", () => {
    const entry = buildMetacriticEntry({ slug: "cyberpunk-2077", score: 86, source: "steam", appid: 1091500 });
    expect(entry.found).toBe(true);
    expect(entry.slug).toBe("cyberpunk-2077");
    expect(entry.score).toBe(86);
    expect(entry.source).toBe("steam");
    expect(entry.appid).toBe(1091500);
    expect(entry.updated_at).toBeDefined();
  });

  it("builds entry from metacritic source (no appid)", () => {
    const entry = buildMetacriticEntry({ slug: "elden-ring", score: 96, source: "metacritic" });
    expect(entry.source).toBe("metacritic");
    expect(entry.appid).toBeUndefined();
  });

  it("handles missing score", () => {
    const entry = buildMetacriticEntry({ slug: "some-game", source: "metacritic" });
    expect(entry.slug).toBe("some-game");
    expect(entry.score).toBeUndefined();
  });
});

describe("MetacriticUpdater.backfillFilter", () => {
  it("returns true when score is null", () => {
    expect(metacritic.backfillFilter({ found: true, slug: "test" })).toBe(true);
  });

  it("returns true when score is undefined", () => {
    expect(metacritic.backfillFilter({ found: true })).toBe(true);
  });

  it("returns false when score is present", () => {
    expect(metacritic.backfillFilter({ found: true, score: 85 })).toBe(false);
  });

  it("returns false when score is 0", () => {
    expect(metacritic.backfillFilter({ found: true, score: 0 })).toBe(false);
  });
});

describe("MetacriticUpdater.processOne", () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockResponse(data, ok = true) {
    return { ok, status: ok ? 200 : 404, json: async () => data, text: async () => (typeof data === "string" ? data : JSON.stringify(data)), headers: new Map() };
  }

  it("uses cached steam metacritic score (pass 0)", async () => {
    const gameData = {
      "Test Game": {
        steam: { appid: 123, metacritic_score: 85, metacritic_url: "https://www.metacritic.com/game/pc/test-game" },
        metacritic: {},
      },
    };

    const result = await metacritic.processOne(gameData, "Test Game");
    expect(result).toBe(true);
    expect(gameData["Test Game"].metacritic.score).toBe(85);
    expect(gameData["Test Game"].metacritic.source).toBe("steam");
    expect(gameData["Test Game"].metacritic.slug).toBe("test-game");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches via steam appid (pass 1)", async () => {
    const gameData = {
      "Test Game": { steam: { appid: 456 }, metacritic: {} },
    };

    mockFetch.mockResolvedValueOnce(mockResponse({
      "456": { data: { metacritic: { score: 90, url: "https://www.metacritic.com/game/test-game" } } },
    }));

    const result = await metacritic.processOne(gameData, "Test Game");
    expect(result).toBe(true);
    expect(gameData["Test Game"].metacritic.score).toBe(90);
    expect(gameData["Test Game"].metacritic.source).toBe("steam");
  });

  it("falls back to scraping metacritic (pass 2)", async () => {
    const gameData = { "Test Game": { steam: {}, metacritic: {} } };

    // Pass 2: metacritic page with ratingValue
    mockFetch.mockResolvedValueOnce(mockResponse(
      '<html>"ratingValue":"88"</html>',
    ));

    const result = await metacritic.processOne(gameData, "Test Game");
    expect(result).toBe(true);
    expect(gameData["Test Game"].metacritic.score).toBe(88);
    expect(gameData["Test Game"].metacritic.source).toBe("metacritic");
  });

  it("fetchViaAppId returns null when Steam data empty", async () => {
    const gameData = { "Empty": { steam: { appid: 1 }, metacritic: {} } };
    mockFetch.mockResolvedValueOnce(mockResponse({ "1": { data: {} } })); // no metacritic key
    mockFetch.mockResolvedValueOnce(mockResponse('<html>"ratingValue":"75"</html>')); // pass 2
    const result = await metacritic.processOne(gameData, "Empty");
    expect(result).toBe(true);
    expect(gameData["Empty"].metacritic.source).toBe("metacritic");
  });

  it("fetchViaAppId extracts slug from MC URL", async () => {
    const gameData = { "With URL": { steam: { appid: 22 }, metacritic: {} } };
    mockFetch.mockResolvedValueOnce(mockResponse({
      "22": { data: { metacritic: { score: 90, url: "https://www.metacritic.com/game/pc/with-url" } } },
    }));
    const result = await metacritic.processOne(gameData, "With URL");
    expect(result).toBe(true);
    expect(gameData["With URL"].metacritic.slug).toBe("with-url");
  });

  it("fetchViaAppId with score but no URL falls back to nameToSlug", async () => {
    const gameData = { "No URL Game": { steam: { appid: 33 }, metacritic: {} } };
    mockFetch.mockResolvedValueOnce(mockResponse({
      "33": { data: { metacritic: { score: 80 } } }, // score but no url
    }));
    const result = await metacritic.processOne(gameData, "No URL Game");
    expect(result).toBe(true);
    expect(gameData["No URL Game"].metacritic.slug).toBe("no-url-game");
  });

  it("metacritic page with no ratingValue still writes entry", async () => {
    const gameData = { "No Score": { steam: {}, metacritic: {} } };
    mockFetch.mockResolvedValueOnce(mockResponse('<html>no score here</html>'));
    const result = await metacritic.processOne(gameData, "No Score");
    expect(result).toBe(true);
    expect(gameData["No Score"].metacritic.score).toBeUndefined();
    expect(gameData["No Score"].metacritic.slug).toBeDefined();
  });

  it("marks not found when all passes fail", async () => {
    const gameData = { "Unknown": { steam: { appid: 789 }, metacritic: {} } };

    // Pass 1: steam returns no metacritic data
    mockFetch.mockResolvedValueOnce(mockResponse({ "789": { data: {} } }));
    // Pass 2: metacritic pages all 404
    mockFetch.mockResolvedValue(mockResponse("", false));

    const result = await metacritic.processOne(gameData, "Unknown");
    expect(result).toBe(false);
    expect(gameData["Unknown"].metacritic.found).toBe(false);
  });
});
