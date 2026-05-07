export interface EpicGame {
  name: string;
  slug: string;
}

export interface SteamInfo {
  rating?: SteamRating;
  pct?: number;
  total?: number;
  appid?: number;
  image?: string;
  steam_url?: string;
}

export interface MetacriticInfo {
  score?: number;
  user_score?: number;
  slug?: string;
}

export interface EpicInfo {
  slug: string;
  free_dates: { start: string; end: string }[];
  platforms?: string[];
  epic_rating?: number;
  store_url?: string;
}

export interface HltbInfo {
  main?: number;
  extra?: number;
  complete?: number;
  coop?: number;
  pvp?: number;
  speed?: number;
  all_styles?: number;
  hltb_id?: number;
}

export type SteamRating =
  | "Overwhelmingly Positive"
  | "Very Positive"
  | "Positive"
  | "Mostly Positive"
  | "Mixed"
  | "Mostly Negative"
  | "Negative"
  | "Very Negative";

export interface Filters {
  search: string;
  steam: string;
  metacritic: string;
  userscore: string;
  hltb: string;
  year: string;
  epicrating: string;
  platform: string;
  hide: string;
  owned: string;
}

export type SortCol = "name" | "steam" | "metacritic" | "userscore" | "hltb" | "epicdate" | "epicrating" | "platform" | "hide" | "owned";
export type SortDir = 1 | -1;

export function getHltbHours(info?: HltbInfo): number | undefined {
  if (!info) return undefined;
  const vals = [info.main, info.extra, info.complete, info.coop, info.pvp, info.all_styles]
    .filter((v): v is number => v != null);
  if (vals.length === 0) return undefined;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function parseDate(s: string): Date {
  // ISO dates like "2018-12-12" are parsed as UTC — add T12:00 to avoid timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + "T12:00:00");
  return new Date(s);
}

function latestDate(epic: EpicInfo): { entry: { start: string; end: string }; date: Date } | undefined {
  let best: { entry: { start: string; end: string }; date: Date } | undefined;
  for (const entry of epic.free_dates) {
    const d = parseDate(entry.start);
    if (isNaN(d.getTime())) continue;
    if (!best || d > best.date) best = { entry, date: d };
  }
  return best;
}

export function getLatestFreeDate(epic?: EpicInfo): Date | undefined {
  if (!epic?.free_dates?.length) return undefined;
  return latestDate(epic)?.date;
}

export function formatFreeDate(epic?: EpicInfo): string {
  if (!epic?.free_dates?.length) return "";
  const best = latestDate(epic);
  if (!best) return "";
  const y = best.date.getFullYear();
  const m = best.date.toLocaleDateString("en-US", { month: "short" });
  const d = best.date.getDate();
  return `${y} ${m} ${d}`;
}

export function getFreeDateYear(epic?: EpicInfo): number | undefined {
  if (!epic?.free_dates?.length) return undefined;
  return latestDate(epic)?.date.getFullYear();
}
