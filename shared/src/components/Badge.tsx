import type { SteamRating, SteamInfo, HltbInfo, MetacriticInfo } from "../types";
import { getHltbHours } from "../types";

const STEAM_STYLES: Record<SteamRating, string> = {
  "Overwhelmingly Positive": "sop",
  "Very Positive": "svp",
  Positive: "sps",
  "Mostly Positive": "smp",
  Mixed: "smx",
  "Mostly Negative": "smn",
  Negative: "svn",
  "Very Negative": "svn",
};

const fmt = (h: number) => Math.ceil(h);

function fmtCount(n: number): string {
  if (n >= 1000000) return `${+(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function SteamBadge({ info, linkUrl }: { info?: SteamInfo; linkUrl?: string }) {
  if (!info) return <span className="empty">Not On Steam</span>;
  if (!info.rating) return <span className="empty">—</span>;
  const cls = STEAM_STYLES[info.rating] ?? "smx";
  const tip = info.total ? `${fmtCount(info.total)} reviews` : undefined;
  const url = linkUrl || info.steam_url || (info.appid ? `https://store.steampowered.com/app/${info.appid}` : undefined);
  const inner = (
    <div className="sc">
      <span className={`badge ${cls}`} data-tip={tip} tabIndex={tip ? 0 : undefined}>{info.rating}</span>
      {info.pct !== undefined && <span className="sp">{info.pct}%</span>}
    </div>
  );
  return url ? <a href={url} target="_blank" rel="noopener noreferrer">{inner}</a> : inner;
}

export function MetacriticBadge({ info }: { info?: MetacriticInfo }) {
  if (!info || info.score === undefined) return <span className="empty">—</span>;
  const s = info.score;
  const cls = s >= 75 ? "mc-good" : s >= 50 ? "mc-mixed" : "mc-bad";
  return <span className={`badge ${cls}`}>{s}</span>;
}

export function hltbColor(hours: number): string {
  const t = Math.min(hours / 250, 1);
  const mid = 150 / 250;
  const r = Math.round(t < mid ? (t / mid) * 220 : 220);
  const g = Math.round(t < mid ? 220 : (1 - (t - mid) / (1 - mid)) * 220);
  return `rgb(${r}, ${g}, 68)`;
}

export function HltbBadge({ data }: { data?: HltbInfo }) {
  const displayHours = getHltbHours(data);
  if (displayHours === undefined) return <span className="empty">—</span>;

  const tooltip = [
    data?.main && `Main Story: ${fmt(data.main)}h`,
    data?.extra && `Main + Extras: ${fmt(data.extra)}h`,
    data?.complete && `Completionist: ${fmt(data.complete)}h`,
    data?.coop && `Co-Op: ${fmt(data.coop)}h`,
    data?.pvp && `PvP: ${fmt(data.pvp)}h`,
    data?.all_styles && `All Styles: ${fmt(data.all_styles)}h`,
  ].filter(Boolean).join("\n");

  const inner = (
    <span className="hltb-cell" data-tip={tooltip} tabIndex={0}>
      <span className="hltb-main" style={{ color: hltbColor(displayHours) }}>{fmt(displayHours)} hours</span>
    </span>
  );

  if (data?.hltb_id) {
    return <a href={`https://howlongtobeat.com/game/${data.hltb_id}`} target="_blank" rel="noopener noreferrer">{inner}</a>;
  }
  return inner;
}

export function HideBadge({ hidden, onToggle }: { hidden: boolean; onToggle: () => void }) {
  return (
    <button
      className={`hide-btn ${hidden ? "hide-btn-hidden" : ""}`}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      title={hidden ? "Unhide game" : "Hide game"}
      aria-label={hidden ? "Unhide game" : "Hide game"}
    >
      {hidden ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

export function OwnedBadge({ owned }: { owned: boolean }) {
  if (!owned) return <span className="empty">—</span>;
  return <span className="badge byes">Owned</span>;
}

export function EmptyCell() {
  return <span className="empty">—</span>;
}

const THREE_MONTHS = 90 * 86400000;
const ONE_YEAR = 365 * 86400000;

export function getAgeCls(age: number): string {
  if (age < 0) return "rd-upcoming";
  if (age < THREE_MONTHS) return "rd-new";
  if (age < ONE_YEAR) return "rd-recent";
  return "rd-old";
}

export function formatDateLabel(d: Date): string {
  return `${d.getFullYear()} · ${d.toLocaleDateString("en-US", { month: "short" })} ${d.getDate()}`;
}
