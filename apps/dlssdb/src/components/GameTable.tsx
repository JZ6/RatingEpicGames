import { memo, useMemo, useState, useEffect, useRef } from "react";
import type { DlssGame, HltbInfo, SteamInfo, MetacriticInfo, UpscalingInfo, SortCol, SortDir, Filters } from "../types";
import { FrameGenBadge, DlssVersionBadge, FeatureBadge, UpscalingBadge, ReleaseDateBadge } from "./Badge";
import { useContainerWidth } from "@shared/hooks/useContainerWidth";
import { useScrollHint } from "@shared/hooks/useScrollHint";
import { computeColWidths, defineColumn, nameColumn, steamColumn, metacriticColumn, hltbColumn, ownedColumn, hideColumn } from "@shared/components/GameTableBase";
import type { ColumnDef } from "@shared/components/GameTableBase";
export type { ColumnDef as Column };
export { PINNED_FIRST, PINNED_LAST } from "@shared/components/GameTableBase";

type RowData = { steam?: SteamInfo; hltb?: HltbInfo; metacritic?: MetacriticInfo; upscaling?: UpscalingInfo };

export const COLUMNS: ColumnDef[] = [
  nameColumn({ tooltip: "Click to view on Steam" }),
  defineColumn({
    key: "dlaa", label: "DLAA", minWidth: "90px", mobileWidth: "70px",
    tooltip: "Deep Learning Anti-Aliasing\nAI anti-aliasing at native resolution",
    render: (g: DlssGame) => <FeatureBadge value={g.dlaa || ""} />,
    filters: [{ value: "", label: "All" }, { value: "any", label: "Any" }],
  }),
  defineColumn({
    key: "dlssver", label: "DLSS", minWidth: "90px", mobileWidth: "70px",
    tooltip: "DLSS Version\n4.5 = Multi Frame Gen 6X\n4 = Multi Frame Gen 4X\n3.5 = Ray Reconstruction\n3 = Frame Generation\n2 = Super Resolution",
    render: (g: DlssGame) => <DlssVersionBadge game={g} />,
    filters: [
      { value: "", label: "All" },
      { value: "4.5+", label: "4.5+" },
      { value: "4+", label: "4+" },
      { value: "3+", label: "3+" },
    ],
  }),
  defineColumn({
    key: "framegen", label: "FG", fullLabel: "Frame Gen", minWidth: "90px", mobileWidth: "70px",
    tooltip: "DLSS Frame Generation\n6X = DLSS 4.5 (RTX 50)\n4X = DLSS 4 (RTX 40/50)\n2X = DLSS 3 (RTX 40/50)",
    render: (g: DlssGame) => <FrameGenBadge game={g} />,
    filters: [
      { value: "", label: "All" },
      { value: "6x", label: "6X" },
      { value: "4x", label: "4X" },
      { value: "2x", label: "2X" },
      { value: "any", label: "Any" },
    ],
  }),
  defineColumn({
    key: "upscaling", label: "FSR/XeSS", minWidth: "120px", mobileWidth: "90px",
    tooltip: "Non-DLSS upscaling support\nFSR = AMD FidelityFX\nXeSS = Intel",
    render: (_: DlssGame, d: RowData) => <UpscalingBadge info={d.upscaling} />,
    filters: [
      { value: "", label: "All" },
      { value: "fsr", label: "FSR" },
      { value: "xess", label: "XeSS" },
      { value: "both", label: "Both" },
      { value: "any", label: "Any" },
    ],
  }),
  metacriticColumn(),
  hltbColumn(),
  defineColumn({
    key: "release_date", label: "Release Day", minWidth: "150px", mobileWidth: "100px",
    tooltip: "Steam release date",
    render: (_: DlssGame, d: RowData) => <ReleaseDateBadge date={d.steam?.release_date} />,
    filters: [
      { value: "", label: "All" },
      { value: "month", label: "Last Month" },
      { value: "quarter", label: "Last 3 Months" },
      { value: "year", label: "Last Year" },
      { value: "old", label: "Older" },
      { value: "upcoming", label: "Upcoming" },
    ],
  }),
  defineColumn({
    key: "rr", label: "RR", fullLabel: "Ray Recon", minWidth: "90px", mobileWidth: "70px",
    tooltip: "DLSS Ray Reconstruction\nAI-enhanced ray tracing denoiser\nfor cleaner reflections and lighting",
    render: (g: DlssGame) => <FeatureBadge value={g["dlss ray reconstruction"] || ""} />,
    filters: [{ value: "", label: "All" }, { value: "any", label: "Any" }],
  }),
  defineColumn({
    key: "rt", label: "RT", fullLabel: "Ray Tracing", minWidth: "125px", mobileWidth: "80px",
    tooltip: "Ray Tracing support\nPath Tracing = full path tracing\nYes = partial (reflections, shadows, GI)",
    render: (g: DlssGame) => <FeatureBadge value={g["ray tracing"] || ""} />,
    filters: [
      { value: "", label: "All" },
      { value: "Path Tracing", label: "Path Tracing" },
      { value: "Yes", label: "Yes" },
      { value: "any", label: "Any RT" },
    ],
  }),
  defineColumn({
    key: "sr", label: "SR", fullLabel: "Super Res", minWidth: "90px", mobileWidth: "70px",
    tooltip: "DLSS Super Resolution\nAI upscaling from lower resolution\nNV-T = Transformer model (best)",
    render: (g: DlssGame) => <FeatureBadge value={g["dlss super resolution"] || ""} />,
    filters: [
      { value: "", label: "All" },
      { value: "NV, T", label: "Transformer" },
      { value: "Yes", label: "Yes" },
    ],
  }),
  steamColumn(),
  defineColumn({
    key: "tags", label: "Tags", minWidth: "180px", mobileWidth: "120px",
    tooltip: "Steam community tags\nSearch to filter by tag",
    filterType: "input",
  }),
  ownedColumn(),
  hideColumn(),
];

interface Props {
  games: DlssGame[];
  hltb: Record<string, HltbInfo>;
  steam: Record<string, SteamInfo>;
  metacritic: Record<string, MetacriticInfo>;
  upscaling: Record<string, UpscalingInfo>;
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

export function GameTable({ games, hltb, steam, metacritic, upscaling, images, sortCol, sortDir, onSort, visibleCols, filters, filterCounts, onFilter, hiddenGames, onToggleHide, ownedGames }: Props) {
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
                  ) : col.filters && col.filters.length > 0 ? (
                    <select
                      className="th-filter-select"
                      value={filters[filterKey] ?? ""}
                      onChange={(e) => onFilter(filterKey, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {col.filters.map((o) => {
                        const count = o.value ? filterCounts[col.key]?.[o.value] : undefined;
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
              key={g.sno}
              game={g}
              steam={steam[g.name]}
              hltb={hltb[g.name]}
              metacritic={metacritic[g.name]}
              upscaling={upscaling[g.name]}
              image={images[g.name]}
              cols={cols}
              tagColWidth={colWidths[cols.findIndex((c) => c.key === "tags")] ?? 180}
              hidden={hiddenGames.has(g.name)}
              onToggleHide={onToggleHide}
              owned={ownedGames.has(g.name)}
              tagFilter={filters.tags}
              onTagClick={(tag) => onFilter("tags", tag)}
            />
          ))}
        </tbody>
      </table>
      {games.length === 0 && <div className="no-results">No games match your filters</div>}
    </div>
  );
}

const GameRow = memo(function GameRow({ game, steam, hltb, metacritic, upscaling, image, cols, tagColWidth, hidden, onToggleHide, owned, tagFilter, onTagClick }: {
  game: DlssGame;
  steam?: SteamInfo;
  hltb?: HltbInfo;
  metacritic?: MetacriticInfo;
  upscaling?: UpscalingInfo;
  image?: string;
  cols: ColumnDef[];
  tagColWidth: number;
  hidden: boolean;
  onToggleHide: (name: string) => void;
  owned: boolean;
  tagFilter: string;
  onTagClick: (tag: string) => void;
}) {
  const data: RowData = { steam, hltb, metacritic, upscaling };
  const [imgErr, setImgErr] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [tagBelow, setTagBelow] = useState(false);
  const tagMoreRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!tagOpen) return;
    const close = (e: MouseEvent) => {
      if (tagMoreRef.current && !tagMoreRef.current.contains(e.target as Node)) setTagOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [tagOpen]);
  const imgSrc = steam?.image || image;
  const steamUrl = steam?.appid
    ? `https://store.steampowered.com/app/${steam.appid}`
    : `https://store.steampowered.com/search/?term=${encodeURIComponent(game.name)}`;
  return (
    <tr className={hidden ? "row-hidden" : ""}>
      {cols.map((col) => {
        if (col.key === "name") {
          return (
            <td key="name" className="nc">
              <a href={steamUrl} target="_blank" rel="noopener noreferrer" title={game.name}>
                {imgSrc && !imgErr
                  ? <img className="game-thumb" src={imgSrc} alt="" loading="lazy" onError={() => setImgErr(true)} />
                  : <span className="game-thumb-ph">?</span>}
                <span className="game-name">{game.name}</span>
              </a>
            </td>
          );
        }
        if (col.key === "tags") {
          const tags = steam?.tags;
          if (!tags?.length) return <td key="tags"><span className="empty">—</span></td>;
          const tq = tagFilter.toLowerCase();
          const ordered = tq
            ? [...tags].sort((a, b) => {
                const am = a.toLowerCase().includes(tq) ? 0 : 1;
                const bm = b.toLowerCase().includes(tq) ? 0 : 1;
                return am - bm;
              })
            : tags;
          const available = tagColWidth - 28;
          const estW = (t: string) => t.length * 5.2 + 11;
          const btnW = 26;
          const limit = available - btnW;
          const shown: string[] = [];
          const overflow: string[] = [];
          let used = 0;
          for (const t of ordered) {
            const w = estW(t) + 2;
            if (used + w <= limit) {
              shown.push(t);
              used += w;
            } else {
              overflow.push(t);
            }
          }
          if (overflow.length > 0 && shown.length === 0) {
            shown.push(overflow.shift()!);
          }
          const badge = (tag: string) => {
            const matched = tq && tag.toLowerCase().includes(tq);
            const dimmed = tq && !matched;
            return (
              <span
                key={tag}
                className={`tag-badge${matched ? " tag-match" : ""}${dimmed ? " tag-dim" : ""}`}
                onClick={() => onTagClick(tagFilter === tag ? "" : tag)}
              >{tag}</span>
            );
          };
          return (
            <td key="tags">
              <div className="tags-cell">
                {shown.map(badge)}
                {overflow.length > 0 && (
                  <span className={`tag-more${tagOpen ? " tag-more-open" : ""}`} ref={tagMoreRef} onClick={() => { if (!tagOpen && tagMoreRef.current) setTagBelow(tagMoreRef.current.getBoundingClientRect().top < 200); setTagOpen(!tagOpen); }}>
                    +{overflow.length}
                    {tagOpen && <span className={`tag-more-list${tagBelow ? " tag-more-below" : ""}`}>{overflow.map(badge)}</span>}
                  </span>
                )}
              </div>
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
