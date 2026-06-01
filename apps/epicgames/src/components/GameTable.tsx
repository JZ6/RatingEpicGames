import { memo, useMemo, useState } from "react";
import type { EpicGame, HltbInfo, SteamInfo, MetacriticInfo, EpicInfo, SortCol, SortDir, Filters } from "../types";
import { getLatestFreeDate } from "../types";
import { UserScoreBadge, EpicDateBadge, EpicRatingBadge, PlatformBadge } from "./Badge";
import { useContainerWidth } from "@shared/hooks/useContainerWidth";
import { useScrollHint } from "@shared/hooks/useScrollHint";
import { computeColWidths, computePinnedSets, NameColumn, SteamColumn, MetacriticColumn, HltbColumn, OwnedColumn, HideColumn } from "@shared/components/GameTableBase";
import { Column } from "@shared/components/Column";
import type { FilterDeps, FilterOption } from "@shared/components/Column";
export type { Column as ColumnDef };

type RowData = { steam?: SteamInfo; hltb?: HltbInfo; metacritic?: MetacriticInfo; epic?: EpicInfo };

// ──────────────────────── EpicGames-specific column classes ────────────────────────

class EpicRatingColumn extends Column {
  constructor() {
    super({
      key: "epicrating", label: "ER", fullLabel: "Epic Rating", minWidth: "90px", mobileWidth: "70px",
      tooltip: "Epic Games Store user rating (out of 5)\nGreen = 4.5+\nBlue = 3.5–4.4\nYellow = 2.5–3.4\nRed = below 2.5",
      filters: [
        { value: "", label: "All" },
        { value: "4.5+", label: "4.5+" },
        { value: "4+", label: "4.0+" },
        { value: "3+", label: "3.0+" },
      ],
    });
  }
  render(_: any, d: RowData) { return <EpicRatingBadge info={d.epic} />; }
  filter(g: EpicGame, value: string, { epic }: FilterDeps): boolean {
    if (!value) return true;
    const er = (epic as Record<string, EpicInfo> | undefined)?.[g.name]?.epic_rating;
    if (er === undefined) return false;
    if (value === "4.5+" && er < 4.5) return false;
    if (value === "4+" && er < 4) return false;
    if (value === "3+" && er < 3) return false;
    return true;
  }
  sortValue(g: EpicGame, { epic }: FilterDeps): number | null {
    return (epic as Record<string, EpicInfo> | undefined)?.[g.name]?.epic_rating ?? null;
  }
  count(games: EpicGame[], { epic }: FilterDeps): Record<string, number> {
    const c: Record<string, number> = { "4.5+": 0, "4+": 0, "3+": 0 };
    const ep = (epic as Record<string, EpicInfo> | undefined) ?? {};
    for (const g of games) {
      const er = ep[g.name]?.epic_rating;
      if (er !== undefined) {
        if (er >= 4.5) c["4.5+"]++;
        if (er >= 4) c["4+"]++;
        if (er >= 3) c["3+"]++;
      }
    }
    return c;
  }
}

class EpicDateColumn extends Column {
  constructor() {
    super({
      key: "epicdate", label: "Free Date", minWidth: "150px", mobileWidth: "100px",
      tooltip: "When this game was given away free on Epic\nHover to see all dates if offered multiple times",
      filterKey: "year",
    });
  }
  render(_: any, d: RowData) { return <EpicDateBadge info={d.epic} />; }
  resolveFilters(counts: Record<string, number>): FilterOption[] {
    const years = Object.keys(counts).sort().reverse();
    return [{ value: "", label: "All Years" }, ...years.map((y) => ({ value: y, label: y }))];
  }
  filter(g: EpicGame, value: string, { epic }: FilterDeps): boolean {
    if (!value) return true;
    const epicInfo = (epic as Record<string, EpicInfo> | undefined)?.[g.name];
    const d = epicInfo?.free_dates?.at(-1);
    if (!d) return false;
    return new Date(d.start).getFullYear().toString() === value;
  }
  sortValue(g: EpicGame, { epic }: FilterDeps): number | null {
    const d = getLatestFreeDate((epic as Record<string, EpicInfo> | undefined)?.[g.name]);
    return d ? d.getTime() : null;
  }
  count(games: EpicGame[], { epic }: FilterDeps): Record<string, number> {
    const c: Record<string, number> = {};
    const ep = (epic as Record<string, EpicInfo> | undefined) ?? {};
    for (const g of games) {
      const d = ep[g.name]?.free_dates?.at(-1);
      if (d) {
        const year = new Date(d.start).getFullYear().toString();
        c[year] = (c[year] || 0) + 1;
      }
    }
    return c;
  }
}

class UserScoreColumn extends Column {
  constructor() {
    super({
      key: "userscore", label: "US", fullLabel: "User Score", minWidth: "90px", mobileWidth: "70px",
      tooltip: "Metacritic user score\nGreen = 7.5+\nYellow = 5–7.4\nRed = below 5",
      filters: [
        { value: "", label: "All" },
        { value: "8+", label: "8.0+" },
        { value: "6+", label: "6.0+" },
        { value: "4-", label: "Below 4" },
      ],
    });
  }
  render(_: any, d: RowData) { return <UserScoreBadge info={d.metacritic} />; }
  filter(g: EpicGame, value: string, { metacritic }: FilterDeps): boolean {
    if (!value) return true;
    const us = (metacritic as Record<string, MetacriticInfo> | undefined)?.[g.name]?.user_score;
    if (value === "unk") return us === undefined;
    if (us === undefined) return false;
    if (value === "8+" && us < 8) return false;
    if (value === "6+" && us < 6) return false;
    if (value === "4-" && us >= 4) return false;
    return true;
  }
  sortValue(g: EpicGame, { metacritic }: FilterDeps): number | null {
    return (metacritic as Record<string, MetacriticInfo> | undefined)?.[g.name]?.user_score ?? null;
  }
  count(games: EpicGame[], { metacritic }: FilterDeps): Record<string, number> {
    const c: Record<string, number> = { "8+": 0, "6+": 0, "4-": 0 };
    const mc = (metacritic as Record<string, MetacriticInfo> | undefined) ?? {};
    for (const g of games) {
      const us = mc[g.name]?.user_score;
      if (us !== undefined) {
        if (us >= 8) c["8+"]++;
        if (us >= 6) c["6+"]++;
        if (us < 4) c["4-"]++;
      }
    }
    return c;
  }
}

class PlatformColumn extends Column {
  constructor() {
    super({
      key: "platform", label: "Platform", minWidth: "90px", mobileWidth: "70px",
      tooltip: "Platforms this game was given away on",
      filters: [
        { value: "", label: "All" },
        { value: "pc", label: "PC" },
        { value: "mobile", label: "Mobile" },
      ],
    });
  }
  render(_: any, d: RowData) { return <PlatformBadge info={d.epic} />; }
  filter(g: EpicGame, value: string, { epic }: FilterDeps): boolean {
    if (!value) return true;
    const platforms = (epic as Record<string, EpicInfo> | undefined)?.[g.name]?.platforms || ["pc"];
    if (value === "pc" && !platforms.includes("pc")) return false;
    if (value === "mobile" && !platforms.some((p) => p === "ios" || p === "android")) return false;
    return true;
  }
  sortValue(g: EpicGame, { epic }: FilterDeps): string {
    return ((epic as Record<string, EpicInfo> | undefined)?.[g.name]?.platforms || ["pc"]).sort().join(",");
  }
  count(games: EpicGame[], { epic }: FilterDeps): Record<string, number> {
    const c: Record<string, number> = { pc: 0, mobile: 0 };
    const ep = (epic as Record<string, EpicInfo> | undefined) ?? {};
    for (const g of games) {
      const platforms = ep[g.name]?.platforms || ["pc"];
      if (platforms.includes("pc")) c.pc++;
      if (platforms.some((p) => p === "ios" || p === "android")) c.mobile++;
    }
    return c;
  }
}

export const COLUMNS: Column[] = [
  new NameColumn({ tooltip: "Click to view on Epic Games Store" }),
  new EpicRatingColumn(),
  new EpicDateColumn(),
  new MetacriticColumn({
    filters: [
      { value: "", label: "All" },
      { value: "90+", label: "90+" },
      { value: "75+", label: "75+" },
      { value: "50-", label: "Below 50" },
      { value: "unk", label: "Unknown" },
    ],
  }),
  new OwnedColumn(),
  new PlatformColumn(),
  new HltbColumn(),
  new SteamColumn(),
  new UserScoreColumn(),
  new HideColumn(),
];

const { pinnedFirst: PINNED_FIRST, pinnedLast: PINNED_LAST } = computePinnedSets(COLUMNS);
export { PINNED_FIRST, PINNED_LAST };

interface Props {
  games: EpicGame[];
  hltb: Record<string, HltbInfo>;
  steam: Record<string, SteamInfo>;
  metacritic: Record<string, MetacriticInfo>;
  epic: Record<string, EpicInfo>;
  images: Record<string, string>;
  sortCol: SortCol;
  sortDir: SortDir;
  onSort: (col: SortCol) => void;
  visibleCols: Set<SortCol>;
  filters: Filters;
  filterCounts: Record<string, Record<string, number>>;
  onFilter: (key: keyof Filters, value: string) => void;
  hiddenGames: Set<string>;
  onToggleHide: (name: string) => void;
  ownedGames: Set<string>;
}

export function GameTable({ games, hltb, steam, metacritic, epic, images, sortCol, sortDir, onSort, visibleCols, filters, filterCounts, onFilter, hiddenGames, onToggleHide, ownedGames }: Props) {
  const cols = useMemo(
    () => COLUMNS.filter((c) => visibleCols.has(c.key)),
    [visibleCols]
  );

  const { ref: wrapRef, width: containerWidth } = useContainerWidth();
  const colWidths = useMemo(() => computeColWidths(cols, containerWidth), [cols, containerWidth]);
  useScrollHint(wrapRef);

  return (
    <div className="table-wrap" ref={wrapRef}>
      <table>
        <colgroup>
          {colWidths.map((w, i) => <col key={cols[i].key} style={{ width: w }} />)}
        </colgroup>
        <thead>
          <tr>
            {cols.map((col, colIdx) => {
              const filterKey = (col.filterKey || col.key) as keyof Filters;
              const countKey = col.filterKey ?? col.key;
              const filterOpts = col.resolveFilters(filterCounts[countKey] ?? {});
              return (
                <th
                  key={col.key}
                  className={sortCol === col.key ? "sorted" : ""}
                  aria-sort={sortCol === col.key ? (sortDir === 1 ? "ascending" : "descending") : "none"}
                >
                  <div className="th-label" role="button" tabIndex={0} onClick={() => onSort(col.key as SortCol)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSort(col.key as SortCol); } }}>
                    <span className="si">
                      <span className={`si-up ${sortCol === col.key && sortDir === 1 ? "si-on" : "si-off"}`} />
                      <span className={`si-down ${sortCol === col.key && sortDir === -1 ? "si-on" : "si-off"}`} />
                    </span>
                    {col.fullLabel && colWidths[colIdx] >= col.fullLabel.length * 11 + 60 ? col.fullLabel : col.label}
                    <span className="th-info" data-tip={col.tooltip} tabIndex={0} onClick={(e) => e.stopPropagation()}>ⓘ</span>
                  </div>
                  {col.filterType === "input" ? (
                    <input
                      className="th-filter-input"
                      type="text"
                      aria-label={col.ariaLabel ?? `Filter ${col.label}`}
                      placeholder={window.innerWidth <= 800 ? (col.mobilePlaceholder ?? col.placeholder ?? `Filter ${col.label.toLowerCase()}...`) : (col.placeholder ?? `Filter ${col.label.toLowerCase()}...`)}
                      value={filters[filterKey] ?? ""}
                      onChange={(e) => onFilter(filterKey, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : filterOpts.length > 0 ? (
                    <select
                      className="th-filter-select"
                      value={filters[filterKey] ?? ""}
                      onChange={(e) => onFilter(filterKey, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {filterOpts.map((o) => {
                        const count = o.value ? filterCounts[countKey]?.[o.value] : undefined;
                        return <option key={o.value} value={o.value}>{o.label}{count !== undefined ? ` (${count})` : ""}</option>;
                      })}
                    </select>
                  ) : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {games.map((g) => (
            <GameRow
              key={g.name}
              game={g}
              steam={steam[g.name]}
              hltb={hltb[g.name]}
              metacritic={metacritic[g.name]}
              epic={epic[g.name]}
              image={images[g.name]}
              cols={cols}
              hidden={hiddenGames.has(g.name)}
              onToggleHide={onToggleHide}
              owned={ownedGames.has(g.name)}
            />
          ))}
        </tbody>
      </table>
      {games.length === 0 && <div className="no-results">No games match your filters</div>}
    </div>
  );
}

const GameRow = memo(function GameRow({ game, steam, hltb, metacritic, epic, image, cols, hidden, onToggleHide, owned }: {
  game: EpicGame;
  steam?: SteamInfo;
  hltb?: HltbInfo;
  metacritic?: MetacriticInfo;
  epic?: EpicInfo;
  image?: string;
  cols: Column[];
  hidden: boolean;
  onToggleHide: (name: string) => void;
  owned: boolean;
}) {
  const data: RowData = { steam, hltb, metacritic, epic };
  const [imgErr, setImgErr] = useState(false);
  const imgSrc = steam?.image || image;
  const storeUrl = epic?.store_url
    || (epic?.slug ? `https://store.epicgames.com/p/${epic.slug}` : `https://store.epicgames.com/browse?q=${encodeURIComponent(game.name)}`);
  return (
    <tr className={hidden ? "row-hidden" : ""}>
      {cols.map((col) => {
        if (col.key === "name") {
          return (
            <td key="name" className="nc">
              <a href={storeUrl} target="_blank" rel="noopener noreferrer" title={game.name}>
                {imgSrc && !imgErr
                  ? <img className="game-thumb" src={imgSrc} alt="" loading="lazy" onError={() => setImgErr(true)} />
                  : <span className="game-thumb-ph">?</span>}
                <span className="game-name">{game.name}</span>
              </a>
            </td>
          );
        }
        return (
          <td key={col.key}>
            {col.render(game, { ...data, owned, hidden, onToggleHide: () => onToggleHide(game.name) })}
          </td>
        );
      })}
    </tr>
  );
});
