import { useState, useCallback, useEffect, startTransition } from "react";

export type SortDir = 1 | -1;

interface FilterStateConfig<F extends Record<string, string>, S extends string> {
  emptyFilters: F;
  lsFiltersKey: string;
  lsSortKey: string;
  defaultSort: { col: S; dir: SortDir };
}

function filtersFromHash<F extends Record<string, string>>(emptyFilters: F): Partial<F> {
  try {
    const hash = window.location.hash.slice(1);
    if (!hash) return {};
    const params = new URLSearchParams(hash);
    const result: Partial<F> = {};
    for (const [k, v] of params) {
      if (k in emptyFilters) (result as Record<string, string>)[k] = v;
    }
    return result;
  } catch { return {}; }
}

function filtersToHash<F extends Record<string, string>>(filters: F, emptyFilters: F): void {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v && v !== emptyFilters[k as keyof F]) params.set(k, v);
  }
  const hash = params.toString();
  const newUrl = hash ? `#${hash}` : window.location.pathname + window.location.search;
  window.history.replaceState(null, "", newUrl);
}

function loadFilters<F extends Record<string, string>>(emptyFilters: F, lsKey: string): F {
  const hashFilters = filtersFromHash(emptyFilters);
  if (Object.keys(hashFilters).length > 0) {
    return { ...emptyFilters, ...hashFilters };
  }
  try {
    const saved = localStorage.getItem(lsKey);
    if (saved) return { ...emptyFilters, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return emptyFilters;
}

function loadSort<S extends string>(lsKey: string, defaultSort: { col: S; dir: SortDir }): { col: S; dir: SortDir } {
  try {
    const saved = localStorage.getItem(lsKey);
    if (saved) {
      const { col, dir } = JSON.parse(saved);
      return { col, dir };
    }
  } catch { /* ignore */ }
  return defaultSort;
}

export function useFilterState<F extends Record<string, string>, S extends string>(config: FilterStateConfig<F, S>) {
  const { emptyFilters, lsFiltersKey, lsSortKey, defaultSort } = config;

  const [filters, setFilters] = useState<F>(() => loadFilters(emptyFilters, lsFiltersKey));
  const [sort, setSort] = useState(() => loadSort(lsSortKey, defaultSort));

  useEffect(() => { localStorage.setItem(lsFiltersKey, JSON.stringify(filters)); filtersToHash(filters, emptyFilters); }, [filters]);
  useEffect(() => { localStorage.setItem(lsSortKey, JSON.stringify(sort)); }, [sort]);

  const setFilter = useCallback((key: keyof F, value: string) => {
    startTransition(() => setFilters((prev) => ({ ...prev, [key]: value })));
  }, []);

  const clearFilters = useCallback(() => startTransition(() => setFilters(emptyFilters)), []);

  const toggleSort = useCallback((col: S) => {
    setSort((prev) => prev.col === col
      ? { col, dir: (prev.dir === 1 ? -1 : 1) as SortDir }
      : { col, dir: 1 }
    );
  }, []);

  return { filters, setFilter, clearFilters, sortCol: sort.col, sortDir: sort.dir, toggleSort };
}

export function sortComparator<T>(
  a: T, b: T, sortDir: SortDir,
  getSortVal: (item: T) => string | number | null,
): number {
  const av = getSortVal(a);
  const bv = getSortVal(b);
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  if (typeof av === "number" && typeof bv === "number") return (av - bv) * sortDir;
  return String(av).localeCompare(String(bv)) * sortDir;
}
