import { memo, useMemo, useState, useEffect, useRef } from "react";
import type { DlssGame, HltbInfo, SteamInfo, MetacriticInfo, UpscalingInfo, SortCol, SortDir, Filters } from "../types";
import { getFrameGenLevel, getDlssVersionOrder } from "../types";
import { FrameGenBadge, DlssVersionBadge, FeatureBadge, UpscalingBadge, ReleaseDateBadge } from "./Badge";
import { useContainerWidth } from "@shared/hooks/useContainerWidth";
import { useScrollHint } from "@shared/hooks/useScrollHint";
import { computeColWidths, computePinnedSets, NameColumn, SteamColumn, MetacriticColumn, HltbColumn, OwnedColumn, HideColumn } from "@shared/components/GameTableBase";
import { Column } from "@shared/components/Column";
import type { FilterDeps, ColumnConfig } from "@shared/components/Column";
export type { Column as ColumnDef };

type RowData = { steam?: SteamInfo; hltb?: HltbInfo; metacritic?: MetacriticInfo; upscaling?: UpscalingInfo };

// ──────────────────────── DLSSdb-specific helpers ────────────────────────

const FEATURE_ORDER: Record<string, number> = { "NV, T": 3, "NV, U": 2, "✓ (NV)": 2, Yes: 1, "": 0 };
const RT_ORDER: Record<string, number> = { "Path Tracing": 3, "NV, T": 2, "NV, U": 2, "✓ (NV)": 2, Yes: 1, "": 0 };
const NON_DATE_RE = /^(to be announced|tba|coming soon|q[1-4]\s*\d{4})$/i;
const ONE_MONTH = 30 * 86400000;
const THREE_MONTHS = 90 * 86400000;
const ONE_YEAR = 365 * 86400000;

function fmatch(val: string, filt: string): boolean {
  if (!filt) return true;
  if (filt === "any") return !!val;
  if (filt === "none") return !val;
  return val === filt;
}

// ──────────────────────── DLSSdb column classes ────────────────────────

class FrameGenColumn extends Column {
  constructor() {
    super({
      key: "framegen", label: "FG", fullLabel: "Frame Gen", minWidth: "90px", mobileWidth: "70px",
      tooltip: "DLSS Frame Generation\n6X = DLSS 4.5 (RTX 50)\n4X = DLSS 4 (RTX 40/50)\n2X = DLSS 3 (RTX 40/50)",
      filters: [
        { value: "", label: "All" },
        { value: "6x", label: "6X" },
        { value: "4x", label: "4X" },
        { value: "2x", label: "2X" },
        { value: "any", label: "Any" },
      ],
    });
  }
  render(g: DlssGame) { return <FrameGenBadge game={g} />; }
  filter(g: DlssGame, value: string): boolean {
    if (!value) return true;
    const level = getFrameGenLevel(g);
    if (value === "6x" && level !== 3) return false;
    if (value === "4x" && level !== 2) return false;
    if (value === "2x" && level !== 1) return false;
    if (value === "any" && level === 0) return false;
    if (value === "none" && level !== 0) return false;
    return true;
  }
  sortValue(g: DlssGame): number | null {
    const level = getFrameGenLevel(g);
    return level > 0 ? level : null;
  }
  count(games: DlssGame[]): Record<string, number> {
    const c: Record<string, number> = { "6x": 0, "4x": 0, "2x": 0, any: 0, none: 0 };
    for (const g of games) {
      const level = getFrameGenLevel(g);
      if (level === 3) c["6x"]++;
      if (level === 2) c["4x"]++;
      if (level === 1) c["2x"]++;
      if (level > 0) c.any++;
      if (level === 0) c.none++;
    }
    return c;
  }
}

class DlssVersionColumn extends Column {
  constructor() {
    super({
      key: "dlssver", label: "DLSS", minWidth: "90px", mobileWidth: "70px",
      tooltip: "DLSS Version\n4.5 = Multi Frame Gen 6X\n4 = Multi Frame Gen 4X\n3.5 = Ray Reconstruction\n3 = Frame Generation\n2 = Super Resolution",
      filters: [
        { value: "", label: "All" },
        { value: "4.5+", label: "4.5+" },
        { value: "4+", label: "4+" },
        { value: "3+", label: "3+" },
      ],
    });
  }
  render(g: DlssGame) { return <DlssVersionBadge game={g} />; }
  filter(g: DlssGame, value: string): boolean {
    if (!value) return true;
    const ver = getDlssVersionOrder(g);
    if (value === "4.5+" && ver < 5) return false;
    if (value === "4+" && ver < 4) return false;
    if (value === "3+" && ver < 2) return false;
    return true;
  }
  sortValue(g: DlssGame): number { return getDlssVersionOrder(g); }
  count(games: DlssGame[]): Record<string, number> {
    const c: Record<string, number> = { "4.5+": 0, "4+": 0, "3+": 0 };
    for (const g of games) {
      const ver = getDlssVersionOrder(g);
      if (ver >= 5) c["4.5+"]++;
      if (ver >= 4) c["4+"]++;
      if (ver >= 2) c["3+"]++;
    }
    return c;
  }
}

class UpscalingColumn extends Column {
  constructor() {
    super({
      key: "upscaling", label: "FSR/XeSS", minWidth: "120px", mobileWidth: "90px",
      tooltip: "Non-DLSS upscaling support\nFSR = AMD FidelityFX\nXeSS = Intel",
      filters: [
        { value: "", label: "All" },
        { value: "fsr", label: "FSR" },
        { value: "xess", label: "XeSS" },
        { value: "both", label: "Both" },
        { value: "any", label: "Any" },
      ],
    });
  }
  render(_: DlssGame, d: RowData) { return <UpscalingBadge info={d.upscaling} />; }
  filter(g: DlssGame, value: string, { upscaling }: FilterDeps): boolean {
    if (!value) return true;
    const u = (upscaling as Record<string, UpscalingInfo> | undefined)?.[g.name];
    if (value === "fsr" && !u?.fsr_version) return false;
    if (value === "xess" && !u?.xess_version) return false;
    if (value === "both" && (!u?.fsr_version || !u?.xess_version)) return false;
    if (value === "any" && (!u?.fsr_version && !u?.xess_version)) return false;
    if (value === "none" && (u?.fsr_version || u?.xess_version)) return false;
    return true;
  }
  sortValue(g: DlssGame, { upscaling }: FilterDeps): number | null {
    const u = (upscaling as Record<string, UpscalingInfo> | undefined)?.[g.name];
    if (!u) return null;
    const v = (u.fsr_version ? 1 : 0) + (u.xess_version ? 1 : 0);
    return v || null;
  }
  count(games: DlssGame[], { upscaling }: FilterDeps): Record<string, number> {
    const c: Record<string, number> = { fsr: 0, xess: 0, both: 0, any: 0, none: 0 };
    const up = (upscaling as Record<string, UpscalingInfo> | undefined) ?? {};
    for (const g of games) {
      const u = up[g.name];
      const hasFsr = !!u?.fsr_version, hasXess = !!u?.xess_version;
      if (hasFsr) c.fsr++;
      if (hasXess) c.xess++;
      if (hasFsr && hasXess) c.both++;
      if (hasFsr || hasXess) c.any++;
      if (!hasFsr && !hasXess) c.none++;
    }
    return c;
  }
}

class ReleaseDateColumn extends Column {
  constructor() {
    super({
      key: "release_date", label: "Release Day", minWidth: "150px", mobileWidth: "100px",
      tooltip: "Steam release date",
      filters: [
        { value: "", label: "All" },
        { value: "month", label: "Last Month" },
        { value: "quarter", label: "Last 3 Months" },
        { value: "year", label: "Last Year" },
        { value: "old", label: "Older" },
        { value: "upcoming", label: "Upcoming" },
      ],
    });
  }
  render(_: DlssGame, d: RowData) { return <ReleaseDateBadge date={d.steam?.release_date} />; }
  filter(g: DlssGame, value: string, { steam }: FilterDeps): boolean {
    if (!value) return true;
    const rd = (steam as Record<string, SteamInfo> | undefined)?.[g.name]?.release_date;
    if (value === "upcoming") {
      if (!rd) return false;
      if (NON_DATE_RE.test(rd.trim())) return true;
      const d = new Date(rd);
      return !isNaN(d.getTime()) && d.getTime() > Date.now();
    }
    if (!rd) return false;
    const d = new Date(rd);
    if (isNaN(d.getTime())) return false;
    const age = Date.now() - d.getTime();
    if (value === "month" && age > ONE_MONTH) return false;
    if (value === "quarter" && age > THREE_MONTHS) return false;
    if (value === "year" && (age > ONE_YEAR || age <= 0)) return false;
    if (value === "old" && age <= ONE_YEAR) return false;
    return true;
  }
  sortValue(g: DlssGame, { steam }: FilterDeps): number | null {
    const rd = (steam as Record<string, SteamInfo> | undefined)?.[g.name]?.release_date;
    if (!rd) return null;
    const d = new Date(rd);
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  count(games: DlssGame[], { steam }: FilterDeps): Record<string, number> {
    const c: Record<string, number> = { month: 0, quarter: 0, year: 0, old: 0, upcoming: 0 };
    const st = (steam as Record<string, SteamInfo> | undefined) ?? {};
    const NOW = Date.now();
    for (const g of games) {
      const rd = st[g.name]?.release_date;
      if (!rd) continue;
      if (NON_DATE_RE.test(rd.trim())) { c.upcoming++; continue; }
      const d = new Date(rd);
      if (isNaN(d.getTime())) continue;
      const age = NOW - d.getTime();
      if (age < 0) { c.upcoming++; continue; }
      if (age <= ONE_MONTH) c.month++;
      if (age <= THREE_MONTHS) c.quarter++;
      if (age > 0 && age <= ONE_YEAR) c.year++;
      if (age > ONE_YEAR) c.old++;
    }
    return c;
  }
}

class RrColumn extends Column {
  constructor() {
    super({
      key: "rr", label: "RR", fullLabel: "Ray Recon", minWidth: "90px", mobileWidth: "70px",
      tooltip: "DLSS Ray Reconstruction\nAI-enhanced ray tracing denoiser\nfor cleaner reflections and lighting",
      filters: [{ value: "", label: "All" }, { value: "any", label: "Any" }],
    });
  }
  render(g: DlssGame) { return <FeatureBadge value={g["dlss ray reconstruction"] || ""} />; }
  filter(g: DlssGame, value: string): boolean { return fmatch(g["dlss ray reconstruction"] || "", value); }
  sortValue(g: DlssGame): number | null { return FEATURE_ORDER[g["dlss ray reconstruction"] || ""] || null; }
  count(games: DlssGame[]): Record<string, number> {
    const c: Record<string, number> = { any: 0, none: 0 };
    for (const g of games) { if (g["dlss ray reconstruction"]) c.any++; else c.none++; }
    return c;
  }
}

class RtColumn extends Column {
  constructor() {
    super({
      key: "rt", label: "RT", fullLabel: "Ray Tracing", minWidth: "125px", mobileWidth: "80px",
      tooltip: "Ray Tracing support\nPath Tracing = full path tracing\nYes = partial (reflections, shadows, GI)",
      filters: [
        { value: "", label: "All" },
        { value: "Path Tracing", label: "Path Tracing" },
        { value: "Yes", label: "Yes" },
        { value: "any", label: "Any RT" },
      ],
    });
  }
  render(g: DlssGame) { return <FeatureBadge value={g["ray tracing"] || ""} />; }
  filter(g: DlssGame, value: string): boolean { return fmatch(g["ray tracing"] || "", value); }
  sortValue(g: DlssGame): number | null { return RT_ORDER[g["ray tracing"] || ""] || null; }
  count(games: DlssGame[]): Record<string, number> {
    const c: Record<string, number> = { "Path Tracing": 0, Yes: 0, any: 0 };
    for (const g of games) {
      const v = g["ray tracing"] || "";
      if (v === "Path Tracing") c["Path Tracing"]++;
      if (v === "Yes") c.Yes++;
      if (v) c.any++;
    }
    return c;
  }
}

class SrColumn extends Column {
  constructor() {
    super({
      key: "sr", label: "SR", fullLabel: "Super Res", minWidth: "90px", mobileWidth: "70px",
      tooltip: "DLSS Super Resolution\nAI upscaling from lower resolution\nNV-T = Transformer model (best)",
      filters: [
        { value: "", label: "All" },
        { value: "NV, T", label: "Transformer" },
        { value: "Yes", label: "Yes" },
      ],
    });
  }
  render(g: DlssGame) { return <FeatureBadge value={g["dlss super resolution"] || ""} />; }
  filter(g: DlssGame, value: string): boolean { return fmatch(g["dlss super resolution"] || "", value); }
  sortValue(g: DlssGame): number | null { return FEATURE_ORDER[g["dlss super resolution"] || ""] || null; }
  count(games: DlssGame[]): Record<string, number> {
    const c: Record<string, number> = { "NV, T": 0, Yes: 0, any: 0, none: 0 };
    for (const g of games) {
      const v = g["dlss super resolution"] || "";
      if (v === "NV, T") c["NV, T"]++;
      if (v === "Yes") c.Yes++;
      if (v) c.any++; else c.none++;
    }
    return c;
  }
}

class DlaaColumn extends Column {
  constructor() {
    super({
      key: "dlaa", label: "DLAA", minWidth: "90px", mobileWidth: "70px",
      tooltip: "Deep Learning Anti-Aliasing\nAI anti-aliasing at native resolution",
      filters: [{ value: "", label: "All" }, { value: "any", label: "Any" }],
    });
  }
  render(g: DlssGame) { return <FeatureBadge value={g.dlaa || ""} />; }
  filter(g: DlssGame, value: string): boolean { return fmatch(g.dlaa || "", value); }
  sortValue(g: DlssGame): number | null { return FEATURE_ORDER[g.dlaa || ""] || null; }
  count(games: DlssGame[]): Record<string, number> {
    const c: Record<string, number> = { any: 0, none: 0 };
    for (const g of games) { if (g.dlaa) c.any++; else c.none++; }
    return c;
  }
}

class TagsColumn extends Column {
  constructor() {
    super({
      key: "tags", label: "Tags", minWidth: "180px", mobileWidth: "120px",
      tooltip: "Steam community tags\nSearch to filter by tag",
      filterType: "input",
    });
  }
  filter(g: DlssGame, value: string, { steam }: FilterDeps): boolean {
    if (!value) return true;
    const tq = value.toLowerCase();
    const tags = (steam as Record<string, SteamInfo> | undefined)?.[g.name]?.tags;
    return !!tags?.some((t) => t.toLowerCase().includes(tq));
  }
  sortValue(g: DlssGame, { steam }: FilterDeps): string | null {
    return (steam as Record<string, SteamInfo> | undefined)?.[g.name]?.tags?.[0] ?? null;
  }
}

export const COLUMNS: Column[] = [
  new NameColumn({ tooltip: "Click to view on Steam" }),
  new DlaaColumn(),
  new DlssVersionColumn(),
  new FrameGenColumn(),
  new UpscalingColumn(),
  new MetacriticColumn(),
  new HltbColumn(),
  new ReleaseDateColumn(),
  new RrColumn(),
  new RtColumn(),
  new SrColumn(),
  new SteamColumn(),
  new TagsColumn(),
  new OwnedColumn(),
  new HideColumn(),
];

const { pinnedFirst: PINNED_FIRST, pinnedLast: PINNED_LAST } = computePinnedSets(COLUMNS);
export { PINNED_FIRST, PINNED_LAST };

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
              key={g.sno}
              game={g}
              steam={steam[g.name]}
              hltb={hltb[g.name]}
              metacritic={metacritic[g.name]}
              upscaling={upscaling[g.name]}
              image={images[g.name]}
              cols={cols}
              colWidths={colWidths}
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

const GameRow = memo(function GameRow({ game, steam, hltb, metacritic, upscaling, image, cols, colWidths, hidden, onToggleHide, owned, tagFilter, onTagClick }: {
  game: DlssGame;
  steam?: SteamInfo;
  hltb?: HltbInfo;
  metacritic?: MetacriticInfo;
  upscaling?: UpscalingInfo;
  image?: string;
  cols: Column[];
  colWidths: number[];
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
      {cols.map((col, colIdx) => {
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
          const tagColWidth = colWidths[colIdx] ?? 180;
          const available = tagColWidth - 28;
          const estW = (t: string) => t.length * 5.2 + 11;
          const btnW = 26;
          const limit = available - btnW;
          const shown: string[] = [];
          const overflow: string[] = [];
          let used = 0;
          for (const t of ordered) {
            const w = estW(t) + 2;
            if (used + w <= limit) { shown.push(t); used += w; } else { overflow.push(t); }
          }
          if (overflow.length > 0 && shown.length === 0) shown.push(overflow.shift()!);
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
        return (
          <td key={col.key}>
            {col.render(game, { ...data, owned, hidden, onToggleHide: () => onToggleHide(game.name) })}
          </td>
        );
      })}
    </tr>
  );
});
