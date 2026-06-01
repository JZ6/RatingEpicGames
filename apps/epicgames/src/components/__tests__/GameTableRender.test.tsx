import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GameTable, COLUMNS } from "../GameTable";
import type { EpicGame, Filters } from "../../types";

const makeGame = (name = "Celeste"): EpicGame => ({ name, slug: name.toLowerCase().replace(/\s+/g, "-") });

const EMPTY_FILTERS: Filters = {
  search: "", steam: "", metacritic: "", userscore: "", hltb: "",
  year: "", epicrating: "", platform: "", hide: "visible", owned: "",
};

const VISIBLE_COLS = new Set(COLUMNS.map((c) => c.key));

function renderTable(overrides: Partial<Parameters<typeof GameTable>[0]> = {}) {
  const defaults = {
    games: [makeGame()],
    hltb: {},
    steam: {},
    metacritic: {},
    epic: {},
    images: {},
    sortCol: "epicdate" as const,
    sortDir: -1 as const,
    onSort: vi.fn(),
    visibleCols: VISIBLE_COLS,
    filters: EMPTY_FILTERS,
    filterCounts: { year: { "2024": 5 } },
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
    expect(screen.getByText("Celeste")).toBeInTheDocument();
  });

  it("renders all column headers", () => {
    renderTable();
    const labels = screen.getAllByRole("button").filter((el) => el.classList.contains("th-label"));
    const headers = labels.map((el) => el.textContent?.replace("ⓘ", "").trim());
    expect(headers.some((h) => h?.includes("Game"))).toBe(true);
    expect(headers.some((h) => h?.includes("Steam Rating"))).toBe(true);
    expect(headers.some((h) => h?.includes("Playtime"))).toBe(true);
    expect(headers.some((h) => h?.includes("Free Date"))).toBe(true);
  });

  it("renders empty state when no games", () => {
    renderTable({ games: [] });
    expect(screen.getByText(/No games match/)).toBeInTheDocument();
  });

  it("search input uses filterKey 'search', not 'name'", () => {
    const onFilter = vi.fn();
    renderTable({ onFilter });
    const input = screen.getByPlaceholderText(/Search/i);
    fireEvent.change(input, { target: { value: "celeste" } });
    expect(onFilter).toHaveBeenCalledWith("search", "celeste");
    expect(onFilter).not.toHaveBeenCalledWith("name", expect.any(String));
  });

  it("search input displays current search filter value", () => {
    renderTable({ filters: { ...EMPTY_FILTERS, search: "subnautica" } });
    const input = screen.getByPlaceholderText(/Search/i);
    expect(input).toHaveValue("subnautica");
  });

  it("epicdate filter uses filterKey 'year'", () => {
    const onFilter = vi.fn();
    renderTable({ onFilter, visibleCols: new Set(["name", "epicdate"]) });
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "2024" } });
    expect(onFilter).toHaveBeenCalledWith("year", "2024");
  });

  it("renders epic rating badge when data present", () => {
    renderTable({
      epic: { Celeste: { slug: "celeste", free_dates: [], epic_rating: 4.8 } },
    });
    expect(screen.getByText("4.8")).toBeInTheDocument();
  });

  it("renders steam badge when steam data present", () => {
    renderTable({
      steam: { Celeste: { rating: "Overwhelmingly Positive", pct: 96, total: 50000 } },
    });
    expect(screen.getByText("Overwhelmingly Positive")).toBeInTheDocument();
  });

  it("renders metacritic badge when data present", () => {
    renderTable({
      metacritic: { Celeste: { score: 92 } },
    });
    expect(screen.getByText("92")).toBeInTheDocument();
  });

  it("renders hltb badge when data present", () => {
    renderTable({
      hltb: { Celeste: { main: 8, extra: 20, complete: 35 } },
    });
    expect(screen.getByText(/hours/i)).toBeInTheDocument();
  });

  it("hltb badge links to howlongtobeat.com when hltb_id present", () => {
    renderTable({
      hltb: { Celeste: { main: 8, hltb_id: 42818 } },
    });
    const link = screen.getByRole("link", { name: /hours/i });
    expect(link).toHaveAttribute("href", "https://howlongtobeat.com/game/42818");
  });

  it("renders owned badge when owned", () => {
    renderTable({ ownedGames: new Set(["Celeste"]) });
    const badges = screen.getAllByText("Owned");
    const ownedBadge = badges.find((el) => el.tagName === "SPAN" && el.className.includes("badge"));
    expect(ownedBadge).toBeInTheDocument();
  });

  it("renders platform badge", () => {
    renderTable({
      epic: { Celeste: { slug: "celeste", free_dates: [], platforms: ["pc"] } },
    });
    const badges = screen.getAllByText("PC");
    const platBadge = badges.find((el) => el.className.includes("plat-pc"));
    expect(platBadge).toBeInTheDocument();
  });

  it("calls onSort when column header clicked", () => {
    const onSort = vi.fn();
    renderTable({ onSort });
    fireEvent.click(screen.getAllByText(/Steam/i)[0].closest("[role=button]")!);
    expect(onSort).toHaveBeenCalledWith("steam");
  });

  it("hides game row when in hiddenGames", () => {
    renderTable({
      hiddenGames: new Set(["Celeste"]),
      filters: { ...EMPTY_FILTERS, hide: "" },
    });
    const row = screen.getByText("Celeste").closest("tr");
    expect(row).toHaveClass("row-hidden");
  });

  it("renders multiple games", () => {
    renderTable({
      games: [makeGame("Celeste"), makeGame("Hades")],
    });
    expect(screen.getByText("Celeste")).toBeInTheDocument();
    expect(screen.getByText("Hades")).toBeInTheDocument();
  });

  it("hides columns not in visibleCols", () => {
    renderTable({ visibleCols: new Set(["name", "steam"]) });
    const labels = screen.getAllByRole("button").filter((el) => el.classList.contains("th-label"));
    const headers = labels.map((el) => el.textContent?.replace("ⓘ", "").trim());
    expect(headers.some((h) => h?.includes("Game"))).toBe(true);
    expect(headers.some((h) => h?.includes("Steam"))).toBe(true);
    expect(headers.some((h) => h?.includes("Playtime"))).toBe(false);
  });

  it("sorted column has aria-sort on its header", () => {
    renderTable({ sortCol: "steam", sortDir: 1 });
    const labels = screen.getAllByRole("button").filter((el) => el.classList.contains("th-label"));
    const th = labels.find((el) => el.textContent?.includes("Steam"))?.closest("th");
    expect(th).toHaveAttribute("aria-sort", "ascending");
  });

  it("shows filterCount in year dropdown option text", () => {
    renderTable({
      visibleCols: new Set(["name", "epicdate"]),
      filterCounts: { year: { "2024": 5, "2023": 3 } },
    });
    const select = screen.getByRole("combobox");
    const options = Array.from(select.querySelectorAll("option"));
    const y2024 = options.find((o) => o.value === "2024");
    expect(y2024?.textContent).toMatch(/\(5\)/);
  });

  it("owned game row renders Owned badge", () => {
    renderTable({
      visibleCols: new Set(["name", "owned"]),
      ownedGames: new Set(["Celeste"]),
    });
    const badges = screen.getAllByText("Owned");
    expect(badges.some((el) => el.classList.contains("byes"))).toBe(true);
  });

  it("calls onToggleHide when hide button clicked", () => {
    const onToggleHide = vi.fn();
    renderTable({
      visibleCols: new Set(["name", "hide"]),
      onToggleHide,
    });
    const hideBtn = screen.getByTitle(/Hide game/i);
    fireEvent.click(hideBtn);
    expect(onToggleHide).toHaveBeenCalledWith("Celeste");
  });
});
