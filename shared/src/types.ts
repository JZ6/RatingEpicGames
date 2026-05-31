export interface SteamInfo {
  rating?: SteamRating;
  pct?: number;
  total?: number;
  appid?: number;
  image?: string;
  steam_url?: string;
  release_date?: string;
  tags?: string[];
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

export interface MetacriticInfo {
  score?: number;
  user_score?: number;
  slug?: string;
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

export const STEAM_ORDER: Record<string, number> = {
  "Overwhelmingly Positive": 7,
  "Very Positive": 6,
  Positive: 5,
  "Mostly Positive": 4,
  Mixed: 3,
  "Mostly Negative": 2,
  Negative: 1,
  "Very Negative": 0,
};

export function loadSetFromLS(key: string): Set<string> {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return new Set(JSON.parse(saved));
  } catch { /* ignore */ }
  return new Set();
}

export function getHltbHours(info?: HltbInfo): number | undefined {
  if (!info) return undefined;
  const vals = [info.main, info.extra, info.complete, info.coop, info.pvp, info.all_styles]
    .filter((v): v is number => v != null);
  if (vals.length === 0) return undefined;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
