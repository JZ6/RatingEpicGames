import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FrameGenBadge, FeatureBadge, SteamBadge, HltbBadge } from '../Badge'
import type { DlssGame } from '../../types'

const makeGame = (overrides: Partial<DlssGame> = {}): DlssGame => ({
  sno: 1, name: 'Test', type: 'Game',
  'dlss multi frame generation': '', 'dlss frame generation': '',
  'dlss super resolution': '', 'dlss ray reconstruction': '',
  dlaa: '', 'ray tracing': '', ai: '',
  ...overrides,
})

describe('FrameGenBadge', () => {
  it('shows 6X badge for MFG 6X', () => {
    render(<FrameGenBadge game={makeGame({ 'dlss multi frame generation': 'NV, 6X' })} />)
    expect(screen.getByText('6X')).toBeInTheDocument()
  })

  it('shows 4X badge for MFG 4X', () => {
    render(<FrameGenBadge game={makeGame({ 'dlss multi frame generation': 'NV, 4X' })} />)
    expect(screen.getByText('4X')).toBeInTheDocument()
  })

  it('shows 2X badge for legacy FG', () => {
    render(<FrameGenBadge game={makeGame({ 'dlss frame generation': 'Yes' })} />)
    expect(screen.getByText('2X')).toBeInTheDocument()
  })

  it('shows dash when no frame gen', () => {
    render(<FrameGenBadge game={makeGame()} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('FeatureBadge', () => {
  it('shows NV-T for transformer model', () => {
    render(<FeatureBadge value="NV, T" />)
    expect(screen.getByText('NV-T')).toBeInTheDocument()
  })

  it('shows NV-U for NV, U', () => {
    render(<FeatureBadge value="NV, U" />)
    expect(screen.getByText('NV-U')).toBeInTheDocument()
  })

  it('shows NV for ✓ (NV)', () => {
    render(<FeatureBadge value="✓ (NV)" />)
    expect(screen.getByText('NV')).toBeInTheDocument()
  })

  it('shows Path Tracing', () => {
    render(<FeatureBadge value="Path Tracing" />)
    expect(screen.getByText('Path Tracing')).toBeInTheDocument()
  })

  it('shows checkmark for Yes', () => {
    render(<FeatureBadge value="Yes" />)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('shows unknown value as-is with byes class', () => {
    const { container } = render(<FeatureBadge value="Custom" />)
    expect(screen.getByText('Custom')).toBeInTheDocument()
    expect(container.querySelector('.byes')).toBeInTheDocument()
  })

  it('shows dash for empty', () => {
    render(<FeatureBadge value="" />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('SteamBadge', () => {
  it('shows rating and percentage', () => {
    render(<SteamBadge info={{ rating: 'Very Positive', pct: 89 }} />)
    expect(screen.getByText('Very Positive')).toBeInTheDocument()
    expect(screen.getByText('89%')).toBeInTheDocument()
  })

  it('shows "Not On Steam" when no data', () => {
    render(<SteamBadge info={undefined} />)
    expect(screen.getByText('Not On Steam')).toBeInTheDocument()
  })

  it('shows dash when rating is undefined', () => {
    render(<SteamBadge info={{ appid: 123 }} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('hides percentage when pct is undefined', () => {
    const { container } = render(<SteamBadge info={{ rating: 'Mixed' }} />)
    expect(screen.getByText('Mixed')).toBeInTheDocument()
    expect(container.querySelector('.sp')).toBeNull()
  })

  it('formats total >= 1M', () => {
    render(<SteamBadge info={{ rating: 'Very Positive', pct: 90, total: 2000000 }} />)
    expect(screen.getByText('Very Positive').getAttribute('data-tip')).toBe('2M reviews')
  })

  it('formats total >= 1K without trailing .0', () => {
    render(<SteamBadge info={{ rating: 'Very Positive', pct: 90, total: 1000 }} />)
    expect(screen.getByText('Very Positive').getAttribute('data-tip')).toBe('1K reviews')
  })

  it('formats total with decimal K', () => {
    render(<SteamBadge info={{ rating: 'Mixed', pct: 50, total: 1500 }} />)
    expect(screen.getByText('Mixed').getAttribute('data-tip')).toBe('1.5K reviews')
  })

  it('formats total < 1000 as plain number', () => {
    render(<SteamBadge info={{ rating: 'Mixed', pct: 50, total: 42 }} />)
    expect(screen.getByText('Mixed').getAttribute('data-tip')).toBe('42 reviews')
  })

  it('has no tooltip when total is undefined', () => {
    render(<SteamBadge info={{ rating: 'Mixed', pct: 50 }} />)
    expect(screen.getByText('Mixed').getAttribute('data-tip')).toBeNull()
  })
})

describe('HltbBadge', () => {
  it('shows average of all available hours', () => {
    render(<HltbBadge data={{ main: 26.7, extra: 45.2, complete: 72 }} />)
    expect(screen.getByText(/48/)).toBeInTheDocument()
    expect(screen.getByText(/hours/)).toBeInTheDocument()
  })

  it('rounds up to avoid 0h', () => {
    render(<HltbBadge data={{ main: 0.3 }} />)
    expect(screen.getByText(/1/)).toBeInTheDocument()
    expect(screen.getByText(/hours/)).toBeInTheDocument()
  })

  it('uses single value when only extra present', () => {
    render(<HltbBadge data={{ extra: 15.1 }} />)
    expect(screen.getByText(/16/)).toBeInTheDocument()
    expect(screen.getByText(/hours/)).toBeInTheDocument()
  })

  it('shows tooltip with full breakdown', () => {
    const { container } = render(<HltbBadge data={{ main: 10, extra: 20, complete: 40 }} />)
    const cell = container.querySelector('.hltb-cell')
    expect(cell?.getAttribute('data-tip')).toContain('Main Story: 10h')
    expect(cell?.getAttribute('data-tip')).toContain('Main + Extras: 20h')
    expect(cell?.getAttribute('data-tip')).toContain('Completionist: 40h')
  })

  it('shows dash for no data', () => {
    render(<HltbBadge data={undefined} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows dash for empty object', () => {
    render(<HltbBadge data={{}} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows coop and pvp in tooltip', () => {
    const { container } = render(<HltbBadge data={{ main: 10, coop: 15, pvp: 8 }} />)
    const tip = container.querySelector('.hltb-cell')?.getAttribute('data-tip')
    expect(tip).toContain('Co-Op: 15h')
    expect(tip).toContain('PvP: 8h')
  })

  it('shows all_styles in tooltip', () => {
    const { container } = render(<HltbBadge data={{ all_styles: 25 }} />)
    const tip = container.querySelector('.hltb-cell')?.getAttribute('data-tip')
    expect(tip).toContain('All Styles: 25h')
  })

  it('applies green-ish color for short games', () => {
    const { container } = render(<HltbBadge data={{ main: 5 }} />)
    const span = container.querySelector('.hltb-main')
    expect(span?.getAttribute('style')).toMatch(/rgb\(\d+, 220, 68\)/)
  })

  it('applies red-ish color for long games', () => {
    const { container } = render(<HltbBadge data={{ main: 250 }} />)
    const span = container.querySelector('.hltb-main')
    expect(span?.getAttribute('style')).toMatch(/rgb\(220, \d+, 68\)/)
  })
})
