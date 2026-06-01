import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppState } from "../useAppState";
import type { AppShell } from "../../components/AppShell";
import React from "react";

beforeEach(() => {
  // localStorage is cleared by setup.ts; just reset innerWidth
  Object.defineProperty(window, "innerWidth", { writable: true, value: 1280 });
});

const CONFIG = {
  lsPrefix: "test",
  defaultCols: { 800: ["name", "steam"] as const, 1200: ["name", "steam", "hltb"] as const },
  defaultFallback: ["name", "steam", "hltb", "hide"] as const,
};

describe("useAppState", () => {
  it("returns fallback columns on desktop", () => {
    const { result } = renderHook(() => useAppState(CONFIG));
    expect([...result.current.visibleCols]).toEqual(["name", "steam", "hltb", "hide"]);
  });

  it("returns mobile columns when innerWidth < 800", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, value: 400 });
    const { result } = renderHook(() => useAppState(CONFIG));
    expect([...result.current.visibleCols]).toEqual(["name", "steam"]);
  });

  it("returns medium columns when innerWidth between 800 and 1200", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, value: 1000 });
    const { result } = renderHook(() => useAppState(CONFIG));
    expect([...result.current.visibleCols]).toEqual(["name", "steam", "hltb"]);
  });

  it("toggleHide adds game to hiddenGames", () => {
    const { result } = renderHook(() => useAppState(CONFIG));
    act(() => result.current.toggleHide("Celeste"));
    expect(result.current.hiddenGames.has("Celeste")).toBe(true);
  });

  it("toggleHide removes game when already hidden", () => {
    const { result } = renderHook(() => useAppState(CONFIG));
    act(() => result.current.toggleHide("Celeste"));
    act(() => result.current.toggleHide("Celeste"));
    expect(result.current.hiddenGames.has("Celeste")).toBe(false);
  });

  it("toggleCol adds column when not visible", () => {
    const { result } = renderHook(() => useAppState(CONFIG));
    act(() => result.current.toggleCol("metacritic"));
    expect(result.current.visibleCols.has("metacritic")).toBe(true);
  });

  it("toggleCol removes column when visible", () => {
    const { result } = renderHook(() => useAppState(CONFIG));
    act(() => result.current.toggleCol("hide"));
    expect(result.current.visibleCols.has("hide")).toBe(false);
  });

  it("toggleCol does not remove 'name' column", () => {
    const { result } = renderHook(() => useAppState(CONFIG));
    act(() => result.current.toggleCol("name"));
    expect(result.current.visibleCols.has("name")).toBe(true);
  });

  it("persists hiddenGames to localStorage", () => {
    const { result } = renderHook(() => useAppState(CONFIG));
    act(() => result.current.toggleHide("Hollow Knight"));
    const stored = JSON.parse(localStorage.getItem("test-hidden") ?? "[]");
    expect(stored).toContain("Hollow Knight");
  });

  it("persists visibleCols to localStorage", () => {
    const { result } = renderHook(() => useAppState(CONFIG));
    act(() => result.current.toggleCol("metacritic"));
    const stored = JSON.parse(localStorage.getItem("test-columns") ?? "[]");
    expect(stored).toContain("metacritic");
  });

  it("restores visibleCols from localStorage on next mount", () => {
    localStorage.setItem("test-columns", JSON.stringify(["name", "metacritic"]));
    const { result } = renderHook(() => useAppState(CONFIG));
    expect([...result.current.visibleCols]).toEqual(["name", "metacritic"]);
  });

  it("restores hiddenGames from localStorage on next mount", () => {
    localStorage.setItem("test-hidden", JSON.stringify(["Celeste", "Hades"]));
    const { result } = renderHook(() => useAppState(CONFIG));
    expect(result.current.hiddenGames.has("Celeste")).toBe(true);
    expect(result.current.hiddenGames.has("Hades")).toBe(true);
  });

  it("showImport starts false and can be set", () => {
    const { result } = renderHook(() => useAppState(CONFIG));
    expect(result.current.showImport).toBe(false);
    act(() => result.current.setShowImport(true));
    expect(result.current.showImport).toBe(true);
  });
});

// ──────────────────────── TypeScript prop contract ────────────────────────
// This block is intentionally NOT a runtime test. If the prop names diverge
// (e.g. toggleCol renamed back to onToggleCol), TypeScript will fail to
// compile this file and the test suite won't run.

type AppShellProps = React.ComponentProps<typeof AppShell>;
type StateReturn = ReturnType<typeof useAppState<string>>;

type StatePropsNeeded = Pick<
  AppShellProps,
  "toggleCol" | "visibleCols" | "ownedGames" | "setOwnedGames" | "setVisibleCols" | "showImport" | "setShowImport"
>;
type StateProvides = Pick<
  StateReturn,
  "toggleCol" | "visibleCols" | "ownedGames" | "setOwnedGames" | "setVisibleCols" | "showImport" | "setShowImport"
>;

// Fails to compile if AppShell expects a prop name that useAppState doesn't provide
const _contract: StateProvides extends StatePropsNeeded ? true : never = true;

describe("TypeScript prop contract", () => {
  it("useAppState provides all props that AppShell needs (compile-time guarantee)", () => {
    // The type check above is the real test — if it compiles, the contract holds
    expect(_contract).toBe(true);
  });
});
