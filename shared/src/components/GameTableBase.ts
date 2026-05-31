export interface Column {
  key: string;
  label: string;
  fullLabel?: string;
  minWidth: string;
  tooltip: string;
  icon?: React.JSX.Element;
}

export const PINNED_FIRST = new Set(["name"]);
export const PINNED_LAST = new Set(["owned", "hide"]);

export const SHARED_COLUMN_FILTERS: Record<string, { value: string; label: string }[]> = {
  steam: [
    { value: "", label: "All" },
    { value: "op+", label: "Ov. Positive +" },
    { value: "vp+", label: "Very Positive +" },
    { value: "mp+", label: "M. Positive +" },
    { value: "neg", label: "Negative" },
    { value: "nos", label: "Not On Steam" },
  ],
  hltb: [
    { value: "", label: "All" },
    { value: "u10", label: "< 10 h" },
    { value: "u60", label: "< 60 h" },
    { value: "u100", label: "< 100 h" },
    { value: "100+", label: "> 100 h" },
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

export function computeColWidths(cols: Column[], containerWidth: number): number[] {
  const minWidths = cols.map((c) => parseInt(c.minWidth));
  const totalMin = minWidths.reduce((s, w) => s + w, 0);
  const extra = Math.max(0, containerWidth - totalMin);
  const share = cols.length > 0 ? Math.floor(extra / cols.length) : 0;
  return minWidths.map((w) => w + share);
}
