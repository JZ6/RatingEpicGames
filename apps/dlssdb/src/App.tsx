import { useGameData } from "./hooks/useGameData";
import { useFilters } from "./hooks/useFilters";
import { GameTable, COLUMNS } from "./components/GameTable";
import { AppShell } from "@shared/components/AppShell";
import { useAppState } from "@shared/hooks/useAppState";
import type { SortCol } from "./types";

export default function App() {
  const { games, hltb, steam, metacritic, upscaling, images, loading, error, retry } = useGameData();
  const state = useAppState<SortCol>({
    lsPrefix: "dlssdb",
    defaultCols: { 800: ["name", "framegen", "steam", "hide"], 1200: ["name", "dlssver", "framegen", "steam", "hltb", "hide"] },
    defaultFallback: ["name", "dlssver", "framegen", "rt", "steam", "metacritic", "hltb", "hide"],
  });
  const { filtered, filters, filterCounts, setFilter, clearFilters, sortCol, sortDir, toggleSort } =
    useFilters(games, hltb, steam, metacritic, upscaling, state.hiddenGames, state.ownedGames);

  return (
    <AppShell
      title="DLSSdb"
      subtitle="Every DLSS game. Reviews. Playtime. All in one place."
      errorHint="dlss-rt-games-apps-overrides.json"
      columns={COLUMNS}
      loading={loading} error={error} retry={retry}
      games={games} filteredCount={filtered.length}
      onClearFilters={clearFilters}
      {...state}
    >
      <GameTable
        games={filtered} hltb={hltb} steam={steam} metacritic={metacritic} upscaling={upscaling} images={images}
        sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}
        visibleCols={state.visibleCols} filters={filters} filterCounts={filterCounts} onFilter={setFilter}
        hiddenGames={state.hiddenGames} onToggleHide={state.toggleHide} ownedGames={state.ownedGames}
      />
    </AppShell>
  );
}
