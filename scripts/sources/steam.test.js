import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseReviews, buildSteamEntry } from "./steam.js";
import steam from "./steam.js";

describe("parseReviews", () => {
  it("extracts rating, pct, and total from valid response", () => {
    const json = {
      query_summary: {
        review_score_desc: "Very Positive",
        total_reviews: 50000,
        total_positive: 44500,
      },
    };
    const result = parseReviews(json);
    expect(result.rating).toBe("Very Positive");
    expect(result.pct).toBe(89);
    expect(result.total).toBe(50000);
  });

  it("returns null for missing query_summary", () => {
    expect(parseReviews({})).toBeNull();
    expect(parseReviews(null)).toBeNull();
  });

  it("returns null for zero reviews", () => {
    expect(parseReviews({ query_summary: { total_reviews: 0 } })).toBeNull();
  });

  it("falls back to pct-based bucketing for non-standard desc", () => {
    const json = {
      query_summary: {
        review_score_desc: "3 user reviews",
        total_reviews: 3,
        total_positive: 3,
      },
    };
    const result = parseReviews(json);
    expect(result.rating).toBe("Overwhelmingly Positive"); // 100%
    expect(result.pct).toBe(100);
  });

  it("buckets 80% as Very Positive", () => {
    const json = {
      query_summary: {
        review_score_desc: "5 user reviews",
        total_reviews: 10,
        total_positive: 8,
      },
    };
    expect(parseReviews(json).rating).toBe("Very Positive");
  });

  it("buckets 50% as Mixed", () => {
    const json = {
      query_summary: {
        review_score_desc: "some reviews",
        total_reviews: 10,
        total_positive: 5,
      },
    };
    expect(parseReviews(json).rating).toBe("Mixed");
  });

  it("buckets 15% as Negative", () => {
    const json = {
      query_summary: {
        review_score_desc: "bad",
        total_reviews: 100,
        total_positive: 15,
      },
    };
    expect(parseReviews(json).rating).toBe("Negative");
  });

  it("buckets 70% as Mostly Positive", () => {
    const json = { query_summary: { review_score_desc: "custom", total_reviews: 100, total_positive: 70 } };
    expect(parseReviews(json).rating).toBe("Mostly Positive");
  });

  it("buckets 20% as Mostly Negative", () => {
    const json = { query_summary: { review_score_desc: "custom", total_reviews: 100, total_positive: 20 } };
    expect(parseReviews(json).rating).toBe("Mostly Negative");
  });

  it("keeps valid Steam rating descriptions", () => {
    for (const rating of ["Overwhelmingly Positive", "Mixed", "Mostly Negative", "Very Negative"]) {
      const json = {
        query_summary: {
          review_score_desc: rating,
          total_reviews: 100,
          total_positive: 50,
        },
      };
      expect(parseReviews(json).rating).toBe(rating);
    }
  });
});

describe("buildSteamEntry", () => {
  it("builds entry with reviews and details", () => {
    const reviews = { rating: "Very Positive", pct: 89, total: 50000 };
    const details = {
      release_date: "10 Dec, 2020",
      genres: ["RPG", "Action"],
      image: "https://example.com/img.jpg",
      metacritic_score: 86,
      metacritic_url: "https://metacritic.com/game/cyberpunk-2077",
    };
    const entry = buildSteamEntry(12345, reviews, details);
    expect(entry.found).toBe(true);
    expect(entry.appid).toBe(12345);
    expect(entry.rating).toBe("Very Positive");
    expect(entry.pct).toBe(89);
    expect(entry.total).toBe(50000);
    expect(entry.release_date).toBe("10 Dec, 2020");
    expect(entry.genres).toEqual(["RPG", "Action"]);
    expect(entry.image).toBe("https://example.com/img.jpg");
    expect(entry.metacritic_score).toBe(86);
    expect(entry.updated_at).toBeDefined();
  });

  it("builds entry without reviews", () => {
    const entry = buildSteamEntry(12345, null, {});
    expect(entry.found).toBe(true);
    expect(entry.appid).toBe(12345);
    expect(entry.rating).toBeUndefined();
  });

  it("builds entry without details", () => {
    const reviews = { rating: "Mixed", pct: 55, total: 100 };
    const entry = buildSteamEntry(12345, reviews, {});
    expect(entry.rating).toBe("Mixed");
    expect(entry.release_date).toBeUndefined();
    expect(entry.genres).toBeUndefined();
  });
});

describe("SteamUpdater.backfillFilter", () => {
  it("returns true when no rating", () => {
    expect(steam.backfillFilter({ found: true, appid: 123 })).toBe(true);
  });

  it("returns false when rating present", () => {
    expect(steam.backfillFilter({ found: true, appid: 123, rating: "Very Positive" })).toBe(false);
  });
});

describe("SteamUpdater.processOne", () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockResponse(data, ok = true) {
    return { ok, status: ok ? 200 : 404, json: async () => data, headers: new Map() };
  }

  it("finds a game and writes steam entry", async () => {
    const gameData = { "Test Game": { steam: { appid: 12345 } } };
    // fetchReviews response
    mockFetch.mockResolvedValueOnce(mockResponse({
      query_summary: { review_score_desc: "Very Positive", total_reviews: 1000, total_positive: 900 },
    }));
    // fetchDetails response
    mockFetch.mockResolvedValueOnce(mockResponse({
      "12345": { data: { release_date: { date: "Jan 1, 2024" }, genres: [{ description: "Action" }] } },
    }));

    const result = await steam.processOne(gameData, "Test Game");
    expect(result).toBe(true);
    expect(gameData["Test Game"].steam.found).toBe(true);
    expect(gameData["Test Game"].steam.rating).toBe("Very Positive");
    expect(gameData["Test Game"].steam.pct).toBe(90);
  });

  it("marks game as not found when search fails", async () => {
    const gameData = { "Unknown Game": {} };
    mockFetch.mockResolvedValueOnce(mockResponse({ items: [] }));

    const result = await steam.processOne(gameData, "Unknown Game");
    expect(result).toBe(false);
    expect(gameData["Unknown Game"].steam.found).toBe(false);
  });

  it("finds game by name search (exact match)", async () => {
    const gameData = { "Portal 2": {} };
    // searchByName: storesearch returns exact match
    mockFetch.mockResolvedValueOnce(mockResponse({ items: [{ id: 620, name: "Portal 2" }] }));
    // fetchReviews
    mockFetch.mockResolvedValueOnce(mockResponse({
      query_summary: { review_score_desc: "Overwhelmingly Positive", total_reviews: 80000, total_positive: 79000 },
    }));
    // fetchDetails
    mockFetch.mockResolvedValueOnce(mockResponse({
      "620": { data: { genres: [{ description: "Action" }] } },
    }));

    const result = await steam.processOne(gameData, "Portal 2");
    expect(result).toBe(true);
    expect(gameData["Portal 2"].steam.appid).toBe(620);
    expect(gameData["Portal 2"].steam.rating).toBe("Overwhelmingly Positive");
  });

  it("fetches full details including image and release date", async () => {
    const gameData = { "Full Game": { steam: { appid: 555 } } };
    mockFetch.mockResolvedValueOnce(mockResponse({
      query_summary: { review_score_desc: "Very Positive", total_reviews: 5000, total_positive: 4500 },
    }));
    mockFetch.mockResolvedValueOnce(mockResponse({
      "555": { data: {
        release_date: { date: "Mar 15, 2024" },
        genres: [{ description: "RPG" }, { description: "Action" }],
        capsule_imagev5: "https://cdn.steam.com/img_v5.jpg",
        capsule_image: "https://cdn.steam.com/img_v4.jpg",
        metacritic: { score: 88, url: "https://www.metacritic.com/game/pc/full-game" },
      } },
    }));

    await steam.processOne(gameData, "Full Game");
    const entry = gameData["Full Game"].steam;
    expect(entry.release_date).toBe("Mar 15, 2024");
    expect(entry.genres).toEqual(["RPG", "Action"]);
    expect(entry.image).toBe("https://cdn.steam.com/img_v5.jpg");
    expect(entry.metacritic_score).toBe(88);
    expect(entry.metacritic_url).toBe("https://www.metacritic.com/game/pc/full-game");
  });

  it("prefers v5 capsule image over v4", async () => {
    const gameData = { "Img Game": { steam: { appid: 777 } } };
    mockFetch.mockResolvedValueOnce(mockResponse({ query_summary: { total_reviews: 0 } }));
    mockFetch.mockResolvedValueOnce(mockResponse({
      "777": { data: { capsule_imagev5: "v5.jpg", capsule_image: "v4.jpg" } },
    }));
    await steam.processOne(gameData, "Img Game");
    expect(gameData["Img Game"].steam.image).toBe("v5.jpg");
  });

  it("falls back to v4 capsule when v5 missing", async () => {
    const gameData = { "Old Game": { steam: { appid: 888 } } };
    mockFetch.mockResolvedValueOnce(mockResponse({ query_summary: { total_reviews: 0 } }));
    mockFetch.mockResolvedValueOnce(mockResponse({
      "888": { data: { capsule_image: "v4.jpg" } },
    }));
    await steam.processOne(gameData, "Old Game");
    expect(gameData["Old Game"].steam.image).toBe("v4.jpg");
  });

  it("handles search returning not-ok response", async () => {
    const gameData = { "Net Fail": {} };
    mockFetch.mockResolvedValueOnce(mockResponse({}, false)); // storesearch fails
    const result = await steam.processOne(gameData, "Net Fail");
    expect(result).toBe(false);
  });

  it("finds game by fuzzy match in search results", async () => {
    const gameData = { "Elden Ring": {} };
    // Search returns a fuzzy match
    mockFetch.mockResolvedValueOnce(mockResponse({
      items: [
        { id: 1111, name: "Other Game" },
        { id: 1245620, name: "ELDEN RING" },
      ],
    }));
    mockFetch.mockResolvedValueOnce(mockResponse({
      query_summary: { review_score_desc: "Very Positive", total_reviews: 300000, total_positive: 255000 },
    }));
    mockFetch.mockResolvedValueOnce(mockResponse({ "1245620": { data: {} } }));

    const result = await steam.processOne(gameData, "Elden Ring");
    expect(result).toBe(true);
    expect(gameData["Elden Ring"].steam.appid).toBe(1245620);
  });

  it("handles API errors gracefully", async () => {
    const gameData = { "Error Game": { steam: { appid: 999 } } };
    mockFetch.mockResolvedValueOnce(mockResponse({}, false)); // reviews fails → null
    mockFetch.mockResolvedValueOnce(mockResponse({}, false)); // details fails → {}

    const result = await steam.processOne(gameData, "Error Game");
    // Still "found" because we had an appid — just no reviews/details
    expect(result).toBe(true);
    expect(gameData["Error Game"].steam.found).toBe(true);
    expect(gameData["Error Game"].steam.rating).toBeUndefined();
  });
});
