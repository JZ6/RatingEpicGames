#!/usr/bin/env node
/**
 * Metacritic source updater for DLSSdb.
 *
 * Fetches critic review scores via two strategies:
 *   Pass 1: Steam App Details API (if we have the game's Steam appid)
 *           — fast, reliable, but only works for games on Steam with MC data
 *   Pass 2: Scrape metacritic.com directly by slug
 *           — slower, rate-limited, but works for non-Steam games
 *
 * Zero external dependencies — uses Node.js built-in fetch.
 * Uses batchSize=1 (sequential processing) to avoid Metacritic bot detection.
 */

import { Updater } from "../lib/base.js";
import { TODAY, UA, sleep, romanVariations, nameVariations, checkRateLimit } from "../lib/util.js";

// ---------------------------------------------------------------------------
// Slug generation — converts game names to Metacritic URL paths
// ---------------------------------------------------------------------------

/** Convert game name to Metacritic URL slug: "Cyberpunk 2077" → "cyberpunk-2077" */
export function nameToSlug(name) {
  let s = name.toLowerCase();
  s = s.replace(/[™®©]/g, "");           // Strip trademark symbols
  s = s.replace(/[':./!,()[\]&+]/g, ""); // Strip punctuation
  s = s.replace(/[^a-z0-9\s-]/g, "");    // Keep only alphanumeric + spaces + dashes
  s = s.replace(/[\s-]+/g, "-");          // Collapse whitespace/dashes
  s = s.replace(/^-+|-+$/g, "");          // Trim leading/trailing dashes
  return s;
}

/** Extract slug from a Metacritic URL: ".../game/pc/cyberpunk-2077?..." → "cyberpunk-2077" */
export function slugFromUrl(url) {
  const match = url.match(/\/game\/(?:pc\/)?([^/?]+)/);
  return match ? match[1] : null;
}

/** Generate slug variations with Arabic→Roman numeral conversions for sequels. */
export function slugVariations(slug) {
  return romanVariations(slug).map((s) => s.toLowerCase());
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

/**
 * Pass 1: Try to get Metacritic score from the Steam App Details API.
 * This is fast and reliable — Steam includes metacritic.score and metacritic.url
 * in app details for most games. Returns null if Steam doesn't have MC data.
 */
async function fetchViaAppId(appid) {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appid}`;
  const resp = await fetch(url, { headers: { "User-Agent": UA } });
  checkRateLimit(resp);
  if (!resp.ok) return null;
  const json = await resp.json();
  const data = json?.[String(appid)]?.data;
  if (!data) return null;
  const mc = data.metacritic;
  if (!mc?.score) return null;
  const slug = mc.url ? slugFromUrl(mc.url) : null;
  return { score: mc.score, slug, appid };
}

/**
 * Pass 2: Scrape Metacritic HTML directly for the ratingValue.
 * Tries slug variations (original + Roman numerals) for each name variation.
 * Rate-limited with 1s delay between requests to avoid bot detection.
 * Returns { score?, slug } or null if not found.
 */
async function fetchViaMetacritic(name) {
  for (const variation of nameVariations(name)) {
    for (const slug of slugVariations(nameToSlug(variation))) {
      const url = `https://www.metacritic.com/game/${slug}/`;
      const resp = await fetch(url, { headers: { "User-Agent": UA, "Accept": "text/html" } });
      checkRateLimit(resp);
      if (!resp.ok) { await sleep(1000); continue; }
      const html = await resp.text();
      // Look for JSON-LD ratingValue in the page
      const scoreMatch = html.match(/"ratingValue"[:\s]*"?(\d+)"?/);
      await sleep(1000); // Rate limit
      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : undefined;
      return { score, slug };
    }
  }
  return null;
}

/** Build an ordered metacritic entry object for game_data.json. */
export function buildMetacriticEntry(data) {
  const entry = { found: true };
  if (data.slug) entry.slug = data.slug;
  if (data.score) entry.score = data.score;
  entry.source = data.source; // "steam" or "metacritic" — tracks which pass found it
  if (data.appid) entry.appid = data.appid;
  entry.updated_at = TODAY;
  return entry;
}

// ---------------------------------------------------------------------------
// Updater
// ---------------------------------------------------------------------------

class MetacriticUpdater extends Updater {
  sourceKey = "metacritic";
  label = "Metacritic";
  batchSize = 1; // Sequential — Metacritic blocks concurrent requests
  helpText = `Usage:
  node scripts/sources/metacritic.js                      Update all unchecked games
  node scripts/sources/metacritic.js --limit <n>          Update n unchecked games
  node scripts/sources/metacritic.js --game "<name>"      Update/refresh a single game (fuzzy match)
  node scripts/sources/metacritic.js --retry              Re-check games previously not found
  node scripts/sources/metacritic.js --refresh <days>     Re-fetch entries older than <days>
  node scripts/sources/metacritic.js --backfill           Re-fetch games with slug but missing score`;

  /** Backfill: games that have a Metacritic slug but no score (page existed but score wasn't found). */
  backfillFilter(e) { return e.score == null; }

  async processOne(gameData, name, prefix = "") {
    const metacriticEntry = gameData[name].metacritic || {};
    const steamEntry = gameData[name].steam || {};

    // Log current state for single-game updates
    if (!prefix && metacriticEntry.score) {
      console.log(`  Current: score=${metacriticEntry.score} slug=${metacriticEntry.slug}`);
    }

    // Pass 0: Use cached score from Steam if available (avoids redundant API call)
    if (steamEntry.metacritic_score) {
      const slug = steamEntry.metacritic_url ? slugFromUrl(steamEntry.metacritic_url) : nameToSlug(name);
      gameData[name].metacritic = buildMetacriticEntry({
        score: steamEntry.metacritic_score, slug, appid: steamEntry.appid, source: "steam",
      });
      console.log(`  ${prefix}${name}: ${steamEntry.metacritic_score} [cached from steam]`);
      return true;
    }

    // Pass 1: Try Steam App Details — fast and doesn't hit Metacritic directly
    if (steamEntry.appid) {
      const result = await fetchViaAppId(steamEntry.appid);
      if (result) {
        gameData[name].metacritic = buildMetacriticEntry({
          ...result, source: "steam", slug: result.slug || nameToSlug(name),
        });
        console.log(`  ${prefix}${name}: ${result.score} [pass1: steam appid=${result.appid}]`);
        return true;
      }
    }

    // Pass 2: Scrape Metacritic directly — slower, rate-limited
    const result = await fetchViaMetacritic(name);
    if (result) {
      gameData[name].metacritic = buildMetacriticEntry({ ...result, source: "metacritic" });
      const scoreStr = result.score ? `${result.score}` : "no score yet";
      console.log(`  ${prefix}${name}: ${scoreStr} [pass2: metacritic slug=${result.slug}]`);
      return true;
    }

    // Not found on either source
    gameData[name].metacritic = { found: false, updated_at: TODAY };
    console.log(`  ${prefix}${name}: not found`);
    return false;
  }
}

// Instantiate and wire up CLI — runCli() no-ops when this file is imported
const metacritic = new MetacriticUpdater();
metacritic.runCli(import.meta.url);
export default metacritic;
