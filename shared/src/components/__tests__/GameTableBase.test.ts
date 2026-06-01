import { describe, it, expect } from "vitest";
import { defineColumn, computeColWidths, nameColumn, steamColumn, metacriticColumn, hltbColumn, ownedColumn, hideColumn } from "../GameTableBase";
import type { ColumnDef } from "../GameTableBase";

describe("defineColumn", () => {
  it("defaults filterType to 'select'", () => {
    const col = defineColumn({ key: "test", label: "Test", minWidth: "90px", tooltip: "tip" });
    expect(col.filterType).toBe("select");
  });

  it("defaults mobileWidth to minWidth", () => {
    const col = defineColumn({ key: "test", label: "Test", minWidth: "120px", tooltip: "tip" });
    expect(col.mobileWidth).toBe("120px");
  });

  it("allows overriding filterType", () => {
    const col = defineColumn({ key: "test", label: "Test", minWidth: "90px", tooltip: "tip", filterType: "input" });
    expect(col.filterType).toBe("input");
  });

  it("allows overriding mobileWidth", () => {
    const col = defineColumn({ key: "test", label: "Test", minWidth: "200px", mobileWidth: "100px", tooltip: "tip" });
    expect(col.mobileWidth).toBe("100px");
  });
});

describe("computeColWidths", () => {
  const makeCols = (...specs: [string, string][]): ColumnDef[] =>
    specs.map(([minWidth, mobileWidth], i) => defineColumn({
      key: `col${i}`, label: `Col ${i}`, minWidth, mobileWidth, tooltip: "",
    }));

  it("uses minWidth on desktop (container > 800px)", () => {
    const cols = makeCols(["360px", "140px"], ["240px", "120px"]);
    const widths = computeColWidths(cols, 1200);
    expect(widths[0]).toBeGreaterThanOrEqual(360);
    expect(widths[1]).toBeGreaterThanOrEqual(240);
  });

  it("uses mobileWidth when container <= 800px", () => {
    const cols = makeCols(["360px", "140px"], ["240px", "120px"]);
    const widths = computeColWidths(cols, 400);
    expect(widths[0]).toBeLessThan(360);
    expect(widths[1]).toBeLessThan(240);
  });

  it("does not use mobileWidth when container is 0 (initial render)", () => {
    const cols = makeCols(["360px", "140px"], ["240px", "120px"]);
    const widths = computeColWidths(cols, 0);
    expect(widths[0]).toBe(360);
    expect(widths[1]).toBe(240);
  });

  it("distributes extra space evenly", () => {
    const cols = makeCols(["100px", "100px"], ["100px", "100px"]);
    const widths = computeColWidths(cols, 400);
    expect(widths[0]).toBe(200);
    expect(widths[1]).toBe(200);
  });

  it("does not add negative space when mobile widths overflow container", () => {
    // col0: min=300, mobile=200; col1: min=300, mobile=150 → total mobile=350 > 100
    const cols = makeCols(["300px", "200px"], ["300px", "150px"]);
    const widths = computeColWidths(cols, 100);
    expect(widths[0]).toBe(200);
    expect(widths[1]).toBe(150);
  });
});

describe("column factories", () => {
  it("nameColumn has filterKey 'search' and filterType 'input'", () => {
    const col = nameColumn();
    expect(col.filterKey).toBe("search");
    expect(col.filterType).toBe("input");
  });

  it("nameColumn has mobileWidth smaller than minWidth", () => {
    const col = nameColumn();
    expect(parseInt(col.mobileWidth!)).toBeLessThan(parseInt(col.minWidth));
  });

  it("steamColumn has render and filters", () => {
    const col = steamColumn();
    expect(col.render).toBeDefined();
    expect(col.filters).toBeDefined();
    expect(col.filters!.length).toBeGreaterThan(0);
  });

  it("metacriticColumn has render and filters", () => {
    const col = metacriticColumn();
    expect(col.render).toBeDefined();
    expect(col.filters).toBeDefined();
  });

  it("hltbColumn has render and filters", () => {
    const col = hltbColumn();
    expect(col.render).toBeDefined();
    expect(col.filters).toBeDefined();
  });

  it("ownedColumn has render and filters", () => {
    const col = ownedColumn();
    expect(col.render).toBeDefined();
    expect(col.filters).toBeDefined();
  });

  it("hideColumn has render and filters", () => {
    const col = hideColumn();
    expect(col.render).toBeDefined();
    expect(col.filters).toBeDefined();
  });

  it("factory overrides take precedence", () => {
    const col = steamColumn({ minWidth: "300px", tooltip: "custom" });
    expect(col.minWidth).toBe("300px");
    expect(col.tooltip).toBe("custom");
    expect(col.render).toBeDefined();
  });
});
