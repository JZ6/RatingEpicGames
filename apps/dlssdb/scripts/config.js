import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadJson } from "../../../shared/scripts/lib/util.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, "..");
export const PUBLIC = join(ROOT, "public");
export const GAME_DATA_FILE = join(PUBLIC, "game_data.json");
export const DLSS_FILE = join(PUBLIC, "dlss-rt-games-apps-overrides.json");

export function getGameNames() {
  const data = loadJson(DLSS_FILE);
  return (data.data || [])
    .filter((e) => e.type === "Game")
    .map((e) => String(e.name));
}

export function syncGameList(gameData, dlssNames) {
  let added = 0;
  for (const name of dlssNames) {
    if (!gameData[name]) { gameData[name] = {}; added++; }
  }
  if (added) console.log(`  Added ${added} new game(s) from DLSS list`);
  return added;
}
