import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, "..");
export const PUBLIC = join(ROOT, "public");
export const GAME_DATA_FILE = join(PUBLIC, "game_data.json");
