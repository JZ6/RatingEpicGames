import { useEffect } from "react";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "SELECT" && tag !== "TEXTAREA") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>(".th-filter-input")?.focus();
      }
      if (e.key === "Escape") {
        (document.activeElement as HTMLElement)?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
}
