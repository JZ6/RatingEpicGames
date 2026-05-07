import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SteamBadge, MetacriticBadge, UserScoreBadge, HltbBadge, EpicDateBadge, EpicRatingBadge, HideBadge, PlatformBadge, OwnedBadge } from '../Badge'

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

  it('formats total >= 1K', () => {
    render(<SteamBadge info={{ rating: 'Very Positive', pct: 90, total: 1000 }} />)
    expect(screen.getByText('Very Positive').getAttribute('data-tip')).toBe('1K reviews')
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

describe('MetacriticBadge', () => {
  it('shows score with mc-good class for 75+', () => {
    const { container } = render(<MetacriticBadge info={{ score: 85 }} />)
    expect(screen.getByText('85')).toBeInTheDocument()
    expect(container.querySelector('.mc-good')).toBeInTheDocument()
  })

  it('shows mc-mixed for 50-74', () => {
    const { container } = render(<MetacriticBadge info={{ score: 60 }} />)
    expect(container.querySelector('.mc-mixed')).toBeInTheDocument()
  })

  it('shows mc-bad for below 50', () => {
    const { container } = render(<MetacriticBadge info={{ score: 30 }} />)
    expect(container.querySelector('.mc-bad')).toBeInTheDocument()
  })

  it('shows dash for no data', () => {
    render(<MetacriticBadge info={undefined} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows dash when score is undefined', () => {
    render(<MetacriticBadge info={{ slug: 'test' }} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('UserScoreBadge', () => {
  it('shows score with one decimal', () => {
    render(<UserScoreBadge info={{ score: 85, user_score: 8.6 }} />)
    expect(screen.getByText('8.6')).toBeInTheDocument()
  })

  it('shows mc-good for 7.5+', () => {
    const { container } = render(<UserScoreBadge info={{ user_score: 8.0 }} />)
    expect(container.querySelector('.mc-good')).toBeInTheDocument()
  })

  it('shows mc-mixed for 5-7.4', () => {
    const { container } = render(<UserScoreBadge info={{ user_score: 6.0 }} />)
    expect(container.querySelector('.mc-mixed')).toBeInTheDocument()
  })

  it('shows mc-bad for below 5', () => {
    const { container } = render(<UserScoreBadge info={{ user_score: 3.0 }} />)
    expect(container.querySelector('.mc-bad')).toBeInTheDocument()
  })

  it('shows dash for no data', () => {
    render(<UserScoreBadge info={undefined} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('EpicDateBadge', () => {
  it('shows formatted date', () => {
    render(<EpicDateBadge info={{ slug: 'test', free_dates: [{ start: '2023-06-15', end: '' }] }} />)
    expect(screen.getByText(/Jun/)).toBeInTheDocument()
    expect(screen.getByText(/2023/)).toBeInTheDocument()
  })

  it('shows multiplier for multiple dates', () => {
    render(<EpicDateBadge info={{ slug: 'test', free_dates: [
      { start: '2020-01-01', end: '' },
      { start: '2023-06-15', end: '' },
    ] }} />)
    expect(screen.getByText('×2')).toBeInTheDocument()
  })

  it('shows dash for no dates', () => {
    render(<EpicDateBadge info={undefined} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows dash for empty dates', () => {
    render(<EpicDateBadge info={{ slug: 'test', free_dates: [] }} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('HltbBadge', () => {
  it('shows average hours', () => {
    render(<HltbBadge data={{ main: 26.7, extra: 45.2, complete: 72 }} />)
    expect(screen.getByText(/48/)).toBeInTheDocument()
    expect(screen.getByText(/hours/)).toBeInTheDocument()
  })

  it('shows tooltip with breakdown', () => {
    const { container } = render(<HltbBadge data={{ main: 10, extra: 20, complete: 40 }} />)
    const cell = container.querySelector('.hltb-cell')
    expect(cell?.getAttribute('data-tip')).toContain('Main Story: 10h')
    expect(cell?.getAttribute('data-tip')).toContain('Completionist: 40h')
  })

  it('shows dash for no data', () => {
    render(<HltbBadge data={undefined} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('applies green color for short games', () => {
    const { container } = render(<HltbBadge data={{ main: 5 }} />)
    const span = container.querySelector('.hltb-main')
    expect(span?.getAttribute('style')).toMatch(/rgb\(\d+, 220, 68\)/)
  })

  it('applies red color for long games', () => {
    const { container } = render(<HltbBadge data={{ main: 250 }} />)
    const span = container.querySelector('.hltb-main')
    expect(span?.getAttribute('style')).toMatch(/rgb\(220, \d+, 68\)/)
  })
})

describe('EpicRatingBadge', () => {
  it('shows er-great for 4.5+', () => {
    const { container } = render(<EpicRatingBadge info={{ slug: 't', free_dates: [], epic_rating: 4.8 }} />)
    expect(container.querySelector('.er-great')).toBeInTheDocument()
    expect(screen.getByText('4.8')).toBeInTheDocument()
  })

  it('shows er-good for 3.5-4.4', () => {
    const { container } = render(<EpicRatingBadge info={{ slug: 't', free_dates: [], epic_rating: 4.0 }} />)
    expect(container.querySelector('.er-good')).toBeInTheDocument()
  })

  it('shows er-mixed for 2.5-3.4', () => {
    const { container } = render(<EpicRatingBadge info={{ slug: 't', free_dates: [], epic_rating: 3.0 }} />)
    expect(container.querySelector('.er-mixed')).toBeInTheDocument()
  })

  it('shows er-bad for below 2.5', () => {
    const { container } = render(<EpicRatingBadge info={{ slug: 't', free_dates: [], epic_rating: 2.0 }} />)
    expect(container.querySelector('.er-bad')).toBeInTheDocument()
  })

  it('shows dash when no data', () => {
    render(<EpicRatingBadge info={undefined} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('HideBadge', () => {
  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn()
    render(<HideBadge hidden={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('shows "Hide game" title when visible', () => {
    render(<HideBadge hidden={false} onToggle={() => {}} />)
    expect(screen.getByTitle('Hide game')).toBeInTheDocument()
  })

  it('shows "Unhide game" title when hidden', () => {
    render(<HideBadge hidden={true} onToggle={() => {}} />)
    expect(screen.getByTitle('Unhide game')).toBeInTheDocument()
  })

  it('has hide-btn-hidden class when hidden', () => {
    const { container } = render(<HideBadge hidden={true} onToggle={() => {}} />)
    expect(container.querySelector('.hide-btn-hidden')).toBeInTheDocument()
  })
})

describe('PlatformBadge', () => {
  it('shows PC by default', () => {
    render(<PlatformBadge info={{ slug: 't', free_dates: [] }} />)
    expect(screen.getByText('PC')).toBeInTheDocument()
  })

  it('shows multiple platforms', () => {
    render(<PlatformBadge info={{ slug: 't', free_dates: [], platforms: ['pc', 'ios'] }} />)
    expect(screen.getByText('PC')).toBeInTheDocument()
    expect(screen.getByText('iOS')).toBeInTheDocument()
  })

  it('shows raw value for unknown platform', () => {
    render(<PlatformBadge info={{ slug: 't', free_dates: [], platforms: ['switch'] }} />)
    expect(screen.getByText('switch')).toBeInTheDocument()
  })
})

describe('OwnedBadge', () => {
  it('shows Owned badge when owned', () => {
    render(<OwnedBadge owned={true} />)
    expect(screen.getByText('Owned')).toBeInTheDocument()
  })

  it('shows dash when not owned', () => {
    render(<OwnedBadge owned={false} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
