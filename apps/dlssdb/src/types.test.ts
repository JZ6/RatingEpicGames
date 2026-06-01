import { describe, it, expect } from "vitest";
import { getFrameGenLevel, getFrameGenLabel, getDlssVersion, getDlssVersionOrder } from "./types";
import type { DlssGame } from "./types";

const makeGame = (overrides: Partial<DlssGame> = {}): DlssGame => ({
  sno: 1, name: "Test", type: "Game",
  "dlss multi frame generation": "", "dlss frame generation": "",
  "dlss super resolution": "", "dlss ray reconstruction": "",
  dlaa: "", "ray tracing": "", ai: "",
  ...overrides,
});

describe("getFrameGenLevel", () => {
  it("returns 3 for 6X multi frame gen", () => {
    expect(getFrameGenLevel(makeGame({ "dlss multi frame generation": "NV, 6X" }))).toBe(3);
  });

  it("returns 2 for 4X multi frame gen", () => {
    expect(getFrameGenLevel(makeGame({ "dlss multi frame generation": "NV, 4X" }))).toBe(2);
  });

  it("returns 1 for legacy frame gen", () => {
    expect(getFrameGenLevel(makeGame({ "dlss frame generation": "Yes" }))).toBe(1);
  });

  it("returns 0 when no frame gen", () => {
    expect(getFrameGenLevel(makeGame())).toBe(0);
  });
});

describe("getFrameGenLabel", () => {
  it("returns 6X for level 3", () => {
    expect(getFrameGenLabel(makeGame({ "dlss multi frame generation": "NV, 6X" }))).toBe("6X");
  });

  it("returns 4X for level 2", () => {
    expect(getFrameGenLabel(makeGame({ "dlss multi frame generation": "NV, 4X" }))).toBe("4X");
  });

  it("returns 2X for legacy frame gen", () => {
    expect(getFrameGenLabel(makeGame({ "dlss frame generation": "Yes" }))).toBe("2X");
  });

  it("returns empty string when no frame gen", () => {
    expect(getFrameGenLabel(makeGame())).toBe("");
  });
});

describe("getDlssVersion", () => {
  it("returns 4.5 for 6X MFG", () => {
    expect(getDlssVersion(makeGame({ "dlss multi frame generation": "NV, 6X" }))).toBe("4.5");
  });

  it("returns 4 for 4X MFG", () => {
    expect(getDlssVersion(makeGame({ "dlss multi frame generation": "NV, 4X" }))).toBe("4");
  });

  it("returns 3.5 for ray reconstruction", () => {
    expect(getDlssVersion(makeGame({ "dlss ray reconstruction": "Yes" }))).toBe("3.5");
  });

  it("returns 3 for frame generation", () => {
    expect(getDlssVersion(makeGame({ "dlss frame generation": "Yes" }))).toBe("3");
  });

  it("returns 2 for super resolution", () => {
    expect(getDlssVersion(makeGame({ "dlss super resolution": "Yes" }))).toBe("2");
  });

  it("returns 1 when no DLSS features", () => {
    expect(getDlssVersion(makeGame())).toBe("1");
  });
});

describe("getDlssVersionOrder", () => {
  it("4.5 > 4 > 3.5 > 3 > 2 > 1", () => {
    const order = (overrides: Partial<DlssGame>) => getDlssVersionOrder(makeGame(overrides));
    expect(order({ "dlss multi frame generation": "NV, 6X" })).toBeGreaterThan(
      order({ "dlss multi frame generation": "NV, 4X" })
    );
    expect(order({ "dlss multi frame generation": "NV, 4X" })).toBeGreaterThan(
      order({ "dlss ray reconstruction": "Yes" })
    );
    expect(order({ "dlss ray reconstruction": "Yes" })).toBeGreaterThan(
      order({ "dlss frame generation": "Yes" })
    );
    expect(order({ "dlss frame generation": "Yes" })).toBeGreaterThan(
      order({ "dlss super resolution": "Yes" })
    );
    expect(order({ "dlss super resolution": "Yes" })).toBeGreaterThan(order({}));
  });
});
