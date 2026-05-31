import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFilters } from '../useFilters'
import type { EpicGame, HltbInfo, SteamInfo, MetacriticInfo, EpicInfo } from '../../types'

const games: EpicGame[] = [
  { name: 'Subnautica', slug: 'subnautica' },
  { name: 'Control', slug: 'control' },
  { name: 'GTA V', slug: 'grand-theft-auto-v' },
  { name: 'Celeste', slug: 'celeste' },
]

const steam: Record<string, SteamInfo> = {
  'Subnautica': { rating: 'Overwhelmingly Positive', pct: 96, total: 190000, appid: 264710 },
  'Control': { rating: 'Very Positive', pct: 85, total: 40000, appid: 870780 },
  'GTA V': { rating: 'Mostly Positive', pct: 72, total: 900000, appid: 271590 },
}

const hltb: Record<string, HltbInfo> = {
  'Subnautica': { main: 30, extra: 45, complete: 55 },
  'Celeste': { main: 5, extra: 8, complete: 9 },
}

const metacritic: Record<string, MetacriticInfo> = {
  'Subnautica': { score: 87, user_score: 8.6 },
  'Control': { score: 85, user_score: 7.8 },
  'GTA V': { score: 96, user_score: 7.4 },
}

const epic: Record<string, EpicInfo> = {
  'Subnautica': { slug: 'subnautica', free_dates: [{ start: '2018-12-14', end: '' }], epic_rating: 4.7, platforms: ['pc'] },
  'Control': { slug: 'control', free_dates: [{ start: '2021-06-10', end: '' }], epic_rating: 4.2, platforms: ['pc'] },
  'GTA V': { slug: 'grand-theft-auto-v', free_dates: [{ start: '2020-05-14', end: '' }], epic_rating: 3.1, platforms: ['pc', 'ios'] },
  'Celeste': { slug: 'celeste', free_dates: [{ start: '2019-08-29', end: '' }, { start: '2019-12-24', end: '' }], platforms: ['pc'] },
}

const storage = new Map<string, string>()
const mockLocalStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
}
vi.stubGlobal('localStorage', mockLocalStorage)

beforeEach(() => {
  storage.clear()
  window.location.hash = ''
})

describe('useFilters', () => {
  it('returns all games with no filters', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    expect(result.current.filtered).toHaveLength(4)
  })

  it('filters by search', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('search', 'sub'))
    expect(result.current.filtered.map(g => g.name)).toEqual(['Subnautica'])
  })

  it('filters by steam rating op+', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('steam', 'op+'))
    expect(result.current.filtered.map(g => g.name)).toEqual(['Subnautica'])
  })

  it('filters by steam rating vp+', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('steam', 'vp+'))
    expect(result.current.filtered.map(g => g.name)).toContain('Subnautica')
    expect(result.current.filtered.map(g => g.name)).toContain('Control')
  })

  it('filters not on steam', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('steam', 'nos'))
    expect(result.current.filtered.map(g => g.name)).toEqual(['Celeste'])
  })

  it('filters by metacritic 90+', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('metacritic', '90+'))
    expect(result.current.filtered.map(g => g.name)).toEqual(['GTA V'])
  })

  it('filters by metacritic 75+', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('metacritic', '75+'))
    expect(result.current.filtered).toHaveLength(3)
  })

  it('filters by user score 8+', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('userscore', '8+'))
    expect(result.current.filtered.map(g => g.name)).toEqual(['Subnautica'])
  })

  it('filters by hltb < 10h', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('hltb', 'u10'))
    expect(result.current.filtered.map(g => g.name)).toContain('Celeste')
    expect(result.current.filtered).toHaveLength(1)
  })

  it('filters by year', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('year', '2020'))
    expect(result.current.filtered.map(g => g.name)).toEqual(['GTA V'])
  })

  it('filters hidden games by default', () => {
    const hidden = new Set(['GTA V'])
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic, hidden))
    expect(result.current.filtered).toHaveLength(3)
    expect(result.current.filtered.map(g => g.name)).not.toContain('GTA V')
  })

  it('shows only hidden with hide=hidden', () => {
    const hidden = new Set(['GTA V'])
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic, hidden))
    act(() => result.current.setFilter('hide', 'hidden'))
    expect(result.current.filtered.map(g => g.name)).toEqual(['GTA V'])
  })

  it('filters owned games', () => {
    const owned = new Set(['Subnautica', 'Celeste'])
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic, new Set(), owned))
    act(() => result.current.setFilter('owned', 'owned'))
    expect(result.current.filtered).toHaveLength(2)
  })

  it('clears all filters', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('search', 'sub'))
    expect(result.current.filtered).toHaveLength(1)
    act(() => result.current.clearFilters())
    expect(result.current.filtered).toHaveLength(4)
  })

  it('sorts by name ascending', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.toggleSort('name'))
    const names = result.current.filtered.map(g => g.name)
    expect(names[0]).toBe('Celeste')
    expect(names[names.length - 1]).toBe('Subnautica')
  })

  it('toggles sort direction', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.toggleSort('name'))
    expect(result.current.sortDir).toBe(1)
    act(() => result.current.toggleSort('name'))
    expect(result.current.sortDir).toBe(-1)
  })

  it('sorts by metacritic score', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.toggleSort('metacritic'))
    const names = result.current.filtered.map(g => g.name)
    expect(names[0]).toBe('Control')
  })

  it('sorts by epicdate', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.toggleSort('epicdate'))
    const names = result.current.filtered.map(g => g.name)
    expect(names[0]).toBe('Subnautica')
  })

  it('computes filterCounts correctly', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    const counts = result.current.filterCounts
    expect(counts.steam['op+']).toBe(1)
    expect(counts.steam['vp+']).toBe(2)
    expect(counts.steam.nos).toBe(1)
    expect(counts.metacritic['90+']).toBe(1)
    expect(counts.metacritic['75+']).toBe(3)
    expect(counts.year['2018']).toBe(1)
    expect(counts.year['2019']).toBe(1)
    expect(counts.year['2020']).toBe(1)
    expect(counts.year['2021']).toBe(1)
  })

  it('persists filters to localStorage', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('search', 'test'))
    const saved = JSON.parse(storage.get('epicdb-filters') || '{}')
    expect(saved.search).toBe('test')
  })

  it('persists sort to localStorage', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.toggleSort('metacritic'))
    const saved = JSON.parse(storage.get('epicdb-sort') || '{}')
    expect(saved.col).toBe('metacritic')
  })

  it('loads filters from URL hash', () => {
    window.location.hash = '#search=celeste'
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    expect(result.current.filters.search).toBe('celeste')
    expect(result.current.filtered).toHaveLength(1)
  })

  it('filters by steam mp+', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('steam', 'mp+'))
    expect(result.current.filtered.map(g => g.name)).toContain('GTA V')
    expect(result.current.filtered.map(g => g.name)).toContain('Control')
    expect(result.current.filtered.map(g => g.name)).toContain('Subnautica')
  })

  it('filters by steam neg', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('steam', 'neg'))
    expect(result.current.filtered).toHaveLength(0)
  })

  it('filters by metacritic 50-', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('metacritic', '50-'))
    expect(result.current.filtered).toHaveLength(0)
  })

  it('filters by userscore 6+', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('userscore', '6+'))
    expect(result.current.filtered).toHaveLength(3)
  })

  it('filters by userscore 4-', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('userscore', '4-'))
    expect(result.current.filtered).toHaveLength(0)
  })

  it('filters by hltb u60', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('hltb', 'u60'))
    const names = result.current.filtered.map(g => g.name)
    expect(names).toContain('Celeste')
    expect(names).toContain('Subnautica')
  })

  it('filters by hltb u100', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('hltb', 'u100'))
    expect(result.current.filtered).toHaveLength(2)
  })

  it('filters by hltb 100+', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('hltb', '100+'))
    expect(result.current.filtered).toHaveLength(0)
  })

  it('filters by epicrating 4.5+', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('epicrating', '4.5+'))
    expect(result.current.filtered.map(g => g.name)).toEqual(['Subnautica'])
  })

  it('filters by epicrating 4+', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('epicrating', '4+'))
    expect(result.current.filtered.map(g => g.name)).toContain('Control')
    expect(result.current.filtered.map(g => g.name)).toContain('Subnautica')
  })

  it('filters by epicrating 3+', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('epicrating', '3+'))
    expect(result.current.filtered).toHaveLength(3)
  })

  it('filters by platform pc', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('platform', 'pc'))
    expect(result.current.filtered).toHaveLength(4)
  })

  it('filters by platform mobile', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.setFilter('platform', 'mobile'))
    expect(result.current.filtered.map(g => g.name)).toEqual(['GTA V'])
  })

  it('shows all games including hidden with hide=""', () => {
    const hidden = new Set(['GTA V'])
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic, hidden))
    act(() => result.current.setFilter('hide', ''))
    expect(result.current.filtered).toHaveLength(4)
  })

  it('filters not owned games', () => {
    const owned = new Set(['Subnautica'])
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic, new Set(), owned))
    act(() => result.current.setFilter('owned', 'not'))
    expect(result.current.filtered).toHaveLength(3)
    expect(result.current.filtered.map(g => g.name)).not.toContain('Subnautica')
  })

  it('sorts by steam rating', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.toggleSort('steam'))
    const names = result.current.filtered.map(g => g.name)
    expect(names[0]).toBe('GTA V')
  })

  it('sorts by hltb', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.toggleSort('hltb'))
    const names = result.current.filtered.map(g => g.name)
    expect(names[0]).toBe('Celeste')
  })

  it('sorts by epicrating', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.toggleSort('epicrating'))
    const names = result.current.filtered.map(g => g.name)
    expect(names[0]).toBe('GTA V')
  })

  it('sorts by platform', () => {
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic))
    act(() => result.current.toggleSort('platform'))
    const first = result.current.filtered[0].name
    expect(first).toBeDefined()
  })

  it('sorts by owned', () => {
    const owned = new Set(['Subnautica'])
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, epic, new Set(), owned))
    act(() => result.current.toggleSort('owned'))
    const names = result.current.filtered.map(g => g.name)
    expect(names[0]).not.toBe('Subnautica')
  })
})
