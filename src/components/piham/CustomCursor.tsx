import { useEffect, useRef, useState } from "react";

export const CustomCursor = () => {
  const dot = useRef<HTMLDivElement>(null);
  const follower = useRef<HTMLDivElement>(null);

  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    if (isTouch) return;

    setEnabled(true);

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let fx = mx;
    let fy = my;
    let raf: number;

    const move = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;

      if (dot.current) {
        dot.current.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
      }
    };

    const animate = () => {
      fx += (mx - fx) * 0.18;
      fy += (my - fy) * 0.18;

      if (follower.current) {
        const scale = follower.current.dataset.scale || "1";
        follower.current.style.transform =
          `translate(${fx}px, ${fy}px) translate(-50%, -50%) scale(${scale})`;
      }

      raf = requestAnimationFrame(animate);
    };

    const over = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactive = target.closest("a, button, input, textarea, [role='button']");

      if (follower.current) {
        follower.current.dataset.scale = interactive ? "1.8" : "1";
      }
    };

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseover", over);
    raf = requestAnimationFrame(animate);

    document.body.style.cursor = "none";

    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseover", over);
      cancelAnimationFrame(raf);
      document.body.style.cursor = "";
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={dot}
        className="fixed top-0 left-0 w-2 h-2 bg-white rounded-full pointer-events-none z-[999]"
      />
      <div
        ref={follower}
        className="fixed top-0 left-0 w-8 h-8 border border-white rounded-full pointer-events-none z-[998] transition-transform"
        data-scale="1"
      />
    </>
  );
};
