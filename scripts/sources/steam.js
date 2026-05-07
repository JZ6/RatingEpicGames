#!/usr/bin/env node
/**
 * Steam source updater for DLSSdb.
 *
 * Fetches review ratings, metadata (release date, genres, images), and
 * Metacritic URLs from the Steam Store and App Reviews APIs.
 * Zero external dependencies — uses Node.js built-in fetch.
 *
 * APIs used:
 *   - Store Search: /api/storesearch/?term=<name>     → find appid by name
 *   - App Reviews:  /appreviews/<appid>?json=1        → review rating + counts
 *   - App Details:  /api/appdetails?appids=<appid>    → metadata (genres, images, etc.)
 */

import { Updater } from "../lib/base.js";
import { TODAY, UA, normalizeQuotes, nameVariations, similarity, checkRateLimit } from "../lib/util.js";

const STEAM_BASE = "https://store.steampowered.com";

/**
 * Valid Steam review rating labels.
 * Non-standard descriptions (e.g. "3 user reviews") fall through to pct-based bucketing.
 */
const VALID_RATINGS = new Set([
  "Overwhelmingly Positive", "Very Positive", "Positive", "Mostly Positive",
  "Mixed", "Mostly Negative", "Negative", "Very Negative", "Overwhelmingly Negative",
]);

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

/**
 * Extract rating/pct/total from the App Reviews API response.
 * Falls back to pct-based bucketing when Steam returns a non-standard
 * description (e.g. "3 user reviews" for games with very few reviews).
 */
export function parseReviews(json) {
  const s = json?.query_summary;
  if (!s) return null;
  const total = s.total_reviews ?? 0;
  const positive = s.total_positive ?? 0;
  if (total === 0) return null;
  const desc = s.review_score_desc ?? "";
  const pct = Math.round((positive / total) * 100);
  let rating = VALID_RATINGS.has(desc) ? desc : undefined;
  if (!rating) {
    // Non-standard desc — bucket by positive percentage
    if (pct >= 95) rating = "Overwhelmingly Positive";
    else if (pct >= 80) rating = "Very Positive";
    else if (pct >= 70) rating = "Mostly Positive";
    else if (pct >= 40) rating = "Mixed";
    else if (pct >= 20) rating = "Mostly Negative";
    else rating = "Negative";
  }
  return { rating, pct, total };
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

/**
 * Search Steam Store by game name. Returns best matching appid or null.
 * Tries each nameVariation (original, without subtitle, etc.),
 * picks exact match first, then best similarity > 0.6.
 */
async function searchByName(rawName) {
  const name = normalizeQuotes(rawName);
  for (const variation of nameVariations(name)) {
    const url = `${STEAM_BASE}/api/storesearch/?term=${encodeURIComponent(variation)}&l=english&cc=US`;
    const resp = await fetch(url, { headers: { "User-Agent": UA } });
    checkRateLimit(resp);
    if (!resp.ok) continue;
    const items = (await resp.json()).items ?? [];
    if (!items.length) continue;

    // Prefer exact case-insensitive match
    const exact = items.find((i) => i.name.toLowerCase() === variation.toLowerCase());
    if (exact) return exact.id;

    // Fall back to best fuzzy match above threshold
    let best = null, bestSim = 0;
    for (const item of items) {
      const sim = Math.max(similarity(name, item.name), similarity(variation, item.name));
      if (sim > bestSim) { best = item; bestSim = sim; }
    }
    if (best && bestSim > 0.6) return best.id;
  }
  return null;
}

/** Fetch review summary (rating, positive %, total count) for a known appid. */
async function fetchReviews(appid) {
  const url = `${STEAM_BASE}/appreviews/${appid}?json=1&language=all&purchase_type=all&num_per_page=0`;
  const resp = await fetch(url, { headers: { "User-Agent": UA } });
  checkRateLimit(resp);
  if (!resp.ok) return null;
  return parseReviews(await resp.json());
}

/** Fetch metadata (release date, genres, capsule image, metacritic URL) for a known appid. */
async function fetchDetails(appid) {
  const url = `${STEAM_BASE}/api/appdetails?appids=${appid}`;
  const resp = await fetch(url, { headers: { "User-Agent": UA } });
  checkRateLimit(resp);
  if (!resp.ok) return {};
  const json = await resp.json();
  const data = json?.[String(appid)]?.data ?? {};
  const result = {};
  if (data.release_date?.date) result.release_date = data.release_date.date;
  if (data.metacritic?.score) result.metacritic_score = data.metacritic.score;
  if (data.metacritic?.url) result.metacritic_url = data.metacritic.url;
  if (data.genres?.length) result.genres = data.genres.map((g) => g.description);
  // Prefer v5 capsule image (higher resolution), fall back to v4
  const image = data.capsule_imagev5 || data.capsule_image;
  if (image) result.image = image;
  return result;
}

/**
 * Fetch all Steam data for a game.
 * If we already have an appid (from a previous run), skip the search.
 * Otherwise search by name first. Returns null if the game isn't on Steam.
 */
async function fetchGame(name, steamEntry) {
  let appid = steamEntry?.appid ?? null;
  if (!appid) {
    appid = await searchByName(name);
    if (!appid) return null;
  }
  const reviews = await fetchReviews(appid);
  const details = await fetchDetails(appid);
  return { appid, reviews, details };
}

/** Build an ordered steam entry object for game_data.json. */
export function buildSteamEntry(appid, reviews, details) {
  const entry = { found: true, appid };
  if (reviews) { entry.rating = reviews.rating; entry.pct = reviews.pct; entry.total = reviews.total; }
  if (details.release_date) entry.release_date = details.release_date;
  if (details.genres?.length) entry.genres = details.genres;
  if (details.image) entry.image = details.image;
  if (details.metacritic_score) entry.metacritic_score = details.metacritic_score;
  if (details.metacritic_url) entry.metacritic_url = details.metacritic_url;
  entry.updated_at = TODAY;
  return entry;
}

// ---------------------------------------------------------------------------
// Updater
// ---------------------------------------------------------------------------

class SteamUpdater extends Updater {
  sourceKey = "steam";
  label = "Steam";
  helpText = `Usage:
  node scripts/sources/steam.js                          Update all unchecked games
  node scripts/sources/steam.js --limit <n>              Update n unchecked games
  node scripts/sources/steam.js --game "<name>"          Update/refresh a single game (fuzzy match)
  node scripts/sources/steam.js --retry                  Re-check games previously not found
  node scripts/sources/steam.js --refresh <days>         Re-fetch entries older than <days>
  node scripts/sources/steam.js --backfill               Re-fetch games with appid but missing rating`;

  /** Backfill: games that have an appid but no review rating (e.g. search found them but reviews API failed). */
  backfillFilter(e) { return !e.rating; }

  async processOne(gameData, name, prefix = "") {
    const steamEntry = gameData[name].steam || {};

    // Log current state when updating a single game (no prefix = single-game mode)
    if (!prefix && steamEntry.appid) {
      console.log(`  Current: appid=${steamEntry.appid} rating=${steamEntry.rating} pct=${steamEntry.pct}`);
    }

    const result = await fetchGame(name, steamEntry);
    if (result) {
      gameData[name].steam = buildSteamEntry(result.appid, result.reviews, result.details);
      const rev = result.reviews;
      const revStr = rev ? `${rev.rating} (${rev.pct}%, ${rev.total.toLocaleString()} reviews)` : "no reviews yet";
      console.log(`  ${prefix}${name}: ${revStr} [appid=${result.appid}]`);
    } else {
      gameData[name].steam = { found: false, updated_at: TODAY };
      console.log(`  ${prefix}${name}: not found on Steam`);
    }
    return !!result;
  }
}

// Instantiate and wire up CLI — runCli() no-ops when this file is imported
const steam = new SteamUpdater();
steam.runCli(import.meta.url);
export default steam;
