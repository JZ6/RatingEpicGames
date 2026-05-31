import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useGameData } from '../useGameData'

const dlssData = {
  data: [
    { sno: 1, name: 'Test DLSS Game', type: 'Game', 'dlss multi frame generation': '', 'dlss frame generation': 'Yes', 'dlss super resolution': 'Yes', 'dlss ray reconstruction': '', dlaa: '', 'ray tracing': 'Yes', ai: '' },
    { sno: 2, name: 'App Not Game', type: 'Application', 'dlss multi frame generation': '', 'dlss frame generation': '', 'dlss super resolution': 'Yes', 'dlss ray reconstruction': '', dlaa: '', 'ray tracing': '', ai: '' },
    { sno: 3, name: 'Another Game', type: 'Game', 'dlss multi frame generation': 'NV, 6X', 'dlss frame generation': '', 'dlss super resolution': '', 'dlss ray reconstruction': '', dlaa: '', 'ray tracing': '', ai: '' },
  ],
}

const gameData: Record<string, unknown> = {
  'Test DLSS Game': {
    steam: { found: true, appid: 100, rating: 'Very Positive', pct: 90, total: 10000, image: 'https://img.com/dlss.jpg' },
    hltb: { found: true, main: 20, extra: 30 },
    metacritic: { found: true, score: 85 },
    pcgw: { found: true, fsr_version: 'FSR 3.1', xess_version: 'XeSS 1.3' },
  },
  'Another Game': {
    steam: { found: false },
    hltb: { found: false },
    metacritic: { found: false },
    pcgw: { found: false },
    image: 'images/another.jpg',
  },
}

function mockFetchSuccess() {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
    const body = url.includes('dlss-rt') ? dlssData : gameData
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
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

  it('loads and filters to Game type only', async () => {
    mockFetchSuccess()
    const { result } = renderHook(() => useGameData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const names = result.current.games.map(g => g.name)
    expect(names).toContain('Test DLSS Game')
    expect(names).toContain('Another Game')
    expect(names).not.toContain('App Not Game')
  })

  it('extracts steam data only for found entries', async () => {
    mockFetchSuccess()
    const { result } = renderHook(() => useGameData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.steam['Test DLSS Game']).toBeDefined()
    expect(result.current.steam['Test DLSS Game'].rating).toBe('Very Positive')
    expect(result.current.steam['Another Game']).toBeUndefined()
  })

  it('extracts upscaling data from pcgw', async () => {
    mockFetchSuccess()
    const { result } = renderHook(() => useGameData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.upscaling['Test DLSS Game']).toBeDefined()
    expect(result.current.upscaling['Test DLSS Game'].fsr_version).toBe('FSR 3.1')
  })

  it('prefixes relative image paths with base URL', async () => {
    mockFetchSuccess()
    const { result } = renderHook(() => useGameData())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const img = result.current.images['Another Game']
    expect(img).toBeDefined()
    expect(img).toContain('images/another.jpg')
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
    expect(result.current.games.length).toBeGreaterThan(0)
  })
})
