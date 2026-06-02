import type { SteamInfo, HltbInfo, MetacriticInfo } from "../types";
import { getHltbHours } from "../types";
import {
  filterBySteam, filterByMetacritic, filterByHltb, filterByHide, filterByOwned,
  steamSortVal, metacriticSortVal, hltbSortVal, hideSortVal, ownedSortVal,
  countSteam, countMetacritic, countHltb, countHideOwned,
} from "../filters";
import { SteamBadge, MetacriticBadge, HltbBadge, HideBadge, OwnedBadge, EmptyCell } from "./Badge";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDeps {
  steam?: Record<string, SteamInfo>;
  hltb?: Record<string, HltbInfo>;
  metacritic?: Record<string, MetacriticInfo>;
  hiddenGames?: Set<string>;
  ownedGames?: Set<string>;
  [extra: string]: unknown;
}

export type ColumnConfig = {
  key: string;
  label: string;
  fullLabel?: string;
  minWidth: string;
  mobileWidth?: string;
  tooltip: string;
  filterType?: "select" | "input";
  filterKey?: string;
  filters?: FilterOption[];
  defaultFilter?: string;
  pinned?: "first" | "last";
  required?: boolean;
  placeholder?: string;
  mobilePlaceholder?: string;
  ariaLabel?: string;
};

export class Column {
  key: string;
  label: string;
  fullLabel?: string;
  minWidth: string;
  mobileWidth: string;
  tooltip: string;
  filterType: "select" | "input";
  filterKey?: string;
  filters: FilterOption[];
  defaultFilter: string;
  pinned?: "first" | "last";
  required: boolean;
  placeholder?: string;
  mobilePlaceholder?: string;
  ariaLabel?: string;

  constructor(config: ColumnConfig) {
    this.key = config.key;
    this.label = config.label;
    this.fullLabel = config.fullLabel;
    this.minWidth = config.minWidth;
    this.mobileWidth = config.mobileWidth ?? config.minWidth;
    this.tooltip = config.tooltip;
    this.filterType = config.filterType ?? "select";
    this.filterKey = config.filterKey;
    this.filters = config.filters ?? [];
    this.defaultFilter = config.defaultFilter ?? "";
    this.pinned = config.pinned;
    this.required = config.required ?? false;
    this.placeholder = config.placeholder;
    this.mobilePlaceholder = config.mobilePlaceholder;
    this.ariaLabel = config.ariaLabel;
  }

  render(_game: any, _data: any): React.JSX.Element {
    return <EmptyCell />;
  }

  filter(_game: any, _value: string, _deps: FilterDeps): boolean {
    return true;
  }

  sortValue(_game: any, _deps: FilterDeps): string | number | null {
    return null;
  }

  count(_games: any[], _deps: FilterDeps): Record<string, number> {
    return {};
  }

  resolveFilters(_counts: Record<string, number>): FilterOption[] {
    return this.filters;
  }
}

export function buildEmptyFilters(columns: Column[]): Record<string, string> {
  return Object.fromEntries(columns.map((c) => [c.filterKey ?? c.key, c.defaultFilter]));
}

// ──────────────────────── Filter option arrays ────────────────────────

export const STEAM_FILTERS: FilterOption[] = [
  { value: "", label: "All" },
  { value: "op+", label: "Ov. Positive +" },
  { value: "vp+", label: "Very Positive +" },
  { value: "mp+", label: "M. Positive +" },
  { value: "neg", label: "Mixed or Worse" },
  { value: "nos", label: "Not On Steam" },
];

export const HLTB_FILTERS: FilterOption[] = [
  { value: "", label: "All" },
  { value: "u10", label: "< 10 h" },
  { value: "u60", label: "< 60 h" },
  { value: "u100", label: "< 100 h" },
  { value: "100+", label: "> 100 h" },
];

const OWNED_FILTERS: FilterOption[] = [
  { value: "", label: "All" },
  { value: "owned", label: "Owned" },
  { value: "not", label: "Not Owned" },
];

const HIDE_FILTERS: FilterOption[] = [
  { value: "", label: "All" },
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden Only" },
];

const MC_FILTERS: FilterOption[] = [
  { value: "", label: "All" },
  { value: "90+", label: "90+" },
  { value: "75+", label: "75+" },
  { value: "50-", label: "Below 50" },
  { value: "unk", label: "Unknown" },
];

// ──────────────────────── Shared column subclasses ────────────────────────

export class NameColumn extends Column {
  constructor(overrides: Partial<ColumnConfig> = {}) {
    super({
      key: "name",
      label: "Game",
      minWidth: "360px",
      mobileWidth: "140px",
      tooltip: "Click to view on store",
      filterType: "input",
      filterKey: "search",
      pinned: "first",
      required: true,
      placeholder: "Search games (/) ",
      mobilePlaceholder: "Search...",
      ariaLabel: "Search games",
      ...overrides,
    });
  }

  filter(game: { name: string }, value: string): boolean {
    return !value || game.name.toLowerCase().includes(value.toLowerCase());
  }

  sortValue(game: { name: string }): string {
    return game.name.toLowerCase();
  }
}

export class SteamColumn extends Column {
  constructor(overrides: Partial<ColumnConfig> = {}) {
    super({
      key: "steam",
      label: "Steam Rating",
      minWidth: "240px",
      mobileWidth: "120px",
      tooltip: "Steam user review rating\nwith positive review percentage",
      filters: STEAM_FILTERS,
      ...overrides,
    });
  }

  render(_: any, data: { steam?: SteamInfo }) {
    return <SteamBadge info={data.steam} />;
  }

  filter(game: { name: string }, value: string, { steam }: FilterDeps): boolean {
    return filterBySteam(steam?.[game.name], value);
  }

  sortValue(game: { name: string }, { steam }: FilterDeps): number | null {
    return steamSortVal(steam?.[game.name]);
  }

  count(games: { name: string }[], { steam }: FilterDeps): Record<string, number> {
    return countSteam(games, steam ?? {});
  }
}

export class MetacriticColumn extends Column {
  constructor(overrides: Partial<ColumnConfig> = {}) {
    super({
      key: "metacritic",
      label: "MC",
      fullLabel: "Metacritic",
      minWidth: "90px",
      mobileWidth: "70px",
      tooltip: "Metacritic critic score\nGreen = 75+\nYellow = 50–74\nRed = below 50",
      filters: MC_FILTERS,
      ...overrides,
    });
  }

  render(_: any, data: { metacritic?: MetacriticInfo }) {
    return <MetacriticBadge info={data.metacritic} />;
  }

  filter(game: { name: string }, value: string, { metacritic }: FilterDeps): boolean {
    return filterByMetacritic(metacritic?.[game.name]?.score, value);
  }

  sortValue(game: { name: string }, { metacritic }: FilterDeps): number | null {
    return metacriticSortVal(metacritic?.[game.name]);
  }

  count(games: { name: string }[], { metacritic }: FilterDeps): Record<string, number> {
    return countMetacritic(games, metacritic ?? {});
  }
}

export class HltbColumn extends Column {
  constructor(overrides: Partial<ColumnConfig> = {}) {
    super({
      key: "hltb",
      label: "Playtime",
      minWidth: "125px",
      mobileWidth: "90px",
      tooltip: "Average playtime from HowLongToBeat\n(Main Story + Extras + Completionist)\nHover a value for full breakdown",
      filters: HLTB_FILTERS,
      ...overrides,
    });
  }

  render(_: any, data: { hltb?: HltbInfo }) {
    return <HltbBadge data={data.hltb} />;
  }

  filter(game: { name: string }, value: string, { hltb }: FilterDeps): boolean {
    return filterByHltb(getHltbHours(hltb?.[game.name]), value);
  }

  sortValue(game: { name: string }, { hltb }: FilterDeps): number | null {
    return hltbSortVal(hltb?.[game.name]);
  }

  count(games: { name: string }[], { hltb }: FilterDeps): Record<string, number> {
    return countHltb(games, hltb ?? {});
  }
}

export class OwnedColumn extends Column {
  constructor(overrides: Partial<ColumnConfig> = {}) {
    super({
      key: "owned",
      label: "Own",
      fullLabel: "Owned",
      minWidth: "90px",
      mobileWidth: "60px",
      tooltip: "Games you own\nImport your library via the header button",
      filters: OWNED_FILTERS,
      pinned: "last",
      ...overrides,
    });
  }

  render(_: any, data: any) {
    return <OwnedBadge owned={data.owned} />;
  }

  filter(game: { name: string }, value: string, { ownedGames }: FilterDeps): boolean {
    return filterByOwned(ownedGames?.has(game.name) ?? false, value);
  }

  sortValue(game: { name: string }, { ownedGames }: FilterDeps): number {
    return ownedSortVal(game.name, ownedGames);
  }

  count(games: { name: string }[], { hiddenGames, ownedGames }: FilterDeps): Record<string, number> {
    return countHideOwned(games, hiddenGames ?? new Set(), ownedGames ?? new Set()).owned;
  }
}

export class HideColumn extends Column {
  constructor(overrides: Partial<ColumnConfig> = {}) {
    super({
      key: "hide",
      label: "Hide",
      minWidth: "90px",
      mobileWidth: "60px",
      tooltip: "Toggle game visibility\nHidden games are saved in your browser",
      filters: HIDE_FILTERS,
      defaultFilter: "visible",
      pinned: "last",
      ...overrides,
    });
  }

  render(_: any, data: any) {
    return <HideBadge hidden={data.hidden} onToggle={data.onToggleHide} />;
  }

  filter(game: { name: string }, value: string, { hiddenGames }: FilterDeps): boolean {
    return filterByHide(hiddenGames?.has(game.name) ?? false, value);
  }

  sortValue(game: { name: string }, { hiddenGames }: FilterDeps): number {
    return hideSortVal(game.name, hiddenGames);
  }

  count(games: { name: string }[], { hiddenGames, ownedGames }: FilterDeps): Record<string, number> {
    return countHideOwned(games, hiddenGames ?? new Set(), ownedGames ?? new Set()).hide;
  }
}

export function computePinnedSets(columns: Column[]): { pinnedFirst: Set<string>; pinnedLast: Set<string> } {
  return {
    pinnedFirst: new Set(columns.filter((c) => c.pinned === "first").map((c) => c.key)),
    pinnedLast: new Set(columns.filter((c) => c.pinned === "last").map((c) => c.key)),
  };
}

export function computeColWidths(cols: Column[], containerWidth: number): number[] {
  const isMobile = containerWidth > 0 && containerWidth <= 800;
  const minWidths = cols.map((c) => parseInt(isMobile ? c.mobileWidth : c.minWidth));
  const totalMin = minWidths.reduce((s, w) => s + w, 0);
  const extra = Math.max(0, containerWidth - totalMin);
  const share = cols.length > 0 ? Math.floor(extra / cols.length) : 0;
  return minWidths.map((w) => w + share);
}
