import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import App from "../App";

// happy-dom's localStorage may not implement all Storage methods — stub it
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  key: (i: number) => Object.keys(store)[i] ?? null,
  get length() { return Object.keys(store).length; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};
const GAME_DATA: Record<string, any> = {
  Celeste: {
    steam: { found: true, rating: "Overwhelmingly Positive", pct: 97, total: 80000, appid: 504230 },
    hltb: { found: true, main: 8, extra: 20, complete: 35, hltb_id: 42818 },
    metacritic: { found: true, score: 92 },
    epic: { slug: "celeste", free_dates: [{ start: "2021-01-01", end: "2021-01-08" }] },
  },
  Hades: {
    steam: { found: true, rating: "Overwhelmingly Positive", pct: 96, total: 100000, appid: 1145360 },
    hltb: { found: true, main: 20 },
    metacritic: { found: true, score: 93 },
    epic: { slug: "hades", free_dates: [{ start: "2022-06-01", end: "2022-06-08" }] },
  },
};

beforeEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(window, "innerWidth", { writable: true, value: 1920 });
  vi.stubGlobal("localStorage", mockLocalStorage);
  mockLocalStorage.clear();
  window.history.replaceState(null, "", window.location.pathname);
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    if (!url.includes("game_data")) return Promise.resolve({ ok: false, status: 404 });
    return Promise.resolve({ ok: true, json: () => Promise.resolve(GAME_DATA) });
  }));
});

afterEach(() => vi.clearAllMocks());

describe("App integration", () => {
  it("renders loading state initially", () => {
    render(<App />);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it("renders games after data loads", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Celeste")).toBeInTheDocument());
    expect(screen.getByText("Hades")).toBeInTheDocument();
  });

  it("renders Columns button (column toggle dropdown visible)", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Columns")).toBeInTheDocument());
  });

  it("renders Clear Filters and Import Library buttons", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("Clear Filters")).toBeInTheDocument();
      expect(screen.getByText("Import Library")).toBeInTheDocument();
    });
  });

  it("search filters games by name", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Celeste")).toBeInTheDocument());
    const input = screen.getByPlaceholderText(/Search/);
    fireEvent.change(input, { target: { value: "hades" } });
    await waitFor(() => {
      expect(screen.getByText("Hades")).toBeInTheDocument();
      expect(screen.queryByText("Celeste")).not.toBeInTheDocument();
    });
  });

  it("column toggle opens and shows column names", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Columns")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Columns"));
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it("shows stats bar with game count", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Celeste")).toBeInTheDocument());
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
    const highlights = screen.getAllByText("2");
    expect(highlights.length).toBeGreaterThanOrEqual(1);
  });

  it("renders HLTB link when hltb_id present", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Celeste")).toBeInTheDocument());
    const links = screen.getAllByRole("link", { name: /hours/i });
    expect(links.some((l) => l.getAttribute("href") === "https://howlongtobeat.com/game/42818")).toBe(true);
  });

  it("shows error state when fetch fails", async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500 })) as any;
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Failed to load game data/)).toBeInTheDocument());
  });

  it("retry button triggers refetch", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ ok: false, status: 500 });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(GAME_DATA) });
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByText("Retry")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Retry"));
    await waitFor(() => expect(screen.getByText("Celeste")).toBeInTheDocument());
  });
});
