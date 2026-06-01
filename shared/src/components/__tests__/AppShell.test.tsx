import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppShell } from "../AppShell";
import { defineColumn, nameColumn, steamColumn, hideColumn } from "../GameTableBase";

const COLUMNS = [nameColumn(), steamColumn(), hideColumn()];

function renderShell(overrides: Record<string, any> = {}) {
  const defaults = {
    title: "Test App",
    subtitle: "Test subtitle",
    errorHint: "game_data.json",
    columns: COLUMNS,
    loading: false,
    error: null,
    retry: vi.fn(),
    games: [{ name: "Game 1" }, { name: "Game 2" }],
    filteredCount: 2,
    visibleCols: new Set(["name", "steam", "hide"]),
    toggleCol: vi.fn(),
    onClearFilters: vi.fn(),
    ownedGames: new Set<string>(),
    setOwnedGames: vi.fn(),
    setVisibleCols: vi.fn(),
    showImport: false,
    setShowImport: vi.fn(),
    children: <div data-testid="table-content">Table here</div>,
  };
  return render(<AppShell {...defaults} {...overrides} />);
}

describe("AppShell", () => {
  it("renders title and subtitle", () => {
    renderShell();
    expect(screen.getByText("Test App")).toBeInTheDocument();
  });

  it("shows Columns button when toggleCol is provided", () => {
    renderShell();
    expect(screen.getByText("Columns")).toBeInTheDocument();
  });

  it("shows Clear Filters button", () => {
    renderShell();
    expect(screen.getByText("Clear Filters")).toBeInTheDocument();
  });

  it("shows Import Library button", () => {
    renderShell();
    expect(screen.getByText("Import Library")).toBeInTheDocument();
  });

  it("renders children content", () => {
    renderShell();
    expect(screen.getByTestId("table-content")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    renderShell({ loading: true });
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
    expect(screen.queryByText("Columns")).not.toBeInTheDocument();
  });

  it("shows error state", () => {
    renderShell({ error: "Failed to fetch" });
    expect(screen.getByText(/Failed to load/)).toBeInTheDocument();
    expect(screen.queryByText("Columns")).not.toBeInTheDocument();
  });

  it("column toggle opens dropdown and shows column labels", () => {
    renderShell();
    fireEvent.click(screen.getByText("Columns"));
    expect(screen.getByText("Game")).toBeInTheDocument();
    expect(screen.getByText("Steam Rating")).toBeInTheDocument();
    expect(screen.getByText("Hide")).toBeInTheDocument();
  });

  it("column toggle calls toggleCol when checkbox clicked", () => {
    const toggleCol = vi.fn();
    renderShell({ toggleCol });
    fireEvent.click(screen.getByText("Columns"));
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);
    expect(toggleCol).toHaveBeenCalledWith("steam");
  });

  it("shows stats bar with filtered/total counts", () => {
    renderShell({ filteredCount: 5, games: Array.from({ length: 10 }, (_, i) => ({ name: `Game ${i}` })) });
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });
});
