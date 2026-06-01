import { memo, useMemo, useState } from "react";
import type { EpicGame, HltbInfo, SteamInfo, MetacriticInfo, EpicInfo, SortCol, SortDir, Filters } from "../types";
import { UserScoreBadge, EpicDateBadge, EpicRatingBadge, PlatformBadge } from "./Badge";
import { useContainerWidth } from "@shared/hooks/useContainerWidth";
import { useScrollHint } from "@shared/hooks/useScrollHint";
import { computeColWidths, defineColumn, nameColumn, steamColumn, metacriticColumn, hltbColumn, ownedColumn, hideColumn } from "@shared/components/GameTableBase";
import type { ColumnDef } from "@shared/components/GameTableBase";
export type { ColumnDef as Column };
export { PINNED_FIRST, PINNED_LAST } from "@shared/components/GameTableBase";

type RowData = { steam?: SteamInfo; hltb?: HltbInfo; metacritic?: MetacriticInfo; epic?: EpicInfo };

export const COLUMNS: ColumnDef[] = [
  nameColumn({ tooltip: "Click to view on Epic Games Store" }),
  defineColumn({
    key: "epicrating", label: "ER", fullLabel: "Epic Rating", minWidth: "90px", mobileWidth: "70px",
    tooltip: "Epic Games Store user rating (out of 5)\nGreen = 4.5+\nBlue = 3.5–4.4\nYellow = 2.5–3.4\nRed = below 2.5",
    render: (_: EpicGame, d: RowData) => <EpicRatingBadge info={d.epic} />,
    filters: [
      { value: "", label: "All" },
      { value: "4.5+", label: "4.5+" },
      { value: "4+", label: "4.0+" },
      { value: "3+", label: "3.0+" },
    ],
  }),
  defineColumn({
    key: "epicdate", label: "Free Date", minWidth: "150px", mobileWidth: "100px",
    tooltip: "When this game was given away free on Epic\nHover to see all dates if offered multiple times",
    render: (_: EpicGame, d: RowData) => <EpicDateBadge info={d.epic} />,
    filterKey: "year",
  }),
  metacriticColumn({
    filters: [
      { value: "", label: "All" },
      { value: "90+", label: "90+" },
      { value: "75+", label: "75+" },
      { value: "50-", label: "Below 50" },
      { value: "unk", label: "Unknown" },
    ],
  }),
  ownedColumn(),
  defineColumn({
    key: "platform", label: "Platform", minWidth: "90px", mobileWidth: "70px",
    tooltip: "Platforms this game was given away on",
    render: (_: EpicGame, d: RowData) => <PlatformBadge info={d.epic} />,
    filters: [
      { value: "", label: "All" },
      { value: "pc", label: "PC" },
      { value: "mobile", label: "Mobile" },
    ],
  }),
  hltbColumn(),
  steamColumn(),
  defineColumn({
    key: "userscore", label: "US", fullLabel: "User Score", minWidth: "90px", mobileWidth: "70px",
    tooltip: "Metacritic user score\nGreen = 7.5+\nYellow = 5–7.4\nRed = below 5",
    render: (_: EpicGame, d: RowData) => <UserScoreBadge info={d.metacritic} />,
    filters: [
      { value: "", label: "All" },
      { value: "8+", label: "8.0+" },
      { value: "6+", label: "6.0+" },
      { value: "4-", label: "Below 4" },
    ],
  }),
  hideColumn(),
];

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

  const yearOptions = useMemo(() => {
    const years = Object.keys(filterCounts.year || {}).sort().reverse();
    return [
      { value: "", label: "All Years" },
      ...years.map((y) => ({ value: y, label: y })),
    ];
  }, [filterCounts.year]);

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
              const filterOpts = col.key === "epicdate" ? yearOptions : col.filters;
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
                    {col.icon || (col.fullLabel && colWidths[colIdx] >= col.fullLabel.length * 11 + 60 ? col.fullLabel : col.label)}
                    <span className="th-info" data-tip={col.tooltip} tabIndex={0} onClick={(e) => e.stopPropagation()}>ⓘ</span>
                  </div>
                  {col.filterType === "input" ? (
                    <input
                      className="th-filter-input"
                      type="text"
                      aria-label={col.key === "name" ? "Search games" : `Filter ${col.label}`}
                      placeholder={col.key === "name" ? (window.innerWidth <= 800 ? "Search..." : "Search games (/) ") : `Filter ${col.label.toLowerCase()}...`}
                      value={filters[filterKey] ?? ""}
                      onChange={(e) => onFilter(filterKey, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : filterOpts && filterOpts.length > 0 ? (
                    <select
                      className="th-filter-select"
                      value={filters[filterKey] ?? ""}
                      onChange={(e) => onFilter(filterKey, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {filterOpts.map((o) => {
                        const count = o.value ? filterCounts[col.key === "epicdate" ? "year" : col.key]?.[o.value] : undefined;
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
  cols: ColumnDef[];
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
        if (col.render) {
          return <td key={col.key}>{col.render(game, { ...data, owned, hidden, onToggleHide: () => onToggleHide(game.name) })}</td>;
        }
        return <td key={col.key}><span className="empty">—</span></td>;
      })}
    </tr>
  );
});
