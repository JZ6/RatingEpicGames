import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OwnedBadge, MetacriticBadge, UpscalingBadge, DlssVersionBadge, HideBadge } from '../Badge'
import type { DlssGame } from '../../types'

const makeGame = (overrides: Partial<DlssGame> = {}): DlssGame => ({
  sno: 1, name: 'Test', type: 'Game',
  'dlss multi frame generation': '', 'dlss frame generation': '',
  'dlss super resolution': '', 'dlss ray reconstruction': '',
  dlaa: '', 'ray tracing': '', ai: '',
  ...overrides,
})

describe('OwnedBadge', () => {
  it('shows Owned badge when owned', () => {
    render(<OwnedBadge owned={true} />)
    expect(screen.getByText('Owned')).toBeInTheDocument()
    expect(screen.getByText('Owned')).toHaveClass('badge', 'byes')
  })

  it('shows dash when not owned', () => {
    render(<OwnedBadge owned={false} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('MetacriticBadge', () => {
  it('shows green for score >= 75', () => {
    const { container } = render(<MetacriticBadge info={{ score: 86 }} />)
    expect(screen.getByText('86')).toBeInTheDocument()
    expect(container.querySelector('.mc-good')).toBeInTheDocument()
  })

  it('shows yellow for score 50-74', () => {
    const { container } = render(<MetacriticBadge info={{ score: 60 }} />)
    expect(container.querySelector('.mc-mixed')).toBeInTheDocument()
  })

  it('shows red for score < 50', () => {
    const { container } = render(<MetacriticBadge info={{ score: 30 }} />)
    expect(container.querySelector('.mc-bad')).toBeInTheDocument()
  })

  it('shows dash when no data', () => {
    render(<MetacriticBadge info={undefined} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('UpscalingBadge', () => {
  it('shows FSR badge', () => {
    render(<UpscalingBadge info={{ fsr_version: 'FSR 2.1' }} />)
    expect(screen.getByText('FSR')).toBeInTheDocument()
  })

  it('shows XeSS badge', () => {
    render(<UpscalingBadge info={{ xess_version: 'XeSS 1.1' }} />)
    expect(screen.getByText('XeSS')).toBeInTheDocument()
  })

  it('shows both badges', () => {
    render(<UpscalingBadge info={{ fsr_version: 'FSR 2.1', xess_version: 'XeSS 1.1' }} />)
    expect(screen.getByText('FSR')).toBeInTheDocument()
    expect(screen.getByText('XeSS')).toBeInTheDocument()
  })

  it('shows version in tooltip', () => {
    render(<UpscalingBadge info={{ fsr_version: 'FSR 2.1' }} />)
    expect(screen.getByText('FSR').getAttribute('data-tip')).toBe('FSR 2.1')
  })

  it('shows dash when no data', () => {
    render(<UpscalingBadge info={undefined} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows dash for empty info', () => {
    render(<UpscalingBadge info={{}} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('DlssVersionBadge', () => {
  it('shows 4.5 for MFG 6X', () => {
    render(<DlssVersionBadge game={makeGame({ 'dlss multi frame generation': 'NV, 6X' })} />)
    expect(screen.getByText('4.5')).toBeInTheDocument()
  })

  it('shows 4 for MFG 4X', () => {
    render(<DlssVersionBadge game={makeGame({ 'dlss multi frame generation': 'NV, 4X' })} />)
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('shows 3.5 for ray reconstruction', () => {
    render(<DlssVersionBadge game={makeGame({ 'dlss ray reconstruction': 'Yes' })} />)
    expect(screen.getByText('3.5')).toBeInTheDocument()
  })

  it('shows 3 for frame gen only', () => {
    render(<DlssVersionBadge game={makeGame({ 'dlss frame generation': 'Yes' })} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows 2 for super resolution only', () => {
    render(<DlssVersionBadge game={makeGame({ 'dlss super resolution': 'Yes' })} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows 1 for no features', () => {
    render(<DlssVersionBadge game={makeGame()} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})

describe('HideBadge', () => {
  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn()
    render(<HideBadge hidden={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('shows correct title for visible game', () => {
    render(<HideBadge hidden={false} onToggle={() => {}} />)
    expect(screen.getByTitle('Hide game')).toBeInTheDocument()
  })

  it('shows correct title for hidden game', () => {
    render(<HideBadge hidden={true} onToggle={() => {}} />)
    expect(screen.getByTitle('Unhide game')).toBeInTheDocument()
  })

  it('has hidden class when hidden', () => {
    const { container } = render(<HideBadge hidden={true} onToggle={() => {}} />)
    expect(container.querySelector('.hide-btn-hidden')).toBeInTheDocument()
  })
})
