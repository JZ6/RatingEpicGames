#!/usr/bin/env node
/**
 * Unified data updater for DLSSdb — update all sources for a game or in batch.
 *
 * This is the main entry point for updating game_data.json. It orchestrates
 * all four source updaters (Steam, HLTB, Metacritic, PCGamingWiki) and runs
 * them in parallel since each source only mutates its own sub-key.
 *
 * Single file is loaded, all sources process in parallel, single file is saved.
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
 *   node scripts/update.js --dlss                                # update NVIDIA DLSS games list
 *
 * Sources: steam, hltb, metacritic, pcgw (default: all)
 */

import { fileURLToPath } from "url";
import { GAME_DATA_FILE, loadJson, saveJson, parseArgs } from "./lib/util.js";

// Each source is an Updater instance with processOne(), update(), getTargets(), etc.
import steam from "./sources/steam.js";
import hltb from "./sources/hltb.js";
import metacritic from "./sources/metacritic.js";
import pcgw from "./sources/pcgw.js";
import { updateDlss } from "./sources/dlss.js";

/** All available source updaters, keyed by CLI name. */
const SOURCES = { steam, hltb, metacritic, pcgw };
const ALL_KEYS = Object.keys(SOURCES);

/** Default sources — pcgw excluded due to aggressive rate limiting. Use --sources pcgw to run it. */
const DEFAULT_KEYS = ["steam", "hltb", "metacritic"];



/**
 * Parse and validate the --sources flag.
 * Returns keys in canonical order (steam → hltb → metacritic → pcgw).
 * Exits with error if any unknown source names are given.
 */
function parseSources(raw) {
  if (!raw) return DEFAULT_KEYS;
  const requested = raw.split(",").map((s) => s.trim().toLowerCase());
  const invalid = requested.filter((s) => !SOURCES[s]);
  if (invalid.length) {
    console.error(`  Unknown source(s): ${invalid.join(", ")}. Valid: ${ALL_KEYS.join(", ")}`);
    process.exit(1);
  }
  // Preserve canonical order regardless of input order
  return ALL_KEYS.filter((s) => requested.includes(s));
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

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
    node scripts/update.js --dlss                        Update NVIDIA DLSS games list

    Sources: ${ALL_KEYS.join(", ")} (default: ${DEFAULT_KEYS.join(", ")})`);
    process.exit(0);
  }

  const opts = parseArgs(args);
  const keys = parseSources(opts.sourcesRaw);

  const run = async () => {
    // Update DLSS games list from NVIDIA if requested, or by default (no flags)
    await updateDlss();
    if (args.includes("--dlss")) { return; }

    // Load game data — new games were already added by updateDlss above
    const gameData = loadJson(GAME_DATA_FILE);

    // Run all selected sources in parallel — safe because each source
    // only writes to its own sub-key (steam/hltb/metacritic/pcgw)
    await Promise.all(keys.map(async (key) => {
      try { await SOURCES[key].run(gameData, opts); }
      catch (e) { console.error(`  [${key}] Error: ${e.message}`); }
    }));

    // Save once after all sources finish
    saveJson(GAME_DATA_FILE, gameData);
  };
  run().catch((e) => { console.error(e); process.exit(1); });
}
