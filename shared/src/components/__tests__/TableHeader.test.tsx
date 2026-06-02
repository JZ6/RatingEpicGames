import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TableHeader } from "../TableHeader";
import { Column, NameColumn, SteamColumn, HideColumn } from "../Column";

const cols = [new NameColumn(), new SteamColumn(), new HideColumn()];
const colWidths = [300, 180, 80];

function renderHeader(overrides: Partial<Parameters<typeof TableHeader>[0]> = {}) {
  const defaults = {
    cols,
    colWidths,
    filters: { search: "", steam: "", hide: "visible" },
    filterCounts: { steam: { "vp+": 2, "mp+": 4 } },
    onFilter: vi.fn(),
    sortCol: "name",
    sortDir: 1 as const,
    onSort: vi.fn(),
  };
  return render(<table><TableHeader {...defaults} {...overrides} /></table>);
}

describe("TableHeader", () => {
  it("renders a th for each column", () => {
    renderHeader();
    const ths = document.querySelectorAll("th");
    expect(ths).toHaveLength(cols.length);
  });

  it("sorted column has 'sorted' class and correct aria-sort", () => {
    renderHeader({ sortCol: "steam", sortDir: -1 });
    const headers = document.querySelectorAll("th");
    const steamTh = Array.from(headers).find((th) => th.textContent?.includes("Steam"));
    expect(steamTh).toHaveClass("sorted");
    expect(steamTh).toHaveAttribute("aria-sort", "descending");
  });

  it("unsorted columns have aria-sort=none", () => {
    renderHeader({ sortCol: "name" });
    const headers = document.querySelectorAll("th");
    const steamTh = Array.from(headers).find((th) => th.textContent?.includes("Steam"));
    expect(steamTh).toHaveAttribute("aria-sort", "none");
  });

  it("calls onSort when header clicked", () => {
    const onSort = vi.fn();
    renderHeader({ onSort });
    const btn = screen.getAllByRole("button").find((el) => el.textContent?.includes("Steam"));
    fireEvent.click(btn!);
    expect(onSort).toHaveBeenCalledWith("steam");
  });

  it("calls onSort when Enter pressed on header", () => {
    const onSort = vi.fn();
    renderHeader({ onSort });
    const btn = screen.getAllByRole("button").find((el) => el.textContent?.includes("Steam"));
    fireEvent.keyDown(btn!, { key: "Enter" });
    expect(onSort).toHaveBeenCalledWith("steam");
  });

  it("renders search input for NameColumn (filterType=input)", () => {
    renderHeader();
    expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
  });

  it("renders select for SteamColumn (filterType=select)", () => {
    renderHeader();
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThan(0);
  });

  it("shows filterCount in select options", () => {
    renderHeader();
    const select = screen.getAllByRole("combobox")[0];
    const vp = Array.from(select.querySelectorAll("option")).find((o) => o.value === "vp+");
    expect(vp?.textContent).toMatch(/\(2\)/);
  });

  it("calls onFilter when input changes", () => {
    const onFilter = vi.fn();
    renderHeader({ onFilter });
    const input = screen.getByPlaceholderText(/Search/i);
    fireEvent.change(input, { target: { value: "test" } });
    expect(onFilter).toHaveBeenCalledWith("search", "test");
  });

  it("calls onFilter when select changes", () => {
    const onFilter = vi.fn();
    renderHeader({ onFilter });
    const select = screen.getAllByRole("combobox")[0];
    fireEvent.change(select, { target: { value: "vp+" } });
    expect(onFilter).toHaveBeenCalledWith("steam", "vp+");
  });

  it("uses filterKey not key for columns with filterKey set", () => {
    const dateCol = new Column({ key: "epicdate", label: "Date", minWidth: "100px", tooltip: "", filterKey: "year",
      filters: [{ value: "", label: "All Years" }, { value: "2024", label: "2024" }] });
    const onFilter = vi.fn();
    render(
      <table>
        <TableHeader
          cols={[dateCol]} colWidths={[150]}
          filters={{ year: "" }}
          filterCounts={{ year: { "2024": 3 } }}
          onFilter={onFilter} sortCol="" sortDir={1} onSort={vi.fn()}
        />
      </table>
    );
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "2024" } });
    expect(onFilter).toHaveBeenCalledWith("year", "2024");
  });

  it("shows sort indicator active on sorted column ascending", () => {
    renderHeader({ sortCol: "steam", sortDir: 1 });
    const siUp = document.querySelector(".si-up.si-on");
    const siDown = document.querySelector(".si-down.si-on");
    expect(siUp).not.toBeNull();
    expect(siDown).toBeNull();
  });

  it("shows sort indicator active on sorted column descending", () => {
    renderHeader({ sortCol: "steam", sortDir: -1 });
    const siUp = document.querySelector(".si-up.si-on");
    const siDown = document.querySelector(".si-down.si-on");
    expect(siUp).toBeNull();
    expect(siDown).not.toBeNull();
  });
});
