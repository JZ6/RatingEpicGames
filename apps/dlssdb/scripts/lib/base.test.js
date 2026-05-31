// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Updater } from "./base.js";
import { syncGameList } from "./util.js";

vi.mock("./util.js", async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    getGameNames: vi.fn(() => ["Game A", "Game B", "Game C"]),
    loadJson: vi.fn(() => ({ "Game A": {}, "Game B": {}, "Game C": {} })),
    saveJson: vi.fn(),
  };
});

// Re-import mocked versions for assertions
import { getGameNames, loadJson, saveJson } from "./util.js";

/** Minimal subclass — processOne writes a fake entry for targeting tests. */
class TestUpdater extends Updater {
  sourceKey = "test";
  label = "Test";
  backfillFilter(e) { return !e.extra; }

  async processOne(gameData, name, prefix) {
    gameData[name].test = { found: true, score: 99, updated_at: "2026-05-05" };
    return true;
  }
}

const updater = new TestUpdater();

/**
 * Build a fake gameData object from a shorthand map.
 * Keys are game names, values are the source sub-entry (or undefined to omit).
 */
function makeGameData(entries) {
  const gd = {};
  for (const [name, sourceEntry] of Object.entries(entries)) {
    gd[name] = sourceEntry !== undefined ? { test: sourceEntry } : {};
  }
  return gd;
}

describe("getUncheckedTargets", () => {
  it("picks up games with no source key", () => {
    const gd = makeGameData({ "Game A": undefined });
    expect(updater.getUncheckedTargets(gd, ["Game A"])).toEqual(["Game A"]);
  });

  it("picks up games with empty {} source entry", () => {
    const gd = makeGameData({ "Game A": {} });
    expect(updater.getUncheckedTargets(gd, ["Game A"])).toEqual(["Game A"]);
  });

  it("skips games with found: true", () => {
    const gd = makeGameData({ "Game A": { found: true, updated_at: "2026-01-01" } });
    expect(updater.getUncheckedTargets(gd, ["Game A"])).toEqual([]);
  });

  it("skips games with found: false", () => {
    const gd = makeGameData({ "Game A": { found: false } });
    expect(updater.getUncheckedTargets(gd, ["Game A"])).toEqual([]);
  });

  it("new game from DLSS list with empty entry gets picked up", () => {
    const gd = makeGameData({
      "Existing Game": { found: true, updated_at: "2026-01-01" },
      "Failed Game": { found: false },
    });
    gd["Brand New Game"] = {};
    const allNames = ["Existing Game", "Failed Game", "Brand New Game"];
    const unchecked = updater.getUncheckedTargets(gd, allNames);
    expect(unchecked).toEqual(["Brand New Game"]);
  });

  it("new game from DLSS list not in gameData at all gets picked up", () => {
    const gd = makeGameData({
      "Existing Game": { found: true, updated_at: "2026-01-01" },
    });
    // "Brand New Game" is in the DLSS names list but has no gameData entry
    const allNames = ["Existing Game", "Brand New Game"];
    const unchecked = updater.getUncheckedTargets(gd, allNames);
    expect(unchecked).toEqual(["Brand New Game"]);
  });
});

describe("getRetryTargets", () => {
  it("picks up found: false", () => {
    const gd = makeGameData({ "Game A": { found: false } });
    expect(updater.getRetryTargets(gd, ["Game A"])).toEqual(["Game A"]);
  });

  it("skips found: true", () => {
    const gd = makeGameData({ "Game A": { found: true } });
    expect(updater.getRetryTargets(gd, ["Game A"])).toEqual([]);
  });

  it("skips empty {}", () => {
    const gd = makeGameData({ "Game A": {} });
    expect(updater.getRetryTargets(gd, ["Game A"])).toEqual([]);
  });
});

describe("getRefreshTargets", () => {
  it("picks up stale entries", () => {
    const gd = makeGameData({ "Game A": { found: true, updated_at: "2020-01-01" } });
    expect(updater.getRefreshTargets(gd, ["Game A"], 30)).toEqual(["Game A"]);
  });

  it("skips recent entries", () => {
    const today = new Date().toISOString().slice(0, 10);
    const gd = makeGameData({ "Game A": { found: true, updated_at: today } });
    expect(updater.getRefreshTargets(gd, ["Game A"], 30)).toEqual([]);
  });

  it("skips found: false", () => {
    const gd = makeGameData({ "Game A": { found: false } });
    expect(updater.getRefreshTargets(gd, ["Game A"], 30)).toEqual([]);
  });

  it("skips empty {}", () => {
    const gd = makeGameData({ "Game A": {} });
    expect(updater.getRefreshTargets(gd, ["Game A"], 30)).toEqual([]);
  });
});

describe("getBackfillTargets", () => {
  it("picks up found: true with missing fields", () => {
    const gd = makeGameData({ "Game A": { found: true } }); // no "extra" field
    expect(updater.getBackfillTargets(gd, ["Game A"])).toEqual(["Game A"]);
  });

  it("skips complete entries", () => {
    const gd = makeGameData({ "Game A": { found: true, extra: "data" } });
    expect(updater.getBackfillTargets(gd, ["Game A"])).toEqual([]);
  });

  it("skips found: false", () => {
    const gd = makeGameData({ "Game A": { found: false } });
    expect(updater.getBackfillTargets(gd, ["Game A"])).toEqual([]);
  });

  it("skips empty {}", () => {
    const gd = makeGameData({ "Game A": {} });
    expect(updater.getBackfillTargets(gd, ["Game A"])).toEqual([]);
  });
});

describe("update() creates gameData entries for new games", () => {
  it("creates entry and writes source data for a game not in gameData", async () => {
    const gd = {
      "Existing Game": { test: { found: true, updated_at: "2026-01-01" } },
    };
    // "Brand New Game" is in DLSS list but not in gameData at all
    expect(gd["Brand New Game"]).toBeUndefined();

    await updater.update(gd, ["Brand New Game"]);

    // update() should have created the top-level entry via init guard
    expect(gd["Brand New Game"]).toBeDefined();
    // processOne should have written the source data
    expect(gd["Brand New Game"].test).toEqual({ found: true, score: 99, updated_at: "2026-05-05" });
  });

  it("does not overwrite existing top-level entry", async () => {
    const gd = {
      "Game A": { steam: { found: true, appid: 12345 } },
    };
    await updater.update(gd, ["Game A"]);

    // steam data should still be there
    expect(gd["Game A"].steam).toEqual({ found: true, appid: 12345 });
    // test data should be added alongside
    expect(gd["Game A"].test).toEqual({ found: true, score: 99, updated_at: "2026-05-05" });
  });
});

describe("getTargets dispatcher", () => {
  const gd = makeGameData({
    "Unchecked": undefined,
    "Empty": {},
    "Found": { found: true, updated_at: "2020-01-01" },
    "NotFound": { found: false },
    "Complete": { found: true, extra: "data", updated_at: "2020-01-01" },
  });
  const names = Object.keys(gd);

  it("defaults to unchecked", () => {
    const { list, label } = updater.getTargets(gd, names);
    expect(label).toBe("unchecked");
    expect(list).toContain("Unchecked");
    expect(list).toContain("Empty");
    expect(list).not.toContain("Found");
  });

  it("retry flag selects not-found", () => {
    const { list, label } = updater.getTargets(gd, names, { retry: true });
    expect(label).toBe("to retry");
    expect(list).toEqual(["NotFound"]);
  });

  it("refresh flag selects stale", () => {
    const { list, label } = updater.getTargets(gd, names, { refresh: 30 });
    expect(label).toMatch(/stale/);
    expect(list).toContain("Found");
    expect(list).toContain("Complete");
  });

  it("backfill flag selects incomplete", () => {
    const { list, label } = updater.getTargets(gd, names, { backfill: true });
    expect(label).toBe("to backfill");
    expect(list).toEqual(["Found"]); // missing "extra" field
  });
});

describe("syncGameList", () => {
  it("adds new games from DLSS list to gameData", () => {
    const gd = { "Existing Game": { steam: { found: true } } };

    const added = syncGameList(gd, ["Existing Game", "Brand New Game"]);

    expect(added).toBe(1);
    expect(gd["Brand New Game"]).toEqual({});
  });

  it("does not overwrite existing entries", () => {
    const gd = { "Existing Game": { steam: { found: true, appid: 12345 } } };

    const added = syncGameList(gd, ["Existing Game"]);

    expect(added).toBe(0);
    expect(gd["Existing Game"].steam.appid).toBe(12345);
  });

  it("returns 0 when no new games", () => {
    const gd = { "Game A": {}, "Game B": {} };

    expect(syncGameList(gd, ["Game A", "Game B"])).toBe(0);
  });

  it("adds multiple new games at once", () => {
    const gd = { "Old": { steam: { found: true } } };

    const added = syncGameList(gd, ["Old", "New 1", "New 2", "New 3"]);

    expect(added).toBe(3);
    expect(Object.keys(gd)).toEqual(["Old", "New 1", "New 2", "New 3"]);
  });
});

describe("logStats", () => {
  it("logs coverage stats without error", () => {
    const gd = makeGameData({
      "Found": { found: true, updated_at: "2025-01-01" },
      "NotFound": { found: false },
      "Empty": {},
    });
    expect(() => updater.logStats(gd, Object.keys(gd), ["Empty"], "unchecked")).not.toThrow();
  });
});

describe("update() batching", () => {
  it("handles empty names list", async () => {
    const gd = {};
    const result = await updater.update(gd, []);
    expect(result).toBe(0);
  });

  it("processes batch and returns found count", async () => {
    const gd = {};
    const result = await updater.update(gd, ["Game A", "Game B"]);
    expect(result).toBe(2);
    expect(gd["Game A"].test).toBeDefined();
    expect(gd["Game B"].test).toBeDefined();
  });

  it("catches per-game errors without aborting batch", async () => {
    const errorUpdater = new (class extends Updater {
      sourceKey = "test";
      label = "Test";
      async processOne(gameData, name) {
        if (name === "Bad Game") throw new Error("API error");
        if (!gameData[name]) gameData[name] = {};
        gameData[name].test = { found: true };
        return true;
      }
    })();

    const gd = {};
    const result = await errorUpdater.update(gd, ["Good Game", "Bad Game", "Also Good"]);
    expect(result).toBe(2);
    expect(gd["Good Game"].test.found).toBe(true);
    expect(gd["Also Good"].test.found).toBe(true);
  });

  it("respects batchSize", async () => {
    let maxConcurrent = 0, current = 0;
    const slowUpdater = new (class extends Updater {
      sourceKey = "test";
      label = "Test";
      batchSize = 2;
      async processOne(gameData, name) {
        current++;
        maxConcurrent = Math.max(maxConcurrent, current);
        if (!gameData[name]) gameData[name] = {};
        gameData[name].test = { found: true };
        await new Promise((r) => setTimeout(r, 10));
        current--;
        return true;
      }
    })();

    const gd = {};
    await slowUpdater.update(gd, ["A", "B", "C", "D"]);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it("applies batchDelay between batches", async () => {
    const calls = [];
    const delayUpdater = new (class extends Updater {
      sourceKey = "test";
      label = "Test";
      batchSize = 1;
      batchDelay = 10;
      async processOne(gameData, name) {
        calls.push(name);
        if (!gameData[name]) gameData[name] = {};
        gameData[name].test = { found: true };
        return true;
      }
    })();

    const gd = {};
    await delayUpdater.update(gd, ["A", "B"]);
    expect(calls).toEqual(["A", "B"]);
  });
});

describe("default backfillFilter", () => {
  it("returns false (base class default)", () => {
    const base = new (class extends Updater {
      sourceKey = "test";
      label = "Test";
      async processOne() { return false; }
    })();
    expect(base.backfillFilter({ found: true })).toBe(false);
  });
});

describe("run()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGameNames.mockReturnValue(["Game A", "Game B", "Game C"]);
  });

  it("processes all unchecked games in batch mode", async () => {
    const gd = { "Game A": {}, "Game B": {}, "Game C": {} };
    const result = await updater.run(gd);
    expect(result).toBe(3);
    expect(gd["Game A"].test).toBeDefined();
  });

  it("respects --limit in batch mode", async () => {
    const gd = { "Game A": {}, "Game B": {}, "Game C": {} };
    const result = await updater.run(gd, { limit: 1 });
    expect(result).toBe(1);
  });

  it("resolves explicit --game names", async () => {
    const gd = { "Game A": {}, "Game B": {} };
    const result = await updater.run(gd, { games: ["Game A"] });
    expect(result).toBe(1);
    expect(gd["Game A"].test).toBeDefined();
  });

  it("creates entry for unknown game names", async () => {
    const gd = {};
    const result = await updater.run(gd, { games: ["Brand New"] });
    expect(result).toBe(1);
    expect(gd["Brand New"]).toBeDefined();
    expect(gd["Brand New"].test).toBeDefined();
  });

  it("uses retry targets with --retry", async () => {
    const gd = {
      "Game A": { test: { found: false } },
      "Game B": { test: { found: true, updated_at: "2026-01-01" } },
      "Game C": {},
    };
    const result = await updater.run(gd, { retry: true });
    expect(result).toBe(1);
  });

  it("uses refresh targets with --refresh", async () => {
    const gd = {
      "Game A": { test: { found: true, updated_at: "2020-01-01" } },
      "Game B": { test: { found: true, updated_at: new Date().toISOString().slice(0, 10) } },
      "Game C": {},
    };
    const result = await updater.run(gd, { refresh: 30 });
    expect(result).toBe(1);
  });
});

describe("runCli()", () => {
  const origArgv = process.argv;

  afterEach(() => {
    process.argv = origArgv;
    vi.clearAllMocks();
  });

  it("no-ops when not the main module", () => {
    updater.runCli("file:///some/other/path.js");
    expect(loadJson).not.toHaveBeenCalled();
  });

  it("runs when argv matches importMetaUrl", async () => {
    const fakePath = "/tmp/test-updater.js";
    process.argv = ["node", fakePath];
    loadJson.mockReturnValue({ "Game A": {}, "Game B": {} });
    getGameNames.mockReturnValue(["Game A", "Game B"]);

    updater.runCli("file://" + fakePath);

    // runCli is async internally — wait for it
    await new Promise((r) => setTimeout(r, 50));
    expect(loadJson).toHaveBeenCalled();
    expect(saveJson).toHaveBeenCalled();
  });

  it("exits on --help", () => {
    const fakePath = "/tmp/test-updater.js";
    process.argv = ["node", fakePath, "--help"];
    const exit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });

    expect(() => updater.runCli("file://" + fakePath)).toThrow("exit");
    exit.mockRestore();
  });
});

describe("processOne base class", () => {
  it("throws when not overridden", async () => {
    const bare = new (class extends Updater {
      sourceKey = "test";
      label = "Test";
    })();
    await expect(bare.processOne({}, "x")).rejects.toThrow("processOne not implemented");
  });
});

describe("run() logs resolved name when different from input", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGameNames.mockReturnValue(["Cyberpunk 2077", "Elden Ring"]);
  });

  it("logs fuzzy resolution", async () => {
    const gd = { "Cyberpunk 2077": {} };
    await updater.run(gd, { games: ["cyberpunk"] });
    expect(gd["Cyberpunk 2077"].test).toBeDefined();
  });
});

describe("runCli error handling", () => {
  const origArgv = process.argv;

  afterEach(() => {
    process.argv = origArgv;
    vi.clearAllMocks();
  });

  it("catches async errors and exits", async () => {
    const fakePath = "/tmp/test-error.js";
    process.argv = ["node", fakePath];
    loadJson.mockImplementation(() => { throw new Error("disk fail"); });
    const exit = vi.spyOn(process, "exit").mockImplementation(() => {});

    const errorUpdater = new (class extends Updater {
      sourceKey = "test"; label = "Test";
      async processOne() { return false; }
    })();

    errorUpdater.runCli("file://" + fakePath);
    await new Promise((r) => setTimeout(r, 50));
    expect(exit).toHaveBeenCalledWith(1);
    exit.mockRestore();
  });
});
