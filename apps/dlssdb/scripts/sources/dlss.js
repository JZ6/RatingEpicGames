/**
 * NVIDIA DLSS/RT games list downloader for DLSSdb.
 *
 * Downloads the official NVIDIA JSON listing all DLSS, Ray Tracing, and
 * AI-enabled games/apps. This is the source of truth for the game list
 * that all other source updaters operate on.
 *
 * Validates response size and JSON structure before writing to prevent
 * truncated or corrupt downloads from overwriting good data.
 */

import { writeFileSync, renameSync } from "fs";
import { DLSS_FILE, GAME_DATA_FILE, UA, loadJson, saveJson, syncGameList } from "../lib/util.js";

const DLSS_URL = "https://www.nvidia.com/content/dam/en-zz/Solutions/geforce/news/nvidia-rtx-games-engines-apps/dlss-rt-games-apps-overrides.json";

/**
 * Download the latest NVIDIA DLSS/RT games list.
 * Writes to DLSS_FILE via atomic tmp+rename to avoid partial writes.
 * Returns true on success, false on failure (with instructions to download manually).
 */
export async function updateDlss() {
  console.log("Updating DLSS data...");
  try {
    const resp = await fetch(DLSS_URL, {
      headers: {
        "User-Agent": UA, Accept: "application/json",
        Referer: "https://www.nvidia.com/en-us/geforce/news/nvidia-rtx-games-engines-apps/"
      },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const raw = await resp.text();
    if (raw.length < 10000) {
      console.log(`  WARNING: NVIDIA returned a truncated file (${raw.length} bytes).`);
      console.log(`  Download manually via browser from:\n  ${DLSS_URL}`);
      return false;
    }
    const data = JSON.parse(raw);
    const games = (data.data || []).filter((e) => e.type === "Game");
    const tmp = DLSS_FILE + ".tmp";
    writeFileSync(tmp, raw);
    renameSync(tmp, DLSS_FILE);
    console.log(`  Downloaded ${games.length} games (${raw.length.toLocaleString()} bytes)`);

    // Sync game_data.json — add empty entries for any new games
    const gameData = loadJson(GAME_DATA_FILE);
    const gameNames = games.map((e) => String(e.name));
    if (syncGameList(gameData, gameNames)) {
      saveJson(GAME_DATA_FILE, gameData);
    }

    return true;
  } catch (e) {
    console.log(`  Failed to download: ${e.message}`);
    console.log(`  Download manually via browser from:\n  ${DLSS_URL}`);
    return false;
  }
}
