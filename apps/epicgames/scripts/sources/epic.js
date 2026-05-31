#!/usr/bin/env node

import { GAME_DATA_FILE, TODAY, loadJson, saveJson } from "../lib/util.js";
import * as fuzz from "fuzzball";

const HISTORY_URL = "https://raw.githubusercontent.com/josephmate/EpicFreeGamesList/main/epic_free_games.json";
const LIVE_URL = "https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US";

// Pairs that fuzzy matching incorrectly considers the same game
const MERGE_BLOCKLIST = new Set([
  "shadow tactics|shadow tactics aikos choice",
  "shadow tactics blades of the shogun|shadow tactics aikos choice",
  "antstream arcade|arcade paradise",
  "poker club|super space club",
]);

function steamAppIdFromUrl(url) {
  if (!url) return undefined;
  const m = url.match(/\/app\/(\d+)/);
  return m ? parseInt(m[1]) : undefined;
}

function pctToRating(pct) {
  if (pct >= 95) return "Overwhelmingly Positive";
  if (pct >= 80) return "Very Positive";
  if (pct >= 70) return "Mostly Positive";
  if (pct >= 40) return "Mixed";
  if (pct >= 20) return "Mostly Negative";
  return "Very Negative";
}


function toISODate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toISOString().split("T")[0];
}

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function isBlockedPair(a, b) {
  const na = normalize(a), nb = normalize(b);
  return MERGE_BLOCKLIST.has(`${na}|${nb}`) || MERGE_BLOCKLIST.has(`${nb}|${na}`);
}

function isFuzzyMatch(oldName, jName, oldSlug, jSlug) {
  if (isBlockedPair(oldName, jName)) return false;

  // Slug match
  if (jSlug && oldSlug && oldSlug === jSlug) return true;

  // fuzzball matching — token_set_ratio handles edition suffixes and word reordering,
  // ratio handles collapsed spaces ("DeathComing" vs "Death Coming")
  const score = Math.max(fuzz.token_set_ratio(oldName, jName), fuzz.ratio(oldName, jName));
  return score >= 80;
}

function mergeEntryData(target, source) {
  if (source.steam?.total && (!target.steam?.total || source.steam.total > target.steam.total)) {
    target.steam = { ...target.steam, ...source.steam };
  }
  if (source.metacritic?.user_score && !target.metacritic?.user_score) {
    target.metacritic = { ...target.metacritic, user_score: source.metacritic.user_score };
  }
  if (source.metacritic?.score && !target.metacritic?.score) {
    target.metacritic = { ...target.metacritic, found: true, score: source.metacritic.score };
  }
}

function buildEpicSection(entries, existingEpic, slug, now) {
  const seen = new Set();
  const freeDates = entries
    .filter((e) => e.freeDate)
    .map((e) => {
      const start = toISODate(e.freeDate);
      const existing = existingEpic?.free_dates?.find((d) => d.start === start);
      return { start, end: existing?.end || "" };
    })
    .filter((d) => { if (seen.has(d.start)) return false; seen.add(d.start); return true; })
    .sort((a, b) => a.start.localeCompare(b.start));

  const platforms = [...new Set(entries.map((e) => e.platform || "pc").filter(Boolean))].sort();
  const best = entries.reduce((a, b) => (b.steamDBRating || 0) > (a.steamDBRating || 0) ? b : a, entries[0]);

  return {
    slug: existingEpic?.slug || slug,
    free_dates: freeDates,
    platforms,
    ...(best.epicId && { epic_id: best.epicId }),
    ...(best.epicRating && { epic_rating: best.epicRating }),
    ...(best.sandboxId && { sandbox_id: best.sandboxId }),
    ...(best.epicStoreLink && { store_url: best.epicStoreLink }),
    updated_at: now,
  };
}

function buildSteamFields(best, appid, existingSteam, now) {
  if (!appid) return existingSteam || { found: false, updated_at: now };
  const pct = best.steamDBRating ? Math.round(best.steamDBRating) : undefined;
  return {
    ...existingSteam,
    found: true,
    appid,
    ...(best.steamDBRating && { steamdb_rating: best.steamDBRating }),
    ...(!existingSteam?.pct && pct && { pct, rating: pctToRating(pct) }),
    image: existingSteam?.image || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/capsule_184x69.jpg`,
    ...(best.steamUrl && { steam_url: best.steamUrl }),
    ...(best.steamDBUrl && { steamdb_url: best.steamDBUrl }),
    updated_at: now,
  };
}

function buildMetacriticFields(best, slug, existingMC, now) {
  const mc = { ...existingMC };
  if (best.metacriticScore && (!mc.score || mc.source === "legacy")) {
    mc.found = true;
    mc.score = best.metacriticScore;
    mc.slug = mc.slug || slug;
    mc.source = "josephmate";
    mc.updated_at = now;
  }
  if (best.metacriticUrl?.includes("metacritic.com")) {
    mc.url = best.metacriticUrl;
  }
  return mc.found !== undefined ? mc : { found: false, updated_at: now };
}

async function fetchHistory() {
  console.log("Fetching historical free games list...");
  const resp = await fetch(HISTORY_URL);
  if (!resp.ok) throw new Error(`History fetch failed: ${resp.status}`);
  const games = await resp.json();
  console.log(`  Got ${games.length} entries`);
  return games;
}

async function fetchLive() {
  console.log("Fetching live Epic promotions...");
  try {
    const resp = await fetch(LIVE_URL);
    if (!resp.ok) throw new Error(`Live fetch failed: ${resp.status}`);
    const data = await resp.json();
    const elements = data?.data?.Catalog?.searchStore?.elements || [];
    console.log(`  Got ${elements.length} live elements`);
    return elements;
  } catch (err) {
    console.warn(`  Live fetch failed: ${err.message}`);
    return [];
  }
}

function processHistory(gameData, history) {
  let newGames = 0, updatedGames = 0, merged = 0;
  const now = TODAY;

  // Group by canonical title
  const grouped = new Map();
  for (const entry of history) {
    const name = entry.gameTitle?.trim();
    if (!name) continue;
    if (!grouped.has(name)) grouped.set(name, []);
    grouped.get(name).push(entry);
  }

  // Build canonical name map: fuzzy-match existing entries to josephmate names
  // Only rename entries that are NOT themselves a josephmate canonical title
  const jCanonNames = new Set(grouped.keys());
  const canonMap = new Map();
  for (const [jName, entries] of grouped) {
    const jSlug = entries[0].productSlug || entries[0].mappingSlug || entries[0].urlSlug || "";
    for (const oldName of Object.keys(gameData)) {
      if (oldName === jName) continue;
      if (canonMap.has(oldName)) continue;
      if (jCanonNames.has(oldName)) continue;
      const oldSlug = gameData[oldName].epic?.slug || "";
      if (isFuzzyMatch(oldName, jName, oldSlug, jSlug)) {
        canonMap.set(oldName, jName);
      }
    }
  }

  // Rename/merge old entries into canonical names
  for (const [oldName, newName] of canonMap) {
    const oldEntry = gameData[oldName];
    if (gameData[newName]) {
      mergeEntryData(gameData[newName], oldEntry);
    } else {
      gameData[newName] = oldEntry;
    }
    delete gameData[oldName];
    merged++;
  }
  if (merged > 0) console.log(`  Renamed/merged ${merged} entries to canonical names`);

  // Process each grouped game
  for (const [name, entries] of grouped) {
    const first = entries[0];
    const slug = first.productSlug || first.mappingSlug || first.urlSlug || "";
    const appid = steamAppIdFromUrl(first.steamUrl);
    const best = entries.reduce((a, b) => (b.steamDBRating || 0) > (a.steamDBRating || 0) ? b : a, first);

    if (gameData[name]) {
      const existing = gameData[name];
      existing.epic = buildEpicSection(entries, existing.epic, slug, now);
      existing.steam = buildSteamFields(best, appid, existing.steam, now);
      existing.metacritic = buildMetacriticFields(best, slug, existing.metacritic, now);
      updatedGames++;
    } else {
      gameData[name] = {
        steam: buildSteamFields(best, appid, null, now),
        metacritic: buildMetacriticFields(best, slug, {}, now),
        epic: buildEpicSection(entries, null, slug, now),
      };
      newGames++;
    }
  }

  return { newGames, updatedGames, merged };
}

function processLive(gameData, elements) {
  let newGames = 0, updatedGames = 0;
  const now = TODAY;

  for (const element of elements) {
    const title = element.title?.trim();
    if (!title) continue;

    const promos = element.promotions;
    if (!promos) continue;

    const allOffers = [
      ...(promos.promotionalOffers || []),
      ...(promos.upcomingPromotionalOffers || []),
    ];

    const freeDates = [];
    for (const group of allOffers) {
      for (const offer of group.promotionalOffers || []) {
        if (offer.discountSetting?.discountPercentage === 0) {
          freeDates.push({ start: toISODate(offer.startDate), end: toISODate(offer.endDate) });
        }
      }
    }
    if (freeDates.length === 0) continue;
    if (/^Mystery Game/i.test(title)) continue;

    const slug = element.productSlug || element.urlSlug || element.offerMappings?.[0]?.pageSlug || "";

    if (gameData[title]) {
      let added = false;
      if (!gameData[title].epic) gameData[title].epic = { slug, free_dates: [] };
      for (const fd of freeDates) {
        const exists = gameData[title].epic.free_dates.some((d) => d.start === fd.start);
        if (!exists) { gameData[title].epic.free_dates.push(fd); added = true; }
      }
      if (added) {
        gameData[title].epic.free_dates.sort((a, b) => a.start.localeCompare(b.start));
        gameData[title].epic.updated_at = now;
        updatedGames++;
      }
    } else {
      gameData[title] = {
        steam: { found: false, updated_at: now },
        metacritic: { found: false, updated_at: now },
        epic: { slug, free_dates: freeDates, platforms: ["pc"], updated_at: now },
      };
      newGames++;
    }
  }

  return { newGames, updatedGames };
}

async function main() {
  const args = process.argv.slice(2);
  const skipHistory = args.includes("--live-only");
  const skipLive = args.includes("--history-only");

  const gameData = loadJson(GAME_DATA_FILE);

  // Normalize existing dates
  for (const game of Object.values(gameData)) {
    if (game.epic?.free_dates) {
      const seen = new Set();
      game.epic.free_dates = game.epic.free_dates
        .map((d) => ({ start: toISODate(d.start), end: toISODate(d.end) }))
        .filter((d) => { if (seen.has(d.start)) return false; seen.add(d.start); return true; })
        .sort((a, b) => a.start.localeCompare(b.start));
    }
  }

  const beforeCount = Object.keys(gameData).length;
  let totalNew = 0, totalUpdated = 0, totalMerged = 0;

  if (!skipHistory) {
    const history = await fetchHistory();
    const { newGames, updatedGames, merged } = processHistory(gameData, history);
    totalNew += newGames;
    totalUpdated += updatedGames;
    totalMerged += merged;
  }

  if (!skipLive) {
    const live = await fetchLive();
    const { newGames, updatedGames } = processLive(gameData, live);
    totalNew += newGames;
    totalUpdated += updatedGames;
  }

  // Backfill updated_at
  const now = TODAY;
  for (const game of Object.values(gameData)) {
    if (game.steam?.found && !game.steam.updated_at) game.steam.updated_at = now;
    if (game.metacritic?.found && !game.metacritic.updated_at) game.metacritic.updated_at = now;
    if (game.epic && !game.epic.updated_at) game.epic.updated_at = now;
  }

  const afterCount = Object.keys(gameData).length;
  saveJson(GAME_DATA_FILE, gameData);

  console.log(`\nDone.`);
  console.log(`  Before: ${beforeCount} games`);
  console.log(`  After:  ${afterCount} games`);
  console.log(`  New:    ${totalNew}`);
  console.log(`  Updated: ${totalUpdated}`);
  console.log(`  Merged: ${totalMerged}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
