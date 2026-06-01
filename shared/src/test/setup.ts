import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'

// happy-dom's localStorage may not implement all Storage methods — stub it globally
const store: Record<string, string> = {}
const mockLocalStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
  key: (i: number) => Object.keys(store)[i] ?? null,
  get length() { return Object.keys(store).length },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
}
vi.stubGlobal('localStorage', mockLocalStorage)

beforeEach(() => {
  mockLocalStorage.clear()
})
