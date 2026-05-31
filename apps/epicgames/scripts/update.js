#!/usr/bin/env node
/**
 * Unified data updater for Rating Epic Games.
 *
 * Orchestrates all source updaters (Steam, HLTB, Metacritic) and runs
 * them in parallel since each source only mutates its own sub-key.
 *
 * Usage:
 *   node scripts/update.js --game "Cyberpunk 2077"              # all sources, one game
 *   node scripts/update.js --game "Cyberpunk" --sources steam,hltb  # specific sources
 *   node scripts/update.js                                       # all unchecked, all sources
 *   node scripts/update.js --sources steam,metacritic            # batch specific sources
 *   node scripts/update.js --retry                               # retry all failed
 *   node scripts/update.js --refresh 30                          # refresh stale entries
 *   node scripts/update.js --backfill                            # re-fetch entries missing fields
 *   node scripts/update.js --limit 10                            # limit per source (batch)
 *   node scripts/update.js --epic                                # update Epic free games list
 *
 * Sources: steam, hltb, metacritic (default: all)
 */

import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { resolve, dirname } from "path";
import { GAME_DATA_FILE, loadJson, saveJson, parseArgs } from "./lib/util.js";

import steam from "./sources/steam.js";
import hltb from "./sources/hltb.js";
import metacritic from "./sources/metacritic.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    node scripts/update.js --game "<name>"               Update all sources for one game
    node scripts/update.js --game "<a>" --game "<b>"     Update multiple specific games
    node scripts/update.js --game "<name>" --sources steam,hltb  Update specific sources for one game
    node scripts/update.js                               Update all unchecked (all sources)
    node scripts/update.js --sources steam,hltb          Update all unchecked (specific sources)
    node scripts/update.js --retry                       Re-check all failed entries
    node scripts/update.js --refresh <days>              Re-fetch stale entries
    node scripts/update.js --backfill                    Re-fetch entries missing expected fields
    node scripts/update.js --limit <n>                   Limit per source in batch mode
    node scripts/update.js --epic                        Update Epic free games list (runs update-epic.js)

    Sources: ${ALL_KEYS.join(", ")} (default: ${DEFAULT_KEYS.join(", ")})`);
    process.exit(0);
  }

  const opts = parseArgs(args);
  const keys = parseSources(opts.sourcesRaw);

  const run = async () => {
    // Update Epic free games list if --epic flag or no specific flags
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
