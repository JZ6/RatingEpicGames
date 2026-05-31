import { useEffect, type RefObject } from "react";

export function useScrollHint(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.innerWidth > 800) return;
    let frame: number;
    const timer = setTimeout(() => {
      const distance = 60;
      const duration = 800;
      const start = performance.now();
      function animate(now: number) {
        const t = Math.min((now - start) / duration, 1);
        const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        el!.scrollLeft = ease < 0.5 ? ease * 2 * distance : (1 - (ease - 0.5) * 2) * distance;
        if (t < 1) frame = requestAnimationFrame(animate);
      }
      frame = requestAnimationFrame(animate);
    }, 600);
    return () => { clearTimeout(timer); cancelAnimationFrame(frame); };
  }, []);
}
