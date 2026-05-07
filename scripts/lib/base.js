/**
 * Base class for all DLSSdb source updaters.
 *
 * Each data source (Steam, HLTB, Metacritic, PCGamingWiki) extends this class
 * and only needs to implement processOne() and set a few config properties.
 * The base class handles targeting, batching, stats, and CLI parsing.
 *
 * Subclass contract:
 *   - Set: sourceKey, label, helpText
 *   - Override: processOne(gameData, name, prefix) → boolean
 *   - Optionally override: backfillFilter(entry), batchSize, update(gameData, names)
 *
 * Data flow:
 *   CLI args → getTargets() → logStats() → update() → processOne() per game
 *   All mutations happen on the shared gameData object; I/O is only in runCli().
 */

import { fileURLToPath } from "url";
import { GAME_DATA_FILE, loadJson, saveJson, getGameNames, resolveGameName, parseArgs, sleep } from "./util.js";

export class Updater {
  /** Sub-key in game_data.json entries: "steam", "hltb", "metacritic", "pcgw" */
  sourceKey;

  /** Human-readable name for log messages: "Steam", "HLTB", etc. */
  label;

  /** Max concurrent API requests per batch (override for rate-limited sources). */
  batchSize = 6;

  /** Delay in ms between batches to avoid rate limiting. */
  batchDelay = 0;

  /** CLI --help output text. */
  helpText = "";

  // ---------------------------------------------------------------------------
  // Targeting — each returns string[] of game names to process
  // ---------------------------------------------------------------------------

  /**
   * Games with no "found" key — never checked against this source.
   * This is the default mode when no flags are passed.
   */
  getUncheckedTargets(gameData, gameNames) {
    return gameNames.filter((n) => !("found" in (gameData[n]?.[this.sourceKey] ?? {})));
  }

  /**
   * Games where found === false — previously looked up but not found.
   * Used with --retry to re-check (the source may have added the game since).
   */
  getRetryTargets(gameData, gameNames) {
    return gameNames.filter((n) => gameData[n]?.[this.sourceKey]?.found === false);
  }

  /**
   * Games where found === true but updated_at is older than `days`.
   * Used with --refresh to keep data current (ratings change, new DLC, etc.).
   */
  getRefreshTargets(gameData, gameNames, days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    return gameNames.filter((n) => {
      const e = gameData[n]?.[this.sourceKey];
      return e?.found === true && (!e.updated_at || e.updated_at < cutoff);
    });
  }

  /**
   * Games where found === true but missing expected fields.
   * Used with --backfill to fill in data that was unavailable on first fetch.
   * Which fields are "expected" is defined by backfillFilter() in each subclass.
   */
  getBackfillTargets(gameData, gameNames) {
    return gameNames.filter((n) => {
      const e = gameData[n]?.[this.sourceKey];
      return e?.found === true && this.backfillFilter(e);
    });
  }

  /**
   * Subclass override: return true if a found entry is missing expected fields.
   * Examples:
   *   Steam:      (e) => !e.rating       — has appid but no review data
   *   HLTB:       (e) => !e.hltb_id      — found but missing ID
   *   Metacritic: (e) => e.score == null  — has slug but no score
   *   PCGW:       (e) => !e.fsr_version && !e.xess_version — page-only
   */
  backfillFilter(_entry) { return false; }

  /**
   * Dispatcher — picks the right targeting method based on CLI flags.
   * Priority: backfill > retry > refresh > unchecked (default).
   * Returns { list: string[], label: string } for logging.
   */
  getTargets(gameData, gameNames, { backfill = false, retry = false, refresh = 0 } = {}) {
    if (backfill) return { list: this.getBackfillTargets(gameData, gameNames), label: "to backfill" };
    if (retry)    return { list: this.getRetryTargets(gameData, gameNames), label: "to retry" };
    if (refresh)  return { list: this.getRefreshTargets(gameData, gameNames, refresh), label: `stale (>${refresh}d)` };
    return { list: this.getUncheckedTargets(gameData, gameNames), label: "unchecked" };
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  /**
   * Log current source coverage: how many games have data, how many were
   * not found, and how many are in the current target set.
   */
  logStats(gameData, gameNames, targets, label) {
    const withData = gameNames.filter((n) => gameData[n]?.[this.sourceKey]?.found === true).length;
    const notFound = gameNames.filter((n) => gameData[n]?.[this.sourceKey]?.found === false).length;
    console.log(`  ${withData} with data, ${notFound} not found, ${targets.length} ${label}`);
  }

  // ---------------------------------------------------------------------------
  // Processing
  // ---------------------------------------------------------------------------

  /**
   * Subclass override: fetch data for one game from the external source
   * and write it to gameData[name][sourceKey].
   *
   * @param {object} gameData - Shared game data object (mutate in place)
   * @param {string} name     - Canonical game name
   * @param {string} prefix   - Log prefix like "[3/50] " for batch progress (empty for single game)
   * @returns {boolean} true if the game was found on the source
   */
  async processOne(_gameData, _name, _prefix) {
    throw new Error(`${this.label}: processOne not implemented`);
  }

  /**
   * Process a list of game names in concurrent batches.
   * Calls processOne() for each game, catching errors per-game so one failure
   * doesn't abort the batch. Returns count of successfully found games.
   *
   * Subclasses can override this for bulk optimizations (e.g. PCGW fetches
   * all FSR/XeSS data in ~3 API calls instead of 2 per game).
   *
   * @param {object}   gameData - Shared game data object
   * @param {string[]} names    - Game names to process (already filtered + limited)
   * @returns {number} count of games successfully found
   */
  async update(gameData, names) {
    if (!names.length) { console.log("  Nothing to do"); return 0; }
    console.log(`  Fetching ${names.length} games...`);
    let added = 0;
    for (let i = 0; i < names.length; i += this.batchSize) {
      if (i > 0 && this.batchDelay) await sleep(this.batchDelay);
      const batch = names.slice(i, i + this.batchSize);
      await Promise.all(batch.map(async (name, j) => {
        if (!gameData[name]) gameData[name] = {};
        const prefix = names.length > 1 ? `[${i + j + 1}/${names.length}] ` : "";
        try { if (await this.processOne(gameData, name, prefix)) added++; }
        catch (e) { console.log(`  ${prefix}${name}: error (${e.message})`); }
      }));
    }
    console.log(`  Added ${added} new ${this.label} entries`);
    return added;
  }

  // ---------------------------------------------------------------------------
  // Orchestration — shared by runCli() and update.js
  // ---------------------------------------------------------------------------

  /**
   * Resolve targets and run update. This is the shared orchestration logic
   * used by both standalone CLI (runCli) and the unified updater (update.js).
   *
   * If opts.games is provided, resolves those names and updates them.
   * Otherwise, selects targets based on mode flags (retry/refresh/backfill/unchecked).
   *
   * Pure processing — no file I/O. Caller is responsible for load/save.
   *
   * @param {object} gameData - Shared game data object (mutated in place)
   * @param {object} opts     - Parsed CLI options from parseArgs()
   */
  async run(gameData, { games = [], limit = 0, retry = false, refresh = 0, backfill = false } = {}) {
    const gameNames = getGameNames();
    let names;

    if (games.length) {
      // Explicit game(s): resolve each fuzzy name and build the list
      const allNames = [...new Set([...gameNames, ...Object.keys(gameData)])];
      names = games.map((input) => {
        const resolved = resolveGameName(input, allNames);
        if (resolved !== input) console.log(`  Matched "${input}" → "${resolved}"`);
        if (!gameData[resolved]) gameData[resolved] = {};
        return resolved;
      });
    } else {
      // Batch mode: select targets based on flags, apply limit
      const { list, label } = this.getTargets(gameData, gameNames, { retry, refresh, backfill });
      this.logStats(gameData, gameNames, list, label);
      names = limit > 0 ? list.slice(0, limit) : list;
    }

    console.log(`Updating ${this.label} data...`);
    return this.update(gameData, names);
  }

  // ---------------------------------------------------------------------------
  // CLI — standalone entry point for each source script
  // ---------------------------------------------------------------------------

  /**
   * Parse CLI flags and run the updater. Called at module level in each source
   * script; no-ops when the script is imported (not run directly).
   *
   * All file I/O (loadJson/saveJson) happens here — run() and below are
   * pure processing on the shared gameData object.
   */
  runCli(importMetaUrl) {
    const isMain = process.argv[1] === fileURLToPath(importMetaUrl);
    if (!isMain) return;

    const args = process.argv.slice(2);
    if (args.includes("--help") || args.includes("-h")) {
      console.log(this.helpText);
      process.exit(0);
    }

    const opts = parseArgs(args);
    const exec = async () => {
      const gameData = loadJson(GAME_DATA_FILE);
      await this.run(gameData, opts);
      saveJson(GAME_DATA_FILE, gameData);
    };
    exec().catch((e) => { console.error(e); process.exit(1); });
  }
}
