import { Header } from "./Header";
import { StatsBar } from "./StatsBar";
import { ImportModal } from "./ImportModal";
import type { Column } from "./Column";

interface AppShellProps {
  title: string;
  subtitle: string;
  errorHint: string;
  columns: Column[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  games: { name: string }[];
  filteredCount: number;
  visibleCols: Set<string>;
  toggleCol: (key: string) => void;
  onClearFilters: () => void;
  ownedGames: Set<string>;
  setOwnedGames: (s: Set<string>) => void;
  setVisibleCols: React.Dispatch<React.SetStateAction<Set<string>>>;
  showImport: boolean;
  setShowImport: (v: boolean) => void;
  children: React.ReactNode;
}

export function AppShell({
  title, subtitle, errorHint,
  columns, loading, error, retry,
  games, filteredCount,
  visibleCols, toggleCol, onClearFilters,
  ownedGames, setOwnedGames, setVisibleCols,
  showImport, setShowImport,
  children,
}: AppShellProps) {
  if (loading) {
    return (
      <>
        <Header title={title} subtitle={subtitle} />
        <div className="loading"><span className="spinner" />Loading game data…</div>
        <StatsBar filteredCount={0} total={0} />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header title={title} subtitle={subtitle} />
        <div className="error-page">
          <h2>Failed to load game data</h2>
          <p>Make sure <code>{errorHint}</code> is in the <code>public/</code> folder and accessible.</p>
          <p className="error-detail">{error}</p>
          <button type="button" className="btn-clear" onClick={retry}>Retry</button>
        </div>
        <StatsBar filteredCount={0} total={0} />
      </>
    );
  }

  return (
    <>
      <Header
        title={title}
        subtitle={subtitle}
        columns={columns}
        visibleCols={visibleCols}
        onToggleCol={toggleCol}
        onClearFilters={onClearFilters}
        onImportLibrary={() => setShowImport(true)}
        ownedCount={ownedGames.size}
      />
      {children}
      <StatsBar filteredCount={filteredCount} total={games.length} />
      {showImport && (
        <ImportModal
          gameNames={games.map((g) => g.name)}
          ownedCount={ownedGames.size}
          onImport={(owned) => {
            setOwnedGames(owned);
            if (owned.size > 0) setVisibleCols((prev) => new Set([...prev, "owned"]));
          }}
          onClear={() => setOwnedGames(new Set())}
          onClose={() => setShowImport(false)}
        />
      )}
    </>
  );
}
