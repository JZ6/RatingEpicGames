import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { normalizeQuotes, romanVariations, nameVariations, similarity, bestScore, parseArgs, checkRateLimit, syncGameList, resolveGameName, loadJson, saveJson } from "./util.js";
import { writeFileSync, mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("normalizeQuotes", () => {
  it("replaces curly single quotes", () => {
    expect(normalizeQuotes("Baldur\u2019s Gate")).toBe("Baldur's Gate");
    expect(normalizeQuotes("\u2018hello\u2019")).toBe("'hello'");
  });

  it("replaces curly double quotes", () => {
    expect(normalizeQuotes("\u201CHello\u201D")).toBe('"Hello"');
  });

  it("leaves ASCII quotes alone", () => {
    expect(normalizeQuotes("Baldur's Gate")).toBe("Baldur's Gate");
  });

  it("handles empty string", () => {
    expect(normalizeQuotes("")).toBe("");
  });
});

describe("romanVariations", () => {
  it("generates Roman numeral variant for Arabic numeral", () => {
    const result = romanVariations("Game 2");
    expect(result).toContain("Game 2");
    expect(result).toContain("Game II");
  });

  it("returns only original when input already has Roman (no reverse conversion)", () => {
    // romanVariations only converts Arabic→Roman, not the reverse
    const result = romanVariations("Game III");
    expect(result).toContain("Game III");
    expect(result).toHaveLength(1);
  });

  it("handles numbers at end of string", () => {
    const result = romanVariations("Cyberpunk 2077");
    // 2077 is not in ARABIC_TO_ROMAN range, so no Roman variant
    expect(result).toContain("Cyberpunk 2077");
  });

  it("returns original when no numerals present", () => {
    expect(romanVariations("Elden Ring")).toEqual(["Elden Ring"]);
  });

  it("handles 4 -> IV", () => {
    const result = romanVariations("Fallout 4");
    expect(result).toContain("Fallout IV");
  });
});

describe("nameVariations", () => {
  it("returns original name as first variation", () => {
    const result = nameVariations("Cyberpunk 2077");
    expect(result[0]).toBe("Cyberpunk 2077");
  });

  it("strips parenthetical suffixes", () => {
    const result = nameVariations("Game Name (Remastered)");
    expect(result).toContain("Game Name");
  });

  it("strips after colon", () => {
    const result = nameVariations("The Witcher 3: Wild Hunt");
    expect(result).toContain("The Witcher 3");
  });

  it("strips after dash", () => {
    const result = nameVariations("Game - Subtitle");
    expect(result).toContain("Game");
  });

  it("strips known edition suffixes", () => {
    const result = nameVariations("Cyberpunk 2077 Enhanced Edition");
    expect(result).toContain("Cyberpunk 2077");
  });

  it("returns unique variations", () => {
    const result = nameVariations("Simple Game");
    const unique = [...new Set(result)];
    expect(result.length).toBe(unique.length);
  });
});

describe("similarity", () => {
  it("returns 1 for identical strings", () => {
    expect(similarity("hello", "hello")).toBe(1);
  });

  it("returns 0 for completely different strings", () => {
    expect(similarity("abc", "xyz")).toBe(0);
  });

  it("returns high score for similar strings", () => {
    expect(similarity("Cyberpunk 2077", "cyberpunk 2077")).toBeGreaterThan(0.8);
  });

  it("returns moderate score when one string is a subset of the other", () => {
    const s = similarity("The Witcher 3 Wild Hunt", "The Witcher 3");
    expect(s).toBeGreaterThan(0.7);
    expect(s).toBeLessThan(0.85);
  });

  it("returns 0 for empty strings", () => {
    // similarity short-circuits to 0 when either input is falsy
    expect(similarity("", "")).toBe(0);
    expect(similarity("abc", "")).toBe(0);
  });
});

describe("bestScore", () => {
  it("returns max similarity across variations", () => {
    // "The Witcher 3: Wild Hunt" has variation "The Witcher 3"
    // which should match better against "The Witcher 3"
    const score = bestScore("The Witcher 3", "The Witcher 3: Wild Hunt");
    expect(score).toBeGreaterThan(0.8);
  });

  it("matches Roman numeral variations", () => {
    const score = bestScore("Fallout IV", "Fallout 4");
    expect(score).toBeGreaterThan(0.8);
  });
});

describe("parseArgs", () => {
  it("parses --game flag", () => {
    const opts = parseArgs(["--game", "Cyberpunk 2077"]);
    expect(opts.games).toContain("Cyberpunk 2077");
  });

  it("parses multiple --game flags", () => {
    const opts = parseArgs(["--game", "Game A", "--game", "Game B"]);
    expect(opts.games).toContain("Game A");
    expect(opts.games).toContain("Game B");
  });

  it("parses --retry flag", () => {
    const opts = parseArgs(["--retry"]);
    expect(opts.retry).toBe(true);
  });

  it("parses --refresh with days", () => {
    const opts = parseArgs(["--refresh", "30"]);
    expect(opts.refresh).toBe(30);
  });

  it("parses --backfill flag", () => {
    const opts = parseArgs(["--backfill"]);
    expect(opts.backfill).toBe(true);
  });

  it("parses --limit flag", () => {
    const opts = parseArgs(["--limit", "10"]);
    expect(opts.limit).toBe(10);
  });

  it("parses --sources flag", () => {
    const opts = parseArgs(["--sources", "steam,hltb"]);
    expect(opts.sourcesRaw).toBe("steam,hltb");
  });

  it("returns defaults for empty args", () => {
    const opts = parseArgs([]);
    expect(opts.games).toEqual([]);
    expect(opts.retry).toBe(false);
    expect(opts.backfill).toBe(false);
    expect(opts.limit).toBe(0);
  });

  it("defaults --refresh to 30 when no number follows", () => {
    const opts = parseArgs(["--refresh"]);
    expect(opts.refresh).toBe(30);
  });

  it("defaults --limit to 0 when no number follows", () => {
    const opts = parseArgs(["--limit"]);
    expect(opts.limit).toBe(0);
  });
});

describe("checkRateLimit", () => {
  it("throws on 429", () => {
    expect(() => checkRateLimit({ status: 429 })).toThrow("Rate limited");
  });

  it("throws on 1015", () => {
    expect(() => checkRateLimit({ status: 1015 })).toThrow("Rate limited");
  });

  it("does not throw on 200", () => {
    expect(() => checkRateLimit({ status: 200 })).not.toThrow();
  });

  it("does not throw on 404", () => {
    expect(() => checkRateLimit({ status: 404 })).not.toThrow();
  });
});

describe("loadJson", () => {
  let tmpDir;
  beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), "dlssdb-test-")); });
  afterEach(() => rmSync(tmpDir, { recursive: true }));

  it("parses and returns valid JSON file", () => {
    const path = join(tmpDir, "data.json");
    writeFileSync(path, '{"a":1,"b":2}');
    expect(loadJson(path)).toEqual({ a: 1, b: 2 });
  });

  it("returns {} when file does not exist", () => {
    expect(loadJson(join(tmpDir, "missing.json"))).toEqual({});
  });

  it("returns {} for invalid JSON", () => {
    const path = join(tmpDir, "bad.json");
    writeFileSync(path, "not json {{{");
    expect(loadJson(path)).toEqual({});
  });
});

describe("saveJson", () => {
  let tmpDir;
  beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), "dlssdb-test-")); });
  afterEach(() => rmSync(tmpDir, { recursive: true }));

  it("writes sorted JSON with trailing newline", () => {
    const path = join(tmpDir, "out.json");
    saveJson(path, { b: 2, a: 1 });
    const content = require("fs").readFileSync(path, "utf-8");
    expect(Object.keys(JSON.parse(content))).toEqual(["a", "b"]);
    expect(content.endsWith("\n")).toBe(true);
  });

  it("pretty-prints with 2-space indent", () => {
    const path = join(tmpDir, "out.json");
    saveJson(path, { key: "val" });
    const content = require("fs").readFileSync(path, "utf-8");
    expect(content).toContain("  ");
  });
});

describe("syncGameList", () => {
  it("adds new games from the list", () => {
    const gameData = { "Game A": {} };
    const added = syncGameList(gameData, ["Game A", "Game B", "Game C"]);
    expect(added).toBe(2);
    expect(gameData["Game B"]).toEqual({});
    expect(gameData["Game C"]).toEqual({});
  });

  it("does not overwrite existing entries", () => {
    const gameData = { "Game A": { steam: { found: true } } };
    syncGameList(gameData, ["Game A"]);
    expect(gameData["Game A"].steam.found).toBe(true);
  });

  it("returns 0 when no new games", () => {
    const gameData = { "Game A": {} };
    expect(syncGameList(gameData, ["Game A"])).toBe(0);
  });
});

describe("resolveGameName", () => {
  const allNames = ["Cyberpunk 2077", "Elden Ring", "The Witcher 3: Wild Hunt", "Portal RTX"];

  it("returns exact match (case-insensitive)", () => {
    expect(resolveGameName("cyberpunk 2077", allNames)).toBe("Cyberpunk 2077");
  });

  it("returns substring match", () => {
    expect(resolveGameName("Witcher", allNames)).toBe("The Witcher 3: Wild Hunt");
  });

  it("returns input as-is when no match", () => {
    expect(resolveGameName("Nonexistent Game XYZ", allNames)).toBe("Nonexistent Game XYZ");
  });

  it("exits on ambiguous match", () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
    // "portal" matches both as substring — ambiguous
    const names = ["Portal 2", "Portal RTX"];
    try {
      resolveGameName("portal", names);
      expect.fail("should have thrown");
    } catch (e) {
      expect(e.message).toBe("exit");
    }
    exit.mockRestore();
  });
});
