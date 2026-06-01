import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GameTable, COLUMNS } from "../GameTable";
import type { DlssGame, Filters } from "../../types";

const makeGame = (overrides: Partial<DlssGame> = {}): DlssGame => ({
  sno: 1, name: "Cyberpunk 2077", type: "Game",
  "dlss multi frame generation": "", "dlss frame generation": "",
  "dlss super resolution": "Yes", "dlss ray reconstruction": "",
  dlaa: "", "ray tracing": "Yes", ai: "",
  ...overrides,
});

const EMPTY_FILTERS: Filters = {
  search: "", framegen: "", dlssver: "", dlaa: "", sr: "", rr: "", rt: "",
  upscaling: "", steam: "", metacritic: "", release_date: "", tags: "",
  hltb: "", hide: "visible", owned: "",
};

const VISIBLE_COLS = new Set(COLUMNS.map((c) => c.key));

function renderTable(overrides: Partial<Parameters<typeof GameTable>[0]> = {}) {
  const defaults = {
    games: [makeGame()],
    hltb: {},
    steam: {},
    metacritic: {},
    upscaling: {},
    images: {},
    sortCol: "name" as const,
    sortDir: 1 as const,
    onSort: vi.fn(),
    visibleCols: VISIBLE_COLS,
    filters: EMPTY_FILTERS,
    filterCounts: {},
    onFilter: vi.fn(),
    hiddenGames: new Set<string>(),
    onToggleHide: vi.fn(),
    ownedGames: new Set<string>(),
  };
  return render(<GameTable {...defaults} {...overrides} />);
}

describe("GameTable render", () => {
  it("renders game name", () => {
    renderTable();
    expect(screen.getByText("Cyberpunk 2077")).toBeInTheDocument();
  });

  it("renders all column headers", () => {
    renderTable();
    const labels = screen.getAllByRole("button").filter((el) => el.classList.contains("th-label"));
    const headers = labels.map((el) => el.textContent?.replace("ⓘ", "").trim());
    expect(headers.some((h) => h?.includes("Game"))).toBe(true);
    expect(headers.some((h) => h?.includes("Steam Rating"))).toBe(true);
    expect(headers.some((h) => h?.includes("Playtime"))).toBe(true);
  });

  it("renders empty state when no games", () => {
    renderTable({ games: [] });
    expect(screen.getByText(/No games match/)).toBeInTheDocument();
  });

  it("renders multiple games", () => {
    renderTable({
      games: [
        makeGame({ sno: 1, name: "Game One" }),
        makeGame({ sno: 2, name: "Game Two" }),
        makeGame({ sno: 3, name: "Game Three" }),
      ],
    });
    expect(screen.getByText("Game One")).toBeInTheDocument();
    expect(screen.getByText("Game Two")).toBeInTheDocument();
    expect(screen.getByText("Game Three")).toBeInTheDocument();
  });

  it("only shows visible columns", () => {
    renderTable({ visibleCols: new Set(["name", "steam"]) });
    const labels = screen.getAllByRole("button").filter((el) => el.classList.contains("th-label"));
    const headers = labels.map((el) => el.textContent?.replace("ⓘ", "").trim());
    expect(headers.some((h) => h?.includes("Game"))).toBe(true);
    expect(headers.some((h) => h?.includes("Steam Rating"))).toBe(true);
    expect(headers.some((h) => h?.includes("Playtime"))).toBe(false);
  });

  it("search input uses filterKey 'search', not 'name'", () => {
    const onFilter = vi.fn();
    renderTable({ onFilter });
    const input = screen.getByPlaceholderText(/Search/i);
    fireEvent.change(input, { target: { value: "doom" } });
    expect(onFilter).toHaveBeenCalledWith("search", "doom");
    expect(onFilter).not.toHaveBeenCalledWith("name", expect.any(String));
  });

  it("search input displays current search filter value", () => {
    renderTable({ filters: { ...EMPTY_FILTERS, search: "half-life" } });
    const input = screen.getByPlaceholderText(/Search/i);
    expect(input).toHaveValue("half-life");
  });

  it("renders steam badge when steam data present", () => {
    renderTable({
      steam: {
        "Cyberpunk 2077": { rating: "Very Positive", pct: 80, total: 500000 },
      },
    });
    expect(screen.getByText("Very Positive")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("renders metacritic badge when data present", () => {
    renderTable({
      metacritic: { "Cyberpunk 2077": { score: 86 } },
    });
    expect(screen.getByText("86")).toBeInTheDocument();
  });

  it("renders hltb badge when data present", () => {
    renderTable({
      hltb: { "Cyberpunk 2077": { main: 22, extra: 50, complete: 100 } },
    });
    expect(screen.getByText(/hours/i)).toBeInTheDocument();
  });

  it("hltb badge links to howlongtobeat.com when hltb_id present", () => {
    renderTable({
      hltb: { "Cyberpunk 2077": { main: 22, hltb_id: 68973 } },
    });
    const link = screen.getByRole("link", { name: /hours/i });
    expect(link).toHaveAttribute("href", "https://howlongtobeat.com/game/68973");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("hltb badge has no link when hltb_id missing", () => {
    renderTable({
      hltb: { "Cyberpunk 2077": { main: 22 } },
    });
    expect(screen.getByText(/hours/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /hours/i })).not.toBeInTheDocument();
  });

  it("renders frame gen badge", () => {
    renderTable({
      games: [makeGame({ "dlss multi frame generation": "NV, 6X" })],
    });
    const badges = screen.getAllByText("6X");
    const fgBadge = badges.find((el) => el.classList.contains("badge"));
    expect(fgBadge).toBeInTheDocument();
  });

  it("calls onSort when column header clicked", () => {
    const onSort = vi.fn();
    renderTable({ onSort });
    fireEvent.click(screen.getAllByText(/Steam/i)[0].closest("[role=button]")!);
    expect(onSort).toHaveBeenCalledWith("steam");
  });

  it("framegen dropdown calls onFilter with correct key", () => {
    const onFilter = vi.fn();
    renderTable({ onFilter, visibleCols: new Set(["name", "framegen"]) });
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "6x" } });
    expect(onFilter).toHaveBeenCalledWith("framegen", "6x");
  });

  it("hides game row when in hiddenGames", () => {
    renderTable({
      hiddenGames: new Set(["Cyberpunk 2077"]),
      filters: { ...EMPTY_FILTERS, hide: "" },
    });
    const row = screen.getByText("Cyberpunk 2077").closest("tr");
    expect(row).toHaveClass("row-hidden");
  });
});
