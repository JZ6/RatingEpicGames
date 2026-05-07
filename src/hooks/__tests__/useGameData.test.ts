import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useGameData } from '../useGameData'

const mockData: Record<string, unknown> = {
  'Test Game': {
    steam: { found: true, appid: 123, rating: 'Very Positive', pct: 85, total: 5000, image: 'https://img.com/test.jpg' },
    hltb: { found: true, main: 10, extra: 15 },
    metacritic: { found: true, score: 80, user_score: 7.5 },
    epic: { slug: 'test-game', free_dates: [{ start: '2023-06-15', end: '' }, { start: '2021-01-01', end: '' }] },
  },
  'No Steam': {
    steam: { found: false },
    hltb: { found: true, main: 5 },
    metacritic: { found: false },
    epic: { slug: 'no-steam', free_dates: [{ start: '2022-01-01', end: '' }] },
  },
  'Bare Game': {},
}

function mockFetchSuccess() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockData),
  }))
}

function mockFetchFailure() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: false,
    json: () => Promise.resolve({}),
  }))
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('useGameData', () => {
  it('starts in loading state', () => {
    mockFetchSuccess()
    const { result } = renderHook(() => useGameData())
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('loads and transforms game data', async () => {
    mockFetchSuccess()
    const { result } = renderHook(() => useGameData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.games).toHaveLength(3)
    expect(result.current.games.map(g => g.name)).toContain('Test Game')
    expect(result.current.games.map(g => g.name)).toContain('No Steam')
    expect(result.current.games.map(g => g.name)).toContain('Bare Game')
  })

  it('extracts steam data only for found entries', async () => {
    mockFetchSuccess()
    const { result } = renderHook(() => useGameData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.steam['Test Game']).toBeDefined()
    expect(result.current.steam['Test Game'].rating).toBe('Very Positive')
    expect(result.current.steam['No Steam']).toBeUndefined()
  })

  it('extracts hltb data only for found entries', async () => {
    mockFetchSuccess()
    const { result } = renderHook(() => useGameData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.hltb['Test Game']).toBeDefined()
    expect(result.current.hltb['Test Game'].main).toBe(10)
    expect(result.current.hltb['No Steam']).toBeDefined()
  })

  it('extracts metacritic data only for found entries', async () => {
    mockFetchSuccess()
    const { result } = renderHook(() => useGameData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.metacritic['Test Game']).toBeDefined()
    expect(result.current.metacritic['No Steam']).toBeUndefined()
  })

  it('extracts images from steam data', async () => {
    mockFetchSuccess()
    const { result } = renderHook(() => useGameData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.images['Test Game']).toBe('https://img.com/test.jpg')
  })

  it('sorts free_dates by start', async () => {
    mockFetchSuccess()
    const { result } = renderHook(() => useGameData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const dates = result.current.epic['Test Game'].free_dates
    expect(dates[0].start).toBe('2021-01-01')
    expect(dates[1].start).toBe('2023-06-15')
  })

  it('sets error on fetch failure', async () => {
    mockFetchFailure()
    const { result } = renderHook(() => useGameData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeTruthy()
    expect(result.current.games).toHaveLength(0)
  })

  it('retries on retry call', async () => {
    mockFetchFailure()
    const { result } = renderHook(() => useGameData())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()

    mockFetchSuccess()
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.games).toHaveLength(3)
  })
})
