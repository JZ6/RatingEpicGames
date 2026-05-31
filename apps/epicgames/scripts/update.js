#!/usr/bin/env node
/**
 * Unified data updater for Rating Epic Games.
 *
 * Usage:
 *   node apps/epicgames/scripts/update.js --game "Cyberpunk 2077"
 *   node apps/epicgames/scripts/update.js                          # all unchecked
 *   node apps/epicgames/scripts/update.js --epic                   # update Epic free games list
 *
 * Sources: steam, hltb, metacritic (default: all)
 */

import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { resolve, dirname } from "path";
import { loadJson, saveJson, parseArgs } from "../../../shared/scripts/lib/util.js";
import { GAME_DATA_FILE } from "./config.js";

import { SteamUpdater } from "../../../shared/scripts/sources/steam.js";
import { HltbUpdater } from "../../../shared/scripts/sources/hltb.js";
import { MetacriticUpdater } from "../../../shared/scripts/sources/metacritic.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const steam = new SteamUpdater();
const hltb = new HltbUpdater();
const metacritic = new MetacriticUpdater();
[steam, hltb, metacritic].forEach((u) => { u.gameDataFile = GAME_DATA_FILE; });

const SOURCES = { steam, hltb, metacritic };
const ALL_KEYS = Object.keys(SOURCES);
const DEFAULT_KEYS = ["steam", "hltb", "metacritic"];

function parseSources(raw) {
  if (!raw) return DEFAULT_KEYS;
  const requested = raw.split(",").map((s) => s.trim().toLowerCase());
  const invalid = requested.filter((s) => !SOURCES[s]);
  if (invalid.length) {
    console.error(`  Unknown source(s): ${invalid.join(", ")}. Valid: ${ALL_KEYS.join(", ")}`);
    process.exit(1);
  }
  return ALL_KEYS.filter((s) => requested.includes(s));
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage:
    node apps/epicgames/scripts/update.js --game "<name>"       Update all sources for one game
    node apps/epicgames/scripts/update.js                       Update all unchecked (all sources)
    node apps/epicgames/scripts/update.js --retry               Re-check all failed entries
    node apps/epicgames/scripts/update.js --refresh <days>      Re-fetch stale entries
    node apps/epicgames/scripts/update.js --backfill            Re-fetch entries missing fields
    node apps/epicgames/scripts/update.js --epic                Update Epic free games list

    Sources: ${ALL_KEYS.join(", ")} (default: ${DEFAULT_KEYS.join(", ")})`);
    process.exit(0);
  }

  const opts = parseArgs(args);
  const keys = parseSources(opts.sourcesRaw);

  const run = async () => {
    if (args.includes("--epic") || (!opts.games?.length && !opts.sourcesRaw && !opts.retry && !opts.refresh && !opts.backfill)) {
      console.log("Running Epic free games updater...\n");
      execFileSync("node", [resolve(__dirname, "sources/epic.js")], { stdio: "inherit" });
      console.log("");
      if (args.includes("--epic")) return;
    }

    const gameData = loadJson(GAME_DATA_FILE);

    await Promise.all(keys.map(async (key) => {
      try { await SOURCES[key].run(gameData, opts); }
      catch (e) { console.error(`  [${key}] Error: ${e.message}`); }
    }));

    saveJson(GAME_DATA_FILE, gameData);
  };
  run().catch((e) => { console.error(e); process.exit(1); });
}
