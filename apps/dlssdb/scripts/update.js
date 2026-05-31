#!/usr/bin/env node
/**
 * Unified data updater for DLSSdb.
 *
 * Usage:
 *   node apps/dlssdb/scripts/update.js --game "Cyberpunk 2077"
 *   node apps/dlssdb/scripts/update.js                            # all unchecked
 *   node apps/dlssdb/scripts/update.js --dlss                     # update DLSS list only
 *
 * Sources: steam, hltb, metacritic, pcgw (default: steam, hltb, metacritic)
 */

import { fileURLToPath } from "url";
import { loadJson, saveJson, parseArgs } from "../../../shared/scripts/lib/util.js";
import { GAME_DATA_FILE, getGameNames } from "./config.js";

import { SteamUpdater } from "../../../shared/scripts/sources/steam.js";
import { HltbUpdater } from "../../../shared/scripts/sources/hltb.js";
import { MetacriticUpdater } from "../../../shared/scripts/sources/metacritic.js";
import { PcgwUpdater } from "../../../shared/scripts/sources/pcgw.js";
import { updateDlss } from "./sources/dlss.js";

const steam = new SteamUpdater();
const hltb = new HltbUpdater();
const metacritic = new MetacriticUpdater();
const pcgw = new PcgwUpdater();
[steam, hltb, metacritic, pcgw].forEach((u) => {
  u.gameDataFile = GAME_DATA_FILE;
  u.getGameNames = () => getGameNames();
});

const SOURCES = { steam, hltb, metacritic, pcgw };
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
    node apps/dlssdb/scripts/update.js --game "<name>"       Update all sources for one game
    node apps/dlssdb/scripts/update.js                       Update all unchecked (all sources)
    node apps/dlssdb/scripts/update.js --retry               Re-check all failed entries
    node apps/dlssdb/scripts/update.js --refresh <days>      Re-fetch stale entries
    node apps/dlssdb/scripts/update.js --backfill            Re-fetch entries missing fields
    node apps/dlssdb/scripts/update.js --dlss                Update NVIDIA DLSS games list

    Sources: ${ALL_KEYS.join(", ")} (default: ${DEFAULT_KEYS.join(", ")})`);
    process.exit(0);
  }

  const opts = parseArgs(args);
  const keys = parseSources(opts.sourcesRaw);

  const run = async () => {
    await updateDlss();
    if (args.includes("--dlss")) return;

    const gameData = loadJson(GAME_DATA_FILE);

    await Promise.all(keys.map(async (key) => {
      try { await SOURCES[key].run(gameData, opts); }
      catch (e) { console.error(`  [${key}] Error: ${e.message}`); }
    }));

    saveJson(GAME_DATA_FILE, gameData);
  };
  run().catch((e) => { console.error(e); process.exit(1); });
}
