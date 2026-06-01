import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKeyboardShortcuts } from "../useKeyboardShortcuts";
import { fireEvent } from "@testing-library/react";

describe("useKeyboardShortcuts", () => {
  it("/ focuses the first .th-filter-input", () => {
    const input = document.createElement("input");
    input.className = "th-filter-input";
    document.body.appendChild(input);
    const focusSpy = vi.spyOn(input, "focus");

    renderHook(() => useKeyboardShortcuts());
    act(() => { fireEvent.keyDown(document, { key: "/" }); });
    expect(focusSpy).toHaveBeenCalled();

    document.body.removeChild(input);
    focusSpy.mockRestore();
  });

  it("/ does not focus when already in an input", () => {
    const input = document.createElement("input");
    input.className = "th-filter-input";
    document.body.appendChild(input);
    const otherInput = document.createElement("input");
    document.body.appendChild(otherInput);
    otherInput.focus();

    const focusSpy = vi.spyOn(input, "focus");
    renderHook(() => useKeyboardShortcuts());
    act(() => { fireEvent.keyDown(document, { key: "/" }); });
    expect(focusSpy).not.toHaveBeenCalled();

    document.body.removeChild(input);
    document.body.removeChild(otherInput);
    focusSpy.mockRestore();
  });

  it("Escape blurs the active element", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    const blurSpy = vi.spyOn(input, "blur");

    renderHook(() => useKeyboardShortcuts());
    act(() => { fireEvent.keyDown(document, { key: "Escape" }); });
    expect(blurSpy).toHaveBeenCalled();

    document.body.removeChild(input);
    blurSpy.mockRestore();
  });
});
