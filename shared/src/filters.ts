import type { SteamInfo, HltbInfo, MetacriticInfo } from "./types";
import { STEAM_ORDER, getHltbHours } from "./types";

export function filterBySteam(si: SteamInfo | undefined, filter: string): boolean {
  if (!filter) return true;
  const sr = (si?.rating && STEAM_ORDER[si.rating]) ?? -1;
  if (filter === "op+" && sr < 7) return false;
  if (filter === "vp+" && sr < 6) return false;
  if (filter === "mp+" && sr < 4) return false;
  if (filter === "neg" && (sr < 0 || sr > 3)) return false;
  if (filter === "unk" && sr !== -1) return false;
  if (filter === "nos" && si) return false;
  return true;
}

export function filterByMetacritic(mc: number | undefined, filter: string): boolean {
  if (!filter) return true;
  if (filter === "unk") return mc === undefined;
  if (mc === undefined) return false;
  if (filter === "90+" && mc < 90) return false;
  if (filter === "75+" && mc < 75) return false;
  if (filter === "50-" && mc >= 50) return false;
  return true;
}

export function filterByHltb(hours: number | undefined, filter: string): boolean {
  if (!filter) return true;
  if (filter === "u10" && (hours === undefined || hours >= 10)) return false;
  if (filter === "u60" && (hours === undefined || hours >= 60)) return false;
  if (filter === "u100" && (hours === undefined || hours >= 100)) return false;
  if (filter === "100+" && (hours === undefined || hours < 100)) return false;
  if (filter === "unk" && hours !== undefined) return false;
  return true;
}

export function filterByHide(isHidden: boolean, filter: string): boolean {
  if (filter === "visible" && isHidden) return false;
  if (filter === "hidden" && !isHidden) return false;
  return true;
}

export function filterByOwned(isOwned: boolean, filter: string): boolean {
  if (!filter) return true;
  if (filter === "owned" && !isOwned) return false;
  if (filter === "not" && isOwned) return false;
  return true;
}

export function steamSortVal(si: SteamInfo | undefined): number | null {
  if (!si?.rating) return null;
  const tier = STEAM_ORDER[si.rating] ?? 0;
  return tier * 1000 + (si.pct ?? 0);
}

export function metacriticSortVal(mc: MetacriticInfo | undefined): number | null {
  return mc?.score ?? null;
}

export function hltbSortVal(info: HltbInfo | undefined): number | null {
  return getHltbHours(info) ?? null;
}

export function hideSortVal(name: string, hiddenGames?: Set<string>): number {
  return hiddenGames?.has(name) ? 1 : 0;
}

export function ownedSortVal(name: string, ownedGames?: Set<string>): number {
  return ownedGames?.has(name) ? 1 : 0;
}

interface NamedItem { name: string }

export function countSteam<T extends NamedItem>(games: T[], steam: Record<string, SteamInfo>): Record<string, number> {
  const c: Record<string, number> = { "op+": 0, "vp+": 0, "mp+": 0, neg: 0, unk: 0, nos: 0 };
  for (const g of games) {
    const si = steam[g.name];
    const sOrder = (si?.rating && STEAM_ORDER[si.rating]) ?? -1;
    if (sOrder >= 7) c["op+"]++;
    if (sOrder >= 6) c["vp+"]++;
    if (sOrder >= 4) c["mp+"]++;
    if (sOrder >= 0 && sOrder <= 3) c.neg++;
    if (!steam[g.name]) c.nos++;
    else if (sOrder === -1) c.unk++;
  }
  return c;
}

export function countMetacritic<T extends NamedItem>(games: T[], metacritic: Record<string, MetacriticInfo>): Record<string, number> {
  const c: Record<string, number> = { "90+": 0, "75+": 0, "50-": 0 };
  for (const g of games) {
    const score = metacritic[g.name]?.score;
    if (score !== undefined) {
      if (score >= 90) c["90+"]++;
      if (score >= 75) c["75+"]++;
      if (score < 50) c["50-"]++;
    }
  }
  return c;
}

export function countHltb<T extends NamedItem>(games: T[], hltb: Record<string, HltbInfo>): Record<string, number> {
  const c: Record<string, number> = { u10: 0, u60: 0, u100: 0, "100+": 0, unk: 0 };
  for (const g of games) {
    const hours = getHltbHours(hltb[g.name]);
    if (hours !== undefined) {
      if (hours < 10) c.u10++;
      if (hours < 60) c.u60++;
      if (hours < 100) c.u100++;
      if (hours >= 100) c["100+"]++;
    } else { c.unk++; }
  }
  return c;
}

export function countHideOwned<T extends NamedItem>(games: T[], hiddenGames: Set<string>, ownedGames: Set<string>): { hide: Record<string, number>; owned: Record<string, number> } {
  const hi: Record<string, number> = { hidden: 0, all: 0 };
  const ow: Record<string, number> = { owned: 0, not: 0 };
  for (const g of games) {
    if (hiddenGames.has(g.name)) hi.hidden++;
    hi.all++;
    if (ownedGames.has(g.name)) ow.owned++; else ow.not++;
  }
  return { hide: hi, owned: ow };
}
