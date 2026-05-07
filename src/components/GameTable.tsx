import { memo, useEffect, useRef, useMemo, useState } from "react";
import type { EpicGame, HltbInfo, SteamInfo, MetacriticInfo, EpicInfo, SortCol, SortDir, Filters } from "../types";
import { SteamBadge, MetacriticBadge, UserScoreBadge, HltbBadge, EpicDateBadge, EpicRatingBadge, PlatformBadge, HideBadge, OwnedBadge } from "./Badge";

export interface Column {
  key: SortCol;
  label: string;
  minWidth: string;
  tooltip: string;
  icon?: React.JSX.Element;
}

export const COLUMNS: Column[] = [
  { key: "name",       label: "Game",           minWidth: "160px", tooltip: "Click to view on Epic Games Store" },
  { key: "epicrating", label: "Epic Rating",     minWidth: "80px",  tooltip: "Epic Games Store user rating (out of 5)\nGreen = 4.5+\nBlue = 3.5–4.4\nYellow = 2.5–3.4\nRed = below 2.5" },
  { key: "epicdate",   label: "Free Date",       minWidth: "100px", tooltip: "When this game was given away free on Epic\nHover to see all dates if offered multiple times" },
  { key: "metacritic", label: "Meta Score",      minWidth: "80px",  tooltip: "Metacritic critic score\nGreen = 75+\nYellow = 50–74\nRed = below 50" },
  { key: "owned",      label: "Owned",           minWidth: "60px",  tooltip: "Games you own\nImport your library via the header button" },
  { key: "platform",   label: "Platform",        minWidth: "70px",  tooltip: "Platforms this game was given away on" },
  { key: "hltb",       label: "Playtime",        minWidth: "70px",  tooltip: "Average playtime from HowLongToBeat\n(Main Story + Extras + Completionist)\nHover a value for full breakdown" },
  { key: "steam",      label: "Steam Rating",   minWidth: "180px", tooltip: "Steam user review rating\nwith positive review percentage" },
  { key: "userscore",  label: "User Score",      minWidth: "80px",  tooltip: "Metacritic user score\nGreen = 7.5+\nYellow = 5–7.4\nRed = below 5" },
  { key: "hide",       label: "Visibility",      minWidth: "40px",  tooltip: "Toggle game visibility\nHidden games are saved in your browser", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg> },
];

const COLUMN_FILTERS: Partial<Record<SortCol, { value: string; label: string }[]>> = {
  steam: [
    { value: "", label: "All" },
    { value: "op+", label: "Ov. Positive +" },
    { value: "vp+", label: "Very Positive +" },
    { value: "mp+", label: "M. Positive +" },
    { value: "neg", label: "Negative" },
    { value: "nos", label: "Not On Steam" },
  ],
  metacritic: [
    { value: "", label: "All" },
    { value: "90+", label: "90+" },
    { value: "75+", label: "75+" },
    { value: "50-", label: "Below 50" },
  ],
  userscore: [
    { value: "", label: "All" },
    { value: "8+", label: "8.0+" },
    { value: "6+", label: "6.0+" },
    { value: "4-", label: "Below 4" },
  ],
  hltb: [
    { value: "", label: "All" },
    { value: "u10", label: "< 10 h" },
    { value: "u60", label: "< 60 h" },
    { value: "u100", label: "< 100 h" },
    { value: "100+", label: "> 100 h" },
  ],
  epicrating: [
    { value: "", label: "All" },
    { value: "4.5+", label: "4.5+" },
    { value: "4+", label: "4.0+" },
    { value: "3+", label: "3.0+" },
  ],
  epicdate: [], // populated dynamically from year filter counts
  platform: [
    { value: "", label: "All" },
    { value: "pc", label: "PC" },
    { value: "mobile", label: "Mobile" },
  ],
  owned: [
    { value: "", label: "All" },
    { value: "owned", label: "Owned" },
    { value: "not", label: "Not Owned" },
  ],
  hide: [
    { value: "", label: "All" },
    { value: "visible", label: "Visible" },
    { value: "hidden", label: "Hidden Only" },
  ],
};

interface RowData {
  steam?: SteamInfo;
  hltb?: HltbInfo;
  metacritic?: MetacriticInfo;
  epic?: EpicInfo;
}

type CellRenderer = (game: EpicGame, data: RowData) => React.JSX.Element;

const CELL_RENDERERS: Record<string, CellRenderer> = {
  steam:      (_g, d) => <SteamBadge info={d.steam} />,
  metacritic: (_g, d) => <MetacriticBadge info={d.metacritic} />,
  userscore:  (_g, d) => <UserScoreBadge info={d.metacritic} />,
  hltb:       (_g, d) => <HltbBadge data={d.hltb} />,
  epicrating: (_g, d) => <EpicRatingBadge info={d.epic} />,
  epicdate:   (_g, d) => <EpicDateBadge info={d.epic} />,
  platform:   (_g, d) => <PlatformBadge info={d.epic} />,
};

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

  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || window.innerWidth > 800) return;
    let frame: number;
    const timer = setTimeout(() => {
      const distance = 60;
      const duration = 800;
      const start = performance.now();
      function animate(now: number) {
        const t = Math.min((now - start) / duration, 1);
        const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        el!.scrollLeft = ease < 0.5 ? ease * 2 * distance : (1 - (ease - 0.5) * 2) * distance;
        if (t < 1) frame = requestAnimationFrame(animate);
      }
      frame = requestAnimationFrame(animate);
    }, 600);
    return () => { clearTimeout(timer); cancelAnimationFrame(frame); };
  }, []);

  return (
    <div className="table-wrap" ref={wrapRef}>
      <table>
        <thead>
          <tr>
            {cols.map((col) => {
              const filterKey = col.key === "epicdate" ? "year" : col.key as keyof Filters;
              const filterOpts = col.key === "epicdate" ? yearOptions : COLUMN_FILTERS[col.key];
              return (
                <th
                  key={col.key}
                  style={{ minWidth: col.minWidth }}
                  className={sortCol === col.key ? "sorted" : ""}
                  aria-sort={sortCol === col.key ? (sortDir === 1 ? "ascending" : "descending") : "none"}
                >
                  <div className="th-label" role="button" tabIndex={0} onClick={() => onSort(col.key)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSort(col.key); } }}>
                    <span className="si">
                      <span className={`si-up ${sortCol === col.key && sortDir === 1 ? "si-on" : "si-off"}`} />
                      <span className={`si-down ${sortCol === col.key && sortDir === -1 ? "si-on" : "si-off"}`} />
                    </span>
                    {col.icon || col.label}
                    <span
                      className="th-info"
                      data-tip={col.tooltip}
                      tabIndex={0}
                      onClick={(e) => e.stopPropagation()}
                    >ⓘ</span>
                  </div>
                  {col.key === "name" ? (
                    <input
                      className="th-filter-input"
                      type="text"
                      aria-label="Search games"
                      placeholder={window.innerWidth <= 800 ? "Search..." : "Search games (/) "}
                      value={filters.search}
                      onChange={(e) => onFilter("search", e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : filterOpts && filterOpts.length > 0 ? (
                    <select
                      className="th-filter-select"
                      value={filterKey === "year" ? filters.year : filters[filterKey]}
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
        if (col.key === "owned") {
          return (
            <td key="owned">
              <OwnedBadge owned={owned} />
            </td>
          );
        }
        if (col.key === "hide") {
          return (
            <td key="hide">
              <HideBadge hidden={hidden} onToggle={() => onToggleHide(game.name)} />
            </td>
          );
        }
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
        const renderer = CELL_RENDERERS[col.key];
        return (
          <td key={col.key}>
            {renderer ? renderer(game, data) : <span className="empty">—</span>}
          </td>
        );
      })}
    </tr>
  );
});
