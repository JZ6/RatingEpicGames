import { describe, it, expect } from "vitest";
import { getHltbHours, STEAM_ORDER, loadSetFromLS } from "../types";
import type { HltbInfo } from "../types";

describe("getHltbHours", () => {
  it("returns undefined when no data", () => {
    expect(getHltbHours(undefined)).toBeUndefined();
  });

  it("returns undefined when all fields are missing", () => {
    expect(getHltbHours({})).toBeUndefined();
  });

  it("returns single value when only one field set", () => {
    expect(getHltbHours({ main: 20 })).toBe(20);
  });

  it("averages multiple fields", () => {
    expect(getHltbHours({ main: 10, extra: 20 })).toBe(15);
  });

  it("averages all available fields", () => {
    const hours = getHltbHours({ main: 10, extra: 30, complete: 50 });
    expect(hours).toBe(30);
  });

  it("includes coop, pvp, all_styles in average when present", () => {
    const hours = getHltbHours({ main: 10, coop: 20 });
    expect(hours).toBe(15);
  });

  it("ignores null/undefined fields in average", () => {
    const info: HltbInfo = { main: 10, extra: undefined as any };
    expect(getHltbHours(info)).toBe(10);
  });
});

describe("STEAM_ORDER", () => {
  it("has correct ordering (higher = better)", () => {
    expect(STEAM_ORDER["Overwhelmingly Positive"]).toBeGreaterThan(STEAM_ORDER["Very Positive"]);
    expect(STEAM_ORDER["Very Positive"]).toBeGreaterThan(STEAM_ORDER["Positive"]);
    expect(STEAM_ORDER["Positive"]).toBeGreaterThan(STEAM_ORDER["Mostly Positive"]);
    expect(STEAM_ORDER["Mostly Positive"]).toBeGreaterThan(STEAM_ORDER["Mixed"]);
    expect(STEAM_ORDER["Mixed"]).toBeGreaterThan(STEAM_ORDER["Mostly Negative"]);
    expect(STEAM_ORDER["Mostly Negative"]).toBeGreaterThan(STEAM_ORDER["Negative"]);
    expect(STEAM_ORDER["Negative"]).toBeGreaterThanOrEqual(STEAM_ORDER["Very Negative"]);
  });

  it("covers all 8 ratings", () => {
    expect(Object.keys(STEAM_ORDER)).toHaveLength(8);
  });
});

describe("loadSetFromLS", () => {
  it("returns empty set when localStorage empty", () => {
    expect(loadSetFromLS("nonexistent")).toEqual(new Set());
  });

  it("restores stored set from localStorage", () => {
    localStorage.setItem("test-set", JSON.stringify(["a", "b"]));
    const result = loadSetFromLS("test-set");
    expect(result.has("a")).toBe(true);
    expect(result.has("b")).toBe(true);
    expect(result.size).toBe(2);
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem("test-set", "not json");
    expect(loadSetFromLS("test-set")).toEqual(new Set());
  });
});
