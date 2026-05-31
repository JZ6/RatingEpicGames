import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { normalize, dice, matchGames, splitCSVLine, parseCSV, ImportModal } from '../ImportModal'

// --- Unit tests for pure functions ---

describe('normalize', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalize('Cyberpunk 2077')).toBe('cyberpunk 2077')
  })

  it('strips colons, apostrophes, hyphens', () => {
    expect(normalize("Hitman: World of Assassination")).toBe('hitman world of assassination')
  })

  it('collapses whitespace', () => {
    expect(normalize('  The   Elder   Scrolls  ')).toBe('the elder scrolls')
  })

  it('strips unicode punctuation', () => {
    expect(normalize('DEADCAM | ANALOG • SURVIVAL')).toBe('deadcam analog survival')
  })

  it('returns empty for blank input', () => {
    expect(normalize('')).toBe('')
    expect(normalize('   ')).toBe('')
  })
})

describe('dice', () => {
  it('returns 1 for identical strings', () => {
    expect(dice('cyberpunk', 'cyberpunk')).toBe(1)
  })

  it('returns 1 for two empty strings', () => {
    expect(dice('', '')).toBe(1)
  })

  it('returns 0 when one is empty', () => {
    expect(dice('abc', '')).toBe(0)
    expect(dice('', 'abc')).toBe(0)
  })

  it('returns high score for similar strings', () => {
    expect(dice('cyberpunk 2077', 'cyberpunk2077')).toBeGreaterThan(0.8)
  })

  it('returns low score for dissimilar strings', () => {
    expect(dice('spongebob cosmic shake', 'titans of the tide')).toBeLessThan(0.3)
  })

  it('returns moderate score for partially similar strings', () => {
    const score = dice('halo infinite', 'halo')
    expect(score).toBeGreaterThan(0.3)
    expect(score).toBeLessThan(0.8)
  })
})

describe('splitCSVLine', () => {
  it('splits by comma', () => {
    expect(splitCSVLine('a,b,c', ',')).toEqual(['a', 'b', 'c'])
  })

  it('splits by semicolon', () => {
    expect(splitCSVLine('a;b;c', ';')).toEqual(['a', 'b', 'c'])
  })

  it('handles quoted fields with commas', () => {
    expect(splitCSVLine('"Hitman, World",Steam,2023', ',')).toEqual(['Hitman, World', 'Steam', '2023'])
  })

  it('handles escaped quotes (doubled)', () => {
    expect(splitCSVLine('"He said ""hello""",val', ',')).toEqual(['He said "hello"', 'val'])
  })

  it('trims whitespace', () => {
    expect(splitCSVLine(' a , b , c ', ',')).toEqual(['a', 'b', 'c'])
  })

  it('handles empty fields', () => {
    expect(splitCSVLine('a,,c', ',')).toEqual(['a', '', 'c'])
  })
})

describe('parseCSV', () => {
  it('returns empty for blank input', () => {
    expect(parseCSV('')).toEqual([])
    expect(parseCSV('\n\n')).toEqual([])
  })

  it('parses simple name list (no header)', () => {
    expect(parseCSV('Cyberpunk 2077\nElden Ring\nHalo Infinite')).toEqual([
      'Cyberpunk 2077', 'Elden Ring', 'Halo Infinite',
    ])
  })

  it('detects and skips header row with Name column', () => {
    const csv = 'Name;Platform;Source\nCyberpunk 2077;Steam;Store\nElden Ring;Steam;Key'
    expect(parseCSV(csv)).toEqual(['Cyberpunk 2077', 'Elden Ring'])
  })

  it('uses Name column index when not first', () => {
    const csv = 'Id,Name,Platform\n1,Cyberpunk 2077,Steam\n2,Elden Ring,Steam'
    expect(parseCSV(csv)).toEqual(['Cyberpunk 2077', 'Elden Ring'])
  })

  it('handles semicolon delimiter', () => {
    const csv = 'Name;Platform\nCyberpunk 2077;Steam'
    expect(parseCSV(csv)).toEqual(['Cyberpunk 2077'])
  })

  it('handles quoted fields with delimiter inside', () => {
    const csv = 'Name,Platform\n"Hitman: World of Assassination, Complete",Steam'
    expect(parseCSV(csv)).toEqual(['Hitman: World of Assassination, Complete'])
  })

  it('handles Windows line endings', () => {
    expect(parseCSV('Game A\r\nGame B\r\nGame C')).toEqual(['Game A', 'Game B', 'Game C'])
  })

  it('skips empty lines', () => {
    expect(parseCSV('Game A\n\n\nGame B')).toEqual(['Game A', 'Game B'])
  })
})

describe('matchGames', () => {
  const gameNames = [
    'Cyberpunk 2077',
    'Elden Ring',
    'Halo Infinite',
    "Baldur's Gate 3",
    'The Witcher 3: Wild Hunt',
    'Titans of the Tide',
  ]

  it('matches exact names', () => {
    const { matched } = matchGames(['Cyberpunk 2077', 'Elden Ring'], gameNames)
    expect(matched.has('Cyberpunk 2077')).toBe(true)
    expect(matched.has('Elden Ring')).toBe(true)
    expect(matched.size).toBe(2)
  })

  it('matches case-insensitively', () => {
    const { matched } = matchGames(['CYBERPUNK 2077', 'elden ring'], gameNames)
    expect(matched.has('Cyberpunk 2077')).toBe(true)
    expect(matched.has('Elden Ring')).toBe(true)
  })

  it('matches ignoring punctuation', () => {
    const { matched } = matchGames(["Baldurs Gate 3"], gameNames)
    expect(matched.has("Baldur's Gate 3")).toBe(true)
  })

  it('matches by containment with length check', () => {
    const { matched } = matchGames(['The Witcher 3'], gameNames)
    expect(matched.has('The Witcher 3: Wild Hunt')).toBe(true)
  })

  it('does NOT match short substring against long name', () => {
    // "Halo" is too short relative to "Halo Infinite" (4/13 < 0.5)
    const { matched } = matchGames(['Halo'], gameNames)
    expect(matched.has('Halo Infinite')).toBe(false)
  })

  it('does NOT match dissimilar names via dice', () => {
    // This was the SpongeBob/Titans bug
    const { matched } = matchGames(['SpongeBob SquarePants: The Cosmic Shake'], gameNames)
    expect(matched.has('Titans of the Tide')).toBe(false)
    expect(matched.size).toBe(0)
  })

  it('reports correct total excluding blank entries', () => {
    const { total } = matchGames(['Cyberpunk 2077', '', '  ', 'Unknown Game'], gameNames)
    expect(total).toBe(2) // Cyberpunk + Unknown (blanks excluded)
  })

  it('handles empty input', () => {
    const { matched, total } = matchGames([], gameNames)
    expect(matched.size).toBe(0)
    expect(total).toBe(0)
  })
})

// --- Component tests ---

describe('ImportModal component', () => {
  const gameNames = ['Cyberpunk 2077', 'Elden Ring', 'Halo Infinite']
  const defaultProps = {
    gameNames,
    ownedCount: 0,
    onImport: vi.fn(),
    onClear: vi.fn(),
    onClose: vi.fn(),
  }

  it('renders modal with textarea and buttons', () => {
    render(<ImportModal {...defaultProps} />)
    expect(screen.getByText('Import Game Library')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Name;Platform/)).toBeInTheDocument()
    expect(screen.getByText('Upload File')).toBeInTheDocument()
    expect(screen.getByText('Import')).toBeInTheDocument()
  })

  it('Import button is disabled when textarea is empty', () => {
    render(<ImportModal {...defaultProps} />)
    expect(screen.getByText('Import')).toBeDisabled()
  })

  it('calls onImport with matched games and shows result', () => {
    const onImport = vi.fn()
    render(<ImportModal {...defaultProps} onImport={onImport} />)
    const textarea = screen.getByPlaceholderText(/Name;Platform/)
    fireEvent.change(textarea, { target: { value: 'Cyberpunk 2077\nElden Ring\nUnknown Game' } })
    fireEvent.click(screen.getByText('Import'))
    expect(onImport).toHaveBeenCalledWith(new Set(['Cyberpunk 2077', 'Elden Ring']))
    expect(screen.getByText('2')).toBeInTheDocument() // matched count
    expect(screen.getByText(/of 3 games/)).toBeInTheDocument() // total
  })

  it('shows Done button after import', () => {
    render(<ImportModal {...defaultProps} />)
    const textarea = screen.getByPlaceholderText(/Name;Platform/)
    fireEvent.change(textarea, { target: { value: 'Cyberpunk 2077' } })
    fireEvent.click(screen.getByText('Import'))
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.queryByText('Import')).not.toBeInTheDocument()
  })

  it('Done button calls onClose', () => {
    const onClose = vi.fn()
    render(<ImportModal {...defaultProps} onClose={onClose} />)
    const textarea = screen.getByPlaceholderText(/Name;Platform/)
    fireEvent.change(textarea, { target: { value: 'Cyberpunk 2077' } })
    fireEvent.click(screen.getByText('Import'))
    fireEvent.click(screen.getByText('Done'))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows library info when ownedCount > 0', () => {
    render(<ImportModal {...defaultProps} ownedCount={42} />)
    expect(screen.getByText('42 games in your library')).toBeInTheDocument()
    expect(screen.getByText('Clear Library')).toBeInTheDocument()
  })

  it('does not show library info when ownedCount is 0', () => {
    render(<ImportModal {...defaultProps} ownedCount={0} />)
    expect(screen.queryByText(/games in your library/)).not.toBeInTheDocument()
  })

  it('Clear Library requires confirmation', () => {
    const onClear = vi.fn()
    render(<ImportModal {...defaultProps} ownedCount={10} onClear={onClear} />)
    fireEvent.click(screen.getByText('Clear Library'))
    expect(onClear).not.toHaveBeenCalled()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
  })

  it('confirming clear calls onClear and onClose', () => {
    const onClear = vi.fn()
    const onClose = vi.fn()
    render(<ImportModal {...defaultProps} ownedCount={10} onClear={onClear} onClose={onClose} />)
    fireEvent.click(screen.getByText('Clear Library'))
    fireEvent.click(screen.getByText('Yes, clear'))
    expect(onClear).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('cancelling clear hides confirmation', () => {
    render(<ImportModal {...defaultProps} ownedCount={10} />)
    fireEvent.click(screen.getByText('Clear Library'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument()
    expect(screen.getByText('Clear Library')).toBeInTheDocument()
  })

  it('clicking overlay calls onClose', () => {
    const onClose = vi.fn()
    render(<ImportModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByText('Import Game Library').closest('.modal-overlay')!)
    expect(onClose).toHaveBeenCalled()
  })

  it('Escape key calls onClose', () => {
    const onClose = vi.fn()
    render(<ImportModal {...defaultProps} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('file upload triggers import', async () => {
    const onImport = vi.fn()
    render(<ImportModal {...defaultProps} onImport={onImport} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['Name\nCyberpunk 2077\nElden Ring'], 'games.csv', { type: 'text/csv' })
    Object.defineProperty(fileInput, 'files', { value: [file] })
    fireEvent.change(fileInput)
    await new Promise((r) => setTimeout(r, 50))
    expect(onImport).toHaveBeenCalled()
  })

  it('file upload with no file does nothing', () => {
    const onImport = vi.fn()
    render(<ImportModal {...defaultProps} onImport={onImport} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(fileInput, 'files', { value: [] })
    fireEvent.change(fileInput)
    expect(onImport).not.toHaveBeenCalled()
  })

  it('import with empty CSV does nothing', () => {
    const onImport = vi.fn()
    render(<ImportModal {...defaultProps} onImport={onImport} />)
    const textarea = screen.getByPlaceholderText(/Name;Platform/)
    fireEvent.change(textarea, { target: { value: '   ' } })
    fireEvent.click(screen.getByText('Import'))
    expect(onImport).not.toHaveBeenCalled()
  })

  it('Upload File button clicks hidden file input', () => {
    render(<ImportModal {...defaultProps} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(fileInput, 'click')
    fireEvent.click(screen.getByText('Upload File'))
    expect(clickSpy).toHaveBeenCalled()
  })
})
