#!/usr/bin/env node
/**
 * HLTB (HowLongToBeat) source updater for DLSSdb.
 *
 * Fetches game playtime data (main story, extras, completionist, co-op, PvP).
 * Zero external dependencies — uses Node.js built-in fetch.
 *
 * HLTB has no public API — this script discovers the search endpoint from
 * their frontend JS bundles and authenticates via an init token. The endpoint
 * and auth mechanism change periodically, so the discovery is dynamic.
 *
 * Fetch strategies (tried in order):
 *   1. By HLTB ID — scrapes the game page HTML (no auth needed, fastest)
 *   2. By name    — searches via the discovered API endpoint (needs auth)
 */

import { Updater } from "../lib/base.js";
import { TODAY, UA, normalizeQuotes, nameVariations, similarity, checkRateLimit } from "../lib/util.js";

const BASE_URL = "https://howlongtobeat.com";

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

/**
 * Extract playtime hours from a raw HLTB game object.
 * HLTB stores times in seconds; we convert to hours rounded to 2 decimals.
 * Returns null if no playtime data at all (only has game_id).
 */
export function parseHltbTimes(g) {
  const toHours = (s) => Math.round((s / 3600) * 100) / 100;
  const d = { hltb_id: g.game_id };
  if (g.comp_main > 0) d.main = toHours(g.comp_main);       // Main story
  if (g.comp_plus > 0) d.extra = toHours(g.comp_plus);       // Main + extras
  if (g.comp_100 > 0) d.complete = toHours(g.comp_100);      // Completionist
  if (g.invested_co > 0) d.coop = toHours(g.invested_co);    // Co-op
  if (g.invested_mp > 0) d.pvp = toHours(g.invested_mp);     // PvP multiplayer
  if (g.comp_speed > 0) d.speed = toHours(g.comp_speed);     // Speedrun
  if (g.comp_all > 0) d.all_styles = toHours(g.comp_all);    // All playstyles average
  return Object.keys(d).length > 1 ? d : null;
}

// ---------------------------------------------------------------------------
// HLTB API discovery — lazy-initialized, shared across calls
// ---------------------------------------------------------------------------

let _apiPromise = null;

/** Get (or discover) the HLTB search API endpoint and auth credentials. */
async function getApi() {
  if (_apiPromise) return _apiPromise;
  _apiPromise = _initApi();
  return _apiPromise;
}

/**
 * Discover the HLTB search API by:
 *   1. Fetching the homepage HTML
 *   2. Finding _app-*.js bundles
 *   3. Scanning for the fetch() call to find the search path
 *   4. Hitting the /init endpoint for auth token
 */
async function _initApi() {
  console.log("  Discovering HLTB API endpoint...");
  const resp = await fetch(BASE_URL, { headers: { "User-Agent": UA, Accept: "text/html" } });
  checkRateLimit(resp);
  if (!resp.ok) throw new Error(`HLTB homepage returned ${resp.status}`);
  const html = await resp.text();

  // Find JS bundles and scan for the search API path
  const allScripts = [...html.matchAll(/src="([^"]*\.js)"/g)].map((m) => m[1]);
  const appScripts = allScripts.filter((s) => s.includes("_app-"));
  let searchPath = "/api/s"; // fallback
  for (const src of appScripts.length ? appScripts : allScripts) {
    const url = src.startsWith("http") ? src : `${BASE_URL}/${src.replace(/^\//, "")}`;
    const scriptResp = await fetch(url, { headers: { "User-Agent": UA } });
    if (!scriptResp.ok) continue;
    const match = (await scriptResp.text()).match(
      /fetch\s*\(\s*["']\/api\/([a-zA-Z0-9_/]+)[^"']*["']\s*,\s*\{[^}]*method:\s*["']POST["'][^}]*\}/s
    );
    if (match) { searchPath = `/api/${match[1].split("/")[0]}`; break; }
  }
  console.log(`  Endpoint: ${searchPath}`);

  // Get auth token from the init endpoint
  const initResp = await fetch(`${BASE_URL}${searchPath}/init?t=${Date.now()}`, {
    headers: { "User-Agent": UA, Referer: BASE_URL + "/" },
  });
  if (!initResp.ok) throw new Error("Could not get HLTB auth token");
  const json = await initResp.json();
  let authKey = null, authValue = null;
  for (const [k, v] of Object.entries(json)) {
    if (/key/i.test(k)) authKey = v;
    else if (/val/i.test(k)) authValue = v;
  }
  console.log("  Auth token acquired");
  return { searchPath, token: json.token, authKey, authValue };
}

// ---------------------------------------------------------------------------
// Fetch strategies
// ---------------------------------------------------------------------------

/**
 * Strategy 1: Fetch by HLTB game ID (scrapes the game page HTML).
 * Fastest and doesn't need auth — used when we already have the hltb_id
 * from a previous run. Falls back to name search if the page doesn't exist.
 */
async function fetchById(hltbId) {
  const resp = await fetch(`${BASE_URL}/game/${hltbId}`, {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  checkRateLimit(resp);
  if (!resp.ok) return null;
  // Extract game data from Next.js __NEXT_DATA__ script tag
  const match = (await resp.text()).match(
    /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s
  );
  if (!match) return null;
  const games = JSON.parse(match[1]).props?.pageProps?.game?.data?.game;
  const g = Array.isArray(games) ? games[0] : games;
  if (!g) return null;
  const data = parseHltbTimes(g) ?? { hltb_id: g.game_id };
  return { data, via: "" };
}

/**
 * Strategy 2: Search by name via the HLTB API (needs auth).
 * Tries each nameVariation and picks the best fuzzy match above 0.6 threshold.
 * Returns { data, via } where via indicates which name variation matched.
 */
async function fetchByName(rawName) {
  const name = normalizeQuotes(rawName);
  const api = await getApi();
  const headers = {
    "Content-Type": "application/json", Accept: "*/*", "User-Agent": UA,
    Referer: BASE_URL + "/", Origin: BASE_URL + "/",
    "x-auth-token": String(api.token),
  };
  if (api.authKey != null) headers["x-hp-key"] = String(api.authKey);
  if (api.authValue != null) headers["x-hp-val"] = String(api.authValue);

  for (const variation of nameVariations(name)) {
    const payload = {
      searchType: "games", searchTerms: variation.split(/\s+/), searchPage: 1, size: 20,
      searchOptions: {
        games: { userId: 0, platform: "", sortCategory: "popular", rangeCategory: "main",
          rangeTime: { min: 0, max: 0 }, gameplay: { perspective: "", flow: "", genre: "", difficulty: "" },
          rangeYear: { max: "", min: "" }, modifier: "" },
        users: { sortCategory: "postcount" }, lists: { sortCategory: "follows" },
        filter: "", sort: 0, randomizer: 0,
      },
      useCache: true,
    };
    // Include anti-bot auth payload field if present
    if (api.authKey != null) payload[api.authKey] = api.authValue;

    const resp = await fetch(`${BASE_URL}${api.searchPath}`, {
      method: "POST", headers, body: JSON.stringify(payload),
    });
    checkRateLimit(resp);
    if (!resp.ok) continue;
    const results = (await resp.json()).data || [];

    // Find the best fuzzy match across game_name and game_alias
    let best = null, bestSim = 0;
    for (const r of results) {
      const sim = Math.max(similarity(name, r.game_name), similarity(name, r.game_alias));
      if (sim > bestSim) { best = r; bestSim = sim; }
    }
    if (best && bestSim > 0.6) {
      const data = parseHltbTimes(best) ?? { hltb_id: best.game_id };
      const via = variation !== name ? ` (via "${variation}")` : "";
      return { data, via };
    }
  }
  return null;
}

/** Try fetching by ID first (if we have one), then fall back to name search. */
async function fetchGame(name, hltbEntry) {
  if (hltbEntry?.hltb_id) {
    const result = await fetchById(hltbEntry.hltb_id);
    if (result) return result;
  }
  return await fetchByName(name);
}

/** Build an ordered hltb entry object for game_data.json. */
export function buildHltbEntry(data) {
  const entry = { found: true };
  if (data.hltb_id) entry.hltb_id = data.hltb_id;
  if (data.main) entry.main = data.main;
  if (data.extra) entry.extra = data.extra;
  if (data.complete) entry.complete = data.complete;
  if (data.coop) entry.coop = data.coop;
  if (data.pvp) entry.pvp = data.pvp;
  if (data.speed) entry.speed = data.speed;
  if (data.all_styles) entry.all_styles = data.all_styles;
  entry.updated_at = TODAY;
  return entry;
}

// ---------------------------------------------------------------------------
// Updater
// ---------------------------------------------------------------------------

class HltbUpdater extends Updater {
  sourceKey = "hltb";
  label = "HLTB";
  helpText = `Usage:
  node scripts/sources/hltb.js                          Update all unchecked games
  node scripts/sources/hltb.js --limit <n>              Update n unchecked games
  node scripts/sources/hltb.js --game "<name>"          Update/refresh a single game (fuzzy match)
  node scripts/sources/hltb.js --retry                  Re-check games previously not found
  node scripts/sources/hltb.js --refresh <days>         Re-fetch entries older than <days>
  node scripts/sources/hltb.js --backfill               Backfill hltb_id for existing entries`;

  /** Backfill: games found but missing hltb_id (e.g. matched by name but ID wasn't stored). */
  backfillFilter(e) { return !e.hltb_id; }

  async processOne(gameData, name, prefix = "") {
    const hltbEntry = gameData[name].hltb || {};

    // Log current state for single-game updates
    if (!prefix && hltbEntry.hltb_id) console.log(`  Current: hltb_id=${hltbEntry.hltb_id} main=${hltbEntry.main}`);

    const result = await fetchGame(name, hltbEntry);
    if (result) {
      gameData[name].hltb = buildHltbEntry(result.data);
      console.log(`  ${prefix}${name}: ${result.data.main || "?"}h${result.via} [hltb_id=${result.data.hltb_id}]`);
    } else {
      // Preserve hltb_id if we had one — the game page might be temporarily down
      const preserved = hltbEntry.hltb_id ? { hltb_id: hltbEntry.hltb_id } : {};
      gameData[name].hltb = { found: false, ...preserved, updated_at: TODAY };
      console.log(`  ${prefix}${name}: not found`);
    }
    return !!result;
  }
}

// Instantiate and wire up CLI — runCli() no-ops when this file is imported
const hltb = new HltbUpdater();
hltb.runCli(import.meta.url);
export default hltb;
