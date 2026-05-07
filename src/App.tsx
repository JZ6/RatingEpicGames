import { useEffect, useState, useCallback } from "react";
import { useGameData } from "./hooks/useGameData";
import { useFilters } from "./hooks/useFilters";
import { Header } from "./components/Header";
import { StatsBar } from "./components/StatsBar";
import { GameTable, COLUMNS } from "./components/GameTable";
import { ImportModal } from "./components/ImportModal";
import type { SortCol } from "./types";

const LS_COLS = "epicdb-columns";
const LS_HIDDEN = "epicdb-hidden";
const LS_OWNED = "epicdb-owned";

function loadHidden(): Set<string> {
  try {
    const saved = localStorage.getItem(LS_HIDDEN);
    if (saved) return new Set(JSON.parse(saved));
  } catch { /* ignore */ }
  return new Set();
}

function loadOwned(): Set<string> {
  try {
    const saved = localStorage.getItem(LS_OWNED);
    if (saved) return new Set(JSON.parse(saved));
  } catch { /* ignore */ }
  return new Set();
}

function getDefaultCols(): Set<SortCol> {
  try {
    const saved = localStorage.getItem(LS_COLS);
    if (saved) return new Set(JSON.parse(saved));
  } catch { /* ignore */ }
  const w = window.innerWidth;
  if (w < 800) return new Set(["name", "steam", "hide"]);
  if (w < 1200) return new Set(["name", "steam", "epicdate", "hide"]);
  return new Set(["name", "steam", "hltb", "epicdate", "hide"]);
}

export default function App() {
  const { games, hltb, steam, metacritic, epic, images, loading, error, retry } = useGameData();
  const [hiddenGames, setHiddenGames] = useState<Set<string>>(loadHidden);
  const [ownedGames, setOwnedGames] = useState<Set<string>>(loadOwned);
  const [showImport, setShowImport] = useState(false);
  const { filtered, filters, filterCounts, setFilter, clearFilters, sortCol, sortDir, toggleSort } =
    useFilters(games, hltb, steam, metacritic, epic, hiddenGames, ownedGames);
  const [visibleCols, setVisibleCols] = useState<Set<SortCol>>(getDefaultCols);

  useEffect(() => {
    localStorage.setItem(LS_COLS, JSON.stringify([...visibleCols]));
  }, [visibleCols]);

  useEffect(() => {
    localStorage.setItem(LS_HIDDEN, JSON.stringify([...hiddenGames]));
  }, [hiddenGames]);

  useEffect(() => {
    localStorage.setItem(LS_OWNED, JSON.stringify([...ownedGames]));
  }, [ownedGames]);

  const toggleHide = useCallback((name: string) => {
    setHiddenGames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const toggleCol = useCallback((key: SortCol) => {
    if (key === "name") return;
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "SELECT" && tag !== "TEXTAREA") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>(".th-filter-input")?.focus();
      }
      if (e.key === "Escape") {
        (document.activeElement as HTMLElement)?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  if (loading) {
    return (
      <>
        <Header />
        <div className="loading"><span className="spinner" />Loading game data…</div>
        <StatsBar filtered={[]} total={0} />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="error-page">
          <h2>Failed to load game data</h2>
          <p>Make sure <code>game_data.json</code> is in the <code>public/</code> folder and accessible.</p>
          <p className="error-detail">{error}</p>
          <button type="button" className="btn-clear" onClick={retry}>Retry</button>
        </div>
        <StatsBar filtered={[]} total={0} />
      </>
    );
  }

  return (
    <>
      <Header
        columns={COLUMNS}
        visibleCols={visibleCols}
        onToggleCol={toggleCol}
        onClearFilters={clearFilters}
        onImportLibrary={() => setShowImport(true)}
        ownedCount={ownedGames.size}
      />
      <GameTable
        games={filtered}
        hltb={hltb}
        steam={steam}
        metacritic={metacritic}
        epic={epic}
        images={images}
        sortCol={sortCol}
        sortDir={sortDir}
        onSort={toggleSort}
        visibleCols={visibleCols}
        filters={filters}
        filterCounts={filterCounts}
        onFilter={setFilter}
        hiddenGames={hiddenGames}
        onToggleHide={toggleHide}
        ownedGames={ownedGames}
      />
      <StatsBar filtered={filtered} total={games.length} />
      {showImport && (
        <ImportModal
          gameNames={games.map((g) => g.name)}
          ownedCount={ownedGames.size}
          onImport={(owned) => {
            setOwnedGames(owned);
            if (owned.size > 0) setVisibleCols((prev) => new Set([...prev, "owned" as SortCol]));
          }}
          onClear={() => setOwnedGames(new Set())}
          onClose={() => setShowImport(false)}
        />
      )}
    </>
  );
}
