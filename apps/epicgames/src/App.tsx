import { useGameData } from "./hooks/useGameData";
import { useFilters } from "./hooks/useFilters";
import { GameTable, COLUMNS } from "./components/GameTable";
import { AppShell } from "@shared/components/AppShell";
import { useAppState } from "@shared/hooks/useAppState";
import type { SortCol } from "./types";

export default function App() {
  const { games, hltb, steam, metacritic, epic, images, loading, error, retry } = useGameData();
  const state = useAppState<SortCol>({
    lsPrefix: "epicdb",
    defaultCols: { 800: ["name", "steam", "hide"], 1200: ["name", "steam", "epicdate", "hide"] },
    defaultFallback: ["name", "steam", "hltb", "epicdate", "hide"],
  });
  const { filtered, filters, filterCounts, setFilter, clearFilters, sortCol, sortDir, toggleSort } =
    useFilters(games, hltb, steam, metacritic, epic, state.hiddenGames, state.ownedGames);

  return (
    <AppShell
      title="Rating Epic Games"
      subtitle="Every free Epic game. Rated. Reviewed. All in one place."
      errorHint="game_data.json"
      columns={COLUMNS}
      loading={loading} error={error} retry={retry}
      games={games} filteredCount={filtered.length}
      onClearFilters={clearFilters}
      {...state}
    >
      <GameTable
        games={filtered} hltb={hltb} steam={steam} metacritic={metacritic} epic={epic} images={images}
        sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}
        visibleCols={state.visibleCols} filters={filters} filterCounts={filterCounts} onFilter={setFilter}
        hiddenGames={state.hiddenGames} onToggleHide={state.toggleHide} ownedGames={state.ownedGames}
      />
    </AppShell>
  );
}
