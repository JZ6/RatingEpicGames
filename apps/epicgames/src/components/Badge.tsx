export { SteamBadge, MetacriticBadge, HltbBadge, HideBadge, OwnedBadge } from "@shared/components/Badge";
import type { MetacriticInfo, EpicInfo } from "../types";
import { formatFreeDate, getLatestFreeDate } from "../types";

export function UserScoreBadge({ info }: { info?: MetacriticInfo }) {
  if (!info || info.user_score === undefined) return <span className="empty">—</span>;
  const s = info.user_score;
  const cls = s >= 7.5 ? "mc-good" : s >= 5 ? "mc-mixed" : "mc-bad";
  return <span className={`badge ${cls}`}>{s.toFixed(1)}</span>;
}

export function EpicDateBadge({ info }: { info?: EpicInfo }) {
  if (!info?.free_dates?.length) return <span className="empty">—</span>;
  const label = formatFreeDate(info);
  const count = info.free_dates.length;
  const parseD = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T12:00:00") : new Date(s);
  const tip = count > 1
    ? info.free_dates.map((d, i) => { const dt = parseD(d.start); return `#${i + 1}: ${dt.getFullYear()} · ${dt.toLocaleDateString("en-US", { month: "short" })} ${dt.getDate()}`; }).join("\n")
    : undefined;
  const latest = getLatestFreeDate(info);
  const THREE_MONTHS = 90 * 86400000;
  const ONE_YEAR = 365 * 86400000;
  const age = latest ? Date.now() - latest.getTime() : Infinity;
  const cls = age < THREE_MONTHS ? "rd-new" : age < ONE_YEAR ? "rd-recent" : "rd-old";
  return (
    <span className={`rd ${cls}`} data-tip={tip} tabIndex={tip ? 0 : undefined}>
      {label}
      {count > 1 && <span className="epic-count">×{count}</span>}
    </span>
  );
}

export function EpicRatingBadge({ info }: { info?: EpicInfo }) {
  if (!info?.epic_rating) return <span className="empty">—</span>;
  const r = info.epic_rating;
  const cls = r >= 4.5 ? "er-great" : r >= 3.5 ? "er-good" : r >= 2.5 ? "er-mixed" : "er-bad";
  return <span className={`badge ${cls}`}>{r.toFixed(1)}</span>;
}

export function PlatformBadge({ info }: { info?: EpicInfo }) {
  const platforms = info?.platforms || ["pc"];
  const labels: Record<string, string> = { pc: "PC", ios: "iOS", android: "Android" };
  return (
    <span className="platform-cell">
      {platforms.map((p) => (
        <span key={p} className={`badge plat-${p}`}>{labels[p] || p}</span>
      ))}
    </span>
  );
}
