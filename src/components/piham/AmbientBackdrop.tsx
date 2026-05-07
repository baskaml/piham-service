import { useEffect } from "react";

/**
 * Drives the ambient body backdrop parallax via CSS vars --mx / --my.
 * Slow, restrained motion. Respects prefers-reduced-motion.
 */
export const AmbientBackdrop = () => {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let raf = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;

    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth, h = window.innerHeight;
      // Max ~24px drift — subtle, cinematic
      tx = ((e.clientX / w) - 0.5) * 48;
      ty = ((e.clientY / h) - 0.5) * 48;
    };

    const tick = () => {
      cx += (tx - cx) * 0.04;
      cy += (ty - cy) * 0.04;
      document.body.style.setProperty("--mx", `${cx.toFixed(2)}px`);
      document.body.style.setProperty("--my", `${cy.toFixed(2)}px`);
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return null;
};
