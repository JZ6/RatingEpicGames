import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import App from "../App";

const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  key: (i: number) => Object.keys(store)[i] ?? null,
  get length() { return Object.keys(store).length; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};
const DLSS_LIST = {
  data: [
    { sno: 1, name: "Cyberpunk 2077", type: "Game", "dlss multi frame generation": "NV, 4X", "dlss frame generation": "", "dlss super resolution": "Yes", "dlss ray reconstruction": "Yes", dlaa: "Yes", "ray tracing": "Path Tracing", ai: "" },
    { sno: 2, name: "Elden Ring", type: "Game", "dlss multi frame generation": "", "dlss frame generation": "", "dlss super resolution": "Yes", "dlss ray reconstruction": "", dlaa: "", "ray tracing": "", ai: "" },
    { sno: 3, name: "Non-Game App", type: "App", "dlss multi frame generation": "", "dlss frame generation": "", "dlss super resolution": "", "dlss ray reconstruction": "", dlaa: "", "ray tracing": "", ai: "" },
  ],
};

const GAME_DATA: Record<string, any> = {
  "Cyberpunk 2077": { steam: { found: true, rating: "Very Positive", pct: 85, total: 500000, appid: 1091500 }, hltb: { found: true, main: 22, extra: 50, complete: 100, hltb_id: 68973 }, metacritic: { found: true, score: 86 } },
  "Elden Ring": { steam: { found: true, rating: "Very Positive", pct: 81, total: 600000, appid: 1245620 }, metacritic: { found: true, score: 94 } },
};

let fetchCalls: string[];

beforeEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(window, "innerWidth", { writable: true, value: 1920 });
  vi.stubGlobal("localStorage", mockLocalStorage);
  mockLocalStorage.clear();
  window.history.replaceState(null, "", window.location.pathname);
  fetchCalls = [];
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    fetchCalls.push(url);
    let body: any;
    if (url.includes("dlss-rt-games-apps")) body = DLSS_LIST;
    else if (url.includes("game_data")) body = GAME_DATA;
    else return Promise.resolve({ ok: false, status: 404 });
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
  }));
});

afterEach(() => vi.clearAllMocks());

describe("App integration", () => {
  it("renders loading state initially", () => {
    render(<App />);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it("renders game table after data loads", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Cyberpunk 2077")).toBeInTheDocument());
    expect(screen.getByText("Elden Ring")).toBeInTheDocument();
  });

  it("filters out non-game entries (type !== Game)", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Cyberpunk 2077")).toBeInTheDocument());
    expect(screen.queryByText("Non-Game App")).not.toBeInTheDocument();
  });

  it("renders Columns button (column toggle dropdown visible)", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Columns")).toBeInTheDocument());
  });

  it("renders Clear Filters button", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Clear Filters")).toBeInTheDocument());
  });

  it("renders Import Library button", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Import Library")).toBeInTheDocument());
  });

  it("search filters games by name", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Cyberpunk 2077")).toBeInTheDocument());
    const input = screen.getByPlaceholderText(/Search/);
    fireEvent.change(input, { target: { value: "elden" } });
    await waitFor(() => {
      expect(screen.getByText("Elden Ring")).toBeInTheDocument();
      expect(screen.queryByText("Cyberpunk 2077")).not.toBeInTheDocument();
    });
  });

  it("shows stats bar with game count", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Cyberpunk 2077")).toBeInTheDocument());
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
    const highlights = screen.getAllByText("2");
    expect(highlights.length).toBeGreaterThanOrEqual(1);
  });

  it("column toggle opens and shows column checkboxes", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Columns")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Columns"));
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it("renders HLTB hours with link when hltb_id present", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Cyberpunk 2077")).toBeInTheDocument());
    const link = screen.getByRole("link", { name: /hours/i });
    expect(link).toHaveAttribute("href", "https://howlongtobeat.com/game/68973");
  });

  it("shows error state when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false, status: 500 })));
    render(<App />);
    await waitFor(() => expect(screen.getByText("Failed to load game data")).toBeInTheDocument());
  });

  it("retry button triggers re-fetch and recovers", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      calls++;
      if (calls <= 2) return Promise.resolve({ ok: false, status: 500 });
      let body: any;
      if (url.includes("dlss-rt-games-apps")) body = DLSS_LIST;
      else body = GAME_DATA;
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
    }));
    render(<App />);
    await waitFor(() => expect(screen.getByText("Failed to load game data")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => expect(screen.getByText("Cyberpunk 2077")).toBeInTheDocument());
  });

  it("clear filters resets an active search", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Cyberpunk 2077")).toBeInTheDocument());
    const input = screen.getByPlaceholderText(/Search/);
    fireEvent.change(input, { target: { value: "elden" } });
    await waitFor(() => expect(screen.queryByText("Cyberpunk 2077")).not.toBeInTheDocument());
    fireEvent.click(screen.getByText("Clear Filters"));
    await waitFor(() => expect(screen.getByText("Cyberpunk 2077")).toBeInTheDocument());
  });
});
