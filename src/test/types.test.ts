import { describe, it, expect } from 'vitest'
import { getHltbHours, getLatestFreeDate, formatFreeDate, getFreeDateYear } from '../types'
import type { HltbInfo, EpicInfo } from '../types'

describe('getHltbHours', () => {
  it('returns undefined for missing data', () => {
    expect(getHltbHours(undefined)).toBeUndefined()
  })

  it('averages all available values', () => {
    const h: HltbInfo = { main: 10, extra: 20, complete: 30 }
    expect(getHltbHours(h)).toBeCloseTo(20)
  })

  it('averages two values if one missing', () => {
    const h: HltbInfo = { extra: 20, complete: 30 }
    expect(getHltbHours(h)).toBeCloseTo(25)
  })

  it('returns single value if only one present', () => {
    const h: HltbInfo = { complete: 30 }
    expect(getHltbHours(h)).toBe(30)
  })

  it('returns undefined for fully empty object', () => {
    expect(getHltbHours({})).toBeUndefined()
  })
})

describe('getLatestFreeDate', () => {
  it('returns undefined for missing epic', () => {
    expect(getLatestFreeDate(undefined)).toBeUndefined()
  })

  it('returns undefined for empty free_dates', () => {
    expect(getLatestFreeDate({ slug: 'test', free_dates: [] })).toBeUndefined()
  })

  it('returns the latest date regardless of array order', () => {
    const epic: EpicInfo = {
      slug: 'test',
      free_dates: [
        { start: '2020-01-01', end: '' },
        { start: '2023-06-15', end: '' },
        { start: '2021-03-10', end: '' },
      ],
    }
    const d = getLatestFreeDate(epic)!
    expect(d.getFullYear()).toBe(2023)
    expect(d.getMonth()).toBe(5)
    expect(d.getDate()).toBe(15)
  })

  it('handles single date', () => {
    const epic: EpicInfo = { slug: 'test', free_dates: [{ start: '2022-12-25', end: '' }] }
    expect(getLatestFreeDate(epic)!.getFullYear()).toBe(2022)
  })
})

describe('formatFreeDate', () => {
  it('returns empty string for no dates', () => {
    expect(formatFreeDate(undefined)).toBe('')
    expect(formatFreeDate({ slug: 'test', free_dates: [] })).toBe('')
  })

  it('formats the latest date', () => {
    const epic: EpicInfo = {
      slug: 'test',
      free_dates: [
        { start: '2020-01-01', end: '' },
        { start: '2023-06-15', end: '' },
      ],
    }
    expect(formatFreeDate(epic)).toContain('2023')
    expect(formatFreeDate(epic)).toContain('Jun')
    expect(formatFreeDate(epic)).toContain('15')
  })
})

describe('getFreeDateYear', () => {
  it('returns undefined for no dates', () => {
    expect(getFreeDateYear(undefined)).toBeUndefined()
  })

  it('returns the year of the latest date', () => {
    const epic: EpicInfo = {
      slug: 'test',
      free_dates: [
        { start: '2019-12-30', end: '' },
        { start: '2024-01-05', end: '' },
      ],
    }
    expect(getFreeDateYear(epic)).toBe(2024)
  })
})
