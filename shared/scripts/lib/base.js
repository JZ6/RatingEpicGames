/**
 * Base class for all source updaters.
 *
 * Each data source (Steam, HLTB, Metacritic, etc.) extends this class
 * and only needs to implement processOne() and set a few config properties.
 * The base class handles targeting, batching, stats, and CLI parsing.
 *
 * Subclass contract:
 *   - Set: sourceKey, label, helpText, gameDataFile
 *   - Override: processOne(gameData, name, prefix) → boolean
 *   - Optionally override: backfillFilter(entry), batchSize, getGameNames(gameData)
 */

import { fileURLToPath } from "url";
import { loadJson, saveJson, resolveGameName, parseArgs, sleep } from "./util.js";

export class Updater {
  sourceKey;
  label;
  batchSize = 6;
  batchDelay = 0;
  helpText = "";

  /** Path to game_data.json — must be set by each app before use. */
  gameDataFile;

  /**
   * Return the list of game names to process.
   * Default: all keys in game_data.json.
   * DLSSdb overrides this to read from the DLSS JSON file.
   */
  getGameNames(gameData) {
    return Object.keys(gameData);
  }

  getUncheckedTargets(gameData, gameNames) {
    return gameNames.filter((n) => !("found" in (gameData[n]?.[this.sourceKey] ?? {})));
  }

  getRetryTargets(gameData, gameNames) {
    return gameNames.filter((n) => gameData[n]?.[this.sourceKey]?.found === false);
  }

  getRefreshTargets(gameData, gameNames, days) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    return gameNames.filter((n) => {
      const e = gameData[n]?.[this.sourceKey];
      return e?.found === true && (!e.updated_at || e.updated_at < cutoff);
    });
  }

  getBackfillTargets(gameData, gameNames) {
    return gameNames.filter((n) => {
      const e = gameData[n]?.[this.sourceKey];
      return e?.found === true && this.backfillFilter(e);
    });
  }

  backfillFilter(_entry) { return false; }

  getTargets(gameData, gameNames, { backfill = false, retry = false, refresh = 0 } = {}) {
    if (backfill) return { list: this.getBackfillTargets(gameData, gameNames), label: "to backfill" };
    if (retry)    return { list: this.getRetryTargets(gameData, gameNames), label: "to retry" };
    if (refresh)  return { list: this.getRefreshTargets(gameData, gameNames, refresh), label: `stale (>${refresh}d)` };
    return { list: this.getUncheckedTargets(gameData, gameNames), label: "unchecked" };
  }

  logStats(gameData, gameNames, targets, label) {
    const withData = gameNames.filter((n) => gameData[n]?.[this.sourceKey]?.found === true).length;
    const notFound = gameNames.filter((n) => gameData[n]?.[this.sourceKey]?.found === false).length;
    console.log(`  ${withData} with data, ${notFound} not found, ${targets.length} ${label}`);
  }

  async processOne(_gameData, _name, _prefix) {
    throw new Error(`${this.label}: processOne not implemented`);
  }

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
        const oldJson = JSON.stringify(gameData[name]?.[this.sourceKey] ?? null);
        try { if (await this.processOne(gameData, name, prefix)) added++; }
        catch (e) { console.log(`  ${prefix}${name}: error (${e.message})`); }
        if (!this._forceTimestamp && oldJson !== "null") {
          const entry = gameData[name]?.[this.sourceKey];
          if (entry) {
            const old = JSON.parse(oldJson);
            const strip = (e) => { const { updated_at, ...rest } = e; return JSON.stringify(rest); };
            if (strip(old) === strip(entry)) entry.updated_at = old.updated_at;
          }
        }
      }));
    }
    console.log(`  Added ${added} new ${this.label} entries`);
    return added;
  }

  async run(gameData, { games = [], limit = 0, retry = false, refresh = 0, backfill = false } = {}) {
    this._forceTimestamp = !!(games.length || retry || refresh || backfill);
    const gameNames = this.getGameNames(gameData);
    let names;

    if (games.length) {
      const allNames = [...new Set([...gameNames, ...Object.keys(gameData)])];
      names = games.map((input) => {
        const resolved = resolveGameName(input, allNames);
        if (resolved !== input) console.log(`  Matched "${input}" → "${resolved}"`);
        if (!gameData[resolved]) gameData[resolved] = {};
        return resolved;
      });
    } else {
      const { list, label } = this.getTargets(gameData, gameNames, { retry, refresh, backfill });
      this.logStats(gameData, gameNames, list, label);
      names = limit > 0 ? list.slice(0, limit) : list;
    }

    console.log(`Updating ${this.label} data...`);
    return this.update(gameData, names);
  }

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
      const gameData = loadJson(this.gameDataFile);
      await this.run(gameData, opts);
      saveJson(this.gameDataFile, gameData);
    };
    exec().catch((e) => { console.error(e); process.exit(1); });
  }
}
