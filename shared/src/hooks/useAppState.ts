import { useEffect, useState, useCallback } from "react";
import { loadSetFromLS } from "../types";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

interface AppStateConfig<S extends string> {
  lsPrefix: string;
  defaultCols: Record<number, S[]>;
  defaultFallback: S[];
}

function getDefaultCols<S extends string>(lsKey: string, breakpoints: Record<number, S[]>, fallback: S[]): Set<S> {
  try {
    const saved = localStorage.getItem(lsKey);
    if (saved) return new Set(JSON.parse(saved));
  } catch { /* ignore */ }
  const w = window.innerWidth;
  const sorted = Object.keys(breakpoints).map(Number).sort((a, b) => a - b);
  for (const bp of sorted) {
    if (w < bp) return new Set(breakpoints[bp]);
  }
  return new Set(fallback);
}

export function useAppState<S extends string>(config: AppStateConfig<S>) {
  const { lsPrefix, defaultCols, defaultFallback } = config;
  const lsCols = `${lsPrefix}-columns`;
  const lsHidden = `${lsPrefix}-hidden`;
  const lsOwned = `${lsPrefix}-owned`;

  const [hiddenGames, setHiddenGames] = useState<Set<string>>(() => loadSetFromLS(lsHidden));
  const [ownedGames, setOwnedGames] = useState<Set<string>>(() => loadSetFromLS(lsOwned));
  const [visibleCols, setVisibleCols] = useState<Set<S>>(() => getDefaultCols(lsCols, defaultCols, defaultFallback));
  const [showImport, setShowImport] = useState(false);

  useEffect(() => { localStorage.setItem(lsCols, JSON.stringify([...visibleCols])); }, [visibleCols]);
  useEffect(() => { localStorage.setItem(lsHidden, JSON.stringify([...hiddenGames])); }, [hiddenGames]);
  useEffect(() => { localStorage.setItem(lsOwned, JSON.stringify([...ownedGames])); }, [ownedGames]);

  const toggleHide = useCallback((name: string) => {
    setHiddenGames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const toggleCol = useCallback((key: string) => {
    if (key === "name") return;
    const k = key as S;
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }, []);

  useKeyboardShortcuts();

  return {
    hiddenGames, setHiddenGames,
    ownedGames, setOwnedGames,
    visibleCols, setVisibleCols,
    showImport, setShowImport,
    toggleHide, toggleCol,
  };
}
