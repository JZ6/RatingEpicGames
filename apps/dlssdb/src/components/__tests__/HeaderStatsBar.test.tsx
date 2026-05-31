import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from '@shared/components/Header'
import { StatsBar } from '@shared/components/StatsBar'
import { ColumnToggle } from '@shared/components/ColumnToggle'

const TITLE = 'DLSSdb'
const SUBTITLE = 'Every DLSS game. Reviews. Playtime. All in one place.'

describe('Header', () => {
  it('renders title', () => {
    render(<Header title={TITLE} subtitle={SUBTITLE} />)
    expect(screen.getByText(TITLE)).toBeInTheDocument()
  })

  it('renders subtitle', () => {
    render(<Header title={TITLE} subtitle={SUBTITLE} />)
    expect(screen.getByText(/Every DLSS game/)).toBeInTheDocument()
  })

  it('shows action buttons when all props provided', () => {
    render(
      <Header
        title={TITLE} subtitle={SUBTITLE}
        columns={[{ key: 'name', label: 'Game' }]}
        visibleCols={new Set(['name'])}
        onToggleCol={() => {}}
        onClearFilters={() => {}}
      />
    )
    expect(screen.getByText('Clear Filters')).toBeInTheDocument()
  })

  it('hides actions when props are missing', () => {
    render(<Header title={TITLE} subtitle={SUBTITLE} />)
    expect(screen.queryByText('Clear Filters')).not.toBeInTheDocument()
  })

  it('shows Import Library button when onImportLibrary provided', () => {
    render(
      <Header
        title={TITLE} subtitle={SUBTITLE}
        columns={[{ key: 'name', label: 'Game' }]}
        visibleCols={new Set(['name'])}
        onToggleCol={() => {}}
        onClearFilters={() => {}}
        onImportLibrary={() => {}}
      />
    )
    expect(screen.getByText('Import Library')).toBeInTheDocument()
  })

  it('shows owned count badge', () => {
    render(
      <Header
        title={TITLE} subtitle={SUBTITLE}
        columns={[{ key: 'name', label: 'Game' }]}
        visibleCols={new Set(['name'])}
        onToggleCol={() => {}}
        onClearFilters={() => {}}
        onImportLibrary={() => {}}
        ownedCount={42}
      />
    )
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('does not show badge when ownedCount is 0', () => {
    render(
      <Header
        title={TITLE} subtitle={SUBTITLE}
        columns={[{ key: 'name', label: 'Game' }]}
        visibleCols={new Set(['name'])}
        onToggleCol={() => {}}
        onClearFilters={() => {}}
        onImportLibrary={() => {}}
        ownedCount={0}
      />
    )
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('calls onImportLibrary when button clicked', () => {
    const onImport = vi.fn()
    render(
      <Header
        title={TITLE} subtitle={SUBTITLE}
        columns={[{ key: 'name', label: 'Game' }]}
        visibleCols={new Set(['name'])}
        onToggleCol={() => {}}
        onClearFilters={() => {}}
        onImportLibrary={onImport}
      />
    )
    fireEvent.click(screen.getByText('Import Library'))
    expect(onImport).toHaveBeenCalled()
  })

  it('calls onClearFilters when button clicked', () => {
    const onClear = vi.fn()
    render(
      <Header
        title={TITLE} subtitle={SUBTITLE}
        columns={[{ key: 'name', label: 'Game' }]}
        visibleCols={new Set(['name'])}
        onToggleCol={() => {}}
        onClearFilters={onClear}
      />
    )
    fireEvent.click(screen.getByText('Clear Filters'))
    expect(onClear).toHaveBeenCalled()
  })
})

describe('StatsBar', () => {
  it('shows filtered and total counts', () => {
    render(<StatsBar filteredCount={2} total={10} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText(/Showing/)).toBeInTheDocument()
  })

  it('shows copyright year', () => {
    render(<StatsBar filteredCount={0} total={0} />)
    expect(screen.getByText(new RegExp(String(new Date().getFullYear())))).toBeInTheDocument()
  })
})

describe('ColumnToggle', () => {
  const columns = [
    { key: 'name', label: 'Game' },
    { key: 'steam', label: 'Steam Rating' },
    { key: 'hltb', label: 'Playtime' },
  ]

  it('shows Columns button', () => {
    render(<ColumnToggle columns={columns} visible={new Set(['name', 'steam', 'hltb'])} onToggle={() => {}} />)
    expect(screen.getByText('Columns')).toBeInTheDocument()
  })

  it('shows hidden count badge', () => {
    render(<ColumnToggle columns={columns} visible={new Set(['name'])} onToggle={() => {}} />)
    expect(screen.getByText('2 hidden')).toBeInTheDocument()
  })

  it('opens dropdown on click', () => {
    render(<ColumnToggle columns={columns} visible={new Set(['name', 'steam'])} onToggle={() => {}} />)
    fireEvent.click(screen.getByText('Columns'))
    expect(screen.getByText('Game')).toBeInTheDocument()
    expect(screen.getByText('Steam Rating')).toBeInTheDocument()
    expect(screen.getByText('Playtime')).toBeInTheDocument()
  })

  it('calls onToggle when checkbox clicked', () => {
    const onToggle = vi.fn()
    render(<ColumnToggle columns={columns} visible={new Set(['name', 'steam'])} onToggle={onToggle} />)
    fireEvent.click(screen.getByText('Columns'))
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[2])
    expect(onToggle).toHaveBeenCalledWith('hltb')
  })

  it('disables name column checkbox', () => {
    render(<ColumnToggle columns={columns} visible={new Set(['name', 'steam'])} onToggle={() => {}} />)
    fireEvent.click(screen.getByText('Columns'))
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0]).toBeDisabled()
  })

  it('closes dropdown on Escape', () => {
    render(<ColumnToggle columns={columns} visible={new Set(['name', 'steam'])} onToggle={() => {}} />)
    fireEvent.click(screen.getByText('Columns'))
    expect(screen.getByText('Steam Rating')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Steam Rating')).not.toBeInTheDocument()
  })

  it('closes dropdown on outside click', () => {
    render(<ColumnToggle columns={columns} visible={new Set(['name', 'steam'])} onToggle={() => {}} />)
    fireEvent.click(screen.getByText('Columns'))
    expect(screen.getByText('Steam Rating')).toBeInTheDocument()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByText('Steam Rating')).not.toBeInTheDocument()
  })

  it('toggles dropdown closed on second click', () => {
    render(<ColumnToggle columns={columns} visible={new Set(['name', 'steam'])} onToggle={() => {}} />)
    fireEvent.click(screen.getByText('Columns'))
    expect(screen.getByText('Steam Rating')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Columns'))
    expect(screen.queryByText('Steam Rating')).not.toBeInTheDocument()
  })

  it('shows no hidden badge when all columns visible', () => {
    render(<ColumnToggle columns={columns} visible={new Set(['name', 'steam', 'hltb'])} onToggle={() => {}} />)
    expect(screen.queryByText(/hidden/)).not.toBeInTheDocument()
  })
})
