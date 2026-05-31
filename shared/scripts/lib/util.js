/**
 * Shared utilities for game database update scripts.
 *
 * Path-agnostic helpers: file I/O, fuzzy name matching, CLI parsing.
 * App-specific paths (ROOT, GAME_DATA_FILE) live in each app's config.js.
 */

import { readFileSync, writeFileSync } from "fs";
import * as fuzz from "fuzzball";

/** Today's date in YYYY-MM-DD format, used as updated_at in all source entries. */
export const TODAY = new Date().toISOString().slice(0, 10);

/** Shared User-Agent string for all HTTP requests. */
export const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

/** Promise-based delay for rate limiting between API requests. */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Check if an HTTP response is a rate limit and throw if so.
 * Prevents rate-limited games from being incorrectly marked as "not found".
 */
export function checkRateLimit(resp) {
  if (resp.status === 429 || resp.status === 1015) {
    throw new Error(`Rate limited (HTTP ${resp.status})`);
  }
}

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

/** Load and parse a JSON file. Returns {} if the file doesn't exist or is invalid. */
export function loadJson(path) {
  try { return JSON.parse(readFileSync(path, "utf-8")); }
  catch { return {}; }
}

/** Save data as sorted JSON (keys alphabetized for stable diffs). */
export function saveJson(path, data) {
  const sorted = Object.fromEntries(
    Object.entries(data).sort(([a], [b]) => a.localeCompare(b))
  );
  writeFileSync(path, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`  Saved ${Object.keys(data).length} entries to ${path.split("/").pop()}`);
}

// ---------------------------------------------------------------------------
// Name matching
// ---------------------------------------------------------------------------

/** Normalize curly/smart quotes to straight ASCII quotes for API searches. */
export function normalizeQuotes(s) {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

/** Arabic→Roman numeral map for game name variations (2 → "II", etc.). */
export const ARABIC_TO_ROMAN = { 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X" };

/**
 * Generate variations with Arabic→Roman numeral conversions.
 * "Game 2" → ["Game 2", "Game II"]. Returns [str] if no numerals to convert.
 */
export function romanVariations(str) {
  const variations = [str];
  const romanized = str.replace(/\b(\d+)\b/g, (_, n) => ARABIC_TO_ROMAN[Number(n)] || n);
  if (romanized !== str) variations.push(romanized);
  return variations;
}

/** Common suffixes to strip when generating name variations for fuzzy matching. */
const STRIP_SUFFIXES = [
  "Enhanced", "Remastered", "Definitive Edition", "Director's Cut",
  "Complete Edition", "RTX Version", "PC Enhanced Edition", "Evolved Edition",
  "Enhanced Edition", "2.0 Edition",
];

/**
 * Generate variations of a game name for fuzzy matching.
 * Tries: original, without parenthetical suffix, before colon, before dash,
 * and with common edition suffixes stripped.
 * Returns deduplicated array.
 */
export function nameVariations(name) {
  const variations = [name];
  const stripped = name.replace(/\s*\(.*?\)\s*$/, "").trim();
  if (stripped !== name) variations.push(stripped);
  if (name.includes(":")) {
    const first = name.split(":")[0].trim();
    if (first.length > 3) variations.push(first);
  }
  if (name.includes(" - ")) {
    const first = name.split(" - ")[0].trim();
    if (first.length > 3) variations.push(first);
  }
  for (const suffix of STRIP_SUFFIXES) {
    const cleaned = name.replace(suffix, "").trim().replace(/[:−-]+$/, "").trim();
    if (cleaned !== name && cleaned.length > 3) variations.push(cleaned);
  }
  return [...new Set(variations)];
}

/**
 * Fuzzy similarity score between two strings (0–1).
 * Uses fuzzball's token_set_ratio which handles edition suffixes and word reordering.
 */
export function similarity(a, b) {
  if (!a || !b) return 0;
  const tsr = fuzz.token_set_ratio(a, b);
  if (tsr === 100) {
    const r = fuzz.ratio(a, b);
    if (r < 75) return r / 100;
  }
  return tsr / 100;
}

/** Best similarity score across all variation pairs of two game names. */
export function bestScore(inputName, gameName) {
  return Math.max(
    ...nameVariations(inputName).flatMap((iv) =>
      nameVariations(gameName).map((gv) => similarity(iv, gv))
    )
  );
}

/**
 * Resolve user input to a canonical game name.
 */
export function resolveGameName(inputName, allNames) {
  const input = inputName.toLowerCase();
  const exact = allNames.find((n) => n.toLowerCase() === input);
  if (exact) return exact;

  const FUZZY_THRESHOLD = 0.7;
  const subMatches = new Set(allNames.filter((n) => n.toLowerCase().includes(input)));
  const varMatches = new Set(allNames.filter((n) =>
    nameVariations(n).some((v) => v.toLowerCase() === input)
  ));
  const fuzzyMatches = new Set(allNames.filter((n) => bestScore(inputName, n) >= FUZZY_THRESHOLD));
  const candidates = [...new Set([...subMatches, ...varMatches, ...fuzzyMatches])];

  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    const sorted = candidates
      .map((m) => ({ name: m, score: bestScore(inputName, m) }))
      .sort((a, b) => b.score - a.score);
    console.log(`  Multiple matches for "${inputName}":`);
    sorted.forEach(({ name, score }) => console.log(`    - ${name} (${Math.round(score * 100)}%)`));
    console.log(`  Use the exact name from the list above.`);
    process.exit(1);
  }
  return inputName;
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

/**
 * Parse common CLI flags shared by all update scripts.
 */
export function parseArgs(args) {
  const games = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--game" && i + 1 < args.length) games.push(args[++i]);
  }

  const limitIdx = args.indexOf("--limit");
  const refreshIdx = args.indexOf("--refresh");
  const sourcesIdx = args.indexOf("--sources");

  return {
    games,
    limit: limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) || 0 : 0,
    retry: args.includes("--retry"),
    refresh: refreshIdx !== -1 ? parseInt(args[refreshIdx + 1], 10) || 30 : 0,
    backfill: args.includes("--backfill"),
    sourcesRaw: sourcesIdx !== -1 ? args[sourcesIdx + 1] : null,
  };
}
