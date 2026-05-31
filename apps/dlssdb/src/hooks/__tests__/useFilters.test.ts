import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFilters } from '../useFilters'
import type { DlssGame, HltbInfo, SteamInfo, MetacriticInfo, UpscalingInfo } from '../../types'

const makeGame = (name: string, overrides: Partial<DlssGame> = {}): DlssGame => ({
  sno: 1, name, type: 'Game',
  'dlss multi frame generation': '', 'dlss frame generation': '',
  'dlss super resolution': '', 'dlss ray reconstruction': '',
  dlaa: '', 'ray tracing': '', ai: '',
  ...overrides,
})

const games: DlssGame[] = [
  makeGame('Cyberpunk 2077', { 'dlss multi frame generation': 'NV, 6X', 'dlss ray reconstruction': 'Yes', 'ray tracing': 'Path Tracing', dlaa: 'Yes', 'dlss super resolution': 'NV, T' }),
  makeGame('Elden Ring', { 'dlss frame generation': 'Yes', 'ray tracing': 'Yes', 'dlss super resolution': 'Yes' }),
  makeGame('Halo Infinite', { 'dlss super resolution': 'Yes' }),
  makeGame('Portal RTX', { 'dlss multi frame generation': 'NV, 4X', 'ray tracing': 'Path Tracing', 'dlss super resolution': 'NV, T' }),
]

const steam: Record<string, SteamInfo> = {
  'Cyberpunk 2077': { rating: 'Very Positive', pct: 89, total: 500000, appid: 1091500 },
  'Elden Ring': { rating: 'Mostly Positive', pct: 72, total: 300000, appid: 1245620 },
  'Halo Infinite': { rating: 'Mixed', pct: 55, total: 100000, appid: 1240440 },
}

const hltb: Record<string, HltbInfo> = {
  'Cyberpunk 2077': { main: 25, extra: 60, complete: 100 },
  'Elden Ring': { main: 50, extra: 100, complete: 150 },
}

const metacritic: Record<string, MetacriticInfo> = {
  'Cyberpunk 2077': { score: 86 },
  'Elden Ring': { score: 96 },
  'Portal RTX': { score: 75 },
}

const upscaling: Record<string, UpscalingInfo> = {
  'Cyberpunk 2077': { fsr_version: 'FSR 2.1', xess_version: 'XeSS 1.1' },
  'Elden Ring': { fsr_version: 'FSR 2.0' },
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
    const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
    expect(result.current.filtered).toHaveLength(4)
  })

  describe('search filter', () => {
    it('filters by name substring', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('search', 'cyber'))
      expect(result.current.filtered).toHaveLength(1)
      expect(result.current.filtered[0].name).toBe('Cyberpunk 2077')
    })

    it('is case insensitive', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('search', 'ELDEN'))
      expect(result.current.filtered).toHaveLength(1)
    })
  })

  describe('framegen filter', () => {
    it('filters 6x only', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('framegen', '6x'))
      expect(result.current.filtered.map((g) => g.name)).toEqual(['Cyberpunk 2077'])
    })

    it('filters 4x only', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('framegen', '4x'))
      expect(result.current.filtered.map((g) => g.name)).toEqual(['Portal RTX'])
    })

    it('filters any frame gen', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('framegen', 'any'))
      expect(result.current.filtered).toHaveLength(3) // Cyberpunk, Elden, Portal
    })
  })

  describe('steam filter', () => {
    it('filters Very Positive+', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('steam', 'vp+'))
      expect(result.current.filtered.map((g) => g.name)).toEqual(['Cyberpunk 2077'])
    })

    it('filters Mostly Positive+', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('steam', 'mp+'))
      expect(result.current.filtered).toHaveLength(2) // Cyberpunk + Elden
    })

    it('filters Not On Steam', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('steam', 'nos'))
      expect(result.current.filtered.map((g) => g.name)).toEqual(['Portal RTX'])
    })
  })

  describe('metacritic filter', () => {
    it('filters 90+', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('metacritic', '90+'))
      expect(result.current.filtered.map((g) => g.name)).toEqual(['Elden Ring'])
    })

    it('filters 75+', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('metacritic', '75+'))
      expect(result.current.filtered).toHaveLength(3) // Cyberpunk 86, Elden 96, Portal 75
    })
  })

  describe('upscaling filter', () => {
    it('filters both FSR + XeSS', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('upscaling', 'both'))
      expect(result.current.filtered.map((g) => g.name)).toEqual(['Cyberpunk 2077'])
    })

    it('filters FSR', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('upscaling', 'fsr'))
      expect(result.current.filtered).toHaveLength(2) // Cyberpunk + Elden
    })
  })

  describe('rt filter', () => {
    it('filters Path Tracing only', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('rt', 'Path Tracing'))
      expect(result.current.filtered).toHaveLength(2) // Cyberpunk + Portal
    })

    it('filters any RT', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('rt', 'any'))
      expect(result.current.filtered).toHaveLength(3) // Cyberpunk, Elden, Portal
    })
  })

  describe('hidden games filter', () => {
    it('excludes hidden games by default', () => {
      const hidden = new Set(['Halo Infinite'])
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling, hidden))
      expect(result.current.filtered).toHaveLength(3)
      expect(result.current.filtered.find((g) => g.name === 'Halo Infinite')).toBeUndefined()
    })

    it('shows only hidden when filter is "hidden"', () => {
      const hidden = new Set(['Halo Infinite'])
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling, hidden))
      act(() => result.current.setFilter('hide', 'hidden'))
      expect(result.current.filtered).toHaveLength(1)
      expect(result.current.filtered[0].name).toBe('Halo Infinite')
    })

    it('shows all when filter is empty', () => {
      const hidden = new Set(['Halo Infinite'])
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling, hidden))
      act(() => result.current.setFilter('hide', ''))
      expect(result.current.filtered).toHaveLength(4)
    })
  })

  describe('owned games filter', () => {
    it('shows all games when owned filter is empty', () => {
      const owned = new Set(['Cyberpunk 2077', 'Elden Ring'])
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling, new Set(), owned))
      expect(result.current.filtered).toHaveLength(4)
    })

    it('filters to owned only', () => {
      const owned = new Set(['Cyberpunk 2077', 'Elden Ring'])
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling, new Set(), owned))
      act(() => result.current.setFilter('owned', 'owned'))
      expect(result.current.filtered).toHaveLength(2)
      expect(result.current.filtered.map((g) => g.name).sort()).toEqual(['Cyberpunk 2077', 'Elden Ring'])
    })

    it('filters to not owned', () => {
      const owned = new Set(['Cyberpunk 2077', 'Elden Ring'])
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling, new Set(), owned))
      act(() => result.current.setFilter('owned', 'not'))
      expect(result.current.filtered).toHaveLength(2)
      expect(result.current.filtered.map((g) => g.name).sort()).toEqual(['Halo Infinite', 'Portal RTX'])
    })
  })

  describe('sorting', () => {
    it('defaults to steam descending', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      expect(result.current.sortCol).toBe('steam')
      expect(result.current.sortDir).toBe(-1)
    })

    it('toggles sort direction on same column', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.toggleSort('steam'))
      expect(result.current.sortDir).toBe(1)
    })

    it('resets to ascending on new column', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.toggleSort('name'))
      expect(result.current.sortCol).toBe('name')
      expect(result.current.sortDir).toBe(1)
    })

    it('sorts by name alphabetically', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.toggleSort('name'))
      expect(result.current.filtered[0].name).toBe('Cyberpunk 2077')
      expect(result.current.filtered[3].name).toBe('Portal RTX')
    })

    it('sorts null values last regardless of direction', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.toggleSort('hltb'))
      // Cyberpunk and Elden have HLTB, Halo and Portal don't
      const names = result.current.filtered.map((g) => g.name)
      expect(hltb[names[0]]).toBeDefined()
      expect(hltb[names[1]]).toBeDefined()
      // Last two should be the ones without HLTB
      expect(hltb[names[2]]).toBeUndefined()
      expect(hltb[names[3]]).toBeUndefined()
    })

    it('sorts owned bidirectionally (not null-last)', () => {
      const owned = new Set(['Cyberpunk 2077'])
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling, new Set(), owned))
      // Sort ascending — not-owned (0) first
      act(() => result.current.toggleSort('owned'))
      expect(result.current.filtered[0].name).not.toBe('Cyberpunk 2077')
      // Sort descending — owned (1) first
      act(() => result.current.toggleSort('owned'))
      expect(result.current.filtered[0].name).toBe('Cyberpunk 2077')
    })
  })

  describe('filterCounts', () => {
    it('computes framegen counts', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      expect(result.current.filterCounts.framegen['6x']).toBe(1)
      expect(result.current.filterCounts.framegen['4x']).toBe(1)
      expect(result.current.filterCounts.framegen['2x']).toBe(1)
      expect(result.current.filterCounts.framegen.any).toBe(3)
    })

    it('computes owned counts', () => {
      const owned = new Set(['Cyberpunk 2077', 'Elden Ring'])
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling, new Set(), owned))
      expect(result.current.filterCounts.owned.owned).toBe(2)
      expect(result.current.filterCounts.owned.not).toBe(2)
    })

    it('computes upscaling counts', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      expect(result.current.filterCounts.upscaling.fsr).toBe(2)
      expect(result.current.filterCounts.upscaling.xess).toBe(1)
      expect(result.current.filterCounts.upscaling.both).toBe(1)
    })
  })

  describe('dlssver filter', () => {
    it('filters 4.5+ (ver >= 5)', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('dlssver', '4.5+'))
      expect(result.current.filtered).toHaveLength(1)
      expect(result.current.filtered[0].name).toBe('Cyberpunk 2077')
    })

    it('filters 4+ (ver >= 4)', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('dlssver', '4+'))
      expect(result.current.filtered).toHaveLength(2) // Cyberpunk (5) + Portal (4)
    })

    it('filters 3+ (ver >= 2)', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('dlssver', '3+'))
      expect(result.current.filtered).toHaveLength(3) // Cyberpunk, Portal, Elden Ring
    })
  })

  describe('sr filter', () => {
    it('filters NV, T only', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('sr', 'NV, T'))
      expect(result.current.filtered).toHaveLength(2) // Cyberpunk, Portal
    })

    it('filters any SR', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('sr', 'any'))
      expect(result.current.filtered).toHaveLength(4) // All 4 games have SR
    })

    it('filters none SR', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('sr', 'none'))
      expect(result.current.filtered).toHaveLength(0) // All 4 games have SR
    })
  })

  describe('rr filter', () => {
    it('filters any ray reconstruction', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('rr', 'any'))
      expect(result.current.filtered).toHaveLength(1) // Only Cyberpunk has RR
    })
  })

  describe('dlaa filter', () => {
    it('filters any DLAA', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('dlaa', 'any'))
      expect(result.current.filtered).toHaveLength(1) // Only Cyberpunk has DLAA
    })
  })

  describe('upscaling filter extended', () => {
    it('filters XeSS only', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('upscaling', 'xess'))
      expect(result.current.filtered).toHaveLength(1) // Only Cyberpunk has XeSS
    })

    it('filters any upscaling', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('upscaling', 'any'))
      expect(result.current.filtered).toHaveLength(2) // Cyberpunk + Elden
    })

    it('filters no upscaling', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('upscaling', 'none'))
      expect(result.current.filtered).toHaveLength(2) // Halo + Portal
    })
  })

  describe('steam filter extended', () => {
    it('filters Overwhelmingly Positive+', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('steam', 'op+'))
      expect(result.current.filtered).toHaveLength(0) // None are OP
    })

    it('filters negative only (Mixed=3 is included)', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('steam', 'neg'))
      expect(result.current.filtered).toHaveLength(1) // Halo (Mixed, order=3)
      expect(result.current.filtered[0].name).toBe('Halo Infinite')
    })

    it('filters unknown steam rating (sr === -1)', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('steam', 'unk'))
      // Portal RTX has no steam entry → sr = -1 → passes unk filter
      expect(result.current.filtered).toHaveLength(1)
      expect(result.current.filtered[0].name).toBe('Portal RTX')
    })
  })

  describe('hltb filter', () => {
    it('filters under 10 hours', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('hltb', 'u10'))
      expect(result.current.filtered).toHaveLength(0) // Cyberpunk avg ~62, Elden avg ~100
    })

    it('filters under 60 hours', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('hltb', 'u60'))
      expect(result.current.filtered).toHaveLength(0) // Cyberpunk avg=61.67, Elden=100
    })

    it('filters under 100 hours', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('hltb', 'u100'))
      expect(result.current.filtered).toHaveLength(1) // Cyberpunk avg ~61.67
    })

    it('filters 100+ hours', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('hltb', '100+'))
      expect(result.current.filtered).toHaveLength(1) // Elden avg=100
    })

    it('filters unknown playtime', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('hltb', 'unk'))
      expect(result.current.filtered).toHaveLength(2) // Halo + Portal
    })
  })

  describe('metacritic filter extended', () => {
    it('filters unknown metacritic', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('metacritic', 'unk'))
      expect(result.current.filtered).toHaveLength(1) // Halo has no metacritic
    })
  })

  describe('sorting extended', () => {
    it('sorts by dlssver', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.toggleSort('dlssver'))
      const names = result.current.filtered.map((g) => g.name)
      expect(names[0]).toBe('Halo Infinite') // ver 1 (ascending)
    })

    it('sorts by metacritic with nulls last', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.toggleSort('metacritic'))
      const names = result.current.filtered.map((g) => g.name)
      expect(names[3]).toBe('Halo Infinite') // No metacritic → last
    })

    it('sorts by upscaling with nulls last', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.toggleSort('upscaling'))
      const names = result.current.filtered.map((g) => g.name)
      expect(upscaling[names[3]]).toBeUndefined() // No upscaling → last
    })

    it('sorts by framegen with nulls last', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.toggleSort('framegen'))
      const last = result.current.filtered[3].name
      expect(last).toBe('Halo Infinite') // No frame gen
    })

    it('sorts by rt with nulls last', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.toggleSort('rt'))
      const last = result.current.filtered[3].name
      expect(last).toBe('Halo Infinite') // No RT
    })
  })

  describe('URL hash persistence', () => {
    it('updates hash when filter is set', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('search', 'cyber'))
      expect(window.location.hash).toContain('search=cyber')
    })

    it('clears hash when filters are cleared', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('search', 'cyber'))
      act(() => result.current.clearFilters())
      expect(window.location.hash).toBe('')
    })
  })

  describe('sorting sr/rr/dlaa/hide columns', () => {
    it('sorts by sr ascending — NV,T games first', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.toggleSort('sr'))
      // FEATURE_ORDER: NV,T=3, Yes=1 — ascending: Yes first, NV,T last (among non-null)
      // All 4 games have SR so no nulls
      const names = result.current.filtered.map((g) => g.name)
      expect(names.length).toBe(4)
    })

    it('sorts by rr with nulls last', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.toggleSort('rr'))
      const names = result.current.filtered.map((g) => g.name)
      // Cyberpunk has RR, others don't — nulls last
      expect(names[0]).toBe('Cyberpunk 2077')
      expect(names.slice(1)).not.toContain('Cyberpunk 2077')
    })

    it('sorts by dlaa with nulls last', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.toggleSort('dlaa'))
      // Only Cyberpunk has DLAA — should be first ascending
      expect(result.current.filtered[0].name).toBe('Cyberpunk 2077')
    })

    it('sorts by hide column', () => {
      const hidden = new Set(['Cyberpunk 2077'])
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling, hidden))
      act(() => result.current.setFilter('hide', 'all'))
      act(() => result.current.toggleSort('hide'))
      // Ascending: non-hidden (0) first
      expect(result.current.filtered[0].name).not.toBe('Cyberpunk 2077')
    })
  })

  describe('filterCounts extended', () => {
    it('computes steam counts', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      expect(result.current.filterCounts.steam['vp+']).toBeGreaterThan(0)
      expect(result.current.filterCounts.steam['nos']).toBe(1) // Portal has no steam
    })

    it('computes hltb counts', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      expect(result.current.filterCounts.hltb.unk).toBe(2) // Halo + Portal
    })

    it('computes hide counts', () => {
      const hidden = new Set(['Cyberpunk 2077'])
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling, hidden))
      expect(result.current.filterCounts.hide.hidden).toBe(1)
      expect(result.current.filterCounts.hide.all).toBe(4)
    })

    it('computes metacritic counts', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      expect(result.current.filterCounts.metacritic['90+']).toBe(1) // Elden Ring (96)
      expect(result.current.filterCounts.metacritic['75+']).toBe(3) // Cyberpunk(86), Elden(96), Portal(75)
    })

    it('computes rt counts', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      expect(result.current.filterCounts.rt['Path Tracing']).toBe(2) // Cyberpunk + Portal
      expect(result.current.filterCounts.rt['Yes']).toBe(1) // Elden Ring
      expect(result.current.filterCounts.rt['any']).toBe(3)
    })

    it('computes dlaa and sr counts', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      expect(result.current.filterCounts.dlaa.any).toBe(1) // Only Cyberpunk
      expect(result.current.filterCounts.sr['NV, T']).toBe(2) // Cyberpunk + Portal
      expect(result.current.filterCounts.sr.Yes).toBe(2) // Elden + Halo
    })
  })

  describe('upscaling filter both', () => {
    it('filters both FSR and XeSS', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('upscaling', 'both'))
      expect(result.current.filtered).toHaveLength(1) // Only Cyberpunk has both
      expect(result.current.filtered[0].name).toBe('Cyberpunk 2077')
    })
  })

  describe('URL hash loading on mount', () => {
    it('loads filters from hash on mount', () => {
      storage.clear()
      window.location.hash = '#search=portal'
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      expect(result.current.filters.search).toBe('portal')
      window.location.hash = ''
    })

    it('ignores unknown hash keys', () => {
      storage.clear()
      window.location.hash = '#unknown=value'
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      expect(result.current.filters.search).toBe('')
      window.location.hash = ''
    })

    it('loads filters from localStorage when no hash', () => {
      storage.set('dlssdb-filters', JSON.stringify({ search: 'elden', framegen: '' }))
      window.location.hash = ''
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      expect(result.current.filters.search).toBe('elden')
    })
  })

  describe('clearFilters', () => {
    it('resets all filters', () => {
      const { result } = renderHook(() => useFilters(games, hltb, steam, metacritic, upscaling))
      act(() => result.current.setFilter('search', 'cyber'))
      expect(result.current.filtered).toHaveLength(1)
      act(() => result.current.clearFilters())
      expect(result.current.filtered).toHaveLength(4)
      expect(result.current.filters.search).toBe('')
    })
  })
})
