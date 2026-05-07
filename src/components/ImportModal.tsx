import { useState, useRef, useEffect } from "react";

interface Props {
  gameNames: string[];
  ownedCount: number;
  onImport: (owned: Set<string>) => void;
  onClear: () => void;
  onClose: () => void;
}

// --- Fuzzy matching ---

export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function bigrams(s: string): Set<string> {
  const b = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) b.add(s.slice(i, i + 2));
  return b;
}

export function dice(a: string, b: string): number {
  const ba = bigrams(a);
  const bb = bigrams(b);
  if (ba.size === 0 && bb.size === 0) return 1;
  if (ba.size === 0 || bb.size === 0) return 0;
  let intersect = 0;
  for (const g of ba) if (bb.has(g)) intersect++;
  return (2 * intersect) / (ba.size + bb.size);
}

export function matchGames(csvNames: string[], gameNames: string[]): { matched: Set<string>; total: number } {
  const matched = new Set<string>();
  const normalizedGames = gameNames.map((n) => ({ name: n, norm: normalize(n) }));

  for (const raw of csvNames) {
    const norm = normalize(raw);
    if (!norm) continue;

    // Exact normalized match
    const exact = normalizedGames.find((g) => g.norm === norm);
    if (exact) { matched.add(exact.name); continue; }

    // Containment match — only if the shorter string is at least half the longer one
    const contains = normalizedGames.find((g) => {
      const short = Math.min(g.norm.length, norm.length);
      const long = Math.max(g.norm.length, norm.length);
      return short >= long * 0.5 && (g.norm.includes(norm) || norm.includes(g.norm));
    });
    if (contains) { matched.add(contains.name); continue; }

    // Dice coefficient — strict threshold
    let bestScore = 0;
    let bestMatch = "";
    for (const g of normalizedGames) {
      const score = dice(norm, g.norm);
      if (score > bestScore) { bestScore = score; bestMatch = g.name; }
    }
    if (bestScore >= 0.8) matched.add(bestMatch);
  }

  return { matched, total: csvNames.filter((n) => normalize(n)).length };
}

// --- CSV parsing (handles quoted fields) ---

export function splitCSVLine(line: string, delim: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === delim && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export function parseCSV(text: string): string[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  // Detect delimiter
  const delim = lines[0].includes(";") ? ";" : ",";

  // Detect header row
  const firstCols = splitCSVLine(lines[0], delim);
  const nameColIdx = firstCols.findIndex((c) => /^name$/i.test(c));
  const hasHeader = nameColIdx >= 0 || /^(id|name|title|platform|source)/i.test(firstCols[0]);
  const colIdx = nameColIdx >= 0 ? nameColIdx : 0;
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const cols = splitCSVLine(line, delim);
    return cols[colIdx] || "";
  }).filter(Boolean);
}

export function ImportModal({ gameNames, ownedCount, onImport, onClear, onClose }: Props) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ matched: number; total: number } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleImport = (csv: string) => {
    const names = parseCSV(csv);
    if (names.length === 0) return;
    const { matched, total } = matchGames(names, gameNames);
    setResult({ matched: matched.size, total });
    onImport(matched);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setText(content);
      const names = parseCSV(content);
      if (names.length === 0) return;
      const { matched, total } = matchGames(names, gameNames);
      setResult({ matched: matched.size, total });
      onImport(matched);
    };
    reader.readAsText(file);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import Game Library</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p className="modal-hint">Paste your Playnite CSV export or upload a file. Games are matched by name using fuzzy matching.</p>
          {ownedCount > 0 && (
            <div className="modal-library-info">
              <span>{ownedCount} games in your library</span>
              {confirmClear ? (
                <span className="clear-confirm">
                  Are you sure?
                  <button className="btn-clear-lib btn-clear-yes" onClick={() => { onClear(); onClose(); }}>Yes, clear</button>
                  <button className="btn-clear-lib" onClick={() => setConfirmClear(false)}>Cancel</button>
                </span>
              ) : (
                <button className="btn-clear-lib" onClick={() => setConfirmClear(true)}>Clear Library</button>
              )}
            </div>
          )}
          <textarea
            className="modal-textarea"
            placeholder={"Name;Platform;...\nCyberpunk 2077;Steam;...\nElden Ring;Steam;..."}
            value={text}
            onChange={(e) => { setText(e.target.value); setResult(null); }}
            rows={8}
          />
          <div className="modal-actions">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFile}
              style={{ display: "none" }}
            />
            <button className="btn-import" onClick={() => fileRef.current?.click()}>Upload File</button>
            {result ? (
              <button className="btn-import btn-import-primary" onClick={onClose}>Done</button>
            ) : (
              <button className="btn-import btn-import-primary" onClick={() => handleImport(text)} disabled={!text.trim()}>Import</button>
            )}
          </div>
          {result && (
            <div className="modal-result">
              Matched <span className="hl">{result.matched}</span> of {result.total} games from your library
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
