export { SteamBadge, MetacriticBadge, HltbBadge, HideBadge, OwnedBadge } from "@shared/components/Badge";
import { getAgeCls, formatDateLabel } from "@shared/components/Badge";
import type { DlssGame, UpscalingInfo } from "../types";
import { getFrameGenLabel, getDlssVersion } from "../types";

const FG_STYLES: Record<string, string> = {
  "6X": "b6x",
  "4X": "b4x",
  "2X": "b2x",
};

const FEATURE_STYLES: Record<string, { cls: string; label: string }> = {
  "NV, T": { cls: "bnvt", label: "NV-T" },
  "NV, U": { cls: "bnvu", label: "NV-U" },
  "✓ (NV)": { cls: "bnvu", label: "NV" },
  "Path Tracing": { cls: "bpt", label: "Path Tracing" },
  Yes: { cls: "byes", label: "✓" },
};

const DLSS_VER_STYLES: Record<string, string> = {
  "4.5": "b6x",
  "4": "b4x",
  "3.5": "bnvt",
  "3": "bnvu",
  "2": "byes",
  "1": "byes",
};

export function FrameGenBadge({ game }: { game: DlssGame }) {
  const label = getFrameGenLabel(game);
  if (!label) return <span className="empty">—</span>;
  const cls = FG_STYLES[label] ?? "byes";
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function DlssVersionBadge({ game }: { game: DlssGame }) {
  const ver = getDlssVersion(game);
  const cls = DLSS_VER_STYLES[ver] ?? "byes";
  return <span className={`badge ${cls}`}>{ver}</span>;
}

export function FeatureBadge({ value }: { value: string }) {
  if (!value) return <span className="empty">—</span>;
  const style = FEATURE_STYLES[value];
  if (style) return <span className={`badge ${style.cls}`}>{style.label}</span>;
  return <span className="badge byes">{value}</span>;
}

export function UpscalingBadge({ info }: { info?: UpscalingInfo }) {
  if (!info) return <span className="empty">—</span>;
  const parts: { label: string; cls: string; tip: string }[] = [];
  if (info.fsr_version) parts.push({ label: "FSR", cls: "bfsr", tip: info.fsr_version });
  if (info.xess_version) parts.push({ label: "XeSS", cls: "bxess", tip: info.xess_version });
  if (!parts.length) return <span className="empty">—</span>;
  return (
    <span className="upscaling-badges">
      {parts.map((p) => <span key={p.label} className={`badge ${p.cls}`} data-tip={p.tip} tabIndex={0}>{p.label}</span>)}
    </span>
  );
}

const NON_DATE = /^(to be announced|tba|coming soon|q[1-4]\s*\d{4}|\d{4})$/i;

export function ReleaseDateBadge({ date }: { date?: string }) {
  if (!date) return <span className="empty">—</span>;
  if (NON_DATE.test(date.trim())) {
    const label = /^\d{4}$/.test(date.trim()) ? date.trim() : "TBA";
    return <span className="badge rd-upcoming">{label}</span>;
  }
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return <span className="empty">{date}</span>;
  const age = Date.now() - parsed.getTime();
  const cls = getAgeCls(age);
  return <span className={`rd ${cls}`}>{formatDateLabel(parsed)}</span>;
}
